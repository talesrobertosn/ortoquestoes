#!/usr/bin/env python3
"""Fábrica de flashcards do Torneio: transforma as questões reais do acervo e os
comentários delas em flashcards, em lotes, sem inventar conteúdo.

Tudo sai do acervo:
  - a frente, as alternativas e o gabarito vêm da questão;
  - a resposta é o texto da alternativa correta (ou o termo em negrito da linha
    "Na prova" do comentário, quando ele coincide com a alternativa correta);
  - a explicação é o campo `correta` do comentário (e a linha "Na prova").
Nada é escrito à mão aqui. Quando há dúvida (divergência com o gabarito,
gabarito provável, termo ambíguo), o flashcard vai para a QUARENTENA e não
entra na Batalha.

Tipos gerados (ver docs/flashcards/FORMATOS.md):
  - "Na prova": lacuna sobre o termo em negrito da linha "Na prova";
  - "Relâmpago": pergunta curta e direta da prova, com as alternativas da
    própria questão como opções do duelo;
  - "Imagem" e "Anatomia": iguais ao relâmpago, com a figura real da questão.

Incremental e idempotente: o estado (processados, hash da fonte, reprovados e
motivos) fica em scripts/flashcards/estado.json. Rodar de novo só refaz o que
mudou na questão ou no comentário. Comandos:

    python3 scripts/flashcards/fabrica.py gerar [--lote 50] [--area trauma] [--somente-imagem] [--todos]
    python3 scripts/flashcards/fabrica.py validar      # revalida tudo o que está publicado
    python3 scripts/flashcards/fabrica.py indice       # reconstrói public/flashcards/indice.json
    python3 scripts/flashcards/fabrica.py estado       # resumo: cobertura, por área, quarentena
    python3 scripts/flashcards/fabrica.py refazer      # descarta o estado e gera tudo de novo

Saída publicada: public/flashcards/<area>.json e public/flashcards/indice.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
TEMAS = RAIZ / "public" / "acervo" / "temas"
COMENTARIOS = RAIZ / "public" / "acervo" / "comentarios"
IMAGENS = RAIZ / "public" / "imagens"
INCIDENCIA = RAIZ / "src" / "dados" / "incidencia.json"
TAXONOMIA = RAIZ / "src" / "dados" / "taxonomia.json"
DEMO = RAIZ / "src" / "flashcards" / "dados" / "baralhoDemo.ts"
SAIDA = RAIZ / "public" / "flashcards"
ESTADO = Path(__file__).resolve().parent / "estado.json"

VERSAO_FABRICA = 4

# Limites de tamanho: a Batalha precisa caber no celular sem cortar texto.
FRENTE_MAX_BATALHA = 220
FRENTE_MAX_ESTUDO = 320
OPCAO_MAX = 72
NA_PROVA_MAX = 230
TERMO_MAX = 60

NEGACAO = re.compile(r"\b(incorret[ao]s?|exceto|errad[ao]s?|fals[ao]s?|não é|não está|não corresponde|não se aplica|menos)\b|\bNÃO\b", re.I)
# perguntas de "escolha a afirmação verdadeira": testam frases, não uma ideia (FORMATOS: não viram flashcard)
AFIRMACOES = re.compile(r"(\b(aponte|marque|indique|escolha)\b.{0,30}\balternativa\b|alternativa.{0,40}corret|correto afirmar|pode-se afirmar|assinale|alternativa correta|afirmativa|afirmação|é verdadeir|são verdadeir|considere as|analise as|julgue|quais estão corretas|estão corretas|está correta|é correta|são corretas)", re.I)
GENERICAS = re.compile(r"\b(todas as (anteriores|alternativas)|nenhuma das|todas estão|apenas as alternativas|as alternativas [a-e] e [a-e])\b", re.I)
TRAVESSAO = re.compile(r"[—–]")
NEGRITO = re.compile(r"\*\*(.+?)\*\*")


def normalizar(texto: str) -> str:
    t = unicodedata.normalize("NFD", texto.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9%]+", " ", t).strip()


def ler_json(caminho: Path, padrao=None):
    return json.loads(caminho.read_text(encoding="utf-8")) if caminho.exists() else padrao


def gravar_json(caminho: Path, dados) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def ids_do_demo() -> set[str]:
    """Questões que já têm flashcard feito à mão no baralho de demonstração."""
    if not DEMO.exists():
        return set()
    return set(re.findall(r'"questao":\s*"([^"]+)"', DEMO.read_text(encoding="utf-8")))


def niveis_de_incidencia() -> dict[str, int]:
    """Nível de incidência (1 a 4) de cada assunto, calculado por scripts/gerar_incidencia.py."""
    inc = ler_json(INCIDENCIA, {"areas": []})
    return {f["nome"]: f["nivel"] for a in inc["areas"] for f in a["focos"]}


RARIDADE_POR_NIVEL = {4: "lendaria", 3: "epica", 2: "rara", 1: "comum"}

# Coleção de origem. As questões dos OrtoQuestões Simulados (TEOT e TARO feitos pela casa)
# entram na fábrica e nos autorais como as de prova, mas o flashcard leva a marca
# "colecao": "simulados", para o app e o cronograma separarem as duas fontes. A regra
# é a mesma de src/dados/acervo.ts (simuladoDeOrtopedia): simulado, sem prova e sem
# área própria (o Fellowship Quadril tem prova e área, e fica de fora).
COLECAO_SIMULADOS = "simulados"


def colecao_da_questao(q: dict) -> str | None:
    if q.get("simulado") and not q.get("prova") and (q.get("area") or "base") == "base":
        return COLECAO_SIMULADOS
    return None


def hash_fonte(q: dict, c: dict) -> str:
    base = json.dumps([q.get("enunciado"), q.get("alternativas"), q.get("gabarito"), q.get("imagens"), c.get("correta"), c.get("conceito"), c.get("alerta"), c.get("provavel")], ensure_ascii=False, sort_keys=True)
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:12]


def limpar(texto: str) -> str:
    """Texto limpo para o flashcard: sem links, sem espaços sobrando; mantém o **negrito**."""
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", texto or "")
    t = re.sub(r"\s+", " ", t).strip()
    return t


LETRA_INICIAL = re.compile(r"^\*\*\s*(?:Correta|Resposta|Gabarito)?\s*:?\s*\(?[A-E]\)?\s*[:.)\-]\s*", re.I)
CORRETA_LETRA_PAREN = re.compile(r"^\*\*\s*(?:Correta|Resposta|Gabarito)\s*:?\s*[A-E]\s*\(([^)]+)\)\s*\.?\s*\*\*", re.I)
CORRETA_SO_LETRA = re.compile(r"^\*\*\s*(?:Correta|Resposta|Gabarito)\s*:?\s*[A-E]\s*\.?\s*\*\*\s*", re.I)
CITA_ALTERNATIVA = re.compile(r"\b(alternativa|opção)\s+[A-E]\b", re.I)


def explicar(c: dict, resposta: str) -> str:
    """Explicação do verso a partir do comentário, sem as letras da questão (no
    flashcard as alternativas são embaralhadas). Se o campo `correta` só repete
    a resposta, completa com o primeiro parágrafo do conceito."""
    t = limpar(c.get("correta", ""))
    t = CORRETA_LETRA_PAREN.sub(lambda m: "**" + m.group(1)[0].upper() + m.group(1)[1:] + ".**", t)
    t = CORRETA_SO_LETRA.sub("", t)
    t = LETRA_INICIAL.sub("**", t).replace("****", "")
    t = re.sub(r"\*\*\s*-\s*", "** ", t).replace(".** -", ".**")
    frases = [f for f in re.split(r"(?<=[.!?])\s+", t) if f and not CITA_ALTERNATIVA.search(f)]
    # até três frases e cerca de 380 caracteres (FORMATOS: explicação curta)
    curtas: list[str] = []
    for f in frases:
        if len(curtas) >= 3 or (curtas and len(" ".join(curtas + [f])) > 380):
            break
        curtas.append(f)
    t = " ".join(curtas).strip()
    if t.startswith("**") and len(t) > 3 and t[2].islower():
        t = "**" + t[2].upper() + t[3:]
    resto = normalizar(NEGRITO.sub("", t))
    if len(resto) < 50:
        for par in (c.get("conceito") or "").split("\n"):
            par = limpar(par)
            if not par or par.startswith("**Na prova") or CITA_ALTERNATIVA.search(par) or par.startswith("|") or par.startswith("#"):
                continue
            if 40 <= len(par) <= 360:
                t = (t + " " + par).strip()
                break
    return t


def linha_na_prova(conceito: str) -> str | None:
    m = re.search(r"\*\*Na prova\*\*\s*:?\s*(.+)", conceito or "")
    if not m:
        return None
    linha = m.group(1).strip().split("\n")[0].strip()
    return limpar(linha)


def dificuldade_estimada(frente: str, tipo: str, n_opcoes: int) -> int:
    """Estimativa provisória (o acervo ainda não guarda o índice de acerto por
    questão): frase curta de recordação = fácil; figura ou anatomia = difícil;
    o resto, moderada. Será trocada pelo acerto real quando houver respostas."""
    if tipo in ("Imagem", "Anatomia"):
        return 3
    if len(frente) <= 90 and tipo == "Na prova":
        return 1
    if len(frente) >= 170 or n_opcoes >= 5:
        return 3
    return 2


def escolher_opcoes(q: dict, c: dict, semente: str) -> tuple[list[str], int] | None:
    """Correta + até 3 incorretas da própria questão, escolhidas de forma
    estável (hash). Prefere as incorretas que o comentário analisa."""
    alts = [a for a in q.get("alternativas") or [] if a.get("texto")]
    gab = q.get("gabarito")
    certa = next((a for a in alts if a["letra"] == gab), None)
    if not certa:
        return None
    analisadas = set((c.get("incorretas") or {}).keys())
    erradas = [a for a in alts if a["letra"] != gab]
    erradas.sort(key=lambda a: (a["letra"] not in analisadas, hashlib.md5((semente + a["letra"]).encode()).hexdigest()))
    escolhidas = [certa] + erradas[:3]
    escolhidas.sort(key=lambda a: a["letra"])
    textos = [limpar(a["texto"]).rstrip(".;").strip() for a in escolhidas]
    return textos, next(i for i, a in enumerate(escolhidas) if a["letra"] == gab)


def montar(q: dict, c: dict, area: dict, niveis: dict[str, int]) -> tuple[dict | None, list[str]]:
    """Gera no máximo um flashcard por questão. Devolve (flashcard, motivos de
    quarentena). Sem flashcard e com motivos = reprovado."""
    motivos: list[str] = []
    if q.get("anulada"):
        return None, ["questão anulada"]
    if q.get("duplicataDe"):
        return None, ["duplicata de " + q["duplicataDe"]]
    if q.get("tipo") == "dissertativa":
        return None, ["questão dissertativa"]
    if q.get("figuraPendente"):
        return None, ["figura pendente"]
    if not c or not c.get("correta"):
        return None, ["sem comentário"]
    if not q.get("gabarito"):
        return None, ["sem gabarito oficial"]
    if c.get("provavel"):
        motivos.append("gabarito provável, não oficial")
    if c.get("alerta"):
        motivos.append("comentário aponta divergência com o gabarito")

    enunciado = limpar(q.get("enunciado", ""))
    imagens = q.get("imagens") or []
    if NEGACAO.search(enunciado):
        return None, ["pergunta com negação (pede a incorreta ou a exceção)"]
    if AFIRMACOES.search(enunciado):
        return None, ["pede a afirmação correta (várias ideias numa questão)"]
    opcoes = escolher_opcoes(q, c, q["id"])
    if not opcoes:
        return None, ["gabarito sem alternativa correspondente"]
    textos, certa = opcoes

    subtemas = q.get("subtemas") or []
    nivel = max([niveis.get(s, 1) for s in subtemas] or [1])
    assunto = subtemas[0] if subtemas else area["nome"]
    anatomia = bool(q.get("simulado")) and "anatom" in (q.get("prova") or "").lower() + " " + " ".join(subtemas).lower()

    # 1) "Na prova": lacuna no termo em negrito, quando ele é a resposta da questão
    tipo, frente, resposta = None, None, None
    np = linha_na_prova(c.get("conceito", ""))
    if np and len(np) <= NA_PROVA_MAX and not imagens:
        termos = NEGRITO.findall(np)
        certo_norm = normalizar(textos[certa])
        if len(termos) == 1 and len(termos[0]) <= TERMO_MAX:
            termo = termos[0]
            tn = normalizar(termo)
            if tn and (tn == certo_norm or (len(tn) >= 4 and (tn in certo_norm or certo_norm in tn))):
                frente = np.replace(f"**{termo}**", "{{c1::" + termo + "}}", 1)
                frente = frente[0].upper() + frente[1:]
                tipo, resposta = "Na prova", termo
    # 2) Relâmpago / Imagem / Anatomia: a própria pergunta, curta e direta
    if not tipo:
        if len(enunciado) > FRENTE_MAX_ESTUDO:
            return None, ["pergunta longa demais para flashcard (caso clínico: fica na questão)"]
        tipo = "Anatomia" if (imagens and anatomia) else "Imagem" if imagens else "Relâmpago"
        frente, resposta = enunciado, textos[certa]

    batalha = True
    if any(len(t) > OPCAO_MAX for t in textos):
        batalha = False
    if any(GENERICAS.search(t) for t in textos):
        batalha = False
    if tipo != "Na prova" and len(frente) > FRENTE_MAX_BATALHA:
        batalha = False

    explicacao = explicar(c, resposta)
    if np and tipo != "Na prova":
        explicacao = f"{explicacao} **Na prova:** {np}"

    fc = {
        "id": f"fc-{q['id']}-{'np' if tipo == 'Na prova' else 'q'}",
        "questao": q["id"],
        "area": area["nome"],
        "areaId": area["slug"],
        "assunto": assunto,
        "subtemas": subtemas,
        "tipo": tipo,
        "raridade": RARIDADE_POR_NIVEL.get(nivel, "comum"),
        "dificuldade": dificuldade_estimada(frente, tipo, len(q.get("alternativas") or [])),
        "frente": frente,
        "resposta": resposta,
        "explicacao": explicacao,
        "opcoes": textos,
        "certa": certa,
        "batalha": batalha,
        "prova": q.get("prova"),
        "ano": q.get("ano"),
        "fonte": hash_fonte(q, c),
    }
    if colecao_da_questao(q):
        fc["colecao"] = colecao_da_questao(q)
    if imagens:
        im = imagens[0]
        fc["imagem"] = {"arquivo": im["arquivo"], "legenda": im.get("legenda") or ""}
        if im.get("largura") and im.get("altura"):
            fc["imagem"]["largura"], fc["imagem"]["altura"] = im["largura"], im["altura"]
    return fc, motivos


def validar(fc: dict, q: dict) -> list[str]:
    """Checagens automáticas de integridade. Qualquer falha = quarentena."""
    erros = []
    if not q:
        return ["questão de origem não existe"]
    certa_q = next((a for a in q["alternativas"] if a["letra"] == q.get("gabarito")), None)
    if not certa_q or normalizar(fc["opcoes"][fc["certa"]]) != normalizar(limpar(certa_q["texto"]).rstrip(".;").strip()):
        erros.append("gabarito não preservado")
    norm = [normalizar(o) for o in fc["opcoes"]]
    if len(set(norm)) != len(norm):
        erros.append("alternativas repetidas")
    if len(fc["opcoes"]) < 2:
        erros.append("menos de duas alternativas")
    if any(not o.strip() for o in fc["opcoes"]):
        erros.append("alternativa vazia")
    frente_sem_lacuna = re.sub(r"\{\{c\d::[^}]+\}\}", " ", fc["frente"])
    if len(normalizar(fc["resposta"])) >= 4 and normalizar(fc["resposta"]) in normalizar(frente_sem_lacuna):
        erros.append("a frente revela a resposta")
    if len(normalizar(frente_sem_lacuna)) < 18:
        erros.append("frente sem contexto")
    if fc["tipo"] != "Na prova" and "imagem" not in fc and len(frente_sem_lacuna) < 50 and len(fc["resposta"]) > len(frente_sem_lacuna):
        erros.append("enunciado incompleto: a resposta é uma frase maior que a pergunta")
    if fc["tipo"] == "Na prova" and fc["frente"].count("{{c1::") != 1:
        erros.append("lacuna ambígua")
    if "imagem" in fc and not (IMAGENS / fc["imagem"]["arquivo"]).exists():
        erros.append("imagem não encontrada")
    for campo in ("frente", "resposta", "explicacao"):
        if TRAVESSAO.search(fc[campo]):
            erros.append(f"travessão em {campo}")
        if "<" in fc[campo] and re.search(r"<[a-z/]", fc[campo]):
            erros.append(f"HTML em {campo}")
    if not fc["explicacao"] or len(fc["explicacao"]) < 20:
        erros.append("explicação ausente")
    return erros


def carregar_acervo():
    tax = ler_json(TAXONOMIA, {"temas": []})
    areas = {t["slug"]: {"slug": t["slug"], "nome": t["nome"]} for t in tax["temas"]}
    questoes, comentarios = {}, {}
    for arq in sorted(TEMAS.glob("*.json")):
        dados = ler_json(arq)
        slug = arq.stem
        areas.setdefault(slug, {"slug": slug, "nome": dados.get("tema", slug)})
        coms = ler_json(COMENTARIOS / arq.name, {})
        for q in dados["questoes"]:
            q["_area"] = slug
            questoes[q["id"]] = q
            if q["id"] in coms:
                comentarios[q["id"]] = coms[q["id"]]
    return areas, questoes, comentarios


def ordem_de_producao(questoes: dict, niveis: dict[str, int]) -> list[str]:
    """Primeiro os assuntos que mais caem (nível 4), com imagem na frente dentro
    do mesmo nível; depois o resto do acervo, área por área."""
    def chave(qid):
        q = questoes[qid]
        nivel = max([niveis.get(s, 1) for s in q.get("subtemas") or []] or [1])
        oficial = q.get("prova") in ("TEOT", "TARO", "TEOT/TARO")
        return (-nivel, not oficial, not q.get("imagens"), q["_area"], qid)
    return sorted(questoes, key=chave)


def colecoes_do_acervo() -> dict[str, str]:
    """id da questão -> coleção de origem, só para as que têm coleção (hoje, os Simulados)."""
    out: dict[str, str] = {}
    for arq in sorted(TEMAS.glob("*.json")):
        for q in ler_json(arq)["questoes"]:
            c = colecao_da_questao(q)
            if c:
                out[q["id"]] = c
    return out


def publicar(cartas_por_area: dict[str, list[dict]]) -> None:
    """Grava os arquivos das áreas: os flashcards da fábrica mais os autorais
    (scripts/flashcards/autorais/), que a fábrica nunca altera."""
    from autorais import ler_autorais
    SAIDA.mkdir(parents=True, exist_ok=True)
    autorais = ler_autorais()
    colecoes = colecoes_do_acervo()
    for area in sorted(set(cartas_por_area) | set(autorais)):
        cartas = [f for f in cartas_por_area.get(area, []) if f.get("origem") != "autoral"] + autorais.get(area, [])
        for f in cartas:
            # marca (ou desmarca) a coleção de origem também nos flashcards gerados antes desta regra
            if colecoes.get(f["questao"]):
                f["colecao"] = colecoes[f["questao"]]
            else:
                f.pop("colecao", None)
        cartas.sort(key=lambda f: f["id"])
        gravar_json(SAIDA / f"{area}.json", {"versao": VERSAO_FABRICA, "area": area, "flashcards": cartas})


def ler_publicados(com_autorais: bool = False) -> dict[str, list[dict]]:
    """Flashcards publicados. Por padrão, só os da fábrica (os autorais voltam na hora de publicar)."""
    pub: dict[str, list[dict]] = {}
    for arq in sorted(SAIDA.glob("*.json")):
        if arq.name == "indice.json":
            continue
        pub[arq.stem] = [f for f in ler_json(arq)["flashcards"] if com_autorais or f.get("origem") != "autoral"]
    return pub


def reconstruir_indice(areas: dict, pub: dict[str, list[dict]], estado: dict) -> dict:
    por_area = {}
    for slug, cartas in sorted(pub.items()):
        if not cartas:
            continue
        sub: dict[str, int] = {}
        for f in cartas:
            sub[f["assunto"]] = sub.get(f["assunto"], 0) + 1
        por_area[slug] = {
            "nome": areas.get(slug, {}).get("nome", slug),
            "arquivo": f"{slug}.json",
            "total": len(cartas),
            "batalha": sum(1 for f in cartas if f["batalha"]),
            "comImagem": sum(1 for f in cartas if "imagem" in f),
            "simulados": sum(1 for f in cartas if f.get("colecao") == COLECAO_SIMULADOS),
            "tipos": {t: sum(1 for f in cartas if f["tipo"] == t) for t in sorted({f["tipo"] for f in cartas})},
            "assuntos": dict(sorted(sub.items(), key=lambda kv: -kv[1])),
        }
    todos = [f for c in pub.values() for f in c]
    indice = {
        "versao": VERSAO_FABRICA,
        "geradoEm": date.today().isoformat(),
        "total": len(todos),
        "batalha": sum(1 for f in todos if f["batalha"]),
        "soEstudo": sum(1 for f in todos if not f["batalha"]),
        "comImagem": sum(1 for f in todos if "imagem" in f),
        "simulados": sum(1 for f in todos if f.get("colecao") == COLECAO_SIMULADOS),
        "autorais": sum(1 for f in todos if f.get("origem") == "autoral"),
        "quarentena": sum(1 for v in estado.get("processados", {}).values() if v["status"] == "quarentena"),
        "areas": por_area,
        "assinatura": hashlib.sha1("".join(sorted(f["id"] + f["fonte"] for f in todos)).encode()).hexdigest()[:12],
    }
    gravar_json(SAIDA / "indice.json", indice)
    return indice


def cmd_gerar(args) -> int:
    areas, questoes, comentarios = carregar_acervo()
    niveis = niveis_de_incidencia()
    demo = ids_do_demo()
    estado = ler_json(ESTADO, {"versao": VERSAO_FABRICA, "lotes": 0, "processados": {}})
    pub = ler_publicados()
    por_id = {f["questao"]: (slug, f) for slug, cs in pub.items() for f in cs}

    pendentes = []
    for qid in ordem_de_producao(questoes, niveis):
        q = questoes[qid]
        if qid in demo:
            continue
        if args.area and q["_area"] != args.area:
            continue
        if args.somente_imagem and not q.get("imagens"):
            continue
        h = hash_fonte(q, comentarios.get(qid, {}))
        feito = estado["processados"].get(qid)
        if feito and feito.get("fonte") == h and feito.get("fabrica") == VERSAO_FABRICA:
            continue
        pendentes.append(qid)

    if not pendentes:
        print("Nada pendente: o acervo está todo processado.")
        publicar(pub)
        reconstruir_indice(areas, ler_publicados(com_autorais=True), estado)
        return 0

    lotes = [pendentes[i:i + args.lote] for i in range(0, len(pendentes), args.lote)]
    if not args.todos:
        lotes = lotes[:1]
    for lote in lotes:
        aprovados = quarentena = reprovados = 0
        for qid in lote:
            q, c = questoes[qid], comentarios.get(qid, {})
            fc, motivos = montar(q, c, areas[q["_area"]], niveis)
            registro = {"fonte": hash_fonte(q, c), "fabrica": VERSAO_FABRICA}
            # tira a versão anterior publicada (a questão mudou ou a regra mudou)
            if qid in por_id:
                slug, antigo = por_id.pop(qid)
                pub[slug] = [f for f in pub[slug] if f["id"] != antigo["id"]]
            if not fc:
                registro.update(status="reprovado", motivos=motivos)
                reprovados += 1
            else:
                erros = validar(fc, q) + motivos
                if erros:
                    registro.update(status="quarentena", motivos=erros, id=fc["id"])
                    quarentena += 1
                else:
                    registro.update(status="aprovado", id=fc["id"], batalha=fc["batalha"])
                    pub.setdefault(q["_area"], []).append(fc)
                    por_id[qid] = (q["_area"], fc)
                    aprovados += 1
            estado["processados"][qid] = registro
        # duplicatas óbvias: a mesma frente em dois flashcards fica só no primeiro
        vistas: dict[str, str] = {}
        for slug in pub:
            mantidos = []
            for f in sorted(pub[slug], key=lambda f: f["id"]):
                chave = normalizar(f["frente"])
                if chave in vistas and vistas[chave] != f["id"]:
                    estado["processados"][f["questao"]].update(status="quarentena", motivos=["duplicata de " + vistas[chave]])
                    aprovados -= 1; quarentena += 1
                    continue
                vistas[chave] = f["id"]
                mantidos.append(f)
            pub[slug] = mantidos
        estado["lotes"] += 1
        estado["ultimoLote"] = {"numero": estado["lotes"], "data": date.today().isoformat(), "tamanho": len(lote), "aprovados": aprovados, "quarentena": quarentena, "reprovados": reprovados}
        publicar(pub)
        gravar_json(ESTADO, estado)
        print(f"Lote {estado['lotes']}: {len(lote)} questões · {aprovados} publicados · {quarentena} em quarentena · {reprovados} sem flashcard")
    indice = reconstruir_indice(areas, ler_publicados(com_autorais=True), estado)
    print(f"Publicados: {indice['total']} flashcards ({indice['batalha']} na Batalha, {indice['comImagem']} com imagem, {indice['quarentena']} em quarentena)")
    return 0


def cmd_validar(_args) -> int:
    from autorais import validar_autoral
    _, questoes, comentarios = carregar_acervo()
    pub = ler_publicados(com_autorais=True)
    falhas = 0
    for cartas in pub.values():
        for f in cartas:
            if f.get("origem") == "autoral":
                erros = validar_autoral(f, questoes.get(f["questao"]), comentarios.get(f["questao"]))
            else:
                erros = validar(f, questoes.get(f["questao"]))
            if erros:
                falhas += 1
                print(f"{f['id']}: {'; '.join(erros)}")
    total = sum(len(c) for c in pub.values())
    print(f"{total} flashcards publicados conferidos, {falhas} com problema.")
    return 1 if falhas else 0


def cmd_indice(_args) -> int:
    areas, _, _ = carregar_acervo()
    publicar(ler_publicados())
    i = reconstruir_indice(areas, ler_publicados(com_autorais=True), ler_json(ESTADO, {}))
    print(f"indice.json: {i['total']} flashcards em {len(i['areas'])} áreas")
    return 0


def cmd_estado(_args) -> int:
    estado = ler_json(ESTADO, {"processados": {}})
    from collections import Counter
    st = Counter(v["status"] for v in estado["processados"].values())
    motivos = Counter(m for v in estado["processados"].values() if v["status"] != "aprovado" for m in v.get("motivos", []))
    print(f"Lotes: {estado.get('lotes', 0)} · último: {estado.get('ultimoLote')}")
    print("Situação:", dict(st))
    print("Motivos mais comuns fora da publicação:")
    for m, n in motivos.most_common(12):
        print(f"  {n:5}  {m}")
    indice = ler_json(SAIDA / "indice.json", None)
    if indice:
        print(f"Publicados: {indice['total']} · Batalha {indice['batalha']} · só Estudo {indice['soEstudo']} · com imagem {indice['comImagem']}")
        for slug, a in indice["areas"].items():
            print(f"  {a['nome']:<34} {a['total']:5} ({a['batalha']} Batalha, {a['comImagem']} imagem)")
    return 0


def cmd_refazer(args) -> int:
    if ESTADO.exists():
        ESTADO.unlink()
    for arq in SAIDA.glob("*.json"):
        arq.unlink()
    args.todos = True
    return cmd_gerar(args)


def principal() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="comando", required=True)
    for nome in ("gerar", "refazer"):
        g = sub.add_parser(nome)
        g.add_argument("--lote", type=int, default=50)
        g.add_argument("--area")
        g.add_argument("--somente-imagem", action="store_true")
        g.add_argument("--todos", action="store_true", help="processa todos os lotes pendentes, um depois do outro")
    sub.add_parser("validar"); sub.add_parser("indice"); sub.add_parser("estado")
    args = p.parse_args()
    return {"gerar": cmd_gerar, "validar": cmd_validar, "indice": cmd_indice, "estado": cmd_estado, "refazer": cmd_refazer}[args.comando](args)


if __name__ == "__main__":
    sys.exit(principal())
