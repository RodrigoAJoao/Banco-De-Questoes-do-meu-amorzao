import { motion, AnimatePresence } from 'motion/react';
import { Check, X, AlertCircle, Shield } from 'lucide-react';
import type { Toast } from '../types';

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastOverlay({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium backdrop-blur-md ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' :
              toast.type === 'error' ? 'bg-rose-500 text-white' :
              toast.type === 'warning' ? 'bg-amber-500 text-white' :
              'bg-white/90 text-gray-800 border border-gray-100'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'error' && <X className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'info' && <Shield className="w-4 h-4 flex-shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => onDismiss(toast.id)} className="ml-1 hover:opacity-70 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
