import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { QuickRegisterModal } from '../components/QuickRegisterModal';
import { useData } from '../contexts/DataContext';
import type { PeriodPreset } from '../types/database';
import { computeDashboardSummary } from '../utils/calculations';
import { addDaysISO, formatDuration } from '../utils/date';

type HomePeriod = 'this_week' | 'this_month' | 'all_time';

const PERIOD_OPTIONS: { value: HomePeriod; label: string; subtitle: string }[] = [
  { value: 'this_week', label: 'Semana', subtitle: 'Acompanhe seu desempenho nesta semana.' },
  { value: 'this_month', label: 'Mês', subtitle: 'Acompanhe seu desempenho neste mês.' },
  { value: 'all_time', label: 'Tudo', subtitle: 'Acompanhe seu desempenho acumulado.' },
];

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const DashboardPage: React.FC = () => {
  const {
    primaryGoal,
    studySessions,
    questionSessions,
    reviews,
    todayISO,
  } = useData();

  const [period, setPeriod] = useState<HomePeriod>('this_week');
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

  // Semana atual (Seg a Dom) para o gráfico simples semanal, fiel à referência
  const weeklyChartData = useMemo(() => {
    const [ty, tm, td] = todayISO.split('-').map(Number);
    const dt = new Date(Date.UTC(ty, tm - 1, td));
    const dayOfWeek = dt.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayISO = addDaysISO(todayISO, diffToMonday);

    const rows = Array.from({ length: 7 }, (_, i) => {
      const date = addDaysISO(mondayISO, i);
      const [y, m, d] = date.split('-').map(Number);
      const wIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

      const seconds = studySessions
        .filter((s) => s.study_date.slice(0, 10) === date)
        .reduce((acc, s) => acc + Math.max(0, s.duration_seconds), 0);

      return {
        date,
        dayLabel: WEEKDAY_SHORT[wIdx],
        hours: Number((seconds / 3600).toFixed(2)),
        seconds,
      };
    });

    const maxHours = Math.max(...rows.map((r) => r.hours), 0);
    return { rows, maxHours };
  }, [studySessions, todayISO]);

  const weeklyTargetHours = primaryGoal?.weekly_study_target ?? 0;
  const totalPendingReviews = summary.reviewsOverdueNow + summary.reviewsPendingNow;
  const activeSubtitle =
    PERIOD_OPTIONS.find((p) => p.value === period)?.subtitle ||
    'Acompanhe seu desempenho nesta semana.';

  return (
    <div className="space-y-4">
      {/* Cabeçalho + alternância de período */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-main)] tracking-tight">
            Sua evolução
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {activeSubtitle}
          </p>
        </div>

        <div
          className="grid grid-cols-3 sm:inline-flex p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]"
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
              className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold transition-colors ${
                period === opt.value
                  ? 'bg-[var(--bg-app)] text-[var(--gold-text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card principal: Tempo estudado + Meta semanal */}
      <section className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/70 p-4 sm:p-5">
        <p className="text-sm text-[var(--text-muted)]">Tempo estudado</p>
        <p className="mt-1 font-mono-tabular text-3xl font-bold text-[var(--gold-text)] tracking-tight">
          {formatDuration(summary.totalStudySeconds)}
        </p>

        {weeklyTargetHours > 0 ? (
          <div className="mt-3.5 space-y-2">
            <div className="h-2.5 w-full rounded-full bg-[var(--bg-track)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--gold)] transition-all"
                style={{
                  width: `${Math.min(100, summary.weeklyHoursProgressPct ?? 0)}%`,
                }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Meta semanal de {weeklyTargetHours}{' '}
              {weeklyTargetHours === 1 ? 'hora' : 'horas'}
              {period === 'this_week' && summary.weeklyHoursProgressPct !== null
                ? ` · ${summary.weeklyHoursProgressPct}%`
                : ''}
            </p>
          </div>
        ) : (
          <Link
            to="/conta"
            className="mt-2 inline-block text-xs text-[var(--text-muted)] hover:text-[var(--gold-text)]"
          >
            Definir meta semanal no perfil
          </Link>
        )}
      </section>

      {/* Grade 2x2 de indicadores essenciais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/70 p-4">
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">Questões</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-bold text-[var(--text-main)]">
            {summary.questionMetrics.total}
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/70 p-4">
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">Aproveitamento</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-bold text-[var(--positive)]">
            {summary.questionMetrics.accuracyRate !== null
              ? `${summary.questionMetrics.accuracyRate.toFixed(0)}%`
              : '—'}
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/70 p-4">
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">Dias estudados</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-bold text-[var(--text-main)]">
            {summary.studyDaysCount} {summary.studyDaysCount === 1 ? 'dia' : 'dias'}
          </p>
        </div>

        <Link
          to="/revisoes"
          className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/70 p-4 block hover:border-[var(--gold)] transition-colors"
        >
          <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate">
            Revisões pendentes
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono-tabular text-2xl font-bold text-[var(--gold-text)]">
              {totalPendingReviews}
            </span>
            {summary.reviewsOverdueNow > 0 && (
              <span className="text-xs font-semibold text-[var(--negative)]">
                {summary.reviewsOverdueNow} atras.
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Botão dourado principal de registro rápido */}
      <button
        type="button"
        onClick={() => setQuickOpen(true)}
        className="w-full min-h-[50px] rounded-xl bg-[var(--gold)] px-5 py-3 text-base font-semibold text-[var(--gold-ink)] flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all"
      >
        <Plus className="w-5 h-5" />
        Registrar estudo
      </button>

      {/* Gráfico simples de desempenho semanal */}
      <section className="pt-1">
        <h2 className="font-display text-lg font-bold text-[var(--text-main)] mb-3">
          Desempenho semanal
        </h2>

        {weeklyChartData.maxHours === 0 ? (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/70 py-8 px-4 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Seus registros desta semana aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyChartData.rows}
                margin={{ top: 6, right: 2, left: 2, bottom: 0 }}
              >
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fontSize: 12, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(212, 168, 83, 0.08)' }}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                  formatter={(value) => {
                    const num = Number(value ?? 0);
                    return [`${num.toLocaleString('pt-BR')}h`, 'Estudado'];
                  }}
                />
                <Bar dataKey="hours" radius={[6, 6, 6, 6]} maxBarSize={36}>
                  {weeklyChartData.rows.map((entry) => {
                    const isPeakOrToday =
                      entry.hours > 0 &&
                      (entry.hours === weeklyChartData.maxHours || entry.date === todayISO);
                    return (
                      <Cell
                        key={entry.date}
                        fill={isPeakOrToday ? '#D4A853' : '#8C703B'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <QuickRegisterModal open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
};
