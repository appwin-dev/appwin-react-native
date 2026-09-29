# Changelog - @appwin/react-native

Versions follow [semantic versioning](https://semver.org).

Each Appwin artefact versions independently: a fix here does not move the iOS,
Android or Flutter SDK. All four numbers live in one place, `version.json` in
the monorepo, and the release script derives every manifest and every
cross-artefact pin from it.

## 0.9.1

**Native SDKs 0.9.1.** `registerPushToken` now waits for the session before
posting and retries once with a fresh session when the bearer was rotated
meanwhile by a concurrent `identify`: the 401 a token registered right after
`configure` could get is gone. No API change on this side.

## 0.9.0

**Debug builds unlock Community without the plan.** The native SDKs mark
requests from a debug build; when the organisation's plan does not include
Community, that build gets `ready` and a console warning. Release builds still
need the plan.

**A placeholder instead of an empty view.** While Community is not ready,
`AppwinCommunityView` shows a "coming soon" screen, with a diagnosis card in
debug builds. The `unavailable` render prop takes your own UI. The view
follows the verdict live.

**Push taps reach Community when the feed is not on screen.** A tap opens the
post in the visible feed, otherwise full screen over the app.
`AppwinCommunity.setOnNotificationTap` routes it yourself (set it before
`initialize()`), and `AppwinCommunity.openPost(postId, commentId?)` opens a
post in the mounted feed or full screen.

**New.**

- `AppwinCommunity.addEventListener`: the current member's own actions
  (`postCreated`, `commentCreated`, `replyCreated`, `reactionModified`,
  `profileUpdated`), once the server accepted them.
- `AppwinCommunity.addUnreadCountListener`: the unread count,
  live.
- `AppwinCommunity.setOnEditProfile`: replaces the SDK's profile editor; push
  the result with `setUser`.
- `AppwinCommunity.getLastResult()`: the current verdict, kept live.
- `AppwinCore.addAvailabilityListener(product, listener)`: a product's
  verdict, then every change.

Every listener returns its unsubscribe function.

## 0.8.0

**Breaking: user identity now lives in Core, once.** `AppwinCore.identify`
opens the server session with the id and persists it across launches,
`AppwinCore.updateUser` sets the user attributes (email, name, avatarUrl,
language, timezone, location, plan), `AppwinCore.logout` revokes the session
and starts a fresh anonymous one. Products no longer have identity functions:
they read the session Core holds, and refresh when it changes.

| 0.7 | 0.8 |
|---|---|
| `AppwinCore.identify(externalId)` | `await AppwinCore.identify(externalId, attributes?)` |
| `AppwinSupport.loginIdentifiedUser(...)` | `await AppwinCore.identify(...)` |
| `AppwinSupport.updateUser(...)` | `await AppwinCore.updateUser(attributes)` |
| `AppwinSupport.loginUnidentifiedUser()` | nothing: Core opens the anonymous session itself |
| `AppwinCommunity.login(...)` | `await AppwinCore.identify(...)` |
| `signOut()`, `clearIdentity()`, `AppwinSupport.logout()`, `AppwinCommunity.logout()` | `await AppwinCore.logout()` |
| `bootstrapSession()` | nothing: internal now |
| `AppwinNotifications.registerPushToken(...)` | `AppwinCore.registerPushToken(...)` |

`AppwinSupportUserAttributes` becomes `AppwinUserAttributes`, in Core.

**Fixed: identifying through Support did not identify.** The id never reached
the server once a session existed, so the visitor stayed an anonymous lead.
Internal session renewals (availability, analytics re-auth) also dropped the
id, and a concurrent `identify` could be handed the anonymous session being
opened. The id is now persisted and reused by every renewal.

**Fixed: a logout kept the device attached to the user.** The next anonymous
session landed on the person who had just signed out (server-side fix, no
action needed).

**`identify` and `updateUser` now reject.** Unlike the rest of the API, they
surface failures: a sign-in that fails silently leaves the app believing its
user is identified. `logout` never rejects.

**New: `AppwinPush`.** Bridges the native push router, for apps that own their
push stack (`@react-native-firebase/messaging`): forward your callbacks to
`AppwinPush.handleTap`, `handleForeground`, `handleMessage`, and test with
`isAppwinPush`. Each resolves `true` when the push was Appwin's and is handled;
a bridge failure resolves `false`, so your own handling still runs. The payload
is parsed natively, not in JavaScript. Same names as on iOS and Android.

**`AppwinNotifications.start` takes `{ installsNotificationDelegate }`** (iOS,
ignored on Android). Pass `false` to leave the `UNUserNotificationCenter`
delegate to your push library. Left `true`, the SDK's delegate now hands every
notification that is not Appwin's to the delegate it displaced.

**The tap that launched the app is no longer lost on Android.** The bridge
forwards the launch intent once `AppwinCore.configure()` has run, and every new
intent after it. On iOS, call `AppwinNotifications.ensurePushNotificationDelegate()`
in `didFinishLaunchingWithOptions` (see the README).

Requires the native SDKs carrying `AppwinPush`: rebuild the app after updating.

## 0.4.0

**Analytics and Attribution reach React Native.** Two new modules complete
the product line:

- `AppwinAnalytics` - `initialize`, `isReady`, `track` (with the
  `{value, currency}` purchase convention), `screen`, `flush`, `setConsent`.
- `AppwinAttribution` - `initialize`, `isReady`, `setAdvertisingConsent`,
  `requestTrackingAuthorization` (ATT on iOS, resolves `true` on Android),
  `setAdSignalsDebugMode` (TikTok test events).

Both are thin bridges over the native 0.6.x SDKs and share `AppwinCore`'s
single `configure()`.

## 0.3.4

**Native SDKs 0.6.2 under the hood.** The pinned cores now report their real
version to the dashboard. No JS API change.

## 0.3.3

**Native SDKs 0.6.1 under the hood.** The pinned iOS and Android cores gain a
one-hour revalidation TTL on the availability verdict: release builds skip the
network round trip at most launches, debug builds still revalidate every time
so the toggle-relaunch-ready loop stays instant. No JS API change.

## 0.3.2

**iOS builds through CocoaPods again.** The podspec pinned the four native pods
at `~> 0.1`, unchanged since 0.1.0, while the bridge called API added in native
0.5.0. That range accepts anything below 1.0.0, so an existing `Podfile.lock`
already satisfied it, `pod install` upgraded nothing, and the build failed with
`Type 'AppwinCore' has no member 'registerPushToken'` - an error naming the
bridge rather than the version skew. The pins are now `>= 0.5.1, < 1.0.0` and
the release script stamps them from `version.json`.

The native pods were also missing from CocoaPods trunk for 0.3.0, 0.4.0 and
0.5.0, and native 0.5.0 could not compile under CocoaPods at all. Both are
fixed in iOS 0.5.1, which this release pins. No JS API change.

## 0.3.1

The Android AARs move to `0.5.0`. The bridge shipped with them pinned at
`0.3.0`, two releases behind, so a React Native app got none of the native work
of 0.4.0 or 0.5.0 - the messenger bottom sheet, the analytics pipeline, install
attribution, in-app banners. No change to the JavaScript API.

## 0.3.0

**Breaking.** `registerPushToken` moved from Support to the foundation: it is
now `AppwinCore.registerPushToken(...)`. The token is shared by Support, Community and Notifications, so it
belongs to the socle rather than to one product; it still posts to the Support
route, so registering it needs no Notifications entitlement. A product whose
`initialize()` runs without a registered token logs a warning - recommended for
Support and Community, required for Notifications - rather than refusing to
start.

- `initialize()` answered `unknown` on a first launch of an app that was
  online: the bridge asks the native foundations, and those queried a
  bearer-only endpoint before `configure` had opened the session. The
  Android and iOS SDKs this version pins (0.2.1) await it first.
- Android: `login` now waits for the server to attach the session instead of
  resolving straight away. The promise used to assume an attachment that was
  only local.
- Android: the current activity is read through the React context. Since React
  Native 0.80 the base class is Kotlin, and the inherited `currentActivity` was
  no longer reachable with property syntax: the module did not compile above
  0.79.

## 0.2.0

`AppwinSupport.initialize()`, `AppwinCommunity.initialize()` and
`AppwinNotifications.initialize()` ask the server whether the product may open,
and resolve with `{ status, reason }`. Call them after `AppwinCore.configure`
and gate your own UI on the result.

## 0.1.0

- First release: Core, Support, Community and Notifications bridges.
- Embeddable views `AppwinCommunityView` and `AppwinSupportMessengerView`.
- iOS and Android, on both the old and the new architecture for the modules.
