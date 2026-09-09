package io.appwin.reactnative

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Entry point of the package on Android.
 *
 * Registered automatically by React Native's autolinking: the host app declares
 * nothing, it installs the npm package and rebuilds.
 */
public class AppwinReactPackage : ReactPackage {

  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(
      AppwinCoreModule(context),
      AppwinSupportModule(context),
      AppwinCommunityModule(context),
      AppwinNotificationsModule(context),
    )

  override fun createViewManagers(
    context: ReactApplicationContext,
  ): List<ViewManager<*, *>> = appwinViewManagers(context)
}
