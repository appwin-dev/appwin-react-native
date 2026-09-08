# @appwin/react-native

React Native bridge to the native Appwin SDKs. The community feed and the
messenger are **rendered natively** - SwiftUI on iOS, Compose on Android.
Nothing is rebuilt in React Native: a third rendering of the same screen would
diverge from the other two at the first product change.

## Install

```bash
npm install @appwin/react-native
cd ios && pod install
```

Then rebuild. JavaScript alone is not enough: the native modules only exist in a
recompiled binary. Expo Go loads no third-party native module, so you need a
*development build*.

## Get started

```tsx
import { AppwinCore } from '@appwin/react-native'

await AppwinCore.configure({ projectAppId: 'your-app-id' })
```

One call covers every enabled product: they share the identity carried by the
foundation.

Then initialise each product you use, and gate your own UI on the answer:

```tsx
const support = await AppwinSupport.initialize()
console.log('Appwin Support:', support)   // { status: 'ready' } | { status: 'unavailable', reason: 'plan' }

if (support.status === 'ready') {
  // Show your help button, your tab, whatever opens support.
}
```

`configure` checks nothing; `initialize()` asks the server whether that product
may open for this app. It resolves rather than rejecting, because not being
entitled is a normal outcome of a normal launch. The SDK cannot hide your tab
or your button, it does not own your navigation, so that check is yours to
make. The three products share one round trip and the verdict is cached, so
being offline falls back to the last known answer instead of closing a product
you pay for.

| `status` | Meaning |
| --- | --- |
| `ready` | Open. Show your entry point. |
| `unavailable` | Refused. `reason` is `plan` (upgrade) or `disabled` (turn it on in the dashboard). |
| `notConfigured` | `AppwinCore.configure` was never called. |
| `unknown` | No network and no cached verdict. Retry; not a no. |

## Embed a screen

```tsx
import { AppwinCommunityView, AppwinSupportMessengerView } from '@appwin/react-native'

<Tab.Screen name="Community" component={() => <AppwinCommunityView style={{ flex: 1 }} />} />
```

This is the expected mode: the view takes the room your layout gives it and has
no close button, since there is a tab to leave it.

Without a dedicated tab, modal presentation is still available:

```tsx
await AppwinSupport.presentMessenger()
await AppwinCommunity.presentCommunity()
```

## Identity

```tsx
await AppwinCore.identify(user.id)
await AppwinCommunity.setUser({ nickname: user.displayName })

// on sign-out in your app
await AppwinCore.signOut()
```

Identify **before** pushing attributes: otherwise they land on the anonymous
profile and are lost when it is attached.

## Push

```tsx
await AppwinNotifications.registerPushToken(token, Platform.OS, true)
```

On iOS, pass the **APNs** token in hexadecimal, not the FCM token. Call it again
on every token rotation, otherwise the device becomes unreachable with nothing
to signal it.

## New Architecture

The modules work as-is on both the old and the new architecture, through the
interop layer.

The **views** go through legacy managers. On the New Architecture they have to
be declared to the Fabric interop:

```js
// index.js
import { unstable_setLegacyComponentNames } from 'react-native'
// or, depending on the version, the `unstable_reactLegacyComponentNames` list
// of the native entry point.
```

Migrating to Fabric is this package's next piece of work.

## What is not here

- **The entities are not exposed** to JavaScript: a post, a message, a
  conversation. Rendering is native, the host app does not need them, and
  exposing them would create a second source of truth to maintain.
- **In-app messages are returned, not drawn** on Android: rendering them is
  yours to do on that platform.

## Development

```bash
npm install
npm run typecheck
npm test
```

The tests cover the **bridge contract** - method names, argument order,
normalised values. It is the only place where the TypeScript layer can be wrong
without anything noticing before it runs on a phone. Rendering is native and is
tested in the corresponding SDKs.
