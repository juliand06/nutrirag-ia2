import React, { useState, useEffect } from 'react';
import {
  loadNutritionistPortalState,
  addNutritionistPatient,
  assignNutritionPlanToPatient,
  addNutritionistClinicalNote,
  sendNutritionistChatMessage,
  openPrintableNutritionistPatientReport,
  getUserSubscriptionState
} from '../services/enterprisePlatformService';
import HealthDisclaimer from './HealthDisclaimer';

export default function NutritionistPortalSection({
  currentUser,
  onApplyPlanToCurrentUser,
  onUpgradeToProClick,
  onNotify
}) {
  const [portalState, setPortalState] = useState(() => loadNutritionistPortalState(currentUser));
  const [activePatientId, setActivePatientId] = useState(() => portalState.activePatientId);

  const subscription = getUserSubscriptionState(currentUser?.id);
  const activePatient =
    portalState.patients.find(p => p.id === activePatientId) || portalState.patients[0];

  // Formulario nuevo paciente
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatName, setNewPatName] = useState('');
  const [newPatEmail, setNewPatEmail] = useState('');
  const [newPatWeight, setNewPatWeight] = useState('70');
  const [newPatCalories, setNewPatCalories] = useState('1950');

  // Formulario plan nutricional
  const [planKcal, setPlanKcal] = useState('2000');
  const [planProtein, setPlanProtein] = useState('130');
  const [planCarbs, setPlanCarbs] = useState('215');
  const [planFat, setPlanFat] = useState('65');
  const [planProtocol, setPlanProtocol] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Nota clínica SOAP y Chat
  const [soapSection, setSoapSection] = useState('Subjetivo');
  const [soapText, setSoapText] = useState('');
  const [chatSenderRole, setChatSenderRole] = useState('NUTRITIONIST');
  const [chatText, setChatText] = useState('');

  useEffect(() => {
    const fresh = loadNutritionistPortalState(currentUser);
    setPortalState(fresh);
    setActivePatientId(fresh.activePatientId);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!activePatient) return;
    const plan = activePatient.assignedPlan || {};
    setPlanKcal(String(plan.dailyCalories || 2000));
    setPlanProtein(String(plan.targetProtein || 130));
    setPlanCarbs(String(plan.targetCarbs || 215));
    setPlanFat(String(plan.targetFat || 65));
    setPlanProtocol(plan.clinicalProtocol || 'Guías generales OMS · FAO');
    setPlanNotes(plan.notes || '');
  }, [activePatient?.id]);

  const handleAddPatient = (e) => {
    e.preventDefault();
    if (!newPatName.trim()) return;
    const { state, patient } = addNutritionistPatient(currentUser.id, {
      name: newPatName,
      email: newPatEmail || `paciente.${Date.now()}@clinica.local`,
      weightKg: Number(newPatWeight) || 0,
      dailyCalories: Number(newPatCalories) || 2000,
      country: currentUser.country || 'CO'
    });
    setPortalState(state);
    setActivePatientId(patient.id);
    setNewPatName('');
    setNewPatEmail('');
    setShowAddPatient(false);
    onNotify?.(`Paciente "${patient.name}" vinculado al Portal de Nutricionistas.`);
  };

  const handleSaveAssignedPlan = async (e) => {
    e.preventDefault();
    if (!activePatient) return;
    const next = await assignNutritionPlanToPatient(
      currentUser.id,
      activePatient.id,
      {
        dailyCalories: Number(planKcal),
        targetProtein: Number(planProtein),
        targetCarbs: Number(planCarbs),
        targetFat: Number(planFat),
        clinicalProtocol: planProtocol,
        notes: planNotes
      },
      currentUser.email
    );
    setPortalState(next);
    onNotify?.(`Plan actualizado para ${activePatient.name} (${planKcal} kcal).`);
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!activePatient || !soapText.trim()) return;
    const { state } = addNutritionistClinicalNote(currentUser.id, activePatient.id, {
      soapSection,
      text: soapText
    });
    setPortalState(state);
    setSoapText('');
    onNotify?.(`Nota clínica [${soapSection}] guardada.`);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!activePatient || !chatText.trim()) return;
    const { state } = sendNutritionistChatMessage(currentUser.id, activePatient.id, {
      senderRole: chatSenderRole,
      senderName:
        chatSenderRole === 'NUTRITIONIST'
          ? portalState.nutritionistProfile.name
          : activePatient.name,
      text: chatText
    });
    setPortalState(state);
    setChatText('');
  };

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
            {portalState.nutritionistProfile.credential} ·{' '}
            {subscription.planId === 'PRO' ? 'Plan Pro Clínico Activo' : 'Vista Clínica Sandbox'}
          </span>
          <h1 className="page-title" style={{ color: '#ffffff', marginTop: '6px' }}>
            Portal para Nutricionistas Clínicos
          </h1>
          <p style={{ fontSize: '0.85rem', opacity: 0.92, marginTop: '3px' }}>
            Gestiona pacientes, prescribe metas de calorías/macros, registra notas SOAP, conversa en tiempo real y exporta reportes clínicos PDF.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-outline"
            style={{ background: '#ffffff', color: '#0b7a5c', borderColor: '#ffffff', fontWeight: 600 }}
            onClick={() => openPrintableNutritionistPatientReport(activePatient, portalState.nutritionistProfile)}
          >
            Exportar Reporte PDF del Paciente
          </button>
        </div>
      </div>

      {subscription.planId !== 'PRO' && (
        <div
          className="list-item-card"
          style={{
            marginBottom: '16px',
            borderLeft: '4px solid var(--accent)',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ fontSize: '0.8rem' }}>
            <strong>Plan actual: Free</strong> — El portal multi-paciente y los reportes PDF ilimitados forman parte del <strong>Plan Pro Clínico</strong>. Puedes probar el flujo aquí y activar Pro con Stripe en Mi Cuenta.
          </div>
          {onUpgradeToProClick && (
            <button type="button" className="btn-solid" onClick={onUpgradeToProClick}>
              Ver Planes y Facturación Stripe →
            </button>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: '18px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '12px'
          }}
        >
          <div>
            <div className="card-title" style={{ marginBottom: '2px' }}>
              Cartera de Pacientes ({portalState.patients.length})
            </div>
            <div className="card-desc" style={{ marginBottom: 0 }}>
              Selecciona un paciente para revisar su estado real, ajustar su pauta y documentar evolución SOAP.
            </div>
          </div>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setShowAddPatient(v => !v)}
          >
            {showAddPatient ? 'Cancelar' : '+ Vincular nuevo paciente'}
          </button>
        </div>

        {showAddPatient && (
          <form
            onSubmit={handleAddPatient}
            className="list-item-card"
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', marginBottom: '12px', padding: '12px' }}
          >
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Nombre del paciente</label>
                <input
                  type="text"
                  className="input-clean"
                  required
                  placeholder="Ej. Andrés Martínez"
                  value={newPatName}
                  onChange={e => setNewPatName(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Correo electrónico</label>
                <input
                  type="email"
                  className="input-clean"
                  placeholder="paciente@correo.com"
                  value={newPatEmail}
                  onChange={e => setNewPatEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Peso actual (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-clean"
                  value={newPatWeight}
                  onChange={e => setNewPatWeight(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Meta inicial (kcal/día)</label>
                <input
                  type="number"
                  className="input-clean"
                  value={newPatCalories}
                  onChange={e => setNewPatCalories(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn-solid" style={{ alignSelf: 'flex-start' }}>
              Agregar paciente a cartera
            </button>
          </form>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {portalState.patients.map(pat => (
            <button
              key={pat.id}
              type="button"
              className={pat.id === activePatient?.id ? 'btn-solid' : 'btn-outline'}
              onClick={() => setActivePatientId(pat.id)}
            >
              {pat.name} ({pat.assignedPlan?.dailyCalories || 0} kcal)
            </button>
          ))}
        </div>

        {activePatient && (
          <div className="stats-row" style={{ marginTop: '14px' }}>
            <div className="stat-box">
              <div className="stat-label">Paciente seleccionado</div>
              <div className="stat-value" style={{ fontSize: '1.05rem' }}>{activePatient.name}</div>
              <div className="stat-sub">{activePatient.email}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Plan calórico asignado</div>
              <div className="stat-value">{activePatient.assignedPlan?.dailyCalories || 0} kcal</div>
              <div className="stat-sub">
                P: {activePatient.assignedPlan?.targetProtein || 0}g · C: {activePatient.assignedPlan?.targetCarbs || 0}g · G: {activePatient.assignedPlan?.targetFat || 0}g
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Interoperabilidad FHIR R4</div>
              <div className="stat-value" style={{ fontSize: '0.95rem' }}>
                {activePatient.fhirConnected ? 'Conectado FHIR' : 'Sin conexión FHIR'}
              </div>
              <div className="stat-sub">
                {activePatient.fhirConnected ? 'Observaciones verificadas' : 'Nunca se inventan laboratorios'}
              </div>
            </div>
          </div>
        )}
      </div>

      {activePatient && (
        <div className="split-grid">
          <div className="card">
            <div className="card-title">Asignación de Plan Nutricional</div>
            <div className="card-desc">
              Define calorías objetivo, reparto de macronutrientes y enfoque clínico para {activePatient.name}.
            </div>
            <form onSubmit={handleSaveAssignedPlan} className="form-stack">
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">Calorías objetivo (kcal)</label>
                  <input
                    type="number"
                    className="input-clean"
                    value={planKcal}
                    onChange={e => setPlanKcal(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Proteína (g/día)</label>
                  <input
                    type="number"
                    className="input-clean"
                    value={planProtein}
                    onChange={e => setPlanProtein(e.target.value)}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">Carbohidratos (g/día)</label>
                  <input
                    type="number"
                    className="input-clean"
                    value={planCarbs}
                    onChange={e => setPlanCarbs(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Grasas saludables (g/día)</label>
                  <input
                    type="number"
                    className="input-clean"
                    value={planFat}
                    onChange={e => setPlanFat(e.target.value)}
                  />
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Protocolo clínico de referencia</label>
                <input
                  type="text"
                  className="input-clean"
                  value={planProtocol}
                  onChange={e => setPlanProtocol(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Prescripción e indicaciones alimentarias</label>
                <textarea
                  className="input-clean"
                  rows={3}
                  value={planNotes}
                  onChange={e => setPlanNotes(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-solid">
                  Guardar plan asignado
                </button>
                {onApplyPlanToCurrentUser &&
                  activePatient.email?.toLowerCase() === currentUser.email?.toLowerCase() && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() =>
                        onApplyPlanToCurrentUser({
                          dailyCalories: Number(planKcal),
                          targetProtein: Number(planProtein),
                          targetCarbs: Number(planCarbs),
                          targetFat: Number(planFat)
                        })
                      }
                    >
                      Sincronizar este plan en mi diario
                    </button>
                  )}
              </div>
            </form>

            <hr style={{ margin: '18px 0', borderColor: 'var(--border-color)' }} />

            <div className="card-title">Notas Clínicas (SOAP)</div>
            <form onSubmit={handleAddNote} className="form-stack">
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">Sección SOAP</label>
                  <select
                    className="input-clean"
                    value={soapSection}
                    onChange={e => setSoapSection(e.target.value)}
                  >
                    <option value="Subjetivo">Subjetivo (S)</option>
                    <option value="Objetivo">Objetivo (O)</option>
                    <option value="Análisis">Análisis (A)</option>
                    <option value="Plan">Plan (P)</option>
                  </select>
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Observación clínica</label>
                <textarea
                  className="input-clean"
                  rows={2}
                  placeholder="Ej. Paciente refiere buena saciedad con 30g de fibra/día..."
                  value={soapText}
                  onChange={e => setSoapText(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-outline" style={{ alignSelf: 'flex-start' }}>
                Agregar nota SOAP
              </button>
            </form>

            <div className="list-stack" style={{ marginTop: '12px' }}>
              {(activePatient.clinicalNotes || []).length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  No hay notas clínicas SOAP registradas aún para este paciente.
                </div>
              ) : (
                activePatient.clinicalNotes.map(n => (
                  <div key={n.id} className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>
                      [{n.soapSection}] · {n.createdAt.slice(0, 10)} · {n.author}
                    </strong>
                    <span style={{ fontSize: '0.8rem' }}>{n.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Chat Nutricionista ↔ Paciente</div>
            <div className="card-desc">
              Comunicación clínica directa vinculada al seguimiento nutricional y adherencia semanal.
            </div>

            <div
              className="list-stack"
              style={{
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                marginBottom: '12px'
              }}
            >
              {(activePatient.chatMessages || []).length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Inicia la conversación con tu paciente o nutricionista.
                </div>
              ) : (
                activePatient.chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className="list-item-card"
                    style={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '3px',
                      borderLeft:
                        msg.senderRole === 'NUTRITIONIST'
                          ? '3px solid var(--accent)'
                          : '3px solid #64748b'
                    }}
                  >
                    <strong style={{ fontSize: '0.75rem' }}>
                      {msg.senderName} ({msg.senderRole === 'NUTRITIONIST' ? 'Nutricionista' : 'Paciente'}) · {msg.sentAt.slice(11, 16)}
                    </strong>
                    <span style={{ fontSize: '0.81rem' }}>{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {[
                'Mantén 25–30g de proteína en desayuno',
                'Recuerda registrar tus exámenes reales si los recibes',
                'Excelente racha de hidratación esta semana'
              ].map(preset => (
                <button
                  key={preset}
                  type="button"
                  className="btn-outline"
                  style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                  onClick={() => setChatText(preset)}
                >
                  + {preset}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="form-stack">
              <div className="field-group">
                <label className="field-label">Enviar como</label>
                <select
                  className="input-clean"
                  value={chatSenderRole}
                  onChange={e => setChatSenderRole(e.target.value)}
                >
                  <option value="NUTRITIONIST">Nutricionista ({portalState.nutritionistProfile.name})</option>
                  <option value="PATIENT">Paciente ({activePatient.name})</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-clean"
                  placeholder="Escribe un mensaje clínico o indicación..."
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                />
                <button type="submit" className="btn-solid">
                  Enviar
                </button>
              </div>
            </form>

            <HealthDisclaimer />
          </div>
        </div>
      )}
    </div>
  );
}
