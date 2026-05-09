import { useState, useCallback } from 'react'

const STORAGE_KEY = 'ohtle_itineraries'

function loadItineraries() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

function saveItineraries(itineraries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(itineraries))
}

function updateAndSave(itineraries, itineraryId, updater, setItineraries, activeItinerary, setActiveItinerary) {
  const updated = itineraries.map(itin => itin.id !== itineraryId ? itin : updater(itin))
  setItineraries(updated)
  saveItineraries(updated)
  if (activeItinerary?.id === itineraryId) setActiveItinerary(updated.find(i => i.id === itineraryId))
  return updated
}

export function useItinerary() {
  const [itineraries, setItineraries] = useState(loadItineraries)
  const [activeItinerary, setActiveItinerary] = useState(null)

  const createItinerary = useCallback(({ name, destination, startDate, endDate }) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dayCount = Math.round((end - start) / 86400000) + 1
    const days = Array.from({ length: dayCount }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return { id: `day-${Date.now()}-${i}`, dayNumber: i + 1, date: date.toISOString().split('T')[0], places: [], events: [], cityLabel: '' }
    })
    const newItinerary = { id: Date.now().toString(), name, destination, startDate, endDate, days, createdAt: new Date().toISOString() }
    const updated = [...itineraries, newItinerary]
    setItineraries(updated)
    saveItineraries(updated)
    setActiveItinerary(newItinerary)
    return newItinerary
  }, [itineraries])

  const addPlaceToDay = useCallback((itineraryId, dayId, place) => {
    updateAndSave(itineraries, itineraryId, itin => ({
      ...itin,
      days: itin.days.map(day => {
        if (day.id !== dayId) return day
        if (day.places.some(p => p.place_id === place.place_id)) return day
        return { ...day, places: [...day.places, {
          place_id: place.place_id, name: place.name, types: place.types,
          vicinity: place.vicinity, rating: place.rating, user_ratings_total: place.user_ratings_total,
          photoRef: place.photoRef || null, category: place.category || 'attraction',
          time: '', duration: '', note: '', addedAt: new Date().toISOString()
        }]}
      })
    }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const removePlaceFromDay = useCallback((itineraryId, dayId, placeId) => {
    updateAndSave(itineraries, itineraryId, itin => ({
      ...itin,
      days: itin.days.map(day => day.id !== dayId ? day : { ...day, places: day.places.filter(p => p.place_id !== placeId) })
    }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const updatePlace = useCallback((itineraryId, dayId, placeId, updates) => {
    updateAndSave(itineraries, itineraryId, itin => ({
      ...itin,
      days: itin.days.map(day => day.id !== dayId ? day : {
        ...day, places: day.places.map(p => p.place_id !== placeId ? p : { ...p, ...updates })
      })
    }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const movePlace = useCallback((itineraryId, fromDayId, fromIdx, toDayId, toIdx) => {
    updateAndSave(itineraries, itineraryId, itin => {
      let movedPlace = null
      const days = itin.days.map(day => {
        if (day.id !== fromDayId) return day
        const places = [...day.places]
        ;[movedPlace] = places.splice(fromIdx, 1)
        return { ...day, places }
      }).map(day => {
        if (day.id !== toDayId) return day
        const places = [...day.places]
        if (fromDayId === toDayId) { places.splice(toIdx, 0, movedPlace); return { ...day, places } }
        if (!places.some(p => p.place_id === movedPlace.place_id)) places.splice(toIdx === 9999 ? places.length : toIdx, 0, movedPlace)
        return { ...day, places }
      })
      return { ...itin, days }
    }, setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  // Special events (flight, transfer, reminder, etc.)
  const addEvent = useCallback((itineraryId, dayId, event) => {
    updateAndSave(itineraries, itineraryId, itin => ({
      ...itin,
      days: itin.days.map(day => day.id !== dayId ? day : {
        ...day, events: [...(day.events || []), { id: `evt-${Date.now()}`, ...event }]
      })
    }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const removeEvent = useCallback((itineraryId, dayId, eventId) => {
    updateAndSave(itineraries, itineraryId, itin => ({
      ...itin,
      days: itin.days.map(day => day.id !== dayId ? day : {
        ...day, events: (day.events || []).filter(e => e.id !== eventId)
      })
    }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const updateDayLabel = useCallback((itineraryId, dayId, cityLabel) => {
    updateAndSave(itineraries, itineraryId, itin => ({
      ...itin, days: itin.days.map(day => day.id !== dayId ? day : { ...day, cityLabel })
    }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const deleteItinerary = useCallback((itineraryId) => {
    const updated = itineraries.filter(i => i.id !== itineraryId)
    setItineraries(updated)
    saveItineraries(updated)
    if (activeItinerary?.id === itineraryId) setActiveItinerary(null)
  }, [itineraries, activeItinerary])

  return { itineraries, activeItinerary, setActiveItinerary, createItinerary, addPlaceToDay, removePlaceFromDay, updatePlace, movePlace, addEvent, removeEvent, updateDayLabel, deleteItinerary }
}
