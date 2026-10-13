import Foundation
import React
import AppwinCore

/**
 Pont React Native vers `AppwinCore`.

 Toutes les méthodes sont exposées en promesses : le pont React Native n'a pas
 d'équivalent d'`async/await`, et un rappel d'erreur silencieux masquerait une
 session qui ne s'ouvre pas.

 Les appels sont marqués `requiresMainQueueSetup` à `false` : le module ne
 touche à aucune vue, rien ne justifie de retarder le démarrage de l'app.
 */
@objc(AppwinCoreModule)
final class AppwinCoreModule: RCTEventEmitter {

  @objc override static func requiresMainQueueSetup() -> Bool { false }

  @MainActor private var availabilityTasks: [String: Task<Void, Never>] = [:]

  override func supportedEvents() -> [String]! { ["AppwinAvailabilityChanged"] }

  override func invalidate() {
    super.invalidate()
    Task { @MainActor in
      availabilityTasks.values.forEach { $0.cancel() }
      availabilityTasks = [:]
    }
  }

  @objc(startAvailabilityUpdates:resolver:rejecter:)
  func startAvailabilityUpdates(
    _ product: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let appwinProduct = AppwinProduct(rawValue: product) else {
      reject("appwin_invalid_argument", "Unknown product: \(product)", nil)
      return
    }
    Task { @MainActor in
      availabilityTasks[product]?.cancel()
      let stream = AppwinCore.availabilityUpdates(of: appwinProduct)
      availabilityTasks[product] = Task { [weak self] in
        for await result in stream {
          self?.sendEvent(
            withName: "AppwinAvailabilityChanged",
            body: ["product": product, "result": AppwinInitResultBridge.encode(result)]
          )
        }
      }
      resolve(nil)
    }
  }

  @objc(stopAvailabilityUpdates:resolver:rejecter:)
  func stopAvailabilityUpdates(
    _ product: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      availabilityTasks.removeValue(forKey: product)?.cancel()
      resolve(nil)
    }
  }

  @objc(configure:resolver:rejecter:)
  func configure(
    _ options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let appId = options["projectAppId"] as? String, !appId.isEmpty else {
      reject("appwin_invalid_argument", "projectAppId est requis", nil)
      return
    }

    let baseUrl = options["baseUrl"] as? String
    let realtimeBaseUrl = options["realtimeBaseUrl"] as? String

    Task { @MainActor in
      AppwinCore.configure(
        projectAppId: appId,
        baseUrl: baseUrl,
        realtimeBaseUrl: realtimeBaseUrl
      )
      resolve(nil)
    }
  }

  @objc(identify:attributes:resolver:rejecter:)
  func identify(
    _ externalId: String,
    attributes: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        // RN drops `null`/`undefined` args and can shift the promise resolve
        // block into this slot. Do not use `is [AnyHashable: Any]` - that
        // path calls `count` on whatever object landed here and crashes on a
        // block. `isKind(of:)` is the safe ObjC check.
        let decoded: AppwinUserAttributes? = {
          guard let attributes, attributes.isKind(of: NSDictionary.self) else { return nil }
          return Self.decodeAttributes(attributes)
        }()
        try await AppwinCore.identify(
          externalId: externalId,
          attributes: decoded
        )
        resolve(nil)
      } catch {
        reject("appwin_identify_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(updateUser:resolver:rejecter:)
  func updateUser(
    _ attributes: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        try await AppwinCore.updateUser(Self.decodeAttributes(attributes))
        resolve(nil)
      } catch {
        reject("appwin_update_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(logout:rejecter:)
  func logout(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      await AppwinCore.logout()
      resolve(nil)
    }
  }

  @objc(getDeviceId:rejecter:)
  func getDeviceId(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(AppwinCore.deviceId)
  }

  @objc(registerPushToken:platform:pushOptIn:resolver:rejecter:)
  func registerPushToken(
    _ token: String,
    platform: String,
    pushOptIn: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        try await AppwinCore.registerPushToken(
          token,
          platform: platform,
          pushOptIn: pushOptIn
        )
        resolve(nil)
      } catch {
        reject("appwin_push_token_failed", error.localizedDescription, error)
      }
    }
  }

  // `as? String` also drops an explicit JS `null`, so an absent key and a
  // `null` both mean "leave untouched", as the TypeScript contract promises.
  private static func decodeAttributes(_ attributes: NSDictionary) -> AppwinUserAttributes {
    func string(_ key: String) -> String? {
      attributes.object(forKey: key) as? String
    }
    return AppwinUserAttributes(
      email: string("email"),
      name: string("name"),
      avatarUrl: string("avatarUrl"),
      language: string("language"),
      timezone: string("timezone"),
      location: string("location"),
      plan: string("plan"),
      customAttributes: (attributes.object(forKey: "customAttributes") as? NSDictionary)
        .map(stringEntries)
    )
  }

  private static func stringEntries(_ dictionary: NSDictionary) -> [String: String] {
    var entries: [String: String] = [:]
    for case let (key as String, value as String) in dictionary {
      entries[key] = value
    }
    return entries
  }
}
