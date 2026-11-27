import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, CheckCircle2, Database, Eye, EyeOff, Lock, Mail, Moon, Sun, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'Informe seu nome completo.'),
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

const resetSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export const LoginPage: React.FC = () => {
  const {
    user,
    isSupabaseConfigured,
    sessionExpiredMessage,
    clearSessionExpiredMessage,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendPasswordReset,
    enterDemoMode,
  } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const resetForm = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (values: LoginValues) => {
    setErrorMsg(null);
    setInfoMsg(null);
    clearSessionExpiredMessage();
    setSubmitting(true);
    try {
      await signInWithEmail(values.email, values.password);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao entrar na conta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (values: RegisterValues) => {
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUpWithEmail(
        values.fullName,
        values.email,
        values.password
      );
      if (needsEmailConfirmation) {
        setInfoMsg('Conta criada. Confirme seu e-mail antes de entrar.');
        setMode('login');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (values: ResetValues) => {
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      await sendPasswordReset(values.email);
      setInfoMsg('Enviamos um link de redefinição para o seu e-mail.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao solicitar recuperação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao iniciar login com Google.');
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-app)] text-[var(--text-main)]">
      {/* Cabeçalho padronizado idêntico ao app */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-app)] pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto h-14 px-3.5 sm:px-6 flex items-center justify-between">
          <BrandLogo size="sm" />
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="min-h-[44px] min-w-[44px] -mr-1.5 inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)]"
            aria-label="Alternar tema"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-3.5 sm:px-6 py-6">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold tracking-widest uppercase text-[var(--gold-text)]">
              Estratégia. Disciplina. Aprovação.
            </p>
            <h1 className="font-display text-2xl font-bold text-[var(--text-main)]">
              {mode === 'login' ? 'Acesse sua conta' : mode === 'register' ? 'Criar conta' : 'Recuperar senha'}
            </h1>
          </div>

          {!isSupabaseConfigured && (
            <div className="rounded-2xl border border-[var(--gold)]/60 bg-[var(--bg-card)] p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-[var(--gold-text)] mt-0.5 shrink-0" />
                <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                  <p className="font-semibold text-[var(--text-main)]">Configuração do Supabase pendente</p>
                  <p className="mt-1">
                    Defina <code className="font-mono-tabular">VITE_SUPABASE_URL</code> e{' '}
                    <code className="font-mono-tabular">VITE_SUPABASE_ANON_KEY</code> para ativar a autenticação real.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => enterDemoMode(true)}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--gold)] px-3 py-2 text-xs font-semibold text-[var(--gold-ink)]"
                >
                  Entrar no modo demonstração
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => enterDemoMode(false)}
                  className="min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-2 text-xs font-semibold text-[var(--text-main)]"
                >
                  Iniciar do zero
                </button>
              </div>
            </div>
          )}

          {sessionExpiredMessage && (
            <div className="rounded-xl border border-[var(--gold)] bg-[var(--bg-card)] px-4 py-3 text-xs text-[var(--text-main)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--gold-text)] shrink-0" />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-6">
            <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`min-h-[40px] text-xs font-semibold rounded-lg transition-colors ${
                  mode === 'login'
                    ? 'bg-[var(--bg-card)] text-[var(--gold-text)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`min-h-[40px] text-xs font-semibold rounded-lg transition-colors ${
                  mode === 'register'
                    ? 'bg-[var(--bg-card)] text-[var(--gold-text)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Cadastro
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setErrorMsg(null);
                }}
                className={`min-h-[40px] text-xs font-semibold rounded-lg transition-colors ${
                  mode === 'reset'
                    ? 'bg-[var(--bg-card)] text-[var(--gold-text)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Recuperar
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-[var(--negative)]/60 bg-[var(--bg-app)] px-3.5 py-2.5 text-xs text-[var(--negative)] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="mb-4 rounded-xl border border-[var(--positive)]/60 bg-[var(--bg-app)] px-3.5 py-2.5 text-xs text-[var(--positive)] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      {...loginForm.register('email')}
                      className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] pl-10 pr-3.5 py-2.5 text-base text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-[var(--negative)]">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                      className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] pl-10 pr-11 py-2.5 text-base text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-[var(--text-muted)]"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-[var(--negative)]">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isSupabaseConfigured}
                  className="w-full min-h-[48px] rounded-xl bg-[var(--gold)] py-2.5 text-sm font-semibold text-[var(--gold-ink)] hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Nome completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome"
                      {...registerForm.register('fullName')}
                      className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] pl-10 pr-3.5 py-2.5 text-base text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                  </div>
                  {registerForm.formState.errors.fullName && (
                    <p className="mt-1 text-xs text-[var(--negative)]">{registerForm.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      {...registerForm.register('email')}
                      className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] pl-10 pr-3.5 py-2.5 text-base text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-[var(--negative)]">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Senha (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Crie uma senha"
                      {...registerForm.register('password')}
                      className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] pl-10 pr-11 py-2.5 text-base text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-[var(--text-muted)]"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-[var(--negative)]">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isSupabaseConfigured}
                  className="w-full min-h-[48px] rounded-xl bg-[var(--gold)] py-2.5 text-sm font-semibold text-[var(--gold-ink)] hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Criando conta...' : 'Cadastrar'}
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                <p className="text-xs text-[var(--text-muted)]">
                  Informe seu e-mail para receber o link de redefinição de senha.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      {...resetForm.register('email')}
                      className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] pl-10 pr-3.5 py-2.5 text-base text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                  </div>
                  {resetForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-[var(--negative)]">{resetForm.formState.errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isSupabaseConfigured}
                  className="w-full min-h-[48px] rounded-xl bg-[var(--gold)] py-2.5 text-sm font-semibold text-[var(--gold-ink)] hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Enviar link'}
                </button>
              </form>
            )}

            {mode !== 'reset' && (
              <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={!isSupabaseConfigured}
                  className="w-full min-h-[46px] flex items-center justify-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] py-2.5 text-sm font-medium text-[var(--text-main)] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  Continuar com Google
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
