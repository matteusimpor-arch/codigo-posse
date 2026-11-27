/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AccountPage } from './pages/AccountPage';
import { DashboardPage } from './pages/DashboardPage';
import { EvolutionPage } from './pages/EvolutionPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { QuestionsPage } from './pages/QuestionsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { StudyDiaryPage } from './pages/StudyDiaryPage';

const ProtectedShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: dataLoading, error } = useData();
  const location = useLocation();

  if (authLoading || (user && dataLoading && !profile)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--bg-app)]">
        <div className="text-center space-y-2.5">
          <div className="w-8 h-8 rounded-full border-2 border-[#D4A853] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Carregando Código da Posse...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile && !profile.onboarding_completed && location.pathname !== '/configuracao-inicial') {
    return <Navigate to="/configuracao-inicial" replace />;
  }

  if (location.pathname === '/configuracao-inicial') {
    return <>{children}</>;
  }

  return (
    <AppLayout>
      {error && (
        <div className="mb-4 rounded-xl border border-[var(--negative)]/60 bg-[var(--bg-card)] px-4 py-3 text-xs text-[var(--negative)]">
          {error}
        </div>
      )}
      {children}
    </AppLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/configuracao-inicial"
                element={
                  <ProtectedShell>
                    <OnboardingPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedShell>
                    <DashboardPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/estudos"
                element={
                  <ProtectedShell>
                    <StudyDiaryPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/questoes"
                element={
                  <ProtectedShell>
                    <QuestionsPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/revisoes"
                element={
                  <ProtectedShell>
                    <ReviewsPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/evolucao"
                element={
                  <ProtectedShell>
                    <EvolutionPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/conta"
                element={
                  <ProtectedShell>
                    <AccountPage />
                  </ProtectedShell>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
