@file:OptIn(AppwinInternalApi::class)

package io.appwin.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import io.appwin.analytics.AnalyticsConsent
import io.appwin.analytics.AppwinAnalytics
import io.appwin.analytics.AppwinReplay
import io.appwin.core.AppwinInternalApi

internal class AppwinAnalyticsModule(
  context: ReactApplicationContext,
) : AppwinBaseModule(context) {

  override fun getName(): String = "AppwinAnalyticsModule"

  @ReactMethod
  fun initialize(options: ReadableMap?, promise: Promise) {
    val crashReporting =
      if (options?.hasKey("crashReporting") == true) options.getBoolean("crashReporting") else true
    val sessionReplay =
      if (options?.hasKey("sessionReplay") == true) options.getBoolean("sessionReplay") else true
    AppwinReplay.setBridgeRuntime(RUNTIME)
    resolving(promise, "availability_failed") {
      encodeInitResult(
        AppwinAnalytics.initialize(crashReporting = crashReporting, sessionReplay = sessionReplay),
      )
    }
  }

  @ReactMethod
  fun isReady(promise: Promise) {
    promise.resolve(AppwinAnalytics.isReady)
  }

  @ReactMethod
  fun track(name: String, props: ReadableMap?, promise: Promise) {
    AppwinAnalytics.track(name, props?.toHashMap())
    promise.resolve(null)
  }

  @ReactMethod
  fun screen(name: String, promise: Promise) {
    AppwinAnalytics.screen(name)
    promise.resolve(null)
  }

  @ReactMethod
  fun flush(promise: Promise) {
    AppwinAnalytics.flush()
    promise.resolve(null)
  }

  @ReactMethod
  fun setConsent(consent: String, promise: Promise) {
    AppwinAnalytics.setConsent(
      when (consent) {
        "granted" -> AnalyticsConsent.GRANTED
        "denied" -> AnalyticsConsent.DENIED
        else -> AnalyticsConsent.UNKNOWN
      },
    )
    promise.resolve(null)
  }

  @ReactMethod
  fun recordBridgedError(
    fatal: Boolean,
    type: String,
    message: String?,
    frames: ReadableArray?,
    promise: Promise,
  ) {
    record(fatal, type, message, frames)
    promise.resolve(null)
  }

  /**
   * Blocking on purpose: after a fatal JS error the default handler kills the
   * process, so the report must be written before JS gets control back.
   */
  @ReactMethod(isBlockingSynchronousMethod = true)
  fun recordBridgedErrorSync(
    fatal: Boolean,
    type: String,
    message: String?,
    frames: ReadableArray?,
  ): Boolean {
    record(fatal, type, message, frames)
    return true
  }

  private fun record(fatal: Boolean, type: String, message: String?, frames: ReadableArray?) {
    // Numbers arrive as Double; the core's frame reader accepts any Number.
    val list = frames?.toArrayList()?.filterIsInstance<Map<String, Any?>>().orEmpty()
    AppwinAnalytics.recordBridgedError(RUNTIME, fatal, type, message, list)
  }

  private companion object {
    const val RUNTIME = "react_native"
  }
}
