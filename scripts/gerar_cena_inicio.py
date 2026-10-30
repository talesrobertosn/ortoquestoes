"""Cenário "HD-2D" do topo da página inicial (30/10/2026, pedido do Tales com o Octopath Traveler II de referência).

Nada baixado nem gerado por IA: cada pixel sai das funções abaixo. O cenário é desenhado em pixel art (480 x 200),
camada por camada, e depois montado em 3x com a luz calculada por pixel, como nos jogos "HD-2D":
- profundidade de campo: o fundo e o primeiro plano desfocados, o acampamento nítido;
- luz do sol com feixes (raios crepusculares, por desfoque radial do céu visto entre as árvores);
- luz da fogueira e das lanternas que cai no chão e nas árvores, com sombras projetadas;
- brilho (bloom), vinheta e correção de cor quente nas altas luzes e fria nas sombras.
Gera três horas do dia em public/pixel/inicio/: cena-manha, cena-tarde e cena-noite (.webp, 1440 x 600 e 960 x 400).

A fogueira, o esqueleto e o gato ficam fora do cenário: são animados e clicáveis (CenaAcampamento.tsx) e entram por
cima, nas posições definidas em POSICOES (o componente usa as mesmas porcentagens).
Uso: python3 scripts/gerar_cena_inicio.py
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"
W, H, ESC = 480, 200, 3
# Onde ficam os objetos animados (em pixels da arte; o componente usa x/W e y/H em %).
POSICOES = {"fogo": (240, 146), "esqueleto": (276, 146), "gato": (312, 150)}


def hexa(c: str) -> np.ndarray:
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x: int, y: int, cor, a: float = 1.0) -> None:
        if 0 <= x < W and 0 <= y < H:
            rgb = hexa(cor) if isinstance(cor, str) else cor
            base = self.c[y, x]
            na = a + base[3] * (1 - a)
            if na > 0:
                base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / na
            base[3] = na

    def ret(self, x0: int, y0: int, w: int, h: int, cor, a: float = 1.0) -> None:
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.p(x, y, cor, a)

    def disco(self, cx: float, cy: float, r: float, cores: tuple[str, str, str], luz=(-0.6, -0.8)) -> None:
        """Disco com sombreamento em 3 tons, iluminado da direção `luz` (copas de árvore, pedras)."""
        lx, ly = luz
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                dx, dy = x - cx, y - cy
                d = math.hypot(dx, dy)
                if d <= r:
                    k = (dx * lx + dy * ly) / max(r, 1) + (((x * 73856093) ^ (y * 19349663)) % 997 / 997 - 0.5) * 0.55
                    cor = cores[0] if k > 0.38 else cores[1] if k > -0.2 else cores[2]
                    self.p(x, y, cor)


def ruido(seed: int, escala: int, w: int = W, h: int = H) -> np.ndarray:
    """Ruído suave 0..1 (valores aleatórios ampliados com interpolação)."""
    g = np.random.default_rng(seed)
    pequeno = g.random((h // escala + 2, w // escala + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize((w + escala * 2, h + escala * 2), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:h, :w] / 255


# ─────────────────────────────── Paletas por hora do dia ───────────────────────────────
PERIODOS = {
    "manha": dict(ceu=("#5d97d4", "#a9cfe8", "#f6e6c4"), sol=(96, 18), ambiente="#fff4e4", amb_k=0.92, fogo_k=0.2, raios=0.55,
                  monte=("#7f93b5", "#9aacc8"), monte2=("#5f7a8f", "#7d97a6"), grade_quente="#fff1d6", grade_fria="#2a4a6a"),
    "tarde": dict(ceu=("#4f5d9a", "#e8946a", "#f8d79c"), sol=(418, 70), ambiente="#ffc79a", amb_k=0.92, fogo_k=0.55, raios=0.75,
                  monte=("#8a6e88", "#b08a8e"), monte2=("#6a5468", "#8a6a72"), grade_quente="#ffd8a0", grade_fria="#3a2a5a"),
    "noite": dict(ceu=("#040818", "#0f1a3c", "#25335e"), sol=(380, 30), ambiente="#4a5cb0", amb_k=0.42, fogo_k=1.25, raios=0.0,
                  monte=("#1e2a4a", "#2a3a5e"), monte2=("#16203a", "#1e2c4a"), grade_quente="#ffcf8a", grade_fria="#0a1530"),
}

# Tons de folhagem (luz, meio, sombra) e outros materiais (luz do dia; a hora do dia vem na montagem).
VERDES = [("#9cc760", "#5e9a3e", "#2f5a2a"), ("#b2cf6a", "#78a446", "#3c6a30"), ("#88b858", "#4f8a3c", "#28502a")]
VERDE_LONGE = ("#7aa0a0", "#5a8288", "#3e626c")
TERRA = ("#c8a36a", "#a8844e", "#7e6038")


def desenhar_ceu(per: dict) -> np.ndarray:
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    ceu = np.zeros((H, W, 3), dtype=np.float32)
    for y in range(H):
        t = y / 110
        cor = topo * (1 - t) * 2 + meio * t * 2 if t < 0.5 else meio * (1 - t) * 2 + horiz * (t - 0.5) * 2
        if t >= 1:
            cor = horiz
        ceu[y] = cor
    nome = [k for k, v in PERIODOS.items() if v is per][0]
    nuvem = ruido(7, 22) * 0.7 + ruido(8, 8) * 0.3
    for y in range(8, 80):
        for x in range(W):
            v = nuvem[y, x] - 0.52 - abs(y - 38) / 120
            if v > 0:
                k = min(1, v * 6)
                tom = {"manha": "#ffffff", "tarde": "#ffd2b0", "noite": "#3a4a7a"}[nome]
                sombra = {"manha": "#c9d8ea", "tarde": "#c8808a", "noite": "#1c2850"}[nome]
                c = hexa(tom) if nuvem[y - 2, x] - 0.52 - abs(y - 40) / 120 > 0.02 else hexa(sombra)
                ceu[y, x] = ceu[y, x] * (1 - k * 0.85) + c * k * 0.85
    if nome == "noite":
        g = np.random.default_rng(3)
        for _ in range(140):
            x, y = int(g.random() * W), int(g.random() * 90)
            b = 0.4 + g.random() * 0.6
            ceu[y, x] = np.minimum(1, ceu[y, x] + b)
        cx, cy = per["sol"]
        for y in range(cy - 9, cy + 10):
            for x in range(cx - 9, cx + 10):
                d = math.hypot(x - cx, y - cy)
                if d < 8:
                    ceu[y, x] = hexa("#eef2ff") if math.hypot(x - cx + 3, y - cy + 2) > 3.5 or d > 6 else hexa("#d6def5")
    else:
        cx, cy = per["sol"]
        for y in range(cy - 12, cy + 13):
            for x in range(cx - 12, cx + 13):
                d = math.hypot(x - cx, y - cy)
                if 0 <= y < H and 0 <= x < W and d < 11:
                    ceu[y, x] = np.minimum(1, ceu[y, x] * 0.2 + hexa("#fff8e0") * (1.1 - d / 30))
    return ceu


def castelo(c: Camada, cx: int, base: int, noite: bool) -> None:
    """O castelo da prova, pequeno e enevoado, visto por uma abertura da mata (o fim do caminho do cronograma)."""
    pedra, sombra, telhado = "#d8d0c8", "#a8a0a0", "#8a5a7a"
    for (tx, larg, alt) in ((cx - 12, 6, 16), (cx - 4, 8, 24), (cx + 6, 6, 14)):
        c.ret(tx, base - alt, larg, alt, pedra)
        c.ret(tx + larg - 2, base - alt, 2, alt, sombra)
        for k in range(larg // 2 + 1):
            c.ret(tx + k, base - alt - (larg // 2 - k) - 1, larg - 2 * k, 1, telhado)
    c.ret(cx - 12, base - 8, 24, 8, pedra)
    for (wx, wy) in ((cx - 1, base - 17), (cx - 10, base - 11), (cx + 8, base - 9), (cx + 1, base - 5)):
        c.p(wx, wy, "#ffd27a" if noite else "#4a4050")
    c.ret(cx, base - 32, 1, 6, "#4a3a3a")
    c.ret(cx + 1, base - 32, 4, 2, "#c0392b")


def neblina(cor: tuple[str, str, str], k: float, nevoa: str) -> tuple:
    n = hexa(nevoa)
    return tuple(hexa(c) * (1 - k) + n * k for c in cor)


def mata_profunda(per: dict, nome: str) -> list[tuple[Camada, float]]:
    """A mata fechada atrás da clareira, em fileiras: as do fundo mais enevoadas e desfocadas."""
    nevoa = {"manha": "#b8d0c0", "tarde": "#e0b090", "noite": "#22305a"}[nome]
    fileiras = []
    g = np.random.default_rng(21)
    # Céu e luz atrás de tudo só aparecem por entre as copas lá em cima.
    interior = Camada()
    fundo_mata = neblina(("#2c4a2c", "#203a22", "#162a18"), 0.35, nevoa)
    n = ruido(71, 4)
    for y in range(36, 104):
        for x in range(W):
            v = n[y, x]
            interior.p(x, y, fundo_mata[0] if v > 0.66 else fundo_mata[1] if v > 0.4 else fundo_mata[2])
    for x in range(3, W, 7):
        interior.ret(x + (x * 7) % 4, 60, 2, 44, neblina(("#4a3424", "#4a3424", "#4a3424"), 0.4, nevoa)[0])
    fileiras.append((interior, 2.6))
    for i, (base, alt, passo, haze, blur) in enumerate(((84, 56, 12, 0.6, 2.6), (92, 60, 14, 0.38, 1.7), (100, 62, 16, 0.16, 1.0))):
        c = Camada()
        if i == 0:
            castelo(c, 318, 70, nome == "noite")
        x = -12
        k = 0
        while x < W + 14:
            vazio = i == 0 and 300 < x < 336  # a abertura do castelo
            if not vazio:
                verdes = neblina(VERDES[(k + i) % 3], haze, nevoa)
                alto = alt + int(g.random() * 30) - (12 if g.random() < 0.3 else 0)
                arvore_redonda(c, x, base + int(g.random() * 6), alto, verdes, seed=k + i * 50)
            x += passo + int(g.random() * 8)
            k += 1
        fileiras.append((c, blur))
    # Dossel escuro no alto, com aberturas por onde entra a luz.
    dossel = Camada()
    escuro = neblina(VERDES[2], 0.1, nevoa)
    for x in range(-20, W + 20, 9):
        y = -6 + int(8 * math.sin(x / 31) + 4 * math.sin(x / 9))
        if 70 < x < 140 or 300 < x < 340:
            continue
        dossel.disco(x, y, 12 + (x * 7) % 9, tuple(neblina(VERDES[2], 0.05, nevoa)) if False else ("#2f5a2a", "#244a22", "#183418"))
    fileiras.append((dossel, 2.2))
    return fileiras


def chao_e_lago(per: dict) -> Camada:
    c = Camada()
    n1, n2 = ruido(31, 16), ruido(32, 3)
    g0 = np.random.default_rng(35)
    fino = g0.random((H, W))
    fx, fy = POSICOES["fogo"]
    for y in range(92, H):
        for x in range(W):
            v = n1[y, x] * 0.8 + fino[y, x] * 0.2
            cor = "#8cbc58" if v > 0.62 else "#72a648" if v > 0.46 else "#5c8e3e" if v > 0.32 else "#4a7834"
            c.p(x, y, cor)
            dx, dy = (x - fx) / 118, (y - fy) / 34
            caminho = abs(x - (fx + (y - H) * -0.55)) < 9 + (y - fy) * 0.32 and y > fy + 8
            if dx * dx + dy * dy < 1 - n2[y, x] * 0.22 or caminho:
                t = TERRA[0] if fino[y, x] > 0.7 else TERRA[1] if fino[y, x] > 0.25 else TERRA[2]
                c.p(x, y, t)
    # Capim: tufos de 2 a 4 pixels com a ponta clara, fora da terra batida.
    for _ in range(2600):
        x, y = int(g0.random() * W), 94 + int(g0.random() * (H - 94))
        dx, dy = (x - fx) / 122, (y - fy) / 36
        if dx * dx + dy * dy < 1.05:
            continue
        alt = 2 + int(g0.random() * 3) + (y - 92) // 40
        for j in range(alt):
            c.p(x, y - j, "#a8d46e" if j == alt - 1 else "#4a7a34" if j == 0 else "#6a9c44")
    # Lago e ponte de pedra ao fundo, à esquerda (como na referência da floresta).
    lx, ly = 110, 104
    for y in range(ly - 8, ly + 9):
        meia = int(62 * math.sqrt(max(0, 1 - ((y - ly) / 8.5) ** 2)))
        for x in range(lx - meia, lx + meia):
            brilho = (x * 3 + y * 5) % 19 == 0
            c.p(x, y, "#d8f4f2" if brilho else "#6ab4b8" if y < ly - 2 else "#4a909e" if y < ly + 4 else "#3a7a8a")
    for x in range(lx - 34, lx + 35):
        t = (x - lx) / 34
        topo = int(ly - 4 - 8 * (1 - t * t))
        for y in range(topo, topo + 4):
            c.p(x, y, "#e8dcc4" if y == topo else "#b8ac94" if (x // 3 + y) % 3 else "#968a74")
        if abs(t) < 0.85:
            for y in range(topo + 4, ly + 5):
                if abs(x - lx) > 22 * math.sqrt(max(0, 1 - ((y - ly - 4) / 9) ** 2)):
                    c.p(x, y, "#a09680")
    # Arbustos na borda da mata (a passagem do chão para as árvores) e a sombra que a mata faz no chão.
    gb = np.random.default_rng(44)
    for y in range(92, 104):
        for x in range(W):
            if not (lx - 66 < x < lx + 66 and y > 96):
                c.p(x, y, "#1a2a14", 0.5 * (1 - (y - 92) / 12))
    x = -4
    while x < W + 4:
        if not (lx - 60 < x < lx + 60):
            r = 4 + gb.random() * 5
            c.disco(x, 96 + gb.random() * 4, r, ("#7aac4c", "#4e8236", "#2e5626"))
        x += 5 + int(gb.random() * 6)
    # Flores e pedrinhas.
    g = np.random.default_rng(41)
    for _ in range(260):
        x, y = int(g.random() * W), 112 + int(g.random() * 86)
        dx, dy = (x - fx) / 122, (y - fy) / 36
        if dx * dx + dy * dy < 1.1:
            continue
        cor = ["#f4a7c4", "#f6d27a", "#b9a3f0", "#ffffff", "#f08a6a"][int(g.random() * 5)]
        c.p(x, y, cor)
        c.p(x + 1, y, cor)
        c.p(x, y + 1, "#3e6a2e")
    return c


def primeiro_plano() -> Camada:
    """Folhagem perto da câmera nos cantos (vai bem desfocada) e capim embaixo."""
    c = Camada()
    for (cx, cy, r) in ((-6, 10, 34), (30, -8, 30), (8, 50, 22), (486, 6, 34), (452, -10, 28), (476, 52, 22)):
        c.disco(cx, cy, r, ("#3a6a30", "#2a5224", "#1a3618"))
    for (cx, cy, r) in ((10, 204, 30), (60, 214, 22), (470, 206, 30), (420, 216, 20)):
        c.disco(cx, cy, r, ("#6aa04a", "#4a8038", "#2e5a28"))
    g = np.random.default_rng(51)
    for _ in range(160):
        x = int(g.random() * W)
        if 110 < x < 370 and g.random() < 0.8:
            continue
        alt = 5 + int(g.random() * 12)
        for j in range(alt):
            c.p(x + (j // 4) * (1 if x % 2 else -1), H - 1 - j, "#7aae4c" if j > alt // 2 else "#4a7a34")
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    canais = []
    for i in range(arr.shape[2]):
        im = Image.fromarray(np.clip(arr[:, :, i] * 255, 0, 255).astype(np.uint8))
        canais.append(np.asarray(im.filter(ImageFilter.GaussianBlur(raio)), dtype=np.float32) / 255)
    return np.stack(canais, 2)


def desfocar_rgba(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque com alfa pré-multiplicado (sem halo escuro nas bordas)."""
    pm = arr.copy()
    pm[:, :, :3] *= pm[:, :, 3:4]
    d = desfocar(pm, raio)
    a = np.maximum(d[:, :, 3:4], 1e-4)
    d[:, :, :3] = d[:, :, :3] / a
    return d


def sobre(base: np.ndarray, camada: np.ndarray) -> np.ndarray:
    a = camada[:, :, 3:4]
    return base * (1 - a) + camada[:, :, :3] * a


def luz_pontual(cx: float, cy: float, raio: float, achatar: float = 1.0) -> np.ndarray:
    ys, xs = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)
    d2 = ((xs - cx * ESC) / (raio * ESC)) ** 2 + ((ys - cy * ESC) / (raio * ESC * achatar)) ** 2
    return np.exp(-d2 * 2.2)


def raios_de_luz(ceu_visivel: np.ndarray, sol: tuple[int, int], passos: int = 64) -> np.ndarray:
    """Feixes crepusculares: desfoque radial da máscara do céu visível em direção ao sol."""
    hh, ww = ceu_visivel.shape
    sx, sy = sol[0] * ESC, sol[1] * ESC
    ys, xs = np.mgrid[0:hh, 0:ww].astype(np.float32)
    acum = np.zeros_like(ceu_visivel)
    peso = 1.0
    for i in range(passos):
        t = i / passos * 0.9
        px = np.clip((xs + (sx - xs) * t).astype(np.int32), 0, ww - 1)
        py = np.clip((ys + (sy - ys) * t).astype(np.int32), 0, hh - 1)
        acum += ceu_visivel[py, px] * peso
        peso *= 0.965
    return acum / passos


def arvore_redonda(c: Camada, x: int, base: int, alt: int, verdes, luz=(-0.6, -0.8), seed: int = 0) -> None:
    """Árvore de copa redonda: tronco e um cacho de discos em 3 tons, iluminados de cima à esquerda."""
    g = np.random.default_rng(seed)
    tronco = alt // 3
    c.ret(x - 1, base - tronco, 3, tronco, "#5a3a22")
    c.ret(x + 1, base - tronco, 1, tronco, "#3a2414")
    r = alt * 0.34
    centros = [(x + g.normal(0, r * 0.5), base - tronco - r * 0.8 - g.random() * r * 0.8, r * (0.55 + g.random() * 0.4)) for _ in range(8)]
    centros.sort(key=lambda t: t[1], reverse=True)
    for (cx, cy, rr) in centros:
        c.disco(cx, cy, rr, verdes, luz)


def acampamento() -> Camada:
    """Barraca, pedras da fogueira, tronco, caixote, barril, livros e a lanterna (a fogueira e o esqueleto vêm por cima)."""
    c = Camada()
    fx, fy = POSICOES["fogo"]
    # Barraca de lona, iluminada pela esquerda.
    bx, bb = fx - 54, fy + 2
    for j in range(34):
        meia = j * 28 // 34
        for dx in range(-meia, meia + 1):
            fora = abs(dx) >= meia - 1
            entrada = abs(dx) < max(0, j - 15) * 0.5 and j > 15
            cor = "#24160c" if entrada else "#34502a" if fora else "#b4cc84" if dx < -meia * 0.35 else "#8eae60" if dx < meia * 0.35 else "#648846"
            c.p(bx + dx, bb - 34 + j, cor)
    for j in range(0, 34, 6):
        c.p(bx - j * 28 // 34 + 2, bb - 34 + j, "#d4e0a8")
    c.ret(bx, bb - 39, 1, 6, "#5a3a22")
    c.ret(bx + 1, bb - 39, 6, 3, "#c0392b")
    c.ret(bx + 1, bb - 39, 6, 1, "#e86a5a")
    # Pedras em volta da fogueira e lenha.
    for k in range(12):
        a = k / 12 * math.tau
        px, py = fx + math.cos(a) * 15, fy + 1 + math.sin(a) * 5
        c.disco(px, py, 3, ("#e0dace", "#a8a296", "#5e5a54"))
    c.ret(fx - 11, fy - 1, 22, 4, "#2a1a10")
    for k, (dx, cor) in enumerate(((-9, "#7a4a26"), (-2, "#9a6236"), (4, "#6a3a1a"))):
        c.ret(fx + dx, fy - 1 - k % 2, 8, 3, cor)
        c.ret(fx + dx, fy - 1 - k % 2, 8, 1, "#c08a50")
    # Tronco para sentar (o esqueleto senta nele).
    tx, ty = POSICOES["esqueleto"][0] - 16, POSICOES["esqueleto"][1] - 1
    c.ret(tx, ty, 40, 7, "#7a4a26")
    c.ret(tx, ty, 40, 2, "#b07a44")
    c.ret(tx, ty + 6, 40, 1, "#3a2010")
    for k in range(2, 40, 8):
        c.ret(tx + k, ty + 3, 3, 1, "#5a3418")
    c.disco(tx + 40, ty + 3.5, 3.5, ("#ecc890", "#c79a5e", "#8a6038"))
    # Caixote e barril perto da barraca.
    cx0 = fx - 100
    c.ret(cx0, fy - 12, 16, 14, "#9a6a36")
    c.ret(cx0, fy - 12, 16, 2, "#c89a5a")
    for k in (0, 7, 15):
        c.ret(cx0 + k, fy - 12, 1, 14, "#5a3a1a")
    c.ret(cx0, fy - 6, 16, 1, "#5a3a1a")
    for y in range(fy - 16, fy + 2):
        meia = 7 if y in (fy - 16, fy + 1) else 8
        for dx in range(-meia, meia + 1):
            c.p(cx0 - 12 + dx, y, "#3a2a1a" if y in (fy - 12, fy - 3) else "#b88048" if dx < -3 else "#8a5a2e" if dx < 4 else "#6a4020")
    # Livros empilhados no fim do tronco e a lanterna num toco ao lado da barraca.
    lx = POSICOES["esqueleto"][0] + 28
    for k, (cor, larg) in enumerate((("#2f6aa8", 12), ("#b8452f", 11), ("#3f8a3a", 12), ("#e9b54a", 10), ("#7a4a8c", 11))):
        c.ret(lx + (k % 2), fy + 4 - k * 2, larg, 2, cor)
        c.ret(lx + (k % 2), fy + 4 - k * 2, larg, 1, "#ffffff", 0.3)
    sx = fx - 26
    c.ret(sx, fy - 4, 10, 7, "#7a4a26")
    c.ret(sx, fy - 4, 10, 2, "#d0a46a")
    c.ret(sx + 2, fy - 14, 6, 10, "#3a2a1a")
    c.ret(sx + 3, fy - 13, 4, 8, "#ffe8a0")
    c.ret(sx + 4, fy - 12, 2, 6, "#fff8d8")
    c.ret(sx + 1, fy - 15, 8, 1, "#3a2a1a")
    c.ret(sx + 4, fy - 17, 2, 2, "#3a2a1a")
    return c


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    fx, fy = POSICOES["fogo"]
    ceu = ampliar(desenhar_ceu(per))
    fileiras = [(desfocar_rgba(ampliar(cam.c), r)) for cam, r in mata_profunda(per, nome)]
    chao = desfocar_rgba(ampliar(chao_e_lago(per).c), 0.4)
    camp = ampliar(acampamento().c)
    frente = desfocar_rgba(ampliar(primeiro_plano().c), 9)

    # Sombras projetadas: para longe do sol (dia) ou da fogueira (noite).
    sombras = Camada()
    alvos = [(fx - 54, fy + 1, 30), (fx - 100, fy + 1, 14), (fx - 112, fy + 1, 14), (POSICOES["esqueleto"][0] + 4, fy + 6, 26), (fx - 21, fy + 2, 8)]
    for (ox, oy, larg) in alvos:
        if nome == "noite":
            vx, vy = ox - fx, oy - fy
            n = math.hypot(vx, vy) or 1
            dx, dy = vx / n * 14, vy / n * 3 + 2
        else:
            dx, dy = (14, 4) if nome == "manha" else (-20, 4)
        for y in range(-2, 3):
            for x in range(-larg // 2, larg // 2 + 1):
                for t in range(0, 12):
                    sombras.p(int(ox + x + dx * t / 12), int(oy + y + dy * t / 12), "#0a0a14", 0.05)

    img = ceu.copy()
    solido = np.zeros(img.shape[:2], dtype=np.float32)
    for f in fileiras[:-1]:
        img = sobre(img, f)
        solido = np.maximum(solido, f[:, :, 3])
    img = sobre(img, chao)
    solido = np.maximum(solido, chao[:, :, 3])
    img = sobre(img, desfocar_rgba(ampliar(sombras.c), 4))
    img = sobre(img, camp)
    dossel = fileiras[-1]
    img = sobre(img, dossel)
    solido = np.maximum(solido, dossel[:, :, 3])
    sol_ = solido[:, :, None]

    # Luz salpicada das folhas no chão (dia e tarde): manchas de sol e de sombra.
    ys, xs = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)
    if nome != "noite":
        manchas = ampliar(ruido(61, 9)[:, :, None])[:, :, 0]
        manchas = desfocar(manchas[:, :, None], 3)[:, :, 0]
        chao_m = (ys > 92 * ESC).astype(np.float32)
        salpico = np.where(manchas > 0.6, 1.12, np.where(manchas < 0.4, 0.82, 1.0))
        img = img * (1 + (salpico[:, :, None] - 1) * chao_m[:, :, None] * 0.9)

    # Luz: ambiente da hora (multiplica) + sol na clareira, fogueira e lanterna (somam), só no que não é céu.
    amb = hexa(per["ambiente"]) * per["amb_k"]
    poça_sol = luz_pontual(fx - 20, fy - 6, 120, 0.45)[:, :, None] * hexa(per["grade_quente"]) * (0.18 if nome == "manha" else 0.16 if nome == "tarde" else 0)
    fogo = luz_pontual(fx, fy - 6, 110, 0.5)[:, :, None] * hexa("#ffa850") * per["fogo_k"] * 1.5
    fogo += luz_pontual(fx, fy - 4, 34, 0.7)[:, :, None] * hexa("#ffe0a0") * per["fogo_k"] * 0.9
    lanterna = luz_pontual(fx - 21, fy - 10, 30, 0.8)[:, :, None] * hexa("#ffd890") * per["fogo_k"] * 0.8
    castelo_luz = luz_pontual(318, 56, 16)[:, :, None] * hexa("#ffd27a") * (0.6 if nome == "noite" else 0)
    luz = amb + poça_sol + fogo + lanterna + castelo_luz
    img = img * (1 - sol_) + img * sol_ * luz

    # Feixes de sol entrando pelas aberturas do dossel.
    if per["raios"] > 0:
        visivel = (1 - solido) * (ys < 110 * ESC)
        sol_pos = (90, -70) if nome == "manha" else (420, -40)
        raios = raios_de_luz(visivel.astype(np.float32), sol_pos)
        raios = desfocar(raios[:, :, None], 8)[:, :, 0]
        img += raios[:, :, None] * hexa(per["grade_quente"]) * per["raios"] * 1.6

    # Fachos de luz volumétricos descendo pelas aberturas do dossel até a clareira (dia e tarde), com poeira no ar.
    if nome != "noite":
        poeira = ampliar(ruido(81, 3)[:, :, None])[:, :, 0]
        fachos = np.zeros(img.shape[:2], dtype=np.float32)
        lista = ((96, 150, 15, 0.55), (128, 196, 10, 0.4), (330, 262, 13, 0.45), (392, 330, 8, 0.3)) if nome == "manha" else \
                ((300, 236, 14, 0.55), (360, 300, 10, 0.4), (130, 84, 9, 0.3))
        for (x_topo, x_chao, larg, forca) in lista:
            t = ys / (H * ESC)
            centro = (x_topo + (x_chao - x_topo) * t) * ESC
            dist = np.abs(xs - centro) / (larg * ESC * (0.7 + t * 0.6))
            fachos += np.exp(-dist ** 2 * 2) * forca * np.clip(1.1 - t * 0.9, 0, 1)
        fachos = desfocar(fachos[:, :, None], 10)[:, :, 0] * (0.75 + 0.5 * poeira)
        img = img + fachos[:, :, None] * hexa(per["grade_quente"]) * (0.9 if nome == "manha" else 1.0)

    escurecer = 0.5 if nome == "noite" else 0.75
    img = sobre(img, frente * np.array([escurecer, escurecer, escurecer, 1], dtype=np.float32))

    # Brilho (bloom) só das luzes fortes.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * (lum > 0.9), 0, 1)
    img += desfocar(claro, 16) * 0.35

    # Correção de cor (sombras frias, luzes quentes), contraste e vinheta forte de diorama.
    quente, fria = hexa(per["grade_quente"]), hexa(per["grade_fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.8 + 0.2 * (lum * quente + (1 - lum) * (fria * 0.5 + 0.5)))
    img = np.clip((img - 0.5) * 1.08 + 0.5, 0, 1.2)
    v = ((xs / (W * ESC) - 0.5) ** 2 * 1.4 + (ys / (H * ESC) - 0.58) ** 2 * 1.9)
    img *= (1 - np.clip(v - 0.06, 0, 1) * 1.1)[:, :, None]
    g = np.random.default_rng(99)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.022
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    for nome in PERIODOS:
        img = montar(nome)
        img.save(PASTA / f"cena-{nome}.webp", quality=82, method=6)
        img.resize((960, 400), Image.LANCZOS).save(PASTA / f"cena-{nome}-960.webp", quality=80, method=6)
        print(nome, (PASTA / f"cena-{nome}.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
