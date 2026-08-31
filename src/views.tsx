import * as React from 'react'
import { Platform, UIManager, requireNativeComponent } from 'react-native'
import type { ViewProps } from 'react-native'

/**
 * Embeddable native views.
 *
 * The feed and the messenger already exist in SwiftUI and Compose. These
 * components expose them as they are, in the space your layout gives them -
 * typically a tab. Nothing is rebuilt in React Native: a third rendering of the
 * same screen would diverge from the other two on the first product change.
 */

export interface AppwinNativeViewProps extends ViewProps {}

const COMMUNITY_VIEW = 'AppwinCommunityView'
const MESSENGER_VIEW = 'AppwinSupportMessengerView'

/**
 * Distinct from the module failure message: a missing view can mean the app
 * runs the New Architecture without declaring legacy view manager interop, and
 * saying so here saves a search on the install side.
 */
function missingViewError(name: string): string {
  return (
    `The native view ${name} could not be found.\n` +
    `  - rebuild after installing` +
    (Platform.OS === 'ios' ? ` (and \`cd ios && pod install\`)` : '') +
    `\n  - on the New Architecture, add ${name} to \`unstable_reactLegacyComponentNames\`` +
    ` in your Fabric config while the migration lasts.`
  )
}

function nativeViewOrThrow(name: string): React.ComponentType<AppwinNativeViewProps> {
  // Checked at registration rather than at render: otherwise the failure lands
  // in the middle of a React tree, with an unusable stack.
  if (UIManager.getViewManagerConfig(name) == null) {
    const message = missingViewError(name)
    const Missing: React.FC<AppwinNativeViewProps> = () => {
      throw new Error(message)
    }
    Missing.displayName = name
    return Missing
  }
  return requireNativeComponent<AppwinNativeViewProps>(name)
}

const NativeCommunityView = nativeViewOrThrow(COMMUNITY_VIEW)
const NativeMessengerView = nativeViewOrThrow(MESSENGER_VIEW)

/**
 * The community feed, embedded.
 *
 * No close button: the tab is the way out. `AppwinCore.configure` must have run
 * before this mounts.
 */
export function AppwinCommunityView(props: AppwinNativeViewProps): React.ReactElement {
  return <NativeCommunityView {...props} />
}

/** The Support messenger, embedded. Same rules as the feed. */
export function AppwinSupportMessengerView(
  props: AppwinNativeViewProps,
): React.ReactElement {
  return <NativeMessengerView {...props} />
}
