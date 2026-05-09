import { useCallback, useState } from 'react'

const INTEREST_TYPES = {
  tourist_attraction: 'tourist_attraction',
  museum: 'museum',
  park: 'park',
  art_gallery: 'art_gallery',
  night_club: 'night_club',
  shopping_mall: 'shopping_mall',
}

const COMPANY_WEIGHTS = {
  solo:    { tourist_attraction:1, museum:1.5, park:1.2, art_gallery:1.3, night_club:0.8, shopping_mall:0.8 },
  couple:  { tourist_attraction:1.2, museum:1, park:1.3, art_gallery:1.2, night_club:1, shopping_mall:0.8 },
  friends: { tourist_attraction:1, museum:0.8, park:1, art_gallery:0.8, night_club:1.5, shopping_mall:1 },
  family:  { tourist_attraction:1.3, museum:1.2, park:1.5, art_gallery:0.8, night_club:0, shopping_mall:1 },
}

const RHYTHM_COUNT = { relaxed: 2, balanced: 3, intense: 5 }

const MEAL_SLOTS = [
  { slot: 'breakfast', label: 'Desayuno', icon: '🍳', mealTime: 'breakfast' },
  { slot: 'lunch',     label: 'Comida',   icon: '🍽', mealTime: 'lunch' },
  { slot: 'dinner',    label: 'Cena',     icon: '🌮', mealTime: 'dinner' },
]

async function geocode(destination) {
  const res = await fetch(`/api/geocode?address=${encodeURIComponent(destination)}`)
  const data = await res.json()
  if (data.status !== 'OK') throw new Error('No se encontró: ' + destination)
  const { lat, lng } = data.results[0].geometry.location
  return { lat, lng }
}

async function fetchPlaces(location, type, radius = 8000) {
  const res = await fetch(`/api/places?location=${location}&type=${type}&radius=${radius}`)
  const data = await res.json()
  return data.results || []
}

function scorePlaces(places, weights, interestType) {
  return places.map(p => {
    const weight = weights[interestType] ?? 1
    const score = (p.rating || 3.5) * Math.log10((p.user_ratings_total || 1) + 1) * weight
    return { ...p, _interestType: interestType, _score: score, photoRef: p.photos?.[0]?.photo_reference || null }
  })
}

function toPlaceRecord(p, category) {
  return {
    place_id: p.place_id,
    name: p.name,
    types: p.types,
    vicinity: p.vicinity,
    rating: p.rating,
    user_ratings_total: p.user_ratings_total,
    photoRef: p.photoRef || null,
    category, // 'lodging' | 'breakfast' | 'lunch' | 'dinner' | 'attraction'
    addedAt: new Date().toISOString()
  }
}

async function buildDaysForCity({ cityName, dayCount, dayOffset, startDate, rhythm, interests, food, company, weights, attractionsPerDay, seen }) {
  const { lat, lng } = await geocode(cityName)
  const location = `${lat},${lng}`

  // Fetch lodging
  const lodgingRaw = await fetchPlaces(location, 'lodging')
  const lodging = lodgingRaw.filter(p => !seen.has(p.place_id)).slice(0, 3)
  lodging.forEach(p => seen.add(p.place_id))

  // Fetch restaurants
  const restaurantsRaw = await fetchPlaces(location, 'restaurant')
  const restaurants = restaurantsRaw
    .filter(p => !seen.has(p.place_id))
    .map(p => ({ ...p, photoRef: p.photos?.[0]?.photo_reference || null }))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
  restaurants.forEach(p => seen.add(p.place_id))

  // Fetch attractions
  const attractionFetches = interests.map(interest =>
    fetchPlaces(location, INTEREST_TYPES[interest])
      .then(results => scorePlaces(results.filter(p => !seen.has(p.place_id)), weights, interest))
      .catch(() => [])
  )
  const attractionBatches = await Promise.all(attractionFetches)
  const attractionsAll = []
  const attractionSeen = new Set()
  for (const batch of attractionBatches) {
    for (const p of batch.sort((a,b) => b._score - a._score)) {
      if (!attractionSeen.has(p.place_id) && !seen.has(p.place_id)) {
        attractionSeen.add(p.place_id)
        attractionsAll.push(p)
      }
    }
  }
  attractionsAll.sort((a,b) => b._score - a._score)
  attractionsAll.forEach(p => seen.add(p.place_id))

  // Pick hotel — 1 per city
  const hotel = lodging[0]

  // Build days
  const days = []
  let restaurantIdx = 0
  let attractionIdx = 0

  for (let d = 0; d < dayCount; d++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + dayOffset + d)

    const places = []

    // 1. Lodging (every day)
    if (hotel) places.push(toPlaceRecord(hotel, 'lodging'))

    // 2. Breakfast
    const breakfast = restaurants[restaurantIdx++]
    if (breakfast) places.push(toPlaceRecord(breakfast, 'breakfast'))

    // 3. Attractions
    for (let a = 0; a < attractionsPerDay; a++) {
      const attraction = attractionsAll[attractionIdx++]
      if (attraction) places.push(toPlaceRecord(attraction, 'attraction'))
    }

    // 4. Lunch
    const lunch = restaurants[restaurantIdx++]
    if (lunch) places.push(toPlaceRecord(lunch, 'lunch'))

    // 5. Dinner
    const dinner = restaurants[restaurantIdx++]
    if (dinner) places.push(toPlaceRecord(dinner, 'dinner'))

    days.push({
      id: `day-${Date.now()}-${dayOffset + d}`,
      dayNumber: dayOffset + d + 1,
      date: date.toISOString().split('T')[0],
      cityLabel: dayCount > 1 || cityName ? cityName : '',
      places
    })
  }

  return days
}

export function useAutoItinerary() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const generate = useCallback(async ({ destination, startDate, endDate, rhythm, interests, food, company, cities, isGeneric }) => {
    setGenerating(true)
    setError(null)

    try {
      const weights = COMPANY_WEIGHTS[company] || COMPANY_WEIGHTS.solo
      const attractionsPerDay = RHYTHM_COUNT[rhythm] || 3
      const start = new Date(startDate)
      const end = new Date(endDate)
      const totalDays = Math.round((end - start) / 86400000) + 1
      const seen = new Set()

      let allDays = []

      if (isGeneric && cities && cities.length > 0) {
        // Multi-city: build days per city
        let dayOffset = 0
        for (const city of cities) {
          const cityDays = await buildDaysForCity({
            cityName: city.name, dayCount: city.days, dayOffset,
            startDate: start, rhythm, interests, food, company, weights, attractionsPerDay, seen
          })
          allDays = [...allDays, ...cityDays]
          dayOffset += city.days
        }
      } else {
        // Single city/specific destination
        const cityDays = await buildDaysForCity({
          cityName: destination, dayCount: totalDays, dayOffset: 0,
          startDate: start, rhythm, interests, food, company, weights, attractionsPerDay, seen
        })
        allDays = cityDays
        // Clear city label for single destination (already set as destination name in header)
        allDays = allDays.map(d => ({ ...d, cityLabel: '' }))
      }

      setGenerating(false)
      return {
        id: Date.now().toString(),
        name: `Viaje a ${destination}`,
        destination,
        startDate,
        endDate,
        days: allDays,
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
