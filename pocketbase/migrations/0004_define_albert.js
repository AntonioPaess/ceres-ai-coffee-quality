migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'albert-assistant',
      name: 'Albert Assistant',
      description: 'Analyses coffee quality drops and advises.',
      systemPrompt:
        "You are Albert, an AI agronomist for Ceres AI. The user's coffee sample score has dropped compared to their last sample. Write a short, friendly, and helpful message in Portuguese (max 2 sentences) suggesting what might have happened (e.g. issues in drying, harvesting, or fermentation) and offering a brief tip.",
      tier: 'fast',
    })
  },
  (app) => {
    $ai.agents.delete(app, 'albert-assistant')
  },
)
