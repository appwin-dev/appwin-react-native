import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import { AppwinCommunity } from '../src/community.ts'
import { AppwinCore } from '../src/core.ts'
import { NATIVE_MODULE_NAMES, setNativeModuleResolver } from '../src/native.ts'
import type { AppwinCommunityEvent, AppwinInitResult } from '../src/types.ts'
import { emitNativeEvent, nativeListenerCount, resetNativeEvents } from './react-native.ts'

/**
 * Listeners and host hooks: what JavaScript asks native to start and stop, and
 * how native payloads come back as typed values.
 */
type Call = { module: string; method: string; args: unknown[] }

let calls: Call[] = []
let results: Record<string, unknown> = {}

function fakeModule(name: string) {
  return new Proxy(
    {},
    {
      get(_target, method: string) {
        return (...args: unknown[]) => {
          calls.push({ module: name, method, args })
          return Promise.resolve(results[`${name}.${method}`])
        }
      },
    },
  ) as Record<string, unknown>
}

const methods = () => calls.map((c) => [c.method, ...c.args])

beforeEach(() => {
  calls = []
  results = {}
  resetNativeEvents()
  setNativeModuleResolver((name) => fakeModule(name))
})

afterEach(() => {
  AppwinCommunity.setOnNotificationTap(null)
  AppwinCommunity.setOnEditProfile(null)
})

test('events: native collects only while a listener is attached, once for all of them', () => {
  const unsubscribeA = AppwinCommunity.addEventListener(() => {})
  const unsubscribeB = AppwinCommunity.addEventListener(() => {})
  assert.deepEqual(methods(), [['startEvents']])

  unsubscribeA()
  unsubscribeA()
  assert.deepEqual(methods(), [['startEvents']])

  unsubscribeB()
  assert.deepEqual(methods(), [['startEvents'], ['stopEvents']])
  assert.equal(nativeListenerCount('AppwinCommunityEvent'), 0)
})

test('events: payloads become the discriminated union, unknown kinds are dropped', () => {
  const received: AppwinCommunityEvent[] = []
  const unsubscribe = AppwinCommunity.addEventListener((e) => received.push(e))

  emitNativeEvent('AppwinCommunityEvent', { type: 'postCreated', postId: 'p1' })
  emitNativeEvent('AppwinCommunityEvent', {
    type: 'replyCreated',
    replyId: 'r1',
    commentId: 'c1',
    postId: 'p1',
  })
  emitNativeEvent('AppwinCommunityEvent', { type: 'reactionModified', postId: 'p1' })
  emitNativeEvent('AppwinCommunityEvent', { type: 'pollVoted', postId: 'p1' })
  emitNativeEvent('AppwinCommunityEvent', { type: 'commentCreated', postId: 'p1' })
  emitNativeEvent('AppwinCommunityEvent', { type: 'profileUpdated', profileId: 'u1' })
  unsubscribe()

  assert.deepEqual(received, [
    { type: 'postCreated', postId: 'p1' },
    { type: 'replyCreated', replyId: 'r1', commentId: 'c1', postId: 'p1' },
    // Absent and native null both surface as `null`: removed reaction, on the post.
    { type: 'reactionModified', postId: 'p1', commentId: null, reaction: null },
    { type: 'profileUpdated', profileId: 'u1' },
  ])
})

test('a throwing listener does not starve the others', () => {
  let delivered = 0
  const a = AppwinCommunity.addEventListener(() => {
    throw new Error('host bug')
  })
  const b = AppwinCommunity.addEventListener(() => delivered++)
  emitNativeEvent('AppwinCommunityEvent', { type: 'postCreated', postId: 'p1' })
  a()
  b()
  assert.equal(delivered, 1)
})

test('unread count: a late listener gets the last value, a fresh subscription does not', () => {
  const first: number[] = []
  const late: number[] = []
  const unsubscribeFirst = AppwinCommunity.addUnreadCountListener((n) => first.push(n))
  emitNativeEvent('AppwinCommunityUnreadCount', { count: 3 })
  const unsubscribeLate = AppwinCommunity.addUnreadCountListener((n) => late.push(n))
  emitNativeEvent('AppwinCommunityUnreadCount', { count: 'x' })
  emitNativeEvent('AppwinCommunityUnreadCount', { count: 4 })
  unsubscribeFirst()
  unsubscribeLate()

  assert.deepEqual(first, [3, 4])
  assert.deepEqual(late, [3, 4])
  assert.deepEqual(methods(), [['startUnreadCountUpdates'], ['stopUnreadCountUpdates']])

  const again: number[] = []
  AppwinCommunity.addUnreadCountListener((n) => again.push(n))()
  assert.deepEqual(again, [])
})

test('availability: one native collector per product, filtered by product', () => {
  const community: AppwinInitResult[] = []
  const support: AppwinInitResult[] = []
  const offCommunity = AppwinCore.addAvailabilityListener('community', (r) => community.push(r))
  const offSupport = AppwinCore.addAvailabilityListener('support', (r) => support.push(r))

  emitNativeEvent('AppwinAvailabilityChanged', {
    product: 'community',
    result: { status: 'unavailable', reason: 'plan' },
  })
  emitNativeEvent('AppwinAvailabilityChanged', { product: 'support', result: { status: 'ready' } })
  emitNativeEvent('AppwinAvailabilityChanged', { product: 'community', result: { status: 'bogus' } })
  offCommunity()
  offSupport()

  assert.deepEqual(community, [{ status: 'unavailable', reason: 'plan' }])
  assert.deepEqual(support, [{ status: 'ready' }])
  assert.deepEqual(methods(), [
    ['startAvailabilityUpdates', 'community'],
    ['startAvailabilityUpdates', 'support'],
    ['stopAvailabilityUpdates', 'community'],
    ['stopAvailabilityUpdates', 'support'],
  ])
  assert.ok(calls.every((c) => c.module === NATIVE_MODULE_NAMES.core))
})

test('notification tap: set before initialize reaches native first, and routes to the current handler', async () => {
  const taps: string[] = []
  AppwinCommunity.setOnNotificationTap((t) => taps.push(`a:${t.postId}:${t.commentId}`))
  await AppwinCommunity.initialize()
  assert.deepEqual(methods(), [['setNotificationTapHandler', true], ['initialize']])

  emitNativeEvent('AppwinCommunityNotificationTap', { postId: 'p1', commentId: null })
  AppwinCommunity.setOnNotificationTap((t) => taps.push(`b:${t.postId}:${t.commentId}`))
  emitNativeEvent('AppwinCommunityNotificationTap', { postId: 'p2', commentId: 'c2' })
  emitNativeEvent('AppwinCommunityNotificationTap', {})

  AppwinCommunity.setOnNotificationTap(null)
  emitNativeEvent('AppwinCommunityNotificationTap', { postId: 'p3' })

  assert.deepEqual(taps, ['a:p1:null', 'b:p2:c2'])
  // Swapping handlers stays in JavaScript; only clearing gives navigation back to the SDK.
  assert.deepEqual(methods(), [
    ['setNotificationTapHandler', true],
    ['initialize'],
    ['setNotificationTapHandler', false],
  ])
})

test('edit profile: the handler is called on each native request', () => {
  let requests = 0
  AppwinCommunity.setOnEditProfile(() => requests++)
  emitNativeEvent('AppwinCommunityEditProfile', null)
  emitNativeEvent('AppwinCommunityEditProfile', {})
  AppwinCommunity.setOnEditProfile(null)

  assert.equal(requests, 2)
  assert.deepEqual(methods(), [
    ['setEditProfileHandler', true],
    ['setEditProfileHandler', false],
  ])
})

test('openPost sends null for a missing comment', async () => {
  await AppwinCommunity.openPost('p1')
  await AppwinCommunity.openPost('p1', 'c1')
  assert.deepEqual(methods(), [
    ['openPost', 'p1', null],
    ['openPost', 'p1', 'c1'],
  ])
})

test('getLastResult decodes the verdict, null before initialize', async () => {
  assert.equal(await AppwinCommunity.getLastResult(), null)

  results[`${NATIVE_MODULE_NAMES.community}.getLastResult`] = {
    status: 'unavailable',
    reason: 'disabled',
  }
  assert.deepEqual(await AppwinCommunity.getLastResult(), {
    status: 'unavailable',
    reason: 'disabled',
  })
})

test('a missing native module degrades: no throw, a working unsubscribe, null verdict', async () => {
  setNativeModuleResolver(() => undefined)
  const unsubscribe = AppwinCommunity.addEventListener(() => {})
  unsubscribe()
  AppwinCommunity.setOnNotificationTap(() => {})
  await AppwinCommunity.openPost('p1')
  assert.equal(await AppwinCommunity.getLastResult(), null)
})
