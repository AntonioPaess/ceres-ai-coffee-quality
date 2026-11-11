// SECURITY: opt-in only; see 0005_seed_data.js. No hardcoded credentials.
migrate(
  (app) => {
    const demoEmail = $os.getenv('CERES_SEED_DEMO_EMAIL')
    const demoPassword = $os.getenv('CERES_SEED_DEMO_PASSWORD')
    if (!demoEmail || !demoPassword) return

    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', demoEmail)
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail(demoEmail)
    record.setPassword(demoPassword)
    record.setVerified(true)
    record.set('name', 'Demo Producer')
    record.set('role', 'producer')
    app.save(record)
  },
  (app) => {
    const demoEmail = $os.getenv('CERES_SEED_DEMO_EMAIL')
    if (!demoEmail) return
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', demoEmail)
      app.delete(record)
    } catch (_) {}
  },
)
