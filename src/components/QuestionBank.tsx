import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, X, Heart, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Question, View } from '../types';
import { ERROR_REASONS, normalizeTag } from '../types';
import MultiSelectFilter from './MultiSelectFilter';

interface QuestionBankProps {
  questions: Question[];
  setQuestions: (fn: (prev: Question[]) => Question[]) => void;
  primaryColor: string; accentColor: string;
  subjects: string[];
  onNavigate: (v: View) => void;
  onEditQuestion: (q: Question) => void;
}

const PAGE_SIZE = 12;

export default function QuestionBank({ questions, setQuestions, primaryColor, accentColor, subjects, onNavigate, onEditQuestion }: QuestionBankProps) {
  const [bankSubject, setBankSubject] = useState('Todas');
  const [bankStatus, setBankStatus] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [bankErrorReason, setBankErrorReason] = useState('all');
  const [bankTags, setBankTags] = useState<string[]>([]);
  const [bankSource, setBankSource] = useState('all');
  const [bankSearch, setBankSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const errorReasonLabel = (value?: string) => ERROR_REASONS.find(r => r.value === value);

  // Origens (provas importadas) presentes no banco.
  const sources = useMemo(() => Array.from(new Set(questions.map(q => q?.source).filter(Boolean))) as string[], [questions]);

  // Tags disponíveis para o filtro: apenas as da matéria selecionada (ou todas).
  const availableTags = useMemo(() => {
    const base = bankSubject === 'Todas' ? questions : questions.filter(q => q && q.subject === bankSubject);
    const byNorm = new Map<string, string>();
    base.forEach(q => { if (q?.tags) q.tags.forEach(t => { if (t) byNorm.set(normalizeTag(t), t); }); });
    return Array.from(byNorm.values());
  }, [questions, bankSubject]);

  // Remove tags selecionadas que deixaram de existir na matéria escolhida.
  useEffect(() => {
    setBankTags(prev => {
      const avail = new Set(availableTags.map(normalizeTag));
      const next = prev.filter(t => avail.has(normalizeTag(t)));
      return next.length === prev.length ? prev : next;
    });
  }, [availableTags]);

  const filteredQuestions = questions.filter(q => {
    if (!q) return false;
    const matchesSubject = bankSubject === 'Todas' || q.subject === bankSubject;
    const matchesStatus = bankStatus === 'all' || q.lastResult === bankStatus;
    const matchesReason = bankErrorReason === 'all' || q.errorReason === bankErrorReason;
    const matchesSource = bankSource === 'all'
      || (bankSource === '__manual__' && !q.source)
      || (bankSource === '__imported__' && !!q.source)
      || q.source === bankSource;
    const matchesTags = bankTags.length === 0 || (
      q.tags && Array.isArray(q.tags) &&
      q.tags.some(t => bankTags.some(sel => normalizeTag(sel) === normalizeTag(t)))
    );
    const matchesSearch = (q.text || '').toLowerCase().includes(bankSearch.toLowerCase()) ||
                         (q.subject || '').toLowerCase().includes(bankSearch.toLowerCase()) ||
                         (q.tags || []).some(t => t && t.toLowerCase().includes(bankSearch.toLowerCase()));
    return matchesSubject && matchesStatus && matchesReason && matchesSource && matchesTags && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const paginatedQuestions = filteredQuestions.slice(safeCurrentPage * PAGE_SIZE, (safeCurrentPage + 1) * PAGE_SIZE);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl glass-card rounded-3xl p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('home')} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" style={{ color: primaryColor }} />
          </button>
          <h2 className="text-3xl font-romantic font-bold" style={{ color: accentColor }}>Banco de Questões</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300 cursor-pointer" onClick={() => { setBankSearch(''); setCurrentPage(0); }} />
            <input type="text" placeholder="Pesquisar questões..." value={bankSearch} onChange={(e) => { setBankSearch(e.target.value); setCurrentPage(0); }} className="w-full pl-4 pr-10 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm" style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any} />
          </div>
          <select value={bankSubject} onChange={(e) => { setBankSubject(e.target.value); setCurrentPage(0); }} className="px-4 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm" style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}>
            <option value="Todas">Todas as matérias</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={bankErrorReason} onChange={(e) => { setBankErrorReason(e.target.value); setCurrentPage(0); }} className="px-4 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm" style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}>
            <option value="all">Todos os motivos</option>
            {ERROR_REASONS.map(r => <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>)}
          </select>
          <select value={bankSource} onChange={(e) => { setBankSource(e.target.value); setCurrentPage(0); }} className="px-4 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm" style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}>
            <option value="all">Todas as origens</option>
            <option value="__manual__">✍️ Criadas por mim</option>
            <option value="__imported__">📄 Importadas de provas</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex bg-white/50 p-1 rounded-xl border" style={{ borderColor: `${primaryColor}20` }}>
            <button onClick={() => { setBankStatus('all'); setCurrentPage(0); }} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${bankStatus === 'all' ? 'bg-white shadow-sm' : 'text-gray-400'}`} style={{ color: bankStatus === 'all' ? primaryColor : undefined }}>Todas</button>
            <button onClick={() => { setBankStatus('correct'); setCurrentPage(0); }} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${bankStatus === 'correct' ? 'bg-white shadow-sm' : 'text-gray-400'}`} style={{ color: bankStatus === 'correct' ? '#10b981' : undefined }}>Certas</button>
            <button onClick={() => { setBankStatus('incorrect'); setCurrentPage(0); }} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${bankStatus === 'incorrect' ? 'bg-white shadow-sm' : 'text-gray-400'}`} style={{ color: bankStatus === 'incorrect' ? '#f43f5e' : undefined }}>Erradas</button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accentColor }}>Filtrar por Tag</label>
        <div className="max-w-md">
          <MultiSelectFilter
            selected={bankTags}
            setSelected={(v) => { setBankTags(v); setCurrentPage(0); }}
            options={availableTags}
            primaryColor={primaryColor}
            accentColor={accentColor}
            placeholder="Todas as tags"
            emptyText={availableTags.length === 0 ? 'Nenhuma tag disponível' : 'Nenhuma opção disponível'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {paginatedQuestions.length > 0 ? (
          paginatedQuestions.map(q => (
            <motion.div layout key={q.id} className="bg-white/60 rounded-2xl border border-white/80 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: q.lastResult === 'correct' ? '#10b981' : (q.lastResult === 'incorrect' ? '#f43f5e' : primaryColor) }}></div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>{q.subject}</span>
                <div className="flex items-center gap-1">
                  {q.errorReason && errorReasonLabel(q.errorReason) && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-100 text-amber-700" title="Motivo do erro">
                      {errorReasonLabel(q.errorReason)!.emoji} {errorReasonLabel(q.errorReason)!.label}
                    </span>
                  )}
                  {q.lastResult && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${q.lastResult === 'correct' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {q.lastResult === 'correct' ? 'Acertou' : 'Errou'}
                    </span>
                  )}
                </div>
              </div>
              <div className="mb-4">
                {q.source && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md mb-2 bg-indigo-50 text-indigo-600 border border-indigo-100">
                    📄 {q.source}
                  </span>
                )}
                {q.imageUrl && <img src={q.imageUrl} alt="Questão" className="w-full h-32 object-cover rounded-lg mb-3" />}
                <p className="text-sm text-gray-700 line-clamp-3 font-medium">{q.text || "Questão baseada em imagem"}</p>
              </div>
              <div className="flex flex-wrap gap-1 mb-4">
                {q.tags.map(t => (
                  <span key={t} className="text-[9px] px-2 py-0.5 bg-white/80 rounded-full text-gray-500 border border-gray-100">#{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">Gabarito: {q.answer}</span>
                  {(q.reviewCount || 0) > 0 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                      {q.reviewCount}x revisada
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onEditQuestion(q)} className="p-2 text-gray-300 hover:text-blue-500 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {deletingId === q.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 rounded-lg p-1 border border-rose-100">
                      <button onClick={() => { setQuestions(prev => prev.filter(item => item.id !== q.id)); setDeletingId(null); }} className="text-[10px] font-bold text-rose-600 px-2 py-1 hover:bg-rose-100 rounded transition-colors">Confirmar</button>
                      <button onClick={() => setDeletingId(null)} className="text-[10px] font-bold text-gray-400 px-2 py-1 hover:bg-gray-100 rounded transition-colors">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingId(q.id)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-pink-300 opacity-50">
            <Heart className="w-16 h-16 mb-4" />
            <p className="text-xl font-romantic font-bold">Nenhuma questão encontrada</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/50">
          <button disabled={safeCurrentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="p-2 rounded-lg hover:bg-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-5 h-5" style={{ color: primaryColor }} />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setCurrentPage(i)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${safeCurrentPage === i ? 'text-white shadow-md' : 'bg-white/50 hover:bg-white/80'}`} style={{ backgroundColor: safeCurrentPage === i ? primaryColor : undefined, color: safeCurrentPage !== i ? primaryColor : undefined }}>
                {i + 1}
              </button>
            ))}
          </div>
          <button disabled={safeCurrentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} className="p-2 rounded-lg hover:bg-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-5 h-5" style={{ color: primaryColor }} />
          </button>
          <span className="text-xs text-gray-400 ml-2">{filteredQuestions.length} questões</span>
        </div>
      )}
    </motion.div>
  );
}
