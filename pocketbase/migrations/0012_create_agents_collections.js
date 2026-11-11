migrate(
  (app) => {
    const agentsCol = new Collection({
      name: 'agents',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'slug', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'defaultFrequency', type: 'text' },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['system', 'custom'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_ceres_agents_slug ON agents (slug)'],
    })
    app.save(agentsCol)

    const userAgentsCol = new Collection({
      name: 'user_agents',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'agent_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('agents').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'status', type: 'bool' },
        { name: 'config', type: 'json' },
        { name: 'lastRun', type: 'date' },
        { name: 'nextRun', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(userAgentsCol)

    const actionLogsCol = new Collection({
      name: 'action_logs',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'actionType', type: 'text' },
        { name: 'toolCalled', type: 'text' },
        { name: 'toolResult', type: 'json' },
        { name: 'status', type: 'text' },
        { name: 'executedAt', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(actionLogsCol)

    const sessionsCol = app.findCollectionByNameOrId('sessions')
    if (!sessionsCol.fields.getByName('pendingAction')) {
      sessionsCol.fields.add(new JSONField({ name: 'pendingAction' }))
    }
    app.save(sessionsCol)

    const samplesCol = app.findCollectionByNameOrId('samples')
    if (!samplesCol.fields.getByName('weight')) {
      samplesCol.fields.add(new NumberField({ name: 'weight' }))
    }
    app.save(samplesCol)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('action_logs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('user_agents'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('agents'))
    } catch (_) {}
  },
)
