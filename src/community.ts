import { decodeInitResult } from './core'
import { NativeChannel, isRecord, stringOrNull } from './events'
import type { AppwinUnsubscribe } from './events'
import { guarded, invoke } from './native'
import type {
  AppwinCommunityEvent,
  AppwinCommunityPostTarget,
  AppwinInitResult,
  AppwinCommunityProfile,
} from './types'

const UNKNOWN_RESULT: AppwinInitResult = { status: 'unknown' }

function decodeEvent(payload: unknown): AppwinCommunityEvent | undefined {
  if (!isRecord(payload)) return undefined
  const str = (key: string) => stringOrNull(payload[key])
  const postId = str('postId')
  const commentId = str('commentId')
  switch (payload.type) {
    case 'postCreated':
      return postId ? { type: 'postCreated', postId } : undefined
    case 'commentCreated':
      return postId && commentId ? { type: 'commentCreated', commentId, postId } : undefined
    case 'replyCreated': {
      const replyId = str('replyId')
      return postId && commentId && replyId
        ? { type: 'replyCreated', replyId, commentId, postId }
        : undefined
    }
    case 'reactionModified':
      return postId
        ? { type: 'reactionModified', postId, commentId, reaction: str('reaction') }
        : undefined
    case 'profileUpdated': {
      const profileId = str('profileId')
      return profileId ? { type: 'profileUpdated', profileId } : undefined
    }
    default:
      // A newer native SDK may report kinds this JavaScript does not know yet.
      return undefined
  }
}

const events = new NativeChannel<AppwinCommunityEvent>({
  module: 'community',
  event: 'AppwinCommunityEvent',
  start: ['startEvents'],
  stop: ['stopEvents'],
  decode: decodeEvent,
})

const unreadCount = new NativeChannel<number>({
  module: 'community',
  event: 'AppwinCommunityUnreadCount',
  start: ['startUnreadCountUpdates'],
  stop: ['stopUnreadCountUpdates'],
  replayLast: true,
  decode: (payload) =>
    isRecord(payload) && typeof payload.count === 'number' ? payload.count : undefined,
})

const notificationTaps = new NativeChannel<AppwinCommunityPostTarget>({
  module: 'community',
  event: 'AppwinCommunityNotificationTap',
  start: ['setNotificationTapHandler', true],
  stop: ['setNotificationTapHandler', false],
  decode: (payload) => {
    if (!isRecord(payload)) return undefined
    const postId = stringOrNull(payload.postId)
    return postId ? { postId, commentId: stringOrNull(payload.commentId) } : undefined
  },
})

const editProfileRequests = new NativeChannel<true>({
  module: 'community',
  event: 'AppwinCommunityEditProfile',
  start: ['setEditProfileHandler', true],
  stop: ['setEditProfileHandler', false],
  decode: () => true,
})

/**
 * Holds the host's single handler for a native hook. Replacing it does not
 * touch native: the native hook stays installed and calls whichever handler is
 * current.
 */
function hostHandler<T>(channel: NativeChannel<T>) {
  let handler: ((value: T) => void) | null = null
  let unsubscribe: AppwinUnsubscribe | null = null
  return (next: ((value: T) => void) | null) => {
    handler = next
    if (next && !unsubscribe) {
      unsubscribe = channel.add((value) => handler?.(value))
    } else if (!next && unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }
}

const setNotificationTapHandler = hostHandler(notificationTaps)
const setEditProfileHandler = hostHandler(editProfileRequests)

/** Degraded profile for a failed bridge call: detectable by its empty id. */
const EMPTY_PROFILE: AppwinCommunityProfile = {
  id: '',
  nickname: '',
  isAnonymous: true,
  postCount: 0,
  commentCount: 0,
  receivedReactionCount: 0,
}

/**
 * Appwin Community.
 *
 * The feed is rendered by the native SDKs: posts, comments, reactions,
 * profiles. Customisation goes through the dashboard and is re-read on every
 * open; nothing visual is configured here.
 */
export const AppwinCommunity = {
  /**
   * Prepares Community for this app, and says whether it may be used.
   *
   * Call it after `AppwinCore.configure()` and **before** mounting the feed, then gate
   * your own UI on the result: the SDK cannot hide your button or your tab, it
   * does not own your navigation.
   *
   * ```ts
   * const { status } = await AppwinCommunity.initialize()
   * if (status === 'ready') {
   *   setTabs([...tabs, communityTab])
   * }
   * ```
   *
   * Idempotent, and cheap after the first call: the three products share one
   * server round trip and its cached verdict.
   */
  initialize(): Promise<AppwinInitResult> {
    return guarded('initialize', () => invoke('community', 'initialize'), UNKNOWN_RESULT)
  },

  /**
   * Opens the feed over the app, with its close button.
   *
   * To embed it in a tab - the expected mode - use the `AppwinCommunityView`
   * component.
   */
  presentCommunity(): Promise<void> {
    return guarded('presentCommunity', () => invoke('community', 'presentCommunity'), undefined)
  },

  /**
   * Enriches the community profile.
   *
   * This is the public community profile, distinct from the user attributes of
   * `AppwinCore.updateUser`. Call `AppwinCore.identify` **first**, otherwise the
   * attributes land on the anonymous profile and are lost when the user is
   * attached.
   */
  setUser(attributes: {
    nickname?: string
    avatarUrl?: string
    bio?: string
  }): Promise<AppwinCommunityProfile> {
    return guarded('setUser', () => invoke('community', 'setUser', attributes), EMPTY_PROFILE)
  },

  /**
   * Unread notification count, for a tab badge.
   *
   * Resolves to `0` on failure rather than rejecting: a badge must never break
   * the rendering of a tab bar.
   */
  unreadNotificationCount(): Promise<number> {
    return guarded(
      'unreadNotificationCount',
      () => invoke('community', 'unreadNotificationCount'),
      0,
    )
  },

  /**
   * Unread notification count, live, for a tab badge.
   *
   * `listener` receives the known count straight away when there is one, then
   * every change (never the same value twice in a row). Kept current by
   * Community pushes, the SDK's own screens and the app returning to the
   * foreground, while at least one listener is attached.
   *
   * ```ts
   * useEffect(() => AppwinCommunity.addUnreadCountListener(setBadge), [])
   * ```
   *
   * @returns a function that removes the listener.
   */
  addUnreadCountListener(listener: (count: number) => void): AppwinUnsubscribe {
    return unreadCount.add(listener)
  },

  /**
   * The current member's own actions (posts, comments, replies, reactions,
   * profile changes), each reported once the server has accepted it.
   *
   * Events that happen while no listener is attached are not replayed: attach
   * it early, typically at app start.
   *
   * ```ts
   * AppwinCommunity.addEventListener((event) => {
   *   if (event.type === 'postCreated') rewards.grant('first-post')
   * })
   * ```
   *
   * @returns a function that removes the listener.
   */
  addEventListener(listener: (event: AppwinCommunityEvent) => void): AppwinUnsubscribe {
    return events.add(listener)
  },

  /**
   * Opens a post, and optionally the reply thread under one of its comments.
   *
   * Opens in the mounted `AppwinCommunityView` when there is one (switch to
   * its tab yourself first); otherwise presents the post over the app. Does
   * nothing, and logs why, while Community is not ready.
   */
  openPost(postId: string, commentId?: string | null): Promise<void> {
    return guarded(
      'openPost',
      // `null`, not `undefined`: the bridge drops `undefined` arguments.
      () => invoke('community', 'openPost', postId, commentId ?? null),
      undefined,
    )
  },

  /**
   * Takes over navigation when the member taps a Community notification.
   *
   * Without a handler, the SDK opens the post itself: in the feed when it is
   * on screen, otherwise over the app. Set one when Community lives in a tab,
   * to switch to that tab first, then call `openPost`:
   *
   * ```ts
   * AppwinCommunity.setOnNotificationTap(({ postId, commentId }) => {
   *   navigation.navigate('Community')
   *   void AppwinCommunity.openPost(postId, commentId)
   * })
   * ```
   *
   * Set it **before** `initialize()`, so a tap that launched the app reaches
   * it. `null` gives navigation back to the SDK.
   */
  setOnNotificationTap(handler: ((target: AppwinCommunityPostTarget) => void) | null): void {
    setNotificationTapHandler(handler)
  },

  /**
   * Replaces the SDK's profile editor with your own.
   *
   * When set, every SDK entry point that edits the nickname, photo or bio
   * calls it instead of opening the SDK's editor. Push the result with
   * `setUser`, which refreshes the mounted screens. `null` restores the SDK's
   * editor.
   */
  setOnEditProfile(handler: (() => void) | null): void {
    setEditProfileHandler(handler && (() => handler()))
  },

  /**
   * The latest verdict for Community: the result of `initialize()`, then kept
   * current as the server's answer changes. `null` until `initialize()` has
   * returned, or when the bridge fails.
   */
  getLastResult(): Promise<AppwinInitResult | null> {
    return guarded(
      'getLastResult',
      async () => decodeInitResult(await invoke('community', 'getLastResult')) ?? null,
      null,
    )
  },
}
