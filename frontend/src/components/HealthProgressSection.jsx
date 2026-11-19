import React from 'react';
import { FHIR_SANDBOX_ENDPOINTS, buildSmartOnFhirAuthorizeUrl } from '../services/clinicalSyncService';
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
  fhirPatientIdInput,
  setFhirPatientIdInput,
  fhirConnectionState,
  clinicalSyncNotice,
  onConnectSmartFhir,
  onStartManualClinicalRecord,
  onClearClinicalRecord,
  onUpdateClinicalField,
  onApplyRubricConditions,
  onExportPdf
}) {
  const activeSandbox =
    FHIR_SANDBOX_ENDPOINTS.find(s => s.id === selectedInstitutionId) || FHIR_SANDBOX_ENDPOINTS[0];
  const smartAuthorizeUrl = buildSmartOnFhirAuthorizeUrl({
    fhirBaseUrl: activeSandbox.baseUrl,
    redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/salud` : 'http://localhost:5173/salud'
  });

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
            SMART on FHIR R4 · Consentimiento Explícito
          </span>
          <h1 className="page-title" style={{ color: '#ffffff', marginTop: '6px' }}>
            Mi Salud, Progreso y Exámenes Médicos
          </h1>
          <p style={{ fontSize: '0.85rem', opacity: 0.92, marginTop: '3px' }}>
            Conecta un servidor real HL7 FHIR R4 (HAPI FHIR / SMART Health IT) con autorización explícita o ingresa tus resultados manualmente sin simulaciones ficticias.
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
            <span className="tag-pill">
              Interoperabilidad HL7 FHIR R4 · Cuenta: {currentUser.email}
            </span>
            <div className="card-title" style={{ marginTop: '8px' }}>
              Conector SMART on FHIR R4 y Laboratorios Clínicos
            </div>
            <div className="card-desc" style={{ marginBottom: 0 }}>
              Consulta recursos reales <code>Patient</code> y <code>Observation</code> (LOINC) contra HAPI FHIR o SMART Health IT bajo tu consentimiento expreso.
            </div>
          </div>
          {clinicalRecord?.isRealFhirData ? (
            <span className="nutri-badge nutri-grade-A" style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
              FHIR R4 Real Conectado ({clinicalRubric?.totalScore || 0}%)
            </span>
          ) : (
            <span className="nutri-badge nutri-grade-C" style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
              Sin conexión FHIR real activa
            </span>
          )}
        </div>

        {(!clinicalRecord || !clinicalRecord.isRealFhirData) && (
          <div
            role="status"
            className="list-item-card"
            style={{
              marginBottom: '14px',
              borderLeft: '4px solid #d97706',
              background: 'rgba(245, 158, 11, 0.08)',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px'
            }}
          >
            <strong style={{ fontSize: '0.84rem' }}>
              Estado SMART on FHIR: Sin conexión clínica real activa — No se muestran datos clínicos ficticios como si fueran reales.
            </strong>
            <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
              {fhirConnectionState?.message ||
                'Autoriza y conecta tu sandbox HAPI FHIR R4 o SMART Health IT (con Patient ID real) para importar observaciones reales, o registra manualmente tus propios exámenes en blanco.'}
            </span>
          </div>
        )}

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
                <strong>Consentimiento informado explícito (SMART on FHIR · Ley 1581 · GDPR):</strong> Autorizo consultar recursos clínicos FHIR (<code>Patient</code> / <code>Observation</code>) asociados a <strong>{currentUser.email}</strong> o al Patient ID especificado. Puedo revocar este acceso en cualquier momento.
              </span>
            </label>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="fhir-sandbox-select">
                  Servidor Sandbox SMART on FHIR R4
                </label>
                <select
                  id="fhir-sandbox-select"
                  className="input-clean"
                  value={selectedInstitutionId}
                  onChange={e => setSelectedInstitutionId(e.target.value)}
                >
                  {FHIR_SANDBOX_ENDPOINTS.map(sb => (
                    <option key={sb.id} value={sb.id}>
                      {sb.name} ({sb.baseUrl})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="fhir-patient-id">
                  FHIR Patient ID (opcional en Sandbox público, ej. example)
                </label>
                <input
                  id="fhir-patient-id"
                  type="text"
                  className="input-clean"
                  placeholder="Ej. example o ID de paciente en HAPI FHIR"
                  value={fhirPatientIdInput}
                  onChange={e => setFhirPatientIdInput(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-solid"
                disabled={Boolean(fhirConnectionState?.isConnectingFhir)}
                onClick={onConnectSmartFhir}
              >
                {fhirConnectionState?.isConnectingFhir
                  ? 'Consultando servidor FHIR R4...'
                  : 'Conectar con Sandbox SMART on FHIR R4'}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={onStartManualClinicalRecord}
              >
                Ingresar mis exámenes manualmente (sin conexión FHIR)
              </button>
              <a
                href={smartAuthorizeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
                style={{ fontSize: '0.78rem', textDecoration: 'none' }}
              >
                Flujo OAuth2 SMART Launch ↗
              </a>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '14px' }}>
            <div
              className="list-item-card"
              style={{
                marginBottom: '12px',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <strong style={{ fontSize: '0.84rem' }}>
                  {clinicalRecord.isRealFhirData
                    ? `Conectado a ${clinicalRecord.institutionName} (Patient/${clinicalRecord.patientFhirId || 'FHIR'})`
                    : 'Registro manual del paciente — Sin conexión FHIR activa'}
                </strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {clinicalRecord.verificationLabel} · Fecha: {clinicalRecord.examDate}
                </div>
              </div>
              <button type="button" className="btn-outline" onClick={onClearClinicalRecord}>
                Desconectar / Limpiar registro clínico
              </button>
            </div>

            <div className="split-grid">
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
                  Biomarcadores de laboratorio ({clinicalRecord.isRealFhirData ? 'FHIR R4 LOINC' : 'Valores en blanco para captura real'})
                </div>
                <div className="form-stack">
                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Glucosa ayunas (mg/dL)</label>
                      <input
                        type="number"
                        className="input-clean"
                        placeholder="Sin dato aún"
                        value={clinicalRecord.fastingGlucose ?? ''}
                        onChange={e =>
                          onUpdateClinicalField(
                            'fastingGlucose',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">HbA1c (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input-clean"
                        placeholder="Sin dato aún"
                        value={clinicalRecord.hba1c ?? ''}
                        onChange={e =>
                          onUpdateClinicalField(
                            'hba1c',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Colesterol LDL (mg/dL)</label>
                      <input
                        type="number"
                        className="input-clean"
                        placeholder="Sin dato aún"
                        value={clinicalRecord.ldlCholesterol ?? ''}
                        onChange={e =>
                          onUpdateClinicalField(
                            'ldlCholesterol',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Triglicéridos (mg/dL)</label>
                      <input
                        type="number"
                        className="input-clean"
                        placeholder="Sin dato aún"
                        value={clinicalRecord.triglycerides ?? ''}
                        onChange={e =>
                          onUpdateClinicalField(
                            'triglycerides',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
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
                        placeholder="Sin dato aún"
                        value={clinicalRecord.hemoglobin ?? ''}
                        onChange={e =>
                          onUpdateClinicalField(
                            'hemoglobin',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Presión sistólica (mmHg)</label>
                      <input
                        type="number"
                        className="input-clean"
                        placeholder="Sin dato aún"
                        value={clinicalRecord.bloodPressureSys ?? ''}
                        onChange={e =>
                          onUpdateClinicalField(
                            'bloodPressureSys',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Alergias / Intolerancias</label>
                      <input
                        type="text"
                        className="input-clean"
                        placeholder="Ej. Nueces, lactosa..."
                        value={clinicalRecord.allergies || ''}
                        onChange={e => onUpdateClinicalField('allergies', e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Medicación actual</label>
                      <input
                        type="text"
                        className="input-clean"
                        placeholder="Ej. Metformina, Losartán, Levotiroxina..."
                        value={clinicalRecord.medications || ''}
                        onChange={e => onUpdateClinicalField('medications', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
                  Evaluación de concordancia ({clinicalRubric?.totalScore || 0}/100)
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
