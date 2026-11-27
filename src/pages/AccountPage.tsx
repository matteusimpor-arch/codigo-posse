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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FieldLabel, Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
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

  const [showArchivedSubjects, setShowArchivedSubjects] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjName, setSubjName] = useState('');
  const [subjColor, setSubjColor] = useState<string>(SUBJECT_COLOR_PALETTE[0]);
  const [newTopicName, setNewTopicName] = useState('');
  const [subjError, setSubjError] = useState<string | null>(null);
  const [savingSubj, setSavingSubj] = useState(false);
  const [deleteSubjTarget, setDeleteSubjTarget] = useState<Subject | null>(null);

  const [intervalsText, setIntervalsText] = useState(
    (settings?.review_intervals ?? [1, 7, 15, 30]).join(', ')
  );
  const [timezone, setTimezone] = useState(settings?.timezone || 'America/Sao_Paulo');
  const [savingPref, setSavingPref] = useState(false);
  const [prefMsg, setPrefMsg] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);

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
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Perfil e configurações"
        subtitle="Dados pessoais, metas, disciplinas e aparência."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* Coluna esquerda: Dados pessoais/Metas + Disciplinas */}
        <div className="lg:col-span-7 space-y-4">
          <Card padding="lg">
            <form onSubmit={handleSaveMain} className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-color)]">
                <div className="w-14 h-14 rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--gold-text)] flex items-center justify-center overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Perfil'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm font-bold text-[var(--text-main)] truncate">
                    {profile?.full_name || 'Estudante'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                  <label className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] cursor-pointer">
                    <Camera className="w-3.5 h-3.5 text-[var(--gold-text)]" />
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

              <div className="space-y-3.5">
                <div>
                  <FieldLabel htmlFor="account-name">Nome</FieldLabel>
                  <Input
                    id="account-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor="account-area">Área de interesse</FieldLabel>
                    <Select
                      id="account-area"
                      value={
                        GOAL_AREAS.includes(area as (typeof GOAL_AREAS)[number]) || area === 'Geral'
                          ? area
                          : 'Outras'
                      }
                      onChange={(e) => setArea(e.target.value)}
                    >
                      <option value="Geral">Geral (sem área fixa)</option>
                      {GOAL_AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <FieldLabel htmlFor="account-board">Banca examinadora (opcional)</FieldLabel>
                    <Input
                      id="account-board"
                      type="text"
                      value={examBoard}
                      onChange={(e) => setExamBoard(e.target.value)}
                      placeholder="Ex: Cebraspe, FGV"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor="account-exam">Concurso pretendido (opcional)</FieldLabel>
                    <Input
                      id="account-exam"
                      type="text"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      placeholder="Ex: TJ-SP"
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="account-position">Cargo pretendido (opcional)</FieldLabel>
                    <Input
                      id="account-position"
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Ex: Analista"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor="account-hours-target">Meta semanal (h)</FieldLabel>
                    <Input
                      id="account-hours-target"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={120}
                      step="0.5"
                      value={weeklyStudyTarget}
                      onChange={(e) => setWeeklyStudyTarget(e.target.value)}
                      className="tabular-nums"
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="account-questions-target">Questões/semana</FieldLabel>
                    <Input
                      id="account-questions-target"
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={0}
                      step={10}
                      value={weeklyQuestionTarget}
                      onChange={(e) => setWeeklyQuestionTarget(e.target.value)}
                      className="tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {mainError && <p className="text-xs font-medium text-[var(--negative)]">{mainError}</p>}
              {mainMsg && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--positive)]">
                  <CheckCircle2 className="w-4 h-4" />
                  {mainMsg}
                </p>
              )}

              <Button type="submit" fullWidth disabled={savingMain}>
                {savingMain ? 'Salvando...' : 'Salvar dados e metas'}
              </Button>
            </form>
          </Card>

          <Card padding="lg" className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  Disciplinas e assuntos
                </h2>
                <p className="text-xs text-[var(--text-muted)] tabular-nums">
                  {subjects.filter((s) => !s.archived_at).length} ativa(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowArchivedSubjects((v) => !v)}
                  className="!min-h-[40px] !px-2.5 !text-xs"
                >
                  {showArchivedSubjects ? 'Ativas' : 'Arquivadas'}
                </Button>
                <Button
                  type="button"
                  onClick={openNewSubject}
                  className="!min-h-[40px] !px-3.5 !text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova
                </Button>
              </div>
            </div>

            {visibleSubjects.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-3 text-center">
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
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)]/70 bg-[var(--bg-app)] px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-main)] truncate">
                            {s.name}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                            {tCount} {tCount === 1 ? 'assunto' : 'assuntos'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditSubject(s)}
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          aria-label="Editar disciplina"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveSubject(s.id, !s.archived_at)}
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--gold-text)]"
                          title={s.archived_at ? 'Reativar' : 'Arquivar'}
                          aria-label={s.archived_at ? 'Reativar disciplina' : 'Arquivar disciplina'}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteSubjTarget(s)}
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--negative)]"
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
          </Card>
        </div>

        {/* Coluna direita: Intervalos, Aparência, Conta */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="lg">
            <form onSubmit={handleSavePreferences} className="space-y-4">
              <h2 className="text-sm font-bold text-[var(--text-main)]">Intervalos de revisão</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <div>
                  <FieldLabel htmlFor="account-intervals">Ciclos padrão (dias)</FieldLabel>
                  <Input
                    id="account-intervals"
                    type="text"
                    value={intervalsText}
                    onChange={(e) => setIntervalsText(e.target.value)}
                    placeholder="1, 7, 15, 30"
                    className="tabular-nums"
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="account-timezone">Fuso horário</FieldLabel>
                  <Select
                    id="account-timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {prefError && <p className="text-xs font-medium text-[var(--negative)]">{prefError}</p>}
              {prefMsg && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--positive)]">
                  <CheckCircle2 className="w-4 h-4" />
                  {prefMsg}
                </p>
              )}

              <Button type="submit" variant="secondary" fullWidth disabled={savingPref}>
                {savingPref ? 'Salvando...' : 'Salvar intervalos'}
              </Button>
            </form>
          </Card>

          <Card padding="lg" className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-main)]">Aparência e aplicativo</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  ['dark', 'Escuro', Moon],
                  ['light', 'Claro', Sun],
                  ['system', 'Auto', Monitor],
                ] as [ThemePreference, string, React.ComponentType<{ className?: string }>][]
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleThemeSelect(key)}
                  className={`min-h-[56px] flex flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                    theme === key
                      ? 'border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-ink)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-app)] text-[var(--text-main)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <PWAInstallButton />
              {!isDemoMode && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPasswordBox((v) => !v)}
                  className="!min-h-[44px] !text-xs"
                >
                  <Lock className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                  Alterar senha
                </Button>
              )}
            </div>

            {showPasswordBox && !isDemoMode && (
              <form
                onSubmit={handleChangePassword}
                className="pt-3 border-t border-[var(--border-color)] space-y-3"
              >
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)"
                />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar nova senha"
                />
                {pwdError && <p className="text-xs text-[var(--negative)]">{pwdError}</p>}
                {pwdMsg && <p className="text-xs text-[var(--positive)]">{pwdMsg}</p>}
                <Button type="submit" fullWidth disabled={savingPwd}>
                  {savingPwd ? 'Atualizando...' : 'Atualizar senha'}
                </Button>
              </form>
            )}
          </Card>

          <Card padding="lg" className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => signOut()}
              className="flex-1"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Excluir conta
            </Button>
          </Card>
        </div>
      </div>

      {/* Modal Criar / Editar Disciplina e Assuntos */}
      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={editingSubject ? 'Editar disciplina' : 'Nova disciplina'}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <div>
            <FieldLabel htmlFor="subject-name">Nome da disciplina *</FieldLabel>
            <Input
              id="subject-name"
              type="text"
              value={subjName}
              onChange={(e) => setSubjName(e.target.value)}
              placeholder="Ex: Direito Administrativo"
              required
            />
          </div>

          <div>
            <FieldLabel>Cor</FieldLabel>
            <div className="flex flex-wrap gap-2.5">
              {SUBJECT_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSubjColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    subjColor === c
                      ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-card)] ring-[#D4A853] scale-110'
                      : ''
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Selecionar cor ${c}`}
                />
              ))}
            </div>
          </div>

          {editingSubject && (
            <div className="pt-2 border-t border-[var(--border-color)] space-y-2.5">
              <FieldLabel>Assuntos ({editingTopics.length})</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Novo assunto..."
                  className="flex-1 min-w-0 !min-h-[44px]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddInlineTopic}
                  className="!min-h-[44px] !px-3.5 !text-xs"
                >
                  Adicionar
                </Button>
              </div>
              {editingTopics.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1.5">
                  {editingTopics.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)]/60 px-3 py-2 text-xs text-[var(--text-main)]"
                    >
                      <span className="truncate">{t.name}</span>
                      <button
                        type="button"
                        onClick={() => removeTopic(t.id)}
                        className="min-h-[32px] min-w-[32px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--negative)]"
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

          {subjError && <p className="text-xs font-medium text-[var(--negative)]">{subjError}</p>}

          <div className="sticky bottom-0 pt-2 bg-[var(--bg-card)]">
            <Button type="submit" fullWidth disabled={savingSubj}>
              {savingSubj ? 'Salvando...' : 'Salvar disciplina'}
            </Button>
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
