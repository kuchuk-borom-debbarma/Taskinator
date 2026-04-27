import React from 'react';

export function PagingButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition
        ${
          disabled
            ? 'cursor-not-allowed text-app-muted opacity-50'
            : 'text-app-muted hover:bg-black/5 hover:text-app-ink'
        }
      `}
    >
      {children}
    </button>
  );
}
