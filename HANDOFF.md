# HANDOFF — Estado do projeto e retomada

> Documento de continuidade. Leia isto primeiro ao retomar (após `/compact`).
> **Onde paramos:** o extrator de PDF (server-side PyMuPDF) funciona bem nos
> PDFs que testamos (ENEM 2025 Dia 1), mas **falha/imprecisa em OUTROS PDFs do
> ENEM** (outros anos/dias/cadernos). **Próxima tarefa: melhorar a precisão do
> extrator para generalizar a todos os PDFs.** Detalhes na seção "PRÓXIMA ETAPA".

---

## 1. O que é o app

Aplicativo pessoal de estudo para ENEM/vestibular: cadastrar questões que a
pessoa errou, classificá-las (matéria, tags, motivo do erro), refazê-las em quiz
e acompanhar o desempenho. 100% client-side (React + IndexedDB), sem backend
para os dados. Uso principal: **tablet Android, app hospedado no Vercel**.

- **Stack:** React 19 + TypeScript + Vite 6 + Tailwind v4 + motion + lucide-react
  + recharts. PWA (vite-plugin-pwa). Dados em **IndexedDB** (`src/storage.ts`).
- **Idioma da UI e dos commits:** português.
- **Dono/usuário:** Rodrigo/Chris. Deploy: front no **Vercel**; branch `main`.

## 2. Arquitetura / arquivos-chave

- `src/App.tsx` — estado central (questões, tentativas, perfil), roteamento por
  `View`, todos os handlers. É o hub.
- `src/types.ts` — modelos. `Question` tem: id, text, imageUrl?, answer, subject,
  tags[], createdAt, lastResult?, reviewCount?, resolution?, resolutionImageUrls?,
  resolutionImageUrl?(legado), errorReason?, **source?** (marca questões importadas).
  Também `ErrorReason`, `ERROR_REASONS`, `SUBJECTS`, `ANSWERS`, `normalizeTag()`.
- `src/storage.ts` — CRUD IndexedDB (stores: questions, attempts, settings).
- Componentes (`src/components/`): Home, AddQuestion (classificar), TakeQuiz
  (fazer questões / filtros), QuizSession (revisão), QuizResults, QuestionBank
  (banco), Performance, EditProfile, ImportProva (importar prova),
  TagAutocomplete, MultiSelectFilter, ErrorReasonSelector, ErrorBoundary, etc.
- `src/pdfImport.ts` — **extrator CLIENTE (pdfjs)**, roda no navegador (fallback).
- `src/pdfImportServer.ts` — cliente do **extrator SERVIDOR** (chama o Python).
- `server/` — **extrator SERVIDOR (PyMuPDF/Flask)**: `extract.py` (lógica),
  `server.py` (Flask), `requirements.txt`, `Dockerfile`, `README.md`.
- `render.yaml` — deploy do servidor no Render.

## 3. Funcionalidades já entregues (todas commitadas em `main`)

Ordem cronológica (ver `git log`):
1. **Aba Classificar** (AddQuestion): autocomplete de tags (case-insensitive via
   `normalizeTag`), criar tag nova, **motivo do erro** (desatenção/lacuna/dúvida/
   interpretação), **múltiplas imagens** na resolução, botão remover imagem da questão.
2. **Aba Fazer Questões** (TakeQuiz): filtro **multi-matéria** e **multi-tag**
   (MultiSelectFilter, tags limitadas às matérias selecionadas), **sorteio por
   desempenho** (quantas erradas/certas/novas, com atalho "Somente erradas").
3. **Revisão** (QuizSession): ao errar, classificar **motivo do erro**; e
   **adicionar resolução** a questões que não tinham (texto + imagens).
4. **Banco de Questões** (QuestionBank): filtros por **matéria, motivo do erro,
   tag, origem** (Criadas por mim / Importadas / por prova); badges.
5. **Importar Prova (PDF)** (ImportProva) — a feature central desta fase (ver §4).
   Tags gerais + **tags individuais por questão**; matéria e gabarito por questão;
   questões importadas ficam marcadas por `source` (separadas no banco).

## 4. Importar Prova (PDF) — como funciona HOJE

Dois extratores; a UI tenta o servidor e cai no cliente:

### 4a. Servidor (PyMuPDF) — `server/extract.py` — MELHOR, é o foco
Fluxo de `extract_exam(pdf_bytes, render_scale)`:
1. Para cada página, `page.get_text("dict")` → blocos de texto (type 0);
   concatena spans; **filtra ruído** (`_is_noise`: cabeçalho/rodapé por faixa de
   y, marca d'água `ENEM20..`, código de barras `*..*`, rodapé de seção, número
   de página). Coleta imagens embutidas via `get_images` + `get_image_rects`.
2. `exam_type` por regex no texto (ENEM/UFRGS).
3. **Calha central global** (`_global_gutter`): x com menos blocos "estreitos"
   (< 0.55·W) cruzando, na faixa central. Usada p/ detectar colunas.
4. Por página: `two_cols` se há blocos estreitos suficientes dos dois lados;
   atribui **coluna a cada bloco** (⚠️ ATENÇÃO: NÃO usar closure de loop aqui —
   já teve bug de late-binding que misturou colunas; a coluna é armazenada por
   bloco). `ordered` = blocos ordenados por (coluna, y0). Detecta seção.
5. `flat` = todos os blocos em ordem de leitura (página, coluna, y).
6. **Marcadores** = blocos que casam `QUESTAO_RE = ^\s*quest[ãa]o\s*(\d{1,3})`.
7. Por questão (entre marcadores):
   - `same` = blocos da PÁGINA do marcador com `y0 >= markerY-10` (descarta
     restos da questão anterior que caíram acima, na outra coluna).
   - `complete` = as alternativas (letras A, D, E via `_option_letters` das
     linhas do bloco) aparecem em `same` → a questão termina nesta página; senão,
     inclui a página seguinte (`mpage+1`).
   - Por página usada: **bbox unificado** (min/max dos blocos) + **expande p/
     incluir imagens** que se sobrepõem verticalmente (captura mapas/figuras
     largos por inteiro). `get_pixmap(clip=...)` renderiza → PIL → empilha →
     JPEG base64 (data URL).
8. Retorna `{examType, suggestedSource, questions:[{number,label,section,text,image}]}`.
- `server.py`: Flask, `POST /extract` (multipart `file` ou corpo bruto), `?mobile=1`
  usa escala menor. `GET /health`. Usa `$PORT`. CORS liberado.

**Testado e PERFEITO** em `2025_PV_impresso_D1_CD3.pdf`: 95 questões; Q10 (coluna
simples), Q40 (caixa "juridiquês" de largura total, que o pdfjs quebrava
totalmente) e Q52 (mapa África+Brasil largo, que o pdfjs cortava) saíram completos.

### 4b. Cliente (pdfjs) — `src/pdfImport.ts` — FALLBACK, qualidade menor
Reconstrói linhas com bbox (altura dos glifos), calha global, colunas, marcadores
`QUESTÃO NN` (normaliza espaços: no 2025 vem "Q UEST ã O"), bbox por linha do
marcador até a última, `convertToViewportPoint` p/ mapear PDF→canvas (corrige
offset de MediaBox), recorte em largura total só quando há figura E a coluna
vizinha está vazia em toda a altura da questão. **Limitações conhecidas:** as
letras das alternativas às vezes são gráficos vetoriais (não vêm no texto) → não
dá p/ cortar na alternativa E; questões longas com texto-base antes do próximo
marcador vazam; figuras largas em 2 colunas cortam. Por isso o servidor é melhor.

### 4c. Integração cliente↔servidor (tablet/Vercel) — `src/pdfImportServer.ts`
- `shouldTryServer()`: só tenta o servidor se `VITE_EXTRACT_API` aponta p/ host
  real (não bloqueia por mixed-content) OU o app roda em localhost (dev).
- `isServerConfigured()`: env var setada (produção). Nesse caso vai **direto** ao
  `extractViaServer` (sem health-check), pra **acordar cold start** do Render.
- `extractViaServer` manda `?mobile=1` no mobile (payload menor).
- Falhou o servidor → cai no `extractExam` (cliente). Selo mostra qual foi usado.

## 5. Deploy (para o PyMuPDF funcionar no tablet)

- **Front:** Vercel (é o que o usuário abre).
- **Servidor:** hospedar `server/` num host HTTPS (Render free via `render.yaml`).
  Depois **setar `VITE_EXTRACT_API=https://<host>/extract` nas envs do Vercel** e
  refazer o deploy do front. Passo a passo em `server/README.md`.
- Não usar Vercel serverless: resposta com ~90 imagens passa de 10 MB (> limite
  4,5 MB da Vercel).
- Rodar local: `pip install -r server/requirements.txt && python server/server.py`
  (porta 8000). Pré-requisito Python (testado com 3.13; deploy usa 3.12-slim).

## 6. PRÓXIMA ETAPA (onde paramos) — MELHORAR A PRECISÃO DO EXTRATOR

**Problema relatado:** ao importar OUTROS PDFs do ENEM (fora do 2025 Dia 1 que
testamos), a extração fica imprecisa/errada. Precisamos generalizar.

### PDFs de teste (do zip do usuário)
Origem: `C:\Users\rodri\OneDrive\Desktop\Nova pasta.zip`. Contém:
- ENEM: `2024_PV_impresso_D1_CD1.pdf`, `2024_PV_impresso_D2_CD5.pdf`,
  `2025_PV_impresso_D1_CD3.pdf` (o testado), `2025_PV_impresso_D2_CD8.pdf`.
- UFRGS: `PROVA-1-DIA-COM-CAPA.pdf`, `Prova-1o-DIA.pdf`,
  `PROVA-2o-DIA-INGLES-COM-CAPA.pdf`, `PROVA-INGLES.pdf`.
(Só o 2025 D1 foi validado a fundo no servidor.)

### Como iterar/debugar (fluxo que funcionou)
O extrator do servidor roda e salva imagens de amostra direto:
```bash
# extrai e salva pm_Q10/Q40/Q52/Q91.jpg num diretório
python server/extract.py "<caminho do pdf>" "<diretorio de saida>"
```
Rodar por PDF, abrir as imagens e comparar com o PDF real. Útil imprimir a run de
uma questão (há um bloco de DEBUG por env `DBG=40` já removido — recriar se
preciso). NÃO confiar só no client harness (pdfjs) — o servidor é o alvo.

### Hipóteses do que quebra em outros PDFs (investigar)
1. **Detecção de marcador**: `QUESTAO_RE` casa no texto do bloco. Em anos/cadernos
   diferentes o "QUESTÃO" pode vir com espaçamento/versalete ("Q UEST ã O"),
   quebrado entre spans, ou o bloco começar com outra coisa. Normalizar mais
   (remover espaços, maiúsculas) e/ou casar no início de qualquer linha do bloco.
   ➜ Validar quantos marcadores cada PDF detecta (esperado: D1≈95 c/ dup 1-5 de
   língua estrangeira; D2≈90). Se vier bem menos, o regex/normalização falhou.
2. **Colunas / calha global**: thresholds de `_global_gutter` e `two_cols` podem
   não generalizar (margens diferentes por caderno). Verificar por página.
3. **`complete` por alternativa A/D/E**: se as letras não vierem como texto (ex.:
   gráfico vetorial em certos cadernos), `complete` fica falso → a questão
   "vaza" pra próxima página. Precisa fallback (gap de whitespace grande, ou
   parar no próximo marcador com filtro de y).
4. **Filtro de ruído** (`_is_noise`): a marca d'água/rodapé mudam por prova
   (cores do caderno já cobertas; conferir textos novos). Números de página.
5. **Seção/matéria**: mapear Dia 2 (Ciências da Natureza → Bio/Quím/Física;
   Matemática). Hoje Natureza cai em "Biologia" por padrão.
6. **Redação**: garantir que a proposta de redação (Dia 1) não vira "questão".
7. **UFRGS**: formato diferente (marcadores "NN." colidem com numeração de linha
   do texto; alterna 1/2 colunas). Provavelmente precisa de detecção própria.

### Sugestão de plano
- Rodar `server/extract.py` em TODOS os PDFs do zip, tabular nº de questões
  detectadas vs esperado, e abrir amostras (primeira/meio/última de cada seção).
- Corrigir por ordem de impacto: (1) marcadores, (2) `complete`/vazamento,
  (3) colunas, (4) ruído/seção, (5) UFRGS.
- Sempre re-testar o 2025 D1 pra não regredir (Q10/Q40/Q52).

## 7. Pegadinhas do ambiente (importante)
- **Windows nativo:** o `node_modules` foi instalado p/ Linux; build/dev local
  quebra até instalar os binários win32-msvc numa ÚNICA chamada:
  `npm install lightningcss-win32-x64-msvc @tailwindcss/oxide-win32-x64-msvc @rollup/rollup-win32-x64-msvc --no-save`
  (qualquer `npm install` posterior os remove de novo — bug de optional deps do npm).
- **Sem `@types/react`:** React resolve como `any`; `tsc --noEmit` passa mas é
  frouxo. Não instalar @types/react sem necessidade (geraria cascata de erros).
- **Verificação visual no preview:** o painel do navegador às vezes NÃO exibe →
  screenshots falham e a renderização de canvas (pdfjs) trava. Nesse caso, validar
  o servidor via Node/Python (imagens salvas) e o app via read_page/network.
- **Scripts de teste temporários** (`_render.mjs`, `_slices.mjs`, etc.) e
  `@napi-rs/canvas` foram usados só p/ validar o extrator do CLIENTE em Node;
  não fazem parte do app. Podem ser recriados quando precisar.
- Comandos: `npm run dev` (porta 3000), `npm run build`, `npx tsc --noEmit`.

## 8. Memórias persistentes (já salvas)
`~/.claude/projects/.../memory/`: `windows-native-binaries.md`,
`pdf-import-extractors.md` (índice em `MEMORY.md`).

---
_Última atualização: fim da fase "deploy do extrator p/ tablet". Todo o código
está commitado em `main` (último commit: `a8eb0ab`). Falta `git push` se desejado._
