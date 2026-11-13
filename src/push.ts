import { guarded, invoke } from './native'
import type { AppwinPushData, AppwinPushNotificationText } from './types'

/**
 * Routes Appwin pushes to the product that owns them (a Support reply opens its
 * conversation, a campaign is tracked then opens its link).
 *
 * **Automatic mode** (default, the app has no push code of its own): nothing to
 * write, the native SDKs handle taps and foreground pushes.
 *
 * **Forwarding mode**: your app owns its push stack, for instance
 * `@react-native-firebase/messaging`. Forward each callback, and handle the
 * push yourself only when the call resolves `false`:
 *
 * ```ts
 * import messaging from '@react-native-firebase/messaging'
 * import { AppwinPush } from '@appwin/react-native'
 *
 * // index.js, outside any component: runs headless on Android.
 * messaging().setBackgroundMessageHandler(async (message) => {
 *   await AppwinPush.handleMessage(message.data ?? {})
 * })
 *
 * // At startup, after AppwinCore.configure().
 * const initial = await messaging().getInitialNotification()
 * if (initial) await AppwinPush.handleTap(initial.data ?? {})
 *
 * messaging().onNotificationOpenedApp((message) => {
 *   void AppwinPush.handleTap(message.data ?? {})
 * })
 *
 * messaging().onMessage(async (message) => {
 *   const data = message.data ?? {}
 *   if (await AppwinPush.handleMessage(data)) return
 *   if (await AppwinPush.handleForeground(data, message.notification)) return
 *   // not Appwin's, or Appwin let you show it: your own display code
 * })
 * ```
 *
 * On iOS, also call `AppwinNotifications.start(true, { installsNotificationDelegate: false })`
 * so the SDK leaves the `UNUserNotificationCenter` delegate to Firebase. On
 * Android, remove the SDK's messaging service from the merged manifest
 * (`tools:node="remove"` on `io.appwin.notifications.AppwinFirebaseMessagingService`).
 *
 * A tap reported before the owning product is initialized is kept and replayed
 * when it is, and a tap reported twice opens once: forwarding the launch tap
 * the SDK already saw is harmless.
 *
 * Mirrors `AppwinPush` in the native SDKs. The payload is parsed natively, never
 * here, so the three platforms cannot disagree on what an Appwin push is.
 */
export const AppwinPush = {
  /** Whether `data` (FCM `data`, or an APNs `userInfo`) is an Appwin push. */
  isAppwinPush(data: AppwinPushData): Promise<boolean> {
    return guarded('isAppwinPush', () => invoke('push', 'isAppwinPush', data), false)
  },

  /**
   * The user tapped a notification. Resolves `true` when it was Appwin's, which
   * then handles it: do not route it yourself.
   */
  handleTap(data: AppwinPushData): Promise<boolean> {
    return guarded('handleTap', () => invoke('push', 'handleTap', data), false)
  },

  /**
   * A push arrived while the app is in the foreground. Resolves `true` when
   * Appwin showed its own UI for it (e.g. the Support in-app banner): do not
   * display a notification as well.
   *
   * Pass `notification` when the title and body travel outside `data`, as with
   * Firebase Messaging's `message.notification`.
   */
  handleForeground(
    data: AppwinPushData,
    notification?: AppwinPushNotificationText | null,
  ): Promise<boolean> {
    return guarded(
      'handleForeground',
      () =>
        invoke(
          'push',
          'handleForeground',
          data,
          notification?.title ?? null,
          notification?.body ?? null,
        ),
      false,
    )
  },

  /**
   * A data (silent) message reached the app. Resolves `true` when Appwin
   * consumed it, once the work it triggers is done.
   */
  handleMessage(data: AppwinPushData): Promise<boolean> {
    return guarded('handleMessage', () => invoke('push', 'handleMessage', data), false)
  },
}
