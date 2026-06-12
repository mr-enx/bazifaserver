import { useEffect, useState } from 'react';

type FloatingChatMessageProps = {
  message?: string | null;
  className?: string;
  duration?: number;
};

export function FloatingChatMessage({
  message,
  className = '',
  duration = 5000,
}: FloatingChatMessageProps) {
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      setVisibleMessage(null);
      return;
    }

    setVisibleMessage(message);

    const timeoutId = setTimeout(() => {
      setVisibleMessage((currentMessage) =>
        currentMessage === message ? null : currentMessage
      );
    }, duration);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [message, duration]);

  if (!visibleMessage) {
    return null;
  }

  return (
    <div
      className={`absolute -top-16 left-1/2 z-30 -translate-x-1/2 ${className}`}
    >
      <div className="relative max-w-[180px] rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-center text-xs font-bold leading-5 text-neutral-900 shadow-xl">
        <p className="max-h-10 overflow-hidden break-words">{visibleMessage}</p>

        <span
          aria-hidden="true"
          className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[9px] border-r-[9px] border-t-[11px] border-l-transparent border-r-transparent border-t-white"
        />

        <span
          aria-hidden="true"
          className="absolute left-1/2 top-full translate-y-[1px] h-0 w-0 -translate-x-1/2 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-neutral-300 -z-10"
        />
      </div>
    </div>
  );
}
