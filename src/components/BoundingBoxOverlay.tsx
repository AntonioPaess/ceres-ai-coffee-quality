import { cn } from '@/lib/utils'

const DEFECT_LABELS: Record<string, string> = {
  black: 'Grão Preto',
  full_black: 'Grão Preto',
  sour: 'Grão Ardido',
  full_sour: 'Grão Ardido',
  broken: 'Grão Quebrado',
  husk: 'Casca / Palha',
  immature: 'Grão Imaturo/Verde',
  green: 'Grão Imaturo/Verde',
  infested: 'Infestação/Broca',
  severe_insect: 'Infestação/Broca',
  fungus: 'Fungo/Mancha',
  foreign: 'Matéria Estranha',
}

const DEFECT_COLORS: Record<string, string> = {
  black: 'border-red-500 bg-red-500/10',
  full_black: 'border-red-500 bg-red-500/10',
  sour: 'border-orange-500 bg-orange-500/10',
  full_sour: 'border-orange-500 bg-orange-500/10',
  broken: 'border-amber-500 bg-amber-500/10',
  husk: 'border-yellow-600 bg-yellow-500/10',
  immature: 'border-lime-600 bg-lime-500/10',
  green: 'border-lime-600 bg-lime-500/10',
  infested: 'border-red-600 bg-red-600/10',
  severe_insect: 'border-red-600 bg-red-600/10',
  fungus: 'border-purple-500 bg-purple-500/10',
  foreign: 'border-cyan-600 bg-cyan-500/10',
}

export function translateDefectClass(cls: string): string {
  return DEFECT_LABELS[cls] ?? cls
}

export function getDefectColor(cls: string): string {
  return DEFECT_COLORS[cls] ?? 'border-accent bg-accent/10'
}

export interface Prediction {
  class: string
  confidence?: number
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface BoundingBoxOverlayProps {
  predictions: Prediction[]
  imageOriginalWidth: number
  imageOriginalHeight: number
}

export function BoundingBoxOverlay({
  predictions,
  imageOriginalWidth,
  imageOriginalHeight,
}: BoundingBoxOverlayProps) {
  if (!imageOriginalWidth || !imageOriginalHeight) return null

  return (
    <>
      {predictions.map((pred, idx) => {
        if (pred.x == null || pred.y == null || pred.width == null || pred.height == null)
          return null

        const leftPercent = ((pred.x - pred.width / 2) / imageOriginalWidth) * 100
        const topPercent = ((pred.y - pred.height / 2) / imageOriginalHeight) * 100
        const widthPercent = (pred.width / imageOriginalWidth) * 100
        const heightPercent = (pred.height / imageOriginalHeight) * 100

        const label = translateDefectClass(pred.class)
        const confidence = pred.confidence != null ? Math.round(pred.confidence * 100) : null
        const labelText = confidence != null ? `${label} ${confidence}%` : label
        const colorClass = getDefectColor(pred.class)

        return (
          <div
            key={idx}
            className={cn('absolute border-2 rounded pointer-events-none', colorClass)}
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              width: `${widthPercent}%`,
              height: `${heightPercent}%`,
            }}
          >
            <span className="absolute -top-5 left-0 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
              {labelText}
            </span>
          </div>
        )
      })}
    </>
  )
}
