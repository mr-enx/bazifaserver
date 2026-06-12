import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

import dialog1 from '../../assets/dialog-1.png';
import dialog2 from '../../assets/dialog-2.png';
import dialog3 from '../../assets/dialog-3.png';
import dialogAvatar1 from '../../assets/dialog_avatar_1.png';
import dialogAvatar2 from '../../assets/dialog_avatar_2.png';
import dialogAvatar3 from '../../assets/dialog_avatar_3.png';
import dialogAvatar4 from '../../assets/dialog_avatar_4.png';
import dialogAvatar5 from '../../assets/dialog_avatar_5.png';
import dialogAvatar6 from '../../assets/dialog_avatar_6.png';
import dialogAvatar7 from '../../assets/dialog_avatar_7.png';
import buttonClose from '../../assets/button-close.png';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  closeOnBackdropClick?: boolean;
  dir?: 'rtl' | 'ltr';
  avatarType?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title?: string; // default: "No Title"
};

export function Dialog({
  open,
  onClose,
  children,
  className = '',
  contentClassName = '',
  closeOnBackdropClick = true,
  dir = 'rtl',
  avatarType = 1,
  title = "No Title",
}: DialogProps) {
  const topHeight = 50;
  const bottomHeight = 20;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      dir={dir}
      className={`fixed inset-0 z-[9999] flex h-dvh w-screen items-center justify-center bg-black/45 px-4 py-12 backdrop-blur-sm ${className}`}
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (closeOnBackdropClick) onClose();
      }}
    >
      <div
        className={`relative flex max-h-[calc(100dvh-20rem)] -mb-12  w-full max-w-md flex-col ${contentClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <div
            className="absolute left-0 top-0 w-full bg-[length:100%_100%] bg-center bg-no-repeat"
            style={{
              height: `${topHeight}px`,
              backgroundImage: `url(${dialog1})`,
            }}
          />

          <div
            className="absolute left-0 right-0 bg-[length:100%_100%] bg-center bg-no-repeat"
            style={{
              top: `${topHeight}px`,
              bottom: `${bottomHeight}px`,
              backgroundImage: `url(${dialog2})`,
            }}
          />

          <div
            className="absolute bottom-0 left-0 w-full bg-[length:100%_100%] bg-center bg-no-repeat"
            style={{
              height: `${bottomHeight}px`,
              backgroundImage: `url(${dialog3})`,
            }}
          />
        </div>

        <div className="pointer-events-none absolute left-1/2 -top-[162px] z-20 -translate-x-1/2">
          <img
            src={
              avatarType === 7
                ? dialogAvatar7
                : avatarType === 6
                ? dialogAvatar6
                : avatarType === 5
                ? dialogAvatar5
                : avatarType === 4
                ? dialogAvatar4
                : avatarType === 3
                ? dialogAvatar3
                : avatarType === 2
                ? dialogAvatar2
                : dialogAvatar1
            }
            alt="Dialog Avatar"
            className="h-44 max-w-none  object-cover pointer-events-none"
          />
        </div>

        {/* Title and Close Button (Fixed) */}
        <div className="relative z-20 flex items-center justify-center mt-2 px-4 shrink-0">
          <span className="text-white font-bold text-lg">{title}</span>
          <button 
            onClick={onClose} 
            className="absolute right-2 bottom-2 w-6 h-6 transition-transform"
          >
            <img src={buttonClose} alt="Close" className="w-8 h-8 object-contain" />
          </button>
        </div>

        <div
          className="relative z-10 overflow-y-auto pb-4 mt-4 m-2"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
