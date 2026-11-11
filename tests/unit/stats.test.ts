import { describe, expect, it } from 'vitest'
import { averageScore, countTotalDefects } from '@/lib/stats'

const cat = (count: number) => ({ type: 't', count, percent: '', severity: 'Baixa' })

describe('dashboard aggregations', () => {
  it('sums occurrences across categories (regression: used to count categories)', () => {
    const samples = [{ defects: [cat(3), cat(2)] }, { defects: [cat(10)] }, { defects: [] }]
    expect(countTotalDefects(samples)).toBe(15)
  })
  it('tolerates missing or malformed defects', () => {
    // @ts-expect-error runtime-robustness check
    expect(countTotalDefects([{ defects: null }, { defects: [{ count: NaN }] }])).toBe(0)
  })
  it('averages only finished analyses', () => {
    const s = [
      { grade: 'A', score: 90, status: 'completed' },
      { grade: 'B', score: 70, status: 'completed' },
      { grade: 'Erro', score: 0, status: 'error' },
      { grade: '', score: 0, status: 'pending' },
    ] as const
    expect(averageScore([...s])).toBe(80)
    expect(averageScore([])).toBe(0)
  })
})
