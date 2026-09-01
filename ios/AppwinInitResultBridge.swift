import Foundation
import AppwinCore

/// Maps the native init result onto what the TypeScript layer parses.
///
/// A dictionary rather than a bare string: the reason travels with the status,
/// and the two must not drift apart across the bridge. Shared by the three
/// product modules so a new status is added in one place.
enum AppwinInitResultBridge {
  static func encode(_ result: AppwinInitResult) -> [String: Any] {
    switch result {
    case .ready:
      return ["status": "ready"]
    case .notConfigured:
      return ["status": "notConfigured"]
    case .unknown:
      return ["status": "unknown"]
    case .unavailable(let reason):
      return ["status": "unavailable", "reason": reason.rawValue]
    }
  }
}
