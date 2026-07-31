/**
 * Importação de provas em PDF (ENEM / UFRGS).
 *
 * Estratégia: renderiza cada página como imagem e usa o texto (com posições)
 * apenas para localizar o início de cada questão. Cada questão é recortada da
 * imagem renderizada (ciente de colunas), preservando figuras e gráficos —
 * o que a extração puramente textual perderia.
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

interface Line { col: number; y: number; x: number; xEnd: number; text: string; }
interface ColBound { x0: number; x1: number; }
interface PageMeta { width: number; height: number; cols: ColBound[]; section: string; lines: Line[]; }
interface Marker { page: number; col: number; y: number; number: number | null; section: string; }

// Reconstrói linhas de texto agrupando itens por coluna e por y.
function buildLines(items: any[], cols: ColBound[]): Line[] {
  const buckets: Record<number, any[]> = {};
  for (const it of items) {
    const s = it.str;
    if (!s || !s.trim()) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const w = it.width || 0;
    const cx = x + w / 2;
    let ci = 0;
    for (let i = 0; i < cols.length; i++) { if (cx >= cols[i].x0 - 4 && cx <= cols[i].x1 + 4) { ci = i; break; } if (i === cols.length - 1) ci = cx < cols[0].x1 ? 0 : cols.length - 1; }
    (buckets[ci] = buckets[ci] || []).push({ str: s, x, y, xEnd: x + w });
  }
  const lines: Line[] = [];
  for (const ci of Object.keys(buckets).map(Number).sort()) {
    const arr = buckets[ci].sort((a, b) => (b.y - a.y) || (a.x - b.x));
    let cur: any = null;
    for (const it of arr) {
      if (cur && Math.abs(it.y - cur.y) <= 3) { cur.items.push(it); cur.xEnd = Math.max(cur.xEnd, it.xEnd); }
      else { if (cur) lines.push(finishLine(cur)); cur = { col: ci, y: it.y, x: it.x, xEnd: it.xEnd, items: [it] }; }
    }
    if (cur) lines.push(finishLine(cur));
  }
  return lines;
}
function finishLine(cur: any): Line {
  return { col: cur.col, y: cur.y, x: cur.x, xEnd: cur.xEnd, text: cur.items.map((i: any) => i.str).join(' ').replace(/\s+/g, ' ').trim() };
}

// Detecta 1 ou 2 colunas procurando uma "calha" vertical sem texto no centro da página.
function narrowSpans(items: any[], width: number): { x0: number; x1: number }[] {
  return items
    .filter(it => it.str && it.str.trim())
    .map(it => ({ x0: it.transform[4], x1: it.transform[4] + (it.width || 0) }))
    // Remove itens de largura de coluna dupla (marca d'água, cabeçalhos, linhas full-width).
    .filter(s => (s.x1 - s.x0) < width * 0.5);
}

// Calha central global (mediana das páginas): mais estável que detectar por página.
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
  const single: ColBound[] = [{ x0: width * 0.04, x1: width * 0.96 }];
  const spans = narrowSpans(items, width);
  if (spans.length < 25) return single;
  const crossing = spans.filter(s => s.x0 <= gutter && s.x1 >= gutter).length;
  const left = spans.filter(s => (s.x0 + s.x1) / 2 < gutter).length;
  const right = spans.filter(s => (s.x0 + s.x1) / 2 >= gutter).length;
  if (crossing <= spans.length * 0.06 && left > spans.length * 0.2 && right > spans.length * 0.2) {
    return [{ x0: width * 0.04, x1: gutter - 4 }, { x0: gutter + 4, x1: width * 0.96 }];
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

export async function extractExam(file: File, onProgress?: ProgressFn): Promise<ExtractResult> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const numPages = doc.numPages;

  // ── Passo 1: texto de todas as páginas ──
  const rawPages: { width: number; height: number; items: any[] }[] = [];
  for (let p = 0; p < numPages; p++) {
    const page = await doc.getPage(p + 1);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    rawPages.push({ width: vp.width, height: vp.height, items: tc.items });
    onProgress?.(`Lendo página ${p + 1}/${numPages}...`, Math.round(((p + 1) / numPages) * 35));
  }

  // Calha central global (estável entre páginas).
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

  // ── Passo 2: marcadores de questão ──
  const markers: Marker[] = [];
  for (let p = 0; p < numPages; p++) {
    const pm = meta[p];
    for (const ln of pm.lines) {
      if (examType === 'ENEM') {
        const norm = ln.text.replace(/\s+/g, '').toUpperCase();
        const m = norm.match(/^QUEST[ÃA]O(\d{1,3})/);
        if (m) markers.push({ page: p, col: ln.col, y: ln.y, number: +m[1], section: pm.section });
      } else {
        // UFRGS/genérico: "NN." iniciando a linha; filtrado depois pela presença de "(A)".
        const m = ln.text.match(/^(\d{1,2})\s*[\.\)]\s+\S/);
        if (m) markers.push({ page: p, col: ln.col, y: ln.y, number: +m[1], section: pm.section });
      }
    }
  }

  // Ordena por ordem de leitura: página, coluna, y desc (topo → base).
  markers.sort((a, b) => (a.page - b.page) || (a.col - b.col) || (b.y - a.y));

  // Filtro UFRGS: mantém só marcadores cujo bloco contém alternativa "(A)".
  let usable = markers;
  if (examType !== 'ENEM') {
    usable = markers.filter((mk, i) => {
      const next = markers[i + 1];
      const opts = collectRunLines(meta, mk, next).some(l => /^\(?\s*A\s*[\).]/.test(l.text));
      return opts;
    });
  }

  if (usable.length === 0) {
    return { examType, suggestedSource: guessSource(fullText, file.name, examType), questions: [] };
  }

  // ── Passo 3: renderização + recorte por questão ──
  const RENDER_SCALE = Math.min(2.4, 1500 / meta[0].width);
  const cache = new Map<number, HTMLCanvasElement>();
  const renderPage = async (p: number): Promise<HTMLCanvasElement> => {
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
    cache.set(p, canvas);
    if (cache.size > 3) { const first = cache.keys().next().value as number; if (first !== p) cache.delete(first); }
    return canvas;
  };

  const questions: ExtractedQuestion[] = [];
  for (let i = 0; i < usable.length; i++) {
    const mk = usable[i];
    const next = usable[i + 1];
    const slices = buildSlices(meta, mk, next);
    onProgress?.(`Recortando questão ${i + 1}/${usable.length}...`, 40 + Math.round(((i + 1) / usable.length) * 55));
    try {
      const img = await cropSlices(meta, slices, RENDER_SCALE, renderPage);
      const text = collectRunLines(meta, mk, next).map(l => l.text).join('\n');
      questions.push({
        number: mk.number,
        label: mk.number != null ? `Questão ${mk.number}` : `Questão ${i + 1}`,
        section: mk.section,
        imageDataUrl: img,
        text: cleanText(text),
      });
    } catch (e) {
      console.warn('Falha ao recortar questão', mk, e);
    }
  }

  doc.destroy();
  onProgress?.('Concluído', 100);
  return { examType, suggestedSource: guessSource(fullText, file.name, examType), questions };
}

// Unidades de coluna em ordem global de leitura.
interface ColUnit { page: number; col: number; }
function colUnits(meta: PageMeta[]): ColUnit[] {
  const out: ColUnit[] = [];
  for (let p = 0; p < meta.length; p++) for (let c = 0; c < meta[p].cols.length; c++) out.push({ page: p, col: c });
  return out;
}
function unitIndex(units: ColUnit[], page: number, col: number): number {
  return units.findIndex(u => u.page === page && u.col === Math.min(col, 999));
}

interface Slice { page: number; col: number; top: number; bottom: number; }

function buildSlices(meta: PageMeta[], mk: Marker, next?: Marker): Slice[] {
  const units = colUnits(meta);
  const startCol = Math.min(mk.col, meta[mk.page].cols.length - 1);
  const ai = unitIndex(units, mk.page, startCol);
  let bi: number, nextY: number;
  if (next) {
    const nCol = Math.min(next.col, meta[next.page].cols.length - 1);
    bi = unitIndex(units, next.page, nCol);
    nextY = next.y;
  } else {
    bi = ai; nextY = -Infinity; // até o fim da coluna
  }
  const labelPad = 16;   // inclui o rótulo "QUESTÃO NN" acima do y do marcador
  const gapPad = -18;    // estende abaixo do próximo marcador para não perder a alternativa E

  const slices: Slice[] = [];
  const contentTop = (pg: number) => meta[pg].height * 0.955;
  const contentBot = (pg: number) => meta[pg].height * 0.05;

  if (bi <= ai) {
    // Mesma coluna (ou último marcador): do marcador até o próximo (ou base).
    slices.push({ page: mk.page, col: startCol, top: Math.min(contentTop(mk.page), mk.y + labelPad), bottom: next ? nextY + gapPad : contentBot(mk.page) });
    return slices;
  }
  // Primeira coluna: do marcador até a base.
  slices.push({ page: units[ai].page, col: units[ai].col, top: Math.min(contentTop(units[ai].page), mk.y + labelPad), bottom: contentBot(units[ai].page) });
  // Colunas intermediárias completas.
  for (let u = ai + 1; u < bi; u++) {
    slices.push({ page: units[u].page, col: units[u].col, top: contentTop(units[u].page), bottom: contentBot(units[u].page) });
  }
  // Última coluna: do topo até o próximo marcador.
  slices.push({ page: units[bi].page, col: units[bi].col, top: contentTop(units[bi].page), bottom: nextY + gapPad });
  return slices;
}

async function cropSlices(meta: PageMeta[], slices: Slice[], scale: number, renderPage: (p: number) => Promise<HTMLCanvasElement>): Promise<string> {
  const parts: { canvas: HTMLCanvasElement; sx: number; sy: number; sw: number; sh: number }[] = [];
  for (const sl of slices) {
    const pm = meta[sl.page];
    const col = pm.cols[Math.min(sl.col, pm.cols.length - 1)];
    const canvas = await renderPage(sl.page);
    const sx = Math.max(0, Math.floor((col.x0 - 2) * scale));
    const sxEnd = Math.min(canvas.width, Math.ceil((col.x1 + 2) * scale));
    const sw = Math.max(1, sxEnd - sx);
    // PDF y (base = 0, topo = height) → canvas y (topo = 0).
    const topCanvas = Math.max(0, Math.floor((pm.height - sl.top) * scale));
    const botCanvas = Math.min(canvas.height, Math.ceil((pm.height - sl.bottom) * scale));
    const sh = Math.max(1, botCanvas - topCanvas);
    if (sh < 6) continue;
    parts.push({ canvas, sx, sy: topCanvas, sw, sh });
  }
  if (parts.length === 0) throw new Error('sem conteúdo');
  const outW = Math.max(...parts.map(p => p.sw));
  const outH = parts.reduce((a, p) => a + p.sh, 0);
  const out = document.createElement('canvas');
  out.width = outW; out.height = outH;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  let y = 0;
  for (const p of parts) {
    ctx.drawImage(p.canvas, p.sx, p.sy, p.sw, p.sh, 0, y, p.sw, p.sh);
    y += p.sh;
  }
  return out.toDataURL('image/jpeg', 0.72);
}

// Coleta as linhas de texto pertencentes ao intervalo de um marcador até o próximo.
function collectRunLines(meta: PageMeta[], mk: Marker, next?: Marker): Line[] {
  const units = colUnits(meta);
  const ai = unitIndex(units, mk.page, Math.min(mk.col, meta[mk.page].cols.length - 1));
  const bi = next ? unitIndex(units, next.page, Math.min(next.col, meta[next.page].cols.length - 1)) : ai;
  const out: Line[] = [];
  const range = bi >= ai ? [ai, bi] : [ai, ai];
  for (let u = range[0]; u <= range[1]; u++) {
    const un = units[u];
    const linesInCol = meta[un.page].lines.filter(l => l.col === un.col).sort((a, b) => b.y - a.y);
    for (const l of linesInCol) {
      if (u === ai && l.y > mk.y + 2) continue;                 // antes do marcador
      if (next && u === bi && l.y <= next.y + 2) continue;      // após o próximo marcador
      out.push(l);
    }
  }
  return out;
}

function cleanText(t: string): string {
  return t
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^ENEM20\d{2}/i.test(l) && !/^\*[0-9A-Z]+\*$/.test(l) && !/VESTIBULAR\s*\//i.test(l))
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
