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

  @objc(bootstrapSession:rejecter:)
  func bootstrapSession(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        resolve(try await AppwinCore.bootstrapSession())
      } catch {
        reject("appwin_session_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(identify:resolver:rejecter:)
  func identify(
    _ externalId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      AppwinCore.identify(externalId: externalId)
      resolve(nil)
    }
  }

  @objc(clearIdentity:rejecter:)
  func clearIdentity(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      AppwinCore.clearIdentity()
      resolve(nil)
    }
  }

  @objc(signOut:rejecter:)
  func signOut(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      await AppwinCore.signOut()
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
}
