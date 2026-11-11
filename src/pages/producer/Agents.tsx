import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bot,
  TrendingUp,
  CalendarRange,
  Sprout,
  Wind,
  GraduationCap,
  Compass,
  Sparkles,
  FlaskConical,
} from 'lucide-react'
import { getAgents, activateAgent, deactivateAgent, testAgent } from '@/services/agents'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import type { Agent, UserAgent } from '@/services/agents'

const AGENT_ICONS: Record<string, any> = {
  albert: Bot,
  mercurio: TrendingUp,
  jano: CalendarRange,
  flora: Sprout,
  eolo: Wind,
  minerva: GraduationCap,
  apolo: Compass,
}

const FREQ_LABELS: Record<string, string> = {
  daily: 'Roda todo dia',
  weekly: 'Roda toda semana',
  continuous: 'Contínuo',
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [userAgents, setUserAgents] = useState<UserAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  const loadAgents = useCallback(async () => {
    try {
      const res = await getAgents()
      setAgents(res.agents || [])
      setUserAgents(res.userAgents || [])
    } catch {
      toast.error('Erro ao carregar agentes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  useRealtime('user_agents', () => {
    loadAgents()
  })

  useRealtime('agents', () => {
    loadAgents()
  })

  const getUA = (agentId: string) => userAgents.find((ua) => ua.agent_id === agentId)
  const activeCount = userAgents.filter((ua) => {
    const agent = agents.find((a) => a.id === ua.agent_id)
    return ua.status && agent?.slug !== 'albert'
  }).length

  const handleToggle = async (agent: Agent, currentStatus: boolean) => {
    if (agent.slug === 'albert') return
    if (!currentStatus && activeCount >= 3) {
      toast.error(
        'Você já possui 3 agentes ativos. Para ativar um novo agente, desative um dos atuais.',
      )
      return
    }
    setToggling(agent.id)
    try {
      if (currentStatus) {
        await deactivateAgent(agent.id)
      } else {
        await activateAgent(agent.id)
      }
      await loadAgents()
    } catch (err: any) {
      const msg = err?.response?.error || err?.message || 'Erro ao alterar status.'
      toast.error(msg)
    } finally {
      setToggling(null)
    }
  }

  const handleTest = async (agent: Agent) => {
    setTesting(agent.id)
    try {
      const res = await testAgent(agent.slug)
      if (res.ok) {
        toast.success(
          res.sentToTelegram
            ? `${agent.name} testado com sucesso! Verifique o Telegram.`
            : `${agent.name} testado com sucesso!`,
        )
      } else {
        toast.error(res.error || 'Erro ao testar agente.')
      }
    } catch (err: any) {
      const msg = err?.response?.error || err?.message || 'Erro ao testar agente.'
      toast.error(msg)
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 md:px-0 md:pt-0 space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display font-bold text-hig-title1 md:text-hig-largetitle text-primary tracking-tight">
          Agentes IA
        </h2>
        <p className="text-hig-subhead text-muted-foreground mt-1">
          {activeCount}/3 agentes ativos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-3xl" />
            ))
          : agents.map((agent) => {
              const Icon = AGENT_ICONS[agent.slug] || Sparkles
              const ua = getUA(agent.id)
              const isActive = agent.slug === 'albert' ? true : ua?.status || false
              const isAlbert = agent.slug === 'albert'
              return (
                <Card
                  key={agent.id}
                  className={`p-5 rounded-3xl border-0 shadow-hig-2 transition-all ${
                    isActive ? 'bg-white' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isActive ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <Switch
                      checked={isActive}
                      disabled={isAlbert || toggling === agent.id}
                      onCheckedChange={() => handleToggle(agent, isActive)}
                    />
                  </div>
                  <h3 className="font-display font-bold text-hig-headline text-foreground">
                    {agent.name}
                  </h3>
                  <p className="text-hig-caption text-muted-foreground mt-1 leading-relaxed">
                    {agent.description}
                  </p>
                  <div className="flex items-center flex-wrap gap-2 mt-3">
                    {agent.slug !== 'albert' && agent.type !== 'custom' && (
                      <span className="text-hig-caption2 font-semibold px-2.5 py-1 rounded-full bg-accent/5 text-accent">
                        {FREQ_LABELS[agent.defaultFrequency] || agent.defaultFrequency}
                      </span>
                    )}
                    {agent.type === 'custom' && (
                      <span className="text-hig-caption2 font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                        Personalizado
                      </span>
                    )}
                    {isAlbert && (
                      <span className="text-hig-caption2 font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        Sempre ativo · não conta no limite
                      </span>
                    )}
                    {isActive && !isAlbert && (
                      <span className="text-hig-caption2 font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        Ativo
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="mt-3 w-full h-10 rounded-xl text-hig-caption font-semibold active:scale-[0.98] transition-all"
                    disabled={testing === agent.id}
                    onClick={() => handleTest(agent)}
                  >
                    <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                    {testing === agent.id ? 'Testando...' : 'Testar agora'}
                  </Button>
                </Card>
              )
            })}
      </div>
    </div>
  )
}
