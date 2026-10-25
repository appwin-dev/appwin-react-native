import { NativeEventEmitter } from 'react-native'

import { NATIVE_MODULE_NAMES, getNativeModule, guarded, invoke } from './native'
import type { NativeModuleKey } from './native'

/** Detaches a listener. Calling it twice is harmless. */
export type AppwinUnsubscribe = () => void

interface NativeChannelOptions<T> {
  module: NativeModuleKey
  /** Event name, as the native module sends it. */
  event: string
  /** Native method that starts collecting the SDK stream, with its arguments. */
  start: [method: string, ...args: unknown[]]
  stop: [method: string, ...args: unknown[]]
  /** Returns `undefined` for a payload to drop (another product, a newer native event type). */
  decode: (payload: unknown) => T | undefined
  /** Hands the last value to a listener added after it arrived, like the native streams do. */
  replayLast?: boolean
}

/**
 * One native subscription shared by every JavaScript listener.
 *
 * Native collects a stream only while JavaScript listens: the first listener
 * starts it, the last one to leave stops it. Several native collectors would
 * each trigger their own refresh on the SDK side.
 */
export class NativeChannel<T> {
  private readonly listeners = new Set<(value: T) => void>()
  private subscription: { remove(): void } | null = null
  private last: { value: T } | null = null
  // A plain field, not a parameter property: the tests run under Node's type
  // stripping, which rejects that syntax.
  private readonly options: NativeChannelOptions<T>

  constructor(options: NativeChannelOptions<T>) {
    this.options = options
  }

  add(listener: (value: T) => void): AppwinUnsubscribe {
    this.listeners.add(listener)
    if (this.options.replayLast && this.last) deliver(listener, this.last.value)
    if (this.listeners.size === 1) this.open()

    let removed = false
    return () => {
      if (removed) return
      removed = true
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.close()
    }
  }

  private open(): void {
    const { module, event, start, decode } = this.options
    try {
      const emitter = new NativeEventEmitter(getNativeModule(module) as never)
      // Registered before `start`: native may emit its current value right away.
      this.subscription = emitter.addListener(event, (payload) => {
        const value = decode(payload)
        if (value === undefined) return
        this.last = { value }
        for (const listener of [...this.listeners]) deliver(listener, value)
      })
    } catch (e) {
      warn(`${NATIVE_MODULE_NAMES[module]}: cannot listen to ${event}:`, e)
      return
    }
    const [method, ...args] = start
    void guarded(method, () => invoke(module, method, ...args), undefined)
  }

  private close(): void {
    if (!this.subscription) return
    this.subscription.remove()
    this.subscription = null
    this.last = null
    const [method, ...args] = this.options.stop
    void guarded(method, () => invoke(this.options.module, method, ...args), undefined)
  }
}

// A throwing host listener must not starve the others, nor surface as an
// unhandled native event error.
function deliver<T>(listener: (value: T) => void, value: T): void {
  try {
    listener(value)
  } catch (e) {
    warn('listener threw:', e)
  }
}

function warn(message: string, error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[Appwin] ${message}`, error)
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}
