package io.appwin.reactnative

import android.view.Choreographer
import android.view.View
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.core.view.ViewCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import io.appwin.community.AppwinCommunity
import io.appwin.support.AppwinSupport

/**
 * Native views exposed to React Native.
 *
 * The feed and the messenger exist in Compose; these managers place them in the
 * view hierarchy React Native owns. Nothing is rewritten: it is the same screen
 * as in a native Android app.
 */
internal abstract class AppwinComposeViewManager : SimpleViewManager<View>() {

  protected abstract val content: @Composable () -> Unit

  override fun createViewInstance(context: ThemedReactContext): View {
    // Prefer the Activity so Compose reads the same Resources / density as a
    // native host; ThemedReactContext alone has made text look oversized on
    // some RN + Samsung builds.
    val host = context.currentActivity ?: context
    return ComposeContainer(context, host).apply {
      composeView.setContent { content() }
    }
  }
}

/**
 * Container for a Compose view inside the React Native tree.
 *
 * Adjustments, all because React Native owns layout / window insets:
 *
 * - React Native does not propagate layout passes to its Android children:
 *   without a forced `requestLayout` each frame, the Compose view ends up with
 *   a zero size and nothing shows.
 * - the composition strategy follows the window rather than the lifecycle: in a
 *   React Native app the activity outlives the screens.
 * - RN's root often consumes system-bar insets for SafeAreaView. Re-dispatch
 *   them into the ComposeView and disable consume so Community's
 *   `statusBarsPadding` / Scaffold `navigationBars` match a native host.
 */
private class ComposeContainer(
  reactContext: ThemedReactContext,
  composeHost: android.content.Context,
) : FrameLayout(reactContext) {
  val composeView = ComposeView(composeHost).apply {
    setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
  }

  init {
    addView(
      composeView,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT),
    )
    // RN's root often eats system-bar insets for SafeAreaView. Re-dispatch so
    // Community's statusBarsPadding / Scaffold navigationBars match native.
    ViewCompat.setOnApplyWindowInsetsListener(this) { _, insets ->
      ViewCompat.dispatchApplyWindowInsets(composeView, insets)
      insets
    }
  }

  override fun requestLayout() {
    super.requestLayout()
    post(layoutRunnable)
  }

  private val layoutRunnable = Runnable {
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
    )
    layout(left, top, right, bottom)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    ViewCompat.requestApplyInsets(this)
    Choreographer.getInstance().postFrameCallback {
      requestLayout()
    }
  }
}

internal class AppwinCommunityViewManager : AppwinComposeViewManager() {
  override fun getName(): String = NAME
  override val content: @Composable () -> Unit = { AppwinCommunity.CommunityView() }

  companion object {
    /** Must match the name `requireNativeComponent` expects. */
    const val NAME: String = "AppwinCommunityView"
  }
}

internal class AppwinSupportMessengerViewManager : AppwinComposeViewManager() {
  override fun getName(): String = NAME
  override val content: @Composable () -> Unit = { AppwinSupport.MessengerView() }

  companion object {
    const val NAME: String = "AppwinSupportMessengerView"
  }
}

/** Builds the managers, called by the React Native package. */
internal fun appwinViewManagers(
  @Suppress("UNUSED_PARAMETER") context: ReactApplicationContext,
): List<AppwinComposeViewManager> = listOf(
  AppwinCommunityViewManager(),
  AppwinSupportMessengerViewManager(),
)
