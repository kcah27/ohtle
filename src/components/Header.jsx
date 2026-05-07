import React from 'react'
import styles from './Header.module.css'

export default function Header({ itineraryCount, activeItinerary, onShowList, onNewItinerary }) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        O<span>h</span>tle
      </div>

      <div className={styles.actions}>
        {activeItinerary && (
          <div className={styles.activeTag}>
            🗺️ {activeItinerary.name}
          </div>
        )}
        <button className={styles.listBtn} onClick={onShowList}>
          Mis itinerarios {itineraryCount > 0 && <span className={styles.badge}>{itineraryCount}</span>}
        </button>
        <button className={styles.newBtn} onClick={onNewItinerary}>
          + Nuevo itinerario
        </button>
      </div>
    </header>
  )
}
