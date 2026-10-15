import { getNativeModule, invoke } from './native'

/**
 * JavaScript crash capture (ADR-0056). The native SDK owns the report (context,
 * breadcrumbs, disk queue, upload); this layer only turns a JS error into
 * `runtime = react_native` frames and hands them over.
 */

/** Shape read by `BridgedFrames` on Android and its iOS counterpart. */
export interface BridgedFrame {
  fn: string
  file?: string
  line?: number
  col?: number
  module?: string
  inApp: boolean
}

export interface BridgedError {
  type: string
  message: string | null
  frames: BridgedFrame[]
}

const MAX_FRAMES = 200
const MAX_TYPE = 256
const MAX_MESSAGE = 1024
const MAX_FN = 512

// `at fn (location)` (Hermes, V8) or `at location`.
const AT_FRAME = /^\s*at\s+(?:(.*?)\s+\((.*)\)|(.*))\s*$/
// `fn@location` (JSC); fn may be empty.
const JSC_FRAME = /^\s*(.*?)@(.*)$/
const LOCATION = /^(.*?):(\d+)(?::(\d+))?$/

/**
 * Parses a Hermes, JSC or V8 stack into bridged frames, at most 200.
 * Lines that are not frames (the `Error: message` header) are skipped.
 */
export function parseStack(stack: string | undefined | null): BridgedFrame[] {
  if (!stack) return []
  const frames: BridgedFrame[] = []
  for (const line of stack.split('\n')) {
    if (frames.length >= MAX_FRAMES) break
    const frame = parseLine(line)
    if (frame) frames.push(frame)
  }
  return frames
}

function parseLine(line: string): BridgedFrame | null {
  const at = AT_FRAME.exec(line)
  if (at) return frameAt(at[1] ?? '', at[2] ?? at[3] ?? '')
  // JSC frames without a location (`[native code]` alone) carry nothing useful.
  if (line.includes('@')) {
    const jsc = JSC_FRAME.exec(line)
    if (jsc) return frameAt(jsc[1] ?? '', jsc[2] ?? '')
  }
  return null
}

function frameAt(rawFn: string, rawLocation: string): BridgedFrame {
  const fn = (rawFn.trim() || 'anonymous').slice(0, MAX_FN)
  // Hermes release builds: `address at index.android.bundle:1:2345`.
  const location = rawLocation.trim().replace(/^address at\s+/, '')
  const parsed = LOCATION.exec(location)
  if (!parsed) return { fn, inApp: false }

  const source = parsed[1] ?? ''
  const file = fileName(source)
  const frame: BridgedFrame = {
    fn,
    file,
    line: Number(parsed[2]),
    // Release stacks only ever show the bundle, so everything in it counts as
    // the studio's code until sourcemaps (phase 3) tell node_modules apart.
    inApp: !source.includes('/node_modules/'),
  }
  if (parsed[3] !== undefined) frame.col = Number(parsed[3])
  if (isBundle(file)) frame.module = file
  return frame
}

/** Last path segment, without the dev server query (`?platform=ios&dev=true`). */
function fileName(source: string): string {
  const path = source.split(/[?#]/)[0] ?? source
  const segment = path.slice(path.lastIndexOf('/') + 1)
  return (segment || path).slice(0, MAX_FN)
}

function isBundle(file: string): boolean {
  return /\.(bundle|jsbundle|hbc)$/.test(file)
}

/** Normalises anything thrown (an `Error`, a string, an object) into a bridged error. */
export function toBridgedError(value: unknown): BridgedError {
  if (value instanceof Error || (typeof value === 'object' && value !== null && 'stack' in value)) {
    const error = value as { name?: unknown; message?: unknown; stack?: unknown }
    const name = typeof error.name === 'string' && error.name ? error.name : 'Error'
    return {
      type: name.slice(0, MAX_TYPE),
      message: typeof error.message === 'string' ? error.message.slice(0, MAX_MESSAGE) : null,
      frames: parseStack(typeof error.stack === 'string' ? error.stack : null),
    }
  }
  return { type: 'Error', message: describe(value)?.slice(0, MAX_MESSAGE) ?? null, frames: [] }
}

function describe(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Fatal path: the previous handler kills the app right after, so the report
 * must be on disk before this returns. Never throws: we are already inside
 * the global error handler.
 */
export function recordFatalSync(value: unknown): void {
  try {
    const { type, message, frames } = toBridgedError(value)
    const nativeModule = getNativeModule('analytics')
    const fn = nativeModule.recordBridgedErrorSync
    if (typeof fn === 'function') fn.call(nativeModule, true, type, message, frames)
  } catch {
    // An older binary or a missing module must not mask the original error.
  }
}

export function recordNonFatal(value: unknown): Promise<void> {
  const { type, message, frames } = toBridgedError(value)
  return invoke('analytics', 'recordBridgedError', false, type, message, frames)
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void

interface ErrorUtilsLike {
  getGlobalHandler(): GlobalHandler | undefined
  setGlobalHandler(handler: GlobalHandler): void
}

interface HermesInternalLike {
  hasPromise?: () => boolean
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean
    onUnhandled: (id: number, rejection: unknown) => void
    onHandled: (id: number) => void
  }) => void
}

let installed = false

/**
 * Installs the global JS error handler, once per JS runtime, chaining the
 * one already there (RN's red box / crash, Sentry, Crashlytics...).
 */
export function installCrashHandlers(): void {
  if (installed) return
  const g = globalThis as { ErrorUtils?: ErrorUtilsLike; HermesInternal?: HermesInternalLike }
  const errorUtils = g.ErrorUtils
  if (!errorUtils) return
  installed = true

  const previous = errorUtils.getGlobalHandler()
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
      recordFatalSync(error)
    } else {
      recordNonFatal(error).catch(() => undefined)
    }
    previous?.(error, isFatal)
  })

  installRejectionTracker(g.HermesInternal)
}

/**
 * Hermes only: JSC exposes no rejection hook. In dev, React Native already owns
 * the single tracker slot (LogBox warnings) and there is no getter to chain it,
 * so we take the slot in release builds only.
 */
function installRejectionTracker(hermes: HermesInternalLike | undefined): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return
  if (!hermes?.enablePromiseRejectionTracker || hermes.hasPromise?.() === false) return
  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (_id, rejection) => {
      recordNonFatal(rejection).catch(() => undefined)
    },
    onHandled: () => undefined,
  })
}

/** Tests only: lets each test install against a fresh `ErrorUtils`. */
export function resetCrashHandlersForTests(): void {
  installed = false
}
