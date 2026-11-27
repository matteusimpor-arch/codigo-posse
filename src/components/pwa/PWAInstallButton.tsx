import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-2 text-xs font-semibold text-[var(--gold-ink)] hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
      >
        <Download className="w-4 h-4 shrink-0" />
        {!compact && <span>Instalar aplicativo</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-4 py-2 text-xs font-semibold text-[var(--text-main)] whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-4 h-4 shrink-0 text-[var(--gold-text)]" />
          {!compact && <span>Instalar no iPhone</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                  Instalar no iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[40px] min-w-[40px] -mr-2 -mt-1 flex items-center justify-center text-[var(--text-muted)] rounded-xl"
                  aria-label="Fechar instruções"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-[var(--text-muted)] list-decimal list-inside">
                <li>Toque no botão <strong className="text-[var(--text-main)]">Compartilhar</strong> na barra do Safari.</li>
                <li>Role para baixo e selecione <strong className="text-[var(--text-main)]">Adicionar à Tela de Início</strong>.</li>
                <li>Confirme tocando em <strong className="text-[var(--text-main)]">Adicionar</strong>.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[46px] rounded-xl bg-[var(--gold)] py-2.5 text-sm font-semibold text-[var(--gold-ink)]"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
