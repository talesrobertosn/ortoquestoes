#!/usr/bin/env python3
"""Passa a valer, no desempenho, a resposta pela bibliografia de provas sem gabarito oficial.

Algumas provas (os TAROs de 2006 a 2010, entre outros) nunca tiveram o gabarito divulgado
pela banca. O comentário dessas questões já traz a letra que a bibliografia
sustenta ("provavel"), mas a questão continuava com gabarito vazio: a resposta
era registrada como neutra e não entrava no desempenho.

Este script copia essa letra para o campo "gabaritoBibliografia" da questão.
O campo "gabarito" continua vazio, porque ele é o oficial da banca; o site usa
a letra da bibliografia como gabarito de correção e avisa que não é oficial.

Uso:
    python3 scripts/validar_pela_bibliografia.py --prova TARO --anos 2006 2007 --seco
    python3 scripts/validar_pela_bibliografia.py --prova TARO --anos 2006 2007
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_COMENTARIOS, DIR_TEMAS, gravar_json, ler_json  # noqa: E402


# O aviso antigo dizia que a questão não contava no desempenho. Agora ela conta:
# o aviso padrão sai (a tela já mostra "Gabarito não oficial" e explica na
# correção) e, nos avisos com ressalvas próprias, só a primeira frase muda.
AVISO_PADRAO = re.compile(
    r"^Não localizamos o gabarito oficial desta (prova|questão), (por isso esta questão|que por isso) não conta no seu desempenho\. "
    r"A resposta indicada( abaixo)? é a sustentada pela bibliografia\.?$"
)
PRIMEIRA_FRASE = re.compile(
    r"^(Não localizamos o gabarito oficial desta (prova|questão), (por isso esta questão|por isso a questão|que por isso) não conta no( seu)? desempenho"
    r"|Não há gabarito oficial localizado, e esta questão não conta no desempenho)\.\s*"
)
NOVA_FRASE = ("A banca não divulgou o gabarito oficial desta prova; a resposta foi definida pelo Orto Questões "
              "a partir da bibliografia e conta no seu desempenho. ")


def atualizar_avisos(ids: set[str]) -> int:
    total = 0
    for arquivo in sorted(DIR_COMENTARIOS.glob("*.json")):
        dados = ler_json(arquivo, {}) or {}
        mudou = False
        for qid in ids & set(dados):
            comentario = dados[qid]
            aviso = (comentario.get("alerta") or "").strip() if isinstance(comentario, dict) else ""
            if not aviso or not PRIMEIRA_FRASE.match(aviso):
                continue
            if AVISO_PADRAO.match(aviso):
                del comentario["alerta"]
            else:
                comentario["alerta"] = PRIMEIRA_FRASE.sub(NOVA_FRASE, aviso).strip()
            mudou = True
            total += 1
        if mudou:
            gravar_json(arquivo, dados)
    return total


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--prova", required=True)
    parser.add_argument("--anos", type=int, nargs="*", default=[])
    parser.add_argument("--sem-ano", action="store_true", help="inclui as questões sem ano (ex.: Ortopedia, origem não confirmada)")
    parser.add_argument("--seco", action="store_true", help="só mostra o que mudaria")
    args = parser.parse_args()

    provaveis: dict[str, str] = {}
    for arquivo in DIR_COMENTARIOS.glob("*.json"):
        for qid, comentario in (ler_json(arquivo, {}) or {}).items():
            if isinstance(comentario, dict) and comentario.get("provavel"):
                provaveis[qid] = comentario["provavel"]

    marcadas = 0
    validas: set[str] = set()
    sem_resposta: list[str] = []
    for arquivo in sorted(DIR_TEMAS.glob("*.json")):
        dados = ler_json(arquivo, {}) or {}
        mudou = False
        for questao in dados.get("questoes", []):
            ano = questao.get("ano")
            if questao.get("prova") != args.prova or not (ano in args.anos or (ano is None and args.sem_ano)):
                continue
            if questao.get("gabarito") or questao.get("anulada") or questao.get("tipo") == "dissertativa":
                continue
            letra = provaveis.get(questao["id"])
            letras = {a.get("letra") for a in questao.get("alternativas") or []}
            if not letra or letra not in letras:
                sem_resposta.append(questao["id"])
                continue
            if questao.get("gabaritoBibliografia") != letra:
                questao["gabaritoBibliografia"] = letra
                mudou = True
                marcadas += 1
            validas.add(questao["id"])
        if mudou and not args.seco:
            gravar_json(arquivo, dados)

    avisos = 0 if args.seco else atualizar_avisos(validas)
    print(f"{marcadas} questões {'seriam marcadas' if args.seco else 'marcadas'} com a resposta pela bibliografia.")
    print(f"{avisos} avisos de comentário atualizados para dizer que a questão conta no desempenho.")
    if sem_resposta:
        print(f"{len(sem_resposta)} sem resposta pela bibliografia no comentário (continuam fora do desempenho):")
        for qid in sem_resposta:
            print(f"  {qid}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
