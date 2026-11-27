-- ============================================================================
-- CÓDIGO DA POSSE — Migration 003: Funções Transacionais e Views Analíticas
-- ============================================================================

-- Define um objetivo como principal de forma atômica (desmarca o anterior)
CREATE OR REPLACE FUNCTION public.set_primary_goal(p_goal_id UUID)
RETURNS public.goals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_goal public.goals;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE public.goals
  SET is_primary = FALSE
  WHERE user_id = v_user_id AND is_primary = TRUE AND id <> p_goal_id;

  UPDATE public.goals
  SET is_primary = TRUE
  WHERE id = p_goal_id AND user_id = v_user_id
  RETURNING * INTO v_goal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Objetivo não encontrado';
  END IF;

  RETURN v_goal;
END;
$$;

-- View consolidada de questões (respeita soma dos acertos / soma dos totais)
CREATE OR REPLACE VIEW public.v_question_sessions_metrics
WITH (security_invoker = TRUE) AS
SELECT
  qs.*,
  (qs.correct_answers + qs.incorrect_answers + qs.blank_answers) AS total_questions,
  (qs.correct_answers + qs.incorrect_answers) AS answered_questions,
  ROUND((qs.correct_answers::NUMERIC / NULLIF(qs.correct_answers + qs.incorrect_answers + qs.blank_answers, 0)) * 100, 2) AS accuracy_rate,
  ROUND((qs.correct_answers::NUMERIC / NULLIF(qs.correct_answers + qs.incorrect_answers, 0)) * 100, 2) AS answered_accuracy_rate,
  (
    (qs.correct_answers * qs.points_per_correct)
    - (qs.incorrect_answers * qs.penalty_per_error)
    + (qs.blank_answers * qs.points_per_blank)
  ) AS net_score
FROM public.question_sessions qs;
