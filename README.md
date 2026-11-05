# @appwin/react-native

React Native bridge to the native Appwin SDKs. The community feed and the
messenger are rendered natively (SwiftUI on iOS, Compose on Android); this
layer carries identity, sessions and the entry points.

Full guide, per-product APIs and dashboard setup:
https://appwin.io/docs/sdk/installation

## Install

```bash
npm install @appwin/react-native
cd ios && pod install
```

Then rebuild: the native modules only exist in a recompiled binary.

Requirements: React Native 0.75 or later, iOS 16.0, Android API 24 (`minSdk 24`).

On iOS the bridge takes the native SDK from Swift Package Manager
(`https://github.com/appwin-dev/appwin-ios`) through React Native's
`spm_dependency`, not from CocoaPods trunk: `pod install` adds the package to
the Pods project, nothing to add to your Podfile beyond the template's
`react_native_post_install`. Its « static linking, this might cause linker
errors » warning is expected and harmless for this package. Remove any
`pod 'AppwinCore'` (or other `Appwin…` pod) from your Podfile: the two copies
would collide.

Expo: Expo Go loads no third-party native module, so use a *development build*
(`npx expo run:ios` / `npx expo run:android`, or EAS). The package ships no
config plugin: the iOS `AppDelegate` line and the Android manifest change below
go into the native projects that `npx expo prebuild` generates.

## Products

`AppwinCore` carries identity and sessions for every product; the others are
opt-in.

| Product | Exposes | Docs |
| --- | --- | --- |
| `AppwinCore` | Configure, identity, events, consent, push token, availability. Required. | [appwin-core](https://appwin.io/docs/products/appwin-core) |
| `AppwinSupport` | Messenger (embedded view or modal). | [support](https://appwin.io/docs/products/support) |
| `AppwinCommunity` | Feed (embedded view or modal), profile, unread count, member events. | [community](https://appwin.io/docs/products/community) |
| `AppwinNotifications` | Push, in-app messages (`AppwinPush` routes the taps). | [notifications](https://appwin.io/docs/products/notifications) |
| `AppwinAnalytics` | Sessions, screens, crashes, session replay. | [analytics](https://appwin.io/docs/products/analytics) |
| `AppwinAttribution` | Acquisition attribution, ad consent. | [attribution](https://appwin.io/docs/products/attribution) |

## Quickstart

```tsx
import { AppwinCore, AppwinSupport } from '@appwin/react-native'

await AppwinCore.configure({ projectAppId: 'your-app-id' })

const support = await AppwinSupport.initialize()
if (support.status === 'ready') {
  await AppwinSupport.presentMessenger()
}
```

`configure` covers every enabled product: they share the identity carried by
Core. `initialize()` asks the server whether a product may open for this app and
resolves rather than rejecting (`ready` | `unavailable` | `notConfigured` |
`unknown`), so gate your own entry point on the answer. Identify before setting
a community profile, otherwise it lands on the anonymous profile:

```tsx
await AppwinCore.identify(user.id, { email: user.email, name: user.name })
await AppwinCore.updateUser({ plan: 'pro' })
await AppwinCommunity.setUser({ nickname: user.nickname })
await AppwinCore.logout()
```

`identify` and `updateUser` reject on failure. Every other call degrades to a
neutral value instead (only a blank `projectAppId` or push token throws), so it
needs no `try`/`catch`. Events go through
Core, whatever the product:

```tsx
await AppwinCore.track('purchase', { value: 9.99, currency: 'EUR' })
```

Screens can be embedded or presented modally:

```tsx
import { AppwinCommunity, AppwinCommunityView } from '@appwin/react-native'

<AppwinCommunityView style={{ flex: 1 }} />       // embedded, no close button
await AppwinCommunity.presentCommunity()           // modal
```

See the [Quickstart](https://appwin.io/docs/sdk/installation).

## Push (owns its stack)

The SDK routes taps on Appwin pushes for you (cold start included). Call
`AppwinNotifications.start()` once at startup, after `configure`. On iOS, add one
line to your Swift `AppDelegate` so the launch tap is not missed before
JavaScript runs:

```swift
import AppwinNotifications

func application(
  _ application: UIApplication,
  didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
) -> Bool {
  AppwinNotifications.ensurePushNotificationDelegate()
  // ... React Native setup
}
```

On Android, push goes through Firebase: add your `google-services.json`, the
`com.google.gms.google-services` Gradle plugin and
`com.google.firebase:firebase-messaging` to your app (the SDK compiles against
Firebase Messaging but does not bring it).

If your app owns its push stack (Firebase Messaging), forward each callback to
`AppwinPush` and handle the message yourself only when the call resolves
`false`:

```tsx
import messaging from '@react-native-firebase/messaging'
import { AppwinNotifications, AppwinPush } from '@appwin/react-native'

// index.js, outside any component: runs headless on Android.
messaging().setBackgroundMessageHandler(async (message) => {
  await AppwinPush.handleMessage(message.data ?? {})
})

// At startup, after AppwinCore.configure().
await AppwinNotifications.start(true, { installsNotificationDelegate: false })

const initial = await messaging().getInitialNotification()
if (initial) await AppwinPush.handleTap(initial.data ?? {})
messaging().onNotificationOpenedApp((message) => {
  void AppwinPush.handleTap(message.data ?? {})
})

messaging().onMessage(async (message) => {
  const data = message.data ?? {}
  if (await AppwinPush.handleMessage(data)) return
  if (await AppwinPush.handleForeground(data, message.notification)) return
  // not Appwin's, or Appwin let you show it
})
```

On Android, remove the SDK's messaging service so Firebase delivers to yours,
and forward each token rotation with
`messaging().onTokenRefresh((token) => AppwinCore.registerPushToken(token, 'android'))`:

```xml
<!-- android/app/src/main/AndroidManifest.xml, with xmlns:tools declared -->
<service
  android:name="io.appwin.notifications.AppwinFirebaseMessagingService"
  tools:node="remove" />
```

## Crashes

`AppwinAnalytics.initialize()` also captures native crashes and uncaught
JavaScript errors, with their stack, sent on the next launch. Handlers already
installed (Sentry, Crashlytics, the red box) keep running: Appwin chains them.

```tsx
await AppwinAnalytics.initialize()                          // crash reporting on
await AppwinAnalytics.initialize({ crashReporting: false }) // opt out

try {
  await checkout()
} catch (error) {
  AppwinAnalytics.recordError(error) // non-fatal issue
}
```

Unhandled promise rejections are captured on Hermes, in release builds only (in
development React Native keeps them for its own warnings). Release stacks stay
minified until sourcemap upload ships.

## Session replay

When session replay is switched on in the dashboard, `AppwinAnalytics.initialize()`
records a share of the sessions as video, natively, one frame per second, under
the same consent as the events. Masking happens on the device, before encoding:
text inputs always, texts and images unless the project settings say otherwise.

```tsx
import { AppwinMask, AppwinUnmask } from '@appwin/react-native'

await AppwinAnalytics.initialize({ sessionReplay: false }) // never record this app

<AppwinMask>
  <Text>{user.iban}</Text>        {/* hidden, whatever the settings */}
</AppwinMask>
<AppwinUnmask>
  <Text>{product.title}</Text>    {/* shown even when all text is masked */}
</AppwinUnmask>
```

Both render as a plain `View`. Text inputs inside `<AppwinUnmask>` stay masked.

## New Architecture

Modules and views work as-is on both architectures, through React Native's
interop layer. The views are legacy view managers: from React Native 0.74 the
interop layer picks them up on its own. Only on 0.73 with the New Architecture
enabled, list `AppwinCommunityView`, `AppwinSupportMessengerView`,
`AppwinMaskView` and `AppwinUnmaskView` under
`unstable_reactLegacyComponentNames` (for `ios` and `android`) in your app's
`react-native.config.js`.

## Support

Bugs and questions: the issues of this repository. Anything tied to your
account, billing or data goes through the support widget in your Appwin
dashboard.

## Licence

Proprietary, see [LICENSE](./LICENSE). This source is public for auditability
and studio-side debugging, not for reuse.
