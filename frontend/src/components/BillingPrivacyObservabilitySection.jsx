import React, { useState, useEffect } from 'react';
import {
  SUBSCRIPTION_PLANS,
  GRANULAR_CONSENT_CATALOG,
  getUserSubscriptionState,
  startStripeCheckoutSession,
  cancelStripeSubscription,
  getGranularConsents,
  updateGranularConsent,
  encryptSensitiveData,
  getAuditLogs,
  buildGdprExportPackage,
  purgeAllUserDataGdpr,
  getStructuredLogs,
  getSentryEvents,
  getAnonymousProductEvents
} from '../services/enterprisePlatformService';
import HealthDisclaimer from './HealthDisclaimer';

export default function BillingPrivacyObservabilitySection({
  currentUser,
  workspace,
  dailyRagCount = 0,
  dailyVisionCount = 0,
  apiBaseUrl = '',
  onAccountPurged,
  onNotify
}) {
  const [subscription, setSubscription] = useState(() => getUserSubscriptionState(currentUser?.id));
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [consents, setConsents] = useState(() => getGranularConsents(currentUser?.id));
  const [auditLogs, setAuditLogs] = useState(() => getAuditLogs(currentUser?.id));
  const [encryptionSample, setEncryptionSample] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmEmailInput, setConfirmEmailInput] = useState('');
  const [structuredLogs, setStructuredLogs] = useState(() => getStructuredLogs());
  const [sentryEvents, setSentryEvents] = useState(() => getSentryEvents());
  const [analyticsEvents, setAnalyticsEvents] = useState(() => getAnonymousProductEvents());

  const refreshState = () => {
    setSubscription(getUserSubscriptionState(currentUser?.id));
    setConsents(getGranularConsents(currentUser?.id));
    setAuditLogs(getAuditLogs(currentUser?.id));
    setStructuredLogs(getStructuredLogs());
    setSentryEvents(getSentryEvents());
    setAnalyticsEvents(getAnonymousProductEvents());
  };

  useEffect(() => {
    refreshState();
  }, [currentUser?.id]);

  const activePlan = SUBSCRIPTION_PLANS[subscription.planId] || SUBSCRIPTION_PLANS.FREE;
  const ragPct = Math.min(
    100,
    Math.round((dailyRagCount / Math.max(1, activePlan.maxDailyRagQueries)) * 100)
  );
  const visionPct = Math.min(
    100,
    Math.round((dailyVisionCount / Math.max(1, activePlan.maxDailyVisionScans)) * 100)
  );

  const handleStripeUpgrade = async () => {
    const res = await startStripeCheckoutSession({
      userId: currentUser.id,
      email: currentUser.email,
      planId: 'PRO',
      billingCycle,
      apiBaseUrl
    });
    if (res.checkoutUrl && typeof window !== 'undefined') {
      window.open(res.checkoutUrl, '_blank', 'noopener,noreferrer');
    }
    refreshState();
    onNotify?.('Plan Pro Clínico activado mediante flujo Stripe.');
  };

  const handleDowngradeFree = async () => {
    await cancelStripeSubscription(currentUser.id, currentUser.email);
    refreshState();
    onNotify?.('Suscripción actualizada a Plan Free.');
  };

  const handleToggleConsent = async (key, checked) => {
    const next = await updateGranularConsent(currentUser.id, key, checked, currentUser.email);
    setConsents(next);
    setAuditLogs(getAuditLogs(currentUser.id));
    onNotify?.(`Consentimiento granular "${key}" actualizado.`);
  };

  const handleTestEncryption = async () => {
    const bundle = await encryptSensitiveData(
      {
        subjectId: currentUser.id,
        clinicalFlag: 'Protegido en reposo AES-256-GCM',
        timestamp: new Date().toISOString()
      },
      currentUser.id
    );
    setEncryptionSample(bundle);
  };

  const handleExportGdprData = async () => {
    const pkg = await buildGdprExportPackage({ user: currentUser, workspace });
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutristudio-datos-gdpr-ley1581-${currentUser.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    refreshState();
    onNotify?.('Paquete completo de datos exportado (GDPR Art. 20 / Ley 1581 Colombia).');
  };

  const handlePurgeAccount = async (e) => {
    e.preventDefault();
    if (confirmEmailInput.trim().toLowerCase() !== (currentUser.email || '').trim().toLowerCase()) {
      onNotify?.('El correo de confirmación no coincide.');
      return;
    }
    await purgeAllUserDataGdpr(currentUser.id);
    onAccountPurged?.();
  };

  return (
    <div style={{ marginTop: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* ====================================================================
          1. SUSCRIPCIONES STRIPE (FREE / PRO) Y CUOTAS
         ==================================================================== */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '12px'
          }}
        >
          <div>
            <span className="tag-pill">Stripe Billing · {subscription.stripeMode}</span>
            <div className="card-title" style={{ marginTop: '6px' }}>
              Suscripción, Límites del Plan y Facturación
            </div>
            <div className="card-desc" style={{ marginBottom: 0 }}>
              Plan actual: <strong>{activePlan.name}</strong> ({subscription.status})
              {subscription.currentPeriodEnd ? ` · Vigente hasta ${subscription.currentPeriodEnd}` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input-clean"
              style={{ width: 'auto' }}
              value={billingCycle}
              onChange={e => setBillingCycle(e.target.value)}
              aria-label="Ciclo de facturación"
            >
              <option value="monthly">Mensual ($9.99 USD/mes)</option>
              <option value="annual">Anual ($99 USD/año)</option>
            </select>

            {subscription.planId !== 'PRO' ? (
              <button type="button" className="btn-solid" onClick={handleStripeUpgrade}>
                Activar Plan Pro con Stripe
              </button>
            ) : (
              <button type="button" className="btn-outline" onClick={handleDowngradeFree}>
                Cambiar a Plan Free
              </button>
            )}
          </div>
        </div>

        <div className="split-grid">
          <div className="list-stack">
            <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span>Consultas Coach IA hoy</span>
                <strong>
                  {dailyRagCount} / {activePlan.maxDailyRagQueries >= 9999 ? 'Ilimitadas' : activePlan.maxDailyRagQueries}
                </strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${activePlan.planId === 'PRO' ? 12 : ragPct}%` }} />
              </div>
            </div>

            <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span>Escaneos de plato / código hoy</span>
                <strong>
                  {dailyVisionCount} / {activePlan.maxDailyVisionScans >= 9999 ? 'Ilimitados' : activePlan.maxDailyVisionScans}
                </strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${activePlan.planId === 'PRO' ? 10 : visionPct}%` }} />
              </div>
            </div>

            <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <strong style={{ fontSize: '0.82rem' }}>Beneficios de tu plan activo</strong>
              {activePlan.features.map(f => (
                <span key={f} style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>

          <div className="list-stack">
            <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Historial de Facturación ({(subscription.invoices || []).length})
            </div>
            {(subscription.invoices || []).length === 0 ? (
              <div className="list-item-card" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Sin cargos registrados (Plan Free gratuito).
              </div>
            ) : (
              subscription.invoices.slice(0, 4).map(inv => (
                <div key={inv.id} className="list-item-card">
                  <div>
                    <strong style={{ fontSize: '0.8rem' }}>{inv.planId} ({inv.billingCycle})</strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {inv.date} · Ref: {inv.id}
                    </div>
                  </div>
                  <strong style={{ color: 'var(--accent)' }}>${inv.amountUsd} USD</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. PRIVACIDAD (GDPR / LEY 1581 COLOMBIA), CIFRADO AES-256 Y AUDITORÍA
         ==================================================================== */}
      <div className="card">
        <span className="tag-pill">Privacidad · GDPR (UE) · Ley 1581 de 2012 (Colombia)</span>
        <div className="card-title" style={{ marginTop: '6px' }}>
          Consentimiento Granular, Cifrado AES-256-GCM y Derechos del Titular
        </div>
        <div className="card-desc">
          Controla qué módulos pueden procesar tus datos, verifica el cifrado en reposo y ejerce tu derecho de portabilidad o supresión total.
        </div>

        <div className="split-grid">
          <div className="list-stack">
            {GRANULAR_CONSENT_CATALOG.map(item => (
              <label
                key={item.key}
                className="list-item-card"
                style={{ cursor: item.required ? 'default' : 'pointer', alignItems: 'flex-start', gap: '10px', padding: '10px 12px' }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(consents[item.key])}
                  disabled={item.required}
                  onChange={e => handleToggleConsent(item.key, e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.81rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{item.legalBasis}</div>
                </div>
              </label>
            ))}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              <button type="button" className="btn-solid" onClick={handleExportGdprData}>
                Exportar todos mis datos (GDPR / Ley 1581 JSON)
              </button>
              <button type="button" className="btn-outline" onClick={handleTestEncryption}>
                Verificar cifrado AES-256-GCM
              </button>
              <button
                type="button"
                className="btn-outline"
                style={{ borderColor: '#dc2626', color: '#dc2626' }}
                onClick={() => setConfirmDeleteOpen(v => !v)}
              >
                Borrar mi cuenta y mis datos
              </button>
            </div>

            {encryptionSample && (
              <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <strong style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>
                  Cifrado verificado: {encryptionSample.alg}
                </strong>
                <code style={{ fontSize: '0.71rem', wordBreak: 'break-all' }}>
                  IV: {encryptionSample.iv} | Cipher: {encryptionSample.ciphertext.slice(0, 64)}...
                </code>
              </div>
            )}

            {confirmDeleteOpen && (
              <form
                onSubmit={handlePurgeAccount}
                className="list-item-card"
                style={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: '8px',
                  borderColor: '#dc2626',
                  padding: '12px'
                }}
              >
                <strong style={{ fontSize: '0.82rem', color: '#dc2626' }}>
                  Confirmar Derecho al Olvido (Supresión permanente GDPR Art. 17 / Ley 1581)
                </strong>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Esta acción elimina perfil, diario, conversaciones, consentimientos y tokens locales de forma irreversible. Escribe <strong>{currentUser.email}</strong> para confirmar:
                </span>
                <input
                  type="email"
                  className="input-clean"
                  placeholder={currentUser.email}
                  value={confirmEmailInput}
                  onChange={e => setConfirmEmailInput(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="btn-solid"
                  style={{ background: '#dc2626', alignSelf: 'flex-start' }}
                >
                  Confirmar eliminación definitiva
                </button>
              </form>
            )}
          </div>

          <div className="list-stack">
            <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Log de Auditoría de Privacidad ({auditLogs.length} eventos)
            </div>
            {auditLogs.length === 0 ? (
              <div className="list-item-card" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Los cambios de consentimiento, exportaciones y actualizaciones clínicas aparecerán aquí con hash SHA-256.
              </div>
            ) : (
              auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.77rem' }}>
                    <strong>{log.action}</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{log.timestamp.slice(0, 19).replace('T', ' ')}</span>
                  </div>
                  <span style={{ fontSize: '0.76rem' }}>{log.details}</span>
                  <code style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    SHA-256: {log.integrityHash.slice(0, 24)}...
                  </code>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. OBSERVABILIDAD: LOGS JSON, SENTRY, MICROMETER/GRAFANA Y ANALÍTICA ANÓNIMA
         ==================================================================== */}
      <div className="card">
        <span className="tag-pill">Observabilidad · Logs JSON · Sentry · Micrometer + Grafana</span>
        <div className="card-title" style={{ marginTop: '6px' }}>
          Telemetría Técnica y Analítica Anónima (Cero PII)
        </div>
        <div className="card-desc">
          Monitoreo de errores sin datos personales, métricas Prometheus (`/actuator/prometheus`) y eventos de producto agregados bajo tu consentimiento.
        </div>

        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-label">Logs estructurados JSON</div>
            <div className="stat-value">{structuredLogs.length}</div>
            <div className="stat-sub">Sanitización PII automática</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Eventos Sentry</div>
            <div className="stat-value">{sentryEvents.length}</div>
            <div className="stat-sub">Captura segura de excepciones</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Eventos anónimos producto</div>
            <div className="stat-value">{analyticsEvents.length}</div>
            <div className="stat-sub">
              {consents.anonymousProductAnalytics ? 'Opt-in activo (hash anónimo)' : 'Desactivado por usuario'}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Micrometer + Grafana</div>
            <div className="stat-value" style={{ fontSize: '0.95rem' }}>/actuator/prometheus</div>
            <div className="stat-sub">Scraping cada 15s + Dashboard Grafana</div>
          </div>
        </div>

        {analyticsEvents.length > 0 && (
          <div className="list-stack" style={{ marginTop: '12px' }}>
            {analyticsEvents.slice(0, 3).map(evt => (
              <div key={evt.id} className="list-item-card" style={{ padding: '8px 12px', fontSize: '0.76rem' }}>
                <span>
                  <strong>{evt.eventName}</strong> · SessionHash: <code>{evt.anonymousSessionHash}</code>
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{evt.timestamp.slice(11, 19)}</span>
              </div>
            ))}
          </div>
        )}

        <HealthDisclaimer />
      </div>
    </div>
  );
}
