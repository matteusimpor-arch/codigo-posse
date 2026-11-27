import type {
  DashboardFilters,
  Goal,
  MockExam,
  PerformanceTier,
  QuestionSession,
  Review,
  ReviewStatus,
  StudySession,
  Subject,
} from '../types/database';
import { addDaysISO, diffDaysISO, isDateInRange, resolveDateRange } from './date';

export interface QuestionMetrics {
  correct: number;
  incorrect: number;
  blank: number;
  total: number;
  answered: number;
  accuracyRate: number | null; // sobre o total de questões
  errorRate: number | null;
  blankRate: number | null;
  answeredAccuracyRate: number | null; // sobre as efetivamente respondidas
  netScore: number;
}

/**
 * Calcula métricas individuais ou consolidadas de questões.
 * Regra crítica: sempre consolida somando os totais antes de dividir (nunca média simples de percentuais).
 */
export function calculateQuestionMetrics(input: {
  correct: number;
  incorrect: number;
  blank?: number;
  pointsPerCorrect?: number;
  penaltyPerError?: number;
  pointsPerBlank?: number;
}): QuestionMetrics {
  const correct = Math.max(0, Math.trunc(input.correct));
  const incorrect = Math.max(0, Math.trunc(input.incorrect));
  const blank = Math.max(0, Math.trunc(input.blank ?? 0));
  const total = correct + incorrect + blank;
  const answered = correct + incorrect;

  const pointsPerCorrect = input.pointsPerCorrect ?? 1;
  const penaltyPerError = input.penaltyPerError ?? 0;
  const pointsPerBlank = input.pointsPerBlank ?? 0;

  return {
    correct,
    incorrect,
    blank,
    total,
    answered,
    accuracyRate: total > 0 ? Number(((correct / total) * 100).toFixed(2)) : null,
    errorRate: total > 0 ? Number(((incorrect / total) * 100).toFixed(2)) : null,
    blankRate: total > 0 ? Number(((blank / total) * 100).toFixed(2)) : null,
    answeredAccuracyRate: answered > 0 ? Number(((correct / answered) * 100).toFixed(2)) : null,
    netScore: Number((correct * pointsPerCorrect - incorrect * penaltyPerError + blank * pointsPerBlank).toFixed(2)),
  };
}

/**
 * Consolida uma lista de registros de questões somando os totais reais.
 * Respeita a flag include_in_statistics de simulados quando vinculados.
 */
export function consolidateQuestionSessions(
  sessions: QuestionSession[],
  mockExams: MockExam[] = []
): QuestionMetrics {
  const excludedMockExamIds = new Set(
    mockExams.filter((m) => !m.include_in_statistics).map((m) => m.id)
  );

  let correct = 0;
  let incorrect = 0;
  let blank = 0;
  let netScore = 0;

  for (const s of sessions) {
    if (s.mock_exam_id && excludedMockExamIds.has(s.mock_exam_id)) {
      continue;
    }
    correct += s.correct_answers;
    incorrect += s.incorrect_answers;
    blank += s.blank_answers;
    netScore +=
      s.correct_answers * s.points_per_correct -
      s.incorrect_answers * s.penalty_per_error +
      s.blank_answers * s.points_per_blank;
  }

  const total = correct + incorrect + blank;
  const answered = correct + incorrect;

  return {
    correct,
    incorrect,
    blank,
    total,
    answered,
    accuracyRate: total > 0 ? Number(((correct / total) * 100).toFixed(2)) : null,
    errorRate: total > 0 ? Number(((incorrect / total) * 100).toFixed(2)) : null,
    blankRate: total > 0 ? Number(((blank / total) * 100).toFixed(2)) : null,
    answeredAccuracyRate: answered > 0 ? Number(((correct / answered) * 100).toFixed(2)) : null,
    netScore: Number(netScore.toFixed(2)),
  };
}

/**
 * Classificação de desempenho conforme §10:
 * 90-100%: excelente; 80-<90%: muito bom; 70-<80%: bom; 60-<70%: precisa melhorar; <60%: atenção prioritária.
 */
export function getPerformanceTier(rate: number | null): PerformanceTier | null {
  if (rate === null || Number.isNaN(rate)) return null;
  if (rate >= 90) {
    return {
      id: 'excellent',
      label: 'Excelente',
      shortLabel: 'Excelente',
      textColorClass: 'text-emerald-700 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
      borderClass: 'border-emerald-200 dark:border-emerald-800/60',
    };
  }
  if (rate >= 80) {
    return {
      id: 'very_good',
      label: 'Muito bom',
      shortLabel: 'Muito bom',
      textColorClass: 'text-green-700 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-950/50',
      borderClass: 'border-green-200 dark:border-green-800/60',
    };
  }
  if (rate >= 70) {
    return {
      id: 'good',
      label: 'Bom',
      shortLabel: 'Bom',
      textColorClass: 'text-sky-700 dark:text-sky-400',
      bgClass: 'bg-sky-50 dark:bg-sky-950/50',
      borderClass: 'border-sky-200 dark:border-sky-800/60',
    };
  }
  if (rate >= 60) {
    return {
      id: 'needs_improvement',
      label: 'Precisa melhorar',
      shortLabel: 'Atenção',
      textColorClass: 'text-amber-700 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/50',
      borderClass: 'border-amber-200 dark:border-amber-800/60',
    };
  }
  return {
    id: 'priority_attention',
    label: 'Atenção prioritária',
    shortLabel: 'Prioritário',
    textColorClass: 'text-red-700 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950/50',
    borderClass: 'border-red-200 dark:border-red-800/60',
  };
}

/**
 * Resolve o status de uma revisão com base na data programada e conclusão.
 */
export function resolveReviewStatus(review: Review, todayISO: string): ReviewStatus {
  if (review.completed_at) return 'realizada';
  if (review.scheduled_date.slice(0, 10) < todayISO) return 'atrasada';
  return 'pendente';
}

/**
 * Calcula tempo total de estudo em segundos sem duplicar tempo de revisões vinculadas a study_sessions.
 */
export function calculateTotalStudySeconds(
  studySessions: StudySession[],
  reviews: Review[] = []
): number {
  const fromSessions = studySessions.reduce((acc, s) => acc + Math.max(0, s.duration_seconds), 0);
  // Se uma revisão foi concluída com uma study_session vinculada (completed_study_session_id),
  // o tempo já está em study_sessions e NÃO deve ser somado novamente (Cenário 4).
  const fromStandaloneReviews = reviews.reduce((acc, r) => {
    if (r.completed_at && !r.completed_study_session_id && r.duration_seconds && r.duration_seconds > 0) {
      return acc + r.duration_seconds;
    }
    return acc;
  }, 0);
  return fromSessions + fromStandaloneReviews;
}

/**
 * Conta dias distintos estudados (Cenário 3: duas sessões no mesmo dia = 1 dia estudado).
 */
export function countDistinctStudyDays(studySessions: StudySession[]): number {
  const dates = new Set(studySessions.map((s) => s.study_date.slice(0, 10)));
  return dates.size;
}

/**
 * Calcula dias consecutivos de estudo até hoje (ou ontem, se ainda não estudou hoje).
 */
export function calculateCurrentStreak(studySessions: StudySession[], todayISO: string): number {
  const dates = new Set(studySessions.map((s) => s.study_date.slice(0, 10)));
  if (dates.size === 0) return 0;

  let cursor = dates.has(todayISO) ? todayISO : addDaysISO(todayISO, -1);
  if (!dates.has(cursor)) return 0;

  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export interface DashboardSummary {
  totalStudySeconds: number;
  studyDaysCount: number;
  currentStreakDays: number;
  questionMetrics: QuestionMetrics;
  reviewsCompletedInPeriod: number;
  reviewsPendingNow: number;
  reviewsOverdueNow: number;
  reviewsTodayNow: number;
  weeklyHoursProgressPct: number | null;
  weeklyQuestionsProgressPct: number | null;
  weeklyHoursDone: number;
  weeklyQuestionsDone: number;
}

export interface DailyChartPoint {
  date: string;
  label: string;
  studyHours: number;
  studyMinutes: number;
  questionsTotal: number;
  questionsCorrect: number;
  accuracyRate: number | null;
}

export interface SubjectBreakdownItem {
  subjectId: string;
  subjectName: string;
  color: string;
  studySeconds: number;
  studyHours: number;
  questionsTotal: number;
  correct: number;
  incorrect: number;
  blank: number;
  accuracyRate: number | null;
  reviewsCompleted: number;
  lastStudyDate: string | null;
}

export function filterRecordsForDashboard(
  studySessions: StudySession[],
  questionSessions: QuestionSession[],
  reviews: Review[],
  filters: DashboardFilters,
  todayISO: string
) {
  const { startDate, endDate } = resolveDateRange(
    filters.period,
    todayISO,
    filters.startDate,
    filters.endDate
  );

  const filteredStudies = studySessions.filter((s) => {
    if (filters.goalId !== 'all' && s.goal_id !== filters.goalId) return false;
    if (filters.subjectId !== 'all' && s.subject_id !== filters.subjectId) return false;
    return isDateInRange(s.study_date, startDate, endDate);
  });

  const filteredQuestions = questionSessions.filter((q) => {
    if (filters.goalId !== 'all' && q.goal_id !== filters.goalId) return false;
    if (filters.subjectId !== 'all' && q.subject_id !== filters.subjectId) return false;
    return isDateInRange(q.session_date, startDate, endDate);
  });

  const filteredCompletedReviews = reviews.filter((r) => {
    if (!r.completed_at) return false;
    if (filters.goalId !== 'all' && r.goal_id !== filters.goalId) return false;
    if (filters.subjectId !== 'all' && r.subject_id !== filters.subjectId) return false;
    return isDateInRange(r.completed_at.slice(0, 10), startDate, endDate);
  });

  // Situação atual das revisões (independente do período histórico, mas respeita filtro de objetivo/disciplina)
  const currentScopedReviews = reviews.filter((r) => {
    if (filters.goalId !== 'all' && r.goal_id !== filters.goalId) return false;
    if (filters.subjectId !== 'all' && r.subject_id !== filters.subjectId) return false;
    return true;
  });

  return {
    startDate,
    endDate,
    filteredStudies,
    filteredQuestions,
    filteredCompletedReviews,
    currentScopedReviews,
  };
}

export function computeDashboardSummary(
  studySessions: StudySession[],
  questionSessions: QuestionSession[],
  reviews: Review[],
  mockExams: MockExam[],
  activeGoal: Goal | null,
  filters: DashboardFilters,
  todayISO: string
): DashboardSummary {
  const {
    filteredStudies,
    filteredQuestions,
    filteredCompletedReviews,
    currentScopedReviews,
  } = filterRecordsForDashboard(studySessions, questionSessions, reviews, filters, todayISO);

  const totalStudySeconds = calculateTotalStudySeconds(filteredStudies, filteredCompletedReviews);
  const studyDaysCount = countDistinctStudyDays(filteredStudies);

  // Sequência de dias consecutivos considera todo o histórico do objetivo selecionado (se houver)
  const streakScopedStudies = studySessions.filter((s) =>
    filters.goalId === 'all' ? true : s.goal_id === filters.goalId
  );
  const currentStreakDays = calculateCurrentStreak(streakScopedStudies, todayISO);

  const questionMetrics = consolidateQuestionSessions(filteredQuestions, mockExams);

  let reviewsPendingNow = 0;
  let reviewsOverdueNow = 0;
  let reviewsTodayNow = 0;
  for (const r of currentScopedReviews) {
    const status = resolveReviewStatus(r, todayISO);
    if (status === 'atrasada') reviewsOverdueNow += 1;
    else if (status === 'pendente') {
      reviewsPendingNow += 1;
      if (r.scheduled_date.slice(0, 10) === todayISO) {
        reviewsTodayNow += 1;
      }
    }
  }

  // Metas semanais da semana atual (segunda a hoje)
  const weekRange = resolveDateRange('this_week', todayISO);
  const weekStudies = studySessions.filter((s) => {
    if (activeGoal && s.goal_id && s.goal_id !== activeGoal.id) return false;
    return isDateInRange(s.study_date, weekRange.startDate, weekRange.endDate);
  });
  const weekQuestions = questionSessions.filter((q) => {
    if (activeGoal && q.goal_id && q.goal_id !== activeGoal.id) return false;
    return isDateInRange(q.session_date, weekRange.startDate, weekRange.endDate);
  });

  const weeklyHoursDone = Number((calculateTotalStudySeconds(weekStudies) / 3600).toFixed(2));
  const weeklyQuestionsDone = consolidateQuestionSessions(weekQuestions, mockExams).total;

  const weeklyHoursTarget = activeGoal?.weekly_study_target ?? 0;
  const weeklyQuestionsTarget = activeGoal?.weekly_question_target ?? 0;

  return {
    totalStudySeconds,
    studyDaysCount,
    currentStreakDays,
    questionMetrics,
    reviewsCompletedInPeriod: filteredCompletedReviews.length,
    reviewsPendingNow,
    reviewsOverdueNow,
    reviewsTodayNow,
    weeklyHoursProgressPct:
      weeklyHoursTarget > 0 ? Math.round((weeklyHoursDone / weeklyHoursTarget) * 100) : null,
    weeklyQuestionsProgressPct:
      weeklyQuestionsTarget > 0 ? Math.round((weeklyQuestionsDone / weeklyQuestionsTarget) * 100) : null,
    weeklyHoursDone,
    weeklyQuestionsDone,
  };
}

export function computeDailySeries(
  filteredStudies: StudySession[],
  filteredQuestions: QuestionSession[],
  mockExams: MockExam[] = []
): DailyChartPoint[] {
  const excludedMockIds = new Set(
    mockExams.filter((m) => !m.include_in_statistics).map((m) => m.id)
  );
  const map = new Map<
    string,
    { studySeconds: number; correct: number; total: number }
  >();

  for (const s of filteredStudies) {
    const key = s.study_date.slice(0, 10);
    const curr = map.get(key) ?? { studySeconds: 0, correct: 0, total: 0 };
    curr.studySeconds += s.duration_seconds;
    map.set(key, curr);
  }

  for (const q of filteredQuestions) {
    if (q.mock_exam_id && excludedMockIds.has(q.mock_exam_id)) continue;
    const key = q.session_date.slice(0, 10);
    const curr = map.get(key) ?? { studySeconds: 0, correct: 0, total: 0 };
    curr.correct += q.correct_answers;
    curr.total += q.correct_answers + q.incorrect_answers + q.blank_answers;
    map.set(key, curr);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      date,
      label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
      studyHours: Number((val.studySeconds / 3600).toFixed(2)),
      studyMinutes: Math.round(val.studySeconds / 60),
      questionsTotal: val.total,
      questionsCorrect: val.correct,
      accuracyRate: val.total > 0 ? Number(((val.correct / val.total) * 100).toFixed(1)) : null,
    }));
}

export function computeSubjectBreakdown(
  subjects: Subject[],
  filteredStudies: StudySession[],
  filteredQuestions: QuestionSession[],
  filteredCompletedReviews: Review[],
  mockExams: MockExam[] = []
): SubjectBreakdownItem[] {
  const excludedMockIds = new Set(
    mockExams.filter((m) => !m.include_in_statistics).map((m) => m.id)
  );

  const subjectMap = new Map<string, SubjectBreakdownItem>();
  for (const subj of subjects) {
    subjectMap.set(subj.id, {
      subjectId: subj.id,
      subjectName: subj.name,
      color: subj.color,
      studySeconds: 0,
      studyHours: 0,
      questionsTotal: 0,
      correct: 0,
      incorrect: 0,
      blank: 0,
      accuracyRate: null,
      reviewsCompleted: 0,
      lastStudyDate: null,
    });
  }

  for (const s of filteredStudies) {
    const entry = subjectMap.get(s.subject_id);
    if (!entry) continue;
    entry.studySeconds += s.duration_seconds;
    const d = s.study_date.slice(0, 10);
    if (!entry.lastStudyDate || d > entry.lastStudyDate) {
      entry.lastStudyDate = d;
    }
  }

  for (const q of filteredQuestions) {
    if (q.mock_exam_id && excludedMockIds.has(q.mock_exam_id)) continue;
    const entry = subjectMap.get(q.subject_id);
    if (!entry) continue;
    entry.correct += q.correct_answers;
    entry.incorrect += q.incorrect_answers;
    entry.blank += q.blank_answers;
    entry.questionsTotal += q.correct_answers + q.incorrect_answers + q.blank_answers;
  }

  for (const r of filteredCompletedReviews) {
    const entry = subjectMap.get(r.subject_id);
    if (!entry) continue;
    entry.reviewsCompleted += 1;
    if (!r.completed_study_session_id && r.duration_seconds) {
      entry.studySeconds += r.duration_seconds;
    }
  }

  return Array.from(subjectMap.values())
    .filter((item) => item.studySeconds > 0 || item.questionsTotal > 0 || item.reviewsCompleted > 0)
    .map((item) => ({
      ...item,
      studyHours: Number((item.studySeconds / 3600).toFixed(2)),
      accuracyRate:
        item.questionsTotal > 0
          ? Number(((item.correct / item.questionsTotal) * 100).toFixed(1))
          : null,
    }))
    .sort((a, b) => b.studySeconds - a.studySeconds || b.questionsTotal - a.questionsTotal);
}

export interface AttentionAlert {
  subjectId: string;
  subjectName: string;
  color: string;
  reason: string;
  accuracyRate: number | null;
  daysWithoutStudy: number | null;
}

export function computeAttentionSubjects(
  subjects: Subject[],
  studySessions: StudySession[],
  questionSessions: QuestionSession[],
  todayISO: string
): AttentionAlert[] {
  const activeSubjects = subjects.filter((s) => !s.archived_at);
  const alerts: AttentionAlert[] = [];

  for (const subj of activeSubjects) {
    const subjQuestions = questionSessions.filter((q) => q.subject_id === subj.id);
    const qMetrics = consolidateQuestionSessions(subjQuestions);

    const subjStudies = studySessions.filter((s) => s.subject_id === subj.id);
    const lastDate = subjStudies.reduce<string | null>((latest, s) => {
      const d = s.study_date.slice(0, 10);
      return !latest || d > latest ? d : latest;
    }, null);

    const daysWithoutStudy = lastDate ? diffDaysISO(todayISO, lastDate) : null;

    if (qMetrics.accuracyRate !== null && qMetrics.total >= 10 && qMetrics.accuracyRate < 65) {
      alerts.push({
        subjectId: subj.id,
        subjectName: subj.name,
        color: subj.color,
        reason: `Aproveitamento de ${qMetrics.accuracyRate.toFixed(0)}% em ${qMetrics.total} questões`,
        accuracyRate: qMetrics.accuracyRate,
        daysWithoutStudy,
      });
    } else if (daysWithoutStudy !== null && daysWithoutStudy >= 7) {
      alerts.push({
        subjectId: subj.id,
        subjectName: subj.name,
        color: subj.color,
        reason: `${daysWithoutStudy} dias sem registro de estudo`,
        accuracyRate: qMetrics.accuracyRate,
        daysWithoutStudy,
      });
    }
  }

  return alerts.slice(0, 5);
}
