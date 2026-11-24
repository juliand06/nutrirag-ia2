import React, { useState } from 'react';
import { useNutriStore } from '../store/useNutriStore';

const COMMON_MEDICATION_CHIPS = [
  'Levotiroxina',
  'Metformina',
  'Insulina',
  'Losartán',
  'Enalapril',
  'Atorvastatina',
  'Warfarina',
  'Hierro oral'
];

export default function VoluntaryClinicalHistoryCard({ compact = false, onSaved = null }) {
  const currentUser = useNutriStore(s => s.currentUser);
  const updateVoluntaryClinicalHistory = useNutriStore(s => s.updateVoluntaryClinicalHistory);
  const clearVoluntaryClinicalHistory = useNutriStore(s => s.clearVoluntaryClinicalHistory);
  const showToast = useNutriStore(s => s.showToast);

  const existing = currentUser?.voluntaryClinicalHistory || null;
  const [open, setOpen] = useState(Boolean(!compact && existing));
  const [consent, setConsent] = useState(Boolean(existing?.consentGranted));
  const [labUnit, setLabUnit] = useState(existing?.labUnit === 'mmol' ? 'mmol' : 'mgdl');
  const [examDate, setExamDate] = useState(existing?.examDate ?? '');
  const [fastingGlucose, setFastingGlucose] = useState(existing?.fastingGlucose ?? '');
  const [hba1c, setHba1c] = useState(existing?.hba1c ?? '');
  const [ldlCholesterol, setLdlCholesterol] = useState(existing?.ldlCholesterol ?? '');
  const [triglycerides, setTriglycerides] = useState(existing?.triglycerides ?? '');
  const [bloodPressure, setBloodPressure] = useState(existing?.bloodPressure ?? '');
  const [hemoglobin, setHemoglobin] = useState(existing?.hemoglobin ?? '');
  const [medications, setMedications] = useState(existing?.medications ?? '');
  const [clinicalNotes, setClinicalNotes] = useState(existing?.clinicalNotes ?? '');

  const isStaleExam = React.useMemo(() => {
    if (!examDate) return false;
    const parsed = new Date(`${examDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return false;
    return (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24) > 180;
  }, [examDate]);

  const appendMedicationChip = (medName) => {
    const current = String(medications || '').trim();
    if (current.toLowerCase().includes(medName.toLowerCase())) return;
    setMedications(current ? `${current}, ${medName}` : medName);
  };

  const hasSavedData = Boolean(
    existing &&
      (existing.fastingGlucose ||
        existing.hba1c ||
        existing.ldlCholesterol ||
        existing.triglycerides ||
        existing.bloodPressure ||
        existing.hemoglobin ||
        existing.medications ||
        existing.clinicalNotes)
  );

  const handleSave = (e) => {
    e.preventDefault();
    if (!consent) {
      showToast('Marca la casilla de consentimiento voluntario para que la IA use tus datos clínicos.', 'warm');
      return;
    }
    const cleanNum = (v) => {
      const n = Number(String(v || '').replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    updateVoluntaryClinicalHistory({
      consentGranted: true,
      labUnit,
      examDate: String(examDate || '').trim() || null,
      fastingGlucose: cleanNum(fastingGlucose),
      hba1c: cleanNum(hba1c),
      ldlCholesterol: cleanNum(ldlCholesterol),
      triglycerides: cleanNum(triglycerides),
      bloodPressure: String(bloodPressure || '').trim() || null,
      hemoglobin: cleanNum(hemoglobin),
      medications: String(medications || '').trim() || '',
      clinicalNotes: String(clinicalNotes || '').trim() || '',
      updatedAt: new Date().toLocaleDateString('es-CO')
    });
    showToast('Tu historial clínico voluntario quedó guardado. Tu Coach IA ya lo tiene en cuenta.', 'emerald');
    if (compact) setOpen(false);
    if (onSaved) onSaved();
  };

  const handleClear = () => {
    clearVoluntaryClinicalHistory();
    setConsent(false);
    setLabUnit('mgdl');
    setExamDate('');
    setFastingGlucose('');
    setHba1c('');
    setLdlCholesterol('');
    setTriglycerides('');
    setBloodPressure('');
    setHemoglobin('');
    setMedications('');
    setClinicalNotes('');
    showToast('Se eliminó tu historial clínico opcional.', 'emerald');
  };

  if (compact && !open) {
    return (
      <div
        className="ns-card ns-card-warm"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          {hasSavedData ? (
            <>
              <strong style={{ color: 'var(--brand-leaf)' }}>✓ Historial clínico voluntario activo</strong>{' '}
              (actualizado el {existing.updatedAt || 'hoy'}). Tu Coach adapta cada consejo a tus exámenes reales.
            </>
          ) : (
            <>
              <strong style={{ color: 'var(--text-primary)' }}>¿Tienes exámenes de sangre o medicamentos?</strong>{' '}
              Si quieres, puedes compartirlos de forma voluntaria para una guía mucho más precisa.
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ns-btn ns-btn-outline ns-btn-sm"
        >
          {hasSavedData ? 'Ver o editar historial' : 'Compartir historial clínico (opcional)'}
        </button>
      </div>
    );
  }

  return (
    <section className="ns-card ns-card-warm" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', margin: '0 0 4px 0' }}>
            Historial clínico y exámenes de laboratorio (100% voluntario)
          </h2>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Solo llena los campos que desees compartir con tu Coach IA. Nunca inventamos exámenes ficticios y puedes borrarlos en cualquier momento.
          </p>
        </div>
        {compact && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ns-btn ns-btn-ghost ns-btn-sm"
            aria-label="Cerrar formulario de historial clínico"
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
        {/* Unidad de laboratorio y fecha del examen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div>
            <label htmlFor="clin-unit" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              Unidad de glucosa y lípidos
            </label>
            <select
              id="clin-unit"
              className="ns-input"
              value={labUnit}
              onChange={e => setLabUnit(e.target.value)}
            >
              <option value="mgdl">mg/dL (Colombia, México, EE. UU.)</option>
              <option value="mmol">mmol/L (Europa / Internacional)</option>
            </select>
          </div>
          <div>
            <label htmlFor="clin-date" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              Fecha aproximada del examen
            </label>
            <input
              id="clin-date"
              type="date"
              className="ns-input"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
            />
          </div>
        </div>
        {isStaleExam && (
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-carrot)', fontWeight: 600 }}>
            Nota: Este examen tiene más de 6 meses — no activará protocolos clínicos automáticos hasta que ingreses controles recientes.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '10px' }}>
          <div>
            <label htmlFor="clin-glucose" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              Glucosa en ayunas ({labUnit === 'mmol' ? 'mmol/L' : 'mg/dL'})
            </label>
            <input
              id="clin-glucose"
              type="text"
              inputMode="decimal"
              className="ns-input"
              placeholder={labUnit === 'mmol' ? 'Ej. 5.3' : 'Ej. 96'}
              value={fastingGlucose}
              onChange={e => setFastingGlucose(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="clin-hba1c" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              Hemoglobina glicosilada HbA1c (%)
            </label>
            <input
              id="clin-hba1c"
              type="text"
              inputMode="decimal"
              className="ns-input"
              placeholder="Ej. 5.6"
              value={hba1c}
              onChange={e => setHba1c(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="clin-ldl" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              Colesterol LDL ({labUnit === 'mmol' ? 'mmol/L' : 'mg/dL'})
            </label>
            <input
              id="clin-ldl"
              type="text"
              inputMode="decimal"
              className="ns-input"
              placeholder={labUnit === 'mmol' ? 'Ej. 3.0' : 'Ej. 118'}
              value={ldlCholesterol}
              onChange={e => setLdlCholesterol(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="clin-trig" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              Triglicéridos ({labUnit === 'mmol' ? 'mmol/L' : 'mg/dL'})
            </label>
            <input
              id="clin-trig"
              type="text"
              inputMode="decimal"
              className="ns-input"
              placeholder={labUnit === 'mmol' ? 'Ej. 1.6' : 'Ej. 140'}
              value={triglycerides}
              onChange={e => setTriglycerides(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="clin-bp" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              Presión arterial (mmHg)
            </label>
            <input
              id="clin-bp"
              type="text"
              className="ns-input"
              placeholder="Ej. 122/78"
              value={bloodPressure}
              onChange={e => setBloodPressure(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="clin-hb" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              Hemoglobina (g/dL)
            </label>
            <input
              id="clin-hb"
              type="text"
              inputMode="decimal"
              className="ns-input"
              placeholder="Ej. 13.2"
              value={hemoglobin}
              onChange={e => setHemoglobin(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="clin-meds" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
            Medicamentos actuales (toca o escribe para activar interacciones exactas)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {COMMON_MEDICATION_CHIPS.map(med => {
              const active = String(medications || '').toLowerCase().includes(med.toLowerCase());
              return (
                <button
                  key={med}
                  type="button"
                  onClick={() => appendMedicationChip(med)}
                  className={`ns-chip ${active ? 'ns-chip-active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  + {med}
                </button>
              );
            })}
          </div>
          <input
            id="clin-meds"
            type="text"
            className="ns-input"
            placeholder="Ej. Levotiroxina 50 mcg, Metformina, Losartán..."
            value={medications}
            onChange={e => setMedications(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="clin-notes" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
            Diagnósticos o notas médicas que quieras compartir (opcional)
          </label>
          <textarea
            id="clin-notes"
            rows={2}
            className="ns-input"
            placeholder="Ej. Mi médico me recomendó bajar el sodio y cuidar el azúcar en ayunas..."
            value={clinicalNotes}
            onChange={e => setClinicalNotes(e.target.value)}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            style={{ marginTop: '3px' }}
          />
          <span>
            Autorizo voluntariamente que NutriStudio IA utilice estos datos clínicos únicamente para personalizar mis recomendaciones de alimentación (nunca reemplazan a mi médico).
          </span>
        </label>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="submit" className="ns-btn ns-btn-leaf ns-btn-sm">
            Guardar historial clínico voluntario
          </button>
          {hasSavedData && (
            <button type="button" onClick={handleClear} className="ns-btn ns-btn-ghost ns-btn-sm" style={{ color: 'var(--accent-carrot)' }}>
              Borrar historial clínico
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
