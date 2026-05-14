import React, { useEffect, useRef, useState } from 'react'
import styles from './ExploraMexico.module.css'
import { PUEBLOS_MAGICOS } from '../data/pueblosMagicos'

export default function ExploraMexico({ onClose }) {
  const mapRef = useRef(null)
  const [mapsReady, setMapsReady] = useState(!!window.google?.maps)
  const [selected, setSelected] = useState(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (window.google?.maps) { setMapsReady(true); return }
    fetch('/api/maps-key').then(r => r.json()).then(({ key }) => {
      if (document.querySelector('script[data-maps]')) { setMapsReady(true); return }
      const s = document.createElement('script')
      s.dataset.maps = '1'
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + key + '&language=es'
      s.onload = () => setMapsReady(true)
      document.head.appendChild(s)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstance.current) return
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 23.5, lng: -102.5 },
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
    })
    mapInstance.current = map
    PUEBLOS_MAGICOS.forEach(pueblo => {
      const marker = new window.google.maps.Marker({
        position: { lat: pueblo.lat, lng: pueblo.lng },
        map,
        title: pueblo.nombre,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#C4834A', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2.5 }
      })
      marker.addListener('click', () => {
        map.panTo({ lat: pueblo.lat, lng: pueblo.lng })
        setSelected(pueblo)
      })
    })
  }, [mapsReady])

  return (
    <div className={styles.overlay}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>Oh<span>tle</span></span>
          <span className={styles.subtitle}>Explora México</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.counter}>{PUEBLOS_MAGICOS.length} Pueblos Mágicos</span>
          <button className={styles.closeBtn} onClick={onClose}>✕ Cerrar</button>
        </div>
      </div>
      <div className={styles.body}>
        <div ref={mapRef} className={styles.map}>
          {!mapsReady && <div className={styles.loading}>Cargando mapa...</div>}
        </div>
        {selected && (
          <div className={styles.panel}>
            <button className={styles.panelClose} onClick={() => setSelected(null)}>✕</button>
            <div className={styles.panelPin}>📍</div>
            <h3 className={styles.panelName}>{selected.nombre}</h3>
            <p className={styles.panelEstado}>{selected.estado}</p>
            <div className={styles.panelBadge}>✨ Pueblo Mágico</div>
            <button className={styles.panelBtn} onClick={onClose}>+ Agregar a itinerario</button>
          </div>
        )}
      </div>
    </div>
  )
}
