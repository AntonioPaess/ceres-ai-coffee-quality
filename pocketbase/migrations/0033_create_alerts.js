migrate(
  (app) => {
    // This migration was redundant — alerts collection already exists from 0003.
    // Fixed to be a safe no-op so it applies cleanly.
    try {
      app.findCollectionByNameOrId('alerts')
    } catch (_) {}
  },
  (app) => {},
)
