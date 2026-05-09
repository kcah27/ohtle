import React, { useState } from 'react'
import styles from './AddEventModal.module.css'

const EVENT_TYPES = [
  { id: 'flight',   label: 'Vuelo',           icon: '✈️', color: '#3D6B4F' },
  { id: 'transfer', label: 'Transfer/Taxi',    icon: '🚕', color: '#8B6B4A' },
  { id: 'checkin',  label: 'Check-in Hotel',   icon: '🏨', color: '#C4834A' },
  { id: 'checkout', label: 'Check-out Hotel',  icon: '🧳', color: '#C4834A' },
  { id: 'reminder', label: 'Recordatorio',     icon: '📌', color: '#1A1208' },
]

export default function AddEventModal({ dayId, itineraryId, onAdd, onClose, editingEvent, allDays }) {
  const [type, setType]         = useState(editingEvent?.type || '')
  const [title, setTitle]       = useState(editingEvent?.title || '')
  const [time, setTime]         = useState(editingEvent?.time || '')
  const [note, setNote]         = useState(editingEvent?.note || '')
  const [origin, setOrigin]     = useState(editingEvent?.origin || '')
  const [destination, setDest]  = useState(editingEvent?.destination || '')
  const [arrivalTime, setArr]   = useState(editingEvent?.arrivalTime || '')
  const [arrivalDayId, setArrDay] = useState(editingEvent?.arrivalDayId || dayId)
  const [error, setError]       = useState('')

  const selectedType = EVENT_TYPES.find(t => t.id === type)
  const isEditing = !!editingEvent
  const isFlight = type === 'flight'

  const handleSave = () => {
    if (!type) return setError('Selecciona el tipo de evento')
    if (isFlight && !origin.trim()) return setError('Escribe el origen del vuelo')
    if (isFlight && !destination.trim()) return setError('Escribe el destino del vuelo')
    if (!isFlight && !title.trim()) return setError('Agrega una descripción')

    const flightTitle = isFlight ? `${origin.trim()} → ${destination.trim()}` : title.trim()

    const data = {
      type, title: flightTitle, time, note: note.trim(),
      icon: selectedType.icon, color: selectedType.color,
      ...(isFlight && { origin: origin.trim(), destination: destination.trim(), arrivalTime, arrivalDayId })
    }
    onAdd(itineraryId, dayId, data)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{isEditing ? 'Editar evento' : 'Agregar evento'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.typeGrid}>
            {EVENT_TYPES.map(t => (
              <button key={t.id}
                className={`${styles.typeBtn} ${type === t.id ? styles.typeSelected : ''}`}
                style={type === t.id ? { borderColor: t.color, background: t.color+'15' } : {}}
                onClick={() => { setType(t.id); if (!isEditing && t.id !== 'flight') setTitle(t.label) }}>
                <span>{t.icon}</span>
                <span className={styles.typeLabel}>{t.label}</span>
              </button>
            ))}
          </div>

          {isFlight ? (
            <>
              <div className={styles.flightRow}>
                <div className={styles.field}>
                  <label>Sale de</label>
                  <input className={styles.input} placeholder="ej. CDMX (MEX)"
                    value={origin} onChange={e => { setOrigin(e.target.value); setError('') }} />
                </div>
                <div className={styles.flightArrow}>→</div>
                <div className={styles.field}>
                  <label>Llega a</label>
                  <input className={styles.input} placeholder="ej. Santiago (SCL)"
                    value={destination} onChange={e => { setDest(e.target.value); setError('') }} />
                </div>
              </div>

              <div className={styles.flightRow}>
                <div className={styles.field}>
                  <label>Hora de salida</label>
                  <input type="time" className={styles.input} value={time} onChange={e => setTime(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label>Hora de llegada</label>
                  <input type="time" className={styles.input} value={arrivalTime} onChange={e => setArr(e.target.value)} />
                </div>
              </div>

              {allDays && allDays.length > 1 && (
                <div className={styles.field}>
                  <label>¿En qué día llegas?</label>
                  <select className={styles.input} value={arrivalDayId} onChange={e => setArrDay(e.target.value)}>
                    {allDays.map(d => (
                      <option key={d.id} value={d.id}>
                        Día {d.dayNumber} · {new Date(d.date+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',month:'short',day:'numeric'})}
                        {d.cityLabel ? ` · ${d.cityLabel}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <div className={styles.field}>
              <label>Descripción</label>
              <input className={styles.input} placeholder="ej. Transfer al aeropuerto"
                value={title} onChange={e => { setTitle(e.target.value); setError('') }} />
            </div>
          )}

          <div className={styles.field}>
            <label>Hora {isFlight ? 'de salida (si no la pusiste arriba)' : '(opcional)'}</label>
            {!isFlight && <input type="time" className={styles.input} value={time} onChange={e => setTime(e.target.value)} />}
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
          <button className={styles.addBtn} onClick={handleSave}>
            {isEditing ? 'Guardar cambios' : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}
