// SECURITY: demo data is opt-in. No account with a predictable password is ever created.
// To seed demo data in a NON-production environment, set CERES_SEED_DEMO_EMAIL and
// CERES_SEED_DEMO_PASSWORD (a strong, unique value) before running migrations.
migrate(
  (app) => {
    const demoEmail = $os.getenv('CERES_SEED_DEMO_EMAIL')
    const demoPassword = $os.getenv('CERES_SEED_DEMO_PASSWORD')
    if (!demoEmail || !demoPassword) return

    const users = app.findCollectionByNameOrId('users')

    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('users', demoEmail)
      userRecord.set('role', 'producer')
      app.save(userRecord)
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail(demoEmail)
      userRecord.setPassword(demoPassword)
      userRecord.setVerified(true)
      userRecord.set('name', 'Demo Producer')
      userRecord.set('role', 'producer')
      app.save(userRecord)
    }

    const samplesCol = app.findCollectionByNameOrId('samples')
    try {
      app.findFirstRecordByData('samples', 'name', 'Lote Principal (Seed)')
    } catch (_) {
      const s1 = new Record(samplesCol)
      s1.set('user_id', userRecord.id)
      s1.set('name', 'Lote Principal (Seed)')
      s1.set('variety', 'Arábica')
      s1.set('score', 82)
      s1.set('grade', 'A')
      s1.set('price', 8.4)
      s1.set('defects', [{ type: 'Grão Preto', count: 1, percent: '0.5%', severity: 'Baixa' }])
      app.save(s1)

      const s2 = new Record(samplesCol)
      s2.set('user_id', userRecord.id)
      s2.set('name', 'Lote Secundário (Seed)')
      s2.set('variety', 'Arábica')
      s2.set('score', 75)
      s2.set('grade', 'B')
      s2.set('price', 6.9)
      s2.set('defects', [
        { type: 'Grão Preto', count: 2, percent: '1.2%', severity: 'Média' },
        { type: 'Grão Quebrado', count: 1, percent: '0.8%', severity: 'Baixa' },
      ])
      app.save(s2)
    }
  },
  (app) => {},
)
