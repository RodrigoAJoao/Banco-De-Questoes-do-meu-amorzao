import { motion, AnimatePresence } from 'motion/react';
import { Heart, ChevronLeft, ChevronRight, Play, Plus, Image as ImageIcon, TrendingUp, User, Download, Upload } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import type { View, StatCard } from '../types';

interface HomeProps {
  userName: string;
  userPhoto: string | null;
  primaryColor: string;
  accentColor: string;
  statsBgColor: string;
  stats: StatCard[];
  currentIndex: number;
  onPrevStat: () => void;
  onNextStat: () => void;
  onNavigate: (view: View) => void;
  onExport: () => void;
  importRef: RefObject<HTMLInputElement | null>;
  onImport: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function Home({ userName, userPhoto, primaryColor, accentColor, statsBgColor, stats, currentIndex, onPrevStat, onNextStat, onNavigate, onExport, importRef, onImport }: HomeProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full flex flex-col items-center">
      <div className="flex flex-col items-center mb-12">
        <div 
          className="w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-lg overflow-hidden border-4 border-white"
          style={{ backgroundColor: primaryColor }}
        >
           <div className="w-full h-full flex items-center justify-center">
             {userPhoto ? (
               <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <Heart className="w-16 h-16 text-white fill-white" />
             )}
           </div>
        </div>
        <h1 className="text-4xl font-romantic font-bold tracking-tight" style={{ color: accentColor }}>{userName}</h1>
        <p className="font-serif italic mt-2" style={{ color: primaryColor }}>Estudando com amor</p>
      </div>

      <div className="relative w-full max-w-5xl mb-12 flex items-center justify-center gap-4 overflow-hidden py-4">
        <button onClick={onPrevStat} className="absolute left-0 z-10 p-2 bg-white/80 rounded-full shadow-md hover:bg-pink-50 transition-colors lg:hidden">
          <ChevronLeft className="w-6 h-6" style={{ color: primaryColor }} />
        </button>

        <div className="flex items-center justify-center gap-6 w-full">
          <div className="hidden lg:flex items-center justify-center gap-6 w-full">
            {stats.map((stat, idx) => {
              const isCenter = idx === currentIndex;
              return (
                <motion.div
                  key={stat.id}
                  animate={{ 
                    scale: isCenter ? 1.05 : 0.85,
                    opacity: isCenter ? 1 : 0.5,
                    zIndex: isCenter ? 20 : 10
                  }}
                  className={`${stat.textColor} rounded-[2rem] p-8 flex flex-col items-center justify-center shadow-sm transition-all duration-300 border-2 border-white/50 ${
                    isCenter ? 'w-[450px] h-[280px] shadow-2xl' : 'w-[280px] h-[200px]'
                  }`}
                  style={{ backgroundColor: statsBgColor }}
                >
                  <div className="mb-4">{stat.icon}</div>
                  <div className={`font-bold ${isCenter ? 'text-5xl' : 'text-3xl'} mb-2`}>{stat.value}</div>
                  <div className={`text-center ${isCenter ? 'text-lg' : 'text-sm'} font-medium uppercase tracking-wider`}>{stat.label}</div>
                </motion.div>
              );
            })}
          </div>

          <div className="lg:hidden w-full flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className={`${stats[currentIndex].textColor} w-full max-w-sm h-[250px] rounded-[2rem] p-8 flex flex-col items-center justify-center shadow-xl border-2 border-white/50`}
                style={{ backgroundColor: statsBgColor }}
              >
                <div className="mb-4">{stats[currentIndex].icon}</div>
                <div className="font-bold text-5xl mb-2">{stats[currentIndex].value}</div>
                <div className="text-center text-lg font-medium">{stats[currentIndex].label}</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <button onClick={onNextStat} className="absolute right-0 z-10 p-2 bg-white/80 rounded-full shadow-md hover:bg-pink-50 transition-colors lg:hidden">
          <ChevronRight className="w-6 h-6" style={{ color: primaryColor }} />
        </button>
      </div>

      <div className="w-full max-w-5xl space-y-3">
        <motion.button onClick={() => onNavigate('take-quiz')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-3" style={{ backgroundColor: primaryColor }}>
          <Play className="w-5 h-5 fill-white" /> Fazer questões
        </motion.button>
        <motion.button onClick={() => onNavigate('add-question')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-3" style={{ backgroundColor: primaryColor }}>
          <Plus className="w-5 h-5" /> Classificar questões
        </motion.button>
        <motion.button onClick={() => onNavigate('question-bank')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-3" style={{ backgroundColor: primaryColor }}>
          <ImageIcon className="w-5 h-5" /> Banco de questões
        </motion.button>
        <motion.button onClick={() => onNavigate('performance')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-3" style={{ backgroundColor: primaryColor }}>
          <TrendingUp className="w-5 h-5" /> Meu rendimento
        </motion.button>
        <motion.button onClick={() => onNavigate('edit-profile')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full py-4 border-2 rounded-xl font-bold text-lg shadow-sm transition-colors flex items-center justify-center gap-3" style={{ backgroundColor: `${primaryColor}20`, color: accentColor, borderColor: `${primaryColor}40` }}>
          <User className="w-5 h-5" /> Editar Perfil
        </motion.button>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <motion.button onClick={onExport} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="py-3 bg-white/50 border rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2" style={{ color: primaryColor, borderColor: `${primaryColor}20` }}>
            <Download className="w-4 h-4" /> Exportar Dados
          </motion.button>
          <motion.button onClick={() => importRef.current?.click()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="py-3 bg-white/50 border rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2" style={{ color: primaryColor, borderColor: `${primaryColor}20` }}>
            <Upload className="w-4 h-4" /> Importar Dados
          </motion.button>
          <input type="file" ref={importRef} onChange={onImport} accept=".txt,.json" className="hidden" />
        </div>
      </div>
    </motion.div>
  );
}
