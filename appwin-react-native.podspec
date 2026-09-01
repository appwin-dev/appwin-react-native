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
  s.dependency "AppwinCore", "~> 0.1"
  s.dependency "AppwinSupport", "~> 0.1"
  s.dependency "AppwinCommunity", "~> 0.1"
  s.dependency "AppwinNotifications", "~> 0.1"
end
