import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BarChart3, Target, TrendingUp, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { Attempt, View } from '../types';

interface PerformanceProps {
  attempts: Attempt[];
  primaryColor: string; accentColor: string;
  subjects: string[]; allTags: string[];
  onNavigate: (v: View) => void;
}

export default function Performance({ attempts, primaryColor, accentColor, subjects, allTags, onNavigate }: PerformanceProps) {
  const [perfSubject, setPerfSubject] = useState('Todas');
  const [perfTag, setPerfTag] = useState('Todos');

  const filteredAttempts = attempts.filter(a => {
    const matchesSubject = perfSubject === 'Todas' || a.subject === perfSubject;
    const matchesTag = perfTag === 'Todos' || (a.tags && Array.isArray(a.tags) && a.tags.includes(perfTag));
    return matchesSubject && matchesTag;
  });

  const total = filteredAttempts.length;
  const correct = filteredAttempts.filter(a => a.result === 'correct').length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  const chartData = useMemo(() => {
    if (filteredAttempts.length === 0) return [];
    const grouped: { [k: string]: { correct: number; total: number } } = {};
    filteredAttempts.forEach(a => {
      const day = new Date(a.timestamp).toLocaleDateString('pt-BR');
      if (!grouped[day]) grouped[day] = { correct: 0, total: 0 };
      grouped[day].total++;
      if (a.result === 'correct') grouped[day].correct++;
    });
    return Object.entries(grouped).map(([day, d]) => ({
      day,
      acertos: d.correct,
      erros: d.total - d.correct,
      taxa: Math.round((d.correct / d.total) * 100),
    }));
  }, [filteredAttempts]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl glass-card rounded-3xl p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('home')} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" style={{ color: primaryColor }} />
          </button>
          <h2 className="text-3xl font-romantic font-bold" style={{ color: accentColor }}>Meu Rendimento</h2>
        </div>
        <div className="flex gap-3">
          <select value={perfSubject} onChange={(e) => setPerfSubject(e.target.value)} className="px-4 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm" style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}>
            <option value="Todas">Todas as matérias</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={perfTag} onChange={(e) => setPerfTag(e.target.value)} className="px-4 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm" style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}>
            <option value="Todos">Todas as tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-white/60 rounded-2xl border border-white/80 shadow-sm text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }} />
          <p className="text-3xl font-bold" style={{ color: accentColor }}>{total}</p>
          <p className="text-sm text-gray-500 font-medium">Total de Questões</p>
        </div>
        <div className="p-6 bg-white/60 rounded-2xl border border-white/80 shadow-sm text-center">
          <Target className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
          <p className="text-3xl font-bold text-emerald-600">{correct}</p>
          <p className="text-sm text-gray-500 font-medium">Acertos</p>
        </div>
        <div className="p-6 bg-white/60 rounded-2xl border border-white/80 shadow-sm text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }} />
          <p className="text-3xl font-bold" style={{ color: primaryColor }}>{percentage}%</p>
          <p className="text-sm text-gray-500 font-medium">Taxa de Acerto</p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="space-y-8">
          <div className="bg-white/60 rounded-2xl p-6 border border-white/80 shadow-sm">
            <h3 className="text-lg font-bold mb-6" style={{ color: accentColor }}>Evolução Diária</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="acertos" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Area type="monotone" dataKey="erros" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/60 rounded-2xl p-6 border border-white/80 shadow-sm">
            <h3 className="text-lg font-bold mb-6" style={{ color: accentColor }}>Taxa de Acerto (%)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="taxa" stroke={primaryColor} strokeWidth={3} dot={{ fill: primaryColor, r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center text-pink-300 opacity-50">
          <Heart className="w-16 h-16 mb-4" />
          <p className="text-xl font-romantic font-bold">Nenhum dado de performance ainda</p>
          <p className="text-sm mt-2">Complete alguns quizzes para ver seus resultados aqui.</p>
        </div>
      )}
    </motion.div>
  );
}
