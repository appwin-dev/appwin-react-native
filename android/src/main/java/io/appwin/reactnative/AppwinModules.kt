package io.appwin.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import io.appwin.community.AppwinCommunity
import io.appwin.core.AppwinCore
import io.appwin.notifications.AppwinNotifications
import io.appwin.notifications.AutomationEvent
import io.appwin.notifications.InAppMessage
import io.appwin.notifications.TrackEvent
import io.appwin.support.AppwinSupport
import io.appwin.support.domain.SupportUserAttributes
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * React Native bridges to the native Android SDKs.
 *
 * Each product has its module, as on iOS and in TypeScript: one wall to cross,
 * with the same names, whatever the platform.
 *
 * The methods return promises. The React Native bridge carries no suspension:
 * each call runs on a module-owned scope and rejects explicitly rather than
 * leaving a promise pending - a promise that never settles is the worst failure
 * mode on the JavaScript side.
 */
internal abstract class AppwinBaseModule(
  context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

  protected val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

  override fun invalidate() {
    super.invalidate()
    // Hot reload recreates the modules: without cancellation, each reload would
    // leave live coroutines writing into a
    // pont mort.
    scope.coroutineContext[kotlinx.coroutines.Job]?.cancel()
  }

  /** Runs a suspending call and wires its result to the promise. */
  protected fun <T> resolving(promise: Promise, code: String, block: suspend () -> T) {
    scope.launch {
      runCatching { block() }
        .onSuccess { promise.resolve(if (it is Unit) null else it) }
        .onFailure { promise.reject(code, it.message, it) }
    }
  }
}

internal class AppwinCoreModule(
  private val context: ReactApplicationContext,
) : AppwinBaseModule(context) {

  override fun getName(): String = "AppwinCoreModule"

  @ReactMethod
  fun configure(options: ReadableMap, promise: Promise) {
    val appId = options.getString("projectAppId")
    if (appId.isNullOrBlank()) {
      promise.reject("appwin_invalid_argument", "projectAppId est requis")
      return
    }
    runCatching {
      AppwinCore.configure(
        context = context.applicationContext,
        projectAppId = appId,
        baseUrl = options.getString("baseUrl"),
        realtimeBaseUrl = options.getString("realtimeBaseUrl"),
      )
    }
      .onSuccess { promise.resolve(null) }
      .onFailure { promise.reject("appwin_configure_failed", it.message, it) }
  }

  @ReactMethod
  fun bootstrapSession(promise: Promise) =
    resolving(promise, "appwin_session_failed") { AppwinCore.bootstrapSession() }

  @ReactMethod
  fun identify(externalId: String, promise: Promise) {
    AppwinCore.identify(externalId)
    promise.resolve(null)
  }

  @ReactMethod
  fun clearIdentity(promise: Promise) {
    AppwinCore.clearIdentity()
    promise.resolve(null)
  }

  @ReactMethod
  fun signOut(promise: Promise) =
    resolving(promise, "appwin_sign_out_failed") { AppwinCore.signOut() }

  @ReactMethod
  fun getDeviceId(promise: Promise) {
    promise.resolve(AppwinCore.deviceId)
  }
}

internal class AppwinSupportModule(
  context: ReactApplicationContext,
) : AppwinBaseModule(context) {

  override fun getName(): String = "AppwinSupportModule"

  @ReactMethod
  fun presentMessenger(promise: Promise) {
    // Through the context rather than the inherited `currentActivity`: since
    // React Native 0.80 the base class is Kotlin, and a `protected fun
    // getCurrentActivity()` is no longer reachable with property syntax. The
    // form below compiles from 0.73 to 0.87.
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      // With no foreground activity, `startActivity` would start from an
      // application context and open the screen in a separate task.
      promise.reject("appwin_no_activity", "Aucune activité au premier plan")
      return
    }
    AppwinSupport.presentMessenger(activity)
    promise.resolve(null)
  }

  @ReactMethod
  fun loginIdentifiedUser(externalId: String, promise: Promise) {
    AppwinSupport.loginIdentifiedUser(externalId)
    promise.resolve(null)
  }

  @ReactMethod
  fun updateUser(attributes: ReadableMap, promise: Promise) =
    resolving(promise, "appwin_update_failed") {
      val customer = AppwinSupport.updateUser(
        SupportUserAttributes(
          email = attributes.getString("email"),
          name = attributes.getString("name"),
          avatarUrl = attributes.getString("avatarUrl"),
          language = attributes.getString("language"),
          timezone = attributes.getString("timezone"),
          location = attributes.getString("location"),
        ),
      )
      Arguments.createMap().apply {
        putString("id", customer.id)
        putString("externalId", customer.externalId)
        putString("name", customer.name)
        putString("email", customer.email)
        putString("avatarUrl", customer.avatarUrl)
      }
    }

  @ReactMethod
  fun logout(promise: Promise) =
    resolving(promise, "appwin_logout_failed") { AppwinSupport.logout() }
}

internal class AppwinCommunityModule(
  context: ReactApplicationContext,
) : AppwinBaseModule(context) {

  override fun getName(): String = "AppwinCommunityModule"

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
  fun login(externalId: String, promise: Promise) =
    resolving(promise, "appwin_login_failed") { AppwinCommunity.login(externalId) }

  @ReactMethod
  fun logout(promise: Promise) =
    resolving(promise, "appwin_logout_failed") { AppwinCommunity.logout() }

  @ReactMethod
  fun setUser(attributes: ReadableMap, promise: Promise) =
    resolving(promise, "appwin_set_user_failed") {
      val profile = AppwinCommunity.setUser(
        nickname = attributes.getString("nickname"),
        avatarUrl = attributes.getString("avatarUrl"),
        bio = attributes.getString("bio"),
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

internal class AppwinNotificationsModule(
  context: ReactApplicationContext,
) : AppwinBaseModule(context) {

  override fun getName(): String = "AppwinNotificationsModule"

  @ReactMethod
  fun registerPushToken(token: String, platform: String, pushOptIn: Boolean, promise: Promise) =
    resolving(promise, "appwin_push_token_failed") {
      AppwinNotifications.registerPushToken(token, platform, pushOptIn)
    }

  @ReactMethod
  fun trackEvent(event: String, eventName: String?, promise: Promise) {
    val automationEvent = AutomationEvent.entries.firstOrNull { it.wireValue == event }
    if (automationEvent == null) {
      // An event unknown to the binary is an integration mistake, not an
      // outage: saying so avoids a hunt on the network side.
      promise.reject("appwin_unknown_event", "Événement inconnu : $event")
      return
    }
    resolving(promise, "appwin_track_event_failed") {
      AppwinNotifications.trackEvent(automationEvent, eventName)
    }
  }

  @ReactMethod
  fun track(deliveryId: String, event: String, promise: Promise) {
    val trackEvent = TrackEvent.entries.firstOrNull { it.wireValue == event }
    if (trackEvent == null) {
      promise.reject("appwin_unknown_event", "Événement inconnu : $event")
      return
    }
    resolving(promise, "appwin_track_failed") {
      AppwinNotifications.track(deliveryId, trackEvent)
    }
  }

  @ReactMethod
  fun fetchPendingMessages(promise: Promise) =
    resolving(promise, "appwin_fetch_messages_failed") {
      serialize(AppwinNotifications.fetchPendingMessages())
    }

  @ReactMethod
  fun syncOnAppOpen(promise: Promise) =
    resolving(promise, "appwin_sync_failed") {
      serialize(AppwinNotifications.syncOnAppOpen())
    }

  /**
   * The bridge only carries `Writable*`, so the conversion lives here, once,
   * rather than at every call site.
   */
  private fun serialize(messages: List<InAppMessage>): WritableArray =
    Arguments.createArray().apply {
      messages.forEach { message -> pushMap(serialize(message)) }
    }

  private fun serialize(message: InAppMessage): WritableMap = Arguments.createMap().apply {
    putString("id", message.id)
    putString("campaignId", message.campaignId)
    putString("deliveryId", message.deliveryId)
    putString("channel", message.channel)
    putString("format", message.format)
    putMap(
      "content",
      Arguments.createMap().apply {
        putString("title", message.content.title)
        putString("body", message.content.body)
        putString("imageUrl", message.content.imageUrl)
        putString("deeplink", message.content.deeplink)
      },
    )
  }
}
