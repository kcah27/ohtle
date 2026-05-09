import React, { useState, useEffect, useRef } from 'react'
import styles from './PlaceDetailPanel.module.css'

const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function getLargePhotoUrl(photoRef) {
  const k = import.meta.env.VITE_GOOGLE_MAPS_KEY
  return photoRef && k ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${k}` : null
}

export default function PlaceDetailPanel({ place, dayId, itineraryId, onClose, onUpdate }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState(place.note || '')
  const [time, setTime] = useState(place.time || '')
  const [duration, setDuration] = useState(place.duration || '')
  const noteTimeout = useRef(null)
  const photoUrl = getLargePhotoUrl(place.photoRef)

  // Fetch place details from Google
  useEffect(() => {
    if (!place.place_id) return
    setLoading(true)
    const k = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!k) { setLoading(false); return }
    fetch(`/api/place-details?place_id=${place.place_id}`)
      .then(r => r.json())
      .then(d => { if (d.result) setDetails(d.result); setLoading(false) })
      .catch(() => setLoading(false))
  }, [place.place_id])

  const saveNote = (val) => {
    clearTimeout(noteTimeout.current)
    setNote(val)
    noteTimeout.current = setTimeout(() => onUpdate(itineraryId, dayId, place.place_id, { note: val }), 600)
  }

  const saveTime = (val) => { setTime(val); onUpdate(itineraryId, dayId, place.place_id, { time: val }) }
  const saveDuration = (val) => { setDuration(val); onUpdate(itineraryId, dayId, place.place_id, { duration: val }) }

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`

  const hours = details?.opening_hours?.weekday_text || []
  const isOpen = details?.opening_hours?.open_now

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.panelHeader}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Photo */}
        {photoUrl && (
          <div className={styles.photoWrap}>
            <img src={photoUrl} alt={place.name} className={styles.photo} />
          </div>
        )}

        <div className={styles.body}>
          {/* Name + category */}
          <div className={styles.nameRow}>
            <div>
              <h2 className={styles.placeName}>{place.name}</h2>
              {place.vicinity && <p className={styles.vicinity}>{details?.formatted_address || place.vicinity}</p>}
            </div>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsBtn} title="Abrir en Google Maps">
              🗺
            </a>
          </div>

          {/* Rating */}
          {(place.rating || details?.rating) && (
            <div className={styles.ratingRow}>
              <span className={styles.stars}>{'★'.repeat(Math.floor(details?.rating || place.rating))}</span>
              <span className={styles.ratingNum}>{details?.rating || place.rating}</span>
              <span className={styles.reviewCount}>({(details?.user_ratings_total || place.user_ratings_total || 0).toLocaleString()} reseñas)</span>
              {details?.price_level && <span className={styles.price}>{'$'.repeat(details.price_level)}</span>}
            </div>
          )}

          {/* Open status */}
          {details?.opening_hours && (
            <div className={`${styles.openStatus} ${isOpen ? styles.openNow : styles.closedNow}`}>
              {isOpen ? '✓ Abierto ahora' : '✗ Cerrado ahora'}
            </div>
          )}

          {/* Phone + website */}
          {details?.formatted_phone_number && (
            <a href={`tel:${details.formatted_phone_number}`} className={styles.contactLink}>📞 {details.formatted_phone_number}</a>
          )}
          {details?.website && (
            <a href={details.website} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>🌐 Sitio web</a>
          )}

          {/* Hours */}
          {hours.length > 0 && (
            <div className={styles.hoursSection}>
              <div className={styles.sectionTitle}>Horarios</div>
              {hours.map((h, i) => (
                <div key={i} className={styles.hourRow}>
                  <span className={styles.hourDay}>{h.split(':')[0]}</span>
                  <span className={styles.hourTime}>{h.split(/:(.*)/s)[1]?.trim()}</span>
                </div>
              ))}
            </div>
          )}

          {loading && <div className={styles.loadingHint}>Cargando detalles...</div>}

          {/* Divider */}
          <div className={styles.divider} />

          {/* Time & duration */}
          <div className={styles.sectionTitle}>Horario en tu itinerario</div>
          <div className={styles.timeRow}>
            <div className={styles.timeField}>
              <label>Hora de llegada</label>
              <input type="time" value={time} onChange={e => saveTime(e.target.value)} className={styles.timeInput} />
            </div>
            <div className={styles.timeField}>
              <label>Duración (hrs)</label>
              <input type="number" min="0.5" max="12" step="0.5" value={duration} onChange={e => saveDuration(e.target.value)} placeholder="ej. 2" className={styles.timeInput} />
            </div>
          </div>

          {/* Note */}
          <div className={styles.sectionTitle}>Nota personal</div>
          <textarea
            className={styles.noteArea}
            placeholder="ej. Reservar con anticipación, llevar efectivo, llegar temprano para evitar filas..."
            value={note}
            onChange={e => saveNote(e.target.value)}
            rows={4}
          />
          <div className={styles.noteHint}>Se guarda automáticamente</div>
        </div>
      </div>
    </div>
  )
}
