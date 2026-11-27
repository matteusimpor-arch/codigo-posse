import React from 'react';
import {
  BookOpen,
  CalendarCheck2,
  CircleUserRound,
  Home,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { BrandLogo } from '../BrandLogo';
import { OfflineIndicator } from '../pwa/OfflineIndicator';

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/estudos', label: 'Estudos', icon: BookOpen },
  { to: '/questoes', label: 'Questões', icon: ListChecks },
  { to: '/revisoes', label: 'Revisões', icon: CalendarCheck2 },
  { to: '/evolucao', label: 'Evolução', icon: TrendingUp },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut, isDemoMode } = useAuth();
  const { profile } = useData();

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-app)] text-[var(--text-main)]">
      {isDemoMode && (
        <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)] px-3.5 py-1.5 text-xs text-[var(--text-muted)] flex items-center justify-between gap-2">
          <span className="truncate">
            <strong className="text-[var(--gold-text)]">Modo demonstração</strong> · Sessão local
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="font-semibold text-[var(--gold-text)] underline underline-offset-2 shrink-0 min-h-[32px] px-1"
          >
            Sair
          </button>
        </div>
      )}

      {/* Cabeçalho padronizado — mesma cor de fundo com borda discreta */}
      <header className="sticky top-0 z-30 bg-[var(--bg-app)] border-b border-[var(--border-color)] pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto h-14 px-3.5 sm:px-6 flex items-center justify-between gap-3">
          <Link to="/" className="shrink-0 min-h-[44px] flex items-center" aria-label="Ir para o início">
            <BrandLogo size="sm" />
          </Link>

          {/* Navegação desktop (5 opções idênticas) */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `min-h-[40px] px-3.5 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center ${
                    isActive
                      ? 'text-[var(--gold-text)] bg-[var(--bg-card)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Ícone de usuário no canto superior direito */}
          <NavLink
            to="/conta"
            aria-label="Perfil e configurações"
            title={profile?.full_name || 'Perfil e configurações'}
            className={({ isActive }) =>
              `min-h-[44px] min-w-[44px] -mr-1.5 flex items-center justify-center rounded-full transition-colors overflow-hidden ${
                isActive
                  ? 'text-[var(--gold-text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`
            }
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'Perfil'}
                className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
              />
            ) : (
              <CircleUserRound className="w-6 h-6" strokeWidth={1.75} />
            )}
          </NavLink>
        </div>
      </header>

      {/* Conteúdo principal com margens uniformes (14px mobile) e folga inferior segura */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10">
        {children}
      </main>

      {/* Barra inferior fixa — 5 abas idênticas à referência */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-app)] border-t border-[var(--border-color)] pb-[env(safe-area-inset-bottom)]"
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
                      ? 'text-[var(--gold-text)] font-semibold'
                      : 'text-[var(--text-muted)]'
                  }`
                }
              >
                <Icon className="w-5 h-5" strokeWidth={1.9} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator />
    </div>
  );
};
