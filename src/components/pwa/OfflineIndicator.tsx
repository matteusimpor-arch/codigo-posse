import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-4 left-3.5 right-3.5 md:left-auto md:right-4 z-50 flex items-center gap-2.5 rounded-xl border border-[var(--gold)] bg-[var(--bg-card)] px-4 py-2.5 text-xs font-medium text-[var(--text-main)]"
    >
      <WifiOff className="w-4 h-4 text-[var(--gold-text)] shrink-0" />
      <span>
        Sem conexão com a internet. Novos registros exigem conexão para sincronização.
      </span>
    </div>
  );
};
