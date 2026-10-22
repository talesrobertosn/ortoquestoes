#!/usr/bin/env python3
"""Cronograma de criação de flashcards, na ordem dos assuntos que mais caem.

A ordem vem de src/dados/incidencia.json (scripts/gerar_incidencia.py), a
mesma contagem da página "Temas que mais caem": quantas questões de prova
oficial cada assunto teve. Quanto mais cai, maior a meta de flashcards
autorais (os escritos à mão a partir do comentário, ver autorais.py) e mais
cedo o assunto entra no plano semanal.

    python3 scripts/flashcards/cronograma.py plano [--ritmo 60] [--inicio 2026-10-19] [--semanas 12]
        recalcula metas, cobertura e o plano semanal; grava docs/flashcards/CRONOGRAMA.md
        e scripts/flashcards/cronograma.json
    python3 scripts/flashcards/cronograma.py proximo [--n 6] [--assunto "Lesões fisárias"] [--pular 0] [--simulados]
        mostra o próximo assunto do plano e as questões-fonte (com o comentário inteiro)
        para escrever o lote; com --simulados, só as questões dos OrtoQuestões Simulados,
        no assunto de maior incidência que ainda tem simulado sem autoral
    python3 scripts/flashcards/cronograma.py aplicar lote.json
        valida o lote (fonte literal, resposta no trecho, alternativas com fonte),
        guarda os aprovados em scripts/flashcards/autorais/ e republica o acervo
    python3 scripts/flashcards/cronograma.py estado
        progresso da semana e o que vem a seguir

O formato do lote e as regras de escrita estão em docs/flashcards/CRIACAO.md.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import autorais as A  # noqa: E402
import fabrica as F  # noqa: E402

RAIZ = F.RAIZ
DOC = RAIZ / "docs" / "flashcards" / "CRONOGRAMA.md"
PLANO = Path(__file__).resolve().parent / "cronograma.json"

# Meta de autorais por questão de prova do assunto, conforme o nível de incidência na área.
PESO = {4: 1.0, 3: 0.7, 2: 0.4, 1: 0.2}
META_MINIMA = 3
RITMO_PADRAO = 60
TABELA = re.compile(r"^\|.*\|\s*$", re.M)
CLASSIFICA = re.compile(r"classifica|tipo [IVX0-9]+|grau [IVX0-9]+|estágio|zona [IVX0-9]+", re.I)


def proxima_segunda(d: date) -> date:
    return d + timedelta(days=(7 - d.weekday()) % 7 or 7)


def riqueza(c: dict) -> dict:
    con = c.get("conceito") or ""
    return {"tabela": bool(TABELA.search(con)), "classificacao": bool(CLASSIFICA.search(con)), "naProva": bool(F.linha_na_prova(con))}


def chave_de_autoral(inc: dict):
    """Função que diz em qual linha (assunto, área) da fila um autoral é contado."""
    areas_do_assunto = defaultdict(list)
    for a in inc.get("areas", []):
        for foco in a["focos"]:
            areas_do_assunto[foco["nome"]].append((foco["n"], a["id"]))

    def chave(f: dict) -> tuple:
        s, area = f["assunto"], f.get("areaId")
        opcoes = areas_do_assunto.get(s)
        if not opcoes or any(i == area for _, i in opcoes):
            return (s, area)
        return (s, max(opcoes, key=lambda o: o[0])[1])
    return chave


def levantar():
    """Números de cada assunto: incidência, acervo, flashcards da fábrica, autorais e fontes."""
    areas, questoes, comentarios = F.carregar_acervo()
    inc = F.ler_json(F.INCIDENCIA, {"areas": []})
    pub = F.ler_publicados()
    aut = A.ler_autorais()
    fab_por = Counter()
    fab_sim = Counter()
    fab_questoes = defaultdict(set)
    for cartas in pub.values():
        for f in cartas:
            for s in f.get("subtemas") or [f["assunto"]]:
                fab_por[s] += 1
                fab_questoes[s].add(f["questao"])
                if F.colecao_da_questao(questoes.get(f["questao"], {})):
                    fab_sim[s] += 1
    # Um mesmo assunto pode aparecer em mais de uma área da incidência (por exemplo, "Fraturas da
    # coluna toracolombar" em Trauma adulto e em Coluna). Cada autoral conta uma vez só: na linha da
    # área da sua questão (areaId) ou, se o assunto não tem linha nessa área, na linha de maior incidência.
    chave_autoral = chave_de_autoral(inc)
    aut_por = Counter()
    aut_sim = Counter()
    aut_questoes = defaultdict(set)
    for cartas in aut.values():
        for f in cartas:
            k = chave_autoral(f)
            aut_por[k] += 1
            aut_questoes[f["assunto"]].add(f["questao"])
            if F.colecao_da_questao(questoes.get(f["questao"], {})):
                aut_sim[k] += 1
    acervo = defaultdict(list)
    for qid, q in questoes.items():
        if q.get("anulada") or q.get("duplicataDe"):
            continue
        for s in dict.fromkeys(q.get("subtemas") or []):
            acervo[s].append(qid)
    linhas = []
    for a in inc["areas"]:
        for foco in a["focos"]:
            s = foco["nome"]
            qs = acervo.get(s, [])
            com = [k for k in qs if comentarios.get(k, {}).get("conceito")]
            ricas = [k for k in com if any(riqueza(comentarios[k]).values())]
            sims = [k for k in com if F.colecao_da_questao(questoes[k])]
            k = (s, a["id"])
            meta = 0 if s.startswith("Outr") and foco["n"] < 5 else max(META_MINIMA, math.ceil(foco["n"] * PESO.get(foco["nivel"], 0.2)))
            linhas.append({
                "assunto": s, "areaId": a["id"], "area": a["nome"], "nivel": foco["nivel"], "incidencia": foco["n"],
                "acervo": len(qs), "comComentario": len(com), "fontesRicas": len(ricas),
                "fabrica": fab_por[s], "questoesComFlashcard": len(fab_questoes[s] | aut_questoes[s]),
                "autorais": aut_por[k], "meta": meta, "falta": max(0, meta - aut_por[k]),
                # OrtoQuestões Simulados: questões comentadas do assunto, flashcards da fábrica e autorais tirados delas
                "simulados": len(sims), "fabricaSimulados": fab_sim[s], "autoraisSimulados": aut_sim[k],
            })
    # ordem: o que mais cai primeiro (contagem absoluta de questões de prova), depois o nível na área;
    # os assuntos de resto ("Outras fraturas...", "Outros temas...") vão para o fim, como na incidência
    linhas.sort(key=lambda x: (x["assunto"].startswith("Outr"), -x["incidencia"], -x["nivel"], x["assunto"]))
    for i, l in enumerate(linhas, 1):
        l["posicao"] = i
    return linhas, (areas, questoes, comentarios, pub, aut)


def planejar(linhas, ritmo: int, inicio: date):
    """Distribui o que falta, assunto a assunto na ordem de incidência, em semanas de `ritmo` flashcards."""
    semanas = []
    atual = {"semana": 1, "inicio": inicio.isoformat(), "fim": (inicio + timedelta(days=6)).isoformat(), "itens": [], "total": 0}
    for l in linhas:
        resto = l["falta"]
        # sem fonte no comentário não há o que escrever: o limite é o número de questões comentadas
        resto = min(resto, max(0, l["comComentario"] * 3 - l["autorais"]))
        while resto > 0:
            livre = ritmo - atual["total"]
            if livre <= 0:
                semanas.append(atual)
                n = len(semanas) + 1
                ini = inicio + timedelta(weeks=n - 1)
                atual = {"semana": n, "inicio": ini.isoformat(), "fim": (ini + timedelta(days=6)).isoformat(), "itens": [], "total": 0}
                continue
            q = min(resto, livre)
            atual["itens"].append({"assunto": l["assunto"], "area": l["area"], "quantidade": q})
            atual["total"] += q
            resto -= q
    if atual["itens"]:
        semanas.append(atual)
    return semanas


def tabela_md(cabecalho, linhas):
    out = ["| " + " | ".join(cabecalho) + " |", "|" + "|".join("---" for _ in cabecalho) + "|"]
    out += ["| " + " | ".join(str(c) for c in l) + " |" for l in linhas]
    return "\n".join(out)


NOME_NIVEL = {4: "cai muito", 3: "cai bastante", 2: "cai às vezes", 1: "cai pouco"}


def escrever_doc(linhas, semanas, ritmo, inicio, mostrar_semanas, totais):
    semana_de = {}
    for s in semanas:
        for it in s["itens"]:
            semana_de.setdefault(it["assunto"], s["semana"])
    topo = [l for l in linhas][:40]
    partes = [
        "# Cronograma de criação de flashcards",
        "",
        f"Gerado por `scripts/flashcards/cronograma.py plano` em {date.today().strftime('%d/%m/%Y')}. Não edite à mão: rode o comando de novo.",
        "",
        "## Como funciona",
        "",
        "- **A ordem é a da prova.** Cada assunto entra na fila pelo número de questões de prova oficial (TEOT, TARO, CET-PR, TECOC, ENARE) que teve no acervo, a mesma contagem da página *Temas que mais caem*.",
        "- **Dois tipos de flashcard.** A fábrica automática transforma a própria questão em flashcard (um por questão). Os **autorais** são escritos a partir do comentário: uma linha de tabela, um tipo de classificação, o par que a prova troca, a armadilha. São eles que o cronograma organiza.",
        f"- **Meta por assunto** = questões de prova do assunto × peso do nível ({', '.join(f'nível {k}: {v}' for k, v in PESO.items())}), com mínimo de {META_MINIMA}.",
        f"- **Ritmo:** {ritmo} flashcards autorais por semana, a partir de {inicio.strftime('%d/%m/%Y')}. Para mudar: `--ritmo` e `--inicio`.",
        "- **Nada inventado.** Todo autoral cita um trecho literal do comentário, e o validador confere a resposta e as alternativas contra esse texto (docs/flashcards/CRIACAO.md).",
        "",
        "## Situação agora",
        "",
        tabela_md(["", "Total"], [
            ["Flashcards publicados (fábrica)", totais["fabrica"]],
            ["Flashcards autorais publicados", totais["autorais"]],
            ["Meta de autorais (todos os assuntos)", totais["meta"]],
            ["Faltam", totais["falta"]],
            ["Semanas no ritmo atual", len(semanas)],
            ["Previsão de término", date.fromisoformat(semanas[-1]["fim"]).strftime('%d/%m/%Y') if semanas else "concluído"],
        ]),
        "",
        "### Por área",
        "",
        tabela_md(["Área", "Questões de prova", "Fábrica", "Autorais", "Meta", "Faltam"], [
            [a, v["incidencia"], v["fabrica"], v["autorais"], v["meta"], v["falta"]] for a, v in sorted(totais["areas"].items(), key=lambda kv: -kv[1]["incidencia"])
        ]),
        "",
        "## Fila de assuntos (os 40 que mais caem)",
        "",
        "Coluna *Fábrica*: flashcards automáticos que tocam o assunto (um flashcard pode ter dois assuntos). Coluna *Fontes*: questões do assunto cujo comentário tem tabela, classificação ou linha \"Na prova\", as melhores para autorais.",
        "",
        tabela_md(["#", "Assunto", "Área", "Questões de prova", "Nível", "Fábrica", "Autorais / meta", "Fontes", "Semana"], [
            [l["posicao"], l["assunto"], l["area"], l["incidencia"], NOME_NIVEL.get(l["nivel"], l["nivel"]), l["fabrica"], f"{l['autorais']} / {l['meta']}", l["fontesRicas"], semana_de.get(l["assunto"], "feito" if not l["falta"] else "sem fonte")]
            for l in topo
        ]),
        "",
        "## OrtoQuestões Simulados",
        "",
        "As questões dos OrtoQuestões Simulados (TEOT e TARO escritos pela casa, sem prova oficial) entram na fábrica e nos autorais como as de prova, com a marca `\"colecao\": \"simulados\"` no flashcard. Elas não contam para a incidência (que é só de prova oficial), mas seguem a mesma ordem: `cronograma.py proximo --simulados` abre o assunto de maior incidência que ainda tem questão de simulado sem autoral.",
        "",
        tabela_md(["", "Total"], [
            ["Questões de simulado com comentário", totais["simulados"]],
            ["Flashcards da fábrica tirados delas", totais["fabricaSimulados"]],
            ["Flashcards autorais tirados delas", totais["autoraisSimulados"]],
        ]),
        "",
        "Os assuntos com mais questões de simulado, na ordem da fila:",
        "",
        tabela_md(["#", "Assunto", "Área", "Questões de simulado", "Fábrica (simulados)", "Autorais (simulados)"], [
            [l["posicao"], l["assunto"], l["area"], l["simulados"], l["fabricaSimulados"], l["autoraisSimulados"]]
            for l in [l for l in linhas if l["simulados"]][:15]
        ]),
        "",
        f"## Plano das próximas {min(mostrar_semanas, len(semanas))} semanas",
        "",
    ]
    for s in semanas[:mostrar_semanas]:
        ini, fim = date.fromisoformat(s["inicio"]), date.fromisoformat(s["fim"])
        itens = "; ".join(f"{it['assunto']} ({it['quantidade']})" for it in s["itens"])
        partes.append(f"- **Semana {s['semana']}** ({ini.strftime('%d/%m')} a {fim.strftime('%d/%m')}), {s['total']} flashcards: {itens}.")
    partes += [
        "",
        "O plano completo, semana a semana, fica em `scripts/flashcards/cronograma.json`.",
        "",
        "## Rotina de cada lote",
        "",
        "1. `python3 scripts/flashcards/cronograma.py proximo` mostra o assunto da vez e as questões-fonte, com o comentário inteiro (`--simulados` para as questões dos OrtoQuestões Simulados).",
        "2. Escreva o lote (JSON) seguindo docs/flashcards/CRIACAO.md: uma ideia por flashcard, trecho literal do comentário, alternativas tiradas do próprio comentário ou da questão.",
        "3. `python3 scripts/flashcards/cronograma.py aplicar lote.json` valida, guarda os aprovados em `scripts/flashcards/autorais/` e republica o acervo. Os reprovados voltam com o motivo.",
        "4. `python3 scripts/flashcards/cronograma.py plano` atualiza esta página. Commit e PR, como nos comentários.",
        "",
    ]
    DOC.write_text("\n".join(partes), encoding="utf-8")


def resumir(linhas):
    """Totais. A fábrica é contada por flashcard único (um flashcard pode ter mais de um assunto)."""
    pub = F.ler_publicados()
    tot = {"fabrica": sum(len(c) for c in pub.values()), "autorais": 0, "meta": 0, "falta": 0, "areas": {},
           "fabricaSimulados": sum(1 for c in pub.values() for f in c if f.get("colecao") == F.COLECAO_SIMULADOS)}
    # questões de simulado contadas uma vez (uma questão pode estar em dois assuntos)
    _, questoes, comentarios = F.carregar_acervo()
    tot["simulados"] = sum(1 for k, q in questoes.items() if F.colecao_da_questao(q) and not q.get("anulada") and (comentarios.get(k) or {}).get("conceito"))
    tot["autoraisSimulados"] = sum(1 for c in A.ler_autorais().values() for f in c if f.get("colecao") == F.COLECAO_SIMULADOS)
    unicos = {}
    for slug, cartas in pub.items():
        if cartas:
            unicos[cartas[0]["area"]] = len(cartas)
    for l in linhas:
        for k in ("autorais", "meta", "falta"):
            tot[k] += l[k]
        a = tot["areas"].setdefault(l["area"], {"incidencia": 0, "fabrica": unicos.get(l["area"], 0), "autorais": 0, "meta": 0, "falta": 0})
        a["incidencia"] += l["incidencia"]
        for k in ("autorais", "meta", "falta"):
            a[k] += l[k]
    return tot


def cmd_plano(args) -> int:
    anterior = F.ler_json(PLANO, {})
    ritmo = args.ritmo or anterior.get("ritmo") or RITMO_PADRAO
    inicio = date.fromisoformat(args.inicio) if args.inicio else (date.fromisoformat(anterior["inicio"]) if anterior.get("inicio") else proxima_segunda(date.today()))
    linhas, _ = levantar()
    # o plano conta a partir da semana corrente: o que já foi feito sai do que falta
    hoje = date.today()
    semana_atual = max(0, (hoje - inicio).days // 7)
    semanas = planejar(linhas, ritmo, inicio + timedelta(weeks=semana_atual))
    for s in semanas:
        s["semana"] += semana_atual
    tot = resumir(linhas)
    escrever_doc(linhas, semanas, ritmo, inicio, args.semanas, tot)
    historico = anterior.get("historico", [])
    F.gravar_json(PLANO, {
        "geradoEm": hoje.isoformat(), "ritmo": ritmo, "inicio": inicio.isoformat(),
        "totais": {k: v for k, v in tot.items() if k != "areas"}, "assuntos": linhas, "semanas": semanas, "historico": historico,
    })
    print(f"{len(linhas)} assuntos · meta {tot['meta']} autorais · feitos {tot['autorais']} · faltam {tot['falta']} · {len(semanas)} semanas a {ritmo}/semana")
    print(f"Gravado: {DOC.relative_to(RAIZ)} e {PLANO.relative_to(RAIZ)}")
    return 0


def cmd_proximo(args) -> int:
    linhas, (areas, questoes, comentarios, pub, aut) = levantar()
    usados = Counter(f["questao"] for cs in aut.values() for f in cs)
    if args.assunto:
        alvo = next((l for l in linhas if l["assunto"].lower() == args.assunto.lower()), None)
        if not alvo:
            print("Assunto não encontrado na incidência.", file=sys.stderr)
            return 1
    elif args.simulados:
        # o assunto de maior incidência que ainda tem questão de simulado comentada sem autoral
        def sim_livre(l):
            return any(F.colecao_da_questao(q) and l["assunto"] in (q.get("subtemas") or []) and not usados[k]
                       and not q.get("anulada") and (comentarios.get(k) or {}).get("conceito") for k, q in questoes.items())
        alvo = next((l for l in linhas if l["simulados"] and sim_livre(l)), None)
        if not alvo:
            print("Todas as questões de simulado comentadas já têm autoral.")
            return 0
    else:
        alvo = next((l for l in linhas if l["falta"] > 0 and l["comComentario"]), None)
        if not alvo:
            print("Todas as metas estão cumpridas.")
            return 0
    candidatas = []
    for qid, q in questoes.items():
        if q.get("anulada") or q.get("duplicataDe") or alvo["assunto"] not in (q.get("subtemas") or []):
            continue
        if args.simulados and not F.colecao_da_questao(q):
            continue
        c = comentarios.get(qid)
        if not c or not c.get("conceito"):
            continue
        r = riqueza(c)
        oficial = q.get("prova") in ("TEOT", "TARO", "Ortopedia", "CET-PR", "TECOC", "ENARE")
        candidatas.append(((usados[qid], not r["tabela"], not r["classificacao"], not r["naProva"], not oficial, qid), qid, r))
    candidatas.sort()
    print(f"# Assunto: {alvo['assunto']} ({alvo['area']}) · posição {alvo['posicao']} · {alvo['incidencia']} questões de prova · autorais {alvo['autorais']}/{alvo['meta']} · {len(candidatas)} questões-fonte"
          + (f" (só OrtoQuestões Simulados: {alvo['autoraisSimulados']} autorais de simulado)" if args.simulados else ""))
    for _, qid, r in candidatas[args.pular:args.pular + args.n]:
        q, c = questoes[qid], comentarios[qid]
        certa = next((a["texto"] for a in q.get("alternativas") or [] if a["letra"] == q.get("gabarito")), "")
        marcas = ", ".join(k for k, v in r.items() if v) or "texto"
        print("=" * 12, qid, "|", "OrtoQuestões Simulados" if F.colecao_da_questao(q) else f"{q.get('prova')} {q.get('ano')}", "|", marcas, "| autorais já feitos:", usados[qid])
        print("ENUNCIADO:", F.limpar(q.get("enunciado", "")))
        for a in q.get("alternativas") or []:
            print(f"  {a['letra']}) {F.limpar(a['texto'])}")
        print("GABARITO:", q.get("gabarito"), "·", F.limpar(certa))
        if c.get("alerta"):
            print("ALERTA:", c["alerta"])
        print("COMENTÁRIO:\n" + A.texto_do_comentario(c))
    print("\n# Modelo do lote (lista JSON); campos e tipos em docs/flashcards/CRIACAO.md")
    print(json.dumps([{"questao": candidatas[0][1] if candidatas else "", "tipo": "Tabela", "frente": "", "resposta": "", "explicacao": "", "trecho": "", "opcoes": [], "certa": 0}], ensure_ascii=False, indent=1))
    return 0


def cmd_aplicar(args) -> int:
    dados = json.loads(Path(args.arquivo).read_text(encoding="utf-8"))
    lote = dados["flashcards"] if isinstance(dados, dict) else dados
    areas, questoes, comentarios = F.carregar_acervo()
    niveis = F.niveis_de_incidencia()
    aut = A.ler_autorais()
    pub = F.ler_publicados()
    frentes = {F.normalizar(re.sub(r"\{\{c\d::[^}]+\}\}", " ", f["frente"])) for cs in list(pub.values()) + list(aut.values()) for f in cs}
    contagem = Counter((f["questao"], f["tipo"]) for cs in aut.values() for f in cs)
    aprovados, reprovados = [], []
    for fc in lote:
        q = questoes.get(fc.get("questao", ""))
        c = comentarios.get(fc.get("questao", ""))
        erros = A.validar_autoral(fc, q, c, frentes)
        if erros:
            reprovados.append((fc.get("questao"), fc.get("frente", "")[:60], erros))
            continue
        contagem[(q["id"], fc["tipo"])] += 1
        novo = A.completar(fc, q, c, areas, niveis, contagem[(q["id"], fc["tipo"])])
        while any(f["id"] == novo["id"] for f in aut.get(q["_area"], [])):
            contagem[(q["id"], fc["tipo"])] += 1
            novo = A.completar(fc, q, c, areas, niveis, contagem[(q["id"], fc["tipo"])])
        aut.setdefault(q["_area"], []).append(novo)
        frentes.add(F.normalizar(re.sub(r"\{\{c\d::[^}]+\}\}", " ", novo["frente"])))
        aprovados.append(novo)
    for area, cartas in aut.items():
        if any(f["areaId"] == area for f in aprovados):
            A.gravar_autorais(area, cartas)
    if aprovados:
        F.publicar(pub)
        F.reconstruir_indice(areas, F.ler_publicados(com_autorais=True), F.ler_json(F.ESTADO, {}))
        plano = F.ler_json(PLANO, {})
        plano.setdefault("historico", []).append({"data": date.today().isoformat(), "aprovados": len(aprovados), "reprovados": len(reprovados), "assuntos": dict(Counter(f["assunto"] for f in aprovados))})
        F.gravar_json(PLANO, plano)
    print(f"{len(aprovados)} aprovados · {len(reprovados)} reprovados")
    for f in aprovados:
        print(f"  + {f['id']} [{f['tipo']}] {f['assunto']}")
    for qid, frente, erros in reprovados:
        print(f"  - {qid}: {frente!r}\n      " + "\n      ".join(erros))
    return 1 if reprovados else 0


def cmd_estado(_args) -> int:
    plano = F.ler_json(PLANO, None)
    if not plano:
        print("Rode primeiro: cronograma.py plano")
        return 1
    linhas, _ = levantar()
    tot = resumir(linhas)
    hoje = date.today()
    inicio = date.fromisoformat(plano["inicio"])
    seg = hoje - timedelta(days=hoje.weekday())
    feitos_semana = sum(h["aprovados"] for h in plano.get("historico", []) if date.fromisoformat(h["data"]) >= seg)
    print(f"Ritmo {plano['ritmo']}/semana desde {inicio.strftime('%d/%m/%Y')} · nesta semana: {feitos_semana}/{plano['ritmo']}")
    print(f"Autorais {tot['autorais']}/{tot['meta']} · faltam {tot['falta']} · fábrica {tot['fabrica']}")
    print(f"OrtoQuestões Simulados: {tot['simulados']} questões comentadas · fábrica {tot['fabricaSimulados']} · autorais {tot['autoraisSimulados']}")
    print("Próximos assuntos:")
    for l in [l for l in linhas if l["falta"]][:8]:
        print(f"  {l['posicao']:>3}. {l['assunto']} ({l['area']}): {l['autorais']}/{l['meta']} · {l['fontesRicas']} fontes ricas")
    return 0


def principal() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("plano")
    p.add_argument("--ritmo", type=int)
    p.add_argument("--inicio")
    p.add_argument("--semanas", type=int, default=12)
    p = sub.add_parser("proximo")
    p.add_argument("--n", type=int, default=6)
    p.add_argument("--pular", type=int, default=0)
    p.add_argument("--assunto")
    p.add_argument("--simulados", action="store_true", help="só questões dos OrtoQuestões Simulados")
    p = sub.add_parser("aplicar")
    p.add_argument("arquivo")
    sub.add_parser("estado")
    args = ap.parse_args()
    return {"plano": cmd_plano, "proximo": cmd_proximo, "aplicar": cmd_aplicar, "estado": cmd_estado}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(principal())
