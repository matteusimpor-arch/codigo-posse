import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createInitialDemoState, DEMO_USER_ID } from '../services/demoStore';
import * as repo from '../services/studyRepository';
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
import { addDaysISO, DEFAULT_TIMEZONE, getTodayISO } from '../utils/date';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';

interface OnboardingInput {
  fullName: string;
  area: string;
  examName: string;
  position: string;
  examBoard: string;
  examDate: string;
  weeklyStudyTarget: number;
  weeklyQuestionTarget: number;
  skipGoal?: boolean;
}

interface DataContextValue {
  loading: boolean;
  error: string | null;
  profile: Profile | null;
  settings: UserSettings | null;
  goals: Goal[];
  primaryGoal: Goal | null;
  subjects: Subject[];
  goalSubjects: GoalSubject[];
  topics: Topic[];
  studySessions: StudySession[];
  questionSessions: QuestionSession[];
  reviews: Review[];
  todayISO: string;
  refresh: () => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  saveProfile: (values: { full_name: string }) => Promise<void>;
  uploadUserAvatar: (file: File) => Promise<void>;
  saveSettings: (values: Partial<UserSettings>) => Promise<void>;
  addGoal: (values: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Goal>;
  editGoal: (id: string, values: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  addSubject: (
    values: Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    goalLinks: { goal_id: string; exam_weight: number | null; priority: Subject['priority'] }[]
  ) => Promise<Subject>;
  editSubject: (
    id: string,
    values: Partial<Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
    goalLinks?: { goal_id: string; exam_weight: number | null; priority: Subject['priority'] }[]
  ) => Promise<void>;
  archiveSubject: (id: string, archive: boolean) => Promise<void>;
  removeSubject: (id: string) => Promise<void>;
  addTopic: (values: Omit<Topic, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Topic>;
  editTopic: (id: string, values: Partial<Omit<Topic, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  removeTopic: (id: string) => Promise<void>;
  addStudySession: (
    values: Omit<StudySession, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    options?: {
      reviewIntervals?: number[];
      questionLog?: {
        correct_answers: number;
        incorrect_answers: number;
        blank_answers: number;
        exam_board: string | null;
      };
    }
  ) => Promise<StudySession>;
  editStudySession: (
    id: string,
    values: Partial<Omit<StudySession, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  removeStudySession: (id: string) => Promise<void>;
  addQuestionSession: (
    values: Omit<QuestionSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<QuestionSession>;
  editQuestionSession: (
    id: string,
    values: Partial<Omit<QuestionSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  removeQuestionSession: (id: string) => Promise<void>;
  addReview: (values: Omit<Review, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Review>;
  editReview: (id: string, values: Partial<Omit<Review, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  completeReview: (
    id: string,
    payload: {
      durationSeconds: number | null;
      comprehensionLevel: Review['comprehension_level'];
      notes: string | null;
      alsoCreateStudySession: boolean;
    }
  ) => Promise<void>;
  removeReview: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDemoMode, demoWithSampleData } = useAuth();
  const { setTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [goalSubjects, setGoalSubjects] = useState<GoalSubject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [questionSessions, setQuestionSessions] = useState<QuestionSession[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadData = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setSettings(null);
      setGoals([]);
      setSubjects([]);
      setGoalSubjects([]);
      setTopics([]);
      setStudySessions([]);
      setQuestionSessions([]);
      setReviews([]);
      setError(null);
      return;
    }

    if (isDemoMode) {
      const demo = createInitialDemoState(demoWithSampleData);
      setProfile(demo.profile);
      setSettings(demo.settings);
      setGoals(demo.goals);
      setSubjects(demo.subjects);
      setGoalSubjects(demo.goalSubjects);
      setTopics(demo.topics);
      setStudySessions(demo.studySessions);
      setQuestionSessions(demo.questionSessions);
      setReviews(demo.reviews);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await repo.fetchWorkspaceData(user.id);
      let resolvedProfile = data.profile;
      if (!resolvedProfile) {
        resolvedProfile = await repo.upsertProfile(user.id, {
          full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || '',
          avatar_url: (user.user_metadata?.avatar_url as string) || null,
          onboarding_completed: false,
        });
      }
      let resolvedSettings = data.settings;
      if (!resolvedSettings) {
        resolvedSettings = await repo.upsertUserSettings(user.id, {
          theme: 'dark',
          timezone: DEFAULT_TIMEZONE,
        });
      }
      setProfile(resolvedProfile);
      setSettings(resolvedSettings);
      if (resolvedSettings?.theme === 'light' || resolvedSettings?.theme === 'dark') {
        setTheme(resolvedSettings.theme);
      }
      setGoals(data.goals);
      setSubjects(data.subjects);
      setGoalSubjects(data.goalSubjects);
      setTopics(data.topics);
      setStudySessions(data.studySessions);
      setQuestionSessions(data.questionSessions);
      setReviews(data.reviews);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao carregar dados do estudante.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemoMode, demoWithSampleData, setTheme]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const primaryGoal = useMemo(
    () => goals.find((g) => g.is_primary) ?? goals.find((g) => g.status !== 'arquivado') ?? goals[0] ?? null,
    [goals]
  );

  const todayISO = useMemo(
    () => getTodayISO(settings?.timezone || DEFAULT_TIMEZONE),
    [settings?.timezone]
  );

  const saveProfile = useCallback(
    async (values: { full_name: string }) => {
      if (!user) return;
      if (isDemoMode) {
        setProfile((prev) =>
          prev ? { ...prev, full_name: values.full_name, updated_at: new Date().toISOString() } : prev
        );
        return;
      }
      const updated = await repo.upsertProfile(user.id, values);
      setProfile(updated);
    },
    [user, isDemoMode]
  );

  const uploadUserAvatar = useCallback(
    async (file: File) => {
      if (!user) return;
      if (isDemoMode) {
        const localUrl = URL.createObjectURL(file);
        setProfile((prev) => (prev ? { ...prev, avatar_url: localUrl } : prev));
        return;
      }
      const signedUrl = await repo.uploadAvatar(user.id, file);
      setProfile((prev) => (prev ? { ...prev, avatar_url: signedUrl } : prev));
    },
    [user, isDemoMode]
  );

  const saveSettings = useCallback(
    async (values: Partial<UserSettings>) => {
      if (!user) return;
      if (values.theme) setTheme(values.theme);
      if (isDemoMode) {
        setSettings((prev) =>
          prev ? { ...prev, ...values, updated_at: new Date().toISOString() } : prev
        );
        return;
      }
      const updated = await repo.upsertUserSettings(user.id, values);
      setSettings(updated);
    },
    [user, isDemoMode, setTheme]
  );

  const addGoal = useCallback(
    async (values: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Goal> => {
      if (!user) throw new Error('Usuário não autenticado.');
      if (isDemoMode) {
        const now = new Date().toISOString();
        const created: Goal = {
          ...values,
          id: uid(),
          user_id: DEMO_USER_ID,
          created_at: now,
          updated_at: now,
        };
        setGoals((prev) => [
          created,
          ...prev.map((g) => (values.is_primary ? { ...g, is_primary: false } : g)),
        ]);
        return created;
      }
      const created = await repo.createGoal(user.id, values);
      setGoals((prev) => [
        created,
        ...prev.map((g) => (values.is_primary ? { ...g, is_primary: false } : g)),
      ]);
      return created;
    },
    [user, isDemoMode]
  );

  const editGoal = useCallback(
    async (id: string, values: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) return;
      if (isDemoMode) {
        setGoals((prev) =>
          prev.map((g) => {
            if (g.id === id) return { ...g, ...values, updated_at: new Date().toISOString() };
            if (values.is_primary) return { ...g, is_primary: false };
            return g;
          })
        );
        return;
      }
      const updated = await repo.updateGoal(user.id, id, values);
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === id) return updated;
          if (values.is_primary) return { ...g, is_primary: false };
          return g;
        })
      );
    },
    [user, isDemoMode]
  );

  const removeGoal = useCallback(
    async (id: string) => {
      if (!user) return;
      if (!isDemoMode) {
        await repo.deleteGoal(user.id, id);
      }
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setGoalSubjects((prev) => prev.filter((gs) => gs.goal_id !== id));
    },
    [user, isDemoMode]
  );

  const completeOnboarding = useCallback(
    async (input: OnboardingInput) => {
      if (!user) return;
      const areaClean = input.area.trim() || 'Geral';
      const goalName =
        input.examName.trim() ||
        (input.position.trim() ? `${areaClean} — ${input.position.trim()}` : `Preparação ${areaClean}`);

      if (isDemoMode) {
        const now = new Date().toISOString();
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                full_name: input.fullName.trim() || prev.full_name,
                onboarding_completed: true,
                updated_at: now,
              }
            : prev
        );
        if (!input.skipGoal) {
          await addGoal({
            name: goalName,
            area: areaClean,
            exam_name: input.examName.trim() || null,
            organization: null,
            position: input.position.trim() || null,
            exam_board: input.examBoard.trim() || null,
            education_level: null,
            exam_date: input.examDate || null,
            weekly_study_target: input.weeklyStudyTarget,
            weekly_question_target: input.weeklyQuestionTarget,
            status: 'em_preparacao',
            is_primary: true,
            notes: null,
          });
        }
        return;
      }

      const updatedProfile = await repo.upsertProfile(user.id, {
        full_name: input.fullName.trim() || 'Estudante',
        onboarding_completed: true,
      });
      setProfile(updatedProfile);

      if (!input.skipGoal && goals.length === 0) {
        await addGoal({
          name: goalName,
          area: areaClean,
          exam_name: input.examName.trim() || null,
          organization: null,
          position: input.position.trim() || null,
          exam_board: input.examBoard.trim() || null,
          education_level: null,
          exam_date: input.examDate || null,
          weekly_study_target: input.weeklyStudyTarget,
          weekly_question_target: input.weeklyQuestionTarget,
          status: 'em_preparacao',
          is_primary: true,
          notes: null,
        });
      }
    },
    [user, isDemoMode, goals.length, addGoal]
  );

  const addSubject = useCallback(
    async (
      values: Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
      goalLinks: { goal_id: string; exam_weight: number | null; priority: Subject['priority'] }[]
    ): Promise<Subject> => {
      if (!user) throw new Error('Usuário não autenticado.');
      if (isDemoMode) {
        const now = new Date().toISOString();
        const subject: Subject = {
          ...values,
          id: uid(),
          user_id: DEMO_USER_ID,
          created_at: now,
          updated_at: now,
        };
        const links: GoalSubject[] = goalLinks.map((l) => ({
          id: uid(),
          user_id: DEMO_USER_ID,
          goal_id: l.goal_id,
          subject_id: subject.id,
          exam_weight: l.exam_weight,
          priority: l.priority,
          created_at: now,
          updated_at: now,
        }));
        setSubjects((prev) => [...prev, subject].sort((a, b) => a.name.localeCompare(b.name)));
        setGoalSubjects((prev) => [...prev, ...links]);
        return subject;
      }
      const { subject, links } = await repo.createSubject(user.id, values, goalLinks);
      setSubjects((prev) => [...prev, subject].sort((a, b) => a.name.localeCompare(b.name)));
      setGoalSubjects((prev) => [...prev, ...links]);
      return subject;
    },
    [user, isDemoMode]
  );

  const editSubject = useCallback(
    async (
      id: string,
      values: Partial<Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
      goalLinks?: { goal_id: string; exam_weight: number | null; priority: Subject['priority'] }[]
    ) => {
      if (!user) return;
      if (isDemoMode) {
        const now = new Date().toISOString();
        setSubjects((prev) =>
          prev
            .map((s) => (s.id === id ? { ...s, ...values, updated_at: now } : s))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        if (goalLinks) {
          setGoalSubjects((prev) => [
            ...prev.filter((gs) => gs.subject_id !== id),
            ...goalLinks.map((l) => ({
              id: uid(),
              user_id: DEMO_USER_ID,
              goal_id: l.goal_id,
              subject_id: id,
              exam_weight: l.exam_weight,
              priority: l.priority,
              created_at: now,
              updated_at: now,
            })),
          ]);
        }
        return;
      }
      const { subject, links } = await repo.updateSubject(user.id, id, values, goalLinks);
      setSubjects((prev) =>
        prev.map((s) => (s.id === id ? subject : s)).sort((a, b) => a.name.localeCompare(b.name))
      );
      if (links) {
        setGoalSubjects((prev) => [...prev.filter((gs) => gs.subject_id !== id), ...links]);
      }
    },
    [user, isDemoMode]
  );

  const archiveSubject = useCallback(
    async (id: string, archive: boolean) => {
      await editSubject(id, { archived_at: archive ? new Date().toISOString() : null });
    },
    [editSubject]
  );

  const removeSubject = useCallback(
    async (id: string) => {
      if (!user) return;
      const hasHistory =
        studySessions.some((s) => s.subject_id === id) ||
        questionSessions.some((q) => q.subject_id === id) ||
        reviews.some((r) => r.subject_id === id);

      if (hasHistory) {
        throw new Error(
          'Esta disciplina possui estudos, questões ou revisões vinculadas. Arquive-a para preservar seu histórico.'
        );
      }
      if (!isDemoMode) {
        await repo.deleteSubject(user.id, id);
      }
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setTopics((prev) => prev.filter((t) => t.subject_id !== id));
      setGoalSubjects((prev) => prev.filter((gs) => gs.subject_id !== id));
    },
    [user, isDemoMode, studySessions, questionSessions, reviews]
  );

  const addTopic = useCallback(
    async (values: Omit<Topic, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Topic> => {
      if (!user) throw new Error('Usuário não autenticado.');
      if (isDemoMode) {
        const now = new Date().toISOString();
        const created: Topic = {
          ...values,
          id: uid(),
          user_id: DEMO_USER_ID,
          created_at: now,
          updated_at: now,
        };
        setTopics((prev) => [...prev, created]);
        return created;
      }
      const created = await repo.createTopic(user.id, values);
      setTopics((prev) => [...prev, created]);
      return created;
    },
    [user, isDemoMode]
  );

  const editTopic = useCallback(
    async (id: string, values: Partial<Omit<Topic, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) return;
      if (isDemoMode) {
        setTopics((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...values, updated_at: new Date().toISOString() } : t))
        );
        return;
      }
      const updated = await repo.updateTopic(user.id, id, values);
      setTopics((prev) => prev.map((t) => (t.id === id ? updated : t)));
    },
    [user, isDemoMode]
  );

  const removeTopic = useCallback(
    async (id: string) => {
      if (!user) return;
      if (!isDemoMode) {
        await repo.deleteTopic(user.id, id);
      }
      setTopics((prev) => prev.filter((t) => t.id !== id && t.parent_topic_id !== id));
    },
    [user, isDemoMode]
  );

  const addStudySession = useCallback(
    async (
      values: Omit<StudySession, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
      options?: {
        reviewIntervals?: number[];
        questionLog?: {
          correct_answers: number;
          incorrect_answers: number;
          blank_answers: number;
          exam_board: string | null;
        };
      }
    ): Promise<StudySession> => {
      if (!user) throw new Error('Usuário não autenticado.');
      let createdSession: StudySession;

      if (isDemoMode) {
        const now = new Date().toISOString();
        createdSession = {
          ...values,
          id: uid(),
          user_id: DEMO_USER_ID,
          created_at: now,
          updated_at: now,
        };
        setStudySessions((prev) => [createdSession, ...prev]);
      } else {
        createdSession = await repo.createStudySession(user.id, values);
        setStudySessions((prev) => [createdSession, ...prev]);
      }

      // Programar revisões no mesmo fluxo (sem duplicar intervalo)
      if (options?.reviewIntervals && options.reviewIntervals.length > 0) {
        const uniqueIntervals = Array.from(new Set(options.reviewIntervals)).filter((n) => n >= 0);
        const reviewPayloads = uniqueIntervals.map((interval) => ({
          goal_id: createdSession.goal_id,
          subject_id: createdSession.subject_id,
          topic_id: createdSession.topic_id,
          source_study_session_id: createdSession.id,
          completed_study_session_id: null,
          interval_days: interval,
          scheduled_date: addDaysISO(createdSession.study_date, interval),
          completed_at: null,
          duration_seconds: null,
          comprehension_level: null,
          notes: null,
        }));

        if (isDemoMode) {
          const now = new Date().toISOString();
          const newRevs: Review[] = reviewPayloads.map((r) => ({
            ...r,
            id: uid(),
            user_id: DEMO_USER_ID,
            created_at: now,
            updated_at: now,
          }));
          setReviews((prev) => [...prev, ...newRevs]);
        } else {
          const newRevs = await repo.createReviewsBatch(user.id, reviewPayloads);
          setReviews((prev) => [...prev, ...newRevs]);
        }
      }

      // Registrar questões no mesmo fluxo (vinculado à study_session_id, sem duplicar tempo)
      if (
        options?.questionLog &&
        options.questionLog.correct_answers +
          options.questionLog.incorrect_answers +
          options.questionLog.blank_answers >
          0
      ) {
        const qPayload: Omit<QuestionSession, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
          goal_id: createdSession.goal_id,
          subject_id: createdSession.subject_id,
          topic_id: createdSession.topic_id,
          study_session_id: createdSession.id,
          mock_exam_id: null,
          exam_board: options.questionLog.exam_board,
          session_date: createdSession.study_date,
          correct_answers: options.questionLog.correct_answers,
          incorrect_answers: options.questionLog.incorrect_answers,
          blank_answers: options.questionLog.blank_answers,
          duration_seconds: null,
          points_per_correct: 1,
          penalty_per_error: 0,
          points_per_blank: 0,
          notes: null,
        };
        if (isDemoMode) {
          const now = new Date().toISOString();
          const qCreated: QuestionSession = {
            ...qPayload,
            id: uid(),
            user_id: DEMO_USER_ID,
            created_at: now,
            updated_at: now,
          };
          setQuestionSessions((prev) => [qCreated, ...prev]);
        } else {
          const qCreated = await repo.createQuestionSession(user.id, qPayload);
          setQuestionSessions((prev) => [qCreated, ...prev]);
        }
      }

      return createdSession;
    },
    [user, isDemoMode]
  );

  const editStudySession = useCallback(
    async (
      id: string,
      values: Partial<Omit<StudySession, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
    ) => {
      if (!user) return;
      if (isDemoMode) {
        setStudySessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...values, updated_at: new Date().toISOString() } : s))
        );
        return;
      }
      const updated = await repo.updateStudySession(user.id, id, values);
      setStudySessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    },
    [user, isDemoMode]
  );

  const removeStudySession = useCallback(
    async (id: string) => {
      if (!user) return;
      if (!isDemoMode) {
        await repo.deleteStudySession(user.id, id);
      }
      setStudySessions((prev) => prev.filter((s) => s.id !== id));
    },
    [user, isDemoMode]
  );

  const addQuestionSession = useCallback(
    async (
      values: Omit<QuestionSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    ): Promise<QuestionSession> => {
      if (!user) throw new Error('Usuário não autenticado.');
      if (isDemoMode) {
        const now = new Date().toISOString();
        const created: QuestionSession = {
          ...values,
          id: uid(),
          user_id: DEMO_USER_ID,
          created_at: now,
          updated_at: now,
        };
        setQuestionSessions((prev) => [created, ...prev]);
        return created;
      }
      const created = await repo.createQuestionSession(user.id, values);
      setQuestionSessions((prev) => [created, ...prev]);
      return created;
    },
    [user, isDemoMode]
  );

  const editQuestionSession = useCallback(
    async (
      id: string,
      values: Partial<Omit<QuestionSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
    ) => {
      if (!user) return;
      if (isDemoMode) {
        setQuestionSessions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, ...values, updated_at: new Date().toISOString() } : q))
        );
        return;
      }
      const updated = await repo.updateQuestionSession(user.id, id, values);
      setQuestionSessions((prev) => prev.map((q) => (q.id === id ? updated : q)));
    },
    [user, isDemoMode]
  );

  const removeQuestionSession = useCallback(
    async (id: string) => {
      if (!user) return;
      if (!isDemoMode) {
        await repo.deleteQuestionSession(user.id, id);
      }
      setQuestionSessions((prev) => prev.filter((q) => q.id !== id));
    },
    [user, isDemoMode]
  );

  const addReview = useCallback(
    async (values: Omit<Review, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Review> => {
      if (!user) throw new Error('Usuário não autenticado.');
      if (isDemoMode) {
        const now = new Date().toISOString();
        const created: Review = {
          ...values,
          id: uid(),
          user_id: DEMO_USER_ID,
          created_at: now,
          updated_at: now,
        };
        setReviews((prev) => [...prev, created]);
        return created;
      }
      const [created] = await repo.createReviewsBatch(user.id, [values]);
      setReviews((prev) => [...prev, created]);
      return created;
    },
    [user, isDemoMode]
  );

  const editReview = useCallback(
    async (id: string, values: Partial<Omit<Review, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) return;
      if (isDemoMode) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...values, updated_at: new Date().toISOString() } : r))
        );
        return;
      }
      const updated = await repo.updateReview(user.id, id, values);
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
    },
    [user, isDemoMode]
  );

  const completeReview = useCallback(
    async (
      id: string,
      payload: {
        durationSeconds: number | null;
        comprehensionLevel: Review['comprehension_level'];
        notes: string | null;
        alsoCreateStudySession: boolean;
      }
    ) => {
      const target = reviews.find((r) => r.id === id);
      if (!target || !user) return;

      let completedStudySessionId: string | null = target.completed_study_session_id;
      if (payload.alsoCreateStudySession && payload.durationSeconds && payload.durationSeconds > 0) {
        const study = await addStudySession({
          goal_id: target.goal_id,
          subject_id: target.subject_id,
          topic_id: target.topic_id,
          study_date: todayISO,
          duration_seconds: payload.durationSeconds,
          study_type: 'revisao',
          notes: payload.notes ? `Revisão: ${payload.notes}` : 'Sessão registrada via conclusão de revisão.',
        });
        completedStudySessionId = study.id;
      }

      await editReview(id, {
        completed_at: new Date().toISOString(),
        duration_seconds: payload.durationSeconds,
        comprehension_level: payload.comprehensionLevel,
        notes: payload.notes,
        completed_study_session_id: completedStudySessionId,
      });
    },
    [reviews, user, addStudySession, todayISO, editReview]
  );

  const removeReview = useCallback(
    async (id: string) => {
      if (!user) return;
      if (!isDemoMode) {
        await repo.deleteReview(user.id, id);
      }
      setReviews((prev) => prev.filter((r) => r.id !== id));
    },
    [user, isDemoMode]
  );

  return (
    <DataContext.Provider
      value={{
        loading,
        error,
        profile,
        settings,
        goals,
        primaryGoal,
        subjects,
        goalSubjects,
        topics,
        studySessions,
        questionSessions,
        reviews,
        todayISO,
        refresh: loadData,
        completeOnboarding,
        saveProfile,
        uploadUserAvatar,
        saveSettings,
        addGoal,
        editGoal,
        removeGoal,
        addSubject,
        editSubject,
        archiveSubject,
        removeSubject,
        addTopic,
        editTopic,
        removeTopic,
        addStudySession,
        editStudySession,
        removeStudySession,
        addQuestionSession,
        editQuestionSession,
        removeQuestionSession,
        addReview,
        editReview,
        completeReview,
        removeReview,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider');
  return ctx;
}
