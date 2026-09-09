import { invoke } from './native'
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
export const AppwinNotifications = {
  initialize(): Promise<AppwinInitResult> {
    return invoke('notifications', 'initialize')
  },

  start(requestPushPermission = true): Promise<void> {
    return invoke('notifications', 'start', requestPushPermission)
  },

  stop(): Promise<void> {
    return invoke('notifications', 'stop')
  },

  registerPushToken(
    token: string,
    platform: AppwinPushPlatform,
    pushOptIn = true,
  ): Promise<void> {
    return AppwinCore.registerPushToken(token, platform, pushOptIn)
  },

  trackEvent(
    event: AppwinAutomationEvent,
    eventName?: string,
    properties?: Record<string, string>,
  ): Promise<void> {
    return invoke('notifications', 'trackEvent', event, eventName ?? null, properties ?? null)
  },

  fetchPendingMessages(): Promise<AppwinInAppMessage[]> {
    return invoke('notifications', 'fetchPendingMessages')
  },

  track(
    deliveryId: string,
    event: AppwinTrackEvent,
    buttonIndex?: number,
  ): Promise<void> {
    return invoke(
      'notifications',
      'track',
      deliveryId,
      event,
      buttonIndex ?? null,
    )
  },

  syncOnAppOpen(): Promise<AppwinInAppMessage[]> {
    return invoke('notifications', 'syncOnAppOpen')
  },

  presentPendingMessages(): Promise<void> {
    return invoke('notifications', 'presentPendingMessages')
  },
}
