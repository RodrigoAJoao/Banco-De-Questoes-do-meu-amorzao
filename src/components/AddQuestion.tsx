import { motion } from 'motion/react';
import { ArrowLeft, Upload, Image as ImageIcon, X, Plus } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import type { ErrorReason } from '../types';
import TagAutocomplete from './TagAutocomplete';
import ErrorReasonSelector from './ErrorReasonSelector';

interface AddQuestionProps {
  questionText: string; setQuestionText: (v: string) => void;
  questionResolution: string; setQuestionResolution: (v: string) => void;
  resolutionType: 'text' | 'image'; setResolutionType: (v: 'text' | 'image') => void;
  resolutionImages: string[];
  onRemoveResolutionImage: (index: number) => void;
  selectedAnswer: string; setSelectedAnswer: (v: string) => void;
  selectedSubject: string; setSelectedSubject: (v: string) => void;
  tags: string[]; setTags: (v: string[]) => void; allTags: string[];
  errorReason: ErrorReason | undefined; setErrorReason: (v: ErrorReason | undefined) => void;
  imagePreview: string | null;
  onRemoveImage: () => void;
  editingQuestionId: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  resolutionFileInputRef: RefObject<HTMLInputElement | null>;
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onResolutionImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  primaryColor: string; accentColor: string;
  subjects: string[]; answers: string[];
}

export default function AddQuestion(p: AddQuestionProps) {
  return (
    <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-4xl glass-card rounded-3xl p-8">
      <div className="flex items-center mb-8">
        <button onClick={p.onCancel} className="p-2 hover:bg-pink-100 rounded-full transition-colors mr-4">
          <ArrowLeft className="w-6 h-6" style={{ color: p.primaryColor }} />
        </button>
        <h2 className="text-3xl font-romantic font-bold" style={{ color: p.accentColor }}>
          {p.editingQuestionId ? 'Editar Questão' : 'Adicionar Nova Questão'}
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>Texto da Questão</label>
            <textarea value={p.questionText} onChange={(e) => p.setQuestionText(e.target.value)} placeholder="Digite o enunciado da questão aqui..." className="w-full h-48 p-4 bg-white/50 border rounded-xl focus:ring-2 outline-none transition-all resize-none" style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold" style={{ color: p.accentColor }}>Resolução da Questão (Opcional)</label>
              <div className="flex p-1 rounded-lg" style={{ backgroundColor: `${p.primaryColor}10` }}>
                <button onClick={() => p.setResolutionType('text')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${p.resolutionType === 'text' ? 'bg-white shadow-sm' : ''}`} style={{ color: p.resolutionType === 'text' ? p.primaryColor : `${p.primaryColor}60` }}>Texto</button>
                <button onClick={() => p.setResolutionType('image')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${p.resolutionType === 'image' ? 'bg-white shadow-sm' : ''}`} style={{ color: p.resolutionType === 'image' ? p.primaryColor : `${p.primaryColor}60` }}>Imagens</button>
              </div>
            </div>
            {p.resolutionType === 'text' ? (
              <textarea value={p.questionResolution} onChange={(e) => p.setQuestionResolution(e.target.value)} placeholder="Explique a resolução..." className="w-full h-32 p-4 bg-white/50 border rounded-xl focus:ring-2 outline-none transition-all resize-none" style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any} />
            ) : (
              <div>
                {p.resolutionImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {p.resolutionImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border" style={{ borderColor: `${p.primaryColor}30` }}>
                        <img src={img} alt={`Resolução ${idx + 1}`} className="w-full h-24 object-cover" />
                        <button type="button" onClick={() => p.onRemoveResolutionImage(idx)} className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 shadow-md opacity-90 hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div onClick={() => p.resolutionFileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all" style={{ borderColor: `${p.primaryColor}40`, backgroundColor: `${p.primaryColor}05` }}>
                  <div className="flex flex-col items-center">
                    <Plus className="w-6 h-6 mb-1" style={{ color: p.primaryColor }} />
                    <span className="text-xs" style={{ color: p.primaryColor }}>
                      {p.resolutionImages.length > 0 ? 'Adicionar mais imagens' : 'Adicionar imagens da resolução'}
                    </span>
                  </div>
                </div>
                <input type="file" ref={p.resolutionFileInputRef} onChange={p.onResolutionImageUpload} accept="image/*" multiple className="hidden" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>Imagem da Questão (Opcional)</label>
            {p.imagePreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border-2" style={{ borderColor: `${p.primaryColor}30` }}>
                <img src={p.imagePreview} alt="Preview" className="w-full h-full object-contain bg-white/40" />
                <button type="button" onClick={(e) => { e.stopPropagation(); p.onRemoveImage(); }} className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-md hover:bg-rose-600 transition-colors" title="Remover imagem">
                  <X className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => p.fileInputRef.current?.click()} className="absolute bottom-2 right-2 bg-white/90 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm hover:bg-white transition-colors" style={{ color: p.primaryColor }} title="Trocar imagem">
                  Trocar
                </button>
              </div>
            ) : (
              <div onClick={() => p.fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden" style={{ borderColor: `${p.primaryColor}40`, backgroundColor: `${p.primaryColor}05` }}>
                <div className="flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 mb-2" style={{ color: p.primaryColor }} />
                  <span className="text-sm font-medium" style={{ color: p.primaryColor }}>Clique para upload</span>
                </div>
              </div>
            )}
            <input type="file" ref={p.fileInputRef} onChange={p.onImageUpload} accept="image/*" className="hidden" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-3" style={{ color: p.accentColor }}>Resposta Correta</label>
            <div className="flex gap-2">
              {p.answers.map(a => (
                <button key={a} onClick={() => p.setSelectedAnswer(a)} className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${p.selectedAnswer === a ? 'text-white shadow-lg scale-105' : 'bg-white/50 hover:bg-pink-50'}`} style={{ backgroundColor: p.selectedAnswer === a ? p.primaryColor : undefined, color: p.selectedAnswer !== a ? p.primaryColor : undefined }}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3" style={{ color: p.accentColor }}>Matéria</label>
            <div className="grid grid-cols-2 gap-2">
              {p.subjects.map(s => (
                <button key={s} onClick={() => p.setSelectedSubject(s)} className={`py-2 px-3 rounded-xl text-sm font-bold transition-all ${p.selectedSubject === s ? 'text-white shadow-md' : 'bg-white/50 hover:bg-pink-50'}`} style={{ backgroundColor: p.selectedSubject === s ? p.primaryColor : undefined, color: p.selectedSubject !== s ? p.primaryColor : undefined }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>Tags</label>
            <TagAutocomplete tags={p.tags} setTags={p.setTags} allTags={p.allTags} primaryColor={p.primaryColor} accentColor={p.accentColor} placeholder="Digite para buscar ou criar tag..." />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>Motivo do Erro (Opcional)</label>
            <ErrorReasonSelector value={p.errorReason} onChange={p.setErrorReason} primaryColor={p.primaryColor} accentColor={p.accentColor} />
          </div>

          <motion.button onClick={p.onSubmit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors" style={{ backgroundColor: p.primaryColor }}>
            {p.editingQuestionId ? 'Salvar Alterações' : 'Salvar Questão'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
