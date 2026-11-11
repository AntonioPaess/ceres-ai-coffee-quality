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
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const roleField = users.fields.getByName('role')
    if (roleField) {
      users.fields.removeByName('role')
    }
    users.fields.add(
      new SelectField({
        name: 'role',
        values: ['producer', 'cooperative'],
        maxSelect: 1,
        required: true,
      }),
    )
    app.save(users)
  },
)
