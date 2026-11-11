import { describe, expect, it } from 'vitest'
import { guard } from '../helpers/load'

const ID = 'abcdefghij12345'

describe('Albert action validation (LLM output is untrusted)', () => {
  it('accepts a well-formed update with whitelisted fields', () => {
    const r = guard.validateAction({ type: 'update', targetId: ID, changes: { name: ' Lote 2 ', weight: '300' } })
    expect(r).toMatchObject({ ok: true, changes: { name: 'Lote 2', weight: 300 } })
  })
  it.each(['user_id', 'score', 'grade', 'defects', 'status', 'image', '__proto__'])(
    'rejects attempts to change server field %s',
    (field) => {
      const changes = JSON.parse(`{"${field}": "x"}`)
      expect(guard.validateAction({ type: 'update', targetId: ID, changes }).ok).toBe(false)
    },
  )
  it.each([
    [null, 'malformed'],
    ['delete everything', 'malformed'],
    [{ type: 'exec', cmd: 'rm -rf /' }, 'unknown_type'],
    [{ type: 'delete' }, 'missing_target'],
    [{ type: 'delete', targetId: "x' || 1=1" }, 'missing_target'],
    [{ type: 'update', targetId: ID, changes: {} }, 'no_changes'],
    [{ type: 'update', targetId: ID, changes: { weight: -1 } }, 'invalid_weight'],
    [{ type: 'update', targetId: ID, changes: { price: 'NaN' } }, 'invalid_price'],
    [{ type: 'update', targetId: ID, changes: { variety: 'Bourbon<script>' } }, 'invalid_variety'],
    [{ type: 'activate_agent', agentSlug: '../../etc' }, 'invalid_agent_slug'],
  ])('rejects %j', (action, error) => {
    expect(guard.validateAction(action)).toMatchObject({ ok: false, error })
  })
  it('accepts delete by label and delete_all (both still require user confirmation)', () => {
    expect(guard.validateAction({ type: 'delete', targetLabel: 'Lote 1' }).ok).toBe(true)
    expect(guard.validateAction({ type: 'delete_all' }).ok).toBe(true)
  })
  it('expires pending actions after the TTL', () => {
    const now = Date.parse('2026-01-01T00:20:00Z')
    expect(guard.isPendingExpired({ createdAt: '2026-01-01T00:15:00Z' }, now)).toBe(false)
    expect(guard.isPendingExpired({ createdAt: '2026-01-01T00:05:00Z' }, now)).toBe(true)
    expect(guard.isPendingExpired({}, now)).toBe(true)
  })
})

describe('Telegram payload validation', () => {
  const msg = (chat: object, extra: object = {}) => ({ update_id: 1, message: { chat, text: 'oi', ...extra } })
  it('accepts private messages and callbacks', () => {
    expect(guard.validateTelegramUpdate(msg({ id: 5, type: 'private' }))).toMatchObject({ ok: true, kind: 'message', chatId: 5 })
    expect(
      guard.validateTelegramUpdate({ update_id: 2, callback_query: { id: 'q', message: { chat: { id: 5, type: 'private' } } } }),
    ).toMatchObject({ ok: true, kind: 'callback' })
  })
  it.each([
    [null, 'invalid_body'],
    [{ message: {} }, 'missing_update_id'],
    [msg({ id: 5, type: 'group' }), 'not_private_chat'],
    [msg({ id: 5, type: 'private' }, { text: 'a'.repeat(5000) }), 'text_too_long'],
    [{ update_id: 3, edited_message: {} }, 'unsupported_update'],
  ])('rejects %j', (b, error) => {
    expect(guard.validateTelegramUpdate(b)).toMatchObject({ ok: false, error })
  })
  it('webhook secret: fail closed, constant-time compare', () => {
    expect(guard.checkWebhookSecret('s3cret', 's3cret', false)).toBe(true)
    expect(guard.checkWebhookSecret('s3cret', 's3creX', false)).toBe(false)
    expect(guard.checkWebhookSecret('s3cret', '', false)).toBe(false)
    expect(guard.checkWebhookSecret('', '', false)).toBe(false)
    expect(guard.checkWebhookSecret('', '', true)).toBe(true)
  })
  it('photo selection respects size limit and file_id format', () => {
    expect(guard.pickPhoto([{ file_id: 'a', file_size: 10 }, { file_id: 'b', file_size: 20 }]).file_id).toBe('b')
    expect(guard.pickPhoto([{ file_id: 'a', file_size: 10 }, { file_id: 'b', file_size: 50 * 1024 * 1024 }]).file_id).toBe('a')
    expect(guard.pickPhoto([{ file_id: '../x?y' }])).toBeNull()
    expect(guard.pickPhoto([])).toBeNull()
  })
})
