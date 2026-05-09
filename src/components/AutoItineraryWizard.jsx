import React, { useState } from 'react'
import styles from './AutoItineraryWizard.module.css'

const RHYTHMS = [
  { id: 'relaxed', label: 'Relajado', desc: '2–3 atracciones por día', icon: '🌿' },
  { id: 'balanced', label: 'Equilibrado', desc: '3–4 atracciones por día', icon: '⚖️' },
  { id: 'intense', label: 'Intenso', desc: '5+ atracciones por día', icon: '🚀' },
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
  { id: 'typical', label: 'Típica local', icon: '🍲' },
  { id: 'seafood', label: 'Mariscos', icon: '🦐' },
  { id: 'vegetarian', label: 'Vegetariana', icon: '🥗' },
  { id: 'international', label: 'Internacional', icon: '🌍' },
  { id: 'all', label: 'De todo', icon: '😋' },
]

const COMPANY = [
  { id: 'solo', label: 'Solo', icon: '🧍' },
  { id: 'couple', label: 'En pareja', icon: '👫' },
  { id: 'friends', label: 'Con amigos', icon: '👯' },
  { id: 'family', label: 'En familia', icon: '👨‍👩‍👧' },
]

const today = new Date().toISOString().split('T')[0]

// Detect if destination is a country/region (needs city breakdown)
const GENERIC_TYPES = ['country', 'continent', 'political', 'administrative_area_level_1']

function CityRow({ city, onChange, onRemove, canRemove }) {
  return (
    <div className={styles.cityRow}>
      <input
        className={styles.cityInput}
        placeholder="ej. Tokio"
        value={city.name}
        onChange={e => onChange({ ...city, name: e.target.value })}
      />
      <div className={styles.cityDays}>
        <button className={styles.dayBtn} onClick={() => onChange({ ...city, days: Math.max(1, city.days - 1) })}>−</button>
        <span>{city.days} {city.days === 1 ? 'día' : 'días'}</span>
        <button className={styles.dayBtn} onClick={() => onChange({ ...city, days: city.days + 1 })}>+</button>
      </div>
      {canRemove && <button className={styles.removeCityBtn} onClick={onRemove}>✕</button>}
    </div>
  )
}

export default function AutoItineraryWizard({ onClose, onGenerate, generating }) {
  const [step, setStep] = useState(0)
  const [geoType, setGeoType] = useState(null) // 'generic' | 'specific' | null
  const [cities, setCities] = useState([{ id: 1, name: '', days: 3 }])
  const [form, setForm] = useState({
    destination: '', startDate: '', endDate: '',
    rhythm: '', interests: [], food: '', company: '',
  })
  const [error, setError] = useState('')
  const [checkingGeo, setCheckingGeo] = useState(false)

  const getDayCount = () => {
    if (!form.startDate || !form.endDate) return 0
    return Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1
  }

  const totalCityDays = cities.reduce((a, c) => a + c.days, 0)

  // Steps depend on whether destination is generic
  const steps = [
    'destination',
    ...(geoType === 'generic' ? ['cities'] : []),
    'rhythm', 'interests', 'food', 'company'
  ]
  const totalSteps = steps.length

  const checkDestinationType = async () => {
    if (!form.destination.trim()) return setError('Escribe el destino') || false
    setCheckingGeo(true)
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(form.destination)}`)
      const data = await res.json()
      if (data.status !== 'OK') { setError('No encontramos ese destino, intenta ser más específico'); setCheckingGeo(false); return false }
      const types = data.results[0]?.types || []
      const isGeneric = types.some(t => GENERIC_TYPES.includes(t))
      setGeoType(isGeneric ? 'generic' : 'specific')
      setCheckingGeo(false)
      return true
    } catch {
      setCheckingGeo(false)
      return true // fallback: continue
    }
  }

  const toggleInterest = (id) => {
    setForm(f => ({ ...f, interests: f.interests.includes(id) ? f.interests.filter(i => i !== id) : [...f.interests, id] }))
  }

  const validateStep = async () => {
    setError('')
    const currentStep = steps[step]

    if (currentStep === 'destination') {
      if (!form.startDate) return setError('Selecciona la fecha de inicio') || false
      if (!form.endDate) return setError('Selecciona la fecha de fin') || false
      if (new Date(form.endDate) < new Date(form.startDate)) return setError('La fecha de fin debe ser después del inicio') || false
      if (getDayCount() > 21) return setError('Máximo 21 días') || false
      return await checkDestinationType()
    }
    if (currentStep === 'cities') {
      if (cities.some(c => !c.name.trim())) return setError('Ponle nombre a todas las ciudades') || false
      if (totalCityDays !== getDayCount()) return setError(`Los días de las ciudades (${totalCityDays}) deben sumar ${getDayCount()} días en total`) || false
    }
    if (currentStep === 'rhythm' && !form.rhythm) return setError('Selecciona el ritmo') || false
    if (currentStep === 'interests' && form.interests.length === 0) return setError('Selecciona al menos un interés') || false
    if (currentStep === 'food' && !form.food) return setError('Selecciona tu preferencia de comida') || false
    if (currentStep === 'company' && !form.company) return setError('Selecciona con quién viajas') || false
    return true
  }

  const next = async () => {
    const valid = await validateStep()
    if (!valid) return
    if (step < totalSteps - 1) setStep(s => s + 1)
    else onGenerate({ ...form, cities: geoType === 'generic' ? cities : null, isGeneric: geoType === 'generic' })
  }

  const back = () => { setError(''); setStep(s => s - 1) }
  const days = getDayCount()
  const currentStep = steps[step]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <div className={styles.stepIndicator}>
            {steps.map((s, i) => (
              <div key={s} className={`${styles.dot} ${i === step ? styles.dotActive : ''} ${i < step ? styles.dotDone : ''}`} />
            ))}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>

          {currentStep === 'destination' && (
            <>
              <div className={styles.stepTitle}>¿A dónde vas?</div>
              <div className={styles.stepSubtitle}>Destino y fechas de tu viaje</div>
              <div className={styles.fields}>
                <input className={styles.input} placeholder="ej. Japón, Oaxaca, Taxco..." value={form.destination}
                  onChange={e => { setForm(f => ({ ...f, destination: e.target.value })); setGeoType(null) }} />
                <div className={styles.dateRow}>
                  <div className={styles.field}><label>Desde</label>
                    <input type="date" className={styles.input} min={today} value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                  <div className={styles.field}><label>Hasta</label>
                    <input type="date" className={styles.input} min={form.startDate || today} value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                </div>
                {days > 0 && <div className={styles.daysBadge}>📅 {days} {days === 1 ? 'día' : 'días'} de viaje</div>}
              </div>
            </>
          )}

          {currentStep === 'cities' && (
            <>
              <div className={styles.stepTitle}>¿Qué ciudades vas a visitar?</div>
              <div className={styles.stepSubtitle}>
                Detectamos que <strong>{form.destination}</strong> es un destino amplio. Dinos las ciudades y cuántos días en cada una. Total: {getDayCount()} días.
              </div>
              <div className={styles.citiesList}>
                {cities.map((city, idx) => (
                  <CityRow
                    key={city.id}
                    city={city}
                    onChange={updated => setCities(cs => cs.map(c => c.id === city.id ? updated : c))}
                    onRemove={() => setCities(cs => cs.filter(c => c.id !== city.id))}
                    canRemove={cities.length > 1}
                  />
                ))}
                <button className={styles.addCityBtn} onClick={() => setCities(cs => [...cs, { id: Date.now(), name: '', days: 1 }])}>
                  + Agregar ciudad
                </button>
                <div className={`${styles.daysBadge} ${totalCityDays !== getDayCount() ? styles.daysWarning : ''}`}>
                  {totalCityDays} de {getDayCount()} días asignados
                </div>
              </div>
            </>
          )}

          {currentStep === 'rhythm' && (
            <>
              <div className={styles.stepTitle}>¿Qué ritmo quieres?</div>
              <div className={styles.stepSubtitle}>Cuántas atracciones por día (comidas y hospedaje siempre incluidos)</div>
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
            </>
          )}

          {currentStep === 'interests' && (
            <>
              <div className={styles.stepTitle}>¿Qué te interesa?</div>
              <div className={styles.stepSubtitle}>Selecciona todo lo que te llame</div>
              <div className={styles.chipGrid}>
                {INTERESTS.map(i => (
                  <button key={i.id} className={`${styles.chip} ${form.interests.includes(i.id) ? styles.chipActive : ''}`}
                    onClick={() => toggleInterest(i.id)}>{i.icon} {i.label}</button>
                ))}
              </div>
            </>
          )}

          {currentStep === 'food' && (
            <>
              <div className={styles.stepTitle}>¿Qué te gusta comer?</div>
              <div className={styles.stepSubtitle}>Para recomendarte desayunos, comidas y cenas</div>
              <div className={styles.chipGrid}>
                {FOODS.map(f => (
                  <button key={f.id} className={`${styles.chip} ${form.food === f.id ? styles.chipActive : ''}`}
                    onClick={() => setForm(fm => ({ ...fm, food: f.id }))}>{f.icon} {f.label}</button>
                ))}
              </div>
            </>
          )}

          {currentStep === 'company' && (
            <>
              <div className={styles.stepTitle}>¿Con quién viajas?</div>
              <div className={styles.stepSubtitle}>Adaptamos las recomendaciones a tu grupo</div>
              <div className={styles.optionGrid}>
                {COMPANY.map(c => (
                  <button key={c.id} className={`${styles.optionCard} ${form.company === c.id ? styles.selected : ''}`}
                    onClick={() => setForm(f => ({ ...f, company: c.id }))}>
                    <span className={styles.optionIcon}>{c.icon}</span>
                    <span className={styles.optionLabel}>{c.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          {step > 0 && <button className={styles.backBtn} onClick={back}>← Atrás</button>}
          <button className={styles.nextBtn} onClick={next} disabled={generating || checkingGeo}>
            {checkingGeo ? 'Verificando...' : generating ? 'Generando...' : step === totalSteps - 1 ? '✨ Generar itinerario' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  )
}
