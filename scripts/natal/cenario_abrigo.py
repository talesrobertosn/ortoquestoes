"""O Abrigo das Águas no Natal, sob o arco de pedra da pintura original.

O pinho acompanha as aduelas e a coroa fica presa à chave do arco. A luz
do vidro rebate na pedra e se quebra nas juntas do piso úmido.
Uso: python3 scripts/natal/cenario_abrigo.py [manha tarde noite]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

from hd2d import Camada, h01, hexa, pal
from cenarios import inicio_abrigo as cena

SAIDA = Path(__file__).resolve().parents[2] / "public" / "pixel" / "inicio"
PINHO = pal("#0c1b17", "#172f23", "#284c36", "#386243", "#4c7d50", "#65975d", "#83ad70")
BAGA = pal("#301018", "#4e121b", "#741a25", "#92263a", "#b13848", "#cc555c", "#ec7a75")
OURO = pal("#332419", "#554027", "#805d38", "#aa834d", "#cba45f", "#edd093", "#ffebb5")
LINHO = pal("#48382b", "#68543e", "#897458", "#aa946f", "#c9b38a", "#e3cba1", "#f4e2be")
PAPEL = pal("#142629", "#193e3e", "#285754", "#3c7268", "#578b7b", "#76a390", "#a1bf9f")
FERRO = pal("#151b1b", "#24302d", "#333d38", "#4d564b", "#656a5a", "#7e816e", "#a39f80")
VIDROS = (
    ("#fed48a", "#fff0b2", "#ffba67", OURO),
    ("#f88673", "#ffb48e", "#ff675b", BAGA),
    ("#a5e4bd", "#dbf6cb", "#72d2ae", PAPEL),
)
FORCA = {"manha": 0.48, "tarde": 0.74, "noite": 1.15}
Pontos = list[tuple[int, int, str, float, float]]


def perfil_arco(x: int) -> float:
    return 99 - 67.5 * math.sqrt(1 - ((x - 294) / 86) ** 2)


def lampada(c: Camada, e: Camada, x: int, y: int, cor: int, pontos: Pontos, nome: str) -> None:
    vidro, nucleo, luz, base = VIDROS[cor]
    c.p(x, y - 2, FERRO[1])
    c.p(x, y - 1, OURO[3])
    c.p(x - 1, y, base[2])
    c.p(x, y, nucleo)
    c.p(x + 1, y, base[4])
    c.p(x, y + 1, vidro)
    c.p(x, y + 2, base[3])
    k = FORCA[nome] * (0.9 if y < 80 else 1.0)
    e.p(x, y, nucleo, k * 0.84)
    e.p(x, y + 1, vidro, k * 0.54)
    pontos.append((x, y, luz, 11.5 if y < 80 else 14.0, 0.77 if y < 80 else 0.92))


def festao(c: Camada, e: Camada, pontos: Pontos, nome: str) -> None:
    """Ramal de pinho preso em ganchos. Cada barriga cai sobre as juntas do arco."""
    for i, (a, b) in enumerate(((222, 246), (246, 271), (274, 284), (304, 314), (317, 343), (343, 366))):
        curva = {}
        for x in range(a, b + 1):
            f = (x - a) / (b - a)
            y = round(perfil_arco(x) + math.sin(f * math.pi) * (3.6 if b - a > 15 else 1.9))
            curva[x] = y
            for dy in range(-2, 4):
                luz = 4.1 - dy * 0.91
                veio = 1.0 if (x * 2 + dy * 3 + i) % 8 < 3 else 0
                tom = round(luz + veio + (h01(x, y + dy, 33) - 0.5) * 2.3)
                c.p(x, y + dy, PINHO[np.clip(tom, 0, 6)])
            if h01(x, y, 3) > 0.44:
                c.p(x + 1, y - 3, PINHO[5 + (x % 4 == 0)])
                c.p(x + 2, y - 2, PINHO[3])
            if h01(x, y, 9) > 0.62:
                c.p(x - 1, y + 4, PINHO[2 + (x % 5 == 1)])
            if h01(x, y, 74) > 0.87:
                c.p(x, y - 1, BAGA[5])
                c.p(x + 1, y - 1, BAGA[3])
        for x in range(a + 3, b - 2, 6):
            lampada(c, e, x, curva[x] + 2, (i + (x - a) // 6) % 3, pontos, nome)
        for x in (a, b):
            y = curva[x]
            c.p(x, y - 4, FERRO[3])
            c.p(x + 1, y - 3, FERRO[5])
            c.p(x, y - 2, FERRO[2])


def laco(c: Camada, cx: int, cy: int) -> None:
    """Veludo de duas alças, com ponto de fio quente na dobra e duas pontas diferentes."""
    linhas = (
        ".5..........4..", "463........564.", "3456......4563.",
        ".3456....4453..", "..4565434653...", "...34666543....",
        ".....5634......", "....553.34.....", "...453...342...",
        "...43.....43...", "..443......32..", "..3.2.......2..",
    )
    c.bitmap(cx - 7, cy - 4, linhas, {str(i): cor for i, cor in enumerate(BAGA)})
    for dx, dy in ((-4, -3), (4, -3), (-4, 5), (4, 6)):
        c.p(cx + dx, cy + dy, OURO[4], 0.57)


def coroa(c: Camada, e: Camada, pontos: Pontos, nome: str) -> None:
    """Coroa da chave do arco, presa por uma fita curta e um prego de ferro."""
    cx, cy, raio = 294, 40, 11.6
    c.ret(cx - 1, 25, 3, 6, BAGA[2])
    c.ret(cx - 1, 26, 1, 5, BAGA[4])
    c.p(cx, 24, FERRO[5])
    c.p(cx, 25, FERRO[3])
    dx, dy = cena.X - cx, cena.Y - cy
    ang = np.arctan2(dy, dx)
    rad = np.hypot(dx, dy * 1.04)
    ramo = np.sin(ang * 13 + rad * 0.65)
    m = (rad > raio - 2.4 - ramo * 0.38) & (rad < raio + 3.2 + ramo * 0.93)
    sombra = (rad < raio - 1.5) * 1.3
    v = 4.0 - (dy + dx * 0.30) * 0.11 + ramo * 0.78 - sombra
    v -= np.maximum(0, rad - raio - 2) * 0.74
    c.mascara(m, PINHO[np.clip(np.floor(v + cena.a.BAYER_HW * 0.75), 0, 6).astype(int)])
    for j in range(28):
        a = j * math.tau / 28
        for ds in (0, 1, 2):
            r = raio + 2.5 + ds * 0.64
            x = cx + math.cos(a + ds * 0.024) * r
            y = cy + math.sin(a + ds * 0.024) * r
            cor = PINHO[3 + (y < cy) + (ds == 1)]
            if ds == 2 and h01(j, ds, 7) > 0.59:
                continue
            c.p(x, y, cor)
    # Frutas de azevinho e dois pingentes de latão já polidos pelo uso.
    for x, y in ((288, 31), (304, 35), (282, 42), (301, 48)):
        for (ox, oy, k) in ((0, 0, 6), (1, 0, 4), (0, 1, 2), (2, 1, 4)):
            c.p(x + ox, y + oy, BAGA[k])
    for x, y in ((283, 39), (303, 31), (306, 44), (294, 51)):
        lampada(c, e, x, y, 0, pontos, nome)
    laco(c, cx, 51)
    # Sinos presos às caudas do laço. O chanfro vira para as lâmpadas.
    for bx, by in ((290, 57), (300, 57)):
        c.p(bx, by - 2, FERRO[3])
        c.p(bx, by - 1, OURO[4])
        c.bitmap(bx - 2, by, (".453.", ".345.", "34542", ".321.", "..2.."),
                 {str(i): cor for i, cor in enumerate(OURO)})


def meias_da_coluna(c: Camada, e: Camada, pontos: Pontos, nome: str) -> None:
    """Duas meias de lã pendem do ramo preso ao ferro da lanterna direita."""
    for x in range(373, 398):
        t = (x - 373) / 24
        y = round(122 - 5 * t + 3.3 * math.sin(t * math.pi))
        c.p(x, y + 2, PINHO[0])
        c.p(x, y + 1, PINHO[2])
        c.p(x, y, PINHO[3 + (x % 3 == 0)])
        h = 1 + (h01(x, y, 38) > 0.44)
        c.p(x, y - h, PINHO[4 + (x % 3 == 0)])
        if h > 1:
            c.p(x - 1, y - 3, PINHO[5])
            c.p(x, y - 1, PINHO[3])
        if h01(x, y, 52) > 0.66:
            c.p(x + 1, y + 2, PINHO[2])
        if x in (379, 388, 395):
            c.p(x, y - 1, BAGA[6])
            c.p(x + 1, y - 1, BAGA[3])
    for x, y in ((374, 121), (390, 117)):
        c.p(x, y - 2, FERRO[6])
        c.p(x, y - 1, FERRO[3])
        c.p(x + 1, y, FERRO[2])

    # Punhos dobrados e o bico cheio. O pontilhado segue o sentido da malha.
    corte = (
        "..5654..", "..4532..", "...554..", "...453..", "...543..",
        "...542..", "...541..", "...542..", "...542..", "...5442.",
        "...54332", "..654432", ".655433.", ".54332..", "..322...",
    )
    for x, y, tecido, punho, rumo in ((375, 124, BAGA, LINHO, 1), (389, 123, PAPEL, LINHO, -1)):
        c.p(x + 4, y - 1, FERRO[5])
        for dy, linha in enumerate(corte):
            for dx, tom in enumerate(linha if rumo > 0 else linha[::-1]):
                if tom == ".":
                    continue
                k = int(tom)
                mat = punho if dy <= 1 else tecido
                if (dy in (3, 6) and dx in (3, 4, 5)) or (dy == 12 and dx in (2, 5)):
                    mat = LINHO if rumo < 0 else OURO
                    k = 3 + (dx % 2 == 0)
                if dy in (2, 4) and rumo < 0:
                    mat, k = BAGA, 3 + (dx % 2 == 0)
                if h01(x + dx, y + dy, 13) > 0.84:
                    k = min(6, k + 1)
                c.p(x + dx, y + dy, mat[k])
    lampada(c, e, 376, 123, 2, pontos, nome)
    lampada(c, e, 393, 119, 1, pontos, nome)


def embrulho(c: Camada, x: int, y: int, w: int, h: int, cor, fita) -> None:
    """Faces de papel estampado e fita dobrada sobre a tampa em perspectiva."""
    for dy in range(h):
        for dx in range(w):
            lado = dx >= w - 2
            k = 4 - lado * 2 + (dy == 0) - (dy == h - 1)
            k += (dx + dy * 3) % 5 == 0 and not lado
            papel = cor[k]
            if dx == w // 2 - 1 or dy == h // 2:
                papel = fita[3 if lado else 5 - (dy > 0)]
            c.p(x + dx, y + dy, papel)
    c.ret(x + 1, y - 1, w - 1, 1, cor[5])
    m = x + w // 2 - 1
    for ox, oy, k in ((-2, -2, 4), (-1, -2, 5), (1, -3, 4), (2, -2, 5), (0, -1, 6), (0, -2, 3)):
        c.p(m + ox, y + oy, fita[k])


def presentes(c: Camada) -> None:
    for x, y, w, h, cor, fita in ((324, 173, 9, 9, BAGA, OURO), (331, 178, 10, 6, PAPEL, LINHO)):
        for dx in range(w + 1):
            c.p(x - 1 + dx, y + h - 1, "#0e1b18", 0.35)
            c.p(x + dx, y + h, "#071713", 0.35)
        embrulho(c, x, y, w, h, cor, fita)


def caneca(c: Camada, periodo: str) -> None:
    """Uma caneca vermelha de cerâmica entre o último livro e a ponta do banco."""
    x, y = 353, 149
    molde = (".454..", "656541", "545224", "434224", "32342.", ".322..")
    c.bitmap(x - 1, y - 5, molde, {str(i): cor for i, cor in enumerate(BAGA)})
    c.p(x + 1, y - 4, "#45241e")
    c.p(x + 2, y - 4, "#8b5c3a")
    c.p(x, y - 1, OURO[4], 0.68)
    c.p(x + 1, y - 1, OURO[5], 0.59)
    c.p(x + 1, y, BAGA[1], 0.92)
    c.ret(x - 1, y + 1, 6, 1, "#201913", 0.5)
    # O vapor sobe em lâminas, iluminado de lado pelo braseiro.
    for sx, sy, k in ((354, 142, 0.45), (354, 141, 0.33), (353, 140, 0.29),
                      (353, 139, 0.26), (354, 138, 0.23), (355, 137, 0.17), (355, 136, 0.12)):
        c.p(sx, sy, "#e3dbc1" if periodo != "noite" else "#b7b6a4", k)


def acrescentar_luz(e: Camada, m: np.ndarray, luz: np.ndarray) -> None:
    """Acumula radiância antes do bloom que já existe na montagem do Abrigo."""
    e.c[m, :3] = e.c[m, :3] * e.c[m, 3:4] + luz[m]
    e.c[m, 3] = 1


def luz_local(receptor: Camada, e: Camada, pontos: Pontos, nome: str, m: np.ndarray) -> None:
    total = np.zeros((cena.H, cena.W, 3), np.float32)
    for x, y, cor, raio, k in pontos:
        d2 = ((cena.X - x) / raio) ** 2 + ((cena.Y - y - 1) / (raio * 0.77)) ** 2
        queda = np.maximum(0, 1 - d2) ** 2
        total += queda[:, :, None] * hexa(cor) * k * FORCA[nome]
    alfa = receptor.c[:, :, 3]
    vis = m & (alfa > 0.3) & (total.max(axis=2) > 0.006)
    acrescentar_luz(e, vis, total * (0.22 + 0.78 * receptor.c[:, :, :3]) * 0.43)


def brilho_piso(c: Camada, e: Camada, pontos: Pontos, nome: str) -> None:
    """Luz difusa e filetes especulares partidos pelas juntas úmidas."""
    x, y = cena.X, cena.Y
    umidade = cena.a.fbm(415, (13, 5, 2), (0.4, 0.4, 0.2))
    veio = cena.a.ruido_ret(91, 11, 1)
    piso = (c.c[:, :, 3] > 0.8) & (x > 216) & (y >= 127)
    total = np.zeros((cena.H, cena.W, 3), np.float32)
    for lx, ly, cor, _, _ in pontos:
        if ly < 39:
            continue
        xproj = lx + (0.025 if ly > 95 else 0.085) * (lx - 294)
        altura = max(1, 127 - ly)
        queda = np.exp(-(((x - xproj - (y - 132) * 0.05) / (13 + altura * 0.07)) ** 2
                        + ((y - 145) / 17) ** 2) * 1.6)
        spec = np.exp(-((x - xproj - np.sin(y * 0.68) * 2.0) / 3.8) ** 2
                      - ((y - 149) / 17) ** 2) * (umidade > 0.53) * (veio > 0.54)
        total += (queda * 0.19 + spec * (0.44 if ly > 95 else 0.29))[:, :, None] * hexa(cor) * FORCA[nome] / max(altura * 0.12, 4)
    acrescentar_luz(e, piso & (total.max(axis=2) > 0.005), total * 0.66)


def montar(nome: str) -> Image.Image:
    festivo, emi = Camada(), Camada()
    pontos: Pontos = []
    festao(festivo, emi, pontos, nome)
    coroa(festivo, emi, pontos, nome)
    meias_da_coluna(festivo, emi, pontos, nome)
    arquitetura, piso, objetos = cena.brick_layer, cena.ground, cena.props
    e_piso = Camada()
    mascara = festivo.c[:, :, 3] > 0.3

    def ground():
        c, m = piso()
        brilho_piso(c, e_piso, pontos, nome)
        return c, m

    def brick_layer():
        c, e, parede = arquitetura()
        # Sombra curta nas aduelas. Os ramos ficam no plano dianteiro e
        # preservam a espessura original do arco atrás deles.
        sombra = np.roll(np.roll(mascara, 2, axis=0), -1, axis=1) & ~mascara & (c.c[:, :, 3] > 0.4)
        c.c[sombra, :3] *= 0.66
        luz_local(c, e, pontos, nome, ~mascara & (cena.X > 215))
        e.juntar(e_piso)
        return c, e, parede

    def props():
        c, e = objetos()
        presentes(c)
        caneca(c, nome)
        c.juntar(festivo)
        luz_local(c, e, pontos, nome, mascara)
        emitir = emi.c[:, :, 3] > 0
        acrescentar_luz(e, emitir, emi.c[:, :, :3] * emi.c[:, :, 3:4])
        return c, e

    with patch.multiple(cena, brick_layer=brick_layer, ground=ground, props=props):
        return cena.montar(nome)


def main() -> None:
    for nome in sys.argv[1:] or ("manha", "tarde", "noite"):
        if nome not in cena.lake.PERIODOS:
            raise SystemExit(f"Período desconhecido: {nome}")
        img = montar(nome)
        prefixo = SAIDA / f"cena-abrigo-natal-{nome}"
        img.save(f"{prefixo}.webp", quality=84, method=6)
        img.resize((960, 400), Image.Resampling.LANCZOS).save(f"{prefixo}-960.webp", quality=84, method=6)


if __name__ == "__main__":
    main()
