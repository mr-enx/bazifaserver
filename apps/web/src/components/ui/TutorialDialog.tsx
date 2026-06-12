import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

import dialog1 from '../../assets/dialog-1.png';
import dialog2 from '../../assets/dialog-2.png';
import dialog3 from '../../assets/dialog-3.png';
import character from '../../assets/character.png';
import character2 from '../../assets/character2.png';

type TutorialDialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  closeOnBackdropClick?: boolean;
  dir?: 'rtl' | 'ltr';
  avatarType?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title?: string;
  step?: number;
  totalSteps?: number;
  onNextStep?: () => void;
  characterImage?: string;
};

export function TutorialDialog({
  open,
  onClose,
  children,
  className = '',
  contentClassName = '',
  closeOnBackdropClick = true,
  dir = 'rtl',
  avatarType = 1,
  title = 'آموزش بازی',
  step = 0,
  totalSteps = 1,
  onNextStep,
  characterImage,
}: TutorialDialogProps) {
  const topHeight = 50;
  const bottomHeight = 20;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (onNextStep && step < totalSteps - 1) {
          onNextStep();
        } else {
          onClose();
        }
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
        if (closeOnBackdropClick) {
          if (onNextStep && step < totalSteps - 1) {
            onNextStep();
          } else {
            onClose();
          }
        }
      }}
    >
      <div
        className={`relative flex max-h-[calc(100dvh-20rem)] -mb-12 w-full max-w-md flex-col ${contentClassName}`}
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

        {/* Title (Fixed) */}
        <div className="relative z-20 flex items-center justify-center mt-2 px-4 shrink-0">
          <span className="text-white font-bold text-lg">{title}</span>
        </div>

        <div
          className="relative z-10 overflow-y-auto pb-4 mt-4 m-2"
        >
          {children}
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-20 -left-14 z-10">
        <img
          src={characterImage || character}
          alt="Character"
          className="h-[28rem] max-w-none object-contain pointer-events-none"
        />
      </div>
    </div>,
    document.body,
  );
}
