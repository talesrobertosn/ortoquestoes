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
    if F.colecao_da_questao(q):
        saida["colecao"] = F.colecao_da_questao(q)
    if fc.get("imagem") and q.get("imagens"):
        im = q["imagens"][0]
        saida["imagem"] = {"arquivo": im["arquivo"], "legenda": im.get("legenda") or ""}
    return saida


# ─── Inclusão de lotes (27/10/2026) ──────────────────────────────────────────
# Um lote é scripts/flashcards/lotes/<data>-<tema>-N.json: uma lista de flashcards autorais ou
# {"temas": [{"area", "assunto"}], "flashcards": [...]}. "incluir" valida cada um (regra de ouro
# acima), descarta o que repete conceito já publicado (fábrica ou autoral, em qualquer área) e grava
# só os novos. Rodar o mesmo lote de novo não cria nada: cada flashcard reaparece como repetido dele
# mesmo. O resultado de cada lote fica em scripts/flashcards/expansao.json (temas concluídos, quantos
# entraram, quantas duplicidades foram evitadas), que prioridade.py também lê.

import json  # noqa: E402

REGISTRO = Path(__file__).resolve().parent / "expansao.json"
_PALAVRAS_VAZIAS = set(
    "a o as os um uma uns umas de da do das dos e em no na nos nas para por pela pelo com sem ao aos "
    "qual quais que quem como quando onde quanto quanta quantos quantas e é sao ser se seu sua mais menos "
    "nesse nessa neste nesta esse essa este esta isso isto entre sobre ate tipo grau".split()
)


def _sem_lacuna(t: str) -> str:
    return re.sub(r"\{\{c\d::([^}]+)\}\}", r"\1", t)


def _tokens(t: str) -> set[str]:
    return {w for w in F.normalizar(_sem_lacuna(t)).split() if len(w) > 2 and w not in _PALAVRAS_VAZIAS}


def _jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b) if a and b else 0.0


def repetido(novo: dict, existentes: list[dict]) -> dict | None:
    """O flashcard publicado que já cobra o mesmo conceito, ou None.

    Mesmo conceito = mesma frente; ou mesma resposta com frentes parecidas (Jaccard das palavras de
    conteúdo >= 0,4, ou >= 0,55 quando a resposta é curta, como "2" ou "III", em que frentes parecidas
    de classificações diferentes ainda podem divergir); ou frentes quase iguais (>= 0,7) com resposta
    diferente na redação. Classificação, mecanismo, conduta e complicação do mesmo tema têm frentes e
    respostas diferentes e passam.
    """
    frente = F.normalizar(_sem_lacuna(novo["frente"]))
    resp = F.normalizar(novo["resposta"])
    tn = _tokens(novo["frente"])
    for e in existentes:
        if F.normalizar(_sem_lacuna(e["frente"])) == frente:
            return e
        j = _jaccard(tn, _tokens(e["frente"]))
        mesma = F.normalizar(e.get("resposta") or "") == resp
        if (mesma and j >= (0.55 if len(resp) <= 4 else 0.4)) or j >= 0.7 and (mesma or resp in F.normalizar(e.get("explicacao") or "")):
            return e
    return None


def cmd_incluir(caminho: str, conferir: bool) -> int:
    areas, questoes, comentarios = F.carregar_acervo()
    niveis = F.niveis_de_incidencia()
    bruto = json.loads(Path(caminho).read_text(encoding="utf-8"))
    lote = bruto["flashcards"] if isinstance(bruto, dict) else bruto
    temas = bruto.get("temas", []) if isinstance(bruto, dict) else []
    publicados = [c for cartas in F.ler_publicados(com_autorais=True).values() for c in cartas]
    autorais = ler_autorais()
    frentes = {F.normalizar(_sem_lacuna(c["frente"])) for c in publicados}
    incluidos, duplicados, reprovados = [], [], []
    for fc in lote:
        q, c = questoes.get(fc.get("questao")), comentarios.get(fc.get("questao"))
        dup = repetido(fc, publicados)
        if dup:
            duplicados.append({"frente": fc["frente"], "igualA": dup["id"]})
            continue
        erros = validar_autoral(fc, q, c, frentes)
        if erros:
            reprovados.append({"frente": fc.get("frente", "")[:80], "erros": erros})
            continue
        area = q["_area"]
        lista = autorais.setdefault(area, [])
        prefixo = f"fc-{q['id']}-{TIPOS[fc['tipo']]}"
        numero = 1 + max([int(m.group(1)) for x in lista if (m := re.fullmatch(re.escape(prefixo) + r"(\d+)", x["id"]))] or [0])
        carta = completar(fc, q, c, areas, niveis, numero)
        lista.append(carta)
        publicados.append(carta)
        frentes.add(F.normalizar(_sem_lacuna(carta["frente"])))
        incluidos.append(carta)
    for r in reprovados:
        print(f"  reprovado: {r['frente']} -> {'; '.join(r['erros'])}")
    for d in duplicados:
        print(f"  repetido (já existe {d['igualA']}): {d['frente'][:90]}")
    print(f"{Path(caminho).name}: {len(incluidos)} novos · {len(duplicados)} repetidos evitados · {len(reprovados)} reprovados")
    if conferir:
        return 1 if reprovados else 0
    for area in {c["areaId"] for c in incluidos}:
        gravar_autorais(area, autorais[area])
    F.publicar(F.ler_publicados())
    F.reconstruir_indice(areas, F.ler_publicados(com_autorais=True), F.ler_json(F.ESTADO, {}))
    reg = F.ler_json(REGISTRO, {"lotes": [], "temas": []})
    nome = Path(caminho).name
    reg["lotes"] = [x for x in reg["lotes"] if x["arquivo"] != nome] + [{
        "arquivo": nome, "data": date.today().isoformat(), "novos": len(incluidos) + next((x["novos"] for x in reg["lotes"] if x["arquivo"] == nome), 0),
        "repetidosEvitados": len(duplicados), "reprovados": len(reprovados),
    }]
    for t in temas:
        if not any(x["area"] == t["area"] and x["assunto"] == t["assunto"] for x in reg["temas"]):
            reg["temas"].append({"area": t["area"], "assunto": t["assunto"], "data": date.today().isoformat()})
    F.gravar_json(REGISTRO, reg)
    return 1 if reprovados else 0


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Flashcards autorais: incluir um lote validado e sem repetidos.")
    sub = p.add_subparsers(dest="comando", required=True)
    i = sub.add_parser("incluir")
    i.add_argument("lotes", nargs="+")
    i.add_argument("--conferir", action="store_true", help="só valida e mostra o resultado, sem gravar")
    a = p.parse_args()
    falhas = 0
    for arq in a.lotes:
        falhas += cmd_incluir(arq, a.conferir)
    sys.exit(1 if falhas else 0)
