import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { STUDY_TYPE_LABELS, type StudyType } from '../types/database';
import { calculateQuestionMetrics } from '../utils/calculations';
import { SearchableSubjectTopicPicker } from './SearchableSubjectTopicPicker';
import { Button } from './ui/Button';
import { FieldLabel, Input, Select, Textarea } from './ui/Field';
import { Modal } from './ui/Modal';
import { SegmentedControl } from './ui/SegmentedControl';

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
      <div className="mb-4">
        <SegmentedControl
          ariaLabel="Tipo de registro"
          surface="app"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'study', label: 'Estudo' },
            { value: 'questions', label: 'Questões' },
          ]}
        />
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
                <FieldLabel className="!mb-0">Tempo estudado *</FieldLabel>
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
                      className="min-h-[32px] px-2.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] tabular-nums"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={0}
                    max={24}
                    value={hoursStr}
                    onChange={(e) => setHoursStr(e.target.value)}
                    className="!pr-14 tabular-nums"
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
                    value={minutesStr}
                    onChange={(e) => setMinutesStr(e.target.value)}
                    className="!pr-12 tabular-nums"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                    min
                  </span>
                </div>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="quick-study-date">Data</FieldLabel>
              <Input
                id="quick-study-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-main)] cursor-pointer py-1 min-h-[40px] tabular-nums">
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
                {showStudyOptional ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Modalidade e observações (opcional)
              </button>

              {showStudyOptional && (
                <div className="mt-2.5 space-y-3 pt-3 border-t border-[var(--border-color)]">
                  <div>
                    <FieldLabel htmlFor="quick-study-type">Modalidade</FieldLabel>
                    <Select
                      id="quick-study-type"
                      value={studyType}
                      onChange={(e) => setStudyType(e.target.value as StudyType)}
                    >
                      {(Object.keys(STUDY_TYPE_LABELS) as StudyType[]).map((k) => (
                        <option key={k} value={k}>
                          {STUDY_TYPE_LABELS[k]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="quick-study-notes">Observações</FieldLabel>
                    <Textarea
                      id="quick-study-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anotações curtas..."
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
                <FieldLabel htmlFor="quick-correct">Acertos *</FieldLabel>
                <Input
                  id="quick-correct"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  step={1}
                  value={correctStr}
                  onChange={(e) => setCorrectStr(e.target.value)}
                  required
                  className="tabular-nums font-semibold !text-[var(--positive)]"
                />
              </div>
              <div>
                <FieldLabel htmlFor="quick-incorrect">Erros *</FieldLabel>
                <Input
                  id="quick-incorrect"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  step={1}
                  value={incorrectStr}
                  onChange={(e) => setIncorrectStr(e.target.value)}
                  required
                  className="tabular-nums font-semibold !text-[var(--negative)]"
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="quick-q-date">Data</FieldLabel>
              <Input
                id="quick-q-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {qPreview.total > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)] px-3.5 py-2.5 text-xs tabular-nums">
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
                {showQuestionOptional ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Em branco, banca e observações (opcional)
              </button>

              {showQuestionOptional && (
                <div className="mt-2.5 space-y-3 pt-3 border-t border-[var(--border-color)]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel htmlFor="quick-blank">Em branco</FieldLabel>
                      <Input
                        id="quick-blank"
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
                      <FieldLabel htmlFor="quick-board">Banca</FieldLabel>
                      <Input
                        id="quick-board"
                        type="text"
                        value={examBoard}
                        onChange={(e) => setExamBoard(e.target.value)}
                        placeholder="Ex: Cebraspe"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor="quick-q-notes">Observações</FieldLabel>
                    <Textarea
                      id="quick-q-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
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
          <Button type="submit" fullWidth disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar registro'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
