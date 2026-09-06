#!/usr/bin/env python3
"""Renderiza de novo as figuras que ficaram pequenas demais para serem lidas.

Alguns PDFs trazem a figura embutida numa resolução baixíssima — há casos com
99 pixels de largura. Extraí-la fielmente entrega ao leitor um borrão em que
as setas e as legendas somem, e uma questão de imagem sem imagem legível é uma
questão que não dá para responder.

A saída é renderizar a área da página em alta resolução. Não se inventa
detalhe que não existe no arquivo, mas se entrega a mesma imagem que a pessoa
veria ampliando o PDF, em vez de um borrão.

Este script faz isso no acervo já importado, sem reimportar PDF nenhum.
importar_pdf.py passou a fazer o mesmo na importação.

Uso:
    python3 scripts/reextrair_figuras.py --seco
    python3 scripts/reextrair_figuras.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_IMAGENS, DIR_TEMAS, RAIZ  # noqa: E402

DIR_PDFS = RAIZ / "pdfs"
AREA_MINIMA = 40_000  # cerca de 200 x 200
DPI = 300
# Renderizar não cria detalhe que o arquivo não tem: passar de um certo tamanho
# só produz um borrão maior e um arquivo mais pesado para quem abre no celular.
LADO_MAXIMO = 1200


def dpi_para(retangulo) -> float:
    """DPI que respeita o teto de tamanho, sem passar do padrão."""
    maior_lado_pt = max(retangulo.width, retangulo.height) or 1
    return min(DPI, 72 * LADO_MAXIMO / maior_lado_pt)


def achar_retangulo(pagina, largura: int, altura: int):
    """Onde, na página, está desenhada a imagem com estas dimensões embutidas.

    Só serve se houver exatamente uma candidata: com duas, não há como saber
    qual das duas é a da questão, e chutar trocaria uma figura por outra.
    """
    candidatas = []
    for informacao in pagina.get_images(full=True):
        xref = informacao[0]
        if informacao[2] == largura and informacao[3] == altura:
            candidatas.extend(pagina.get_image_rects(xref))
    return candidatas[0] if len(candidatas) == 1 else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--seco", action="store_true", help="mostra e não grava")
    ap.add_argument("--area-minima", type=int, default=AREA_MINIMA)
    args = ap.parse_args()

    trocadas = falhas = 0
    documentos: dict[str, pymupdf.Document] = {}

    for caminho_tema in sorted(DIR_TEMAS.glob("*.json")):
        dados = json.loads(caminho_tema.read_text(encoding="utf-8"))
        mudou = False
        for questao in dados["questoes"]:
            for imagem in questao.get("imagens") or []:
                if imagem.get("manual"):
                    continue
                # O critério é a área e não o lado menor: um esquema largo e
                # baixo se lê bem, um quadradinho de 99 por 117 não se lê.
                area = (imagem.get("largura") or 0) * (imagem.get("altura") or 0)
                if area == 0 or area >= args.area_minima:
                    continue

                origem = questao.get("origem") or {}
                nome_pdf, pagina_numero = origem.get("arquivo"), origem.get("pagina")
                caminho_pdf = DIR_PDFS / (nome_pdf or "")
                if not nome_pdf or not pagina_numero or not caminho_pdf.exists():
                    print(f"  {questao['id']}: PDF de origem indisponível ({nome_pdf})")
                    falhas += 1
                    continue

                if nome_pdf not in documentos:
                    documentos[nome_pdf] = pymupdf.open(caminho_pdf)
                pagina = documentos[nome_pdf][pagina_numero - 1]
                retangulo = achar_retangulo(pagina, imagem["largura"], imagem["altura"])
                if retangulo is None:
                    print(f"  {questao['id']}: não localizei a figura na página {pagina_numero}")
                    falhas += 1
                    continue

                destino = DIR_IMAGENS / imagem["arquivo"]
                novo = destino.with_suffix(".png")
                dpi = dpi_para(retangulo)
                matriz = pymupdf.Matrix(dpi / 72, dpi / 72)
                pixmap = pagina.get_pixmap(matrix=matriz, clip=retangulo)
                print(
                    f"  {questao['id']}: {imagem['largura']}x{imagem['altura']}"
                    f" → {pixmap.width}x{pixmap.height}"
                )
                trocadas += 1
                if args.seco:
                    continue
                novo.parent.mkdir(parents=True, exist_ok=True)
                pixmap.save(novo)
                if destino.exists() and destino != novo:
                    destino.unlink()
                imagem["arquivo"] = str(Path(imagem["arquivo"]).with_suffix(".png"))
                imagem["largura"], imagem["altura"] = pixmap.width, pixmap.height
                mudou = True

        if mudou and not args.seco:
            caminho_tema.write_text(
                json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
            )

    print(f"\n{trocadas} figura(s) renderizada(s) de novo, {falhas} sem solução.")
    if args.seco:
        print("Ensaio: nada foi gravado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
