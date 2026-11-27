-- ============================================================================
-- CÓDIGO DA POSSE — Migration 001: Estrutura Inicial do Banco de Dados
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função para atualização automática da coluna updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. USER SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  review_intervals INTEGER[] NOT NULL DEFAULT ARRAY[1, 7, 15, 30],
  pomodoro_study_minutes INTEGER NOT NULL DEFAULT 25 CHECK (pomodoro_study_minutes BETWEEN 1 AND 180),
  pomodoro_break_minutes INTEGER NOT NULL DEFAULT 5 CHECK (pomodoro_break_minutes BETWEEN 1 AND 60),
  pomodoro_long_break_minutes INTEGER NOT NULL DEFAULT 15 CHECK (pomodoro_long_break_minutes BETWEEN 1 AND 90),
  notification_preferences JSONB NOT NULL DEFAULT '{"reviews_today": true, "overdue_reviews": true, "goal_deadlines": true, "exam_countdown": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. GOALS (Objetivos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  area TEXT NOT NULL,
  exam_name TEXT,
  organization TEXT,
  position TEXT,
  exam_board TEXT,
  education_level TEXT,
  exam_date DATE,
  weekly_study_target NUMERIC(6,2) NOT NULL DEFAULT 20 CHECK (weekly_study_target >= 0),
  weekly_question_target INTEGER NOT NULL DEFAULT 200 CHECK (weekly_question_target >= 0),
  status TEXT NOT NULL DEFAULT 'em_preparacao' CHECK (
    status IN ('em_preparacao', 'edital_publicado', 'inscricao_realizada', 'prova_realizada', 'aprovado', 'arquivado')
  ),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, user_id)
);

-- Garante no máximo 1 objetivo principal por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_one_primary_per_user
  ON public.goals (user_id)
  WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals (user_id);
CREATE INDEX IF NOT EXISTS idx_goals_exam_date ON public.goals (exam_date);

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. SUBJECTS (Disciplinas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  color TEXT NOT NULL DEFAULT '#D4A853',
  difficulty TEXT NOT NULL DEFAULT 'intermediario' CHECK (difficulty IN ('facil', 'intermediario', 'dificil')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects (user_id);

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. GOAL_SUBJECTS (Relacionamento Objetivo x Disciplina)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goal_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  exam_weight NUMERIC(5,2) CHECK (exam_weight IS NULL OR exam_weight >= 0),
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (goal_id, subject_id),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goal_subjects_user_goal ON public.goal_subjects (user_id, goal_id);

CREATE TRIGGER trg_goal_subjects_updated_at
  BEFORE UPDATE ON public.goal_subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. TOPICS (Assuntos e Subassuntos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,
  parent_topic_id UUID,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, user_id),
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_topic_id, user_id) REFERENCES public.topics(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_topics_user_subject ON public.topics (user_id, subject_id);

CREATE TRIGGER trg_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. STUDY_SESSIONS (Diário de Estudos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID,
  subject_id UUID NOT NULL,
  topic_id UUID,
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  study_type TEXT NOT NULL CHECK (
    study_type IN ('teoria', 'videoaula', 'leitura_pdf', 'lei_seca', 'questoes', 'revisao', 'simulado', 'outros')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, user_id),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (topic_id, user_id) REFERENCES public.topics(id, user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON public.study_sessions (user_id, study_date DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON public.study_sessions (subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_goal ON public.study_sessions (goal_id);

CREATE TRIGGER trg_study_sessions_updated_at
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. MOCK_EXAMS & MOCK_EXAM_RESULTS (Preparado para Etapa 3 / Integridade)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  exam_board TEXT,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  score NUMERIC(8,2),
  maximum_score NUMERIC(8,2),
  include_in_statistics BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, user_id),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mock_exams_user_date ON public.mock_exams (user_id, exam_date DESC);

CREATE TRIGGER trg_mock_exams_updated_at
  BEFORE UPDATE ON public.mock_exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.mock_exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mock_exam_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
  incorrect_answers INTEGER NOT NULL DEFAULT 0 CHECK (incorrect_answers >= 0),
  blank_answers INTEGER NOT NULL DEFAULT 0 CHECK (blank_answers >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((correct_answers + incorrect_answers + blank_answers) > 0),
  UNIQUE (mock_exam_id, subject_id),
  FOREIGN KEY (mock_exam_id, user_id) REFERENCES public.mock_exams(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_mock_exam_results_updated_at
  BEFORE UPDATE ON public.mock_exam_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. QUESTION_SESSIONS (Controle de Questões)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID,
  subject_id UUID NOT NULL,
  topic_id UUID,
  study_session_id UUID,
  mock_exam_id UUID,
  exam_board TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
  incorrect_answers INTEGER NOT NULL CHECK (incorrect_answers >= 0),
  blank_answers INTEGER NOT NULL DEFAULT 0 CHECK (blank_answers >= 0),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  points_per_correct NUMERIC(6,2) NOT NULL DEFAULT 1,
  penalty_per_error NUMERIC(6,2) NOT NULL DEFAULT 0,
  points_per_blank NUMERIC(6,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((correct_answers + incorrect_answers + blank_answers) > 0),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (topic_id, user_id) REFERENCES public.topics(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (study_session_id, user_id) REFERENCES public.study_sessions(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (mock_exam_id, user_id) REFERENCES public.mock_exams(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_question_sessions_user_date ON public.question_sessions (user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_question_sessions_subject ON public.question_sessions (subject_id);
CREATE INDEX IF NOT EXISTS idx_question_sessions_goal ON public.question_sessions (goal_id);

CREATE TRIGGER trg_question_sessions_updated_at
  BEFORE UPDATE ON public.question_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. REVIEWS (Revisões Espaçadas e Manuais)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID,
  subject_id UUID NOT NULL,
  topic_id UUID,
  source_study_session_id UUID,
  completed_study_session_id UUID,
  interval_days INTEGER CHECK (interval_days IS NULL OR interval_days >= 0),
  scheduled_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  comprehension_level TEXT CHECK (
    comprehension_level IS NULL OR comprehension_level IN ('revisar_novamente', 'intermediaria', 'dominado')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (topic_id, user_id) REFERENCES public.topics(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (source_study_session_id, user_id) REFERENCES public.study_sessions(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (completed_study_session_id, user_id) REFERENCES public.study_sessions(id, user_id) ON DELETE SET NULL
);

-- Evita revisões duplicadas para a mesma sessão original e mesmo intervalo
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_no_duplicate_interval
  ON public.reviews (source_study_session_id, interval_days)
  WHERE source_study_session_id IS NOT NULL AND interval_days IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_user_scheduled ON public.reviews (user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_reviews_subject ON public.reviews (subject_id);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. TABELAS PREPARATÓRIAS PARA ETAPAS 2 e 3
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.syllabus_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID,
  subject_id UUID NOT NULL,
  topic_id UUID NOT NULL,
  theory_completed BOOLEAN NOT NULL DEFAULT FALSE,
  questions_completed BOOLEAN NOT NULL DEFAULT FALSE,
  review_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_in_progress BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (goal_id, topic_id),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id, user_id) REFERENCES public.topics(id, user_id) ON DELETE CASCADE
);

CREATE TRIGGER trg_syllabus_items_updated_at
  BEFORE UPDATE ON public.syllabus_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID,
  subject_id UUID NOT NULL,
  topic_id UUID,
  planned_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  planned_duration_seconds INTEGER NOT NULL DEFAULT 3600 CHECK (planned_duration_seconds > 0),
  question_target INTEGER NOT NULL DEFAULT 0 CHECK (question_target >= 0),
  activity_type TEXT NOT NULL DEFAULT 'estudo',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id, user_id) REFERENCES public.topics(id, user_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.study_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID,
  subject_id UUID,
  target_type TEXT NOT NULL CHECK (target_type IN ('horas', 'questoes', 'taxa_acertos', 'revisoes', 'dias_estudados', 'conteudos')),
  target_value NUMERIC(10,2) NOT NULL CHECK (target_value > 0),
  period_type TEXT NOT NULL CHECK (period_type IN ('diaria', 'semanal', 'mensal')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_study_targets_updated_at
  BEFORE UPDATE ON public.study_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.error_notebook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID,
  subject_id UUID NOT NULL,
  topic_id UUID,
  exam_board TEXT,
  question_text TEXT NOT NULL,
  selected_answer TEXT,
  correct_answer TEXT,
  error_explanation TEXT,
  error_type TEXT NOT NULL DEFAULT 'falta_conhecimento',
  question_url TEXT,
  attachment_path TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_revisao', 'revisado', 'dominado')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (topic_id, user_id) REFERENCES public.topics(id, user_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_error_notebook_updated_at
  BEFORE UPDATE ON public.error_notebook
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.active_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID,
  subject_id UUID NOT NULL,
  topic_id UUID,
  study_type TEXT NOT NULL DEFAULT 'teoria',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_resumed_at TIMESTAMPTZ,
  accumulated_seconds INTEGER NOT NULL DEFAULT 0 CHECK (accumulated_seconds >= 0),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'finished', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (goal_id, user_id) REFERENCES public.goals(id, user_id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id, user_id) REFERENCES public.subjects(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id, user_id) REFERENCES public.topics(id, user_id) ON DELETE SET NULL
);

-- Impede cronômetros simultâneos ativos do mesmo usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_timers_one_active_per_user
  ON public.active_timers (user_id)
  WHERE status IN ('running', 'paused');

CREATE TRIGGER trg_active_timers_updated_at
  BEFORE UPDATE ON public.active_timers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_record_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
