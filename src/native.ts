import { NativeModules, Platform } from 'react-native'

/** Names exposed natively. Must match the iOS and Android modules. */
export const NATIVE_MODULE_NAMES = {
  core: 'AppwinCoreModule',
  support: 'AppwinSupportModule',
  community: 'AppwinCommunityModule',
  notifications: 'AppwinNotificationsModule',
} as const

export type NativeModuleKey = keyof typeof NATIVE_MODULE_NAMES

type NativeModuleLike = Record<string, unknown>

type Resolver = (name: string) => NativeModuleLike | undefined

let resolver: Resolver = (name) => NativeModules[name] as NativeModuleLike | undefined

/**
 * Replaces native module resolution.
 *
 * Meant for tests: there is no native module in a Node runtime, and a double
 * lets us assert what the TypeScript layer actually sends to native - the one
 * place contract bugs slip in.
 */
export function setNativeModuleResolver(next: Resolver | null): void {
  resolver = next ?? ((name) => NativeModules[name] as NativeModuleLike | undefined)
}

/**
 * Written for the person who just installed the package, because that is where
 * it breaks: the JavaScript module resolves, the native one does not, and the
 * raw error (`null is not an object`) points nowhere.
 */
const LINKING_ERROR =
  `The Appwin native module could not be found. Check that:\n` +
  `  - you rebuilt the app after installing (JavaScript alone is not enough)\n` +
  (Platform.OS === 'ios' ? `  - \`cd ios && pod install\` has been run\n` : '') +
  `  - you are not in Expo Go, which loads no third-party native module\n`

export function getNativeModule(key: NativeModuleKey): NativeModuleLike {
  const nativeModule = resolver(NATIVE_MODULE_NAMES[key])
  if (!nativeModule) throw new Error(LINKING_ERROR)
  return nativeModule
}

/**
 * Calls a native method and returns its promise.
 *
 * The return type is declared by the caller: the bridge loses types on the way,
 * and reconstructing them here rather than at each call site keeps a single
 * untyped boundary in the whole package.
 */
export async function invoke<T>(
  key: NativeModuleKey,
  method: string,
  ...args: unknown[]
): Promise<T> {
  const nativeModule = getNativeModule(key)
  const fn = nativeModule[method]
  if (typeof fn !== 'function') {
    throw new Error(
      `${NATIVE_MODULE_NAMES[key]}.${method} does not exist in the installed binary. ` +
        `The JavaScript is newer than the native code: rebuild.`,
    )
  }
  return (fn as (...a: unknown[]) => Promise<T>).apply(nativeModule, args)
}
