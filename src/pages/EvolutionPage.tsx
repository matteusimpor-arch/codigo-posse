import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../components/ui/EmptyState';
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

  // Calendário simplificado: mês sendo visualizado (YYYY-MM)
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

  // Série semanal (últimas 8 semanas, seg-dom)
  const weeklySeries = useMemo(() => {
    const [ty, tm, td] = todayISO.split('-').map(Number);
    const dt = new Date(Date.UTC(ty, tm - 1, td));
    const dayOfWeek = dt.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentWeekStart = addDaysISO(todayISO, diffToMonday);

    const rows: { label: string; hours: number; questions: number }[] = [];
    for (let i = 7; i >= 0; i -= 1) {
      const start = addDaysISO(currentWeekStart, -i * 7);
      const end = addDaysISO(start, 6);
      const secs = studySessions
        .filter((s) => s.study_date.slice(0, 10) >= start && s.study_date.slice(0, 10) <= end)
        .reduce((acc, s) => acc + Math.max(0, s.duration_seconds), 0);
      const qs = questionSessions
        .filter((q) => q.session_date.slice(0, 10) >= start && q.session_date.slice(0, 10) <= end)
        .reduce((acc, q) => acc + q.correct_answers + q.incorrect_answers + q.blank_answers, 0);

      rows.push({
        label: i === 0 ? 'Atual' : `${start.slice(8, 10)}/${start.slice(5, 7)}`,
        hours: Number((secs / 3600).toFixed(1)),
        questions: qs,
      });
    }
    return rows;
  }, [studySessions, questionSessions, todayISO]);

  // Série mensal (últimos 6 meses)
  const monthlySeries = useMemo(() => {
    const [baseYear, baseMonth] = todayISO.slice(0, 7).split('-').map(Number);
    const rows: { label: string; hours: number; questions: number }[] = [];
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
        label: MONTH_NAMES[d.getUTCMonth()].slice(0, 3),
        hours: Number((secs / 3600).toFixed(1)),
        questions: qs,
      });
    }
    return rows;
  }, [studySessions, questionSessions, todayISO]);

  // Mapa diário para o calendário simplificado
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
  const activeChartData = chartView === 'weekly' ? weeklySeries : monthlySeries;
  const hasAnyData = studySessions.length > 0 || questionSessions.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Evolução
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Visão consolidada de horas, questões, frequência e pontos de atenção.
        </p>
      </div>

      {/* Métricas consolidadas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total de horas</span>
            <Clock className="w-4 h-4 text-[#D4A853]" />
          </div>
          <p className="mt-2 font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {formatDuration(totalStudySeconds)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Questões</span>
            <HelpCircle className="w-4 h-4 text-[#D4A853]" />
          </div>
          <p className="mt-2 font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {questionMetrics.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Acertos / Erros</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {questionMetrics.accuracyRate !== null ? `${questionMetrics.accuracyRate.toFixed(0)}%` : '—'}
            {questionMetrics.errorRate !== null && (
              <span className="ml-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                / {questionMetrics.errorRate.toFixed(0)}%
              </span>
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Frequência</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {distinctDays}d
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
            Sequência: {currentStreak}d
          </p>
        </div>
      </div>

      {!hasAnyData ? (
        <EmptyState
          icon={TrendingUp}
          title="Sem histórico para analisar ainda"
          description="Registre sessões de estudo e baterias de questões para acompanhar sua evolução semanal, mensal e por disciplina."
        />
      ) : (
        <>
          {/* Gráfico de evolução semanal e mensal */}
          <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setChartView('weekly')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    chartView === 'weekly'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Semanal
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('monthly')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    chartView === 'monthly'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Mensal
                </button>
              </div>

              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setChartMetric('hours')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    chartMetric === 'hours'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Horas
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('questions')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    chartMetric === 'questions'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Questões
                </button>
              </div>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeChartData} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.45} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={chartMetric === 'hours'}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(212, 168, 83, 0.08)' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                    formatter={(value) => {
                      const num = Number(value ?? 0);
                      return chartMetric === 'hours'
                        ? [`${num.toLocaleString('pt-BR')}h`, 'Estudado']
                        : [`${num}`, 'Questões'];
                    }}
                  />
                  <Bar
                    dataKey={chartMetric === 'hours' ? 'hours' : 'questions'}
                    fill={chartMetric === 'hours' ? '#0F172A' : '#D4A853'}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Calendário simplificado de estudos */}
          <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#D4A853]" />
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  {MONTH_NAMES[calMonthNum - 1]} {calYear}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
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
                    className={`min-h-[38px] rounded-xl text-xs font-mono-tabular font-semibold transition-all flex items-center justify-center ${
                      studied
                        ? 'bg-[#D4A853] text-[#0F172A]'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                    } ${isSelected ? 'ring-2 ring-[#0F172A] dark:ring-white' : ''} ${
                      isToday && !studied ? 'border border-[#D4A853]' : ''
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="font-mono-tabular font-medium">{formatDateBR(selectedDay)}</span>
              <span className="font-mono-tabular">
                {selectedDayData
                  ? `${formatDuration(selectedDayData.seconds)} · ${selectedDayData.questions} questões`
                  : 'Sem registros neste dia'}
              </span>
            </div>
          </section>

          {/* Disciplinas que precisam de atenção */}
          {attentionAlerts.length > 0 && (
            <section className="rounded-2xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Disciplinas que precisam de atenção
                </h2>
              </div>
              <div className="space-y-2">
                {attentionAlerts.map((alert) => (
                  <div
                    key={alert.subjectId}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/90 dark:bg-slate-900/90 px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: alert.color }}
                      />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {alert.subjectName}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 text-right shrink-0">
                      {alert.reason}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Desempenho por disciplina */}
          {subjectBreakdown.length > 0 && (
            <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Desempenho por disciplina
              </h2>
              <div className="space-y-2.5">
                {subjectBreakdown.map((item) => (
                  <div
                    key={item.subjectId}
                    className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.subjectName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                          {formatDuration(item.studySeconds)} · {item.questionsTotal} questões
                        </p>
                      </div>
                    </div>
                    <span className="font-mono-tabular text-sm font-bold text-slate-900 dark:text-white shrink-0">
                      {item.accuracyRate !== null ? `${item.accuracyRate.toFixed(0)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
