import React from 'react';
import { CLINICAL_INSTITUTIONS } from '../services/clinicalSyncService';
import HealthDisclaimer from './HealthDisclaimer';

export default function HealthProgressSection({
  currentUser,
  bodyAdherence,
  userMemory,
  aiProgress,
  clinicalRecord,
  clinicalRubric,
  clinicalConsentChecked,
  setClinicalConsentChecked,
  selectedInstitutionId,
  setSelectedInstitutionId,
  clinicalSyncNotice,
  onFederatedDiscovery,
  onUpdateClinicalField,
  onApplyRubricConditions,
  onExportPdf
}) {
  return (
    <div>
      <div className="section-photo-banner banner-clinical">
        <div>
          <span
            className="tag-pill"
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.3)'
            }}
          >
            Seguimiento de Salud · Bienestar Personalizado
          </span>
          <h1 className="page-title" style={{ color: '#ffffff', marginTop: '6px' }}>
            Mi Salud, Progreso y Exámenes Médicos
          </h1>
          <p style={{ fontSize: '0.85rem', opacity: 0.92, marginTop: '3px' }}>
            Revisa tu constancia diaria, conecta tus exámenes médicos de forma segura y descarga tu reporte de salud cuando lo necesites.
          </p>
        </div>
        <button
          type="button"
          className="btn-outline"
          style={{ background: '#ffffff', color: '#0b7a5c', borderColor: '#ffffff', fontWeight: 600 }}
          onClick={onExportPdf}
        >
          Exportar Reporte de Salud (PDF)
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-label">Constancia de tu día</div>
          <div className="stat-value">{bodyAdherence}%</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${bodyAdherence}%` }} />
          </div>
          <div className="stat-sub">Calorías · Proteína · Hidratación</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Personalización de tu plan</div>
          <div className="stat-value">{userMemory.knowledgeScore}%</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${userMemory.knowledgeScore}%` }} />
          </div>
          <div className="stat-sub">Tu perfil, hábitos y alimentos locales</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Racha de seguimiento</div>
          <div className="stat-value">{aiProgress.streakDays} día(s)</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${aiProgress.consistencyPct}%` }} />
          </div>
          <div className="stat-sub">Consistencia semanal: {aiProgress.consistencyPct}%</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Cuidados médicos activos</div>
          <div className="stat-value">{userMemory.activeProtocols.length}</div>
          <div className="stat-sub" style={{ marginTop: '8px' }}>
            {userMemory.activeProtocols.length > 0
              ? 'Plan adaptado a tu salud'
              : 'Enfoque general de bienestar'}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '18px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '12px'
          }}
        >
          <div>
            <span className="tag-pill">Conexión médica privada · Correo: {currentUser.email}</span>
            <div className="card-title" style={{ marginTop: '8px' }}>
              Tus Exámenes Médicos y Seguimiento Clínico
            </div>
            <div className="card-desc" style={{ marginBottom: 0 }}>
              Conecta tus resultados de laboratorio de tu clínica u hospital con tu mismo correo para que tu plan de alimentación cuide cada indicador de tu salud.
            </div>
          </div>
          {clinicalRubric && (
            <span className="nutri-badge nutri-grade-A" style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
              Sincronización: {clinicalRubric.totalScore}%
            </span>
          )}
        </div>

        {!clinicalRecord ? (
          <div className="form-stack" style={{ marginTop: '12px' }}>
            <label
              className="list-item-card"
              style={{ cursor: 'pointer', alignItems: 'flex-start', gap: '10px', padding: '10px 12px' }}
            >
              <input
                type="checkbox"
                checked={clinicalConsentChecked}
                onChange={e => setClinicalConsentChecked(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <strong>Autorización privada:</strong> Autorizo conectar mis resultados médicos usando mi correo (
                <strong>{currentUser.email}</strong>) para personalizar mis recomendaciones de alimentación.
              </span>
            </label>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Tu clínica, hospital o laboratorio</label>
                <select
                  className="input-clean"
                  value={selectedInstitutionId}
                  onChange={e => setSelectedInstitutionId(e.target.value)}
                >
                  {CLINICAL_INSTITUTIONS.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-solid" onClick={onFederatedDiscovery}>
                  Conectar mis exámenes médicos con mi correo
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="split-grid" style={{ marginTop: '14px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
                Resultados de laboratorio ({clinicalRecord.institutionName})
              </div>
              <div className="form-stack">
                <div className="field-row">
                  <div className="field-group">
                    <label className="field-label">Glucosa ayunas (mg/dL)</label>
                    <input
                      type="number"
                      className="input-clean"
                      value={clinicalRecord.fastingGlucose}
                      onChange={e => onUpdateClinicalField('fastingGlucose', Number(e.target.value))}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">HbA1c (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-clean"
                      value={clinicalRecord.hba1c}
                      onChange={e => onUpdateClinicalField('hba1c', Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field-group">
                    <label className="field-label">Colesterol LDL (mg/dL)</label>
                    <input
                      type="number"
                      className="input-clean"
                      value={clinicalRecord.ldlCholesterol}
                      onChange={e => onUpdateClinicalField('ldlCholesterol', Number(e.target.value))}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Triglicéridos (mg/dL)</label>
                    <input
                      type="number"
                      className="input-clean"
                      value={clinicalRecord.triglycerides}
                      onChange={e => onUpdateClinicalField('triglycerides', Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field-group">
                    <label className="field-label">Hemoglobina (g/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-clean"
                      value={clinicalRecord.hemoglobin}
                      onChange={e => onUpdateClinicalField('hemoglobin', Number(e.target.value))}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Presión sistólica (mmHg)</label>
                    <input
                      type="number"
                      className="input-clean"
                      value={clinicalRecord.bloodPressureSys}
                      onChange={e => onUpdateClinicalField('bloodPressureSys', Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field-group">
                    <label className="field-label">Alergias / Intolerancias</label>
                    <input
                      type="text"
                      className="input-clean"
                      value={clinicalRecord.allergies}
                      onChange={e => onUpdateClinicalField('allergies', e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Medicación actual</label>
                    <input
                      type="text"
                      className="input-clean"
                      placeholder="Ej. Metformina, Losartán, Levotiroxina..."
                      value={clinicalRecord.medications}
                      onChange={e => onUpdateClinicalField('medications', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
                Evaluación de concordancia de salud ({clinicalRubric?.totalScore || 0}/100)
              </div>
              <div className="list-stack">
                {(clinicalRubric?.criteria || []).map(c => (
                  <div key={c.name} className="list-item-card" style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: '0.79rem' }}>{c.name}</span>
                    <strong style={{ fontSize: '0.8rem' }}>
                      {c.score} / {c.max}
                    </strong>
                  </div>
                ))}

                {clinicalRubric?.biomarkerAlerts?.length > 0 && (
                  <div
                    className="list-item-card"
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
                  >
                    <strong style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                      Indicadores a cuidar en tu plan
                    </strong>
                    {clinicalRubric.biomarkerAlerts.map((a, i) => (
                      <span key={i} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        • {a}
                      </span>
                    ))}
                  </div>
                )}

                {clinicalRubric?.drugNutrientAlerts?.length > 0 && (
                  <div
                    className="list-item-card"
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
                  >
                    <strong style={{ fontSize: '0.8rem' }}>Cuidado con medicación y nutrientes</strong>
                    {clinicalRubric.drugNutrientAlerts.map((a, i) => (
                      <span key={i} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        • {a}
                      </span>
                    ))}
                  </div>
                )}

                {clinicalRubric?.missingSyncedConditions?.length > 0 && (
                  <button
                    type="button"
                    className="btn-solid"
                    onClick={() => onApplyRubricConditions(clinicalRubric.detectedConditions)}
                  >
                    Aplicar {clinicalRubric.missingSyncedConditions.length} cuidado(s) sugerido(s) a mi plan
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {clinicalSyncNotice && (
          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500 }}>
            {clinicalSyncNotice}
          </div>
        )}

        <HealthDisclaimer />
      </div>
    </div>
  );
}
