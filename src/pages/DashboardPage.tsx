import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Calendar, CheckCircle2, Clock, HelpCircle, Plus, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { QuickRegisterModal } from '../components/QuickRegisterModal';
import { useData } from '../contexts/DataContext';
import type { PeriodPreset } from '../types/database';
import { computeDashboardSummary } from '../utils/calculations';
import { addDaysISO, formatDuration, isDateInRange } from '../utils/date';

type HomePeriod = 'this_week' | 'this_month' | 'all_time';

const PERIOD_OPTIONS: { value: HomePeriod; label: string }[] = [
  { value: 'this_week', label: 'Semana' },
  { value: 'this_month', label: 'Mês' },
  { value: 'all_time', label: 'Tudo' },
];

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const DashboardPage: React.FC = () => {
  const {
    profile,
    primaryGoal,
    studySessions,
    questionSessions,
    reviews,
    todayISO,
  } = useData();

  const [period, setPeriod] = useState<HomePeriod>('this_week');
  const [chartMetric, setChartMetric] = useState<'hours' | 'questions'>('hours');
  const [quickOpen, setQuickOpen] = useState(false);

  const summary = useMemo(
    () =>
      computeDashboardSummary(
        studySessions,
        questionSessions,
        reviews,
        [],
        primaryGoal,
        {
          period: period as PeriodPreset,
          goalId: 'all',
          subjectId: 'all',
        },
        todayISO
      ),
    [studySessions, questionSessions, reviews, primaryGoal, period, todayISO]
  );

  // Últimos 7 dias (incluindo hoje) para o gráfico semanal simples
  const weeklyChartData = useMemo(() => {
    const days: {
      date: string;
      dayLabel: string;
      hours: number;
      questions: number;
    }[] = [];

    for (let offset = -6; offset <= 0; offset += 1) {
      const date = addDaysISO(todayISO, offset);
      const [y, m, d] = date.split('-').map(Number);
      const weekdayIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

      const daySeconds = studySessions
        .filter((s) => s.study_date.slice(0, 10) === date)
        .reduce((acc, s) => acc + Math.max(0, s.duration_seconds), 0);

      const dayQuestions = questionSessions
        .filter((q) => q.session_date.slice(0, 10) === date)
        .reduce((acc, q) => acc + q.correct_answers + q.incorrect_answers + q.blank_answers, 0);

      days.push({
        date,
        dayLabel: offset === 0 ? 'Hoje' : WEEKDAY_SHORT[weekdayIdx],
        hours: Number((daySeconds / 3600).toFixed(2)),
        questions: dayQuestions,
      });
    }

    return days;
  }, [studySessions, questionSessions, todayISO]);

  // Se houver meta semanal definida no objetivo principal, exibe o progresso
  const hasWeeklyTargets =
    Boolean(primaryGoal) &&
    ((primaryGoal?.weekly_study_target ?? 0) > 0 || (primaryGoal?.weekly_question_target ?? 0) > 0);

  const totalPendingReviews = summary.reviewsOverdueNow + summary.reviewsPendingNow;
  const firstName = profile?.full_name?.trim().split(' ')[0];

  const hasAnyWeeklyActivity = useMemo(
    () =>
      weeklyChartData.some((d) => d.hours > 0 || d.questions > 0) &&
      studySessions.some((s) => isDateInRange(s.study_date, addDaysISO(todayISO, -6), todayISO)) ||
      questionSessions.some((q) => isDateInRange(q.session_date, addDaysISO(todayISO, -6), todayISO)),
    [weeklyChartData, studySessions, questionSessions, todayISO]
  );

  return (
    <div className="space-y-5">
      {/* Cabeçalho minimalista + Toggle de período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {firstName ? `Olá, ${firstName}` : 'Início'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {primaryGoal?.exam_name || primaryGoal?.area || 'Estratégia. Disciplina. Aprovação.'}
          </p>
        </div>

        <div
          className="grid grid-cols-3 sm:inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90"
          role="tablist"
          aria-label="Período"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={period === opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`min-h-[38px] px-4 rounded-lg text-xs font-semibold transition-colors ${
                period === opt.value
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Botão principal de registro rápido (fácil alcance no celular) */}
      <button
        type="button"
        onClick={() => setQuickOpen(true)}
        className="w-full min-h-[52px] rounded-2xl bg-[#0F172A] dark:bg-[#D4A853] px-5 py-3.5 text-sm font-semibold text-white dark:text-[#0F172A] flex items-center justify-center gap-2.5 shadow-xs hover:opacity-95 active:scale-[0.99] transition-all"
      >
        <Plus className="w-5 h-5" />
        Registrar estudo ou questões
      </button>

      {/* Indicadores essenciais (somente os solicitados) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Horas estudadas</span>
            <Clock className="w-4 h-4 text-[#D4A853]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
            {formatDuration(summary.totalStudySeconds)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Dias estudados</span>
            <Calendar className="w-4 h-4 text-[#D4A853]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
            {summary.studyDaysCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Questões</span>
            <HelpCircle className="w-4 h-4 text-[#D4A853]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
            {summary.questionMetrics.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Taxa de acertos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
            {summary.questionMetrics.accuracyRate !== null
              ? `${summary.questionMetrics.accuracyRate.toFixed(0)}%`
              : '—'}
          </p>
        </div>
      </div>

      {/* Revisões pendentes */}
      <Link
        to="/revisoes"
        className="flex items-center justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors min-h-[56px]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5 text-[#B8892E] dark:text-[#D4A853]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Revisões pendentes
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {totalPendingReviews === 0
                ? 'Tudo em dia'
                : summary.reviewsOverdueNow > 0
                ? `${summary.reviewsOverdueNow} atrasada${summary.reviewsOverdueNow > 1 ? 's' : ''} · ${summary.reviewsTodayNow} para hoje`
                : `${summary.reviewsTodayNow} para hoje · ${totalPendingReviews} programada${totalPendingReviews > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`font-mono-tabular text-lg font-bold ${
              summary.reviewsOverdueNow > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {totalPendingReviews}
          </span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </Link>

      {/* Progresso da meta semanal */}
      {hasWeeklyTargets && primaryGoal && (
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Progresso da meta semanal
            </h2>
            <Link
              to="/conta"
              className="text-xs font-medium text-[#9A7223] dark:text-[#E5C478] hover:underline"
            >
              Ajustar
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {primaryGoal.weekly_study_target > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Horas na semana
                  </span>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    {summary.weeklyHoursDone.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h /{' '}
                    {primaryGoal.weekly_study_target}h
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0F172A] dark:bg-[#D4A853] transition-all"
                    style={{
                      width: `${Math.min(100, summary.weeklyHoursProgressPct ?? 0)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {primaryGoal.weekly_question_target > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Questões na semana
                  </span>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    {summary.weeklyQuestionsDone} / {primaryGoal.weekly_question_target}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#D4A853] transition-all"
                    style={{
                      width: `${Math.min(100, summary.weeklyQuestionsProgressPct ?? 0)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Gráfico simples de desempenho semanal */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Desempenho semanal
          </h2>
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setChartMetric('hours')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
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
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                chartMetric === 'questions'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Questões
            </button>
          </div>
        </div>

        {!hasAnyWeeklyActivity ? (
          <div className="py-10 text-center space-y-2">
            <BookOpen className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Seus estudos e questões dos últimos 7 dias aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.45} />
                <XAxis
                  dataKey="dayLabel"
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
        )}
      </section>

      <QuickRegisterModal open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
};
