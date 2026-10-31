"""Aviso de moldura nos resumos (Tales, 31/10/2026; docs/biblioteca/FLUXO-MESTRE.md, seções 4, 6 e 7).

O resumo cresce pelo conteúdo do capítulo, não por seções de moldura. Este script soma o tamanho das
seções genéricas (perguntas de revisão, casos, tabelas de tempos, revisão rápida) e avisa quando passam
de 10% do resumo; com --estrito, sai com erro.

Uso:
  python3 scripts/biblioteca/checar_resumo.py [ids ...] [--estrito]
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MOLDURA = re.compile(r"^# (Perguntas que a banca faz|Três casos|Quatro casos|Casos para fixar|Limites e tempos|Imobilização e seguimento|Revisão rápida|Tempos e limites)", re.I)
LIMITE = 0.10


def fracao(texto: str) -> float:
    secoes = re.split(r"(?m)^(?=# )", texto)
    moldura = sum(len(s) for s in secoes if MOLDURA.match(s))
    return moldura / max(1, len(texto))


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    estrito = "--estrito" in sys.argv
    arquivos = [RAIZ / f"conteudo/biblioteca/{i}.md" for i in args] or sorted((RAIZ / "conteudo/biblioteca").glob("*.md"))
    ruins = 0
    for p in arquivos:
        f = fracao(p.read_text(encoding="utf-8"))
        if f > LIMITE:
            ruins += 1
            print(f"AVISO: {p.stem}: {f:.0%} do texto em seções de moldura (limite {LIMITE:.0%}); cresça pelo capítulo")
    print(f"{len(arquivos)} resumo(s) conferido(s), {ruins} com moldura acima do limite")
    return 1 if (estrito and ruins) else 0


if __name__ == "__main__":
    raise SystemExit(main())
