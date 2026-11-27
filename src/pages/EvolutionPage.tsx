import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { WeeklyBarChart } from '../components/ui/WeeklyBarChart';
import { useData } from '../contexts/DataContext';
import {
  calculateCurrentStreak,
  calculateTotalStudySeconds,
  computeAttentionSubjects,
  computeSubjectBreakdown,
  consolidateQuestionSessions,
  countDistinctStudyDays,
} from '../utils/calculations';
import { addDaysISO, formatDateBR, formatDuration } from '../utils/date';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_HEADERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const EvolutionPage: React.FC = () => {
  const { subjects, studySessions, questionSessions, reviews, todayISO } = useData();

  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');
  const [chartMetric, setChartMetric] = useState<'hours' | 'questions'>('hours');
  const [calendarMonth, setCalendarMonth] = useState(() => todayISO.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string>(todayISO);

  const totalStudySeconds = useMemo(
    () => calculateTotalStudySeconds(studySessions, reviews),
    [studySessions, reviews]
  );

  const questionMetrics = useMemo(
    () => consolidateQuestionSessions(questionSessions),
    [questionSessions]
  );

  const distinctDays = useMemo(() => countDistinctStudyDays(studySessions), [studySessions]);
  const currentStreak = useMemo(
    () => calculateCurrentStreak(studySessions, todayISO),
    [studySessions, todayISO]
  );

  const completedReviews = useMemo(
    () => reviews.filter((r) => Boolean(r.completed_at)),
    [reviews]
  );

  const subjectBreakdown = useMemo(
    () => computeSubjectBreakdown(subjects, studySessions, questionSessions, completedReviews),
    [subjects, studySessions, questionSessions, completedReviews]
  );

  const attentionAlerts = useMemo(
    () => computeAttentionSubjects(subjects, studySessions, questionSessions, todayISO),
    [subjects, studySessions, questionSessions, todayISO]
  );

  const weeklySeries = useMemo(() => {
    const [ty, tm, td] = todayISO.split('-').map(Number);
    const dt = new Date(Date.UTC(ty, tm - 1, td));
    const dayOfWeek = dt.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentWeekStart = addDaysISO(todayISO, diffToMonday);

    const rows: { key: string; label: string; hours: number; questions: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const start = addDaysISO(currentWeekStart, -i * 7);
      const end = addDaysISO(start, 6);
      const secs = studySessions
        .filter((s) => s.study_date.slice(0, 10) >= start && s.study_date.slice(0, 10) <= end)
        .reduce((acc, s) => acc + Math.max(0, s.duration_seconds), 0);
      const qs = questionSessions
        .filter((q) => q.session_date.slice(0, 10) >= start && q.session_date.slice(0, 10) <= end)
        .reduce((acc, q) => acc + q.correct_answers + q.incorrect_answers + q.blank_answers, 0);

      rows.push({
        key: start,
        label: i === 0 ? 'Atual' : `${start.slice(8, 10)}/${start.slice(5, 7)}`,
        hours: Number((secs / 3600).toFixed(1)),
        questions: qs,
      });
    }
    return rows;
  }, [studySessions, questionSessions, todayISO]);

  const monthlySeries = useMemo(() => {
    const [baseYear, baseMonth] = todayISO.slice(0, 7).split('-').map(Number);
    const rows: { key: string; label: string; hours: number; questions: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(baseYear, baseMonth - 1 - i, 1));
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const secs = studySessions
        .filter((s) => s.study_date.slice(0, 7) === ym)
        .reduce((acc, s) => acc + Math.max(0, s.duration_seconds), 0);
      const qs = questionSessions
        .filter((q) => q.session_date.slice(0, 7) === ym)
        .reduce((acc, q) => acc + q.correct_answers + q.incorrect_answers + q.blank_answers, 0);
      rows.push({
        key: ym,
        label: MONTH_NAMES[d.getUTCMonth()].slice(0, 3),
        hours: Number((secs / 3600).toFixed(1)),
        questions: qs,
      });
    }
    return rows;
  }, [studySessions, questionSessions, todayISO]);

  const dailyActivityMap = useMemo(() => {
    const map = new Map<string, { seconds: number; questions: number }>();
    for (const s of studySessions) {
      const key = s.study_date.slice(0, 10);
      const curr = map.get(key) ?? { seconds: 0, questions: 0 };
      curr.seconds += Math.max(0, s.duration_seconds);
      map.set(key, curr);
    }
    for (const q of questionSessions) {
      const key = q.session_date.slice(0, 10);
      const curr = map.get(key) ?? { seconds: 0, questions: 0 };
      curr.questions += q.correct_answers + q.incorrect_answers + q.blank_answers;
      map.set(key, curr);
    }
    return map;
  }, [studySessions, questionSessions]);

  const calendarCells = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: ({ day: number; iso: string } | null)[] = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${calendarMonth}-${String(day).padStart(2, '0')}`;
      cells.push({ day, iso });
    }
    return cells;
  }, [calendarMonth]);

  const shiftMonth = (delta: number) => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1 + delta, 1));
    setCalendarMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  const [calYear, calMonthNum] = calendarMonth.split('-').map(Number);
  const selectedDayData = dailyActivityMap.get(selectedDay);
  const activeChartRaw = chartView === 'weekly' ? weeklySeries : monthlySeries;
  const maxChartVal = Math.max(
    ...activeChartRaw.map((d) => (chartMetric === 'hours' ? d.hours : d.questions)),
    0
  );
  const chartData = activeChartRaw.map((entry, idx) => {
    const val = chartMetric === 'hours' ? entry.hours : entry.questions;
    return {
      key: entry.key,
      label: entry.label,
      value: val,
      highlight: val > 0 && (val === maxChartVal || idx === activeChartRaw.length - 1),
    };
  });
  const hasAnyData = studySessions.length > 0 || questionSessions.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Evolução"
        subtitle="Consistência, histórico e pontos de atenção."
      />

      {/* Grade de métricas consolidadas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">Total de horas</p>
          <p className="mt-1.5 tabular-nums text-2xl font-bold text-[var(--gold-text)]">
            {formatDuration(totalStudySeconds)}
          </p>
        </Card>

        <Card>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">Questões</p>
          <p className="mt-1.5 tabular-nums text-2xl font-bold text-[var(--text-main)]">
            {questionMetrics.total}
          </p>
        </Card>

        <Card>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">Acertos / Erros</p>
          <p className="mt-1.5 tabular-nums text-2xl font-bold text-[var(--positive)]">
            {questionMetrics.accuracyRate !== null ? `${questionMetrics.accuracyRate.toFixed(0)}%` : '—'}
            {questionMetrics.errorRate !== null && (
              <span className="ml-1.5 text-sm font-semibold text-[var(--negative)]">
                / {questionMetrics.errorRate.toFixed(0)}%
              </span>
            )}
          </p>
        </Card>

        <Card>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">Frequência</p>
          <p className="mt-1.5 tabular-nums text-2xl font-bold text-[var(--text-main)]">
            {distinctDays}d
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)] tabular-nums">
            Sequência: {currentStreak}d
          </p>
        </Card>
      </div>

      {!hasAnyData ? (
        <EmptyState
          icon={TrendingUp}
          title="Sem histórico para analisar ainda"
          description="Registre sessões de estudo e questões para acompanhar sua evolução."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 items-start">
          {/* Coluna esquerda: Gráfico + Disciplinas */}
          <div className="lg:col-span-7 space-y-3">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SegmentedControl
                  options={[
                    { value: 'weekly', label: 'Semanal' },
                    { value: 'monthly', label: 'Mensal' },
                  ]}
                  value={chartView}
                  onChange={setChartView}
                  ariaLabel="Periodicidade do gráfico"
                  fullWidthOnMobile={false}
                  surface="app"
                />

                <SegmentedControl
                  options={[
                    { value: 'hours', label: 'Horas' },
                    { value: 'questions', label: 'Questões' },
                  ]}
                  value={chartMetric}
                  onChange={setChartMetric}
                  ariaLabel="Métrica do gráfico"
                  fullWidthOnMobile={false}
                  surface="app"
                />
              </div>

              {maxChartVal === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--text-muted)]">
                  Sem dados para esta métrica neste período.
                </p>
              ) : (
                <WeeklyBarChart
                  data={chartData}
                  unitLabel={chartMetric === 'hours' ? 'Estudado' : 'Questões'}
                  unitSuffix={chartMetric === 'hours' ? 'h' : ''}
                  heightClass="h-44 lg:h-52"
                />
              )}
            </Card>

            {subjectBreakdown.length > 0 && (
              <Card className="space-y-2.5">
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  Por disciplina
                </h2>
                <div className="divide-y divide-[var(--border-color)]/60">
                  {subjectBreakdown.map((item) => (
                    <div
                      key={item.subjectId}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-main)] truncate">
                            {item.subjectName}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] tabular-nums">
                            {formatDuration(item.studySeconds)} · {item.questionsTotal} questões
                          </p>
                        </div>
                      </div>
                      <span className="tabular-nums text-sm font-bold text-[var(--positive)] shrink-0">
                        {item.accuracyRate !== null ? `${item.accuracyRate.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Coluna direita: Calendário + Pontos de atenção */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  {MONTH_NAMES[calMonthNum - 1]} {calYear}
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[var(--text-muted)]">
                {WEEKDAY_HEADERS.map((w, idx) => (
                  <div key={`${w}-${idx}`} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} />;
                  const activity = dailyActivityMap.get(cell.iso);
                  const studied = Boolean(activity && (activity.seconds > 0 || activity.questions > 0));
                  const isSelected = selectedDay === cell.iso;
                  const isToday = todayISO === cell.iso;

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => setSelectedDay(cell.iso)}
                      className={`min-h-[40px] rounded-xl text-xs tabular-nums font-semibold transition-all flex items-center justify-center ${
                        studied
                          ? 'bg-[var(--gold)] text-[var(--gold-ink)]'
                          : 'bg-[var(--bg-app)] text-[var(--text-muted)]'
                      } ${isSelected ? 'ring-2 ring-[var(--text-main)]' : ''} ${
                        isToday && !studied ? 'border border-[var(--gold)]' : ''
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
                <span className="tabular-nums font-medium text-[var(--text-muted)]">
                  {formatDateBR(selectedDay)}
                </span>
                <span className="tabular-nums text-[var(--text-main)]">
                  {selectedDayData
                    ? `${formatDuration(selectedDayData.seconds)} · ${selectedDayData.questions} questões`
                    : 'Sem registros'}
                </span>
              </div>
            </Card>

            {attentionAlerts.length > 0 && (
              <Card className="border-[var(--negative)]/50 space-y-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--negative)] shrink-0" />
                  <h2 className="text-sm font-bold text-[var(--text-main)]">
                    Precisam de atenção
                  </h2>
                </div>
                <div className="space-y-2">
                  {attentionAlerts.map((alert) => (
                    <div
                      key={alert.subjectId}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)]/60 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: alert.color }}
                        />
                        <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                          {alert.subjectName}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--negative)] text-right shrink-0">
                        {alert.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
