import assert from 'node:assert/strict'
import { test, beforeEach } from 'node:test'

import { AppwinPush } from '../src/push.ts'
import { AppwinNotifications } from '../src/notifications.ts'
import { NATIVE_MODULE_NAMES, setNativeModuleResolver } from '../src/native.ts'

type Call = { module: string; method: string; args: unknown[] }

let calls: Call[] = []
let results: Record<string, unknown> = {}
let failures: Record<string, Error> = {}

beforeEach(() => {
  calls = []
  results = {}
  failures = {}
  setNativeModuleResolver(
    (name) =>
      new Proxy(
        {},
        {
          get(_target, method: string) {
            return (...args: unknown[]) => {
              calls.push({ module: name, method, args })
              const key = `${name}.${method}`
              return failures[key] ? Promise.reject(failures[key]) : Promise.resolve(results[key])
            }
          },
        },
      ) as Record<string, unknown>,
  )
})

const supportPush = {
  appwinType: 'support.message',
  appwinVersion: '1',
  deeplink: 'appwin://support/conversation/c-1',
}

test('each call hands the data to its native method untouched', async () => {
  await AppwinPush.isAppwinPush(supportPush)
  await AppwinPush.handleTap(supportPush)
  await AppwinPush.handleMessage(supportPush)

  assert.deepEqual(calls, [
    { module: NATIVE_MODULE_NAMES.push, method: 'isAppwinPush', args: [supportPush] },
    { module: NATIVE_MODULE_NAMES.push, method: 'handleTap', args: [supportPush] },
    { module: NATIVE_MODULE_NAMES.push, method: 'handleMessage', args: [supportPush] },
  ])
})

test('handleForeground sends title and body as null when absent', async () => {
  await AppwinPush.handleForeground(supportPush)
  await AppwinPush.handleForeground(supportPush, { title: 'Support', body: 'New reply' })
  await AppwinPush.handleForeground(supportPush, { body: 'New reply' })

  // `null`, not `undefined`: the bridge drops `undefined` and the native
  // signature would lose an argument.
  assert.deepEqual(calls[0]?.args, [supportPush, null, null])
  assert.deepEqual(calls[1]?.args, [supportPush, 'Support', 'New reply'])
  assert.deepEqual(calls[2]?.args, [supportPush, null, 'New reply'])
})

test('the native verdict is what resolves', async () => {
  results['AppwinPushModule.handleTap'] = true
  results['AppwinPushModule.isAppwinPush'] = false

  assert.equal(await AppwinPush.handleTap(supportPush), true)
  assert.equal(await AppwinPush.isAppwinPush({ from: 'another-vendor' }), false)
})

// `false` tells the host "not ours, handle it yourself": a broken install must
// never swallow the app's own notifications.
test('a bridge failure resolves false instead of rejecting', async () => {
  failures['AppwinPushModule.handleForeground'] = new Error('boom')
  assert.equal(await AppwinPush.handleForeground(supportPush), false)

  setNativeModuleResolver(() => undefined)
  assert.equal(await AppwinPush.handleTap(supportPush), false)
  assert.equal(await AppwinPush.handleMessage(supportPush), false)
  assert.equal(await AppwinPush.isAppwinPush(supportPush), false)
})

test('notifications start installs the delegate unless told otherwise', async () => {
  await AppwinNotifications.start()
  await AppwinNotifications.start(false, { installsNotificationDelegate: false })
  await AppwinNotifications.start(true, {})

  assert.deepEqual(
    calls.map((c) => c.args),
    [
      [true, true],
      [false, false],
      [true, true],
    ],
  )
})
