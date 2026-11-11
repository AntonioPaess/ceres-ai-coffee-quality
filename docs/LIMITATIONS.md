# Limitations

Ceres AI is a **hackathon prototype**. Known limitations, stated plainly:

## Results

* Grades A–D, score and price are **experimental heuristics** inspired by the COB equivalent-defect
  table. They are not an official classification, certification or commercial appraisal and have
  not been validated against human classifiers.
* **No accuracy benchmark exists** for the vision model (no labelled dataset in the project).
* Zero detections yields grade A with a warning; it does not prove a defect-free sample.
* The model sees one photo of the visible side of the beans; hidden defects, moisture, cup quality,
  screen size and odour are out of scope.
* Price: reference × grade multiplier. The multipliers (+40 / +15 / 0 / −25 %) are a project
  assumption, not market data.

## Data sources

* **Market price cache is not refreshed by this code.** No hook writes to `market_price_cache`;
  values come from an external/manual process in the hosted environment, or the static fallback
  (R$ 1 650/saca). The “refresh” endpoint only re-reads the cache and says so.
* Earlier Albert prompts referenced Alpha Vantage; there is no such integration in the export.
* Weather uses Open-Meteo forecasts; geocoding uses Open-Meteo and BigDataCloud; state/city lists use IBGE.

## Platform dependency

* The backend depends on Skip-specific runtime APIs (`$secrets`, `$ai`) and cannot run on a vanilla
  PocketBase without porting (see [LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md)).
* The LLM provider/model behind Skip's `tier: 'fast'` is not visible in the export.
* The Roboflow model (`coffee-bean-defects-nbrvd/1`) is a hosted model; there is no evidence in
  this repository that the team trained it.

## Functional gaps

* Intent detection for Albert's context (market / weather / inventory) is keyword-based.
* The score-drop monitor (`albert_monitor.js`) runs on record *creation*, but samples are created
  with score 0 and scored afterwards, so it effectively never triggers.
* Inference runs synchronously inside the after-create hook (up to 120 s); there is no job queue or
  retry. The UI stops polling after 3 minutes and offers a manual re-check.
* Custom agent creation is disabled (`410`).
* Web chat does not execute actions; only Telegram does (with confirmation).
* No component/E2E tests; Telegram and Roboflow are verified manually only.

## Operations

* Applying the audit migrations and the Telegram secret on the hosted environment is pending
  (owner action). Until then, the live prototype still runs the pre-audit code.
* `telegram_updates` has no retention job yet.
