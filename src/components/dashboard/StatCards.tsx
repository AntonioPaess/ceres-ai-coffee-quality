import { Beaker, Star, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MarketPrice } from '@/services/market-price'

interface StatCardsProps {
  totalSamples: number
  avgScore: number
  totalDefects: number
  marketPrice: MarketPrice | null | undefined
  onRefreshMarketPrice: () => void
  refreshingMarketPrice: boolean
}

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string
  sublabel?: string
  accentClass: string
}

function StatItem({ icon, label, value, sublabel, accentClass }: StatItemProps) {
  return (
    <Card className="rounded-3xl border-0 shadow-hig-2 bg-white p-4 md:p-5 flex flex-col gap-2 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0',
            accentClass,
          )}
        >
          {icon}
        </div>
        <span className="text-hig-caption md:text-hig-subhead text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display font-bold text-hig-title2 md:text-hig-title1 text-primary tracking-tight">
          {value}
        </span>
        {sublabel && <span className="text-hig-caption text-muted-foreground">{sublabel}</span>}
      </div>
    </Card>
  )
}

export function StatCards({
  totalSamples,
  avgScore,
  totalDefects,
  marketPrice,
  onRefreshMarketPrice,
  refreshingMarketPrice,
}: StatCardsProps) {
  const pricePerKg = marketPrice?.rawValue ?? 0
  const pricePerSaca = pricePerKg * 60

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatItem
        icon={<Beaker className="w-5 h-5 text-accent" />}
        label="Amostras"
        value={String(totalSamples)}
        accentClass="bg-accent/10"
      />
      <StatItem
        icon={<Star className="w-5 h-5 text-amber-500" />}
        label="Nota Média"
        value={String(avgScore)}
        sublabel="/100"
        accentClass="bg-amber-50"
      />
      <StatItem
        icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
        label="Defeitos"
        value={String(totalDefects)}
        accentClass="bg-orange-50"
      />
      <Card className="rounded-3xl border-0 shadow-hig-2 bg-white p-4 md:p-5 flex flex-col gap-2 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 bg-green-50">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-hig-caption md:text-hig-subhead text-muted-foreground font-medium">
              Mercado
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onRefreshMarketPrice}
            disabled={refreshingMarketPrice}
            aria-label="Recarregar cotação em cache"
            title="Recarregar cotação em cache"
            className="h-8 w-8 rounded-full hover:bg-muted active:scale-90 transition-all"
          >
            <RefreshCw
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                refreshingMarketPrice && 'animate-spin',
              )}
              aria-hidden="true"
            />
          </Button>
        </div>
        <div className="flex items-baseline gap-1">
          {marketPrice === undefined ? (
            <div className="h-7 w-20 bg-muted rounded-lg animate-pulse" />
          ) : marketPrice === null || pricePerKg === 0 ? (
            <span className="font-display font-bold text-hig-title2 md:text-hig-title1 text-muted-foreground/50">
              —
            </span>
          ) : (
            <>
              <span className="font-display font-bold text-hig-title2 md:text-hig-title1 text-primary tracking-tight">
                R$ {pricePerKg.toFixed(2)}
              </span>
              <span className="text-hig-caption text-muted-foreground">/kg</span>
            </>
          )}
        </div>
        {marketPrice && pricePerKg > 0 && (
          <span className="text-hig-caption text-muted-foreground">
            R$ {pricePerSaca.toFixed(0)}/saca 60kg
          </span>
        )}
      </Card>
    </div>
  )
}
