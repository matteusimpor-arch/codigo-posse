import React, { useMemo, useState } from 'react';
import { CalendarCheck2, CalendarClock, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { SearchableSubjectTopicPicker } from '../components/SearchableSubjectTopicPicker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useData } from '../contexts/DataContext';
import { type ComprehensionLevel, type Review } from '../types/database';
import { resolveReviewStatus } from '../utils/calculations';
import { addDaysISO, diffDaysISO, formatDateBR, formatDuration } from '../utils/date';

type ReviewTab = 'today' | 'upcoming' | 'done';

const COMPREHENSION_CHIPS: { value: ComprehensionLevel; label: string }[] = [
  { value: 'revisar_novamente', label: 'Revisar' },
  { value: 'intermediaria', label: 'Média' },
  { value: 'dominado', label: 'Dominado' },
];

export const ReviewsPage: React.FC = () => {
  const {
    primaryGoal,
    subjects,
    topics,
    reviews,
    todayISO,
    addReview,
    editReview,
    completeReview,
    removeReview,
  } = useData();

  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived_at), [subjects]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const [tab, setTab] = useState<ReviewTab>('today');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(todayISO);
  const [notes, setNotes] = useState('');

  const [completeTarget, setCompleteTarget] = useState<Review | null>(null);
  const [durationStr, setDurationStr] = useState('20');
  const [comprehension, setComprehension] = useState<ComprehensionLevel>('intermediaria');
  const [completeNotes, setCompleteNotes] = useState('');
  const [alsoCreateStudySession, setAlsoCreateStudySession] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const enriched = useMemo(() => {
    return reviews.map((r) => ({ ...r, status: resolveReviewStatus(r, todayISO) }));
  }, [reviews, todayISO]);

  const todayList = useMemo(
    () =>
      enriched
        .filter((r) => r.status === 'atrasada' || (r.status === 'pendente' && r.scheduled_date <= todayISO))
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'atrasada' ? -1 : 1;
          return a.scheduled_date.localeCompare(b.scheduled_date);
        }),
    [enriched, todayISO]
  );

  const overdueCount = useMemo(
    () => todayList.filter((r) => r.status === 'atrasada').length,
    [todayList]
  );

  const upcomingList = useMemo(
    () =>
      enriched
        .filter((r) => r.status === 'pendente' && r.scheduled_date > todayISO)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [enriched, todayISO]
  );

  const doneList = useMemo(
    () =>
      enriched
        .filter((r) => r.status === 'realizada')
        .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')),
    [enriched]
  );

  const currentList = tab === 'today' ? todayList : tab === 'upcoming' ? upcomingList : doneList;

  const openCreate = () => {
    setEditing(null);
    setErrorMsg(null);
    setSubjectId(activeSubjects[0]?.id || '');
    setTopicId('');
    setScheduledDate(todayISO);
    setNotes('');
    setFormOpen(true);
  };

  const openReschedule = (r: Review) => {
    setEditing(r);
    setErrorMsg(null);
    setSubjectId(r.subject_id);
    setTopicId(r.topic_id || '');
    setScheduledDate(r.scheduled_date.slice(0, 10));
    setNotes(r.notes || '');
    setFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!subjectId) {
      setErrorMsg('Selecione ou crie uma disciplina.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await editReview(editing.id, {
          subject_id: subjectId,
          topic_id: topicId || null,
          scheduled_date: scheduledDate,
          notes: notes.trim() || null,
        });
      } else {
        await addReview({
          goal_id: primaryGoal?.id || null,
          subject_id: subjectId,
          topic_id: topicId || null,
          source_study_session_id: null,
          completed_study_session_id: null,
          interval_days: null,
          scheduled_date: scheduledDate,
          completed_at: null,
          duration_seconds: null,
          comprehension_level: null,
          notes: notes.trim() || null,
        });
      }
      setFormOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar revisão.');
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (r: Review) => {
    setCompleteTarget(r);
    setDurationStr('20');
    setComprehension('intermediaria');
    setCompleteNotes(r.notes || '');
    setAlsoCreateStudySession(false);
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTarget) return;
    setSaving(true);
    try {
      const mins = Math.max(0, Math.trunc(Number(durationStr) || 0));
      await completeReview(completeTarget.id, {
        durationSeconds: mins > 0 ? mins * 60 : null,
        comprehensionLevel: comprehension,
        notes: completeNotes.trim() || null,
        alsoCreateStudySession,
      });
      setCompleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await removeReview(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-main)] tracking-tight">
          Revisões
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {overdueCount > 0
            ? `${overdueCount} atrasada${overdueCount > 1 ? 's' : ''} na fila de hoje.`
            : 'Ciclos automáticos de 1, 7, 15 e 30 dias.'}
        </p>
      </div>

      {/* Botão principal */}
      <button
        type="button"
        onClick={openCreate}
        className="w-full min-h-[50px] rounded-xl bg-[var(--gold)] px-5 py-3 text-base font-semibold text-[var(--gold-ink)] flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all"
      >
        <Plus className="w-5 h-5" />
        Programar revisão
      </button>

      {/* 3 Categorias: Hoje, Próximas, Concluídas */}
      <div
        className="grid grid-cols-3 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]"
        role="tablist"
        aria-label="Categorias de revisão"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'today'}
          onClick={() => setTab('today')}
          className={`min-h-[42px] px-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap truncate transition-colors ${
            tab === 'today'
              ? 'bg-[var(--bg-app)] text-[var(--gold-text)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          Hoje ({todayList.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upcoming'}
          onClick={() => setTab('upcoming')}
          className={`min-h-[42px] px-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap truncate transition-colors ${
            tab === 'upcoming'
              ? 'bg-[var(--bg-app)] text-[var(--gold-text)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          Próximas ({upcomingList.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'done'}
          onClick={() => setTab('done')}
          className={`min-h-[42px] px-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap truncate transition-colors ${
            tab === 'done'
              ? 'bg-[var(--bg-app)] text-[var(--gold-text)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          Concluídas ({doneList.length})
        </button>
      </div>

      {currentList.length === 0 ? (
        <EmptyState
          icon={CalendarCheck2}
          title={tab === 'today' ? 'Tudo em dia por aqui' : 'Nenhuma revisão nesta categoria'}
          description={
            tab === 'today'
              ? 'Você concluiu todas as revisões programadas até hoje.'
              : 'Ao registrar estudos, suas revisões futuras são agendadas automaticamente.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {currentList.map((r) => {
            const subj = subjectMap.get(r.subject_id);
            const top = r.topic_id ? topicMap.get(r.topic_id) : null;
            const isOverdue = r.status === 'atrasada';
            const daysLate = isOverdue ? diffDaysISO(todayISO, r.scheduled_date) : 0;

            return (
              <div
                key={r.id}
                className={`rounded-2xl border bg-[var(--bg-card)] p-4 space-y-3 ${
                  isOverdue ? 'border-[var(--negative)]/70' : 'border-[var(--border-color)]/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: subj?.color || '#D4A853' }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        {isOverdue ? (
                          <span className="font-bold text-[var(--negative)]">
                            Atrasada ({daysLate}d)
                          </span>
                        ) : r.status === 'realizada' ? (
                          <span className="font-semibold text-[var(--positive)]">
                            Concluída em {formatDateBR(r.completed_at)}
                          </span>
                        ) : (
                          <span className="font-semibold text-[var(--gold-text)]">
                            {r.scheduled_date === todayISO ? 'Para hoje' : formatDateBR(r.scheduled_date)}
                          </span>
                        )}
                        {r.interval_days !== null && (
                          <>
                            <span aria-hidden="true" className="text-[var(--border-color)]">·</span>
                            <span className="text-[var(--text-muted)]">
                              Ciclo {r.interval_days}d
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="mt-1 text-sm font-semibold text-[var(--text-main)]">
                        {subj?.name || 'Disciplina'}
                      </h3>
                      {top && (
                        <p className="text-xs text-[var(--text-muted)]">{top.name}</p>
                      )}
                      {r.status === 'realizada' && r.duration_seconds && (
                        <p className="mt-1 text-xs text-[var(--text-muted)] font-mono-tabular">
                          {formatDuration(r.duration_seconds)}
                        </p>
                      )}
                      {r.notes && (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{r.notes}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(r)}
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--negative)] shrink-0"
                    aria-label="Excluir revisão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {r.status !== 'realizada' && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => openComplete(r)}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--gold)] px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--gold-ink)]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Concluir
                    </button>
                    <button
                      type="button"
                      onClick={() => openReschedule(r)}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--text-main)]"
                    >
                      <CalendarClock className="w-4 h-4" />
                      Reagendar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Programar / Reagendar bottom sheet */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Reagendar revisão' : 'Programar revisão'}
      >
        <form onSubmit={handleSaveForm} className="space-y-4">
          <SearchableSubjectTopicPicker
            subjectId={subjectId}
            topicId={topicId}
            onChangeSubject={setSubjectId}
            onChangeTopic={setTopicId}
          />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Data programada *
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  ['Hoje', 0],
                  ['Amanhã', 1],
                  ['+3d', 3],
                  ['+7d', 7],
                ].map(([lbl, offset]) => (
                  <button
                    key={String(lbl)}
                    type="button"
                    onClick={() => setScheduledDate(addDaysISO(todayISO, Number(offset)))}
                    className="min-h-[32px] px-2.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)]"
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)]"
            />
          </div>

          {errorMsg && <p className="text-xs font-medium text-[var(--negative)]">{errorMsg}</p>}

          <div className="sticky bottom-0 pt-2 bg-[var(--bg-card)]">
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[48px] rounded-xl bg-[var(--gold)] text-sm font-semibold text-[var(--gold-ink)] disabled:opacity-60"
            >
              {saving ? 'Salvando...' : editing ? 'Salvar nova data' : 'Programar revisão'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Concluir revisão bottom sheet */}
      <Modal
        open={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        title="Concluir revisão"
      >
        <form onSubmit={handleComplete} className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Tempo gasto (min)
              </label>
              <div className="flex items-center gap-1.5">
                {['15', '25', '40'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationStr(m)}
                    className="min-h-[32px] px-2.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)]"
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              max={600}
              value={durationStr}
              onChange={(e) => setDurationStr(e.target.value)}
              className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base font-mono-tabular text-[var(--text-main)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Como foi o domínio?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COMPREHENSION_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setComprehension(chip.value)}
                  className={`min-h-[44px] px-2 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                    comprehension === chip.value
                      ? 'border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-ink)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-app)] text-[var(--text-main)]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-[var(--text-main)] cursor-pointer py-1 min-h-[40px]">
            <input
              type="checkbox"
              checked={alsoCreateStudySession}
              onChange={(e) => setAlsoCreateStudySession(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-color)] accent-[#D4A853]"
            />
            Registrar também na lista de Estudos
          </label>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)]"
            />
          </div>

          <div className="sticky bottom-0 pt-2 bg-[var(--bg-card)]">
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[48px] rounded-xl bg-[var(--gold)] text-sm font-semibold text-[var(--gold-ink)] disabled:opacity-60"
            >
              {saving ? 'Concluindo...' : 'Concluir revisão'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir revisão"
        description="Tem certeza que deseja excluir esta revisão?"
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
};
