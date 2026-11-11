// SECURITY HARDENING (audit): closes owner-spoofing and result-tampering gaps.
//
// Before: samples.createRule only required authentication, so an authenticated client could
//   POST user_id=<victim>; updateRule let owners rewrite user_id, score, grade, defects, status;
//   action_logs/agents/user_agents could be created freely by any authenticated client.
// After: ownership is enforced on create; server-computed fields cannot be written by clients.
// Hooks use $app.save() which bypasses API rules, so server-side analysis is unaffected.
migrate(
  (app) => {
    const owner = "@request.auth.id != '' && user_id = @request.auth.id"
    const serverFields = [
      'score',
      'grade',
      'defects',
      'status',
      'imageOriginalWidth',
      'imageOriginalHeight',
    ]
    const locked = serverFields.map((f) => `@request.body.${f}:isset = false`).join(' && ')

    const samples = app.findCollectionByNameOrId('samples')
    samples.listRule = owner
    samples.viewRule = owner
    samples.createRule = `@request.auth.id != '' && @request.body.user_id = @request.auth.id && ${locked}`
    samples.updateRule = `${owner} && @request.body.user_id:isset = false && ${locked}`
    samples.deleteRule = owner
    app.save(samples)

    const alerts = app.findCollectionByNameOrId('alerts')
    alerts.createRule = null
    // owners may only toggle read state
    alerts.updateRule = `${owner} && @request.body.user_id:isset = false && @request.body.message:isset = false`
    app.save(alerts)

    const userAgents = app.findCollectionByNameOrId('user_agents')
    userAgents.createRule = "@request.auth.id != '' && @request.body.user_id = @request.auth.id"
    userAgents.updateRule = `${owner} && @request.body.user_id:isset = false`
    app.save(userAgents)

    // Audit log and agent catalogue are written by server hooks only.
    const logs = app.findCollectionByNameOrId('action_logs')
    logs.createRule = null
    app.save(logs)

    const agents = app.findCollectionByNameOrId('agents')
    agents.createRule = null
    app.save(agents)
  },
  (app) => {
    // Intentionally not restoring the permissive rules.
  },
)
