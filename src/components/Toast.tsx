import type { ToastItem } from '@/hooks/useToast';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />,
  error: <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />,
  info: <Info className="h-5 w-5 text-indigo-500 flex-shrink-0" />,
};

const styles = {
  success: 'border-l-4 border-emerald-500 bg-white',
  error: 'border-l-4 border-red-500 bg-white',
  info: 'border-l-4 border-indigo-500 bg-white',
};

export function ToastContainer({ toasts, removeToast }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl ${styles[t.type]} animate-toast-in`}
        >
          {icons[t.type]}
          <p className="flex-1 text-sm font-medium text-gray-800 leading-relaxed">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
