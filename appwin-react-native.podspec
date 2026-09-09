require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "appwin-react-native"
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
  # The dependencies stay declared here because React Native's iOS chain goes
  # through CocoaPods - that is its tooling, not an Appwin choice.
  #
  # Stamped from sdk/version.json by scripts/release.mjs - do not hand-edit.
  # These sat at `~> 0.1` while the bridge called API added in native 0.5.0: an
  # existing Podfile.lock satisfies that range, so `pod install` resolved a Core
  # three minors behind and the build failed on `AppwinCore has no member
  # registerPushToken`. The bound is the iOS SDK's, not this package's.
  s.dependency "AppwinCore", ">= 0.5.1", "< 1.0.0"
  s.dependency "AppwinSupport", ">= 0.5.1", "< 1.0.0"
  s.dependency "AppwinCommunity", ">= 0.5.1", "< 1.0.0"
  s.dependency "AppwinNotifications", ">= 0.5.1", "< 1.0.0"
end
