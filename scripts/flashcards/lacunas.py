#!/usr/bin/env python3
"""Lacunas de um assunto, para escrever flashcards autorais por engenharia reversa (27/10/2026).

Mostra as frentes já publicadas do assunto (para não repetir conceito) e as questões com comentário
que ainda não deram flashcard, com o gabarito e o comentário, de onde saem os trechos literais.

    python3 scripts/flashcards/lacunas.py pediatria "Displasia do desenvolvimento do quadril" [--limite 8] [--so-frentes]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fabrica as F  # noqa: E402


def principal() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("area")
    p.add_argument("assunto")
    p.add_argument("--limite", type=int, default=8)
    p.add_argument("--pular", type=int, default=0)
    p.add_argument("--so-frentes", action="store_true")
    a = p.parse_args()
    _, questoes, comentarios = F.carregar_acervo()
    pub = F.ler_publicados(com_autorais=True).get(a.area, [])
    do_assunto = [c for c in pub if a.assunto in {c["assunto"], *(c.get("subtemas") or [])}]
    usadas = {c["questao"] for cartas in F.ler_publicados(com_autorais=True).values() for c in cartas}
    print(f"## {len(do_assunto)} flashcards publicados em {a.assunto}")
    for c in do_assunto:
        print(f"- [{c['tipo']}] {F.limpar(c['frente'])[:150]} => {c['resposta'][:60]}")
    if a.so_frentes:
        return 0
    lacunas = [q for q in questoes.values() if q["_area"] == a.area and a.assunto in (q.get("subtemas") or [])
               and q["id"] in comentarios and q["id"] not in usadas and not q.get("anulada") and not q.get("duplicataDe")]
    lacunas.sort(key=lambda q: (q.get("prova") not in ("TEOT", "TARO"), q["id"]))
    print(f"\n## {len(lacunas)} questões sem flashcard")
    for q in lacunas[a.pular:a.pular + a.limite]:
        c = comentarios[q["id"]]
        alts = " | ".join(f"{x.get('letra', '?')}) {x['texto']}" for x in q.get("alternativas") or [])
        print(f"\n### {q['id']} · {q.get('prova') or 'Simulado'} {q.get('ano') or ''} · gabarito {q.get('gabarito')}")
        print(f"ENUNCIADO: {q.get('enunciado', '')[:600]}")
        print(f"ALTERNATIVAS: {alts[:700]}")
        if c.get("alerta"):
            print(f"ALERTA: {c['alerta']}")
        print(f"CONCEITO: {(c.get('conceito') or '')[:2200]}")
        print(f"CORRETA: {(c.get('correta') or '')[:900]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
