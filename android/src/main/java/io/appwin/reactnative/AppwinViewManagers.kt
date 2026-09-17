package io.appwin.reactnative

import android.view.Choreographer
import android.view.View
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
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

  override fun createViewInstance(context: ThemedReactContext): View =
    ComposeContainer(context).apply {
      composeView.setContent { content() }
    }
}

/**
 * Container for a Compose view inside the React Native tree.
 *
 * Two adjustments are essential, both because React Native does its own layout:
 *
 * - React Native does not propagate layout passes to its Android children:
 *   without a forced `requestLayout` each frame, the Compose view ends up with
 *   a zero size and nothing shows. This is the canonical workaround for any
 *   Android view Yoga does not manage.
 * - the composition strategy follows the window rather than the lifecycle: in a
 *   React Native app the activity outlives the screens, and a lifecycle-bound
 *   strategy would keep the composition alive after unmount.
 */
private class ComposeContainer(context: ThemedReactContext) : FrameLayout(context) {
  val composeView = ComposeView(context).apply {
    setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
  }

  init {
    addView(composeView)
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
