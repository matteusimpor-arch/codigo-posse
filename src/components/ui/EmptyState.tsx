import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-10">
      <div className="w-11 h-11 rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)] flex items-center justify-center text-[var(--gold-text)]">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="mt-3.5 font-display text-base font-semibold text-[var(--text-main)]">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--gold-ink)] hover:opacity-95 transition-opacity"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
