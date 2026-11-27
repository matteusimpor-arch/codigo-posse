import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  className = '',
  children,
  ...rest
}) => {
  const padClass =
    padding === 'sm' ? 'p-3.5' : padding === 'lg' ? 'p-5' : 'p-4';

  return (
    <div
      className={`rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/70 ${padClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
