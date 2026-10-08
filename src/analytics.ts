import { installCrashHandlers, recordNonFatal } from './crashes'
import { guarded, invoke } from './native'
import type { AppwinInitResult } from './types'

const UNKNOWN_RESULT: AppwinInitResult = { status: 'unknown' }

/** Options of {@link AppwinAnalytics.initialize}. */
export interface AppwinAnalyticsOptions {
  /**
   * Captures native crashes and uncaught JavaScript errors (ADR-0056).
   * Default `true`. Handlers already installed (Sentry, Crashlytics) keep
   * running: Appwin chains them instead of replacing them.
   */
  crashReporting?: boolean
  /**
   * Session replay (ADR-0057). Default `true`; `false` never records this
   * app's screen, even when replay is switched on in the dashboard. When it is
   * on, a share of the sessions (set in the dashboard) is recorded natively as
   * video, one frame per second, under the same consent as the events. Text
   * inputs are always masked on the device, texts and images by default; wrap
   * a subtree in `<AppwinMask>` or `<AppwinUnmask>` to adjust it.
   */
  sessionReplay?: boolean
}

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
   *
   * With crash reporting on, the JavaScript global error handler is installed
   * right away, before availability answers, so a crash at launch is not
   * missed; the native SDK drops what it should not keep.
   */
  initialize(options: AppwinAnalyticsOptions = {}): Promise<AppwinInitResult> {
    const crashReporting = options.crashReporting ?? true
    const sessionReplay = options.sessionReplay ?? true
    if (crashReporting) installCrashHandlers()
    return guarded(
      'initialize',
      () => invoke('analytics', 'initialize', { crashReporting, sessionReplay }),
      UNKNOWN_RESULT,
    )
  },

  /**
   * Reports a caught error as a non-fatal issue, with its JavaScript stack.
   * Release stacks stay minified until sourcemaps are supported.
   */
  recordError(error: unknown): Promise<void> {
    return guarded('recordError', () => recordNonFatal(error), undefined)
  },

  /** Whether `initialize` has answered ready. */
  isReady(): Promise<boolean> {
    return guarded('isReady', () => invoke('analytics', 'isReady'), false)
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
    return guarded('track', () => invoke('analytics', 'track', name, props ?? null), undefined)
  },

  /** Emits the reserved `screen_view` event for `name`. */
  screen(name: string): Promise<void> {
    return guarded('screen', () => invoke('analytics', 'screen', name), undefined)
  },

  /** Forces an immediate upload of the pending queue. Rarely needed. */
  flush(): Promise<void> {
    return guarded('flush', () => invoke('analytics', 'flush'), undefined)
  },

  /** Analytics consent. Callable before `initialize` (buffered natively). */
  setConsent(consent: AppwinAnalyticsConsent): Promise<void> {
    return guarded('setConsent', () => invoke('analytics', 'setConsent', consent), undefined)
  },
}
