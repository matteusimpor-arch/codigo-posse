import { supabase } from '../lib/supabase';
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

export interface WorkspacePayload {
  profile: Profile | null;
  settings: UserSettings | null;
  goals: Goal[];
  subjects: Subject[];
  goalSubjects: GoalSubject[];
  topics: Topic[];
  studySessions: StudySession[];
  questionSessions: QuestionSession[];
  reviews: Review[];
}

function assertClient() {
  if (!supabase) {
    throw new Error('Conexão com o banco de dados não configurada.');
  }
  return supabase;
}

export function formatSupabaseError(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return 'Ocorreu um erro inesperado ao comunicar com o servidor.';
  const msg = err.message || '';
  const code = err.code || '';

  if (
    code === 'PGRST205' ||
    msg.includes('schema cache') ||
    msg.includes("Could not find the table 'public.")
  ) {
    return 'As tabelas do aplicativo ainda não foram inicializadas no Supabase ou o cache da API precisa ser atualizado. Execute as migrations SQL do projeto e recarregue o schema (NOTIFY pgrst, \'reload schema\').';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';
  }
  if (code === '42501' || msg.toLowerCase().includes('row-level security')) {
    return 'Permissão insuficiente para acessar este registro. Faça login novamente.';
  }
  return msg;
}

export async function fetchWorkspaceData(userId: string): Promise<WorkspacePayload> {
  const client = assertClient();

  const [
    profileRes,
    settingsRes,
    goalsRes,
    subjectsRes,
    goalSubjectsRes,
    topicsRes,
    studiesRes,
    questionsRes,
    reviewsRes,
  ] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    client.from('goals').select('*').eq('user_id', userId).order('is_primary', { ascending: false }).order('created_at', { ascending: false }),
    client.from('subjects').select('*').eq('user_id', userId).order('name', { ascending: true }),
    client.from('goal_subjects').select('*').eq('user_id', userId),
    client.from('topics').select('*').eq('user_id', userId).order('display_order', { ascending: true }).order('name', { ascending: true }),
    client.from('study_sessions').select('*').eq('user_id', userId).order('study_date', { ascending: false }).order('created_at', { ascending: false }),
    client.from('question_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false }).order('created_at', { ascending: false }),
    client.from('reviews').select('*').eq('user_id', userId).order('scheduled_date', { ascending: true }),
  ]);

  const errors = [
    profileRes.error,
    settingsRes.error,
    goalsRes.error,
    subjectsRes.error,
    goalSubjectsRes.error,
    topicsRes.error,
    studiesRes.error,
    questionsRes.error,
    reviewsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(formatSupabaseError(errors[0]));
  }

  let profile = profileRes.data as Profile | null;
  if (profile?.avatar_url && !profile.avatar_url.startsWith('http')) {
    const { data: signed } = await client.storage
      .from('avatars')
      .createSignedUrl(profile.avatar_url, 60 * 60);
    if (signed?.signedUrl) {
      profile = { ...profile, avatar_url: signed.signedUrl };
    }
  }

  return {
    profile,
    settings: settingsRes.data as UserSettings | null,
    goals: (goalsRes.data ?? []) as Goal[],
    subjects: (subjectsRes.data ?? []) as Subject[],
    goalSubjects: (goalSubjectsRes.data ?? []) as GoalSubject[],
    topics: (topicsRes.data ?? []) as Topic[],
    studySessions: (studiesRes.data ?? []) as StudySession[],
    questionSessions: (questionsRes.data ?? []) as QuestionSession[],
    reviews: (reviewsRes.data ?? []) as Review[],
  };
}

export async function upsertProfile(userId: string, values: Partial<Profile>): Promise<Profile> {
  const client = assertClient();
  const { data, error } = await client
    .from('profiles')
    .upsert({ id: userId, ...values }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as Profile;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const client = assertClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await client.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (uploadError) throw new Error(formatSupabaseError(uploadError));

  const { error: profileError } = await client
    .from('profiles')
    .update({ avatar_url: path })
    .eq('id', userId);

  if (profileError) throw new Error(formatSupabaseError(profileError));

  const { data: signed } = await client.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60);

  return signed?.signedUrl || path;
}

export async function upsertUserSettings(
  userId: string,
  values: Partial<UserSettings>
): Promise<UserSettings> {
  const client = assertClient();
  const { data, error } = await client
    .from('user_settings')
    .upsert({ user_id: userId, ...values }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as UserSettings;
}

export async function createGoal(
  userId: string,
  values: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Goal> {
  const client = assertClient();
  if (values.is_primary) {
    await client.from('goals').update({ is_primary: false }).eq('user_id', userId).eq('is_primary', true);
  }
  const { data, error } = await client
    .from('goals')
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as Goal;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  values: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Goal> {
  const client = assertClient();
  if (values.is_primary) {
    const { data, error } = await client.rpc('set_primary_goal', { p_goal_id: goalId });
    if (!error && data) {
      const rest = { ...values };
      delete rest.is_primary;
      if (Object.keys(rest).length === 0) return data as Goal;
    }
  }
  const { data, error } = await client
    .from('goals')
    .update(values)
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as Goal;
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from('goals').delete().eq('id', goalId).eq('user_id', userId);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function createSubject(
  userId: string,
  values: Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  goalLinks: { goal_id: string; exam_weight: number | null; priority: Subject['priority'] }[]
): Promise<{ subject: Subject; links: GoalSubject[] }> {
  const client = assertClient();
  const { data, error } = await client
    .from('subjects')
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));

  const subject = data as Subject;
  let links: GoalSubject[] = [];
  if (goalLinks.length > 0) {
    const { data: linkData, error: linkErr } = await client
      .from('goal_subjects')
      .insert(
        goalLinks.map((l) => ({
          user_id: userId,
          goal_id: l.goal_id,
          subject_id: subject.id,
          exam_weight: l.exam_weight,
          priority: l.priority,
        }))
      )
      .select();
    if (linkErr) throw new Error(formatSupabaseError(linkErr));
    links = (linkData ?? []) as GoalSubject[];
  }
  return { subject, links };
}

export async function updateSubject(
  userId: string,
  subjectId: string,
  values: Partial<Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
  goalLinks?: { goal_id: string; exam_weight: number | null; priority: Subject['priority'] }[]
): Promise<{ subject: Subject; links?: GoalSubject[] }> {
  const client = assertClient();
  const { data, error } = await client
    .from('subjects')
    .update(values)
    .eq('id', subjectId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));

  let links: GoalSubject[] | undefined;
  if (goalLinks) {
    await client.from('goal_subjects').delete().eq('subject_id', subjectId).eq('user_id', userId);
    if (goalLinks.length > 0) {
      const { data: linkData, error: linkErr } = await client
        .from('goal_subjects')
        .insert(
          goalLinks.map((l) => ({
            user_id: userId,
            goal_id: l.goal_id,
            subject_id: subjectId,
            exam_weight: l.exam_weight,
            priority: l.priority,
          }))
        )
        .select();
      if (linkErr) throw new Error(formatSupabaseError(linkErr));
      links = (linkData ?? []) as GoalSubject[];
    } else {
      links = [];
    }
  }
  return { subject: data as Subject, links };
}

export async function deleteSubject(userId: string, subjectId: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from('subjects').delete().eq('id', subjectId).eq('user_id', userId);
  if (error) {
    if (error.code === '23503') {
      throw new Error('Esta disciplina possui registros históricos vinculados. Utilize a opção Arquivar para preservar seu histórico.');
    }
    throw new Error(formatSupabaseError(error));
  }
}

export async function createTopic(
  userId: string,
  values: Omit<Topic, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Topic> {
  const client = assertClient();
  const { data, error } = await client
    .from('topics')
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as Topic;
}

export async function updateTopic(
  userId: string,
  topicId: string,
  values: Partial<Omit<Topic, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Topic> {
  const client = assertClient();
  const { data, error } = await client
    .from('topics')
    .update(values)
    .eq('id', topicId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as Topic;
}

export async function deleteTopic(userId: string, topicId: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from('topics').delete().eq('id', topicId).eq('user_id', userId);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function createStudySession(
  userId: string,
  values: Omit<StudySession, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<StudySession> {
  const client = assertClient();
  const { data, error } = await client
    .from('study_sessions')
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as StudySession;
}

export async function updateStudySession(
  userId: string,
  sessionId: string,
  values: Partial<Omit<StudySession, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<StudySession> {
  const client = assertClient();
  const { data, error } = await client
    .from('study_sessions')
    .update(values)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as StudySession;
}

export async function deleteStudySession(userId: string, sessionId: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from('study_sessions').delete().eq('id', sessionId).eq('user_id', userId);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function createQuestionSession(
  userId: string,
  values: Omit<QuestionSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<QuestionSession> {
  const client = assertClient();
  const { data, error } = await client
    .from('question_sessions')
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as QuestionSession;
}

export async function updateQuestionSession(
  userId: string,
  sessionId: string,
  values: Partial<Omit<QuestionSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<QuestionSession> {
  const client = assertClient();
  const { data, error } = await client
    .from('question_sessions')
    .update(values)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as QuestionSession;
}

export async function deleteQuestionSession(userId: string, sessionId: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from('question_sessions').delete().eq('id', sessionId).eq('user_id', userId);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function createReviewsBatch(
  userId: string,
  valuesList: Omit<Review, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
): Promise<Review[]> {
  const client = assertClient();
  const { data, error } = await client
    .from('reviews')
    .insert(valuesList.map((v) => ({ ...v, user_id: userId })))
    .select();
  if (error) throw new Error(formatSupabaseError(error));
  return (data ?? []) as Review[];
}

export async function updateReview(
  userId: string,
  reviewId: string,
  values: Partial<Omit<Review, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Review> {
  const client = assertClient();
  const { data, error } = await client
    .from('reviews')
    .update(values)
    .eq('id', reviewId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data as Review;
}

export async function deleteReview(userId: string, reviewId: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from('reviews').delete().eq('id', reviewId).eq('user_id', userId);
  if (error) throw new Error(formatSupabaseError(error));
}
