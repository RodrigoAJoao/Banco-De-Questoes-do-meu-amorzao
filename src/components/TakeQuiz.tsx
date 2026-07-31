import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Timer, Play, RefreshCcw, Heart, Minus, Plus } from 'lucide-react';
import type { Question, View } from '../types';
import MultiSelectFilter from './MultiSelectFilter';

interface TakeQuizProps {
  quizSubjects: string[]; setQuizSubjects: (v: string[]) => void;
  quizTags: string[]; setQuizTags: (v: string[]) => void;
  availableTags: string[];
  quizWrongCount: number; setQuizWrongCount: (v: number) => void;
  quizRightCount: number; setQuizRightCount: (v: number) => void;
  quizNewCount: number; setQuizNewCount: (v: number) => void;
  counts: { wrong: number; right: number; fresh: number };
  useTimer: boolean; setUseTimer: (v: boolean) => void;
  timerMinutes: number; setTimerMinutes: (v: number) => void;
  drawnQuestions: Question[];
  onDraw: () => void;
  onStart: () => void;
  onNavigate: (v: View) => void;
  primaryColor: string; accentColor: string;
  subjects: string[];
}

interface CountRow {
  label: string; emoji: string; available: number;
  value: number; setValue: (v: number) => void; color: string;
}

export default function TakeQuiz(p: TakeQuizProps) {
  const rows: CountRow[] = [
    { label: 'Erradas', emoji: '❌', available: p.counts.wrong, value: p.quizWrongCount, setValue: p.setQuizWrongCount, color: '#f43f5e' },
    { label: 'Certas', emoji: '✅', available: p.counts.right, value: p.quizRightCount, setValue: p.setQuizRightCount, color: '#10b981' },
    { label: 'Novas', emoji: '✨', available: p.counts.fresh, value: p.quizNewCount, setValue: p.setQuizNewCount, color: p.primaryColor },
  ];

  const totalToDraw =
    Math.min(p.quizWrongCount, p.counts.wrong) +
    Math.min(p.quizRightCount, p.counts.right) +
    Math.min(p.quizNewCount, p.counts.fresh);

  const clamp = (v: number) => Math.max(0, Math.min(999, v));

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
            <MultiSelectFilter selected={p.quizSubjects} setSelected={p.setQuizSubjects} options={p.subjects} primaryColor={p.primaryColor} accentColor={p.accentColor} placeholder="Todas as matérias" />
            <p className="text-xs text-gray-400 mt-1">{p.quizSubjects.length === 0 ? 'Nenhuma matéria: considera todas.' : `${p.quizSubjects.length} selecionada(s)`}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>Filtrar por Tag</label>
            <MultiSelectFilter selected={p.quizTags} setSelected={p.setQuizTags} options={p.availableTags} primaryColor={p.primaryColor} accentColor={p.accentColor} placeholder="Todas as tags" emptyText={p.availableTags.length === 0 ? 'Nenhuma tag nas matérias selecionadas' : 'Nenhuma opção disponível'} />
            <p className="text-xs text-gray-400 mt-1">Mostra apenas as tags das matérias selecionadas.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white/40 rounded-xl border border-white/60">
            <label className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: p.accentColor }}>
              Quantidade por desempenho
            </label>
            <div className="space-y-3">
              {rows.map(r => (
                <div key={r.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{r.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: r.color }}>{r.label}</span>
                    <span className="text-[11px] text-gray-400">({r.available} disp.)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => r.setValue(clamp(r.value - 1))} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 hover:bg-white transition-colors border" style={{ borderColor: `${p.primaryColor}20`, color: p.primaryColor }}>
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={r.value}
                      onChange={(e) => r.setValue(clamp(Number(e.target.value)))}
                      className="w-12 text-center text-sm font-bold p-1.5 bg-white/70 border rounded-lg outline-none focus:ring-2"
                      style={{ borderColor: `${p.primaryColor}20`, color: p.accentColor, '--tw-ring-color': p.primaryColor } as any}
                    />
                    <button onClick={() => r.setValue(clamp(r.value + 1))} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 hover:bg-white transition-colors border" style={{ borderColor: `${p.primaryColor}20`, color: p.primaryColor }}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: `${p.primaryColor}15` }}>
              <button onClick={() => { p.setQuizWrongCount(Math.max(1, p.counts.wrong)); p.setQuizRightCount(0); p.setQuizNewCount(0); }} className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors" style={{ backgroundColor: '#f43f5e15', color: '#f43f5e' }}>
                Somente erradas
              </button>
              <span className="text-xs text-gray-500 ml-auto">Total no sorteio: <strong style={{ color: p.primaryColor }}>{totalToDraw}</strong></span>
            </div>
          </div>

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
