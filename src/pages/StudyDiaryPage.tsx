import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import { QuickRegisterModal } from '../components/QuickRegisterModal';
import { SearchableSubjectTopicPicker } from '../components/SearchableSubjectTopicPicker';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { FieldLabel, Input, Select, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { useData } from '../contexts/DataContext';
import { STUDY_TYPE_LABELS, type StudySession, type StudyType } from '../types/database';
import { formatDateBR, formatDuration } from '../utils/date';

const TIMER_STORAGE_KEY = 'cdp_study_timer_v1';

interface TimerState {
  status: 'idle' | 'running' | 'paused';
  accumulatedSeconds: number;
  lastResumedAt: number | null;
  subjectId: string;
  topicId: string;
}

function loadTimerState(defaultSubjectId: string): TimerState {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) {
      return {
        status: 'idle',
        accumulatedSeconds: 0,
        lastResumedAt: null,
        subjectId: defaultSubjectId,
        topicId: '',
      };
    }
    const parsed = JSON.parse(raw) as Partial<TimerState>;
    return {
      status: parsed.status === 'running' || parsed.status === 'paused' ? parsed.status : 'idle',
      accumulatedSeconds: Math.max(0, Number(parsed.accumulatedSeconds) || 0),
      lastResumedAt: typeof parsed.lastResumedAt === 'number' ? parsed.lastResumedAt : null,
      subjectId: typeof parsed.subjectId === 'string' && parsed.subjectId ? parsed.subjectId : defaultSubjectId,
      topicId: typeof parsed.topicId === 'string' ? parsed.topicId : '',
    };
  } catch {
    return {
      status: 'idle',
      accumulatedSeconds: 0,
      lastResumedAt: null,
      subjectId: defaultSubjectId,
      topicId: '',
    };
  }
}

function formatTimerClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const StudyDiaryPage: React.FC = () => {
  const {
    subjects,
    topics,
    studySessions,
    todayISO,
    editStudySession,
    removeStudySession,
  } = useData();

  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived_at), [subjects]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const [timer, setTimer] = useState<TimerState>(() => loadTimerState(activeSubjects[0]?.id || ''));
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showTimerPicker, setShowTimerPicker] = useState(false);

  const [quickOpen, setQuickOpen] = useState(false);
  const [timerPrefill, setTimerPrefill] = useState<{
    minutes?: number;
    subjectId?: string;
    topicId?: string;
    fromTimer?: boolean;
  }>({});

  const [editing, setEditing] = useState<StudySession | null>(null);
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editTopicId, setEditTopicId] = useState('');
  const [editDate, setEditDate] = useState(todayISO);
  const [editHoursStr, setEditHoursStr] = useState('1');
  const [editMinutesStr, setEditMinutesStr] = useState('0');
  const [editStudyType, setEditStudyType] = useState<StudyType>('teoria');
  const [editNotes, setEditNotes] = useState('');
  const [showEditOptional, setShowEditOptional] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<StudySession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterSubject, setFilterSubject] = useState('all');

  useEffect(() => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
    } catch {
      // ignora erro de armazenamento privado
    }
  }, [timer]);

  useEffect(() => {
    if (timer.status !== 'running') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [timer.status]);

  useEffect(() => {
    if (!timer.subjectId && activeSubjects[0]?.id) {
      setTimer((prev) => ({ ...prev, subjectId: activeSubjects[0].id }));
    }
  }, [activeSubjects, timer.subjectId]);

  const elapsedSeconds = useMemo(() => {
    if (timer.status === 'running' && timer.lastResumedAt) {
      return timer.accumulatedSeconds + Math.max(0, Math.floor((nowMs - timer.lastResumedAt) / 1000));
    }
    return timer.accumulatedSeconds;
  }, [timer, nowMs]);

  const handleStartTimer = () => {
    setNowMs(Date.now());
    setTimer((prev) => ({
      ...prev,
      status: 'running',
      lastResumedAt: Date.now(),
    }));
  };

  const handlePauseTimer = () => {
    const currentElapsed =
      timer.status === 'running' && timer.lastResumedAt
        ? timer.accumulatedSeconds + Math.max(0, Math.floor((Date.now() - timer.lastResumedAt) / 1000))
        : timer.accumulatedSeconds;

    setTimer((prev) => ({
      ...prev,
      status: 'paused',
      accumulatedSeconds: currentElapsed,
      lastResumedAt: null,
    }));
  };

  const handleResetTimer = () => {
    setTimer((prev) => ({
      ...prev,
      status: 'idle',
      accumulatedSeconds: 0,
      lastResumedAt: null,
    }));
  };

  const handleFinishTimer = () => {
    const currentElapsed = elapsedSeconds;
    if (timer.status === 'running') {
      handlePauseTimer();
    }
    const mins = Math.max(1, Math.round(currentElapsed / 60));
    setTimerPrefill({
      minutes: mins,
      subjectId: timer.subjectId || activeSubjects[0]?.id,
      topicId: timer.topicId || '',
      fromTimer: true,
    });
    setQuickOpen(true);
  };

  const openNewStudy = () => {
    setTimerPrefill({});
    setQuickOpen(true);
  };

  const openEdit = (session: StudySession) => {
    setEditing(session);
    setEditError(null);
    setEditSubjectId(session.subject_id);
    setEditTopicId(session.topic_id || '');
    setEditDate(session.study_date.slice(0, 10));
    const totalMins = Math.round(session.duration_seconds / 60);
    setEditHoursStr(String(Math.floor(totalMins / 60)));
    setEditMinutesStr(String(totalMins % 60));
    setEditStudyType(session.study_type);
    setEditNotes(session.notes || '');
    setShowEditOptional(Boolean(session.notes || session.study_type !== 'teoria'));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);

    if (!editSubjectId) {
      setEditError('Selecione uma disciplina.');
      return;
    }

    const h = Math.max(0, Math.trunc(Number(editHoursStr) || 0));
    const m = Math.max(0, Math.trunc(Number(editMinutesStr) || 0));
    const totalSeconds = h * 3600 + m * 60;
    if (totalSeconds <= 0) {
      setEditError('Informe um tempo maior que zero.');
      return;
    }

    setSavingEdit(true);
    try {
      await editStudySession(editing.id, {
        subject_id: editSubjectId,
        topic_id: editTopicId || null,
        study_date: editDate,
        duration_seconds: totalSeconds,
        study_type: editStudyType,
        notes: editNotes.trim() || null,
      });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro ao atualizar estudo.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeStudySession(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredSessions = useMemo(() => {
    return studySessions
      .filter((s) => (filterSubject === 'all' ? true : s.subject_id === filterSubject))
      .sort((a, b) => b.study_date.localeCompare(a.study_date) || b.created_at.localeCompare(a.created_at));
  }, [studySessions, filterSubject]);

  const timerSubject = timer.subjectId ? subjectMap.get(timer.subjectId) : null;
  const timerTopic = timer.topicId ? topicMap.get(timer.topicId) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Estudos"
        subtitle="Cronometre ou registre suas sessões."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 items-start">
        {/* Coluna esquerda: Cronômetro + Botão Registrar estudo */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-muted)]">Cronômetro</p>
                <button
                  type="button"
                  onClick={() => setShowTimerPicker((v) => !v)}
                  className="mt-1 max-w-full min-h-[36px] inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] text-left"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: timerSubject?.color || '#D4A853' }}
                  />
                  <span className="truncate">
                    {timerSubject?.name || 'Selecionar disciplina'}
                    {timerTopic ? ` · ${timerTopic.name}` : ''}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                </button>
              </div>

              <p className="tabular-nums text-2xl sm:text-3xl font-bold text-[var(--gold-text)] tracking-tight shrink-0">
                {formatTimerClock(elapsedSeconds)}
              </p>
            </div>

            {showTimerPicker && (
              <div className="pt-3 border-t border-[var(--border-color)]">
                <SearchableSubjectTopicPicker
                  subjectId={timer.subjectId}
                  topicId={timer.topicId}
                  onChangeSubject={(nextSubj) =>
                    setTimer((prev) => ({ ...prev, subjectId: nextSubj, topicId: '' }))
                  }
                  onChangeTopic={(nextTopic) => setTimer((prev) => ({ ...prev, topicId: nextTopic }))}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {timer.status === 'running' ? (
                <Button type="button" variant="secondary" className="flex-1" onClick={handlePauseTimer}>
                  <Pause className="w-4 h-4" />
                  Pausar
                </Button>
              ) : (
                <Button type="button" className="flex-1" onClick={handleStartTimer}>
                  <Play className="w-4 h-4" />
                  {timer.status === 'paused' ? 'Continuar' : 'Iniciar cronômetro'}
                </Button>
              )}

              {elapsedSeconds > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleFinishTimer}
                    className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--positive)] px-4 text-sm font-semibold text-[#111827]"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Finalizar
                  </button>
                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="min-h-[46px] min-w-[46px] inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    title="Zerar cronômetro"
                    aria-label="Zerar cronômetro"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </Card>

          <Button
            type="button"
            fullWidth
            onClick={openNewStudy}
            className="min-h-[50px] text-base"
          >
            <Plus className="w-5 h-5" />
            Registrar estudo
          </Button>
        </div>

        {/* Coluna direita: Filtro e histórico */}
        <div className="lg:col-span-7 space-y-3">
          {subjects.length > 0 && (
            <div className="flex items-center justify-between gap-2.5">
              <p className="text-xs font-semibold text-[var(--text-muted)] shrink-0">
                Histórico ({filteredSessions.length})
              </p>
              <Select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                aria-label="Filtrar por disciplina"
                className="w-auto min-h-[44px] min-w-0 max-w-[185px] sm:max-w-[240px] bg-[var(--bg-card)] py-1.5"
              >
                <option value="all">Todas</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {filteredSessions.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhum estudo registrado"
              description="Use o cronômetro ou toque em Registrar estudo para salvar sua sessão."
            />
          ) : (
            <div className="space-y-2.5">
              {filteredSessions.map((s) => {
                const subj = subjectMap.get(s.subject_id);
                const top = s.topic_id ? topicMap.get(s.topic_id) : null;
                return (
                  <Card key={s.id} padding="sm" className="px-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: subj?.color || '#D4A853' }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-main)] truncate">
                          {subj?.name || 'Disciplina'}
                        </p>
                        {top && (
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {top.name}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          <span className="tabular-nums font-semibold text-[var(--gold-text)]">
                            {formatDuration(s.duration_seconds)}
                          </span>
                          <span aria-hidden="true" className="text-[var(--border-color)]">·</span>
                          <span className="tabular-nums text-[var(--text-muted)]">
                            {formatDateBR(s.study_date)}
                          </span>
                          {s.study_type && s.study_type !== 'teoria' && (
                            <>
                              <span aria-hidden="true" className="text-[var(--border-color)]">·</span>
                              <span className="text-[var(--text-muted)]">
                                {STUDY_TYPE_LABELS[s.study_type]}
                              </span>
                            </>
                          )}
                        </div>
                        {s.notes && (
                          <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">
                            {s.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        aria-label="Editar estudo"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--negative)]"
                        aria-label="Excluir estudo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <QuickRegisterModal
        open={quickOpen}
        initialTab="study"
        prefilledMinutes={timerPrefill.minutes}
        prefilledSubjectId={timerPrefill.subjectId}
        prefilledTopicId={timerPrefill.topicId}
        onSaved={() => {
          if (timerPrefill.fromTimer) {
            handleResetTimer();
          }
        }}
        onClose={() => setQuickOpen(false)}
      />

      {/* Modal de edição */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Editar estudo"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <SearchableSubjectTopicPicker
            subjectId={editSubjectId}
            topicId={editTopicId}
            onChangeSubject={setEditSubjectId}
            onChangeTopic={setEditTopicId}
          />

          <div>
            <FieldLabel>Tempo estudado *</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  max={24}
                  value={editHoursStr}
                  onChange={(e) => setEditHoursStr(e.target.value)}
                  className="pr-14 tabular-nums"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                  horas
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  max={59}
                  value={editMinutesStr}
                  onChange={(e) => setEditMinutesStr(e.target.value)}
                  className="pr-12 tabular-nums"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                  min
                </span>
              </div>
            </div>
          </div>

          <div>
            <FieldLabel>Data</FieldLabel>
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              required
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowEditOptional((v) => !v)}
              className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              {showEditOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Modalidade e observações (opcional)
            </button>

            {showEditOptional && (
              <div className="mt-2.5 space-y-3 pt-3 border-t border-[var(--border-color)]">
                <div>
                  <FieldLabel>Modalidade</FieldLabel>
                  <Select
                    value={editStudyType}
                    onChange={(e) => setEditStudyType(e.target.value as StudyType)}
                  >
                    {(Object.keys(STUDY_TYPE_LABELS) as StudyType[]).map((k) => (
                      <option key={k} value={k}>
                        {STUDY_TYPE_LABELS[k]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel>Observações</FieldLabel>
                  <Textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {editError && <p className="text-xs font-medium text-[var(--negative)]">{editError}</p>}

          <div className="sticky bottom-0 pt-2 bg-[var(--bg-card)]">
            <Button type="submit" fullWidth disabled={savingEdit} className="min-h-[48px]">
              {savingEdit ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir estudo"
        description="Tem certeza que deseja excluir esta sessão? O total de horas será recalculado."
        confirmLabel="Excluir"
        loading={deleting}
      />
    </div>
  );
};
