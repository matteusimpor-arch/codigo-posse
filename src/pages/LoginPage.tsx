import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FieldLabel, Input } from '../components/ui/Field';
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

  const switchMode = (next: 'login' | 'register' | 'reset') => {
    setMode(next);
    setErrorMsg(null);
    setInfoMsg(null);
  };

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
    <div className="min-h-dvh flex flex-col bg-[var(--bg-app)] text-[var(--text-main)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Alternância discreta de tema no canto superior direito */}
      <div className="flex justify-end px-6 pt-3">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="min-h-[44px] min-w-[44px] -mr-2 inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)]"
          aria-label="Alternar tema"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Formulário centralizado, compacto e minimalista: 24px margem mobile, max 400px desktop */}
      <main className="flex-1 flex items-center justify-center px-6 pb-8 pt-2">
        <div className="w-full max-w-[400px] space-y-5">
          <div className="flex flex-col items-center text-center space-y-1.5">
            <BrandLogo size="lg" />
            <p className="text-xs font-medium text-[var(--gold-text)] tracking-wide">
              Estratégia. Disciplina. Aprovação.
            </p>
          </div>

          {!isSupabaseConfigured && !import.meta.env.DEV && (
            <div className="rounded-xl border border-[var(--negative)]/60 bg-[var(--bg-card)] px-4 py-3 text-xs text-[var(--negative)] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Serviço de autenticação indisponível no momento. Verifique a configuração de ambiente.</span>
            </div>
          )}

          {sessionExpiredMessage && (
            <div className="rounded-xl border border-[var(--gold)] bg-[var(--bg-card)] px-4 py-3 text-xs text-[var(--text-main)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--gold-text)] shrink-0" />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          <Card padding="lg" className="space-y-4">
            <div className="text-center">
              <h1 className="text-lg font-bold text-[var(--text-main)]">
                {mode === 'login'
                  ? 'Entrar na sua conta'
                  : mode === 'register'
                  ? 'Criar conta'
                  : 'Recuperar senha'}
              </h1>
            </div>

            {errorMsg && (
              <div
                className="rounded-xl border border-[var(--negative)]/60 bg-[var(--bg-app)] px-3.5 py-2.5 text-xs text-[var(--negative)] flex items-start gap-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="rounded-xl border border-[var(--positive)]/60 bg-[var(--bg-app)] px-3.5 py-2.5 text-xs text-[var(--positive)] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3.5">
                <div>
                  <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-[var(--negative)]">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="login-password">Senha</FieldLabel>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-11"
                      {...loginForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--text-muted)]"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-[var(--negative)]">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" fullWidth disabled={submitting || !isSupabaseConfigured}>
                  {submitting ? 'Entrando...' : 'Entrar'}
                </Button>

                <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="min-h-[36px] text-[var(--text-muted)] hover:text-[var(--gold-text)] transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="min-h-[36px] font-semibold text-[var(--gold-text)] hover:underline underline-offset-2"
                  >
                    Criar conta
                  </button>
                </div>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3.5">
                <div>
                  <FieldLabel htmlFor="reg-name">Nome completo</FieldLabel>
                  <Input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome"
                    {...registerForm.register('fullName')}
                  />
                  {registerForm.formState.errors.fullName && (
                    <p className="mt-1 text-xs text-[var(--negative)]">
                      {registerForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="reg-email">E-mail</FieldLabel>
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-[var(--negative)]">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="reg-password">Senha (mín. 6 caracteres)</FieldLabel>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Crie uma senha"
                      className="pr-11"
                      {...registerForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--text-muted)]"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-[var(--negative)]">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" fullWidth disabled={submitting || !isSupabaseConfigured}>
                  {submitting ? 'Criando conta...' : 'Criar conta'}
                </Button>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="min-h-[36px] text-xs font-semibold text-[var(--gold-text)] hover:underline underline-offset-2"
                  >
                    Já tenho conta · Entrar
                  </button>
                </div>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-3.5">
                <p className="text-xs text-[var(--text-muted)]">
                  Informe seu e-mail para receber o link de redefinição de senha.
                </p>
                <div>
                  <FieldLabel htmlFor="reset-email">E-mail</FieldLabel>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    {...resetForm.register('email')}
                  />
                  {resetForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-[var(--negative)]">
                      {resetForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button type="submit" fullWidth disabled={submitting || !isSupabaseConfigured}>
                  {submitting ? 'Enviando...' : 'Enviar link'}
                </Button>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="min-h-[36px] text-xs font-semibold text-[var(--gold-text)] hover:underline underline-offset-2"
                  >
                    Voltar para o login
                  </button>
                </div>
              </form>
            )}

            {mode !== 'reset' && (
              <div className="pt-3 border-t border-[var(--border-color)]">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={handleGoogle}
                  disabled={!isSupabaseConfigured}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                </Button>
              </div>
            )}
          </Card>

          {/* Aviso técnico compacto restrito ao ambiente de desenvolvimento quando sem variáveis */}
          {import.meta.env.DEV && !isSupabaseConfigured && (
            <details className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-2.5 text-xs text-[var(--text-muted)]">
              <summary className="cursor-pointer font-medium text-[var(--text-main)]">
                Configuração local do Supabase (dev)
              </summary>
              <div className="mt-2 space-y-2">
                <p>
                  Defina <code className="tabular-nums">VITE_SUPABASE_URL</code> e{' '}
                  <code className="tabular-nums">VITE_SUPABASE_PUBLISHABLE_KEY</code> no ambiente.
                </p>
                <button
                  type="button"
                  onClick={() => enterDemoMode(true)}
                  className="text-xs font-semibold text-[var(--gold-text)] underline underline-offset-2"
                >
                  Testar interface com dados locais
                </button>
              </div>
            </details>
          )}
        </div>
      </main>
    </div>
  );
};
