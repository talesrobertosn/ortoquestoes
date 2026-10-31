"""Sprites animados do topo da página inicial (30/10/2026), feitos do zero por este script (nada baixado nem de IA).

Gera em public/pixel/inicio/:
- fogo.png: a fogueira da sequência, 8 estágios (linhas, na ordem de estagiosFogueira.ts) x 6 quadros, 40 x 48 cada;
- tocha.png: a tocha dos dias da semana, 3 estados (acesa, fraca, apagada) x 4 quadros, 14 x 30 cada (versão antiga,
  mantida idêntica);
- tocha-semana.png (31/10/2026): a tocha de parede HD-2D da sequência semanal, 7 linhas x 6 quadros de 24 x 40,
  na ordem de TS_ESTADOS: feito, hoje-feito (faíscas e coroa dourada no suporte), hoje (chama pegando, fumacinha,
  pano meio queimado), parcial (só brasas e fio de fumaça), perdido (apagada, fria, torta, pano caído), futuro (nova,
  pano amarrado, esmaecida) e especial (chama azul, flâmula vermelha e estrelinhas). Cabo, anel e placa ficam no mesmo
  lugar em todas as linhas; cada estado tem silhueta própria (reconhecível em cinza). Fundo transparente.
O CSS amplia com image-rendering: pixelated.
Uso: python3 scripts/gerar_sprites_inicio.py
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"


def cor(h: str, a: int = 255) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


# ─────────────────────────────── Fogo ───────────────────────────────
# (miolo, meio, borda, ponta) e tamanho (raio, altura) por estágio, na ordem de estagiosFogueira.ts.
ESTAGIOS = [
    ("cinzas", ("#ffb08a", "#c0503a", "#5a3a34", "#3a3a40"), (5, 4)),
    ("faisca", ("#fff2b0", "#ffb040", "#e0602a", "#a0301a"), (6, 12)),
    ("fogueira", ("#fff6c8", "#ffc048", "#f07a2a", "#c0401c"), (8, 20)),
    ("labareda", ("#fffbe0", "#ffd050", "#ff8a2a", "#d0441c"), (10, 27)),
    ("fogareu", ("#ffffff", "#ffe070", "#ff9a30", "#e05020"), (12, 34)),
    ("azul", ("#ffffff", "#bfe8ff", "#4aa0ff", "#2050c8"), (12, 34)),
    ("arcana", ("#ffffff", "#f0c8ff", "#b060f0", "#6a20b0"), (13, 36)),
    ("lendaria", ("#ffffff", "#fff2a0", "#ffc830", "#e08a10"), (14, 40)),
]


def fogo() -> Image.Image:
    w, h, n = 40, 48, 6
    folha = Image.new("RGBA", (w * n, h * len(ESTAGIOS)), (0, 0, 0, 0))
    for e, (nome, (miolo, meio, borda, ponta), (r, alt)) in enumerate(ESTAGIOS):
        for q in range(n):
            img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            rnd = random.Random(e * 100 + q)
            base_y = h - 6
            fase = q / n * math.tau
            linhas: dict[int, dict[int, str]] = {}
            for x in range(-r - 1, r + 2):
                u = x / (r + 0.5)
                if abs(u) > 1:
                    continue
                # Línguas de fogo: ondas que sobem e trocam de lugar a cada quadro.
                onda = 0.72 + 0.18 * math.sin(fase + x * 0.9) + 0.12 * math.sin(fase * 2 - x * 0.45) + rnd.random() * 0.08
                hx = alt * (1 - u * u) ** 0.65 * onda
                for dy in range(int(hx)):
                    t = dy / max(hx, 1)
                    lado = abs(u)
                    c = miolo if t < 0.38 and lado < 0.45 else meio if t < 0.66 and lado < 0.75 else borda if t < 0.9 else ponta
                    linhas.setdefault(dy, {})[x] = c
            # A chama balança: cada linha inteira anda para o lado (sem abrir buracos no meio).
            for dy, cols in linhas.items():
                desvio = int(round(math.sin(fase + dy * 0.3) * min(2.5, dy / max(alt, 1) * 3)))
                for x, c in cols.items():
                    xx, yy = w // 2 + x + desvio, base_y - dy
                    if 0 <= xx < w and 0 <= yy < h:
                        img.putpixel((xx, yy), cor(c))
            # Faíscas soltas acima da chama.
            if nome != "cinzas":
                for k in range(2 + e // 2):
                    sx = w // 2 + int(rnd.gauss(0, r * 0.5))
                    sy = base_y - alt - 2 - int(((q + k * 2) % n) / n * 8)
                    if 0 <= sx < w and 0 <= sy < h:
                        img.putpixel((sx, sy), cor(meio))
            else:
                # Brasas: só um brilho baixo e fumaça.
                for k in range(3):
                    sy = base_y - 6 - ((q + k * 2) % n) * 2
                    sx = w // 2 - 1 + k + (q % 2)
                    if 0 <= sy < h:
                        img.putpixel((sx, sy), cor("#8a8a90", 160))
            folha.alpha_composite(img, (q * w, e * h))
    return folha


# ─────────────────────────────── Tocha ───────────────────────────────
def tocha() -> Image.Image:
    w, h, n = 14, 30, 4
    folha = Image.new("RGBA", (w * n, h * 3), (0, 0, 0, 0))
    for estado in range(3):
        for q in range(n):
            img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            # Cabo de madeira e o copo de ferro.
            for y in range(16, 30):
                for x in (6, 7):
                    img.putpixel((x, y), cor("#8a5a30" if x == 6 else "#5a3418"))
                img.putpixel((5, y), cor("#1b1208"))
                img.putpixel((8, y), cor("#1b1208"))
            for x in range(3, 11):
                for y in (13, 14, 15):
                    img.putpixel((x, y), cor("#5a5a62" if y == 13 else "#3a3a42"))
            for x in range(3, 11):
                img.putpixel((x, 12), cor("#1b1208"))
            img.putpixel((2, 13), cor("#1b1208")); img.putpixel((11, 13), cor("#1b1208"))
            img.putpixel((4, 13), cor("#8a8a94"))
            if estado < 2:
                alt = (11 if estado == 0 else 6) + (q % 2)
                pal = ("#fff6c8", "#ffc048", "#ff8a2a", "#d0441c") if estado == 0 else ("#ffd8a0", "#f0903a", "#b8502a", "#7a3020")
                for dy in range(alt):
                    t = dy / alt
                    meia = max(0, int((1 - t) * 3.4 + math.sin(q * 1.6 + dy) * 0.6))
                    desvio = int(math.sin(q * 1.3 + dy * 0.5) * t * 1.5)
                    for dx in range(-meia, meia + 1):
                        c = pal[0] if t < 0.35 and abs(dx) <= 1 else pal[1] if t < 0.6 else pal[2] if t < 0.85 else pal[3]
                        x, y = 7 + dx + desvio, 12 - dy
                        if 0 <= x < w and 0 <= y < h:
                            img.putpixel((x, y), cor(c))
            else:
                img.putpixel((6, 11), cor("#4a4a50")); img.putpixel((7, 11), cor("#3a3a40")); img.putpixel((7, 10 - q % 2), cor("#6a6a70", 140))
            folha.alpha_composite(img, (q * w, estado * h))
    return folha


# ─────────────────────── Tocha da semana (HD-2D, 31/10/2026) ───────────────────────
# Tocha de parede: placa de ferro rebitada, anel do suporte, cabo de madeira, pano com piche no copo de ferro.
# Tudo pintado pixel a pixel com luz calculada (a própria chama ilumina a madeira, o pano e o ferro; luar frio
# como luz de recorte na borda direita), contorno em tinta-pixel e silhueta própria para cada estado.
TS_W, TS_H, TS_N = 24, 40, 6
TS_ESTADOS = ("feito", "hoje-feito", "hoje", "parcial", "perdido", "futuro", "especial")
TS_CX = 12          # coluna central do cabo (igual em todas as linhas: nada "pula" ao trocar de estado)
TS_BASE_CHAMA = 13  # linha onde a chama nasce (topo do pano)
TS_ANEL_Y = 25      # linha de cima do anel do suporte

RGB = tuple[float, float, float]


def _hx(h: str) -> RGB:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _mix(a: RGB, b: RGB, t: float) -> RGB:
    t = max(0.0, min(1.0, t))
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def _pal(*hs: str) -> list[RGB]:
    return [_hx(h) for h in hs]


TINTA = _hx("#1b1208")
P_MADEIRA = _pal("#1f1108", "#36200f", "#523218", "#714622", "#93602f", "#b67f45", "#d4a066")
P_FERRO = _pal("#16161d", "#24242d", "#35353f", "#4a4a56", "#646473", "#868696", "#b4b4c4")
P_PLACA = _pal("#1a1614", "#27211e", "#352d29", "#463c36", "#5a4e46", "#73655b")
P_PANO = _pal("#21150c", "#382515", "#523820", "#6e4e2e", "#8c6840", "#ab8656", "#c8a571")
P_LINHO = _pal("#6c6050", "#8c806a", "#ada085", "#cbbf9f", "#e2d8ba", "#f4ecd2")
P_CORDAO = _pal("#3c140c", "#622214", "#8a3620", "#ab4c2c")
P_CINZA_PANO = _pal("#2c2723", "#433b35", "#5e544a", "#7b6f62", "#998b7a", "#b3a693")
P_CARVAO = _pal("#090706", "#120e0c", "#1c1613", "#28201b", "#352b24")
P_BRASA = _pal("#4a0e06", "#86190a", "#c0300e", "#ec5c18", "#ff9a40", "#ffd27a")
P_OURO = _pal("#5a3e0a", "#8a6416", "#bf902c", "#f0c46a", "#ffe9a8", "#fffbe6")
P_FLAMULA = _pal("#3a0a08", "#661410", "#922420", "#b3423a", "#d26a5a", "#eea08c")
CH_FEITO = _pal("#fff8d8", "#ffd868", "#ffa534", "#f06e1e", "#c2401a", "#7e2414")
CH_FORTE = _pal("#ffffff", "#fff4b0", "#ffcc48", "#ff9028", "#e0501c", "#962a14")
CH_FRACA = _pal("#ffe8b8", "#ffbc58", "#f88a30", "#d65a20", "#9e3618", "#621e10")
CH_AZUL = _pal("#ffffff", "#e6f6ff", "#bfe8ff", "#7cc4ff", "#4aa0ff", "#2050c8")
LUAR = _hx("#9fb8d6")


def _tom(pal: list[RGB], v: float) -> RGB:
    v = max(0.0, min(0.999, v))
    return pal[int(v * len(pal))]


def _norm(x: float, y: float, z: float) -> tuple[float, float, float]:
    m = math.sqrt(x * x + y * y + z * z) or 1.0
    return (x / m, y / m, z / m)


AMB = _norm(-0.55, -0.65, 0.55)  # luz ambiente: de cima, à esquerda, da frente


class _Cena:
    """Camadas de pixels de um quadro, com a luz do estado."""

    def __init__(self, luz: tuple[float, float, float, RGB] | None, frio: float = 0.0):
        self.luz = luz      # (x, y, força, cor) da chama, ou None
        self.frio = frio    # 0..1: puxa as cores para um cinza-azulado (tocha fria/apagada)

    def acender(self, pal: list[RGB], x: float, y: float, n: tuple[float, float, float], base: float = 0.0,
                rim: bool = False) -> RGB:
        """Cor de um pixel de superfície: ambiente + luz da chama (com cor) + recorte de luar."""
        v = 0.16 + 0.46 * max(0.0, sum(a * b for a, b in zip(n, AMB))) + base
        quente = 0.0
        if self.luz:
            fx, fy, forca, _ = self.luz
            lx, ly, lz = fx - x, fy - y, 3.0
            d = math.sqrt(lx * lx + ly * ly + lz * lz)
            atn = forca / (1 + (d / 8.5) ** 2)
            v += 0.95 * atn * max(0.0, (n[0] * lx + n[1] * ly + n[2] * lz) / d)
            quente = atn
        c = _tom(pal, v)
        if self.luz:
            c = _mix(c, self.luz[3], min(0.42, quente * 0.5))
        if rim:
            c = _mix(c, LUAR, 0.22 if not self.luz else 0.12)
        if self.frio:
            cinza = sum(c) / 3
            c = _mix(c, (cinza * 0.92, cinza * 0.98, cinza * 1.1), self.frio)
        return c


def _camada() -> dict[tuple[int, int], tuple[RGB, int]]:
    return {}


def _por(cam: dict, x: int, y: int, c: RGB, a: int = 255) -> None:
    if 0 <= x < TS_W and 0 <= y < TS_H:
        cam[(x, y)] = (c, a)


def _contorno(cam: dict, cor_fn=None) -> dict:
    """Contorno de 1 px em tinta-pixel em volta dos pixels sólidos da camada (só nos 4 vizinhos)."""
    fora = {}
    for (x, y), (_, a) in cam.items():
        if a < 200:
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            p = (x + dx, y + dy)
            if p not in cam and 0 <= p[0] < TS_W and 0 <= p[1] < TS_H:
                fora[p] = ((cor_fn(*p) if cor_fn else TINTA), 255)
    fora.update(cam)
    return fora


def _ruido(x: int, y: int, s: int = 0) -> float:
    """Ruído fixo por pixel (não muda entre quadros, para a textura não tremer)."""
    return random.Random(x * 7919 + y * 104729 + s * 15485863).random()


def _cabeca(estado: str) -> dict[int, int]:
    """Meia-largura do pano por linha."""
    if estado == "futuro":
        return {11: 1, 12: 2, 13: 3, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4, 19: 3}
    if estado == "perdido":
        return {14: 3, 15: 4, 16: 4, 17: 4, 18: 4, 19: 3}
    return {13: 3, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4, 19: 3}


def _placa(cena: _Cena) -> dict:
    cam = _camada()
    linhas = {23: 3, 24: 4, 25: 4, 26: 4, 27: 4, 28: 4, 29: 4, 30: 4, 31: 4, 32: 4, 33: 3, 34: 2}
    topo, fim = min(linhas), max(linhas)
    for y, hw in linhas.items():
        for x in range(TS_CX - hw, TS_CX + hw + 1):
            esq, dir_ = x == TS_CX - hw, x == TS_CX + hw
            nx = -0.7 if esq else 0.7 if dir_ else 0.0
            ny = -0.7 if y == topo or (y == topo + 1 and (esq or dir_)) else 0.6 if y >= fim - 1 else 0.0
            borda = esq or dir_ or y == topo or y >= fim - 1
            c = cena.acender(P_PLACA, x, y, _norm(nx, ny, 1.0), base=(0.1 if borda else -0.08) + 0.06 * (_ruido(x, y, 3) - 0.5), rim=dir_)
            _por(cam, x, y, c)
    # Rebites: brilho em cima à esquerda, sombra embaixo.
    for rx, ry in ((TS_CX - 3, 28), (TS_CX + 3, 28), (TS_CX - 3, 31), (TS_CX + 3, 31)):
        _por(cam, rx, ry, cena.acender(P_FERRO, rx, ry, _norm(-0.5, -0.6, 0.6), base=0.18))
        _por(cam, rx, ry + 1, _tom(P_PLACA, 0.05))
    return _contorno(cam)


def _anel(cena: _Cena) -> dict:
    cam = _camada()
    for y in (TS_ANEL_Y, TS_ANEL_Y + 1):
        for x in range(TS_CX - 2, TS_CX + 3):
            u = (x - TS_CX) / 2.5
            n = _norm(u, -0.5 if y == TS_ANEL_Y else 0.3, math.sqrt(max(0.0, 1 - u * u)))
            _por(cam, x, y, cena.acender(P_FERRO, x, y, n, base=0.04, rim=x == TS_CX + 2))
    # Os dois braços do anel entrando na placa.
    for x in (TS_CX - 3, TS_CX + 3):
        _por(cam, x, TS_ANEL_Y, cena.acender(P_FERRO, x, TS_ANEL_Y, _norm(0, -0.6, 0.8), base=-0.12))
    return _contorno(cam)


def _tocha_corpo(estado: str, cena: _Cena, q: int) -> dict:
    """Cabo, copo de ferro e pano, sem a placa nem o anel."""
    cam = _camada()
    # Cabo de madeira (3 px), com veio e um anel de couro escuro embaixo do suporte.
    for y in range(22, 37):
        for x in range(TS_CX - 1, TS_CX + 2):
            u = (x - TS_CX) / 1.6
            n = _norm(u, 0.0, math.sqrt(max(0.0, 1 - u * u)))
            veio = -0.09 if _ruido(x, y // 3, 1) < 0.28 else 0.0
            _por(cam, x, y, cena.acender(P_MADEIRA, x, y, n, base=veio + 0.06, rim=x == TS_CX + 1))
    # Ponteira de ferro.
    for x in range(TS_CX - 1, TS_CX + 2):
        _por(cam, x, 37, cena.acender(P_FERRO, x, 37, _norm((x - TS_CX) * 0.6, 0.3, 0.8)))
    _por(cam, TS_CX, 38, cena.acender(P_FERRO, TS_CX, 38, _norm(0, 0.6, 0.8)))
    # Copo de ferro que segura o pano.
    for y in (20, 21):
        for x in range(TS_CX - 3, TS_CX + 4):
            u = (x - TS_CX) / 3.5
            n = _norm(u, -0.8 if y == 20 else 0.2, math.sqrt(max(0.0, 1 - u * u)))
            _por(cam, x, y, cena.acender(P_FERRO, x, y, n, base=0.06 if y == 20 else -0.04, rim=x == TS_CX + 3))
    # Pano enrolado (faixas em espiral) ou linho novo.
    linhas = _cabeca(estado)
    topo = min(linhas)
    pal_pano = P_LINHO if estado == "futuro" else P_PANO
    for y, hw in linhas.items():
        for x in range(TS_CX - hw, TS_CX + hw + 1):
            u = (x - TS_CX) / (hw + 0.6)
            ny = -0.85 if y == topo else -0.45 if y == topo + 1 else 0.35 if y == 19 else 0.0
            n = _norm(u, ny, math.sqrt(max(0.0, 1 - u * u)))
            faixa = (x - TS_CX + 2 * (y - topo)) % 5
            base = -0.13 if faixa == 0 else 0.05 if faixa == 1 else 0.0
            c = cena.acender(pal_pano, x, y, n, base=base, rim=x == TS_CX + hw)
            _por(cam, x, y, c)
    # O topo que queima, conforme o estado.
    if estado in ("feito", "hoje-feito", "especial"):
        for x in range(TS_CX - 3, TS_CX + 4):
            _por(cam, x, 13, _tom(P_CARVAO, 0.6))
        brasa = P_BRASA if estado != "especial" else _pal("#10204a", "#1c3c8a", "#2f63c8", "#4aa0ff", "#9ad4ff", "#e6f6ff")
        for x in range(TS_CX - 3, TS_CX + 4):
            if _ruido(x, 14, 5 + q) < 0.45:
                _por(cam, x, 14, brasa[3 + (x + q) % 2])
    elif estado == "hoje":
        # Meio queimado: carvão no topo e numa mancha descendo à esquerda, brasas na borda da queima.
        for x in range(TS_CX - 3, TS_CX + 4):
            _por(cam, x, 13, _tom(P_CARVAO, 0.5 + 0.3 * _ruido(x, 13, 9)))
        for x in range(TS_CX - 4, TS_CX + 1):
            _por(cam, x, 14, _tom(P_CARVAO, 0.7))
        for x in range(TS_CX - 4, TS_CX - 1):
            _por(cam, x, 15, _tom(P_CARVAO, 0.85))
        _por(cam, TS_CX - 4, 16, _tom(P_CARVAO, 0.9))
        for i, (x, y) in enumerate(((TS_CX + 1, 14), (TS_CX + 3, 14), (TS_CX - 1, 15), (TS_CX - 3, 16))):
            _por(cam, x, y, P_BRASA[3 + (i + q) % 3] if (i + q) % 3 else P_BRASA[2])
    elif estado == "parcial":
        # Só brasas: topo de carvão com pontos vermelhos que respiram.
        for y in (13, 14):
            for x in range(TS_CX - (3 if y == 13 else 4), TS_CX + (4 if y == 13 else 5)):
                _por(cam, x, y, _tom(P_CARVAO, 0.35 + 0.5 * _ruido(x, y, 11)))
        for i, (x, y) in enumerate(((TS_CX - 2, 13), (TS_CX + 1, 13), (TS_CX + 2, 14), (TS_CX - 1, 14), (TS_CX, 13), (TS_CX - 3, 14))):
            k = 0.5 + 0.5 * math.sin(q / TS_N * math.tau * (1 + i % 2) + i * 1.7)
            _por(cam, x, y, P_BRASA[1 + int(k * 3.99)])
    elif estado == "perdido":
        # Carvão frio, topo esburacado (sai do contorno arredondado da tocha nova).
        for y in (14, 15, 16, 17):
            hw = linhas[y]
            for x in range(TS_CX - hw, TS_CX + hw + 1):
                if y < 16 or _ruido(x, y, 13) < (0.75 if y == 16 else 0.35):
                    _por(cam, x, y, _tom(P_CARVAO, 0.25 + 0.6 * _ruido(x, y, 12)))
        for x, y in ((TS_CX - 3, 14), (TS_CX - 1, 14), (TS_CX + 2, 14), (TS_CX + 3, 14)):
            cam.pop((x, y), None)
        for x in (TS_CX - 2, TS_CX + 1):
            _por(cam, x, 13, _tom(P_CARVAO, 0.5))
    elif estado == "futuro":
        # Cordão em X e dois laços horizontais, com a ponta pendurada no copo.
        for y in range(13, 20):
            for x in (TS_CX - 3 + (y - 13), TS_CX + 3 - (y - 13)):
                if abs(x - TS_CX) <= linhas[y]:
                    _por(cam, x, y, cena.acender(P_CORDAO, x, y, _norm((x - TS_CX) / 4, 0, 1), base=0.15))
        for y in (13, 19):
            for x in range(TS_CX - linhas[y], TS_CX + linhas[y] + 1):
                _por(cam, x, y, cena.acender(P_CORDAO, x, y, _norm((x - TS_CX) / 4, -0.3, 1), base=0.12))
        _por(cam, TS_CX + 4, 20, _tom(P_CORDAO, 0.6)); _por(cam, TS_CX + 4, 21, _tom(P_CORDAO, 0.4))
        _por(cam, TS_CX + 5, 22, _tom(P_CORDAO, 0.5))
    return cam


def _chama(frente: dict, fundo: dict, pal: list[RGB], alt: float, larg: float, q: int, amp: float, viva: float,
           brilho: RGB, raio_brilho: float, brilho_a: float) -> None:
    """Chama em gota: largura, balanço e línguas variam em ciclo fechado de TS_N quadros."""
    fase = q / TS_N * math.tau
    base = TS_BASE_CHAMA + 0.6
    # Brilho em faixas atrás da chama (3 degraus, sem degradê borrado).
    cy = base - alt * 0.45
    r = raio_brilho * (1 + 0.05 * math.sin(fase * 2))
    for y in range(TS_H):
        for x in range(TS_W):
            d = math.hypot((x - TS_CX) * 1.0, (y - cy) * 0.82) / r
            if d < 1:
                a = brilho_a * (0.35 if d > 0.72 else 0.62 if d > 0.45 else 1.0)
                fundo[(x, y)] = (brilho, int(a))
    for y in range(TS_H):
        t = (base - y) / alt
        if t < -0.18 or t > 1.35:
            continue
        tt = max(t, 0.0)
        s = amp * tt ** 1.3 * math.sin(fase + tt * 2.4) + amp * 0.45 * tt ** 2 * math.sin(2 * fase - tt * 5.0)
        if t < 0:
            hw = larg * math.sqrt(max(0.0, 1 - (t / 0.18) ** 2))
        elif t <= 1:
            hw = larg * min(1.0, (tt + 0.2) / 0.38) ** 0.5 * (1 - tt) ** 0.85
            hw *= 1 + viva * 0.16 * math.sin(3 * fase + tt * 7.0) + viva * 0.08 * math.sin(fase - tt * 11.0)
        else:
            # Língua solta acima da ponta, só em parte do ciclo.
            liga = math.sin(fase * 2 + 1.0) > 0.25 - viva * 0.2
            hw = 0.55 if liga and t < 1.12 + 0.12 * viva else 0.0
        for x in range(TS_W):
            d = abs(x - (TS_CX + s)) / (hw + 0.5)
            if d > 1 or hw <= 0:
                continue
            calor = (1 - d) * 0.62 + (1 - min(tt, 1.2)) * 0.72 - 0.12
            i = 0 if calor > 1.0 else 1 if calor > 0.82 else 2 if calor > 0.62 else 3 if calor > 0.42 else 4 if calor > 0.24 else 5
            if t > 1:
                i = max(i, 3)
            frente[(x, y)] = (pal[i], 255)


def _fumaca(frente: dict, q: int, y0: int, y1: int, fio: bool, cinza: str = "#9a9aa4") -> None:
    fase = q / TS_N * math.tau
    c = _hx(cinza)
    if fio:
        # Fio de fumaça: 1 px que serpenteia e some no alto.
        for y in range(y1, y0 + 1):
            k = (y0 - y) / max(1, y0 - y1)
            x = TS_CX + round(math.sin(fase + y * 0.55) * (0.4 + 2.2 * k) + k * 1.5)
            a = int(215 * (1 - k) ** 0.8 + 25)
            if (y + q) % 7 == 0 and k > 0.35:
                continue
            _por(frente, x, y, _mix(c, (200, 200, 210), k * 0.5), a)
    else:
        # Fumacinha: três baforadas que sobem e se abrem.
        for k in range(3):
            p = ((q + k * 2) % TS_N) / TS_N
            y = round(y0 - p * (y0 - y1))
            x = TS_CX + round(math.sin(fase + k * 2.1) * 1.2 + p * 2)
            a = int(170 * (1 - p) + 30)
            tam = 1 if p < 0.34 else 2
            for dx in range(tam):
                for dy in range(tam):
                    _por(frente, x + dx, y - dy, _mix(c, (190, 190, 200), p), a)


def _particulas(frente: dict, q: int, cores: list[RGB], n: int, y0: int, subida: int, espalha: float, seed: int) -> None:
    rnd = random.Random(seed)
    for k in range(n):
        x0 = TS_CX + rnd.uniform(-espalha, espalha)
        desloc = rnd.randrange(TS_N)
        lado = rnd.choice((-1, 1))
        p = ((q + desloc) % TS_N) / TS_N
        y = round(y0 - p * subida - rnd.randrange(2))
        x = round(x0 + lado * math.sin(p * math.pi) * 1.6)
        i = min(len(cores) - 1, int(p * len(cores)))
        _por(frente, x, y, cores[i], 255 if p < 0.7 else 180)


def _anel_ouro(atras: dict, frente: dict, q: int) -> None:
    """Coroa de brilho dourado girando em volta do suporte (metade de trás atrás da tocha, metade da frente na frente)."""
    fase = q / TS_N * math.tau
    cy, rx, ry = TS_ANEL_Y + 0.5, 8.6, 2.4
    pontos: dict[tuple[int, int], float] = {}
    for g in range(360):
        ang = math.radians(g)
        p = (round(TS_CX + rx * math.cos(ang)), round(cy + ry * math.sin(ang)))
        pontos.setdefault(p, ang)
    for (x, y), ang in pontos.items():
        luz = 0.5 + 0.5 * math.cos(ang - fase)
        c = P_OURO[1 + int(luz * 4.99)]
        (frente if math.sin(ang) > 0 else atras)[(x, y)] = (c, 255)
    # Halo de 1 px por fora do anel, mais forte onde o brilho está passando.
    for (x, y), ang in pontos.items():
        luz = 0.5 + 0.5 * math.cos(ang - fase)
        for dx, dy in ((0, -1), (0, 1)):
            v = (x + dx, y + dy)
            if v not in pontos:
                (frente if math.sin(ang) > 0 else atras).setdefault(v, (P_OURO[4], int(30 + 90 * luz ** 2)))
    # Pontas da coroa: quatro dentes de luz que sobem do arco de trás e piscam em sequência.
    for k, dx in enumerate((-6, -3, 3, 6)):
        y = round(cy - ry * math.sqrt(max(0.0, 1 - (dx / rx) ** 2)))
        fase_k = (q + k * 2) % 3
        _por(atras, TS_CX + dx, y - 1, P_OURO[5 if fase_k == 0 else 4], 255 if fase_k < 2 else 120)
        if fase_k == 0:
            _por(atras, TS_CX + dx, y - 2, P_OURO[4], 150)


def _flamula(cena: _Cena, q: int) -> dict:
    """Bandeirola vermelha de rabo de andorinha amarrada no cabo, ondulando ao vento."""
    cam = _camada()
    fase = q / TS_N * math.tau
    comp = 9
    for k in range(comp):
        x = TS_CX + 2 + k
        onda = math.sin(fase - k * 0.75) * min(1.0, k / 3) * 1.2
        topo = 22 + k * 0.28 + onda
        fim = 28 - k * 0.28 + onda
        inc = math.cos(fase - k * 0.75)
        for y in range(round(topo), round(fim) + 1):
            if k >= comp - 3 and abs(y - (topo + fim) / 2) < (k - (comp - 4)) * 0.75:
                continue  # o corte do rabo de andorinha
            borda = y == round(topo)
            n = _norm(-inc * 0.6, -0.5 if borda else 0.1, 0.8)
            c = cena.acender(P_FLAMULA, x, y, n, base=0.06 + (0.08 if borda else 0.0))
            _por(cam, x, y, c)
    # Amarra no cabo.
    _por(cam, TS_CX + 1, 23, _tom(P_CORDAO, 0.9)); _por(cam, TS_CX + 1, 27, _tom(P_CORDAO, 0.7))
    return _contorno(cam)


def _cisalhar(cam: dict, giro: float, pivo: int) -> dict:
    """Entorta a tocha no suporte: cada linha anda um pouco para o lado (o anel fica onde está)."""
    out = {}
    for (x, y), v in cam.items():
        out[(x + round(giro * (pivo - y)), y)] = v
    return out


def _farrapos(cena: _Cena, q: int, giro: float) -> dict:
    """Pano desfiado caído: uma aba de pano cinza de cinza (queimado e frio) que se soltou do lado direito do pano
    tombado e pende reta, longe do cabo, com a ponta em dois fiapos; uma tira curta do outro lado."""
    cam = _camada()
    balanco = (0, 0, 1, 1, 1, 0)[q]
    desv = lambda y: round(giro * (TS_ANEL_Y - y))
    x0 = TS_CX + 4 + desv(16)
    for y in range(16, 30):
        k = (y - 16) / 13
        larg = 3 if k < 0.35 else 2 if k < 0.8 else 1
        x = x0 + (1 if k > 0.15 else 0) + (balanco if k > 0.5 else 0)
        for dx in range(larg):
            n = _norm(-0.5 + dx * 0.55, -0.2, 0.85)
            dobra = -0.12 if (y + dx) % 4 == 0 else 0.0
            _por(cam, x + dx, y, cena.acender(P_CINZA_PANO, x + dx, y, n, base=0.1 - 0.12 * k + dobra))
    xb = x0 + 1 + balanco
    _por(cam, xb - 1, 30, _tom(P_CINZA_PANO, 0.3)); _por(cam, xb + 1, 31, _tom(P_CINZA_PANO, 0.25))
    _por(cam, xb - 1, 31, _tom(P_CINZA_PANO, 0.2))
    # Tira curta do lado esquerdo.
    xl = TS_CX - 5 + desv(18)
    for y in range(18, 23):
        _por(cam, xl, y, cena.acender(P_CINZA_PANO, xl, y, _norm(-0.6, 0, 0.8), base=0.02 - 0.03 * (y - 18)))
    _por(cam, xl - 1, 23, _tom(P_CINZA_PANO, 0.2))
    return _contorno(cam)


def _sobrepor(img: Image.Image, cam: dict) -> None:
    camada = Image.new("RGBA", (TS_W, TS_H), (0, 0, 0, 0))
    for (x, y), (c, a) in cam.items():
        camada.putpixel((x, y), (int(round(c[0])), int(round(c[1])), int(round(c[2])), a))
    img.alpha_composite(camada)


def _esmaecer(img: Image.Image, contraste: float = 0.55, sat: float = 0.45) -> Image.Image:
    """Tocha nova ainda não usada: menos contraste e menos cor, puxada para um cinza quente médio."""
    out = img.copy()
    px = out.load()
    meio = (128, 122, 112)
    for y in range(TS_H):
        for x in range(TS_W):
            r, g, b, a = px[x, y]
            if not a:
                continue
            lum = 0.3 * r + 0.59 * g + 0.11 * b
            r, g, b = (lum + (c - lum) * sat for c in (r, g, b))
            r, g, b = (m + (c - m) * contraste for c, m in zip((r, g, b), meio))
            px[x, y] = (int(r), int(g), int(b), a)
    return out


def _quadro_tocha(estado: str, q: int) -> Image.Image:
    fase = q / TS_N * math.tau
    luzes = {
        "feito": (TS_CX, 7.0, 1.0 + 0.04 * math.sin(fase * 2), _hx("#ffb45a")),
        "hoje-feito": (TS_CX, 6.0, 1.3 + 0.08 * math.sin(fase * 2), _hx("#ffc46a")),
        "hoje": (TS_CX, 10.0, 0.55 + 0.12 * math.sin(fase * 3), _hx("#ff9a48")),
        "parcial": (TS_CX, 13.0, 0.22 + 0.05 * math.sin(fase), _hx("#ff4a20")),
        "especial": (TS_CX, 7.0, 1.05 + 0.05 * math.sin(fase * 2), _hx("#7cc4ff")),
    }
    cena = _Cena(luzes.get(estado), frio=0.35 if estado == "perdido" else 0.0)
    img = Image.new("RGBA", (TS_W, TS_H), (0, 0, 0, 0))
    fundo, atras, frente = _camada(), _camada(), _camada()

    if estado == "feito":
        _chama(frente, fundo, CH_FEITO, 11.5, 3.9, q, 0.55, 0.45, _hx("#ff9a3a"), 9.5, 58)
        _particulas(frente, q, [CH_FEITO[1], CH_FEITO[3]], 1, 2, 2, 1.0, 7)
    elif estado == "hoje-feito":
        _chama(frente, fundo, CH_FORTE, 13.2, 4.5, q, 0.9, 0.85, _hx("#ffb040"), 11.5, 78)
        _particulas(frente, q, [CH_FORTE[1], CH_FORTE[2], CH_FORTE[3], CH_FORTE[4]], 6, 4, 6, 4.5, 21)
        _anel_ouro(atras, frente, q)
    elif estado == "hoje":
        _chama(frente, fundo, CH_FRACA, 6.2 + 0.8 * math.sin(fase * 2), 2.5, q, 1.0, 1.0, _hx("#ff8a3a"), 6.0, 42)
        _fumaca(frente, q, 6, 0, fio=False)
    elif estado == "parcial":
        for (x, y) in ((TS_CX - 1, 12), (TS_CX + 1, 12), (TS_CX, 12)):
            fundo[(x, y)] = (_hx("#ff4020"), 60 + int(25 * math.sin(fase)))
        _fumaca(frente, q, 12, 1, fio=True)
    elif estado == "especial":
        _chama(frente, fundo, CH_AZUL, 12.2, 4.1, q, 0.7, 0.6, _hx("#4aa0ff"), 10.5, 66)
        estrelas = ((3, 4, 0), (20, 7, 2), (5, 15, 4), (19, 1, 1), (2, 22, 3), (21, 14, 5))
        for x, y, f in estrelas:
            k = (q + f) % TS_N
            if k in (0, 1, 2):
                _por(frente, x, y, (_hx("#ffffff"), _hx("#bfe8ff"), _hx("#4aa0ff"))[k] if k != 1 else _hx("#ffffff"),
                     255 if k < 2 else 200)

    _sobrepor(img, fundo)
    _sobrepor(img, atras)
    _sobrepor(img, _placa(cena))
    corpo = _tocha_corpo(estado, cena, q)
    giro = 0.24
    if estado == "perdido":
        corpo = _cisalhar(corpo, giro, TS_ANEL_Y)
    _sobrepor(img, _contorno(corpo))
    if estado == "perdido":
        _sobrepor(img, _farrapos(cena, q, giro))
    _sobrepor(img, _anel(cena))
    if estado == "especial":
        _sobrepor(img, _flamula(cena, q))
    _sobrepor(img, frente)
    if estado == "futuro":
        img = _esmaecer(img)
    return img


def tocha_semana() -> Image.Image:
    folha = Image.new("RGBA", (TS_W * TS_N, TS_H * len(TS_ESTADOS)), (0, 0, 0, 0))
    for e, estado in enumerate(TS_ESTADOS):
        for q in range(TS_N):
            folha.alpha_composite(_quadro_tocha(estado, q), (q * TS_W, e * TS_H))
    return folha


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    for nome, img in (("fogo", fogo()), ("tocha", tocha()), ("tocha-semana", tocha_semana())):
        img.save(PASTA / f"{nome}.png", optimize=True)
        print(nome, img.size, (PASTA / f"{nome}.png").stat().st_size, "bytes")


if __name__ == "__main__":
    main()
