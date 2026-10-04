import assert from 'node:assert/strict'
import { test, beforeEach, afterEach } from 'node:test'

import { AppwinAnalytics } from '../src/analytics.ts'
import { parseStack, resetCrashHandlersForTests, toBridgedError } from '../src/crashes.ts'
import { NATIVE_MODULE_NAMES, setNativeModuleResolver } from '../src/native.ts'

type Call = { method: string; args: unknown[]; sync: boolean }
type Handler = (error: unknown, isFatal?: boolean) => void

let calls: Call[] = []
let order: string[] = []
let current: Handler | undefined
let previousCalls: Array<{ error: unknown; isFatal?: boolean }> = []

const g = globalThis as Record<string, unknown>

beforeEach(() => {
  calls = []
  order = []
  previousCalls = []
  current = (error, isFatal) => {
    order.push('previous')
    previousCalls.push({ error, isFatal })
  }
  g.ErrorUtils = {
    getGlobalHandler: () => current,
    setGlobalHandler: (next: Handler) => {
      current = next
    },
  }
  resetCrashHandlersForTests()
  setNativeModuleResolver((name) => {
    if (name !== NATIVE_MODULE_NAMES.analytics) return {}
    return {
      initialize: (...args: unknown[]) => {
        calls.push({ method: 'initialize', args, sync: false })
        return Promise.resolve({ status: 'ready' })
      },
      recordBridgedError: (...args: unknown[]) => {
        order.push('async')
        calls.push({ method: 'recordBridgedError', args, sync: false })
        return Promise.resolve(null)
      },
      recordBridgedErrorSync: (...args: unknown[]) => {
        order.push('sync')
        calls.push({ method: 'recordBridgedErrorSync', args, sync: true })
        return true
      },
    }
  })
})

afterEach(() => {
  delete g.ErrorUtils
  delete g.HermesInternal
})

test('parses a Hermes release stack (bytecode addresses)', () => {
  const frames = parseStack(
    [
      'TypeError: undefined is not a function',
      '    at onPress (address at index.android.bundle:1:2345)',
      '    at anonymous (address at /data/app/base.apk/assets/index.android.bundle:1:99)',
      '    at call (native)',
    ].join('\n'),
  )
  assert.deepEqual(frames, [
    {
      fn: 'onPress',
      file: 'index.android.bundle',
      line: 1,
      col: 2345,
      module: 'index.android.bundle',
      inApp: true,
    },
    {
      fn: 'anonymous',
      file: 'index.android.bundle',
      line: 1,
      col: 99,
      module: 'index.android.bundle',
      inApp: true,
    },
    { fn: 'call', inApp: false },
  ])
})

test('parses a JSC stack, including unnamed and native frames', () => {
  const frames = parseStack(
    ['onPress@main.jsbundle:1:234', '@main.jsbundle:2:5', 'forEach@[native code]'].join('\n'),
  )
  assert.deepEqual(frames, [
    { fn: 'onPress', file: 'main.jsbundle', line: 1, col: 234, module: 'main.jsbundle', inApp: true },
    { fn: 'anonymous', file: 'main.jsbundle', line: 2, col: 5, module: 'main.jsbundle', inApp: true },
    { fn: 'forEach', inApp: false },
  ])
})

test('strips the dev server query and marks node_modules frames as not in-app', () => {
  const frames = parseStack(
    [
      'Error: boom',
      '    at handle (http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:12:3)',
      'render@http://10.0.2.2:8081/index.bundle?platform=android:40:7',
      '    at Button (/Users/me/app/node_modules/react-native/Libraries/Button.js:10:5)',
      '    at Home (/Users/me/app/src/Home.tsx:22:9)',
    ].join('\n'),
  )
  assert.deepEqual(
    frames.map((f) => [f.fn, f.file, f.line, f.col, f.inApp]),
    [
      ['handle', 'index.bundle', 12, 3, true],
      ['render', 'index.bundle', 40, 7, true],
      ['Button', 'Button.js', 10, 5, false],
      ['Home', 'Home.tsx', 22, 9, true],
    ],
  )
  assert.equal(frames[3]?.module, undefined)
})

test('caps the stack at 200 frames', () => {
  const stack = Array.from({ length: 250 }, (_, i) => `    at f${i} (index.bundle:1:${i})`).join('\n')
  assert.equal(parseStack(stack).length, 200)
})

test('maps name and message, and bounds the message to 1024', () => {
  const error = new RangeError('x'.repeat(2000))
  const bridged = toBridgedError(error)
  assert.equal(bridged.type, 'RangeError')
  assert.equal(bridged.message?.length, 1024)
  assert.deepEqual(toBridgedError('plain'), { type: 'Error', message: 'plain', frames: [] })
  assert.deepEqual(toBridgedError(undefined), { type: 'Error', message: null, frames: [] })
})

test('initialize forwards crashReporting, true by default', async () => {
  await AppwinAnalytics.initialize()
  resetCrashHandlersForTests()
  await AppwinAnalytics.initialize({ crashReporting: false })
  assert.deepEqual(
    calls.map((c) => c.args),
    [[{ crashReporting: true }], [{ crashReporting: false }]],
  )
})

test('crashReporting: false leaves the global handler alone', async () => {
  const before = current
  await AppwinAnalytics.initialize({ crashReporting: false })
  assert.equal(current, before)
})

test('a fatal error is recorded synchronously, then handed to the previous handler', async () => {
  await AppwinAnalytics.initialize()
  const error = new Error('fatal')
  current?.(error, true)

  assert.deepEqual(order, ['sync', 'previous'])
  const sync = calls.find((c) => c.method === 'recordBridgedErrorSync')
  assert.deepEqual(sync?.args.slice(0, 3), [true, 'Error', 'fatal'])
  assert.ok(Array.isArray(sync?.args[3]))
  assert.deepEqual(previousCalls, [{ error, isFatal: true }])
})

test('a non-fatal global error goes through the async method and keeps isFatal', async () => {
  await AppwinAnalytics.initialize()
  current?.(new Error('soft'), false)

  assert.deepEqual(order, ['async', 'previous'])
  assert.deepEqual(previousCalls.map((c) => c.isFatal), [false])
  assert.equal(calls.some((c) => c.sync), false)
})

test('the handler is chained once, even across several initialize calls', async () => {
  await AppwinAnalytics.initialize()
  await AppwinAnalytics.initialize()
  current?.(new Error('once'), true)
  assert.deepEqual(order, ['sync', 'previous'])
})

test('a broken native module never masks the error for the previous handler', async () => {
  await AppwinAnalytics.initialize()
  setNativeModuleResolver(() => undefined)
  current?.(new Error('still reported'), true)
  assert.equal(previousCalls.length, 1)
})

test('recordError is non-fatal and async', async () => {
  await AppwinAnalytics.recordError(new TypeError('caught'))
  assert.deepEqual(calls[0]?.method, 'recordBridgedError')
  assert.deepEqual(calls[0]?.args.slice(0, 3), [false, 'TypeError', 'caught'])
})

test('Hermes unhandled rejections are recorded as non-fatal in release', async () => {
  let onUnhandled: ((id: number, rejection: unknown) => void) | undefined
  g.HermesInternal = {
    hasPromise: () => true,
    enablePromiseRejectionTracker: (options: { onUnhandled: typeof onUnhandled }) => {
      onUnhandled = options.onUnhandled
    },
  }
  await AppwinAnalytics.initialize()
  onUnhandled?.(1, new Error('rejected'))
  assert.deepEqual(calls.at(-1)?.args.slice(0, 3), [false, 'Error', 'rejected'])
})
