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
    size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-8 h-8';

  return (
    <div className="flex items-center gap-2.5 shrink-0 select-none">
      <div
        className={`${dimensionClass} rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center`}
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
          <span className="font-display text-xs font-extrabold text-[#111827]">CP</span>
        )}
      </div>

      {!collapsed && (
        <span
          className={`font-display font-bold tracking-tight whitespace-nowrap ${
            size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-base' : 'text-lg'
          } ${onDark ? 'text-white' : 'text-[var(--text-main)]'}`}
        >
          Código da Posse
        </span>
      )}
    </div>
  );
};
