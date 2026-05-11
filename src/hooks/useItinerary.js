import { useState, useCallback } from 'react'
import { inferCategory } from '../utils/placeCategory'

const STORAGE_KEY = 'ohtle_itineraries'

function loadItineraries() {
  try { const data = localStorage.getItem(STORAGE_KEY); return data ? JSON.parse(data) : [] } catch { return [] }
}
function saveItineraries(its) { localStorage.setItem(STORAGE_KEY, JSON.stringify(its)) }

function updateAndSave(itineraries, itineraryId, updater, setItineraries, activeItinerary, setActiveItinerary) {
  const updated = itineraries.map(itin => itin.id !== itineraryId ? itin : updater(itin))
  setItineraries(updated); saveItineraries(updated)
  if (activeItinerary?.id === itineraryId) setActiveItinerary(updated.find(i => i.id === itineraryId))
  return updated
}

export function useItinerary() {
  const [itineraries, setItineraries] = useState(loadItineraries)
  const [activeItinerary, setActiveItinerary] = useState(null)

  const createItinerary = useCallback(({ name, destination, startDate, endDate, cities }) => {
    const start = new Date(startDate); const end = new Date(endDate)
    const dayCount = Math.round((end - start) / 86400000) + 1
    const days = Array.from({ length: dayCount }, (_, i) => {
      const date = new Date(start); date.setDate(start.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      let cityLabel = ''
      if (cities && cities.length > 0) {
        // Find all cities active on this date
        const activeCities = cities.filter((c, ci) => {
          const cStart = ci === 0 ? startDate : c.startDate
          const cEnd = c.endDate
          return cStart && cEnd && dateStr >= cStart && dateStr <= cEnd
        })
        if (activeCities.length >= 2) {
          // Transition day — show "City A → City B"
          cityLabel = activeCities.map(c => c.name).join(' → ')
        } else if (activeCities.length === 1) {
          cityLabel = activeCities[0].name
        }
      }
      return { id: `day-${Date.now()}-${i}`, dayNumber: i+1, date: dateStr, places:[], events:[], cityLabel }
    })
    const newItin = { id: Date.now().toString(), name, destination, startDate, endDate, days, status: 'progress', createdAt: new Date().toISOString() }
    const updated = [...itineraries, newItin]; setItineraries(updated); saveItineraries(updated); setActiveItinerary(newItin)
    return newItin
  }, [itineraries])

  const addPlaceToDay = useCallback((itineraryId, dayId, place) => {
    updateAndSave(itineraries, itineraryId, itin => ({
      ...itin, days: itin.days.map(day => {
        if (day.id !== dayId) return day
        if (day.places.some(p => p.place_id === place.place_id)) return day
        return { ...day, places: [...day.places, { place_id:place.place_id, name:place.name, types:place.types, vicinity:place.vicinity, rating:place.rating, user_ratings_total:place.user_ratings_total, photoRef:place.photoRef||null, category: place.category || inferCategory(place.types), time:'', duration:'', note:'', addedAt:new Date().toISOString() }] }
      })
    }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const removePlaceFromDay = useCallback((itineraryId, dayId, placeId) => {
    updateAndSave(itineraries, itineraryId, itin => ({ ...itin, days: itin.days.map(day => day.id!==dayId ? day : {...day, places:day.places.filter(p=>p.place_id!==placeId)}) }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const updatePlace = useCallback((itineraryId, dayId, placeId, updates) => {
    updateAndSave(itineraries, itineraryId, itin => ({ ...itin, days: itin.days.map(day => day.id!==dayId ? day : {...day, places:day.places.map(p=>p.place_id!==placeId?p:{...p,...updates})}) }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const movePlace = useCallback((itineraryId, fromDayId, placeId, toDayId, targetPlaceId) => {
    setItineraries(current => {
      const updated = current.map(itin => {
        if (itin.id !== itineraryId) return itin
        let moved = null
        // Find fromIdx from CURRENT state
        const fromDay = itin.days.find(d => d.id === fromDayId)
        if (!fromDay) return itin
        const fromIdx = fromDay.places.findIndex(p => p.place_id === placeId)
        if (fromIdx === -1) return itin

        // Find toIdx from CURRENT state
        const toDay = itin.days.find(d => d.id === toDayId)
        if (!toDay) return itin
        let toIdx
        if (!targetPlaceId) {
          toIdx = toDay.places.length
        } else {
          toIdx = toDay.places.findIndex(p => p.place_id === targetPlaceId)
          if (toIdx === -1) toIdx = toDay.places.length
        }

        console.log('MOVE FRESH', { fromIdx, toIdx, placeId: placeId?.slice(-6), targetPlaceId: targetPlaceId?.slice(-6), before: fromDay.places.map(p=>p.name?.slice(0,8)) })

        const days = itin.days.map(day => {
          if (day.id !== fromDayId) return day
          const p = [...day.places]
          ;[moved] = p.splice(fromIdx, 1)
          if (fromDayId === toDayId) {
            const insertAt = toIdx
            p.splice(insertAt, 0, moved)
            // Update separatorIdx if place crossed the separator
            let newSepIdx = day.separatorIdx
            if (newSepIdx !== undefined) {
              if (fromIdx < newSepIdx && insertAt >= newSepIdx - 1) newSepIdx-- // moved from above to below sep
              else if (fromIdx >= newSepIdx && insertAt < newSepIdx) newSepIdx++ // moved from below to above sep
            }
            console.log('SPLICE FRESH', { before: fromDay.places.map(p=>p.name?.slice(0,8)), after: p.map(p=>p.name?.slice(0,8)), fromIdx, insertAt, newSepIdx })
            return { ...day, places: p, separatorIdx: newSepIdx }
          }
          return { ...day, places: p }
        }).map(day => {
          if (day.id !== toDayId || fromDayId === toDayId) return day
          const p = [...day.places]
          if (!p.some(x => x.place_id === moved?.place_id)) {
            p.splice(toIdx, 0, moved)
          }
          return { ...day, places: p }
        })
        return { ...itin, days }
      })
      saveItineraries(updated)
      return updated
    })
  }, [])

  const moveEvent = useCallback((itineraryId, fromDayId, fromEventId, toDayId, toIdx) => {
    updateAndSave(itineraries, itineraryId, itin => {
      let movedEvent = null
      const days = itin.days.map(day => {
        if (day.id !== fromDayId) return day
        const events = [...(day.events||[])]
        const idx = events.findIndex(e => e.id === fromEventId)
        if (idx === -1) return day
        ;[movedEvent] = events.splice(idx, 1)
        return { ...day, events }
      }).map(day => {
        if (day.id !== toDayId || !movedEvent) return day
        const events = [...(day.events||[])]
        if (!events.some(e => e.id === movedEvent.id)) {
          events.splice(toIdx === 9999 ? events.length : toIdx, 0, movedEvent)
        }
        return { ...day, events }
      })
      return { ...itin, days }
    }, setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const addEvent = useCallback((itineraryId, dayId, event) => {
    updateAndSave(itineraries, itineraryId, itin => ({ ...itin, days: itin.days.map(day => day.id!==dayId ? day : {...day, events:[...(day.events||[]), {id:`evt-${Date.now()}`,...event}]}) }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const updateEvent = useCallback((itineraryId, dayId, eventId, updates) => {
    updateAndSave(itineraries, itineraryId, itin => ({ ...itin, days: itin.days.map(day => day.id!==dayId ? day : {...day, events:(day.events||[]).map(e=>e.id!==eventId?e:{...e,...updates})}) }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const removeEvent = useCallback((itineraryId, dayId, eventId) => {
    updateAndSave(itineraries, itineraryId, itin => ({ ...itin, days: itin.days.map(day => day.id!==dayId ? day : {...day, events:(day.events||[]).filter(e=>e.id!==eventId)}) }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const updateDayLabel = useCallback((itineraryId, dayId, cityLabel) => {
    updateAndSave(itineraries, itineraryId, itin => ({ ...itin, days: itin.days.map(day => day.id!==dayId ? day : {...day,cityLabel}) }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const updateSeparatorIdx = useCallback((itineraryId, dayId, separatorIdx) => {
    updateAndSave(itineraries, itineraryId, itin => ({ ...itin, days: itin.days.map(day => day.id!==dayId ? day : {...day,separatorIdx}) }), setItineraries, activeItinerary, setActiveItinerary)
  }, [itineraries, activeItinerary])

  const updateStatus = useCallback((itineraryId, status) => {
    const updated = itineraries.map(i => i.id !== itineraryId ? i : { ...i, status })
    setItineraries(updated); saveItineraries(updated)
    if (activeItinerary?.id === itineraryId) setActiveItinerary(updated.find(i => i.id === itineraryId))
  }, [itineraries, activeItinerary])

  const deleteItinerary = useCallback((itineraryId) => {
    const updated = itineraries.filter(i=>i.id!==itineraryId); setItineraries(updated); saveItineraries(updated)
    if(activeItinerary?.id===itineraryId) setActiveItinerary(null)
  }, [itineraries, activeItinerary])

  return { itineraries, activeItinerary, setActiveItinerary, createItinerary, addPlaceToDay, removePlaceFromDay, updatePlace, movePlace, addEvent, updateEvent, moveEvent, removeEvent, updateDayLabel, updateSeparatorIdx, updateStatus, deleteItinerary }
}
