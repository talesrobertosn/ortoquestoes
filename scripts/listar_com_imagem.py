#!/usr/bin/env python3
"""Lista as questões com imagem que ainda não têm comentário.

Comentar questão ilustrada exige abrir a figura antes de escrever — é isso que
impede o comentário de descrever o que o gabarito sugere em vez do que está no
desenho. Como esse trabalho é mais caro, ele foi separado do resto e ficou para
depois; este script mantém a lista do que sobrou, por tema, para que a retomada
não dependa de recontar tudo na mão.

Uso:
    python3 scripts/listar_com_imagem.py            # grava o relatório
    python3 scripts/listar_com_imagem.py --resumo   # só imprime a contagem
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_ACERVO, DIR_TEMAS, carregar_taxonomia, ler_json  # noqa: E402

DIR_COMENTARIOS = DIR_ACERVO / "comentarios"
SAIDA = Path(__file__).resolve().parent.parent / "relatorios" / "questoes-com-imagem.md"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--resumo", action="store_true", help="não grava o arquivo")
    args = ap.parse_args()

    taxonomia = carregar_taxonomia()
    nomes = {t["slug"]: t["nome"] for t in taxonomia["temas"]}

    linhas: list[str] = []
    total_pendente = total_com_imagem = 0

    for tema in taxonomia["temas"]:
        slug = tema["slug"]
        caminho = DIR_TEMAS / f"{slug}.json"
        if not caminho.exists():
            continue
        questoes = (ler_json(caminho, {"questoes": []}) or {}).get("questoes", [])
        comentados = set(ler_json(DIR_COMENTARIOS / f"{slug}.json", {}) or {})

        com_imagem = [q for q in questoes if q.get("imagens")]
        # Anulada não recebe comentário por decisão do próprio pipeline, e
        # questão sem gabarito não tem o que explicar como correta.
        pendentes = [
            q
            for q in com_imagem
            if q["id"] not in comentados
            and not q.get("anulada")
            and q.get("gabarito")
        ]
        if not com_imagem:
            continue

        total_com_imagem += len(com_imagem)
        total_pendente += len(pendentes)

        figuras = sum(len(q.get("imagens") or []) for q in pendentes)
        linhas.append(
            f"### {nomes.get(slug, slug)} — {len(pendentes)} pendentes "
            f"de {len(com_imagem)} com imagem ({figuras} figuras para abrir)\n"
        )
        if pendentes:
            ids = ", ".join(f"`{q['id']}`" for q in pendentes)
            linhas.append(ids + "\n")
        else:
            linhas.append("Nenhuma pendente.\n")

    cabecalho = f"""# Questões com imagem à espera de comentário

Gerado por `scripts/listar_com_imagem.py`. Rode de novo depois de cada lote
para ver o que sobrou.

**{total_pendente} questões pendentes**, de um total de {total_com_imagem} com
imagem no acervo.

Comentar uma questão ilustrada custa mais do que comentar as demais: cada
figura precisa ser aberta e lida antes de a explicação ser escrita, porque é
isso que impede o comentário de descrever o que o gabarito sugere em vez do que
está no desenho. Foi por isso que elas ficaram separadas. Questões anuladas e
sem gabarito não entram nesta lista — o pipeline não as comenta.

## Como retomar

1. Escolher um tema abaixo e um bloco de dez a vinte ids.
2. Abrir cada figura em `public/imagens/<tema>/` — o nome do arquivo vem do
   campo `imagens[].arquivo` da questão, e **não** do id: uma questão pode ter
   sido renumerada e o arquivo guarda o número original do PDF.
3. Escrever o lote e aplicar com `python3 scripts/aplicar_comentarios.py lote.json`,
   que recusa o lote inteiro se qualquer conferência falhar.
4. Rodar `python3 scripts/gerar_indice.py` e `npm run build`.

"""

    texto = cabecalho + "\n".join(linhas)

    if args.resumo:
        print(f"{total_pendente} pendentes de {total_com_imagem} com imagem")
        for linha in linhas:
            if linha.startswith("### "):
                print("  " + linha[4:].strip())
        return 0

    SAIDA.write_text(texto, encoding="utf-8")
    print(f"{SAIDA.relative_to(SAIDA.parent.parent)}: {total_pendente} pendentes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
