import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Bot, Loader2 } from 'lucide-react'
import { getAgents } from '@/services/agents'
import { useRealtime } from '@/hooks/use-realtime'
import type { Agent, UserAgent } from '@/services/agents'

export function AgentStatusCard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [userAgents, setUserAgents] = useState<UserAgent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await getAgents()
      setAgents(res.agents || [])
      setUserAgents(res.userAgents || [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('user_agents', () => load())

  return (
    <Card className="p-5 rounded-3xl border-0 shadow-hig-1 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-5 h-5 text-accent" />
        <h3 className="font-display font-bold text-hig-headline text-primary">Agentes IA</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => {
            const ua = userAgents.find((u) => u.agent_id === agent.id)
            const isActive = agent.slug === 'albert' || ua?.status || false
            return (
              <div key={agent.id} className="flex items-center justify-between">
                <span className="text-hig-subhead font-medium text-foreground truncate">
                  {agent.name}
                </span>
                <span
                  className={`text-hig-caption2 font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                    isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            )
          })}
          {agents.length === 0 && (
            <p className="text-hig-subhead text-muted-foreground py-2 text-center">
              Nenhum agente.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
