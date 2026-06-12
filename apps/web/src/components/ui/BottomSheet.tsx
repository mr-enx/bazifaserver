import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import backgroundSheetHeader from '../../assets/backgrond-sheet-header.png';
import backgroundSheetBody from '../../assets/backgrond-sheet-body.png';
import { Text } from './Text';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissible?: boolean;
  title?: string;
  zIndex?: number;
};

export function BottomSheet({
  isOpen,
  onClose,
  children,
  dismissible = true,
  title,
  zIndex = 70
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      dragOffsetRef.current = 0;
      startYRef.current = null;
      setIsDragging(false);
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, dismissible]);

  const sheetStyle = useMemo(() => {
    if (!isOpen) {
      return undefined;
    }

    return {
      transform: `translateY(${dragOffset}px)`,
      transition: isDragging ? 'none' : 'transform 220ms ease'
    };
  }, [dragOffset, isDragging, isOpen]);

  function beginDrag(clientY: number) {
    if (!dismissible) return;
    startYRef.current = clientY;
    setIsDragging(true);
  }

  function updateDrag(clientY: number) {
    if (!dismissible || startYRef.current === null) return;

    const nextOffset = Math.max(0, clientY - startYRef.current);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  }

  function endDrag() {
    if (!dismissible || startYRef.current === null) return;

    const currentOffset = dragOffsetRef.current;
    const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
    const shouldClose = currentOffset > Math.min(140, sheetHeight * 0.28);

    startYRef.current = null;
    setIsDragging(false);

    if (shouldClose) {
      onClose();
      return;
    }

    dragOffsetRef.current = 0;
    setDragOffset(0);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      <button
        type="button"
        aria-label="Close bottom sheet"
        className="absolute inset-0 bg-ink/45 transition-opacity duration-200 opacity-100"
        onClick={dismissible ? onClose : undefined}
      />

      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          className={`profile-bottom-sheet-safe w-full shadow-2xl shadow-ink/40 ${
            isDragging ? '' : 'will-change-transform'
          }`}
          style={sheetStyle}
          onPointerMove={(event) => {
            if (!isDragging) return;
            updateDrag(event.clientY);
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            className={`relative w-full select-none touch-none ${
              dismissible ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
            onPointerDown={(event) => {
              beginDrag(event.clientY);
              if (dismissible) {
                (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
              }
            }}
            onPointerMove={(event) => {
              updateDrag(event.clientY);
            }}
            onPointerUp={(event) => {
              if (
                dismissible &&
                (event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)
              ) {
                (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
              }
              endDrag();
            }}
            onPointerCancel={(event) => {
              if (
                dismissible &&
                (event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)
              ) {
                (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
              }
              endDrag();
            }}
          >
            <img
              src={backgroundSheetHeader}
              alt=""
              className="block w-full"
              draggable={false}
            />
            {title ? (
              <Text
                as="span"
                preset="outlinedWhite"
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl mt-8"
              >
                {title}
              </Text>
            ) : null}
          </div>

          <div
            className="bg-[#0a1f3d]"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              backgroundImage: `url(${backgroundSheetBody})`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
