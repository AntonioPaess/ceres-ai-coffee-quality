/**
 * Deterministic validation of actions proposed by the Albert LLM and of Telegram payloads.
 * Pure functions (testable in Node). The LLM output is treated as untrusted input.
 */

var ID_RE = /^[a-zA-Z0-9]{15}$/
var ALLOWED_TYPES = ['update', 'delete', 'delete_all', 'activate_agent', 'deactivate_agent']
var VARIETIES = ['Arábica', 'Robusta', 'Misto', 'arabica', 'robusta', 'misto']
var PENDING_TTL_MS = 10 * 60 * 1000
var MAX_PHOTO_BYTES = 10 * 1024 * 1024
var MAX_TEXT_LEN = 4000

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/**
 * Whitelists the fields the assistant may change on a sample. Server-computed fields
 * (score, grade, defects, status, user_id, image…) can never be modified through chat.
 * Returns { ok, changes, error }.
 */
function sanitizeSampleChanges(changes) {
  if (!isPlainObject(changes)) return { ok: false, changes: {}, error: 'invalid_changes' }
  var out = {}
  var keys = Object.keys(changes)
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i]
    var v = changes[k]
    if (k === 'name') {
      if (typeof v !== 'string' || !v.trim() || v.length > 100)
        return { ok: false, changes: {}, error: 'invalid_name' }
      out.name = v.trim()
    } else if (k === 'variety') {
      if (VARIETIES.indexOf(v) < 0) return { ok: false, changes: {}, error: 'invalid_variety' }
      out.variety = v
    } else if (k === 'weight') {
      var w = Number(v)
      if (!isFinite(w) || w <= 0 || w > 1000000)
        return { ok: false, changes: {}, error: 'invalid_weight' }
      out.weight = w
    } else if (k === 'price') {
      var p = Number(v)
      if (!isFinite(p) || p < 0 || p > 100000)
        return { ok: false, changes: {}, error: 'invalid_price' }
      out.price = p
    } else {
      return { ok: false, changes: {}, error: 'field_not_allowed:' + k }
    }
  }
  if (Object.keys(out).length === 0) return { ok: false, changes: {}, error: 'no_changes' }
  return { ok: true, changes: out, error: '' }
}

/** Validates the shape of an action parsed from the model output. */
function validateAction(action) {
  if (!isPlainObject(action)) return { ok: false, error: 'malformed' }
  if (ALLOWED_TYPES.indexOf(action.type) < 0) return { ok: false, error: 'unknown_type' }
  if (action.type === 'update' || action.type === 'delete') {
    var hasId = typeof action.targetId === 'string' && ID_RE.test(action.targetId)
    var hasLabel =
      typeof action.targetLabel === 'string' &&
      action.targetLabel.length > 0 &&
      action.targetLabel.length <= 200
    if (!hasId && !hasLabel) return { ok: false, error: 'missing_target' }
  }
  if (action.type === 'update') {
    var s = sanitizeSampleChanges(action.changes)
    if (!s.ok) return { ok: false, error: s.error }
    return { ok: true, error: '', changes: s.changes }
  }
  if (action.type === 'activate_agent' || action.type === 'deactivate_agent') {
    if (typeof action.agentSlug !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(action.agentSlug))
      return { ok: false, error: 'invalid_agent_slug' }
  }
  return { ok: true, error: '' }
}

function isPendingExpired(pendingAction, nowMs) {
  var created = pendingAction && pendingAction.createdAt ? Date.parse(pendingAction.createdAt) : NaN
  if (!isFinite(created)) return true
  return nowMs - created > PENDING_TTL_MS
}

/** Constant-time string comparison (fallback when $security.equal is unavailable). */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  var r = 0
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

/**
 * Validates the Telegram secret header. If no secret is configured the request is rejected
 * (fail closed) unless allowUnauthenticated is explicitly true (migration aid only).
 */
function checkWebhookSecret(configuredSecret, headerValue, allowUnauthenticated) {
  if (!configuredSecret) return allowUnauthenticated === true
  return safeEqual(configuredSecret, headerValue || '')
}

/**
 * Validates the structural minimum of a Telegram update.
 * Returns { ok, kind: 'message'|'callback'|'ignore', updateId, chatId, error }.
 * Only private chats are accepted.
 */
function validateTelegramUpdate(body) {
  if (!isPlainObject(body)) return { ok: false, kind: 'ignore', error: 'invalid_body' }
  var uid = body.update_id
  if (typeof uid !== 'number' || !isFinite(uid))
    return { ok: false, kind: 'ignore', error: 'missing_update_id' }
  if (isPlainObject(body.callback_query)) {
    var m = body.callback_query.message
    if (!isPlainObject(m) || !isPlainObject(m.chat) || m.chat.type !== 'private')
      return { ok: false, kind: 'ignore', updateId: uid, error: 'callback_not_private' }
    return { ok: true, kind: 'callback', updateId: uid, chatId: m.chat.id, error: '' }
  }
  if (isPlainObject(body.message)) {
    var c = body.message.chat
    if (!isPlainObject(c) || c.type !== 'private' || c.id === undefined)
      return { ok: false, kind: 'ignore', updateId: uid, error: 'not_private_chat' }
    var text = body.message.text || body.message.caption || ''
    if (typeof text !== 'string' || text.length > MAX_TEXT_LEN)
      return { ok: false, kind: 'ignore', updateId: uid, error: 'text_too_long' }
    return { ok: true, kind: 'message', updateId: uid, chatId: c.id, error: '' }
  }
  return { ok: false, kind: 'ignore', updateId: uid, error: 'unsupported_update' }
}

/** Picks the largest photo within the size limit; returns null if none is acceptable. */
function pickPhoto(photoSizes) {
  if (!Array.isArray(photoSizes) || photoSizes.length === 0) return null
  var best = null
  for (var i = 0; i < photoSizes.length; i++) {
    var p = photoSizes[i]
    if (
      !isPlainObject(p) ||
      typeof p.file_id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,256}$/.test(p.file_id)
    )
      continue
    if (typeof p.file_size === 'number' && p.file_size > MAX_PHOTO_BYTES) continue
    best = p
  }
  return best
}

module.exports = {
  ID_RE: ID_RE,
  ALLOWED_TYPES: ALLOWED_TYPES,
  PENDING_TTL_MS: PENDING_TTL_MS,
  MAX_PHOTO_BYTES: MAX_PHOTO_BYTES,
  sanitizeSampleChanges: sanitizeSampleChanges,
  validateAction: validateAction,
  isPendingExpired: isPendingExpired,
  safeEqual: safeEqual,
  checkWebhookSecret: checkWebhookSecret,
  validateTelegramUpdate: validateTelegramUpdate,
  pickPhoto: pickPhoto,
}
