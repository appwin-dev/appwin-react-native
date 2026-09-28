/**
 * Appwin React Native SDK.
 *
 * A bridge to the native iOS and Android SDKs: they render the community feed
 * and the messenger, this layer carries the identity, the session and the
 * entry points.
 *
 * ```tsx
 * import { AppwinCore, AppwinCommunityView } from '@appwin/react-native'
 *
 * await AppwinCore.configure({ projectAppId: 'your-app-id' })
 * ```
 */
export { AppwinCore } from './core'
export { AppwinSupport } from './support'
export { AppwinCommunity } from './community'
export { AppwinNotifications } from './notifications'
export { AppwinPush } from './push'
export { AppwinAnalytics } from './analytics'
export type { AppwinAnalyticsConsent } from './analytics'
export { AppwinAttribution } from './attribution'
export type { AppwinAdvertisingConsent } from './attribution'
export { AppwinCommunityView, AppwinSupportMessengerView } from './views'
export type { AppwinCommunityViewProps, AppwinNativeViewProps } from './views'
export { setNativeModuleResolver, NATIVE_MODULE_NAMES } from './native'
export type { AppwinUnsubscribe } from './events'
export type {
  AppwinAutomationEvent,
  AppwinCommunityEvent,
  AppwinCommunityPostTarget,
  AppwinCommunityProfile,
  AppwinConfigureOptions,
  AppwinInAppContent,
  AppwinInAppMessage,
  AppwinInitResult,
  AppwinInitStatus,
  AppwinNotificationsStartOptions,
  AppwinProduct,
  AppwinPushData,
  AppwinPushNotificationText,
  AppwinPushPlatform,
  AppwinTrackEvent,
  AppwinUnavailableReason,
  AppwinUserAttributes,
} from './types'
