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
export { AppwinCommunityView, AppwinSupportMessengerView } from './views'
export type { AppwinNativeViewProps } from './views'
export { setNativeModuleResolver, NATIVE_MODULE_NAMES } from './native'
export type {
  AppwinAutomationEvent,
  AppwinCommunityProfile,
  AppwinConfigureOptions,
  AppwinCustomer,
  AppwinInAppContent,
  AppwinInAppMessage,
  AppwinPushPlatform,
  AppwinTrackEvent,
  AppwinUserAttributes,
} from './types'
