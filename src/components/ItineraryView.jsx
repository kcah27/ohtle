import React, { useState, useRef } from 'react'
import styles from './ItineraryView.module.css'

const TYPE_MAP = {
  tourist_attraction: 'Atracción',
  restaurant: 'Restaurante',
  lodging: 'Hospedaje',
  museum: 'Museo',
  park: 'Naturaleza',
  store: 'Artesanías',
  food: 'Gastronomía',
}

const TYPE_EMOJI = {
  tourist_attraction: '🏛',
  restaurant: '🍽',
  lodging: '🏡',
  museum: '🏺',
  park: '🌿',
  store: '🧵',
  food: '🥘',
}

function getEmoji(types) {
  for (const t of (types || [])) {
    if (TYPE_EMOJI[t]) return TYPE_EMOJI[t]
  }
  return '📍'
}

function getLabel(types) {
  for (const t of (types || [])) {
    if (TYPE_MAP[t]) return TYPE_MAP[t]
  }
  return 'Lugar'
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

function getPhotoUrl(place) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
  if (place.photoRef && apiKey) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${place.photoRef}&key=${apiKey}`
  }
  return null
}

function DaySection({ day, itineraryId, onRemovePlace, onReorder }) {
  const dragIdx = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  const handleDragStart = (idx) => { dragIdx.current = idx }
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOver(idx) }
  const handleDrop = (idx) => {
    if (dragIdx.current === null || dragIdx.current === idx) { setDragOver(null); return }
    onReorder(day.id, dragIdx.current, idx)
    dragIdx.current = null
    setDragOver(null)
  }
  const handleDragEnd = () => { dragIdx.current = null; setDragOver(null) }

  return (
    <div className={styles.places}>
      {day.places.map((place, idx) => {
        const photoUrl = getPhotoUrl(place)
        return (
          <div
            key={place.place_id}
            className={`${styles.placeRow} ${dragOver === idx ? styles.dragOver : ''}`}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.dragHandle} title="Arrastra para reordenar">⠿</div>
            <div className={styles.placeIndex}>{idx + 1}</div>
            {photoUrl ? (
              <img
                className={styles.placePhoto}
                src={photoUrl}
                alt={place.name}
                onError={e => { e.target.style.display = 'none' }}
              />
            ) : (
              <div className={styles.placeEmoji}>{getEmoji(place.types)}</div>
            )}
            <div className={styles.placeInfo}>
              <div className={styles.placeName}>{place.name}</div>
              <div className={styles.placeMeta}>
                <span className={styles.placeType}>{getLabel(place.types)}</span>
                {place.rating && <span className={styles.placeRating}>★ {place.rating}</span>}
                {place.vicinity && <span className={styles.placeAddr}>{place.vicinity}</span>}
              </div>
            </div>
            <button
              className={styles.removeBtn}
              onClick={() => onRemovePlace(itineraryId, day.id, place.place_id)}
              title="Quitar"
            >✕</button>
          </div>
        )
      })}
    </div>
  )
}

export default function ItineraryView({ itinerary, onBack, onRemovePlace, onDelete, onReorder }) {
  const totalPlaces = itinerary.days.reduce((acc, d) => acc + d.places.length, 0)

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>← Volver</button>
        <button className={styles.deleteBtn} onClick={() => {
          if (confirm('¿Eliminar este itinerario?')) onDelete(itinerary.id)
        }}>🗑 Eliminar</button>
      </div>

      <div className={styles.heroCard}>
        <div className={styles.heroEmoji}>🗺️</div>
        <div className={styles.heroInfo}>
          <h1 className={styles.heroTitle}>{itinerary.name}</h1>
          <div className={styles.heroMeta}>
            <span>📍 {itinerary.destination}</span>
            <span>📅 {formatDateShort(itinerary.startDate)} → {formatDateShort(itinerary.endDate)}</span>
            <span>🏛 {totalPlaces} lugares</span>
          </div>
        </div>
      </div>

      <div className={styles.days}>
        {itinerary.days.map(day => (
          <div key={day.id} className={styles.daySection}>
            <div className={styles.dayHeader}>
              <span className={styles.dayNum}>Día {day.dayNumber}</span>
              <span className={styles.dayDate}>{formatDate(day.date)}</span>
              <span className={styles.dayCount}>{day.places.length} lugares</span>
            </div>

            {day.places.length === 0 ? (
              <div className={styles.emptyDay}>Sin lugares aún — búscalos y agrégalos aquí</div>
            ) : (
              <DaySection
                day={day}
                itineraryId={itinerary.id}
                onRemovePlace={onRemovePlace}
                onReorder={onReorder}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
