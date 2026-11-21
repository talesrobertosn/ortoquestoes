"""Cenários HD-2D do post Jornal do tálus vertical (03/11/2026).

Arte original feita por código, com os pincéis e a montagem com luz de scripts/gerar_cena_vila.py (a mesma técnica dos
cenários do site): pixel art pequena, camada por camada, ampliada 3x com luz calculada por pixel. Nada baixado, nada de
IA de imagem, nenhum mascote e nenhum desenho de anatomia: a radiografia real da questão entra por cima, no HTML,
dentro do negatoscópio (feed) e no quadro da banca (stories). Nenhum texto é pintado.

- feed:    a sala de laudos do plantão à noite (360 x 450 -> 1080 x 1350): negatoscópio aceso na parede, janela com
           chuva, jaleco no cabide, relógio, mesa de nogueira com jornais, café, lupa e a luminária de banqueiro verde.
- stories: a banca de jornal da esquina numa noite de chuva (360 x 640 -> 1080 x 1920): prédios com janelas acesas,
           poste de ferro, toldo listrado, revistas nas grades, o quadro central (onde o HTML prende a edição extra),
           balcão, calçada de pedra molhada com reflexo.

Uso: <python com numpy e pillow> pintar_cenas.py [feed|stories]
Saída na pasta do post: cena-feed.webp, cena-stories.webp e as variantes desfocadas (-fundo) para os slides internos.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(RAIZ / "scripts"))
import gerar_cena_vila as v  # noqa: E402

PASTA = Path(__file__).resolve().parent
ESC = 3


def configurar(w: int, h: int) -> None:
    """Os pincéis da vila usam o tamanho do módulo; cada cena muda o tamanho antes de pintar."""
    v.W, v.H = w, h
    v._YS, v._XS = np.mgrid[0:h, 0:w].astype(np.float32)
    v._GYS, v._GXS = np.mgrid[0:h * ESC, 0:w * ESC].astype(np.float32)
    v.ruido.__defaults__ = (None, w, h)


Camada, Montagem, hexa, mistura, hash01 = v.Camada, v.Montagem, v.hexa, v.mistura, v.hash01


def ruido(seed, ex, ey=None):
    return v.ruido(seed, ex, ey, v.W, v.H)


def elipse_m(*a):
    return v.elipse_m(*a)


def poligono_m(pts):
    return v.poligono_m(pts)


def textura(c: Camada, x0, y0, x1, y1, escuro, claro, seed, grao=3, base=0.45, amp=0.5, veio=None):
    """Preenche um retângulo com ruído entre dois tons; `veio` desenha o veio da madeira na horizontal."""
    n = ruido(seed, grao, max(1, grao // 2))
    for y in range(max(0, int(y0)), min(v.H, int(y1))):
        for x in range(max(0, int(x0)), min(v.W, int(x1))):
            k = base + (n[y, x] - 0.5) * amp + (hash01(x, y, seed) - 0.5) * 0.08
            if veio:
                k += math.sin(y * 0.9 + math.sin(x * 0.05 + seed) * 3) * veio
            c.p(x, y, mistura(escuro, claro, min(1, max(0, k))))


def chuva(e: Camada, seed: int, densidade: int, x0=0, x1=None, y0=0, y1=None, cor="#a8c4e8", a=0.35):
    """Riscos finos de chuva em diagonal (emissivo fraco, pega a luz da rua)."""
    x1 = v.W if x1 is None else x1
    y1 = v.H if y1 is None else y1
    g = np.random.default_rng(seed)
    for _ in range(densidade):
        x, y = x0 + g.random() * (x1 - x0), y0 + g.random() * (y1 - y0)
        comp = 4 + int(g.random() * 6)
        for k in range(comp):
            e.p(x - k * 0.35, y + k, cor, a * (1 - k / comp) * (0.5 + g.random() * 0.5))


# ═══════════════════════════════════ FEED: a sala de laudos ═══════════════════════════════════
FW, FH = 360, 450
NEG = (48, 78, 312, 208)          # negatoscópio: caixa externa
PAINEL = (54, 86, 306, 202)       # vidro aceso (o HTML põe a radiografia aqui, em 3x)
JAN = (8, 34, 40, 196)            # janela estreita à esquerda
MESA_Y = 300                       # tampo da mesa
LAMP = (300, 262)                  # boca da luminária


def feed_fora() -> tuple[Camada, Camada]:
    """O que se vê pela janela: noite de chuva, prédios com janelas acesas e uma torre de caixa-d'água."""
    c, e = Camada(), Camada()
    x0, y0, x1, y1 = JAN
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0)
        c.ret(x0, y, x1 - x0, 1, mistura("#0e1a30", "#2a3a5a", t))
    g = np.random.default_rng(3)
    x = x0 - 2
    while x < x1 + 2:
        w = 8 + int(g.random() * 9)
        topo = 92 + int(g.random() * 50)
        c.ret(x, topo, w, y1 - topo, mistura("#1c2640", "#2a3656", g.random()))
        c.ret(x, topo, w, 1, "#4a5a84")
        for wy in range(topo + 4, y1 - 2, 5):
            for wx in range(x + 2, x + w - 2, 4):
                if g.random() < 0.32:
                    e.ret(wx, wy, 2, 2, mistura("#ffb860", "#ffe2a0", g.random()), 0.85)
        x += w + 1
    chuva(e, 4, 70, x0, x1, y0, y1, a=0.5)
    return c, e


def feed_parede() -> Camada:
    c = Camada()
    # reboco verde-noite com manchas suaves
    textura(c, 0, 14, FW, 232, "#1c3a3a", "#3a605a", 11, grao=7, base=0.42, amp=0.6)
    # rachaduras finas e manchas de umidade
    g = np.random.default_rng(12)
    for _ in range(5):
        x, y = g.random() * FW, 20 + g.random() * 190
        for k in range(14):
            x += g.random() * 2 - 1
            y += 1
            c.p(x, y, "#0b1618", 0.5)
    # teto: vigas
    c.ret(0, 0, FW, 14, "#140c08")
    for x in range(4, FW, 34):
        c.ret(x, 0, 9, 16, "#2a1a10"); c.ret(x, 0, 1, 16, "#4a2e1c"); c.ret(x + 8, 2, 1, 14, "#0e0805")
    c.ret(0, 13, FW, 2, "#0a0604")
    # lambril de madeira e o friso
    textura(c, 0, 232, FW, MESA_Y, "#3a2214", "#6a4224", 14, grao=2, base=0.4, amp=0.4, veio=0.08)
    for x in range(0, FW, 18):
        c.ret(x, 236, 1, MESA_Y - 236, "#140a06"); c.ret(x + 1, 236, 1, MESA_Y - 236, "#5a3822", 0.5)
    c.ret(0, 228, FW, 4, "#3a2214"); c.ret(0, 228, FW, 1, "#8a5a36"); c.ret(0, 232, FW, 1, "#120a06")
    # a janela: vão fundo, caixilho, peitoril
    x0, y0, x1, y1 = JAN
    c.ret(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6, "#0a1214")
    c.ret(x0 - 3, y0 - 3, x1 - x0 + 6, 1, "#5a7a76")
    c.c[y0:y1, x0:x1, 3] = 0                                         # o vidro fica vazado: aparece a cidade
    return c


def feed_caixilho(c: Camada, e: Camada) -> None:
    x0, y0, x1, y1 = JAN
    cx = (x0 + x1) // 2
    c.ret(cx - 1, y0, 2, y1 - y0, "#1a1210")
    for yy in range(y0 + 40, y1, 40):
        c.ret(x0, yy, x1 - x0, 2, "#1a1210")
    # gotas escorrendo no vidro
    g = np.random.default_rng(21)
    for _ in range(22):
        x, y = x0 + 1 + g.random() * (x1 - x0 - 2), y0 + g.random() * (y1 - y0)
        e.p(x, y, "#cfe2ff", 0.55)
        for k in range(1, int(2 + g.random() * 5)):
            e.p(x, y + k, "#9ab8e0", 0.25)
    c.ret(x0 - 5, y1, x1 - x0 + 10, 4, "#2a3a3a"); c.ret(x0 - 5, y1, x1 - x0 + 10, 1, "#5a7a76")
    c.ret(x0 - 5, y1 + 4, x1 - x0 + 10, 1, "#060a0a")


def feed_negatoscopio(c: Camada, e: Camada) -> np.ndarray:
    """Caixa de metal esmaltado, dois vidros leitosos separados pelo montante, presilhas, interruptor e o cabo."""
    x0, y0, x1, y1 = NEG
    c.ret(x0 + 3, y0 + 4, x1 - x0, y1 - y0, "#000000", 0.45)               # sombra na parede
    c.ret(x0, y0, x1 - x0, y1 - y0, "#3c4448")
    c.ret(x0, y0, x1 - x0, 2, "#a8b2b8"); c.ret(x0, y0 + 2, x1 - x0, 1, "#6a767c")
    c.ret(x0, y0, 2, y1 - y0, "#7a868c"); c.ret(x1 - 2, y0, 2, y1 - y0, "#262c30")
    c.ret(x0, y1 - 2, x1 - x0, 2, "#1a1e22")
    # parafusos nos cantos
    for (px, py) in ((x0 + 3, y0 + 4), (x1 - 4, y0 + 4), (x0 + 3, y1 - 5), (x1 - 4, y1 - 5)):
        c.p(px, py, "#c8d0d4"); c.p(px + 1, py + 1, "#202428")
    px0, py0, px1, py1 = PAINEL
    c.ret(px0 - 1, py0 - 1, px1 - px0 + 2, py1 - py0 + 2, "#14181a")
    # vidro aceso: leitoso, mais forte no meio, com as faixas dos tubos fluorescentes
    m = np.zeros((v.H, v.W), np.float32)
    m[py0:py1, px0:px1] = 1
    cor = np.zeros((v.H, v.W, 3), np.float32)
    for y in range(py0, py1):
        for x in range(px0, px1):
            t = 1 - abs((y - (py0 + py1) / 2) / ((py1 - py0) / 2)) ** 2 * 0.25
            tubo = 0.05 * math.cos((x - px0) / (px1 - px0) * math.pi * 6)
            cor[y, x] = mistura("#a8cdf0", "#f2f9ff", min(1, 0.7 * t + tubo + 0.15))
    e.mascara(m, cor)
    mid = (px0 + px1) // 2
    c.ret(mid - 1, py0, 3, py1 - py0, "#2a3034"); c.ret(mid - 1, py0, 1, py1 - py0, "#7a868c")
    # presilhas no alto de cada vidro
    for cx in (px0 + (mid - px0) // 2, mid + (px1 - mid) // 2):
        c.ret(cx - 5, py0 - 3, 10, 4, "#8a949a"); c.ret(cx - 5, py0 - 3, 10, 1, "#d8e0e4"); c.ret(cx - 5, py0, 10, 1, "#2a3034")
    # interruptor com a luz vermelha e o cabo descendo até a tomada
    c.ret(x1 - 22, y1 - 1, 14, 5, "#2a3034"); e.ret(x1 - 12, y1 + 1, 2, 2, "#ff4a3a")
    for y in range(y1 + 4, 226):
        c.p(x1 - 18 + math.sin(y * 0.18) * 1.5, y, "#101214")
    c.ret(x1 - 22, 224, 8, 6, "#d8d2c4"); c.ret(x1 - 21, 226, 2, 2, "#2a2a2a"); c.ret(x1 - 17, 226, 2, 2, "#2a2a2a")
    return m


def feed_parede_direita(c: Camada, e: Camada) -> None:
    """Relógio de parede e o jaleco pendurado no cabide (pano com dobras, sem texto)."""
    # relógio
    cx, cy, r = 337, 46, 13
    c.elipse(cx + 1, cy + 2, r + 1, r + 1, "#000000", 0.4)
    c.disco(cx, cy, r + 1.5, ("#8a6a3a", "#5a4224", "#3a2a16"))
    c.disco(cx, cy, r - 0.5, ("#f4ecd8", "#e2d6bc", "#c8b896"), granulado=0.2)
    for k in range(12):
        a = k / 12 * math.tau
        c.p(cx + math.sin(a) * (r - 3), cy - math.cos(a) * (r - 3), "#3a2a1a")
    c.linha(cx, cy, cx + 6, cy + 3, "#1a1410")                  # 3h14, como no Plantão
    c.linha(cx, cy, cx - 1, cy - 8, "#1a1410")
    c.p(cx, cy, "#b3261e")
    # cabide e jaleco
    c.ret(318, 92, 34, 3, "#3a2416"); c.ret(318, 92, 34, 1, "#8a5a36")
    c.ret(334, 94, 2, 6, "#c8a050")
    corpo = [(322, 104), (348, 104), (354, 226), (342, 230), (334, 222), (326, 230), (316, 226)]
    c.poligono(corpo, "#c8ccc8")
    c.poligono([(326, 100), (344, 100), (348, 106), (322, 106)], "#dfe2dc")
    # dobras e sombra (luz vem da esquerda, do negatoscópio)
    for x in range(316, 356):
        for y in range(100, 232):
            if c.c[y, x, 3] > 0.5:
                k = (x - 316) / 40
                dobra = 0.5 + 0.5 * math.sin(x * 0.9 + y * 0.04)
                c.p(x, y, mistura("#eef2ee", "#7a807e", min(1, k * 0.8 + dobra * 0.25)))
    c.linha(335, 106, 333, 222, "#8a908c")                      # abertura da frente
    c.linha(328, 106, 334, 128, "#f8faf6"); c.linha(342, 106, 336, 128, "#a0a6a2")  # lapelas
    c.ret(340, 140, 8, 9, "#b0b6b2"); c.ret(340, 140, 8, 1, "#e6eae6")              # bolso
    c.linha(343, 136, 343, 143, "#2a5a9a"); c.p(343, 135, "#c8c8c8")                 # caneta no bolso
    # estetoscópio no ombro (tubo escuro e o diafragma prateado)
    for t in np.linspace(0, 1, 40):
        x = 326 + t * 22
        y = 108 + math.sin(t * math.pi) * 30
        c.p(x, y, "#1a1c22"); c.p(x, y + 1, "#2e323a")
    c.disco(347, 140, 3.2, ("#e8eef2", "#a8b0b6", "#5a6268"))


def feed_mesa(c: Camada) -> None:
    # tampo em perspectiva leve e a frente
    textura(c, 0, MESA_Y, FW, MESA_Y + 22, "#5a3418", "#9a6232", 31, grao=2, base=0.5, amp=0.5, veio=0.12)
    c.ret(0, MESA_Y, FW, 1, "#a8743e")
    c.ret(0, MESA_Y + 22, FW, 3, "#9a6634"); c.ret(0, MESA_Y + 22, FW, 1, "#d09a58")
    textura(c, 0, MESA_Y + 25, FW, FH, "#2a160a", "#5a3418", 33, grao=2, base=0.4, amp=0.45, veio=0.1)
    # gavetas com puxador de latão
    for (gx0, gx1) in ((14, 168), (192, 346)):
        c.ret(gx0, MESA_Y + 40, gx1 - gx0, 70, "#000000", 0.25)
        c.ret(gx0, MESA_Y + 40, gx1 - gx0, 1, "#5a3a22"); c.ret(gx0, MESA_Y + 109, gx1 - gx0, 1, "#0a0503")
        mx = (gx0 + gx1) // 2
        c.ret(mx - 10, MESA_Y + 70, 20, 4, "#8a6a2a"); c.ret(mx - 10, MESA_Y + 70, 20, 1, "#f4cf7c")
        c.ret(mx - 12, MESA_Y + 68, 3, 8, "#6a4a1a"); c.ret(mx + 9, MESA_Y + 68, 3, 8, "#6a4a1a")
    c.ret(0, FH - 12, FW, 12, "#0a0503")


def feed_objetos(c: Camada, e: Camada, luzes: list) -> None:
    y = MESA_Y + 8                                                  # onde as coisas pousam
    # pilha de jornais (sem texto: faixas e colunas cinzentas)
    for k, (dx, cor) in enumerate(((0, "#cfc6b0"), (3, "#ddd4be"), (-2, "#e8e0cc"), (2, "#f2ecdc"))):
        yy = y - k * 2
        c.ret(12 + dx, yy - 4, 92, 5, cor); c.ret(12 + dx, yy, 92, 1, "#8a8270")
    top = y - 10
    c.poligono([(10, top + 4), (104, top + 2), (110, top - 22), (18, top - 20)], "#f4eedd")
    c.linha(18, top - 20, 110, top - 22, "#ffffff")
    c.ret(24, top - 18, 72, 4, "#1b1a17", 0.85)                    # a faixa do título (sem letras)
    for col in range(4):
        for ln in range(5):
            c.ret(24 + col * 19, top - 11 + ln * 3, 15 - (ln * 3 + col) % 5, 1, "#8a8478")
    c.ret(84, top - 11, 14, 9, "#3a3a3a")                         # foto da página
    # caneca de café com vapor
    cx = 128
    c.ret(cx, y - 18, 16, 18, "#1e4f4a"); c.ret(cx, y - 18, 3, 18, "#3a7a72"); c.ret(cx + 13, y - 18, 3, 18, "#0e2a28")
    c.ret(cx, y - 18, 16, 2, "#4a8a82"); c.ret(cx + 1, y - 17, 14, 1, "#2a1408")
    c.ret(cx + 16, y - 14, 4, 2, "#1e4f4a"); c.ret(cx + 18, y - 14, 2, 9, "#1e4f4a"); c.ret(cx + 16, y - 7, 4, 2, "#1e4f4a")
    c.ret(cx + 4, y - 11, 8, 3, "#f4cf7c", 0.9)                    # faixa dourada da caneca
    for k in range(18):
        e.p(cx + 7 + math.sin(k * 0.7) * 2.5, y - 20 - k, "#ffffff", 0.18 * (1 - k / 18))
        e.p(cx + 10 + math.sin(k * 0.6 + 2) * 2, y - 22 - k, "#ffffff", 0.12 * (1 - k / 18))
    # lupa de latão pousada
    lx, ly = 176, y - 3
    c.elipse(lx + 2, ly + 2, 13, 4, "#000000", 0.35)
    c.elipse(lx, ly, 12, 4.5, "#c89a40"); c.elipse(lx, ly, 10, 3.4, "#9ab8c8"); c.elipse(lx - 3, ly - 1, 3, 1, "#ffffff", 0.8)
    c.linha(lx + 11, ly + 1, lx + 30, ly + 5, "#5a2a14", grossura=2); c.linha(lx + 11, ly, lx + 29, ly + 4, "#8a4a24")
    # lápis e um bloco de laudo
    c.poligono([(206, y - 2), (244, y - 4), (246, y + 2), (208, y + 4)], "#efe8d6")
    for ln in range(3):
        c.linha(212, y - 1 + ln * 1.6, 236, y - 2 + ln * 1.6, "#9a9a9a")
    c.linha(214, y + 6, 238, y + 3, "#e0a33a", grossura=2); c.p(239, y + 3, "#2a2a2a")


def feed_luminaria(c: Camada, e: Camada, luzes: list) -> None:
    """Luminária de banqueiro: base de latão, haste, cúpula de vidro verde e a boca acesa."""
    y = MESA_Y + 8
    bx = LAMP[0]
    c.elipse(bx + 2, y + 1, 26, 5, "#000000", 0.4)
    c.elipse(bx, y - 1, 22, 5, "#8a6420"); c.elipse(bx, y - 2, 21, 4, "#d6a84a"); c.elipse(bx - 6, y - 3, 7, 1.4, "#fff0b8")
    c.ret(bx - 2, 262, 4, y - 264, "#b88a34"); c.ret(bx - 2, 262, 1, y - 264, "#ffe7a0")
    c.ret(bx + 8, y - 12, 2, 10, "#b88a34"); c.disco(bx + 9, y - 13, 1.6, ("#ffe7a0", "#b88a34", "#6a4a14"))  # puxador
    sh = [(bx - 34, 262), (bx - 28, 247), (bx + 28, 247), (bx + 34, 262)]
    c.poligono(sh, "#0e5a40")
    m = poligono_m(sh)
    ys, xs = np.nonzero(m)
    for yy, xx in zip(ys, xs):
        k = (xx - (bx - 34)) / 68
        brilho = 0.18 if abs(k - 0.32) < 0.05 else 0
        c.p(xx, yy, mistura("#2fa070", "#0a3a28", min(1, max(0, k * 0.9 - brilho * 3 + (yy - 247) / 30))))
    c.ret(bx - 34, 261, 69, 2, "#c89a40"); c.ret(bx - 28, 246, 57, 2, "#e0b85a")
    e.ret(bx - 31, 263, 63, 1, "#fff2c8")                           # boca acesa
    e.ret(bx - 26, 264, 53, 1, "#ffd890", 0.7)
    luzes.append((bx, 280, 110, 0.6, "#ffb35a", 1.5))
    luzes.append((bx, 306, 50, 0.3, "#ffcf80", 0.9))


def feed_poeira(e: Camada) -> None:
    g = np.random.default_rng(41)
    px0, py0, px1, py1 = PAINEL
    for _ in range(90):
        x, y = px0 - 30 + g.random() * (px1 - px0 + 60), py1 + g.random() * 90
        e.p(x, y, "#dceeff", 0.15 + g.random() * 0.35)


def cena_feed() -> Image.Image:
    configurar(FW, FH)
    luzes: list = []
    fora, fora_e = feed_fora()
    par = feed_parede()
    cx, cx_e = Camada(), Camada()
    feed_caixilho(cx, cx_e)
    neg, neg_e = Camada(), Camada()
    painel_m = feed_negatoscopio(neg, neg_e)
    dir_, dir_e = Camada(), Camada()
    feed_parede_direita(dir_, dir_e)
    mesa = Camada()
    feed_mesa(mesa)
    obj, obj_e = Camada(), Camada()
    feed_objetos(obj, obj_e, luzes)
    lum, lum_e = Camada(), Camada()
    feed_luminaria(lum, lum_e, luzes)
    po = Camada()
    feed_poeira(po)

    ceu = np.zeros((FH, FW, 3), np.float32)
    m = Montagem(ceu)
    m.camada(fora, desfoque=1.2, luz_k=2.2)
    m.emissivo(fora_e, desfoque=0.8, halo=0.5)
    m.camada(par)
    m.camada(cx, luz_k=0.6)
    m.emissivo(cx_e, halo=0.2)
    m.camada(neg)
    m.camada(dir_, desfoque=0.6)
    m.camada(mesa)
    m.camada(obj, desfoque=0.4, luz_k=0.75)
    m.camada(lum, luz_k=0.3)
    px0, py0, px1, py1 = PAINEL
    pcx, pcy = (px0 + px1) / 2, (py0 + py1) / 2
    luzes_todas = luzes + [
        (pcx, pcy + 20, 170, 0.85, "#8fc0ff", 1.25),            # o vidro aceso banha a sala de azul
        (pcx, py1 + 40, 120, 0.45, "#a8d0ff", 0.55),
        (JAN[0] + 16, 120, 40, 2.2, "#4a6aa8", 0.35),            # a cidade pela janela
    ]
    m.iluminar("#4a5a6a", luzes_todas)
    m.emissivo(neg_e, halo=0.75)
    m.emissivo(dir_e)
    m.emissivo(obj_e, desfoque=0.6, halo=0.4)
    m.emissivo(lum_e, desfoque=0.4, halo=1.0)
    # feixe frio que desce do negatoscópio, com a poeira suspensa
    feixe = np.zeros((FH * ESC, FW * ESC), np.float32)
    feixe[py1 * ESC:(py1 + 3) * ESC, px0 * ESC:px1 * ESC] = 1
    raios = v.raios_radiais(feixe, (pcx, pcy - 140), passos=48, alcance=-0.55, queda=0.97)
    m.somar(v.desfocar(raios[:, :, None], 6)[:, :, 0], "#9cc8ff", 0.55)
    m.emissivo(po, desfoque=0.5, halo=0.3)
    return m.acabar("#ffd9a8", "#2a4a7a", esquerda=0.0, vinheta=0.75, centro_v=(0.5, 0.42), contraste=1.1, bloom=0.9)


# ═══════════════════════════════════ STORIES: a banca de jornal ═══════════════════════════════════
SW, SH = 360, 640
CHAO = 566                          # linha da calçada
BANCA = (12, 348, 228)              # x0, x1, topo da placa
QUADRO = (66, 286, 294, 486)        # quadro central (o HTML prende a edição aqui)
POSTE = 350


def st_ceu() -> np.ndarray:
    return _grad([(0, "#05080f"), (160, "#0c1424"), (300, "#1c2644"), (400, "#34304e"), (SH, "#181828")])


def _grad(paradas) -> np.ndarray:
    ys = np.array([p[0] for p in paradas], np.float32)
    cs = np.array([hexa(p[1]) for p in paradas])
    linha = np.stack([np.interp(np.arange(SH), ys, cs[:, i]) for i in range(3)], 1).astype(np.float32)
    return np.repeat(linha[:, None, :], SW, 1)


def st_nuvens(e: Camada) -> None:
    n = ruido(51, 26, 8)
    for y in range(0, 260):
        for x in range(SW):
            k = n[y, x] - 0.52
            if k > 0:
                e.p(x, y, "#4a4a6a", min(0.5, k * 1.6) * (1 - y / 300))


def st_predios(seed: int, base: int, alt: tuple, tons, janela_a: float) -> tuple[Camada, Camada]:
    c, e = Camada(), Camada()
    g = np.random.default_rng(seed)
    x = -6
    while x < SW + 6:
        w = 22 + int(g.random() * 30)
        topo = base - alt[0] - int(g.random() * (alt[1] - alt[0]))
        cor = mistura(tons[0], tons[1], g.random())
        c.ret(x, topo, w, CHAO - topo, cor)
        c.ret(x, topo, w, 1, tons[2])
        if g.random() < 0.35:                                     # caixa-d'água ou antena
            c.ret(x + w // 3, topo - 8, 8, 8, cor); c.ret(x + w // 3 - 1, topo - 9, 10, 1, tons[2])
        if g.random() < 0.3:
            c.ret(x + w - 6, topo - 16, 1, 16, tons[2])
            e.p(x + w - 6, topo - 17, "#ff3a2a", 0.9)
        for wy in range(topo + 5, CHAO - 6, 7):
            for wx in range(x + 3, x + w - 3, 5):
                r = g.random()
                if r < 0.28 * janela_a + 0.05:
                    e.ret(wx, wy, 3, 3, mistura("#ff9a40", "#ffe4a8", g.random()), 0.55 + 0.4 * janela_a)
                elif r < 0.4:
                    e.ret(wx, wy, 3, 3, "#6a8ac8", 0.25)
                else:
                    c.ret(wx, wy, 3, 3, tons[2], 0.35)
        x += w + int(g.random() * 3)
    return c, e


def st_banca(c: Camada, e: Camada, luzes: list) -> np.ndarray:
    x0, x1, topo = BANCA
    # placa no alto (o HTML escreve o nome)
    c.ret(x0 + 18, topo, x1 - x0 - 36, 30, "#0c3a30")
    c.ret(x0 + 18, topo, x1 - x0 - 36, 2, "#f4cf7c"); c.ret(x0 + 18, topo + 28, x1 - x0 - 36, 2, "#b88a34")
    c.ret(x0 + 18, topo, 2, 30, "#f4cf7c"); c.ret(x1 - 20, topo, 2, 30, "#b88a34")
    for (px, py) in ((x0 + 22, topo + 4), (x1 - 24, topo + 4), (x0 + 22, topo + 24), (x1 - 24, topo + 24)):
        c.p(px, py, "#ffe7a0")
    # lâmpadas em cima da placa
    for k in range(9):
        lx = x0 + 34 + k * ((x1 - x0 - 68) / 8)
        c.ret(lx - 1, topo - 4, 3, 4, "#2a2a2a")
        e.disco(lx, topo - 6, 1.8, ("#fff4d0", "#ffd080", "#e09a40"))
        luzes.append((lx, topo - 6, 26, 1.0, "#ffbe6a", 0.28))
    # toldo listrado verde e creme, com a borda em ondas
    ty0, ty1 = topo + 30, topo + 58
    tol = poligono_m([(x0 - 4, ty1), (x0 + 10, ty0), (x1 - 10, ty0), (x1 + 4, ty1)])
    ys, xs = np.nonzero(tol)
    for yy, xx in zip(ys, xs):
        listra = int((xx - x0 + (yy - ty0) * 0.18 * (1 if xx > (x0 + x1) / 2 else -1)) // 16) % 2
        k = (yy - ty0) / (ty1 - ty0)
        cor = mistura("#e8dcc0", "#a89878", k * 0.6) if listra else mistura("#1f7a5e", "#0c3a2c", k * 0.7)
        c.p(xx, yy, cor)
    for k in range(int((x1 - x0 + 8) / 16) + 1):
        cx = x0 - 4 + k * 16 + 8
        cor = "#1f7a5e" if k % 2 == 0 else "#e8dcc0"
        c.elipse(cx, ty1, 8, 5, cor)
        c.elipse(cx, ty1 + 2, 8, 3, "#0a2a20" if k % 2 == 0 else "#8a7c62", 0.5)
    c.ret(x0 - 4, ty0 - 1, x1 - x0 + 8, 2, "#f4cf7c", 0.8)
    # gotas pingando do toldo
    g = np.random.default_rng(71)
    for _ in range(14):
        gx = x0 + g.random() * (x1 - x0)
        gy = ty1 + 6 + g.random() * 50
        e.ret(gx, gy, 1, 2, "#cfe2ff", 0.6)
    # interior aceso: fundo quente
    iy0, iy1 = ty1 + 4, 500
    for y in range(iy0, iy1):
        t = (y - iy0) / (iy1 - iy0)
        c.ret(x0 + 4, y, x1 - x0 - 8, 1, mistura("#3a2414", "#1a0e08", t))
    # colunas de metal verde
    for px in (x0, x1 - 6):
        c.ret(px, ty1, 6, CHAO - ty1, "#0e3a2e"); c.ret(px, ty1, 1, CHAO - ty1, "#3a8a6e"); c.ret(px + 5, ty1, 1, CHAO - ty1, "#061a14")
    # grades de revistas dos dois lados (capas coloridas sem texto)
    cores = ["#c8302a", "#2a6ab8", "#e0a33a", "#2fa59a", "#8a4ab8", "#e8e0cc", "#d0507a", "#3a8a4a", "#1b1a17", "#f4cf7c"]
    for (gx0, gx1) in ((x0 + 8, QUADRO[0] - 6), (QUADRO[2] + 6, x1 - 8)):
        for ry in range(QUADRO[1] + 2, 486, 34):
            c.ret(gx0, ry + 30, gx1 - gx0, 2, "#8a949a"); c.ret(gx0, ry + 30, gx1 - gx0, 1, "#d0d8dc")
            xx = gx0 + 1
            while xx < gx1 - 10:
                w = 13 + int(g.random() * 4)
                cor = cores[int(g.random() * len(cores))]
                inc = int(g.random() * 3) - 1
                c.ret(xx + inc, ry + 4, w, 26, cor)
                c.ret(xx + inc, ry + 4, w, 1, "#ffffff", 0.35)
                c.ret(xx + inc + 2, ry + 7, w - 4, 3, "#ffffff" if cor in ("#1b1a17", "#2a6ab8", "#8a4ab8", "#c8302a") else "#1b1a17", 0.8)
                if g.random() < 0.6:
                    c.ret(xx + inc + 2, ry + 13, w - 4, 9, mistura(cor, "#ffffff", 0.35))
                for ln in range(2):
                    c.ret(xx + inc + 2, ry + 24 + ln * 2, w - 6 - ln * 3, 1, "#000000", 0.35)
                xx += w + 2
    # quadro central de cortiça com os prendedores
    qx0, qy0, qx1, qy1 = QUADRO
    c.ret(qx0 - 3, qy0 - 3, qx1 - qx0 + 6, qy1 - qy0 + 6, "#2a1a0e")
    c.ret(qx0 - 3, qy0 - 3, qx1 - qx0 + 6, 1, "#8a5a32")
    textura(c, qx0, qy0, qx1, qy1, "#5a3a1e", "#8a6036", 77, grao=2, base=0.45, amp=0.6)
    c.ret(qx0, qy0 + 8, qx1 - qx0, 1, "#3a2410")                   # o varal
    # balcão com jornais dobrados
    by = 500
    textura(c, x0 + 2, by, x1 - 2, by + 12, "#3a2010", "#7a4a26", 81, grao=2, base=0.5, amp=0.5, veio=0.12)
    c.ret(x0 + 2, by, x1 - x0 - 4, 1, "#d09a58")
    for k in range(7):
        jx = x0 + 18 + k * 44
        for s in range(4):
            c.ret(jx, by - 3 - s * 2, 34, 2, "#e8e0cc" if s % 2 else "#d6ccb4")
        c.ret(jx + 3, by - 10, 28, 2, "#1b1a17", 0.8)
    # corpo de baixo: painéis de metal com rebites
    c.ret(x0 + 2, by + 12, x1 - x0 - 4, CHAO - by - 12, "#0f4a3a")
    for k in range(6):
        px = x0 + 6 + k * ((x1 - x0 - 12) / 6)
        c.ret(px, by + 18, (x1 - x0 - 12) / 6 - 4, CHAO - by - 26, "#13574a")
        c.ret(px, by + 18, (x1 - x0 - 12) / 6 - 4, 1, "#3a9a7e")
        c.ret(px, CHAO - 9, (x1 - x0 - 12) / 6 - 4, 1, "#062a20")
        for (rx, ry) in ((px + 2, by + 21), (px + (x1 - x0 - 12) / 6 - 7, by + 21)):
            c.p(rx, ry, "#8ad0b8")
    c.ret(x0, CHAO - 3, x1 - x0, 3, "#06140f")
    # luzes do interior
    luzes.append(((x0 + x1) / 2, ty1 + 20, 150, 0.6, "#ffb46a", 1.1))
    luzes.append(((x0 + x1) / 2, 420, 140, 0.9, "#ffa860", 0.55))
    e.ret(x0 + 8, ty1 + 3, x1 - x0 - 16, 1, "#ffe2a8", 0.55)              # a lâmpada tubular sob o toldo
    m = np.zeros((SH, SW), np.float32)
    m[topo - 10:CHAO, x0:x1] = 1
    return m


def st_poste(c: Camada, e: Camada, luzes: list) -> None:
    x = POSTE
    c.ret(x - 3, 186, 5, CHAO - 186, "#14181c"); c.ret(x - 3, 186, 1, CHAO - 186, "#4a5258")
    c.ret(x - 6, CHAO - 14, 11, 14, "#14181c"); c.ret(x - 6, CHAO - 14, 11, 1, "#5a6268")
    c.ret(x - 5, 300, 9, 4, "#14181c")
    # braço e lanterna de ferro
    for t in np.linspace(0, 1, 30):
        c.p(x - t * 20, 186 - math.sin(t * math.pi) * 8, "#14181c")
        c.p(x - t * 20, 187 - math.sin(t * math.pi) * 8, "#14181c")
    lx, ly = x - 22, 190
    c.poligono([(lx - 7, ly), (lx + 7, ly), (lx + 4, ly - 6), (lx - 4, ly - 6)], "#14181c")
    e.poligono([(lx - 6, ly + 1), (lx + 6, ly + 1), (lx + 4, ly + 12), (lx - 4, ly + 12)], "#ffd890")
    e.ret(lx - 2, ly + 3, 4, 7, "#fff6d8")
    c.ret(lx - 5, ly + 12, 10, 2, "#14181c")
    luzes.append((lx, ly + 10, 120, 1.4, "#ffc070", 1.0))


def st_calcada(c: Camada) -> np.ndarray:
    """Pedras portuguesas molhadas, em perspectiva, com o meio-fio; devolve a máscara das poças."""
    for y in range(CHAO, SH):
        t = (y - CHAO) / (SH - CHAO)
        c.ret(0, y, SW, 1, mistura("#2a2c38", "#16181f", t))
    for y in range(CHAO, SH):
        alt = 3 + (y - CHAO) / 18
        for x in range(SW):
            fy = (y - CHAO) / alt
            fx = (x + (int(fy) % 2) * alt) / (alt * 1.4)
            borda = min(fy % 1, 1 - fy % 1) < 0.14 or min(fx % 1, 1 - fx % 1) < 0.1
            if borda:
                c.p(x, y, "#07080c", 0.8)
            else:
                k = hash01(int(fx), int(fy), 5)
                c.p(x, y, mistura("#3a3c48", "#5e5e6c", k * 0.7), 0.75)
    c.ret(0, CHAO, SW, 3, "#5a5a64"); c.ret(0, CHAO, SW, 1, "#9a9aa8")
    poca = np.zeros((SH, SW), np.float32)
    for (cx, cy, rx, ry) in ((120, 596, 90, 10), (250, 622, 70, 8), (330, 588, 40, 6), (40, 630, 46, 6)):
        poca = np.maximum(poca, elipse_m(cx, cy, rx, ry))
    n = ruido(91, 10, 3)
    poca = np.clip(poca * (0.55 + n * 0.8), 0, 1)
    pista = np.zeros((SH, SW), np.float32)
    pista[CHAO + 3:, :] = 0.35
    return np.maximum(poca, pista)


def cena_stories() -> Image.Image:
    configurar(SW, SH)
    luzes: list = []
    nuv = Camada()
    st_nuvens(nuv)
    longe, longe_e = st_predios(61, 400, (230, 330), ("#222a46", "#2c3456", "#46507a"), 0.5)
    perto, perto_e = st_predios(63, 520, (250, 360), ("#151b2c", "#1e2640", "#36405e"), 0.9)
    banca, banca_e = Camada(), Camada()
    st_banca(banca, banca_e, luzes)
    poste, poste_e = Camada(), Camada()
    st_poste(poste, poste_e, luzes)
    calc = Camada()
    poca = st_calcada(calc)
    ch, ch_frente = Camada(), Camada()
    chuva(ch, 7, 420, a=0.28)
    chuva(ch_frente, 9, 120, a=0.5, cor="#d0e2ff")

    m = Montagem(st_ceu())
    m.emissivo(nuv, desfoque=3)
    m.camada(longe, desfoque=2.2, escurecer=0.9)
    m.emissivo(longe_e, desfoque=1.4, halo=0.4)
    v.nevoa(m, 300, 470, "#2e2e4c", 0.4, 11)
    m.camada(perto, desfoque=1.1)
    m.emissivo(perto_e, desfoque=0.6, halo=0.5)
    v.nevoa(m, 470, 560, "#22223a", 0.45, 13)
    m.camada(calc)
    m.camada(banca)
    m.camada(poste, desfoque=0.5)
    m.iluminar("#5a6080", luzes)
    m.emissivo(banca_e, halo=1.1)
    m.emissivo(poste_e, halo=1.4)
    m.reflexo(CHAO, poca, forca=0.75, desfoque=2.0)
    m.emissivo(ch, desfoque=0.4)
    m.emissivo(ch_frente, desfoque=1.2, halo=0.2)
    # cone de luz do poste, com a chuva aparecendo dentro dele
    cone = v.poligono_m([(POSTE - 30, 204), (POSTE - 14, 204), (POSTE + 40, CHAO), (POSTE - 110, CHAO)])
    cone = v.desfocar(v.ampliar(cone[:, :, None]), 14)[:, :, 0]
    m.somar(cone, "#ffb870", 0.10)
    return m.acabar("#ffd6a0", "#2a3a7a", esquerda=0.0, vinheta=0.6, centro_v=(0.5, 0.55), contraste=1.08, bloom=1.0)


# ═══════════════════════════════════ Saída ═══════════════════════════════════
def salvar(img: Image.Image, nome: str) -> None:
    img.save(PASTA / f"{nome}.webp", quality=92, method=6)
    fundo = img.filter(ImageFilter.GaussianBlur(10))
    fundo.save(PASTA / f"{nome}-fundo.webp", quality=88, method=6)
    print(PASTA / f"{nome}.webp")


def main() -> None:
    pedido = sys.argv[1:] or ["feed", "stories"]
    if "feed" in pedido:
        salvar(cena_feed(), "cena-feed")
    if "stories" in pedido:
        salvar(cena_stories(), "cena-stories")


if __name__ == "__main__":
    main()
