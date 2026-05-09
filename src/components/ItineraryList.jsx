import React from 'react'
import styles from './ItineraryList.module.css'

function formatDateShort(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

const STATUS_CONFIG = {
  progress: { label: '🔧 En progreso', color: '#8B6B4A', bg: 'rgba(139,107,74,0.1)' },
  ready:    { label: '✅ Listo',        color: '#3D6B4F', bg: 'rgba(61,107,79,0.1)' },
  archived: { label: '📦 Archivado',   color: '#6B5A3E', bg: 'rgba(107,90,62,0.1)' },
}

export default function ItineraryList({ itineraries, onSelect, onNew, onClose, onStatusChange }) {
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
              const status = itin.status || 'progress'
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={itin.id} className={styles.itemWrap}>
                  <button className={styles.item} onClick={() => onSelect(itin)}>
                    <div className={styles.itemEmoji}>🗺️</div>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemTop}>
                        <div className={styles.itemName}>{itin.name}</div>
                        <span className={styles.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                      </div>
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
                  <div className={styles.statusRow}>
                    {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                      <button key={key}
                        className={`${styles.statusBtn} ${status === key ? styles.statusActive : ''}`}
                        style={status === key ? { color: s.color, borderColor: s.color, background: s.bg } : {}}
                        onClick={e => { e.stopPropagation(); onStatusChange(itin.id, key) }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
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
