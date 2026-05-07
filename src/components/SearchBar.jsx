import React, { useState } from 'react'
import styles from './SearchBar.module.css'

const FILTERS = [
  { type: 'tourist_attraction', label: '🏛 Atracciones' },
  { type: 'restaurant', label: '🍽 Restaurantes' },
  { type: 'lodging', label: '🏡 Hospedaje' },
  { type: 'museum', label: '🏺 Museos' },
  { type: 'park', label: '🌿 Naturaleza' },
  { type: 'store', label: '🧵 Artesanías' },
]

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState(['tourist_attraction'])
  const [geoLoading, setGeoLoading] = useState(false)

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter(t => t !== type) : prev
        : [...prev, type]
    )
  }

  const handleSearch = () => {
    if (!query.trim()) return
    onSearch({ query: query.trim(), types: selectedTypes })
  }

  const handleGeo = () => {
    if (!navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        setGeoLoading(false)
        onSearch({ lat, lng, types: selectedTypes })
      },
      () => {
        setGeoLoading(false)
        alert('No se pudo obtener tu ubicación. Escribe el lugar manualmente.')
      }
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <input
          type="text"
          className={styles.input}
          placeholder="¿Dónde quieres explorar? (ej. Teotihuacán, Oaxaca, Taxco...)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          className={`${styles.btn} ${styles.outline}`}
          onClick={handleGeo}
          disabled={geoLoading || loading}
        >
          {geoLoading ? '⏳' : '📍'} {geoLoading ? 'Buscando...' : 'Mi ubicación'}
        </button>
        <button
          className={`${styles.btn} ${styles.primary}`}
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      <div className={styles.chips}>
        {FILTERS.map(f => (
          <button
            key={f.type}
            className={`${styles.chip} ${selectedTypes.includes(f.type) ? styles.active : ''}`}
            onClick={() => toggleType(f.type)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
