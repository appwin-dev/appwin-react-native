import Foundation
import React
import AppwinCore
import AppwinNotifications

/** React Native bridge to `AppwinNotifications`. */
@objc(AppwinNotificationsModule)
final class AppwinNotificationsModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(start:resolver:rejecter:)
  func start(
    _ requestPushPermission: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      await AppwinNotifications.start(requestPushPermission: requestPushPermission)
      resolve(nil)
    }
  }

  @objc(stop:rejecter:)
  func stop(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      AppwinNotifications.stop()
      resolve(nil)
    }
  }

  @objc(registerPushToken:platform:pushOptIn:resolver:rejecter:)
  func registerPushToken(
    _ token: String,
    platform: String,
    pushOptIn: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        try await AppwinCore.registerPushToken(
          token,
          platform: platform,
          pushOptIn: pushOptIn.boolValue
        )
        resolve(nil)
      } catch {
        reject("appwin_push_token_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(trackEvent:eventName:properties:resolver:rejecter:)
  func trackEvent(
    _ event: String,
    eventName: String?,
    properties: [String: String]?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let automationEvent = AutomationEvent(rawValue: event) else {
      reject("appwin_unknown_event", "Événement inconnu : \(event)", nil)
      return
    }

    Task { @MainActor in
      do {
        try await AppwinNotifications.trackEvent(
          automationEvent,
          eventName: eventName,
          properties: properties
        )
        resolve(nil)
      } catch {
        reject("appwin_track_event_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(track:event:buttonIndex:resolver:rejecter:)
  func track(
    _ deliveryId: String,
    event: String,
    buttonIndex: NSNumber?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let trackEvent = TrackEvent(rawValue: event) else {
      reject("appwin_unknown_event", "Événement inconnu : \(event)", nil)
      return
    }

    Task { @MainActor in
      do {
        try await AppwinNotifications.track(
          deliveryId: deliveryId,
          event: trackEvent,
          buttonIndex: buttonIndex?.intValue
        )
        resolve(nil)
      } catch {
        reject("appwin_track_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(fetchPendingMessages:rejecter:)
  func fetchPendingMessages(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        resolve(try await AppwinNotifications.fetchPendingMessages().map(Self.serialize))
      } catch {
        reject("appwin_fetch_messages_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(syncOnAppOpen:rejecter:)
  func syncOnAppOpen(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        resolve(try await AppwinNotifications.syncOnAppOpen().map(Self.serialize))
      } catch {
        reject("appwin_sync_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(presentPendingMessages:rejecter:)
  func presentPendingMessages(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        try await AppwinNotifications.presentPendingMessages()
        resolve(nil)
      } catch {
        reject("appwin_present_failed", error.localizedDescription, error)
      }
    }
  }

  private static func serialize(_ message: InAppMessage) -> [String: Any] {
    var content: [String: Any] = [
      "title": message.content.title as Any,
      "body": message.content.body as Any,
      "imageUrl": message.content.imageUrl as Any,
      "deeplink": message.content.deeplink as Any,
    ]
    if let buttons = message.content.buttons {
      content["buttons"] = buttons.map { button in
        var map: [String: Any] = ["label": button.label, "action": button.action.rawValue]
        if let url = button.url { map["url"] = url }
        return map
      }
    }
    return [
      "id": message.id,
      "campaignId": message.campaignId,
      "deliveryId": message.deliveryId,
      "channel": message.channel.rawValue,
      "format": message.format.rawValue,
      "content": content,
    ]
  }

  @objc(initialize:rejecter:)
  func initialize(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(AppwinInitResultBridge.encode(await AppwinNotifications.initialize()))
    }
  }
}
