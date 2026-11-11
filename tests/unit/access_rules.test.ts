/**
 * Static check of the FINAL PocketBase API rules after all migrations: executes every migration's
 * `up` against a mocked app that records rule assignments. Real enforcement is covered by
 * tests/integration/access_rules.live.test.ts (requires a running PocketBase).
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { ROOT } from '../helpers/load'

type Col = Record<string, unknown> & { name: string }
const cols: Record<string, Col> = {}
const get = (name: string): Col => {
  if (!cols[name]) {
    const c: Col = { name, fields: { getByName: () => null, removeByName() {}, add() {} } } as unknown as Col
    cols[name] = c
  }
  return cols[name]
}
const noop = () => {}
const throwing = () => { throw new Error('not found') }
const app = new Proxy(
  {
    findCollectionByNameOrId: get,
    save(x: Col) { if (x && x.name && x.listRule !== undefined) Object.assign(get(x.name), x) },
    findAuthRecordByEmail: throwing,
    findFirstRecordByData: throwing,
    findRecordsByFilter: () => [],
    db: () => ({ newQuery: () => ({ execute: noop, bind: () => ({ execute: noop }) }) }),
    delete: noop,
  } as Record<string, unknown>,
  { get: (t, k: string) => (k in t ? t[k] : noop) },
)
class Collection { constructor(o: Col) { Object.assign(this, o) } }
const Field = function (this: object, o: object) { Object.assign(this, o) }
const dir = path.join(ROOT, 'pocketbase/migrations')
for (const f of fs.readdirSync(dir).sort()) {
  let up: ((a: unknown) => void) | undefined
  const ctx = vm.createContext({
    migrate: (u: (a: unknown) => void) => { up = u },
    Collection, Record: Field, SelectField: Field, JSONField: Field, NumberField: Field, TextField: Field,
    DateField: Field, BoolField: Field, FileField: Field, RelationField: Field, AutodateField: Field,
    $os: { getenv: () => '' }, $ai: { agents: { define: noop } }, $security: { randomString: () => 'x' },
    console,
  })
  vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx)
  try { up?.(app) } catch { /* data-only migrations may need real records; rules are what we test */ }
}

const OWNER = 'user_id = @request.auth.id'

describe('final API rules', () => {
  it('samples: owner-only read/update/delete', () => {
    for (const r of ['listRule', 'viewRule', 'updateRule', 'deleteRule']) expect(cols.samples[r]).toContain(OWNER)
  })
  it('samples: create must bind user_id to the authenticated user', () => {
    expect(cols.samples.createRule).toContain('@request.body.user_id = @request.auth.id')
  })
  it('samples: clients cannot write server-computed fields or reassign ownership', () => {
    for (const f of ['score', 'grade', 'defects', 'status']) {
      expect(cols.samples.createRule).toContain(`@request.body.${f}:isset = false`)
      expect(cols.samples.updateRule).toContain(`@request.body.${f}:isset = false`)
    }
    expect(cols.samples.updateRule).toContain('@request.body.user_id:isset = false')
  })
  it('server-only collections are closed to the API', () => {
    for (const c of ['sessions', 'connection_tokens', 'market_price_cache', 'telegram_updates'])
      for (const r of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) expect(cols[c][r]).toBeNull()
    expect(cols.action_logs.createRule).toBeNull()
    expect(cols.agents.createRule).toBeNull()
    expect(cols.alerts.createRule).toBeNull()
  })
  it('user_agents create is bound to the caller', () => {
    expect(cols.user_agents.createRule).toContain('@request.body.user_id = @request.auth.id')
  })
  it('no migration seeds a hardcoded password', () => {
    for (const f of fs.readdirSync(dir)) {
      expect(fs.readFileSync(path.join(dir, f), 'utf8')).not.toMatch(/setPassword\(\s*['"`]/)
    }
  })
})
