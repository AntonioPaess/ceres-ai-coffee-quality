import { describe, expect, it } from 'vitest'
import { rules } from '../helpers/load'

const det = (cls: string, n: number, confidence = 0.9) =>
  Array.from({ length: n }, (_, i) => ({ class: cls, x: 10 + i, y: 10, width: 5, height: 5, confidence }))
const rf = (predictions: unknown[], w = 640, h = 480) => ({ image: { width: w, height: h }, predictions })
const MARKET_KG = 1650 / 60 // 27.5 R$/kg

describe('unit conversion (saca of 60 kg)', () => {
  it('converts R$/saca to R$/kg and back', () => {
    expect(rules.perSacaToPerKg(1650)).toBeCloseTo(27.5)
    expect(rules.perKgToPerSaca(27.5)).toBeCloseTo(1650)
    expect(rules.perSacaToPerKg('abc')).toBeNaN()
  })
  it('resolves market reference from cache, else fallback', () => {
    expect(rules.resolveMarketReference(1800, 'CEPEA', 1650)).toEqual({ perKg: 30, source: 'CEPEA' })
    expect(rules.resolveMarketReference(null, '', 1200)).toEqual({ perKg: 20, source: 'fallback' })
    expect(rules.resolveMarketReference(0, '', NaN).perKg).toBeCloseTo(27.5)
    expect(rules.resolveMarketReference(-5, 'x', 600).source).toBe('fallback')
  })
})

describe('grade boundaries (equivalent defects)', () => {
  it.each([
    [0, 'A', 100],
    [4, 'A', 80],
    [5, 'B', 78],
    [12, 'B', 60],
    [13, 'C', 59],
    [26, 'C', 40],
    [27, 'D', 40],
    [160, 'D', 0],
    [10000, 'D', 0],
  ])('%d black beans -> grade %s, score %d', (n, grade, score) => {
    const r = rules.analyze(rf(det('black', n)), MARKET_KG)
    expect(r.status).toBe('completed')
    expect(r.grade).toBe(grade)
    expect(r.score).toBe(score)
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })
})

describe('defect equivalence', () => {
  it('applies COB-inspired ratios per class', () => {
    const preds = [...det('sour', 2), ...det('broken', 3), ...det('green', 5), ...det('foreign', 1)]
    const r = rules.analyze(rf(preds), MARKET_KG)
    expect(r.defects.totalDefects).toBe(11)
    expect(r.defects.totalEquivalents).toBe(4) // 1 + 1 + 1 + 1
    expect(r.grade).toBe('A')
  })
  it('single defect', () => {
    const r = rules.analyze(rf(det('infested', 1)), MARKET_KG)
    expect(r.defects.totalDefects).toBe(1)
    expect(r.defects.totalEquivalents).toBe(0.2)
    expect(r.score).toBe(99)
  })
  it('unknown classes are reported, not scored', () => {
    const r = rules.analyze(rf([...det('alien_bean', 3), ...det('black', 1)]), MARKET_KG)
    expect(r.defects.totalDefects).toBe(1)
    expect(r.defects.totalDetected).toBe(4)
    expect(r.defects.unknownClasses).toEqual(['alien_bean'])
    expect(r.defects.warnings).toContain('unknown_classes')
  })
})

describe('pricing', () => {
  it.each([
    ['A', 38.5],
    ['B', 31.625],
    ['C', 27.5],
    ['D', 20.625],
  ])('grade %s -> R$ %d/kg', (g, p) => {
    expect(rules.priceFromGrade(MARKET_KG, g)).toBeCloseTo(p)
  })
  it('unknown grade gets no multiplier', () => {
    expect(rules.priceFromGrade(10, 'Z')).toBe(10)
  })
  it('invalid market value yields 0 price instead of NaN', () => {
    expect(rules.analyze(rf([]), NaN).price).toBe(0)
  })
})

describe('inconclusive / degraded inputs', () => {
  it('no detections completes but is flagged (not proof of quality)', () => {
    const r = rules.analyze(rf([]), MARKET_KG)
    expect(r.grade).toBe('A')
    expect(r.defects.warnings).toContain('no_detections')
  })
  it.each([null, undefined, 'html error page', 42, [], {}])('invalid payload %j is inconclusive', (p) => {
    const r = rules.analyze(p, MARKET_KG)
    expect(r.status).toBe('inconclusive')
    expect(r.grade).toBe('Erro')
    expect(r.price).toBe(0)
  })
  it('workflow-style outputs are supported', () => {
    const r = rules.analyze({ outputs: [{ predictions: { predictions: det('black', 2) } }] }, MARKET_KG)
    expect(r.defects.totalDefects).toBe(2)
    expect(r.defects.warnings).toContain('missing_image_dimensions')
  })
  it('ignores malformed prediction entries', () => {
    const r = rules.analyze(rf([null, 'x', ...det('black', 1)]), MARKET_KG)
    expect(r.defects.totalDetected).toBe(1)
  })
  it('flags low-confidence detections', () => {
    expect(rules.analyze(rf(det('black', 1, 0.2)), MARKET_KG).defects.warnings).toContain(
      'low_confidence_detections',
    )
  })
})

describe('redactSecrets', () => {
  it('removes api keys, file tokens and bot tokens', () => {
    const s = rules.redactSecrets(
      'GET https://detect.roboflow.com/m/1?api_key=SECRET123&image=x?token=abc.def https://api.telegram.org/bot123456:AA-bb_cc/getFile',
    )
    expect(s).not.toMatch(/SECRET123|abc\.def|AA-bb_cc/)
    expect(s).toContain('[REDACTED]')
  })
})
