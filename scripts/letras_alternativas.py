"""Quais questões podem ter as alternativas embaralhadas na revisão, e onde o
comentário cita uma alternativa pela letra.

Embaralhar as alternativas só é seguro quando toda letra que o texto usa para
falar de uma alternativa pode ser trocada pela letra nova. Este script lê o
acervo e o comentário de cada questão e grava public/acervo/letras.json:

  fixas   questões que ficam sempre na ordem da prova (com o motivo);
  numeros questões de alternativas numéricas: só invertem a ordem;
  refs    por questão, a assinatura do comentário e a posição de cada letra
          que fala de uma alternativa, para o site trocá-la pela letra nova.

Regra de ouro: na dúvida, a questão fica fixa. Uma letra que o script não
consegue provar que é de alternativa (pode ser "imagem A", "tipo C",
"vitamina D", "letra C" como forma) deixa a questão na ordem original.

Rode depois de mudar comentários (aplicar_comentarios.py já roda sozinho) e antes de
publicar (o publicar.yml roda antes do build, então o site no ar nunca fica desatualizado).
Se um comentário mudar sem rodar o script, o site percebe pela assinatura e, em vez de
trocar letra errada, avisa quais letras da tela correspondem às da prova.

Uso: python3 scripts/letras_alternativas.py [--relatorio caminho.md] [--conferir] [--saida caminho]
  --conferir  não grava; sai com erro se o letras.json estiver desatualizado.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACERVO = os.path.join(RAIZ, "public", "acervo")
SAIDA = os.path.join(ACERVO, "letras.json")
LETRA = r"[A-E]"
CAMPOS = ("alerta", "conceito", "correta")

# Rótulos que, seguidos de uma letra, sempre falam de alternativa.
ROTULO_FORTE = re.compile(
    r"\b(?:[Aa]lternativas?|[Oo]p[çc][ãa]o|[Oo]p[çc][õo]es|[Gg]abarito(?:\s+oficial)?(?:\s+(?:é|foi|da banca|seria|era|aponta|considerou|marca))?"
    r"|[Rr]esposta(?:\s+oficial)?(?:\s+(?:é|foi|seria|era))?|[Aa]firma[çc][ãa]o|[Aa]firma[çc][õo]es|[Bb]anca\s+(?:considerou|marcou|aceitou|deu|escolheu)|[Ee]rro\s+de|[Cc]itad[ao]s?\s+em|[Mm]ant[ée]m-se|[Mm]antivemos)"
    r"(?P<sep>\s*\**\s*[:(]?\s*\**\s*)"
    r"(?P<lista>" + LETRA + r"(?:\**\s*(?:,|\be\b|\bou\b)\s*\**" + LETRA + r")*)(?![\w-])"
)
# "Correta: D", "Provável correta: A", "Incorreta: B" (os dois-pontos são obrigatórios: "**Correta.** A combinação" não é letra).
ROTULO_CORRETA = re.compile(r"\b(?:[Pp]rov[áa]vel\s+)?(?:[Cc]orreta|[Ii]ncorreta|[Ee]rrada|[Cc]erta)\**\s*:\s*\**(?P<l>" + LETRA + r")(?![\w-])")
# "letra C": às vezes é a forma ("em forma de letra C") ou o rótulo da figura.
ROTULO_LETRA = re.compile(r"\b[Ll]etras?\s*\**(?P<l>" + LETRA + r")\**(?![\w-])")
# "a C", "da D", "pela B", "Erra a C".
ARTIGO = re.compile(r"(?<![\w-])(?:a|à|da|na|pela|com a)\s+\**(?P<l>" + LETRA + r")\**(?![\w-]|\.\d)")
# "(B)", "(letra B)", "(alternativa B)"
PARENTESE = re.compile(r"\((?P<rot>(?:letra|alternativa)\s+)?(?P<l>" + LETRA + r")\)")
# "B) texto" no começo de uma linha ou de um item
ITEM = re.compile(r"(?:^|\n)\s*(?:[-*]\s*)?\**(?P<l>" + LETRA + r")\**\)\s")
# "**C**" solto
NEGRITO = re.compile(r"\*\*(?P<l>" + LETRA + r")\*\*(?!\w)")
# Letra solta que ninguém explicou ("C é a escolhida", "B está errada"): o "A" só conta antes de verbo.
SOLTA = re.compile(r"(?<![\w\-/.°º])(?:(?P<l>[B-D])|(?P<a>[AE])(?=\**\s+(?:é|está|estão|foi|era|seria|também|não|fica|vem|traz|descreve|cita|diz|corresponde)\b))\**(?![\w\-/]|[.,]\d|\s*\d)")
# "X é a resposta", "X é a correta", "X está errada": a frase diz que a letra é alternativa.
LETRA_E_RESPOSTA = re.compile(r"^\**\s+(?:troca|inverte|confunde|mistura|erra|aponta|exagera|generaliza|omite)\b|^\**\s+(?:como|seja)\s+(?:o\s+)?gabarito|^\**\s+(?:é|seria|era|foi|fica)\s+(?:a\s+)?(?:\*\*)?(?:resposta|correta|certa|errada|incorreta|alternativa|op[çc][ãa]o|gabarito|escolhida|marcada)|^\**\s+(?:está|estão)\s+(?:\*\*)?(?:errad|incorret|cert|corret)")
# "**D: resfriar...", "B. O procedimento...", "**B, cabeça radial": a letra abre o campo ou a linha como rótulo.
ABRE_CAMPO = re.compile(r"(?:^|\n)\s*(?:[-*]\s+)?\**(?P<l>[A-E])\**\s*[:.,)]\s")
# Antes da letra, uma palavra que mostra que ela é outra coisa (tipo C, vitamina D, Garden B...).
NAO_ALTERNATIVA = re.compile(r"(?:\b(?:tipos?|grupos?|classes?|graus?|est[áa]gios?|zonas?|n[íi]veis|n[íi]vel|vitaminas?|hepatites?|Garden|Neer|Salter|Harris|Weber|Tile|Young|Burgess|Denis|Pauwels|Schatzker|AO|OTA|Lauge|Hansen|Gustilo|Anderson|Montoya|Pipkin|Ficat|Steinberg|Catterall|Herring|Waldenstr[öo]m|Ogden|Delbet|Seinsheimer|Russell|Taylor|Evans|Jensen|Letournel|Judet|Mason|Regan|Morrey|Bado|Frykman|Melone|Mayfield|Eaton|Lichtman|Kellgren|Outerbridge|Hawkins|Sanders|Essex|Berndt|Ruedi|Allgower|Lowell|Mitchell|Ranawat|Pfirrmann|Modic|Meyerding|Frankel|ASIA|Ganz|imagens?|figuras?|setas?|fotos?|painel|pain[ée]is|letras?|forma|curva|quadrante|compartimento|zona|ponto|linha|[âa]ngulo|segmento|cadeia|fator|prote[íi]na|c[ée]lulas?|colágeno|ondas?|fibras?|isoforma|subtipos?|esquemas?|subgrupos?|categorias?|classifica\\w*|padr[ãa]o|modelo|hem[óo]filia|insulina|IgA|IgG|tri[âa]ngulo)\b\W{0,3}(?:\w+\W{1,3})?$)")

# Faixa de letras ("de A a D", "B a D"): a ordem importa, a questão fica fixa.
FAIXA = re.compile(r"(?<![\w-])" + LETRA + r"\**\s+(?:a|até)\s+\**" + LETRA + r"(?![\w-])")

# Alternativas cujo texto cita outra letra ou a ordem.
TEXTO_ORDEM = re.compile(
    r"(?:todas|nenhuma)\s+(?:as|das)\s+(?:alternativas\s+|op[çc][õo]es\s+)?(?:anteriores|acima)"
    r"|(?<![\w-])" + LETRA + r"\s+(?:e|ou)\s+" + LETRA + r"(?![\w-])"
    r"|\b(?:alternativas?|letras?|op[çc][ãa]o|op[çc][õo]es)\s+" + LETRA + r"(?![\w-])"
    r"|^\s*" + LETRA + r"\s*[.,]?\s*$"
)
NUMERICA = re.compile(r"^\s*[<>≤≥~]?\s*\d[\d.,]*\s*(?:°|º|%|cm|mm|m|kg|g|ml|graus|anos?|meses|m[êe]s|semanas?|dias?|horas?|h|min|x)?\s*\.?\s*$", re.I)


def normal(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def assinatura(comentario: dict) -> str:
    """FNV-1a de 32 bits sobre os bytes UTF-8 dos campos com letras (igual no site)."""
    partes = [comentario.get(c) or "" for c in CAMPOS]
    inc = comentario.get("incorretas") or {}
    partes += [inc.get(l) or "" for l in "ABCDE"]
    h = 0x811C9DC5
    for b in "\u0000".join(partes).encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return format(h, "08x")


def bate_texto(texto: str, inicio: int, fim: int, alternativa: str) -> bool:
    """O texto da alternativa vem colado na letra: logo antes ("Eikenella corrodens (B)")
    ou logo depois ("a **C** (TT-TG maior que 15 mm)", "B) texto")."""
    alvo = normal(alternativa)
    if len(alvo) < 3:
        return False
    palavras = alvo.split()
    comeco = " ".join(palavras[:4])
    folga = len(alternativa) + 12
    antes = normal(texto[max(0, inicio - folga): inicio])
    depois = normal(texto[fim: fim + min(folga, 60)])
    return antes.endswith(alvo) or antes.endswith(comeco) or depois.startswith(comeco)


FIGURA = re.compile(r"\b(?:imagens?|figuras?|tipos?|grupos?|classifica\w*|AO|seta|letras?|forma|est[áa]gios?|graus?|zonas?|regi[ãa]o|vitamina|hepatite)\b", re.I)


def frase_de_alternativas(texto: str, pos: int) -> bool:
    """A frase da letra já fala de alternativas pela letra e não fala de figura, tipo ou classificação."""
    inicio = max(texto.rfind(". ", 0, pos), texto.rfind("\n", 0, pos)) + 1
    fins = [i for i in (texto.find(". ", pos), texto.find("\n", pos)) if i != -1]
    frase = texto[inicio: min(fins) if fins else len(texto)]
    return bool(ROTULO_FORTE.search(frase) or ROTULO_CORRETA.search(frase)) and not FIGURA.search(frase)


def classificar(q: dict, com: dict | None):
    """(situação, refs, motivo). situação: 'fixa', 'numeros' ou 'livre'."""
    alts = q.get("alternativas") or []
    letras = [a["letra"] for a in alts]
    if q.get("tipo") == "dissertativa" or len(alts) < 3:
        return "fixa", [], "certo/errado ou dissertativa"
    if letras != list("ABCDE"[: len(letras)]):
        return "fixa", [], "letras fora do padrão"
    textos = {a["letra"]: a.get("texto") or "" for a in alts}
    for l, t in textos.items():
        if TEXTO_ORDEM.search(t):
            return "fixa", [], f"alternativa {l} cita outra letra ou a ordem"
    if re.search(r"\b(?:alternativas?|letras?|op[çc][ãa]o)\s+" + LETRA + r"(?![\w-])", q.get("enunciado") or "", re.I):
        return "fixa", [], "enunciado cita uma letra"
    autor = q.get("comentario") or ""
    if any(p.search(autor) for p in (ROTULO_FORTE, ROTULO_CORRETA, ROTULO_LETRA, ARTIGO, PARENTESE, ITEM, NEGRITO)):
        return "fixa", [], "comentário do autor cita letra"
    numerica = all(NUMERICA.match(t) for t in textos.values())

    refs: list[list] = []
    if com:
        gabarito = q.get("gabarito") or q.get("gabaritoBibliografia") or com.get("provavel")
        campos = [(c, com.get(c) or "") for c in CAMPOS]
        campos += [("i" + l, t or "") for l, t in (com.get("incorretas") or {}).items()]
        for campo, texto in campos:
            if not texto:
                continue
            if FAIXA.search(texto):
                return "fixa", [], f"faixa de letras em {campo}"
            achadas: dict[int, bool | None] = {}  # posição da letra -> é alternativa? (None = não sei)

            def marcar(pos: int, valor: bool | None):
                if pos not in achadas or (achadas[pos] is None and valor):
                    achadas[pos] = valor

            for m in ROTULO_FORTE.finditer(texto):
                inicio = m.start("lista")
                for mm in re.finditer(LETRA, m.group("lista")):
                    marcar(inicio + mm.start(), True)
            for m in ROTULO_CORRETA.finditer(texto):
                marcar(m.start("l"), True)
            for padrao in (ROTULO_LETRA, ARTIGO, NEGRITO):
                for m in padrao.finditer(texto):
                    l = m.group("l")
                    pos = m.start("l")
                    if pos in achadas:
                        continue
                    irma = padrao is not ROTULO_LETRA and frase_de_alternativas(texto, pos)
                    marcar(pos, True if irma or bate_texto(texto, m.start(), m.end(), textos.get(l, "")) else None)
            for m in PARENTESE.finditer(texto):
                l = m.group("l")
                pos = m.start("l")
                if pos in achadas:
                    continue
                if m.group("rot") and "alternativa" in m.group("rot"):
                    marcar(pos, True)
                else:
                    marcar(pos, True if bate_texto(texto, m.start(), m.end(), textos.get(l, "")) else None)
            for m in ITEM.finditer(texto):
                l = m.group("l")
                pos = m.start("l")
                if pos in achadas:
                    continue
                marcar(pos, True if bate_texto(texto, m.start(), m.end(), textos.get(l, "")) else None)
            for m in ABRE_CAMPO.finditer(texto):
                l = m.group("l")
                pos = m.start("l")
                if pos in achadas:
                    continue
                inicio_do_campo = texto[:pos].strip(" *\n-") == ""
                marcar(pos, True if (inicio_do_campo and campo in ("correta",) and l == gabarito) or (inicio_do_campo and campo == "i" + l) or bate_texto(texto, m.start("l"), m.end(), textos.get(l, "")) else None)
            for m in SOLTA.finditer(texto):
                pos = m.start("l") if m.group("l") else m.start("a")
                if pos in achadas:
                    continue
                antes = texto[max(0, pos - 40): pos]
                if NAO_ALTERNATIVA.search(antes) or re.search(r"[A-E]\d|\d[A-E]", texto[max(0, pos - 2): pos + 3]):
                    continue
                resposta = LETRA_E_RESPOSTA.search(texto[pos + 1: pos + 50])
                marcar(pos, True if resposta or frase_de_alternativas(texto, pos) or bate_texto(texto, pos, m.end(), textos.get(texto[pos], "")) else None)
            for pos, ok in sorted(achadas.items()):
                if ok is None:
                    trecho = texto[max(0, pos - 40): pos + 30].replace("\n", " ")
                    return "fixa", [], f"letra {texto[pos]} sem prova de ser alternativa em {campo}: …{trecho}…"
                if ok:
                    if texto[pos] not in textos:
                        return "fixa", [], f"cita a letra {texto[pos]}, que a questão não tem"
                    refs.append([campo, len(texto[:pos]), texto[pos]])
    return ("numeros" if numerica else "livre"), refs, ""


def carregar():
    questoes = {}
    for arq in sorted(glob.glob(os.path.join(ACERVO, "temas", "*.json"))):
        with open(arq, encoding="utf-8") as f:
            dados = json.load(f)
        lista = dados if isinstance(dados, list) else dados.get("questoes", dados)
        if isinstance(lista, dict):
            lista = list(lista.values())
        for q in lista:
            if isinstance(q, dict) and q.get("id"):
                questoes[q["id"]] = q
    comentarios = {}
    for arq in sorted(glob.glob(os.path.join(ACERVO, "comentarios", "*.json"))):
        with open(arq, encoding="utf-8") as f:
            comentarios.update(json.load(f))
    return questoes, comentarios


def gerar():
    questoes, comentarios = carregar()
    fixas, numeros, refs, motivos = {}, [], {}, {}
    for qid in sorted(questoes):
        q = questoes[qid]
        com = q.get("comentarioIA") or comentarios.get(qid)
        situacao, r, motivo = classificar(q, com)
        if situacao == "fixa":
            fixas[qid] = motivo
            motivos[qid] = motivo
            continue
        if situacao == "numeros":
            numeros.append(qid)
        if r:
            refs[qid] = {"h": assinatura(com), "r": r}
    # Sem as questões que nunca embaralhariam de qualquer jeito (o site já sabe pelas alternativas).
    saida = {
        "versao": 1,
        "fixas": {k: v for k, v in fixas.items() if v not in ("certo/errado ou dissertativa",)},
        "numeros": numeros,
        "refs": refs,
    }
    return saida, questoes, motivos


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--relatorio")
    ap.add_argument("--conferir", action="store_true")
    ap.add_argument("--saida", default=SAIDA, help="onde gravar (padrão: public/acervo/letras.json)")
    args = ap.parse_args()
    saida, questoes, motivos = gerar()
    texto = json.dumps(saida, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n"
    if args.conferir:
        atual = open(SAIDA, encoding="utf-8").read() if os.path.exists(SAIDA) else ""
        if atual != texto:
            print("public/acervo/letras.json desatualizado: rode python3 scripts/letras_alternativas.py", file=sys.stderr)
            return 1
        print("letras.json em dia")
        return 0
    with open(args.saida, "w", encoding="utf-8") as f:
        f.write(texto)
    total = len(questoes)
    ce = sum(1 for m in motivos.values() if m == "certo/errado ou dissertativa")
    fixas = len(saida["fixas"])
    livres = total - ce - fixas
    print(f"{total} questões: {livres} embaralham ({len(saida['numeros'])} só invertem a ordem), {fixas} ficam fixas, {ce} certo/errado ou dissertativa.")
    print(f"{sum(len(v['r']) for v in saida['refs'].values())} letras de alternativa em {len(saida['refs'])} comentários serão trocadas na tela.")
    if args.relatorio:
        grupos: dict[str, list[str]] = {}
        for qid, m in saida["fixas"].items():
            chave = re.sub(r":.*", "", re.sub(r"letra [A-E]", "letra X", m))
            grupos.setdefault(chave, []).append(f"- `{qid}`: {m}")
        with open(args.relatorio, "w", encoding="utf-8") as f:
            f.write(f"# Embaralhar alternativas: relatório\n\n{total} questões; {livres} embaralham, {fixas} fixas, {ce} certo/errado ou dissertativa.\n\n")
            for chave, linhas in sorted(grupos.items(), key=lambda x: -len(x[1])):
                f.write(f"## {chave} ({len(linhas)})\n\n" + "\n".join(linhas) + "\n\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
