import { useState, useRef, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, FileUp, Loader2, CheckCircle2, FileText, Sparkles, Tag, ImageUp, RotateCcw, Lightbulb, Plus, X } from 'lucide-react';
import type { Question, View } from '../types';
import { ANSWERS } from '../types';
import { extractExam } from '../pdfImport';
import type { ExtractedQuestion } from '../pdfImport';
import { serverAvailable, extractViaServer, shouldTryServer, isServerConfigured } from '../pdfImportServer';
import TagAutocomplete from './TagAutocomplete';

interface ImportProvaProps {
  subjects: string[];
  allTags: string[];
  primaryColor: string; accentColor: string;
  onNavigate: (v: View) => void;
  onImport: (questions: Question[]) => void;
}

interface CardState { selected: boolean; subject: string; answer: string; tags: string[]; imageOverride?: string; resolution: string; resolutionImages: string[] }

export default function ImportProva(p: ImportProvaProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const swapInputRef = useRef<HTMLInputElement>(null);
  const swapIdx = useRef<number>(-1);
  const resInputRef = useRef<HTMLInputElement>(null);
  const resIdx = useRef<number>(-1);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [examType, setExamType] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [cards, setCards] = useState<CardState[]>([]);
  const [sectionFilter, setSectionFilter] = useState<string>('Todas');
  const [importTags, setImportTags] = useState<string[]>([]);
  const [usedServer, setUsedServer] = useState(false);

  const sections = useMemo(() => Array.from(new Set(questions.map(q => q.section))).filter(Boolean), [questions]);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (file) await processFile(file);
  };

  const processFile = async (file: File) => {
    if (!/\.pdf$/i.test(file.name)) { setError('Selecione um arquivo PDF.'); return; }
    setError(null); setStatus('processing'); setProgress(0); setProgressMsg('Abrindo PDF...');
    setQuestions([]); setCards([]);
    try {
      // Tenta o extrator server-side (PyMuPDF, melhor qualidade); se indisponível,
      // usa o extrator do navegador (pdfjs).
      let result;
      const runClient = () => extractExam(file, (msg, pct) => { setProgressMsg(msg); setProgress(pct); });

      // Servidor remoto configurado (produção): vai direto (acorda cold start).
      // Local (dev): faz um health-check rápido antes.
      let tryServer = false;
      if (shouldTryServer()) {
        if (isServerConfigured()) {
          tryServer = true;
        } else {
          setProgressMsg('Verificando extrator avançado...');
          tryServer = await serverAvailable();
        }
      }

      if (tryServer) {
        try {
          setProgress(15);
          setProgressMsg('Extraindo no servidor (PyMuPDF)... pode levar até 1 min na 1ª vez');
          result = await extractViaServer(file);
          setProgress(100); setUsedServer(true);
        } catch (srvErr) {
          console.warn('Servidor falhou, usando extrator do navegador', srvErr);
          setError('Não foi possível usar o servidor de extração; usando o extrator do navegador.');
          setUsedServer(false);
          result = await runClient();
        }
      } else {
        setUsedServer(false);
        result = await runClient();
      }
      setExamType(result.examType);
      setSourceLabel(result.suggestedSource || 'Prova importada');
      setQuestions(result.questions);
      setCards(result.questions.map(q => ({ selected: true, subject: q.section, answer: 'A', tags: [], resolution: '', resolutionImages: [] })));
      setStatus('done');
      if (result.questions.length === 0) setError('Nenhuma questão detectada automaticamente neste PDF.');
    } catch (err) {
      console.error(err);
      setError('Erro ao processar o PDF. Ele pode estar protegido ou em um formato não suportado.');
      setStatus('idle');
    }
  };

  const visibleIdx = questions.map((_, i) => i).filter(i => sectionFilter === 'Todas' || questions[i].section === sectionFilter);
  const selectedCount = cards.filter(c => c.selected).length;

  const setAllVisible = (val: boolean) => {
    setCards(prev => prev.map((c, i) => visibleIdx.includes(i) ? { ...c, selected: val } : c));
  };
  const updateCard = (i: number, patch: Partial<CardState>) => {
    setCards(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  };

  // Troca a imagem recortada automaticamente por uma imagem enviada pelo usuário.
  const openSwap = (i: number) => { swapIdx.current = i; swapInputRef.current?.click(); };
  const handleSwapFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    const i = swapIdx.current;
    if (!file || i < 0) return;
    if (!/^image\//.test(file.type)) { setError('Selecione um arquivo de imagem.'); return; }
    const reader = new FileReader();
    reader.onload = () => updateCard(i, { imageOverride: reader.result as string });
    reader.readAsDataURL(file);
  };

  // Adiciona imagens da resolução a uma questão (aceita várias de uma vez).
  const openResUpload = (i: number) => { resIdx.current = i; resInputRef.current?.click(); };
  const handleResFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (e.target) e.target.value = '';
    const i = resIdx.current;
    if (i < 0 || files.length === 0) return;
    files.forEach((file) => {
      if (!/^image\//.test(file.type)) return;
      const reader = new FileReader();
      reader.onload = () => setCards(prev => prev.map((c, idx) =>
        idx === i ? { ...c, resolutionImages: [...c.resolutionImages, reader.result as string] } : c));
      reader.readAsDataURL(file);
    });
  };
  const removeResImage = (i: number, imgIdx: number) => setCards(prev => prev.map((c, idx) =>
    idx === i ? { ...c, resolutionImages: c.resolutionImages.filter((_, k) => k !== imgIdx) } : c));

  const doImport = () => {
    const now = Date.now();
    const toImport: Question[] = [];
    questions.forEach((q, i) => {
      if (!cards[i].selected) return;
      toImport.push({
        id: `${now}_${i}`,
        text: q.text || '',
        imageUrl: cards[i].imageOverride || q.imageDataUrl,
        answer: cards[i].answer,
        subject: cards[i].subject,
        tags: Array.from(new Set([...importTags, ...cards[i].tags])),
        createdAt: now + i,
        resolution: cards[i].resolution.trim() || undefined,
        resolutionImageUrls: cards[i].resolutionImages,
        source: sourceLabel.trim() || 'Prova importada',
      });
    });
    if (toImport.length === 0) return;
    p.onImport(toImport);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl glass-card rounded-3xl p-8">
      <input type="file" ref={swapInputRef} accept="image/*" onChange={handleSwapFile} className="hidden" />
      <input type="file" ref={resInputRef} accept="image/*" multiple onChange={handleResFiles} className="hidden" />
      <div className="flex items-center mb-6">
        <button onClick={() => p.onNavigate('home')} className="p-2 hover:bg-pink-100 rounded-full transition-colors mr-4">
          <ArrowLeft className="w-6 h-6" style={{ color: p.primaryColor }} />
        </button>
        <h2 className="text-3xl font-romantic font-bold" style={{ color: p.accentColor }}>Importar Prova (PDF)</h2>
      </div>

      {status !== 'done' && (
        <div className="flex flex-col items-center justify-center py-10">
          <div
            onClick={() => status !== 'processing' && fileRef.current?.click()}
            className={`w-full max-w-xl border-2 border-dashed rounded-3xl flex flex-col items-center justify-center py-12 px-6 transition-all ${status === 'processing' ? 'opacity-70' : 'cursor-pointer hover:bg-pink-50/40'}`}
            style={{ borderColor: `${p.primaryColor}50`, backgroundColor: `${p.primaryColor}06` }}
          >
            {status === 'processing' ? (
              <>
                <Loader2 className="w-12 h-12 mb-4 animate-spin" style={{ color: p.primaryColor }} />
                <p className="font-bold text-lg mb-2" style={{ color: p.accentColor }}>{progressMsg}</p>
                <div className="w-full max-w-sm h-2 bg-white/70 rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: p.primaryColor }} />
                </div>
              </>
            ) : (
              <>
                <FileUp className="w-14 h-14 mb-4" style={{ color: p.primaryColor }} />
                <p className="font-bold text-xl mb-1" style={{ color: p.accentColor }}>Selecione o PDF da prova</p>
                <p className="text-sm text-gray-500 text-center max-w-md">ENEM ou UFRGS. As questões serão detectadas e recortadas automaticamente (sem a redação). Você escolhe quais importar.</p>
              </>
            )}
          </div>
          <input type="file" ref={fileRef} accept="application/pdf,.pdf" onChange={handleFile} className="hidden" />
          {error && <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
        </div>
      )}

      {status === 'done' && (
        <div>
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-5 p-4 rounded-2xl" style={{ backgroundColor: `${p.primaryColor}08` }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: p.primaryColor }} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: p.primaryColor }}>{examType}</p>
                <p className="text-sm text-gray-600">{questions.length} questões detectadas
                  <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${usedServer ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {usedServer ? '✓ servidor (PyMuPDF)' : 'navegador'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1" style={{ color: p.accentColor }}>Origem (fica salva em cada questão)</label>
              <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} className="w-full p-2.5 bg-white/70 border rounded-xl outline-none focus:ring-2 text-sm" style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any} />
            </div>
            <button onClick={() => { setStatus('idle'); setError(null); }} className="px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:bg-white" style={{ borderColor: `${p.primaryColor}30`, color: p.primaryColor }}>
              Outro PDF
            </button>
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: p.accentColor }}>
              <Tag className="w-3.5 h-3.5" /> Tags gerais (aplicadas a todas) — cada questão também tem tags próprias abaixo
            </label>
            <div className="max-w-xl">
              <TagAutocomplete tags={importTags} setTags={setImportTags} allTags={p.allTags} primaryColor={p.primaryColor} accentColor={p.accentColor} placeholder="Ex.: Cinemática, ENEM 2025..." />
            </div>
          </div>

          {error && <p className="mb-4 text-sm font-medium text-amber-600">{error}</p>}

          {questions.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-bold" style={{ color: p.accentColor }}>Área:</span>
                {['Todas', ...sections].map(s => (
                  <button key={s} onClick={() => setSectionFilter(s)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${sectionFilter === s ? 'text-white shadow-sm' : 'bg-white/60'}`} style={{ backgroundColor: sectionFilter === s ? p.primaryColor : undefined, color: sectionFilter === s ? undefined : p.primaryColor }}>{s}</button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setAllVisible(true)} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${p.primaryColor}12`, color: p.primaryColor }}>Selecionar todas</button>
                  <button onClick={() => setAllVisible(false)} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500">Limpar</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1 pb-2">
                {visibleIdx.map(i => {
                  const q = questions[i];
                  const c = cards[i];
                  return (
                    <div key={i} className={`rounded-2xl border-2 overflow-hidden transition-all ${c.selected ? '' : 'opacity-60'}`} style={{ borderColor: c.selected ? p.primaryColor : '#e5e7eb', backgroundColor: 'white' }}>
                      <div className="relative">
                        <img src={c.imageOverride || q.imageDataUrl} alt={q.label} className="w-full max-h-56 object-contain bg-white border-b" />
                        <button onClick={() => updateCard(i, { selected: !c.selected })} className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-colors" style={{ backgroundColor: c.selected ? p.primaryColor : 'white', color: c.selected ? 'white' : '#9ca3af' }}>
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <span className="absolute top-2 right-2 text-[11px] font-bold px-2 py-1 rounded-lg bg-black/55 text-white">{q.label}</span>
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                          {c.imageOverride && (
                            <button onClick={() => updateCard(i, { imageOverride: undefined })} className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white/90 shadow-sm hover:bg-white transition-colors text-gray-600" title="Voltar à imagem recortada da prova">
                              <RotateCcw className="w-3 h-3" /> Reverter
                            </button>
                          )}
                          <button onClick={() => openSwap(i)} className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white/90 shadow-sm hover:bg-white transition-colors" style={{ color: p.primaryColor }} title="Trocar por uma imagem sua">
                            <ImageUp className="w-3.5 h-3.5" /> Trocar
                          </button>
                        </div>
                        {c.imageOverride && (
                          <span className="absolute bottom-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/90 text-white">imagem trocada</span>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold uppercase text-gray-400 w-14">Matéria</label>
                          <select value={c.subject} onChange={(e) => updateCard(i, { subject: e.target.value })} className="flex-1 p-1.5 bg-white border rounded-lg text-xs outline-none" style={{ borderColor: `${p.primaryColor}20` }}>
                            {p.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold uppercase text-gray-400 w-14">Gabarito</label>
                          <div className="flex gap-1">
                            {ANSWERS.map(a => (
                              <button key={a} onClick={() => updateCard(i, { answer: a })} className={`w-6 h-6 rounded-md text-[11px] font-bold transition-all ${c.answer === a ? 'text-white' : 'bg-gray-100 text-gray-500'}`} style={{ backgroundColor: c.answer === a ? p.primaryColor : undefined }}>{a}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1 mb-1"><Tag className="w-3 h-3" /> Tags desta questão</label>
                          <TagAutocomplete tags={c.tags} setTags={(t) => updateCard(i, { tags: t })} allTags={p.allTags} primaryColor={p.primaryColor} accentColor={p.accentColor} placeholder="Tag só desta questão..." />
                        </div>
                        <div className="pt-2 border-t" style={{ borderColor: `${p.primaryColor}12` }}>
                          <label className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1 mb-1"><Lightbulb className="w-3 h-3" /> Resolução desta questão (opcional)</label>
                          <textarea value={c.resolution} onChange={(e) => updateCard(i, { resolution: e.target.value })} placeholder="Explique a resolução (texto)..." className="w-full p-2 bg-white border rounded-lg text-xs outline-none focus:ring-2 resize-none" rows={2} style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any} />
                          {c.resolutionImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                              {c.resolutionImages.map((img, idx) => (
                                <div key={idx} className="relative rounded-lg overflow-hidden border" style={{ borderColor: `${p.primaryColor}30` }}>
                                  <img src={img} alt={`Resolução ${idx + 1}`} className="w-full h-14 object-cover" />
                                  <button type="button" onClick={() => removeResImage(i, idx)} className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full p-0.5 shadow opacity-90 hover:opacity-100" title="Remover imagem">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <button type="button" onClick={() => openResUpload(i)} className="mt-1.5 w-full flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-lg border border-dashed transition-colors hover:bg-white" style={{ borderColor: `${p.primaryColor}40`, color: p.primaryColor }}>
                            <Plus className="w-3 h-3" /> {c.resolutionImages.length > 0 ? 'Adicionar mais imagens' : 'Imagens da resolução'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: `${p.primaryColor}15` }}>
                <p className="text-sm text-gray-500 flex items-center gap-2"><FileText className="w-4 h-4" /> {selectedCount} selecionada(s) para importar</p>
                <motion.button onClick={doImport} disabled={selectedCount === 0} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ backgroundColor: p.primaryColor }}>
                  Importar {selectedCount > 0 ? selectedCount : ''} questões
                </motion.button>
              </div>
              <p className="text-xs text-gray-400 mt-2">O gabarito não vem na prova — ajuste-o em cada questão (padrão A) agora ou depois no banco. As questões importadas ficam marcadas pela origem.</p>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
