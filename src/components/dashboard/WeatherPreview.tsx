import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MapPin } from 'lucide-react'
import { getWeather, type WeatherResponse } from '@/services/weather'
import { getWeatherCodeInfo } from '@/lib/weather-utils'
import { Card } from '@/components/ui/card'

export function WeatherPreview() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)

  useEffect(() => {
    getWeather()
      .then(setWeather)
      .catch(() => {})
  }, [])

  if (!weather || !weather.available || !weather.current) return null

  const c = weather.current
  const codeInfo = getWeatherCodeInfo(c.weather_code ?? 0)

  return (
    <Link to="/producer/weather" className="block">
      <Card className="rounded-3xl border border-border shadow-sm p-5 md:p-6 transition-transform active:scale-[0.98]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{codeInfo.icon}</div>
            <div>
              <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium">
                <MapPin className="w-3 h-3" />
                {weather.cityName}
              </div>
              <div className="text-3xl font-bold text-card-foreground">
                {Math.round(c.temperature_2m)}°C
              </div>
              <div className="text-muted-foreground text-sm">{codeInfo.label}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium">
            Detalhes
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
