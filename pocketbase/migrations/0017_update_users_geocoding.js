migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('cityName')) {
      users.fields.add(new TextField({ name: 'cityName' }))
    }

    if (!users.fields.getByName('geocodedAt')) {
      users.fields.add(new DateField({ name: 'geocodedAt' }))
    }

    app.save(users)

    try {
      const userRecord = app.findAuthRecordByEmail('users', $os.getenv('CERES_SEED_DEMO_EMAIL') || '__no_demo_user__')
      userRecord.set('cityName', 'Varginha, MG')
      userRecord.set('latitude', '-21.55139')
      userRecord.set('longitude', '-45.43056')
      userRecord.set('geocodedAt', new Date().toISOString())
      app.save(userRecord)
    } catch (_) {}
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('cityName')
    users.fields.removeByName('geocodedAt')
    app.save(users)
  },
)
