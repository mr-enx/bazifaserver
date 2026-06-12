import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import ButtonAdd from '../../assets/button-add.png';

type FloatingActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'type'
> & {
  isLoading?: boolean;
  position?: 'left' | 'right';
  iconSrc?: string;
  iconAlt?: string;
  bottomOffset?: number | string;
};

export function FloatingActionButton({
  isLoading = false,
  disabled,
  position = 'right',
  iconSrc = ButtonAdd,
  iconAlt = '',
  className = '',
  bottomOffset = 110,
  style,
  ...props
}: FloatingActionButtonProps) {
  const positionClass =
    position === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6';

  return createPortal(
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`fixed ${positionClass} z-[500] transition hover:-translate-y-1 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      style={{
        bottom:
          typeof bottomOffset === 'number'
            ? `${bottomOffset}px`
            : bottomOffset,
        ...style,
      }}
      {...props}
    >
      {isLoading ? (
        <span className="block h-16 w-16 animate-spin rounded-full border-4 border-ink/20 border-t-ink" />
      ) : (
        <img
          src={iconSrc}
          alt={iconAlt}
          className="h-16 w-16 object-contain"
        />
      )}
    </button>,
    document.body
  );
}
