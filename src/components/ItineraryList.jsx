import React from 'react'
import styles from './ItineraryList.module.css'

function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

export default function ItineraryList({ itineraries, onSelect, onNew, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Mis itinerarios</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {itineraries.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🗺️</span>
            <p>Aún no tienes itinerarios guardados</p>
          </div>
        ) : (
          <div className={styles.list}>
            {itineraries.map(itin => {
              const totalPlaces = itin.days.reduce((acc, d) => acc + d.places.length, 0)
              const dayCount = itin.days.length
              return (
                <button key={itin.id} className={styles.item} onClick={() => onSelect(itin)}>
                  <div className={styles.itemEmoji}>🗺️</div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>{itin.name}</div>
                    <div className={styles.itemMeta}>
                      <span>📍 {itin.destination}</span>
                      <span>📅 {formatDateShort(itin.startDate)} → {formatDateShort(itin.endDate)}</span>
                    </div>
                    <div className={styles.itemStats}>
                      <span>{dayCount} {dayCount === 1 ? 'día' : 'días'}</span>
                      <span>·</span>
                      <span>{totalPlaces} {totalPlaces === 1 ? 'lugar' : 'lugares'}</span>
                    </div>
                  </div>
                  <span className={styles.arrow}>→</span>
                </button>
              )
            })}
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.newBtn} onClick={onNew}>+ Nuevo itinerario</button>
        </div>
      </div>
    </div>
  )
}
