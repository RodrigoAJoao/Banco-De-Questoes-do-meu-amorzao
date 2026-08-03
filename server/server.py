"""
Servidor local de extração de provas (PyMuPDF).

Uso:
    pip install -r server/requirements.txt
    python server/server.py           # sobe em http://localhost:8000

O app (aba "Importar Prova") tenta este servidor primeiro; se não estiver no ar,
usa o extrator client-side (pdfjs) automaticamente.
"""
import io
from flask import Flask, request, jsonify
from flask_cors import CORS

from extract import extract_exam

app = Flask(__name__)
CORS(app)  # permite o front (localhost:3000 / Vercel) chamar este servidor


@app.get("/health")
def health():
    return jsonify(ok=True)


@app.post("/extract")
def extract():
    data = None
    f = request.files.get("file")
    if f is not None:
        data = f.read()
    elif request.data:
        data = request.data  # corpo bruto (application/pdf)
    if not data:
        return jsonify(error="Nenhum PDF enviado."), 400
    # Em tablet/celular manda imagens BEM mais leves: uma prova inteira são ~90
    # imagens; sem isso a resposta passa de 25 MB e o navegador do tablet não dá
    # conta (só parte das questões aparece). Menor largura + JPEG mais comprimido
    # derrubam o tamanho (o texto continua legível; dá p/ ampliar no app).
    mobile = request.args.get("mobile") in ("1", "true", "yes")
    try:
        if mobile:
            result = extract_exam(io.BytesIO(data).getvalue(),
                                  render_scale=1.6, img_max_width=720, img_quality=60)
        else:
            result = extract_exam(io.BytesIO(data).getvalue(),
                                  render_scale=2.1, img_max_width=1000, img_quality=76)
        return jsonify(result)
    except Exception as e:  # noqa
        import traceback
        traceback.print_exc()
        return jsonify(error=f"Falha ao extrair: {e}"), 500


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", "8000"))
    print(f"Extrator de provas (PyMuPDF) em http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
