import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#fce4ec' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
        <p className="text-lg font-medium text-pink-600">Carregando seus dados...</p>
      </motion.div>
    </div>
  );
}
