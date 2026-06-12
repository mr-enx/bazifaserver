import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info';

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastStore = {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
};

function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, type = 'error') =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: createToastId(),
          message,
          type,
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
