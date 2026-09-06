#!/usr/bin/env python3
"""Aplica comentários de IA ao acervo, conferindo antes de gravar.

Os comentários ficam em ``public/acervo/comentarios/<tema>.json`` — fora do
arquivo do tema — por dois motivos: reimportar um PDF reescreve o arquivo do
tema e levaria o comentário junto sem ninguém notar, e quem só quer responder
não precisa baixar o texto de todos os comentários.

A conferência é a parte que importa. Um comentário que explica a alternativa
errada como se fosse a certa é pior do que comentário nenhum, então o script
recusa o lote inteiro quando encontra:

  - id que não existe no acervo;
  - questão sem gabarito (não há o que explicar como correta);
  - letra em ``incorretas`` que não existe entre as alternativas;
  - a letra do gabarito listada entre as incorretas;
  - alternativa errada sem explicação.

Uso:
    python3 scripts/aplicar_comentarios.py lote.json
    python3 scripts/aplicar_comentarios.py lote.json --seco
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_ACERVO, DIR_TEMAS  # noqa: E402

DIR_COMENTARIOS = DIR_ACERVO / "comentarios"


def carregar_acervo() -> dict[str, tuple[str, dict]]:
    """id -> (slug do tema, questão)."""
    mapa: dict[str, tuple[str, dict]] = {}
    for caminho in sorted(DIR_TEMAS.glob("*.json")):
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        questoes = dados["questoes"] if isinstance(dados, dict) else dados
        for questao in questoes:
            mapa[questao["id"]] = (caminho.stem, questao)
    return mapa


def conferir(qid: str, comentario: dict, questao: dict) -> list[str]:
    problemas: list[str] = []
    gabarito = questao.get("gabarito")
    letras = {a["letra"] for a in questao["alternativas"]}

    if not gabarito:
        problemas.append(f"{qid}: questão sem gabarito — não dá para dizer qual está certa")
        return problemas
    if questao.get("anulada"):
        problemas.append(f"{qid}: questão anulada — comentar como se tivesse resposta engana")

    if not str(comentario.get("correta", "")).strip():
        problemas.append(f"{qid}: falta o texto da alternativa correta")

    incorretas = comentario.get("incorretas") or {}
    if gabarito in incorretas:
        problemas.append(
            f"{qid}: a letra {gabarito} é o gabarito e está listada entre as incorretas"
        )
    for letra in incorretas:
        if letra not in letras:
            problemas.append(f"{qid}: letra {letra} não existe entre as alternativas")
        elif not str(incorretas[letra]).strip():
            problemas.append(f"{qid}: a letra {letra} ficou com explicação vazia")

    faltando = sorted(letras - {gabarito} - set(incorretas))
    if faltando:
        problemas.append(f"{qid}: sem explicação para {', '.join(faltando)}")

    return problemas


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("lote", type=Path, help="JSON com {id: comentário}")
    ap.add_argument("--seco", action="store_true", help="confere e não grava")
    args = ap.parse_args()

    lote = json.loads(args.lote.read_text(encoding="utf-8"))
    acervo = carregar_acervo()

    problemas: list[str] = []
    por_tema: dict[str, dict[str, dict]] = {}
    hoje = dt.date.today().isoformat()

    for qid, comentario in lote.items():
        alvo = acervo.get(qid)
        if alvo is None:
            problemas.append(f"{qid}: não existe no acervo")
            continue
        slug, questao = alvo
        problemas.extend(conferir(qid, comentario, questao))
        comentario.setdefault("geradoEm", hoje)
        comentario.setdefault("conferido", False)
        por_tema.setdefault(slug, {})[qid] = comentario

    if problemas:
        print(f"{len(problemas)} problema(s) — nada foi gravado:\n")
        for p in problemas:
            print("  " + p)
        return 1

    DIR_COMENTARIOS.mkdir(parents=True, exist_ok=True)
    for slug, novos in sorted(por_tema.items()):
        caminho = DIR_COMENTARIOS / f"{slug}.json"
        existentes = (
            json.loads(caminho.read_text(encoding="utf-8")) if caminho.exists() else {}
        )
        antes = len(existentes)
        substituidos = sum(1 for qid in novos if qid in existentes)
        # Comentário já conferido por médico não é sobrescrito por um novo da
        # IA: o trabalho humano de conferência não se perde num reprocessamento.
        preservados = []
        for qid, novo in novos.items():
            if existentes.get(qid, {}).get("conferido") and not novo.get("conferido"):
                preservados.append(qid)
                continue
            existentes[qid] = novo
        ordenado = {qid: existentes[qid] for qid in sorted(existentes)}
        if not args.seco:
            caminho.write_text(
                json.dumps(ordenado, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
            )
        print(
            f"{slug}: {len(novos) - len(preservados)} comentário(s) gravado(s) "
            f"({substituidos - len(preservados)} substituído[s]), "
            f"{antes} → {len(ordenado)} no tema"
        )
        if preservados:
            print(
                f"  {len(preservados)} preservado(s) por já estarem conferidos: "
                + ", ".join(preservados)
            )

    if args.seco:
        print("\nEnsaio: nada foi gravado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
