import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, CheckCircle2, ChevronRight, Heart, Star, Plus, Lightbulb } from 'lucide-react';
import type { Question, View, ErrorReason } from '../types';
import ErrorReasonSelector from './ErrorReasonSelector';
import { compressImage } from '../imageUtils';

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
  errorReason: ErrorReason | undefined;
  onErrorReasonChange: (v: ErrorReason | undefined) => void;
  onSaveResolution: (text: string, images: string[]) => void;
  primaryColor: string; accentColor: string;
  answers: string[];
  formatTime: (s: number) => string;
}

export default function QuizSession(p: QuizSessionProps) {
  const q = p.currentQuestion;
  const resolutionImages = (q.resolutionImageUrls && q.resolutionImageUrls.length > 0)
    ? q.resolutionImageUrls
    : (q.resolutionImageUrl ? [q.resolutionImageUrl] : []);
  const hasResolution = !!q.resolution || resolutionImages.length > 0;
  const isWrong = p.isCorrected && p.selectedQuizOption !== q.answer;

  // ─── Editor de resolução durante a revisão (para questões sem resolução) ───
  const [addingResolution, setAddingResolution] = useState(false);
  const [resText, setResText] = useState('');
  const [resImages, setResImages] = useState<string[]>([]);
  const resFileRef = useRef<HTMLInputElement>(null);

  // Reseta o editor sempre que muda a questão.
  useEffect(() => {
    setAddingResolution(false);
    setResText('');
    setResImages([]);
  }, [q.id]);

  const onPickResolutionImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl || fl.length === 0) return;
    const files: File[] = [];
    for (let i = 0; i < fl.length; i++) files.push(fl[i]);
    try {
      const processed = await Promise.all(files.map(f => compressImage(f, 1200, 0.7)));
      setResImages(prev => [...prev, ...processed]);
    } catch { /* ignora imagem inválida */ }
    if (e.target) e.target.value = '';
  };

  const saveResolution = () => {
    if (!resText.trim() && resImages.length === 0) return;
    p.onSaveResolution(resText, resImages);
    setAddingResolution(false);
  };

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
              {isWrong && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border-2" style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}>
                  <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#e11d48' }}>
                    <X className="w-4 h-4" /> Você errou — qual foi o motivo?
                  </p>
                  <ErrorReasonSelector value={p.errorReason} onChange={p.onErrorReasonChange} primaryColor={p.primaryColor} accentColor={p.accentColor} compact />
                </motion.div>
              )}
              <div className="flex gap-3">
                {hasResolution && (
                  <motion.button onClick={() => p.setShowResolution(!p.showResolution)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-4 bg-white border-2 rounded-2xl font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2" style={{ color: p.primaryColor, borderColor: p.primaryColor }}>
                    <Heart className={`w-5 h-5 ${p.showResolution ? 'fill-current' : ''}`} /> {p.showResolution ? 'Ocultar Resolução' : 'Ver Resolução'}
                  </motion.button>
                )}
                <motion.button onClick={p.onNext} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-[2] py-4 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2" style={{ backgroundColor: p.primaryColor }}>
                  Próxima Questão <ChevronRight className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Esta questão não tem resolução cadastrada — permite adicioná-la durante a revisão. */}
              {!hasResolution && (
                <div>
                  {!addingResolution ? (
                    <motion.button onClick={() => setAddingResolution(true)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full py-3 border-2 border-dashed rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ color: p.primaryColor, borderColor: `${p.primaryColor}50`, backgroundColor: `${p.primaryColor}08` }}>
                      <Plus className="w-4 h-4" /> Adicionar resolução a esta questão
                    </motion.button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-white/80 rounded-2xl border-2" style={{ borderColor: `${p.primaryColor}40` }}>
                      <h4 className="font-bold text-base mb-3 flex items-center gap-2" style={{ color: p.accentColor }}>
                        <Lightbulb className="w-5 h-5" style={{ color: p.primaryColor }} /> Nova Resolução
                      </h4>
                      <textarea
                        value={resText}
                        onChange={(e) => setResText(e.target.value)}
                        placeholder="Escreva a resolução comentada (opcional se anexar imagens)..."
                        className="w-full h-28 p-3 bg-white/70 border rounded-xl focus:ring-2 outline-none resize-none text-sm"
                        style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any}
                      />
                      {resImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {resImages.map((img, idx) => (
                            <div key={idx} className="relative rounded-lg overflow-hidden border" style={{ borderColor: `${p.primaryColor}30` }}>
                              <img src={img} alt={`Resolução ${idx + 1}`} className="w-full h-20 object-cover" />
                              <button type="button" onClick={() => setResImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <button type="button" onClick={() => resFileRef.current?.click()} className="flex-1 py-2.5 border-2 border-dashed rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors" style={{ color: p.primaryColor, borderColor: `${p.primaryColor}40` }}>
                          <Plus className="w-4 h-4" /> {resImages.length > 0 ? 'Mais imagens' : 'Anexar imagens'}
                        </button>
                        <input type="file" ref={resFileRef} onChange={onPickResolutionImages} accept="image/*" multiple className="hidden" />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => { setAddingResolution(false); setResText(''); setResImages([]); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white border transition-colors hover:bg-gray-50" style={{ borderColor: `${p.primaryColor}20`, color: p.accentColor }}>
                          Cancelar
                        </button>
                        <button type="button" onClick={saveResolution} disabled={!resText.trim() && resImages.length === 0} className={`flex-[2] py-2.5 rounded-xl text-sm font-bold text-white transition-all ${(!resText.trim() && resImages.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ backgroundColor: p.primaryColor }}>
                          Salvar Resolução
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              <AnimatePresence>
                {p.showResolution && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="p-6 bg-white/80 rounded-2xl border-2 border-pink-200 shadow-inner" style={{ borderColor: `${p.primaryColor}40` }}>
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: p.accentColor }}>
                      <Star className="w-5 h-5 fill-pink-500 text-pink-500" style={{ color: p.primaryColor, fill: p.primaryColor }} /> Resolução Comentada
                    </h4>
                    {resolutionImages.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {resolutionImages.map((img, idx) => (
                          <img key={idx} src={img} alt={`Resolução ${idx + 1}`} className="w-full max-h-80 object-contain rounded-xl shadow-sm" />
                        ))}
                      </div>
                    )}
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
