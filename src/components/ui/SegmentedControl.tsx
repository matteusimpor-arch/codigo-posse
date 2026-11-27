import React from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  fullWidthOnMobile?: boolean;
  surface?: 'card' | 'app';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidthOnMobile = true,
  surface = 'card',
}: SegmentedControlProps<T>) {
  const containerBg = surface === 'card' ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-app)]';
  const activeBg = surface === 'card' ? 'bg-[var(--bg-app)]' : 'bg-[var(--bg-card)]';

  return (
    <div
      className={`${
        fullWidthOnMobile ? 'grid sm:inline-flex' : 'inline-flex'
      } p-1 rounded-xl ${containerBg} border border-[var(--border-color)]`}
      style={
        fullWidthOnMobile
          ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }
          : undefined
      }
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-[38px] px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap truncate transition-colors ${
              active
                ? `${activeBg} text-[var(--gold-text)]`
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
