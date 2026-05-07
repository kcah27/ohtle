import React, { useState, useRef, useCallback } from 'react'
import styles from './ItineraryView.module.css'

const TYPE_MAP = { tourist_attraction:'Atracción', restaurant:'Restaurante', lodging:'Hospedaje', museum:'Museo', park:'Naturaleza', store:'Artesanías', food:'Gastronomía', art_gallery:'Arte', night_club:'Vida nocturna', shopping_mall:'Mercado' }
const TYPE_EMOJI = { tourist_attraction:'🏛', restaurant:'🍽', lodging:'🏡', museum:'🏺', park:'🌿', store:'🧵', food:'🥘', art_gallery:'🎨', night_club:'🌙', shopping_mall:'🎪' }

function getEmoji(types) { for (const t of (types||[])) if (TYPE_EMOJI[t]) return TYPE_EMOJI[t]; return '📍' }
function getLabel(types) { for (const t of (types||[])) if (TYPE_MAP[t]) return TYPE_MAP[t]; return 'Lugar' }
function formatDate(d) { return new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',month:'long',day:'numeric'}) }
function formatDateShort(d) { return new Date(d+'T12:00:00').toLocaleDateString('es-MX',{month:'short',day:'numeric'}) }
function getPhotoUrl(place) {
  const k = import.meta.env.VITE_GOOGLE_MAPS_KEY
  return place.photoRef && k ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${place.photoRef}&key=${k}` : null
}

function CityLabel({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const ref = useRef(null)
  const startEdit = () => { setDraft(value||''); setEditing(true); setTimeout(()=>ref.current?.focus(),50) }
  const commit = () => { setEditing(false); onChange(draft.trim()) }
  const handleKey = e => { if(e.key==='Enter') commit(); if(e.key==='Escape') setEditing(false) }
  if (editing) return <input ref={ref} className={styles.cityInput} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} placeholder="ej. Osaka, Kyoto..." maxLength={40} />
  return value
    ? <div className={styles.cityLabelDisplay} onClick={startEdit}>{value} <span className={styles.editHint}>✎</span></div>
    : <button className={styles.addCityBtn} onClick={startEdit}>+ Ciudad/etapa</button>
}

// Touch-friendly drag using pointer events
function useDragDrop(onMove, itineraryId) {
  const dragging = useRef(null) // { dayId, idx, el }
  const dragClone = useRef(null)
  const [dropTarget, setDropTarget] = useState(null) // { dayId, idx }

  const onPointerDown = useCallback((e, dayId, idx, el) => {
    // Only handle the handle icon
    if (!e.target.closest('[data-handle]')) return
    e.preventDefault()
    dragging.current = { dayId, idx }

    // Create visual clone
    const clone = el.cloneNode(true)
    clone.style.cssText = `position:fixed;width:${el.offsetWidth}px;opacity:0.85;pointer-events:none;z-index:9999;background:var(--card-bg);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.2);`
    const rect = el.getBoundingClientRect()
    clone.style.left = rect.left + 'px'
    clone.style.top = rect.top + 'px'
    document.body.appendChild(clone)
    dragClone.current = clone

    const move = (ev) => {
      const cx = ev.clientX ?? ev.touches?.[0]?.clientX
      const cy = ev.clientY ?? ev.touches?.[0]?.clientY
      if (!cx || !cy) return
      clone.style.left = (cx - 20) + 'px'
      clone.style.top = (cy - 20) + 'px'

      // Find element under pointer
      clone.style.display = 'none'
      const under = document.elementFromPoint(cx, cy)
      clone.style.display = ''

      const rowEl = under?.closest('[data-place-row]')
      const dayEl = under?.closest('[data-day-id]')
      if (rowEl) {
        const overDayId = rowEl.dataset.dayId
        const overIdx = parseInt(rowEl.dataset.idx)
        setDropTarget({ dayId: overDayId, idx: overIdx })
      } else if (dayEl) {
        setDropTarget({ dayId: dayEl.dataset.dayId, idx: 9999 })
      } else {
        setDropTarget(null)
      }
    }

    const up = () => {
      if (dragClone.current) { document.body.removeChild(dragClone.current); dragClone.current = null }
      if (dragging.current && dropTarget) {
        const { dayId: fromDay, idx: fromIdx } = dragging.current
        const { dayId: toDay, idx: toIdx } = dropTarget
        if (fromDay !== toDay || fromIdx !== toIdx) {
          onMove(itineraryId, fromDay, fromIdx, toDay, toIdx === 9999 ? 9999 : toIdx)
        }
      }
      dragging.current = null
      setDropTarget(null)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
    }

    document.addEventListener('pointermove', move, { passive: false })
    document.addEventListener('pointerup', up)
  }, [onMove, itineraryId, dropTarget])

  return { onPointerDown, dropTarget }
}

function PlaceRow({ place, idx, dayId, itineraryId, onRemove, onPointerDown, dropTarget }) {
  const rowRef = useRef(null)
  const photoUrl = getPhotoUrl(place)
  const isDropTarget = dropTarget?.dayId === dayId && dropTarget?.idx === idx

  return (
    <div
      ref={rowRef}
      className={`${styles.placeRow} ${isDropTarget ? styles.dragOver : ''}`}
      data-place-row
      data-day-id={dayId}
      data-idx={idx}
    >
      <div
        className={styles.dragHandle}
        data-handle
        onPointerDown={e => onPointerDown(e, dayId, idx, rowRef.current)}
        title="Arrastra para mover"
      >⠿</div>
      <div className={styles.placeIndex}>{idx + 1}</div>
      {photoUrl
        ? <img className={styles.placePhoto} src={photoUrl} alt={place.name} onError={e=>e.target.style.display='none'} />
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
  const { onPointerDown, dropTarget } = useDragDrop(onMove, itinerary.id)
  const totalPlaces = itinerary.days.reduce((acc,d) => acc + d.places.length, 0)

  // Build sections with city headers
  const sections = []
  let currentCity = null
  itinerary.days.forEach(day => {
    const label = day.cityLabel || ''
    if (label !== currentCity) {
      currentCity = label
      if (label) sections.push({ type: 'city', label })
    }
    sections.push({ type: 'day', day })
  })

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>← Volver</button>
        <button className={styles.deleteBtn} onClick={() => { if(confirm('¿Eliminar este itinerario?')) onDelete(itinerary.id) }}>🗑 Eliminar</button>
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
            return <div key={`city-${sIdx}`} className={styles.cityHeader}>{section.label}</div>
          }

          const { day } = section
          const isDropZone = dropTarget?.dayId === day.id && dropTarget?.idx === 9999

          return (
            <div key={day.id} className={`${styles.daySection} ${isDropZone ? styles.dayDropZone : ''}`} data-day-id={day.id}>
              <div className={styles.dayHeader}>
                <span className={styles.dayNum}>Día {day.dayNumber}</span>
                <span className={styles.dayDate}>{formatDate(day.date)}</span>
                <div className={styles.dayHeaderRight}>
                  <CityLabel value={day.cityLabel} onChange={label => onUpdateDayLabel(itinerary.id, day.id, label)} />
                  <span className={styles.dayCount}>{day.places.length} lugares</span>
                </div>
              </div>

              {day.places.length === 0
                ? <div className={styles.emptyDay}>Sin lugares — arrastra aquí o búscalos abajo</div>
                : <div className={styles.places}>
                    {day.places.map((place, idx) => (
                      <PlaceRow
                        key={place.place_id}
                        place={place} idx={idx} dayId={day.id} itineraryId={itinerary.id}
                        onRemove={onRemovePlace}
                        onPointerDown={onPointerDown}
                        dropTarget={dropTarget}
                      />
                    ))}
                  </div>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}
