import React, { useState } from 'react'
import styles from './AutoItineraryWizard.module.css'

const STEPS = [
  { id: 'destination', title: '¿A dónde vas?', subtitle: 'Destino y fechas de tu viaje' },
  { id: 'rhythm', title: '¿Qué ritmo quieres?', subtitle: 'Cuántas actividades por día' },
  { id: 'interests', title: '¿Qué te interesa?', subtitle: 'Selecciona todo lo que te llame' },
  { id: 'food', title: '¿Qué te gusta comer?', subtitle: 'Para recomendarte los mejores lugares' },
  { id: 'company', title: '¿Con quién viajas?', subtitle: 'Adaptamos las recomendaciones' },
]

const RHYTHMS = [
  { id: 'relaxed', label: 'Relajado', desc: '2–3 lugares por día', icon: '🌿' },
  { id: 'balanced', label: 'Equilibrado', desc: '3–4 lugares por día', icon: '⚖️' },
  { id: 'intense', label: 'Intenso', desc: '5+ lugares por día', icon: '🚀' },
]

const INTERESTS = [
  { id: 'tourist_attraction', label: 'Atracciones', icon: '🏛' },
  { id: 'museum', label: 'Museos', icon: '🏺' },
  { id: 'park', label: 'Naturaleza', icon: '🌿' },
  { id: 'art_gallery', label: 'Arte', icon: '🎨' },
  { id: 'night_club', label: 'Vida nocturna', icon: '🌙' },
  { id: 'shopping_mall', label: 'Mercados', icon: '🧵' },
]

const FOODS = [
  { id: 'typical', label: 'Típica local', icon: '🍲', keyword: 'comida tipica' },
  { id: 'seafood', label: 'Mariscos', icon: '🦐', keyword: 'mariscos' },
  { id: 'vegetarian', label: 'Vegetariana', icon: '🥗', keyword: 'vegetariano' },
  { id: 'international', label: 'Internacional', icon: '🌍', keyword: 'restaurante internacional' },
  { id: 'all', label: 'De todo', icon: '😋', keyword: 'restaurante' },
]

const COMPANY = [
  { id: 'solo', label: 'Solo', icon: '🧍' },
  { id: 'couple', label: 'En pareja', icon: '👫' },
  { id: 'friends', label: 'Con amigos', icon: '👯' },
  { id: 'family', label: 'En familia', icon: '👨‍👩‍👧' },
]

const today = new Date().toISOString().split('T')[0]

export default function AutoItineraryWizard({ onClose, onGenerate, generating }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    rhythm: '',
    interests: [],
    food: '',
    company: '',
  })
  const [error, setError] = useState('')

  const getDayCount = () => {
    if (!form.startDate || !form.endDate) return 0
    return Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1
  }

  const toggleInterest = (id) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(id) ? f.interests.filter(i => i !== id) : [...f.interests, id]
    }))
  }

  const validateStep = () => {
    setError('')
    if (step === 0) {
      if (!form.destination.trim()) return setError('Escribe el destino') || false
      if (!form.startDate) return setError('Selecciona la fecha de inicio') || false
      if (!form.endDate) return setError('Selecciona la fecha de fin') || false
      if (new Date(form.endDate) < new Date(form.startDate)) return setError('La fecha de fin debe ser después del inicio') || false
      if (getDayCount() > 21) return setError('Máximo 21 días') || false
    }
    if (step === 1 && !form.rhythm) return setError('Selecciona el ritmo') || false
    if (step === 2 && form.interests.length === 0) return setError('Selecciona al menos un interés') || false
    if (step === 3 && !form.food) return setError('Selecciona tu preferencia de comida') || false
    if (step === 4 && !form.company) return setError('Selecciona con quién viajas') || false
    return true
  }

  const next = () => { if (validateStep()) { if (step < STEPS.length - 1) setStep(s => s + 1); else onGenerate(form) } }
  const back = () => { setError(''); setStep(s => s - 1) }

  const days = getDayCount()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <div className={styles.stepIndicator}>
            {STEPS.map((s, i) => (
              <div key={s.id} className={`${styles.dot} ${i === step ? styles.dotActive : ''} ${i < step ? styles.dotDone : ''}`} />
            ))}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.stepTitle}>{STEPS[step].title}</div>
          <div className={styles.stepSubtitle}>{STEPS[step].subtitle}</div>

          {/* Step 0 — Destination + dates */}
          {step === 0 && (
            <div className={styles.fields}>
              <input
                className={styles.input}
                placeholder="ej. Japón, Oaxaca, Taxco..."
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              />
              <div className={styles.dateRow}>
                <div className={styles.field}>
                  <label>Desde</label>
                  <input type="date" className={styles.input} min={today} value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Hasta</label>
                  <input type="date" className={styles.input} min={form.startDate || today} value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              {days > 0 && <div className={styles.daysBadge}>📅 {days} {days === 1 ? 'día' : 'días'} de viaje</div>}
            </div>
          )}

          {/* Step 1 — Rhythm */}
          {step === 1 && (
            <div className={styles.optionGrid}>
              {RHYTHMS.map(r => (
                <button key={r.id} className={`${styles.optionCard} ${form.rhythm === r.id ? styles.selected : ''}`}
                  onClick={() => setForm(f => ({ ...f, rhythm: r.id }))}>
                  <span className={styles.optionIcon}>{r.icon}</span>
                  <span className={styles.optionLabel}>{r.label}</span>
                  <span className={styles.optionDesc}>{r.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — Interests (multi) */}
          {step === 2 && (
            <div className={styles.chipGrid}>
              {INTERESTS.map(i => (
                <button key={i.id} className={`${styles.chip} ${form.interests.includes(i.id) ? styles.chipActive : ''}`}
                  onClick={() => toggleInterest(i.id)}>
                  {i.icon} {i.label}
                </button>
              ))}
            </div>
          )}

          {/* Step 3 — Food */}
          {step === 3 && (
            <div className={styles.chipGrid}>
              {FOODS.map(f => (
                <button key={f.id} className={`${styles.chip} ${form.food === f.id ? styles.chipActive : ''}`}
                  onClick={() => setForm(fm => ({ ...fm, food: f.id }))}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Step 4 — Company */}
          {step === 4 && (
            <div className={styles.optionGrid}>
              {COMPANY.map(c => (
                <button key={c.id} className={`${styles.optionCard} ${form.company === c.id ? styles.selected : ''}`}
                  onClick={() => setForm(f => ({ ...f, company: c.id }))}>
                  <span className={styles.optionIcon}>{c.icon}</span>
                  <span className={styles.optionLabel}>{c.label}</span>
                </button>
              ))}
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          {step > 0 && <button className={styles.backBtn} onClick={back}>← Atrás</button>}
          <button className={styles.nextBtn} onClick={next} disabled={generating}>
            {generating ? 'Generando...' : step === STEPS.length - 1 ? '✨ Generar itinerario' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  )
}
