import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { SearchableSubjectTopicPicker } from '../components/SearchableSubjectTopicPicker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useData } from '../contexts/DataContext';
import type { QuestionSession } from '../types/database';
import { calculateQuestionMetrics, consolidateQuestionSessions } from '../utils/calculations';
import { formatDateBR } from '../utils/date';

type ViewTab = 'history' | 'subject';

export const QuestionsPage: React.FC = () => {
  const {
    primaryGoal,
    subjects,
    topics,
    questionSessions,
    todayISO,
    addQuestionSession,
    editQuestionSession,
    removeQuestionSession,
  } = useData();

  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived_at), [subjects]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const [tab, setTab] = useState<ViewTab>('history');
  const [filterSubject, setFilterSubject] = useState('all');

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionSession | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [correctStr, setCorrectStr] = useState('15');
  const [incorrectStr, setIncorrectStr] = useState('5');
  const [sessionDate, setSessionDate] = useState(todayISO);

  // Optional collapsed fields
  const [showOptional, setShowOptional] = useState(false);
  const [blankStr, setBlankStr] = useState('0');
  const [examBoard, setExamBoard] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuestionSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredSessions = useMemo(() => {
    return questionSessions
      .filter((q) => (filterSubject === 'all' ? true : q.subject_id === filterSubject))
      .sort((a, b) => b.session_date.localeCompare(a.session_date) || b.created_at.localeCompare(a.created_at));
  }, [questionSessions, filterSubject]);

  const consolidated = useMemo(
    () => consolidateQuestionSessions(filteredSessions),
    [filteredSessions]
  );

  const bySubject = useMemo(() => {
    const groups = new Map<string, QuestionSession[]>();
    for (const q of filteredSessions) {
      const list = groups.get(q.subject_id) ?? [];
      list.push(q);
      groups.set(q.subject_id, list);
    }
    return Array.from(groups.entries())
      .map(([subjId, list]) => ({
        subjectId: subjId,
        subject: subjectMap.get(subjId),
        metrics: consolidateQuestionSessions(list),
      }))
      .sort((a, b) => b.metrics.total - a.metrics.total);
  }, [filteredSessions, subjectMap]);

  const previewMetrics = useMemo(() => {
    const c = Number(correctStr);
    const inc = Number(incorrectStr);
    const b = Number(blankStr || '0');
    if (
      !Number.isInteger(c) ||
      !Number.isInteger(inc) ||
      !Number.isInteger(b) ||
      c < 0 ||
      inc < 0 ||
      b < 0
    ) {
      return null;
    }
    return calculateQuestionMetrics({ correct: c, incorrect: inc, blank: b });
  }, [correctStr, incorrectStr, blankStr]);

  const openCreate = () => {
    setEditing(null);
    setErrorMsg(null);
    const last = questionSessions[0];
    setSubjectId(last?.subject_id || activeSubjects[0]?.id || '');
    setTopicId('');
    setCorrectStr('15');
    setIncorrectStr('5');
    setSessionDate(todayISO);
    setBlankStr('0');
    setExamBoard(primaryGoal?.exam_board || '');
    setNotes('');
    setShowOptional(false);
    setModalOpen(true);
  };

  const openEdit = (q: QuestionSession) => {
    setEditing(q);
    setErrorMsg(null);
    setSubjectId(q.subject_id);
    setTopicId(q.topic_id || '');
    setCorrectStr(String(q.correct_answers));
    setIncorrectStr(String(q.incorrect_answers));
    setSessionDate(q.session_date.slice(0, 10));
    setBlankStr(String(q.blank_answers));
    setExamBoard(q.exam_board || '');
    setNotes(q.notes || '');
    setShowOptional(Boolean(q.blank_answers > 0 || q.exam_board || q.notes));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!subjectId) {
      setErrorMsg('Selecione ou crie uma disciplina.');
      return;
    }

    const correct = Number(correctStr);
    const incorrect = Number(incorrectStr);
    const blank = Number(blankStr || '0');

    if (!Number.isInteger(correct) || !Number.isInteger(incorrect) || !Number.isInteger(blank)) {
      setErrorMsg('Informe apenas números inteiros.');
      return;
    }
    if (correct < 0 || incorrect < 0 || blank < 0) {
      setErrorMsg('Os valores não podem ser negativos.');
      return;
    }
    if (correct + incorrect + blank <= 0) {
      setErrorMsg('Informe pelo menos 1 questão.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        goal_id: editing ? editing.goal_id : primaryGoal?.id || null,
        subject_id: subjectId,
        topic_id: topicId || null,
        study_session_id: editing?.study_session_id ?? null,
        mock_exam_id: editing?.mock_exam_id ?? null,
        exam_board: examBoard.trim() || null,
        session_date: sessionDate,
        correct_answers: correct,
        incorrect_answers: incorrect,
        blank_answers: blank,
        duration_seconds: editing?.duration_seconds ?? null,
        points_per_correct: editing?.points_per_correct ?? 1,
        penalty_per_error: editing?.penalty_per_error ?? 0,
        points_per_blank: editing?.points_per_blank ?? 0,
        notes: notes.trim() || null,
      };

      if (editing) {
        await editQuestionSession(editing.id, payload);
      } else {
        await addQuestionSession(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeQuestionSession(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Questões
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe acertos, erros e taxa por disciplina.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] dark:bg-[#D4A853] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white dark:text-[#0F172A] hover:opacity-90 active:scale-[0.99] transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar
        </button>
      </div>

      {/* Resumo consolidado */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Total</p>
          <p className="mt-1 font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {consolidated.total}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Acertos</p>
          <p className="mt-1 font-mono-tabular text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {consolidated.accuracyRate !== null ? `${consolidated.accuracyRate.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Erros</p>
          <p className="mt-1 font-mono-tabular text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
            {consolidated.errorRate !== null ? `${consolidated.errorRate.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Abas Histórico / Por disciplina + Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90">
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`min-h-[38px] px-4 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'history'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Histórico
          </button>
          <button
            type="button"
            onClick={() => setTab('subject')}
            className={`min-h-[38px] px-4 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'subject'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Por disciplina
          </button>
        </div>

        {subjects.length > 0 && (
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            aria-label="Filtrar por disciplina"
            className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100"
          >
            <option value="all">Todas as disciplinas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {filteredSessions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Nenhuma bateria registrada"
          description="Registre seus acertos e erros para calcular seu aproveitamento automaticamente."
          actionLabel="Registrar questões"
          onAction={openCreate}
        />
      ) : tab === 'history' ? (
        <div className="space-y-2.5">
          {filteredSessions.map((q) => {
            const subj = subjectMap.get(q.subject_id);
            const top = q.topic_id ? topicMap.get(q.topic_id) : null;
            const m = calculateQuestionMetrics({
              correct: q.correct_answers,
              incorrect: q.incorrect_answers,
              blank: q.blank_answers,
            });

            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: subj?.color || '#D4A853' }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {subj?.name || 'Disciplina'}
                    </p>
                    {top && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {top.name}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                        {m.accuracyRate?.toFixed(0)}%
                      </span>
                      <span className="font-mono-tabular text-emerald-700 dark:text-emerald-400">
                        {m.correct} acertos
                      </span>
                      <span className="font-mono-tabular text-red-600 dark:text-red-400">
                        {m.incorrect} erros
                      </span>
                      {m.blank > 0 && (
                        <span className="font-mono-tabular text-slate-400">
                          {m.blank} br
                        </span>
                      )}
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                        {formatDateBR(q.session_date)}
                      </span>
                      {q.exam_board && (
                        <>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-slate-500 dark:text-slate-400">{q.exam_board}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(q)}
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Editar registro"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(q)}
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    aria-label="Excluir registro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {bySubject.map((item) => {
            const acc = item.metrics.accuracyRate ?? 0;
            return (
              <div
                key={item.subjectId}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.subject?.color || '#D4A853' }}
                    />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {item.subject?.name || 'Disciplina'}
                    </span>
                  </div>
                  <span className="font-mono-tabular text-base font-bold text-slate-900 dark:text-white shrink-0">
                    {item.metrics.accuracyRate !== null ? `${item.metrics.accuracyRate.toFixed(1)}%` : '—'}
                  </span>
                </div>

                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, acc)}%`,
                      backgroundColor: item.subject?.color || '#D4A853',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                  <span>{item.metrics.total} questões</span>
                  <span>
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {item.metrics.correct}
                    </strong>{' '}
                    acertos ·{' '}
                    <strong className="text-red-600 dark:text-red-400">
                      {item.metrics.incorrect}
                    </strong>{' '}
                    erros ({item.metrics.errorRate?.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de criação / edição */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar questões' : 'Registrar questões'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSubjectTopicPicker
            subjectId={subjectId}
            topicId={topicId}
            onChangeSubject={setSubjectId}
            onChangeTopic={setTopicId}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Acertos *
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                step={1}
                value={correctStr}
                onChange={(e) => setCorrectStr(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-base font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Erros *
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                step={1}
                value={incorrectStr}
                onChange={(e) => setIncorrectStr(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-base font-mono-tabular font-semibold text-red-600 dark:text-red-400 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Data
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
            />
          </div>

          {previewMetrics && previewMetrics.total > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between text-xs font-mono-tabular">
              <span>
                Total: <strong>{previewMetrics.total}</strong>
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                {previewMetrics.accuracyRate?.toFixed(1)}% acertos
              </span>
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {previewMetrics.errorRate?.toFixed(1)}% erros
              </span>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-1"
            >
              {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Em branco, banca e observações (opcional)
            </button>

            {showOptional && (
              <div className="mt-2.5 space-y-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Em branco</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={0}
                      value={blankStr}
                      onChange={(e) => setBlankStr(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Banca</label>
                    <input
                      type="text"
                      value={examBoard}
                      onChange={(e) => setExamBoard(e.target.value)}
                      placeholder="Ex: Cebraspe"
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Observações</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {errorMsg && <p className="text-xs font-medium text-red-600">{errorMsg}</p>}

          <div className="sticky bottom-0 pt-2 bg-white dark:bg-slate-900">
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[48px] rounded-xl bg-[#0F172A] dark:bg-[#D4A853] text-sm font-semibold text-white dark:text-[#0F172A] disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar registro'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir questões"
        description="Tem certeza que deseja excluir este lançamento?"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </div>
  );
};
