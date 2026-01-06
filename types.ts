
export interface Annotation {
  id: string;
  type: 'draw' | 'highlight';
  points: { x: number; y: number }[];
  color: string;
  width: number;
  opacity: number;
}

export interface DocumentData {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  url: string;
  annotations: Annotation[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  notebookId: string;
  createdAt: number;
  masteryLevel: 'new' | 'learning' | 'mastered';
}

export interface Notebook {
  id: string;
  name: string;
  documents: DocumentData[];
  flashcards: Flashcard[];
}

export interface QuizQuestion {
  banca: string;
  tema: string;
  enunciado: string;
  opcoes: { [key: string]: string };
  respostaCorreta: string;
  explicacao: string;
}

export interface QuizSessionResult {
  id: string;
  notebookId: string;
  timestamp: number;
  totalQuestions: number;
  correctAnswers: number;
  questions: {
    question: QuizQuestion;
    userAnswer: string;
    isCorrect: boolean;
  }[];
}

export interface UserStats {
  dailyGoal: number;
  dailyQuestionGoal: number;
  goalsBySubject: { [notebookId: string]: number };
  cardsReviewedToday: number;
  questionsAnsweredToday: number;
  reviewsBySubject: { [notebookId: string]: number };
  streak: number;
  lastStudyTimestamp: number;
  totalReviews: number;
  quizHistory: QuizSessionResult[];
}

export type ViewState = 'home' | 'stats' | 'notebooks' | 'flashcards' | 'study' | 'quiz' | 'notebooks_list' | 'quiz_history' | 'quiz_review';

export type Tool = 'pen' | 'highlighter' | 'eraser' | 'scroll';
