import React, { useState } from 'react'
import styles from './CreateItineraryModal.module.css'

const today = new Date().toISOString().split('T')[0]

function CityRow({ city, onChange, onRemove, canRemove }) {
  return (
    <div className={styles.cityRow}>
      <input className={styles.cityInput} placeholder="ej. Tokio" value={city.name}
        onChange={e => onChange({ ...city, name: e.target.value })} />
      <div className={styles.cityDays}>
        <button className={styles.dayBtn} onClick={() => onChange({ ...city, days: Math.max(1, city.days-1) })}>−</button>
        <span>{city.days}d</span>
        <button className={styles.dayBtn} onClick={() => onChange({ ...city, days: city.days+1 })}>+</button>
      </div>
      {canRemove && <button className={styles.removeCityBtn} onClick={onRemove}>✕</button>}
    </div>
  )
}

export default function CreateItineraryModal({ onClose, onCreate, onAuto }) {
  const [form, setForm] = useState({ name: '', destination: '', startDate: '', endDate: '' })
  const [cities, setCities] = useState([{ id: 1, name: '', days: 3 }])
  const [multiCity, setMultiCity] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError('') }

  const getDayCount = () => {
    if (!form.startDate || !form.endDate) return 0
    return Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1
  }

  const totalCityDays = cities.reduce((a, c) => a + c.days, 0)
  const days = getDayCount()

  const handleSubmit = () => {
    if (!form.name.trim()) return setError('Ponle un nombre a tu viaje')
    if (!form.destination.trim()) return setError('Ingresa el destino')
    if (!form.startDate) return setError('Selecciona la fecha de inicio')
    if (!form.endDate) return setError('Selecciona la fecha de fin')
    if (new Date(form.endDate) < new Date(form.startDate)) return setError('La fecha de fin debe ser después del inicio')
    if (days > 21) return setError('Máximo 21 días por itinerario')
    if (multiCity) {
      if (cities.some(c => !c.name.trim())) return setError('Ponle nombre a todas las ciudades')
      if (totalCityDays !== days) return setError(`Los días de las ciudades (${totalCityDays}) deben sumar ${days} días`)
    }
    onCreate({ ...form, cities: multiCity ? cities : null })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Nuevo itinerario</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modeRow}>
          <button className={`${styles.modeBtn} ${styles.modeActive}`}>✏️ Manual</button>
          <button className={`${styles.modeBtn} ${styles.modeAuto}`} onClick={() => { onClose(); onAuto() }}>✨ Automático</button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label>Nombre del viaje</label>
            <input name="name" placeholder="ej. Escapada a Oaxaca" value={form.name} onChange={handleChange} />
          </div>
          <div className={styles.field}>
            <label>Destino principal</label>
            <input name="destination" placeholder="ej. Japón, Oaxaca, Taxco..." value={form.destination} onChange={handleChange} />
          </div>
          <div className={styles.dateRow}>
            <div className={styles.field}>
              <label>Fecha de inicio</label>
              <input type="date" name="startDate" min={today} value={form.startDate} onChange={handleChange} />
            </div>
            <div className={styles.field}>
              <label>Fecha de fin</label>
              <input type="date" name="endDate" min={form.startDate || today} value={form.endDate} onChange={handleChange} />
            </div>
          </div>
          {days > 0 && <div className={styles.daysBadge}>📅 {days} {days === 1 ? 'día' : 'días'} de viaje</div>}

          {/* Multi-city toggle */}
          {days > 0 && (
            <div className={styles.multiCityToggle}>
              <label className={styles.toggleLabel}>
                <input type="checkbox" checked={multiCity} onChange={e => setMultiCity(e.target.checked)} />
                <span>¿Visitas varias ciudades?</span>
              </label>
            </div>
          )}

          {/* City breakdown */}
          {multiCity && days > 0 && (
            <div className={styles.citiesSection}>
              <div className={styles.citiesLabel}>Ciudades y días en cada una</div>
              {cities.map(city => (
                <CityRow key={city.id} city={city}
                  onChange={updated => setCities(cs => cs.map(c => c.id === city.id ? updated : c))}
                  onRemove={() => setCities(cs => cs.filter(c => c.id !== city.id))}
                  canRemove={cities.length > 1} />
              ))}
              <button className={styles.addCityBtn} onClick={() => setCities(cs => [...cs, { id: Date.now(), name: '', days: 1 }])}>
                + Agregar ciudad
              </button>
              <div className={`${styles.daysBadge} ${totalCityDays !== days ? styles.daysWarning : ''}`}>
                {totalCityDays} de {days} días asignados
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.createBtn} onClick={handleSubmit}>Crear itinerario</button>
        </div>
      </div>
    </div>
  )
}
