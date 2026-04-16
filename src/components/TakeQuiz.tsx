import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Timer, Play, RefreshCcw, Heart, Star } from 'lucide-react';
import type { Question, View } from '../types';

interface TakeQuizProps {
  quizSubject: string; setQuizSubject: (v: string) => void;
  quizTag: string; setQuizTag: (v: string) => void;
  useTimer: boolean; setUseTimer: (v: boolean) => void;
  timerMinutes: number; setTimerMinutes: (v: number) => void;
  drawnQuestions: Question[];
  onDraw: () => void;
  onStart: () => void;
  onNavigate: (v: View) => void;
  primaryColor: string; accentColor: string;
  subjects: string[]; allTags: string[];
}

export default function TakeQuiz(p: TakeQuizProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-4xl glass-card rounded-3xl p-8">
      <div className="flex items-center mb-8">
        <button onClick={() => p.onNavigate('home')} className="p-2 hover:bg-pink-100 rounded-full transition-colors mr-4">
          <ArrowLeft className="w-6 h-6" style={{ color: p.primaryColor }} />
        </button>
        <h2 className="text-3xl font-romantic font-bold" style={{ color: p.accentColor }}>Modo Questões</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>Filtrar por Matéria</label>
            <select value={p.quizSubject} onChange={(e) => p.setQuizSubject(e.target.value)} className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none" style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any}>
              <option value="Todas">Todas as matérias</option>
              {p.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>Filtrar por Tag</label>
            <select value={p.quizTag} onChange={(e) => p.setQuizTag(e.target.value)} className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none" style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any}>
              <option value="Todos">Todas as tags</option>
              {p.allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white/30 rounded-xl border border-white/50">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold flex items-center gap-2" style={{ color: p.accentColor }}>
                <Timer className="w-4 h-4" /> Temporizador
              </label>
              <button onClick={() => p.setUseTimer(!p.useTimer)} className={`w-12 h-6 rounded-full transition-all relative ${p.useTimer ? '' : 'bg-gray-200'}`} style={{ backgroundColor: p.useTimer ? p.primaryColor : undefined }}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5 transition-all ${p.useTimer ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
            {p.useTimer && (
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="30" value={p.timerMinutes} onChange={(e) => p.setTimerMinutes(Number(e.target.value))} className="flex-1" style={{ accentColor: p.primaryColor }} />
                <span className="text-sm font-bold w-16 text-center" style={{ color: p.primaryColor }}>{p.timerMinutes} min</span>
              </div>
            )}
          </div>

          <motion.button onClick={p.onDraw} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-4 border-2 rounded-xl font-bold text-lg shadow-sm transition-colors flex items-center justify-center gap-2" style={{ color: p.primaryColor, borderColor: p.primaryColor }}>
            <RefreshCcw className="w-5 h-5" /> Sortear Questões
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {p.drawnQuestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold" style={{ color: p.accentColor }}>Questões Sorteadas</h3>
              <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ backgroundColor: `${p.primaryColor}10`, color: p.primaryColor }}>{p.drawnQuestions.length} questões</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
              {p.drawnQuestions.map((q, idx) => (
                <div key={q.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-white/80">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: p.primaryColor }}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: p.primaryColor }}>{q.subject}</span>
                    <p className="text-xs text-gray-600 truncate">{q.text || "Questão com imagem"}</p>
                  </div>
                  {q.lastResult && (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${q.lastResult === 'correct' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  )}
                </div>
              ))}
            </div>
            <motion.button onClick={p.onStart} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-5 text-white rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-3 mt-4" style={{ backgroundColor: p.primaryColor }}>
              <Play className="w-6 h-6 fill-white" /> Começar Quiz
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {p.drawnQuestions.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} className="py-16 flex flex-col items-center justify-center text-pink-300">
          <Heart className="w-20 h-20 mb-4" />
          <p className="text-xl font-romantic font-bold mb-2">Nenhuma questão sorteada ainda.</p>
          <p className="text-sm">Configure os filtros e clique em "Sortear Questões".</p>
        </motion.div>
      )}
    </motion.div>
  );
}
