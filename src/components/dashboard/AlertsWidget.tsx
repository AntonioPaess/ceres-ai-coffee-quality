import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Check } from 'lucide-react'

interface AlertsWidgetProps {
  alerts: any[]
  onMarkRead: (id: string) => void
}

export function AlertsWidget({ alerts, onMarkRead }: AlertsWidgetProps) {
  const unread = alerts.filter((a) => !a.isRead)

  return (
    <Card className="p-5 rounded-3xl border-0 shadow-hig-1 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-accent" />
        <h3 className="font-display font-bold text-hig-headline text-primary">Alertas</h3>
        {unread.length > 0 && (
          <span className="text-hig-caption2 font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
            {unread.length}
          </span>
        )}
      </div>
      {unread.length === 0 ? (
        <p className="text-hig-subhead text-muted-foreground py-4 text-center font-medium">
          Nenhum alerta ativo.
        </p>
      ) : (
        <div className="space-y-2">
          {unread.slice(0, 5).map((alert) => (
            <div key={alert.id} className="bg-amber-50 rounded-2xl p-3 border-l-4 border-amber-400">
              <p className="text-hig-subhead text-foreground leading-snug mb-2">{alert.message}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkRead(alert.id)}
                className="h-7 text-hig-footnote font-semibold rounded-lg bg-white border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <Check className="w-3 h-3 mr-1" />
                Marcar como lido
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
