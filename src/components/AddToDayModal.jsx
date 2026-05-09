import React, { useState } from 'react'
import styles from './AddToDayModal.module.css'

const TYPE_EMOJI = { tourist_attraction:'🏛', restaurant:'🍽', lodging:'🏡', museum:'🏺', park:'🌿', store:'🧵', food:'🥘' }
function getEmoji(types) { for (const t of (types||[])) if (TYPE_EMOJI[t]) return TYPE_EMOJI[t]; return '📍' }
function formatDate(d) { return new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',month:'short',day:'numeric'}) }
function formatDateShort(d) { return new Date(d+'T12:00:00').toLocaleDateString('es-MX',{month:'short',day:'numeric'}) }

export default function AddToDayModal({ place, itineraries, activeItinerary, onAdd, onClose }) {
  const [selectedItinerary, setSelectedItinerary] = useState(
    itineraries.length === 1 ? itineraries[0] : activeItinerary
  )
  const showItineraryPicker = itineraries.length > 1 && !selectedItinerary

  const handleSelectItinerary = (itin) => setSelectedItinerary(itin)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.placeInfo}>
            <span className={styles.emoji}>{getEmoji(place.types)}</span>
            <div>
              <div className={styles.placeName}>{place.name}</div>
              <div className={styles.placeAddr}>{place.vicinity}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Step 1 — Pick itinerary if multiple */}
        {!selectedItinerary && (
          <>
            <div className={styles.subtitle}>¿A qué itinerario lo agregas?</div>
            <div className={styles.days}>
              {itineraries.map(itin => (
                <button key={itin.id} className={styles.itinBtn} onClick={() => handleSelectItinerary(itin)}>
                  <span className={styles.itinEmoji}>🗺️</span>
                  <div className={styles.itinInfo}>
                    <div className={styles.itinName}>{itin.name}</div>
                    <div className={styles.itinMeta}>{formatDateShort(itin.startDate)} → {formatDateShort(itin.endDate)}</div>
                  </div>
                  <span className={styles.arrow}>→</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2 — Pick day */}
        {selectedItinerary && (
          <>
            <div className={styles.subtitle}>
              {itineraries.length > 1 && (
                <button className={styles.backToItin} onClick={() => setSelectedItinerary(null)}>← {selectedItinerary.name}</button>
              )}
              {itineraries.length === 1 && '¿A qué día lo agregas?'}
            </div>
            <div className={styles.days}>
              {selectedItinerary.days.map(day => {
                const alreadyAdded = day.places.some(p => p.place_id === place.place_id)
                return (
                  <button key={day.id} className={`${styles.dayBtn} ${alreadyAdded ? styles.added : ''}`}
                    onClick={() => !alreadyAdded && onAdd(selectedItinerary.id, day.id, place)} disabled={alreadyAdded}>
                    <div className={styles.dayTop}>
                      <span className={styles.dayNum}>Día {day.dayNumber}</span>
                      <span className={styles.dayDate}>{formatDate(day.date)}</span>
                      {alreadyAdded ? <span className={styles.addedTag}>✓</span> : <span className={styles.addTag}>+ Agregar</span>}
                    </div>
                    {day.places.length > 0 && (
                      <div className={styles.dayPlaces}>
                        {day.places.slice(0,3).map(p => (
                          <span key={p.place_id} className={styles.miniPlace}>{getEmoji(p.types)} {p.name}</span>
                        ))}
                        {day.places.length > 3 && <span className={styles.morePlaces}>+{day.places.length-3} más</span>}
                      </div>
                    )}
                    {day.places.length === 0 && <div className={styles.emptyDay}>Sin lugares aún</div>}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
