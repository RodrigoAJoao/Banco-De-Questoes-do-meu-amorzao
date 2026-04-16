import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import type { View } from '../types';

interface EditProfileProps {
  userName: string; setUserName: (v: string) => void;
  userPhoto: string | null; setUserPhoto: (v: string | null) => void;
  bgImage: string | null; setBgImage: (v: string | null) => void;
  primaryColor: string; setPrimaryColor: (v: string) => void;
  secondaryColor: string; setSecondaryColor: (v: string) => void;
  accentColor: string; setAccentColor: (v: string) => void;
  statsColor: string; setStatsColor: (v: string) => void;
  statsBgColor: string; setStatsBgColor: (v: string) => void;
  profilePhotoInputRef: RefObject<HTMLInputElement | null>;
  bgImageInputRef: RefObject<HTMLInputElement | null>;
  onProfilePhotoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onBgImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onResetDefaults: () => void;
  onNavigate: (v: View) => void;
}

export default function EditProfile(p: EditProfileProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-4xl glass-card rounded-3xl p-8">
      <div className="flex items-center mb-8">
        <button onClick={() => p.onNavigate('home')} className="p-2 hover:bg-pink-100 rounded-full transition-colors mr-4">
          <ArrowLeft className="w-6 h-6" style={{ color: p.primaryColor }} />
        </button>
        <h2 className="text-3xl font-romantic font-bold" style={{ color: p.accentColor }}>Editar Perfil</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>Nome do Usuário</label>
            <input type="text" value={p.userName} onChange={(e) => p.setUserName(e.target.value)} className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none" style={{ borderColor: `${p.primaryColor}20`, '--tw-ring-color': p.primaryColor } as any} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold" style={{ color: p.accentColor }}>Foto de Perfil</label>
              {p.userPhoto && (
                <button onClick={() => p.setUserPhoto(null)} className="text-xs font-bold flex items-center gap-1 hover:text-rose-500 transition-colors" style={{ color: `${p.primaryColor}80` }}>
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>
            <div onClick={() => p.profilePhotoInputRef.current?.click()} className="w-32 h-32 border-2 border-dashed rounded-full flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative" style={{ borderColor: `${p.primaryColor}40`, backgroundColor: `${p.primaryColor}05` }}>
              {p.userPhoto ? (
                <img src={p.userPhoto} alt="Profile Preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6" style={{ color: p.primaryColor }} />
              )}
            </div>
            <input type="file" ref={p.profilePhotoInputRef} onChange={p.onProfilePhotoUpload} accept="image/*" className="hidden" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold" style={{ color: p.accentColor }}>Imagem de Fundo</label>
              {p.bgImage && (
                <button onClick={() => p.setBgImage(null)} className="text-xs font-bold flex items-center gap-1 hover:text-rose-500 transition-colors" style={{ color: `${p.primaryColor}80` }}>
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>
            <div onClick={() => p.bgImageInputRef.current?.click()} className="w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative" style={{ borderColor: `${p.primaryColor}40`, backgroundColor: `${p.primaryColor}05` }}>
              {p.bgImage ? (
                <img src={p.bgImage} alt="Background Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 mb-2" style={{ color: p.primaryColor }} />
                  <span className="text-sm font-medium" style={{ color: p.primaryColor }}>Upload de fundo</span>
                </div>
              )}
            </div>
            <input type="file" ref={p.bgImageInputRef} onChange={p.onBgImageUpload} accept="image/*" className="hidden" />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: p.accentColor }}>Cores do Tema</h3>
          <div className="space-y-4">
            {[
              { label: 'Cor Principal (Botões)', value: p.primaryColor, onChange: p.setPrimaryColor },
              { label: 'Cor de Fundo (Página)', value: p.secondaryColor, onChange: p.setSecondaryColor },
              { label: 'Cor de Destaque (Títulos)', value: p.accentColor, onChange: p.setAccentColor },
              { label: 'Cor dos Cards de Estatística (Ícones)', value: p.statsColor, onChange: p.setStatsColor },
              { label: 'Cor dos Cards de Estatística (Fundo)', value: p.statsBgColor, onChange: p.setStatsBgColor },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="block text-sm font-semibold mb-2" style={{ color: p.accentColor }}>{label}</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-none" />
                  <span className="text-sm font-mono" style={{ color: p.primaryColor }}>{value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 space-y-3">
            <motion.button onClick={() => p.onNavigate('home')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors" style={{ backgroundColor: p.primaryColor }}>
              Salvar Perfil
            </motion.button>
            
            {!showResetConfirm ? (
              <motion.button onClick={() => setShowResetConfirm(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3 bg-white/50 border-2 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2" style={{ color: '#f43f5e', borderColor: '#f43f5e20' }}>
                <Trash2 className="w-4 h-4" /> Redefinir para o Padrão
              </motion.button>
            ) : (
              <div className="flex gap-2">
                <motion.button onClick={() => { p.onResetDefaults(); setShowResetConfirm(false); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm shadow-sm transition-colors">Confirmar Reset</motion.button>
                <motion.button onClick={() => setShowResetConfirm(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm shadow-sm transition-colors">Cancelar</motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
