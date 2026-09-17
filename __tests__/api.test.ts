import assert from 'node:assert/strict'
import { test, beforeEach } from 'node:test'

import { AppwinCore } from '../src/core.ts'
import { AppwinSupport } from '../src/support.ts'
import { AppwinAnalytics } from '../src/analytics.ts'
import { AppwinAttribution } from '../src/attribution.ts'
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

// No-throw contract: a broken native install degrades silently (dev-only
// console.warn) instead of rejecting into the host app.
test('a missing native module degrades to the fallback instead of rejecting', async () => {
  setNativeModuleResolver(() => undefined)
  await AppwinCore.identify('u1')
  assert.equal(await AppwinCore.getDeviceId(), null)
  assert.deepEqual(await AppwinNotifications.initialize(), { status: 'unknown' })
})

test('a method missing from the binary degrades to the fallback instead of rejecting', async () => {
  setNativeModuleResolver(() => ({}))
  await AppwinCore.identify('u1')
  assert.equal(await AppwinCore.bootstrapSession(), '')
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

test('support exposes presentConversation and loginUnidentifiedUser', async () => {
  await AppwinSupport.presentConversation('conv-1')
  await AppwinSupport.loginUnidentifiedUser()
  await AppwinSupport.updateUser({ name: 'Camille', plan: 'pro' })

  assert.deepEqual(calls[0], {
    module: NATIVE_MODULE_NAMES.support,
    method: 'presentConversation',
    args: ['conv-1'],
  })
  assert.equal(calls[1]?.method, 'loginUnidentifiedUser')
  assert.deepEqual(calls[2]?.args, [{ name: 'Camille', plan: 'pro' }])
})

test('analytics forwards track with name and props', async () => {
  await AppwinAnalytics.track('purchase', { value: 9.99, currency: 'EUR' })
  await AppwinAnalytics.screen('Feed')
  await AppwinAnalytics.setConsent('granted')

  assert.deepEqual(calls[0], {
    module: NATIVE_MODULE_NAMES.analytics,
    method: 'track',
    args: ['purchase', { value: 9.99, currency: 'EUR' }],
  })
  assert.deepEqual(calls[1]?.args, ['Feed'])
  assert.deepEqual(calls[2]?.args, ['granted'])
})

test('analytics track sends null when there are no props', async () => {
  await AppwinAnalytics.track('level_completed')
  assert.deepEqual(calls[0]?.args, ['level_completed', null])
})

test('attribution relays consent and debug mode to its own module', async () => {
  await AppwinAttribution.setAdvertisingConsent('granted')
  await AppwinAttribution.setAdSignalsDebugMode(true)

  assert.deepEqual(
    calls.map((c) => c.module),
    [NATIVE_MODULE_NAMES.attribution, NATIVE_MODULE_NAMES.attribution],
  )
  assert.deepEqual(calls[1]?.args, [true])
})
