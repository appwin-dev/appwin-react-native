# Changelog - @appwin/react-native

Versions follow [semantic versioning](https://semver.org).

Each Appwin artefact versions independently: a fix here does not move the iOS,
Android or Flutter SDK. All four numbers live in one place, `version.json` in
the monorepo, and the release script derives every manifest and every
cross-artefact pin from it.

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
