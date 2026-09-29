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

Then rebuild: the native modules only exist in a recompiled binary. Expo Go
loads no third-party native module, so use a *development build*.

## Products

`AppwinCore` carries identity and sessions for every product; the others are
opt-in.

| Product | Exposes | Docs |
| --- | --- | --- |
| `AppwinCore` | Configure, identity, push token. Required. | [appwin-core](https://appwin.io/docs/products/appwin-core) |
| `AppwinSupport` | Messenger (embedded view or modal). | [support](https://appwin.io/docs/products/support) |
| `AppwinCommunity` | Feed (embedded view or modal), profile. | [community](https://appwin.io/docs/products/community) |
| `AppwinNotifications` | Push, in-app messages. | [notifications](https://appwin.io/docs/products/notifications) |
| `AppwinAnalytics` | Sessions, screens, custom events. | [analytics](https://appwin.io/docs/products/analytics) |
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
await AppwinCore.logout()
```

Screens can be embedded or presented modally:

```tsx
import { AppwinCommunityView } from '@appwin/react-native'

<AppwinCommunityView style={{ flex: 1 }} />       // embedded, no close button
await AppwinCommunity.presentCommunity()           // modal
```

See the [Quickstart](https://appwin.io/docs/sdk/installation).

## Push (owns its stack)

The SDK routes taps on Appwin pushes for you (cold start included). On iOS, add
one line to your `AppDelegate` so the launch tap is not missed before JavaScript
runs:

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

If your app owns its push stack (Firebase Messaging), forward each callback to
`AppwinPush` and handle the message yourself only when the call resolves
`false`:

```tsx
import messaging from '@react-native-firebase/messaging'
import { AppwinNotifications, AppwinPush } from '@appwin/react-native'

messaging().setBackgroundMessageHandler(async (message) => {
  await AppwinPush.handleMessage(message.data ?? {})
})

await AppwinNotifications.start(true, { installsNotificationDelegate: false })
messaging().onMessage(async (message) => {
  const data = message.data ?? {}
  if (await AppwinPush.handleMessage(data)) return
  if (await AppwinPush.handleForeground(data, message.notification)) return
  // not Appwin's, or Appwin let you show it
})
```

On Android, remove the SDK's messaging service so Firebase delivers to yours:

```xml
<!-- android/app/src/main/AndroidManifest.xml, with xmlns:tools declared -->
<service
  android:name="io.appwin.notifications.AppwinFirebaseMessagingService"
  tools:node="remove" />
```

## New Architecture

Modules work as-is on both architectures through the interop layer. The **views**
go through legacy managers, so on the New Architecture declare them to the Fabric
interop via `unstable_setLegacyComponentNames` (or the version-dependent
`unstable_reactLegacyComponentNames` list) in `index.js`.

## Support

Bugs and questions: the issues of this repository. Anything tied to your
account, billing or data goes through the support widget in your Appwin
dashboard.

## Licence

Proprietary, see [LICENSE](./LICENSE). This source is public for auditability
and studio-side debugging, not for reuse.
