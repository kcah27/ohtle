import React from 'react'
import styles from './AddToDayModal.module.css'

const TYPE_EMOJI = {
  tourist_attraction: '🏛',
  restaurant: '🍽',
  lodging: '🏡',
  museum: '🏺',
  park: '🌿',
  store: '🧵',
  food: '🥘',
  natural_feature: '⛰️',
}

function getEmoji(types) {
  for (const t of (types || [])) {
    if (TYPE_EMOJI[t]) return TYPE_EMOJI[t]
  }
  return '📍'
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function AddToDayModal({ place, itinerary, onAdd, onClose }) {
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

        <div className={styles.subtitle}>¿A qué día lo agregas?</div>

        <div className={styles.days}>
          {itinerary.days.map(day => {
            const alreadyAdded = day.places.some(p => p.place_id === place.place_id)
            return (
              <button
                key={day.id}
                className={`${styles.dayBtn} ${alreadyAdded ? styles.added : ''}`}
                onClick={() => !alreadyAdded && onAdd(day.id)}
                disabled={alreadyAdded}
              >
                <div className={styles.dayTop}>
                  <span className={styles.dayNum}>Día {day.dayNumber}</span>
                  <span className={styles.dayDate}>{formatDate(day.date)}</span>
                  {alreadyAdded
                    ? <span className={styles.addedTag}>✓ Agregado</span>
                    : <span className={styles.addTag}>+ Agregar</span>
                  }
                </div>
                {day.places.length > 0 && (
                  <div className={styles.dayPlaces}>
                    {day.places.slice(0, 3).map(p => (
                      <span key={p.place_id} className={styles.miniPlace}>
                        {getEmoji(p.types)} {p.name}
                      </span>
                    ))}
                    {day.places.length > 3 && (
                      <span className={styles.morePlaces}>+{day.places.length - 3} más</span>
                    )}
                  </div>
                )}
                {day.places.length === 0 && (
                  <div className={styles.emptyDay}>Sin lugares aún</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
