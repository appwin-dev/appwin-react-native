import assert from 'node:assert/strict'
import { test, beforeEach } from 'node:test'

import { AppwinCore } from '../src/core.ts'
import { AppwinSupport } from '../src/support.ts'
import { AppwinCommunity } from '../src/community.ts'
import { AppwinNotifications } from '../src/notifications.ts'
import { NATIVE_MODULE_NAMES, setNativeModuleResolver } from '../src/native.ts'

/**
 * These tests cover the **bridge contract**: a method name, an argument order,
 * a normalised value. It is the only place the TypeScript layer can be wrong in
 * a way that only shows up at runtime on a phone. Rendering is native and not
 * testable here.
 */
type Call = { module: string; method: string; args: unknown[] }

let calls: Call[] = []
let failures: Record<string, Error> = {}

function fakeModule(name: string) {
  return new Proxy(
    {},
    {
      get(_target, method: string) {
        return (...args: unknown[]) => {
          calls.push({ module: name, method, args })
          const failure = failures[`${name}.${method}`]
          return failure ? Promise.reject(failure) : Promise.resolve(undefined)
        }
      },
      has: () => true,
    },
  ) as Record<string, unknown>
}

beforeEach(() => {
  calls = []
  failures = {}
  setNativeModuleResolver((name) => fakeModule(name))
})

test('configure normalises optional options to null', async () => {
  await AppwinCore.configure({ projectAppId: 'app-123' })

  assert.deepEqual(calls[0], {
    module: NATIVE_MODULE_NAMES.core,
    method: 'configure',
    // `null`, not `undefined`: the React Native bridge drops `undefined` keys,
    // and native could not tell "not supplied" from "not in the contract".
    args: [{ projectAppId: 'app-123', baseUrl: null, realtimeBaseUrl: null }],
  })
})

test('configure rejects a blank app id without reaching native', async () => {
  await assert.rejects(() => AppwinCore.configure({ projectAppId: '  ' }), /projectAppId/)
  assert.equal(calls.length, 0)
})

test('a missing native module yields an install message', async () => {
  setNativeModuleResolver(() => undefined)
  await assert.rejects(() => AppwinCore.identify('u1'), /rebuilt the app/)
})

test('a method missing from the binary is reported explicitly', async () => {
  setNativeModuleResolver(() => ({}))
  await assert.rejects(() => AppwinCore.identify('u1'), /newer than the native code/)
})

test('registerPushToken forwards platform and consent', async () => {
  await AppwinNotifications.registerPushToken('tok', 'ios', false)
  assert.deepEqual(calls[0]?.args, ['tok', 'ios', false])

  await AppwinNotifications.registerPushToken('tok', 'android')
  // Consent defaults to `true`, by far the most common case; forgetting it
  // would register everyone as having declined.
  assert.deepEqual(calls[1]?.args, ['tok', 'android', true])
})

test('registerPushToken rejects a blank token', () => {
  assert.throws(() => AppwinNotifications.registerPushToken('  ', 'ios'), /token is empty/)
  assert.equal(calls.length, 0)
})

test('trackEvent sends null when there is no name', async () => {
  await AppwinNotifications.trackEvent('app_open')
  assert.deepEqual(calls[0]?.args, ['app_open', null, null])

  await AppwinNotifications.trackEvent('custom_event', 'level_up')
  assert.deepEqual(calls[1]?.args, ['custom_event', 'level_up', null])
})

test('unreadNotificationCount resolves to 0 rather than rejecting', async () => {
  failures[`${NATIVE_MODULE_NAMES.community}.unreadNotificationCount`] = new Error('offline')

  // A tab badge must never break the rendering of the bar.
  assert.equal(await AppwinCommunity.unreadNotificationCount(), 0)
})

test('each product talks to its own native module', async () => {
  await AppwinSupport.presentMessenger()
  await AppwinCommunity.presentCommunity()
  await AppwinNotifications.syncOnAppOpen()

  assert.deepEqual(
    calls.map((c) => c.module),
    [
      NATIVE_MODULE_NAMES.support,
      NATIVE_MODULE_NAMES.community,
      NATIVE_MODULE_NAMES.notifications,
    ],
  )
})
