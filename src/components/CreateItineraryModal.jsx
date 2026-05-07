import React, { useState } from 'react'
import styles from './CreateItineraryModal.module.css'

export default function CreateItineraryModal({ onClose, onCreate, onAuto }) {
  const [form, setForm] = useState({ name: '', destination: '', startDate: '', endDate: '' })
  const [error, setError] = useState('')
  const today = new Date().toISOString().split('T')[0]

  const handleChange = e => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError('') }

  const getDayCount = () => {
    if (!form.startDate || !form.endDate) return 0
    return Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return setError('Ponle un nombre a tu viaje')
    if (!form.destination.trim()) return setError('Ingresa el destino')
    if (!form.startDate) return setError('Selecciona la fecha de inicio')
    if (!form.endDate) return setError('Selecciona la fecha de fin')
    if (new Date(form.endDate) < new Date(form.startDate)) return setError('La fecha de fin debe ser después del inicio')
    if (getDayCount() > 21) return setError('Máximo 21 días por itinerario')
    onCreate(form)
  }

  const days = getDayCount()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Nuevo itinerario</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Mode selector */}
        <div className={styles.modeRow}>
          <button className={`${styles.modeBtn} ${styles.modeManual} ${styles.modeActive}`}>
            ✏️ Manual
          </button>
          <button className={`${styles.modeBtn} ${styles.modeAuto}`} onClick={() => { onClose(); onAuto() }}>
            ✨ Automático
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label>Nombre del viaje</label>
            <input name="name" placeholder="ej. Escapada a Oaxaca" value={form.name} onChange={handleChange} />
          </div>
          <div className={styles.field}>
            <label>Destino principal</label>
            <input name="destination" placeholder="ej. Oaxaca, México" value={form.destination} onChange={handleChange} />
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
