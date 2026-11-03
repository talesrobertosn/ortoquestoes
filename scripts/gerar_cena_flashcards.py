"""O Arquivo da Vila: o cenário "HD-2D" do topo dos Flashcards (01/11/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Pintada em pixel art
(480 x 200), camada por camada, e montada em 3x com a luz calculada por pixel, com os mesmos pincéis da Torre do Tempo
(scripts/gerar_cena_cronograma.py, que por sua vez usa scripts/gerar_cena_vila.py).

O lugar: o salão do arquivo público da vila, ao lado da praça da torre do relógio. É cívico (balcão, fichários,
estantes), sem nada de religioso. Composição (pixels da arte), pensada para a interface:
- x 0-240: a parede calma, a estante escura e o janelão por onde se vê a praça e, longe, a torre do relógio
  (é onde ficam o título e a frase em HTML);
- x ~248-416: o grande fichário de madeira, com as gavetinhas de puxador de latão (plaquinhas sem texto), uma gaveta
  aberta com as fichas em pé (as abas nas cores das áreas) e a lamparina em cima;
- x ~420-476: o arco de pedra da escada que desce para a Cripta do Residente (o jogo), com a luz fria subindo;
- no primeiro plano, a borda da mesa de leitura com livros, tinteiro e pena (desfocada).
Nenhum texto ou número é pintado: tudo o que se lê fica no HTML. A geometria é a mesma nas três horas do dia.

Saída em public/pixel/flashcards/:
- arquivo-<manha|tarde|noite>.webp (1440 x 600) e -960.webp (960 x 400);
- arquivo-piso.webp: o assoalho de tábuas (ladrilho sem emenda; testado embaixo do topo e retirado em 01/11/2026);
- objetos.png: o fichário e o arco da Cripta animados dos caminhos da central.
Uso: <python com numpy e pillow> scripts/gerar_cena_flashcards.py [manha|tarde|noite|piso|objetos]
(objetos.png: o fichário e o arco da Cripta animados dos caminhos da central)
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_cena_cronograma as cr  # noqa: E402  (já ajusta a vila para 480 x 200)

v = cr.v
W, H, ESC = cr.W, cr.H, cr.ESC
_YS, _XS, _GYS, _GXS = cr._YS, cr._XS, cr._GYS, cr._GXS
Camada, Montagem, hexa, mistura, hash01, ruido = cr.Camada, cr.Montagem, cr.hexa, cr.mistura, cr.hash01, cr.ruido
elipse_m, poligono_m, desfocar, ampliar, cantaria = cr.elipse_m, cr.poligono_m, cr.desfocar, cr.ampliar, cr.cantaria
remapear, mapa_sol, raios_radiais = cr.remapear, cr.mapa_sol, cr.raios_radiais

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "flashcards"
PERIODOS = ("manha", "tarde", "noite")
P = "noite"

CHAO = 182                          # onde a parede encontra o assoalho
JAN = (70, 176, 30, 128)            # janelão: x0, x1, topo do arco, base do vidro
FICH = (252, 412, 76)               # fichário: x0, x1, topo do corpo
LAMP = (278, 58)                    # chama da lamparina, em cima do fichário
ARCO = (420, 476, 92)               # arco da Cripta: x0, x1, topo
GAV = dict(cols=6, linhas=6, w=24, h=14)


# ─────────────────────────────── O que se vê pela janela ───────────────────────────────
def luzes_de_fora(e: Camada) -> None:
    """À tarde e à noite, o relógio da torre e as janelinhas das casas do outro lado da praça acendem."""
    if P == "manha":
        return
    a = 0.55 if P == "tarde" else 1.0
    e.mascara(elipse_m(146.5, 70.5, 3.6, 3.6), "#ffe8b0", a)
    g = np.random.default_rng(6)
    for _ in range(9):
        x, y = 74 + g.random() * 98, 116 + g.random() * 10
        if g.random() < 0.7:
            e.ret(x, y, 2, 2, "#ffc060", a * 0.9)


def lado_de_fora() -> Camada:
    """A praça vista pelo janelão: telhados do outro lado e, longe, a torre do relógio (silhueta com o mostrador)."""
    c = Camada()
    g = np.random.default_rng(5)
    x = JAN[0] - 4
    while x < JAN[1] + 4:  # telhados das casas do outro lado da praça
        w = 16 + int(g.random() * 14)
        base, topo = 132, 104 + int(g.random() * 10)
        c.ret(x, topo + 6, w, base - topo, mistura("#6a6474", "#4a4658", g.random()))
        c.poligono([(x - 2, topo + 7), (x + w / 2, topo - 2), (x + w + 2, topo + 7)], "#7a4a40")
        for k in range(x + 3, x + w - 3, 6):
            c.ret(k, topo + 12, 2, 3, "#2a2430")
        x += w + 1
    tx = 146  # a torre do relógio, longe
    c.ret(tx - 6, 56, 13, 60, "#5a5664")
    c.ret(tx + 4, 56, 3, 60, "#46424e")
    c.poligono([(tx - 9, 57), (tx + 0.5, 42), (tx + 10, 57)], "#8a4a3a")
    c.ret(tx, 38, 1, 5, "#3a3438")
    c.disco(tx + 0.5, 70.5, 4.2, ("#fff2c8", "#f0d498", "#c8a060"))
    c.p(tx, 68, "#3a2a22"); c.p(tx + 1, 70, "#3a2a22"); c.p(tx + 2, 71, "#3a2a22")
    return c


# ─────────────────────────────── O salão ───────────────────────────────
def parede(janela_m: np.ndarray) -> Camada:
    """Reboco de cal com madeiramento, lambril de pedra embaixo e as vigas do teto; o vão do janelão fica vazado."""
    c = Camada()
    n = ruido(71, 4)
    for y in range(0, CHAO):
        for x in range(W):
            if janela_m[y, x]:
                continue
            k = hash01(x // 2, y // 2, 73) * 0.06 + (n[y, x] - 0.5) * 0.08
            c.p(x, y, mistura("#c8b89e", "#8a7c6c", min(1, max(0, 0.35 + k + (y / CHAO) * 0.15))))
    cantaria(c, 0, W, 150, CHAO, 77, ("#4a4440", "#5e5650", "#766a60", "#8e8072"), alt=6, larg=13, musgo_de=0.9)
    c.ret(0, 148, W, 2, "#5a3a26"); c.ret(0, 148, W, 1, "#8a5a36")
    # vigas do teto e os caibros
    c.ret(0, 0, W, 9, "#3a2416"); c.ret(0, 8, W, 2, "#2a1a10")
    for x in range(6, W, 30):
        c.ret(x, 9, 7, 6, "#4a2e1c"); c.ret(x, 9, 7, 1, "#6a4428"); c.ret(x + 6, 10, 1, 5, "#24160e")
    for x in range(0, W, 58):  # prumos do madeiramento
        if not (JAN[0] - 8 < x < JAN[1] + 8 or FICH[0] - 6 < x < FICH[1] + 6 or ARCO[0] - 6 < x < ARCO[1] + 6):
            c.ret(x, 15, 4, 133, "#5a3a26"); c.ret(x, 15, 1, 133, "#7a5234")
    return c


def janelao(c: Camada, vidro_e: Camada) -> np.ndarray:
    """O janelão em arco: vão fundo de pedra, caixilhos de madeira e o peitoril com um vaso."""
    x0, x1, topo, base = JAN
    cx, r = (x0 + x1) / 2, (x1 - x0) / 2
    m = poligono_m([(x0, base), (x0, topo + r), (x1, topo + r), (x1, base)])
    m = np.maximum(m, elipse_m(cx - 0.5, topo + r, r, r) * (_YS <= topo + r))
    # moldura de pedra (aduelas) e o vão em sombra
    borda = (desfocar(m[:, :, None], 1.6)[:, :, 0] > 0.02) & (m == 0)
    c.mascara(borda.astype(np.float32), "#9a8a7a")
    for k in range(13):
        a = math.pi + k / 12 * math.pi
        for rr in (r + 1, r + 2, r + 3):
            c.p(cx - 0.5 + math.cos(a) * rr, topo + r + math.sin(a) * rr, "#5a5048" if rr == r + 3 else "#bfae98")
    # caixilhos: o montante do meio, travessas, e o reflexo do vidro
    for cam in (c,):
        cam.ret(cx - 1, topo, 3, base - topo, "#3a2618")
        for yy in (topo + r, topo + r + 32, topo + r + 64):
            if yy < base:
                cam.ret(x0, yy, x1 - x0, 2, "#3a2618")
        cam.ret(x0 + r * 0.5, topo + 8, 2, base - topo - 8, "#3a2618")
        cam.ret(x1 - r * 0.5 - 2, topo + 8, 2, base - topo - 8, "#3a2618")
    vidro_e.mascara(m * (np.mod(_XS + _YS * 0.7, 41) < 1) * 0.12, "#ffffff")
    # peitoril fundo com o vaso de flores discretas
    c.ret(x0 - 6, base, x1 - x0 + 12, 4, "#a8988a"); c.ret(x0 - 6, base, x1 - x0 + 12, 1, "#e0d2be")
    c.ret(x0 - 6, base + 4, x1 - x0 + 12, 1, "#3a3034")
    c.ret(x0 + 10, base - 6, 9, 6, "#9a5a3a"); c.ret(x0 + 10, base - 6, 9, 1, "#c88060")
    for k in range(14):
        c.p(x0 + 8 + k, base - 7 - (k % 3), ["#4a7a3a", "#6a9a4a", "#f4a7c4", "#ffe07a"][k % 4])
    return m


def estante(c: Camada) -> None:
    """A estante alta à esquerda, em pouca luz: lombadas uma a uma, algumas tombadas (fundo calmo para o texto)."""
    x0, x1 = 0, 58
    c.ret(x0, 14, x1 - x0, CHAO - 14, "#2a1a12")
    c.ret(x1 - 3, 14, 3, CHAO - 14, "#3e281a"); c.ret(x1 - 3, 14, 1, CHAO - 14, "#5a3a24")
    g = np.random.default_rng(81)
    cores = ["#5a2a2a", "#2e4a5a", "#4a5a2e", "#6a4a24", "#3a2e5a", "#7a5a3a", "#2a4a3e"]
    for yb in (44, 76, 108, 140, 172):
        c.ret(x0, yb, x1 - x0, 3, "#4a2e1c"); c.ret(x0, yb, x1 - x0, 1, "#6a4428")
        x = x0 + 2
        while x < x1 - 6:
            w = 2 + int(g.random() * 3)
            alt = 18 + int(g.random() * 9)
            cor = hexa(cores[int(g.random() * len(cores))])
            c.ret(x, yb - alt, w, alt, cor * 0.8)
            c.ret(x, yb - alt, 1, alt, cor * 1.05)
            c.ret(x, yb - alt + 3, w, 1, "#c8a050")  # friso dourado
            x += w + (1 if g.random() < 0.15 else 0)
            if g.random() < 0.06:  # um livro tombado
                c.poligono([(x, yb), (x + 3, yb), (x + 14, yb - alt + 6), (x + 11, yb - alt + 5)], "#5a3a3a")
                x += 14
    # escada de biblioteca encostada
    for (a, b) in (((44, CHAO), (66, 30)), ((52, CHAO), (74, 30))):
        c.linha(a[0], a[1], b[0], b[1], "#6a4428", grossura=2)
    for t in np.linspace(0.08, 0.92, 9):
        c.linha(44 + 22 * t, CHAO - 152 * t, 52 + 22 * t, CHAO - 152 * t, "#8a5a32")


def quadro_de_avisos(c: Camada) -> None:
    """O quadro de cortiça entre o janelão e o fichário, com fichas presas por tachinhas (sem texto, só as abas)."""
    x0, y0, x1, y1 = 186, 58, 226, 112
    c.ret(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, "#5a3820"); c.ret(x0 - 2, y0 - 2, x1 - x0 + 4, 1, "#9a6a3c")
    n = ruido(97, 1, 2)
    for y in range(y0, y1):
        for x in range(x0, x1):
            c.p(x, y, mistura("#a0784a", "#c89a62", n[y, x]))
    for (fx, fy, k) in ((189, 62, 0), (204, 60, 3), (190, 80, 5), (207, 78, 1), (196, 96, 6), (212, 94, 2)):
        c.ret(fx + 1, fy + 1, 12, 9, "#000000", 0.25)
        c.ret(fx, fy, 12, 9, "#f4ead4"); c.ret(fx, fy, 12, 2, ficha_aba(k))
        for ll in (fy + 4, fy + 6):
            c.ret(fx + 2, ll, 8 - (ll % 3), 1, "#c8bca4")
        c.p(fx + 6, fy, "#c8302a"); c.p(fx + 6, fy - 1, "#ff6a5a")


def ficha_aba(i: int) -> str:
    """As cores das abas das fichas: as mesmas famílias das áreas do site (sem texto)."""
    return ["#d8574a", "#3a8fb7", "#e0a33a", "#4aa36a", "#8a6ad0", "#d07a3a", "#2fa59a", "#c25a8a"][i % 8]


def fichario(c: Camada, e: Camada, luzes: list) -> None:
    """O grande fichário de nogueira: cornija, 6 x 6 gavetas com plaquinha e puxador de latão, uma gaveta aberta com as
    fichas em pé, rodapé, e em cima a lamparina, um maço de fichas soltas e um livro."""
    x0, x1, topo = FICH
    gw, gh, cols, lins = GAV["w"], GAV["h"], GAV["cols"], GAV["linhas"]
    corpo_x0 = x0 + 4
    # corpo e laterais
    c.ret(x0, topo, x1 - x0, CHAO - topo, "#3a2214")
    c.ret(x0, topo, 4, CHAO - topo, "#5a3a22"); c.ret(x0, topo, 1, CHAO - topo, "#8a5a34")
    c.ret(x1 - 6, topo, 6, CHAO - topo, "#24140c")
    # cornija com friso
    c.ret(x0 - 4, topo - 6, x1 - x0 + 8, 6, "#5a3820"); c.ret(x0 - 4, topo - 6, x1 - x0 + 8, 1, "#9a6a3c")
    c.ret(x0 - 4, topo - 1, x1 - x0 + 8, 1, "#24140c")
    for k in range(x0 - 2, x1 + 4, 4):
        c.p(k, topo - 3, "#7a4e2c")
    aberta = (2, 3)  # (linha, coluna) da gaveta aberta
    veio = ruido(83, 1, 3)
    for li in range(lins):
        for co in range(cols):
            gx, gy = corpo_x0 + co * (gw + 1), topo + 4 + li * (gh + 1)
            k = hash01(li, co, 85)
            for yy in range(gy, gy + gh):
                for xx in range(gx, gx + gw):
                    t = (xx - gx) / gw
                    base = 0.42 + (k - 0.5) * 0.12 + (veio[yy, xx] - 0.5) * 0.18 - t * 0.1
                    if yy == gy or xx == gx:
                        base += 0.22
                    if yy == gy + gh - 1 or xx == gx + gw - 1:
                        base -= 0.25
                    c.p(xx, yy, mistura("#2a160c", "#8a5630", min(1, max(0, base))))
            if (li, co) == aberta:
                continue
            # plaquinha de latão (moldura com um cartãozinho vazio) e o puxador em concha
            px, py = gx + gw // 2 - 4, gy + 2
            c.ret(px, py, 9, 5, "#b8862e"); c.ret(px, py, 9, 1, "#f0c868")
            c.ret(px + 1, py + 1, 7, 3, mistura("#e8dcc0", "#c8b898", k))
            c.ret(px + 2, gy + 9, 5, 2, "#c8902e"); c.ret(px + 2, gy + 9, 5, 1, "#ffe08a")
            c.p(px + 3, gy + 11, "#4a2a10"); c.p(px + 5, gy + 11, "#4a2a10")
    # a gaveta aberta: puxada para fora (mais baixa e maior) e as fichas em pé lá dentro
    li, co = aberta
    gx, gy = corpo_x0 + co * (gw + 1), topo + 4 + li * (gh + 1)
    c.ret(gx - 1, gy, gw + 2, gh, "#140a06")  # o vão escuro
    # a gaveta puxada: as laterais de madeira, as fichas em pé (bordas em creme alternado) e as abas coloridas
    c.ret(gx - 3, gy + 1, 2, 12, "#5a3820"); c.ret(gx + gw + 1, gy + 1, 2, 12, "#3a2214")
    for k, xx in enumerate(range(gx - 1, gx + gw + 1)):
        alt = 7 + (k % 2)
        c.ret(xx, gy + 12 - alt, 1, alt, "#f4ead4" if k % 2 else "#d8ccb0")
        if k % 3 == 1:
            c.ret(xx, gy + 12 - alt - 2, 2, 2, ficha_aba(k // 3))
    c.ret(gx - 1, gy + 4, gw + 2, 1, "#000000", 0.12)
    c.ret(gx - 3, gy + 12, gw + 6, gh - 1, "#6a4024")  # frente da gaveta puxada
    c.ret(gx - 3, gy + 12, gw + 6, 1, "#a8743e")
    c.ret(gx + gw // 2 - 4, gy + 14, 9, 5, "#b8862e"); c.ret(gx + gw // 2 - 3, gy + 15, 7, 3, "#e8dcc0")
    c.ret(gx + gw // 2 - 2, gy + 21, 5, 2, "#ffe08a")
    c.ret(gx - 3, gy + 11 + gh, gw + 6, 2, "#140a06", 0.6)
    # rodapé
    c.ret(x0 - 2, CHAO - 8, x1 - x0 + 4, 8, "#2a160c"); c.ret(x0 - 2, CHAO - 8, x1 - x0 + 4, 1, "#7a4e2c")
    # em cima: um livro deitado, o maço de fichas soltas e a lamparina
    c.ret(x0 + 64, topo - 10, 26, 4, "#5a2a2a"); c.ret(x0 + 64, topo - 10, 26, 1, "#8a4a40")
    c.ret(x0 + 66, topo - 14, 22, 4, "#2e4a5a"); c.ret(x0 + 66, topo - 14, 22, 1, "#4a6a7a")
    for k in range(5):
        c.ret(x0 + 100 + k, topo - 10 + (k % 2), 18, 3, "#f4ead4" if k % 2 else "#e2d6bc")
    c.ret(x0 + 102, topo - 9, 3, 1, ficha_aba(3))
    lx, ly = LAMP
    c.ret(lx - 6, topo - 9, 13, 3, "#8a5a1e"); c.ret(lx - 6, topo - 9, 13, 1, "#f0c060")  # base de latão
    c.ret(lx - 3, topo - 12, 7, 3, "#b8862e")
    c.ret(lx - 3, ly - 6, 7, topo - 12 - ly + 6, "#c8d8e0", 0.35)  # chaminé de vidro
    c.ret(lx - 3, ly - 6, 1, topo - 12 - ly + 6, "#ffffff", 0.5)
    c.ret(lx - 4, ly - 7, 9, 1, "#8a5a1e")
    e.ret(lx - 1, ly - 2, 3, 6, "#ffb040"); e.ret(lx, ly - 3, 1, 6, "#fff2c0"); e.p(lx, ly - 4, "#ffd890")
    luzes.append((lx, ly, 70, 0.9, "#ffaa50", 1.0))
    luzes.append((lx, ly + 20, 34, 1.0, "#ffc070", 0.5))
    luzes.append((lx + 20, ly + 70, 150, 0.7, "#ff9a50", 0.22 if P == "noite" else 0.08))


def arco_da_cripta(c: Camada, e: Camada, luzes: list) -> None:
    """O arco baixo de pedra no fundo à direita, com os degraus que descem e somem no escuro e a luz fria subindo."""
    x0, x1, topo = ARCO
    cx, r = (x0 + x1) / 2, (x1 - x0) / 2
    m = poligono_m([(x0, CHAO), (x0, topo + r), (x1, topo + r), (x1, CHAO)])
    m = np.maximum(m, elipse_m(cx - 0.5, topo + r, r, r * 0.8) * (_YS <= topo + r))
    fundo = np.zeros((H, W, 3), np.float32) + hexa("#06070e")
    fundo += np.clip((_YS - (topo + 20)) / 80, 0, 1)[:, :, None] * hexa("#1a2a4a")
    c.mascara(m, fundo)
    for (i, yy) in enumerate(range(CHAO - 4, topo + 30, -9)):  # degraus descendo
        larg = (x1 - x0 - 8) - i * 6
        if larg < 8:
            break
        c.ret(cx - larg / 2, yy, larg, 2, mistura("#4a5a7a", "#1a2236", min(1, i / 6)))
        c.ret(cx - larg / 2, yy + 2, larg, 1, "#06070e")
    borda = (desfocar(m[:, :, None], 1.6)[:, :, 0] > 0.02) & (m == 0) & (_YS < CHAO)
    c.mascara(borda.astype(np.float32), "#8a8278")
    for k in range(11):
        a = math.pi + k / 10 * math.pi
        for rr in (r + 1, r + 2, r + 3):
            c.p(cx - 0.5 + math.cos(a) * rr, topo + r + math.sin(a) * rr * 0.8, "#4a423e" if rr == r + 3 else "#a89a8a")
    forca = {"manha": 0.22, "tarde": 0.28, "noite": 0.42}[P]
    e.mascara(m * np.clip((_YS - (topo + 52)) / 40, 0, 1) * forca, "#5aa0ff")
    luzes.append((cx, CHAO - 26, 40, 1.4, "#5a90ff", forca))


def assoalho_e_tapete() -> Camada:
    """O assoalho de tábuas (as juntas fogem para o fundo) e o tapete gasto na frente do fichário."""
    c = Camada()
    fuga = (316, 40)
    for y in range(CHAO, H):
        prof = (y - CHAO) / (H - CHAO)
        for x in range(W):
            # tábuas: faixas que convergem para o ponto de fuga
            u = (x - fuga[0]) / max(1, (y - fuga[1])) * 60
            tab = int(math.floor(u / 9))
            fr = u / 9 - tab
            k = hash01(tab, 3, 91)
            cor = mistura("#6e4a2c", "#a8703e", 0.3 + k * 0.5 + prof * 0.1)
            if fr < 0.07:
                cor = hexa("#24160c")
            elif fr < 0.16:
                cor = cor * 1.12
            c.p(x, y, cor)
    c.ret(0, CHAO, W, 1, "#1a100a")
    # tapete com barra e losangos, sem letras
    tx0, tx1, ty0, ty1 = 232, 436, 186, 200
    for y in range(ty0, ty1):
        for x in range(tx0 + (ty1 - y) // 2, tx1 - (ty1 - y) // 2):
            borda = y < ty0 + 2 or x < tx0 + (ty1 - y) // 2 + 4 or x > tx1 - (ty1 - y) // 2 - 5
            losango = abs(((x - 333) % 16) - 8) + abs(((y - ty0) % 8) - 4) < 4
            cor = "#c8a050" if borda else ("#2a5a5a" if losango else "#7a2a2a")
            if hash01(x, y, 93) > 0.9:
                cor = mistura(cor, "#4a2a1a", 0.5)
            c.p(x, y, cor)
    return c


def mesa_da_frente() -> tuple[Camada, Camada]:
    """A borda da mesa de leitura no primeiro plano, à esquerda: livros, tinteiro com a pena e uma vela."""
    c, e = Camada(), Camada()
    c.ret(0, 178, 120, 22, "#3a2214"); c.ret(0, 178, 120, 2, "#7a4e2c")
    c.ret(10, 168, 34, 10, "#5a2a2a"); c.ret(12, 162, 30, 6, "#2e4a5a"); c.ret(14, 157, 26, 5, "#6a5a2e")
    c.ret(56, 170, 9, 8, "#1a1a26"); c.ret(57, 169, 7, 1, "#4a4a5a")
    c.linha(60, 169, 74, 150, "#f4ead4", grossura=2)
    c.ret(92, 162, 5, 16, "#efe4cc"); c.ret(90, 177, 9, 2, "#b8862e")
    e.ret(93, 157, 3, 5, "#ffb040"); e.p(94, 156, "#fff2c0")
    return c, e


# ─────────────────────────────── Montagem ───────────────────────────────
def montar() -> Image.Image:
    luzes: list = []
    cr.P = P
    v.PERIODO = P
    ceu = cr.ceu()
    fora = lado_de_fora()
    vidro_e = Camada()
    estrutura = Camada()
    janela_m = np.zeros((H, W), np.float32)
    x0, x1, topo, base = JAN
    r = (x1 - x0) / 2
    janela_m = poligono_m([(x0, base), (x0, topo + r), (x1, topo + r), (x1, base)])
    janela_m = np.maximum(janela_m, elipse_m((x0 + x1) / 2 - 0.5, topo + r, r, r) * (_YS <= topo + r))
    par = parede(janela_m)
    janelao(par, vidro_e)
    estante(par)
    quadro_de_avisos(par)
    e = Camada()
    fichario(estrutura, e, luzes)
    luzes_de_fora(e)
    arco_da_cripta(estrutura, e, luzes)
    chao = assoalho_e_tapete()
    frente, e_frente = mesa_da_frente()
    luzes.append((94, 158, 30, 1.0, "#ffaa50", 0.6))

    rampa = {"manha": [(0, "#5a6a8a"), (0.6, "#8a9ab8"), (1, "#d8e2f0")],
             "tarde": [(0, "#5a2c50"), (0.55, "#8a4a5e"), (1, "#ffc09a")],
             "noite": [(0, "#0e1430"), (0.6, "#1c2650"), (1, "#56669e")]}[P]
    remapear(fora, rampa, 0.25)

    # A luz da janela no chão e no fichário: o vão projetado pela direção do sol (ou da lua).
    dx, dy = {"manha": (1.25, 1.0), "tarde": (2.6, 0.75), "noite": (1.0, 1.0)}[P]
    alcance = (CHAO - topo) / dy
    poca = np.zeros((H, W), np.float32)
    for (yy, xx) in zip(*np.nonzero(janela_m > 0.5)):
        t = (CHAO - yy) / dy
        px, py = int(xx + t * dx), CHAO + int((xx * 0.0 + (yy - topo)) * 0.12)
        if 0 <= px < W and 0 <= py < H:
            poca[py, px] = 1
    poca = np.clip(desfocar(poca[:, :, None], 1.4)[:, :, 0] * 4, 0, 1)
    feixe = poligono_m([(x0, topo + 10), (x1, topo + 10), (min(W - 1, x1 + alcance * dx * 0.95), CHAO), (x0 + alcance * dx * 0.95, CHAO)])
    feixe *= (1 - janela_m)

    m = Montagem(ceu)
    m.camada(fora, 1.4)
    m.camada(par)
    m.camada(estrutura)
    m.camada(chao)
    m.camada(frente, 0)
    janelas = luzes
    if P == "manha":
        m.iluminar("#8a90a8", [l[:5] + (l[5] * 0.25,) for l in janelas])
        m.somar(desfocar(ampliar(poca[:, :, None]), 2)[:, :, 0], "#fff0d0", 0.55)
    elif P == "tarde":
        m.iluminar("#7a6078", [l[:5] + (l[5] * 0.45,) for l in janelas])
        m.somar(desfocar(ampliar(poca[:, :, None]), 2)[:, :, 0], "#ffb070", 0.6)
    else:
        m.iluminar("#262a52", [l[:5] + (l[5] * 1.3,) for l in janelas])
        m.somar(desfocar(ampliar(poca[:, :, None]), 2)[:, :, 0], "#8a9ad8", 0.22)
    m.emissivo(vidro_e, 0.6)
    m.emissivo(e, 0, halo={"manha": 0.35, "tarde": 0.6, "noite": 1.1}[P])
    # Feixe volumétrico com poeira.
    f3 = desfocar(ampliar(feixe[:, :, None]), 9)[:, :, 0]
    cor_f, forca = {"manha": ("#fff2cc", 0.2), "tarde": ("#ffbe80", 0.24), "noite": ("#9aaaf0", 0.08)}[P]
    m.somar(f3, cor_f, forca)
    g = np.random.default_rng(88)
    poeira = np.zeros((H * ESC, W * ESC), np.float32)
    for _ in range(320):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        if f3[y, x] > 0.3:
            poeira[y, x] = 0.6 + g.random() * 0.4
    m.somar(desfocar(poeira[:, :, None], 0.6)[:, :, 0], "#fff6dc", 0.8 if P != "noite" else 0.3)
    m.camada(frente, 5, escurecer={"manha": 0.7, "tarde": 0.55, "noite": 0.4}[P])
    m.emissivo(e_frente, 3, halo=0.6 if P == "noite" else 0.2)
    quente, fria = {"manha": ("#fff0d4", "#24366a"), "tarde": ("#ffcf8a", "#3a1e4e"), "noite": ("#ffd8a8", "#121848")}[P]
    return m.acabar(quente, fria, esquerda=0.32, centro_v=(0.66, 0.5), contraste=1.06, bloom={"manha": 0.35, "tarde": 0.6, "noite": 1.0}[P])


def piso() -> None:
    """O assoalho que continua a cena embaixo do topo: tábuas de madeira morna em fiadas desencontradas, com veio,
    juntas escuras, pregos e desgaste. Ladrilho de 160 x 160 que se repete sem emenda."""
    T = 160
    alt = 16                      # largura da tábua
    comp = 160                    # tábuas compridas: uma emenda por fiada dentro do ladrilho
    ys, xs = np.mgrid[0:T, 0:T]
    fila = ys // alt
    off = (fila * 61) % comp
    fx = (xs + off) % comp
    tom = np.array([hash01(int(f), 7, 303) for f in range(T // alt)], np.float32)[fila]
    def sem_emenda(seed: int, ex: int, ey: int) -> np.ndarray:
        """Ruído que fecha a volta na horizontal: mistura duas faixas vizinhas com peso que cruza o ladrilho."""
        n = v.ruido(seed, ex, ey, 2 * T, T)
        w = (np.arange(T, dtype=np.float32) / T)[None, :]
        return n[:, :T] * (1 - w) + n[:, T:] * w
    veio = sem_emenda(301, 12, 1) * 0.6 + sem_emenda(302, 3, 1) * 0.4   # fibras compridas na horizontal
    fy = ys % alt
    base = 0.36 + tom * 0.14 + (veio - 0.5) * 0.16 - (fy == alt - 2) * 0.05 + (fy == 1) * 0.06
    cor = np.stack([base * 1.12, base * 0.76, base * 0.5], 2)
    # nós da madeira: anéis escuros pequenos
    g = np.random.default_rng(305)
    for _ in range(7):
        nx, ny = g.integers(0, T), g.integers(0, T)
        d = np.hypot(((xs - nx + T / 2) % T - T / 2) * 0.55, (ys - ny + T / 2) % T - T / 2)
        anel = (d < 3.2) & (fy > 2) & (fy < alt - 3)
        cor = np.where(anel[:, :, None], cor * (0.72 + 0.12 * np.cos(d * 2.2))[:, :, None], cor)
    junta = (fy == alt - 1) | (fx == 0)
    cor = np.where(junta[:, :, None], np.array([0.09, 0.055, 0.035], np.float32), cor)
    prego = ((fx == 4) | (fx == comp - 5)) & ((fy == 4) | (fy == alt - 5))
    cor = np.where(prego[:, :, None], np.array([0.16, 0.14, 0.12], np.float32), cor)
    gasto = (sem_emenda(307, 20, 6) > 0.62) & ~junta   # caminho gasto: madeira mais clara
    cor = np.where(gasto[:, :, None], cor * 1.1, cor)
    img = Image.fromarray((np.clip(cor, 0, 1) * 255).astype(np.uint8)).resize((T * ESC, T * ESC), Image.NEAREST)
    PASTA.mkdir(parents=True, exist_ok=True)
    img.save(PASTA / "arquivo-piso.webp", quality=80, method=6)
    print("arquivo-piso:", (PASTA / "arquivo-piso.webp").stat().st_size // 1024, "KB")


def objetos() -> None:
    """Os objetos animados dos caminhos da central (folha de 2 x 2 quadros de 96 x 72):
    linha 0, o fichário (fechado; a gaveta do meio aberta, com as fichas pulando e as abas coloridas);
    linha 1, o arco da Cripta (a luz fria baixa; acesa, com fagulhas azuis subindo). Pixel art pura, sombreada à mão."""
    QW, QH = 96, 72

    def mini_fichario(c: Camada, ox: int, oy: int, aberta: bool) -> None:
        x0, x1, topo, base = ox + 10, ox + 86, oy + 18, oy + 68
        c.ret(x0, topo, x1 - x0, base - topo, "#3a2214")
        c.ret(x0, topo, 3, base - topo, "#6a4428"); c.ret(x1 - 4, topo, 4, base - topo, "#24140c")
        c.ret(x0 - 3, topo - 5, x1 - x0 + 6, 5, "#5a3820"); c.ret(x0 - 3, topo - 5, x1 - x0 + 6, 1, "#a8743e")
        c.ret(x0 - 1, base - 4, x1 - x0 + 2, 4, "#24140c"); c.ret(x0 - 1, base - 4, x1 - x0 + 2, 1, "#7a4e2c")
        for li in range(3):
            for co in range(3):
                gx, gy = x0 + 4 + co * 23, topo + 3 + li * 14
                if aberta and (li, co) == (1, 1):
                    continue
                c.ret(gx, gy, 22, 13, mistura("#5a3620", "#7a4a2a", hash01(li, co, 9)))
                c.ret(gx, gy, 22, 1, "#a8743e"); c.ret(gx, gy, 1, 13, "#8a5a32"); c.ret(gx, gy + 12, 22, 1, "#24140c")
                c.ret(gx + 7, gy + 3, 8, 4, "#b8862e"); c.ret(gx + 8, gy + 4, 6, 2, "#ece0c4")
                c.ret(gx + 8, gy + 9, 6, 2, "#d8a040"); c.ret(gx + 8, gy + 9, 6, 1, "#ffe08a")
        if aberta:  # a gaveta do meio puxada, as fichas em pé e duas pulando para fora
            gx, gy = x0 + 27, topo + 17
            c.ret(gx - 1, gy, 24, 13, "#140a06")
            c.ret(gx - 3, gy + 2, 2, 9, "#6a4024"); c.ret(gx + 23, gy + 2, 2, 9, "#3a2214")
            for k, xx in enumerate(range(gx - 1, gx + 23)):
                c.ret(xx, gy + 4 - (k % 2), 1, 7, "#f4ead4" if k % 2 else "#d8ccb0")
                if k % 3 == 1:
                    c.ret(xx, gy + 2 - (k % 2), 2, 2, ficha_aba(k // 3))
            c.ret(gx - 3, gy + 11, 28, 9, "#7a4a2a"); c.ret(gx - 3, gy + 11, 28, 1, "#b8844a")
            c.ret(gx + 8, gy + 13, 9, 4, "#b8862e"); c.ret(gx + 9, gy + 14, 7, 2, "#ece0c4")
            for (fx, fy, k, inc) in ((gx + 2, gy - 14, 0, -1), (gx + 13, gy - 20, 4, 1)):
                c.ret(fx, fy, 11, 8, "#000000", 0.18)
                c.ret(fx - 1, fy - 1, 11, 8, "#f8f0dc"); c.ret(fx - 1, fy - 1, 11, 2, ficha_aba(k))
                c.ret(fx + 1, fy + 3, 7, 1, "#c8bca4"); c.ret(fx + 1, fy + 5, 5, 1, "#c8bca4")
        # a lamparina em cima
        lx = x0 + 12
        c.ret(lx - 4, topo - 8, 9, 3, "#8a5a1e"); c.ret(lx - 4, topo - 8, 9, 1, "#f0c060")
        c.ret(lx - 2, topo - 15, 5, 7, "#ffe6a0", 0.5); c.ret(lx - 1, topo - 14, 3, 5, "#ffb040"); c.ret(lx, topo - 14, 1, 4, "#fff4c8")
        c.ret(lx - 3, topo - 16, 7, 1, "#8a5a1e")
        brilho = Camada()
        brilho.mascara(elipse_m(lx, topo - 11, 9, 8) * 0.25, "#ffc070")
        c.mascara(brilho.c[:, :, 3], brilho.c[:, :, :3])

    def mini_arco(c: Camada, ox: int, oy: int, aceso: bool) -> None:
        x0, x1, topo, base = ox + 20, ox + 76, oy + 8, oy + 68
        cx, r = (x0 + x1) / 2, (x1 - x0) / 2
        cantaria(c, ox + 8, ox + 88, oy + 4, base, 409, ("#4a4440", "#5e5650", "#766a60", "#8e8072"), alt=5, larg=10, musgo_de=0.6)
        m = poligono_m([(x0, base), (x0, topo + r), (x1, topo + r), (x1, base)])
        m = np.maximum(m, elipse_m(cx - 0.5, topo + r, r, r * 0.8) * (_YS <= topo + r))
        fundo = np.zeros((H, W, 3), np.float32) + hexa("#06070e")
        luz = np.clip((_YS - (topo + 18)) / 44, 0, 1)
        fundo += luz[:, :, None] * hexa("#2a4a8a" if aceso else "#16244a")
        c.mascara(m, fundo)
        for (i, yy) in enumerate(range(base - 3, topo + 22, -7)):
            larg = (x1 - x0 - 6) - i * 7
            if larg < 6:
                break
            c.ret(cx - larg / 2, yy, larg, 2, mistura("#7aa8ff" if aceso else "#4a5a7a", "#1a2236", min(1, i / 5)))
        borda = (desfocar(m[:, :, None], 1.4)[:, :, 0] > 0.02) & (m == 0) & (_YS < base) & (_YS >= oy)
        c.mascara(borda.astype(np.float32) * ((_XS >= ox) & (_XS < ox + QW)), "#a89a8a")
        if aceso:
            for (fx, fy) in ((cx - 9, base - 30), (cx + 6, base - 40), (cx - 2, base - 52), (cx + 12, base - 24)):
                c.ret(fx, fy, 2, 2, "#9ac8ff"); c.p(fx, fy, "#ffffff")

    folha = Camada()
    mini_fichario(folha, 0, 0, False)
    mini_fichario(folha, QW, 0, True)
    mini_arco(folha, 0, QH, False)
    mini_arco(folha, QW, QH, True)
    arr = (np.clip(folha.c[:QH * 2, :QW * 2], 0, 1) * 255).astype(np.uint8)
    PASTA.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGBA").save(PASTA / "objetos.png", optimize=True)
    print("objetos:", (PASTA / "objetos.png").stat().st_size // 1024, "KB")


def gerar(periodo: str) -> None:
    global P
    P = periodo
    PASTA.mkdir(parents=True, exist_ok=True)
    img = montar()
    nome = f"arquivo-{periodo}"
    img.save(PASTA / f"{nome}.webp", quality=84, method=6)
    img.resize((960, 400), Image.LANCZOS).save(PASTA / f"{nome}-960.webp", quality=84, method=6)
    print(nome, (PASTA / f"{nome}.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    args = sys.argv[1:]
    if "piso" in args:
        piso()
    if "objetos" in args:
        objetos()
    for p in [a for a in args if a in PERIODOS] or ([] if ("piso" in args or "objetos" in args) else list(PERIODOS)):
        gerar(p)
