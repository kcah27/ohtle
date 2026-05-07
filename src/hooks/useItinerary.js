import { useState, useCallback } from 'react'

const STORAGE_KEY = 'ohtle_itineraries'

function loadItineraries() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveItineraries(itineraries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(itineraries))
}

export function useItinerary() {
  const [itineraries, setItineraries] = useState(loadItineraries)
  const [activeItinerary, setActiveItinerary] = useState(null)

  const createItinerary = useCallback(({ name, destination, startDate, endDate }) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dayCount = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1

    const days = Array.from({ length: dayCount }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return {
        id: `day-${i}`,
        dayNumber: i + 1,
        date: date.toISOString().split('T')[0],
        places: []
      }
    })

    const newItinerary = {
      id: Date.now().toString(),
      name,
      destination,
      startDate,
      endDate,
      days,
      createdAt: new Date().toISOString()
    }

    const updated = [...itineraries, newItinerary]
    setItineraries(updated)
    saveItineraries(updated)
    setActiveItinerary(newItinerary)
    return newItinerary
  }, [itineraries])

  const addPlaceToDay = useCallback((itineraryId, dayId, place) => {
    const updated = itineraries.map(itin => {
      if (itin.id !== itineraryId) return itin
      return {
        ...itin,
        days: itin.days.map(day => {
          if (day.id !== dayId) return day
          const alreadyAdded = day.places.some(p => p.place_id === place.place_id)
          if (alreadyAdded) return day
          return {
            ...day,
            places: [...day.places, {
              place_id: place.place_id,
              name: place.name,
              types: place.types,
              vicinity: place.vicinity,
              rating: place.rating,
              user_ratings_total: place.user_ratings_total,
              opening_hours: place.opening_hours,
              addedAt: new Date().toISOString()
            }]
          }
        })
      }
    })
    setItineraries(updated)
    saveItineraries(updated)
    if (activeItinerary?.id === itineraryId) {
      setActiveItinerary(updated.find(i => i.id === itineraryId))
    }
  }, [itineraries, activeItinerary])

  const removePlaceFromDay = useCallback((itineraryId, dayId, placeId) => {
    const updated = itineraries.map(itin => {
      if (itin.id !== itineraryId) return itin
      return {
        ...itin,
        days: itin.days.map(day => {
          if (day.id !== dayId) return day
          return { ...day, places: day.places.filter(p => p.place_id !== placeId) }
        })
      }
    })
    setItineraries(updated)
    saveItineraries(updated)
    if (activeItinerary?.id === itineraryId) {
      setActiveItinerary(updated.find(i => i.id === itineraryId))
    }
  }, [itineraries, activeItinerary])

  const deleteItinerary = useCallback((itineraryId) => {
    const updated = itineraries.filter(i => i.id !== itineraryId)
    setItineraries(updated)
    saveItineraries(updated)
    if (activeItinerary?.id === itineraryId) setActiveItinerary(null)
  }, [itineraries, activeItinerary])

  const reorderPlace = useCallback((itineraryId, dayId, fromIdx, toIdx) => {
    const updated = itineraries.map(itin => {
      if (itin.id !== itineraryId) return itin
      return {
        ...itin,
        days: itin.days.map(day => {
          if (day.id !== dayId) return day
          const places = [...day.places]
          const [moved] = places.splice(fromIdx, 1)
          places.splice(toIdx, 0, moved)
          return { ...day, places }
        })
      }
    })
    setItineraries(updated)
    saveItineraries(updated)
    if (activeItinerary?.id === itineraryId) {
      setActiveItinerary(updated.find(i => i.id === itineraryId))
    }
  }, [itineraries, activeItinerary])

  return {
    itineraries,
    activeItinerary,
    setActiveItinerary,
    createItinerary,
    addPlaceToDay,
    removePlaceFromDay,
    deleteItinerary,
    reorderPlace
  }
}
