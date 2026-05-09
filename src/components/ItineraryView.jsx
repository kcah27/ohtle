import React, { useState, useRef, useCallback } from 'react'
import styles from './ItineraryView.module.css'
import PlaceDetailPanel from './PlaceDetailPanel'
import AddEventModal from './AddEventModal'

const CATEGORY_CONFIG = {
  lodging:    { label:'HOTEL',     color:'#3D6B4F', bg:'rgba(61,107,79,0.12)',  icon:'🏡' },
  breakfast:  { label:'DESAYUNO',  color:'#8B6B4A', bg:'rgba(139,107,74,0.12)', icon:'🍳' },
  attraction: { label:'ATRACCIÓN', color:'#C4834A', bg:'rgba(196,131,74,0.12)', icon:'🏛' },
  lunch:      { label:'COMIDA',    color:'#8B6B4A', bg:'rgba(139,107,74,0.12)', icon:'🍽' },
  dinner:     { label:'CENA',      color:'#1A1208', bg:'rgba(26,18,8,0.08)',    icon:'🌮' },
}

const TYPE_EMOJI = { tourist_attraction:'🏛', restaurant:'🍽', lodging:'🏡', museum:'🏺', park:'🌿', store:'🧵', food:'🥘', art_gallery:'🎨', night_club:'🌙', shopping_mall:'🎪' }
function getEmoji(types) { for (const t of (types||[])) if (TYPE_EMOJI[t]) return TYPE_EMOJI[t]; return '📍' }
function formatDate(d) { return new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',month:'long',day:'numeric'}) }
function formatDateShort(d) { return new Date(d+'T12:00:00').toLocaleDateString('es-MX',{month:'short',day:'numeric'}) }
function getPhotoUrl(place) {
  const k = import.meta.env.VITE_GOOGLE_MAPS_KEY
  return place.photoRef && k ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${place.photoRef}&key=${k}` : null
}

// Parse "HH:MM" to minutes
function toMinutes(t) { if (!t) return null; const [h,m] = t.split(':').map(Number); return h*60+m }
function minutesToStr(m) { const h=Math.floor(m/60); const min=m%60; return min>0?`${h}h ${min}min`:`${h}h` }

function CityLabel({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value||'')
  const ref = useRef(null)
  const startEdit = () => { setDraft(value||''); setEditing(true); setTimeout(()=>ref.current?.focus(),50) }
  const commit = () => { setEditing(false); onChange(draft.trim()) }
  const handleKey = e => { if(e.key==='Enter') commit(); if(e.key==='Escape') setEditing(false) }
  if (editing) return <input ref={ref} className={styles.cityInput} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} placeholder="ej. Osaka..." maxLength={40} />
  return value
    ? <div className={styles.cityLabelPill} onClick={startEdit}>{value} <span className={styles.editHint}>✎</span></div>
    : <button className={styles.addCityBtn} onClick={startEdit}>+ Ciudad/etapa</button>
}

// Gap card between two timed items
function GapCard({ minutes }) {
  if (minutes <= 0) return null
  return (
    <div className={styles.gapCard}>
      <div className={styles.gapLine} />
      <div className={styles.gapBadge}>⏱ {minutesToStr(minutes)} libres</div>
      <div className={styles.gapLine} />
    </div>
  )
}

// Day summary footer
function DaySummary({ items }) {
  const timed = items.filter(i => i.type !== 'separator' && !!(i.type==='place' ? i.data.time : i.data.time))
  if (timed.length < 2) return null

  let totalOccupied = 0
  timed.forEach(i => {
    const dur = i.type==='place' ? parseFloat(i.data.duration||0) : 0
    totalOccupied += dur * 60
  })

  const times = timed.map(i => toMinutes(i.type==='place'?i.data.time:i.data.time)).filter(Boolean)
  const first = Math.min(...times)
  const lastItem = timed[timed.length-1]
  const lastTime = toMinutes(lastItem.type==='place'?lastItem.data.time:lastItem.data.time)
  const lastDur = lastItem.type==='place' ? parseFloat(lastItem.data.duration||0)*60 : 0
  const last = lastTime + lastDur

  const daySpan = last - first
  const free = Math.max(0, daySpan - totalOccupied)

  const fmt = m => { const h=Math.floor(m/60); const min=m%60; return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}` }

  return (
    <div className={styles.daySummary}>
      <div className={styles.summaryItem}>
        <span className={styles.summaryIcon}>🕐</span>
        <span>{fmt(first)} → {fmt(last)}</span>
      </div>
      {totalOccupied > 0 && (
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}>📍</span>
          <span>Ocupado: {minutesToStr(totalOccupied)}</span>
        </div>
      )}
      <div className={styles.summaryItem}>
        <span className={styles.summaryIcon}>🌿</span>
        <span>Libre: {minutesToStr(free)}</span>
      </div>
    </div>
  )
}

// Drag & drop with pointer events
let globalDrag = null

function useDragDrop(onMovePlace, onMoveEvent, itineraryId) {
  const dragClone = useRef(null)
  const [dropTarget, setDropTarget] = useState(null)
  const dropTargetRef = useRef(null)

  const updateDropTarget = (val) => {
    dropTargetRef.current = val
    setDropTarget(val)
  }

  const onPointerDown = useCallback((e, dayId, idx, el, isEvent) => {
    if (!e.target.closest('[data-handle]')) return
    e.preventDefault()
    globalDrag = { dayId, idx, isEvent }
    const clone = el.cloneNode(true)
    const rect = el.getBoundingClientRect()
    clone.style.cssText = `position:fixed;width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;opacity:0.85;pointer-events:none;z-index:9999;background:var(--card-bg);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.18);`
    document.body.appendChild(clone); dragClone.current = clone

    const move = ev => {
      const cx = ev.clientX??ev.touches?.[0]?.clientX; const cy = ev.clientY??ev.touches?.[0]?.clientY
      if(!cx||!cy) return
      clone.style.left=(cx-20)+'px'; clone.style.top=(cy-20)+'px'
      clone.style.display='none'; const under=document.elementFromPoint(cx,cy); clone.style.display=''
      const rowEl=under?.closest('[data-place-row]'); const dayEl=under?.closest('[data-day-zone]')
      if(rowEl) updateDropTarget({ dayId:rowEl.dataset.dayId, idx:parseInt(rowEl.dataset.idx) })
      else if(dayEl) updateDropTarget({ dayId:dayEl.dataset.dayZone, idx:9999 })
      else updateDropTarget(null)
    }

    const up = () => {
      if(dragClone.current){document.body.removeChild(dragClone.current);dragClone.current=null}
      const prev = dropTargetRef.current
      if(globalDrag && prev){
        const{dayId:fD,idx:fI,isEvent:fE}=globalDrag; const{dayId:tD,idx:tI}=prev
        if(fD!==tD||fI!==tI){ fE ? onMoveEvent(itineraryId,fD,fI,tD,tI) : onMovePlace(itineraryId,fD,fI,tD,tI) }
      }
      globalDrag=null
      updateDropTarget(null)
      document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up)
    }
    document.addEventListener('pointermove',move,{passive:false}); document.addEventListener('pointerup',up)
  }, [onMovePlace, onMoveEvent, itineraryId])

  return { onPointerDown, dropTarget }
}

function EventRow({ event, listIdx, dayId, itineraryId, onRemove, onEdit, onPointerDown, dropTarget, isLast }) {
  const rowRef = useRef(null)
  const isDropTarget = dropTarget?.dayId===dayId && dropTarget?.idx===listIdx
  const isFlight = event.type === 'flight'
  const isArrival = event._isArrival // synthetic arrival node

  return (
    <div className={styles.treeItem} data-place-row data-day-id={dayId} data-idx={listIdx} ref={rowRef}>
      <div className={styles.treeLine}>
        <div className={styles.treeNodeEvent} style={{ borderColor: event.color||'#8B6B4A' }} />
        {!isLast && <div className={styles.treeConnector} />}
      </div>
      <div className={`${styles.eventCard} ${isDropTarget?styles.dragOver:''}`}
        style={{ borderLeftColor: event.color||'#8B6B4A' }}
        onClick={() => !isArrival && onEdit(event)}>
        <div className={styles.dragHandle} data-handle
          onPointerDown={e=>{e.stopPropagation();if(!isArrival)onPointerDown(e,dayId,listIdx,rowRef.current,true)}}>⠿</div>
        <span className={styles.eventIcon}>{event.icon}</span>
        <div className={styles.eventInfo}>
          {isFlight && !isArrival && event.time && (
            <span className={styles.eventTime}>
              Salida · {event.time}
              {event.arrivalTime ? ` → ${event.arrivalTime}${calcDayDiff(event.time, event.arrivalTime)}` : ''}
            </span>
          )}
          {isFlight && isArrival && event.arrivalTime && (
            <span className={styles.eventTime}>Llegada · {event.arrivalTime}</span>
          )}
          {!isFlight && event.time && <span className={styles.eventTime}>🕐 {event.time}</span>}
          <div className={styles.eventTitle}>
            {isFlight ? (isArrival ? `Llegada · ${event.title}` : `Salida · ${event.title}`) : event.title}
          </div>
          {event.note && <div className={styles.eventNote}>{event.note}</div>}
        </div>
        {!isArrival && <button className={styles.removeBtn} onClick={e=>{e.stopPropagation();onRemove(itineraryId,dayId,event.id)}}>✕</button>}
      </div>
    </div>
  )
}

function PlaceTreeItem({ place, listIdx, dayId, itineraryId, onRemove, onPointerDown, dropTarget, isLast, onOpenDetail }) {
  const rowRef = useRef(null)
  const photoUrl = getPhotoUrl(place)
  const cat = CATEGORY_CONFIG[place.category]||CATEGORY_CONFIG.attraction
  const emoji = photoUrl ? null : (place.category==='attraction'?getEmoji(place.types):cat.icon)
  const isDropTarget = dropTarget?.dayId===dayId && dropTarget?.idx===listIdx

  return (
    <div className={styles.treeItem} data-place-row data-day-id={dayId} data-idx={listIdx} ref={rowRef}>
      <div className={styles.treeLine}>
        <div className={styles.treeNode} style={{ background: cat.color }} />
        {!isLast && <div className={styles.treeConnector} />}
      </div>
      <div className={`${styles.placeCard} ${isDropTarget?styles.dragOver:''}`} onClick={()=>onOpenDetail(place,dayId)}>
        <div className={styles.dragHandle} data-handle
          onPointerDown={e=>{e.stopPropagation();onPointerDown(e,dayId,listIdx,rowRef.current,false)}}>⠿</div>
        {photoUrl
          ? <img className={styles.placePhoto} src={photoUrl} alt={place.name} onError={e=>e.target.style.display='none'} />
          : <div className={styles.placeEmoji}>{emoji}</div>
        }
        <div className={styles.placeInfo}>
          <div className={styles.placeTopRow}>
            <div className={styles.categoryPill} style={{color:cat.color,background:cat.bg}}>{cat.label}</div>
            {place.time && <span className={styles.timeTag}>
              🕐 {place.time}
              {place.duration ? ` → ${calcEndTime(place.time, place.duration)} · ${place.duration}h` : ''}
            </span>}
            {place.note && <span className={styles.noteIndicator}>📝</span>}
          </div>
          <div className={styles.placeName}>{place.name}</div>
          <div className={styles.placeMeta}>
            {place.rating && <span className={styles.placeRating}>★ {place.rating}</span>}
            {place.vicinity && <span className={styles.placeAddr}>{place.vicinity}</span>}
          </div>
        </div>
        <button className={styles.removeBtn} onClick={e=>{e.stopPropagation();onRemove(itineraryId,dayId,place.place_id)}}>✕</button>
      </div>
    </div>
  )
}

// Calculate end time from start + duration hours
function calcEndTime(startTime, durationHours) {
  if (!startTime || !durationHours) return ''
  const [h, m] = startTime.split(':').map(Number)
  const totalMins = h * 60 + m + parseFloat(durationHours) * 60
  const endH = Math.floor(totalMins / 60) % 24
  const endM = totalMins % 60
  return `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
}

// Calculate day difference for flights
function calcDayDiff(depTime, arrTime) {
  if (!depTime || !arrTime) return ''
  const dep = toMinutes(depTime)
  const arr = toMinutes(arrTime)
  if (arr < dep) return ' +1'
  return ''
}

// Standalone version for use outside component render
function buildMergedItemsStatic(day, allDays) {
  const events = day.events || []
  const all = []
  day.places.forEach((p,i) => all.push({ type:'place', data:p, idx:i }))
  events.forEach((e,i) => {
    all.push({ type:'event', data:e, idx:i })
  })
  // Check if any flight from another day arrives here — inject arrival node
  if (allDays) {
    allDays.forEach(otherDay => {
      if (otherDay.id === day.id) return
      ;(otherDay.events||[]).forEach((e,i) => {
        if (e.type === 'flight' && e.arrivalDayId === day.id) {
          all.push({ type:'event', data:{ ...e, _isArrival:true, time: e.arrivalTime||'' }, idx:`arr-${e.id}`, _arrival:true })
        }
      })
    })
  }
  all.sort((a,b) => {
    const ta = a.data.time||''; const tb = b.data.time||''
    if(!ta&&!tb) return 0; if(!ta) return 1; if(!tb) return -1; return ta.localeCompare(tb)
  })

  // If day has transition label (City A → City B), inject a separator in the middle
  const items = all.map((item,i) => ({ ...item, listIdx:i }))
  if (day.cityLabel && day.cityLabel.includes('→')) {
    const parts = day.cityLabel.split('→')
    const cityA = parts[0].trim()
    const cityB = parts[1].trim()
    // Find the best split point: after last flight arrival event, or at midpoint
    let splitAfter = -1
    items.forEach((item, i) => {
      if (item.type === 'event' && item.data._isArrival) splitAfter = i
    })
    if (splitAfter === -1) splitAfter = Math.floor(items.length / 2) - 1
    // Insert separator after splitAfter
    items.splice(splitAfter + 1, 0, { type:'separator', cityA, cityB, listIdx: splitAfter + 0.5 })
    // Re-index
    return items.map((item, i) => ({ ...item, listIdx: i }))
  }

  return items
}

export default function ItineraryView({ itinerary, onBack, onRemovePlace, onDelete, onMove, onUpdateDayLabel, onUpdatePlace, onAddEvent, onUpdateEvent, onMoveEvent, onRemoveEvent }) {
  const [detailPlace, setDetailPlace] = useState(null)
  const [detailDayId, setDetailDayId] = useState(null)
  const [addingEventDayId, setAddingEventDayId] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [editingEventDayId, setEditingEventDayId] = useState(null)

  const handleShare = () => {
    const shareData = btoa(encodeURIComponent(JSON.stringify(itinerary)))
    const url = `${window.location.origin}/share#${shareData}`
    navigator.clipboard.writeText(url).then(() => alert('¡Link copiado al portapapeles! 🔗'))
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const totalPlaces = itinerary.days.reduce((acc,d) => acc + d.places.length, 0)
    const startFmt = new Date(itinerary.startDate+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})
    const endFmt = new Date(itinerary.endDate+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})

    const CAT = { lodging:'HOTEL', breakfast:'DESAYUNO', lunch:'COMIDA', dinner:'CENA', attraction:'ATRACCIÓN' }
    const CAT_COLOR = { lodging:'#3D6B4F', breakfast:'#8B6B4A', lunch:'#8B6B4A', dinner:'#1A1208', attraction:'#C4834A' }

    const daysHtml = itinerary.days.map(day => {
      const dateFmt = new Date(day.date+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})
      const chips = day.places.map(p => {
        const cat = p.category || 'attraction'
        const color = CAT_COLOR[cat] || '#C4834A'
        const label = CAT[cat] || 'LUGAR'
        return `<span style="font-size:9px;padding:3px 8px;border-radius:20px;border:1px solid ${color}44;color:${color};background:${color}11;white-space:nowrap">${p.name}</span>`
      }).join('')
      const events = (day.events||[]).map(e => `<span style="font-size:9px;padding:3px 8px;border-radius:20px;border:1px solid ${e.color||'#8B6B4A'}44;color:${e.color||'#8B6B4A'};background:${e.color||'#8B6B4A'}11;white-space:nowrap">${e.icon} ${e.title}</span>`).join('')
      return `
        <div style="display:flex;gap:12px;margin-bottom:12px;padding-bottom:12px;border-bottom:0.5px solid #E8E0D4">
          <div style="display:flex;flex-direction:column;align-items:center;min-width:28px">
            <div style="width:26px;height:26px;border-radius:50%;background:rgba(196,131,74,0.15);border:1.5px solid #C4834A;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;color:#C4834A;flex-shrink:0">${day.dayNumber}</div>
            <div style="width:1px;flex:1;background:#E8E0D4;margin:3px 0"></div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;font-weight:500;color:#1A1208;margin-bottom:6px;text-transform:capitalize">${dateFmt}${day.cityLabel ? ` · ${day.cityLabel}` : ''}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">${chips}${events}</div>
          </div>
        </div>`
    }).join('')

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${itinerary.name}</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0} body{font-family:'DM Sans',sans-serif;background:white;padding:0}
    @media print{body{padding:0}}</style></head><body>
    <div style="max-width:600px;margin:0 auto;padding:0">
      <div style="background:#1A1208;padding:28px 24px 20px;position:relative;overflow:hidden">
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(196,131,74,0.04) 3px,rgba(196,131,74,0.04) 6px)"></div>
        <div style="position:absolute;top:16px;right:16px;width:36px;height:42px;border:1.5px solid rgba(196,131,74,0.4);border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:16px">✈️</div>
        <div style="font-size:9px;color:#C4834A;text-transform:uppercase;letter-spacing:0.18em;margin-bottom:5px;position:relative">Ohtle · itinerario de viaje</div>
        <div style="font-size:26px;color:white;font-family:'Playfair Display',serif;margin-bottom:5px;position:relative">${itinerary.name}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.5);position:relative;display:flex;gap:16px">
          <span>📍 ${itinerary.destination}</span>
          <span>📅 ${startFmt} → ${endFmt}</span>
          <span>📌 ${totalPlaces} paradas</span>
        </div>
      </div>
      <div style="padding:20px 24px">${daysHtml}</div>
    </div>
    <script>window.onload=()=>{window.print()}<\/script></body></html>`)
    printWindow.document.close()
  }

  // Move event using merged list index
  const handleMoveEvent = useCallback((itineraryId, fromDayId, fromListIdx, toDayId, toListIdx) => {
    const fromDay = itinerary.days.find(d => d.id === fromDayId)
    if (!fromDay) return
    const merged = buildMergedItemsStatic(fromDay)
    const item = merged[fromListIdx]
    if (!item || item.type !== 'event') return
    onMoveEvent(itineraryId, fromDayId, item.data.id, toDayId, toListIdx)
  }, [itinerary, onMoveEvent])

  // Move place using merged list index  
  const handleMovePlace = useCallback((itineraryId, fromDayId, fromListIdx, toDayId, toListIdx) => {
    const fromDay = itinerary.days.find(d => d.id === fromDayId)
    if (!fromDay) return
    const merged = buildMergedItemsStatic(fromDay, itinerary.days)
    const item = merged[fromListIdx]
    if (!item || item.type !== 'place') return
    const realFromIdx = item.idx

    const toDay = itinerary.days.find(d => d.id === toDayId)
    if (!toDay) return

    let realToIdx
    if (toListIdx === 9999) {
      realToIdx = 9999
    } else {
      // Find how many places come before this list index in the merged list
      const toMerged = buildMergedItemsStatic(toDay, itinerary.days)
      const placesBeforeIdx = toMerged.slice(0, toListIdx).filter(i => i.type === 'place').length
      realToIdx = placesBeforeIdx
    }
    onMove(itineraryId, fromDayId, realFromIdx, toDayId, realToIdx)
  }, [itinerary, onMove])

  const { onPointerDown, dropTarget } = useDragDrop(handleMovePlace, handleMoveEvent, itinerary.id)

  const totalPlaces = itinerary.days.reduce((acc,d) => acc + d.places.length + (d.events||[]).length, 0)

  function buildMergedItems(day) { return buildMergedItemsStatic(day, itinerary.days) }

  const sections = []
  let currentCity = null
  itinerary.days.forEach(day => {
    const label = day.cityLabel||''
    if(label!==currentCity){currentCity=label;if(label)sections.push({type:'city',label})}
    sections.push({type:'day',day})
  })

  const handleEditEvent = (event, dayId) => { setEditingEvent(event); setEditingEventDayId(dayId) }
  const handleSaveEvent = (itineraryId, dayId, data) => {
    if (editingEvent) onUpdateEvent(itineraryId, editingEventDayId, editingEvent.id, data)
    else onAddEvent(itineraryId, dayId, data)
    setEditingEvent(null); setEditingEventDayId(null)
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>← Volver</button>
        <div className={styles.topBarRight}>
          {(itinerary.status === 'ready' || itinerary.status === 'archived') && (
            <>
              <button className={styles.actionBtn} onClick={() => handleShare()}>🔗 Compartir</button>
              <button className={styles.actionBtn} onClick={() => handlePrint()}>🖨 Imprimir</button>
            </>
          )}
          <button className={styles.deleteBtn} onClick={() => { if(confirm('¿Eliminar este itinerario?')) onDelete(itinerary.id) }}>🗑</button>
        </div>
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
        {sections.map((section,sIdx) => {
          if(section.type==='city') return <div key={`city-${sIdx}`} className={styles.cityHeader}>{section.label}</div>
          const { day } = section
          const mergedItems = buildMergedItems(day)
          const isDropZone = dropTarget?.dayId===day.id && dropTarget?.idx===9999

          return (
            <div key={day.id} className={`${styles.daySection} ${isDropZone?styles.dayDropZone:''}`} data-day-zone={day.id}>
              <div className={styles.dayHeader}>
                <div className={styles.dayHeaderLeft}>
                  <span className={styles.dayNum}>DÍA {day.dayNumber}</span>
                  <span className={styles.dayDate}>{formatDate(day.date)}</span>
                </div>
                <div className={styles.dayHeaderRight}>
                  <CityLabel value={day.cityLabel} onChange={label=>onUpdateDayLabel(itinerary.id,day.id,label)} />
                  <button className={styles.addEventBtn} onClick={()=>setAddingEventDayId(day.id)}>+ Evento</button>
                  <span className={styles.dayCount}>{mergedItems.length}</span>
                </div>
              </div>

              {mergedItems.length===0
                ? <div className={styles.emptyDay}>Sin actividades aún</div>
                : <div className={styles.treeList}>
                    {/* First city pin */}
                    {day.cityLabel && day.cityLabel.includes('→') && (
                      <div className={styles.cityTransition}>
                        <div className={styles.cityTransitionLine} />
                        <div className={styles.cityTransitionBadge}>📍 {day.cityLabel.split('→')[0].trim()}</div>
                        <div className={styles.cityTransitionLine} />
                      </div>
                    )}
                    {mergedItems.map((item, listIdx) => {
                      const isLast = listIdx === mergedItems.length-1
                      const nextItem = mergedItems[listIdx+1]
                      const thisTime = item.type==='separator' ? null : toMinutes(item.data?.time||'')
                      const thisDur = item.type==='place' ? parseFloat(item.data.duration||0)*60 : 0
                      const nextTime = nextItem && nextItem.type!=='separator' ? toMinutes(nextItem.data?.time||'') : null
                      const gap = (item.type !== 'separator' && nextItem?.type !== 'separator' && thisTime!==null && nextTime!==null) ? nextTime-(thisTime+thisDur) : null

                      if (item.type === 'separator') {
                        return (
                          <div key={`sep-${listIdx}`}>
                            {/* Invisible drop zone before separator */}
                            <div data-place-row data-day-id={day.id} data-idx={listIdx}
                              style={{height:'12px', cursor:'default'}} />
                            <div className={`${styles.cityTransition} ${dropTarget?.dayId===day.id&&dropTarget?.idx===listIdx?styles.cityTransitionDrop:''}`}>
                              <div className={styles.cityTransitionLine} />
                              <div className={styles.cityTransitionBadge}>📍 {item.cityB}</div>
                              <div className={styles.cityTransitionLine} />
                            </div>
                          </div>
                        )
                      }

                      return (
                        <React.Fragment key={item.type==='separator'?`sep-${listIdx}`:item.type==='place'?item.data.place_id:(item.data._isArrival?`arr-${item.data.id}`:item.data.id)}>
                          {item.type==='event'
                            ? <EventRow event={item.data} listIdx={listIdx} dayId={day.id} itineraryId={itinerary.id}
                                onRemove={onRemoveEvent} onEdit={e=>handleEditEvent(e,day.id)}
                                onPointerDown={onPointerDown} dropTarget={dropTarget} isLast={isLast} />
                            : <PlaceTreeItem place={item.data} listIdx={listIdx} dayId={day.id} itineraryId={itinerary.id}
                                onRemove={onRemovePlace} onPointerDown={onPointerDown}
                                dropTarget={dropTarget} isLast={isLast} onOpenDetail={(p,d)=>{setDetailPlace(p);setDetailDayId(d)}} />
                          }
                          {gap!==null && gap>0 && !isLast && nextItem?.type !== 'separator' && <GapCard minutes={gap} />}
                        </React.Fragment>
                      )
                    })}
                    <DaySummary items={mergedItems} />
                  </div>
              }
            </div>
          )
        })}
      </div>

      {detailPlace && (
        <PlaceDetailPanel place={detailPlace} dayId={detailDayId} itineraryId={itinerary.id}
          onClose={()=>{setDetailPlace(null);setDetailDayId(null)}} onUpdate={onUpdatePlace} />
      )}

      {(addingEventDayId || editingEvent) && (
        <AddEventModal
          dayId={addingEventDayId||editingEventDayId}
          itineraryId={itinerary.id}
          allDays={itinerary.days}
          onAdd={handleSaveEvent}
          onClose={()=>{setAddingEventDayId(null);setEditingEvent(null);setEditingEventDayId(null)}}
          editingEvent={editingEvent}
        />
      )}
    </div>
  )
}
