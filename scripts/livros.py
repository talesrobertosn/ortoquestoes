#!/usr/bin/env python3
"""Leitura enxuta dos livros locais para a fila editorial (Tales, 30/10/2026: "crie suas próprias ferramentas").

Os PDFs ficam em OrtoQuestoes-Biblioteca/livros e nunca vão para o git. O texto extraído fica em
cache (%TEMP%/oqlivros/<apelido>.txt, uma página por quebra \f), e a saída já sai limpa:
parágrafos de texto corrido, sem referências bibliográficas, sem lixo de layout, para gastar
o mínimo de leitura.

Uso:
  python3 scripts/livros.py lista                         # apelidos dos livros e se já estão em cache
  python3 scripts/livros.py capitulos tach                # capítulos e a página do PDF onde começam
  python3 scripts/livros.py titulos tach 18               # seções do capítulo (linhas curtas de título)
  python3 scripts/livros.py buscar tach "posteromedial bowing" [--cap 18] [--max 8]
  python3 scripts/livros.py ler tach 785 786              # parágrafos limpos das páginas 785 e 786 do PDF
  python3 scripts/livros.py secao tach "Tibial Torsion" [--max 6000]   # texto da seção até o próximo título

A página citada no comentário é a impressa, só quando aparece no cabeçalho da página (o `ler` mostra o
cabeçalho); a do PDF serve só para achar e recortar figuras (scripts/figuras_livro.py).
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

PASTA_LIVROS = Path.home() / "OrtoQuestoes-Biblioteca" / "livros"
CACHE = Path(tempfile.gettempdir()) / "oqlivros"

# Apelido → trecho do nome do arquivo. Livro novo: acrescente aqui.
LIVROS = {
    "tach": "Tachdjian",
    "lw": "Lovell and Winters",
    "rwa": "Rockwood and Green",
    "rwc": "Rockwood and Wilkins",
    "campbell21": "campbell 2021",
    "netter-ao": "Netter Atlas de Anatomia Ortopedica",
    "netter-concise": "Netter's Concise",
    "netter-clin": "Netters Clinical Anatomy",
    "hoppenfeld": "Hoppenfeld  Surgical",
    "hoppenfeld-pt": "Hoppenfeld Vias de Acesso",
    "green7": "OPERATIVE HAND SURGERY, 7th",
    "adulthip": "The Adult Hip",
    "greenspan": "RADIOLOGIA ORTOPEDICA",
    "tarcisio": "EXAME FISICO EM ORTOPEDIA",
    "pardini": "PARDINI - VOL 01",
    "ao": "Manual_AO",
    "pedhand": "Pediatric Hand and Upper Limb",
}


def pdf_de(apelido: str) -> Path:
    trecho = LIVROS.get(apelido, apelido)
    achados = [p for p in PASTA_LIVROS.glob("*.pdf") if trecho.lower() in p.name.lower()]
    if not achados:
        sys.exit(f"livro não encontrado: {apelido} ({trecho})")
    return sorted(achados, key=lambda p: len(p.name))[0]


def paginas(apelido: str) -> list[str]:
    CACHE.mkdir(exist_ok=True)
    txt = CACHE / f"{apelido}.pag.txt"
    if not txt.exists():
        subprocess.run(["pdftotext", "-enc", "UTF-8", str(pdf_de(apelido)), str(txt)], check=True)
    bruto = txt.read_text(encoding="utf-8", errors="ignore").replace("�", "").replace("­", "")
    return bruto.split("\f")


REFERENCIA = re.compile(r"^\s*\d{1,3}\.\s?[A-Z][A-Za-z'\-]+ [A-Z]{1,3}[,.]|J Bone Joint Surg|Clin Orthop|J Pediatr Orthop|;\d{1,3}\(\d")


def limpar(pagina: str) -> list[str]:
    """Junta as linhas em parágrafos e descarta referências, legendas soltas e fragmentos."""
    blocos, atual = [], []
    for linha in pagina.splitlines():
        if not linha.strip():
            if atual:
                blocos.append(" ".join(atual)); atual = []
            continue
        atual.append(linha.strip())
    if atual:
        blocos.append(" ".join(atual))
    saida = []
    for b in blocos:
        b = re.sub(r"(\w)- (\w)", r"\1\2", b)  # hifenização do layout
        if len(b) < 60 and not re.match(r"^(FIG|TABLE|Box)", b):
            continue
        if REFERENCIA.search(b) and len(re.findall(r"\d{4};", b)) >= 1:
            continue
        saida.append(b)
    return saida


def cabecalho(pagina: str) -> str:
    """Primeira linha com número de página impressa, se houver (ex.: 'CHAPTER 18 Disorders of the Leg 637')."""
    for linha in pagina.splitlines()[:6]:
        if re.search(r"\b\d{2,4}\s*$", linha.strip()) and len(linha.strip()) < 90:
            return linha.strip()
    return ""


def cmd_lista(a) -> int:
    for k, v in LIVROS.items():
        try:
            nome = pdf_de(k).name
        except SystemExit:
            nome = "(não encontrado)"
        print(f"{k:15} {'cache' if (CACHE / f'{k}.pag.txt').exists() else '     '}  {nome}")
    return 0


def cmd_capitulos(a) -> int:
    vistos = set()
    for i, p in enumerate(paginas(a.livro), start=1):
        for m in re.finditer(r"^(CHAPTER|Chapter|CAPÍTULO|Capítulo)\s+(\d+)\s+([^\n]{3,80})$", p, re.M):
            n = int(m.group(2))
            if n not in vistos:
                vistos.add(n); print(f"cap. {n:3}  pág. PDF {i:5}  {m.group(3).strip()}")
    return 0


def faixa_capitulo(pags: list[str], cap: int) -> tuple[int, int]:
    ini = fim = None
    for i, p in enumerate(pags):
        if ini is None and re.search(rf"^(CHAPTER|Chapter|CAPÍTULO|Capítulo)\s+{cap}\s+\S", p, re.M):
            ini = i
        elif ini is not None and re.search(rf"^(CHAPTER|Chapter|CAPÍTULO|Capítulo)\s+{cap + 1}\s+\S", p, re.M):
            fim = i; break
    if ini is None:
        sys.exit(f"capítulo {cap} não encontrado")
    return ini, fim or len(pags)


def cmd_titulos(a) -> int:
    pags = paginas(a.livro)
    ini, fim = faixa_capitulo(pags, a.cap)
    vistos = set()
    for i in range(ini, fim):
        for linha in pags[i].splitlines():
            t = linha.strip()
            if 4 < len(t) < 70 and t[0].isupper() and not t.endswith((".", ",", ";")) and not re.match(r"^(FIG|TABLE|CHAPTER|\d)", t) \
                    and len(t.split()) <= 9 and sum(c.isalpha() for c in t) > 0.7 * len(t.replace(" ", "")) and t not in vistos:
                vistos.add(t); print(f"pág. PDF {i + 1:5}  {t}")
    return 0


def cmd_buscar(a) -> int:
    pags = paginas(a.livro)
    ini, fim = faixa_capitulo(pags, a.cap) if a.cap else (0, len(pags))
    alvo = a.termo.lower(); n = 0
    for i in range(ini, fim):
        for b in limpar(pags[i]):
            pos = b.lower().find(alvo)
            if pos >= 0:
                print(f"[pág. PDF {i + 1}] …{b[max(0, pos - 200):pos + 400]}…\n"); n += 1
                if n >= a.max:
                    return 0
    return 0


def cmd_ler(a) -> int:
    pags = paginas(a.livro)
    for i in range(a.inicio, (a.fim or a.inicio) + 1):
        p = pags[i - 1]
        print(f"===== pág. PDF {i} · {cabecalho(p) or 'sem página impressa no cabeçalho'}")
        for b in limpar(p):
            print(b + "\n")
    return 0


def cmd_secao(a) -> int:
    pags = paginas(a.livro)
    for i, p in enumerate(pags):
        if re.search(rf"^\s*{re.escape(a.titulo)}\s*$", p, re.M):
            texto = "\n\n".join(b for j in range(i, min(i + 6, len(pags))) for b in limpar(pags[j]))
            k = texto.find(a.titulo)
            print(f"[a partir da pág. PDF {i + 1} · {cabecalho(p)}]\n{texto[max(0, k):max(0, k) + a.max]}")
            return 0
    sys.exit(f"seção não encontrada: {a.titulo}")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="cmd", required=True)
    s.add_parser("lista").set_defaults(f=cmd_lista)
    x = s.add_parser("capitulos"); x.add_argument("livro"); x.set_defaults(f=cmd_capitulos)
    x = s.add_parser("titulos"); x.add_argument("livro"); x.add_argument("cap", type=int); x.set_defaults(f=cmd_titulos)
    x = s.add_parser("buscar"); x.add_argument("livro"); x.add_argument("termo"); x.add_argument("--cap", type=int); x.add_argument("--max", type=int, default=8); x.set_defaults(f=cmd_buscar)
    x = s.add_parser("ler"); x.add_argument("livro"); x.add_argument("inicio", type=int); x.add_argument("fim", type=int, nargs="?"); x.set_defaults(f=cmd_ler)
    x = s.add_parser("secao"); x.add_argument("livro"); x.add_argument("titulo"); x.add_argument("--max", type=int, default=6000); x.set_defaults(f=cmd_secao)
    a = p.parse_args()
    return a.f(a)


if __name__ == "__main__":
    raise SystemExit(main())
