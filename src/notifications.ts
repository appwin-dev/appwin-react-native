import { guarded, invoke } from './native'
import type {
  AppwinInitResult,
  AppwinAutomationEvent,
  AppwinInAppMessage,
  AppwinNotificationsStartOptions,
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

  /**
   * Starts lifecycle events, push and in-app UI.
   *
   * On iOS, the tap that launched the app only reaches the SDK if its
   * notification delegate is installed by the end of launch, long before this
   * runs from JavaScript: call `AppwinNotifications.ensurePushNotificationDelegate()`
   * in `application(_:didFinishLaunchingWithOptions:)` of your `AppDelegate`.
   * Not needed with `installsNotificationDelegate: false`, where your push
   * library reports the launch tap to `AppwinPush.handleTap`.
   */
  start(
    requestPushPermission = true,
    options: AppwinNotificationsStartOptions = {},
  ): Promise<void> {
    return guarded(
      'start',
      () =>
        invoke(
          'notifications',
          'start',
          requestPushPermission,
          options.installsNotificationDelegate ?? true,
        ),
      undefined,
    )
  },

  stop(): Promise<void> {
    return guarded('stop', () => invoke('notifications', 'stop'), undefined)
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
