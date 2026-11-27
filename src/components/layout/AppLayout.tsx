import React, { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Home,
  Plus,
  RotateCcw,
  TrendingUp,
  User,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { BrandLogo } from '../BrandLogo';
import { QuickRegisterModal } from '../QuickRegisterModal';
import { OfflineIndicator } from '../pwa/OfflineIndicator';

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/estudos', label: 'Estudos', icon: BookOpen },
  { to: '/questoes', label: 'Questões', icon: HelpCircle },
  { to: '/revisoes', label: 'Revisões', icon: RotateCcw },
  { to: '/evolucao', label: 'Evolução', icon: TrendingUp },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut, isDemoMode } = useAuth();
  const { profile } = useData();
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {isDemoMode && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/70 px-4 py-1.5 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
          <span className="truncate">
            <strong>Modo demonstração local</strong> · Dados apenas nesta sessão
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="font-semibold underline underline-offset-2 shrink-0"
          >
            Sair
          </button>
        </div>
      )}

      {/* Compact Mobile-First + Desktop Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0" aria-label="Ir para o início">
            <BrandLogo size="sm" />
          </Link>

          {/* Desktop 5-item Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0F172A] text-[#E5C478] dark:bg-[#D4A853] dark:text-[#0F172A]'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Top-right Quick Register (desktop) + User Account Icon */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] dark:bg-[#D4A853] px-3.5 py-2 text-xs font-semibold text-white dark:text-[#0F172A] hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar
            </button>

            <NavLink
              to="/conta"
              aria-label="Perfil e configurações"
              title={profile?.full_name || 'Perfil e configurações'}
              className={({ isActive }) =>
                `min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border transition-colors overflow-hidden ${
                  isActive
                    ? 'border-[#D4A853] ring-2 ring-[#D4A853]/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Perfil'}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              )}
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-28 md:pb-12">
        {children}
      </main>

      {/* Fixed 5-item Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação inferior"
      >
        <div className="grid grid-cols-5 h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 min-h-[48px] text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-[#B8892E] dark:text-[#D4A853] font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <QuickRegisterModal open={quickOpen} onClose={() => setQuickOpen(false)} />
      <OfflineIndicator />
    </div>
  );
};
