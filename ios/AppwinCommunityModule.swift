import Foundation
import React
import AppwinCore
import AppwinCommunity

/** React Native bridge to `AppwinCommunity`. */
@objc(AppwinCommunityModule)
final class AppwinCommunityModule: RCTEventEmitter {

  @objc override static func requiresMainQueueSetup() -> Bool { true }

  // Set by the module that installed the SDK hooks, so a module invalidated by
  // a reload clears its own hooks and not the ones its successor installed.
  @MainActor private static weak var tapHookOwner: AppwinCommunityModule?
  @MainActor private static weak var editProfileHookOwner: AppwinCommunityModule?

  @MainActor private var eventsTask: Task<Void, Never>?
  @MainActor private var unreadCountTask: Task<Void, Never>?

  override func supportedEvents() -> [String]! {
    [
      "AppwinCommunityEvent",
      "AppwinCommunityUnreadCount",
      "AppwinCommunityNotificationTap",
      "AppwinCommunityEditProfile",
    ]
  }

  override func invalidate() {
    super.invalidate()
    Task { @MainActor in
      eventsTask?.cancel()
      unreadCountTask?.cancel()
      if Self.tapHookOwner === self { AppwinCommunity.onNotificationTap = nil }
      if Self.editProfileHookOwner === self { AppwinCommunity.onEditProfile = nil }
    }
  }

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

  // Hops to the main actor in call order, so a handler set before
  // `initialize()` is installed before the cold-start tap is replayed.
  @objc(setNotificationTapHandler:resolver:rejecter:)
  func setNotificationTapHandler(
    _ enabled: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      if enabled {
        Self.tapHookOwner = self
        AppwinCommunity.onNotificationTap = { [weak self] target in
          self?.sendEvent(
            withName: "AppwinCommunityNotificationTap",
            body: ["postId": target.postId, "commentId": Self.orNull(target.commentId)]
          )
        }
      } else if Self.tapHookOwner === self {
        Self.tapHookOwner = nil
        AppwinCommunity.onNotificationTap = nil
      }
      resolve(nil)
    }
  }

  @objc(setEditProfileHandler:resolver:rejecter:)
  func setEditProfileHandler(
    _ enabled: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      if enabled {
        Self.editProfileHookOwner = self
        AppwinCommunity.onEditProfile = { [weak self] in
          self?.sendEvent(withName: "AppwinCommunityEditProfile", body: nil)
        }
      } else if Self.editProfileHookOwner === self {
        Self.editProfileHookOwner = nil
        AppwinCommunity.onEditProfile = nil
      }
      resolve(nil)
    }
  }

  @objc(openPost:commentId:resolver:rejecter:)
  func openPost(
    _ postId: String,
    commentId: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      AppwinCommunity.openPost(postId, commentId: commentId)
      resolve(nil)
    }
  }

  @objc(getLastResult:rejecter:)
  func getLastResult(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinCommunity.lastResult.map(AppwinInitResultBridge.encode))
    }
  }

  @objc(startEvents:rejecter:)
  func startEvents(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      eventsTask?.cancel()
      let stream = AppwinCommunity.events
      eventsTask = Task { [weak self] in
        for await event in stream {
          self?.sendEvent(withName: "AppwinCommunityEvent", body: Self.encode(event))
        }
      }
      resolve(nil)
    }
  }

  @objc(stopEvents:rejecter:)
  func stopEvents(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      eventsTask?.cancel()
      eventsTask = nil
      resolve(nil)
    }
  }

  @objc(startUnreadCountUpdates:rejecter:)
  func startUnreadCountUpdates(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      unreadCountTask?.cancel()
      let stream = AppwinCommunity.unreadNotificationCountUpdates
      unreadCountTask = Task { [weak self] in
        for await count in stream {
          self?.sendEvent(withName: "AppwinCommunityUnreadCount", body: ["count": count])
        }
      }
      resolve(nil)
    }
  }

  @objc(stopUnreadCountUpdates:rejecter:)
  func stopUnreadCountUpdates(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      unreadCountTask?.cancel()
      unreadCountTask = nil
      resolve(nil)
    }
  }

  // An explicit null, so JavaScript reads `null` rather than a missing key.
  private static func orNull(_ value: String?) -> Any { value ?? NSNull() }

  private static func encode(_ event: AppwinCommunityEvent) -> [String: Any] {
    switch event {
    case .postCreated(let postId):
      return ["type": "postCreated", "postId": postId]
    case .commentCreated(let commentId, let postId):
      return ["type": "commentCreated", "commentId": commentId, "postId": postId]
    case .replyCreated(let replyId, let commentId, let postId):
      return ["type": "replyCreated", "replyId": replyId, "commentId": commentId, "postId": postId]
    case .reactionModified(let postId, let commentId, let reaction):
      return [
        "type": "reactionModified",
        "postId": postId,
        "commentId": orNull(commentId),
        "reaction": orNull(reaction),
      ]
    case .profileUpdated(let profileId):
      return ["type": "profileUpdated", "profileId": profileId]
    }
  }
}
