migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['producer'],
          maxSelect: 1,
          required: true,
        }),
      )
    }
    if (!users.fields.getByName('telegramChatId')) {
      users.fields.add(new TextField({ name: 'telegramChatId' }))
    }
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('role')
    users.fields.removeByName('telegramChatId')
    app.save(users)
  },
)
