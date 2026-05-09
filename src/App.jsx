import React, { useState } from 'react'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import PlaceCard from './components/PlaceCard'
import CreateItineraryModal from './components/CreateItineraryModal'
import AddToDayModal from './components/AddToDayModal'
import ItineraryList from './components/ItineraryList'
import ItineraryView from './components/ItineraryView'
import AutoItineraryWizard from './components/AutoItineraryWizard'
import { usePlaces } from './hooks/usePlaces'
import { useItinerary } from './hooks/useItinerary'
import { useAutoItinerary } from './hooks/useAutoItinerary'
import styles from './App.module.css'

export default function App() {
  const { loading, error, places, search, getPhotoUrl } = usePlaces()
  const { itineraries, activeItinerary, setActiveItinerary, createItinerary, addPlaceToDay, removePlaceFromDay, updatePlace, movePlace, addEvent, removeEvent, updateDayLabel, deleteItinerary } = useItinerary()
  const { generate, generating } = useAutoItinerary()

  const [searched, setSearched] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAutoWizard, setShowAutoWizard] = useState(false)
  const [showList, setShowList] = useState(false)
  const [addingPlace, setAddingPlace] = useState(null)
  const [viewingItinerary, setViewingItinerary] = useState(null)

  const handleSearch = (params) => { setSearched(true); search(params) }

  const handleCreate = (formData) => {
    const newItin = createItinerary(formData)
    setShowCreateModal(false)
    setActiveItinerary(newItin)
  }

  const handleAutoGenerate = async (formData) => {
    const newItin = await generate(formData)
    if (!newItin) return
    try {
      const existing = JSON.parse(localStorage.getItem('ohtle_itineraries') || '[]')
      existing.push(newItin)
      localStorage.setItem('ohtle_itineraries', JSON.stringify(existing))
    } catch {}
    setShowAutoWizard(false)
    setActiveItinerary(newItin)
    setViewingItinerary(newItin)
    window.location.reload()
  }

  const handleAddToItinerary = (place) => { if (itineraries.length === 0) return; setAddingPlace(place) }

  const handleDaySelected = (itineraryId, dayId, place) => {
    addPlaceToDay(itineraryId, dayId, place)
    setAddingPlace(null)
    const itin = itineraries.find(i => i.id === itineraryId)
    if (itin) setActiveItinerary(itin)
  }

  const handleSelectItinerary = (itin) => { setActiveItinerary(itin); setShowList(false); setViewingItinerary(itin) }
  const handleDeleteItinerary = (id) => { deleteItinerary(id); setViewingItinerary(null) }

  if (viewingItinerary) {
    const current = itineraries.find(i => i.id === viewingItinerary.id) || viewingItinerary
    return (
      <>
        <Header itineraryCount={itineraries.length} activeItinerary={activeItinerary} onShowList={() => setShowList(true)} onNewItinerary={() => setShowCreateModal(true)} />
        <ItineraryView
          itinerary={current}
          onBack={() => setViewingItinerary(null)}
          onRemovePlace={removePlaceFromDay}
          onDelete={handleDeleteItinerary}
          onMove={movePlace}
          onUpdateDayLabel={updateDayLabel}
          onUpdatePlace={updatePlace}
          onAddEvent={addEvent}
          onRemoveEvent={removeEvent}
        />
        {showList && <ItineraryList itineraries={itineraries} onSelect={handleSelectItinerary} onNew={() => { setShowList(false); setShowCreateModal(true) }} onClose={() => setShowList(false)} />}
        {showCreateModal && <CreateItineraryModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} onAuto={() => { setShowCreateModal(false); setShowAutoWizard(true) }} />}
        {showAutoWizard && <AutoItineraryWizard onClose={() => setShowAutoWizard(false)} onGenerate={handleAutoGenerate} generating={generating} />}
      </>
    )
  }

  return (
    <div>
      <Header itineraryCount={itineraries.length} activeItinerary={activeItinerary} onShowList={() => setShowList(true)} onNewItinerary={() => setShowCreateModal(true)} />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Descubre lo <em>auténtico</em><br />donde estás</h1>
          <p className={styles.heroSub}>Recomendaciones locales reales · Apoya comunidades, no cadenas</p>
        </div>

        {activeItinerary && (
          <div className={styles.activeBar}>
            <span>🗺️ Agregando a: <strong>{activeItinerary.name}</strong></span>
            <button onClick={() => setViewingItinerary(activeItinerary)} className={styles.viewBtn}>Ver itinerario →</button>
          </div>
        )}

        <SearchBar onSearch={handleSearch} loading={loading} />
        {error && <div className={styles.error}>⚠️ {error}</div>}
        {loading && <div className={styles.loader}><span /><span /><span /></div>}

        {!loading && searched && places.length === 0 && !error && (
          <div className={styles.empty}><span className={styles.emptyIcon}>🔍</span><p>No se encontraron lugares con esos filtros.</p></div>
        )}
        {!loading && !searched && (
          <div className={styles.placeholder}><span className={styles.emptyIcon}>🗺️</span><p>Ingresa una ubicación para descubrir experiencias locales auténticas</p></div>
        )}
        {!loading && places.length > 0 && (
          <>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>Lugares encontrados</h2>
              <span className={styles.count}>{places.length} lugares</span>
            </div>
            <div className={styles.grid}>
              {places.map(place => (
                <PlaceCard key={place.place_id} place={place} getPhotoUrl={getPhotoUrl}
                  activeItinerary={itineraries.length > 0}
                  onAddToItinerary={handleAddToItinerary} />
              ))}
            </div>
          </>
        )}
      </main>

      {showCreateModal && <CreateItineraryModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} onAuto={() => { setShowCreateModal(false); setShowAutoWizard(true) }} />}
      {showAutoWizard && <AutoItineraryWizard onClose={() => setShowAutoWizard(false)} onGenerate={handleAutoGenerate} generating={generating} />}
      {showList && <ItineraryList itineraries={itineraries} onSelect={handleSelectItinerary} onNew={() => { setShowList(false); setShowCreateModal(true) }} onClose={() => setShowList(false)} />}
      {addingPlace && itineraries.length > 0 && (
        <AddToDayModal
          place={addingPlace} itineraries={itineraries} activeItinerary={activeItinerary}
          onAdd={handleDaySelected} onClose={() => setAddingPlace(null)}
        />
      )}
    </div>
  )
}
