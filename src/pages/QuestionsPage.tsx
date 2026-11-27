import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, ListChecks, Plus, Trash2 } from 'lucide-react';
import { SearchableSubjectTopicPicker } from '../components/SearchableSubjectTopicPicker';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { FieldLabel, Input, Select, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
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

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionSession | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [correctStr, setCorrectStr] = useState('15');
  const [incorrectStr, setIncorrectStr] = useState('5');
  const [sessionDate, setSessionDate] = useState(todayISO);

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
    <div className="space-y-4">
      <PageHeader
        title="Questões"
        subtitle="Acompanhe acertos, erros e aproveitamento."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 items-start">
        {/* Coluna esquerda: Resumo + CTA principal */}
        <div className="lg:col-span-5 space-y-3">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <Card padding="sm" className="sm:p-4">
              <p className="text-xs text-[var(--text-muted)]">Total</p>
              <p className="mt-1 tabular-nums text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                {consolidated.total}
              </p>
            </Card>
            <Card padding="sm" className="sm:p-4">
              <p className="text-xs text-[var(--text-muted)]">Acertos</p>
              <p className="mt-1 tabular-nums text-xl sm:text-2xl font-bold text-[var(--positive)]">
                {consolidated.accuracyRate !== null ? `${consolidated.accuracyRate.toFixed(0)}%` : '—'}
              </p>
            </Card>
            <Card padding="sm" className="sm:p-4">
              <p className="text-xs text-[var(--text-muted)]">Erros</p>
              <p className="mt-1 tabular-nums text-xl sm:text-2xl font-bold text-[var(--negative)]">
                {consolidated.errorRate !== null ? `${consolidated.errorRate.toFixed(0)}%` : '—'}
              </p>
            </Card>
          </div>

          <Button
            type="button"
            fullWidth
            onClick={openCreate}
            className="min-h-[50px] text-base"
          >
            <Plus className="w-5 h-5" />
            Registrar questões
          </Button>
        </div>

        {/* Coluna direita: Abas, filtro e listagem */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <SegmentedControl
              options={[
                { value: 'history', label: 'Histórico' },
                { value: 'subject', label: 'Por disciplina' },
              ]}
              value={tab}
              onChange={setTab}
              ariaLabel="Visualização de questões"
            />

            {subjects.length > 0 && (
              <Select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                aria-label="Filtrar por disciplina"
                className="sm:w-auto min-h-[44px] bg-[var(--bg-card)] py-1.5"
              >
                <option value="all">Todas as disciplinas</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Nenhuma bateria registrada"
              description="Registre seus acertos e erros para calcular seu aproveitamento automaticamente."
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
                  <Card key={q.id} padding="sm" className="px-4 flex items-start justify-between gap-3">
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
                          <span className="tabular-nums font-bold text-[var(--text-main)]">
                            {m.accuracyRate?.toFixed(0)}%
                          </span>
                          <span className="tabular-nums text-[var(--positive)]">
                            {m.correct} acertos
                          </span>
                          <span className="tabular-nums text-[var(--negative)]">
                            {m.incorrect} erros
                          </span>
                          {m.blank > 0 && (
                            <span className="tabular-nums text-[var(--text-muted)]">
                              {m.blank} br
                            </span>
                          )}
                          <span aria-hidden="true" className="text-[var(--border-color)]">·</span>
                          <span className="tabular-nums text-[var(--text-muted)]">
                            {formatDateBR(q.session_date)}
                          </span>
                          {q.exam_board && (
                            <>
                              <span aria-hidden="true" className="text-[var(--border-color)]">·</span>
                              <span className="text-[var(--text-muted)]">{q.exam_board}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(q)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        aria-label="Editar registro"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(q)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--negative)]"
                        aria-label="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5">
              {bySubject.map((item) => {
                const acc = item.metrics.accuracyRate ?? 0;
                return (
                  <Card key={item.subjectId} className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.subject?.color || '#D4A853' }}
                        />
                        <span className="text-sm font-semibold text-[var(--text-main)] truncate">
                          {item.subject?.name || 'Disciplina'}
                        </span>
                      </div>
                      <span className="tabular-nums text-base font-bold text-[var(--positive)] shrink-0">
                        {item.metrics.accuracyRate !== null ? `${item.metrics.accuracyRate.toFixed(0)}%` : '—'}
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-[var(--bg-track)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--gold)] transition-all"
                        style={{ width: `${Math.min(100, acc)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] tabular-nums">
                      <span>{item.metrics.total} questões</span>
                      <span>
                        <strong className="text-[var(--positive)]">{item.metrics.correct}</strong> acertos ·{' '}
                        <strong className="text-[var(--negative)]">{item.metrics.incorrect}</strong> erros
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
              <FieldLabel>Acertos *</FieldLabel>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                step={1}
                value={correctStr}
                onChange={(e) => setCorrectStr(e.target.value)}
                required
                className="tabular-nums font-semibold text-[var(--positive)]"
              />
            </div>

            <div>
              <FieldLabel>Erros *</FieldLabel>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                step={1}
                value={incorrectStr}
                onChange={(e) => setIncorrectStr(e.target.value)}
                required
                className="tabular-nums font-semibold text-[var(--negative)]"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Data</FieldLabel>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </div>

          {previewMetrics && previewMetrics.total > 0 && (
            <div className="rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)] px-3.5 py-2.5 flex items-center justify-between text-xs tabular-nums">
              <span>
                Total: <strong>{previewMetrics.total}</strong>
              </span>
              <span className="text-[var(--positive)] font-semibold">
                {previewMetrics.accuracyRate?.toFixed(0)}% acertos
              </span>
              <span className="text-[var(--negative)] font-semibold">
                {previewMetrics.errorRate?.toFixed(0)}% erros
              </span>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Em branco, banca e observações (opcional)
            </button>

            {showOptional && (
              <div className="mt-2.5 space-y-3 pt-3 border-t border-[var(--border-color)]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Em branco</FieldLabel>
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={0}
                      value={blankStr}
                      onChange={(e) => setBlankStr(e.target.value)}
                      className="tabular-nums"
                    />
                  </div>
                  <div>
                    <FieldLabel>Banca</FieldLabel>
                    <Input
                      type="text"
                      value={examBoard}
                      onChange={(e) => setExamBoard(e.target.value)}
                      placeholder="Ex: Cebraspe"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Observações</FieldLabel>
                  <Textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {errorMsg && <p className="text-xs font-medium text-[var(--negative)]">{errorMsg}</p>}

          <div className="sticky bottom-0 pt-2 bg-[var(--bg-card)]">
            <Button type="submit" fullWidth disabled={saving} className="min-h-[48px]">
              {saving ? 'Salvando...' : 'Salvar registro'}
            </Button>
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
