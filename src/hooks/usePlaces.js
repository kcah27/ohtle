import { useState, useCallback } from 'react'

export function usePlaces() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [places, setPlaces] = useState([])

  const search = useCallback(async ({ query, lat, lng, types }) => {
    setLoading(true)
    setError(null)
    setPlaces([])

    try {
      let finalLat = lat
      let finalLng = lng

      if (query && (!lat || !lng)) {
        const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`)
        const geoData = await geoRes.json()
        if (geoData.status !== 'OK') throw new Error('No se encontró la ubicación: ' + geoData.status)
        finalLat = geoData.results[0].geometry.location.lat
        finalLng = geoData.results[0].geometry.location.lng
      }

      const location = `${finalLat},${finalLng}`

      const requests = types.map(type =>
        fetch(`/api/places?location=${location}&type=${type}&radius=5000`)
          .then(r => r.json())
      )

      const responses = await Promise.allSettled(requests)
      const seen = new Set()
      const all = []

      for (const result of responses) {
        if (result.status === 'fulfilled' && result.value.results) {
          for (const place of result.value.results) {
            if (!seen.has(place.place_id)) {
              seen.add(place.place_id)
              all.push(place)
            }
          }
        }
      }

      all.sort((a, b) => {
        const scoreA = (a.rating || 0) * Math.log10((a.user_ratings_total || 1) + 1)
        const scoreB = (b.rating || 0) * Math.log10((b.user_ratings_total || 1) + 1)
        return scoreB - scoreA
      })

      setPlaces(all.slice(0, 15))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getPhotoUrl = useCallback((photoReference) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!photoReference || !apiKey) return null
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`
  }, [])

  return { loading, error, places, search, getPhotoUrl }
}
