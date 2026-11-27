import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { DEMO_USER_ID } from '../services/demoStore';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
  demoWithSampleData: boolean;
  isSupabaseConfigured: boolean;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  enterDemoMode: (withSampleData?: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_USER: User = {
  id: DEMO_USER_ID,
  app_metadata: {},
  user_metadata: { full_name: 'Estudante Demonstração' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demonstracao@codigodaposse.local',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoWithSampleData, setDemoWithSampleData] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setSession(null);
          setUser(null);
        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'TOKEN_REFRESHED' && !nextSession) {
        setSessionExpiredMessage('Sua sessão expirou. Faça login novamente para continuar.');
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      } else {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('O Supabase ainda não está configurado neste ambiente.');
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('E-mail ou senha incorretos.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Confirme seu e-mail antes de acessar sua conta.');
      }
      throw new Error(error.message);
    }
    setIsDemoMode(false);
  }, []);

  const signUpWithEmail = useCallback(async (fullName: string, email: string, password: string) => {
    if (!supabase) {
      throw new Error('O Supabase ainda não está configurado neste ambiente.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw new Error(error.message);
    return {
      needsEmailConfirmation: !data.session,
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      throw new Error('Configure o Supabase e o provedor Google OAuth antes de usar este recurso.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error('O Supabase ainda não está configurado neste ambiente.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/conta`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (isDemoMode) {
      throw new Error('Alteração de senha não está disponível no modo demonstração local.');
    }
    if (!supabase) {
      throw new Error('O Supabase ainda não está configurado neste ambiente.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }, [isDemoMode]);

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUser(null);
      setSession(null);
      return;
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  }, [isDemoMode]);

  const deleteAccount = useCallback(async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUser(null);
      setSession(null);
      return;
    }
    if (!supabase || !session) {
      throw new Error('Sessão inválida para exclusão da conta.');
    }
    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (error || data?.error) {
      throw new Error(
        data?.error ||
          error?.message ||
          'Não foi possível excluir a conta. Verifique se a Edge Function delete-account está implantada no Supabase.'
      );
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [isDemoMode, session]);

  const enterDemoMode = useCallback((withSampleData = true) => {
    setDemoWithSampleData(withSampleData);
    setIsDemoMode(true);
    setUser(DEMO_USER);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isDemoMode,
        demoWithSampleData,
        isSupabaseConfigured,
        sessionExpiredMessage,
        clearSessionExpiredMessage: () => setSessionExpiredMessage(null),
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendPasswordReset,
        updatePassword,
        signOut,
        deleteAccount,
        enterDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
