"""
Extrator de provas (ENEM/UFRGS) em PDF usando PyMuPDF (fitz).

Vantagens sobre a extração client-side (pdfjs):
- caixas de blocos/linhas confiáveis e as LETRAS das alternativas (A..E),
  permitindo saber com precisão onde a questão termina;
- extração das figuras embutidas (mapas/gráficos), inclusive as mais largas
  que a coluna, que o recorte por coluna cortaria.

Estratégia de recorte por questão:
- marca a questão pelo "QUESTÃO NN";
- descarta blocos ACIMA do marcador (restos da questão anterior na outra coluna);
- se as alternativas (com a E) aparecem na página do marcador, a questão termina
  ali; senão, inclui a página seguinte;
- caixa unificada por página (respeita caixas de largura total) + figuras embutidas;
- renderiza cada página da questão e empilha.

Saída: {examType, suggestedSource, questions: [{number,label,section,text,image}]}
"""
import re, io, base64
import fitz  # PyMuPDF
from PIL import Image

QUESTAO_RE = re.compile(r"^\s*quest[ãa]o\s*(\d{1,3})\b", re.IGNORECASE)
OPT_LINE_RE = re.compile(r"^\s*\(?([A-E])[\).\t ]")

SECTION_PATTERNS = [
    (re.compile(r"LINGUAGENS", re.I), "Linguagens"),
    (re.compile(r"CI[EÊ]NCIAS\s+HUMANAS", re.I), "Humanas"),
    (re.compile(r"CI[EÊ]NCIAS\s+DA\s+NATUREZA", re.I), "Biologia"),
    (re.compile(r"MATEM[AÁ]TICA", re.I), "Matemática"),
]


def _norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def _is_noise(text, bbox, page_h):
    cy = (bbox[1] + bbox[3]) / 2
    if cy < page_h * 0.055 or cy > page_h * 0.95:
        return True
    t = text.strip()
    if not t:
        return True
    if re.match(r"^\*[0-9A-Z]+\*", t):
        return True
    if re.match(r"^ENEM\s?20\d{2}", t, re.I):
        return True
    if re.search(r"TECNOLOGIAS.*(DIA|CADERNO|AZUL|ROSA|AMAREL|BRANC|CINZA|VERDE)", t, re.I):
        return True
    if re.match(r"^\d{1,3}(\s+\d{1,3})*$", t) and (cy < page_h * 0.11 or cy > page_h * 0.9):
        return True
    return False


def _option_letters(block):
    """Letras de alternativa (A..E) que aparecem no início das linhas do bloco."""
    letters = set()
    for line in block.get("lines", []):
        t = "".join(s["text"] for s in line.get("spans", []))
        m = OPT_LINE_RE.match(t)
        if m:
            letters.add(m.group(1).upper())
    return letters


def _global_gutter(pages, width):
    lo, hi = width * 0.44, width * 0.58
    best_x, best = width * 0.5, 1e9
    gx = lo
    while gx <= hi:
        cross = 0
        for p in pages:
            for b in p["blocks"]:
                if (b["x1"] - b["x0"]) < width * 0.55 and b["x0"] <= gx <= b["x1"]:
                    cross += 1
        if cross < best:
            best, best_x = cross, gx
        gx += 2
    return best_x


def extract_exam(pdf_bytes, render_scale=2.2):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    W = doc[0].rect.width

    pages = []
    full_text = ""
    for page in doc:
        h = page.rect.height
        raw = page.get_text("dict")
        blocks = []
        for b in raw["blocks"]:
            if b.get("type", 0) != 0:
                continue
            text = "".join(s["text"] for line in b.get("lines", []) for s in line.get("spans", []))
            text = text.replace("\t", " ")
            bb = b["bbox"]
            if _is_noise(text, bb, h):
                continue
            blocks.append({
                "x0": bb[0], "y0": bb[1], "x1": bb[2], "y1": bb[3],
                "text": _norm(text), "opts": _option_letters(b),
            })
        images = []
        for img in page.get_images(full=True):
            for r in page.get_image_rects(img[0]):
                if r.width > 20 and r.height > 20 and not (r.width > W * 0.9 and r.height > h * 0.9):
                    images.append((r.x0, r.y0, r.x1, r.y1))
        pages.append({"h": h, "blocks": blocks, "images": images, "section": None})
        full_text += " " + " ".join(b["text"] for b in blocks)

    exam_type = "ENEM" if re.search(r"ENEM\s?20\d{2}", full_text, re.I) else (
        "UFRGS" if re.search(r"UFRGS", full_text, re.I) else "Desconhecido")

    gutter = _global_gutter(pages, W)

    # Coluna por bloco + seção por página.
    for p in pages:
        narrow = [b for b in p["blocks"] if (b["x1"] - b["x0"]) < W * 0.5]
        left = sum(1 for b in narrow if (b["x0"] + b["x1"]) / 2 < gutter)
        right = sum(1 for b in narrow if (b["x0"] + b["x1"]) / 2 >= gutter)
        two = len(narrow) >= 12 and left >= 4 and right >= 4
        for b in p["blocks"]:
            b["col"] = 0 if (not two or (b["x0"] + b["x1"]) / 2 < gutter) else 1
        p["ordered"] = sorted(p["blocks"], key=lambda b: (b["col"], b["y0"]))
        for b in p["blocks"]:
            for rx, sec in SECTION_PATTERNS:
                if rx.search(b["text"]):
                    p["section"] = sec
                    break

    cur = "Linguagens"
    for p in pages:
        if p["section"]:
            cur = p["section"]
        p["section"] = cur

    # Ordem de leitura global (página, coluna, y).
    flat = []
    for pi, p in enumerate(pages):
        for b in p["ordered"]:
            flat.append((pi, b))

    markers = [i for i, (_, b) in enumerate(flat) if QUESTAO_RE.match(b["text"])]

    questions = []
    for k, mi in enumerate(markers):
        mpage, mblock = flat[mi]
        num = int(QUESTAO_RE.match(mblock["text"]).group(1))
        end = markers[k + 1] if k + 1 < len(markers) else len(flat)
        run = flat[mi:end]

        # Blocos da página do marcador, na área do marcador para baixo.
        same = [b for (pp, b) in run if pp == mpage and b["y0"] >= mblock["y0"] - 10]
        letters = set()
        for b in same:
            letters |= b["opts"]
        complete = "A" in letters and "D" in letters and "E" in letters

        page_blocks = {mpage: same}
        if not complete:
            # inclui a página seguinte (a questão continua nela)
            nxt = [b for (pp, b) in run if pp == mpage + 1]
            if nxt:
                page_blocks[mpage + 1] = nxt

        parts = []
        for pi in sorted(page_blocks):
            bs = page_blocks[pi]
            if not bs:
                continue
            x0 = min(b["x0"] for b in bs); y0 = min(b["y0"] for b in bs)
            x1 = max(b["x1"] for b in bs); y1 = max(b["y1"] for b in bs)
            # inclui figuras que se sobrepõem à faixa vertical da questão
            for (ix0, iy0, ix1, iy1) in pages[pi]["images"]:
                if min(iy1, y1) - max(iy0, y0) > -8:  # sobreposição vertical
                    x0 = min(x0, ix0); x1 = max(x1, ix1)
                    y0 = min(y0, iy0); y1 = max(y1, iy1)
            ph = pages[pi]["h"]
            x0 = max(W * 0.02, x0 - 4); x1 = min(W * 0.985, x1 + 4)
            y0 = max(0, y0 - 4); y1 = min(ph, y1 + 4)
            pix = doc[pi].get_pixmap(matrix=fitz.Matrix(render_scale, render_scale),
                                     clip=fitz.Rect(x0, y0, x1, y1), alpha=False)
            parts.append(Image.open(io.BytesIO(pix.tobytes("png"))))

        img_b64 = _stack(parts)
        text = "\n".join(b["text"] for (pp, b) in run if pp in page_blocks and b in page_blocks[pp])
        questions.append({
            "number": num, "label": f"Questão {num}",
            "section": pages[mpage]["section"], "text": text[:4000], "image": img_b64,
        })

    doc.close()
    return {"examType": exam_type, "suggestedSource": _guess_source(full_text, exam_type),
            "questions": questions}


def _stack(parts):
    if not parts:
        return ""
    gap = 8
    w = max(im.width for im in parts)
    total = sum(im.height for im in parts) + gap * (len(parts) - 1)
    canvas = Image.new("RGB", (w, total), "white")
    y = 0
    for im in parts:
        canvas.paste(im, (0, y))
        y += im.height + gap
    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=82)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _guess_source(full_text, exam_type):
    year = ""
    m = re.search(r"ENEM\s?(20\d{2})|VESTIBULAR\s*/?\s*(20\d{2})", full_text, re.I)
    if m:
        year = m.group(1) or m.group(2) or ""
    day = ""
    if re.search(r"2\s*[º°]?\s*DIA", full_text, re.I):
        day = "Dia 2"
    elif re.search(r"1\s*[º°]?\s*DIA", full_text, re.I):
        day = "Dia 1"
    base = "Prova" if exam_type == "Desconhecido" else exam_type
    return " · ".join([x for x in [base, year, day] if x])


if __name__ == "__main__":
    import sys, os
    with open(sys.argv[1], "rb") as f:
        res = extract_exam(f.read())
    print("examType:", res["examType"], "| source:", res["suggestedSource"], "| questions:", len(res["questions"]))
    outdir = sys.argv[2] if len(sys.argv) > 2 else "."
    for target in [10, 40, 52, 91]:
        q = next((q for q in res["questions"] if q["number"] == target), None)
        if q and q["image"]:
            b = base64.b64decode(q["image"].split(",", 1)[1])
            with open(os.path.join(outdir, f"pm_Q{target}.jpg"), "wb") as fo:
                fo.write(b)
            print(f"  wrote pm_Q{target}.jpg")
