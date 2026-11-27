import type {
  Goal,
  GoalSubject,
  Profile,
  QuestionSession,
  Review,
  StudySession,
  Subject,
  Topic,
  UserSettings,
} from '../types/database';
import { addDaysISO, getTodayISO } from '../utils/date';

export interface DemoDatabaseState {
  profile: Profile;
  settings: UserSettings;
  goals: Goal[];
  subjects: Subject[];
  goalSubjects: GoalSubject[];
  topics: Topic[];
  studySessions: StudySession[];
  questionSessions: QuestionSession[];
  reviews: Review[];
}

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export function createInitialDemoState(withSampleData = true): DemoDatabaseState {
  const today = getTodayISO();
  const now = new Date().toISOString();

  const profile: Profile = {
    id: DEMO_USER_ID,
    full_name: 'Estudante Demonstração',
    avatar_url: null,
    onboarding_completed: true,
    created_at: now,
    updated_at: now,
  };

  const settings: UserSettings = {
    id: 'demo-settings-1',
    user_id: DEMO_USER_ID,
    theme: 'system',
    timezone: 'America/Sao_Paulo',
    review_intervals: [1, 7, 15, 30],
    pomodoro_study_minutes: 25,
    pomodoro_break_minutes: 5,
    pomodoro_long_break_minutes: 15,
    notification_preferences: {
      reviews_today: true,
      overdue_reviews: true,
      goal_deadlines: true,
      exam_countdown: true,
    },
    created_at: now,
    updated_at: now,
  };

  if (!withSampleData) {
    return {
      profile: { ...profile, onboarding_completed: false },
      settings,
      goals: [],
      subjects: [],
      goalSubjects: [],
      topics: [],
      studySessions: [],
      questionSessions: [],
      reviews: [],
    };
  }

  const goalId = 'demo-goal-1';
  const subjConst = 'demo-subj-const';
  const subjPort = 'demo-subj-port';
  const subjRLM = 'demo-subj-rlm';
  const subjAdm = 'demo-subj-adm';

  const topicConst1 = 'demo-topic-const-1';
  const topicConst2 = 'demo-topic-const-2';
  const topicPort1 = 'demo-topic-port-1';
  const topicRLM1 = 'demo-topic-rlm-1';
  const topicAdm1 = 'demo-topic-adm-1';

  const goals: Goal[] = [
    {
      id: goalId,
      user_id: DEMO_USER_ID,
      name: 'TJ-SP — Escrevente Técnico Judiciário',
      area: 'Tribunais',
      exam_name: 'Concurso TJ-SP 2027',
      organization: 'Tribunal de Justiça de São Paulo',
      position: 'Escrevente Técnico Judiciário',
      exam_board: 'Vunesp',
      education_level: 'Ensino Médio',
      exam_date: addDaysISO(today, 94),
      weekly_study_target: 24,
      weekly_question_target: 250,
      status: 'em_preparacao',
      is_primary: true,
      notes: 'Foco em legislação seca e bateria diária de questões Vunesp.',
      created_at: now,
      updated_at: now,
    },
  ];

  const subjects: Subject[] = [
    {
      id: subjConst,
      user_id: DEMO_USER_ID,
      name: 'Direito Constitucional',
      color: '#D4A853',
      difficulty: 'intermediario',
      priority: 'alta',
      notes: 'Artigos 5º ao 17 e organização dos poderes.',
      archived_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: subjPort,
      user_id: DEMO_USER_ID,
      name: 'Língua Portuguesa',
      color: '#2563EB',
      difficulty: 'intermediario',
      priority: 'alta',
      notes: 'Interpretação de texto, crase, regência e concordância.',
      archived_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: subjRLM,
      user_id: DEMO_USER_ID,
      name: 'Raciocínio Lógico',
      color: '#EA580C',
      difficulty: 'dificil',
      priority: 'media',
      notes: 'Proposições lógicas, equivalências e tabelas-verdade.',
      archived_at: now ? null : null,
      created_at: now,
      updated_at: now,
    },
    {
      id: subjAdm,
      user_id: DEMO_USER_ID,
      name: 'Direito Administrativo',
      color: '#16A34A',
      difficulty: 'facil',
      priority: 'media',
      notes: 'Atos administrativos, poderes e improbidade.',
      archived_at: null,
      created_at: now,
      updated_at: now,
    },
  ];

  const goalSubjects: GoalSubject[] = subjects.map((s) => ({
    id: `demo-gs-${s.id}`,
    user_id: DEMO_USER_ID,
    goal_id: goalId,
    subject_id: s.id,
    exam_weight: s.id === subjPort ? 2 : 1,
    priority: s.priority,
    created_at: now,
    updated_at: now,
  }));

  const topics: Topic[] = [
    {
      id: topicConst1,
      user_id: DEMO_USER_ID,
      subject_id: subjConst,
      parent_topic_id: null,
      name: 'Direitos e Garantias Fundamentais',
      description: 'Art. 5º da CF/88',
      display_order: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: topicConst2,
      user_id: DEMO_USER_ID,
      subject_id: subjConst,
      parent_topic_id: topicConst1,
      name: 'Remédios Constitucionais',
      description: 'HC, MS, MI, HD e Ação Popular',
      display_order: 2,
      created_at: now,
      updated_at: now,
    },
    {
      id: topicPort1,
      user_id: DEMO_USER_ID,
      subject_id: subjPort,
      parent_topic_id: null,
      name: 'Concordância Verbal e Nominal',
      description: 'Regras gerais e casos especiais',
      display_order: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: topicRLM1,
      user_id: DEMO_USER_ID,
      subject_id: subjRLM,
      parent_topic_id: null,
      name: 'Equivalências Lógicas',
      description: 'Leis de De Morgan e condicional',
      display_order: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: topicAdm1,
      user_id: DEMO_USER_ID,
      subject_id: subjAdm,
      parent_topic_id: null,
      name: 'Atos Administrativos',
      description: 'Requisitos, atributos e extinção',
      display_order: 1,
      created_at: now,
      updated_at: now,
    },
  ];

  const studySessions: StudySession[] = [
    {
      id: 'demo-st-1',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjConst,
      topic_id: topicConst1,
      study_date: addDaysISO(today, -3),
      duration_seconds: 5400, // 1h30
      study_type: 'lei_seca',
      notes: 'Leitura comentada dos incisos I a XL do Art. 5º.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-st-2',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjPort,
      topic_id: topicPort1,
      study_date: addDaysISO(today, -2),
      duration_seconds: 3600, // 1h
      study_type: 'teoria',
      notes: 'Resumo esquematizado de concordância.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-st-3',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjRLM,
      topic_id: topicRLM1,
      study_date: addDaysISO(today, -1),
      duration_seconds: 4500, // 1h15
      study_type: 'questoes',
      notes: 'Treino focado em negação da condicional.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-st-4',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjAdm,
      topic_id: topicAdm1,
      study_date: today,
      duration_seconds: 5400, // 1h30
      study_type: 'leitura_pdf',
      notes: 'Atributos dos atos administrativos.',
      created_at: now,
      updated_at: now,
    },
  ];

  const questionSessions: QuestionSession[] = [
    {
      id: 'demo-q-1',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjConst,
      topic_id: topicConst1,
      study_session_id: 'demo-st-1',
      mock_exam_id: null,
      exam_board: 'Vunesp',
      session_date: addDaysISO(today, -3),
      correct_answers: 42,
      incorrect_answers: 8,
      blank_answers: 0,
      duration_seconds: null,
      points_per_correct: 1,
      penalty_per_error: 0,
      points_per_blank: 0,
      notes: 'Bom domínio dos direitos individuais.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-q-2',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjPort,
      topic_id: topicPort1,
      study_session_id: 'demo-st-2',
      mock_exam_id: null,
      exam_board: 'Vunesp',
      session_date: addDaysISO(today, -2),
      correct_answers: 31,
      incorrect_answers: 9,
      blank_answers: 0,
      duration_seconds: null,
      points_per_correct: 1,
      penalty_per_error: 0,
      points_per_blank: 0,
      notes: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-q-3',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjRLM,
      topic_id: topicRLM1,
      study_session_id: 'demo-st-3',
      mock_exam_id: null,
      exam_board: 'Vunesp',
      session_date: addDaysISO(today, -1),
      correct_answers: 14,
      incorrect_answers: 11,
      blank_answers: 0,
      duration_seconds: null,
      points_per_correct: 1,
      penalty_per_error: 0,
      points_per_blank: 0,
      notes: 'Revisar contrapositiva vs negação.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-q-4',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjAdm,
      topic_id: topicAdm1,
      study_session_id: 'demo-st-4',
      mock_exam_id: null,
      exam_board: 'Vunesp',
      session_date: today,
      correct_answers: 27,
      incorrect_answers: 3,
      blank_answers: 0,
      duration_seconds: null,
      points_per_correct: 1,
      penalty_per_error: 0,
      points_per_blank: 0,
      notes: null,
      created_at: now,
      updated_at: now,
    },
  ];

  const reviews: Review[] = [
    {
      id: 'demo-rev-1',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjConst,
      topic_id: topicConst1,
      source_study_session_id: 'demo-st-1',
      completed_study_session_id: null,
      interval_days: 1,
      scheduled_date: addDaysISO(today, -2),
      completed_at: addDaysISO(today, -2) + 'T14:00:00Z',
      duration_seconds: 1200,
      comprehension_level: 'dominado',
      notes: 'Revisão rápida de 20min concluída.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-rev-2',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjRLM,
      topic_id: topicRLM1,
      source_study_session_id: 'demo-st-3',
      completed_study_session_id: null,
      interval_days: 1,
      scheduled_date: today,
      completed_at: null,
      duration_seconds: null,
      comprehension_level: null,
      notes: 'Refazer tabela de equivalências.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-rev-3',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjPort,
      topic_id: topicPort1,
      source_study_session_id: 'demo-st-2',
      completed_study_session_id: null,
      interval_days: 1,
      scheduled_date: addDaysISO(today, -1),
      completed_at: null,
      duration_seconds: null,
      comprehension_level: null,
      notes: 'Revisão atrasada de concordância.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-rev-4',
      user_id: DEMO_USER_ID,
      goal_id: goalId,
      subject_id: subjConst,
      topic_id: topicConst1,
      source_study_session_id: 'demo-st-1',
      completed_study_session_id: null,
      interval_days: 7,
      scheduled_date: addDaysISO(today, 4),
      completed_at: null,
      duration_seconds: null,
      comprehension_level: null,
      notes: null,
      created_at: now,
      updated_at: now,
    },
  ];

  return {
    profile,
    settings,
    goals,
    subjects,
    goalSubjects,
    topics,
    studySessions,
    questionSessions,
    reviews,
  };
}
