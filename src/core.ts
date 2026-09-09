import { invoke } from './native'
import type { AppwinConfigureOptions, AppwinPushPlatform } from './types'

/**
 * Shared foundation for every Appwin product.
 *
 * Owns the device identity and the authenticated session. Firebase-style: the
 * host app calls [configure] once at startup, then the products work.
 *
 * ```tsx
 * import { AppwinCore } from '@appwin/react-native'
 *
 * await AppwinCore.configure({ projectAppId: 'your-app-id' })
 * ```
 */
export const AppwinCore = {
  /**
   * Call once at startup, before using any product. Idempotent.
   *
   * The promise resolves as soon as the native state is ready, without waiting
   * for the network: the session opens in the background. Blocking startup on a
   * round trip would be paid by every user, offline ones included.
   */
  async configure(options: AppwinConfigureOptions): Promise<void> {
    if (!options.projectAppId?.trim()) {
      // Checked here rather than natively so the error carries a usable
      // JavaScript stack instead of an opaque bridge exception.
      throw new Error('AppwinCore.configure: projectAppId is required')
    }
    return invoke('core', 'configure', {
      projectAppId: options.projectAppId,
      baseUrl: options.baseUrl ?? null,
      realtimeBaseUrl: options.realtimeBaseUrl ?? null,
    })
  },

  /**
   * Forces the session open and returns the token.
   *
   * Rarely needed, since [configure] handles it in the background. Useful
   * before a call that strictly requires an open session.
   */
  bootstrapSession(): Promise<string> {
    return invoke('core', 'bootstrapSession')
  },

  /**
   * Attaches the device to your app's user.
   *
   * The identity is **shared by every product**: after this call the same
   * person is recognised by Support and by Community.
   */
  identify(externalId: string): Promise<void> {
    return invoke('core', 'identify', externalId)
  },

  /** Goes back to anonymous locally, without revoking the server session. */
  clearIdentity(): Promise<void> {
    return invoke('core', 'clearIdentity')
  },

  /**
   * Revokes the server session and goes back to anonymous. Call it when the
   * user signs out of **your** app, otherwise the next person on the device
   * inherits their identity.
   */
  signOut(): Promise<void> {
    return invoke('core', 'signOut')
  },

  /** Device id, `null` until [configure] has run. */
  getDeviceId(): Promise<string | null> {
    return invoke('core', 'getDeviceId')
  },

  /**
   * Registers this device's push token with Appwin. Call again on every token
   * rotation.
   *
   * Shared by Support, Community and Notifications. Strongly recommended when
   * using Support or Community; required when using Notifications.
   */
  registerPushToken(
    token: string,
    platform: AppwinPushPlatform,
    pushOptIn = true,
  ): Promise<void> {
    if (!token.trim()) {
      throw new Error('AppwinCore.registerPushToken: token is empty')
    }
    return invoke('core', 'registerPushToken', token, platform, pushOptIn)
  },
}
