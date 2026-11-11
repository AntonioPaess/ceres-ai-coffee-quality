/**
 * Domain types derived from the PocketBase schema (pocketbase/migrations, src/lib/pocketbase/schema.json)
 * and from the JSON written by pocketbase/hooks/analyze_coffee.js.
 */

export type Grade = 'A' | 'B' | 'C' | 'D' | 'Erro'
export type SampleStatus = 'pending' | 'completed' | 'error' | null

/** One Roboflow detection (center-based bounding box in original image pixels). */
export interface Prediction {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  class: string
}

export interface RawDefectCategory {
  class: string
  label: string
  count: number
}

/** Shape of `samples.defects` as persisted by the backend. */
export interface RawDefects {
  categories?: RawDefectCategory[]
  predictions?: Prediction[]
  totalDefects?: number
  totalDetected?: number
  totalEquivalents?: number
  unknownClasses?: string[]
  warnings?: string[]
  experimental?: boolean
  error?: boolean
  inconclusive?: boolean
  reason?: string
}

export type Severity = 'Alta' | 'Média' | 'Baixa'

/** UI row: one defect category with its occurrence count. */
export interface DefectCategory {
  type: string
  count: number
  percent: string
  severity: Severity | string
}

export type DefectsData = DefectCategory[]

export interface Sample {
  id: string
  user_id: string
  name: string
  variety?: string
  weight?: number
  score: number
  grade: Grade | '' | null
  price: number
  status: SampleStatus
  image: string
  created: string
  imageOriginalWidth?: number
  imageOriginalHeight?: number
  defects: DefectCategory[]
  rawDefects?: RawDefects | DefectCategory[] | null
}

export interface Alert {
  id: string
  user_id: string
  message: string
  isRead: boolean
  created: string
}
