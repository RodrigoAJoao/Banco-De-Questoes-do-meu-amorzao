/**
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo, useCallback, ChangeEvent, KeyboardEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import { AlertCircle, X, BarChart3, Target, TrendingUp } from 'lucide-react';
import { compressImage } from './imageUtils';
import { saveQuestions, loadQuestions, saveAttempts, loadAttempts, saveAllSettings, loadAllSettings, migrateFromLocalStorage } from './storage';
import type { Question, Attempt, Toast, View, StatCard } from './types';
import { SUBJECTS, ANSWERS } from './types';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import ToastOverlay from './components/ToastOverlay';
import Home from './components/Home';
import AddQuestion from './components/AddQuestion';
import TakeQuiz from './components/TakeQuiz';
import QuizSession from './components/QuizSession';
import QuizResults from './components/QuizResults';
import QuestionBank from './components/QuestionBank';
import Performance from './components/Performance';
import EditProfile from './components/EditProfile';

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  // ─── Core State ───────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<View>('home');
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  // ─── Toast System ─────────────────────────────────────────────
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // ─── Profile State ────────────────────────────────────────────
  const [userName, setUserName] = useState('Rodrigo Aschidamini João');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#db2777');
  const [secondaryColor, setSecondaryColor] = useState('#fce4ec');
  const [accentColor, setAccentColor] = useState('#be185d');
  const [statsColor, setStatsColor] = useState('#db2777');
  const [statsBgColor, setStatsBgColor] = useState('#ffffff');

  // ─── Form State ───────────────────────────────────────────────
  const [questionText, setQuestionText] = useState('');
  const [questionResolution, setQuestionResolution] = useState('');
  const [resolutionImagePreview, setResolutionImagePreview] = useState<string | null>(null);
  const [resolutionType, setResolutionType] = useState<'text' | 'image'>('text');
  const [selectedAnswer, setSelectedAnswer] = useState('A');
  const [selectedSubject, setSelectedSubject] = useState('Matemática');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // ─── Quiz State ───────────────────────────────────────────────
  const [quizSubject, setQuizSubject] = useState('Todas');
  const [quizTag, setQuizTag] = useState('Todos');
  const [useTimer, setUseTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(3);
  const [drawnQuestions, setDrawnQuestions] = useState<Question[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [isCorrected, setIsCorrected] = useState(false);
  const [showResolution, setShowResolution] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizResults, setQuizResults] = useState<{ question: Question; result: 'correct' | 'incorrect' }[]>([]);

  // ─── Refs ─────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolutionFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  // ─── Derived Data ─────────────────────────────────────────────
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    questions.forEach(q => { if (q?.tags) q.tags.forEach(t => { if (t) tagSet.add(t); }); });
    return Array.from(tagSet);
  }, [questions]);

  const stats: StatCard[] = useMemo(() => {
    const totalQuestions = questions.length;
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.result === 'correct').length;
    const hitRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
    return [
      { id: 1, value: totalQuestions, label: 'Questões Cadastradas', icon: <BarChart3 className="w-10 h-10" style={{ color: statsColor }} />, color: 'bg-white', textColor: '' },
      { id: 2, value: correctAttempts, label: 'Questões Acertadas', icon: <Target className="w-10 h-10" style={{ color: statsColor }} />, color: 'bg-white', textColor: '' },
      { id: 3, value: hitRate, label: 'Taxa de Acerto (%)', icon: <TrendingUp className="w-10 h-10" style={{ color: statsColor }} />, color: 'bg-white', textColor: '' },
    ];
  }, [questions, attempts, statsColor]);

  // ─── Data Loading ─────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        await migrateFromLocalStorage();
        const [loadedQuestions, loadedAttempts, settings] = await Promise.all([
          loadQuestions(),
          loadAttempts(),
          loadAllSettings()
        ]);
        setQuestions(loadedQuestions.filter((q: any) => q && q.id));
        setAttempts(loadedAttempts.filter((a: any) => a && a.id));
        if (settings.userName) setUserName(settings.userName);
        if (settings.userPhoto !== undefined) setUserPhoto(settings.userPhoto);
        if (settings.bgImage !== undefined) setBgImage(settings.bgImage);
        if (settings.primaryColor) setPrimaryColor(settings.primaryColor);
        if (settings.secondaryColor) setSecondaryColor(settings.secondaryColor);
        if (settings.accentColor) setAccentColor(settings.accentColor);
        if (settings.statsColor) setStatsColor(settings.statsColor);
        if (settings.statsBgColor) setStatsBgColor(settings.statsBgColor);

        const lastBackup = settings.lastBackupReminder;
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (!lastBackup || (Date.now() - Number(lastBackup)) > sevenDaysMs) {
          setTimeout(() => {
            showToast('🛡️ Lembrete: faça um backup! Exporte seus dados pela tela principal.', 'info');
          }, 3000);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setSaveError('Erro ao carregar dados. Tente recarregar a página.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [showToast]);

  // ─── Auto-save Effects ────────────────────────────────────────
  useEffect(() => {
    if (!isLoading) {
      saveQuestions(questions).catch(err => {
        console.error('Save questions error:', err);
        setSaveError('Erro ao salvar questões. Suas alterações podem não ter sido salvas.');
      });
    }
  }, [questions, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveAttempts(attempts).catch(err => {
        console.error('Save attempts error:', err);
        setSaveError('Erro ao salvar tentativas.');
      });
    }
  }, [attempts, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveAllSettings({ userName, userPhoto, bgImage, primaryColor, secondaryColor, accentColor, statsColor, statsBgColor }).catch(err => {
        console.error('Save settings error:', err);
      });
    }
  }, [userName, userPhoto, bgImage, primaryColor, secondaryColor, accentColor, statsColor, statsBgColor, isLoading]);

  // ─── Image Processing ────────────────────────────────────────
  const processImage = async (file: File): Promise<string> => {
    return await compressImage(file, 1200, 0.7);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setImagePreview(await processImage(file));
      } catch {
        showToast('Erro ao processar a imagem.', 'error');
      }
    }
  };

  const handleBgImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setBgImage(await processImage(file));
      } catch {
        showToast('Erro ao processar a imagem de fundo.', 'error');
      }
    }
  };

  const handleProfilePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setUserPhoto(await processImage(file));
      } catch {
        showToast('Erro ao processar a foto de perfil.', 'error');
      }
    }
  };

  const handleResolutionImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setResolutionImagePreview(await processImage(file));
      } catch {
        showToast('Erro ao processar a imagem da resolução.', 'error');
      }
    }
  };

  // ─── Form Handlers ───────────────────────────────────────────
  const handleAddTag = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleSubmit = () => {
    if (!questionText.trim() && !imagePreview) {
      showToast('Por favor, insira o texto da questão ou uma imagem.', 'warning');
      return;
    }
    if (editingQuestionId) {
      setQuestions(prev => prev.map(q => q.id === editingQuestionId ? {
        ...q, text: questionText, imageUrl: imagePreview || undefined, answer: selectedAnswer,
        subject: selectedSubject, tags, resolution: resolutionType === 'text' ? questionResolution : undefined,
        resolutionImageUrl: resolutionType === 'image' ? (resolutionImagePreview || undefined) : undefined
      } : q));
      setEditingQuestionId(null);
    } else {
      setQuestions([{
        id: Date.now().toString(), text: questionText, imageUrl: imagePreview || undefined,
        answer: selectedAnswer, subject: selectedSubject, tags, createdAt: Date.now(),
        resolution: resolutionType === 'text' ? questionResolution : undefined,
        resolutionImageUrl: resolutionType === 'image' ? (resolutionImagePreview || undefined) : undefined
      }, ...questions]);
    }
    showToast(editingQuestionId ? 'Questão atualizada com sucesso! ✏️' : 'Questão salva com sucesso! 🎉', 'success');
    clearForm();
    setCurrentView('home');
  };

  const clearForm = () => {
    setQuestionText(''); setQuestionResolution(''); setResolutionImagePreview(null);
    setResolutionType('text'); setSelectedAnswer('A'); setSelectedSubject('Matemática');
    setTags([]); setImagePreview(null); setEditingQuestionId(null); setTagInput('');
  };

  const handleEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id); setQuestionText(q.text); setQuestionResolution(q.resolution || '');
    setResolutionImagePreview(q.resolutionImageUrl || null); setResolutionType(q.resolutionImageUrl ? 'image' : 'text');
    setSelectedAnswer(q.answer); setSelectedSubject(q.subject); setTags(q.tags);
    setImagePreview(q.imageUrl || null); setCurrentView('add-question');
  };

  // ─── Quiz Handlers ───────────────────────────────────────────
  const handleDrawQuestions = () => {
    let filtered = [...questions].filter(q => q !== null && q !== undefined);
    if (quizSubject !== 'Todas') filtered = filtered.filter(q => q.subject === quizSubject);
    if (quizTag !== 'Todos') filtered = filtered.filter(q => q.tags && Array.isArray(q.tags) && q.tags.includes(quizTag));
    if (filtered.length === 0) { showToast('Nenhuma questão encontrada com esses filtros.', 'warning'); return; }
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setDrawnQuestions(shuffled.slice(0, 10));
  };

  const startQuiz = () => {
    if (drawnQuestions.length === 0) { showToast('Sorteie as questões primeiro!', 'warning'); return; }
    setCurrentQuizIndex(0); setSelectedQuizOption(null); setIsCorrected(false); setShowResolution(false);
    if (useTimer) setTimeLeft(timerMinutes * 60);
    setQuizResults([]); setCurrentView('quiz-session');
  };

  const handleCorrect = useCallback(() => {
    const currentQuestion = drawnQuestions[currentQuizIndex];
    if (!currentQuestion) return;
    const isCorrect = selectedQuizOption === currentQuestion.answer;
    setIsCorrected(true);
    setAttempts(prev => [...prev, { id: Date.now().toString(), questionId: currentQuestion.id, result: isCorrect ? 'correct' : 'incorrect', timestamp: Date.now(), subject: currentQuestion.subject, tags: currentQuestion.tags }]);
    setQuestions(prev => prev.map(q => q.id === currentQuestion.id ? { ...q, lastResult: isCorrect ? 'correct' : 'incorrect', reviewCount: (q.reviewCount || 0) + 1 } : q));
    setQuizResults(prev => [...prev, { question: currentQuestion, result: isCorrect ? 'correct' : 'incorrect' }]);
  }, [drawnQuestions, currentQuizIndex, selectedQuizOption]);

  const nextQuestion = () => {
    if (currentQuizIndex < drawnQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1); setSelectedQuizOption(null); setIsCorrected(false); setShowResolution(false);
      if (useTimer) setTimeLeft(timerMinutes * 60);
    } else {
      setCurrentView('quiz-results');
    }
  };

  // ─── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    let interval: any;
    if (currentView === 'quiz-session' && useTimer && timeLeft > 0 && !isCorrected) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && useTimer && currentView === 'quiz-session' && !isCorrected) {
      handleCorrect();
    }
    return () => clearInterval(interval);
  }, [currentView, useTimer, timeLeft, isCorrected, handleCorrect]);

  // ─── Stat Carousel ────────────────────────────────────────────
  const nextStat = () => setCurrentIndex(prev => (prev + 1) % stats.length);
  const prevStat = () => setCurrentIndex(prev => (prev - 1 + stats.length) % stats.length);

  // ─── Export / Import ──────────────────────────────────────────
  const handleExportData = () => {
    const data = { questions, attempts, profile: { userName, userPhoto, bgImage, primaryColor, secondaryColor, accentColor, statsColor, statsBgColor }, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vestibular_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    saveAllSettings({ userName, userPhoto, bgImage, primaryColor, secondaryColor, accentColor, statsColor, statsBgColor, lastBackupReminder: Date.now() }).catch(() => {});
    showToast('Dados exportados com sucesso! 💾', 'success');
  };

  const handleImportData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.questions && Array.isArray(data.questions)) setQuestions(data.questions.filter((q: any) => q && q.id && (q.text || q.imageUrl)));
        if (data.attempts && Array.isArray(data.attempts)) setAttempts(data.attempts.filter((a: any) => a && a.id && a.questionId));
        if (data.profile) {
          if (data.profile.userName !== undefined) setUserName(data.profile.userName || 'Usuário');
          if (data.profile.userPhoto !== undefined) setUserPhoto(data.profile.userPhoto);
          if (data.profile.bgImage !== undefined) setBgImage(data.profile.bgImage);
          if (data.profile.primaryColor !== undefined) setPrimaryColor(data.profile.primaryColor || '#db2777');
          if (data.profile.secondaryColor !== undefined) setSecondaryColor(data.profile.secondaryColor || '#fce4ec');
          if (data.profile.accentColor !== undefined) setAccentColor(data.profile.accentColor || '#be185d');
          if (data.profile.statsColor !== undefined) setStatsColor(data.profile.statsColor || '#db2777');
          if (data.profile.statsBgColor !== undefined) setStatsBgColor(data.profile.statsBgColor || '#ffffff');
        }
        showToast('Dados importados com sucesso! 📥', 'success');
      } catch {
        showToast('Erro ao ler o arquivo. Certifique-se de que é um arquivo de dados válido.', 'error');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleResetDefaults = () => {
    setUserName('Rodrigo Aschidamini João'); setUserPhoto(null); setBgImage(null);
    setPrimaryColor('#db2777'); setSecondaryColor('#fce4ec'); setAccentColor('#be185d');
    setStatsColor('#db2777'); setStatsBgColor('#ffffff');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── View Router ──────────────────────────────────────────────
  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <Home userName={userName} userPhoto={userPhoto} primaryColor={primaryColor} accentColor={accentColor} statsBgColor={statsBgColor} stats={stats} currentIndex={currentIndex} onPrevStat={prevStat} onNextStat={nextStat} onNavigate={setCurrentView} onExport={handleExportData} importRef={importFileInputRef} onImport={handleImportData} />;
      case 'add-question':
        return <AddQuestion questionText={questionText} setQuestionText={setQuestionText} questionResolution={questionResolution} setQuestionResolution={setQuestionResolution} resolutionType={resolutionType} setResolutionType={setResolutionType} resolutionImagePreview={resolutionImagePreview} selectedAnswer={selectedAnswer} setSelectedAnswer={setSelectedAnswer} selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject} tags={tags} tagInput={tagInput} setTagInput={setTagInput} imagePreview={imagePreview} editingQuestionId={editingQuestionId} fileInputRef={fileInputRef} resolutionFileInputRef={resolutionFileInputRef} onImageUpload={handleImageUpload} onResolutionImageUpload={handleResolutionImageUpload} onAddTag={handleAddTag} onRemoveTag={removeTag} onSubmit={handleSubmit} onCancel={() => { clearForm(); setCurrentView('home'); }} primaryColor={primaryColor} accentColor={accentColor} subjects={SUBJECTS} answers={ANSWERS} />;
      case 'take-quiz':
        return <TakeQuiz quizSubject={quizSubject} setQuizSubject={setQuizSubject} quizTag={quizTag} setQuizTag={setQuizTag} useTimer={useTimer} setUseTimer={setUseTimer} timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} drawnQuestions={drawnQuestions} onDraw={handleDrawQuestions} onStart={startQuiz} onNavigate={setCurrentView} primaryColor={primaryColor} accentColor={accentColor} subjects={SUBJECTS} allTags={allTags} />;
      case 'quiz-session':
        const currentQ = drawnQuestions[currentQuizIndex];
        return currentQ ? <QuizSession currentQuestion={currentQ} currentQuizIndex={currentQuizIndex} totalQuestions={drawnQuestions.length} selectedQuizOption={selectedQuizOption} setSelectedQuizOption={setSelectedQuizOption} isCorrected={isCorrected} showResolution={showResolution} setShowResolution={setShowResolution} useTimer={useTimer} timeLeft={timeLeft} onCorrect={handleCorrect} onNext={nextQuestion} onExit={() => setCurrentView('take-quiz')} primaryColor={primaryColor} accentColor={accentColor} answers={ANSWERS} formatTime={formatTime} /> : null;
      case 'quiz-results':
        return <QuizResults quizResults={quizResults} primaryColor={primaryColor} accentColor={accentColor} onNewQuiz={() => { setCurrentView('take-quiz'); setDrawnQuestions([]); setQuizResults([]); }} onGoHome={() => { setCurrentView('home'); setQuizResults([]); }} />;
      case 'question-bank':
        return <QuestionBank questions={questions} setQuestions={setQuestions as any} primaryColor={primaryColor} accentColor={accentColor} subjects={SUBJECTS} onNavigate={setCurrentView} onEditQuestion={handleEditQuestion} />;
      case 'performance':
        return <Performance attempts={attempts} primaryColor={primaryColor} accentColor={accentColor} subjects={SUBJECTS} allTags={allTags} onNavigate={setCurrentView} />;
      case 'edit-profile':
        return <EditProfile userName={userName} setUserName={setUserName} userPhoto={userPhoto} setUserPhoto={setUserPhoto} bgImage={bgImage} setBgImage={setBgImage} primaryColor={primaryColor} setPrimaryColor={setPrimaryColor} secondaryColor={secondaryColor} setSecondaryColor={setSecondaryColor} accentColor={accentColor} setAccentColor={setAccentColor} statsColor={statsColor} setStatsColor={setStatsColor} statsBgColor={statsBgColor} setStatsBgColor={setStatsBgColor} profilePhotoInputRef={profilePhotoInputRef} bgImageInputRef={bgImageInputRef} onProfilePhotoUpload={handleProfilePhotoUpload} onBgImageUpload={handleBgImageUpload} onResetDefaults={handleResetDefaults} onNavigate={setCurrentView} />;
      default:
        return <Home userName={userName} userPhoto={userPhoto} primaryColor={primaryColor} accentColor={accentColor} statsBgColor={statsBgColor} stats={stats} currentIndex={currentIndex} onPrevStat={prevStat} onNextStat={nextStat} onNavigate={setCurrentView} onExport={handleExportData} importRef={importFileInputRef} onImport={handleImportData} />;
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  if (isLoading) return <LoadingScreen />;

  return (
    <div 
      className="min-h-screen font-sans text-[#1a1a1a] flex flex-col items-center py-8 px-4 relative"
      style={{ 
        backgroundColor: secondaryColor,
        backgroundImage: bgImage ? `linear-gradient(rgba(255, 192, 203, 0.4), rgba(255, 192, 203, 0.4)), url(${bgImage})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
      }}
    >
      {saveError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-rose-500 text-white rounded-xl shadow-2xl flex items-center gap-3 max-w-md">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-2 hover:bg-rose-600 rounded-full p-1"><X className="w-4 h-4" /></button>
        </div>
      )}
      <AnimatePresence mode="wait">
        {renderCurrentView()}
      </AnimatePresence>
      <ToastOverlay toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      <div className="h-12"></div>
    </div>
  );
}
