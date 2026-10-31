"""Auditoria de estilo dos OrtoQuestões Simulados já publicados (31/10/2026).

Roda o mesmo portão do aplicar_lote.py (checar_simulados.py) sobre os simulados do acervo e lista os que
reprovam: correta que se denuncia pelo tamanho, livro ou "segundo o capítulo" no enunciado. Na primeira
rodada (31/10/2026), 871 de 1.938 reprovaram. Regra do prompt mestre: ao fechar um tema, reescrever no
molde da banca (lote_proj.py com id=, mesma letra de gabarito) os simulados reprovados dele.

Uso:
  python3 scripts/simulados/auditar_estilo.py                 # placar por tema
  python3 scripts/simulados/auditar_estilo.py --tema pediatria --ids pediatria-0100,pediatria-0101
  python3 scripts/simulados/auditar_estilo.py --subtema "Fraturas do pé na criança"
"""
import argparse
import collections
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from checar_simulados import checar  # noqa: E402


def reprovados(tema=None, subtema=None, ids=None):
    for f in sorted((RAIZ / "public/acervo/temas").glob("*.json")):
        if tema and f.stem != tema:
            continue
        for q in json.loads(f.read_text(encoding="utf-8"))["questoes"]:
            if not q.get("simulado") or q.get("area") == "cirurgia-mao":
                continue  # Cirurgia da Mão segue o protocolo próprio (SBCM e SIMÃO)
            if subtema and subtema not in q.get("subtemas", []):
                continue
            if ids and q["id"] not in ids:
                continue
            d = dict(enun=q["enunciado"], alts=[a["texto"] for a in q["alternativas"]], gab=q["gabarito"])
            erros, _ = checar([(q["id"], d)])
            erros = [e for e in erros if "concentrado" not in e]
            yield f.stem, q, erros


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tema")
    ap.add_argument("--subtema")
    ap.add_argument("--ids")
    a = ap.parse_args()
    ids = set(a.ids.split(",")) if a.ids else None
    tot, ruins = collections.Counter(), collections.Counter()
    detalhe = a.tema or a.subtema or ids
    for tema, q, erros in reprovados(a.tema, a.subtema, ids):
        tot[tema] += 1
        if erros:
            ruins[tema] += 1
            if detalhe:
                print(f"{q['id']}: {erros[0].split(': ', 1)[-1]}")
    print(f"{sum(ruins.values())} de {sum(tot.values())} simulados reprovam no portão de estilo")
    for t, n in ruins.most_common():
        print(f"  {t}: {n} de {tot[t]}")


if __name__ == "__main__":
    main()
