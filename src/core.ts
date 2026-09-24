import { guarded, invoke } from './native'
import type { AppwinConfigureOptions, AppwinPushPlatform, AppwinUserAttributes } from './types'

/**
 * Shared foundation for every Appwin product.
 *
 * Owns the device, the user's identity and the authenticated session: the
 * products read them and expose no identity function of their own. Firebase-style: the
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
    return guarded(
      'configure',
      () =>
        invoke('core', 'configure', {
          projectAppId: options.projectAppId,
          baseUrl: options.baseUrl ?? null,
          realtimeBaseUrl: options.realtimeBaseUrl ?? null,
        }),
      undefined,
    )
  },

  /**
   * Attaches the device to your app's user, for every product at once.
   *
   * Persists `externalId` natively (it survives a relaunch), opens a server
   * session carrying it, which merges the anonymous lead into the user, then
   * applies `attributes` if given. Support, Community and Notifications follow on
   * their own: there is nothing to call on them.
   *
   * ```ts
   * await AppwinCore.identify(user.id, { email: user.email, plan: 'pro' })
   * ```
   *
   * Unlike the rest of the package, this rejects instead of degrading
   * silently: a login that fails without a word leaves your app convinced the
   * user is identified while every product still sees an anonymous one.
   *
   * @throws Rejects when `externalId` is blank (before reaching native), when
   * `configure` has not run, or when the session cannot be opened.
   */
  async identify(externalId: string, attributes?: AppwinUserAttributes): Promise<void> {
    if (!externalId?.trim()) {
      throw new Error('AppwinCore.identify: externalId is required')
    }
    // `null`, not `undefined`: the bridge drops `undefined` arguments.
    await invoke('core', 'identify', externalId, attributes ?? null)
  },

  /**
   * Enriches the current user with what your app already knows.
   *
   * Does **not** change identity; that is [identify]. An omitted field is left
   * untouched server-side, so an app that only knows a name does not erase the
   * email already on file. Works for an anonymous user too.
   *
   * @throws Rejects when `configure` has not run or the server refuses the
   * update, for the same reason as [identify]: attributes lost without a word are
   * worse than an error.
   */
  async updateUser(attributes: AppwinUserAttributes): Promise<void> {
    await invoke('core', 'updateUser', attributes)
  },

  /**
   * Revokes the server session and goes back to a fresh anonymous user. Call
   * it when the user signs out of **your** app, otherwise the next person on
   * the device inherits their identity.
   *
   * Never rejects: the local identity is cleared even when the server cannot
   * be reached.
   */
  logout(): Promise<void> {
    return guarded('logout', () => invoke('core', 'logout'), undefined)
  },

  /** Device id, `null` until [configure] has run. */
  getDeviceId(): Promise<string | null> {
    return guarded('getDeviceId', () => invoke('core', 'getDeviceId'), null)
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
    return guarded(
      'registerPushToken',
      () => invoke('core', 'registerPushToken', token, platform, pushOptIn),
      undefined,
    )
  },
}
