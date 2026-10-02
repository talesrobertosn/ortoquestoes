"""Desenha em pixel art os emblemas que ainda não têm arte feita à mão.

Cada família tem uma silhueta própria (chama, calendário, escudo, cristal,
mapa, espadas, raio, alvo, coração alado, troféu, lua, sol, medalha), desenhada
numa grade de 32x32 com contorno, luz no alto à esquerda e sombra embaixo à
direita, e ampliada 4x sem suavização para 128x128. O metal segue o nível
(bronze, prata, ouro, esmeralda, lendário); ouro em diante ganha gemas e
brilhos, e o lendário uma aura roxa. Dentro da família, cada degrau acrescenta
um detalhe (mais dias marcados, mais espadas, chama maior).

Nunca sobrescreve arte feita à mão (ARTE_PROPRIA) e grava a lista de ids com
arte em src/dados/imagensEmblemas.ts.

Uso: python3 scripts/gerar_emblemas_provisorios.py
"""
from __future__ import annotations

import math
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

N = 32
Cor = tuple[int, int, int, int]


def hexa(c: str, a: int = 255) -> Cor:
    return int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), a


def misturar(a: Cor, b: Cor, t: float) -> Cor:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)  # type: ignore[return-value]


# Rampa de cada metal: contorno, sombra, base, luz, brilho.
METAIS = {
    "bronze": ["#3b1d0c", "#7a4220", "#b8733f", "#e3a26b", "#f7d2ae"],
    "prata": ["#232c30", "#5f6d72", "#9eacb1", "#d4dde0", "#ffffff"],
    "ouro": ["#3d2804", "#946512", "#d9a23a", "#f5cd6b", "#fff4cf"],
    "esmeralda": ["#04241f", "#0d5247", "#23907a", "#5cc9ad", "#d2fbef"],
    "lendario": ["#1c0633", "#4b1d7a", "#8448cf", "#b98cf0", "#f3e6ff"],
}
CHAMAS = {  # cor externa, meio e núcleo da chama por nível
    "bronze": ["#c2410c", "#f97316", "#fed7aa"],
    "prata": ["#1d4ed8", "#60a5fa", "#e0f2fe"],
    "ouro": ["#d97706", "#fbbf24", "#fef9c3"],
    "esmeralda": ["#047857", "#34d399", "#d1fae5"],
    "lendario": ["#7e22ce", "#c084fc", "#fae8ff"],
}
VERMELHO = ["#4c0d0d", "#8f1d1d", "#d33a3a", "#f07a6a", "#ffd2c9"]
PERGAMINHO = ["#4a3418", "#9c7a45", "#d9bf86", "#f2e3bb", "#fff8e6"]
MADEIRA = ["#2a1608", "#5c3415", "#8a5226", "#b47a45", "#d9a877"]
NOITE = ["#0b1330", "#1e2a5a", "#34478f", "#6a7fd1", "#dfe6ff"]
FITAS = ["#b3423a", "#14655e", "#2b5fa8", "#c9952f", "#7b3fa0", "#1f7a4d", "#d06a1f", "#3a3a3a"]


class Tela:
    def __init__(self) -> None:
        self.px: list[list[Cor | None]] = [[None] * N for _ in range(N)]

    def ponto(self, x: int, y: int, c: Cor) -> None:
        if 0 <= x < N and 0 <= y < N:
            self.px[y][x] = c

    def camada(self, mascara: set[tuple[int, int]], rampa: list[str], contorno: bool = True) -> None:
        """Pinta uma forma: base, luz no alto/esquerda, sombra embaixo/direita e contorno."""
        r = [hexa(c) for c in rampa]
        for (x, y) in mascara:
            cima, esq = (x, y - 1) not in mascara, (x - 1, y) not in mascara
            baixo, dir_ = (x, y + 1) not in mascara, (x + 1, y) not in mascara
            c = r[2]
            if cima or esq:
                c = r[3]
            if baixo or dir_:
                c = r[1]
            self.ponto(x, y, c)
        if contorno:
            for (x, y) in mascara:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    v = (x + dx, y + dy)
                    if v not in mascara and 0 <= v[0] < N and 0 <= v[1] < N:
                        atual = self.px[v[1]][v[0]]
                        if atual is None or atual[3] < 255:
                            self.ponto(v[0], v[1], r[0])

    def pintar(self, mascara: set[tuple[int, int]], c: str) -> None:
        for (x, y) in mascara:
            self.ponto(x, y, hexa(c))

    def aura(self, c: str) -> None:
        """Brilho translúcido em volta de tudo o que já foi desenhado."""
        cheio = {(x, y) for y in range(N) for x in range(N) if self.px[y][x] is not None}
        for raio, alfa in ((1, 150), (2, 70)):
            borda = set()
            for (x, y) in cheio:
                for dx in range(-raio, raio + 1):
                    for dy in range(-raio, raio + 1):
                        v = (x + dx, y + dy)
                        if v not in cheio and 0 <= v[0] < N and 0 <= v[1] < N and abs(dx) + abs(dy) <= raio + 1:
                            borda.add(v)
            for (x, y) in borda:
                if self.px[y][x] is None:
                    self.ponto(x, y, hexa(c, alfa))
            cheio |= borda

    def brilho(self, x: int, y: int, c: str = "#ffffff") -> None:
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            self.ponto(x + dx, y + dy, hexa(c, 255 if (dx, dy) == (0, 0) else 200))


# ---------- formas ----------
def circulo(cx: float, cy: float, r: float) -> set[tuple[int, int]]:
    return {(x, y) for y in range(N) for x in range(N) if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r}


def retangulo(x0: int, y0: int, x1: int, y1: int) -> set[tuple[int, int]]:
    return {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}


def poligono(pontos: list[tuple[float, float]]) -> set[tuple[int, int]]:
    saida = set()
    for y in range(N):
        for x in range(N):
            px, py, dentro = x + 0.5, y + 0.5, False
            for i in range(len(pontos)):
                (x1, y1), (x2, y2) = pontos[i], pontos[i - 1]
                if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
                    dentro = not dentro
            if dentro:
                saida.add((x, y))
    return saida


def linha(x0: float, y0: float, x1: float, y1: float, espessura: float = 1.0) -> set[tuple[int, int]]:
    saida = set()
    passos = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 1
    for i in range(passos + 1):
        t = i / passos
        saida |= circulo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, espessura / 2 + 0.35)
    return saida


# ---------- famílias ----------
def chama(t: Tela, nivel: str, degrau: int) -> None:
    externa, meio, nucleo = CHAMAS[nivel]
    t.camada(retangulo(8, 25, 23, 27) | retangulo(10, 28, 21, 29), MADEIRA)
    altura = 6 + degrau
    topo = max(2, 18 - altura)
    corpo = poligono([(16, topo), (22.5, 13), (24, 19), (21, 25), (11, 25), (8, 19), (10, 14), (12.5, 17)])
    t.camada(corpo, [_hex(misturar(hexa(externa), hexa("#000000"), 0.45)), externa, externa, meio, nucleo])
    t.pintar(poligono([(16, topo + 6), (19.5, 16), (20, 21), (17.5, 24.5), (14.5, 24.5), (12, 21), (13, 17)]), meio)
    t.pintar(poligono([(16, topo + 11), (18, 19.5), (17.6, 23.5), (14.4, 23.5), (14, 20)]), nucleo)


def _hex(c: Cor) -> str:
    return "#%02x%02x%02x" % c[:3]


def calendario(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(retangulo(6, 8, 25, 27), PERGAMINHO)
    t.camada(retangulo(6, 6, 25, 11), METAIS[nivel])
    for x in (10, 21):
        t.camada(retangulo(x, 3, x + 1, 8), ["#222222", "#555555", "#777777", "#999999", "#cccccc"])
    marcados = min(12, (degrau + 1) * 2 - 1)
    k = 0
    for linha_ in range(3):
        for col in range(4):
            x, y = 9 + col * 4, 14 + linha_ * 4
            if k < marcados:
                t.pintar(linha(x, y + 1, x + 1, y + 2) | linha(x + 1, y + 2, x + 3, y), "#b3423a")
            else:
                t.pintar(retangulo(x, y, x + 2, y + 2), "#c9b07a")
            k += 1


def escudo(t: Tela, nivel: str, degrau: int) -> None:
    forma = poligono([(5, 5), (27, 5), (27, 15), (24, 22), (16, 29), (8, 22), (5, 15)])
    t.camada(forma, METAIS[nivel])
    t.camada(poligono([(8, 8), (24, 8), (24, 15), (21.5, 20.5), (16, 25.5), (10.5, 20.5), (8, 15)]), ["#0b3a35", "#14655e", "#1f7a6d", "#2b9583", "#7fd3c2"], contorno=False)
    t.camada(linha(11, 15.5, 14.5, 19.5, 2.2) | linha(14.5, 19.5, 21.5, 11, 2.2), ["#0d3b1f", "#e8f7ee", "#ffffff", "#ffffff", "#ffffff"], contorno=False)


def cristal(t: Tela, nivel: str, degrau: int) -> None:
    rampa = METAIS[nivel] if nivel != "bronze" else ["#3b1d0c", "#a3502a", "#e07a3f", "#f5a56b", "#ffe1c4"]
    t.camada(poligono([(16, 3), (26, 12), (16, 29), (6, 12)]), rampa)
    t.pintar(linha(6.5, 12, 25.5, 12, 0.6), rampa[1])
    t.pintar(linha(16, 3.5, 12, 12, 0.6) | linha(16, 3.5, 20, 12, 0.6), rampa[3])
    t.pintar(linha(12, 12, 16, 28, 0.6) | linha(20, 12, 16, 28, 0.6), rampa[1])
    t.brilho(11, 9)


def mapa(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(retangulo(6, 7, 25, 25), PERGAMINHO)
    t.camada(retangulo(4, 5, 7, 27), METAIS[nivel])
    t.camada(retangulo(24, 5, 27, 27), METAIS[nivel])
    t.pintar(linha(9, 21, 12, 17, 0.8) | linha(12, 17, 15, 19, 0.8) | linha(15, 19, 18, 13, 0.8), "#9c7a45")
    t.pintar(linha(18, 10, 22, 14, 1.4) | linha(22, 10, 18, 14, 1.4), "#b3423a")
    for i in range(min(degrau + 1, 3)):
        t.pintar(circulo(10 + i * 4, 11, 1.1), "#14655e")


def espadas(t: Tela, nivel: str, degrau: int) -> None:
    def espada(x0: float, y0: float, x1: float, y1: float) -> None:
        t.camada(linha(x0, y0, x1, y1, 2.2), METAIS["prata"] if nivel != "prata" else METAIS["ouro"])
        dx, dy = x1 - x0, y1 - y0
        comp = math.hypot(dx, dy)
        ux, uy = dx / comp, dy / comp
        gx, gy = x1 - ux * 6, y1 - uy * 6
        t.camada(linha(gx - uy * 4, gy + ux * 4, gx + uy * 4, gy - ux * 4, 2), METAIS[nivel])
        t.camada(linha(gx + ux * 0.5, gy + uy * 0.5, x1 + ux * 1.5, y1 + uy * 1.5, 2.2), MADEIRA)
    espada(6, 6, 25, 25)
    if degrau >= 1:
        espada(26, 6, 7, 25)
    if degrau >= 2:
        t.camada(poligono([(11, 21), (21, 21), (21, 26), (16, 30), (11, 26)]), METAIS[nivel])
    if degrau >= 3:
        t.camada(poligono([(10, 7), (12, 3), (14, 6), (16, 2), (18, 6), (20, 3), (22, 7), (22, 9), (10, 9)]), METAIS["ouro"])


def raio(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(16, 16, 13.5), ["#0b3a35", "#123f3a", "#14655e", "#1d7a6f", "#2b9583"])
    t.camada(poligono([(18, 3), (8, 18), (15, 18), (12, 29), (24, 13), (17, 13), (21, 3)]), METAIS[nivel])
    for i in range(degrau):
        t.brilho(6 + i * 3, 7 + (i % 2) * 2, "#fff4cf")


def alvo(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(15, 17, 13), METAIS[nivel])
    t.camada(circulo(15, 17, 10.5), VERMELHO, contorno=False)
    t.pintar(circulo(15, 17, 7.8), "#fff8e6")
    t.pintar(circulo(15, 17, 5.2), "#d33a3a")
    t.pintar(circulo(15, 17, 2.6), "#fff8e6")
    t.camada(linha(15, 17, 28, 4, 1.4), MADEIRA)
    t.camada(poligono([(27, 2), (31, 2), (29, 6), (28, 5)]) | poligono([(29, 5), (31, 7), (27, 7)]), METAIS["prata"])


def coracao(t: Tela, nivel: str, degrau: int) -> None:
    asa = poligono([(14, 12), (2, 6), (4, 11), (1, 12), (4, 16), (2, 18), (8, 19), (14, 18)])
    asa2 = {(N - 1 - x, y) for (x, y) in asa}
    t.camada(asa, METAIS[nivel])
    t.camada(asa2, METAIS[nivel])
    t.camada(circulo(12.5, 13, 5) | circulo(19.5, 13, 5) | poligono([(7.7, 14.5), (24.3, 14.5), (16, 26)]), VERMELHO)
    t.brilho(11, 11, "#ffd2c9")


def trofeu(t: Tela, nivel: str, degrau: int) -> None:
    taca = poligono([(7, 5), (25, 5), (24, 13), (20, 18), (12, 18), (8, 13)])
    alcas = linha(6, 8, 4, 12, 1.4) | linha(4, 12, 9, 15, 1.4) | linha(26, 8, 28, 12, 1.4) | linha(28, 12, 23, 15, 1.4)
    t.camada(alcas, METAIS[nivel])
    t.camada(taca | retangulo(14, 18, 17, 22) | retangulo(10, 23, 21, 25) | retangulo(8, 26, 23, 28), METAIS[nivel])
    t.pintar(retangulo(10, 26, 21, 27), "#5c3415")
    t.brilho(11, 8)
    if degrau >= 1:
        t.pintar(circulo(16, 10, 2), "#d33a3a")


def lua(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(16, 16, 14), NOITE)
    t.camada(circulo(14, 16, 9) - circulo(18, 13, 8), METAIS[nivel])
    for (x, y) in ((22, 8), (25, 17), (19, 24), (8, 7)):
        t.brilho(x, y, "#fff4cf")


def sol(t: Tela, nivel: str, degrau: int) -> None:
    raios = set()
    for i in range(8):
        a = i * math.pi / 4
        raios |= linha(16 + math.cos(a) * 9, 16 + math.sin(a) * 9, 16 + math.cos(a) * 14, 16 + math.sin(a) * 14, 2.2)
    t.camada(raios, METAIS["ouro"])
    t.camada(circulo(16, 16, 8), METAIS[nivel] if nivel != "ouro" else ["#7c2d12", "#c2410c", "#f97316", "#fdba74", "#fff7ed"])
    t.brilho(13, 13, "#fff4cf")


def medalha(t: Tela, nivel: str, degrau: int) -> None:
    fita = FITAS[degrau % len(FITAS)]
    escura = _hex(misturar(hexa(fita), hexa("#000000"), 0.45))
    t.camada(poligono([(8, 0), (13, 0), (17, 12), (12, 12)]), [escura, escura, fita, fita, fita])
    t.camada(poligono([(19, 0), (24, 0), (20, 12), (15, 12)]), [escura, escura, fita, fita, fita])
    t.camada(circulo(16, 20, 11), METAIS[nivel])
    t.camada(circulo(16, 20, 7.5), METAIS[nivel], contorno=False)
    osso = linha(11.5, 15.5, 20.5, 24.5, 1.6) | linha(20.5, 15.5, 11.5, 24.5, 1.6)
    t.pintar(osso, "#fff8e6")
    for (x, y) in ((11, 15), (20, 15), (11, 24), (20, 24)):
        t.pintar(circulo(x + 0.5, y + 0.5, 1.4), "#fff8e6")


def coroa(t: Tela, nivel: str, lugar: int) -> None:
    """Coroa do pódio: ouro para o 1º, prata para o 2º, bronze para o 3º."""
    corpo = poligono([(4, 12), (10, 19), (16, 8), (22, 19), (28, 12), (26, 26), (6, 26)])
    t.camada(corpo, METAIS[nivel])
    t.camada(retangulo(6, 23, 26, 27), METAIS[nivel])
    for (x, y) in ((4, 11), (16, 6), (28, 11)):
        t.camada(circulo(x + 0.5, y + 0.5, 1.9), METAIS[nivel])
    joias = ["#d33a3a", "#2b5fa8", "#1f7a4d"]
    for i, x in enumerate((10, 16, 22)):
        t.pintar(circulo(x + 0.5, 25.0, 1.5), joias[(i + lugar) % 3])
    t.brilho(12, 15)
    if lugar == 1:
        t.brilho(27, 3, "#fff4cf")
        t.brilho(4, 4, "#fff4cf")


FORMAS = {
    "questoes": medalha, "sequencia": chama, "dias": calendario, "acertos": escudo, "dominadas": cristal,
    "temas": mapa, "sessoes": espadas, "maratona": raio, "precisao": alvo, "redencao": coracao,
    "gabarito": trofeu, "secreta-madrugada": lua, "secreta-fim-de-semana": sol,
}


def desenhar(id_: str, familia: str, nivel: str, degrau: int) -> Tela:
    t = Tela()
    FORMAS.get(id_, FORMAS.get(familia, medalha))(t, nivel, degrau)
    if nivel in ("ouro", "esmeralda", "lendario"):
        t.brilho(27, 4, "#fff4cf")
    if nivel in ("esmeralda", "lendario"):
        t.brilho(4, 26, "#d2fbef" if nivel == "esmeralda" else "#f3e6ff")
    if nivel == "lendario":
        t.aura("#b98cf0")
    return t


def gravar_png(caminho: Path, t: Tela, escala: int = 4) -> None:
    largura = N * escala
    dados = bytearray()
    for linha_ in t.px:
        bruta = b"".join(bytes(p if p is not None else (0, 0, 0, 0)) * escala for p in linha_)
        for _ in range(escala):
            dados += b"\x00" + bruta

    def bloco(tipo: bytes, conteudo: bytes) -> bytes:
        return struct.pack(">I", len(conteudo)) + tipo + conteudo + struct.pack(">I", zlib.crc32(tipo + conteudo) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + bloco(b"IHDR", struct.pack(">IIBBBBB", largura, largura, 8, 6, 0, 0, 0))
    png += bloco(b"IDAT", zlib.compress(bytes(dados), 9)) + bloco(b"IEND", b"")
    caminho.write_bytes(png)


def catalogo() -> list[tuple[str, str, str]]:
    """(id, família, nível) de cada emblema, lidos de src/estado/conquistas.ts."""
    texto = CATALOGO.read_text(encoding="utf-8")
    saida = []
    for bloco in re.finditer(r"familia\('([a-z]+)', '[a-zA-Z]+', \[(.*?)\](?:, true)?\)", texto, re.S):
        for m in re.finditer(r"\['([a-z0-9-]+)', [\d]+, '[^']*', '[^']*', '([a-z]+)'", bloco.group(2)):
            saida.append((m.group(1), bloco.group(1), m.group(2)))
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
        gravar_png(PASTA / f"{id_}.png", desenhar(id_, familia, nivel, degrau))
        gerados += 1
    for lugar, nivel in ((1, "ouro"), (2, "prata"), (3, "bronze")):
        if f"podio-{lugar}" not in ARTE_PROPRIA:
            t = Tela()
            coroa(t, nivel, lugar)
            gravar_png(PASTA / f"podio-{lugar}.png", t)
    ids = sorted(p.stem for p in PASTA.glob("*.png"))
    corpo = "".join(f"  '{i}',\n" for i in ids)
    texto = LISTA.read_text(encoding="utf-8")
    texto = re.sub(r"new Set<string>\(\[\n.*?\]\)", f"new Set<string>([\n{corpo}])", texto, flags=re.S)
    LISTA.write_text(texto, encoding="utf-8")
    print(f"{gerados} emblemas desenhados; {len(ids)} com arte no total.")


if __name__ == "__main__":
    main()
