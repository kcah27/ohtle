import React from 'react'
import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        O<span>h</span>tle
      </div>
      <div className={styles.tagline}>Turismo con raíz</div>
    </header>
  )
}
