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

  @objc(loginIdentifiedUser:resolver:rejecter:)
  func loginIdentifiedUser(
    _ externalId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        _ = try await AppwinSupport.loginIdentifiedUser(externalId: externalId)
        resolve(nil)
      } catch {
        reject("appwin_login_failed", error.localizedDescription, error)
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
        let customer = try await AppwinSupport.updateUser(
          attributes: AppwinSupportUserAttributes(
            email: attributes["email"] as? String,
            name: attributes["name"] as? String,
            avatarUrl: attributes["avatarUrl"] as? String,
            language: attributes["language"] as? String,
            timezone: attributes["timezone"] as? String,
            location: attributes["location"] as? String
          )
        )
        // Serialised by hand: the bridge only carries Foundation types, and
        // exposing the full entity would push through fields the JavaScript has
        // no use for.
        resolve([
          "id": customer.id,
          "externalId": customer.externalId as Any,
          "name": customer.name as Any,
          "email": customer.email as Any,
          "avatarUrl": customer.avatarUrl as Any,
        ])
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
      await AppwinCore.signOut()
      resolve(nil)
    }
  }

  @objc(initialize:rejecter:)
  func initialize(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinInitResultBridge.encode(await AppwinSupport.initialize()))
    }
  }

}
