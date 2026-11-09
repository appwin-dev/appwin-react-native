import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Test ESM resolver.
 *
 * Two adjustments, both specific to the Node runtime:
 *
 * - `react-native` points at a local double. The real package carries a full
 *   native build chain and has no business here; the native modules are injected
 *   by `setNativeModuleResolver` anyway.
 * - relative imports with no extension are completed. That is the form Metro,
 *   React Native's bundler, expects; Node ESM requires the extension. Fixing it
 *   in the sources would make them less idiomatic for their real consumers.
 */
const EXTENSIONS = ['.ts', '.tsx']

export async function resolve(specifier, context, next) {
  if (specifier === 'react-native') {
    return {
      url: new URL('./react-native.ts', import.meta.url).href,
      shortCircuit: true,
    }
  }

  if (specifier.startsWith('.') && !EXTENSIONS.some((ext) => specifier.endsWith(ext))) {
    const base = new URL(specifier, context.parentURL)
    for (const extension of EXTENSIONS) {
      const candidate = new URL(base.href + extension)
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true }
      }
    }
  }

  return next(specifier, context)
}
