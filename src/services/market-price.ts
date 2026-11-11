import pb from '@/lib/pocketbase/client'

export interface MarketPrice {
  source?: string
  rawValue: number
  fetchedAt?: string
  referenceDate?: string
  warning?: string
  success?: boolean
  refreshed?: boolean
  message?: string
}

export const getMarketPrice = (): Promise<MarketPrice | null> =>
  pb.send('/backend/v1/market-price', { method: 'GET' })

export const refreshMarketPrice = (): Promise<MarketPrice> =>
  pb.send('/backend/v1/market-price/refresh', { method: 'POST' })
