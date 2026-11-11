import pb from '@/lib/pocketbase/client'

export interface TelegramConnectResponse {
  telegramUrl: string
}

export const connectTelegram = (): Promise<TelegramConnectResponse> =>
  pb.send('/backend/v1/telegram/connect', { method: 'POST' })
