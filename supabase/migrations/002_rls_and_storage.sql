-- ============================================================================
-- CÓDIGO DA POSSE — Migration 002: Row Level Security (RLS), Triggers e Storage
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger automático ao cadastrar usuário em auth.users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Habilitar RLS em todas as tabelas pessoais
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_notebook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Políticas para PROFILES (usa id = auth.uid())
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ----------------------------------------------------------------------------
-- Políticas padronizadas por user_id = auth.uid()
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tables_with_user_id TEXT[] := ARRAY[
    'user_settings',
    'goals',
    'subjects',
    'goal_subjects',
    'topics',
    'study_sessions',
    'mock_exams',
    'mock_exam_results',
    'question_sessions',
    'reviews',
    'syllabus_items',
    'study_plans',
    'study_targets',
    'error_notebook',
    'active_timers',
    'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_user_id LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I_select_own" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_select_own" ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_insert_own" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_insert_own" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_update_own" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_update_own" ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_delete_own" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_delete_own" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', tbl, tbl);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Buckets privados no Supabase Storage (avatars e study-attachments)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('study-attachments', 'study-attachments', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- Política: cada usuário acessa apenas sua pasta "<auth.uid()>/..."
DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
CREATE POLICY "avatars_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "attachments_select_own" ON storage.objects;
CREATE POLICY "attachments_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'study-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "attachments_insert_own" ON storage.objects;
CREATE POLICY "attachments_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'study-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "attachments_delete_own" ON storage.objects;
CREATE POLICY "attachments_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'study-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Garantir permissões da API PostgREST no schema public e recarregar o schema cache
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
NOTIFY pgrst, 'reload schema';
