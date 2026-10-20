import Foundation
import React
import AppwinCore

/** React Native bridge to `AppwinPush`. */
@objc(AppwinPushModule)
final class AppwinPushModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(isAppwinPush:resolver:rejecter:)
  func isAppwinPush(
    _ data: [AnyHashable: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(AppwinPush.isAppwinPush(data))
  }

  @objc(handleTap:resolver:rejecter:)
  func handleTap(
    _ data: [AnyHashable: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinPush.handleTap(data))
    }
  }

  @objc(handleForeground:title:body:resolver:rejecter:)
  func handleForeground(
    _ data: [AnyHashable: Any],
    title: String?,
    body: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinPush.handleForeground(data, title: title, body: body))
    }
  }

  @objc(handleMessage:resolver:rejecter:)
  func handleMessage(
    _ data: [AnyHashable: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(await AppwinPush.handleMessage(data))
    }
  }
}
