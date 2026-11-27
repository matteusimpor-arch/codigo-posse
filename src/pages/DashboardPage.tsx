import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QuickRegisterModal } from '../components/QuickRegisterModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { WeeklyBarChart } from '../components/ui/WeeklyBarChart';
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
        key: date,
        label: WEEKDAY_SHORT[wIdx],
        value: Number((seconds / 3600).toFixed(2)),
        date,
      };
    });

    const maxHours = Math.max(...rows.map((r) => r.value), 0);
    return {
      maxHours,
      rows: rows.map((r) => ({
        key: r.key,
        label: r.label,
        value: r.value,
        highlight: r.value > 0 && (r.value === maxHours || r.date === todayISO),
      })),
    };
  }, [studySessions, todayISO]);

  const weeklyTargetHours = primaryGoal?.weekly_study_target ?? 0;
  const weeklyQuestionTarget = primaryGoal?.weekly_question_target ?? 0;
  const totalPendingReviews = summary.reviewsOverdueNow + summary.reviewsPendingNow;
  const activeSubtitle =
    PERIOD_OPTIONS.find((p) => p.value === period)?.subtitle ||
    'Acompanhe seu desempenho nesta semana.';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sua evolução"
        subtitle={activeSubtitle}
        rightSlot={
          <SegmentedControl
            options={PERIOD_OPTIONS.map(({ value, label }) => ({ value, label }))}
            value={period}
            onChange={setPeriod}
            ariaLabel="Período"
          />
        }
      />

      {/* Mobile: 1 coluna fiel à sequência da referência; Desktop: 2 colunas proporcionais */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 items-start">
        {/* Coluna esquerda: Tempo estudado + 4 indicadores + Botão dourado Registrar estudo */}
        <div className="lg:col-span-6 space-y-3">
          <Card padding="lg">
            <p className="text-sm text-[var(--text-muted)]">Tempo estudado</p>
            <p className="mt-1 tabular-nums text-3xl font-bold text-[var(--gold-text)] tracking-tight">
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
                <p className="text-xs text-[var(--text-muted)] tabular-nums">
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
          </Card>

          {/* 4 indicadores sem ícones decorativos, fonte Inter tabular */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">Questões</p>
              <p className="mt-1.5 tabular-nums text-2xl font-bold text-[var(--text-main)]">
                {summary.questionMetrics.total}
              </p>
            </Card>

            <Card>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">Aproveitamento</p>
              <p className="mt-1.5 tabular-nums text-2xl font-bold text-[var(--positive)]">
                {summary.questionMetrics.accuracyRate !== null
                  ? `${summary.questionMetrics.accuracyRate.toFixed(0)}%`
                  : '—'}
              </p>
            </Card>

            <Card>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">Dias estudados</p>
              <p className="mt-1.5 tabular-nums text-2xl font-bold text-[var(--text-main)]">
                {summary.studyDaysCount} {summary.studyDaysCount === 1 ? 'dia' : 'dias'}
              </p>
            </Card>

            <Link
              to="/revisoes"
              className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/70 p-4 block hover:border-[var(--gold)] transition-colors"
            >
              <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate">
                Revisões pendentes
              </p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="tabular-nums text-2xl font-bold text-[var(--gold-text)]">
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

          <Button
            type="button"
            fullWidth
            onClick={() => setQuickOpen(true)}
            className="min-h-[50px] text-base"
          >
            <Plus className="w-5 h-5" />
            Registrar estudo
          </Button>
        </div>

        {/* Coluna direita: Gráfico de desempenho semanal + info complementar essencial */}
        <div className="lg:col-span-6 space-y-3">
          <section className="pt-1 lg:pt-0 lg:rounded-2xl lg:bg-[var(--bg-card)] lg:border lg:border-[var(--border-color)]/70 lg:p-5">
            <h2 className="text-lg font-bold text-[var(--text-main)] mb-3">
              Desempenho semanal
            </h2>

            {weeklyChartData.maxHours === 0 ? (
              <div className="rounded-2xl bg-[var(--bg-card)] lg:bg-[var(--bg-app)] border border-[var(--border-color)]/70 py-10 px-4 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  Seus registros desta semana aparecerão aqui.
                </p>
              </div>
            ) : (
              <WeeklyBarChart
                data={weeklyChartData.rows}
                unitLabel="Estudado"
                unitSuffix="h"
                heightClass="h-44 lg:h-60"
              />
            )}
          </section>

          {weeklyQuestionTarget > 0 && (
            <Card className="hidden lg:block">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                <span>Meta semanal de questões</span>
                <span className="tabular-nums font-semibold text-[var(--text-main)]">
                  {summary.questionMetrics.total} / {weeklyQuestionTarget}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--bg-track)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--gold)] transition-all"
                  style={{
                    width: `${Math.min(100, summary.weeklyQuestionsProgressPct ?? 0)}%`,
                  }}
                />
              </div>
            </Card>
          )}
        </div>
      </div>

      <QuickRegisterModal open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
};
