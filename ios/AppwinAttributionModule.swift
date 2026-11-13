import Foundation
import React
import AppwinCore
import AppwinAttribution

/** React Native bridge to `AppwinAttribution`. */
@objc(AppwinAttributionModule)
final class AppwinAttributionModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(initialize:rejecter:)
  func initialize(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinInitResultBridge.encode(await AppwinAttribution.initialize()))
    }
  }

  @objc(isReady:rejecter:)
  func isReady(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinAttribution.isReady)
    }
  }

  @objc(setAdvertisingConsent:resolver:rejecter:)
  func setAdvertisingConsent(
    _ consent: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    switch consent {
    case "granted": AppwinAttribution.setAdvertisingConsent(.granted)
    case "denied": AppwinAttribution.setAdvertisingConsent(.denied)
    default: AppwinAttribution.setAdvertisingConsent(.unknown)
    }
    resolve(nil)
  }

  @objc(requestTrackingAuthorization:rejecter:)
  func requestTrackingAuthorization(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(await AppwinAttribution.requestTrackingAuthorization())
    }
  }

  @objc(setAdSignalsDebugMode:resolver:rejecter:)
  func setAdSignalsDebugMode(
    _ enabled: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    AppwinAttribution.setAdSignalsDebugMode(enabled)
    resolve(nil)
  }
}
