/**
 * Cliente do extrator server-side (PyMuPDF).
 * Envia o PDF ao servidor local (server/server.py) e recebe as questões já
 * extraídas com texto e imagens de alta qualidade. Se o servidor não estiver
 * no ar, a aba de importação cai automaticamente no extrator client-side.
 */
import type { ExtractResult } from './pdfImport';

export function serverUrl(): string {
  const env = (import.meta as any).env?.VITE_EXTRACT_API as string | undefined;
  return env || 'http://localhost:8000/extract';
}

/** Testa rapidamente se o servidor de extração está disponível. */
export async function serverAvailable(timeoutMs = 1500): Promise<boolean> {
  const base = serverUrl().replace(/\/extract\/?$/, '');
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(base + '/health', { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export async function extractViaServer(file: File): Promise<ExtractResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(serverUrl(), { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Servidor respondeu ' + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return {
    examType: data.examType,
    suggestedSource: data.suggestedSource,
    questions: (data.questions || []).map((q: any) => ({
      number: q.number ?? null,
      label: q.label || (q.number != null ? `Questão ${q.number}` : 'Questão'),
      section: q.section || 'Linguagens',
      imageDataUrl: q.image || '',
      text: q.text || '',
    })),
  };
}
