"""Desenha em pixel art os emblemas que ainda não têm arte feita à mão.

Cada emblema é uma medalha de 32x32 pixels (fita no alto, disco de metal com o
símbolo da família no centro), ampliada 4x sem suavização para 128x128. O metal
segue o nível (bronze, prata, ouro, esmeralda, lendário) e a cor da fita muda a
cada degrau da família, para dois emblemas do mesmo metal não ficarem iguais.

Nunca sobrescreve arte feita à mão: só gera os ids listados em ARTE_PROPRIA
quando o arquivo não existe, e grava a lista em src/dados/imagensEmblemas.ts.

Uso: python3 scripts/gerar_emblemas_provisorios.py
"""
from __future__ import annotations

import re
import struct
import zlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
PASTA = RAIZ / "public" / "emblemas"
LISTA = RAIZ / "src" / "dados" / "imagensEmblemas.ts"
CATALOGO = RAIZ / "src" / "estado" / "conquistas.ts"

# Artes feitas à mão (PixelLab): nunca são geradas nem substituídas aqui.
ARTE_PROPRIA = {"questoes-100", "questoes-250", "questoes-500", "questoes-1000", "questoes-3000", "fogueira", "sequencia-3"}

METAIS = {  # contorno, sombra, face, brilho
    "bronze": ("#4a2410", "#8a4f25", "#c07a45", "#f3c9a3"),
    "prata": ("#2f3a3e", "#6f7d82", "#b9c4c8", "#f4f7f8"),
    "ouro": ("#4d3306", "#a8761a", "#e8b34f", "#fff1c2"),
    "esmeralda": ("#06302b", "#0f4f49", "#2f9c86", "#bff0e2"),
    "lendario": ("#24093f", "#4b1d7a", "#9b5de5", "#f1dcff"),
}
FITAS = ["#b3423a", "#14655e", "#2b5fa8", "#c9952f", "#7b3fa0", "#1f7a4d", "#d06a1f", "#12181a"]

# Símbolos de 11x11. "#" = traço escuro, "o" = destaque claro.
SIMBOLOS = {
    "questoes": [
        "...........",
        ".#########.",
        ".#ooooooo#.",
        ".#o#####o#.",
        ".#ooooooo#.",
        ".#o#####o#.",
        ".#ooooooo#.",
        ".#o###ooo#.",
        ".#ooooooo#.",
        ".#########.",
        "...........",
    ],
    "sequencia": [
        ".....#.....",
        "....##.....",
        "....###....",
        "...####.#..",
        "..###o####.",
        "..##ooo###.",
        ".###ooo####",
        ".##ooooo###",
        ".##ooooo##.",
        "..##ooo##..",
        "...#####...",
    ],
    "dias": [
        "..#.....#..",
        ".#########.",
        ".#########.",
        ".#ooooooo#.",
        ".#o#o#o#o#.",
        ".#ooooooo#.",
        ".#o#o#o#o#.",
        ".#ooooooo#.",
        ".#o#o#ooo#.",
        ".#########.",
        "...........",
    ],
    "acertos": [
        "...........",
        ".........##",
        "........###",
        ".......###.",
        "##....###..",
        "###..###...",
        ".######....",
        "..####.....",
        "...##......",
        "...........",
        "...........",
    ],
    "dominadas": [
        ".....#.....",
        "....#o#....",
        "....#o#....",
        "###########",
        ".#ooooooo#.",
        "..#ooooo#..",
        "...#ooo#...",
        "..#oo#oo#..",
        ".#oo#.#oo#.",
        ".#o#...#o#.",
        ".##.....##.",
    ],
    "temas": [
        "....###....",
        "..##ooo##..",
        ".#ooo#ooo#.",
        ".#ooo#ooo#.",
        "#oooo#oooo#",
        "#o#######o#",
        "#oooo#oooo#",
        ".#ooo#ooo#.",
        ".#ooo#ooo#.",
        "..##ooo##..",
        "....###....",
    ],
    "sessoes": [
        ".........##",
        "........#o#",
        ".......#o#.",
        "......#o#..",
        ".....#o#...",
        "#...#o#....",
        ".#.#o#.....",
        "..##.......",
        ".####......",
        "##..#......",
        "#..........",
    ],
    "maratona": [
        "......###..",
        ".....###...",
        "....###....",
        "...###.....",
        "..#######..",
        ".....###...",
        "....###....",
        "...###.....",
        "..###......",
        "..##.......",
        "..#........",
    ],
    "precisao": [
        "...#####...",
        ".##ooooo##.",
        ".#oo###oo#.",
        "#oo#ooo#oo#",
        "#o#oo#oo#o#",
        "#o#o###o#o#",
        "#o#oo#oo#o#",
        "#oo#ooo#oo#",
        ".#oo###oo#.",
        ".##ooooo##.",
        "...#####...",
    ],
    "redencao": [
        "...........",
        ".###...###.",
        "#ooo#.#ooo#",
        "#oooo#oooo#",
        "#ooooooooo#",
        "#ooooooooo#",
        ".#ooooooo#.",
        "..#ooooo#..",
        "...#ooo#...",
        "....#o#....",
        ".....#.....",
    ],
    "gabarito": [
        "...........",
        "#...#.#...#",
        "##..###..##",
        "#o#.#o#.#o#",
        "#oo#ooo#oo#",
        "#ooooooooo#",
        "#ooooooooo#",
        "###########",
        "#o#o#o#o#o#",
        "###########",
        "...........",
    ],
    "madrugada": [
        "....####...",
        "..##ooo....",
        ".#ooo......",
        ".#oo.....#.",
        "#ooo....#o#",
        "#ooo.....#.",
        "#oooo......",
        ".#oooo...#.",
        ".#ooooooo#.",
        "..##ooo##..",
        "....###....",
    ],
    "fim-de-semana": [
        ".....#.....",
        ".#...#...#.",
        "..#.###.#..",
        "...#ooo#...",
        "..#ooooo#..",
        "####ooo####",
        "..#ooooo#..",
        "...#ooo#...",
        "..#.###.#..",
        ".#...#...#.",
        ".....#.....",
    ],
}


def cor(hexa: str) -> tuple[int, int, int, int]:
    return int(hexa[1:3], 16), int(hexa[3:5], 16), int(hexa[5:7], 16), 255


def desenhar(familia: str, nivel: str, degrau: int, simbolo: str) -> list[list[tuple[int, int, int, int]]]:
    vazio = (0, 0, 0, 0)
    img = [[vazio] * 32 for _ in range(32)]
    contorno, sombra, face, brilho = (cor(c) for c in METAIS[nivel])
    fita = cor(FITAS[degrau % len(FITAS)])
    fita_escura = tuple(int(v * 0.65) for v in fita[:3]) + (255,)
    # Fita: duas faixas em V do alto até o disco.
    for y in range(0, 11):
        for dx in range(4):
            for x, c in ((8 + y // 3 + dx, fita if dx < 3 else fita_escura), (23 - y // 3 - dx, fita if dx < 3 else fita_escura)):
                img[y][x] = c
    # Disco com contorno, borda clara em cima e sombra embaixo.
    cx, cy, r = 15.5, 20.0, 11.0
    for y in range(32):
        for x in range(32):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d <= r:
                if d > r - 1.2:
                    img[y][x] = contorno
                elif d > r - 2.4:
                    img[y][x] = brilho if y < cy else sombra
                else:
                    img[y][x] = face
    # Reflexo pequeno no alto à esquerda.
    for x, y in ((10, 14), (11, 13), (12, 13)):
        img[y][x] = brilho
    # Símbolo centralizado no disco.
    for j, linha in enumerate(SIMBOLOS[simbolo]):
        for i, ch in enumerate(linha):
            x, y = 10 + i, 15 + j
            if ch == "#":
                img[y][x] = contorno
            elif ch == "o":
                img[y][x] = brilho
    return img


def gravar_png(caminho: Path, img: list[list[tuple[int, int, int, int]]], escala: int = 4) -> None:
    largura = len(img[0]) * escala
    linhas = b""
    for linha in img:
        bruta = b"".join(bytes(p) * escala for p in linha)
        linhas += (b"\x00" + bruta) * escala

    def bloco(tipo: bytes, dados: bytes) -> bytes:
        return struct.pack(">I", len(dados)) + tipo + dados + struct.pack(">I", zlib.crc32(tipo + dados) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + bloco(b"IHDR", struct.pack(">IIBBBBB", largura, largura, 8, 6, 0, 0, 0))
    png += bloco(b"IDAT", zlib.compress(linhas, 9)) + bloco(b"IEND", b"")
    caminho.write_bytes(png)


def catalogo() -> list[tuple[str, str, str]]:
    """(id, família, nível) de cada emblema, lidos de src/estado/conquistas.ts."""
    texto = CATALOGO.read_text(encoding="utf-8")
    saida = []
    for bloco in re.finditer(r"familia\('([a-z]+)', '[a-zA-Z]+', \[(.*?)\](?:, true)?\)", texto, re.S):
        familia = bloco.group(1)
        for m in re.finditer(r"\['([a-z0-9-]+)', [\d]+, '[^']*', '[^']*', '([a-z]+)'", bloco.group(2)):
            saida.append((m.group(1), familia, m.group(2)))
    return saida


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    degraus: dict[str, int] = {}
    gerados = 0
    for id_, familia, nivel in catalogo():
        degrau = degraus.get(familia, 0)
        degraus[familia] = degrau + 1
        if id_ in ARTE_PROPRIA:
            continue
        simbolo = {"secreta-madrugada": "madrugada", "secreta-fim-de-semana": "fim-de-semana"}.get(id_, familia)
        gravar_png(PASTA / f"{id_}.png", desenhar(familia, nivel, degrau, simbolo))
        gerados += 1
    ids = sorted(p.stem for p in PASTA.glob("*.png"))
    corpo = "".join(f"  '{i}',\n" for i in ids)
    texto = LISTA.read_text(encoding="utf-8")
    texto = re.sub(r"new Set<string>\(\[\n.*?\]\)", f"new Set<string>([\n{corpo}])", texto, flags=re.S)
    LISTA.write_text(texto, encoding="utf-8")
    print(f"{gerados} emblemas desenhados; {len(ids)} com arte no total.")


if __name__ == "__main__":
    main()
