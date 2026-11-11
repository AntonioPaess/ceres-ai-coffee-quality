// Idempotency log for Telegram webhook deliveries (Telegram retries on non-2xx / timeouts).
// Server-only: all API rules null. Rows may be purged periodically (e.g. older than 7 days).
migrate(
  (app) => {
    const col = new Collection({
      type: 'base',
      name: 'telegram_updates',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'updateId', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_telegram_updates_updateId ON telegram_updates (updateId)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('telegram_updates'))
    } catch (_) {}
  },
)
