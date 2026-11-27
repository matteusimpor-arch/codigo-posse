import React from 'react';

const baseFieldClass =
  'w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#D4A853]';

export const FieldLabel: React.FC<{
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}> = ({ children, htmlFor, className = '' }) => (
  <label
    htmlFor={htmlFor}
    className={`block text-xs font-semibold text-[var(--text-muted)] mb-1.5 ${className}`}
  >
    {children}
  </label>
);

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = '', ...rest }, ref) => (
  <input ref={ref} className={`${baseFieldClass} ${className}`} {...rest} />
));
Input.displayName = 'Input';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className = '', children, ...rest }, ref) => (
  <select ref={ref} className={`${baseFieldClass} ${className}`} {...rest}>
    {children}
  </select>
));
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = '', ...rest }, ref) => (
  <textarea
    ref={ref}
    className={`w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-base text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#D4A853] ${className}`}
    {...rest}
  />
));
Textarea.displayName = 'Textarea';
