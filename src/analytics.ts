import { invoke } from './native'
import type { AppwinInitResult } from './types'

/** Analytics consent, relayed to the native pipeline. */
export type AppwinAnalyticsConsent = 'granted' | 'denied' | 'unknown'

/**
 * Product analytics: sessions, screens and custom events, ingested by the
 * Appwin backend and explored in the web dashboard. The native SDK owns the
 * pipeline (batching, offline persistence, upload).
 *
 * ```tsx
 * import { AppwinAnalytics } from '@appwin/react-native'
 *
 * const verdict = await AppwinAnalytics.initialize()
 * if (verdict.status === 'ready') {
 *   AppwinAnalytics.track('level_completed', { level: 3 })
 * }
 * ```
 */
export const AppwinAnalytics = {
  /**
   * Starts the analytics pipeline, availability permitting. Call it after
   * `AppwinCore.configure`. Idempotent, cached on disk for offline launches.
   */
  initialize(): Promise<AppwinInitResult> {
    return invoke('analytics', 'initialize')
  },

  /** Whether `initialize` has answered ready. */
  isReady(): Promise<boolean> {
    return invoke('analytics', 'isReady')
  },

  /**
   * Queues a custom event. Never throws for an invalid name: the native SDK
   * drops it with a debug log. Props accept strings, numbers and booleans.
   *
   * The `purchase` convention: `{ value: 9.99, currency: 'EUR' }` makes the
   * amount reach the ad networks and the SKAN conversion value when
   * Attribution runs.
   */
  track(name: string, props?: Record<string, string | number | boolean>): Promise<void> {
    return invoke('analytics', 'track', name, props ?? null)
  },

  /** Emits the reserved `screen_view` event for `name`. */
  screen(name: string): Promise<void> {
    return invoke('analytics', 'screen', name)
  },

  /** Forces an immediate upload of the pending queue. Rarely needed. */
  flush(): Promise<void> {
    return invoke('analytics', 'flush')
  },

  /** Analytics consent. Callable before `initialize` (buffered natively). */
  setConsent(consent: AppwinAnalyticsConsent): Promise<void> {
    return invoke('analytics', 'setConsent', consent)
  },
}
