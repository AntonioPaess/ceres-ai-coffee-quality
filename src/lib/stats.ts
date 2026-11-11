import type { Sample } from './types'

/** Total number of defect occurrences: the SUM of per-category counts (not the number of categories). */
export function countTotalDefects(samples: Pick<Sample, 'defects'>[]): number {
  return samples.reduce((acc, s) => {
    if (!Array.isArray(s.defects)) return acc
    return acc + s.defects.reduce((a, d) => a + (Number.isFinite(d.count) ? d.count : 0), 0)
  }, 0)
}

/** Average score over samples with a finished analysis (excludes pending/error). */
export function averageScore(samples: Pick<Sample, 'grade' | 'score' | 'status'>[]): number {
  const done = samples.filter((s) => s.grade && s.grade !== 'Erro' && s.status !== 'error')
  if (!done.length) return 0
  return Math.round(done.reduce((acc, s) => acc + (s.score || 0), 0) / done.length)
}
