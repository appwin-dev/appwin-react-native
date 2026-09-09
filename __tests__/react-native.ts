// Double of `react-native` for running the tests under Node: the real package
// is not installable here (a full native build chain) and nothing under test
// depends on it - the native modules are injected by
// `setNativeModuleResolver`.
export const NativeModules: Record<string, unknown> = {}
export const Platform = { OS: 'ios' as const, select: () => undefined }
