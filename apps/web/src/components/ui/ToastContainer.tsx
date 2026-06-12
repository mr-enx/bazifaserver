import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToastStore } from '../../stores/toastStore';

type LocalToast = {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
  leaving?: boolean;
};

function toastClassName(type: 'error' | 'success' | 'info') {
  if (type === 'success') {
    return 'bg-emerald-500 text-white';
  }

  if (type === 'info') {
    return 'bg-sky-500 text-white';
  }

  return 'bg-rose-500 text-white';
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const [visibleToasts, setVisibleToasts] = useState<LocalToast[]>([]);

  useEffect(() => {
    if (toasts.length === 0) return;

    setVisibleToasts((prev) => {
      const next = [...prev];

      for (const toast of toasts) {
        if (!next.find((t) => t.id === toast.id)) {
          next.push({ ...toast });
        }
      }

      // فقط 5 تا نگه می‌داریم
      return next.slice(-5);
    });
  }, [toasts]);

  useEffect(() => {
    visibleToasts.forEach((toast) => {
      const timer = setTimeout(() => {
        setVisibleToasts((prev) =>
          prev.map((t) =>
            t.id === toast.id ? { ...t, leaving: true } : t
          )
        );

        setTimeout(() => {
          setVisibleToasts((prev) =>
            prev.filter((t) => t.id !== toast.id)
          );
          removeToast(toast.id);
        }, 300);
      }, 3000);

      return () => clearTimeout(timer);
    });
  }, [visibleToasts, removeToast]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[10000] flex flex-col items-center gap-3 px-4">
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-right font-black shadow-2xl shadow-black/20 transition-all duration-300
          ${toastClassName(toast.type)}
          ${
            toast.leaving
              ? 'translate-y-2 opacity-0'
              : 'translate-y-0 opacity-100'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
