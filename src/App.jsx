import React, { useState } from 'react'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import PlaceCard from './components/PlaceCard'
import { usePlaces } from './hooks/usePlaces'
import styles from './App.module.css'

export default function App() {
  const { loading, error, places, search, getPhotoUrl } = usePlaces()
  const [searched, setSearched] = useState(false)

  const handleSearch = (params) => {
    setSearched(true)
    search(params)
  }

  return (
    <div>
      <Header />

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Descubre lo <em>auténtico</em><br />donde estás
          </h1>
          <p className={styles.heroSub}>
            Recomendaciones locales reales · Apoya comunidades, no cadenas
          </p>
        </div>

        <SearchBar onSearch={handleSearch} loading={loading} />

        {error && (
          <div className={styles.error}>
            ⚠️ {error}. Verifica que tu API key tenga Places API y Geocoding API habilitadas.
          </div>
        )}

        {loading && (
          <div className={styles.loader}>
            <span /><span /><span />
          </div>
        )}

        {!loading && searched && places.length === 0 && !error && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔍</span>
            <p>No se encontraron lugares con esos filtros.</p>
            <p>Intenta cambiar las categorías o ampliar la búsqueda.</p>
          </div>
        )}

        {!loading && !searched && (
          <div className={styles.placeholder}>
            <span className={styles.emptyIcon}>🗺️</span>
            <p>Ingresa una ubicación para descubrir experiencias locales auténticas</p>
          </div>
        )}

        {!loading && places.length > 0 && (
          <>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>Lugares encontrados</h2>
              <span className={styles.count}>{places.length} lugares</span>
            </div>
            <div className={styles.grid}>
              {places.map(place => (
                <PlaceCard
                  key={place.place_id}
                  place={place}
                  getPhotoUrl={getPhotoUrl}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
