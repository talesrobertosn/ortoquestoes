#!/usr/bin/env python3
"""
Reconstrói public/acervo/indice.json a partir dos arquivos de tema.

O índice é o que a página inicial e a tela de filtros baixam: metadados de
todas as questões, sem enunciado e sem alternativas. É ele que permite contar
questões por filtro sem baixar o acervo inteiro.
"""

from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import (  # noqa: E402
    CAMINHO_INDICE,
    DIR_ACERVO,
    DIR_TEMAS,
    carregar_taxonomia,
    gravar_json,
    ler_json,
    normalizar,
)


def principal() -> int:
    taxonomia = carregar_taxonomia()
    ordem_temas = [t["slug"] for t in taxonomia["temas"]]
    nomes = {t["slug"]: t["nome"] for t in taxonomia["temas"]}

    arquivos = sorted(DIR_TEMAS.glob("*.json"))
    presentes = [a for a in arquivos if a.stem in ordem_temas]
    desconhecidos = [a.stem for a in arquivos if a.stem not in ordem_temas]

    temas: list[dict] = []
    subtemas: list[str] = []
    # Índice de busca por texto, num arquivo à parte: ele é grande e só faz
    # sentido baixar quando alguém realmente digita algo.
    busca: list[list[str]] = []
    provas: list[str] = []
    anos: list[int] = []
    questoes: list[dict] = []

    def indice_de(lista: list, valor):
        if valor not in lista:
            lista.append(valor)
        return lista.index(valor)

    for slug in ordem_temas:
        caminho = DIR_TEMAS / f"{slug}.json"
        if caminho not in presentes:
            continue
        dados = ler_json(caminho, {"questoes": []}) or {"questoes": []}
        lista = dados.get("questoes", [])
        indice_tema = len(temas)
        temas.append(
            {
                "slug": slug,
                "nome": dados.get("tema") or nomes[slug],
                "arquivo": f"temas/{slug}.json",
                "total": len(lista),
            }
        )
        for questao in lista:
            questoes.append(
                {
                    "id": questao["id"],
                    "t": indice_tema,
                    "s": [indice_de(subtemas, s) for s in questao.get("subtemas") or []],
                    "p": indice_de(provas, questao["prova"]) if questao.get("prova") else None,
                    "a": questao.get("ano"),
                    "d": questao.get("dificuldade"),
                    "img": 1 if questao.get("imagens") else 0,
                    "an": 1 if questao.get("anulada") else 0,
                    "c": 1 if questao.get("comentario") else 0,
                }
            )
            if questao.get("ano") and questao["ano"] not in anos:
                anos.append(questao["ano"])
            texto = " ".join(
                [questao.get("enunciado", "")]
                + [a.get("texto", "") for a in questao.get("alternativas") or []]
                + (questao.get("subtemas") or [])
            )
            busca.append([questao["id"], " ".join(normalizar(texto).split())])

    indice = {
        "versao": 1,
        "geradoEm": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "total": len(questoes),
        "temas": temas,
        "subtemas": subtemas,
        "provas": provas,
        "anos": sorted(anos),
        "questoes": questoes,
    }

    gravar_json(CAMINHO_INDICE, indice)

    caminho_busca = DIR_ACERVO / "busca.json"
    caminho_busca.write_text(
        json.dumps(busca, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    tamanho = CAMINHO_INDICE.stat().st_size / 1024
    print(f"Índice gravado: {len(questoes)} questões, {len(temas)} temas, {tamanho:.1f} kB")
    print(f"Índice de busca: {caminho_busca.stat().st_size / 1024:.1f} kB (baixado só ao buscar)")
    for tema in temas:
        print(f"  {tema['slug']:<18} {tema['total']:>5}")
    if desconhecidos:
        print(
            "\nArquivos de tema fora da taxonomia (ignorados): "
            + ", ".join(desconhecidos)
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
