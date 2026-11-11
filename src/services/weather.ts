import pb from '@/lib/pocketbase/client'

export interface WeatherCurrent {
  time?: string
  interval?: number
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature: number
  precipitation: number
  surface_pressure: number
  wind_speed_10m: number
  uv_index: number
  weather_code?: number
}

export interface WeatherDaily {
  time: string[]
  temperature_2m_min: number[]
  temperature_2m_max: number[]
  precipitation_sum: number[]
  weather_code?: number[]
  wind_speed_10m_max?: number[]
  uv_index_max?: number[]
}

export interface WeatherResponse {
  available: boolean
  current?: WeatherCurrent
  forecast?: WeatherDaily | null
  frostRisk: boolean
  droughtRisk: boolean
  highWindRisk?: boolean
  extremeUVRisk?: boolean
  cityName: string
  latitude?: string
  longitude?: string
  error?: string
}

export const getWeather = (): Promise<WeatherResponse> =>
  pb.send('/backend/v1/albert/weather', { method: 'GET' })
