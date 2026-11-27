export type ThemePreference = 'light' | 'dark' | 'system';

export type GoalStatus =
  | 'em_preparacao'
  | 'edital_publicado'
  | 'inscricao_realizada'
  | 'prova_realizada'
  | 'aprovado'
  | 'arquivado';

export type DifficultyLevel = 'facil' | 'intermediario' | 'dificil';
export type PriorityLevel = 'baixa' | 'media' | 'alta';

export type StudyType =
  | 'teoria'
  | 'videoaula'
  | 'leitura_pdf'
  | 'lei_seca'
  | 'questoes'
  | 'revisao'
  | 'simulado'
  | 'outros';

export type ReviewStatus = 'pendente' | 'realizada' | 'atrasada';
export type ComprehensionLevel = 'revisar_novamente' | 'intermediaria' | 'dominado';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: ThemePreference;
  timezone: string;
  review_intervals: number[];
  pomodoro_study_minutes: number;
  pomodoro_break_minutes: number;
  pomodoro_long_break_minutes: number;
  notification_preferences: {
    reviews_today: boolean;
    overdue_reviews: boolean;
    goal_deadlines: boolean;
    exam_countdown: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  area: string;
  exam_name: string | null;
  organization: string | null;
  position: string | null;
  exam_board: string | null;
  education_level: string | null;
  exam_date: string | null;
  weekly_study_target: number;
  weekly_question_target: number;
  status: GoalStatus;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color: string;
  difficulty: DifficultyLevel;
  priority: PriorityLevel;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalSubject {
  id: string;
  user_id: string;
  goal_id: string;
  subject_id: string;
  exam_weight: number | null;
  priority: PriorityLevel;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  user_id: string;
  subject_id: string;
  parent_topic_id: string | null;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  goal_id: string | null;
  subject_id: string;
  topic_id: string | null;
  study_date: string;
  duration_seconds: number;
  study_type: StudyType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionSession {
  id: string;
  user_id: string;
  goal_id: string | null;
  subject_id: string;
  topic_id: string | null;
  study_session_id: string | null;
  mock_exam_id: string | null;
  exam_board: string | null;
  session_date: string;
  correct_answers: number;
  incorrect_answers: number;
  blank_answers: number;
  duration_seconds: number | null;
  points_per_correct: number;
  penalty_per_error: number;
  points_per_blank: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  goal_id: string | null;
  subject_id: string;
  topic_id: string | null;
  source_study_session_id: string | null;
  completed_study_session_id: string | null;
  interval_days: number | null;
  scheduled_date: string;
  completed_at: string | null;
  duration_seconds: number | null;
  comprehension_level: ComprehensionLevel | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockExam {
  id: string;
  user_id: string;
  goal_id: string | null;
  name: string;
  exam_board: string | null;
  exam_date: string;
  duration_seconds: number | null;
  score: number | null;
  maximum_score: number | null;
  include_in_statistics: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'all_time'
  | 'custom';

export interface DashboardFilters {
  period: PeriodPreset;
  startDate?: string;
  endDate?: string;
  goalId: string; // 'all' ou UUID
  subjectId: string; // 'all' ou UUID
}

export interface PerformanceTier {
  id: 'excellent' | 'very_good' | 'good' | 'needs_improvement' | 'priority_attention';
  label: string;
  shortLabel: string;
  textColorClass: string;
  bgClass: string;
  borderClass: string;
}

export const GOAL_AREAS = [
  'Administrativa',
  'Policial',
  'Fiscal',
  'Tribunais',
  'Controle',
  'Bancária',
  'Legislativa',
  'Militar',
  'Educação',
  'Saúde',
  'Jurídica',
  'Tecnologia da informação',
  'Previdenciária',
  'Outras',
] as const;

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  em_preparacao: 'Em preparação',
  edital_publicado: 'Edital publicado',
  inscricao_realizada: 'Inscrição realizada',
  prova_realizada: 'Prova realizada',
  aprovado: 'Aprovado',
  arquivado: 'Arquivado',
};

export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  teoria: 'Teoria',
  videoaula: 'Videoaula',
  leitura_pdf: 'Leitura de PDF',
  lei_seca: 'Lei seca',
  questoes: 'Resolução de questões',
  revisao: 'Revisão',
  simulado: 'Simulado',
  outros: 'Outros',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  facil: 'Fácil',
  intermediario: 'Intermediário',
  dificil: 'Difícil',
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const COMPREHENSION_LABELS: Record<ComprehensionLevel, string> = {
  revisar_novamente: 'Preciso revisar novamente',
  intermediaria: 'Compreensão intermediária',
  dominado: 'Conteúdo dominado',
};

export const SUBJECT_COLOR_PALETTE = [
  '#D4A853',
  '#2563EB',
  '#16A34A',
  '#DC2626',
  '#9333EA',
  '#0891B2',
  '#EA580C',
  '#4F46E5',
  '#0D9488',
  '#BE185D',
] as const;
