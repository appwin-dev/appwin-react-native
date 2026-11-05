require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  # Not the npm name: a pod named `appwin-react-native` builds the module
  # `appwin_react_native`, and React Native's `spm_dependency` (below), which
  # moves a static pod's module map from `<pod>/<module>.modulemap` to the
  # products root, rewrites the app's flags for `<pod>/<pod>.modulemap` only:
  # the build then fails on a module map « not found ». A name with no hyphen
  # is both. Nothing imports this module; autolinking finds the podspec by
  # its path (react-native.config.js), not by this name.
  s.name         = "AppwinReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.license      = package["license"]
  s.authors      = "Appwin"
  s.homepage     = "https://appwin.io"
  s.platforms    = { :ios => "16.0" }
  # `appwin-dev`, the org the mirrors are published to. `Les-Ignobles` is the
  # monorepo's org: that URL resolves to nothing public.
  s.source       = { :git => "https://github.com/appwin-dev/appwin-react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"

  # The native SDKs carry all the rendering; this package is only a bridge.
  # They come from Swift Package Manager, the package `appwin-ios` that a
  # native iOS app adds in Xcode, and not from CocoaPods trunk, which is
  # read-only from 2026-12-02. `spm_dependency` is React Native's helper for
  # that (0.75 and later): `react_native_post_install` adds the package to the
  # Pods project and links its products into this pod.
  #
  # Its alternative, the native sources copied into this package and compiled
  # by this podspec, does not hold: one pod is one Swift module, and the six
  # native modules declare types of the same name (`Factory`,
  # `CursorPaginated`...).
  unless defined?(spm_dependency)
    raise "@appwin/react-native needs React Native 0.75 or later: its native " \
          "SDKs come from Swift Package Manager through `spm_dependency`."
  end

  # The monorepo's own copy of the package, for the showcase; scripts/release.mjs
  # replaces it with the published repository's URL. `realpath`: the showcase
  # installs this package through a symlink, and `..` must be taken from the
  # monorepo, not from node_modules.
  appwin_ios = "https://github.com/appwin-dev/appwin-ios.git"

  spm_dependency(s,
    url: appwin_ios,
    # `upToNextMajorVersion` is SPM's `from:`, the range the Flutter plugins
    # use too. The bound is the iOS SDK's, not this package's: stamped from
    # sdk/version.json by scripts/release.mjs - do not hand-edit.
    requirement: { kind: "upToNextMajorVersion", minimumVersion: "1.2.0" },
    products: %w[
      AppwinCore
      AppwinSupport
      AppwinCommunity
      AppwinNotifications
      AppwinAnalytics
      AppwinAttribution
    ]
  )
end
