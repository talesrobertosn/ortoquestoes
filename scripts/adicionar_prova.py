#!/usr/bin/env python3
"""Acrescenta ao acervo as questões de uma prova oficial que ainda não estão nele.

Dois passos:

1. extrair: lê o caderno, separa as questões que não casam com o acervo
   (mesmo critério de casar_prova.py) e grava em relatorios/novas/<prova>-<ano>.json,
   com enunciado, alternativas, página e a referência bibliográfica do caderno.

       python3 scripts/adicionar_prova.py extrair CADERNO.pdf --prova TARO --ano 2008
       python3 scripts/adicionar_prova.py extrair CADERNO.pdf --prova TARO --ano 2006 --certo-errado

   --certo-errado: cadernos antigos cobravam afirmações de "Certo / Errado /
   Não sei". A afirmação vira o enunciado e as alternativas passam a ser
   "Certo" e "Errado"; o conteúdo não muda.

2. aplicar: recebe um lote com, para cada número, o tema, a resposta e o
   comentário, e grava questão e comentário no acervo.

       python3 scripts/adicionar_prova.py aplicar LOTE.json [--seco]

   Formato do lote:
       {"prova": "TARO", "ano": 2008, "arquivo": "taro2008.pdf",
        "gabaritoOficial": false,
        "itens": [{"numero": 1, "tema": "trauma", "resposta": "B",
                   "conceito": "...", "correta": "...", "incorretas": {"A": "...", ...}}]}

   Nas provas de cirurgia da mão e de R4 (ENARE, coluna), acrescente "area" no lote
   ("cirurgia-mao", "r4-enare" ou "r4-coluna"): as questões ficam fora do treino
   padrão (TEOT e TARO) e do cronograma.

   Só "numero", "tema" e "resposta" bastam: a questão entra com a resposta e
   o comentário fica para depois (o site avisa que está em preparação).

   Sem gabarito oficial (gabaritoOficial false), a questão entra sem gabarito
   e a resposta vai no comentário como "provavel": o site mostra a resposta
   pela bibliografia, com aviso, e a questão não conta no desempenho.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from casar_prova import CASADA, REVISAR, carregar_acervo, ler_questoes, melhor_par, sem_fonte  # noqa: E402
from comum import DIR_ACERVO, DIR_TEMAS, RAIZ  # noqa: E402
from etiquetas import etiquetar  # noqa: E402

DIR_NOVAS = RAIZ / "relatorios" / "novas"
DIR_COMENTARIOS = DIR_ACERVO / "comentarios"
FIGURA = re.compile(r"(?i)\b(figura|imagem|radiografia (a seguir|abaixo)|ilustra|seta|foto)")
ALERTA_SEM_GABARITO = (
    "Não localizamos o gabarito oficial desta prova, por isso esta questão não conta no seu "
    "desempenho. A resposta indicada abaixo é a sustentada pela bibliografia."
)


def ler_certo_errado(pdf: Path) -> list[dict]:
    """Afirmações numeradas seguidas de "( ) Certo ( ) Errado ( ) Não sei"."""
    questoes: list[dict] = []
    atual: dict | None = None
    esperado = 1
    for numero_pagina, pagina in enumerate(pymupdf.open(pdf), 1):
        for linha in pagina.get_text().splitlines():
            texto = linha.strip()
            if re.match(r"(?i)^refer[eê]ncias", texto) and esperado > 20:
                return questoes + ([atual] if atual else [])
            m = re.match(r"^(\d{1,3})\.\s*(.*)$", texto)
            if m and int(m.group(1)) == esperado:
                if atual:
                    questoes.append(atual)
                atual = {"numero": esperado, "pagina": numero_pagina, "enunciado": m.group(2).strip(), "alternativas": ["Certo", "Errado"]}
                esperado += 1
                continue
            if atual is None or not texto or re.match(r"^\(\s*\)", texto) or re.fullmatch(r"\d{1,3}", texto):
                continue
            if texto.isupper() and len(texto) < 40:  # títulos de seção (BÁSICO, TRAUMA...)
                continue
            if re.match(r"(?i)^assinale a alternativa", texto):
                continue
            atual["enunciado"] = (atual["enunciado"] + " " + texto).strip()
    if atual:
        questoes.append(atual)
    return questoes


def ler_referencias(pdf: Path) -> dict[int, str]:
    """Referência bibliográfica de cada questão, na lista do fim do caderno."""
    linhas = [l.strip() for p in pymupdf.open(pdf) for l in p.get_text().splitlines()]
    # O título da lista fica no fim; a capa também fala em "referências", então vale o último.
    titulos = [i for i, l in enumerate(linhas) if re.match(r"(?i)^refer[eê]ncias", l) and len(l) < 60]
    inicio = titulos[-1] if titulos else None
    if inicio is None:
        return {}
    refs: dict[int, str] = {}
    atual = None
    for linha in linhas[inicio + 1:]:
        m = re.match(r"^(\d{1,3})\.?\s*(.*)$", linha)
        if m and (atual is None or int(m.group(1)) == atual + 1):
            atual = int(m.group(1))
            refs[atual] = m.group(2).strip()
        elif atual is not None and linha:
            refs[atual] = (refs[atual] + " " + linha).strip()
    return {n: re.sub(r"\s+", " ", r).strip() for n, r in refs.items() if r}


def extrair(args: argparse.Namespace) -> int:
    questoes = ler_certo_errado(args.pdf) if args.certo_errado else ler_questoes(args.pdf)
    referencias = ler_referencias(args.pdf)
    acervo, _ = carregar_acervo()
    novas, repetidas = [], []
    for q in questoes:
        q["enunciado"] = sem_fonte(q["enunciado"])
        r, item = melhor_par(q, acervo)
        if item and r >= REVISAR:
            repetidas.append({"numero": q["numero"], "id": item["q"]["id"], "semelhanca": round(r, 2)})
            if r >= CASADA or not args.incluir_parecidas:
                continue
        q["referencia"] = referencias.get(q["numero"], "")
        q["figura"] = bool(FIGURA.search(q["enunciado"]))
        novas.append(q)
    DIR_NOVAS.mkdir(parents=True, exist_ok=True)
    saida = DIR_NOVAS / f"{args.prova.lower()}-{args.ano}.json"
    saida.write_text(json.dumps({"prova": args.prova, "ano": args.ano, "arquivo": args.nome or args.pdf.name,
                                 "questoes": novas, "ja_no_acervo": repetidas}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{args.prova} {args.ano}: {len(questoes)} lidas, {len(novas)} novas, {len(repetidas)} já no acervo -> {saida.relative_to(RAIZ)}")
    return 0


def proximo_id(slug: str, dados: dict) -> str:
    numeros = [int(q["id"].rsplit("-", 1)[1]) for q in dados["questoes"] if re.search(r"-\d+$", q["id"])]
    return f"{slug}-{(max(numeros) + 1 if numeros else 1):04d}"


def aplicar(args: argparse.Namespace) -> int:
    lote = json.loads(args.lote.read_text(encoding="utf-8"))
    extraido = json.loads((DIR_NOVAS / f"{lote['prova'].lower()}-{lote['ano']}.json").read_text(encoding="utf-8"))
    por_numero = {q["numero"]: q for q in extraido["questoes"]}
    oficial = bool(lote.get("gabaritoOficial"))
    if lote.get("area") not in (None, "cirurgia-mao", "r4-enare", "r4-coluna"):
        print(f"Área desconhecida: {lote['area']!r} (use cirurgia-mao, r4-enare, r4-coluna ou deixe sem)")
        return 1
    temas, comentarios, erros = {}, {}, []
    agora = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    criadas = []
    for item in lote["itens"]:
        q = por_numero.get(item["numero"])
        if not q:
            erros.append(f"{item['numero']}: não está entre as novas extraídas")
            continue
        slug = item["tema"]
        if slug not in temas:
            temas[slug] = json.loads((DIR_TEMAS / f"{slug}.json").read_text(encoding="utf-8"))
            comentarios[slug] = json.loads((DIR_COMENTARIOS / f"{slug}.json").read_text(encoding="utf-8"))
        letras = "ABCDE"[: len(q["alternativas"])]
        resposta = item["resposta"]
        incorretas = item.get("incorretas") or {}
        if resposta not in letras:
            erros.append(f"{item['numero']}: resposta {resposta} fora de {letras}")
            continue
        faltam = set(letras) - {resposta} - set(incorretas)
        # Sem "correta", a questão entra só com a resposta; o comentário vem depois.
        so_resposta = not str(item.get("correta") or "").strip()
        if not so_resposta and (faltam or resposta in incorretas):
            erros.append(f"{item['numero']}: explicação das erradas incompleta ({sorted(faltam)})")
            continue
        dados = temas[slug]
        qid = proximo_id(slug, dados)
        certa = q["alternativas"][letras.index(resposta)]
        questao = {
            "id": qid, "tema": dados["tema"],
            "subtemas": etiquetar(slug, q["enunciado"], certa, item.get("conceito", "")),
            "prova": lote["prova"], "ano": lote["ano"], "dificuldade": None,
            "enunciado": q["enunciado"], "imagens": [],
            "alternativas": [{"letra": l, "texto": t} for l, t in zip(letras, q["alternativas"])],
            "gabarito": resposta if oficial else None,
            "comentario": None, "comentariosComunidade": [],
            "referencias": [q["referencia"]] if q.get("referencia") else [],
            **({"area": lote["area"]} if lote.get("area") else {}),
            "anulada": False, "figuraPendente": bool(q.get("figura")) and not item.get("semFigura"),
            "revisado": False, "subtemasPendentes": False,
            "origem": {"arquivo": lote.get("arquivo") or extraido["arquivo"], "pagina": q["pagina"], "numeroOriginal": q["numero"]},
        }
        comentario = {
            "conceito": item.get("conceito") or None, "correta": item.get("correta") or "", "incorretas": incorretas,
            "referencias": [q["referencia"]] if q.get("referencia") else [],
            "geradoEm": agora, "conferido": False,
        }
        if so_resposta:
            comentario.update(conceito=None, geradoEm=None)
        if not oficial:
            comentario = {"alerta": ALERTA_SEM_GABARITO, "provavel": resposta, **comentario}
        dados["questoes"].append(questao)
        # Com gabarito oficial e sem texto, não há o que guardar no comentário.
        if not (oficial and so_resposta):
            comentarios[slug][qid] = comentario
        criadas.append((item["numero"], qid))
    if erros:
        print("Lote recusado:\n  " + "\n  ".join(erros))
        return 1
    if not args.seco:
        for slug, dados in temas.items():
            (DIR_TEMAS / f"{slug}.json").write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            (DIR_COMENTARIOS / f"{slug}.json").write_text(json.dumps(comentarios[slug], ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{lote['prova']} {lote['ano']}: {len(criadas)} questões {'conferidas' if args.seco else 'gravadas'}"
          f" ({', '.join(f'{n}->{i}' for n, i in criadas[:4])}{'...' if len(criadas) > 4 else ''})")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("extrair")
    e.add_argument("pdf", type=Path)
    e.add_argument("--prova", required=True)
    e.add_argument("--ano", type=int, required=True)
    e.add_argument("--nome")
    e.add_argument("--certo-errado", action="store_true")
    e.add_argument("--incluir-parecidas", action="store_true", help="entra também o que só se parece (0,70 a 0,86)")
    a = sub.add_parser("aplicar")
    a.add_argument("lote", type=Path)
    a.add_argument("--seco", action="store_true")
    args = ap.parse_args()
    return extrair(args) if args.cmd == "extrair" else aplicar(args)


if __name__ == "__main__":
    raise SystemExit(main())
