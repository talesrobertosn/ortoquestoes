"""Confere e aplica lotes de OrtoQuestões Simulados a um tema do acervo (passos 3 e 4 do fluxo).

Uso:
  python3 scripts/simulados/aplicar_lote.py <pasta> <tema-slug> <lote1,lote2> --conferir
  python3 scripts/simulados/aplicar_lote.py <pasta> <tema-slug> <lote1,lote2> [--data AAAA-MM-DD]

Cada lote é um módulo Python em <pasta> com:
  CAP = 32                      # capítulo (vai na legenda da figura)
  REF = "Rockwood and Green's Fractures in Adults, 10ª ed., capítulo 32 (...)"
  ARQ = "Rockwood_10e_cap32_....pdf"   # nome lógico do PDF de origem (o PDF não vai ao repositório)
  PROVA = "SIMÃO"               # opcional: banca cujo padrão o simulado segue (aparece na questão)
  AREA = "cirurgia-mao"         # opcional: área própria do simulado (sai do treino de ortopedia)
  ANO = 2024                    # opcional, só com PROVA: ano da prova que o simulado espelha ("SIMÃO · 2024")
  LIVRO = "Rockwood and Green's Fractures in Adults, 10ª ed."   # opcional, para a legenda
  QUESTOES = [dict(sub=[...], pag=N, gab="X", enun="...", alts=[4 textos],
                   conceito='''...''', correta='''**X: ...** ...''', inc={"A": "...", ...},
                   img=("arquivo_sem_ext", "figura 32-11", (x0, y0, x1, y1)),  # img e caixa opcionais
                   num=17,                       # opcional: número da questão na prova espelhada
                   refs=["Green's ..., cap. 3, p. 107"],  # opcional: referências desta questão (somam ao REF)
                   id="mao-1932")]               # opcional: revisa essa questão já publicada no lugar (mesmo id)

A figura é lida de <pasta>/img/<arquivo>.png; a caixa recorta antes de salvar (para não entregar
a resposta). --conferir só valida e mostra o resumo, sem gravar nada. Depois de aplicar, rode
scripts/gerar_indice.py, scripts/validar_acervo.py, npm test e fixtures/testar_revisao.mjs.
"""
import argparse
import datetime
import importlib.util
import json
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("pasta")
ap.add_argument("tema")
ap.add_argument("lotes")
ap.add_argument("--data", default=datetime.date.today().isoformat())
ap.add_argument("--conferir", action="store_true")
a = ap.parse_args()

RAIZ = Path(__file__).resolve().parents[2]
PASTA = Path(a.pasta)
# Diretriz do dono, 08/10/2026: extensão proporcional ao assunto, sem piso de
# caracteres. A qualidade e a utilidade de cada alternativa exigem revisão manual.


def carregar(nome):
    sp = importlib.util.spec_from_file_location(nome, PASTA / f"{nome}.py")
    m = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m


mods = [carregar(n) for n in a.lotes.split(",")]
QS = [(m, q) for m in mods for q in m.QUESTOES]
tax = json.load(open(RAIZ / "src/dados/taxonomia.json"))
tema = next((t for t in tax["temas"] if t["slug"] == a.tema), None)
if not tema:
    sys.exit(f"tema inexistente: {a.tema}")

erros, avisos, tamanhos = [], [], []
for m, q in QS:
    rot = f"[{m.__name__} p{q.get('pag')}] {q['enun'][:50]}"
    if len(q["alts"]) != 4 or len(set(q["alts"])) != 4:
        erros.append(f"{rot}: precisa de 4 alternativas distintas")
    if q["gab"] not in "ABCD" or set(q["inc"]) != set("ABCD") - {q["gab"]}:
        erros.append(f"{rot}: gabarito e chaves de 'inc' não batem")
    if not q["correta"].startswith(f"**{q['gab']}:"):
        erros.append(f"{rot}: 'correta' deve começar com **{q['gab']}:")
    for s in q["sub"]:
        if s not in tema["subtemas"]:
            erros.append(f"{rot}: subtema '{s}' não existe em {a.tema} (válidos: {'; '.join(tema['subtemas'])})")
    if getattr(m, "ANO", None) is not None and (not getattr(m, "PROVA", None) or not isinstance(m.ANO, int) or not 1990 <= m.ANO <= 2100):
        erros.append(f"{rot}: ANO precisa de PROVA e deve ser um ano (inteiro)")
    if q.get("refs") is not None and (not isinstance(q["refs"], list) or not all(isinstance(r, str) and r.strip() for r in q["refs"])):
        erros.append(f"{rot}: refs deve ser uma lista de textos")
    if q.get("num") is not None and not isinstance(q["num"], int):
        erros.append(f"{rot}: num deve ser o número (inteiro) da questão na prova espelhada")
    if getattr(m, "AREA", None) not in (None, "cirurgia-mao", "fellowship-quadril"):
        erros.append(f"{rot}: AREA do lote deve ser 'cirurgia-mao' ou 'fellowship-quadril'")
    if getattr(m, "AREA", None) and q.get("areasAdicionais"):
        erros.append(f"{rot}: questão com AREA própria não leva areasAdicionais")
    if "areasAdicionais" in q and q["areasAdicionais"] != ["cirurgia-mao"]:
        erros.append(f"{rot}: areasAdicionais deve ser ['cirurgia-mao']")
    textos = [q["enun"], *q["alts"], q["conceito"], q["correta"], *q["inc"].values()]
    for t in textos:
        if "—" in t or "–" in t:
            erros.append(f"{rot}: travessão ou meia-risca em '{t[:40]}'")
        if re.search(r"(?<!\*)\*(?!\*)[^*\n]+\*(?!\*)", t):
            erros.append(f"{rot}: itálico com asterisco simples em '{t[:40]}'")
        if "==" in t:
            erros.append(f"{rot}: marca-texto em '{t[:40]}'")
    if re.search(r"\b(EXCETO|INCORRETA|assinale)\b", q["enun"], re.I):
        erros.append(f"{rot}: enunciado negativo ou com 'assinale' (a banca não usa)")
    if re.search(r"_{3,}|\.\.\.|…", q["enun"]):
        erros.append(f"{rot}: enunciado de completar lacuna (______ ou ...); reescrever como pergunta direta ou par com 'respectivamente'")
    if not 40 <= len(q["enun"]) <= 320:
        avisos.append(f"{rot}: enunciado com {len(q['enun'])} caracteres")
    total = len(q["conceito"]) + len(q["correta"]) + sum(len(v) for v in q["inc"].values())
    tamanhos.append(total)
    if not q["conceito"].strip() or not q["correta"].strip() or any(not t.strip() for t in q["inc"].values()):
        erros.append(f"{rot}: conceito ou análise de alternativa vazio")
    if q.get("img") and not (PASTA / "img" / f"{q['img'][0]}.png").exists():
        erros.append(f"{rot}: figura {q['img'][0]}.png não encontrada")

gabs = Counter(q["gab"] for _, q in QS)
print(f"{len(QS)} questões | gabarito {dict(sorted(gabs.items()))} | "
      f"comentário mediana {statistics.median(tamanhos):.0f} (mín {min(tamanhos)}, máx {max(tamanhos)}) | "
      f"com figura {sum(1 for _, q in QS if q.get('img'))}")
for x in avisos:
    print("aviso:", x)
if erros:
    for x in erros:
        print("ERRO:", x)
    sys.exit(1)
if a.conferir:
    sys.exit(0)

tp = RAIZ / f"public/acervo/temas/{a.tema}.json"
cp = RAIZ / f"public/acervo/comentarios/{a.tema}.json"
T, C = json.load(open(tp)), json.load(open(cp))
n = max(int(q["id"].rsplit("-", 1)[1]) for q in T["questoes"])
existentes = {q["enunciado"] for q in T["questoes"]}
pos = {q["id"]: i for i, q in enumerate(T["questoes"])}
(RAIZ / f"public/imagens/{a.tema}").mkdir(parents=True, exist_ok=True)
primeiro = None
for m, q in QS:
    if q.get("id"):
        qid = q["id"]
        if qid not in pos:
            sys.exit(f"id a revisar não existe: {qid}")
        existentes.discard(T["questoes"][pos[qid]]["enunciado"])
    if q["enun"] in existentes:
        sys.exit("duplicada: " + q["enun"][:60])
    if not q.get("id"):
        n += 1
        qid = f"{a.tema}-{n:04d}"
    primeiro = primeiro or qid
    imagens = []
    if q.get("img"):
        arquivo, figura, *caixa = q["img"]
        im = Image.open(PASTA / "img" / f"{arquivo}.png").convert("RGB")
        if caixa:
            im = im.crop(caixa[0])
        im.save(RAIZ / f"public/imagens/{a.tema}/{qid}-1.jpeg", quality=92)
        livro = getattr(m, "LIVRO", "Rockwood and Green's Fractures in Adults, 10ª ed.")
        imagens = [{"arquivo": f"{a.tema}/{qid}-1.jpeg",
                    "legenda": f"Fonte: {livro}, capítulo {getattr(m, 'CAP', '')}, {figura}.",
                    "largura": im.width, "altura": im.height}]
    nova = ({
        "id": qid, "tema": tema["nome"], "subtemas": q["sub"], "prova": getattr(m, "PROVA", None), "simulado": True,
        **({"area": m.AREA} if getattr(m, "AREA", None) else {}),
        **({"areasAdicionais": q["areasAdicionais"]} if q.get("areasAdicionais") else {}),
        "ano": getattr(m, "ANO", None), "dificuldade": None, "enunciado": q["enun"], "imagens": imagens,
        "alternativas": [{"letra": l, "texto": t} for l, t in zip("ABCD", q["alts"])],
        "gabarito": q["gab"], "comentario": None, "comentariosComunidade": [], "referencias": [],
        "anulada": False, "figuraPendente": False, "revisado": False, "subtemasPendentes": False,
        "origem": {"arquivo": m.ARQ, "pagina": q["pag"], "numeroOriginal": q.get("num")}})
    if q.get("id"):
        T["questoes"][pos[qid]] = nova
    else:
        T["questoes"].append(nova)
    C[qid] = {"conceito": q["conceito"], "correta": q["correta"], "incorretas": dict(sorted(q["inc"].items())),
              "referencias": [r for r in [getattr(m, "REF", None), *q.get("refs", [])] if r], "geradoEm": a.data, "conferido": False}
json.dump(T, open(tp, "w"), ensure_ascii=False, indent=2)
open(tp, "a").write("\n")
json.dump(C, open(cp, "w"), ensure_ascii=False, indent=1)
open(cp, "a").write("\n")
print(f"aplicadas {primeiro} a {qid}")
