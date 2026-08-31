import Foundation
import React
import AppwinNotifications

/** React Native bridge to `AppwinNotifications`. */
@objc(AppwinNotificationsModule)
final class AppwinNotificationsModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

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
        try await AppwinNotifications.registerPushToken(
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

  @objc(trackEvent:eventName:resolver:rejecter:)
  func trackEvent(
    _ event: String,
    eventName: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let automationEvent = AutomationEvent(rawValue: event) else {
      // An event unknown to the binary is an integration mistake, not an
      // outage: saying so explicitly avoids a hunt on the network side.
      reject("appwin_unknown_event", "Événement inconnu : \(event)", nil)
      return
    }

    Task { @MainActor in
      do {
        try await AppwinNotifications.trackEvent(automationEvent, eventName: eventName)
        resolve(nil)
      } catch {
        reject("appwin_track_event_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(track:event:resolver:rejecter:)
  func track(
    _ deliveryId: String,
    event: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let trackEvent = TrackEvent(rawValue: event) else {
      reject("appwin_unknown_event", "Événement inconnu : \(event)", nil)
      return
    }

    Task { @MainActor in
      do {
        try await AppwinNotifications.track(deliveryId: deliveryId, event: trackEvent)
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

  /// The bridge only carries Foundation types, so the conversion lives here,
  /// once, rather than at every call site.
  private static func serialize(_ message: InAppMessage) -> [String: Any] {
    [
      "id": message.id,
      "campaignId": message.campaignId,
      "deliveryId": message.deliveryId,
      "channel": message.channel,
      "format": message.format,
      "content": [
        "title": message.content.title as Any,
        "body": message.content.body as Any,
        "imageUrl": message.content.imageUrl as Any,
        "deeplink": message.content.deeplink as Any,
      ],
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
