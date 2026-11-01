"""Portão extra dos lotes de comentários (Tales, 31/10/2026; docs/biblioteca/FLUXO-MESTRE.md, seção 6).

Chamado por lote_comentarios.py. Recusa também análise de alternativa que começa com "também" (a ordem
muda na tela). Complementa o que ele já recusa (piso de tamanho, travessão, parágrafo
idêntico, fecho de simulado no lugar errado) com:
  - parágrafo quase igual (90% de semelhança) em dois comentários do lote: recusa;
  - comentário cujas referências não citam nenhum livro (só o resumo da Biblioteca): recusa;
  - lote em que nenhum comentário cita o Campbell's Operative Orthopaedics, 15ª ed.: aviso (Tales, 31/10/2026:
    preferir o Campbell 15 nos comentários quando ele cobre o tema).
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher

LIVRO = re.compile(r"Rockwood|Campbell|Tachdjian|Green|Netter|Callaghan|Lovell|Skeletal Trauma|AO Principles|Siz[ií]nio|Hoppenfeld", re.I)


def _paragrafos(c: dict) -> list[str]:
    texto = "\n\n".join([c.get("conceito", ""), c.get("correta", ""), *c.get("incorretas", {}).values()])
    return [p.strip() for p in re.split(r"\n\s*\n", texto) if len(p.strip()) > 200]


def checar(comentarios: dict) -> tuple[list[str], list[str]]:
    erros, avisos = [], []
    pars = [(qid, p) for qid, c in comentarios.items() for p in _paragrafos(c)]
    for i in range(len(pars)):
        for j in range(i + 1, len(pars)):
            (a, pa), (b, pb) = pars[i], pars[j]
            if a == b or pa == pb:
                continue  # o idêntico já é recusado por lote_comentarios.py
            if abs(len(pa) - len(pb)) < 0.2 * max(len(pa), len(pb)) and SequenceMatcher(None, pa, pb).ratio() > 0.9:
                erros.append(f"parágrafo quase igual em {a} e {b}: {pa[:60]}...")
    for qid, c in comentarios.items():
        for letra, t in (c.get("incorretas") or {}).items():
            # As letras são embaralhadas na tela: "**X** também..." pode aparecer em primeiro e perde o sentido.
            if re.match(r"\*\*[^*]+\*\* também\b", t):
                erros.append(f"{qid}: análise da {letra} começa com 'também'; na tela a ordem das alternativas muda")
    for qid, c in comentarios.items():
        refs = c.get("referencias") or []
        if not any(LIVRO.search(r) and "Biblioteca OrtoQuestões" not in r for r in refs):
            erros.append(f"{qid}: referências sem livro (só resumo ou vazias)")
    if comentarios and not any("Campbell" in r and "15" in r for c in comentarios.values() for r in (c.get("referencias") or [])):
        avisos.append("nenhum comentário do lote cita o Campbell's Operative Orthopaedics, 15ª ed.; confira se o tema está nele (regra de 31/10/2026)")
    return erros, avisos
