import { guarded, invoke } from './native'
import { AppwinCore } from './core'
import type {
  AppwinInitResult,
  AppwinAutomationEvent,
  AppwinInAppMessage,
  AppwinPushPlatform,
  AppwinTrackEvent,
} from './types'

/**
 * Appwin Notifications.
 *
 * After `configure` + `initialize`, call `start()` once: the native SDK owns
 * lifecycle events, push (iOS), realtime and in-app UI.
 */
const UNKNOWN_RESULT: AppwinInitResult = { status: 'unknown' }

export const AppwinNotifications = {
  initialize(): Promise<AppwinInitResult> {
    return guarded('initialize', () => invoke('notifications', 'initialize'), UNKNOWN_RESULT)
  },

  start(requestPushPermission = true): Promise<void> {
    return guarded(
      'start',
      () => invoke('notifications', 'start', requestPushPermission),
      undefined,
    )
  },

  stop(): Promise<void> {
    return guarded('stop', () => invoke('notifications', 'stop'), undefined)
  },

  registerPushToken(
    token: string,
    platform: AppwinPushPlatform,
    pushOptIn = true,
  ): Promise<void> {
    // Already guarded by the AppwinCore facade.
    return AppwinCore.registerPushToken(token, platform, pushOptIn)
  },

  trackEvent(
    event: AppwinAutomationEvent,
    eventName?: string,
    properties?: Record<string, string>,
  ): Promise<void> {
    return guarded(
      'trackEvent',
      () => invoke('notifications', 'trackEvent', event, eventName ?? null, properties ?? null),
      undefined,
    )
  },

  fetchPendingMessages(): Promise<AppwinInAppMessage[]> {
    return guarded('fetchPendingMessages', () => invoke('notifications', 'fetchPendingMessages'), [])
  },

  track(
    deliveryId: string,
    event: AppwinTrackEvent,
    buttonIndex?: number,
  ): Promise<void> {
    return guarded(
      'track',
      () => invoke('notifications', 'track', deliveryId, event, buttonIndex ?? null),
      undefined,
    )
  },

  syncOnAppOpen(): Promise<AppwinInAppMessage[]> {
    return guarded('syncOnAppOpen', () => invoke('notifications', 'syncOnAppOpen'), [])
  },

  presentPendingMessages(): Promise<void> {
    return guarded(
      'presentPendingMessages',
      () => invoke('notifications', 'presentPendingMessages'),
      undefined,
    )
  },
}
