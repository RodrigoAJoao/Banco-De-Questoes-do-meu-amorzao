/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Download, Star, ChevronLeft, ChevronRight, User, Plus, X, Image as ImageIcon, Upload, ArrowLeft, Tag, Play, CheckCircle2, Timer, Clock, AlertCircle, BarChart3, TrendingUp, Target, Heart, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, ReactNode, useRef, KeyboardEvent, ChangeEvent, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface StatCard {
  id: number;
  value: number;
  label: string;
  icon: ReactNode;
  color: string;
  textColor: string;
}

interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  answer: string;
  subject: string;
  tags: string[];
  createdAt: number;
  lastResult?: 'correct' | 'incorrect';
  resolution?: string;
  resolutionImageUrl?: string;
}

interface Attempt {
  id: string;
  questionId: string;
  result: 'correct' | 'incorrect';
  timestamp: number;
  subject: string;
  tags: string[];
}

type View = 'home' | 'add-question' | 'take-quiz' | 'quiz-session' | 'question-bank' | 'performance' | 'edit-profile';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [currentIndex, setCurrentIndex] = useState(1);
  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('vestibular_questions');
    return saved ? JSON.parse(saved) : [];
  });
  const [attempts, setAttempts] = useState<Attempt[]>(() => {
    const saved = localStorage.getItem('vestibular_attempts');
    return saved ? JSON.parse(saved) : [];
  });

  // Profile State
  const [userName, setUserName] = useState(() => localStorage.getItem('vestibular_userName') || 'Rodrigo Aschidamini João');
  const [userPhoto, setUserPhoto] = useState<string | null>(() => localStorage.getItem('vestibular_userPhoto'));
  const [bgImage, setBgImage] = useState<string | null>(() => localStorage.getItem('vestibular_bgImage'));
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('vestibular_primaryColor') || '#db2777');
  const [secondaryColor, setSecondaryColor] = useState(() => localStorage.getItem('vestibular_secondaryColor') || '#fce4ec');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('vestibular_accentColor') || '#be185d');
  
  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('vestibular_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('vestibular_attempts', JSON.stringify(attempts));
  }, [attempts]);

  useEffect(() => {
    localStorage.setItem('vestibular_userName', userName);
    if (userPhoto) {
      localStorage.setItem('vestibular_userPhoto', userPhoto);
    } else {
      localStorage.removeItem('vestibular_userPhoto');
    }
    if (bgImage) {
      localStorage.setItem('vestibular_bgImage', bgImage);
    } else {
      localStorage.removeItem('vestibular_bgImage');
    }
    localStorage.setItem('vestibular_primaryColor', primaryColor);
    localStorage.setItem('vestibular_secondaryColor', secondaryColor);
    localStorage.setItem('vestibular_accentColor', accentColor);
  }, [userName, userPhoto, bgImage, primaryColor, secondaryColor, accentColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
  }, [primaryColor, secondaryColor, accentColor]);

  // Derived Stats
  const classifiedCount = questions.length;
  const reviewedCount = questions.filter(q => q.lastResult).length;
  const correctCount = questions.filter(q => q.lastResult === 'correct').length;
  const incorrectCount = questions.filter(q => q.lastResult === 'incorrect').length;

  // Form State
  const [questionText, setQuestionText] = useState('');
  const [questionResolution, setQuestionResolution] = useState('');
  const [resolutionImagePreview, setResolutionImagePreview] = useState<string | null>(null);
  const [resolutionType, setResolutionType] = useState<'text' | 'image'>('text');
  const [selectedAnswer, setSelectedAnswer] = useState('A');
  const [selectedSubject, setSelectedSubject] = useState('Matemática');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolutionFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  // Quiz Configuration State
  const [quizSubject, setQuizSubject] = useState('Todas');
  const [quizTag, setQuizTag] = useState('Todos');
  const [useTimer, setUseTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [drawnQuestions, setDrawnQuestions] = useState<Question[]>([]);
  
  // Quiz Session State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [isCorrected, setIsCorrected] = useState(false);
  const [showResolution, setShowResolution] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Bank Filter State
  const [bankSubject, setBankSubject] = useState('Todas');
  const [bankStatus, setBankStatus] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [bankSearch, setBankSearch] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Performance Filter State
  const [perfSubject, setPerfSubject] = useState('Todas');
  const [perfTag, setPerfTag] = useState('Todos');

  // Performance Chart Data (Top-level to follow Rules of Hooks)
  const chartData = useMemo(() => {
    const filteredAttempts = attempts.filter(a => {
      const matchesSubject = perfSubject === 'Todas' || a.subject === perfSubject;
      const matchesTag = perfTag === 'Todos' || a.tags.includes(perfTag);
      return matchesSubject && matchesTag;
    });

    const groups: Record<string, { correct: number; total: number }> = {};
    
    [...filteredAttempts].sort((a, b) => a.timestamp - b.timestamp).forEach(a => {
      const date = new Date(a.timestamp).toLocaleDateString();
      if (!groups[date]) groups[date] = { correct: 0, total: 0 };
      groups[date].total++;
      if (a.result === 'correct') groups[date].correct++;
    });

    return Object.entries(groups).map(([date, stats]) => ({
      date,
      acertos: Math.round((stats.correct / stats.total) * 100)
    }));
  }, [attempts, perfSubject, perfTag]);

  const subjects = ['História', 'Biologia', 'Química', 'Matemática', 'Português', 'Geografia', 'Física', 'Inglês', 'Linguagens', 'Humanas'];
  const answers = ['A', 'B', 'C', 'D', 'E'];

  // Get unique tags from all questions
  const allTags = Array.from(new Set(questions.flatMap(q => q.tags)));

  const stats: StatCard[] = [
    {
      id: 0,
      value: classifiedCount,
      label: "Classificadas",
      icon: <div className="w-12 h-12 rounded-full border-4 border-pink-600 flex items-center justify-center text-pink-600 font-bold text-xl">{classifiedCount}</div>,
      color: "bg-pink-50",
      textColor: "text-pink-600"
    },
    {
      id: 1,
      value: reviewedCount,
      label: "Questões revisadas",
      icon: <Heart className="w-16 h-16 text-white fill-white" />,
      color: "bg-pink-500",
      textColor: "text-white"
    },
    {
      id: 2,
      value: correctCount,
      label: "Questões certas",
      icon: <Star className="w-12 h-12 text-pink-500 fill-pink-500" />,
      color: "bg-pink-50",
      textColor: "text-pink-600"
    },
    {
      id: 3,
      value: incorrectCount,
      label: "Questões erradas",
      icon: <AlertCircle className="w-12 h-12 text-rose-500" />,
      color: "bg-pink-50",
      textColor: "text-pink-600"
    }
  ];

  const nextStat = () => setCurrentIndex((prev) => (prev + 1) % stats.length);
  const prevStat = () => setCurrentIndex((prev) => (prev - 1 + stats.length) % stats.length);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (currentView === 'quiz-session' && useTimer && timeLeft > 0 && !isCorrected) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && useTimer && currentView === 'quiz-session' && !isCorrected) {
      handleCorrect(); // Auto-correct on timeout
    }
    return () => clearInterval(interval);
  }, [currentView, useTimer, timeLeft, isCorrected]);

  const handleAddTag = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxDim = 1024;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          let quality = 0.9;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          const maxSizeBytes = 2 * 1024 * 1024; // 2MB limit
          
          while (dataUrl.length * 0.75 > maxSizeBytes && quality > 0.1) {
            quality -= 0.05;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processedBase64 = await processImage(file);
        setImagePreview(processedBase64);
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Erro ao processar a imagem.");
      }
    }
  };

  const handleBgImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processedBase64 = await processImage(file);
        setBgImage(processedBase64);
      } catch (error) {
        console.error("Error processing background image:", error);
        alert("Erro ao processar a imagem de fundo.");
      }
    }
  };

  const handleProfilePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processedBase64 = await processImage(file);
        setUserPhoto(processedBase64);
      } catch (error) {
        console.error("Error processing profile photo:", error);
        alert("Erro ao processar a foto de perfil.");
      }
    }
  };

  const handleResolutionImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processedBase64 = await processImage(file);
        setResolutionImagePreview(processedBase64);
      } catch (error) {
        console.error("Error processing resolution image:", error);
        alert("Erro ao processar a imagem da resolução.");
      }
    }
  };

  const renderEditProfile = () => (
    <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-4xl glass-card rounded-3xl p-8">
      <div className="flex items-center mb-8">
        <button onClick={() => setCurrentView('home')} className="p-2 hover:bg-pink-100 rounded-full transition-colors mr-4">
          <ArrowLeft className="w-6 h-6" style={{ color: primaryColor }} />
        </button>
        <h2 className="text-3xl font-romantic font-bold" style={{ color: accentColor }}>Editar Perfil</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Nome do Usuário</label>
            <input 
              type="text" 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)} 
              className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none" 
              style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold" style={{ color: accentColor }}>Foto de Perfil</label>
              {userPhoto && (
                <button 
                  onClick={() => setUserPhoto(null)}
                  className="text-xs font-bold flex items-center gap-1 hover:text-rose-500 transition-colors"
                  style={{ color: `${primaryColor}80` }}
                >
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>
            <div 
              onClick={() => profilePhotoInputRef.current?.click()} 
              className="w-32 h-32 border-2 border-dashed rounded-full flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative"
              style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}05` }}
            >
              {userPhoto ? (
                <img src={userPhoto} alt="Profile Preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6" style={{ color: primaryColor }} />
              )}
            </div>
            <input type="file" ref={profilePhotoInputRef} onChange={handleProfilePhotoUpload} accept="image/*" className="hidden" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold" style={{ color: accentColor }}>Imagem de Fundo</label>
              {bgImage && (
                <button 
                  onClick={() => setBgImage(null)}
                  className="text-xs font-bold flex items-center gap-1 hover:text-rose-500 transition-colors"
                  style={{ color: `${primaryColor}80` }}
                >
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>
            <div 
              onClick={() => bgImageInputRef.current?.click()} 
              className="w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative"
              style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}05` }}
            >
              {bgImage ? (
                <img src={bgImage} alt="Background Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 mb-2" style={{ color: primaryColor }} />
                  <span className="text-sm font-medium" style={{ color: primaryColor }}>Upload de fundo</span>
                </div>
              )}
            </div>
            <input type="file" ref={bgImageInputRef} onChange={handleBgImageUpload} accept="image/*" className="hidden" />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: accentColor }}>Cores do Tema</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Cor Principal (Botões)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={(e) => setPrimaryColor(e.target.value)} 
                  className="w-12 h-12 rounded-lg cursor-pointer border-none"
                />
                <span className="text-sm font-mono" style={{ color: primaryColor }}>{primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Cor de Fundo (Página)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={secondaryColor} 
                  onChange={(e) => setSecondaryColor(e.target.value)} 
                  className="w-12 h-12 rounded-lg cursor-pointer border-none"
                />
                <span className="text-sm font-mono" style={{ color: primaryColor }}>{secondaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Cor de Destaque (Títulos)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={accentColor} 
                  onChange={(e) => setAccentColor(e.target.value)} 
                  className="w-12 h-12 rounded-lg cursor-pointer border-none"
                />
                <span className="text-sm font-mono" style={{ color: primaryColor }}>{accentColor}</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <motion.button 
              onClick={() => setCurrentView('home')} 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Salvar Perfil
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const handleSubmit = () => {
    if (!questionText.trim() && !imagePreview) {
      alert("Por favor, insira o texto da questão ou uma imagem.");
      return;
    }

    if (editingQuestionId) {
      setQuestions(prev => prev.map(q => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            text: questionText,
            imageUrl: imagePreview || undefined,
            answer: selectedAnswer,
            subject: selectedSubject,
            tags: tags,
            resolution: resolutionType === 'text' ? questionResolution : undefined,
            resolutionImageUrl: resolutionType === 'image' ? (resolutionImagePreview || undefined) : undefined
          };
        }
        return q;
      }));
      setEditingQuestionId(null);
    } else {
      const newQuestion: Question = {
        id: Date.now().toString(),
        text: questionText,
        imageUrl: imagePreview || undefined,
        answer: selectedAnswer,
        subject: selectedSubject,
        tags: tags,
        createdAt: Date.now(),
        resolution: resolutionType === 'text' ? questionResolution : undefined,
        resolutionImageUrl: resolutionType === 'image' ? (resolutionImagePreview || undefined) : undefined
      };
      setQuestions([newQuestion, ...questions]);
    }

    setQuestionText('');
    setQuestionResolution('');
    setResolutionImagePreview(null);
    setResolutionType('text');
    setSelectedAnswer('A');
    setSelectedSubject('Matemática');
    setTags([]);
    setImagePreview(null);
    setCurrentView('home');
  };

  const clearForm = () => {
    setQuestionText('');
    setQuestionResolution('');
    setResolutionImagePreview(null);
    setResolutionType('text');
    setSelectedAnswer('A');
    setSelectedSubject('Matemática');
    setTags([]);
    setImagePreview(null);
    setEditingQuestionId(null);
  };

  const handleEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.text);
    setQuestionResolution(q.resolution || '');
    setResolutionImagePreview(q.resolutionImageUrl || null);
    setResolutionType(q.resolutionImageUrl ? 'image' : 'text');
    setSelectedAnswer(q.answer);
    setSelectedSubject(q.subject);
    setTags(q.tags);
    setImagePreview(q.imageUrl || null);
    setCurrentView('add-question');
  };

  const handleDrawQuestions = () => {
    let filtered = [...questions];
    if (quizSubject !== 'Todas') {
      filtered = filtered.filter(q => q.subject === quizSubject);
    }
    if (quizTag !== 'Todos') {
      filtered = filtered.filter(q => q.tags.includes(quizTag));
    }

    if (filtered.length === 0) {
      alert("Nenhuma questão encontrada com esses filtros.");
      return;
    }

    // Shuffle and pick up to 10
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    setDrawnQuestions(shuffled.slice(0, 10));
  };

  const startQuiz = () => {
    if (drawnQuestions.length === 0) {
      alert("Sorteie as questões primeiro!");
      return;
    }
    setCurrentQuizIndex(0);
    setSelectedQuizOption(null);
    setIsCorrected(false);
    setShowResolution(false);
    if (useTimer) {
      setTimeLeft(timerMinutes * 60);
    }
    setCurrentView('quiz-session');
  };

  const handleCorrect = () => {
    const currentQuestion = drawnQuestions[currentQuizIndex];
    const isCorrect = selectedQuizOption === currentQuestion.answer;
    
    setIsCorrected(true);

    // Record attempt
    const newAttempt: Attempt = {
      id: Date.now().toString(),
      questionId: currentQuestion.id,
      result: isCorrect ? 'correct' : 'incorrect',
      timestamp: Date.now(),
      subject: currentQuestion.subject,
      tags: currentQuestion.tags
    };
    setAttempts(prev => [...prev, newAttempt]);

    // Update question status in the main list
    setQuestions(prev => prev.map(q => 
      q.id === currentQuestion.id 
        ? { ...q, lastResult: isCorrect ? 'correct' : 'incorrect' } 
        : q
    ));
  };

  const nextQuestion = () => {
    if (currentQuizIndex < drawnQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedQuizOption(null);
      setIsCorrected(false);
      setShowResolution(false);
      if (useTimer) {
        setTimeLeft(timerMinutes * 60);
      }
    } else {
      setCurrentView('home');
    }
  };

  const handleExportData = () => {
    const data = {
      questions,
      attempts,
      profile: {
        userName,
        userPhoto,
        bgImage,
        primaryColor,
        secondaryColor,
        accentColor,
      },
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vestibular_data_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
        }
        if (data.attempts && Array.isArray(data.attempts)) {
          setAttempts(data.attempts);
        }
        if (data.profile) {
          if (data.profile.userName) setUserName(data.profile.userName);
          if (data.profile.userPhoto) setUserPhoto(data.profile.userPhoto);
          if (data.profile.bgImage) setBgImage(data.profile.bgImage);
          if (data.profile.primaryColor) setPrimaryColor(data.profile.primaryColor);
          if (data.profile.secondaryColor) setSecondaryColor(data.profile.secondaryColor);
          if (data.profile.accentColor) setAccentColor(data.profile.accentColor);
        }
        
        alert('Dados importados com sucesso!');
      } catch (error) {
        console.error('Erro ao importar dados:', error);
        alert('Erro ao ler o arquivo. Certifique-se de que é um arquivo de dados válido.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderHome = () => (
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
        <button onClick={prevStat} className="absolute left-0 z-10 p-2 bg-white/80 rounded-full shadow-md hover:bg-pink-50 transition-colors lg:hidden">
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
                  className={`${stat.color} ${stat.textColor} rounded-[2rem] p-8 flex flex-col items-center justify-center shadow-sm transition-all duration-300 border-2 border-white/50 ${
                    isCenter ? 'w-[450px] h-[280px] shadow-2xl' : 'w-[280px] h-[200px]'
                  }`}
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
                className={`${stats[currentIndex].color} ${stats[currentIndex].textColor} w-full max-w-sm h-[250px] rounded-[2rem] p-8 flex flex-col items-center justify-center shadow-xl border-2 border-white/50`}
              >
                <div className="mb-4">{stats[currentIndex].icon}</div>
                <div className="font-bold text-5xl mb-2">{stats[currentIndex].value}</div>
                <div className="text-center text-lg font-medium">{stats[currentIndex].label}</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <button onClick={nextStat} className="absolute right-0 z-10 p-2 bg-white/80 rounded-full shadow-md hover:bg-pink-50 transition-colors lg:hidden">
          <ChevronRight className="w-6 h-6" style={{ color: primaryColor }} />
        </button>
      </div>

      <div className="w-full max-w-5xl space-y-3">
        <motion.button 
          onClick={() => setCurrentView('take-quiz')} 
          whileHover={{ scale: 1.01 }} 
          whileTap={{ scale: 0.99 }} 
          className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-3"
          style={{ backgroundColor: primaryColor }}
        >
          <Play className="w-5 h-5 fill-white" /> Fazer questões
        </motion.button>
        <motion.button 
          onClick={() => setCurrentView('add-question')} 
          whileHover={{ scale: 1.01 }} 
          whileTap={{ scale: 0.99 }} 
          className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-3"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="w-5 h-5" /> Classificar questões
        </motion.button>
        <motion.button 
          onClick={() => setCurrentView('question-bank')} 
          whileHover={{ scale: 1.01 }} 
          whileTap={{ scale: 0.99 }} 
          className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-3"
          style={{ backgroundColor: primaryColor }}
        >
          <ImageIcon className="w-5 h-5" /> Banco de questões
        </motion.button>
        <motion.button 
          onClick={() => setCurrentView('performance')} 
          whileHover={{ scale: 1.01 }} 
          whileTap={{ scale: 0.99 }} 
          className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-3"
          style={{ backgroundColor: primaryColor }}
        >
          <TrendingUp className="w-5 h-5" /> Meu rendimento
        </motion.button>
        <motion.button 
          onClick={() => setCurrentView('edit-profile')}
          whileHover={{ scale: 1.01 }} 
          whileTap={{ scale: 0.99 }} 
          className="w-full py-4 border-2 rounded-xl font-bold text-lg shadow-sm transition-colors flex items-center justify-center gap-3"
          style={{ backgroundColor: `${primaryColor}20`, color: accentColor, borderColor: `${primaryColor}40` }}
        >
          <User className="w-5 h-5" /> Editar Perfil
        </motion.button>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <motion.button 
            onClick={handleExportData}
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            className="py-3 bg-white/50 border rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
            style={{ color: primaryColor, borderColor: `${primaryColor}20` }}
          >
            <Download className="w-4 h-4" /> Exportar Dados
          </motion.button>
          <motion.button 
            onClick={() => importFileInputRef.current?.click()}
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            className="py-3 bg-white/50 border rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
            style={{ color: primaryColor, borderColor: `${primaryColor}20` }}
          >
            <Upload className="w-4 h-4" /> Importar Dados
          </motion.button>
          <input 
            type="file" 
            ref={importFileInputRef} 
            onChange={handleImportData} 
            accept=".txt,.json" 
            className="hidden" 
          />
        </div>
      </div>
    </motion.div>
  );

  const renderAddQuestion = () => (
    <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-4xl glass-card rounded-3xl p-8">
      <div className="flex items-center mb-8">
        <button 
          onClick={() => {
            clearForm();
            setCurrentView('home');
          }} 
          className="p-2 hover:bg-pink-100 rounded-full transition-colors mr-4"
        >
          <ArrowLeft className="w-6 h-6" style={{ color: primaryColor }} />
        </button>
        <h2 className="text-3xl font-romantic font-bold" style={{ color: accentColor }}>
          {editingQuestionId ? 'Editar Questão' : 'Adicionar Nova Questão'}
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Texto da Questão</label>
            <textarea 
              value={questionText} 
              onChange={(e) => setQuestionText(e.target.value)} 
              placeholder="Digite o enunciado da questão aqui..." 
              className="w-full h-48 p-4 bg-white/50 border rounded-xl focus:ring-2 outline-none transition-all resize-none" 
              style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold" style={{ color: accentColor }}>Resolução da Questão (Opcional)</label>
              <div className="flex p-1 rounded-lg" style={{ backgroundColor: `${primaryColor}10` }}>
                <button 
                  onClick={() => setResolutionType('text')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${resolutionType === 'text' ? 'bg-white shadow-sm' : ''}`}
                  style={{ color: resolutionType === 'text' ? primaryColor : `${primaryColor}60` }}
                >
                  Texto
                </button>
                <button 
                  onClick={() => setResolutionType('image')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${resolutionType === 'image' ? 'bg-white shadow-sm' : ''}`}
                  style={{ color: resolutionType === 'image' ? primaryColor : `${primaryColor}60` }}
                >
                  Imagem
                </button>
              </div>
            </div>

            {resolutionType === 'text' ? (
              <textarea 
                value={questionResolution} 
                onChange={(e) => setQuestionResolution(e.target.value)} 
                placeholder="Explique como chegar na resposta correta..." 
                className="w-full h-32 p-4 bg-white/50 border rounded-xl focus:ring-2 outline-none transition-all resize-none" 
                style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
              />
            ) : (
              <div 
                onClick={() => resolutionFileInputRef.current?.click()} 
                className="w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/50 transition-all overflow-hidden relative"
                style={{ borderColor: `${primaryColor}40` }}
              >
                {resolutionImagePreview ? (
                  <>
                    <img src={resolutionImagePreview} alt="Resolution Preview" className="w-full h-full object-contain" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setResolutionImagePreview(null); }} 
                      className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-full shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mb-2" style={{ color: `${primaryColor}60` }} />
                    <span className="text-xs" style={{ color: `${primaryColor}80` }}>Upload da resolução</span>
                  </>
                )}
              </div>
            )}
            <input type="file" ref={resolutionFileInputRef} onChange={handleResolutionImageUpload} accept="image/*" className="hidden" />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Ou Adicionar Imagem</label>
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className="w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/50 transition-all overflow-hidden relative"
              style={{ borderColor: `${primaryColor}40` }}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                  <button onClick={(e) => { e.stopPropagation(); setImagePreview(null); }} className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-full shadow-md"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mb-2" style={{ color: `${primaryColor}60` }} />
                  <span className="text-sm" style={{ color: `${primaryColor}80` }}>Clique para fazer upload</span>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Gabarito</label>
              <select 
                value={selectedAnswer} 
                onChange={(e) => setSelectedAnswer(e.target.value)} 
                className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none"
                style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
              >
                {answers.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Matéria</label>
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)} 
                className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none"
                style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: accentColor }}><Tag className="w-4 h-4" /> Conteúdo (Tags)</label>
            <div className="space-y-3">
              <input 
                type="text" 
                value={tagInput} 
                onChange={(e) => setTagInput(e.target.value)} 
                onKeyDown={handleAddTag} 
                placeholder="Pressione Enter para adicionar tag" 
                className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none" 
                style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
              />
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-2 hover:text-rose-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-4">
            <motion.button 
              onClick={handleSubmit} 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              {editingQuestionId ? <CheckCircle2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              {editingQuestionId ? 'Salvar Alterações' : 'Adicionar ao Banco'}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderTakeQuiz = () => (
    <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-4xl glass-card rounded-3xl p-8">
      <div className="flex items-center mb-8">
        <button onClick={() => setCurrentView('home')} className="p-2 hover:bg-pink-100 rounded-full transition-colors mr-4">
          <ArrowLeft className="w-6 h-6" style={{ color: primaryColor }} />
        </button>
        <h2 className="text-3xl font-romantic font-bold" style={{ color: accentColor }}>Configurar Revisão</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Matéria</label>
            <select 
              value={quizSubject} 
              onChange={(e) => setQuizSubject(e.target.value)} 
              className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none"
              style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
            >
              <option value="Todas">Todas as matérias</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: accentColor }}>Conteúdo (Tags)</label>
            <select 
              value={quizTag} 
              onChange={(e) => setQuizTag(e.target.value)} 
              className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none"
              style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
            >
              <option value="Todos">Todos os conteúdos</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}20` }}>
            <input 
              type="checkbox" 
              id="useTimer" 
              checked={useTimer} 
              onChange={(e) => setUseTimer(e.target.checked)}
              className="w-5 h-5"
              style={{ accentColor: primaryColor }}
            />
            <label htmlFor="useTimer" className="font-semibold flex items-center gap-2 cursor-pointer" style={{ color: accentColor }}>
              <Timer className="w-5 h-5" /> Adicionar Timer
            </label>
          </div>

          {useTimer && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
              <label className="block text-sm font-semibold" style={{ color: accentColor }}>Tempo por questão (minutos)</label>
              <input 
                type="number" 
                value={timerMinutes} 
                onChange={(e) => setTimerMinutes(Number(e.target.value))}
                className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none"
                style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
              />
            </motion.div>
          )}

          <motion.button 
            onClick={handleDrawQuestions}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <Target className="w-6 h-6" /> Sortear Questões
          </motion.button>
        </div>
      </div>

      {drawnQuestions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 border-t pt-8" style={{ borderColor: `${primaryColor}20` }}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold" style={{ color: accentColor }}>Questões Sorteadas ({drawnQuestions.length})</h3>
            <motion.button 
              onClick={startQuiz}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              Começar Agora <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drawnQuestions.map((q, idx) => (
              <div key={q.id} className="p-4 bg-white/40 rounded-xl border border-white/60 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: primaryColor }}>{idx + 1}</div>
                <div className="flex-1 truncate">
                  <p className="font-medium text-gray-800 truncate">{q.text || "Questão com imagem"}</p>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: primaryColor }}>{q.subject}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  const renderQuizSession = () => {
    const currentQuestion = drawnQuestions[currentQuizIndex];
    if (!currentQuestion) return null;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl glass-card rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('take-quiz')} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
              <X className="w-6 h-6" style={{ color: primaryColor }} />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{currentQuestion.subject}</span>
              <h2 className="text-xl font-bold" style={{ color: accentColor }}>Questão {currentQuizIndex + 1} de {drawnQuestions.length}</h2>
            </div>
          </div>
          {useTimer && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold ${timeLeft < 60 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-pink-100 text-pink-600'}`}>
              <Clock className="w-5 h-5" /> {formatTime(timeLeft)}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="p-6 bg-white/50 rounded-2xl border border-white/80 shadow-sm">
            {currentQuestion.imageUrl && (
              <img src={currentQuestion.imageUrl} alt="Questão" className="w-full max-h-96 object-contain rounded-xl mb-6 shadow-md" />
            )}
            {currentQuestion.text && (
              <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">{currentQuestion.text}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>Escolha seu amor:</p>
            {answers.map((option) => {
              const isSelected = selectedQuizOption === option;
              const isCorrect = isCorrected && option === currentQuestion.answer;
              const isWrong = isCorrected && isSelected && option !== currentQuestion.answer;
              
              let bgColor = "bg-white/60";
              let borderColor = "border-white/80";
              let textColor = "text-gray-700";

              if (isSelected && !isCorrected) {
                bgColor = `${primaryColor}10`;
                borderColor = primaryColor;
                textColor = primaryColor;
              } else if (isCorrect) {
                bgColor = "bg-emerald-100";
                borderColor = "border-emerald-500";
                textColor = "text-emerald-700";
              } else if (isWrong) {
                bgColor = "bg-rose-100";
                borderColor = "border-rose-500";
                textColor = "text-rose-700";
              }

              return (
                <button
                  key={option}
                  disabled={isCorrected}
                  onClick={() => setSelectedQuizOption(option)}
                  className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left group ${isCorrected ? '' : 'hover:border-pink-300 hover:bg-pink-50/50'}`}
                  style={{ 
                    backgroundColor: isSelected && !isCorrected ? `${primaryColor}10` : undefined,
                    borderColor: isSelected && !isCorrected ? primaryColor : undefined,
                    color: isSelected && !isCorrected ? primaryColor : undefined
                  }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${isSelected || isCorrect || isWrong ? '' : 'bg-white text-gray-400 group-hover:text-pink-500'}`}
                    style={{ 
                      backgroundColor: isSelected && !isCorrected ? primaryColor : (isCorrect ? '#10b981' : (isWrong ? '#f43f5e' : undefined)),
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
            {!isCorrected ? (
              <motion.button
                disabled={!selectedQuizOption}
                onClick={handleCorrect}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-5 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-3 ${!selectedQuizOption ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white'}`}
                style={{ backgroundColor: selectedQuizOption ? primaryColor : undefined }}
              >
                Corrigir Questão
              </motion.button>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3">
                  {(currentQuestion.resolution || currentQuestion.resolutionImageUrl) && (
                    <motion.button
                      onClick={() => setShowResolution(!showResolution)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-4 bg-white border-2 rounded-2xl font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2"
                      style={{ color: primaryColor, borderColor: primaryColor }}
                    >
                      <Heart className={`w-5 h-5 ${showResolution ? 'fill-current' : ''}`} /> {showResolution ? 'Ocultar Resolução' : 'Ver Resolução'}
                    </motion.button>
                  )}
                  <motion.button
                    onClick={nextQuestion}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-[2] py-4 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Próxima Questão <ChevronRight className="w-6 h-6" />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {showResolution && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: 20 }}
                      className="p-6 bg-white/80 rounded-2xl border-2 border-pink-200 shadow-inner"
                      style={{ borderColor: `${primaryColor}40` }}
                    >
                      <h4 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: accentColor }}>
                        <Star className="w-5 h-5 fill-pink-500 text-pink-500" style={{ color: primaryColor, fill: primaryColor }} /> Resolução Comentada
                      </h4>
                      {currentQuestion.resolutionImageUrl && (
                        <img src={currentQuestion.resolutionImageUrl} alt="Resolução" className="w-full max-h-80 object-contain rounded-xl mb-4 shadow-sm" />
                      )}
                      {currentQuestion.resolution && (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentQuestion.resolution}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderQuestionBank = () => {
    const filteredQuestions = questions.filter(q => {
      const matchesSubject = bankSubject === 'Todas' || q.subject === bankSubject;
      const matchesStatus = bankStatus === 'all' || q.lastResult === bankStatus;
      const matchesSearch = q.text.toLowerCase().includes(bankSearch.toLowerCase()) || 
                           q.subject.toLowerCase().includes(bankSearch.toLowerCase()) ||
                           q.tags.some(t => t.toLowerCase().includes(bankSearch.toLowerCase()));
      return matchesSubject && matchesStatus && matchesSearch;
    });

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl glass-card rounded-3xl p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('home')} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" style={{ color: primaryColor }} />
            </button>
            <h2 className="text-3xl font-romantic font-bold" style={{ color: accentColor }}>Banco de Questões</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300 cursor-pointer" onClick={() => setBankSearch('')} />
              <input 
                type="text" 
                placeholder="Pesquisar questões..." 
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm"
                style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
              />
            </div>
            <select 
              value={bankSubject} 
              onChange={(e) => setBankSubject(e.target.value)}
              className="px-4 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm"
              style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
            >
              <option value="Todas">Todas as matérias</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex bg-white/50 p-1 rounded-xl border" style={{ borderColor: `${primaryColor}20` }}>
              <button 
                onClick={() => setBankStatus('all')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${bankStatus === 'all' ? 'bg-white shadow-sm' : 'text-gray-400'}`}
                style={{ color: bankStatus === 'all' ? primaryColor : undefined }}
              >
                Todas
              </button>
              <button 
                onClick={() => setBankStatus('correct')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${bankStatus === 'correct' ? 'bg-white shadow-sm' : 'text-gray-400'}`}
                style={{ color: bankStatus === 'correct' ? '#10b981' : undefined }}
              >
                Certas
              </button>
              <button 
                onClick={() => setBankStatus('incorrect')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${bankStatus === 'incorrect' ? 'bg-white shadow-sm' : 'text-gray-400'}`}
                style={{ color: bankStatus === 'incorrect' ? '#f43f5e' : undefined }}
              >
                Erradas
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map(q => (
              <motion.div 
                layout
                key={q.id} 
                className="bg-white/60 rounded-2xl border border-white/80 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: q.lastResult === 'correct' ? '#10b981' : (q.lastResult === 'incorrect' ? '#f43f5e' : primaryColor) }}></div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>{q.subject}</span>
                  {q.lastResult && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${q.lastResult === 'correct' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {q.lastResult === 'correct' ? 'Acertou' : 'Errou'}
                    </span>
                  )}
                </div>
                <div className="mb-4">
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="Questão" className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <p className="text-sm text-gray-700 line-clamp-3 font-medium">{q.text || "Questão baseada em imagem"}</p>
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {q.tags.map(t => (
                    <span key={t} className="text-[9px] px-2 py-0.5 bg-white/80 rounded-full text-gray-500 border border-gray-100">#{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-400">Gabarito: {q.answer}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEditQuestion(q)}
                      className="p-2 text-gray-300 hover:text-blue-500 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    
                    {deletingId === q.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 rounded-lg p-1 border border-rose-100">
                        <button 
                          onClick={() => {
                            setQuestions(questions.filter(item => item.id !== q.id));
                            setDeletingId(null);
                          }}
                          className="text-[10px] font-bold text-rose-600 px-2 py-1 hover:bg-rose-100 rounded transition-colors"
                        >
                          Confirmar
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="text-[10px] font-bold text-gray-400 px-2 py-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeletingId(q.id)}
                        className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                      >
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
      </motion.div>
    );
  };

  const renderPerformance = () => {
    const filteredAttempts = attempts.filter(a => {
      const matchesSubject = perfSubject === 'Todas' || a.subject === perfSubject;
      const matchesTag = perfTag === 'Todos' || a.tags.includes(perfTag);
      return matchesSubject && matchesTag;
    });

    const total = filteredAttempts.length;
    const corrects = filteredAttempts.filter(a => a.result === 'correct').length;
    const incorrects = total - corrects;
    const winRate = total > 0 ? Math.round((corrects / total) * 100) : 0;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-6xl glass-card rounded-3xl p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('home')} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" style={{ color: primaryColor }} />
            </button>
            <div>
              <h2 className="text-3xl font-romantic font-bold" style={{ color: accentColor }}>Meu Rendimento</h2>
              <p className="text-sm text-pink-400 font-medium">Acompanhe sua jornada de estudos</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={perfSubject} 
              onChange={(e) => setPerfSubject(e.target.value)}
              className="px-4 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm"
              style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
            >
              <option value="Todas">Todas as matérias</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={perfTag} 
              onChange={(e) => setPerfTag(e.target.value)}
              className="px-4 py-2 bg-white/50 border rounded-xl focus:ring-2 outline-none text-sm"
              style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
            >
              <option value="Todos">Todos os conteúdos</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col items-center justify-center shadow-sm">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-md">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-4xl font-bold text-emerald-600">{winRate}%</span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 mt-1">Taxa de Acerto</span>
            </div>
            
            <div className="bg-white/60 border border-white/80 rounded-3xl p-6 grid grid-cols-2 gap-4 shadow-sm">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-gray-700">{corrects}</span>
                <span className="text-[10px] font-bold uppercase text-emerald-500">Acertos</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-gray-700">{incorrects}</span>
                <span className="text-[10px] font-bold uppercase text-rose-500">Erros</span>
              </div>
              <div className="col-span-2 pt-3 border-t border-gray-100 flex flex-col items-center">
                <span className="text-xl font-bold text-gray-800">{total}</span>
                <span className="text-[10px] font-bold uppercase text-gray-400">Total de Questões</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white/60 border border-white/80 rounded-3xl p-8 shadow-sm min-h-[400px]">
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2" style={{ color: accentColor }}>
              <TrendingUp className="w-5 h-5" /> Evolução de Acertos (%)
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAcertos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: primaryColor, fontSize: 12 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: accentColor, fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="acertos" 
                    stroke={primaryColor} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAcertos)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-pink-300">
                <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                <p className="font-medium">Sem dados suficientes para o gráfico</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home': return renderHome();
      case 'add-question': return renderAddQuestion();
      case 'take-quiz': return renderTakeQuiz();
      case 'quiz-session': return renderQuizSession();
      case 'question-bank': return renderQuestionBank();
      case 'performance': return renderPerformance();
      case 'edit-profile': return renderEditProfile();
      default: return renderHome();
    }
  };

  return (
    <div 
      className="min-h-screen font-sans text-[#1a1a1a] flex flex-col items-center py-8 px-4 relative"
      style={{ 
        backgroundColor: secondaryColor,
        backgroundImage: bgImage ? `linear-gradient(rgba(255, 192, 203, 0.4), rgba(255, 192, 203, 0.4)), url(${bgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <AnimatePresence mode="wait">
        {renderCurrentView()}
      </AnimatePresence>
      <div className="h-12"></div>
    </div>
  );
}
