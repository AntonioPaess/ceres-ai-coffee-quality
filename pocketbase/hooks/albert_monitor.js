onRecordAfterCreateSuccess((e) => {
  const newSample = e.record
  const score = newSample.getInt('score')
  if (score === 0) return e.next()
  const userId = newSample.getString('user_id')

  try {
    const records = $app.findRecordsByFilter(
      'samples',
      `user_id = '${userId}' && id != '${newSample.id}'`,
      '-created',
      1,
      0,
    )
    if (records.length === 0) return e.next()

    const previous = records[0]
    const prevScore = previous.getInt('score')

    if (score < prevScore) {
      const result = $ai.agent('albert-assistant').chat({
        user_id: userId,
        message: `Minha nota caiu de ${prevScore} para ${score}.`,
      })

      const alertsCol = $app.findCollectionByNameOrId('alerts')
      const alert = new Record(alertsCol)
      alert.set('user_id', userId)
      alert.set('message', result.content)
      alert.set('isRead', false)
      $app.save(alert)

      const user = $app.findRecordById('users', userId)
      const chatId = user.getString('telegramChatId')
      if (chatId) {
        const botToken = $secrets.get('TELEGRAM_BOT_TOKEN')
        if (botToken) {
          try {
            $http.send({
              url: `https://api.telegram.org/bot${botToken}/sendMessage`,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🚨 Alerta do Albert:\n\n${result.content}`,
              }),
            })
          } catch (err) {
            $app.logger().error('Failed to notify telegram', 'err', err.message)
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Albert monitor error', 'err', err.message)
  }

  return e.next()
}, 'samples')
