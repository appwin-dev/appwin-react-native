package io.appwin.reactnative

import android.content.Context
import android.view.Choreographer
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.core.view.ViewCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import io.appwin.analytics.AppwinReplay
import io.appwin.community.AppwinCommunity
import io.appwin.support.AppwinSupport

/**
 * Native views exposed to React Native.
 *
 * The feed and the messenger exist in Compose; these managers place them in the
 * view hierarchy React Native owns. Nothing is rewritten: it is the same screen
 * as in a native Android app.
 */
internal abstract class AppwinComposeViewManager<V : ComposeContainer> : SimpleViewManager<V>() {

  protected abstract fun createContainer(reactContext: ThemedReactContext, composeHost: Context): V

  protected abstract val content: @Composable (V) -> Unit

  override fun createViewInstance(context: ThemedReactContext): V {
    // Prefer the Activity so Compose reads the same Resources / density as a
    // native host; ThemedReactContext alone has made text look oversized on
    // some RN + Samsung builds.
    val host = context.currentActivity ?: context
    return createContainer(context, host).apply {
      composeView.setContent { content(this) }
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
internal open class ComposeContainer(
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

/** The `profileEditing` prop: which profile fields the JS app edits itself. */
internal data class ProfileEditingFlags(
  val profile: Boolean = false,
  val photo: Boolean = false,
  val name: Boolean = false,
) {
  companion object {
    fun from(map: ReadableMap?): ProfileEditingFlags {
      fun flag(key: String) = map != null && map.hasKey(key) && !map.isNull(key) && map.getBoolean(key)
      return ProfileEditingFlags(flag("profile"), flag("photo"), flag("name"))
    }
  }
}

internal class CommunityContainer(
  reactContext: ThemedReactContext,
  composeHost: Context,
) : ComposeContainer(reactContext, composeHost) {
  // State, not a plain field: the Compose view takes the callbacks as
  // parameters, so it must recompose when the prop changes.
  var profileEditing by mutableStateOf(ProfileEditingFlags())

  fun requestProfileEdit(field: String) {
    val reactContext = context as? ReactContext ?: return
    UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
      ?.dispatchEvent(ProfileEditRequestEvent(UIManagerHelper.getSurfaceId(reactContext), id, field))
  }
}

private class ProfileEditRequestEvent(
  surfaceId: Int,
  viewTag: Int,
  private val field: String,
) : Event<ProfileEditRequestEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = AppwinCommunityViewManager.PROFILE_EDIT_EVENT

  override fun getEventData(): WritableMap = Arguments.createMap().apply { putString("field", field) }
}

internal class AppwinCommunityViewManager : AppwinComposeViewManager<CommunityContainer>() {
  override fun getName(): String = NAME

  override fun createContainer(reactContext: ThemedReactContext, composeHost: Context) =
    CommunityContainer(reactContext, composeHost)

  override val content: @Composable (CommunityContainer) -> Unit = { view ->
    val flags = view.profileEditing
    val callbacks = remember(flags) {
      fun request(field: String): () -> Unit = { view.requestProfileEdit(field) }
      Triple(
        if (flags.profile) request("profile") else null,
        if (flags.photo) request("photo") else null,
        if (flags.name) request("name") else null,
      )
    }
    AppwinCommunity.CommunityView(
      onEditProfile = callbacks.first,
      onEditProfilePhoto = callbacks.second,
      onEditProfileName = callbacks.third,
    )
  }

  @ReactProp(name = "profileEditing")
  fun setProfileEditing(view: CommunityContainer, value: ReadableMap?) {
    view.profileEditing = ProfileEditingFlags.from(value)
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf(PROFILE_EDIT_EVENT to mapOf("registrationName" to PROFILE_EDIT_EVENT))

  companion object {
    /** Must match the name `requireNativeComponent` expects. */
    const val NAME: String = "AppwinCommunityView"
    const val PROFILE_EDIT_EVENT: String = "onProfileEditRequest"
  }
}

internal class AppwinSupportMessengerViewManager : AppwinComposeViewManager<ComposeContainer>() {
  override fun getName(): String = NAME

  override fun createContainer(reactContext: ThemedReactContext, composeHost: Context) =
    ComposeContainer(reactContext, composeHost)

  override val content: @Composable (ComposeContainer) -> Unit = { AppwinSupport.MessengerView() }

  companion object {
    const val NAME: String = "AppwinSupportMessengerView"
  }
}

/**
 * `<AppwinMask>` and `<AppwinUnmask>`: a plain React Native view, flagged for
 * the session replay masker, which walks the native hierarchy below it.
 */
internal class AppwinReplayFlagViewManager(private val mask: Boolean) : ReactViewManager() {
  override fun getName(): String = if (mask) MASK_NAME else UNMASK_NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
    super.createViewInstance(context).also {
      if (mask) AppwinReplay.mask(it) else AppwinReplay.unmask(it)
    }

  companion object {
    const val MASK_NAME: String = "AppwinMaskView"
    const val UNMASK_NAME: String = "AppwinUnmaskView"
  }
}

/** Builds the managers, called by the React Native package. */
internal fun appwinViewManagers(
  @Suppress("UNUSED_PARAMETER") context: ReactApplicationContext,
): List<ViewManager<*, *>> = listOf(
  AppwinCommunityViewManager(),
  AppwinSupportMessengerViewManager(),
  AppwinReplayFlagViewManager(mask = true),
  AppwinReplayFlagViewManager(mask = false),
)
