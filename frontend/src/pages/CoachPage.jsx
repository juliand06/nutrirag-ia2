import React, { useState } from 'react';
import { useNutriStore } from '../store/useNutriStore';
import { queryHybridRag, getInitialDocuments } from '../lib/nutriRagEngine';
import { generateProactiveDailyRoadmap } from '../lib/proactiveAiEngine';

const QUICK_SUGGESTIONS = [
  '¿Qué debería comer en mi próxima comida según mi día de hoy?',
  'Cámbiame un ingrediente respetando mis alergias y gustos',
  '¿Cómo aplico mi protocolo clínico (ADA / DASH / OMS) hoy?',
  'Opciones económicas de almuerzo y cena en mi ciudad'
];

export default function CoachPage() {
  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const appendChatMessage = useNutriStore(s => s.appendChatMessage);
  const addMealEntry = useNutriStore(s => s.addMealEntry);

  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const roadmap = generateProactiveDailyRoadmap(currentUser || {}, workspace || {});
  const ctx = roadmap.context;
  const messages = workspace?.chatMessages || [];

  const sendQuestion = async (rawQuestion) => {
    const text = String(rawQuestion || input).trim();
    if (!text || isStreaming) return;
    setInput('');

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text
    };
    appendChatMessage(userMsg);

    setIsStreaming(true);
    setStreamingText('');

    const ragResult = await queryHybridRag({
      question: text,
      documents: getInitialDocuments(),
      userProfile: currentUser,
      workspace
    });

    const fullAnswer = ragResult.answer || 'Aquí tienes una recomendación equilibrada para tu día.';
    const words = fullAnswer.split(' ');
    let idx = 0;

    await new Promise(resolve => {
      const interval = setInterval(() => {
        idx += 5;
        setStreamingText(words.slice(0, idx).join(' '));
        if (idx >= words.length) {
          clearInterval(interval);
          resolve();
        }
      }, 28);
    });

    setIsStreaming(false);
    setStreamingText('');

    appendChatMessage({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: fullAnswer,
      citations: ragResult.citations || [],
      suggestedMeal: !ragResult.guardrailTriggered ? roadmap.recommendedMeal : null
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: '4px' }}>
          Tu Coach Clínico y Nutricional con IA
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Tiene en memoria tus 13 datos del perfil, tus alergias, alimentos excluidos, horarios, presupuesto y lo que has comido hoy.
        </p>
      </div>

      {/* PANEL PROACTIVO EN MEMORIA DEL COACH (Antes siquiera de preguntar) */}
      <div
        className="ns-card ns-card-sage"
        style={{
          padding: '18px 20px',
          marginBottom: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-leaf)', textTransform: 'uppercase' }}>
            Memoria activa de tu IA (13 dimensiones + seguimiento de hoy)
          </span>
          <span className="ns-chip" style={{ fontSize: '0.76rem', padding: '3px 10px' }}>
            {roadmap.protocols[0]?.source}
          </span>
        </div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {roadmap.profileAuditSummary}
        </div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <strong>Diagnóstico sin preguntar ({roadmap.timeWindowLabel}):</strong> Llevas {ctx.consumed.kcal} de {ctx.goals.kcal} kcal ({ctx.consumed.protein}g proteína y {ctx.waterGlassesToday} vasos de agua). Tu IA te sugiere para <strong>{roadmap.nextMealType}</strong>: <em>{roadmap.recommendedMeal.dishName}</em> ({roadmap.recommendedMeal.kcal} kcal · {roadmap.recommendedMeal.protein}g proteína).
        </div>
      </div>

      {/* Sugerencias rápidas */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
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

            {/* Botón para agregar al diario cuando aplique */}
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

            {/* Fuentes citadas del motor RAG */}
            {Array.isArray(msg.citations) && msg.citations.length > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px dashed var(--border-strong)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <strong>Fuentes médicas y clínicas consultadas (RAG):</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {msg.citations.slice(0, 3).map(cit => (
                    <li key={`${cit.documentId}-${cit.pageNumber}-${cit.chunkOrder}`}>
                      {cit.documentName} (Pág. {cit.pageNumber} — {cit.sectionTitle})
                    </li>
                  ))}
                </ul>
              </div>
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
            {streamingText || 'Analizando tu perfil clínico y tus alimentos disponibles…'}
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
          placeholder="Escribe aquí tu pregunta (ej. ¿Con qué reemplazo el arroz en la noche?)..."
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
