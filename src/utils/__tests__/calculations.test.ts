import { describe, expect, it } from 'vitest';
import {
  calculateCurrentStreak,
  calculateQuestionMetrics,
  calculateTotalStudySeconds,
  consolidateQuestionSessions,
  countDistinctStudyDays,
  getPerformanceTier,
  resolveReviewStatus,
} from '../calculations';
import type { MockExam, QuestionSession, Review, StudySession } from '../../types/database';

const baseQuestion = (overrides: Partial<QuestionSession>): QuestionSession => ({
  id: 'q1',
  user_id: 'u1',
  goal_id: null,
  subject_id: 's1',
  topic_id: null,
  study_session_id: null,
  mock_exam_id: null,
  exam_board: null,
  session_date: '2026-11-20',
  correct_answers: 0,
  incorrect_answers: 0,
  blank_answers: 0,
  duration_seconds: null,
  points_per_correct: 1,
  penalty_per_error: 0,
  points_per_blank: 0,
  notes: null,
  created_at: '2026-11-20T10:00:00Z',
  updated_at: '2026-11-20T10:00:00Z',
  ...overrides,
});

const baseStudy = (overrides: Partial<StudySession>): StudySession => ({
  id: 'st1',
  user_id: 'u1',
  goal_id: null,
  subject_id: 's1',
  topic_id: null,
  study_date: '2026-11-20',
  duration_seconds: 3600,
  study_type: 'teoria',
  notes: null,
  created_at: '2026-11-20T10:00:00Z',
  updated_at: '2026-11-20T10:00:00Z',
  ...overrides,
});

describe('Cenários Matemáticos Obrigatórios — Código da Posse', () => {
  it('Cenário 1: 80 acertos e 20 erros = 100 total, 80% acertos, 20% erros', () => {
    const res = calculateQuestionMetrics({ correct: 80, incorrect: 20 });
    expect(res.total).toBe(100);
    expect(res.accuracyRate).toBe(80);
    expect(res.errorRate).toBe(20);
    expect(res.answeredAccuracyRate).toBe(80);
    expect(getPerformanceTier(res.accuracyRate)?.label).toBe('Muito bom');
  });

  it('Cenário 2: Consolidação (9/10 + 45/90 = 54/100 = 54%, nunca média simples de 90% e 50%)', () => {
    const sessions: QuestionSession[] = [
      baseQuestion({ id: 'q1', correct_answers: 9, incorrect_answers: 1 }),
      baseQuestion({ id: 'q2', correct_answers: 45, incorrect_answers: 45 }),
    ];
    const consolidated = consolidateQuestionSessions(sessions);
    expect(consolidated.total).toBe(100);
    expect(consolidated.correct).toBe(54);
    expect(consolidated.incorrect).toBe(46);
    expect(consolidated.accuracyRate).toBe(54);
    expect(getPerformanceTier(consolidated.accuracyRate)?.label).toBe('Atenção prioritária');
  });

  it('Cenário 3: Duas sessões de 2h no mesmo dia = 4 horas estudadas e 1 dia estudado', () => {
    const studies: StudySession[] = [
      baseStudy({ id: 'st1', study_date: '2026-11-25', duration_seconds: 7200 }),
      baseStudy({ id: 'st2', study_date: '2026-11-25', duration_seconds: 7200 }),
    ];
    expect(calculateTotalStudySeconds(studies)).toBe(14400); // 4h
    expect(countDistinctStudyDays(studies)).toBe(1);
  });

  it('Cenário 4: Revisão vinculada a sessão de estudo de 30 minutos contabiliza apenas 30 min', () => {
    const study = baseStudy({ id: 'st-rev', duration_seconds: 1800, study_type: 'revisao' });
    const review: Review = {
      id: 'rev1',
      user_id: 'u1',
      goal_id: null,
      subject_id: 's1',
      topic_id: null,
      source_study_session_id: 'st-orig',
      completed_study_session_id: 'st-rev',
      interval_days: 7,
      scheduled_date: '2026-11-26',
      completed_at: '2026-11-26T12:00:00Z',
      duration_seconds: 1800,
      comprehension_level: 'dominado',
      notes: null,
      created_at: '2026-11-19T10:00:00Z',
      updated_at: '2026-11-26T12:00:00Z',
    };

    expect(calculateTotalStudySeconds([study], [review])).toBe(1800);
    expect(resolveReviewStatus(review, '2026-11-26')).toBe('realizada');
  });

  it('Cenário 5: Questões de simulado respeitam flag include_in_statistics sem duplicar', () => {
    const mockExams: MockExam[] = [
      {
        id: 'm1',
        user_id: 'u1',
        goal_id: null,
        name: 'Simulado 1',
        exam_board: 'Cebraspe',
        exam_date: '2026-11-20',
        duration_seconds: 14400,
        score: 70,
        maximum_score: 120,
        include_in_statistics: true,
        notes: null,
        created_at: '2026-11-20T10:00:00Z',
        updated_at: '2026-11-20T10:00:00Z',
      },
      {
        id: 'm2',
        user_id: 'u1',
        goal_id: null,
        name: 'Simulado 2 (Excluído)',
        exam_board: 'FGV',
        exam_date: '2026-11-21',
        duration_seconds: 14400,
        score: 40,
        maximum_score: 80,
        include_in_statistics: false,
        notes: null,
        created_at: '2026-11-21T10:00:00Z',
        updated_at: '2026-11-21T10:00:00Z',
      },
    ];

    const sessions: QuestionSession[] = [
      baseQuestion({ id: 'q1', mock_exam_id: 'm1', correct_answers: 16, incorrect_answers: 4 }),
      baseQuestion({ id: 'q2', mock_exam_id: 'm2', correct_answers: 10, incorrect_answers: 10 }),
    ];

    const consolidated = consolidateQuestionSessions(sessions, mockExams);
    expect(consolidated.total).toBe(20);
    expect(consolidated.correct).toBe(16);
    expect(consolidated.accuracyRate).toBe(80);
  });

  it('Diferencia taxa de acertos sobre o total vs aproveitamento sobre respondidas e nota líquida Cebraspe', () => {
    const metrics = calculateQuestionMetrics({
      correct: 70,
      incorrect: 20,
      blank: 10,
      pointsPerCorrect: 1,
      penaltyPerError: 1,
      pointsPerBlank: 0,
    });
    expect(metrics.total).toBe(100);
    expect(metrics.answered).toBe(90);
    expect(metrics.accuracyRate).toBe(70);
    expect(metrics.answeredAccuracyRate).toBe(77.78);
    expect(metrics.netScore).toBe(50);
  });

  it('Cenário 8: Total igual a zero evita divisão por zero e retorna taxas nulas', () => {
    const metrics = calculateQuestionMetrics({ correct: 0, incorrect: 0, blank: 0 });
    expect(metrics.total).toBe(0);
    expect(metrics.accuracyRate).toBeNull();
    expect(metrics.errorRate).toBeNull();
    expect(metrics.answeredAccuracyRate).toBeNull();
  });

  it('Calcula streak de dias consecutivos e status atrasado de revisão', () => {
    const studies: StudySession[] = [
      baseStudy({ id: 's1', study_date: '2026-11-24' }),
      baseStudy({ id: 's2', study_date: '2026-11-25' }),
      baseStudy({ id: 's3', study_date: '2026-11-26' }),
    ];
    expect(calculateCurrentStreak(studies, '2026-11-26')).toBe(3);

    const overdueReview: Review = {
      id: 'r1',
      user_id: 'u1',
      goal_id: null,
      subject_id: 's1',
      topic_id: null,
      source_study_session_id: null,
      completed_study_session_id: null,
      interval_days: 7,
      scheduled_date: '2026-11-25',
      completed_at: null,
      duration_seconds: null,
      comprehension_level: null,
      notes: null,
      created_at: '2026-11-18T10:00:00Z',
      updated_at: '2026-11-18T10:00:00Z',
    };
    expect(resolveReviewStatus(overdueReview, '2026-11-26')).toBe('atrasada');
  });
});
