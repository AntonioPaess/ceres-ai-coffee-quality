routerAdd(
  'POST',
  '/backend/v1/agents/custom',
  (e) => {
    return e.json(410, { error: 'Criação de agentes personalizados foi desativada.' })
  },
  $apis.requireAuth(),
)
