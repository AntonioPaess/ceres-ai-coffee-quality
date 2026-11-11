migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const roleField = users.fields.getByName('role')
    if (roleField) {
      users.fields.removeByName('role')
    }
    users.fields.add(
      new SelectField({
        name: 'role',
        values: ['producer'],
        maxSelect: 1,
        required: true,
      }),
    )
    app.save(users)

    const samples = app.findCollectionByNameOrId('samples')
    samples.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    samples.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    samples.createRule = "@request.auth.id != ''"
    samples.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    samples.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(samples)

    const alerts = app.findCollectionByNameOrId('alerts')
    alerts.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    alerts.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    alerts.createRule = null
    alerts.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    alerts.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(alerts)

    try {
      const coopRecord = app.findAuthRecordByEmail('users', 'coop@ceres.com')
      app.delete(coopRecord)
    } catch (_) {}
  },
  (app) => {},
)
