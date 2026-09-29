package io.appwin.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import io.appwin.community.AppwinCommunity
import io.appwin.community.AppwinCommunityEvent
import io.appwin.community.AppwinCommunityPostTarget

internal class AppwinCommunityModule(
  context: ReactApplicationContext,
) : AppwinBaseModule(context) {

  override fun getName(): String = "AppwinCommunityModule"

  // Kept as properties so `invalidate` can tell its own hooks from ones a
  // newer module instance installed after a reload.
  private val notificationTapHook: (AppwinCommunityPostTarget) -> Unit = { target ->
    sendEvent(
      "AppwinCommunityNotificationTap",
      Arguments.createMap().apply {
        putString("postId", target.postId)
        putString("commentId", target.commentId)
      },
    )
  }

  private val editProfileHook: () -> Unit = {
    sendEvent("AppwinCommunityEditProfile", null)
  }

  override fun invalidate() {
    super.invalidate()
    if (AppwinCommunity.onNotificationTap === notificationTapHook) AppwinCommunity.onNotificationTap = null
    if (AppwinCommunity.onEditProfile === editProfileHook) AppwinCommunity.onEditProfile = null
  }

  // Runs on the module queue in call order, so a handler set before
  // `initialize()` is installed before the cold-start tap is replayed.
  @ReactMethod
  fun setNotificationTapHandler(enabled: Boolean, promise: Promise) {
    if (enabled) {
      AppwinCommunity.onNotificationTap = notificationTapHook
    } else if (AppwinCommunity.onNotificationTap === notificationTapHook) {
      AppwinCommunity.onNotificationTap = null
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun setEditProfileHandler(enabled: Boolean, promise: Promise) {
    if (enabled) {
      AppwinCommunity.onEditProfile = editProfileHook
    } else if (AppwinCommunity.onEditProfile === editProfileHook) {
      AppwinCommunity.onEditProfile = null
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun openPost(postId: String, commentId: String?, promise: Promise) {
    // The application context works too, but opens the post in a task of its own.
    val context = reactApplicationContext.currentActivity ?: reactApplicationContext
    AppwinCommunity.openPost(context, postId, commentId)
    promise.resolve(null)
  }

  @ReactMethod
  fun getLastResult(promise: Promise) {
    promise.resolve(AppwinCommunity.lastResult?.let(::encodeInitResult))
  }

  @ReactMethod
  fun startEvents(promise: Promise) {
    startCollecting("events", AppwinCommunity.events) { sendEvent("AppwinCommunityEvent", encodeEvent(it)) }
    promise.resolve(null)
  }

  @ReactMethod
  fun stopEvents(promise: Promise) {
    stopCollecting("events")
    promise.resolve(null)
  }

  @ReactMethod
  fun startUnreadCountUpdates(promise: Promise) {
    startCollecting("unread", AppwinCommunity.unreadNotificationCountFlow) { count ->
      sendEvent("AppwinCommunityUnreadCount", Arguments.createMap().apply { putInt("count", count) })
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun stopUnreadCountUpdates(promise: Promise) {
    stopCollecting("unread")
    promise.resolve(null)
  }

  private fun encodeEvent(event: AppwinCommunityEvent): WritableMap = Arguments.createMap().apply {
    when (event) {
      is AppwinCommunityEvent.PostCreated -> {
        putString("type", "postCreated")
        putString("postId", event.postId)
      }
      is AppwinCommunityEvent.CommentCreated -> {
        putString("type", "commentCreated")
        putString("commentId", event.commentId)
        putString("postId", event.postId)
      }
      is AppwinCommunityEvent.ReplyCreated -> {
        putString("type", "replyCreated")
        putString("replyId", event.replyId)
        putString("commentId", event.commentId)
        putString("postId", event.postId)
      }
      is AppwinCommunityEvent.ReactionModified -> {
        putString("type", "reactionModified")
        putString("postId", event.postId)
        putString("commentId", event.commentId)
        putString("reaction", event.reaction)
      }
      is AppwinCommunityEvent.ProfileUpdated -> {
        putString("type", "profileUpdated")
        putString("profileId", event.profileId)
      }
    }
  }

  @ReactMethod
  fun initialize(promise: Promise) =
    resolving(promise, "availability_failed") { encodeInitResult(AppwinCommunity.initialize()) }

  @ReactMethod
  fun presentCommunity(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("appwin_no_activity", "Aucune activité au premier plan")
      return
    }
    AppwinCommunity.presentCommunity(activity)
    promise.resolve(null)
  }

  @ReactMethod
  fun setUser(attributes: ReadableMap, promise: Promise) =
    resolving(promise, "appwin_set_user_failed") {
      val profile = AppwinCommunity.setUser(
        nickname = attributes.optString("nickname"),
        avatarUrl = attributes.optString("avatarUrl"),
        bio = attributes.optString("bio"),
      )
      Arguments.createMap().apply {
        putString("id", profile.id)
        putString("nickname", profile.nickname)
        putString("bio", profile.bio)
        putString("avatarUrl", profile.avatarUrl)
        putBoolean("isAnonymous", profile.isAnonymous)
        putInt("postCount", profile.postCount)
        putInt("commentCount", profile.commentCount)
        putInt("receivedReactionCount", profile.receivedReactionCount)
      }
    }

  @ReactMethod
  fun unreadNotificationCount(promise: Promise) =
    resolving(promise, "appwin_unread_failed") { AppwinCommunity.unreadNotificationCount() }
}
