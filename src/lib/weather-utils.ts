export interface WeatherCodeInfo {
  label: string
  icon: string
}

export function getWeatherCodeInfo(code: number): WeatherCodeInfo {
  const map: Record<number, WeatherCodeInfo> = {
    0: { label: 'Céu Limpo', icon: '☀️' },
    1: { label: 'Pouco Nublado', icon: '🌤️' },
    2: { label: 'Parcialmente Nublado', icon: '⛅' },
    3: { label: 'Nublado', icon: '☁️' },
    45: { label: 'Névoa', icon: '🌫️' },
    48: { label: 'Névoa com Geada', icon: '🌫️' },
    51: { label: 'Garoa Leve', icon: '🌦️' },
    53: { label: 'Garoa', icon: '🌦️' },
    55: { label: 'Garoa Intensa', icon: '🌧️' },
    61: { label: 'Chuva Leve', icon: '🌦️' },
    63: { label: 'Chuva', icon: '🌧️' },
    65: { label: 'Chuva Intensa', icon: '🌧️' },
    71: { label: 'Neve Leve', icon: '🌨️' },
    73: { label: 'Neve', icon: '🌨️' },
    75: { label: 'Neve Intensa', icon: '❄️' },
    80: { label: 'Pancos de Chuva', icon: '🌦️' },
    81: { label: 'Pancos de Chuva', icon: '🌧️' },
    82: { label: 'Pancos Violentos', icon: '⛈️' },
    95: { label: 'Tempestade', icon: '⛈️' },
    96: { label: 'Tempestade com Granizo', icon: '⛈️' },
    99: { label: 'Tempestade com Granizo', icon: '⛈️' },
  }
  return map[code] || { label: 'Indisponível', icon: '🌡️' }
}

export function getUVLevel(uv: number): { label: string } {
  if (uv <= 2) return { label: 'Baixo' }
  if (uv <= 5) return { label: 'Moderado' }
  if (uv <= 7) return { label: 'Alto' }
  if (uv <= 10) return { label: 'Muito Alto' }
  return { label: 'Extremo' }
}

export function getWindLevel(speed: number): { label: string } {
  if (speed < 15) return { label: 'Calmo' }
  if (speed < 30) return { label: 'Moderado' }
  if (speed < 50) return { label: 'Forte' }
  return { label: 'Muito Forte' }
}
