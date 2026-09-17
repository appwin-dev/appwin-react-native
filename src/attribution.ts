import { Platform } from 'react-native'
import { invoke } from './native'
import type { AppwinInitResult } from './types'

/**
 * Advertising consent (opt-in): whether conversion signals may be activated
 * towards the ad networks and whether the advertising identifier may be
 * collected.
 */
export type AppwinAdvertisingConsent = 'granted' | 'denied' | 'unknown'

/**
 * Acquisition attribution: SKAdNetwork conversion values and the advertising
 * identity (IDFA) on iOS, the Play Install Referrer and GAID on Android, plus
 * the optional embedded ad-network adapters (TikTok).
 *
 * ```tsx
 * import { AppwinAttribution } from '@appwin/react-native'
 *
 * AppwinAttribution.setAdvertisingConsent('granted')
 * await AppwinAttribution.initialize()
 * await AppwinAttribution.requestTrackingAuthorization()
 * ```
 */
export const AppwinAttribution = {
  /**
   * Starts the acquisition signals, availability permitting. Call it after
   * `AppwinCore.configure`. Idempotent, cached on disk for offline launches.
   */
  initialize(): Promise<AppwinInitResult> {
    return invoke('attribution', 'initialize')
  },

  /** Whether `initialize` has answered ready. */
  isReady(): Promise<boolean> {
    return invoke('attribution', 'isReady')
  },

  /**
   * Relays your consent flow's verdict. Callable before `initialize`
   * (buffered natively). This decides IF signals reach the networks at all;
   * on iOS, ATT decides only whether the IDFA enriches them.
   */
  setAdvertisingConsent(consent: AppwinAdvertisingConsent): Promise<void> {
    return invoke('attribution', 'setAdvertisingConsent', consent)
  },

  /**
   * Presents the ATT prompt on iOS and resolves with the answer. The app
   * decides WHEN to ask, and must declare `NSUserTrackingUsageDescription` in
   * its Info.plist. Android has no ATT: resolves `true` without showing
   * anything.
   */
  requestTrackingAuthorization(): Promise<boolean> {
    if (Platform.OS === 'android') return Promise.resolve(true)
    return invoke('attribution', 'requestTrackingAuthorization')
  },

  /**
   * Debug mode for the embedded ad-network adapters (TikTok test events).
   * Call it BEFORE `initialize`; never ship a release build with it enabled.
   */
  setAdSignalsDebugMode(enabled: boolean): Promise<void> {
    return invoke('attribution', 'setAdSignalsDebugMode', enabled)
  },
}
