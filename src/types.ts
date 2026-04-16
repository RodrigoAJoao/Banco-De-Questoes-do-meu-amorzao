import { ReactNode } from 'react';

// ─── Core Data Models ───────────────────────────────────────────

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  answer: string;
  subject: string;
  tags: string[];
  createdAt: number;
  lastResult?: 'correct' | 'incorrect';
  reviewCount?: number;
  resolution?: string;
  resolutionImageUrl?: string;
}

export interface Attempt {
  id: string;
  questionId: string;
  result: 'correct' | 'incorrect';
  timestamp: number;
  subject: string;
  tags: string[];
}

export interface StatCard {
  id: number;
  value: number;
  label: string;
  icon: ReactNode;
  color: string;
  textColor: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export type View = 'home' | 'add-question' | 'take-quiz' | 'quiz-session' | 'quiz-results' | 'question-bank' | 'performance' | 'edit-profile';

// ─── Constants ──────────────────────────────────────────────────

export const SUBJECTS = ['História', 'Biologia', 'Química', 'Matemática', 'Português', 'Geografia', 'Física', 'Inglês', 'Linguagens', 'Humanas'];
export const ANSWERS = ['A', 'B', 'C', 'D', 'E'];
