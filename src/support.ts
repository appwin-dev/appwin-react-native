import { invoke } from './native'
import type { AppwinCustomer, AppwinUserAttributes } from './types'

/**
 * Appwin Support.
 *
 * The messenger is rendered by the native iOS and Android SDKs; this layer only
 * opens it and carries the identity. Nothing is rebuilt in React Native - that
 * would be a third messenger to maintain, and it would diverge from the other
 * two on the first change.
 */
export const AppwinSupport = {
  /**
   * Opens the messenger over the app, with its close button.
   *
   * To embed it in a tab, use the `AppwinSupportMessengerView` component.
   */
  presentMessenger(): Promise<void> {
    return invoke('support', 'presentMessenger')
  },

  /**
   * Attaches the device to your app's user. Equivalent to
   * `AppwinCore.identify`: the identity is owned by the foundation and shared
   * with Community.
   */
  loginIdentifiedUser(externalId: string): Promise<void> {
    return invoke('support', 'loginIdentifiedUser', externalId)
  },

  /**
   * Enriches the current customer with what your app already knows.
   *
   * Does **not** change identity; that is [loginIdentifiedUser]. An omitted
   * field is not overwritten, so an app that only knows a name does not erase
   * the email already on file.
   */
  updateUser(attributes: AppwinUserAttributes): Promise<AppwinCustomer> {
    return invoke('support', 'updateUser', attributes)
  },

  /** Revokes the session and goes back to an anonymous customer. */
  logout(): Promise<void> {
    return invoke('support', 'logout')
  }
}
