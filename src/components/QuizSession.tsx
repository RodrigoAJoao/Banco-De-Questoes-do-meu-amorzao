import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, CheckCircle2, ChevronRight, Heart, Star } from 'lucide-react';
import type { Question, View } from '../types';

interface QuizSessionProps {
  currentQuestion: Question;
  currentQuizIndex: number;
  totalQuestions: number;
  selectedQuizOption: string | null; setSelectedQuizOption: (v: string | null) => void;
  isCorrected: boolean;
  showResolution: boolean; setShowResolution: (v: boolean) => void;
  useTimer: boolean; timeLeft: number;
  onCorrect: () => void;
  onNext: () => void;
  onExit: () => void;
  primaryColor: string; accentColor: string;
  answers: string[];
  formatTime: (s: number) => string;
}

export default function QuizSession(p: QuizSessionProps) {
  const q = p.currentQuestion;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl glass-card rounded-3xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={p.onExit} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
            <X className="w-6 h-6" style={{ color: p.primaryColor }} />
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: p.primaryColor }}>{q.subject}</span>
            <h2 className="text-xl font-bold" style={{ color: p.accentColor }}>Questão {p.currentQuizIndex + 1} de {p.totalQuestions}</h2>
          </div>
        </div>
        {p.useTimer && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold ${p.timeLeft < 60 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-pink-100 text-pink-600'}`}>
            <Clock className="w-5 h-5" /> {p.formatTime(p.timeLeft)}
          </div>
        )}
      </div>

      <div className="space-y-8">
        <div className="p-6 bg-white/50 rounded-2xl border border-white/80 shadow-sm">
          {q.imageUrl && <img src={q.imageUrl} alt="Questão" className="w-full max-h-96 object-contain rounded-xl mb-6 shadow-md" />}
          {q.text && <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">{q.text}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: p.primaryColor }}>Escolha seu amor:</p>
          {p.answers.map((option) => {
            const isSelected = p.selectedQuizOption === option;
            const isCorrect = p.isCorrected && option === q.answer;
            const isWrong = p.isCorrected && isSelected && option !== q.answer;

            return (
              <button
                key={option}
                disabled={p.isCorrected}
                onClick={() => p.setSelectedQuizOption(option)}
                className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left group ${p.isCorrected ? '' : 'hover:border-pink-300 hover:bg-pink-50/50'}`}
                style={{ 
                  backgroundColor: isCorrect ? '#d1fae5' : isWrong ? '#ffe4e6' : (isSelected && !p.isCorrected ? `${p.primaryColor}10` : undefined),
                  borderColor: isCorrect ? '#10b981' : isWrong ? '#f43f5e' : (isSelected && !p.isCorrected ? p.primaryColor : undefined),
                  color: isSelected && !p.isCorrected ? p.primaryColor : undefined
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors"
                  style={{ 
                    backgroundColor: isSelected && !p.isCorrected ? p.primaryColor : (isCorrect ? '#10b981' : (isWrong ? '#f43f5e' : undefined)),
                    color: isSelected || isCorrect || isWrong ? 'white' : undefined
                  }}
                >
                  {option}
                </div>
                <span className="font-bold text-lg">Opção {option}</span>
                {(isCorrect || isWrong) && (
                  <div className="ml-auto">
                    {isCorrect ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <X className="w-6 h-6 text-rose-500" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 pt-4">
          {!p.isCorrected ? (
            <motion.button
              disabled={!p.selectedQuizOption}
              onClick={p.onCorrect}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-5 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-3 ${!p.selectedQuizOption ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white'}`}
              style={{ backgroundColor: p.selectedQuizOption ? p.primaryColor : undefined }}
            >
              Corrigir Questão
            </motion.button>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                {(q.resolution || q.resolutionImageUrl) && (
                  <motion.button onClick={() => p.setShowResolution(!p.showResolution)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-4 bg-white border-2 rounded-2xl font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2" style={{ color: p.primaryColor, borderColor: p.primaryColor }}>
                    <Heart className={`w-5 h-5 ${p.showResolution ? 'fill-current' : ''}`} /> {p.showResolution ? 'Ocultar Resolução' : 'Ver Resolução'}
                  </motion.button>
                )}
                <motion.button onClick={p.onNext} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-[2] py-4 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2" style={{ backgroundColor: p.primaryColor }}>
                  Próxima Questão <ChevronRight className="w-6 h-6" />
                </motion.button>
              </div>

              <AnimatePresence>
                {p.showResolution && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="p-6 bg-white/80 rounded-2xl border-2 border-pink-200 shadow-inner" style={{ borderColor: `${p.primaryColor}40` }}>
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: p.accentColor }}>
                      <Star className="w-5 h-5 fill-pink-500 text-pink-500" style={{ color: p.primaryColor, fill: p.primaryColor }} /> Resolução Comentada
                    </h4>
                    {q.resolutionImageUrl && <img src={q.resolutionImageUrl} alt="Resolução" className="w-full max-h-80 object-contain rounded-xl mb-4 shadow-sm" />}
                    {q.resolution && <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{q.resolution}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
