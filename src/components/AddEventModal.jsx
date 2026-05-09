import React, { useState } from 'react'
import styles from './AddEventModal.module.css'

const EVENT_TYPES = [
  { id: 'flight', label: 'Vuelo', icon: '✈️', color: '#3D6B4F' },
  { id: 'transfer', label: 'Transfer/Taxi', icon: '🚕', color: '#8B6B4A' },
  { id: 'checkin', label: 'Check-in Hotel', icon: '🏨', color: '#C4834A' },
  { id: 'checkout', label: 'Check-out Hotel', icon: '🧳', color: '#C4834A' },
  { id: 'reminder', label: 'Recordatorio', icon: '📌', color: '#1A1208' },
]

export default function AddEventModal({ dayId, itineraryId, onAdd, onClose }) {
  const [type, setType] = useState('')
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const selectedType = EVENT_TYPES.find(t => t.id === type)

  const handleAdd = () => {
    if (!type) return setError('Selecciona el tipo de evento')
    if (!title.trim()) return setError('Agrega una descripción')
    onAdd(itineraryId, dayId, { type, title: title.trim(), time, note, icon: selectedType.icon, color: selectedType.color })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Agregar evento</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.typeGrid}>
            {EVENT_TYPES.map(t => (
              <button key={t.id} className={`${styles.typeBtn} ${type === t.id ? styles.typeSelected : ''}`}
                style={type === t.id ? { borderColor: t.color, background: t.color + '15' } : {}}
                onClick={() => { setType(t.id); setTitle(t.label) }}>
                <span>{t.icon}</span>
                <span className={styles.typeLabel}>{t.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.field}>
            <label>Descripción</label>
            <input className={styles.input} placeholder="ej. Vuelo CDMX → Tokio · AA123"
              value={title} onChange={e => { setTitle(e.target.value); setError('') }} />
          </div>

          <div className={styles.field}>
            <label>Hora (opcional)</label>
            <input type="time" className={styles.input} value={time} onChange={e => setTime(e.target.value)} />
          </div>

          <div className={styles.field}>
            <label>Nota (opcional)</label>
            <input className={styles.input} placeholder="ej. Terminal 2, puerta B14"
              value={note} onChange={e => setNote(e.target.value)} />
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.addBtn} onClick={handleAdd}>+ Agregar</button>
        </div>
      </div>
    </div>
  )
}
