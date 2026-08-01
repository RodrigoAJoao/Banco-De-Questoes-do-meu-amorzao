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

## Observação sobre deploy

A resposta pode passar de 10 MB (imagens de ~90 questões), acima do limite de
resposta de funções serverless da Vercel (4,5 MB). Por isso é um servidor
standalone (rode localmente ao importar, ou hospede em Render/Railway/Fly/etc.).
