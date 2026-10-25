import { guarded, invoke } from './native'
import type {
  AppwinInitResult,
  AppwinAutomationEvent,
  AppwinInAppMessage,
  AppwinNotificationsStartOptions,
  AppwinTrackEvent,
} from './types'

const UNKNOWN_RESULT: AppwinInitResult = { status: 'unknown' }

/**
 * Appwin Notifications.
 *
 * After `AppwinCore.configure` and `initialize`, call `start()` once: the
 * native SDK owns push registration, realtime and the in-app message UI.
 * Lifecycle events come from Core.
 */
export const AppwinNotifications = {
  /**
   * Prepares Notifications for this app, and says whether it may be used.
   * Call it after `AppwinCore.configure()`. Resolves rather than rejecting.
   */
  initialize(): Promise<AppwinInitResult> {
    return guarded('initialize', () => invoke('notifications', 'initialize'), UNKNOWN_RESULT)
  },

  /**
   * Starts push and the in-app UI. With `requestPushPermission` (default
   * `true`), asks for push permission and registers the token.
   *
   * On iOS, the tap that launched the app only reaches the SDK if its
   * notification delegate is installed by the end of launch, long before this
   * runs from JavaScript: call the native Swift
   * `AppwinNotifications.ensurePushNotificationDelegate()` in
   * `application(_:didFinishLaunchingWithOptions:)` of your `AppDelegate`.
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

  /** Stops the lifecycle observers and the in-app message presenter. */
  stop(): Promise<void> {
    return guarded('stop', () => invoke('notifications', 'stop'), undefined)
  },

  /**
   * @deprecated Use `AppwinCore.track`. Lifecycle events (`app_open`,
   * `app_background`, `session_start`, `push_opt_in`) are now emitted by Core
   * and produce nothing here. Calling both `track` and `trackEvent` for the
   * same purchase counts it twice.
   */
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

  /**
   * The in-app messages waiting for this device, without presenting them.
   * Resolves `[]` on failure. Report what you show with `track`.
   */
  fetchPendingMessages(): Promise<AppwinInAppMessage[]> {
    return guarded('fetchPendingMessages', () => invoke('notifications', 'fetchPendingMessages'), [])
  },

  /**
   * Reports what became of an in-app message you presented yourself
   * (`buttonIndex` for a `clicked` button). Not the event entry point: that is
   * `AppwinCore.track`.
   */
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

  /**
   * @deprecated Use `presentPendingMessages` or `fetchPendingMessages`: the
   * app-open event is now sent by Core, so this only fetches the pending
   * messages.
   */
  syncOnAppOpen(): Promise<AppwinInAppMessage[]> {
    return guarded('syncOnAppOpen', () => invoke('notifications', 'syncOnAppOpen'), [])
  },

  /** Fetches the pending in-app messages and presents them with the SDK's UI. */
  presentPendingMessages(): Promise<void> {
    return guarded(
      'presentPendingMessages',
      () => invoke('notifications', 'presentPendingMessages'),
      undefined,
    )
  },
}
