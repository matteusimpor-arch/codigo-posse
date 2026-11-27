import React from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

export interface BarChartDatum {
  key: string;
  label: string;
  value: number;
  highlight?: boolean;
}

interface WeeklyBarChartProps {
  data: BarChartDatum[];
  unitLabel: string;
  unitSuffix?: string;
  heightClass?: string;
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({
  data,
  unitLabel,
  unitSuffix = '',
  heightClass = 'h-44',
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 0);

  return (
    <div className={`${heightClass} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 2, left: 2, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#94A3B8', fontFamily: 'Inter, system-ui, sans-serif' }}
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
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            formatter={(val) => {
              const num = Number(val ?? 0);
              return [`${num.toLocaleString('pt-BR')}${unitSuffix}`, unitLabel];
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={36}>
            {data.map((entry) => {
              const isHighlighted =
                entry.value > 0 && (entry.highlight || entry.value === maxValue);
              return (
                <Cell
                  key={entry.key}
                  fill={isHighlighted ? '#D4A853' : '#8C703B'}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
