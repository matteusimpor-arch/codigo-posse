import React, { useState } from 'react';

interface BrandLogoProps {
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean;
}

export const LOGO_SRC = '/assets/aistudio/Logo_de_Coruja_com_Gr_fico_Dourado_87abf46e.png';

export const BrandLogo: React.FC<BrandLogoProps> = ({
  collapsed = false,
  size = 'md',
  onDark = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const dimensionClass =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';

  return (
    <div className="flex items-center gap-2.5 shrink-0 select-none">
      <div
        className={`${dimensionClass} rounded-xl bg-white p-0.5 border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center`}
      >
        {!imgError ? (
          <img
            src={LOGO_SRC}
            alt="Código da Posse"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="font-display text-xs font-extrabold text-[#0F172A]">CP</span>
        )}
      </div>

      {!collapsed && (
        <span
          className={`font-display font-bold tracking-tight whitespace-nowrap ${
            size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'
          } ${onDark ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
        >
          Código da <span className="text-[#B8892E] dark:text-[#D4A853]">Posse</span>
        </span>
      )}
    </div>
  );
};
