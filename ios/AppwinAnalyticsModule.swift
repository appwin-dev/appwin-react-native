import Foundation
import React
import AppwinCore
import AppwinAnalytics

/** React Native bridge to `AppwinAnalytics`. */
@objc(AppwinAnalyticsModule)
final class AppwinAnalyticsModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(initialize:resolver:rejecter:)
  func initialize(
    _ options: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let crashReporting = (options?["crashReporting"] as? Bool) ?? true
    Task { @MainActor in
      resolve(AppwinInitResultBridge.encode(
        await AppwinAnalytics.initialize(crashReporting: crashReporting)
      ))
    }
  }

  @objc(isReady:rejecter:)
  func isReady(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinAnalytics.isReady)
    }
  }

  @objc(track:props:resolver:rejecter:)
  func track(
    _ name: String,
    props: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    AppwinAnalytics.track(name, props: Self.parseProps(props))
    resolve(nil)
  }

  @objc(screen:resolver:rejecter:)
  func screen(
    _ name: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    AppwinAnalytics.screen(name)
    resolve(nil)
  }

  @objc(flush:rejecter:)
  func flush(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    AppwinAnalytics.flush()
    resolve(nil)
  }

  @objc(setConsent:resolver:rejecter:)
  func setConsent(
    _ consent: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    switch consent {
    case "granted": AppwinAnalytics.setConsent(.granted)
    case "denied": AppwinAnalytics.setConsent(.denied)
    default: AppwinAnalytics.setConsent(.unknown)
    }
    resolve(nil)
  }

  @objc(recordBridgedError:type:message:frames:resolver:rejecter:)
  func recordBridgedError(
    _ fatal: Bool,
    type: String,
    message: String?,
    frames: NSArray?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.record(fatal: fatal, type: type, message: message, frames: frames)
    resolve(nil)
  }

  /// Runs on the JS thread and returns only once the report is written.
  @objc(recordBridgedErrorSync:type:message:frames:)
  func recordBridgedErrorSync(
    _ fatal: Bool,
    type: String,
    message: String?,
    frames: NSArray?
  ) -> NSNumber {
    Self.record(fatal: fatal, type: type, message: message, frames: frames)
    return true
  }

  private static func record(fatal: Bool, type: String, message: String?, frames: NSArray?) {
    let parsed = (frames as? [Any])?.compactMap { $0 as? [String: Any] } ?? []
    AppwinAnalytics.recordBridgedError(
      runtime: "react_native",
      fatal: fatal,
      type: type,
      message: message,
      frames: parsed
    )
  }

  /// Bridge props to the SDK's typed values. Numbers cross as NSNumber:
  /// booleans are told apart via the CF type, ints stay ints, everything
  /// decimal becomes a double.
  private static func parseProps(_ raw: NSDictionary?) -> [String: AnalyticsValue]? {
    guard let dict = raw as? [String: Any], !dict.isEmpty else { return nil }
    var out: [String: AnalyticsValue] = [:]
    for (key, value) in dict {
      switch value {
      case let number as NSNumber:
        if CFGetTypeID(number) == CFBooleanGetTypeID() {
          out[key] = .bool(number.boolValue)
        } else if CFNumberIsFloatType(number) {
          out[key] = .double(number.doubleValue)
        } else {
          out[key] = .int(number.intValue)
        }
      case let string as String:
        out[key] = .string(string)
      default:
        out[key] = AnalyticsValue.string(String(describing: value))
      }
    }
    return out
  }
}
