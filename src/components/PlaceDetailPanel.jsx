import React, { useState, useEffect, useRef } from 'react'
import styles from './PlaceDetailPanel.module.css'

function getPhotoUrl(photoRef, maxwidth=800) {
  const k = import.meta.env.VITE_GOOGLE_MAPS_KEY
  return photoRef && k ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoRef}&key=${k}` : null
}

function StarRating({ rating }) {
  return (
    <span className={styles.starRating}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#E8A83A' : '#ddd' }}>★</span>
      ))}
    </span>
  )
}

export default function PlaceDetailPanel({ place, dayId, itineraryId, onClose, onUpdate, onAddToAnotherDay }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState(place.note || '')
  const [time, setTime] = useState(place.time || '')
  const [duration, setDuration] = useState(place.duration || '')
  const [photoIdx, setPhotoIdx] = useState(0)
  const noteTimeout = useRef(null)

  useEffect(() => {
    setPhotoIdx(0)
    setDetails(null)
    if (!place.place_id) return
    setLoading(true)
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

  // Photos: start with place.photoRef, then add API photos when loaded
  const mainPhoto = getPhotoUrl(place.photoRef)
  const apiPhotos = details?.photos?.slice(0, 5).map(p => getPhotoUrl(p.photo_reference)).filter(Boolean) || []
  const photos = apiPhotos.length > 0 ? apiPhotos : mainPhoto ? [mainPhoto] : []

  // Top 3 reviews
  const reviews = details?.reviews?.slice(0, 3) || []

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.panelHeader}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Photo carousel */}
        {photos.length > 0 && (
          <div className={styles.carouselWrap}>
            <img src={photos[photoIdx]} alt={place.name} className={styles.photo} />
            {photos.length > 1 && (
              <>
                <button className={`${styles.carouselBtn} ${styles.carouselPrev}`}
                  onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}>‹</button>
                <button className={`${styles.carouselBtn} ${styles.carouselNext}`}
                  onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}>›</button>
                <div className={styles.carouselDots}>
                  {photos.map((_, i) => (
                    <div key={i} className={`${styles.dot} ${i === photoIdx ? styles.dotActive : ''}`}
                      onClick={() => setPhotoIdx(i)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className={styles.body}>
          <div className={styles.nameRow}>
            <div>
              <h2 className={styles.placeName}>{place.name}</h2>
              {place.vicinity && <p className={styles.vicinity}>{details?.formatted_address || place.vicinity}</p>}
            </div>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsBtn} title="Abrir en Google Maps">🗺</a>
          </div>

          {(place.rating || details?.rating) && (
            <div className={styles.ratingRow}>
              <span className={styles.stars}>{'★'.repeat(Math.floor(details?.rating || place.rating))}</span>
              <span className={styles.ratingNum}>{details?.rating || place.rating}</span>
              <span className={styles.reviewCount}>({(details?.user_ratings_total || place.user_ratings_total || 0).toLocaleString()} reseñas)</span>
              {details?.price_level && <span className={styles.price}>{'$'.repeat(details.price_level)}</span>}
            </div>
          )}

          {details?.opening_hours && (
            <div className={`${styles.openStatus} ${isOpen ? styles.openNow : styles.closedNow}`}>
              {isOpen ? '✓ Abierto ahora' : '✗ Cerrado ahora'}
            </div>
          )}

          {details?.formatted_phone_number && (
            <a href={`tel:${details.formatted_phone_number}`} className={styles.contactLink}>📞 {details.formatted_phone_number}</a>
          )}
          {details?.website && (
            <a href={details.website} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>🌐 Sitio web</a>
          )}

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

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className={styles.reviewsSection}>
              <div className={styles.sectionTitle}>Reseñas destacadas</div>
              {reviews.map((r, i) => (
                <div key={i} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <img src={r.profile_photo_url} alt={r.author_name} className={styles.reviewAvatar} onError={e=>e.target.style.display='none'} />
                    <div>
                      <div className={styles.reviewAuthor}>{r.author_name}</div>
                      <StarRating rating={r.rating} />
                    </div>
                  </div>
                  <p className={styles.reviewText}>{r.text?.slice(0, 200)}{r.text?.length > 200 ? '...' : ''}</p>
                </div>
              ))}
            </div>
          )}

          {loading && <div className={styles.loadingHint}>Cargando detalles...</div>}
          <div className={styles.divider} />

          {onAddToAnotherDay && (
            <button className={styles.cloneBtn} onClick={() => { onAddToAnotherDay(place); onClose() }}>
              📋 Agregar a otro día
            </button>
          )}

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

          <div className={styles.sectionTitle}>Nota personal</div>
          <textarea className={styles.noteArea}
            placeholder="ej. Reservar con anticipación, llevar efectivo..."
            value={note} onChange={e => saveNote(e.target.value)} rows={3} />
          <div className={styles.noteHint}>Se guarda automáticamente</div>
        </div>
      </div>
    </div>
  )
}
