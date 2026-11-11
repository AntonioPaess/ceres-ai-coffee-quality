import { useParams } from 'react-router-dom'
import { useAppStore } from '@/stores/app'
import { ExperimentalNotice } from '@/components/ExperimentalNotice'
import { Button } from '@/components/ui/button'
import { Share2, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

const GRADE_LABEL: Record<string, string> = {
  A: 'Premium',
  B: 'Bom',
  C: 'Padrão',
  D: 'Defeituoso',
}

export default function Report() {
  const { id } = useParams()
  const { samples } = useAppStore()
  const { user } = useAuth()
  const { toast } = useToast()
  const sample = samples.find((s) => s.id === id)

  if (!sample) return null
  const defects = Array.isArray(sample.defects) ? sample.defects : []

  // The report is private (owner-only API rules): the link only works for the signed-in owner.
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: 'Link copiado!',
        description: 'Somente você, com sua conta, consegue abrir este relatório.',
      })
    } catch {
      toast({ title: 'Não foi possível copiar o link', variant: 'destructive' })
    }
  }

  const rawDefects = sample?.rawDefects
  const warnings =
    rawDefects && !Array.isArray(rawDefects) && Array.isArray(rawDefects.warnings)
      ? rawDefects.warnings
      : []

  return (
    <div className="px-4 pt-6 pb-10 md:px-0 md:pt-0 animate-fade-in">
      <ExperimentalNotice warnings={warnings} className="mb-4 max-w-6xl mx-auto print:hidden" />
      {/* Mobile: single column document */}
      <div className="md:hidden bg-white rounded-3xl shadow-hig-3 overflow-hidden">
        <div className="bg-primary px-6 py-5">
          <p className="text-hig-caption2 text-white/60 font-semibold uppercase tracking-widest mb-1">
            Ceres AI
          </p>
          <h1 className="font-display font-bold text-hig-title2 text-white tracking-tight">
            Relatório de Análise (experimental)
          </h1>
          <p className="text-hig-footnote text-white/50 mt-1 font-mono">
            #{sample.id.slice(0, 8).toUpperCase()} · {sample.created}
          </p>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <InfoRow label="Produtor" value={user?.name || '—'} />
            <InfoRow label="Lote" value={sample.name} />
            <InfoRow label="Variedade" value={sample.variety} />
            <InfoRow label="Método" value="IA Visual (Ceres)" />
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hig-caption2 text-muted-foreground font-semibold uppercase tracking-widest mb-1">
                Pontuação (experimental)
              </p>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="font-display font-bold text-primary"
                  style={{ fontSize: 56, lineHeight: 1 }}
                >
                  {sample.score}
                </span>
                <span className="text-hig-footnote text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-hig-caption2 text-muted-foreground font-semibold uppercase tracking-widest mb-1">
                Classificação
              </p>
              <p className="font-display font-bold text-hig-title1 text-accent">
                Grade {sample.grade}
              </p>
              <p className="text-hig-footnote text-muted-foreground font-medium">
                {GRADE_LABEL[sample.grade]}
              </p>
            </div>
          </div>
          <div className="h-px bg-border" />
          <DefectTable sample={sample} />
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <p className="text-hig-subhead font-semibold text-muted-foreground">Preço Sugerido</p>
            <div className="text-right">
              <p className="font-display font-bold text-hig-title2 text-accent">
                R$ {sample.price.toFixed(2)}{' '}
                <span className="text-hig-footnote text-muted-foreground font-normal">/kg</span>
              </p>
              <p className="text-hig-footnote text-muted-foreground font-medium mt-0.5">
                R$ {(sample.price * 60).toFixed(2)} /saca
              </p>
            </div>
          </div>
          <p className="text-hig-caption text-muted-foreground leading-relaxed">
            Amostra avaliada por visão computacional (Ceres AI). Pontuação e classificação seguem
            regras experimentais do projeto, inspiradas na tabela COB de defeitos equivalentes; não
            correspondem à pontuação SCA nem a uma classificação oficial.
          </p>
        </div>
      </div>

      {/* Desktop: multi-column document */}
      <div className="hidden md:block bg-white rounded-3xl shadow-hig-3 overflow-hidden max-w-6xl mx-auto">
        <div className="bg-primary px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hig-caption2 text-white/60 font-semibold uppercase tracking-widest mb-1">
                Ceres AI
              </p>
              <h1 className="font-display font-bold text-hig-title1 text-white tracking-tight">
                Relatório de Análise (experimental)
              </h1>
              <p className="text-hig-footnote text-white/50 mt-1 font-mono">
                #{sample.id.slice(0, 8).toUpperCase()} · {sample.created}
              </p>
            </div>
            <img
              src={sample.image}
              alt="Amostra"
              className="w-28 h-28 rounded-2xl object-cover border-2 border-white/20"
            />
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: identification + price */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h3 className="text-hig-caption2 text-muted-foreground font-semibold uppercase tracking-widest mb-3">
                Identificação
              </h3>
              <div className="space-y-3">
                <InfoRow label="Produtor" value={user?.name || '—'} />
                <InfoRow label="Lote" value={sample.name} />
                <InfoRow label="Variedade" value={sample.variety} />
                <InfoRow label="Método" value="IA Visual (Ceres)" />
              </div>
            </div>
            <div className="h-px bg-border" />
            <div>
              <h3 className="text-hig-caption2 text-muted-foreground font-semibold uppercase tracking-widest mb-3">
                Preço Sugerido
              </h3>
              <p className="font-display font-bold text-hig-largetitle text-accent">
                R$ {sample.price.toFixed(2)}{' '}
                <span className="text-hig-subhead text-muted-foreground font-normal">/kg</span>
              </p>
              <p className="text-hig-subhead text-muted-foreground font-medium mt-1">
                R$ {(sample.price * 60).toFixed(2)} /saca
              </p>
            </div>
          </div>

          {/* Middle column: score + grade */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h3 className="text-hig-caption2 text-muted-foreground font-semibold uppercase tracking-widest mb-3">
                Pontuação (experimental)
              </h3>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-display font-bold text-primary"
                  style={{ fontSize: 96, lineHeight: 1 }}
                >
                  {sample.score}
                </span>
                <span className="text-hig-subhead text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div>
              <h3 className="text-hig-caption2 text-muted-foreground font-semibold uppercase tracking-widest mb-3">
                Classificação
              </h3>
              <p className="font-display font-bold text-hig-largetitle text-accent">
                Grade {sample.grade}
              </p>
              <p className="text-hig-subhead text-muted-foreground font-medium mt-1">
                {GRADE_LABEL[sample.grade]}
              </p>
            </div>
          </div>

          {/* Right column: defects */}
          <div className="lg:col-span-1">
            <h3 className="text-hig-caption2 text-muted-foreground font-semibold uppercase tracking-widest mb-3">
              Análise de Defeitos
            </h3>
            <div className="rounded-2xl overflow-hidden border border-border">
              <div className="grid grid-cols-3 px-4 py-2 bg-muted">
                <span className="text-hig-caption text-muted-foreground font-semibold">Tipo</span>
                <span className="text-hig-caption text-muted-foreground font-semibold text-center">
                  Qtd
                </span>
                <span className="text-hig-caption text-muted-foreground font-semibold text-right">
                  %
                </span>
              </div>
              {defects.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-hig-subhead text-muted-foreground font-medium">
                    Sem defeitos detectados
                  </p>
                </div>
              ) : (
                defects.map((def, i) => (
                  <div key={i} className="grid grid-cols-3 px-4 py-3 border-t border-border">
                    <span className="text-hig-subhead font-medium text-foreground">
                      {def.type || 'Desconhecido'}
                    </span>
                    <span className="text-hig-subhead font-bold text-foreground text-center">
                      {def.count ?? 0}
                    </span>
                    <span className="text-hig-subhead font-bold text-destructive text-right">
                      {def.percent || '0%'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-8 pb-6">
          <p className="text-hig-caption text-muted-foreground leading-relaxed">
            Amostra avaliada por visão computacional (Ceres AI). Pontuação e classificação seguem
            regras experimentais do projeto, inspiradas na tabela COB de defeitos equivalentes; não
            correspondem à pontuação SCA nem a uma classificação oficial.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6 max-w-6xl mx-auto">
        <Button
          onClick={handleShare}
          className="flex-1 h-13 bg-primary hover:bg-primary/90 active:scale-[0.98] gap-2 rounded-2xl shadow-hig-2 font-semibold text-hig-headline transition-all text-[#ffffff]"
        >
          <Share2 className="w-5 h-5" /> Compartilhar
        </Button>
        <Button
          variant="outline"
          className="w-[52px] h-13 p-0 rounded-2xl border-2 border-border text-primary hover:bg-muted/50 active:scale-[0.98] transition-all"
        >
          <Download className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-hig-caption2 text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-hig-subhead font-semibold text-foreground truncate">{value}</p>
    </div>
  )
}

function DefectTable({ sample }: { sample: any }) {
  const defects = Array.isArray(sample?.defects) ? sample.defects : []
  return (
    <div>
      <p className="text-hig-caption2 text-muted-foreground font-semibold uppercase tracking-widest mb-3">
        Análise de Defeitos
      </p>
      <div className="rounded-2xl overflow-hidden border border-border">
        <div className="grid grid-cols-3 px-4 py-2 bg-muted">
          <span className="text-hig-caption text-muted-foreground font-semibold">Tipo</span>
          <span className="text-hig-caption text-muted-foreground font-semibold text-center">
            Qtd
          </span>
          <span className="text-hig-caption text-muted-foreground font-semibold text-right">%</span>
        </div>
        {defects.length === 0 ? (
          <div className="px-4 py-4 text-center">
            <p className="text-hig-subhead text-muted-foreground font-medium">
              Sem defeitos detectados
            </p>
          </div>
        ) : (
          defects.map((def, i) => (
            <div key={i} className="grid grid-cols-3 px-4 py-3 border-t border-border">
              <span className="text-hig-subhead font-medium text-foreground">
                {def.type || 'Desconhecido'}
              </span>
              <span className="text-hig-subhead font-bold text-foreground text-center">
                {def.count ?? 0}
              </span>
              <span className="text-hig-subhead font-bold text-destructive text-right">
                {def.percent || '0%'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
