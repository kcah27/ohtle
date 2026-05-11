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

        // Parse virtual IDs (dayId__A or dayId__B)
        const parseId = id => { const p = id.split('__'); return { realId: p[0], section: p[1]||null } }
        const { realId: fromRealId } = parseId(fromDayId)
        const { realId: toRealId, section: toSection } = parseId(toDayId)
        const sameDayReal = fromRealId === toRealId

        const fromDay = itin.days.find(d => d.id === fromRealId)
        if (!fromDay) return itin
        const fromIdx = fromDay.places.findIndex(p => p.place_id === placeId)
        if (fromIdx === -1) return itin

        const toDay = itin.days.find(d => d.id === toRealId)
        if (!toDay) return itin

        // Find toIdx
        let toIdx
        if (targetPlaceId) {
          toIdx = toDay.places.findIndex(p => p.place_id === targetPlaceId)
          if (toIdx === -1) toIdx = toDay.places.length
        } else if (toSection === 'A') {
          toIdx = 0
        } else if (toSection === 'B') {
          toIdx = toDay.separatorIdx !== undefined ? toDay.separatorIdx : Math.ceil(toDay.places.length / 2)
        } else {
          toIdx = toDay.places.length
        }

        let moved = null
        const days = itin.days.map(day => {
          if (day.id !== fromRealId) return day
          const p = day.places.map(x => ({...x}))
          ;[moved] = p.splice(fromIdx, 1)

          if (sameDayReal) {
            const sepIdx = day.separatorIdx !== undefined ? day.separatorIdx : Math.ceil(day.places.length / 2)
            let finalIdx

            if (targetPlaceId) {
              const t = p.findIndex(x => x.place_id === targetPlaceId)
              finalIdx = t === -1 ? p.length : (toIdx > fromIdx ? t + 1 : t)
            } else if (toSection === 'B') {
              finalIdx = Math.max(fromIdx < sepIdx ? sepIdx - 1 : sepIdx, 0)
            } else if (toSection === 'A') {
              finalIdx = 0
            } else {
              finalIdx = p.length
            }

            p.splice(finalIdx, 0, moved)

            // Update separatorIdx when crossing sections
            let newSepIdx = sepIdx
            if (toSection === 'B' && fromIdx < sepIdx) newSepIdx = Math.max(0, sepIdx - 1)
            else if (toSection === 'A' && fromIdx >= sepIdx) newSepIdx = sepIdx + 1
            else if (!toSection) {
              if (fromIdx < sepIdx && finalIdx >= sepIdx) newSepIdx = Math.max(0, sepIdx - 1)
              else if (fromIdx >= sepIdx && finalIdx < sepIdx) newSepIdx = sepIdx + 1
            }

            return { ...day, places: p, separatorIdx: newSepIdx }
          }
          return { ...day, places: p }
        }).map(day => {
          if (day.id !== toRealId || sameDayReal) return day
          const p = day.places.map(x => ({...x}))
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
    const parseId = id => { const p = id.split('__'); return { realId: p[0] } }
    const { realId: fromRealId } = parseId(fromDayId)
    const { realId: toRealId } = parseId(toDayId)
    updateAndSave(itineraries, itineraryId, itin => {
      let movedEvent = null
      const days = itin.days.map(day => {
        if (day.id !== fromRealId) return day
        const events = [...(day.events||[])]
        const idx = events.findIndex(e => e.id === fromEventId)
        if (idx === -1) return day
        ;[movedEvent] = events.splice(idx, 1)
        return { ...day, events }
      }).map(day => {
        if (day.id !== toRealId || !movedEvent) return day
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
