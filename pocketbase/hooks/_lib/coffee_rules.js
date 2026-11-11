/**
 * Ceres AI — single source of truth for the coffee analysis business rules.
 *
 * Pure functions only (no $app / $http / $os), so they are unit-testable in Node
 * (see tests/unit) and `require()`-able from PocketBase hooks.
 *
 * EXPERIMENTAL: these rules are a prototype heuristic inspired by the Brazilian COB
 * "defeitos equivalentes" scheme (MAPA IN 8/2003). They are NOT an official classification,
 * certification or validated commercial appraisal.
 *
 * NOTE: the formulas below reproduce, unchanged, what pocketbase/hooks/analyze_coffee.js
 * executed before this refactor. See docs/AI_INTEGRATIONS.md ("Before / after").
 */

var SACA_KG = 60

var CLASS_LABELS = {
  black: 'Grão Preto',
  full_black: 'Grão Preto',
  sour: 'Grão Ardido',
  full_sour: 'Grão Ardido',
  green: 'Grão Imaturo/Verde',
  immature: 'Grão Imaturo/Verde',
  broken: 'Grão Quebrado',
  infested: 'Infestação/Broca',
  severe_insect: 'Infestação/Broca',
  husk: 'Casca / Palha',
  fraghusk: 'Fragmento de Casca',
  fungus: 'Fungo/Mancha',
  foreign: 'Matéria Estranha',
}

// N physical defects of the class = 1 equivalent defect.
var DEFECT_RATIOS = {
  black: 1,
  full_black: 1,
  sour: 2,
  full_sour: 2,
  foreign: 1,
  fungus: 1,
  infested: 5,
  severe_insect: 5,
  immature: 5,
  green: 5,
  broken: 3,
  husk: 1,
  fraghusk: 3,
}

// Upper bounds (inclusive) of equivalent defects per grade.
var GRADE_LIMITS = { A: 4, B: 12, C: 26 }

// Price multiplier applied to the market reference ("original project proposal").
var GRADE_MULTIPLIER = { A: 0.4, B: 0.15, C: 0.0, D: -0.25 }

var DEFAULT_FALLBACK_PRICE_PER_SACA = 1650.0

// Confidence below which a detection is flagged (warning only; does not change the grade).
// Arbitrary, non-validated value — Roboflow's own request threshold is the effective filter.
var LOW_CONFIDENCE_THRESHOLD = 0.5

function toNumber(v) {
  var n = typeof v === 'number' ? v : parseFloat(v)
  return isFinite(n) ? n : NaN
}

function perSacaToPerKg(perSaca) {
  var n = toNumber(perSaca)
  return isFinite(n) ? n / SACA_KG : NaN
}

function perKgToPerSaca(perKg) {
  var n = toNumber(perKg)
  return isFinite(n) ? n * SACA_KG : NaN
}

/**
 * Extracts image dimensions and predictions from a Roboflow response.
 * Returns { ok, reason, predictions, width, height }.
 * ok=false means the payload is not a usable inference response (invalid / empty).
 */
function parseRoboflowResponse(data) {
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'invalid_response', predictions: [], width: 0, height: 0 }
  }
  var width = 0
  var height = 0
  if (data.image && typeof data.image === 'object') {
    width = parseInt(data.image.width, 10) || 0
    height = parseInt(data.image.height, 10) || 0
  }
  var predictions = null
  if (Array.isArray(data.predictions)) {
    predictions = data.predictions
  } else if (Array.isArray(data.outputs) && data.outputs.length > 0) {
    var out = data.outputs[0] || {}
    if (Array.isArray(out.predictions)) predictions = out.predictions
    else if (out.predictions && Array.isArray(out.predictions.predictions))
      predictions = out.predictions.predictions
  }
  if (predictions === null) {
    return {
      ok: false,
      reason: 'missing_predictions',
      predictions: [],
      width: width,
      height: height,
    }
  }
  // Drop non-object entries instead of crashing on them.
  var clean = []
  for (var i = 0; i < predictions.length; i++) {
    if (predictions[i] && typeof predictions[i] === 'object') clean.push(predictions[i])
  }
  return { ok: true, reason: '', predictions: clean, width: width, height: height }
}

/** Counts detections per known class; unknown classes are reported, not scored. */
function countDefects(predictions) {
  var keys = Object.keys(CLASS_LABELS)
  var counts = {}
  for (var i = 0; i < keys.length; i++) counts[keys[i]] = 0
  var unknown = []
  for (var j = 0; j < predictions.length; j++) {
    var cls = predictions[j].class
    if (Object.prototype.hasOwnProperty.call(counts, cls)) counts[cls]++
    else if (unknown.indexOf(String(cls)) < 0) unknown.push(String(cls))
  }
  var categories = []
  var totalDefects = 0
  for (var k = 0; k < keys.length; k++) {
    var c = counts[keys[k]]
    totalDefects += c
    categories.push({ class: keys[k], label: CLASS_LABELS[keys[k]], count: c })
  }
  return {
    counts: counts,
    categories: categories,
    totalDefects: totalDefects,
    unknownClasses: unknown,
  }
}

function equivalentDefects(counts) {
  var total = 0
  var keys = Object.keys(CLASS_LABELS)
  for (var i = 0; i < keys.length; i++) {
    total += (counts[keys[i]] || 0) / (DEFECT_RATIOS[keys[i]] || 1)
  }
  return total
}

function gradeFromEquivalents(eq) {
  if (eq <= GRADE_LIMITS.A) return 'A'
  if (eq <= GRADE_LIMITS.B) return 'B'
  if (eq <= GRADE_LIMITS.C) return 'C'
  return 'D'
}

// Continuous 0-100 score inside each grade band: A 100→80 | B 80→60 | C 60→40 | D 40→0.
function scoreFromEquivalents(eq) {
  var s
  if (eq <= 4) s = Math.round(100 - (eq / 4) * 20)
  else if (eq <= 12) s = Math.round(80 - ((eq - 4) / 8) * 20)
  else if (eq <= 26) s = Math.round(60 - ((eq - 12) / 14) * 20)
  else s = Math.max(0, Math.round(40 - ((eq - 26) / 134) * 40))
  return Math.max(0, Math.min(100, s))
}

/** Price per kg = market reference per kg × (1 + grade multiplier). */
function priceFromGrade(marketPerKg, grade) {
  var m = Object.prototype.hasOwnProperty.call(GRADE_MULTIPLIER, grade)
    ? GRADE_MULTIPLIER[grade]
    : 0
  return marketPerKg * (1 + m)
}

/**
 * Resolves the market reference in R$/kg.
 * cachedPerSaca: cached quotation in R$/saca (60 kg) or null; fallbackPerSaca likewise.
 */
function resolveMarketReference(cachedPerSaca, cachedSource, fallbackPerSaca) {
  var c = toNumber(cachedPerSaca)
  if (isFinite(c) && c > 0) return { perKg: c / SACA_KG, source: cachedSource || 'cache' }
  var f = toNumber(fallbackPerSaca)
  if (!isFinite(f) || f <= 0) f = DEFAULT_FALLBACK_PRICE_PER_SACA
  return { perKg: f / SACA_KG, source: 'fallback' }
}

/**
 * Full deterministic analysis. Never throws.
 * status: 'completed' | 'inconclusive' (unusable inference payload) — the caller maps
 * transport/API failures to status 'error' separately.
 */
function analyze(rfData, marketPerKg) {
  var parsed = parseRoboflowResponse(rfData)
  if (!parsed.ok) {
    return {
      status: 'inconclusive',
      reason: parsed.reason,
      score: 0,
      grade: 'Erro',
      price: 0,
      width: parsed.width,
      height: parsed.height,
      defects: { error: true, inconclusive: true, reason: parsed.reason },
    }
  }
  var counted = countDefects(parsed.predictions)
  var eq = equivalentDefects(counted.counts)
  var grade = gradeFromEquivalents(eq)
  var warnings = []
  if (parsed.predictions.length === 0) warnings.push('no_detections')
  if (!parsed.width || !parsed.height) warnings.push('missing_image_dimensions')
  if (counted.unknownClasses.length) warnings.push('unknown_classes')
  for (var i = 0; i < parsed.predictions.length; i++) {
    var conf = toNumber(parsed.predictions[i].confidence)
    if (isFinite(conf) && conf < LOW_CONFIDENCE_THRESHOLD) {
      warnings.push('low_confidence_detections')
      break
    }
  }
  var mk = toNumber(marketPerKg)
  if (!isFinite(mk) || mk < 0) mk = 0
  return {
    status: 'completed',
    reason: '',
    score: scoreFromEquivalents(eq),
    grade: grade,
    price: priceFromGrade(mk, grade),
    width: parsed.width,
    height: parsed.height,
    defects: {
      categories: counted.categories,
      predictions: parsed.predictions,
      totalDefects: counted.totalDefects,
      totalDetected: parsed.predictions.length,
      totalEquivalents: Math.round(eq * 100) / 100,
      unknownClasses: counted.unknownClasses,
      warnings: warnings,
      experimental: true,
    },
  }
}

/** Removes secrets (api keys, file tokens) from text before logging / persisting it. */
function redactSecrets(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/(api_key=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/(token=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/(bot)\d+:[A-Za-z0-9_-]+/g, '$1[REDACTED]')
}

module.exports = {
  SACA_KG: SACA_KG,
  CLASS_LABELS: CLASS_LABELS,
  DEFECT_RATIOS: DEFECT_RATIOS,
  GRADE_LIMITS: GRADE_LIMITS,
  GRADE_MULTIPLIER: GRADE_MULTIPLIER,
  DEFAULT_FALLBACK_PRICE_PER_SACA: DEFAULT_FALLBACK_PRICE_PER_SACA,
  LOW_CONFIDENCE_THRESHOLD: LOW_CONFIDENCE_THRESHOLD,
  perSacaToPerKg: perSacaToPerKg,
  perKgToPerSaca: perKgToPerSaca,
  parseRoboflowResponse: parseRoboflowResponse,
  countDefects: countDefects,
  equivalentDefects: equivalentDefects,
  gradeFromEquivalents: gradeFromEquivalents,
  scoreFromEquivalents: scoreFromEquivalents,
  priceFromGrade: priceFromGrade,
  resolveMarketReference: resolveMarketReference,
  analyze: analyze,
  redactSecrets: redactSecrets,
}
