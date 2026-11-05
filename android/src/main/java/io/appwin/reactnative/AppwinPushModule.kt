package io.appwin.reactnative

import android.content.Intent
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import io.appwin.core.push.AppwinPush
import org.json.JSONObject

internal class AppwinPushModule(
  context: ReactApplicationContext,
) : AppwinBaseModule(context) {

  override fun getName(): String = "AppwinPushModule"

  @ReactMethod
  fun isAppwinPush(data: ReadableMap, promise: Promise) {
    promise.resolve(AppwinPush.isAppwinPush(data.toPushData()))
  }

  @ReactMethod
  fun handleTap(data: ReadableMap, promise: Promise) =
    resolving(promise, "appwin_push_failed") {
      AppwinPush.handleTap(pushContext(), data.toPushData())
    }

  @ReactMethod
  fun handleForeground(data: ReadableMap, title: String?, body: String?, promise: Promise) =
    resolving(promise, "appwin_push_failed") {
      AppwinPush.handleForeground(pushContext(), data.toPushData(), title, body)
    }

  @ReactMethod
  fun handleMessage(data: ReadableMap, promise: Promise) =
    resolving(promise, "appwin_push_failed") {
      AppwinPush.handleMessage(pushContext(), data.toPushData())
    }

  // A tap opens a screen: from the application context it would land in a
  // separate task. `setBackgroundMessageHandler` runs headless, with no activity.
  private fun pushContext() = reactApplicationContext.currentActivity ?: reactApplicationContext
}

/**
 * Hands the notification taps that reach the host activity to [AppwinPush].
 *
 * Core reads the launch intent on activity resume, but only from `configure`
 * onward, and React Native configures from JavaScript after the main activity
 * has resumed: the tap that launched the app would be missed. Reporting a tap
 * Core also saw is harmless (extras stripped once read, plus dedupe).
 */
internal class AppwinPushTapForwarder(
  private val context: ReactApplicationContext,
) : BaseActivityEventListener() {

  /** Called once `AppwinCore.configure` has run. */
  fun forwardLaunchIntent() {
    val activity = context.currentActivity ?: return
    activity.runOnUiThread { AppwinPush.handleTap(activity, activity.intent) }
  }

  override fun onNewIntent(intent: Intent) {
    AppwinPush.handleTap(context.currentActivity ?: context, intent)
  }
}

/**
 * FCM `data` is flat strings, but JavaScript may hand over numbers, booleans
 * or a nested `data` object; the native parser reads the latter as JSON text.
 */
private fun ReadableMap.toPushData(): Map<String, String> =
  toHashMap().mapNotNull { (key, value) ->
    when (value) {
      null -> null
      is String -> key to value
      is Map<*, *> -> key to JSONObject(value).toString()
      is Double -> key to (if (value % 1.0 == 0.0) value.toLong().toString() else value.toString())
      else -> key to value.toString()
    }
  }.toMap()
