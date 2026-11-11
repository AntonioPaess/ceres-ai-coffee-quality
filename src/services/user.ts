import pb from '@/lib/pocketbase/client'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  telegramChatId: string
  latitude: string
  longitude: string
  cityName: string
  stateName?: string
  geocodedAt: string
  avatar?: string
}

export interface GeocodeResult {
  geocoded: boolean
  cityName: string
  latitude?: string
  longitude?: string
  message?: string
}

export const getCurrentUserProfile = (): Promise<UserProfile> =>
  pb.collection('users').getOne(pb.authStore.record!.id)

export const geocodeCity = (cityName: string): Promise<GeocodeResult> =>
  pb.send('/backend/v1/geocode', {
    method: 'POST',
    body: JSON.stringify({ cityName }),
    headers: { 'Content-Type': 'application/json' },
  })

export const updateLocation = (latitude: string, longitude: string): Promise<GeocodeResult> =>
  pb.send('/backend/v1/geocode', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
    headers: { 'Content-Type': 'application/json' },
  })

export const updateUserProfile = (id: string, data: FormData): Promise<UserProfile> =>
  pb.collection('users').update(id, data)

export const deleteAccount = (id: string): Promise<void> =>
  pb.collection('users').delete(id).then(() => undefined)
