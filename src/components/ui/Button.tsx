import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...rest
}) => {
  const base =
    'min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity active:scale-[0.99] disabled:opacity-55 whitespace-nowrap';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--gold)] text-[var(--gold-ink)] hover:opacity-95',
    secondary:
      'border border-[var(--border-color)] bg-[var(--bg-app)] text-[var(--text-main)] hover:border-[var(--gold)]/60',
    danger:
      'border border-[var(--negative)]/50 bg-[var(--bg-app)] text-[var(--negative)]',
    ghost: 'text-[var(--text-muted)] hover:text-[var(--text-main)]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};
