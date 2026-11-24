import React, { useState, useRef, useEffect } from 'react';
import { useNutriStore } from '../store/useNutriStore';
import { queryHybridRag, getInitialDocuments } from '../lib/nutriRagEngine';
import VoluntaryClinicalHistoryCard from '../components/VoluntaryClinicalHistoryCard';

const QUICK_SUGGESTIONS = [
  '¿Qué me recomiendas comer ahora?',
  'Cámbiame un ingrediente respetando mis gustos',
  '¿Cómo cuido mi glucosa, presión o medicamentos hoy?'
];

export default function CoachPage() {
  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const appendChatMessage = useNutriStore(s => s.appendChatMessage);
  const addMealEntry = useNutriStore(s => s.addMealEntry);
  const addWellnessCheckIn = useNutriStore(s => s.addWellnessCheckIn);
  const addAiMemoryFact = useNutriStore(s => s.addAiMemoryFact);
  const removeAiMemoryFact = useNutriStore(s => s.removeAiMemoryFact);

  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // null | 'checkin' | 'memory'

  // Estado para Chequeo rápido de 10 segundos
  const [energy, setEnergy] = useState(3);
  const [hunger, setHunger] = useState(3);
  const [digestion, setDigestion] = useState('normal');
  const [sleepHours, setSleepHours] = useState(7);
  const [newFactText, setNewFactText] = useState('');

  const streamIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  const messages = workspace?.chatMessages || [];
  const memoryFacts = workspace?.aiMemoryFacts || [];
  const vh = currentUser?.voluntaryClinicalHistory;

  const sendQuestion = async (rawQuestion) => {
    const text = String(rawQuestion || input).trim();
    if (!text || isStreaming) return;
    setInput('');

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text
    };
    const recentHistory = messages.slice(-6);
    appendChatMessage(userMsg);

    setIsStreaming(true);
    setStreamingText('');

    const ragResult = await queryHybridRag({
      question: text,
      documents: getInitialDocuments(),
      userProfile: currentUser,
      workspace,
      chatHistory: recentHistory
    });

    const fullAnswer = ragResult.answer || 'Aquí tienes una recomendación equilibrada para tu día.';
    const words = fullAnswer.split(' ');
    let idx = 0;

    await new Promise(resolve => {
      streamIntervalRef.current = setInterval(() => {
        idx += 5;
        setStreamingText(words.slice(0, idx).join(' '));
        if (idx >= words.length) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
          resolve();
        }
      }, 24);
    });

    setIsStreaming(false);
    setStreamingText('');

    appendChatMessage({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: fullAnswer,
      citations: ragResult.citations || [],
      usedFacts: ragResult.usedFacts || [],
      suggestedMeal: !ragResult.guardrailTriggered ? ragResult.recommendedMeal || null : null
    });
  };

  const handleSaveCheckIn = (e) => {
    e.preventDefault();
    addWellnessCheckIn({ energy, hunger, digestion, sleepHours });
    setActivePanel(null);
  };

  const handleAddFact = (e) => {
    e.preventDefault();
    if (!newFactText.trim()) return;
    addAiMemoryFact(newFactText);
    setNewFactText('');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '14px' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.2rem)', marginBottom: '4px' }}>
          Tu Coach de Alimentación con IA
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Pregúntame qué comer, cómo reemplazar ingredientes o cómo ajustar tus platos a tu salud.
        </p>
      </div>

      {/* Tarjeta limpia y voluntaria para compartir historial clínico si la persona desea mayor precisión */}
      <div style={{ marginBottom: '12px' }}>
        <VoluntaryClinicalHistoryCard compact />
      </div>

      {/* Herramientas opcionales de 1 clic para alimentar mejor a la IA sin llenar la pantalla */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === 'checkin' ? null : 'checkin')}
          className={`ns-btn ns-btn-sm ${activePanel === 'checkin' ? 'ns-btn-leaf' : 'ns-btn-outline'}`}
        >
          Chequeo rápido (10 s)
        </button>
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === 'memory' ? null : 'memory')}
          className={`ns-btn ns-btn-sm ${activePanel === 'memory' ? 'ns-btn-leaf' : 'ns-btn-outline'}`}
        >
          Lo que sé de ti ({memoryFacts.length})
        </button>
      </div>

      {/* Panel compacto: Chequeo rápido de 10 segundos */}
      {activePanel === 'checkin' && (
        <form
          onSubmit={handleSaveCheckIn}
          className="ns-card ns-card-sage"
          style={{ padding: '14px 16px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--brand-leaf)' }}>
            ¿Cómo te sientes hoy? (Ayuda a tu Coach en 10 segundos)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px' }}>
            <div>
              <label htmlFor="chk-energy" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>
                Energía (1–5)
              </label>
              <select id="chk-energy" className="ns-input" value={energy} onChange={e => setEnergy(e.target.value)}>
                <option value={1}>1 · Muy baja</option>
                <option value={2}>2 · Baja</option>
                <option value={3}>3 · Normal</option>
                <option value={4}>4 · Buena</option>
                <option value={5}>5 · Alta</option>
              </select>
            </div>
            <div>
              <label htmlFor="chk-hunger" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>
                Hambre / Ansiedad (1–5)
              </label>
              <select id="chk-hunger" className="ns-input" value={hunger} onChange={e => setHunger(e.target.value)}>
                <option value={1}>1 · Sin hambre</option>
                <option value={2}>2 · Ligera</option>
                <option value={3}>3 · Normal</option>
                <option value={4}>4 · Alta</option>
                <option value={5}>5 · Mucha hambre</option>
              </select>
            </div>
            <div>
              <label htmlFor="chk-digest" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>
                Digestión
              </label>
              <select id="chk-digest" className="ns-input" value={digestion} onChange={e => setDigestion(e.target.value)}>
                <option value="normal">Normal / Ligera</option>
                <option value="pesada">Pesada / Inflamación</option>
                <option value="acidez">Acidez / Reflujo</option>
                <option value="lenta">Tránsito lento</option>
              </select>
            </div>
            <div>
              <label htmlFor="chk-sleep" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>
                Sueño anoche (h)
              </label>
              <input
                id="chk-sleep"
                type="number"
                min="2"
                max="14"
                step="0.5"
                className="ns-input"
                value={sleepHours}
                onChange={e => setSleepHours(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="ns-btn ns-btn-leaf ns-btn-sm">
              Guardar chequeo
            </button>
            <button type="button" onClick={() => setActivePanel(null)} className="ns-btn ns-btn-ghost ns-btn-sm">
              Cerrar
            </button>
          </div>
        </form>
      )}

      {/* Panel editable: "Lo que sé de ti" */}
      {activePanel === 'memory' && (
        <div
          className="ns-card ns-card-warm"
          style={{ padding: '14px 16px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-leaf)' }}>
            Lo que tu Coach IA sabe de ti (editable)
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            • <strong>Dieta:</strong> {currentUser?.dietType || 'omnívora'} · <strong>País:</strong> {currentUser?.city || currentUser?.country || 'CO'}<br />
            • <strong>Alergias / Exclusiones:</strong> {[...(currentUser?.allergies || []), currentUser?.dislikedFoods].filter(Boolean).join(', ') || 'Ninguna registrada'}<br />
            • <strong>Medicamentos declarados:</strong> {vh?.consentGranted && vh?.medications ? vh.medications : 'Ninguno declarado'}
          </div>

          {memoryFacts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {memoryFacts.map(f => (
                <span key={f.id} className="ns-chip" style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {f.text}
                  <button
                    type="button"
                    onClick={() => removeAiMemoryFact(f.id)}
                    aria-label={`Eliminar nota ${f.text}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-carrot)', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleAddFact} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="ns-input"
              placeholder="Ej. Ceno tarde por trabajo / Entreno a las 6 am / Tengo freidora de aire..."
              value={newFactText}
              onChange={e => setNewFactText(e.target.value)}
              aria-label="Agregar nota personal para el Coach IA"
            />
            <button type="submit" className="ns-btn ns-btn-leaf ns-btn-sm" style={{ flexShrink: 0 }}>
              Recordar
            </button>
          </form>
        </div>
      )}

      {/* Sugerencias rápidas breves */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {QUICK_SUGGESTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => sendQuestion(s)}
            className="ns-chip"
            disabled={isStreaming}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Historial de conversación */}
      <div
        className="ns-card ns-card-organic"
        aria-live="polite"
        style={{
          padding: '22px',
          minHeight: '420px',
          maxHeight: '560px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '18px'
        }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              padding: '14px 18px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              backgroundColor: msg.role === 'user' ? 'var(--brand-leaf)' : 'var(--bg-warm)',
              color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-primary)'
            }}
          >
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.55 }}>
              {msg.text}
            </div>

            {/* Botón para agregar al diario SOLO cuando la pregunta fue sobre qué comer */}
            {msg.suggestedMeal && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-strong)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    {msg.suggestedMeal.dishName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {msg.suggestedMeal.kcal} kcal · {msg.suggestedMeal.protein}g proteína
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addMealEntry(msg.suggestedMeal)}
                  className="ns-btn ns-btn-leaf ns-btn-sm"
                >
                  + Agregar al diario
                </button>
              </div>
            )}

            {/* Transparencia sin ruido: "¿Por qué me dices esto?" y fuentes colapsables */}
            {((Array.isArray(msg.usedFacts) && msg.usedFacts.length > 0) ||
              (Array.isArray(msg.citations) && msg.citations.length > 0)) && (
              <details style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--brand-leaf)' }}>
                  ¿Por qué me dices esto?
                </summary>
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-strong)' }}>
                  {Array.isArray(msg.usedFacts) && msg.usedFacts.length > 0 && (
                    <ul style={{ margin: '0 0 6px 16px', padding: 0 }}>
                      {msg.usedFacts.map(fact => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  )}
                  {Array.isArray(msg.citations) && msg.citations.length > 0 && (
                    <div>
                      <strong>Fuentes consultadas:</strong>{' '}
                      {msg.citations
                        .slice(0, 2)
                        .map(cit => `${cit.documentName} (Pág. ${cit.pageNumber})`)
                        .join(' · ')}
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}

        {isStreaming && (
          <div
            style={{
              alignSelf: 'flex-start',
              maxWidth: '88%',
              padding: '14px 18px',
              borderRadius: '18px 18px 18px 4px',
              backgroundColor: 'var(--bg-sage)',
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              fontSize: '0.95rem'
            }}
          >
            {streamingText || 'Analizando tu perfil clínico, tus registros y tu pregunta…'}
          </div>
        )}
      </div>

      {/* Formulario de envío */}
      <form
        onSubmit={e => {
          e.preventDefault();
          sendQuestion(input);
        }}
        style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}
      >
        <input
          type="text"
          className="ns-input"
          placeholder="Escribe aquí tu pregunta (ej. ¿Y si lo cambio por arroz o qué puedo cenar?)..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isStreaming}
          aria-label="Pregunta para el Coach con IA"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="ns-btn ns-btn-carrot ns-btn-md"
        >
          Enviar
        </button>
      </form>

      {/* Aviso legal obligatorio en el chat */}
      <div
        role="note"
        style={{
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-warm)',
          borderRadius: '10px'
        }}
      >
        NutriStudio AI ofrece orientación informativa sobre alimentación y no reemplaza la consulta con un profesional de la salud.
      </div>
    </div>
  );
}
