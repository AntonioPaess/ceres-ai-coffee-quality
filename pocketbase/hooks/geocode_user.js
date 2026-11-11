routerAdd(
  'POST',
  '/backend/v1/geocode',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    if (body.latitude && body.longitude) {
      const lat = String(body.latitude)
      const lon = String(body.longitude)

      let cityName = ''
      try {
        const revGeoUrl =
          'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
          lat +
          '&longitude=' +
          lon +
          '&localityLanguage=pt'
        const revRes = $http.send({
          url: revGeoUrl,
          method: 'GET',
          timeout: 10,
        })
        if (revRes.statusCode === 200 && revRes.json) {
          const city =
            revRes.json.city ||
            revRes.json.locality ||
            revRes.json.principalSubdivisionLocality ||
            ''
          const state = revRes.json.principalSubdivision || ''
          if (city) {
            cityName = state ? city + ', ' + state : city
          }
        }
      } catch (err) {
        $app.logger().error('Reverse geocoding failed', 'err', err.message)
      }

      const user = $app.findRecordById('users', userId)
      user.set('latitude', lat)
      user.set('longitude', lon)
      if (cityName) user.set('cityName', cityName)
      user.set('geocodedAt', new Date().toISOString())
      $app.save(user)
      return e.json(200, {
        geocoded: true,
        latitude: lat,
        longitude: lon,
        cityName: cityName || user.getString('cityName') || '',
      })
    }

    const cityNameInput = (body.cityName || '').trim()
    if (!cityNameInput) return e.badRequestError('cityName or coordinates are required')

    const geocodingUrl =
      'https://geocoding-api.open-meteo.com/v1/search?name=' +
      encodeURIComponent(cityNameInput) +
      '&count=1&language=pt&format=json'

    try {
      const res = $http.send({
        url: geocodingUrl,
        method: 'GET',
        timeout: 15,
      })

      if (res.statusCode === 200 && res.json && res.json.results && res.json.results.length > 0) {
        const result = res.json.results[0]
        const lat = String(result.latitude)
        const lon = String(result.longitude)

        const updatedUser = $app.findRecordById('users', userId)
        updatedUser.set('latitude', lat)
        updatedUser.set('longitude', lon)
        updatedUser.set('geocodedAt', new Date().toISOString())
        $app.save(updatedUser)

        return e.json(200, {
          geocoded: true,
          cityName: cityNameInput,
          latitude: lat,
          longitude: lon,
        })
      }

      return e.json(200, {
        geocoded: false,
        cityName: cityNameInput,
        message: "Não encontrei essa cidade. Tente digitar 'Cidade, Estado' (ex: Varginha, MG)",
      })
    } catch (err) {
      $app.logger().error('Geocoding request failed', 'err', err.message, 'userId', userId)
      return e.json(200, {
        geocoded: false,
        cityName: cityNameInput,
        message: "Não encontrei essa cidade. Tente digitar 'Cidade, Estado' (ex: Varginha, MG)",
      })
    }
  },
  $apis.requireAuth(),
)
