"""Utilidades compartilhadas pelos scripts do acervo."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR_ACERVO = RAIZ / "public" / "acervo"
DIR_TEMAS = DIR_ACERVO / "temas"
DIR_IMAGENS = RAIZ / "public" / "imagens"
DIR_RELATORIOS = RAIZ / "relatorios"
CAMINHO_TAXONOMIA = RAIZ / "src" / "dados" / "taxonomia.json"
CAMINHO_SINONIMOS = RAIZ / "scripts" / "sinonimos.json"
CAMINHO_INDICE = DIR_ACERVO / "indice.json"

LETRAS = ["A", "B", "C", "D", "E"]

# Prefixos que legitimamente terminam em hífen no português: nestes casos a
# quebra de linha com hífen NÃO é hifenação tipográfica.
PREFIXOS_HIFEN = {
    "bem", "mal", "além", "aquém", "recém", "sem", "grão", "pós", "pré", "pró",
    "anti", "auto", "contra", "extra", "infra", "inter", "intra", "macro",
    "micro", "mini", "multi", "neo", "pan", "proto", "pseudo", "re", "retro",
    "semi", "sob", "sobre", "sub", "super", "supra", "tele", "ultra", "vice",
    "ex", "socio", "sócio", "hemi", "hiper", "megá", "mega",
}

PALAVRAS_VAZIAS = {
    "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "a",
    "o", "as", "os", "com", "por", "para", "ao", "aos", "à", "às", "um", "uma",
    "the", "of",
}


def sem_acento(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


def normalizar(texto: str) -> str:
    """Minúsculo, sem acento — só para busca e comparação, nunca para exibir."""
    return sem_acento(texto).lower()


def criar_slug(texto: str) -> str:
    base = normalizar(texto)
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base or "tema"


def carregar_taxonomia() -> dict:
    return json.loads(CAMINHO_TAXONOMIA.read_text(encoding="utf-8"))


def carregar_sinonimos() -> dict:
    if CAMINHO_SINONIMOS.exists():
        return json.loads(CAMINHO_SINONIMOS.read_text(encoding="utf-8"))
    return {}


def tema_por_slug(slug: str) -> dict | None:
    for tema in carregar_taxonomia()["temas"]:
        if tema["slug"] == slug:
            return tema
    return None


def gravar_json(caminho: Path, dados) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(
        json.dumps(dados, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def ler_json(caminho: Path, padrao=None):
    if not caminho.exists():
        return padrao
    return json.loads(caminho.read_text(encoding="utf-8"))


def juntar_linhas(linhas: list[str]) -> str:
    """
    Junta linhas de um bloco de PDF em texto corrido, preservando parágrafos.
    Desfaz hifenação de quebra de linha, exceto em prefixos legitimamente
    hifenizados. Nunca reescreve, resume ou corrige o conteúdo.
    """
    partes: list[str] = []
    buffer = ""
    for bruta in linhas:
        linha = bruta.rstrip()
        if not linha.strip():
            if buffer:
                partes.append(buffer.strip())
                buffer = ""
            continue
        if not buffer:
            buffer = linha.strip()
            continue

        anterior = buffer
        if anterior.endswith("-"):
            palavra = re.split(r"[\s]", anterior)[-1][:-1]
            if normalizar(palavra) in {normalizar(p) for p in PREFIXOS_HIFEN}:
                buffer = anterior + linha.strip()
            else:
                buffer = anterior[:-1] + linha.strip()
        else:
            buffer = anterior + " " + linha.strip()

    if buffer:
        partes.append(buffer.strip())
    texto = "\n\n".join(partes)
    return re.sub(r"[ \t]{2,}", " ", texto).strip()
