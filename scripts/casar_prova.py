#!/usr/bin/env python3
"""Casa uma prova oficial (PDF da banca) com o acervo.

Lê as questões do caderno oficial, procura cada uma no acervo por
semelhança de texto (enunciado + alternativas) e grava um relatório em
relatorios/<prova>-<ano>.csv. Com --aplicar, as questões encontradas passam
a ter a prova, o ano e o PDF oficial como origem; as que não existem no
acervo ficam listadas como faltantes no relatório (entram depois, com
tema, assunto e imagem conferidos).

Uso:
    python3 scripts/casar_prova.py CADERNO.pdf --prova TEOT --ano 2024 [--gabarito GAB.pdf] [--aplicar]
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comum import DIR_TEMAS, RAIZ  # noqa: E402

# Acima disto, é a mesma questão; entre REVISAR e CASADA, fica para conferir à mão.
CASADA = 0.86
REVISAR = 0.70


def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", texto).strip()


INICIO = re.compile(r"^\s*(\d{1,3})\s*[.)\-–](?:\s+(.*))?$")
ALTERNATIVA = re.compile(r"^\s*([A-Ea-e])\s*[)\.\-–]\s*(.*)$")
FIM_DO_CADERNO = re.compile(r"(?i)^\s*(gabarito|refer[eê]ncias?|bibliografia)\b")
# Cabeçalho e rodapé de página que se misturam ao texto da questão.
RUIDO = re.compile(r"(?i)^\s*(prova escrita|p[aá]g\.?\s*\d+|\d{1,3}\s*$)")


def ler_questoes(pdf: Path) -> list[dict]:
    """Questões numeradas em sequência, com as alternativas e a página em que começam."""
    documento = pymupdf.open(pdf)
    questoes: list[dict] = []
    atual: dict | None = None
    esperado = 1
    for numero_pagina, pagina in enumerate(documento, 1):
        for linha in pagina.get_text().splitlines():
            if FIM_DO_CADERNO.match(linha) and esperado > 20:
                return questoes + ([atual] if atual else [])
            if RUIDO.match(linha) and not INICIO.match(linha):
                continue
            m = INICIO.match(linha)
            # Instruções numeradas da capa (1., 2., ...) não têm alternativas: quando
            # aparece um novo "1." e o que veio antes não tinha alternativas, recomeça.
            if m and int(m.group(1)) == 1 and esperado > 1:
                lidas = questoes + ([atual] if atual else [])
                if sum(1 for q in lidas if len(q["alternativas"]) >= 2) < len(lidas) / 2:
                    questoes, atual, esperado = [], None, 1
            # Número sozinho na linha também abre questão (o texto vem na linha seguinte),
            # desde que a anterior já tenha fechado as alternativas.
            sozinho = m and not (m.group(2) or "").strip()
            if m and int(m.group(1)) == esperado and (not sozinho or esperado == 1 or (atual and len(atual["alternativas"]) >= 2)):
                if atual:
                    questoes.append(atual)
                atual = {"numero": esperado, "pagina": numero_pagina, "enunciado": (m.group(2) or "").strip(), "alternativas": []}
                esperado += 1
                continue
            if atual is None:
                continue
            a = ALTERNATIVA.match(linha)
            if a and len(atual["alternativas"]) < 5 and a.group(1).upper() == "ABCDE"[len(atual["alternativas"])]:
                atual["alternativas"].append(a.group(2).strip())
            elif linha.strip():
                if atual["alternativas"]:
                    atual["alternativas"][-1] += " " + linha.strip()
                else:
                    atual["enunciado"] += " " + linha.strip()
    if atual:
        questoes.append(atual)
    for q in questoes:
        q["alternativas"] = [sem_citacao(t) for t in q["alternativas"]]
    return questoes


# Lista de referências sem título logo depois da última alternativa.
CITACAO = re.compile(r"\s(REFER[EÊ]NCIAS?|Skeletal trauma|Campbell|Rockwood|Tachdjian|Lovell|Canale S\.?T)\b.*$", re.S)


def sem_citacao(texto: str) -> str:
    return CITACAO.sub("", texto).strip() if len(texto) > 200 else texto


def sem_fonte(texto: str) -> str:
    """Tira a linha "Fonte: ..." das figuras, que não faz parte do enunciado."""
    return re.split(r"\s*Fonte:\s", texto)[0].strip()


def ler_gabarito(pdf: Path, total: int) -> dict[int, str]:
    """Letra de cada questão (ou "-" para anulada), da tabela do fim do caderno ou de um arquivo à parte."""
    linhas = [l.strip() for p in pymupdf.open(pdf) for l in p.get_text().splitlines() if l.strip()]
    gabarito: dict[int, str] = {}
    esperado = 1
    bloco_numero = None
    for linha in linhas:
        m = re.match(r"^(\d{1,3})\s+([A-E]|-)(?=\s|$)", linha)
        if m and int(m.group(1)) == esperado:
            gabarito[esperado] = m.group(2)
            esperado += 1
            bloco_numero = None
            continue
        if re.fullmatch(r"\d{1,3}", linha) and int(linha) == esperado:
            bloco_numero = esperado
            continue
        if bloco_numero is not None:
            letra = re.search(r"(?:^|\s)([A-E])$", linha)
            if letra:
                gabarito[bloco_numero] = letra.group(1)
                esperado += 1
                bloco_numero = None
            elif re.search(r"(?i)anulad", linha):
                gabarito[bloco_numero] = "-"
                esperado += 1
                bloco_numero = None
    return {n: g for n, g in gabarito.items() if n <= total}


def carregar_acervo() -> tuple[list[dict], dict[str, tuple[Path, dict]]]:
    itens, arquivos = [], {}
    for caminho in sorted(DIR_TEMAS.glob("*.json")):
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        arquivos[caminho.stem] = (caminho, dados)
        for q in dados["questoes"]:
            if q.get("duplicataDe"):
                continue
            texto = normalizar(q["enunciado"] + " " + " ".join(a.get("texto", "") for a in q["alternativas"]))
            itens.append({"q": q, "tema": caminho.stem, "texto": texto, "palavras": set(texto.split())})
    return itens, arquivos


def melhor_par(questao: dict, acervo: list[dict]) -> tuple[float, dict | None]:
    texto = normalizar(sem_fonte(questao["enunciado"]) + " " + " ".join(questao["alternativas"]))
    palavras = set(texto.split())
    candidatos = sorted(acervo, key=lambda i: -len(palavras & i["palavras"]) / (len(palavras | i["palavras"]) or 1))[:12]
    melhor, item = 0.0, None
    for c in candidatos:
        r = SequenceMatcher(None, texto, c["texto"], autojunk=False).ratio()
        if r > melhor:
            melhor, item = r, c
    return melhor, item


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--prova", required=True)
    ap.add_argument("--ano", type=int, required=True)
    ap.add_argument("--gabarito", type=Path)
    ap.add_argument("--nome", help="nome do arquivo para a origem (padrão: nome do PDF)")
    ap.add_argument("--aplicar", action="store_true")
    args = ap.parse_args()

    questoes = ler_questoes(args.pdf)
    gabarito = ler_gabarito(args.gabarito or args.pdf, len(questoes))
    acervo, arquivos = carregar_acervo()
    nome = args.nome or args.pdf.name
    usados: set[str] = set()
    linhas, casadas, revisar, faltam = [], 0, 0, 0
    for questao in questoes:
        r, item = melhor_par(questao, acervo)
        letra = gabarito.get(questao["numero"], "")
        if item and r >= CASADA and item["q"]["id"] not in usados:
            situacao = "no site"
            casadas += 1
            usados.add(item["q"]["id"])
            q = item["q"]
            if args.aplicar:
                if q.get("prova") in (None, "Ortopedia", args.prova) or not q.get("ano"):
                    q["prova"], q["ano"] = args.prova, args.ano
                q["origem"] = {"arquivo": nome, "pagina": questao["pagina"], "numeroOriginal": questao["numero"]}
            # Cadernos de cores diferentes trocam a ordem das alternativas: compara o texto da certa.
            if letra and letra != "-" and q.get("gabarito") and "ABCDE".index(letra) < len(questao["alternativas"]):
                oficial = normalizar(questao["alternativas"]["ABCDE".index(letra)])
                certa = next((normalizar(a.get("texto", "")) for a in q["alternativas"] if a.get("letra") == q["gabarito"]), "")
                if SequenceMatcher(None, oficial, certa).ratio() < 0.8:
                    situacao = "no site, GABARITO DIFERENTE"
        elif item and r >= REVISAR:
            situacao = "conferir"
            revisar += 1
        else:
            situacao = "falta no site"
            faltam += 1
        linhas.append([questao["numero"], situacao, item["q"]["id"] if item and r >= REVISAR else "", f"{r:.2f}", letra, questao["enunciado"][:160]])

    saida = RAIZ / "relatorios" / f"{args.prova.lower()}-{args.ano}{'-' + args.pdf.stem.split('-')[-1].lower() if 'anatomia' in args.pdf.name.lower() else ''}.csv"
    with saida.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["questao_no_pdf", "situacao", "id_no_site", "semelhanca", "gabarito_pdf", "enunciado"])
        w.writerows(linhas)
    if args.aplicar:
        for caminho, dados in arquivos.values():
            caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{args.prova} {args.ano}: {len(questoes)} questões lidas, gabarito de {len(gabarito)}")
    print(f"  no site: {casadas} | conferir: {revisar} | faltam: {faltam}  -> {saida.relative_to(RAIZ)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
