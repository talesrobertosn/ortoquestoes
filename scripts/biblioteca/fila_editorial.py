#!/usr/bin/env python3
"""Fila editorial: o que falta produzir, na ordem dos Temas que Mais Caem (Prompt Master V3, 29/10/2026).

Só lê o acervo e grava docs/biblioteca/FILA-EDITORIAL.md (e o .json ao lado); nunca altera questões,
comentários ou resumos. Rode de novo quando o acervo, a Biblioteca ou a contagem mudarem:

    python3 scripts/biblioteca/fila_editorial.py

Cobertura de um assunto do ranking (src/dados/incidencia.json, que já conta só questões de prova,
sem cópias, anuladas ou autorais): coberto quando algum resumo declara o subtema ou quando os resumos
citam como central ou relacionada pelo menos metade das questões oficiais dele; parcial de 30% a 50%;
sem resumo abaixo disso. Na área Mão e punho entram só as questões de provas gerais (TEOT, TARO e as
outras fora de PROVAS_MAO; Tales, 29/10/2026); as provas de acesso e título de Cirurgia da Mão ficam
protegidas (trabalho com o Green, docs/mao/PROTOCOLO.md) e não contam na posição.

Estado de cada comentário de questão oficial do assunto:
  protegido-mao   prova de acesso ou título de Cirurgia da Mão, ou tema mao
  preservar       revisão médica, proveniência de resumo registrada (catalogo.json) ou já em miniaula
  basico          comentário curto ou alternativas telegráficas: elegível depois do resumo novo
  sem-comentario  questão oficial sem comentário
  incerto         o resto: não modificar sem olhar
"""
from __future__ import annotations

import json
import os
from collections import Counter
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SAIDA_MD = RAIZ / "docs/biblioteca/FILA-EDITORIAL.md"
SAIDA_JSON = RAIZ / "docs/biblioteca/fila-editorial.json"

# Provas de acesso ou título de Cirurgia da Mão (nomes como estão no acervo).
PROVAS_MAO = {"SBCM", "SIMÃO", "ENARE Cirurgia da Mão", "USP-SP", "UFG", "PUC-SP", "INTO", "FMRP-USP",
              "IAUPE", "Einstein", "UERJ"}


def ler(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def oficial(q: dict) -> bool:
    return bool(q.get("prova")) and not q.get("duplicataDe") and not q.get("anulada") and not q.get("simulado") and not q.get("area")


def tamanho(c: dict) -> tuple[int, int]:
    """Caracteres do comentário inteiro e da alternativa errada mais curta."""
    inc = [len(v or "") for v in (c.get("incorretas") or {}).values()]
    total = len(c.get("conceito") or "") + len(c.get("correta") or "") + sum(inc)
    return total, (min(inc) if inc else 0)


def estado_comentario(tema: str, q: dict, c: dict | None, cat: dict) -> str:
    if q.get("prova") in PROVAS_MAO:
        return "protegido-mao"
    if not c:
        return "sem-comentario"
    if c.get("conferido") or cat.get("estado") in ("revisada", "preservar-revisao-medica"):
        return "preservar"
    # Já reescrito a partir de um resumo da Biblioteca (o ciclo cita o resumo nas referências): não refazer,
    # mesmo quando o comentário saiu mais direto de propósito (Tales, 30/10/2026: "às vezes mais direto").
    if any(str(r).startswith("Biblioteca OrtoQuestões, resumo") for r in c.get("referencias") or []):
        return "preservar"
    total, menor = tamanho(c)
    if total >= 3500 and menor >= 250:
        return "preservar"
    if total < 2500 or menor < 150:
        return "basico"
    return "incerto"


def main() -> int:
    inc = ler(RAIZ / "src/dados/incidencia.json")
    bib = ler(RAIZ / "public/biblioteca/indice.json")["capitulos"]
    mapa = ler(RAIZ / "public/biblioteca/questoes.json")
    cat = ler(RAIZ / "docs/comentarios-resumos/catalogo.json").get("questoes", {})
    qs, cs = {}, {}
    for p in sorted((RAIZ / "public/acervo/temas").glob("*.json")):
        d = ler(p)
        for q in d["questoes"] if isinstance(d, dict) else d:
            qs[q["id"]] = (p.stem, q)
    for p in sorted((RAIZ / "public/acervo/comentarios").glob("*.json")):
        cs.update(ler(p))
    declarados = {(c["especialidade"], s): c["id"] for c in bib for s in c.get("subtemas", [])}

    linhas = []
    for a in inc["areas"]:
        for f in a["focos"]:
            sub = f.get("noAcervo") or f["nome"]
            ids = [i for i, (t, q) in qs.items() if t == a["slug"] and sub in q.get("subtemas", []) and oficial(q)
                   and q.get("prova") not in PROVAS_MAO]
            citadas = [i for i in ids if any(x["p"] in ("central", "relacionada") for x in mapa.get(i, []))]
            cob = len(citadas) / len(ids) if ids else 0.0
            resumos = sorted({x["c"] for i in citadas for x in mapa.get(i, []) if x["p"] in ("central", "relacionada")})
            if (a["slug"], sub) in declarados or cob >= 0.5:
                situacao = "coberto"
            elif cob >= 0.3:
                situacao = "parcial"
            else:
                situacao = "sem resumo"
            estados = Counter(estado_comentario(qs[i][0], qs[i][1], cs.get(i), cat.get(i, {})) for i in ids)
            linhas.append({
                "area": a["id"], "areaNome": a["nome"], "assunto": f["nome"], "subtema": sub,
                # Na Mão, a contagem geral inclui as provas protegidas: a posição usa só as provas gerais.
                "n": len(ids) if a["slug"] == "mao" else f.get("n", len(ids)),
                "oficiais": len(ids), "teot": sum(qs[i][1]["prova"] == "TEOT" for i in ids),
                "taro": sum(qs[i][1]["prova"] == "TARO" for i in ids), "citadas": len(citadas), "cobertura": round(cob, 2),
                "situacao": situacao, "resumos": resumos[:6], "comentarios": dict(sorted(estados.items())),
            })
    linhas.sort(key=lambda x: (-x["n"], x["area"], x["assunto"]))
    fila = [l for l in linhas if l["situacao"] in ("sem resumo", "parcial")]
    for pos, l in enumerate(fila, 1):
        l["posicaoFila"] = pos

    SAIDA_JSON.write_text(json.dumps({"geradoEm": date.today().isoformat(), "assuntos": linhas}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    contagem = Counter(l["situacao"] for l in linhas)
    md = [
        "# Fila editorial pelos Temas que Mais Caem",
        "",
        f"Gerada por `scripts/biblioteca/fila_editorial.py` em {date.today().strftime('%d/%m/%Y')}. Não editar à mão: rodar o script de novo.",
        "A ordem é a da contagem de questões de prova de `src/dados/incidencia.json` (TEOT, TARO, CET-PR, TECOC e ENARE, sem cópias, anuladas ou autorais).",
        "Coberto: algum resumo declara o subtema ou os resumos citam pelo menos metade das questões oficiais. Parcial: 30% a 50%.",
        "Na área Mão e punho contam só as provas gerais (TEOT, TARO e outras); as provas de acesso e título de Cirurgia da Mão ficam protegidas.",
        "",
        "Comentários: `preservar` (revisão médica, proveniência de resumo ou já em miniaula), `basico` (elegível depois do resumo novo),",
        "`incerto` (não mexer sem olhar), `sem-comentario`, `protegido-mao`.",
        "",
        f"Assuntos no ranking: {len(linhas)}; cobertos {contagem['coberto']}; parciais {contagem['parcial']}; sem resumo {contagem['sem resumo']}.",
        "",
        "## Fila (sem resumo ou parcial)",
        "",
        "| Pos. | Área | Assunto | Questões de prova | TEOT | TARO | Citadas | Situação | Comentários |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for l in fila:
        com = ", ".join(f"{k} {v}" for k, v in l["comentarios"].items())
        md.append(f"| {l['posicaoFila']} | {l['areaNome']} | {l['assunto']} | {l['n']} | {l['teot']} | {l['taro']} | {l['citadas']} ({int(l['cobertura'] * 100)}%) | {l['situacao']} | {com} |")
    md += ["", "## Cobertos", "", "| Área | Assunto | Questões de prova | Citadas | Resumos |", "| --- | --- | --- | --- | --- |"]
    for l in linhas:
        if l["situacao"] == "coberto":
            md.append(f"| {l['areaNome']} | {l['assunto']} | {l['n']} | {l['citadas']} ({int(l['cobertura'] * 100)}%) | {', '.join('`' + r + '`' for r in l['resumos'][:3])} |")
    SAIDA_MD.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"{len(fila)} assuntos na fila; o primeiro: {fila[0]['areaNome']} / {fila[0]['assunto']} ({fila[0]['n']} questões de prova)." if fila else "Fila vazia.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
