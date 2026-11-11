import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const GRADE_BADGE: Record<string, string> = {
  A: 'text-accent bg-accent/10',
  B: 'text-amber-700 bg-amber-100',
  C: 'text-orange-600 bg-orange-50',
  D: 'text-destructive bg-destructive/10',
}

export function RecentSamples({ samples }: { samples: any[] }) {
  const recent = samples.slice(0, 5)

  return (
    <Card className="rounded-3xl border-0 shadow-hig-2 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-display font-bold text-hig-headline text-primary">Amostras Recentes</h3>
        <Link to="/producer/history" className="text-hig-subhead text-accent font-semibold">
          Ver todas
        </Link>
      </div>
      <div className="divide-y divide-border">
        {recent.map((sample) => (
          <Link
            key={sample.id}
            to={`/producer/result/${sample.id}`}
            className="flex items-center gap-3 px-5 py-3.5 active:bg-muted/50 hover:bg-muted/30 transition-colors"
          >
            <img
              src={sample.image}
              alt={sample.name}
              className="w-12 h-12 rounded-2xl object-cover bg-muted flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-hig-subhead font-semibold text-foreground truncate">
                {sample.name}
              </p>
              <p className="text-hig-caption text-muted-foreground mt-0.5">{sample.variety}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {sample.grade ? (
                <>
                  <span className="font-display font-bold text-hig-headline text-foreground">
                    {sample.score}
                  </span>
                  <span
                    className={cn(
                      'text-hig-caption2 font-bold px-2 py-0.5 rounded-full uppercase',
                      GRADE_BADGE[sample.grade] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {sample.grade}
                  </span>
                </>
              ) : (
                <span className="text-hig-caption2 font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Analisando...
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </div>
          </Link>
        ))}
        {recent.length === 0 && (
          <div className="py-10 text-center text-hig-subhead text-muted-foreground font-medium">
            Nenhuma amostra ainda.
          </div>
        )}
      </div>
    </Card>
  )
}
