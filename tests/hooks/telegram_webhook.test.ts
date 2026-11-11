/** Runs the REAL telegram_webhook.js route handler with mocked PocketBase/Telegram. */
import { describe, expect, it } from 'vitest'
import { loadHook, makeRecord, routeEvent } from '../helpers/pb-harness'

const ROUTE = 'POST /backend/v1/telegram-webhook'
const SECRET = 'whsec-0123456789'
const HDR = { 'X-Telegram-Bot-Api-Secret-Token': SECRET }
const SECRETS = { TELEGRAM_BOT_TOKEN: '123:ABC', TELEGRAM_WEBHOOK_SECRET: SECRET }
const OWN = 'ownsample000001'
const FOREIGN = 'othersample0001'

function setup(pendingAction?: object, secrets: Record<string, string> = SECRETS) {
  const user = makeRecord('users', { telegramChatId: '777' }, 'user00000000001')
  const other = makeRecord('users', { telegramChatId: '888' }, 'user00000000002')
  const session = makeRecord('sessions', {
    chatId: '777',
    currentStep: 'idle',
    pendingAction: pendingAction ? JSON.stringify({ createdAt: new Date().toISOString(), ...pendingAction }) : '',
  })
  const own = makeRecord('samples', { user_id: user.id, name: 'Lote A', score: 80, grade: 'A' }, OWN)
  const foreign = makeRecord('samples', { user_id: other.id, name: 'Lote B', score: 50 }, FOREIGN)
  const h = loadHook('telegram_webhook.js', {
    secrets,
    records: { users: [user, other], sessions: [session], samples: [own, foreign] },
  })
  const send = (body: object, headers: Record<string, string> = HDR) => {
    const { e, res } = routeEvent(body, headers)
    h.handlers.routes[ROUTE](e)
    return res
  }
  return { h, send, own, foreign, session }
}

let n = 1
const text = (t: string, chat: object = { id: 777, type: 'private' }) => ({ update_id: n++, message: { chat, text: t } })
const telegramTexts = (h: ReturnType<typeof setup>['h']) =>
  h.httpCalls.filter((c) => c.url.endsWith('/sendMessage')).map((c) => JSON.parse(c.body!).text as string)

describe('telegram webhook — origin & payload', () => {
  it('rejects requests without the secret header (forged requests)', () => {
    const { send, h } = setup()
    expect(send(text('oi'), {}).status).toBe(401)
    expect(send(text('oi'), { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }).status).toBe(401)
    expect(h.httpCalls).toHaveLength(0)
  })
  it('fails closed when no secret is configured', () => {
    const { send } = setup(undefined, { TELEGRAM_BOT_TOKEN: '1:A' })
    expect(send(text('oi'), HDR).status).toBe(401)
  })
  it('ignores group chats and malformed updates without side effects', () => {
    const { send, h } = setup()
    expect(send(text('oi', { id: 777, type: 'group' })).status).toBe(200)
    expect(send({ foo: 'bar' }).status).toBe(200)
    expect(h.httpCalls).toHaveLength(0)
  })
  it('processes each update_id once (Telegram retries)', () => {
    const { send } = setup()
    const upd = text('não')
    expect(send(upd).body).toMatchObject({ ok: true })
    expect(send(upd).body).toMatchObject({ ok: true, duplicate: true })
  })
})

describe('telegram webhook — Albert action execution', () => {
  it('cannot change server-computed fields (mass assignment)', () => {
    const { send, own, h } = setup({ type: 'update', targetId: OWN, targetLabel: 'Lote A', changes: { score: 100, grade: 'A', user_id: 'x' } })
    send(text('sim'))
    expect(own.data).toMatchObject({ score: 80, grade: 'A', user_id: 'user00000000001' })
    expect(telegramTexts(h).join(' ')).toMatch(/Não foi possível validar/)
  })
  it('updates whitelisted fields of the owner sample after confirmation', () => {
    const { send, own } = setup({ type: 'update', targetId: OWN, targetLabel: 'Lote A', changes: { name: 'Lote Novo' } })
    send(text('sim'))
    expect(own.data.name).toBe('Lote Novo')
  })
  it("cannot delete another user's sample even with its exact ID", () => {
    const { send, h } = setup({ type: 'delete', targetId: FOREIGN, targetLabel: 'Lote B' })
    send(text('sim'))
    expect(h.deleted).toHaveLength(0)
    expect(h.store.samples.map((s) => s.id)).toContain(FOREIGN)
  })
  it('delete_all only removes the caller’s own samples', () => {
    const { send, h } = setup({ type: 'delete_all' })
    send(text('sim'))
    expect(h.store.samples.map((s) => s.id)).toEqual([FOREIGN])
  })
  it('expired confirmations are not executed', () => {
    const { send, h } = setup({ type: 'delete', targetId: OWN, createdAt: '2020-01-01T00:00:00Z' })
    send(text('sim'))
    expect(h.deleted).toHaveLength(0)
  })
  it('"não" cancels a pending destructive action', () => {
    const { send, h, session } = setup({ type: 'delete', targetId: OWN })
    send(text('não'))
    expect(h.deleted).toHaveLength(0)
    expect(session.data.pendingAction).toBe('')
  })
})
