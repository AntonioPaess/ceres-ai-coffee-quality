# AI integrations

Ceres AI combines **two different kinds of AI** with **deterministic code** in between:

| Concern | Who does it | Where |
| --- | --- | --- |
| Detect defective beans in a photo | Computer vision (Roboflow hosted model) | `pocketbase/hooks/analyze_coffee.js` |
| Turn detections into score, grade and price | **Deterministic, unit-tested code** | `pocketbase/hooks/_lib/coffee_rules.js` |
| Explain results, answer questions, propose actions | LLM agents (Skip `$ai`) | `albert_chat.js`, `telegram_webhook.js`, `agents_run.js` |
| Decide whether a proposed action may run | **Deterministic validation + user confirmation** | `pocketbase/hooks/_lib/action_validation.js` |

Design principle: **the LLM explains numbers, it never produces them.** Anything that changes
data or produces a number shown to the user goes through code that can be tested.

---

## 1. Computer vision (Roboflow)

| Item | Value (from code) |
| --- | --- |
| Endpoint | `https://detect.roboflow.com/coffee-bean-defects-nbrvd/1` (Roboflow Hosted Inference, object detection) |
| Project / version | `coffee-bean-defects-nbrvd`, version `1` |
| Ownership | **Unverified.** No training code, dataset or notebook exists in this repository, so there is no evidence that the team trained this model. Treat it as a third-party/hosted model used by the prototype. |
| Request | `GET ?api_key=…&image=<URL of the uploaded file>`; the backend first obtains a short-lived PocketBase *file token* (via `PB_SUPERUSER_TOKEN`) so Roboflow can fetch the protected image. |
| Confidence threshold | Not set by the code → Roboflow's server default applies. |
| Response used | `image.width/height`, `predictions[]` (`x`, `y`, `width`, `height` — center-based, in original pixels — `confidence`, `class`). Workflow-style `outputs[0].predictions` is also accepted. |
| Classes recognised | `black`, `full_black`, `sour`, `full_sour`, `green`, `immature`, `broken`, `infested`, `severe_insect`, `husk`, `fraghusk`, `fungus`, `foreign`. Any other class is reported in `defects.unknownClasses` and **not scored**. |
| Bounding boxes | Drawn in the UI by `src/components/BoundingBoxOverlay.tsx`, scaled from `imageOriginalWidth/Height`. |

### Distinguishing outcomes

| Situation | Persisted result |
| --- | --- |
| Valid response with detections | `status = completed`, score/grade/price, `defects.warnings` may contain `low_confidence_detections`, `unknown_classes`, `missing_image_dimensions`. |
| Valid response, **zero detections** | `status = completed`, grade A, **plus warning `no_detections`**. The UI states that this does *not* prove quality (bad photo, out-of-domain image, model miss). |
| Empty / non-JSON / malformed payload | `status = error`, `grade = Erro`, `defects.inconclusive = true` with a reason. |
| HTTP error (4xx/5xx), timeout, network failure | `status = error`, HTTP status recorded, **secrets redacted** from the stored message. |
| Missing `ROBOFLOW_API_KEY` / `PB_INSTANCE_URL` | `status = error`, no external call made. |

### Privacy of uploaded photos

* Images are stored in PocketBase (owner-only rules). To run inference, Roboflow downloads the
  image through a URL that carries a **short-lived file token**. The image therefore leaves the
  backend and is processed by Roboflow under Roboflow's terms.
* The Roboflow API key travels in the query string (Roboflow's documented style for this
  endpoint). The audit added `redactSecrets()` so keys and file tokens are **never persisted in
  error messages or logs** written by the hook.
* **Proposed hardening (not enabled):** send the image as a base64 body (`POST`) instead of a
  URL, which removes the need for the superuser-minted file token and for exposing an image URL.
  It was not switched on because the PocketBase JSVM file-reading path could not be verified
  against the hosted Skip runtime from this environment.

### Accuracy / evaluation

**There is no benchmark.** The repository contains no labelled dataset, so this project does
**not** report precision, recall, F1 or mAP, and the automated tests (which use mocked
responses) say nothing about real-world detection quality.

Reproducible procedure to evaluate in the future:

1. Collect photos under a fixed protocol (background, lighting, distance, number of beans) with
   explicit permission to use them.
2. Have at least two people label each defect class (Roboflow Annotate or CVAT, COCO format);
   measure inter-annotator agreement.
3. Hold out a test split never used for training/threshold tuning.
4. Run the deployed model version (`/1`) on the split; compute per-class precision/recall and
   mAP@0.5 (e.g. `supervision` or `pycocotools`), sweeping the confidence threshold.
5. Evaluate the **end-to-end** rule: compare the predicted grade (A–D) with the grade assigned by
   a qualified classifier on the same samples (confusion matrix), because a small detection error
   can move a sample across a grade boundary.
6. Publish dataset card, model version, threshold and results together.

---

## 2. Deterministic business rules (single source of truth)

All rules live in [`pocketbase/hooks/_lib/coffee_rules.js`](../pocketbase/hooks/_lib/coffee_rules.js)
and are covered by `tests/unit/coffee_rules.test.ts` and `tests/hooks/analyze_coffee.test.ts`.

> **Experimental.** The scheme is *inspired by* the Brazilian COB “defeitos equivalentes” table
> (MAPA IN 8/2003). It is a prototype heuristic: not an official classification, not a
> certification, not a validated commercial appraisal. The A–D labels are the project's own.

1. **Equivalent defects** — for each class, `count / ratio`:

   | Class | Physical defects per 1 equivalent |
   | --- | --- |
   | black, full_black, foreign, fungus, husk | 1 |
   | sour, full_sour | 2 |
   | broken, fraghusk | 3 |
   | green, immature, infested, severe_insect | 5 |

2. **Grade** — by total equivalents `E`: **A** `E ≤ 4` · **B** `4 < E ≤ 12` · **C** `12 < E ≤ 26` · **D** `E > 26`.
3. **Score (0–100)** — continuous inside each band: A 100→80, B 80→60, C 60→40, D 40→0 (reaching 0 at `E = 160`), rounded and clamped.
4. **Market reference** — last `market_price_cache.rawValue` in **R$/saca (60 kg)** ÷ 60 → R$/kg.
   If the cache is empty or invalid, `COFFEE_FALLBACK_PRICE` (R$/saca, default **1650**) is used and
   the source is logged as `fallback`.
5. **Suggested price (R$/kg)** = reference × (1 + multiplier): **A +40 %**, **B +15 %**, **C 0 %**, **D −25 %**.

### Before / after the audit

The executed formula was **kept exactly**; what changed is that it is now centralised, tested and
described consistently to the LLM.

| Aspect | Before | After |
| --- | --- | --- |
| Scoring/grading code | Inline in `analyze_coffee.js` | Same formulas, moved to `_lib/coffee_rules.js`; hook calls it. |
| Albert's prompt (`0036`, `0039`, `0040`) | Described a **different** system: “base 92, −2 per defect, min 50, max 95” and multipliers “A +10 %, B 0 %, C −10 %, D −30 %”, priced from “Alpha Vantage”. | Migration `0043` replaces those lines: the backend computes everything; the real multipliers are stated; results flagged experimental; the agent must not recalculate. |
| Price source claim | Prompt claimed Alpha Vantage. | No Alpha Vantage integration exists in the export; documentation says the cache is filled externally. |
| Unknown classes | Logged, ignored. | Same scoring; now also exposed as `unknownClasses` + warning. |
| Zero detections | Silently grade A. | Still grade A (formula unchanged), **plus `no_detections` warning shown in the UI**. |
| Invalid payload | Could produce grade A with 0 detections. | `inconclusive` → `status = error`. |
| Dashboard “total defects” | Counted *categories*. | Sums *occurrences* (`src/lib/stats.ts`). |

Units: the `/market-price` and `/market-price/refresh` endpoints return `rawValue` **in R$/kg**
(despite the name). Migrations `0037` and `0041` show the team tried converting the stored value
to per-kg and then reverted; the stored unit is R$/saca.

---

## 3. LLM agents (Skip `$ai`)

| Agent | Defined in | Used by | Purpose |
| --- | --- | --- | --- |
| `albert` | migrations `0004`→`0043` (`$ai.agents.define`) | `albert_chat.js`, `telegram_webhook.js`, `albert_messages.js` | Conversational assistant: explains analyses, answers inventory / market / weather questions, proposes actions. |
| Persona agents (`market`, `executive`, `evolution`, `alerts`, `educator`, `consultant`) | `0013`, `0015` | `agents_run.js` (hourly cron, `$ai.chat` with `model: 'fast'`) | Proactive messages to Telegram based on the user's samples and weather. Max 3 active per user. |
| `albert-assistant` | migration `0004` | `albert_monitor.js` | Alert when a new sample scores below the previous one. In current flows samples are created with score 0 and scored later by an update, so this create-hook effectively never fires (see limitations). |

**Provider/model:** agents use Skip's `tier: 'fast'`. The concrete provider (e.g. Gemini, OpenAI,
Anthropic) is chosen by Skip's hosted configuration and is **not recorded in this export**, so the
docs do not name one.

### How agents access data

Agents have **no direct database access**. The backend loads data *for the authenticated user
only* (filter `user_id = <auth id>`), serialises it into a context block (inventory, market cache,
Open-Meteo forecast) and sends it with the user's message. Conversation history is stored by Skip,
scoped by `user_id`.

### Guardrails (defence in depth)

Prompt instructions alone are not trusted. Deterministic controls added/verified in this audit:

* **Action whitelist & schema** — only `update`, `delete`, `delete_all`, `activate_agent`,
  `deactivate_agent`; malformed JSON or unknown types are rejected.
* **Field whitelist** — chat edits may change only `name`, `variety`, `weight`, `price`, with type
  and range checks. `score`, `grade`, `defects`, `status`, `user_id`, `image` can never be modified
  through the agent (previously any key returned by the model was written — mass assignment).
* **Ownership** — targets are resolved only among the caller's samples and re-checked before
  execution; `delete_all` filters by the caller's id.
* **Human confirmation** — destructive and update actions require an explicit *sim*, expire after
  10 minutes, and any other reply cancels.
* **Audit trail** — executions and rejections go to `action_logs` (server-only writes).
* **No code execution** — the model output is parsed only as JSON data; nothing is evaluated.
* **Prompt-injection posture** — the prompt (`0043`) tells Albert to treat sample names and
  messages as data. This is a mitigation, not a guarantee; the controls above are what enforce safety.
* **Web chat** strips action markers and never executes them.
