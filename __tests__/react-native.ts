// Double of `react-native` for running the tests under Node: the real package
// is not installable here (a full native build chain) and nothing under test
// depends on it - the native modules are injected by
// `setNativeModuleResolver`.
export const NativeModules: Record<string, unknown> = {}
export const Platform = { OS: 'ios' as const, select: () => undefined }

type Listener = (payload: unknown) => void

const listeners = new Map<string, Set<Listener>>()

/** Plays the native side: delivers `payload` as the module would send it. */
export function emitNativeEvent(event: string, payload: unknown): void {
  for (const listener of [...(listeners.get(event) ?? [])]) listener(payload)
}

export function nativeListenerCount(event: string): number {
  return listeners.get(event)?.size ?? 0
}

export function resetNativeEvents(): void {
  listeners.clear()
}

export class NativeEventEmitter {
  addListener(event: string, listener: Listener): { remove(): void } {
    const set = listeners.get(event) ?? new Set<Listener>()
    set.add(listener)
    listeners.set(event, set)
    return { remove: () => set.delete(listener) }
  }
}
