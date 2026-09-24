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
final class AppwinCoreModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

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
        try await AppwinCore.identify(
          externalId: externalId,
          attributes: attributes.map(Self.decodeAttributes)
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
    AppwinUserAttributes(
      email: attributes["email"] as? String,
      name: attributes["name"] as? String,
      avatarUrl: attributes["avatarUrl"] as? String,
      language: attributes["language"] as? String,
      timezone: attributes["timezone"] as? String,
      location: attributes["location"] as? String,
      plan: attributes["plan"] as? String
    )
  }
}
