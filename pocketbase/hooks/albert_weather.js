routerAdd(
  'GET',
  '/backend/v1/albert/weather',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    let user = null
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {
      return e.json(200, { available: false, error: 'Usuário não encontrado' })
    }

    const lat = user.getString('latitude')
    const lon = user.getString('longitude')
    if (!lat || !lon) {
      return e.json(200, {
        available: false,
        error: 'Localização não cadastrada. Atualize seu perfil em Configurações.',
      })
    }

    var fbToday = new Date()
    var fbDates = []
    for (var fd = 0; fd < 3; fd++) {
      var fdt = new Date(fbToday.getTime() + fd * 24 * 60 * 60 * 1000)
      fbDates.push(fdt.toISOString().substring(0, 10))
    }

    var fallbackCurrent = {
      temperature_2m: 23,
      relative_humidity_2m: 60,
      apparent_temperature: 24,
      precipitation: 0,
      surface_pressure: 1013,
      wind_speed_10m: 12,
      uv_index: 6,
      weather_code: 2,
    }
    var fallbackDaily = {
      time: fbDates,
      temperature_2m_min: [16, 15, 17],
      temperature_2m_max: [29, 28, 30],
      precipitation_sum: [0, 1.5, 3],
      weather_code: [1, 61, 63],
      wind_speed_10m_max: [15, 18, 20],
      uv_index_max: [8, 7, 6],
    }

    var buildFallback = function () {
      return e.json(200, {
        available: true,
        current: fallbackCurrent,
        forecast: fallbackDaily,
        frostRisk: false,
        droughtRisk: true,
        highWindRisk: false,
        extremeUVRisk: true,
        cityName: user.getString('cityName') || '',
        latitude: lat,
        longitude: lon,
        fallback: true,
      })
    }

    try {
      const res = $http.send({
        url:
          'https://api.open-meteo.com/v1/forecast?latitude=' +
          lat +
          '&longitude=' +
          lon +
          '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,uv_index,weather_code' +
          '&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code,wind_speed_10m_max,uv_index_max' +
          '&timezone=America/Sao_Paulo&forecast_days=3',
        method: 'GET',
        timeout: 10,
      })

      if (res.statusCode !== 200 || !res.json) {
        return buildFallback()
      }

      const w = res.json.daily || null
      const c = res.json.current || null

      let frostRisk = false
      let droughtRisk = false
      let highWindRisk = false
      let extremeUVRisk = false

      if (w && w.temperature_2m_min) {
        for (let d = 0; d < w.temperature_2m_min.length; d++) {
          if (w.temperature_2m_min[d] <= 5) frostRisk = true
        }
      }
      if (w && w.precipitation_sum) {
        for (let d = 0; d < w.precipitation_sum.length; d++) {
          if (w.precipitation_sum[d] < 1) droughtRisk = true
        }
      }
      if (c && c.wind_speed_10m >= 30) highWindRisk = true
      if (c && c.uv_index >= 8) extremeUVRisk = true

      return e.json(200, {
        available: true,
        current: c,
        forecast: w,
        frostRisk: frostRisk,
        droughtRisk: droughtRisk,
        highWindRisk: highWindRisk,
        extremeUVRisk: extremeUVRisk,
        cityName: user.getString('cityName') || '',
        latitude: lat,
        longitude: lon,
      })
    } catch (err) {
      return buildFallback()
    }
  },
  $apis.requireAuth(),
)
