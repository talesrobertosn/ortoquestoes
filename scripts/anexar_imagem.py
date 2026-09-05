#!/usr/bin/env python3
"""
Anexa à mão uma imagem a uma questão do acervo.

Serve para as figuras que faltam no PDF de origem — questões que citam uma
imagem cujo espaço veio em branco no arquivo. A imagem entra marcada como
`"manual": true` e, por causa dessa marca, sobrevive a qualquer reimportação
do PDF.

    python3 scripts/anexar_imagem.py pediatria-0006 ~/prints/q6.png \\
        --legenda "Fonte: Tachdjian, 6. ed., p. 412"

    python3 scripts/anexar_imagem.py --listar-faltantes pediatria
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_IMAGENS, DIR_TEMAS, gravar_json, ler_json  # noqa: E402

PADRAO_CITA_FIGURA = re.compile(
    r"\b(figura|figuras|imagem|imagens|radiografi\w*|tomografi\w*|resson\w*|foto\w*|"
    r"esquema|gr[áa]fico|abaixo\s+(?:ilustra|demonstra|apresenta))\b",
    re.IGNORECASE,
)
EXTENSOES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def caminho_do_tema(slug: str) -> Path:
    return DIR_TEMAS / f"{slug}.json"


def listar_faltantes(slug: str) -> int:
    dados = ler_json(caminho_do_tema(slug), None)
    if dados is None:
        print(f"Tema '{slug}' não existe no acervo.", file=sys.stderr)
        return 2
    faltantes = [
        q
        for q in dados["questoes"]
        if PADRAO_CITA_FIGURA.search(q["enunciado"]) and not q["imagens"]
    ]
    print(f"{len(faltantes)} questão(ões) citam figura e estão sem imagem:\n")
    for questao in faltantes:
        origem = questao.get("origem", {})
        print(f"{questao['id']}  (nº {origem.get('numeroOriginal')} de "
              f"{origem.get('arquivo')}, página {origem.get('pagina')})")
        print(f"    {questao['enunciado'][:150]}")
        print()
    if faltantes:
        print("Para anexar:")
        print(f"  python3 scripts/anexar_imagem.py {faltantes[0]['id']} caminho/da/imagem.png")
    return 0


def anexar(identificador: str, arquivo: Path, legenda: str | None) -> int:
    if not arquivo.exists():
        print(f"Imagem não encontrada: {arquivo}", file=sys.stderr)
        return 2
    if arquivo.suffix.lower() not in EXTENSOES:
        print(
            f"Extensão {arquivo.suffix} não suportada. Use uma de: "
            + ", ".join(sorted(EXTENSOES)),
            file=sys.stderr,
        )
        return 2

    slug = identificador.rsplit("-", 1)[0]
    caminho = caminho_do_tema(slug)
    dados = ler_json(caminho, None)
    if dados is None:
        print(f"Tema '{slug}' não existe no acervo.", file=sys.stderr)
        return 2

    questao = next((q for q in dados["questoes"] if q["id"] == identificador), None)
    if questao is None:
        print(f"Questão '{identificador}' não existe em {caminho.name}.", file=sys.stderr)
        return 2

    indice = len([i for i in questao["imagens"] if i.get("manual")]) + 1
    nome = f"{identificador}-m{indice}{arquivo.suffix.lower()}"
    destino = DIR_IMAGENS / slug / nome
    destino.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(arquivo, destino)

    largura = altura = None
    try:
        import pymupdf

        pixmap = pymupdf.Pixmap(str(destino))
        largura, altura = pixmap.width, pixmap.height
    except Exception:
        pass

    questao["imagens"].append(
        {
            "arquivo": f"{slug}/{nome}",
            "legenda": legenda,
            "largura": largura,
            "altura": altura,
            "manual": True,
        }
    )
    questao["figuraPendente"] = False
    gravar_json(caminho, dados)
    print(f"Imagem anexada a {identificador}: public/imagens/{slug}/{nome}")
    print("Rode agora:  python3 scripts/gerar_indice.py && python3 scripts/validar_acervo.py")
    return 0


def principal() -> int:
    analisador = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    analisador.add_argument("id", nargs="?", help="identificador da questão, ex.: pediatria-0006")
    analisador.add_argument("imagem", nargs="?", type=Path)
    analisador.add_argument("--legenda", default=None)
    analisador.add_argument(
        "--listar-faltantes", metavar="TEMA",
        help="lista as questões que citam figura e estão sem imagem",
    )
    argumentos = analisador.parse_args()

    if argumentos.listar_faltantes:
        return listar_faltantes(argumentos.listar_faltantes)
    if not argumentos.id or not argumentos.imagem:
        analisador.print_help()
        return 2
    return anexar(argumentos.id, argumentos.imagem, argumentos.legenda)


if __name__ == "__main__":
    raise SystemExit(principal())
