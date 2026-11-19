import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Chip } from '../design-system';

export default function NutritionChartsPanel({ workspace, userProfile }) {
  const [rangeDays, setRangeDays] = useState(7); // 7 | 30
  const meals = workspace?.mealLogs || [];
  const weights = workspace?.weightHistory || [];

  // Serie temporal de calorías y macros por día (7 o 30 días)
  const timelineData = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const dayMeals = meals.filter(m => m.date === iso);
    timelineData.push({
      date: label,
      kcal: dayMeals.reduce((a, m) => a + (Number(m.totalCalories) || 0), 0),
      proteina: dayMeals.reduce((a, m) => a + (Number(m.proteinGrams) || 0), 0),
      carbs: dayMeals.reduce((a, m) => a + (Number(m.carbsGrams) || 0), 0),
      grasas: dayMeals.reduce((a, m) => a + (Number(m.fatGrams) || 0), 0)
    });
  }

  // Serie de peso corporal vs media móvil
  const sortedWeights = [...weights].slice(0, rangeDays).reverse();
  const baseWeight = Number(userProfile?.weightKg || 68);
  const weightChartData =
    sortedWeights.length >= 2
      ? sortedWeights.map((w, idx) => {
          const prev = Number(sortedWeights[Math.max(0, idx - 1)].weightKg || w.weightKg);
          const avg = Number(((Number(w.weightKg) + prev) / 2).toFixed(1));
          return {
            fecha: (w.date || '').slice(5),
            peso: Number(w.weightKg),
            mediaMovil: avg
          };
        })
      : [
          { fecha: 'Inicio', peso: baseWeight, mediaMovil: baseWeight },
          { fecha: 'Hoy', peso: baseWeight, mediaMovil: baseWeight }
        ];

  // Cumplimiento de micronutrientes en los platos recientes
  const recentMeals = meals.slice(0, 12);
  const fiberSum = recentMeals.reduce((a, m) => a + (Number(m.fiberGrams) || 0), 0);
  const potassiumSum = recentMeals.reduce((a, m) => a + (Number(m.potassiumMg) || 0), 0);
  const vitCSum = recentMeals.reduce((a, m) => a + (Number(m.vitaminCMg) || 0), 0);
  const sodiumSum = recentMeals.reduce((a, m) => a + (Number(m.sodiumMg) || 0), 0);

  const microData = [
    { nutriente: 'Fibra', pct: Math.min(100, Math.round((fiberSum / 30) * 100)) },
    { nutriente: 'Potasio', pct: Math.min(100, Math.round((potassiumSum / 3500) * 100)) },
    { nutriente: 'Vitamina C', pct: Math.min(100, Math.round((vitCSum / 90) * 100)) },
    { nutriente: 'Control Sodio', pct: sodiumSum === 0 ? 100 : Math.max(20, Math.min(100, Math.round((2000 / Math.max(1, sodiumSum)) * 100))) }
  ];

  return (
    <div className="card" style={{ marginTop: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div>
          <span className="tag-pill">Analítica Visual Interactiva</span>
          <div className="card-title" style={{ marginTop: '6px' }}>
            Tendencias de Peso, Calorías, Macros y Micronutrientes
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Chip active={rangeDays === 7} onClick={() => setRangeDays(7)}>
            7 días
          </Chip>
          <Chip active={rangeDays === 30} onClick={() => setRangeDays(30)}>
            30 días
          </Chip>
        </div>
      </div>

      <div className="split-grid">
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '8px' }}>
            Calorías y Macronutrientes ({rangeDays} días)
          </div>
          <div style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="kcal" name="Calorías (kcal)" fill="#0d8a68" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '8px' }}>
            Tendencia de Peso vs. Media Móvil (kg)
          </div>
          <div style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer>
              <AreaChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="peso"
                  name="Peso (kg)"
                  stroke="#0d8a68"
                  fill="#d9f5ea"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="mediaMovil"
                  name="Media móvil"
                  stroke="#f97316"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '8px' }}>
          Cobertura Estimada de Micronutrientes Recientes (%)
        </div>
        <div style={{ width: '100%', height: 150 }}>
          <ResponsiveContainer>
            <BarChart data={microData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="nutriente" type="category" width={92} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="pct" name="% Meta" fill="#f97316" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
