/**
 * Minimal `react-native` declarations, for typechecking **this package only**.
 *
 *
 * They are not published: `typeRoots` limits them to the local tsconfig, and
 * `files` excludes them from the npm package. Apps that install it use the real
 * types of their React Native version, declared as a peer dependency.
 *
 * Why not install `react-native` as a dev dependency: the package weighs a
 * hundred megabytes and carries a full native build chain, to check the
 * signature of four functions. Everyone would pay that on every install of the
 * repository.
 */
declare module 'react-native' {
  export interface NativeModule {
    [key: string]: unknown
  }

  export const NativeModules: Record<string, NativeModule | undefined>

  export const Platform: {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos'
    select<T>(specifics: { ios?: T; android?: T; default?: T }): T | undefined
  }

  export interface ViewProps {
    style?: unknown
    testID?: string
  }

  export function requireNativeComponent<T>(name: string): React.ComponentType<T>

  export class NativeEventEmitter {
    constructor(nativeModule?: NativeModule)
    addListener(
      eventType: string,
      listener: (event: unknown) => void,
    ): { remove(): void }
  }

  export const UIManager: {
    getViewManagerConfig(name: string): unknown | null
  }
}
