
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, BookText, Plus, Menu, X, Play, ArrowLeft, Edit3, Folder, 
  Home as HomeIcon, LayoutGrid, ChevronLeft, ChevronRight, BarChart3, 
  Sparkles, Loader2, Trophy, Save, MoreVertical, Trash2, BrainCircuit, 
  Bold, Italic, Underline, List, ListOrdered, Smile, FilePlus, Eye, 
  Target, Award, AlertCircle, CheckCircle2, Settings, PlusCircle,
  FolderPlus, Layers, ClipboardCheck, History, Flame, ArrowRightCircle,
  Calendar, Search, Filter, AlignLeft, AlignCenter, AlignRight, FlameKindling,
  Cpu, Zap, Infinity, Radar
} from 'lucide-react';
import { Notebook, Flashcard, ViewState, UserStats, QuizQuestion, QuizSessionResult, DocumentData } from './types';
import FlashcardListItem from './components/FlashcardItem';
import DocumentViewer from './components/DocumentViewer';
import { loadNotebooks, saveNotebooks, saveStats, loadStats } from './services/storageService';
import { generateQuizQuestions, deepenKnowledge, analyzeQuizPerformance } from './services/geminiService';

export const EMOJI_CATEGORIES = [
  { name: 'Marcadores', emojis: ['👉','⚡','📌','📍','✅','❌','✔️','⚠️','🚫','⭕','❗','🔴','🟠','🟡','🟢','🔵','⚫','⚪','◾','◽','▪️','▫️','↪︎','↩︎','➡︎','↘︎','▶︎','◀︎','✔︎','⤵︎','⤴︎'] },
  { name: 'Estudo', emojis: ['💡', '🧠', '📚', '📝', '🎯', '🚀', '⭐', '🔍', '📎', '📖', '📅', '🖍️'] },
  { name: 'Reação', emojis: ['😊', '🤔', '👍', '🙌', '👏', '🔥', '🌈', '🎨', '💻', '🌍', '⏰', '✨'] }
];

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const SEED_FLASHCARDS: Flashcard[] = [
  { 
    id: 'seed-1', 
    notebookId: 'seed-nb-1',
    question: '<b>Quais são os fundamentos da República Federativa do Brasil?</b>', 
    answer: 'I - a soberania; II - a cidadania; III - a dignidade da pessoa humana; IV - os valores sociais do trabalho e da livre iniciativa; V - o pluralismo político.',
    createdAt: Date.now(),
    masteryLevel: 'new'
  }
];

const INITIAL_STATS: UserStats = {
  dailyGoal: 20,
  dailyQuestionGoal: 10,
  goalsBySubject: { 'seed-nb-1': 10 },
  cardsReviewedToday: 0,
  questionsAnsweredToday: 0,
  reviewsBySubject: {},
  streak: 0,
  lastStudyTimestamp: Date.now(),
  totalReviews: 0,
  quizHistory: []
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<DocumentData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [focusedCard, setFocusedCard] = useState<Flashcard | null>(null);
  const [isFocusedFlipped, setIsFocusedFlipped] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');

  const [isQuickCreatingFlashcard, setIsQuickCreatingFlashcard] = useState(false);
  const [quickCreateNotebookId, setQuickCreateNotebookId] = useState<string>('');

  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [isAnalyzingQuiz, setIsAnalyzingQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({});
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizAnalysis, setQuizAnalysis] = useState<string | null>(null);
  const [selectedHistoricalQuiz, setSelectedHistoricalQuiz] = useState<QuizSessionResult | null>(null);

  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const editQuestionRef = useRef<HTMLDivElement>(null);
  const editAnswerRef = useRef<HTMLDivElement>(null);
  const quickQuestionRef = useRef<HTMLDivElement>(null);
  const quickAnswerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingCard) {
      setTimeout(() => {
        if (editQuestionRef.current) editQuestionRef.current.innerHTML = editingCard.question;
        if (editAnswerRef.current) editAnswerRef.current.innerHTML = editingCard.answer;
      }, 50);
    }
  }, [editingCard]);

  const execFormat = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [nbData, statsData] = await Promise.all([loadNotebooks(), loadStats()]);
        if (!nbData || nbData.length === 0) {
          const seedNb: Notebook = { id: 'seed-nb-1', name: 'Direito Constitucional', documents: [], flashcards: SEED_FLASHCARDS };
          setNotebooks([seedNb]);
        } else {
          setNotebooks(nbData);
        }
        if (statsData) setStats(prev => ({ ...prev, ...statsData }));
      } finally { setIsInitialized(true); }
    };
    init();
  }, []);

  useEffect(() => {
    if (isInitialized) { saveNotebooks(notebooks); saveStats(stats); }
  }, [notebooks, stats, isInitialized]);

  const allFlashcards = useMemo(() => notebooks.flatMap(nb => nb.flashcards), [notebooks]);
  const activeNotebook = useMemo(() => notebooks.find(nb => nb.id === activeNotebookId) || null, [notebooks, activeNotebookId]);
  
  const totalCardsGoal = useMemo(() => {
    const specificGoals = (Object.values(stats.goalsBySubject) as number[]).reduce((a, b) => a + (b || 0), 0);
    return specificGoals > 0 ? specificGoals : (stats.dailyGoal || 1);
  }, [stats.goalsBySubject, stats.dailyGoal]);

  const dailyReviewProgress = totalCardsGoal > 0 ? Math.min(100, (stats.cardsReviewedToday / totalCardsGoal) * 100) : 0;
  const dailyQuestionProgress = stats.dailyQuestionGoal > 0 ? Math.min(100, (stats.questionsAnsweredToday / stats.dailyQuestionGoal) * 100) : 0;

  const hotTopics = useMemo(() => {
    const allQuestions = (stats.quizHistory || []).flatMap(session => session.questions);
    const topicsMap: { [key: string]: { total: number, correct: number } } = {};
    
    allQuestions.forEach(q => {
      const tema = q.question.tema || 'Geral';
      if (!topicsMap[tema]) topicsMap[tema] = { total: 0, correct: 0 };
      topicsMap[tema].total++;
      if (q.isCorrect) topicsMap[tema].correct++;
    });

    return Object.entries(topicsMap)
      .map(([tema, data]) => ({
        tema,
        accuracy: (data.correct / data.total) * 100,
        total: data.total
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);
  }, [stats.quizHistory]);

  const performanceInsights = useMemo(() => {
    const history = stats.quizHistory || [];
    const subjectsSummary = notebooks.map(nb => {
      const filtered = history.filter(h => h.notebookId === nb.id);
      const acc = filtered.length ? filtered.reduce((a, b) => a + (b.correctAnswers / b.totalQuestions), 0) / filtered.length : 0;
      return { id: nb.id, name: nb.name, accuracy: acc };
    });
    const bestAcc = history.length ? Math.max(...history.map(s => s.correctAnswers / s.totalQuestions)) : 0;
    return { subjectsSummary, bestAccuracy: bestAcc };
  }, [stats.quizHistory, notebooks]);

  const navigateTo = (v: ViewState) => {
    setView(v);
    setIsSidebarOpen(false);
    if (v !== 'notebooks' && v !== 'quiz' && v !== 'quiz_review') {
      setActiveNotebookId(null);
      setSelectedHistoricalQuiz(null);
    }
  };

  const handleCreateNotebook = () => {
    if (!newNotebookName.trim()) return;
    const newNb: Notebook = { id: generateId(), name: newNotebookName, documents: [], flashcards: [] };
    setNotebooks(prev => [...prev, newNb]);
    setNewNotebookName('');
    setIsCreatingNotebook(false);
    setActiveNotebookId(newNb.id);
    setView('notebooks');
  };

  const startQuiz = async () => {
    const targetCards = activeNotebook ? activeNotebook.flashcards : allFlashcards;
    if (!targetCards || targetCards.length < 1) return alert("Crie pelo menos 1 flashcard para o simulado.");
    setIsQuizLoading(true);
    try {
      const questions = await generateQuizQuestions(targetCards);
      if (!questions || questions.length === 0) throw new Error("Sem questões");
      setCurrentQuiz(questions); setQuizIndex(0); setQuizAnswers({}); setShowQuizResult(false); setView('quiz');
    } catch (err) { alert("Erro ao gerar simulado pela IA."); } finally { setIsQuizLoading(false); }
  };

  const finishQuiz = async () => {
    setIsAnalyzingQuiz(true);
    const correctCount = currentQuiz.reduce((acc, q, idx) => acc + (quizAnswers[idx] === q.respostaCorreta ? 1 : 0), 0);
    const results = currentQuiz.map((q, idx) => ({ question: q, userAnswer: quizAnswers[idx], isCorrect: quizAnswers[idx] === q.respostaCorreta }));
    const result: QuizSessionResult = { id: generateId(), notebookId: activeNotebookId || 'global', timestamp: Date.now(), totalQuestions: currentQuiz.length, correctAnswers: correctCount, questions: results };
    
    setStats(prev => ({ 
      ...prev, 
      quizHistory: [result, ...(prev.quizHistory || [])], 
      questionsAnsweredToday: prev.questionsAnsweredToday + currentQuiz.length 
    }));

    try { 
      const analysis = await analyzeQuizPerformance(results); 
      setQuizAnalysis(analysis); 
    } catch (e) { 
      setQuizAnalysis("Simulado concluído e salvo no histórico."); 
    }
    
    setShowQuizResult(true);
    setIsAnalyzingQuiz(false);
  };

  const handleDeepenKnowledge = async () => {
    if (!focusedCard) return;
    setIsExplaining(true);
    try {
      const explanation = await deepenKnowledge(focusedCard.question, focusedCard.answer);
      setAiExplanation(explanation);
    } catch (err) {
      console.error("Error deepening knowledge:", err);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleQuickCreateFlashcard = () => {
    const q = quickQuestionRef.current?.innerHTML || "";
    const a = quickAnswerRef.current?.innerHTML || "";

    if (!quickCreateNotebookId || !q.trim() || !a.trim() || q === '<br>' || a === '<br>') {
      return alert("Por favor, selecione uma pasta e preencha a pergunta e a resposta.");
    }

    const newCard: Flashcard = {
      id: generateId(),
      notebookId: quickCreateNotebookId,
      question: q,
      answer: a,
      createdAt: Date.now(),
      masteryLevel: 'new'
    };

    setNotebooks(prev => prev.map(nb => nb.id === quickCreateNotebookId ? { ...nb, flashcards: [newCard, ...nb.flashcards] } : nb));
    
    if (quickQuestionRef.current) quickQuestionRef.current.innerHTML = "";
    if (quickAnswerRef.current) quickAnswerRef.current.innerHTML = "";
    setQuickCreateNotebookId('');
    setIsQuickCreatingFlashcard(false);
  };

  const addDocument = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const newDoc: DocumentData = { id: generateId(), name: file.name, type: file.type === 'application/pdf' ? 'pdf' : 'image', url: url, annotations: [] };
      if (activeNotebookId) setNotebooks(prev => prev.map(nb => nb.id === activeNotebookId ? { ...nb, documents: [newDoc, ...nb.documents] } : nb));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-screen bg-[#fcfdfe] overflow-hidden">
      <aside className={`fixed lg:relative h-full z-[250] bg-white border-r border-slate-100 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 flex items-center justify-between">
          {!isSidebarCollapsed && <div className="flex items-center gap-2"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black">Z</div><span className="font-bold text-slate-800 text-xl tracking-tighter">ZenStudy</span></div>}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-slate-300 hidden lg:block mx-auto hover:text-indigo-600 transition-colors">{isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 lg:hidden"><X size={20} /></button>
        </div>
        <nav className="px-3 space-y-1 mt-4">
          <button onClick={() => navigateTo('home')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl ${view === 'home' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><HomeIcon size={18} />{!isSidebarCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">Início</span>}</button>
          <button onClick={() => navigateTo('stats')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl ${view === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><BarChart3 size={18} />{!isSidebarCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">Performance</span>}</button>
          <button onClick={() => navigateTo('quiz_history')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl ${view === 'quiz_history' || view === 'quiz_review' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><History size={18} />{!isSidebarCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">Histórico</span>}</button>
          <button onClick={() => navigateTo('notebooks_list')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl ${view === 'notebooks_list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutGrid size={18} />{!isSidebarCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">Pastas</span>}</button>
          <button onClick={() => navigateTo('flashcards')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl ${view === 'flashcards' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><BookText size={18} />{!isSidebarCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">Flashcards</span>}</button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="lg:hidden absolute top-4 left-4 z-[200]"><button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white shadow-xl border border-slate-100 rounded-2xl text-indigo-600"><Menu size={20} /></button></div>

        {view === 'home' && (
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 animate-fade-in-up">
            <header className="mb-10 lg:mt-0 mt-12 flex justify-between items-center">
              <div><h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Bons Estudos!</h1><p className="text-[11px] text-slate-400 font-black uppercase mt-1">Status de aprendizado</p></div>
              <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100"><Flame size={18} className="text-orange-500" /><span className="text-[11px] font-black text-slate-700 uppercase">{stats.streak} Dias</span></div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
               <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex items-center gap-8">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f8fafc" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#4f46e5" strokeWidth="8" strokeDasharray="251.32" strokeDashoffset={251.32 - (251.32 * dailyReviewProgress) / 100} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-indigo-600">{Math.round(dailyReviewProgress)}%</div>
                  </div>
                  <div><h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Revisão</h4><p className="text-2xl font-black text-slate-800">{stats.cardsReviewedToday} / {totalCardsGoal}</p></div>
               </div>
               <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex items-center gap-8">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f8fafc" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="251.32" strokeDashoffset={251.32 - (251.32 * dailyQuestionProgress) / 100} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-emerald-600">{Math.round(dailyQuestionProgress)}%</div>
                  </div>
                  <div><h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Simulados</h4><p className="text-2xl font-black text-slate-800">{stats.questionsAnsweredToday} / {stats.dailyQuestionGoal}</p></div>
               </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
               {[
                 { label: 'Flashcards', icon: BookText, action: () => navigateTo('flashcards') },
                 { label: 'Performance', icon: BarChart3, action: () => navigateTo('stats') },
                 { label: 'Histórico', icon: History, action: () => navigateTo('quiz_history') },
                 { label: 'Card Rápido', icon: PlusCircle, action: () => setIsQuickCreatingFlashcard(true) },
                 { label: 'Nova Pasta', icon: FolderPlus, action: () => setIsCreatingNotebook(true), dark: true }
               ].map((item, idx) => (
                 <button key={idx} onClick={item.action} className={`${item.dark ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-800 shadow-xl'} p-6 rounded-[2.5rem] hover:-translate-y-1 transition-all text-left group`}>
                    <div className={`w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${item.dark && 'bg-white/10 text-white'}`}><item.icon size={24} /></div>
                    <span className="block text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                 </button>
               ))}
            </div>
          </div>
        )}

        {/* ... (O restante do código permanece igual às versões anteriores) ... */}
        {view === 'quiz' && currentQuiz.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white animate-fade-in">
             <header className="p-6 border-b flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                   <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Questão {quizIndex + 1} de {currentQuiz.length}</div>
                </div>
                <button onClick={() => navigateTo('home')} className="p-2 text-slate-400 hover:text-rose-500"><X size={24} /></button>
             </header>
             <div className="flex-1 overflow-y-auto p-6 lg:p-12 max-w-4xl mx-auto w-full">
                {!showQuizResult ? (
                  <div className="space-y-10">
                     <div className="space-y-4">
                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">Enunciado</span>
                        <h2 className="text-xl lg:text-2xl font-bold text-slate-800 leading-relaxed">{currentQuiz[quizIndex].enunciado}</h2>
                     </div>
                     <div className="space-y-3">
                        {Object.entries(currentQuiz[quizIndex].opcoes).map(([key, val]) => (
                          <button key={key} onClick={() => setQuizAnswers(prev => ({...prev, [quizIndex]: key}))} className={`w-full p-6 text-left rounded-[2rem] border-2 transition-all flex items-center gap-5 group ${quizAnswers[quizIndex] === key ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 hover:border-indigo-200'}`}>
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black uppercase text-sm ${quizAnswers[quizIndex] === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100'}`}>{key}</div>
                             <span className={`text-sm lg:text-base font-medium ${quizAnswers[quizIndex] === key ? 'text-indigo-900' : 'text-slate-600'}`}>{val}</span>
                          </button>
                        ))}
                     </div>
                     <div className="flex justify-between pt-8">
                        <button disabled={quizIndex === 0} onClick={() => setQuizIndex(quizIndex - 1)} className="px-8 py-3 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase disabled:opacity-0 transition-all">Anterior</button>
                        {quizIndex === currentQuiz.length - 1 ? (
                          <button onClick={finishQuiz} disabled={!quizAnswers[quizIndex]} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">Finalizar Simulado</button>
                        ) : (
                          <button onClick={() => setQuizIndex(quizIndex + 1)} disabled={!quizAnswers[quizIndex]} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">Próxima</button>
                        )}
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
                     <div className="relative mb-12">
                        <div className="w-40 h-40 bg-indigo-600 rounded-[3rem] rotate-12 flex items-center justify-center text-white shadow-2xl relative z-10">
                           <Award size={80} />
                        </div>
                        <div className="absolute inset-0 bg-indigo-200 rounded-[3rem] -rotate-6 z-0" />
                     </div>
                     <h2 className="text-4xl font-black text-slate-900 uppercase mb-2 tracking-tighter">Simulado Salvo!</h2>
                     <p className="text-slate-500 font-bold mb-10 text-xl">Você atingiu <span className="text-indigo-600">{Math.round((currentQuiz.reduce((acc, q, idx) => acc + (quizAnswers[idx] === q.respostaCorreta ? 1 : 0), 0) / currentQuiz.length) * 100)}%</span> de acerto.</p>
                     
                     <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
                        <button onClick={() => setView('quiz_review')} className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                           <Sparkles size={18} /> Ver Correção Instantânea
                        </button>
                        <button onClick={() => navigateTo('home')} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-xs uppercase hover:bg-slate-200 transition-all">
                           Ir para o Início
                        </button>
                     </div>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>
      <style>{` .no-scrollbar::-webkit-scrollbar { display: none; } `}</style>
    </div>
  );
};

export default App;
