import { guarded, invoke } from './native'
import type { AppwinInitResult } from './types'

const UNKNOWN_RESULT: AppwinInitResult = { status: 'unknown' }

/**
 * Appwin Support.
 *
 * The messenger is rendered by the native iOS and Android SDKs; this layer only
 * opens it. The identity is `AppwinCore`'s: the messenger follows
 * `identify`, `updateUser` and `logout` on its own. Nothing is rebuilt in React Native - that
 * would be a third messenger to maintain, and it would diverge from the other
 * two on the first change.
 */
export const AppwinSupport = {
  /**
   * Prepares Support for this app, and says whether it may be used.
   *
   * Call it after `AppwinCore.configure()` and **before** showing any Support entry point, then gate
   * your own UI on the result: the SDK cannot hide your button or your tab, it
   * does not own your navigation.
   *
   * ```ts
   * const { status } = await AppwinSupport.initialize()
   * if (status === 'ready') {
   *   setShowHelp(true)
   * }
   * ```
   *
   * Idempotent, and cheap after the first call: the three products share one
   * server round trip and its cached verdict.
   */
  initialize(): Promise<AppwinInitResult> {
    return guarded('initialize', () => invoke('support', 'initialize'), UNKNOWN_RESULT)
  },

  /** Whether `initialize()` has returned `ready`. */
  isReady(): Promise<boolean> {
    return guarded('isReady', () => invoke('support', 'isReady'), false)
  },

  /** Native Support SDK version string. */
  version(): Promise<string> {
    return guarded('version', () => invoke('support', 'version'), '')
  },

  /**
   * Opens the messenger over the app, with its close button.
   *
   * Safe without a prior `initialize()`: native runs it on demand, same as iOS.
   * To embed it in a tab, use the `AppwinSupportMessengerView` component.
   */
  presentMessenger(): Promise<void> {
    return guarded('presentMessenger', () => invoke('support', 'presentMessenger'), undefined)
  },

  /**
   * Opens the messenger straight onto a conversation.
   *
   * What a push tap or custom deep-link needs: landing on home after "you have
   * a reply" makes the reader hunt for it.
   */
  presentConversation(conversationId: string): Promise<void> {
    return guarded(
      'presentConversation',
      () => invoke('support', 'presentConversation', conversationId),
      undefined,
    )
  },
}
