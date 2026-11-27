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
        setInfoMsg('Conta criada. Verifique sua caixa de entrada para confirmar o e-mail antes de entrar.');
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
      setInfoMsg('Enviamos um link de redefinição de senha para o seu e-mail.');
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC] dark:bg-slate-950">
      {/* Left Institutional Brand Column */}
      <div className="lg:w-[44%] bg-[#0F172A] text-white px-5 py-4 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        <div className="flex items-center justify-between">
          <BrandLogo size="md" onDark />
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Alternar tema"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="hidden lg:block my-0 max-w-md">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#D4A853]">
            Estratégia. Disciplina. Aprovação.
          </p>
          <h1 className="mt-4 font-display text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-balance">
            Seu estudo organizado com simplicidade até a posse.
          </h1>
          <p className="mt-4 text-sm lg:text-base text-slate-300 leading-relaxed">
            Registre sessões, questões e revisões espaçadas em segundos, com métricas reais e foco no que importa.
          </p>
        </div>

        <p className="hidden lg:block text-xs text-slate-500">
          Código da Posse · Dados armazenados com isolamento por usuário no PostgreSQL (Supabase).
        </p>
      </div>

      {/* Right Auth Form Column */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          {!isSupabaseConfigured && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <p className="font-semibold">Configuração do Supabase pendente</p>
                  <p className="mt-1">
                    Defina <code className="font-mono-tabular">VITE_SUPABASE_URL</code> e{' '}
                    <code className="font-mono-tabular">VITE_SUPABASE_ANON_KEY</code> (ou{' '}
                    <code className="font-mono-tabular">VITE_SUPABASE_PUBLISHABLE_KEY</code>) e execute as migrations em{' '}
                    <code className="font-mono-tabular">supabase/migrations/</code> para ativar a autenticação real.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => enterDemoMode(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] dark:bg-[#D4A853] px-3 py-2 text-xs font-semibold text-white dark:text-[#0F172A] hover:opacity-90 transition-opacity"
                >
                  Modo demonstração local (com dados de teste)
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => enterDemoMode(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 dark:border-amber-700 px-3 py-2 text-xs font-medium text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  Testar fluxo inicial do zero
                </button>
              </div>
            </div>
          )}

          {sessionExpiredMessage && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
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
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Criar conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'reset'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Recuperar
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="mb-4 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      {...loginForm.register('email')}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isSupabaseConfigured}
                  className="w-full rounded-lg bg-[#0F172A] dark:bg-[#D4A853] py-2.5 text-sm font-semibold text-white dark:text-[#0F172A] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Entrando...' : 'Entrar na plataforma'}
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nome completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome"
                      {...registerForm.register('fullName')}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                  </div>
                  {registerForm.formState.errors.fullName && (
                    <p className="mt-1 text-xs text-red-600">{registerForm.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      {...registerForm.register('email')}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Senha (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Crie uma senha forte"
                      {...registerForm.register('password')}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-600">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isSupabaseConfigured}
                  className="w-full rounded-lg bg-[#0F172A] dark:bg-[#D4A853] py-2.5 text-sm font-semibold text-white dark:text-[#0F172A] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Criando conta...' : 'Cadastrar gratuitamente'}
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Informe seu e-mail cadastrado para receber o link seguro de recuperação de senha.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      {...resetForm.register('email')}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    />
                  </div>
                  {resetForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{resetForm.formState.errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isSupabaseConfigured}
                  className="w-full rounded-lg bg-[#0F172A] dark:bg-[#D4A853] py-2.5 text-sm font-semibold text-white dark:text-[#0F172A] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>
            )}

            {mode !== 'reset' && (
              <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={!isSupabaseConfigured}
                  className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
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
      </div>
    </div>
  );
};
