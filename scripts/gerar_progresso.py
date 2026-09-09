#!/usr/bin/env python3
"""
Mantém public/acervo/progresso.json: quantas questões já foram comentadas
pela IA e pela comunidade, dia a dia.

O arquivo tem dois modos de vida. O histórico até hoje foi reconstruído uma
única vez a partir do git (`--reconstruir`), porque cada lote de comentários
virou um commit datado e essa é a única fonte fiel do passado. Do dia a dia
em diante, `gerar_indice.py` chama a função de acrescentar o ponto de hoje,
lendo o acervo no disco.

Por que não reconstruir do git a cada publicação: o checkout do GitHub Actions
é raso (fetch-depth 1), então lá o histórico simplesmente não existe. O arquivo
é versionado junto com o acervo, e é ele que a página de progresso baixa.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_ACERVO, DIR_TEMAS, gravar_json, ler_json  # noqa: E402

DIR_COMENTARIOS = DIR_ACERVO / "comentarios"
CAMINHO_PROGRESSO = DIR_ACERVO / "progresso.json"
RAIZ = Path(__file__).resolve().parent.parent

# Caminhos como o git os conhece, sempre com barra normal.
REL_COMENTARIOS = "public/acervo/comentarios"
REL_TEMAS = "public/acervo/temas"


def contar_no_disco() -> dict:
    """Conta o acervo como ele está agora, nos arquivos."""
    total = 0
    comunidade = 0
    for caminho in sorted(DIR_TEMAS.glob("*.json")):
        dados = ler_json(caminho, {"questoes": []}) or {"questoes": []}
        for questao in dados.get("questoes", []):
            # Anuladas fora do denominador, como no resto do site: elas não
            # recebem comentário, e contá-las faria os 100% nunca chegarem.
            if questao.get("anulada"):
                continue
            total += 1
            if questao.get("comentariosComunidade"):
                comunidade += 1

    ia = 0
    if DIR_COMENTARIOS.is_dir():
        for caminho in sorted(DIR_COMENTARIOS.glob("*.json")):
            ia += len(ler_json(caminho, {}) or {})

    return {"total": total, "ia": ia, "comunidade": comunidade}


# ---------------------------------------------------------------- git ----


def _git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=RAIZ, capture_output=True, text=True, check=True
    ).stdout


def _arquivos_da_arvore(sha: str, diretorio: str) -> list[str]:
    saida = _git("ls-tree", "--name-only", f"{sha}:{diretorio}")
    return [linha for linha in saida.splitlines() if linha.endswith(".json")]


def _json_da_arvore(sha: str, caminho: str):
    try:
        return json.loads(_git("show", f"{sha}:{caminho}"))
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return None


def _contar_no_commit(sha: str, cache_temas: dict) -> dict:
    ia = 0
    try:
        for nome in _arquivos_da_arvore(sha, REL_COMENTARIOS):
            dados = _json_da_arvore(sha, f"{REL_COMENTARIOS}/{nome}")
            if isinstance(dados, dict):
                ia += len(dados)
    except subprocess.CalledProcessError:
        pass  # A pasta ainda não existia neste ponto da história.

    # Os arquivos de tema são grandes e mudam pouco; a árvore inteira tem um
    # hash próprio, e enquanto ele não muda o resultado é o mesmo.
    try:
        chave = _git("rev-parse", f"{sha}:{REL_TEMAS}").strip()
    except subprocess.CalledProcessError:
        return {"total": 0, "ia": ia, "comunidade": 0}

    if chave not in cache_temas:
        total = 0
        comunidade = 0
        for nome in _arquivos_da_arvore(sha, REL_TEMAS):
            dados = _json_da_arvore(sha, f"{REL_TEMAS}/{nome}")
            for questao in (dados or {}).get("questoes", []):
                if questao.get("anulada"):
                    continue
                total += 1
                if questao.get("comentariosComunidade"):
                    comunidade += 1
        cache_temas[chave] = {"total": total, "comunidade": comunidade}

    return {"ia": ia, **cache_temas[chave]}


def reconstruir_do_git() -> list[dict]:
    """Um ponto por DIA, com a contagem do último commit daquele dia."""
    saida = _git(
        "log", "--reverse", "--format=%H %cI", "--", REL_COMENTARIOS, REL_TEMAS
    )
    por_dia: dict[str, str] = {}
    for linha in saida.splitlines():
        sha, _, quando = linha.partition(" ")
        por_dia[quando[:10]] = sha  # o último do dia sobrescreve os anteriores

    cache: dict = {}
    marcos = []
    for data in sorted(por_dia):
        contagem = _contar_no_commit(por_dia[data], cache)
        marcos.append({"data": data, **contagem})
        print(
            f"  {data}  total {contagem['total']:>5}  "
            f"IA {contagem['ia']:>5}  comunidade {contagem['comunidade']:>3}",
            file=sys.stderr,
        )
    return marcos


# --------------------------------------------------------------- hoje ----


def acrescentar_hoje(marcos: list[dict] | None = None) -> dict:
    """Grava (ou atualiza) o ponto de hoje e devolve o arquivo inteiro."""
    if marcos is None:
        atual = ler_json(CAMINHO_PROGRESSO, {}) or {}
        marcos = list(atual.get("marcos") or [])

    hoje = dt.date.today().isoformat()
    ponto = {"data": hoje, **contar_no_disco()}
    marcos = [m for m in marcos if m.get("data") != hoje] + [ponto]
    marcos.sort(key=lambda m: m["data"])

    dados = {"geradoEm": hoje, "marcos": marcos}
    gravar_json(CAMINHO_PROGRESSO, dados)
    return dados


def principal() -> int:
    analisador = argparse.ArgumentParser(description=__doc__)
    analisador.add_argument(
        "--reconstruir",
        action="store_true",
        help="refaz todo o histórico a partir do git (precisa do clone completo)",
    )
    argumentos = analisador.parse_args()

    marcos = reconstruir_do_git() if argumentos.reconstruir else None
    dados = acrescentar_hoje(marcos)
    ultimo = dados["marcos"][-1]
    pct = lambda n: (100 * n / ultimo["total"]) if ultimo["total"] else 0
    print(
        f"{len(dados['marcos'])} ponto(s). Hoje: {ultimo['ia']} da IA "
        f"({pct(ultimo['ia']):.1f}%), {ultimo['comunidade']} da comunidade "
        f"({pct(ultimo['comunidade']):.2f}%), de {ultimo['total']} questões."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
