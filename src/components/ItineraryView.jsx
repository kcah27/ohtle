import React, { useState, useRef } from 'react'
import styles from './ItineraryView.module.css'

const TYPE_MAP = { tourist_attraction:'Atracción', restaurant:'Restaurante', lodging:'Hospedaje', museum:'Museo', park:'Naturaleza', store:'Artesanías', food:'Gastronomía' }
const TYPE_EMOJI = { tourist_attraction:'🏛', restaurant:'🍽', lodging:'🏡', museum:'🏺', park:'🌿', store:'🧵', food:'🥘' }

function getEmoji(types) { for (const t of (types||[])) if (TYPE_EMOJI[t]) return TYPE_EMOJI[t]; return '📍' }
function getLabel(types) { for (const t of (types||[])) if (TYPE_MAP[t]) return TYPE_MAP[t]; return 'Lugar' }

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })
}
function formatDateShort(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}
function getPhotoUrl(place) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
  if (place.photoRef && apiKey) return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${place.photoRef}&key=${apiKey}`
  return null
}

// ---- Editable city label ----
function CityLabel({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const inputRef = useRef(null)

  const startEdit = () => { setDraft(value || ''); setEditing(true); setTimeout(() => inputRef.current?.focus(), 50) }
  const commit = () => { setEditing(false); onChange(draft.trim()) }
  const handleKey = e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={styles.cityInput}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        placeholder="ej. Osaka, Kyoto..."
        maxLength={40}
      />
    )
  }

  return value ? (
    <div className={styles.cityLabelDisplay} onClick={startEdit} title="Click para editar">
      {value} <span className={styles.editHint}>✎</span>
    </div>
  ) : (
    <button className={styles.addCityBtn} onClick={startEdit}>+ Ciudad/etapa</button>
  )
}

// ---- Drag state shared across all days ----
let globalDrag = null

function PlaceRow({ place, idx, dayId, itineraryId, onRemove, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver }) {
  const photoUrl = getPhotoUrl(place)
  return (
    <div
      className={`${styles.placeRow} ${isDragOver ? styles.dragOver : ''}`}
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(dayId, idx) }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(dayId, idx) }}
      onDrop={e => { e.preventDefault(); onDrop(dayId, idx) }}
      onDragEnd={onDragEnd}
    >
      <div className={styles.dragHandle}>⠿</div>
      <div className={styles.placeIndex}>{idx + 1}</div>
      {photoUrl
        ? <img className={styles.placePhoto} src={photoUrl} alt={place.name} onError={e => e.target.style.display='none'} />
        : <div className={styles.placeEmoji}>{getEmoji(place.types)}</div>
      }
      <div className={styles.placeInfo}>
        <div className={styles.placeName}>{place.name}</div>
        <div className={styles.placeMeta}>
          <span className={styles.placeType}>{getLabel(place.types)}</span>
          {place.rating && <span className={styles.placeRating}>★ {place.rating}</span>}
          {place.vicinity && <span className={styles.placeAddr}>{place.vicinity}</span>}
        </div>
      </div>
      <button className={styles.removeBtn} onClick={() => onRemove(itineraryId, dayId, place.place_id)}>✕</button>
    </div>
  )
}

export default function ItineraryView({ itinerary, onBack, onRemovePlace, onDelete, onMove, onUpdateDayLabel }) {
  const [dragOver, setDragOver] = useState(null) // { dayId, idx }

  const totalPlaces = itinerary.days.reduce((acc, d) => acc + d.places.length, 0)

  const handleDragStart = (dayId, idx) => { globalDrag = { dayId, idx } }
  const handleDragOver = (dayId, idx) => { setDragOver({ dayId, idx }) }
  const handleDrop = (toDayId, toIdx) => {
    if (!globalDrag) return
    const { dayId: fromDayId, idx: fromIdx } = globalDrag
    onMove(itinerary.id, fromDayId, fromIdx, toDayId, toIdx)
    globalDrag = null
    setDragOver(null)
  }
  const handleDragEnd = () => { globalDrag = null; setDragOver(null) }

  // Drop zone at end of a day (empty or after last item)
  const handleDropOnDay = (e, dayId) => {
    e.preventDefault()
    if (!globalDrag) return
    const day = itinerary.days.find(d => d.id === dayId)
    handleDrop(dayId, day ? day.places.length : 0)
  }

  // Group consecutive days with same cityLabel for section headers
  const sections = []
  let currentCity = null
  itinerary.days.forEach(day => {
    const label = day.cityLabel || ''
    if (label !== currentCity) {
      currentCity = label
      if (label) sections.push({ type: 'city', label, dayId: day.id })
    }
    sections.push({ type: 'day', day })
  })

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>← Volver</button>
        <button className={styles.deleteBtn} onClick={() => { if (confirm('¿Eliminar este itinerario?')) onDelete(itinerary.id) }}>🗑 Eliminar</button>
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
        {sections.map((section, sIdx) => {
          if (section.type === 'city') {
            return (
              <div key={`city-${sIdx}`} className={styles.cityHeader}>
                {section.label}
              </div>
            )
          }

          const { day } = section
          const prevSection = sections[sIdx - 1]
          const showCityEdit = !prevSection || prevSection.type !== 'city' || prevSection.dayId !== day.id

          return (
            <div key={day.id} className={styles.daySection}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDropOnDay(e, day.id)}
            >
              <div className={styles.dayHeader}>
                <span className={styles.dayNum}>Día {day.dayNumber}</span>
                <span className={styles.dayDate}>{formatDate(day.date)}</span>
                <div className={styles.dayHeaderRight}>
                  <CityLabel
                    value={day.cityLabel}
                    onChange={label => onUpdateDayLabel(itinerary.id, day.id, label)}
                  />
                  <span className={styles.dayCount}>{day.places.length} lugares</span>
                </div>
              </div>

              {day.places.length === 0 ? (
                <div className={styles.emptyDay}>Sin lugares — arrastra aquí o búscalos abajo</div>
              ) : (
                <div className={styles.places}>
                  {day.places.map((place, idx) => (
                    <PlaceRow
                      key={place.place_id}
                      place={place}
                      idx={idx}
                      dayId={day.id}
                      itineraryId={itinerary.id}
                      onRemove={onRemovePlace}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      isDragOver={dragOver?.dayId === day.id && dragOver?.idx === idx}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
