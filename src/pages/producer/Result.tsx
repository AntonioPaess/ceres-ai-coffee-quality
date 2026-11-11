import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ExperimentalNotice } from '@/components/ExperimentalNotice'
import { useAppStore } from '@/stores/app'
import { Button } from '@/components/ui/button'
import { FileText, Plus, AlertTriangle, CheckCircle2, Leaf, Loader2, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translateDefectClass, type Prediction } from '@/components/BoundingBoxOverlay'
import { AnalysisDetailDialog } from '@/components/AnalysisDetailDialog'

const GRADE_CONFIG: Record<
  string,
  {
    label: string
    sublabel: string
    color: string
    bg: string
    ring: string
  }
> = {
  A: {
    label: 'Grade A',
    sublabel: 'Premium',
    color: 'text-accent',
    bg: 'bg-accent',
    ring: 'ring-accent/20',
  },
  B: {
    label: 'Grade B',
    sublabel: 'Bom',
    color: 'text-primary',
    bg: 'bg-primary',
    ring: 'ring-primary/20',
  },
  C: {
    label: 'Grade C',
    sublabel: 'Padrão',
    color: 'text-amber-600',
    bg: 'bg-amber-500',
    ring: 'ring-amber-200',
  },
  D: {
    label: 'Grade D',
    sublabel: 'Defeituoso',
    color: 'text-destructive',
    bg: 'bg-destructive',
    ring: 'ring-destructive/20',
  },
  Erro: {
    label: 'Erro',
    sublabel: 'Falha na análise',
    color: 'text-destructive',
    bg: 'bg-destructive',
    ring: 'ring-destructive/20',
  },
}

function AnalysisError({ defects }: { defects?: any }) {
  const status = defects?.roboflow_status
  const body = defects?.roboflow_body
  return (
    <div className="bg-white rounded-3xl shadow-hig-2 p-5 flex items-start gap-3">
      <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-destructive" />
      </div>
      <div className="flex-1">
        <p className="text-hig-subhead font-semibold text-foreground">Falha na análise</p>
        <p className="text-hig-footnote text-muted-foreground mt-0.5">
          Não foi possível concluir a análise da amostra. Tente enviar novamente.
        </p>
        {status !== undefined && status !== null && status !== 0 && (
          <p className="text-hig-caption text-muted-foreground mt-2 font-medium">
            Código do erro: <span className="text-destructive font-bold">{status}</span>
          </p>
        )}
        {body && (
          <p className="text-hig-caption2 text-muted-foreground/60 mt-1 break-all">
            {typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300)}
          </p>
        )}
      </div>
    </div>
  )
}

function DefectsSummary({ predictions }: { predictions: Prediction[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, number>()
    for (const pred of predictions) {
      const label = translateDefectClass(pred.class)
      map.set(label, (map.get(label) ?? 0) + 1)
    }
    return Array.from(map.entries())
  }, [predictions])

  if (predictions.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-hig-1 p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-hig-subhead font-semibold text-foreground">
            Nenhum defeito visual identificado nesta amostra
          </p>
          <p className="text-hig-footnote text-muted-foreground mt-0.5">
            Amostra em excelente estado
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-hig-2 overflow-hidden divide-y divide-border">
      {grouped.map(([label, count], idx) => (
        <div key={idx} className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-hig-subhead font-semibold text-foreground">{label}</p>
            <p className="text-hig-caption text-muted-foreground mt-0.5">
              {count} {count === 1 ? 'unidade' : 'unidades'} detectada{count === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Result() {
  const { id } = useParams()
  const { samples, loadSamples } = useAppStore()
  const navigate = useNavigate()
  const [detailOpen, setDetailOpen] = useState(false)
  const sample = samples.find((s) => s.id === id)

  const defectsRaw = sample ? ((sample as any).rawDefects ?? sample.defects) : null
  const hasAnalysisError = sample
    ? (defectsRaw &&
        typeof defectsRaw === 'object' &&
        !Array.isArray(defectsRaw) &&
        defectsRaw.error === true) ||
      sample.grade === 'Erro'
    : false
  const isPending = sample
    ? !hasAnalysisError && (!sample.grade || sample.status === 'pending')
    : false

  const predictions: Prediction[] = useMemo(() => {
    if (!defectsRaw || typeof defectsRaw !== 'object' || Array.isArray(defectsRaw)) return []
    const preds = defectsRaw.predictions
    return Array.isArray(preds) ? preds : []
  }, [defectsRaw])

  const warnings: string[] =
    defectsRaw && !Array.isArray(defectsRaw) && Array.isArray(defectsRaw.warnings)
      ? defectsRaw.warnings
      : []

  // Stop polling after ~3 minutes so a stuck analysis does not poll forever.
  const [pollTimedOut, setPollTimedOut] = useState(false)

  const imageOriginalWidth: number = sample?.imageOriginalWidth ?? 0
  const imageOriginalHeight: number = sample?.imageOriginalHeight ?? 0

  useEffect(() => {
    if (!isPending) return
    const startedAt = Date.now()
    const interval = setInterval(() => {
      if (Date.now() - startedAt > 3 * 60 * 1000) {
        setPollTimedOut(true)
        clearInterval(interval)
        return
      }
      loadSamples()
    }, 3000)
    return () => clearInterval(interval)
  }, [isPending, loadSamples])

  if (!sample) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-hig-body text-muted-foreground">Amostra não encontrada.</p>
      </div>
    )
  }

  const score: number = typeof sample.score === 'number' ? sample.score : 0
  const price: number = typeof sample.price === 'number' ? sample.price : 0
  const grade = GRADE_CONFIG[sample.grade] ?? GRADE_CONFIG['C']
  const isPremium = score >= 80

  if (isPending) {
    return (
      <div className="animate-fade-in-up pb-8 md:pb-4" aria-busy={!pollTimedOut}>
        <p role="status" aria-live="polite" className="sr-only">
          {pollTimedOut
            ? 'A análise está demorando mais que o esperado.'
            : 'Analisando a amostra, aguarde.'}
        </p>
        {pollTimedOut && (
          <div className="mx-4 md:mx-auto md:max-w-6xl mt-4 mb-2 rounded-2xl bg-destructive/10 p-4 text-hig-footnote text-foreground">
            A análise está demorando mais que o esperado. O serviço de visão computacional pode estar
            indisponível.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                setPollTimedOut(false)
                loadSamples()
              }}
            >
              Verificar novamente
            </button>
          </div>
        )}
        <div className="md:hidden relative w-full h-64 bg-black">
          <img src={sample.image} alt="Amostra" className="w-full h-full object-cover opacity-75" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-white/70 text-hig-footnote font-semibold mb-0.5">
              {sample.variety} · {sample.created}
            </p>
            <h2 className="text-white font-display font-bold text-hig-title2 leading-tight">
              {sample.name}
            </h2>
          </div>
        </div>

        <div className="hidden md:block max-w-6xl mx-auto">
          <div className="relative w-full h-80 rounded-3xl overflow-hidden bg-black shadow-hig-3">
            <img
              src={sample.image}
              alt="Amostra"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white/70 text-hig-footnote font-semibold mb-0.5">
                {sample.variety} · {sample.created}
              </p>
              <h2 className="text-white font-display font-bold text-hig-title2 leading-tight">
                {sample.name}
              </h2>
            </div>
          </div>
        </div>

        <div className="px-4 pt-5 md:px-0 md:pt-6 md:max-w-6xl md:mx-auto">
          <div className="bg-white rounded-3xl shadow-hig-2 p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
            <h3 className="font-display font-bold text-hig-title3 text-primary mb-1">
              Analisando amostra...
            </h3>
            <p className="text-hig-subhead text-muted-foreground max-w-sm">
              Nossa IA está identificando defeitos e calculando a classificação do seu café. Isso
              pode levar alguns segundos.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up pb-8 md:pb-4">
      {/* Mobile: hero image */}
      <div className="md:hidden relative w-full h-64 bg-black">
        <img src={sample.image} alt="Amostra" className="w-full h-full object-cover opacity-75" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />{' '}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <p className="text-white/70 text-hig-footnote font-semibold mb-0.5">
              {sample.variety} · {sample.created}
            </p>
            <h2 className="text-white font-display font-bold text-hig-title2 leading-tight">
              {sample.name}
            </h2>
          </div>
          <div
            className={cn(
              'px-3 py-1.5 rounded-2xl text-white font-display font-bold text-hig-headline',
              grade.bg,
            )}
          >
            {grade.label}
          </div>
        </div>
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* Left: image + defects */}
        <div className="space-y-6">
          <div className="relative w-full h-80 rounded-3xl overflow-hidden bg-black shadow-hig-3">
            <img
              src={sample.image}
              alt="Amostra"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <p className="text-white/70 text-hig-footnote font-semibold mb-0.5">
                  {sample.variety} · {sample.created}
                </p>
                <h2 className="text-white font-display font-bold text-hig-title2 leading-tight">
                  {sample.name}
                </h2>
              </div>
              <div
                className={cn(
                  'px-3 py-1.5 rounded-2xl text-white font-display font-bold text-hig-headline',
                  grade.bg,
                )}
              >
                {grade.label}
              </div>
            </div>
          </div>

          {!hasAnalysisError && (
            <Button
              onClick={() => setDetailOpen(true)}
              variant="outline"
              className="w-full h-11 rounded-2xl text-hig-subhead font-semibold border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all text-primary"
            >
              <ZoomIn className="w-4 h-4 mr-2" />
              Ver Detalhes da Análise
            </Button>
          )}

          {/* Defects */}
          <div>
            <h3 className="font-display font-bold text-hig-headline text-primary mb-3 px-1">
              Defeitos Encontrados
            </h3>
            {hasAnalysisError ? (
              <AnalysisError defects={defectsRaw} />
            ) : (
              <>
              <DefectsSummary predictions={predictions} />
              <ExperimentalNotice warnings={warnings} className="mt-3" />
            </>
            )}
          </div>
        </div>

        {/* Right: score + price + actions */}
        <div className="space-y-6">
          <div
            className={cn('bg-white rounded-3xl shadow-hig-2 overflow-hidden ring-2', grade.ring)}
          >
            <div className="p-6 flex items-stretch gap-4">
              <div className="flex flex-col justify-center items-center flex-1">
                <p className="text-hig-caption text-muted-foreground font-semibold mb-1">
                  Pontuação
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn('font-display font-bold leading-none', grade.color)}
                    style={{ fontSize: 72 }}
                  >
                    {score}
                  </span>
                  <span className="text-hig-footnote text-muted-foreground">/100</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {isPremium ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span
                    className={cn(
                      'text-hig-footnote font-semibold',
                      isPremium ? 'text-accent' : 'text-amber-600',
                    )}
                  >
                    {grade.sublabel}
                  </span>
                </div>
              </div>
              <div className="w-px self-stretch bg-border" />
              <div className="flex flex-col justify-center items-center flex-1">
                <p className="text-hig-caption text-muted-foreground font-semibold mb-1">
                  Preço Sugerido
                </p>
                <span className="font-display font-bold text-hig-title1 text-primary leading-tight">
                  R$ {price.toFixed(2)}
                </span>
                <span className="text-hig-subhead text-muted-foreground font-medium mt-0.5">
                  por kg
                </span>
                <div className="flex items-center gap-1 mt-2">
                  <Leaf className="w-3.5 h-3.5 text-accent" />
                  <span className="text-hig-footnote text-accent font-semibold">Preço estimado</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              asChild
              className="w-full h-13 rounded-2xl text-hig-headline font-semibold shadow-hig-2 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all text-white"
            >
              <Link to={`/producer/report/${sample.id}`}>
                <FileText className="w-5 h-5 mr-2" />
                Ver Relatório Completo
              </Link>
            </Button>
            <Button
              onClick={() => navigate('/producer/new')}
              className="w-full h-13 rounded-2xl text-hig-headline font-semibold bg-white hover:bg-muted/60 active:scale-[0.98] transition-all text-primary shadow-hig-1 border-0"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Análise
            </Button>
          </div>
        </div>
      </div>

      {!hasAnalysisError && (
        <Button
          onClick={() => setDetailOpen(true)}
          variant="outline"
          className="md:hidden w-full h-11 rounded-2xl text-hig-subhead font-semibold border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all text-primary"
        >
          <ZoomIn className="w-4 h-4 mr-2" />
          Ver Detalhes da Análise
        </Button>
      )}

      {/* Mobile layout */}
      <div className="md:hidden px-4 pt-5 space-y-4">
        <div className={cn('bg-white rounded-3xl shadow-hig-2 overflow-hidden ring-2', grade.ring)}>
          <div className="p-5 flex items-stretch gap-4">
            <div className="flex flex-col justify-center items-center flex-1">
              <p className="text-hig-caption text-muted-foreground font-semibold mb-1">Pontuação</p>
              <div className="flex items-baseline gap-1">
                <span
                  className={cn('font-display font-bold leading-none text-[60px]', grade.color)}
                >
                  {score}
                </span>
                <span className="text-hig-footnote text-muted-foreground">/100</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {isPremium ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span
                  className={cn(
                    'text-hig-footnote font-semibold',
                    isPremium ? 'text-accent' : 'text-amber-600',
                  )}
                >
                  {grade.sublabel}
                </span>
              </div>
            </div>
            <div className="w-px self-stretch bg-border" />
            <div className="flex flex-col justify-center items-center flex-1">
              <p className="text-hig-caption text-muted-foreground font-semibold mb-1">
                Preço Sugerido
              </p>
              <span className="font-display font-bold text-hig-title2 text-primary leading-tight">
                R$ {price.toFixed(2)}
              </span>
              <span className="text-hig-subhead text-muted-foreground font-medium mt-0.5">
                por kg
              </span>
              <div className="flex items-center gap-1 mt-2">
                <Leaf className="w-3.5 h-3.5 text-accent" />
                <span className="text-hig-footnote text-accent font-semibold">Preço estimado</span>
              </div>
            </div>
          </div>
        </div>

        <section>
          <h3 className="font-display font-bold text-hig-headline text-primary mb-3 px-1">
            Defeitos Encontrados
          </h3>
          {hasAnalysisError ? (
            <AnalysisError defects={defectsRaw} />
          ) : (
            <>
              <DefectsSummary predictions={predictions} />
              <ExperimentalNotice warnings={warnings} className="mt-3" />
            </>
          )}
        </section>

        <div className="space-y-3 pt-2">
          <Button
            asChild
            className="w-full h-13 rounded-2xl text-hig-headline font-semibold shadow-hig-2 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all text-white"
          >
            <Link to={`/producer/report/${sample.id}`}>
              <FileText className="w-5 h-5 mr-2" />
              Ver Relatório Completo
            </Link>
          </Button>
          <Button
            onClick={() => navigate('/producer/new')}
            className="w-full h-13 rounded-2xl text-hig-headline font-semibold bg-white hover:bg-muted/60 active:scale-[0.98] transition-all text-primary shadow-hig-1 border-0"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Análise
          </Button>
        </div>
      </div>

      <AnalysisDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        imageUrl={sample.image}
        sampleName={sample.name}
        predictions={predictions}
        imageOriginalWidth={imageOriginalWidth}
        imageOriginalHeight={imageOriginalHeight}
      />
    </div>
  )
}
