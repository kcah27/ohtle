import React, { useState, useRef, useCallback } from 'react'
import styles from './ItineraryView.module.css'

const CATEGORY_CONFIG = {
  lodging:    { label: 'HOTEL',     color: '#3D6B4F', bg: 'rgba(61,107,79,0.12)',   icon: '🏡' },
  breakfast:  { label: 'DESAYUNO',  color: '#8B6B4A', bg: 'rgba(139,107,74,0.12)',  icon: '🍳' },
  attraction: { label: 'ATRACCIÓN', color: '#C4834A', bg: 'rgba(196,131,74,0.12)',  icon: '🏛' },
  lunch:      { label: 'COMIDA',    color: '#8B6B4A', bg: 'rgba(139,107,74,0.12)',  icon: '🍽' },
  dinner:     { label: 'CENA',      color: '#1A1208', bg: 'rgba(26,18,8,0.08)',     icon: '🌮' },
}

const TYPE_EMOJI = { tourist_attraction:'🏛', restaurant:'🍽', lodging:'🏡', museum:'🏺', park:'🌿', store:'🧵', food:'🥘', art_gallery:'🎨', night_club:'🌙', shopping_mall:'🎪' }

function getEmoji(types) { for (const t of (types||[])) if (TYPE_EMOJI[t]) return TYPE_EMOJI[t]; return '📍' }
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
  if (editing) return <input ref={ref} className={styles.cityInput} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} placeholder="ej. Osaka..." maxLength={40} />
  return value
    ? <div className={styles.cityLabelPill} onClick={startEdit}>{value} <span className={styles.editHint}>✎</span></div>
    : <button className={styles.addCityBtn} onClick={startEdit}>+ Ciudad/etapa</button>
}

// Pointer-based drag (works on mobile & desktop)
let globalDrag = null

function useDragDrop(onMove, itineraryId) {
  const dragClone = useRef(null)
  const [dropTarget, setDropTarget] = useState(null)

  const onPointerDown = useCallback((e, dayId, idx, el) => {
    if (!e.target.closest('[data-handle]')) return
    e.preventDefault()
    globalDrag = { dayId, idx }

    const clone = el.cloneNode(true)
    const rect = el.getBoundingClientRect()
    clone.style.cssText = `position:fixed;width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;opacity:0.85;pointer-events:none;z-index:9999;background:var(--card-bg);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.18);`
    document.body.appendChild(clone)
    dragClone.current = clone

    const move = ev => {
      const cx = ev.clientX ?? ev.touches?.[0]?.clientX
      const cy = ev.clientY ?? ev.touches?.[0]?.clientY
      if (!cx||!cy) return
      clone.style.left = (cx-20)+'px'
      clone.style.top = (cy-20)+'px'
      clone.style.display = 'none'
      const under = document.elementFromPoint(cx, cy)
      clone.style.display = ''
      const rowEl = under?.closest('[data-place-row]')
      const dayEl = under?.closest('[data-day-zone]')
      if (rowEl) setDropTarget({ dayId: rowEl.dataset.dayId, idx: parseInt(rowEl.dataset.idx) })
      else if (dayEl) setDropTarget({ dayId: dayEl.dataset.dayZone, idx: 9999 })
      else setDropTarget(null)
    }

    const up = () => {
      if (dragClone.current) { document.body.removeChild(dragClone.current); dragClone.current = null }
      setDropTarget(prev => {
        if (globalDrag && prev) {
          const { dayId: fromDay, idx: fromIdx } = globalDrag
          const { dayId: toDay, idx: toIdx } = prev
          if (fromDay !== toDay || fromIdx !== toIdx) onMove(itineraryId, fromDay, fromIdx, toDay, toIdx)
        }
        globalDrag = null
        return null
      })
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
    }

    document.addEventListener('pointermove', move, { passive: false })
    document.addEventListener('pointerup', up)
  }, [onMove, itineraryId])

  return { onPointerDown, dropTarget }
}

function PlaceTreeItem({ place, idx, dayId, itineraryId, onRemove, onPointerDown, dropTarget, isLast }) {
  const rowRef = useRef(null)
  const photoUrl = getPhotoUrl(place)
  const cat = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.attraction
  const emoji = photoUrl ? null : (place.category === 'attraction' ? getEmoji(place.types) : cat.icon)
  const isDropTarget = dropTarget?.dayId === dayId && dropTarget?.idx === idx

  return (
    <div className={styles.treeItem} data-place-row data-day-id={dayId} data-idx={idx} ref={rowRef}>
      {/* Tree line */}
      <div className={styles.treeLine}>
        <div className={styles.treeNode} style={{ background: cat.color }} />
        {!isLast && <div className={styles.treeConnector} />}
      </div>

      {/* Card */}
      <div className={`${styles.placeCard} ${isDropTarget ? styles.dragOver : ''}`}>
        <div className={styles.dragHandle} data-handle onPointerDown={e => onPointerDown(e, dayId, idx, rowRef.current)}>⠿</div>

        {photoUrl
          ? <img className={styles.placePhoto} src={photoUrl} alt={place.name} onError={e=>e.target.style.display='none'} />
          : <div className={styles.placeEmoji}>{emoji}</div>
        }

        <div className={styles.placeInfo}>
          <div className={styles.categoryPill} style={{ color: cat.color, background: cat.bg }}>{cat.label}</div>
          <div className={styles.placeName}>{place.name}</div>
          <div className={styles.placeMeta}>
            {place.rating && <span className={styles.placeRating}>★ {place.rating}</span>}
            {place.vicinity && <span className={styles.placeAddr}>{place.vicinity}</span>}
          </div>
        </div>

        <button className={styles.removeBtn} onClick={() => onRemove(itineraryId, dayId, place.place_id)}>✕</button>
      </div>
    </div>
  )
}

export default function ItineraryView({ itinerary, onBack, onRemovePlace, onDelete, onMove, onUpdateDayLabel }) {
  const { onPointerDown, dropTarget } = useDragDrop(onMove, itinerary.id)
  const totalPlaces = itinerary.days.reduce((acc,d) => acc + d.places.length, 0)

  // Group by city label for section headers
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
            <span>📌 {totalPlaces} paradas</span>
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
            <div key={day.id} className={`${styles.daySection} ${isDropZone ? styles.dayDropZone : ''}`}
              data-day-zone={day.id}>
              <div className={styles.dayHeader}>
                <div className={styles.dayHeaderLeft}>
                  <span className={styles.dayNum}>DÍA {day.dayNumber}</span>
                  <span className={styles.dayDate}>{formatDate(day.date)}</span>
                </div>
                <div className={styles.dayHeaderRight}>
                  <CityLabel value={day.cityLabel} onChange={label => onUpdateDayLabel(itinerary.id, day.id, label)} />
                  <span className={styles.dayCount}>{day.places.length}</span>
                </div>
              </div>

              {day.places.length === 0
                ? <div className={styles.emptyDay} data-day-zone={day.id}>Sin lugares — arrastra aquí o búscalos abajo</div>
                : <div className={styles.treeList}>
                    {day.places.map((place, idx) => (
                      <PlaceTreeItem
                        key={place.place_id}
                        place={place} idx={idx} dayId={day.id} itineraryId={itinerary.id}
                        onRemove={onRemovePlace}
                        onPointerDown={onPointerDown}
                        dropTarget={dropTarget}
                        isLast={idx === day.places.length - 1}
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
