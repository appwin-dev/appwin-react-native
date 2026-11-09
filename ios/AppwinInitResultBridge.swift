import Foundation
import AppwinCore

/// Maps the native init result onto what the TypeScript layer parses.
///
/// A dictionary rather than a bare string: the reason travels with the status,
/// and the two must not drift apart across the bridge. Shared by the three
/// product modules so a new status is added in one place.
enum AppwinInitResultBridge {
  static func encode(_ result: AppwinInitResult, pause: AppwinPause? = nil) -> [String: Any] {
    var event: [String: Any]
    switch result {
    case .ready:
      event = ["status": "ready"]
    case .notConfigured:
      event = ["status": "notConfigured"]
    case .unknown:
      event = ["status": "unknown"]
    case .unavailable(let reason):
      event = ["status": "unavailable", "reason": reason.rawValue]
    }
    if let pause { event["pause"] = encode(pause) }
    return event
  }

  /// The pause as the TypeScript side reads it; text as served, the empty string included.
  static func encode(_ pause: AppwinPause) -> [String: String] {
    ["since": pause.since, "title": pause.title, "message": pause.message]
  }
}
