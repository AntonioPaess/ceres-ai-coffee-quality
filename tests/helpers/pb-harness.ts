/**
 * Minimal PocketBase JSVM harness: runs a real hook file inside a Node `vm` context with
 * mocked globals ($app, $http, $secrets, $os, routerAdd, onRecord…). It verifies the hook's
 * control flow and persistence calls — NOT PocketBase itself nor the real external services.
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { HOOKS, loadCjs } from './load'

type Rec = { id: string; data: Record<string, unknown>; collection: string }

export function makeRecord(collection: string, data: Record<string, unknown> = {}, id = 'r' + Math.random().toString(36).slice(2, 17).padEnd(15, '0')) {
  const rec: Rec & Record<string, unknown> = {
    id,
    collection,
    data: { ...data },
    get(k: string) { return this.data[k] },
    getString(k: string) { const v = this.data[k]; return v === undefined || v === null ? '' : String(v) },
    getBool(k: string) { return !!this.data[k] },
    set(k: string, v: unknown) { this.data[k] = v },
  }
  return rec
}

export interface HarnessOptions {
  secrets?: Record<string, string>
  env?: Record<string, string>
  http?: (req: { url: string; method: string; body?: string; headers?: Record<string, string> }) => unknown
  records?: Record<string, ReturnType<typeof makeRecord>[]>
}

export function loadHook(file: string, opts: HarnessOptions = {}) {
  const store: Record<string, ReturnType<typeof makeRecord>[]> = { ...(opts.records || {}) }
  const httpCalls: { url: string; method: string; body?: string }[] = []
  const logs: unknown[][] = []
  const saved: ReturnType<typeof makeRecord>[] = []
  const deleted: ReturnType<typeof makeRecord>[] = []
  const handlers: { recordAfterCreate?: (e: unknown) => unknown; routes: Record<string, (e: unknown) => unknown> } = { routes: {} }
  const uniques: Record<string, Set<string>> = { telegram_updates: new Set() }

  const col = (name: string) => store[name] || (store[name] = [])
  const $app = {
    findRecordById(c: string, id: string) {
      const r = col(c).find((x) => x.id === id)
      if (!r) throw new Error('not found')
      return r
    },
    findCollectionByNameOrId(name: string) { return { name } },
    findRecordsByFilter(c: string, filter: string) {
      // supports the only filter shape the hooks use: user_id = '<id>'
      const m = /user_id\s*=\s*'([^']*)'/.exec(filter || '')
      return col(c).filter((x) => !m || String(x.data.user_id) === m[1])
    },
    findFirstRecordByData(c: string, k: string, v: unknown) {
      const r = col(c).find((x) => String(x.data[k]) === String(v))
      if (!r) throw new Error('not found')
      return r
    },
    save(r: ReturnType<typeof makeRecord>) {
      if (r.collection === 'telegram_updates') {
        const u = String(r.data.updateId)
        if (uniques.telegram_updates.has(u)) throw new Error('UNIQUE constraint failed')
        uniques.telegram_updates.add(u)
      }
      if (!col(r.collection).includes(r)) col(r.collection).push(r)
      saved.push(r)
    },
    delete(r: ReturnType<typeof makeRecord>) {
      store[r.collection] = col(r.collection).filter((x) => x !== r)
      deleted.push(r)
    },
    logger() {
      return {
        error: (...a: unknown[]) => logs.push(['error', ...a]),
        warn: (...a: unknown[]) => logs.push(['warn', ...a]),
        info: (...a: unknown[]) => logs.push(['info', ...a]),
      }
    },
  }
  function RecordCtor(this: unknown, c: { name: string }) { return makeRecord(c.name) }

  const ctx = vm.createContext({
    __hooks: HOOKS,
    require: (p: string) => loadCjs(p),
    console,
    $app,
    Record: RecordCtor,
    $secrets: { get: (k: string) => (opts.secrets || {})[k] || '' },
    $os: { getenv: (k: string) => (opts.env || {})[k] || '' },
    $http: {
      send(req: { url: string; method: string; body?: string }) {
        httpCalls.push(req)
        if (!opts.http) return { statusCode: 200, json: { ok: true } }
        return opts.http(req)
      },
    },
    $filesystem: { fileFromURL: () => ({ size: 1000, name: 'photo.jpg' }) },
    $security: { randomString: () => 'x'.repeat(32) },
    $apis: { requireAuth: () => ({}) },
    $ai: { agent: () => ({ chat: () => ({ content: 'ok', conversation_id: 'c1' }) }) },
    onRecordAfterCreateSuccess: (fn: (e: unknown) => unknown) => { handlers.recordAfterCreate = fn },
    onRecordCreate: () => {},
    routerAdd: (method: string, route: string, fn: (e: unknown) => unknown) => { handlers.routes[method + ' ' + route] = fn },
  })
  vm.runInContext(fs.readFileSync(path.join(HOOKS, file), 'utf8'), ctx, { filename: file })
  return { handlers, store, httpCalls, logs, saved, deleted }
}

export function routeEvent(body: unknown, headers: Record<string, string> = {}) {
  const res: { status?: number; body?: unknown } = {}
  const lower: Record<string, string> = {}
  for (const k of Object.keys(headers)) lower[k.toLowerCase()] = headers[k]
  return {
    res,
    e: {
      request: { header: { get: (k: string) => lower[k.toLowerCase()] || '' } },
      requestInfo: () => ({ body }),
      json(status: number, b: unknown) { res.status = status; res.body = b; return b },
      next: () => undefined,
    },
  }
}
