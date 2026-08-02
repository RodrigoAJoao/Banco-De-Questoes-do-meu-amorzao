# Extrator de provas (server-side, PyMuPDF)

Servidor opcional que extrai questões de PDFs de prova (ENEM/UFRGS) com
**PyMuPDF (fitz)**, gerando texto + imagens de alta qualidade. É bem melhor que
o extrator do navegador (pdfjs) nos casos difíceis:

- caixas de texto e **alternativas (A–E)** confiáveis → limites precisos por
  questão (não vaza a questão anterior/seguinte);
- **figuras/mapas embutidos** capturados por inteiro, mesmo os mais largos que a
  coluna (que o recorte por coluna cortava).

A aba **Importar Prova** do app tenta este servidor primeiro; se ele não estiver
no ar, cai automaticamente no extrator do navegador.

## Como rodar

```bash
pip install -r server/requirements.txt
python server/server.py
```

Sobe em `http://localhost:8000`. Deixe rodando enquanto importa PDFs no app.

## Configuração (opcional)

O app usa `http://localhost:8000/extract` por padrão. Para apontar para outro
host, defina a variável de ambiente do Vite ao buildar/rodar o front:

```
VITE_EXTRACT_API=https://seu-servidor/extract
```

## Usar no TABLET / celular (app no Vercel)

No tablet, `localhost` seria o próprio tablet — então o servidor precisa estar
**hospedado num host público com HTTPS**. Passo a passo (Render, grátis):

1. Suba este repositório no GitHub (já feito se você faz deploy pelo Vercel).
2. Em [render.com](https://render.com) → **New → Blueprint** → selecione este
   repositório. O `render.yaml` já configura o serviço (Docker em `server/`).
   Ao terminar, o Render dá uma URL HTTPS, ex.: `https://extrator-provas.onrender.com`.
3. No **Vercel** (projeto do front) → Settings → Environment Variables, adicione:
   ```
   VITE_EXTRACT_API = https://extrator-provas.onrender.com/extract
   ```
   e faça um **novo deploy** do front (a env entra no build do Vite).
4. Pronto: no tablet, a aba Importar Prova usará o servidor PyMuPDF (selo
   "✓ servidor"). A 1ª importação pode levar ~1 min (o plano free do Render
   "acorda" o servidor); o app espera e acorda automaticamente.

Alternativas de host equivalentes: Railway, Fly.io, Google Cloud Run, Hugging
Face Spaces (todos com Docker/HTTPS).

> Não dá para usar função serverless da Vercel: a resposta com ~90 imagens passa
> de 10 MB, acima do limite de 4,5 MB da Vercel. Por isso é um servidor à parte.

## Por que não o extrator do navegador (pdfjs)?

Ele funciona offline, mas erra em caixas de largura total e figuras largas. Só é
usado como fallback quando o servidor não está configurado/disponível.
