import pb from '@/lib/pocketbase/client'

export interface Agent {
  id: string
  slug: string
  name: string
  description: string
  defaultFrequency: string
  type: 'system' | 'custom'
}

export interface UserAgent {
  id: string
  agent_id: string
  status: boolean
  config: any
  lastRun: string
  nextRun: string
}

export interface AgentsResponse {
  agents: Agent[]
  userAgents: UserAgent[]
}

export const getAgents = (): Promise<AgentsResponse> =>
  pb.send('/backend/v1/agents', { method: 'GET' })

export const activateAgent = (agentId: string) =>
  pb.send(`/backend/v1/agents/${agentId}/activate`, { method: 'POST' })

export const deactivateAgent = (agentId: string) =>
  pb.send(`/backend/v1/agents/${agentId}/deactivate`, { method: 'POST' })

export const createCustomAgent = (data: {
  name: string
  description: string
  capabilities: string[]
  frequency: string
}) =>
  pb.send('/backend/v1/agents/custom', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })

export const testAgent = (agentSlug: string) =>
  pb.send(`/backend/v1/agents/${agentSlug}/test`, { method: 'POST' })
