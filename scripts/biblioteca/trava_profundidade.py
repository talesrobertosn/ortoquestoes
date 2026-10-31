#!/usr/bin/env python3
"""Trava de profundidade: barra resumos e comentários curtos antes de publicar.

Criada em 30/10/2026, depois de uma noite em que 20 resumos (3 a 13 minutos de leitura) e centenas de
comentários de 1 a 2 mil caracteres foram publicados apesar da regra. Compara o branch atual com a base e
olha só o que mudou:
  - resumo novo ou alterado em conteudo/biblioteca: no mínimo 45 KB;
  - comentário novo ou alterado em public/acervo/comentarios: conceito + correta + incorretas >= 800 (piso contra o
    raso; acima disso o tamanho é proporcional à questão, Tales, 31/10/2026).

Exceção justificada (capítulo curto de verdade, questão anulada etc.): acrescente o id e o motivo em
docs/biblioteca/excecoes-profundidade.json. Sem motivo escrito, não há exceção.

Uso (o pos_aplicar.sh e o publicar_pr.sh chamam sozinhos):
  python3 scripts/biblioteca/trava_profundidade.py [base]
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "biblioteca"))
from medir_profundidade import MIN_COMENTARIO, MIN_RESUMO, tamanho_comentario  # noqa: E402

BASE = "origin/claude/pdfs-questoes-tp64dr"
EXCECOES = RAIZ / "docs/biblioteca/excecoes-profundidade.json"


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=RAIZ, capture_output=True, text=True).stdout


def na_base(base: str, caminho: str) -> str | None:
    r = subprocess.run(["git", "show", f"{base}:{caminho}"], cwd=RAIZ, capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else BASE
    excecoes = json.loads(EXCECOES.read_text(encoding="utf-8")) if EXCECOES.exists() else {}
    ponto = git("merge-base", base, "HEAD").strip() or base
    mudados = set(git("diff", "--name-only", ponto).split()) | set(git("ls-files", "--others", "--exclude-standard").split())
    falhas = []
    for caminho in sorted(mudados):
        arq = RAIZ / caminho
        if not arq.exists():
            continue
        if caminho.startswith("conteudo/biblioteca/") and caminho.endswith(".md"):
            rid = arq.stem
            n = len(arq.read_text(encoding="utf-8"))
            if n < MIN_RESUMO and rid not in excecoes:
                falhas.append(f"resumo {rid}: {n} caracteres (mínimo {MIN_RESUMO})")
        elif caminho.startswith("public/acervo/comentarios/") and caminho.endswith(".json"):
            atual = json.loads(arq.read_text(encoding="utf-8"))
            atual = atual.get("comentarios", atual)
            antes_txt = na_base(ponto, caminho)
            antes = json.loads(antes_txt) if antes_txt else {}
            antes = antes.get("comentarios", antes)
            for qid, c in atual.items():
                if not isinstance(c, dict) or antes.get(qid) == c or qid in excecoes:
                    continue
                n = tamanho_comentario(c)
                if n < MIN_COMENTARIO:
                    falhas.append(f"comentário {qid}: {n} caracteres (mínimo {MIN_COMENTARIO})")
    if falhas:
        print("TRAVA DE PROFUNDIDADE: há conteúdo curto neste branch.")
        for f in falhas:
            print("  CURTO", f)
        print("Reescreva no padrão (docs/biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md) ou registre a exceção com motivo.")
        return 1
    print("trava de profundidade: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
