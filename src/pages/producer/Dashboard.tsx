import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/app'
import { useAuth } from '@/hooks/use-auth'
import { Send, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { connectTelegram } from '@/services/telegram'

import { averageScore, countTotalDefects } from '@/lib/stats'
import { getMarketPrice, refreshMarketPrice, type MarketPrice } from '@/services/market-price'
import { toast } from 'sonner'
import { StatCards } from '@/components/dashboard/StatCards'
import { RecentSamples } from '@/components/dashboard/RecentSamples'
import { AgentStatusCard } from '@/components/dashboard/AgentStatusCard'
import { AlertsWidget } from '@/components/dashboard/AlertsWidget'
import { WeatherPreview } from '@/components/dashboard/WeatherPreview'

export default function ProducerDashboard() {
  const { samples, alerts, markAlertRead } = useAppStore()
  const { user } = useAuth()
  const [connecting, setConnecting] = useState(false)
  const [marketPrice, setMarketPrice] = useState<MarketPrice | null | undefined>(undefined)
  const [refreshingPrice, setRefreshingPrice] = useState(false)

  const avgScore = averageScore(samples)
  const totalDefects = countTotalDefects(samples)

  useEffect(() => {
    getMarketPrice()
      .then(setMarketPrice)
      .catch(() => setMarketPrice(null))
  }, [])

  const handleRefreshMarketPrice = async () => {
    setRefreshingPrice(true)
    try {
      const refreshed = await refreshMarketPrice()
      setMarketPrice(refreshed)
      if (refreshed.refreshed === false) {
        toast.info(refreshed.message || 'Exibindo o último valor em cache.')
      } else {
        toast.success('Cotação atualizada')
      }
    } catch {
      toast.error('Não foi possível ler a cotação. Tente novamente.')
    } finally {
      setRefreshingPrice(false)
    }
  }

  const handleTelegramConnect = async () => {
    setConnecting(true)
    try {
      const res = await connectTelegram()
      window.open(res.telegramUrl, '_blank')
    } catch {
      toast.error('Erro ao gerar link. Tente novamente.')
    } finally {
      setConnecting(false)
    }
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Produtor'

  return (
    <div className="px-4 pt-6 pb-4 md:px-0 md:pt-0 space-y-6 animate-fade-in">
      <div>
        <p className="text-hig-callout text-muted-foreground font-medium">Olá,</p>
        <h2 className="font-display font-bold text-hig-title1 md:text-hig-largetitle text-primary tracking-tight">
          {firstName}
        </h2>
      </div>

      <StatCards
        totalSamples={samples.length}
        avgScore={avgScore}
        totalDefects={totalDefects}
        marketPrice={marketPrice}
        onRefreshMarketPrice={handleRefreshMarketPrice}
        refreshingMarketPrice={refreshingPrice}
      />

      <WeatherPreview />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentSamples samples={samples} />
        </div>
        <div className="space-y-4">
          <AgentStatusCard />
          <AlertsWidget alerts={alerts} onMarkRead={markAlertRead} />
        </div>
      </div>

      <Card className="rounded-3xl border-0 shadow-hig-2 bg-white overflow-hidden">
        <div className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent flex-shrink-0">
            <Send className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-hig-headline md:text-hig-title3 text-primary">
              Albert no Telegram
            </h3>
            <p className="text-hig-caption md:text-hig-subhead text-muted-foreground mt-1">
              Converse com o Albert, seu especialista em café.
            </p>
          </div>
          <Button
            onClick={handleTelegramConnect}
            disabled={connecting}
            className="bg-accent hover:bg-accent/90 text-white rounded-2xl h-12 px-6 text-hig-subhead font-semibold shadow-hig-2 flex-shrink-0 active:scale-95 transition-all"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Conversar
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
