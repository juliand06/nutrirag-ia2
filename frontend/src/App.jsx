import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useNutriStore } from './store/useNutriStore';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';

const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const DiaryPage = lazy(() => import('./pages/DiaryPage'));
const FoodsPage = lazy(() => import('./pages/FoodsPage'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const CoachPage = lazy(() => import('./pages/CoachPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function PageFallback() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Cargando tu mesa en NutriStudio…
    </div>
  );
}

export default function App() {
  const themeMode = useNutriStore(s => s.themeMode);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
          {/* Flujo público obligatorio: 1) Portada -> 2) Datos rápidos -> 3) Registro / Login */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/empezar" element={<OnboardingPage />} />
          <Route path="/registro" element={<AuthPage mode="register" />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/recuperar-clave" element={<AuthPage mode="forgot" />} />

          {/* 4) Aplicación principal protegida */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell>
                  <HomePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/diario"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DiaryPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/alimentos"
            element={
              <ProtectedRoute>
                <AppShell>
                  <FoodsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/aprende"
            element={
              <ProtectedRoute>
                <AppShell>
                  <LearnPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/planes"
            element={
              <ProtectedRoute>
                <AppShell>
                  <PlansPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/coach"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CoachPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/progreso"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProgressPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/perfil"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Suspense>
  );
}
