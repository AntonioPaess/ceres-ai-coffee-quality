import { useState, useEffect } from 'react'
import { Loader2, MapPin, Droplets, Wind, Sun, Gauge, CloudRain, Thermometer } from 'lucide-react'
import { getWeather, type WeatherResponse } from '@/services/weather'
import { getWeatherCodeInfo, getUVLevel, getWindLevel } from '@/lib/weather-utils'
import { Card } from '@/components/ui/card'

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWeather()
      .then(setWeather)
      .catch(() => setWeather(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!weather || !weather.available || !weather.current) {
    return (
      <div className="px-4 pt-6 pb-4 md:px-0 md:pt-0">
        <Card className="rounded-3xl border border-border shadow-sm p-8 text-center">
          <p className="text-muted-foreground">
            {weather?.error ||
              'Dados meteorológicos indisponíveis. Configure sua localização em Configurações.'}
          </p>
        </Card>
      </div>
    )
  }

  const c = weather.current
  const codeInfo = getWeatherCodeInfo(c.weather_code ?? 0)
  const uvLevel = getUVLevel(c.uv_index ?? 0)
  const windLevel = getWindLevel(c.wind_speed_10m ?? 0)

  const risks: string[] = []
  if (weather.frostRisk) risks.push('⚠️ Risco de geada')
  if (weather.droughtRisk) risks.push('⚠️ Risco de seca')
  if (weather.highWindRisk) risks.push('⚠️ Vento forte')
  if (weather.extremeUVRisk) risks.push('⚠️ UV extremo')

  const lat = parseFloat(weather.latitude || '0')
  const lon = parseFloat(weather.longitude || '0')
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.05}%2C${lat - 0.05}%2C${lon + 0.05}%2C${lat + 0.05}&layer=mapnik&marker=${lat}%2C${lon}`

  return (
    <div className="px-4 pt-6 pb-4 md:px-0 md:pt-0 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="col-span-2 rounded-3xl border border-border shadow-sm p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{weather.cityName}</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold text-card-foreground">
                {Math.round(c.temperature_2m)}°
              </div>
              <div className="text-muted-foreground text-base md:text-lg mt-1">
                {codeInfo.label}
              </div>
            </div>
            <div className="text-6xl md:text-7xl">{codeInfo.icon}</div>
          </div>
          {risks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {risks.map((r, i) => (
                <span
                  key={i}
                  className="text-xs font-medium bg-card border border-border text-card-foreground rounded-full px-3 py-1"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </Card>

        <BentoMetric
          icon={<Thermometer className="w-5 h-5 text-muted-foreground" />}
          label="Sensação Térmica"
          value={`${Math.round(c.apparent_temperature)}°C`}
        />
        <BentoMetric
          icon={<Droplets className="w-5 h-5 text-muted-foreground" />}
          label="Humidade"
          value={`${c.relative_humidity_2m ?? 0}%`}
        />
        <BentoMetric
          icon={<Wind className="w-5 h-5 text-muted-foreground" />}
          label="Vento"
          value={`${c.wind_speed_10m ?? 0} km/h`}
          sub={windLevel.label}
        />
        <BentoMetric
          icon={<Sun className="w-5 h-5 text-muted-foreground" />}
          label="Índice UV"
          value={`${c.uv_index ?? 0}`}
          sub={uvLevel.label}
        />
        <BentoMetric
          icon={<Gauge className="w-5 h-5 text-muted-foreground" />}
          label="Pressão"
          value={`${Math.round(c.surface_pressure ?? 0)} hPa`}
        />
        <BentoMetric
          icon={<CloudRain className="w-5 h-5 text-muted-foreground" />}
          label="Precipitação"
          value={`${c.precipitation ?? 0} mm`}
        />

        <Card className="col-span-2 rounded-2xl border border-border shadow-sm overflow-hidden h-48 md:h-64">
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            loading="lazy"
            title="Mapa de localização"
          />
        </Card>

        {weather.forecast && weather.forecast.time && (
          <Card className="col-span-2 rounded-2xl border border-border shadow-sm p-4">
            <div className="text-sm font-semibold text-muted-foreground mb-3">Previsão 3 dias</div>
            <div className="grid grid-cols-3 gap-3">
              {weather.forecast.time.map((date, i) => {
                const info = getWeatherCodeInfo(weather.forecast!.weather_code?.[i] ?? 0)
                return (
                  <div key={i} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'short',
                      })}
                    </div>
                    <div className="text-2xl mb-1">{info.icon}</div>
                    <div className="text-sm font-medium text-card-foreground">
                      {Math.round(weather.forecast!.temperature_2m_max?.[i] ?? 0)}° /{' '}
                      {Math.round(weather.forecast!.temperature_2m_min?.[i] ?? 0)}°
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {weather.forecast!.precipitation_sum?.[i] ?? 0}mm
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function BentoMetric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card className="col-span-1 rounded-2xl border border-border shadow-sm p-4 flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <div>
        <div className="text-xl md:text-2xl font-bold text-card-foreground">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </Card>
  )
}
