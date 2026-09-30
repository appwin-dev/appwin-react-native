import * as React from 'react'
import { Platform, UIManager, requireNativeComponent } from 'react-native'
import type { ViewProps } from 'react-native'

import { AppwinCore } from './core'
import type { AppwinInitResult } from './types'

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

export interface AppwinCommunityViewProps extends AppwinNativeViewProps {
  /**
   * Your own UI while Community is not ready, given the verdict. Without it,
   * the native view shows the SDK's "coming soon" placeholder (plus a
   * diagnosis card in debug builds).
   */
  unavailable?: (result: AppwinInitResult) => React.ReactNode
}

/**
 * The community feed, embedded.
 *
 * No close button: the tab is the way out. `AppwinCore.configure` must have run
 * before this mounts.
 *
 * The view is live: it switches between the placeholder and the feed as the
 * verdict changes (a plan that lapses, a dashboard toggle), without being
 * remounted.
 *
 * ```tsx
 * <AppwinCommunityView
 *   style={{ flex: 1 }}
 *   unavailable={() => <ComingSoon />}
 * />
 * ```
 */
export function AppwinCommunityView({
  unavailable,
  ...props
}: AppwinCommunityViewProps): React.ReactElement {
  const verdict = useCommunityVerdict(unavailable != null)
  if (unavailable && verdict && verdict.status !== 'ready') {
    return <>{unavailable(verdict)}</>
  }
  return <NativeCommunityView {...props} />
}

/** `null` until the first verdict arrives, and when nobody needs it. */
function useCommunityVerdict(enabled: boolean): AppwinInitResult | null {
  const [verdict, setVerdict] = React.useState<AppwinInitResult | null>(null)
  React.useEffect(() => {
    if (!enabled) return undefined
    return AppwinCore.addAvailabilityListener('community', setVerdict)
  }, [enabled])
  return verdict
}

/** The Support messenger, embedded. Same rules as the feed. */
export function AppwinSupportMessengerView(
  props: AppwinNativeViewProps,
): React.ReactElement {
  return <NativeMessengerView {...props} />
}
