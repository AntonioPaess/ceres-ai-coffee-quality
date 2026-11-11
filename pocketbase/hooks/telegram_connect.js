routerAdd(
  'POST',
  '/backend/v1/telegram/connect',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('auth required')

      const token = $security.randomString(32)
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)

      const col = $app.findCollectionByNameOrId('connection_tokens')
      const record = new Record(col)
      record.set('token', token)
      record.set('user_id', userId)
      record.set('expiresAt', expiresAt.toISOString())
      record.set('used', false)
      $app.save(record)

      return e.json(200, {
        telegramUrl: 'https://t.me/ceresvision_bot?start=' + token,
      })
    } catch (err) {
      $app.logger().error('Failed to generate Telegram connection token', 'err', err.message)
      return e.json(500, { error: 'Falha ao gerar token de conexão' })
    }
  },
  $apis.requireAuth(),
)
