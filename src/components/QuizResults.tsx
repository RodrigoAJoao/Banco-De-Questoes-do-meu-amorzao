import { motion } from 'motion/react';
import { RefreshCcw, Heart, AlertCircle } from 'lucide-react';
import type { Question, View } from '../types';

interface QuizResultsProps {
  quizResults: { question: Question; result: 'correct' | 'incorrect' }[];
  primaryColor: string; accentColor: string;
  onNewQuiz: () => void;
  onGoHome: () => void;
}

export default function QuizResults({ quizResults, primaryColor, accentColor, onNewQuiz, onGoHome }: QuizResultsProps) {
  const correctResults = quizResults.filter(r => r.result === 'correct').length;
  const totalResults = quizResults.length;
  const percentage = totalResults > 0 ? Math.round((correctResults / totalResults) * 100) : 0;
  const incorrectResults = quizResults.filter(r => r.result === 'incorrect');

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-4xl glass-card rounded-3xl p-8">
      <div className="flex flex-col items-center text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-28 h-28 rounded-full flex items-center justify-center mb-6 shadow-xl"
          style={{ backgroundColor: percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#f43f5e' }}
        >
          <span className="text-4xl font-bold text-white">{percentage}%</span>
        </motion.div>
        <h2 className="text-3xl font-romantic font-bold mb-2" style={{ color: accentColor }}>
          {percentage >= 70 ? 'Parabéns! 🎉' : percentage >= 40 ? 'Bom esforço! 💪' : 'Continue estudando! 📚'}
        </h2>
        <p className="text-gray-500 text-lg">
          Você acertou <strong className="text-emerald-600">{correctResults}</strong> de <strong>{totalResults}</strong> questões
        </p>
      </div>

      {incorrectResults.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: accentColor }}>
            <AlertCircle className="w-5 h-5 text-rose-500" /> Questões que você errou
          </h3>
          <div className="space-y-3">
            {incorrectResults.map((r, idx) => (
              <div key={idx} className="p-4 bg-rose-50/80 rounded-xl border border-rose-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">{r.question.subject}</span>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{r.question.text || 'Questão baseada em imagem'}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-600 rounded-md shrink-0">
                    Gabarito: {r.question.answer}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <motion.button onClick={onNewQuiz} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-4 border-2 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2" style={{ color: primaryColor, borderColor: primaryColor }}>
          <RefreshCcw className="w-5 h-5" /> Novo Quiz
        </motion.button>
        <motion.button onClick={onGoHome} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-4 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2" style={{ backgroundColor: primaryColor }}>
          <Heart className="w-5 h-5" /> Voltar ao Início
        </motion.button>
      </div>
    </motion.div>
  );
}
