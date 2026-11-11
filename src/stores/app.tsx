import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

import type {
  Alert,
  DefectCategory,
  DefectsData,
  RawDefects,
  Sample,
  Severity,
} from '@/lib/types'

export type { Alert, DefectCategory, DefectsData, Sample }

interface AppStoreContextType {
  samples: Sample[]
  alerts: Alert[]
  loadSamples: () => Promise<void>
  loadAlerts: () => Promise<void>
  markAlertRead: (id: string) => Promise<void>
}

const AppStoreContext = createContext<AppStoreContextType | undefined>(undefined)

export const useAppStore = () => {
  const context = useContext(AppStoreContext)
  if (!context) throw new Error('useAppStore must be used within AppStoreProvider')
  return context
}

const PLACEHOLDER_IMG = 'https://img.usecurling.com/p/200/200?q=green%20coffee%20beans'

function normalizeDefects(defects: unknown): DefectCategory[] {
  if (!defects) return []
  if (Array.isArray(defects)) return defects as DefectCategory[]
  if (typeof defects === 'object' && defects !== null && Array.isArray((defects as RawDefects).categories)) {
    const raw = defects as RawDefects
    const total = raw.totalDetected || raw.totalDefects || 1
    const highSeverity = ['black', 'sour', 'infested', 'foreign']
    const medSeverity = ['broken', 'husk', 'fraghusk']
    return (raw.categories ?? [])
      .filter((c) => c.count > 0)
      .map((c): DefectCategory => {
        let severity: Severity = 'Baixa'
        if (highSeverity.includes(c.class)) severity = 'Alta'
        else if (medSeverity.includes(c.class)) severity = 'Média'
        return {
          type: c.label || c.class || 'Desconhecido',
          count: c.count || 0,
          percent: total > 0 ? ((c.count / total) * 100).toFixed(1) + '%' : '0%',
          severity,
        }
      })
  }
  return []
}

function transformSample(record: Record<string, any>): Sample {
  return {
    ...(record as unknown as Sample),
    image: record.image
      ? `${pb.baseURL}/api/files/samples/${record.id}/${record.image}`
      : PLACEHOLDER_IMG,
    created: record.created ? new Date(record.created).toLocaleDateString('pt-BR') : '',
    defects: normalizeDefects(record.defects),
    rawDefects: record.defects,
    status: record.status || null,
  }
}

export const AppStoreProvider = ({ children }: { children: ReactNode }) => {
  const [samples, setSamples] = useState<Sample[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  const loadSamples = useCallback(async () => {
    try {
      const records = await pb.collection('samples').getFullList({ sort: '-created' })
      setSamples(records.map(transformSample))
    } catch (err) {
      console.error('Failed to load samples:', err)
    }
  }, [])

  const loadAlerts = useCallback(async () => {
    try {
      const records = await pb.collection('alerts').getFullList<Alert>({ sort: '-created' })
      setAlerts(records)
    } catch (err) {
      console.error('Failed to load alerts:', err)
    }
  }, [])

  const markAlertRead = useCallback(async (id: string) => {
    try {
      await pb.collection('alerts').update(id, { isRead: true })
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)))
    } catch (err) {
      console.error('Failed to mark alert as read:', err)
    }
  }, [])

  useEffect(() => {
    loadSamples()
    loadAlerts()
  }, [loadSamples, loadAlerts])

  useRealtime('samples', () => {
    loadSamples()
  })
  useRealtime('alerts', () => {
    loadAlerts()
  })

  return (
    <AppStoreContext.Provider value={{ samples, alerts, loadSamples, loadAlerts, markAlertRead }}>
      {children}
    </AppStoreContext.Provider>
  )
}
