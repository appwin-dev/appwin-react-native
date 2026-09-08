import Foundation
import React
import AppwinCore
import AppwinCommunity

/** React Native bridge to `AppwinCommunity`. */
@objc(AppwinCommunityModule)
final class AppwinCommunityModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc(presentCommunity:rejecter:)
  func presentCommunity(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      AppwinCommunity.presentCommunity()
      resolve(nil)
    }
  }

  @objc(login:resolver:rejecter:)
  func login(
    _ externalId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        try await AppwinCommunity.login(externalId: externalId)
        resolve(nil)
      } catch {
        reject("appwin_login_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(logout:rejecter:)
  func logout(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      await AppwinCommunity.logout()
      resolve(nil)
    }
  }

  @objc(setUser:resolver:rejecter:)
  func setUser(
    _ attributes: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        let profile = try await AppwinCommunity.setUser(
          nickname: attributes["nickname"] as? String,
          avatarUrl: attributes["avatarUrl"] as? String,
          bio: attributes["bio"] as? String
        )
        resolve([
          "id": profile.id,
          "nickname": profile.nickname,
          "bio": profile.bio as Any,
          "avatarUrl": profile.avatarUrl as Any,
          "isAnonymous": profile.isAnonymous,
          "postCount": profile.postCount,
          "commentCount": profile.commentCount,
          "receivedReactionCount": profile.receivedReactionCount,
        ])
      } catch {
        reject("appwin_set_user_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(unreadNotificationCount:rejecter:)
  func unreadNotificationCount(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(await AppwinCommunity.unreadNotificationCount())
    }
  }

  @objc(initialize:rejecter:)
  func initialize(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinInitResultBridge.encode(await AppwinCommunity.initialize()))
    }
  }

}
