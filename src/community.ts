import { invoke } from './native'
import type { AppwinCommunityProfile } from './types'

/**
 * Appwin Community.
 *
 * The feed is rendered by the native SDKs: posts, comments, reactions,
 * profiles. Customisation goes through the dashboard and is re-read on every
 * open; nothing visual is configured here.
 */
export const AppwinCommunity = {
  /**
   * Opens the feed over the app, with its close button.
   *
   * To embed it in a tab - the expected mode - use the `AppwinCommunityView`
   * component.
   */
  presentCommunity(): Promise<void> {
    return invoke('community', 'presentCommunity')
  },

  /** Attaches the member to your app's user. */
  login(externalId: string): Promise<void> {
    return invoke('community', 'login', externalId)
  },

  /** Revokes the session and goes back to an anonymous profile. */
  logout(): Promise<void> {
    return invoke('community', 'logout')
  },

  /**
   * Enriches the community profile.
   *
   * Call [login] **first**, otherwise the attributes land on the anonymous
   * profile and are lost when the user is attached.
   */
  setUser(attributes: {
    nickname?: string
    avatarUrl?: string
    bio?: string
  }): Promise<AppwinCommunityProfile> {
    return invoke('community', 'setUser', attributes)
  },

  /**
   * Unread notification count, for a tab badge.
   *
   * Resolves to `0` on failure rather than rejecting: a badge must never break
   * the rendering of a tab bar.
   */
  async unreadNotificationCount(): Promise<number> {
    try {
      return await invoke<number>('community', 'unreadNotificationCount')
    } catch {
      return 0
    }
  },
}
