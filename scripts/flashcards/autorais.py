#!/usr/bin/env python3
"""Flashcards escritos à mão (autorais), guardados à parte da fábrica automática.

A fábrica (fabrica.py) faz no máximo um flashcard por questão, copiando a
pergunta da prova. Os autorais exploram o que o comentário ensina e a questão
não pergunta: uma linha de tabela, um tipo de classificação, o par que a prova
troca, a armadilha. Ficam em scripts/flashcards/autorais/<area>.json (fonte
versionada) e entram na publicação junto com os da fábrica, que nunca os apaga.

Regra de ouro: nada inventado. Todo autoral cita um TRECHO literal do
comentário da questão de origem; a resposta tem de estar dentro desse trecho,
e cada alternativa da Batalha tem de existir no comentário ou nas alternativas
da questão. O validador abaixo confere isso automaticamente.
"""
from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fabrica as F  # noqa: E402

DIR = Path(__file__).resolve().parent / "autorais"

TIPOS = {
    "Tabela": "tb",           # uma linha de tabela do comentário, com uma célula apagada
    "Classificação": "cl",    # um tipo/grau de classificação e o que o define
    "Par confundível": "pc",  # duas coisas que a prova troca
    "Armadilha": "ar",        # mito ou sinal abandonado
    "Na prova": "np",         # lacuna no termo que a prova cobra
    "Conceito": "co",         # pergunta direta sobre uma ideia do comentário
}

CAMPOS_OBRIGATORIOS = ("questao", "tipo", "frente", "resposta", "explicacao", "trecho")


def texto_do_comentario(c: dict) -> str:
    partes = [c.get("conceito") or "", c.get("correta") or "", *((c.get("incorretas") or {}).values())]
    return "\n".join(partes)


def ler_autorais() -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    if not DIR.exists():
        return out
    for arq in sorted(DIR.glob("*.json")):
        out[arq.stem] = F.ler_json(arq, {"flashcards": []})["flashcards"]
    return out


def gravar_autorais(area: str, cartas: list[dict]) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    cartas.sort(key=lambda f: f["id"])
    F.gravar_json(DIR / f"{area}.json", {"area": area, "flashcards": cartas})


def validar_autoral(fc: dict, q: dict | None, c: dict | None, frentes_existentes: set[str] | None = None) -> list[str]:
    """Erros de um flashcard autoral; lista vazia = aprovado."""
    erros: list[str] = []
    for campo in CAMPOS_OBRIGATORIOS:
        if not str(fc.get(campo) or "").strip():
            erros.append(f"falta o campo {campo}")
    if erros:
        return erros
    if not q:
        return ["questão de origem não existe"]
    if q.get("anulada"):
        erros.append("questão anulada")
    if not c:
        return erros + ["questão sem comentário (o autoral sai do comentário)"]
    if fc.get("assunto") and fc["assunto"] not in (q.get("subtemas") or []):
        erros.append(f"assunto fora dos subtemas da questão: {fc['assunto']}")
    if fc["tipo"] not in TIPOS:
        erros.append(f"tipo desconhecido: {fc['tipo']} (use {', '.join(TIPOS)})")
    fonte = F.normalizar(texto_do_comentario(c))
    trecho = F.normalizar(F.limpar(fc["trecho"]))
    if len(trecho) < 12:
        erros.append("trecho curto demais para servir de fonte")
    elif trecho not in fonte:
        erros.append("o trecho não está no comentário (copie literalmente)")
    resp = F.normalizar(fc["resposta"])
    if resp and resp not in trecho:
        erros.append("a resposta não aparece no trecho citado")
    frente_sem = re.sub(r"\{\{c\d::[^}]+\}\}", " ", fc["frente"])
    if len(resp) >= 4 and resp in F.normalizar(frente_sem):
        erros.append("a frente revela a resposta")
    if len(F.normalizar(frente_sem)) < 18:
        erros.append("frente sem contexto")
    if len(fc["frente"]) > F.FRENTE_MAX_ESTUDO:
        erros.append("frente longa demais")
    if fc["tipo"] == "Na prova" and fc["frente"].count("{{c1::") != 1:
        erros.append("lacuna ambígua (Na prova pede exatamente uma {{c1::...}})")
    if len(fc["explicacao"]) < 20:
        erros.append("explicação curta demais")
    if c.get("alerta") and not fc.get("alerta"):
        erros.append("o comentário aponta divergência: copie o aviso em 'alerta'")
    opcoes = fc.get("opcoes") or []
    # publicado só para o Estudo: a única "alternativa" é a própria resposta
    if opcoes and fc.get("batalha", True):
        alternativas = F.normalizar(" | ".join(a["texto"] for a in q.get("alternativas") or []))
        norm = [F.normalizar(o) for o in opcoes]
        if not 2 <= len(opcoes) <= 4:
            erros.append("a Batalha usa de 2 a 4 alternativas")
        if len(set(norm)) != len(norm):
            erros.append("alternativas repetidas")
        certa = fc.get("certa")
        if not isinstance(certa, int) or not 0 <= certa < len(opcoes) or norm[certa] != resp:
            erros.append("'certa' tem de apontar para a alternativa igual à resposta")
        for o, n in zip(opcoes, norm):
            if not n or (n not in fonte and n not in alternativas):
                erros.append(f"alternativa sem fonte no comentário nem na questão: {o}")
            if len(o) > F.OPCAO_MAX:
                erros.append(f"alternativa longa demais: {o[:30]}...")
    for campo in ("frente", "resposta", "explicacao"):
        if F.TRAVESSAO.search(fc[campo]):
            erros.append(f"travessão em {campo}")
        if re.search(r"<[a-z/]", fc[campo]):
            erros.append(f"HTML em {campo}")
    if frentes_existentes is not None and F.normalizar(frente_sem) in frentes_existentes:
        erros.append("já existe um flashcard com esta frente")
    return erros


def completar(fc: dict, q: dict, c: dict, areas: dict, niveis: dict[str, int], numero: int) -> dict:
    """Preenche os campos que vêm da questão (área, assunto, raridade, prova, fonte)."""
    subtemas = q.get("subtemas") or []
    assunto = fc.get("assunto") or (subtemas[0] if subtemas else areas[q["_area"]]["nome"])
    nivel = niveis.get(assunto, max([niveis.get(s, 1) for s in subtemas] or [1]))
    opcoes = fc.get("opcoes") or []
    batalha = bool(opcoes) and len(fc["frente"]) <= F.FRENTE_MAX_BATALHA
    saida = {
        "id": f"fc-{q['id']}-{TIPOS[fc['tipo']]}{numero}",
        "questao": q["id"],
        "area": areas[q["_area"]]["nome"],
        "areaId": q["_area"],
        "assunto": assunto,
        "subtemas": subtemas,
        "tipo": fc["tipo"],
        "raridade": F.RARIDADE_POR_NIVEL.get(nivel, "comum"),
        "dificuldade": int(fc.get("dificuldade") or F.dificuldade_estimada(fc["frente"], fc["tipo"], len(opcoes))),
        "frente": fc["frente"].strip(),
        "resposta": fc["resposta"].strip(),
        "explicacao": fc["explicacao"].strip(),
        "opcoes": opcoes or [fc["resposta"].strip()],
        "certa": fc.get("certa", 0) if opcoes else 0,
        "batalha": batalha,
        "prova": q.get("prova"),
        "ano": q.get("ano"),
        "fonte": F.hash_fonte(q, c),
        "origem": "autoral",
        "trecho": fc["trecho"].strip(),
        "criadoEm": fc.get("criadoEm") or date.today().isoformat(),
    }
    if fc.get("alerta"):
        saida["alerta"] = fc["alerta"]
    if fc.get("imagem") and q.get("imagens"):
        im = q["imagens"][0]
        saida["imagem"] = {"arquivo": im["arquivo"], "legenda": im.get("legenda") or ""}
    return saida
