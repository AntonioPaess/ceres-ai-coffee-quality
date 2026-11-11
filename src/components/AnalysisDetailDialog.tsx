import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import {
  BoundingBoxOverlay,
  translateDefectClass,
  getDefectColor,
  type Prediction,
} from '@/components/BoundingBoxOverlay'
import { cn } from '@/lib/utils'

const GLOSSARY: Record<string, string> = {
  'Grão Preto':
    'Grãos que sofreram fermentação excessiva, totalmente escuros. Defeito grave que impacta fortemente o sabor.',
  'Grão Ardido':
    'Grãos parcialmente fermentados com manchas escuras. Afetam a doçura e a limpeça da bebida.',
  'Grão Quebrado':
    'Grãos fragmentados ou cortados durante o beneficiamento. Podem gerar sabores indesejados na torra.',
  'Casca / Palha':
    'Resíduos de casca ou palha misturados aos grãos. Não afetam o sabor diretamente, mas indicam beneficiamento inadequado.',
  'Grão Imaturo/Verde':
    'Grãos colhidos antes da maturação completa. Produzem bebida adstringente e áspera.',
  'Infestação/Broca':
    'Grãos atacados pelo broca-do-café ( Hypothenemus hampei ). Defeito severo que compromete a qualidade.',
  'Fungo/Mancha':
    'Grãos com manchas causadas por fungos ou doenças. Podem gerar defeitos na xícara e risco à saúde.',
  'Matéria Estranha':
    'Materiais que não são café: gravetos, pedras, paus, metais ou outros corpos estranhos misturados à amostra.',
}

const DEFECT_ORDER = [
  'Grão Preto',
  'Grão Ardido',
  'Grão Quebrado',
  'Casca / Palha',
  'Grão Imaturo/Verde',
  'Infestação/Broca',
  'Fungo/Mancha',
  'Matéria Estranha',
]

interface AnalysisDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  sampleName: string
  predictions: Prediction[]
  imageOriginalWidth: number
  imageOriginalHeight: number
}

export function AnalysisDetailDialog({
  open,
  onOpenChange,
  imageUrl,
  sampleName,
  predictions,
  imageOriginalWidth,
  imageOriginalHeight,
}: AnalysisDetailDialogProps) {
  const hasDimensions = imageOriginalWidth > 0 && imageOriginalHeight > 0
  const hasPredictions = predictions.length > 0

  const groupedDefects = useMemo(() => {
    const map = new Map<string, number>()
    for (const pred of predictions) {
      const label = translateDefectClass(pred.class)
      map.set(label, (map.get(label) ?? 0) + 1)
    }
    return DEFECT_ORDER.filter((label) => map.has(label)).map((label) => ({
      label,
      count: map.get(label)!,
    }))
  }, [predictions])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display font-bold text-hig-title3 text-primary">
            Análise Detalhada — {sampleName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-0">
          <div className="flex-1 p-4 lg:p-6">
            <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-hig-2">
              <img
                src={imageUrl}
                alt={sampleName}
                className="w-full h-auto object-contain max-h-[60vh] lg:max-h-[65vh]"
              />
              {hasDimensions && hasPredictions && (
                <BoundingBoxOverlay
                  predictions={predictions}
                  imageOriginalWidth={imageOriginalWidth}
                  imageOriginalHeight={imageOriginalHeight}
                />
              )}
            </div>

            {!hasDimensions && (
              <div className="mt-4 bg-amber-50 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-hig-footnote text-amber-800">
                  Esta amostra não possui dados de dimensão original da imagem. As marcações de
                  defeitos não podem ser exibidas.
                </p>
              </div>
            )}

            {hasDimensions && !hasPredictions && (
              <div className="mt-4 bg-accent/10 rounded-xl p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-hig-subhead font-semibold text-foreground">
                    Nenhum defeito visual identificado nesta amostra
                  </p>
                  <p className="text-hig-footnote text-muted-foreground mt-0.5">
                    A IA não detectou defeitos visuais com nível de confiança suficiente.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-80 lg:border-l border-border bg-muted/30 p-4 lg:p-6 space-y-5">
            {hasPredictions && hasDimensions && (
              <div>
                <h4 className="font-display font-bold text-hig-headline text-primary mb-3">
                  Defeitos Detectados
                </h4>
                <div className="space-y-2">
                  {groupedDefects.map(({ label, count }) => {
                    const rawKey = Object.entries(predictions).find(
                      ([, p]) => translateDefectClass((p as Prediction).class) === label,
                    )
                    const pred = rawKey ? predictions[parseInt(rawKey[0])] : null
                    const colorClass = pred ? getDefectColor(pred.class) : ''
                    return (
                      <div
                        key={label}
                        className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 shadow-hig-1"
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded border-2 flex-shrink-0',
                            colorClass.split(' ')[0] || 'border-accent',
                          )}
                        />
                        <span className="text-hig-footnote font-semibold text-foreground flex-1">
                          {label}
                        </span>
                        <span className="text-hig-caption text-muted-foreground font-medium">
                          {count}x
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <h4 className="font-display font-bold text-hig-headline text-primary">
                  O que são as porcentagens?
                </h4>
              </div>
              <p className="text-hig-footnote text-muted-foreground leading-relaxed">
                A porcentagem exibida ao lado de cada defeito representa o{' '}
                <strong>nível de certeza</strong> da IA para aquela detecção específica. Quanto
                maior o valor, maior a confiança do modelo de que a classificação está correta.
                É uma estimativa do próprio modelo, não uma garantia de acerto: confira as marcações
                visualmente.
              </p>
            </div>

            <div>
              <h4 className="font-display font-bold text-hig-headline text-primary mb-3">
                Glossário de Defeitos
              </h4>
              <div className="space-y-2.5">
                {DEFECT_ORDER.map((label) => (
                  <div key={label} className="bg-white rounded-xl p-3 shadow-hig-1">
                    <p className="text-hig-footnote font-semibold text-foreground mb-0.5">
                      {label}
                    </p>
                    <p className="text-hig-caption text-muted-foreground leading-snug">
                      {GLOSSARY[label]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
