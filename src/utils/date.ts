import type { PeriodPreset } from '../types/database';

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna a data atual no formato YYYY-MM-DD respeitando o fuso horário configurado.
 */
export function getTodayISO(timezone: string = DEFAULT_TIMEZONE, referenceDate: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(referenceDate);
  } catch {
    return referenceDate.toISOString().slice(0, 10);
  }
}

/**
 * Formata uma data ISO (YYYY-MM-DD ou ISO timestamp) para o padrão brasileiro DD/MM/AAAA.
 */
export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const datePart = isoDate.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Soma ou subtrai dias de uma data ISO YYYY-MM-DD sem desvios de fuso horário.
 */
export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Diferença em dias inteiros entre duas datas YYYY-MM-DD (target - base).
 */
export function diffDaysISO(targetISO: string, baseISO: string): number {
  const [ty, tm, td] = targetISO.slice(0, 10).split('-').map(Number);
  const [by, bm, bd] = baseISO.slice(0, 10).split('-').map(Number);
  const targetMs = Date.UTC(ty, tm - 1, td);
  const baseMs = Date.UTC(by, bm - 1, bd);
  return Math.round((targetMs - baseMs) / (1000 * 60 * 60 * 24));
}

/**
 * Formata segundos inteiros em texto legível (ex: 2h 30min ou 45min).
 */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours === 0) {
    return `${minutes}min`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}

/**
 * Formata segundos em horas decimais com 1 casa (ex: 4,5h).
 */
export function formatHoursDecimal(seconds: number): string {
  const hours = Math.max(0, seconds) / 3600;
  return `${hours.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h`;
}

/**
 * Retorna os limites [startDate, endDate] no formato YYYY-MM-DD para um filtro de período.
 */
export function resolveDateRange(
  preset: PeriodPreset,
  todayISO: string,
  customStart?: string,
  customEnd?: string
): { startDate: string | null; endDate: string | null } {
  switch (preset) {
    case 'today':
      return { startDate: todayISO, endDate: todayISO };
    case 'yesterday': {
      const y = addDaysISO(todayISO, -1);
      return { startDate: y, endDate: y };
    }
    case 'this_week': {
      const [y, m, d] = todayISO.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const dayOfWeek = dt.getUTCDay(); // 0 = domingo, 1 = segunda
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      return { startDate: addDaysISO(todayISO, diffToMonday), endDate: todayISO };
    }
    case 'this_month': {
      return { startDate: `${todayISO.slice(0, 7)}-01`, endDate: todayISO };
    }
    case 'last_7_days':
      return { startDate: addDaysISO(todayISO, -6), endDate: todayISO };
    case 'last_30_days':
      return { startDate: addDaysISO(todayISO, -29), endDate: todayISO };
    case 'last_90_days':
      return { startDate: addDaysISO(todayISO, -89), endDate: todayISO };
    case 'custom':
      return {
        startDate: customStart || null,
        endDate: customEnd || null,
      };
    case 'all_time':
    default:
      return { startDate: null, endDate: null };
  }
}

export function isDateInRange(
  dateISO: string,
  startDate: string | null,
  endDate: string | null
): boolean {
  const d = dateISO.slice(0, 10);
  if (startDate && d < startDate) return false;
  if (endDate && d > endDate) return false;
  return true;
}

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  this_week: 'Esta semana',
  this_month: 'Este mês',
  last_7_days: 'Últimos 7 dias',
  last_30_days: 'Últimos 30 dias',
  last_90_days: 'Últimos 90 dias',
  all_time: 'Todo o período',
  custom: 'Período personalizado',
};
