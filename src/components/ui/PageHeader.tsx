import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, rightSlot }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
};
