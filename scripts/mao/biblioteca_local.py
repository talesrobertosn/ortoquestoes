"""Biblioteca local de cirurgia da mão: livros, resumos e provas que NUNCA vão para o GitHub.

Roda no computador do Tales, dentro do Claude Code, sobre uma pasta fora do repositório
(padrão: ~/OrtoQuestoes-Biblioteca). Tudo o que este script grava fica em <pasta>/.oq/.
Só precisa de Python 3 e do pdftotext (poppler). Protocolo completo: docs/mao/PROTOCOLO.md.

Uso (sempre com python3 -I, porque a pasta tem arquivos de fora):
  (todos aceitam --pasta PASTA; sem ela, usa $OQ_BIBLIOTECA ou ~/OrtoQuestoes-Biblioteca)
  python3 -I scripts/mao/biblioteca_local.py inventario
      classifica cada arquivo (livro, resumo simples, resumo composto, prova, gabarito, outro)
      e grava .oq/inventario.md e .oq/inventario.json. Rode antes de tudo.
  python3 -I scripts/mao/biblioteca_local.py indexar
      extrai o texto página a página (com a página IMPRESSA do livro quando aparece) e o capítulo.
  python3 -I scripts/mao/biblioteca_local.py buscar "termos" [-n 8] [--tipo livro|resumo]
      páginas mais relevantes, com arquivo, capítulo, página impressa e trecho.
  python3 -I scripts/mao/biblioteca_local.py ler ARQUIVO PAG [PAG_FIM] [--pdf]
      mostra o texto das páginas (PAG é a página impressa; com --pdf, a posição no PDF).
  python3 -I scripts/mao/biblioteca_local.py questoes ARQUIVO_PROVA SLUG
      separa a prova em questões numeradas (.oq/provas/SLUG.json) e lê o gabarito se houver.
  python3 -I scripts/mao/biblioteca_local.py plano SLUG [-n 6]
      para cada questão, as páginas do livro e dos resumos que devem ser lidas (.oq/planos/SLUG.md).
      (buscar ignora as provas: só livros e resumos, salvo --tipo prova)
  python3 -I scripts/mao/biblioteca_local.py copia LOTE.py SLUG
      confere se algum enunciado ou alternativa do lote repete 7 palavras seguidas da prova original.
"""
import argparse
import ast
import json
import math
import os
import re
import subprocess
import sys
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

PADRAO = Path(os.environ.get("OQ_BIBLIOTECA", Path.home() / "OrtoQuestoes-Biblioteca"))
RAIZ_REPO = Path(__file__).resolve().parents[2]
EXT = {".pdf", ".docx", ".md", ".txt"}

STOP = set("""a o e é de da do das dos em no na nos nas um uma uns umas para por com sem que se ao aos à às
ou mais menos como qual quais sobre entre seu sua seus suas pelo pela pelos pelas ser são está estão foi
sao esta estao mais muito pode podem deve devem quando onde isso este esta esse essa nao não the of and to in
is are with for on by an be or as at from it this that alternativa correta incorreta assinale questao questão
seguir respectivamente exceto afirmativa afirmativas verdadeira falsa""".split())


def sem_acento(t):
    return "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")


def palavras(t):
    return [p for p in re.findall(r"[a-z0-9]+", sem_acento(t)) if len(p) > 2 and p not in STOP]


def pasta_segura(p):
    p = Path(p).expanduser().resolve()
    if not p.is_dir():
        sys.exit(f"pasta não encontrada: {p}  (crie e coloque os livros, resumos e provas nela)")
    try:
        p.relative_to(RAIZ_REPO)
        dentro = True
    except ValueError:
        dentro = False
    if dentro:
        ign = subprocess.run(["git", "-C", str(RAIZ_REPO), "check-ignore", "-q", str(p)]).returncode == 0
        if not ign:
            sys.exit(f"{p} está dentro do repositório e não está no .gitignore: os livros iriam para o GitHub. "
                     "Use uma pasta fora do repositório (padrão ~/OrtoQuestoes-Biblioteca) ou biblioteca-local/.")
    (p / ".oq").mkdir(exist_ok=True)
    return p


# ---------- extração ----------

def paginas_pdf(arq):
    r = subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", str(arq), "-"], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  aviso: pdftotext falhou em {arq.name}: {r.stderr.strip()[:120]}", file=sys.stderr)
        return []
    pags = r.stdout.split("\f")
    if pags and not pags[-1].strip():
        pags.pop()
    return pags


def texto_docx(arq):
    """Texto do .docx, recriando a numeração automática do Word ("1.", "a)"), que não fica no XML."""
    with zipfile.ZipFile(arq) as z:
        xml = z.read("word/document.xml").decode("utf8", "ignore")
        numxml = z.read("word/numbering.xml").decode("utf8", "ignore") if "word/numbering.xml" in z.namelist() else ""
    formato, inicio = {}, {}  # (abstractNumId, nível) -> numFmt e valor inicial
    for an in re.finditer(r'<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"(.*?)</w:abstractNum>', numxml, re.S):
        for lv in re.finditer(r'<w:lvl\b[^>]*w:ilvl="(\d+)"(.*?)</w:lvl>', an.group(2), re.S):
            fm = re.search(r'<w:numFmt w:val="(\w+)"', lv.group(2))
            st = re.search(r'<w:start w:val="(\d+)"', lv.group(2))
            formato[(an.group(1), lv.group(1))] = fm.group(1) if fm else "decimal"
            inicio[(an.group(1), lv.group(1))] = int(st.group(1)) if st else 1
    abstrato, sobrepor = {}, {}
    for nm in re.finditer(r'<w:num\b[^>]*w:numId="(\d+)"[^>]*>(.*?)</w:num>', numxml, re.S):
        ab = re.search(r'<w:abstractNumId w:val="(\d+)"', nm.group(2))
        abstrato[nm.group(1)] = ab.group(1) if ab else nm.group(1)
        for ov in re.finditer(r'<w:lvlOverride w:ilvl="(\d+)"[^>]*>.*?<w:startOverride w:val="(\d+)"', nm.group(2), re.S):
            sobrepor[(nm.group(1), ov.group(1))] = int(ov.group(2))
    contador = {}  # (numId, nível) -> último número; cada numId é uma lista do Word
    linhas = []
    for par in re.findall(r"<w:p\b.*?</w:p>", xml, re.S):
        prefixo = ""
        num = re.search(r'<w:numPr>(.*?)</w:numPr>', par, re.S)
        nid = re.search(r'<w:numId w:val="(\d+)"', num.group(1)) if num else None
        if nid and nid.group(1) != "0":
            nid = nid.group(1)
            lv = re.search(r'<w:ilvl w:val="(\d+)"', num.group(1))
            nivel = lv.group(1) if lv else "0"
            ab = abstrato.get(nid, nid)
            chave = (nid, nivel)
            if chave not in contador:
                contador[chave] = sobrepor.get(chave, inicio.get((ab, nivel), 1)) - 1
            contador[chave] += 1
            for outra in [c for c in contador if c[0] == nid and int(c[1]) > int(nivel)]:
                del contador[outra]
            k, fm = contador[chave], formato.get((ab, nivel), "decimal")
            if fm in ("lowerLetter", "upperLetter"):
                prefixo = "abcdefghij"[(k - 1) % 10] + ") "
            elif fm in ("bullet", "none"):
                prefixo = ""
            else:
                prefixo = f"{k}. "
        corpo = re.sub(r"<w:tab\s*/>", "\t", par)
        corpo = re.sub(r"<w:br\s*/>", "\n", corpo)
        linhas.append(prefixo + re.sub(r"<[^>]+>", "", corpo))
    t = "\n".join(linhas)
    for a, b in (("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&apos;", "'")):
        t = t.replace(a, b)
    return t


def paginas_de(arq):
    """Lista de textos: páginas reais no PDF; blocos de ~3.000 caracteres nos demais (resumos não têm página)."""
    if arq.suffix.lower() == ".pdf":
        return paginas_pdf(arq), True
    t = texto_docx(arq) if arq.suffix.lower() == ".docx" else arq.read_text("utf8", "ignore")
    blocos, atual = [], ""
    for par in t.split("\n"):
        atual += par + "\n"
        if len(atual) > 3000:
            blocos.append(atual)
            atual = ""
    if atual.strip():
        blocos.append(atual)
    return blocos, False


RE_CAP = re.compile(r"^\s*(?:cap[ií]tulo|chapter)\s+(\d{1,3})\b(.{0,80})", re.I | re.M)


def pagina_impressa(txt):
    """Número impresso no topo ou no rodapé da página (cabeçalho do livro), se houver."""
    linhas = [l.strip() for l in txt.strip().splitlines() if l.strip()]
    for l in linhas[:3] + linhas[-3:]:
        m = re.fullmatch(r"(\d{1,4})|(\d{1,4})\s{2,}.*|.*\s{2,}(\d{1,4})", l)
        if m:
            n = int(next(g for g in m.groups() if g))
            if 0 < n < 5000:
                return n
    return None


def classificar(arq, pags, e_pdf):
    nome = sem_acento(arq.stem)
    amostra = sem_acento(" ".join(pags[:6]))[:20000]
    tudo = sem_acento(" ".join(pags))
    n_alts = len(re.findall(r"(?m)^\s*[a-e]\s*[\)\.]\s+\S", tudo))
    n_q = len(re.findall(r"(?m)^\s*(?:quest[aã]o\s*)?\d{1,3}\s*[\)\.\-]\s+\S", tudo))
    caps = {m.group(1) for m in RE_CAP.finditer(" ".join(pags))}
    if re.search(r"gabarito", nome):
        return "gabarito"
    if re.search(r"prova|simao|sbcm|titulo|exame|questoes|simulado", nome) or (n_q >= 20 and n_alts >= 60):
        return "prova"
    if n_q < 10 and re.search(r"gabarito", amostra[:3000]):
        return "gabarito"
    if re.search(r"resumo|sumario|apostila|anotac|revisao|mapa", nome) or not e_pdf:
        return "resumo composto" if len(caps) > 1 or len(re.findall(r"(?m)^#{1,2} ", " ".join(pags))) > 4 else "resumo simples"
    if e_pdf and (len(pags) >= 40 or caps or re.search(r"green|livro|cap|chapter|edicao", nome)):
        return "livro"
    return "outro"


def carregar_paginas(p):
    f = p / ".oq/paginas.jsonl"
    if not f.exists():
        sys.exit("índice não encontrado: rode antes  python3 -I scripts/mao/biblioteca_local.py indexar")
    return [json.loads(l) for l in open(f, encoding="utf8")]


def arquivos(p):
    return sorted(a for a in p.rglob("*") if a.is_file() and a.suffix.lower() in EXT and ".oq" not in a.parts)


# ---------- comandos ----------

def cmd_inventario(a):
    p = pasta_segura(a.pasta)
    itens = []
    for arq in arquivos(p):
        pags, e_pdf = paginas_de(arq)
        tipo = classificar(arq, pags, e_pdf)
        caps = []
        for m in RE_CAP.finditer("\n".join(pags)):
            c = f"{m.group(1)} {m.group(2).strip()}".strip()
            if c not in caps:
                caps.append(c)
        impressas = [x for x in (pagina_impressa(t) for t in pags) if x] if e_pdf else []
        itens.append({"arquivo": str(arq.relative_to(p)), "tipo": tipo, "paginas": len(pags) if e_pdf else None,
                      "blocos": None if e_pdf else len(pags), "caracteres": sum(map(len, pags)),
                      "pagina_impressa": [min(impressas), max(impressas)] if impressas else None,
                      "capitulos": caps[:40], "sem_texto": e_pdf and sum(map(len, pags)) < 200 * max(1, len(pags))})
    json.dump(itens, open(p / ".oq/inventario.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    por = defaultdict(list)
    for i in itens:
        por[i["tipo"]].append(i)
    md = ["# Inventário da biblioteca local", "", f"Pasta: `{p}` ({len(itens)} arquivos). Gerado por biblioteca_local.py.", "",
          "Confira a coluna **tipo**: se algum estiver errado, renomeie o arquivo (ex.: incluir 'resumo', 'prova' ou",
          "'gabarito' no nome) e rode de novo. PDF **sem texto** é escaneado: precisa de OCR antes de indexar.", ""]
    for tipo in ("livro", "resumo composto", "resumo simples", "prova", "gabarito", "outro"):
        if not por[tipo]:
            continue
        md += [f"## {tipo.capitalize()} ({len(por[tipo])})", "", "| Arquivo | Páginas | Página impressa | Capítulos | Alerta |", "|---|---|---|---|---|"]
        for i in por[tipo]:
            pi = f"{i['pagina_impressa'][0]} a {i['pagina_impressa'][1]}" if i["pagina_impressa"] else "não detectada"
            caps = "; ".join(i["capitulos"][:6]) + (" ..." if len(i["capitulos"]) > 6 else "")
            md.append(f"| {i['arquivo']} | {i['paginas'] or str(i['blocos']) + ' blocos'} | {pi} | {caps} | {'SEM TEXTO (OCR)' if i['sem_texto'] else ''} |")
        md.append("")
    (p / ".oq/inventario.md").write_text("\n".join(md), encoding="utf8")
    print("\n".join(md))


def cmd_indexar(a):
    p = pasta_segura(a.pasta)
    inv = {i["arquivo"]: i["tipo"] for i in json.load(open(p / ".oq/inventario.json"))} if (p / ".oq/inventario.json").exists() else {}
    if not inv:
        print("aviso: sem inventário; rode 'inventario' antes para conferir os tipos.", file=sys.stderr)
    n = 0
    with open(p / ".oq/paginas.jsonl", "w", encoding="utf8") as saida:
        for arq in arquivos(p):
            rel = str(arq.relative_to(p))
            pags, e_pdf = paginas_de(arq)
            tipo = inv.get(rel) or classificar(arq, pags, e_pdf)
            cap, ultima = None, None
            for i, t in enumerate(pags, 1):
                m = RE_CAP.search(t)
                if m:
                    cap = f"{m.group(1)} {m.group(2).strip()}".strip()
                imp = pagina_impressa(t) if e_pdf else None
                if imp is None and ultima is not None and e_pdf:
                    imp_inferida = ultima + 1
                else:
                    imp_inferida = None
                ultima = imp or imp_inferida
                saida.write(json.dumps({"arquivo": rel, "tipo": tipo, "pdf": i if e_pdf else None, "bloco": None if e_pdf else i,
                                        "impressa": imp, "impressa_inferida": imp_inferida, "capitulo": cap,
                                        "texto": t}, ensure_ascii=False) + "\n")
                n += 1
            print(f"  {tipo:16} {rel}: {len(pags)} {'páginas' if e_pdf else 'blocos'}")
    print(f"índice: {n} páginas/blocos em {p / '.oq/paginas.jsonl'}")


def rotulo(r):
    if r["pdf"] is None:
        return f"{r['arquivo']} (resumo, bloco {r['bloco']}{', cap. ' + r['capitulo'] if r['capitulo'] else ''})"
    pag = f"p. {r['impressa']}" if r["impressa"] else (f"p. {r['impressa_inferida']} (inferida)" if r["impressa_inferida"] else "página impressa não detectada")
    return f"{r['arquivo']} | cap. {r['capitulo'] or '?'} | {pag} | folha {r['pdf']} do PDF"


def ranquear(regs, consulta, n, tipo=None):
    alvo = [r for r in regs if (r["tipo"].startswith(tipo) if tipo else r["tipo"] in ("livro", "resumo simples", "resumo composto"))]
    docs = [Counter(palavras(r["texto"])) for r in alvo]
    df = Counter(w for d in docs for w in d)
    N = len(docs) or 1
    med = sum(sum(d.values()) for d in docs) / N if docs else 1
    q = palavras(consulta)
    out = []
    for r, d in zip(alvo, docs):
        tam = sum(d.values()) or 1
        s = 0.0
        for w in set(q):
            if d[w]:
                idf = math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5))
                s += idf * d[w] * 2.2 / (d[w] + 1.2 * (0.25 + 0.75 * tam / med))
        if s > 0:
            out.append((s, r))
    out.sort(key=lambda x: -x[0])
    return out[:n], q


def trecho(texto, q, largura=260):
    t = " ".join(texto.split())
    st = sem_acento(t)
    pos = min((st.find(w) for w in q if st.find(w) >= 0), default=0)
    ini = max(0, pos - largura // 3)
    return ("..." if ini else "") + t[ini:ini + largura] + "..."


def cmd_buscar(a):
    p = pasta_segura(a.pasta)
    res, q = ranquear(carregar_paginas(p), a.termos, a.n, a.tipo)
    if not res:
        print("nada encontrado; tente sinônimos em português e em inglês (o Green pode ter termos originais).")
    for s, r in res:
        print(f"[{s:5.1f}] {rotulo(r)}\n        {trecho(r['texto'], q)}\n")


def cmd_ler(a):
    p = pasta_segura(a.pasta)
    regs = [r for r in carregar_paginas(p) if r["arquivo"] == a.arquivo or Path(r["arquivo"]).name == a.arquivo]
    if not regs:
        sys.exit(f"arquivo não está no índice: {a.arquivo}")
    fim = a.fim or a.pag
    for r in regs:
        chave = r["pdf"] or r["bloco"] if a.pdf else (r["impressa"] or r["impressa_inferida"] or (r["bloco"] if r["pdf"] is None else None))
        if chave is not None and a.pag <= chave <= fim:
            print(f"===== {rotulo(r)} =====\n{r['texto']}\n")


RE_Q = re.compile(r"(?m)^\s*(?:quest[aã]o\s*)?(\d{1,3})\s*[\)\.\-–:]\s+")
RE_ALT = re.compile(r"(?m)^\s*\(?([a-eA-E])\s*[\)\.\-]\s+")


def cmd_questoes(a):
    p = pasta_segura(a.pasta)
    arq = Path(a.arquivo).expanduser()
    if not arq.is_absolute():
        arq = p / arq
    if arq.suffix.lower() == ".json":  # prova já separada (ex.: SIMAO-2023-questoes.json): só copia para .oq/provas
        dados = json.load(open(arq, encoding="utf8"))
        (p / ".oq/provas").mkdir(exist_ok=True)
        dados["slug"] = a.slug
        json.dump(dados, open(p / f".oq/provas/{a.slug}.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
        qs = dados["questoes"]
        print(f"{len(qs)} questões copiadas; com gabarito: {sum(1 for q in qs if q.get('gabarito_oficial'))}; "
              f"com alerta: {[q['num'] for q in qs if q.get('alerta')]}")
        return
    pags, _ = paginas_de(arq)
    t = "\n".join(pags)
    gab = {}
    mg = re.search(r"(?is)gabarito(.*)$", t)
    if mg and len(mg.group(1)) < 6000:
        for n, l in re.findall(r"(\d{1,3})\s*[\-\.\):=]?\s*([A-Ea-e])\b", mg.group(1)):
            gab[int(n)] = l.upper()
        t = t[:mg.start()]
    marcas = [m for m in RE_Q.finditer(t)]
    qs, esperado = [], 1
    validas = []
    for m in marcas:  # só aceita a numeração em sequência (evita "2. ..." dentro de uma alternativa)
        if int(m.group(1)) == esperado:
            validas.append(m)
            esperado += 1
    for i, m in enumerate(validas):
        bloco = t[m.end(): validas[i + 1].start() if i + 1 < len(validas) else len(t)]
        alts = list(RE_ALT.finditer(bloco))
        enun = " ".join(bloco[: alts[0].start() if alts else len(bloco)].split())
        alternativas = {}
        for j, x in enumerate(alts):
            alternativas[x.group(1).upper()] = " ".join(bloco[x.end(): alts[j + 1].start() if j + 1 < len(alts) else len(bloco)].split())
        num = int(m.group(1))
        qs.append({"num": num, "enunciado": enun, "alternativas": alternativas, "gabarito_oficial": gab.get(num),
                   "alerta": None if len(alternativas) in (4, 5) else f"{len(alternativas)} alternativas lidas: conferir no arquivo"})
    (p / ".oq/provas").mkdir(exist_ok=True)
    destino = p / f".oq/provas/{a.slug}.json"
    json.dump({"arquivo": str(arq), "slug": a.slug, "questoes": qs}, open(destino, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    ruins = [q["num"] for q in qs if q["alerta"]]
    print(f"{len(qs)} questões em {destino}; gabarito oficial lido para {len(gab)}; conferir à mão: {ruins or 'nenhuma'}")
    if len(qs) < 10:
        print("aviso: poucas questões. A numeração do arquivo pode ser diferente; separe à mão ou ajuste o arquivo.")


def cmd_plano(a):
    p = pasta_segura(a.pasta)
    prova = json.load(open(p / f".oq/provas/{a.slug}.json", encoding="utf8"))
    regs = carregar_paginas(p)
    md = [f"# Plano de leitura: {a.slug}", "", "Gerado por biblioteca_local.py (fica só na máquina, em .oq/planos).",
          "As páginas são sugestões por palavra-chave: confirme lendo. Se a sugestão não tiver o assunto, busque com",
          "outros termos (sinônimo, epônimo, termo em inglês) antes de comentar.", ""]
    for q in prova["questoes"]:
        consulta = q["enunciado"] + " " + " ".join(q["alternativas"].values())
        livros, qq = ranquear(regs, consulta, a.n, "livro")
        resumos, _ = ranquear(regs, consulta, 3, "resumo")
        md += [f"## Questão {q['num']}", "", f"Palavras-chave: {', '.join(sorted(set(qq))[:14])}", ""]
        md += [f"- livro: {rotulo(r)}" for _, r in livros] or ["- livro: nada encontrado, buscar à mão"]
        md += [f"- resumo: {rotulo(r)}" for _, r in resumos]
        md.append("")
    (p / ".oq/planos").mkdir(exist_ok=True)
    destino = p / f".oq/planos/{a.slug}.md"
    destino.write_text("\n".join(md), encoding="utf8")
    print(f"plano de {len(prova['questoes'])} questões em {destino}")


def ngramas(t, k=7):
    w = re.findall(r"[a-z0-9]+", sem_acento(t))
    return {" ".join(w[i:i + k]) for i in range(len(w) - k + 1)}


def cmd_copia(a):
    p = pasta_segura(a.pasta)
    prova = json.load(open(p / f".oq/provas/{a.slug}.json", encoding="utf8"))
    orig = set()
    for q in prova["questoes"]:
        orig |= ngramas(q["enunciado"])
        for t in q["alternativas"].values():
            orig |= ngramas(t)
    arvore = ast.parse(Path(a.lote).read_text("utf8"))
    textos = []
    for no in ast.walk(arvore):
        if isinstance(no, ast.keyword) and no.arg in ("enun", "alts"):
            v = ast.literal_eval(no.value)
            textos += v if isinstance(v, list) else [v]
    achados = [(t[:70], g) for t in textos for g in ngramas(t) & orig]
    for t, g in achados:
        print(f"CÓPIA: '{g}' em '{t}...'")
    print(f"{len(textos)} textos conferidos; {len(achados)} trechos de 7 palavras iguais ao original.")
    sys.exit(1 if achados else 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    def novo(nome, f):
        s = sub.add_parser(nome)
        s.add_argument("--pasta", default=PADRAO, help="pasta da biblioteca (padrão: $OQ_BIBLIOTECA ou ~/OrtoQuestoes-Biblioteca)")
        s.set_defaults(f=f)
        return s
    novo("inventario", cmd_inventario)
    novo("indexar", cmd_indexar)
    s = novo("buscar", cmd_buscar); s.add_argument("termos"); s.add_argument("-n", type=int, default=8)
    s.add_argument("--tipo", choices=["livro", "resumo", "prova"])
    s = novo("ler", cmd_ler); s.add_argument("arquivo"); s.add_argument("pag", type=int); s.add_argument("fim", type=int, nargs="?")
    s.add_argument("--pdf", action="store_true")
    s = novo("questoes", cmd_questoes); s.add_argument("arquivo"); s.add_argument("slug")
    s = novo("plano", cmd_plano); s.add_argument("slug"); s.add_argument("-n", type=int, default=6)
    s = novo("copia", cmd_copia); s.add_argument("lote"); s.add_argument("slug")
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
