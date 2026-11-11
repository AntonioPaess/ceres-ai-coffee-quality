routerAdd(
  'GET',
  '/backend/v1/albert/chats/{conversationId}/messages',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('auth required')
      return e.json(
        200,
        $ai.agent('albert').listMessages({
          conversation_id: e.request.pathValue('conversationId'),
          user_id: userId,
        }),
      )
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'falha ao buscar conversa' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
