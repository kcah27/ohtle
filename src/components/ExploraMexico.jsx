import React, { useEffect, useRef, useState } from 'react'
import styles from './ExploraMexico.module.css'
import { PUEBLOS_MAGICOS } from '../data/pueblosMagicos'

export default function ExploraMexico({ onClose }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [selected, setSelected] = useState(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  useEffect(() => {
    const k = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!k) return

    if (window.google?.maps) { setMapsLoaded(true); return }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${k}&language=es`
    script.async = true
    script.onload = () => setMapsLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 23.5, lng: -102.5 },
      zoom: 5,
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })
    mapInstance.current = map

    PUEBLOS_MAGICOS.forEach(pueblo => {
      const marker = new window.google.maps.Marker({
        position: { lat: pueblo.lat, lng: pueblo.lng },
        map,
        title: pueblo.nombre,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#C4834A',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        }
      })

      marker.addListener('click', () => {
        setSelected(pueblo)
        map.panTo({ lat: pueblo.lat, lng: pueblo.lng })
      })
    })
  }, [mapsLoaded])

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>🗺️</span>
            <div>
              <h2 className={styles.title}>Explora México</h2>
              <p className={styles.subtitle}>{PUEBLOS_MAGICOS.length} Pueblos Mágicos</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.mapWrap} ref={mapRef}>
            {!mapsLoaded && <div className={styles.loading}>Cargando mapa...</div>}
          </div>

          {selected && (
            <div className={styles.infoPanel}>
              <button className={styles.closeInfo} onClick={() => setSelected(null)}>✕</button>
              <div className={styles.infoPin}>📍</div>
              <h3 className={styles.infoName}>{selected.nombre}</h3>
              <p className={styles.infoEstado}>{selected.estado}</p>
              <div className={styles.infoBadge}>✨ Pueblo Mágico</div>
              <button className={styles.addBtn} onClick={() => {
                onClose()
              }}>+ Agregar a itinerario</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
