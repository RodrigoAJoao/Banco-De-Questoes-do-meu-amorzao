import { motion } from 'motion/react';
import { ArrowLeft, Upload, Image as ImageIcon, X, Tag } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';

interface AddQuestionProps {
  questionText: string; setQuestionText: (v: string) => void;
  questionResolution: string; setQuestionResolution: (v: string) => void;
  resolutionType: 'text' | 'image'; setResolutionType: (v: 'text' | 'image') => void;
  resolutionImagePreview: string | null;
  selectedAnswer: string; setSelectedAnswer: (v: string) => void;
  selectedSubject: string; setSelectedSubject: (v: string) => void;
  tags: string[]; tagInput: string; setTagInput: (v: string) => void;
  imagePreview: string | null;
  editingQuestionId: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  resolutionFileInputRef: RefObject<HTMLInputElement | null>;
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onResolutionImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddTag: (e: KeyboardEvent) => void;
  onRemoveTag: (tag: string) => void;
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
                <button onClick={() => p.setResolutionType('image')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${p.resolutionType === 'image' ? 'bg-white shadow-sm' : ''}`} style={{ color: p.resolutionType === 'image' ? p.primaryColor : `${p.primaryColor}60` }}>Imagem</button>
              </div>
            </div>
            {p.resolutionType === 'text' ? (
              <textarea value={p.questionResolution} onChange={(e) => p.setQuestionResolution(e.target.value)} placeholder="Explique a resolução..." className="w-full h-32 p-4 bg-white/50 border rounded-xl focus:ring-2 outline-none transition-all resize-none" style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any} />
            ) : (
              <div>
                <div onClick={() => p.resolutionFileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden" style={{ borderColor: `${p.primaryColor}40`, backgroundColor: `${p.primaryColor}05` }}>
                  {p.resolutionImagePreview ? (
                    <img src={p.resolutionImagePreview} alt="Resolution Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-6 h-6 mb-1" style={{ color: p.primaryColor }} />
                      <span className="text-xs" style={{ color: p.primaryColor }}>Upload da resolução</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={p.resolutionFileInputRef} onChange={p.onResolutionImageUpload} accept="image/*" className="hidden" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>Imagem da Questão (Opcional)</label>
            <div onClick={() => p.fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden" style={{ borderColor: `${p.primaryColor}40`, backgroundColor: `${p.primaryColor}05` }}>
              {p.imagePreview ? (
                <img src={p.imagePreview} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 mb-2" style={{ color: p.primaryColor }} />
                  <span className="text-sm font-medium" style={{ color: p.primaryColor }}>Clique para upload</span>
                </div>
              )}
            </div>
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
            <div className="flex flex-wrap gap-2 mb-2">
              {p.tags.map(t => (
                <span key={t} className="px-3 py-1 bg-white/80 rounded-full text-sm font-medium flex items-center gap-1" style={{ color: p.primaryColor }}>
                  <Tag className="w-3 h-3" /> {t}
                  <button onClick={() => p.onRemoveTag(t)} className="ml-1 hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <input type="text" value={p.tagInput} onChange={(e) => p.setTagInput(e.target.value)} onKeyDown={p.onAddTag} placeholder="Pressione Enter para adicionar tag..." className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none" style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any} />
          </div>

          <motion.button onClick={p.onSubmit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors" style={{ backgroundColor: p.primaryColor }}>
            {p.editingQuestionId ? 'Salvar Alterações' : 'Salvar Questão'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
