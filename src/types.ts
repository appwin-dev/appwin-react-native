/**
 * Public types of the React Native SDK.
 *
 * Mirrors of the Swift and Kotlin entities, reduced to what the JavaScript
 * layer actually handles. The feed and messenger render natively, so the host
 * app never needs to know a post or a message; exposing them here would create
 * a second source of truth to maintain.
 */

export interface AppwinConfigureOptions {
  /** Public project id, found in the studio. */
  projectAppId: string
  /** API URL override. Development only. */
  baseUrl?: string
  /** Realtime service URL override. */
  realtimeBaseUrl?: string
}

/** Attributes pushed by the host app. All optional; an omitted one is kept. */
export interface AppwinUserAttributes {
  email?: string
  name?: string
  avatarUrl?: string
  language?: string
  timezone?: string
  location?: string
}

/** Community profile, as native returns it after a `setUser`. */
export interface AppwinCommunityProfile {
  id: string
  nickname: string
  bio?: string
  avatarUrl?: string
  isAnonymous: boolean
  postCount: number
  commentCount: number
  receivedReactionCount: number
}

/** Support customer, as native returns it after an `updateUser`. */
export interface AppwinCustomer {
  id: string
  externalId?: string
  name?: string
  email?: string
  avatarUrl?: string
}

/** Push token platform. `web` does not exist in React Native. */
export type AppwinPushPlatform = 'ios' | 'android'

/** Events that can trigger an automation. */
export type AppwinAutomationEvent =
  | 'app_open'
  | 'app_background'
  | 'purchase'
  | 'custom_event'
  | 'push_opt_in'
  | 'session_start'

/** What a user did with an in-app message. */
export type AppwinTrackEvent = 'opened' | 'clicked' | 'dismissed'

export interface AppwinInAppContent {
  title?: string
  body?: string
  imageUrl?: string
  deeplink?: string
  buttons?: AppwinInAppButton[]
}

export interface AppwinInAppButton {
  label: string
  action: string
  url?: string
}

export interface AppwinInAppMessage {
  id: string
  campaignId: string
  deliveryId: string
  channel: string
  format: string
  content: AppwinInAppContent
}

/** Why a product is closed to this app. */
export type AppwinUnavailableReason =
  /**
   * The organisation's plan does not include this product. The studio cannot
   * fix this from the dashboard: it is a sales conversation.
   */
  | 'plan'
  /**
   * The product is switched off for this project. The studio turns it back on
   * from the dashboard, without shipping an app update.
   */
  | 'disabled'

/** Coarse outcome of a product's `initialize()`. */
export type AppwinInitStatus =
  /** Ready to present. The only value that unlocks the product's UI. */
  | 'ready'
  /** The server answered, and the answer is no. See `reason`. */
  | 'unavailable'
  /** `AppwinCore.configure()` was never called. */
  | 'notConfigured'
  /**
   * No verdict could be obtained: no network, and nothing cached from a
   * previous launch. Retry later; this is not a permanent no.
   */
  | 'unknown'

/**
 * What a product's `initialize()` answers.
 *
 * A value rather than a rejected promise, deliberately. "Not entitled" is an
 * expected outcome of a normal launch, not an error: rejecting would push
 * callers into a try/catch for the ordinary case, where the reason gets lost.
 */
export interface AppwinInitResult {
  status: AppwinInitStatus
  /** Set only when `status` is `'unavailable'`. */
  reason?: AppwinUnavailableReason
}
