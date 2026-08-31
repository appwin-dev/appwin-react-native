import { invoke } from './native'
import type {
  AppwinAutomationEvent,
  AppwinInAppMessage,
  AppwinPushPlatform,
  AppwinTrackEvent,
} from './types'

/**
 * Appwin Notifications.
 *
 * Registers the device token, emits the events that trigger automations, and
 * fetches pending in-app messages.
 *
 * **Rendering** in-app messages is native on iOS; on Android the SDK returns
 * them without drawing them. Fetching them here lets a React Native app render
 * them itself in the meantime.
 */
export const AppwinNotifications = {
  /** Registers the push token. Call again on every token rotation. */
  registerPushToken(
    token: string,
    platform: AppwinPushPlatform,
    pushOptIn = true,
  ): Promise<void> {
    if (!token.trim()) {
      throw new Error('AppwinNotifications.registerPushToken: token is empty')
    }
    return invoke('notifications', 'registerPushToken', token, platform, pushOptIn)
  },

  /**
   * Emits an SDK event.
   *
   * `eventName` only applies to `custom_event`: it is what names the event in
   * the studio.
   */
  trackEvent(event: AppwinAutomationEvent, eventName?: string): Promise<void> {
    return invoke('notifications', 'trackEvent', event, eventName ?? null)
  },

  /** In-app messages pending for this device. */
  fetchPendingMessages(): Promise<AppwinInAppMessage[]> {
    return invoke('notifications', 'fetchPendingMessages')
  },

  /** Reports what the user did with a message. */
  track(deliveryId: string, event: AppwinTrackEvent): Promise<void> {
    return invoke('notifications', 'track', deliveryId, event)
  },

  /**
   * App-open shortcut: emits `app_open`, then returns the pending messages.
   *
   * The event is sent **before** the read, so an automation hooked on app open
   * can produce a message that the same call brings back.
   */
  syncOnAppOpen(): Promise<AppwinInAppMessage[]> {
    return invoke('notifications', 'syncOnAppOpen')
  },
}
