import { useCallback, useState } from 'react'

const INTEREST_TYPES = {
  tourist_attraction: 'tourist_attraction',
  museum: 'museum',
  park: 'park',
  art_gallery: 'art_gallery',
  night_club: 'night_club',
  shopping_mall: 'shopping_mall',
}

const FOOD_KEYWORDS = {
  typical: 'restaurante comida tipica',
  seafood: 'mariscos restaurante',
  vegetarian: 'restaurante vegetariano',
  international: 'restaurante internacional',
  all: 'restaurante',
}

const COMPANY_WEIGHTS = {
  solo: { tourist_attraction: 1, museum: 1.5, park: 1.2, art_gallery: 1.3, night_club: 0.8, shopping_mall: 0.8 },
  couple: { tourist_attraction: 1.2, museum: 1, park: 1.3, art_gallery: 1.2, night_club: 1, shopping_mall: 0.8 },
  friends: { tourist_attraction: 1, museum: 0.8, park: 1, art_gallery: 0.8, night_club: 1.5, shopping_mall: 1 },
  family: { tourist_attraction: 1.3, museum: 1.2, park: 1.5, art_gallery: 0.8, night_club: 0, shopping_mall: 1 },
}

const RHYTHM_COUNT = { relaxed: 2, balanced: 3, intense: 5 }

export function useAutoItinerary() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const generate = useCallback(async ({ destination, startDate, endDate, rhythm, interests, food, company }) => {
    setGenerating(true)
    setError(null)

    try {
      // 1. Geocode destination
      const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(destination)}`)
      const geoData = await geoRes.json()
      if (geoData.status !== 'OK') throw new Error('No se encontró el destino')
      const { lat, lng } = geoData.results[0].geometry.location
      const location = `${lat},${lng}`

      const weights = COMPANY_WEIGHTS[company] || COMPANY_WEIGHTS.solo
      const placesPerDay = RHYTHM_COUNT[rhythm] || 3
      const start = new Date(startDate)
      const end = new Date(endDate)
      const dayCount = Math.round((end - start) / 86400000) + 1
      const totalNeeded = dayCount * placesPerDay

      // 2. Fetch places for each interest in parallel
      const fetches = interests.map(interest =>
        fetch(`/api/places?location=${location}&type=${INTEREST_TYPES[interest]}&radius=8000`)
          .then(r => r.json())
          .then(d => (d.results || []).map(p => ({ ...p, _interestType: interest, photoRef: p.photos?.[0]?.photo_reference || null })))
          .catch(() => [])
      )

      // 3. Fetch food
      const foodKeyword = FOOD_KEYWORDS[food] || 'restaurante'
      fetches.push(
        fetch(`/api/places?location=${location}&type=restaurant&radius=8000`)
          .then(r => r.json())
          .then(d => (d.results || []).map(p => ({ ...p, _interestType: 'restaurant', photoRef: p.photos?.[0]?.photo_reference || null })))
          .catch(() => [])
      )

      const results = await Promise.all(fetches)

      // 4. Merge, deduplicate, score
      const seen = new Set()
      const all = []
      for (const batch of results) {
        for (const place of batch) {
          if (seen.has(place.place_id)) continue
          seen.add(place.place_id)
          const weight = weights[place._interestType] ?? 1
          const score = (place.rating || 3.5) * Math.log10((place.user_ratings_total || 1) + 1) * weight
          all.push({ ...place, _score: score })
        }
      }

      all.sort((a, b) => b._score - a._score)

      // 5. Ensure restaurants are ~1 per day, rest are interests
      const restaurants = all.filter(p => p._interestType === 'restaurant')
      const attractions = all.filter(p => p._interestType !== 'restaurant')

      // Build pool: for each day slot, 1 restaurant + rest attractions
      const pool = []
      for (let d = 0; d < dayCount; d++) {
        const restaurant = restaurants[d]
        if (restaurant) pool.push(restaurant)
        const attractionSlots = placesPerDay - 1
        const startIdx = d * attractionSlots
        for (let i = startIdx; i < startIdx + attractionSlots && i < attractions.length; i++) {
          pool.push(attractions[i])
        }
      }

      // 6. Build days
      const days = Array.from({ length: dayCount }, (_, i) => {
        const date = new Date(start)
        date.setDate(start.getDate() + i)
        const dayPlaces = pool.slice(i * placesPerDay, (i + 1) * placesPerDay)
        return {
          id: `day-${Date.now()}-${i}`,
          dayNumber: i + 1,
          date: date.toISOString().split('T')[0],
          cityLabel: '',
          places: dayPlaces.map(p => ({
            place_id: p.place_id,
            name: p.name,
            types: p.types,
            vicinity: p.vicinity,
            rating: p.rating,
            user_ratings_total: p.user_ratings_total,
            photoRef: p.photoRef,
            addedAt: new Date().toISOString()
          }))
        }
      })

      setGenerating(false)
      return {
        id: Date.now().toString(),
        name: `Viaje a ${destination}`,
        destination,
        startDate,
        endDate,
        days,
        createdAt: new Date().toISOString(),
        auto: true
      }
    } catch (err) {
      setError(err.message)
      setGenerating(false)
      return null
    }
  }, [])

  return { generate, generating, error }
}
