migrate(
  (app) => {
    // This migration was redundant — samples collection already exists from 0002.
    // Fixed to be a safe no-op so it applies cleanly.
    try {
      app.findCollectionByNameOrId('samples')
    } catch (_) {}
  },
  (app) => {},
)
