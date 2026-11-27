import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Camera,
  CheckCircle2,
  Edit2,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PWAInstallButton } from '../components/pwa/PWAInstallButton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  GOAL_AREAS,
  SUBJECT_COLOR_PALETTE,
  type Subject,
  type ThemePreference,
} from '../types/database';

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Cuiaba',
  'America/Rio_Branco',
  'America/Noronha',
];

export const AccountPage: React.FC = () => {
  const { user, updatePassword, deleteAccount, signOut, isDemoMode } = useAuth();
  const {
    profile,
    settings,
    primaryGoal,
    subjects,
    topics,
    saveProfile,
    uploadUserAvatar,
    saveSettings,
    addGoal,
    editGoal,
    addSubject,
    editSubject,
    archiveSubject,
    removeSubject,
    addTopic,
    removeTopic,
  } = useData();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Dados pessoais + Foco/Metas
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [area, setArea] = useState(primaryGoal?.area || 'Geral');
  const [examName, setExamName] = useState(primaryGoal?.exam_name || '');
  const [position, setPosition] = useState(primaryGoal?.position || '');
  const [examBoard, setExamBoard] = useState(primaryGoal?.exam_board || '');
  const [weeklyStudyTarget, setWeeklyStudyTarget] = useState(
    String(primaryGoal?.weekly_study_target ?? 15)
  );
  const [weeklyQuestionTarget, setWeeklyQuestionTarget] = useState(
    String(primaryGoal?.weekly_question_target ?? 150)
  );

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingMain, setSavingMain] = useState(false);
  const [mainMsg, setMainMsg] = useState<string | null>(null);
  const [mainError, setMainError] = useState<string | null>(null);

  // Disciplinas
  const [showArchivedSubjects, setShowArchivedSubjects] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjName, setSubjName] = useState('');
  const [subjColor, setSubjColor] = useState<string>(SUBJECT_COLOR_PALETTE[0]);
  const [newTopicName, setNewTopicName] = useState('');
  const [subjError, setSubjError] = useState<string | null>(null);
  const [savingSubj, setSavingSubj] = useState(false);
  const [deleteSubjTarget, setDeleteSubjTarget] = useState<Subject | null>(null);

  // Revisões e fuso
  const [intervalsText, setIntervalsText] = useState(
    (settings?.review_intervals ?? [1, 7, 15, 30]).join(', ')
  );
  const [timezone, setTimezone] = useState(settings?.timezone || 'America/Sao_Paulo');
  const [savingPref, setSavingPref] = useState(false);
  const [prefMsg, setPrefMsg] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);

  // Senha & Exclusão
  const [showPasswordBox, setShowPasswordBox] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile?.full_name]);

  useEffect(() => {
    if (primaryGoal) {
      setArea(primaryGoal.area || 'Geral');
      setExamName(primaryGoal.exam_name || '');
      setPosition(primaryGoal.position || '');
      setExamBoard(primaryGoal.exam_board || '');
      setWeeklyStudyTarget(String(primaryGoal.weekly_study_target));
      setWeeklyQuestionTarget(String(primaryGoal.weekly_question_target));
    }
  }, [primaryGoal]);

  useEffect(() => {
    if (settings) {
      setIntervalsText(settings.review_intervals.join(', '));
      setTimezone(settings.timezone);
    }
  }, [settings]);

  const visibleSubjects = useMemo(
    () => subjects.filter((s) => (showArchivedSubjects ? Boolean(s.archived_at) : !s.archived_at)),
    [subjects, showArchivedSubjects]
  );

  const editingTopics = useMemo(
    () => (editingSubject ? topics.filter((t) => t.subject_id === editingSubject.id) : []),
    [editingSubject, topics]
  );

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setMainError('A imagem deve ter no máximo 3 MB.');
      return;
    }
    setUploadingAvatar(true);
    setMainError(null);
    try {
      await uploadUserAvatar(file);
      setMainMsg('Foto atualizada.');
    } catch (err) {
      setMainError(err instanceof Error ? err.message : 'Falha ao enviar imagem.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveMain = async (e: React.FormEvent) => {
    e.preventDefault();
    setMainMsg(null);
    setMainError(null);

    const hoursTarget = Math.max(0, Number(weeklyStudyTarget) || 0);
    const questionsTarget = Math.max(0, Math.trunc(Number(weeklyQuestionTarget) || 0));

    if (fullName.trim().length < 2) {
      setMainError('Informe um nome válido.');
      return;
    }

    setSavingMain(true);
    try {
      await saveProfile({ full_name: fullName.trim() });

      const cleanArea = area.trim() || 'Geral';
      const goalTitle =
        examName.trim() ||
        (position.trim() ? `${cleanArea} — ${position.trim()}` : `Preparação ${cleanArea}`);

      if (primaryGoal) {
        await editGoal(primaryGoal.id, {
          name: goalTitle,
          area: cleanArea,
          exam_name: examName.trim() || null,
          position: position.trim() || null,
          exam_board: examBoard.trim() || null,
          weekly_study_target: hoursTarget,
          weekly_question_target: questionsTarget,
        });
      } else {
        await addGoal({
          name: goalTitle,
          area: cleanArea,
          exam_name: examName.trim() || null,
          organization: null,
          position: position.trim() || null,
          exam_board: examBoard.trim() || null,
          education_level: null,
          exam_date: null,
          weekly_study_target: hoursTarget,
          weekly_question_target: questionsTarget,
          status: 'em_preparacao',
          is_primary: true,
          notes: null,
        });
      }
      setMainMsg('Informações salvas.');
    } catch (err) {
      setMainError(err instanceof Error ? err.message : 'Erro ao salvar alterações.');
    } finally {
      setSavingMain(false);
    }
  };

  const openNewSubject = () => {
    setEditingSubject(null);
    setSubjName('');
    setSubjColor(SUBJECT_COLOR_PALETTE[subjects.length % SUBJECT_COLOR_PALETTE.length]);
    setNewTopicName('');
    setSubjError(null);
    setSubjectModalOpen(true);
  };

  const openEditSubject = (s: Subject) => {
    setEditingSubject(s);
    setSubjName(s.name);
    setSubjColor(s.color);
    setNewTopicName('');
    setSubjError(null);
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjError(null);
    if (!subjName.trim()) {
      setSubjError('Informe o nome da disciplina.');
      return;
    }
    setSavingSubj(true);
    try {
      if (editingSubject) {
        await editSubject(editingSubject.id, {
          name: subjName.trim(),
          color: subjColor,
        });
      } else {
        await addSubject(
          {
            name: subjName.trim(),
            color: subjColor,
            difficulty: 'intermediario',
            priority: 'media',
            notes: null,
            archived_at: null,
          },
          primaryGoal
            ? [{ goal_id: primaryGoal.id, exam_weight: null, priority: 'media' }]
            : []
        );
      }
      setSubjectModalOpen(false);
    } catch (err) {
      setSubjError(err instanceof Error ? err.message : 'Erro ao salvar disciplina.');
    } finally {
      setSavingSubj(false);
    }
  };

  const handleAddInlineTopic = async () => {
    if (!editingSubject || !newTopicName.trim()) return;
    setSubjError(null);
    try {
      await addTopic({
        subject_id: editingSubject.id,
        parent_topic_id: null,
        name: newTopicName.trim(),
        description: null,
        display_order: editingTopics.length,
      });
      setNewTopicName('');
    } catch (err) {
      setSubjError(err instanceof Error ? err.message : 'Erro ao criar assunto.');
    }
  };

  const handleConfirmDeleteSubject = async () => {
    if (!deleteSubjTarget) return;
    setMainError(null);
    try {
      await removeSubject(deleteSubjTarget.id);
      setDeleteSubjTarget(null);
    } catch (err) {
      setMainError(err instanceof Error ? err.message : 'Não foi possível excluir a disciplina.');
      setDeleteSubjTarget(null);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefMsg(null);
    setPrefError(null);

    const parsed = intervalsText
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 365);

    if (parsed.length === 0) {
      setPrefError('Informe ao menos um intervalo válido (ex: 1, 7, 15, 30).');
      return;
    }

    setSavingPref(true);
    try {
      await saveSettings({
        timezone,
        review_intervals: Array.from(new Set(parsed)).sort((a, b) => a - b),
      });
      setPrefMsg('Intervalos salvos.');
    } catch (err) {
      setPrefError(err instanceof Error ? err.message : 'Erro ao salvar preferências.');
    } finally {
      setSavingPref(false);
    }
  };

  const handleThemeSelect = async (next: ThemePreference) => {
    setTheme(next);
    await saveSettings({ theme: next });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    setPwdError(null);
    if (newPassword.length < 6) {
      setPwdError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('As senhas não conferem.');
      return;
    }
    setSavingPwd(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPwdMsg('Senha atualizada.');
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Erro ao alterar senha.');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
    } catch (err) {
      setMainError(err instanceof Error ? err.message : 'Erro ao excluir conta.');
      setDeleteDialogOpen(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Perfil e configurações
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Personalize seu foco, metas semanais, disciplinas e aparência.
        </p>
      </div>

      {/* Dados pessoais + Concurso/Metas */}
      <form
        onSubmit={handleSaveMain}
        className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-5"
      >
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-[#0F172A] text-[#D4A853] flex items-center justify-center overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'Perfil'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-7 h-7" />
            )}
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {profile?.full_name || 'Estudante'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email}
            </p>
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <Camera className="w-3.5 h-3.5" />
              {uploadingAvatar ? 'Enviando...' : 'Alterar foto'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nome
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Área de interesse
              </label>
              <select
                value={GOAL_AREAS.includes(area as (typeof GOAL_AREAS)[number]) || area === 'Geral' ? area : 'Outras'}
                onChange={(e) => setArea(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              >
                <option value="Geral">Geral (sem área fixa)</option>
                {GOAL_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Banca examinadora (opcional)
              </label>
              <input
                type="text"
                value={examBoard}
                onChange={(e) => setExamBoard(e.target.value)}
                placeholder="Ex: Cebraspe, FGV"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Concurso pretendido (opcional)
              </label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="Ex: TJ-SP"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Cargo pretendido (opcional)
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ex: Analista"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Meta semanal (horas)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={120}
                step="0.5"
                value={weeklyStudyTarget}
                onChange={(e) => setWeeklyStudyTarget(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Meta semanal (questões)
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                step={10}
                value={weeklyQuestionTarget}
                onChange={(e) => setWeeklyQuestionTarget(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono-tabular"
              />
            </div>
          </div>
        </div>

        {mainError && <p className="text-xs font-medium text-red-600">{mainError}</p>}
        {mainMsg && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            {mainMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={savingMain}
          className="w-full min-h-[46px] rounded-xl bg-[#0F172A] dark:bg-[#D4A853] text-sm font-semibold text-white dark:text-[#0F172A] hover:opacity-90 disabled:opacity-60"
        >
          {savingMain ? 'Salvando...' : 'Salvar dados e metas'}
        </button>
      </form>

      {/* Disciplinas cadastradas */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Disciplinas cadastradas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subjects.filter((s) => !s.archived_at).length} ativa(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArchivedSubjects((v) => !v)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {showArchivedSubjects ? 'Ver ativas' : 'Arquivadas'}
            </button>
            <button
              type="button"
              onClick={openNewSubject}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] dark:bg-[#D4A853] px-3 py-2 text-xs font-semibold text-white dark:text-[#0F172A]"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova
            </button>
          </div>
        </div>

        {visibleSubjects.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
            {showArchivedSubjects
              ? 'Nenhuma disciplina arquivada.'
              : 'Nenhuma disciplina cadastrada ainda.'}
          </p>
        ) : (
          <div className="space-y-2">
            {visibleSubjects.map((s) => {
              const tCount = topics.filter((t) => t.subject_id === s.id).length;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {s.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tCount} {tCount === 1 ? 'assunto' : 'assuntos'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditSubject(s)}
                      className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label="Editar disciplina"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveSubject(s.id, !s.archived_at)}
                      className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      title={s.archived_at ? 'Reativar' : 'Arquivar'}
                      aria-label={s.archived_at ? 'Reativar disciplina' : 'Arquivar disciplina'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteSubjTarget(s)}
                      className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      aria-label="Excluir disciplina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Intervalos de revisão e Fuso */}
      <form
        onSubmit={handleSavePreferences}
        className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4"
      >
        <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
          Intervalos de revisão
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ciclos padrão (dias)
            </label>
            <input
              type="text"
              value={intervalsText}
              onChange={(e) => setIntervalsText(e.target.value)}
              placeholder="1, 7, 15, 30"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono-tabular"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Fuso horário
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {prefError && <p className="text-xs font-medium text-red-600">{prefError}</p>}
        {prefMsg && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            {prefMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={savingPref}
          className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {savingPref ? 'Salvando...' : 'Salvar intervalos'}
        </button>
      </form>

      {/* Tema e Aplicativo */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
        <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
          Aparência e aplicativo
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              ['light', 'Claro', Sun],
              ['dark', 'Escuro', Moon],
              ['system', 'Auto', Monitor],
            ] as [ThemePreference, string, React.ComponentType<{ className?: string }>][]
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleThemeSelect(key)}
              className={`min-h-[56px] flex flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                theme === key
                  ? 'border-[#D4A853] bg-[#0F172A] text-[#E5C478] dark:bg-[#D4A853] dark:text-[#0F172A]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <PWAInstallButton />
          {!isDemoMode && (
            <button
              type="button"
              onClick={() => setShowPasswordBox((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <Lock className="w-3.5 h-3.5" />
              Alterar senha
            </button>
          )}
        </div>

        {showPasswordBox && !isDemoMode && (
          <form
            onSubmit={handleChangePassword}
            className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3"
          >
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nova senha"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
            />
            {pwdError && <p className="text-xs text-red-600">{pwdError}</p>}
            {pwdMsg && <p className="text-xs text-emerald-600">{pwdMsg}</p>}
            <button
              type="submit"
              disabled={savingPwd}
              className="w-full min-h-[44px] rounded-xl bg-[#0F172A] dark:bg-[#D4A853] text-xs font-semibold text-white dark:text-[#0F172A]"
            >
              {savingPwd ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        )}
      </section>

      {/* Sair da conta & Excluir conta */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => signOut()}
          className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
        <button
          type="button"
          onClick={() => setDeleteDialogOpen(true)}
          className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900/60 px-4 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="w-4 h-4" />
          Excluir conta
        </button>
      </section>

      {/* Modal Criar / Editar Disciplina e seus Assuntos */}
      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={editingSubject ? 'Editar disciplina' : 'Nova disciplina'}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nome da disciplina *
            </label>
            <input
              type="text"
              value={subjName}
              onChange={(e) => setSubjName(e.target.value)}
              placeholder="Ex: Direito Administrativo"
              required
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Cor
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSubjColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    subjColor === c ? 'ring-2 ring-offset-2 ring-[#0F172A] dark:ring-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Selecionar cor ${c}`}
                />
              ))}
            </div>
          </div>

          {editingSubject && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assuntos ({editingTopics.length})
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Novo assunto..."
                  className="flex-1 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddInlineTopic}
                  className="min-h-[42px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  Adicionar
                </button>
              </div>
              {editingTopics.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {editingTopics.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs"
                    >
                      <span className="truncate">{t.name}</span>
                      <button
                        type="button"
                        onClick={() => removeTopic(t.id)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        aria-label={`Remover assunto ${t.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {subjError && <p className="text-xs font-medium text-red-600">{subjError}</p>}

          <div className="sticky bottom-0 pt-2 bg-white dark:bg-slate-900">
            <button
              type="submit"
              disabled={savingSubj}
              className="w-full min-h-[48px] rounded-xl bg-[#0F172A] dark:bg-[#D4A853] text-sm font-semibold text-white dark:text-[#0F172A] disabled:opacity-60"
            >
              {savingSubj ? 'Salvando...' : 'Salvar disciplina'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteSubjTarget)}
        onClose={() => setDeleteSubjTarget(null)}
        onConfirm={handleConfirmDeleteSubject}
        title="Excluir disciplina"
        description="Se esta disciplina já tiver estudos, questões ou revisões vinculadas, use a opção Arquivar para preservar seu histórico."
        confirmLabel="Excluir"
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDeleteAccount}
        title="Excluir conta permanentemente"
        description="Esta ação removerá todos os seus dados, estudos, questões e revisões. Deseja continuar?"
        confirmLabel="Excluir minha conta"
        loading={deletingAccount}
      />
    </div>
  );
};
