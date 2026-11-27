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
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
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
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-main)] tracking-tight">
          Estudos
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          Cronometre ou registre suas sessões.
        </p>
      </div>

      {/* Cronômetro integrado */}
      <section className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/70 p-4 space-y-4">
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

          <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[var(--gold-text)] tracking-tight shrink-0">
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
            <button
              type="button"
              onClick={handlePauseTimer}
              className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] text-sm font-semibold text-[var(--text-main)]"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartTimer}
              className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] text-sm font-semibold text-[var(--gold-ink)]"
            >
              <Play className="w-4 h-4" />
              {timer.status === 'paused' ? 'Continuar' : 'Iniciar cronômetro'}
            </button>
          )}

          {elapsedSeconds > 0 && (
            <>
              <button
                type="button"
                onClick={handleFinishTimer}
                className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--positive)] text-sm font-semibold text-[#111827]"
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
      </section>

      {/* Botão principal de registro */}
      <button
        type="button"
        onClick={openNewStudy}
        className="w-full min-h-[50px] rounded-xl bg-[var(--gold)] px-5 py-3 text-base font-semibold text-[var(--gold-ink)] flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all"
      >
        <Plus className="w-5 h-5" />
        Registrar estudo
      </button>

      {/* Filtro por disciplina */}
      {subjects.length > 0 && (
        <div className="flex items-center justify-between gap-2.5 pt-1">
          <p className="text-xs font-semibold text-[var(--text-muted)] shrink-0">
            Histórico ({filteredSessions.length})
          </p>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            aria-label="Filtrar por disciplina"
            className="min-h-[44px] min-w-0 max-w-[185px] sm:max-w-[220px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-base text-[var(--text-main)]"
          >
            <option value="all">Todas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Lista de sessões */}
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
              <div
                key={s.id}
                className="rounded-2xl border border-[var(--border-color)]/70 bg-[var(--bg-card)] px-4 py-3.5 flex items-start justify-between gap-3"
              >
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
                      <span className="font-mono-tabular font-semibold text-[var(--gold-text)]">
                        {formatDuration(s.duration_seconds)}
                      </span>
                      <span aria-hidden="true" className="text-[var(--border-color)]">·</span>
                      <span className="font-mono-tabular text-[var(--text-muted)]">
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
              </div>
            );
          })}
        </div>
      )}

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
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Tempo estudado *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  max={24}
                  value={editHoursStr}
                  onChange={(e) => setEditHoursStr(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 pr-14 py-2.5 text-base font-mono-tabular text-[var(--text-main)]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                  horas
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  max={59}
                  value={editMinutesStr}
                  onChange={(e) => setEditMinutesStr(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 pr-12 py-2.5 text-base font-mono-tabular text-[var(--text-main)]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                  min
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Data
            </label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              required
              className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)]"
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
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Modalidade
                  </label>
                  <select
                    value={editStudyType}
                    onChange={(e) => setEditStudyType(e.target.value as StudyType)}
                    className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)]"
                  >
                    {(Object.keys(STUDY_TYPE_LABELS) as StudyType[]).map((k) => (
                      <option key={k} value={k}>
                        {STUDY_TYPE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)]"
                  />
                </div>
              </div>
            )}
          </div>

          {editError && <p className="text-xs font-medium text-[var(--negative)]">{editError}</p>}

          <div className="sticky bottom-0 pt-2 bg-[var(--bg-card)]">
            <button
              type="submit"
              disabled={savingEdit}
              className="w-full min-h-[48px] rounded-xl bg-[var(--gold)] text-sm font-semibold text-[var(--gold-ink)] disabled:opacity-60"
            >
              {savingEdit ? 'Salvando...' : 'Salvar alterações'}
            </button>
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
