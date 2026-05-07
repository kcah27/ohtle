import React, { useState } from 'react'
import styles from './PlaceCard.module.css'

const TYPE_MAP = {
  tourist_attraction: 'Atracción turística',
  restaurant: 'Restaurante',
  lodging: 'Hospedaje',
  museum: 'Museo',
  park: 'Parque / Naturaleza',
  store: 'Artesanías',
  food: 'Gastronomía',
  natural_feature: 'Sitio natural',
  shopping_mall: 'Mercado',
  cafe: 'Café',
  bar: 'Bar',
  spa: 'Spa',
  art_gallery: 'Galería de arte',
}

const EMOJI_MAP = {
  tourist_attraction: '🏛',
  restaurant: '🍽',
  lodging: '🏡',
  museum: '🏺',
  park: '🌿',
  store: '🧵',
  food: '🥘',
  natural_feature: '⛰️',
  shopping_mall: '🎪',
  cafe: '☕',
  bar: '🍹',
  spa: '🧘',
  art_gallery: '🎨',
}

function getLabel(types) {
  for (const t of (types || [])) {
    if (TYPE_MAP[t]) return TYPE_MAP[t]
  }
  return 'Lugar de interés'
}

function getEmoji(types) {
  for (const t of (types || [])) {
    if (EMOJI_MAP[t]) return EMOJI_MAP[t]
  }
  return '📍'
}

function renderStars(rating) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return '★'.repeat(full) + (half ? '½' : '')
}

export default function PlaceCard({ place, getPhotoUrl, activeItinerary, onAddToItinerary }) {
  const [imgError, setImgError] = useState(false)
  const photoRef = place.photos?.[0]?.photo_reference
  const photoUrl = !imgError && photoRef ? getPhotoUrl(photoRef) : null

  const mapsUrl = place.place_id
    ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
    : `https://www.google.com/maps/search/${encodeURIComponent(place.name)}`

  const isOpen = place.opening_hours?.open_now

  return (
    <div className={styles.card}>
      <div className={styles.image}>
        {photoUrl ? (
          <img src={photoUrl} alt={place.name} onError={() => setImgError(true)} />
        ) : (
          <span className={styles.emoji}>{getEmoji(place.types)}</span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.type}>{getLabel(place.types)}</div>
        <div className={styles.name}>{place.name}</div>

        <div className={styles.meta}>
          {place.rating && (
            <>
              <span className={styles.stars}>{renderStars(place.rating)}</span>
              <span className={styles.rating}>{place.rating}</span>
              <span className={styles.reviews}>({(place.user_ratings_total || 0).toLocaleString()})</span>
            </>
          )}
          {place.opening_hours !== undefined && (
            <span className={`${styles.badge} ${isOpen ? styles.open : styles.closed}`}>
              {isOpen ? 'Abierto' : 'Cerrado'}
            </span>
          )}
        </div>

        {place.vicinity && <div className={styles.address}>{place.vicinity}</div>}

        <div className={styles.actions}>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapBtn}>
            Ver en Maps →
          </a>
          {activeItinerary && (
            <button className={styles.addBtn} onClick={() => onAddToItinerary(place)}>
              + Itinerario
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
