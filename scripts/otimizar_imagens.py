#!/usr/bin/env python3
"""Converte as imagens pesadas de public/ para WebP e atualiza as referências (T7.9, auditoria de 15/10/2026).

Toda PNG/JPEG acima do limite (500 KB) vira WebP (qualidade 82, lado maior até 1600 px, alfa
preservado quando existe). Depois:

1. Nos JSON do acervo, dos flashcards e dos recortes em docs/, troca só o campo `arquivo` de
   `imagens[]` (e `largura`/`altura` do mesmo objeto, se a imagem foi reduzida). Nenhum campo de
   texto é tocado: o script confere que, fora desses três campos, o JSON continua idêntico.
2. Em HTML/TS/TSX/CSS/JS de public/ e src/, troca o caminho relativo a public/ e, nas páginas da
   mesma pasta da imagem, o nome solto em `src="…"`/`href="…"`.
3. Só apaga o arquivo antigo quando nenhuma referência sobra em nenhum arquivo versionado.

Ficam de fora os arquivos que precisam do formato original (ícones, favicon, prévia og:image).

    python3 scripts/otimizar_imagens.py            # converte e atualiza
    python3 scripts/otimizar_imagens.py --simular  # só lista o que faria
"""
from __future__ import annotations

import argparse
import io
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"
LIMITE = 500 * 1024
LADO_MAXIMO = 1600
QUALIDADE = 82
EXTENSOES = {".png", ".jpg", ".jpeg"}
# Formatos exigidos por navegador, manifest, apple-touch-icon e og:image.
PROTEGIDOS = re.compile(r"^(favicon|apple-touch-icon|icone-|previa-)")
PASTAS_JSON = ["public/acervo", "public/flashcards", "docs"]
EXTENSOES_TEXTO = {".html", ".ts", ".tsx", ".css", ".js", ".mjs", ".json", ".webmanifest", ".md", ".py", ".txt"}


def candidatas(limite: int) -> list[Path]:
    saida = []
    for p in sorted(PUBLICO.rglob("*")):
        if p.is_file() and p.suffix.lower() in EXTENSOES and p.stat().st_size > limite and not PROTEGIDOS.match(p.name):
            saida.append(p)
    return saida


def converter(p: Path) -> tuple[bytes, tuple[int, int], tuple[int, int]]:
    im = Image.open(p)
    im.load()
    original = im.size
    # Foto de celular: a rotação vem no EXIF, que o WebP não leva. Aplica antes de converter.
    im = ImageOps.exif_transpose(im)
    tem_alfa = im.mode in ("RGBA", "LA", "PA") or (im.mode == "P" and "transparency" in im.info)
    im = im.convert("RGBA" if tem_alfa else "RGB")
    if tem_alfa and im.getchannel("A").getextrema() == (255, 255):
        im = im.convert("RGB")
    if max(im.size) > LADO_MAXIMO:
        escala = LADO_MAXIMO / max(im.size)
        im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=QUALIDADE, method=6)
    return buf.getvalue(), original, im.size


def arquivos_versionados() -> list[Path]:
    nomes = subprocess.run(["git", "ls-files", "-z"], cwd=RAIZ, capture_output=True, check=True).stdout.decode().split("\0")
    return [RAIZ / n for n in nomes if n and Path(n).suffix.lower() in EXTENSOES_TEXTO and (RAIZ / n).exists()]


def sem_campos_de_imagem(d):
    """Cópia do JSON sem arquivo/largura/altura, para provar que o resto não mudou."""
    if isinstance(d, dict):
        return {k: sem_campos_de_imagem(v) for k, v in d.items() if k not in ("arquivo", "largura", "altura")}
    if isinstance(d, list):
        return [sem_campos_de_imagem(v) for v in d]
    return d


def estilo_json(texto: str, dados) -> int | None:
    for indent in (2, 1, None):
        if json.dumps(dados, ensure_ascii=False, indent=indent) + "\n" == texto:
            return indent
    return None


def atualizar_json(caminho: Path, mapa: dict[str, tuple[str, tuple[int, int]]]) -> int:
    """mapa: 'mao/x.png' (relativo a public/imagens) -> ('mao/x.webp', (largura, altura))."""
    texto = caminho.read_text(encoding="utf-8")
    if not any(k in texto for k in mapa):
        return 0
    dados = json.loads(texto)
    trocas = 0

    def andar(no):
        nonlocal trocas
        if isinstance(no, dict):
            valor = no.get("arquivo")
            if isinstance(valor, str) and valor in mapa:
                novo, (larg, alt) = mapa[valor]
                no["arquivo"] = novo
                if isinstance(no.get("largura"), int) and isinstance(no.get("altura"), int):
                    no["largura"], no["altura"] = larg, alt
                trocas += 1
            for v in no.values():
                andar(v)
        elif isinstance(no, list):
            for v in no:
                andar(v)

    indent = estilo_json(texto, dados)
    antes = sem_campos_de_imagem(dados)
    andar(dados)
    if not trocas:
        return 0
    if sem_campos_de_imagem(dados) != antes:
        raise SystemExit(f"{caminho}: algo além de arquivo/largura/altura mudaria; abortado")
    if indent is not None:
        caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=indent) + "\n", encoding="utf-8")
    else:  # formatação desconhecida: troca textual só do campo arquivo
        def troca(m):
            valor = m.group(2)
            return m.group(1) + (mapa[valor][0] if valor in mapa else valor) + m.group(3)
        caminho.write_text(re.sub(r'("arquivo"\s*:\s*")([^"]+)(")', troca, texto), encoding="utf-8")
    return trocas


def atualizar_texto(caminho: Path, convertidas: dict[Path, Path]) -> int:
    texto = caminho.read_text(encoding="utf-8")
    novo = texto
    for velho, webp in convertidas.items():
        rel_velho = velho.relative_to(PUBLICO).as_posix()
        rel_novo = webp.relative_to(PUBLICO).as_posix()
        novo = re.sub(r"(?<![\w./-])" + re.escape(rel_velho) + r"(?![\w.-])", rel_novo, novo)
        if caminho.parent == velho.parent:
            novo = re.sub(r'((?:src|href)=["\'])' + re.escape(velho.name) + r'(["\'?#])', r"\g<1>" + webp.name + r"\g<2>", novo)
    if novo != texto:
        caminho.write_text(novo, encoding="utf-8")
        return 1
    return 0


def referencias_restantes(velhas: list[Path], arquivos: list[Path]) -> dict[Path, list[str]]:
    restos: dict[Path, list[str]] = {}
    for arq in arquivos:
        texto = arq.read_text(encoding="utf-8", errors="ignore")
        for v in velhas:
            rel = v.relative_to(PUBLICO).as_posix()
            curto = v.relative_to(PUBLICO / "imagens").as_posix() if v.is_relative_to(PUBLICO / "imagens") else None
            achou = rel in texto or (curto and re.search(r'"' + re.escape(curto) + r'"', texto)) \
                or (arq.parent == v.parent and re.search(r'["\']' + re.escape(v.name) + r'["\'?#]', texto))
            if achou:
                restos.setdefault(v, []).append(arq.relative_to(RAIZ).as_posix())
    return restos


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--simular", action="store_true", help="só lista o que faria")
    ap.add_argument("--limite-kb", type=int, default=LIMITE // 1024)
    args = ap.parse_args()

    lista = candidatas(args.limite_kb * 1024)
    convertidas: dict[Path, Path] = {}
    mapa_json: dict[str, tuple[str, tuple[int, int]]] = {}
    antes = depois = 0
    for p in lista:
        webp = p.with_suffix(".webp")
        if webp.exists():
            print(f"pulado (já existe {webp.name}): {p.relative_to(RAIZ)}")
            continue
        dados, original, final = converter(p)
        tam = p.stat().st_size
        if len(dados) >= tam:
            print(f"pulado (WebP não ficou menor): {p.relative_to(RAIZ)}")
            continue
        antes += tam
        depois += len(dados)
        reduzida = f" {original[0]}x{original[1]}→{final[0]}x{final[1]}" if final != original else ""
        print(f"{p.relative_to(RAIZ)}: {tam / 1024:.0f} KB → {len(dados) / 1024:.0f} KB{reduzida}")
        if not args.simular:
            webp.write_bytes(dados)
        convertidas[p] = webp
        if p.is_relative_to(PUBLICO / "imagens"):
            mapa_json[p.relative_to(PUBLICO / "imagens").as_posix()] = (webp.relative_to(PUBLICO / "imagens").as_posix(), final)

    print(f"\n{len(convertidas)} imagem(ns): {antes / 1048576:.1f} MB → {depois / 1048576:.1f} MB")
    if args.simular or not convertidas:
        return

    arquivos = arquivos_versionados()
    trocas_json = arquivos_texto = 0
    for arq in arquivos:
        rel = arq.relative_to(RAIZ).as_posix()
        if arq.suffix == ".json" and any(rel.startswith(d + "/") for d in PASTAS_JSON):
            trocas_json += atualizar_json(arq, mapa_json)
        elif arq.suffix in {".html", ".ts", ".tsx", ".css", ".js", ".mjs", ".webmanifest"} and rel.startswith(("public/", "src/")):
            arquivos_texto += atualizar_texto(arq, convertidas)
    print(f"referências: {trocas_json} campo(s) arquivo em JSON, {arquivos_texto} arquivo(s) de código/HTML")

    restos = referencias_restantes(list(convertidas), arquivos)
    for v, onde in restos.items():
        print(f"mantido (ainda referenciado): {v.relative_to(RAIZ)} em {', '.join(onde)}")
    for v in convertidas:
        if v not in restos:
            v.unlink()
    print(f"apagados: {len(convertidas) - len(restos)} original(is)")


if __name__ == "__main__":
    sys.exit(main())
