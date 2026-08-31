# Changelog - @appwin/react-native

Versions follow [semantic versioning](https://semver.org).

Each Appwin artefact versions independently: a fix here does not move the iOS,
Android or Flutter SDK. All four numbers live in one place, `version.json` in
the monorepo, and the release script derives every manifest and every
cross-artefact pin from it.

## Unreleased

- Android: `login` now waits for the server to attach the session instead of
  resolving straight away. The promise used to assume an attachment that was
  only local.
- Android: the current activity is read through the React context. Since React
  Native 0.80 the base class is Kotlin, and the inherited `currentActivity` was
  no longer reachable with property syntax: the module did not compile above
  0.79.

## 0.1.0

- First release: Core, Support, Community and Notifications bridges.
- Embeddable views `AppwinCommunityView` and `AppwinSupportMessengerView`.
- iOS and Android, on both the old and the new architecture for the modules.
