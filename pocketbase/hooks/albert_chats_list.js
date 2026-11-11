routerAdd(
  'GET',
  '/backend/v1/albert/chats',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')
    let limit = parseInt((e.requestInfo().query && e.requestInfo().query.limit) || '20', 10) || 20
    if (limit < 1 || limit > 100) limit = 20 // bound page size
    return e.json(200, $ai.agent('albert').listConversations({ user_id: userId, limit: limit }))
  },
  $apis.requireAuth(),
)
