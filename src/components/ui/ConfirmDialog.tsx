import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = true,
  loading = false,
}) => {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
      <div className="flex items-start gap-3">
        <div
          className={`p-2.5 rounded-xl shrink-0 bg-[var(--bg-app)] border border-[var(--border-color)] ${
            destructive ? 'text-[var(--negative)]' : 'text-[var(--gold-text)]'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 min-h-[46px] px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] text-sm font-semibold text-[var(--text-main)]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 min-h-[46px] px-4 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 ${
            destructive
              ? 'bg-[#EF4444] text-white'
              : 'bg-[var(--gold)] text-[var(--gold-ink)]'
          }`}
        >
          {loading ? 'Processando...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
