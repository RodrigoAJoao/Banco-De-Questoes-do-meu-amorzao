/**
 * Importação de provas em PDF (ENEM / UFRGS).
 *
 * Abordagem (inspirada em parsers PyMuPDF como diaslui/enem-extractor e
 * caue-paiva/ENEM_PDF_PARSER): usa as caixas delimitadoras REAIS das linhas de
 * texto para determinar, com precisão, onde cada questão começa e termina —
 * do marcador "QUESTÃO NN" até a última linha antes do próximo marcador. O
 * recorte é feito sobre a página renderizada, preservando figuras e gráficos.
 *
 * O gabarito não está nas provas, então a resposta é definida depois pelo usuário.
 */
import * as pdfjsLib from 'pdfjs-dist';
// Vite resolve o worker como URL do bundle.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ExtractedQuestion {
  number: number | null;
  label: string;        // ex.: "Questão 07"
  section: string;      // matéria/área sugerida
  imageDataUrl: string; // recorte (JPEG base64)
  text: string;         // texto extraído (melhor esforço)
}

export interface ExtractResult {
  examType: 'ENEM' | 'UFRGS' | 'Desconhecido';
  suggestedSource: string;
  questions: ExtractedQuestion[];
}

type ProgressFn = (msg: string, pct: number) => void;

interface Line { col: number; y: number; top: number; bottom: number; x: number; xEnd: number; text: string; }
interface ColBound { x0: number; x1: number; }
interface PageMeta { width: number; height: number; cols: ColBound[]; section: string; lines: Line[]; }
interface FlatLine { page: number; col: number; top: number; bottom: number; text: string; }
interface Slice { page: number; col: number; top: number; bottom: number; full?: boolean; }

// ─── Reconstrução de linhas com caixa delimitadora ───────────────
function buildLines(items: any[], cols: ColBound[]): Line[] {
  const buckets: Record<number, any[]> = {};
  for (const it of items) {
    const s = it.str;
    if (!s || !s.trim()) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const w = it.width || 0;
    const h = it.height || 8;
    const cx = x + w / 2;
    let ci = 0;
    for (let i = 0; i < cols.length; i++) {
      if (cx >= cols[i].x0 - 4 && cx <= cols[i].x1 + 4) { ci = i; break; }
      if (i === cols.length - 1) ci = cx < cols[0].x1 ? 0 : cols.length - 1;
    }
    (buckets[ci] = buckets[ci] || []).push({ str: s, x, y, xEnd: x + w, top: y + h * 0.85, bottom: y - h * 0.2 });
  }
  const lines: Line[] = [];
  for (const ci of Object.keys(buckets).map(Number).sort((a, b) => a - b)) {
    const arr = buckets[ci].sort((a, b) => (b.y - a.y) || (a.x - b.x));
    let cur: any = null;
    for (const it of arr) {
      if (cur && Math.abs(it.y - cur.y) <= 3) {
        cur.items.push(it); cur.xEnd = Math.max(cur.xEnd, it.xEnd);
        cur.top = Math.max(cur.top, it.top); cur.bottom = Math.min(cur.bottom, it.bottom);
      } else {
        if (cur) lines.push(finishLine(cur));
        cur = { col: ci, y: it.y, x: it.x, xEnd: it.xEnd, top: it.top, bottom: it.bottom, items: [it] };
      }
    }
    if (cur) lines.push(finishLine(cur));
  }
  return lines;
}
function finishLine(cur: any): Line {
  return { col: cur.col, y: cur.y, top: cur.top, bottom: cur.bottom, x: cur.x, xEnd: cur.xEnd, text: cur.items.map((i: any) => i.str).join(' ').replace(/\s+/g, ' ').trim() };
}

// ─── Detecção de colunas (calha central global) ──────────────────
function narrowSpans(items: any[], width: number): { x0: number; x1: number }[] {
  return items
    .filter(it => it.str && it.str.trim())
    .map(it => ({ x0: it.transform[4], x1: it.transform[4] + (it.width || 0) }))
    .filter(s => (s.x1 - s.x0) < width * 0.5);
}

function globalGutter(allItems: any[][], width: number): number {
  const lo = width * 0.46, hi = width * 0.57;
  let bestX = width * 0.5, best = Infinity;
  for (let gx = lo; gx <= hi; gx += 2) {
    let cross = 0;
    for (const items of allItems) {
      const spans = narrowSpans(items, width);
      for (const s of spans) if (s.x0 <= gx && s.x1 >= gx) cross++;
    }
    if (cross < best) { best = cross; bestX = gx; }
  }
  return bestX;
}

function columnsFor(items: any[], width: number, gutter: number): ColBound[] {
  const single: ColBound[] = [{ x0: width * 0.025, x1: width * 0.978 }];
  // Considera apenas texto de largura de coluna (linhas full-width já foram removidas).
  const spans = narrowSpans(items, width);
  if (spans.length < 24) return single;
  const left = spans.filter(s => (s.x0 + s.x1) / 2 < gutter).length;
  const right = spans.filter(s => (s.x0 + s.x1) / 2 >= gutter).length;
  // 2 colunas quando há texto de coluna suficiente dos dois lados da calha global.
  // (A calha já é o x de menor cruzamento, então não reavaliamos cruzamento aqui.)
  if (left >= 8 && right >= 8 && left > spans.length * 0.15 && right > spans.length * 0.15) {
    return [{ x0: width * 0.025, x1: gutter - 3 }, { x0: gutter + 3, x1: width * 0.978 }];
  }
  return single;
}

const SECTION_PATTERNS: { re: RegExp; section: string }[] = [
  { re: /LINGUAGENS/, section: 'Linguagens' },
  { re: /CI[EÊ]NCIAS\s+HUMANAS/, section: 'Humanas' },
  { re: /CI[EÊ]NCIAS\s+DA\s+NATUREZA/, section: 'Biologia' },
  { re: /MATEM[AÁ]TICA/, section: 'Matemática' },
];
function detectSection(lines: Line[]): string | null {
  for (const ln of lines) {
    const up = ln.text.toUpperCase();
    for (const sp of SECTION_PATTERNS) if (sp.re.test(up)) return sp.section;
  }
  return null;
}

// ─── Detecção de marcador de questão ─────────────────────────────
function markerNumber(text: string, examType: string): number | null {
  if (examType === 'ENEM') {
    const norm = text.replace(/\s+/g, '').toUpperCase();
    const m = norm.match(/^QUEST[ÃA]O(\d{1,3})\b/);
    return m ? +m[1] : null;
  }
  // ENEM também aceita "QUESTÃO NN" no meio de exames desconhecidos; UFRGS usa "NN."
  const norm = text.replace(/\s+/g, '').toUpperCase();
  const me = norm.match(/^QUEST[ÃA]O(\d{1,3})\b/);
  if (me) return +me[1];
  const mu = text.match(/^(\d{1,2})\s*[.\)]\s+\S/);
  return mu ? +mu[1] : null;
}
function isOptionA(text: string): boolean {
  return /^\(?\s*[Aa]\s*[\).]/.test(text.trim());
}


// Linhas de cabeçalho/rodapé/marca d'água que não devem entrar em nenhuma questão.
function isNoiseLine(ln: Line, height: number): boolean {
  const cy = (ln.top + ln.bottom) / 2;
  if (cy > height * 0.95 || cy < height * 0.058) return true; // faixas de cabeçalho/rodapé
  const t = ln.text.trim();
  if (!t) return true;
  // Número de página solto nas bordas (ex.: "31", "01 02").
  if ((cy < height * 0.11 || cy > height * 0.9) && /^\d{1,3}(\s+\d{1,3})*$/.test(t)) return true;
  if (/^ENEM\s?20\d{2}/i.test(t)) return true;                    // marca d'água
  if (/^\*[0-9A-Z]+\*/.test(t)) return true;                       // código de barras textual
  if (/TECNOLOGIAS.*(DIA|CADERNO|AZUL|ROSA|AMAREL|BRANC|CINZA|VERDE)/i.test(t)) return true; // rodapé de seção
  return false;
}

export async function extractExam(file: File, onProgress?: ProgressFn): Promise<ExtractResult> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const numPages = doc.numPages;

  // Passo 1 — texto de todas as páginas.
  const rawPages: { width: number; height: number; items: any[] }[] = [];
  for (let p = 0; p < numPages; p++) {
    const page = await doc.getPage(p + 1);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    rawPages.push({ width: vp.width, height: vp.height, items: tc.items });
    onProgress?.(`Lendo página ${p + 1}/${numPages}...`, Math.round(((p + 1) / numPages) * 35));
  }

  const gutter = globalGutter(rawPages.map(r => r.items), rawPages[0].width);

  const meta: PageMeta[] = [];
  let fullText = '';
  let curSection = 'Linguagens';
  for (const rp of rawPages) {
    const cols = columnsFor(rp.items, rp.width, gutter);
    const lines = buildLines(rp.items, cols);
    const sec = detectSection(lines);
    if (sec) curSection = sec;
    meta.push({ width: rp.width, height: rp.height, cols, section: curSection, lines });
    fullText += ' ' + lines.map(l => l.text).join(' ');
  }

  const isEnem = /ENEM\s*20\d{2}|ENEM20\d{2}/i.test(fullText);
  const isUfrgs = /UFRGS/i.test(fullText);
  const examType: ExtractResult['examType'] = isEnem ? 'ENEM' : isUfrgs ? 'UFRGS' : 'Desconhecido';

  // Passo 2 — linhas em ordem de leitura, ignorando cabeçalho/rodapé/marca d'água.
  const flat: FlatLine[] = [];
  const sectionByPage = meta.map(m => m.section);
  for (let p = 0; p < numPages; p++) {
    const h = meta[p].height;
    for (const ln of meta[p].lines) {
      if (isNoiseLine(ln, h)) continue;
      flat.push({ page: p, col: ln.col, top: ln.top, bottom: ln.bottom, text: ln.text });
    }
  }
  flat.sort((a, b) => (a.page - b.page) || (a.col - b.col) || (b.top - a.top));

  // Índices dos marcadores no array plano.
  const rawMarkers: { i: number; number: number }[] = [];
  flat.forEach((ln, i) => { const n = markerNumber(ln.text, examType); if (n != null) rawMarkers.push({ i, number: n }); });

  // Para UFRGS/genérico, mantém apenas marcadores cujo bloco contém alternativa "(A)".
  let markers = rawMarkers;
  if (examType !== 'ENEM') {
    markers = rawMarkers.filter((mk, k) => {
      const end = k + 1 < rawMarkers.length ? rawMarkers[k + 1].i : flat.length;
      for (let j = mk.i + 1; j < end; j++) if (isOptionA(flat[j].text)) return true;
      return false;
    });
  }

  if (markers.length === 0) {
    doc.destroy();
    return { examType, suggestedSource: guessSource(fullText, file.name, examType), questions: [] };
  }

  // Passo 3 — renderização + recorte por questão.
  // Em tablets/celulares usa escala menor para não estourar memória/limite de canvas.
  const isMobile = typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
     (typeof window !== 'undefined' && (window.innerWidth || 9999) < 820));
  const RENDER_SCALE = isMobile
    ? Math.min(1.8, 1150 / meta[0].width)
    : Math.min(2.4, 1500 / meta[0].width);
  const cache = new Map<number, { canvas: HTMLCanvasElement; vp: any }>();
  const renderPage = async (p: number): Promise<{ canvas: HTMLCanvasElement; vp: any }> => {
    const hit = cache.get(p);
    if (hit) return hit;
    const page = await doc.getPage(p + 1);
    const vp = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const rendered = { canvas, vp };
    cache.set(p, rendered);
    if (cache.size > 3) { const first = cache.keys().next().value as number; if (first !== p) cache.delete(first); }
    return rendered;
  };

  const questions: ExtractedQuestion[] = [];
  const MARGIN = 3; // margem em pontos ao redor do texto da questão

  for (let k = 0; k < markers.length; k++) {
    const mk = markers[k];
    const endIdx = k + 1 < markers.length ? markers[k + 1].i : flat.length;
    const startPage = flat[mk.i].page;
    // Uma questão não passa de 2 páginas consecutivas (evita capturar contracapa/gabarito).
    const runLines = flat.slice(mk.i, endIdx).filter(l => l.page <= startPage + 1);
    const slices = slicesForRun(runLines, meta, MARGIN);
    if (slices.length === 0) continue;

    onProgress?.(`Recortando questão ${k + 1}/${markers.length}...`, 40 + Math.round(((k + 1) / markers.length) * 55));
    try {
      const img = await cropSlices(meta, slices, RENDER_SCALE, renderPage);
      const text = cleanText(runLines.map(l => l.text).join('\n'));
      const section = sectionByPage[flat[mk.i].page] || curSection;
      questions.push({
        number: mk.number,
        label: mk.number != null ? `Questão ${mk.number}` : `Questão ${k + 1}`,
        section,
        imageDataUrl: img,
        text,
      });
    } catch (e) {
      console.warn('Falha ao recortar questão', mk.number, e);
    }
  }

  doc.destroy();
  onProgress?.('Concluído', 100);
  return { examType, suggestedSource: guessSource(fullText, file.name, examType), questions };
}

// Agrupa as linhas de uma questão por (página, coluna) e gera uma fatia por grupo,
// usando o topo/base REAIS das linhas — sem estimativas de margem.
const FIG_GAP = 55; // espaço vertical (pt) que indica uma figura entre linhas

function slicesForRun(runLines: FlatLine[], meta: PageMeta[], margin: number): Slice[] {
  const groups: { page: number; col: number; lines: FlatLine[] }[] = [];
  for (const ln of runLines) {
    const last = groups[groups.length - 1];
    if (last && last.page === ln.page && last.col === ln.col) last.lines.push(ln);
    else groups.push({ page: ln.page, col: ln.col, lines: [ln] });
  }
  // Só expande para a próxima coluna/página se a coluna anterior "transbordou"
  // (terminou perto do rodapé). Evita capturar o início da próxima questão.
  const kept = groups.slice(0, 1);
  for (let i = 1; i < groups.length; i++) {
    const prevBottom = Math.min(...kept[kept.length - 1].lines.map(l => l.bottom));
    if (prevBottom <= meta[kept[kept.length - 1].page].height * 0.13) kept.push(groups[i]);
    else break;
  }
  return kept.map(g => {
    const pm = meta[g.page];
    const lines = g.lines.slice().sort((a, b) => b.top - a.top);
    const top = Math.min(pm.height, lines[0].top + margin);
    const bottom = Math.max(0, lines[lines.length - 1].bottom - margin);
    // Há uma figura grande (gap vertical) na questão?
    let hasFigure = false;
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].bottom - lines[i + 1].top > FIG_GAP) { hasFigure = true; break; }
    }
    // Largura total só quando há figura E a coluna vizinha está vazia em TODA a
    // altura da questão (questão realmente de largura total; evita invadir a vizinha).
    let full = false;
    if (hasFigure && pm.cols.length > 1) {
      const otherHasText = pm.lines.some(l => {
        if (l.col === g.col) return false;
        const cy = (l.top + l.bottom) / 2;
        return cy < top && cy > bottom;
      });
      full = !otherHasText;
    }
    return { page: g.page, col: g.col, top, bottom, full };
  });
}

async function cropSlices(meta: PageMeta[], slices: Slice[], _scale: number, renderPage: (p: number) => Promise<{ canvas: HTMLCanvasElement; vp: any }>): Promise<string> {
  const parts: { canvas: HTMLCanvasElement; sx: number; sy: number; sw: number; sh: number }[] = [];
  for (const sl of slices) {
    const pm = meta[sl.page];
    const col = pm.cols[Math.min(sl.col, pm.cols.length - 1)];
    const x0 = sl.full ? pm.width * 0.02 : col.x0;
    const x1 = sl.full ? pm.width * 0.98 : col.x1;
    const { canvas, vp } = await renderPage(sl.page);
    // Mapeamento oficial pdfjs PDF→canvas (lida com offset de MediaBox e rotação).
    const [xa] = vp.convertToViewportPoint(x0 - 2, 0);
    const [xb] = vp.convertToViewportPoint(x1 + 2, 0);
    const sx = Math.max(0, Math.floor(Math.min(xa, xb)));
    const sxEnd = Math.min(canvas.width, Math.ceil(Math.max(xa, xb)));
    const sw = Math.max(1, sxEnd - sx);
    const [, ya] = vp.convertToViewportPoint(0, sl.top);
    const [, yb] = vp.convertToViewportPoint(0, sl.bottom);
    const sy = Math.max(0, Math.floor(Math.min(ya, yb)));
    const syEnd = Math.min(canvas.height, Math.ceil(Math.max(ya, yb)));
    const sh = Math.max(1, syEnd - sy);
    if (sh < 6) continue;
    parts.push({ canvas, sx, sy, sw, sh });
  }
  if (parts.length === 0) throw new Error('sem conteúdo');
  const outW = Math.max(...parts.map(p => p.sw));
  const outH = parts.reduce((a, p) => a + p.sh, 0) + (parts.length - 1) * 8;
  const out = document.createElement('canvas');
  out.width = outW; out.height = outH;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  let y = 0;
  for (const p of parts) {
    ctx.drawImage(p.canvas, p.sx, p.sy, p.sw, p.sh, 0, y, p.sw, p.sh);
    y += p.sh + 8;
  }
  return out.toDataURL('image/jpeg', 0.72);
}

function cleanText(t: string): string {
  return t
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^ENEM\s?20\d{2}/i.test(l) && !/^\*[0-9A-Z]+\*$/.test(l) && !/VESTIBULAR\s*\//i.test(l) && !/^(LC|CH|CN|MT)\s*[-–]/i.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 4000);
}

function guessSource(fullText: string, fileName: string, examType: string): string {
  let year = '';
  const my = fullText.match(/ENEM\s*(20\d{2})|VESTIBULAR\s*\/?\s*(20\d{2})/i);
  if (my) year = my[1] || my[2] || '';
  if (!year) { const fy = fileName.match(/20\d{2}/); if (fy) year = fy[0]; }
  let day = '';
  if (/2\s*[º°]?\s*DIA|_D2_|D2/i.test(fileName + ' ' + fullText)) day = 'Dia 2';
  else if (/1\s*[º°]?\s*DIA|_D1_|D1/i.test(fileName + ' ' + fullText)) day = 'Dia 1';
  const base = examType === 'Desconhecido' ? 'Prova' : examType;
  return [base, year, day].filter(Boolean).join(' · ');
}
