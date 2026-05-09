import React, { useState } from 'react'
import styles from './CreateItineraryModal.module.css'

const today = new Date().toISOString().split('T')[0]

function formatShort(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

function daysBetween(a, b) {
  if (!a || !b) return 0
  return Math.round((new Date(b) - new Date(a)) / 86400000) + 1
}

function CityRow({ city, onChange, onRemove, canRemove, tripStart, tripEnd, isFirst }) {
  return (
    <div className={styles.cityBlock}>
      <div className={styles.cityRow}>
        <input className={styles.cityInput} placeholder="ej. CDMX, Santiago..."
          value={city.name} onChange={e => onChange({ ...city, name: e.target.value })} />
        {canRemove && <button className={styles.removeCityBtn} onClick={onRemove}>✕</button>}
      </div>
      <div className={styles.cityDates}>
        {!isFirst && (
          <div className={styles.cityDateField}>
            <label>Llegada</label>
            <input type="date" className={styles.cityDateInput}
              min={tripStart} max={tripEnd}
              value={city.startDate}
              onChange={e => onChange({ ...city, startDate: e.target.value })} />
          </div>
        )}
        {!isFirst && <div className={styles.cityDateArrow}>→</div>}
        <div className={styles.cityDateField}>
          <label>Salida</label>
          <input type="date" className={styles.cityDateInput}
            min={city.startDate || tripStart} max={tripEnd}
            value={city.endDate}
            onChange={e => onChange({ ...city, endDate: e.target.value })} />
        </div>
        {((isFirst && city.endDate) || (!isFirst && city.startDate && city.endDate)) && (
          <div className={styles.cityDaysCount}>
            {isFirst
              ? '1d'
              : `${daysBetween(city.startDate, city.endDate)}d`}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CreateItineraryModal({ onClose, onCreate, onAuto }) {
  const [form, setForm] = useState({ name: '', destination: '', startDate: '', endDate: '' })
  const [cities, setCities] = useState([{ id: 1, name: '', startDate: '', endDate: '' }])
  const [multiCity, setMultiCity] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError('') }

  const getDayCount = () => {
    if (!form.startDate || !form.endDate) return 0
    return Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1
  }

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
      // First city only needs endDate, rest need both
      if (!cities[0].endDate) return setError('Agrega la fecha de salida a la primera ciudad')
      if (cities.slice(1).some(c => !c.startDate || !c.endDate)) return setError('Agrega fechas de llegada y salida a todas las ciudades')
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

          {days > 0 && (
            <div className={styles.multiCityToggle}>
              <label className={styles.toggleLabel}>
                <input type="checkbox" checked={multiCity} onChange={e => setMultiCity(e.target.checked)} />
                <span>¿En qué ciudades estarás y cuándo?</span>
              </label>
            </div>
          )}

          {multiCity && days > 0 && (
            <div className={styles.citiesSection}>
              <div className={styles.citiesLabel}>Escalas del viaje</div>
              {cities.map((city, idx) => (
                <CityRow key={city.id} city={city}
                  onChange={updated => setCities(cs => cs.map(c => c.id === city.id ? updated : c))}
                  onRemove={() => setCities(cs => cs.filter(c => c.id !== city.id))}
                  canRemove={cities.length > 1}
                  tripStart={form.startDate}
                  tripEnd={form.endDate}
                  isFirst={idx === 0} />
              ))}
              <button className={styles.addCityBtn}
                onClick={() => setCities(cs => [...cs, { id: Date.now(), name: '', startDate: '', endDate: '' }])}>
                + Agregar escala
              </button>
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
