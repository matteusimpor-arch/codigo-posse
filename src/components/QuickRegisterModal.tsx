import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { STUDY_TYPE_LABELS, type StudyType } from '../types/database';
import { calculateQuestionMetrics } from '../utils/calculations';
import { SearchableSubjectTopicPicker } from './SearchableSubjectTopicPicker';
import { Modal } from './ui/Modal';

export type QuickTab = 'study' | 'questions';

interface QuickRegisterModalProps {
  open: boolean;
  initialTab?: QuickTab;
  prefilledMinutes?: number;
  prefilledSubjectId?: string;
  prefilledTopicId?: string;
  onSaved?: () => void;
  onClose: () => void;
}

export const QuickRegisterModal: React.FC<QuickRegisterModalProps> = ({
  open,
  initialTab = 'study',
  prefilledMinutes,
  prefilledSubjectId,
  prefilledTopicId,
  onSaved,
  onClose,
}) => {
  const {
    primaryGoal,
    subjects,
    settings,
    studySessions,
    questionSessions,
    todayISO,
    addStudySession,
    addQuestionSession,
  } = useData();

  const activeSubjects = subjects.filter((s) => !s.archived_at);
  const lastStudy = studySessions[0];
  const lastQuestion = questionSessions[0];

  const [tab, setTab] = useState<QuickTab>(initialTab);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [date, setDate] = useState(todayISO);

  // Estudo
  const [hoursStr, setHoursStr] = useState('1');
  const [minutesStr, setMinutesStr] = useState('0');
  const [studyType, setStudyType] = useState<StudyType>('teoria');
  const [scheduleReviews, setScheduleReviews] = useState(true);
  const [showStudyOptional, setShowStudyOptional] = useState(false);

  // Questões
  const [correctStr, setCorrectStr] = useState('15');
  const [incorrectStr, setIncorrectStr] = useState('5');
  const [blankStr, setBlankStr] = useState('0');
  const [examBoard, setExamBoard] = useState('');
  const [showQuestionOptional, setShowQuestionOptional] = useState(false);

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setDate(todayISO);
    setError(null);
    setSaved(false);
    setNotes('');
    setShowStudyOptional(false);
    setShowQuestionOptional(false);

    const fallbackSubject =
      prefilledSubjectId ||
      (initialTab === 'questions' ? lastQuestion?.subject_id : lastStudy?.subject_id) ||
      activeSubjects[0]?.id ||
      '';
    setSubjectId(fallbackSubject);
    setTopicId(prefilledTopicId || '');

    if (prefilledMinutes !== undefined) {
      setHoursStr(String(Math.floor(prefilledMinutes / 60)));
      setMinutesStr(String(prefilledMinutes % 60));
    } else {
      setHoursStr('1');
      setMinutesStr('0');
    }

    setExamBoard(primaryGoal?.exam_board || '');
  }, [
    open,
    initialTab,
    prefilledMinutes,
    prefilledSubjectId,
    prefilledTopicId,
    todayISO,
    lastStudy?.subject_id,
    lastQuestion?.subject_id,
    primaryGoal?.exam_board,
    activeSubjects.length,
  ]);

  const setPresetMinutes = (totalMin: number) => {
    setHoursStr(String(Math.floor(totalMin / 60)));
    setMinutesStr(String(totalMin % 60));
  };

  const qPreview = calculateQuestionMetrics({
    correct: Math.max(0, Math.trunc(Number(correctStr) || 0)),
    incorrect: Math.max(0, Math.trunc(Number(incorrectStr) || 0)),
    blank: Math.max(0, Math.trunc(Number(blankStr) || 0)),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!subjectId) {
      setError('Selecione ou crie uma disciplina.');
      return;
    }

    setSaving(true);
    try {
      if (tab === 'study') {
        const h = Math.max(0, Math.trunc(Number(hoursStr) || 0));
        const m = Math.max(0, Math.trunc(Number(minutesStr) || 0));
        const totalSeconds = h * 3600 + m * 60;
        if (totalSeconds <= 0) {
          setError('Informe um tempo maior que zero.');
          setSaving(false);
          return;
        }
        await addStudySession(
          {
            goal_id: primaryGoal?.id || null,
            subject_id: subjectId,
            topic_id: topicId || null,
            study_date: date,
            duration_seconds: totalSeconds,
            study_type: studyType,
            notes: notes.trim() || null,
          },
          {
            reviewIntervals: scheduleReviews ? settings?.review_intervals ?? [1, 7, 15, 30] : [],
          }
        );
      } else {
        const c = Number(correctStr);
        const inc = Number(incorrectStr);
        const b = Number(blankStr || '0');
        if (!Number.isInteger(c) || !Number.isInteger(inc) || !Number.isInteger(b)) {
          setError('Use apenas números inteiros.');
          setSaving(false);
          return;
        }
        if (c < 0 || inc < 0 || b < 0) {
          setError('Os valores não podem ser negativos.');
          setSaving(false);
          return;
        }
        if (c + inc + b <= 0) {
          setError('Informe pelo menos 1 questão.');
          setSaving(false);
          return;
        }
        await addQuestionSession({
          goal_id: primaryGoal?.id || null,
          subject_id: subjectId,
          topic_id: topicId || null,
          study_session_id: null,
          mock_exam_id: null,
          exam_board: examBoard.trim() || null,
          session_date: date,
          correct_answers: c,
          incorrect_answers: inc,
          blank_answers: b,
          duration_seconds: null,
          points_per_correct: 1,
          penalty_per_error: 0,
          points_per_blank: 0,
          notes: notes.trim() || null,
        });
      }

      setSaved(true);
      onSaved?.();
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar registro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registro rápido">
      <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl mb-4">
        <button
          type="button"
          onClick={() => setTab('study')}
          className={`min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'study'
              ? 'bg-[var(--bg-card)] text-[var(--gold-text)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Estudo
        </button>
        <button
          type="button"
          onClick={() => setTab('questions')}
          className={`min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'questions'
              ? 'bg-[var(--bg-card)] text-[var(--gold-text)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          Questões
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <SearchableSubjectTopicPicker
          subjectId={subjectId}
          topicId={topicId}
          onChangeSubject={setSubjectId}
          onChangeTopic={setTopicId}
        />

        {tab === 'study' ? (
          <>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  Tempo estudado *
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    ['30m', 30],
                    ['1h', 60],
                    ['1h30', 90],
                    ['2h', 120],
                  ].map(([label, mins]) => (
                    <button
                      key={String(label)}
                      type="button"
                      onClick={() => setPresetMinutes(Number(mins))}
                      className="min-h-[32px] px-2.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={0}
                    max={24}
                    value={hoursStr}
                    onChange={(e) => setHoursStr(e.target.value)}
                    className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 pr-14 py-2.5 text-base font-mono-tabular text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
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
                    value={minutesStr}
                    onChange={(e) => setMinutesStr(e.target.value)}
                    className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 pr-12 py-2.5 text-base font-mono-tabular text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-main)] cursor-pointer py-1 min-h-[40px]">
              <input
                type="checkbox"
                checked={scheduleReviews}
                onChange={(e) => setScheduleReviews(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-color)] accent-[#D4A853]"
              />
              Programar revisões ({(settings?.review_intervals ?? [1, 7, 15, 30]).join(', ')} dias)
            </label>

            <div>
              <button
                type="button"
                onClick={() => setShowStudyOptional((v) => !v)}
                className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                {showStudyOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Modalidade e observações (opcional)
              </button>

              {showStudyOptional && (
                <div className="mt-2.5 space-y-3 pt-3 border-t border-[var(--border-color)]">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Modalidade
                    </label>
                    <select
                      value={studyType}
                      onChange={(e) => setStudyType(e.target.value as StudyType)}
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
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anotações curtas..."
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
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
                  className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base font-mono-tabular font-semibold text-[var(--positive)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
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
                  className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base font-mono-tabular font-semibold text-[var(--negative)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)]"
              />
            </div>

            {qPreview.total > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)] px-3.5 py-2.5 text-xs font-mono-tabular">
                <span>
                  Total: <strong>{qPreview.total}</strong>
                </span>
                <span className="font-semibold text-[var(--positive)]">
                  {qPreview.accuracyRate?.toFixed(0)}% acertos
                </span>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowQuestionOptional((v) => !v)}
                className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                {showQuestionOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Em branco, banca e observações (opcional)
              </button>

              {showQuestionOptional && (
                <div className="mt-2.5 space-y-3 pt-3 border-t border-[var(--border-color)]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                        Em branco
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={0}
                        value={blankStr}
                        onChange={(e) => setBlankStr(e.target.value)}
                        className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-base font-mono-tabular text-[var(--text-main)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                        Banca
                      </label>
                      <input
                        type="text"
                        value={examBoard}
                        onChange={(e) => setExamBoard(e.target.value)}
                        placeholder="Ex: Cebraspe"
                        className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-base text-[var(--text-main)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Observações
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-base text-[var(--text-main)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="text-xs font-medium text-[var(--negative)]" role="alert">
            {error}
          </p>
        )}

        {saved && (
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--positive)]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvo com sucesso.</span>
          </div>
        )}

        <div className="sticky bottom-0 pt-2 bg-[var(--bg-card)]">
          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] rounded-xl bg-[var(--gold)] text-sm font-semibold text-[var(--gold-ink)] hover:opacity-95 transition-opacity disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar registro'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
