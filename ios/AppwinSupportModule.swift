import Foundation
import React
import AppwinCore
import AppwinSupport

/** React Native bridge to `AppwinSupport`. */
@objc(AppwinSupportModule)
final class AppwinSupportModule: NSObject {

  // This module presents a screen, so React Native must initialise it on the
  // main queue, or the presentation would start from a background thread.
  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc(initialize:rejecter:)
  func initialize(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinInitResultBridge.encode(await AppwinSupport.initialize()))
    }
  }

  @objc(isReady:rejecter:)
  func isReady(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinSupport.isReady)
    }
  }

  @objc(version:rejecter:)
  func version(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(AppwinSupport.version)
  }

  @objc(presentMessenger:rejecter:)
  func presentMessenger(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      AppwinSupport.presentMessenger()
      resolve(nil)
    }
  }

  @objc(presentConversation:resolver:rejecter:)
  func presentConversation(
    _ conversationId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      AppwinSupport.presentConversation(id: conversationId)
      resolve(nil)
    }
  }
}
