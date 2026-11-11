import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'

export const ROOT = path.resolve(__dirname, '../..')
export const HOOKS = path.join(ROOT, 'pocketbase/hooks')
export const nodeRequire = createRequire(import.meta.url)

const cache: Record<string, unknown> = {}

/**
 * Loads a PocketBase hook library (CommonJS, ES5-compatible) the same way the JSVM does:
 * evaluates it with a `module`/`exports` pair. Needed because the repo root is "type": "module".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadCjs(file: string): any {
  const abs = path.resolve(file)
  if (cache[abs]) return cache[abs]
  const module = { exports: {} as Record<string, unknown> }
  vm.runInThisContext(`(function (module, exports) {${fs.readFileSync(abs, 'utf8')}\n})`, {
    filename: abs,
  })(module, module.exports)
  cache[abs] = module.exports
  return module.exports
}

export const rules = loadCjs(path.join(HOOKS, '_lib/coffee_rules.js'))
export const guard = loadCjs(path.join(HOOKS, '_lib/action_validation.js'))
