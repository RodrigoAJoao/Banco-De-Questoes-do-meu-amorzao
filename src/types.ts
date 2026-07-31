import { ReactNode } from 'react';

// ─── Core Data Models ───────────────────────────────────────────

export type ErrorReason = 'desatencao' | 'lacuna' | 'duvida' | 'interpretacao';

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
  /** @deprecated Mantido para compatibilidade. Use resolutionImageUrls. */
  resolutionImageUrl?: string;
  resolutionImageUrls?: string[];
  errorReason?: ErrorReason;
  /** Origem da questão quando importada de uma prova (ex.: "ENEM · 2024 · Dia 1"). */
  source?: string;
}

export interface Attempt {
  id: string;
  questionId: string;
  result: 'correct' | 'incorrect';
  timestamp: number;
  subject: string;
  tags: string[];
  errorReason?: ErrorReason;
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

export type View = 'home' | 'add-question' | 'take-quiz' | 'quiz-session' | 'quiz-results' | 'question-bank' | 'performance' | 'edit-profile' | 'import-prova';

// ─── Constants ──────────────────────────────────────────────────

export const SUBJECTS = ['História', 'Biologia', 'Química', 'Matemática', 'Português', 'Geografia', 'Física', 'Inglês', 'Linguagens', 'Humanas'];
export const ANSWERS = ['A', 'B', 'C', 'D', 'E'];

export const ERROR_REASONS: { value: ErrorReason; label: string; emoji: string }[] = [
  { value: 'desatencao', label: 'Desatenção', emoji: '😵‍💫' },
  { value: 'lacuna', label: 'Lacuna de conteúdo', emoji: '📚' },
  { value: 'duvida', label: 'Dúvida', emoji: '🤔' },
  { value: 'interpretacao', label: 'Erro de interpretação', emoji: '🔍' },
];

/** Normaliza uma tag para comparação case-insensitive (sem acentos/espaços extras). */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}
