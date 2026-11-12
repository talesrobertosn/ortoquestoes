"""Cenário "HD-2D" do topo da página inicial: Natal no Vale (12/11/2026, pedido do Tales).

"Um quê de Suíça, como em Grindelwald ou Lauterbrunnen, com bastante toque de Natal; que a pessoa se sinta aconchegada."
Nada baixado nem gerado por IA: cada pixel sai das funções abaixo, com os pincéis do refúgio da neve
(scripts/cenarios/inicio_neve.py) e do acampamento (scripts/gerar_cena_inicio.py).

A cena (pixel art de 480 x 200, montada em 3x com a luz calculada por pixel), vista do terraço de um chalé no alto do vale:
- ao fundo, o maciço nevado (um pico alto com o ombro prateado), o paredão de rocha do vale à esquerda com a cachoeira
  meio congelada caindo do alto, o outro paredão à direita;
- lá embaixo, o vale: campos de neve, o rio escuro, cercas, casinhas com as janelas acesas, a prefeitura branca de torre
  pontuda com o relógio dourado e a linha do trem de montanha (o trenzinho anda por cima, animado no site);
- o terraço: a fogueira de pedras na âncora do fogo, o guarda-corpo de tábuas recortadas com a guirlanda, os laços
  vermelhos e as luzinhas, o cesto com almofada xadrez (lugar do gato), o trenó com presentes, o pinheirinho na tina
  com bolas, luzinhas e a estrela, o lampião de ferro, a placa amarela de trilha e a neve com pegadas;
- o chalé: telhado largo carregado de neve com pingentes e o cordão de luzes no beiral, a empena de madeira escura com a
  sacada recortada enfeitada, a estrela do Advento acesa na janelinha do sótão, o térreo de alvenaria branca com as
  janelas de venezianas em chamas vermelhas e brancas, a árvore de Natal vista pela janela, a guirlanda na porta, o
  sino de vaca pendurado com a correia bordada, a lenha empilhada e a chaminé soltando fumaça.

Duas versões de cada hora (o sistema de neve do site, componentes/inicio/cena/clima.ts): a de tempo firme e a nevada
(céu fechado, montanhas sumindo na nevasca, neve fresca e alta em tudo, pegadas cobertas, luzes com halo maior).
Saídas em public/pixel/inicio/: cena-vale-{manha,tarde,noite}[-960].webp e cena-vale-nevado-{...}[-960].webp,
mais cena-vale.json com os pontos do gato e da coruja.

O fogo (caixa x 220-260, y 104-152, base em 240,146), o esqueleto sentado (x 262-308, y 96-163), o gato e a coruja
entram por cima (componentes/inicio/cena/CenaDiorama.tsx); as áreas deles ficam livres.
Uso: python3 scripts/cenarios/inicio_vale.py                 (as seis)
     python3 scripts/cenarios/inicio_vale.py noite nevado    (só uma)
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
sys.path.insert(0, str(RAIZ / "scripts" / "cenarios"))
from gerar_cena_inicio import (  # noqa: E402
    BAYER_HW, ESC, GX, GXa, GY, GYa, H, MADEIRA, PEDRA, W, XA, YA, Camada, ampliar, desfocar, desfocar_rgba,
    facho, hexa, luz_em_degraus, luz_pontual, pal, pedra, poli, pontilhar, projetar_sombra, raios_de_luz, ruido,
    ruido_ret, sobre, suave)
import inicio_neve as nv  # noqa: E402
from inicio_neve import (  # noqa: E402
    NEVE, PEDRA_CHAM, TORA, VERDE_PINHO, Plano, direto, juntar_plano, lampiao, nevar, normal3, pinheirinho, pinheiro)

PASTA = RAIZ / "public" / "pixel" / "inicio"
FOGO = (240, 146)
LIVRE = {"fogo": (220, 104, 260, 152), "esqueleto": (262, 96, 308, 163)}
BEIRA = 127                       # onde o terraço termina e o vale despenca
ESTADO = {"nevado": False}


def nevado() -> bool:
    return ESTADO["nevado"]


# ─────────────────────────────── Horas do dia ───────────────────────────────
PERIODOS = {
    "manha": dict(nv.PERIODOS["manha"], astro=(452, 14)),
    "tarde": dict(nv.PERIODOS["tarde"]),
    "noite": dict(nv.PERIODOS["noite"], astro=(404, 20)),
}
# O tempo fechado: céu cinza-azulado, luz direta quase nenhuma (a nevasca espalha tudo), névoa alta.
NEVADO = {
    "manha": dict(ceu=("#6a7a96", "#93a2b8", "#c4ccd8"), amb="#a8b4cc", amb_k=0.78, sol_k=0.22, nevoa="#b8c2d2", nevoa_k=0.95,
                  fogo_k=0.45, jan_k=0.85),
    "tarde": dict(ceu=("#4e4a6a", "#80789a", "#b4a8b8"), amb="#9a90b4", amb_k=0.66, sol_k=0.18, nevoa="#a89cb4", nevoa_k=0.95,
                  fogo_k=0.6, jan_k=1.0),
    "noite": dict(ceu=("#0c1222", "#18223a", "#2a3550"), amb="#5a6c9c", amb_k=0.3, sol_k=0.12, nevoa="#28334c", nevoa_k=0.9,
                  fogo_k=1.1, jan_k=1.3),
}


def periodo(nome: str) -> dict:
    per = dict(PERIODOS[nome])
    if nevado():
        per.update(NEVADO[nome])
    return per


VERMELHO = pal("#3a0c10", "#5e1418", "#86201e", "#ae3024", "#d24a34", "#ec7a5a")
OURO = pal("#4a3010", "#7a5418", "#a87a28", "#d4a640", "#f4d478", "#fff2b8")
REBOCO = pal("#4a4c58", "#646876", "#828696", "#a2a6b2", "#bfc2c8", "#d8d8d6", "#ecebe4")
ESCURA = pal("#140c08", "#22140c", "#331f12", "#462c18", "#5c3c20", "#764e2a", "#90643a")    # madeira de chalé antiga
LUZES = ("#ffd27a", "#ff5a4a", "#7aff8a", "#ffe9b0", "#7ab8ff", "#ffb040")


# ─────────────────────────────── Céu ───────────────────────────────
def pintar_ceu(nome: str, per: dict) -> np.ndarray:
    if not nevado():
        return nv.pintar_ceu(nome, per)
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip(YA / 110, 0, 1)[:, :, None]
    ceu = topo + (horiz - topo) * (t ** 0.8)
    ceu = ceu * (1 - 0.25 * np.exp(-((YA - 30) / 30) ** 2))[:, :, None] + meio * 0.25 * np.exp(-((YA - 30) / 30) ** 2)[:, :, None]
    # bancos de nuvem baixos e pesados, em degraus
    n = ruido_ret(901, 34, 9) * 0.6 + ruido(902, 12) * 0.3 + ruido(903, 4) * 0.1
    v = np.floor(np.clip((n - 0.45) * 3, 0, 1) * 4) / 4
    claro = horiz * 1.06 if nome != "noite" else meio * 1.1
    ceu = ceu * (1 - v[:, :, None] * 0.35) + claro * v[:, :, None] * 0.35
    if nome == "noite":   # o vale aceso de baixo tinge as nuvens de laranja-rosado
        ceu += (np.exp(-((YA - 96) / 34) ** 2) * 0.14)[:, :, None] * hexa("#ff9a6a")
    return ceu.astype(np.float32)


# ─────────────────────────────── Montanhas e paredões ───────────────────────────────
PICOS_LONGE = [(196, 52, 0.5, 0.5), (238, 34, 0.55, 0.48), (286, 20, 0.6, 0.5), (318, 7, 0.78, 0.62), (352, 18, 0.55, 0.5),
               (392, 13, 0.6, 0.62), (440, 30, 0.5, 0.5), (500, 40, 0.5, 0.5)]
PICOS_MEIO = [(204, 72, 0.4, 0.45), (262, 64, 0.5, 0.42), (302, 70, 0.45, 0.5), (356, 60, 0.5, 0.42), (420, 56, 0.5, 0.5)]


def topo_parede_esq() -> np.ndarray:
    xs = np.arange(W, dtype=np.float32)
    return 14 + xs * 0.2 + (ruido(311, 12)[0] - 0.5) * 6 + (ruido(312, 3)[0] - 0.5) * 2


def borda_parede_esq() -> np.ndarray:
    """O limite direito do paredão da esquerda em cada altura (contrafortes em zigue-zague)."""
    ys = np.arange(H, dtype=np.float32)
    return 206 - (ys - 50) * 0.06 + (ruido(313, 10)[:, 0] - 0.5) * 10 + (ruido(314, 3)[:, 0] - 0.5) * 3


def paredao(nome: str, per: dict, lado: str) -> Plano:
    """Paredão de calcário do vale: face com caneluras verticais (linhas de queda), faixas de rocha mais clara e
    escura, plataformas com neve, pinheiros nas saliências e a mata no alto."""
    P = Plano()
    L = normal3(per["L"])
    if lado == "e":
        topo = topo_parede_esq()[None, :]
        borda = borda_parede_esq()[:, None]
        m = (YA >= topo) & (XA <= borda) & (YA < 118)
        nx_face = 0.55          # a face olha para o vale (direita) e um pouco para nós
    else:
        xs = np.arange(W, dtype=np.float32)
        topo = (44 - (xs - 380) * 0.08 + (ruido(321, 10)[0] - 0.5) * 6)[None, :]
        borda = (366 + (YA[:, :1] - 40) * 0.12 + (ruido(322, 9)[:, :1] - 0.5) * 8)
        m = (YA >= topo) & (XA >= borda) & (YA < 118)
        nx_face = -0.55
    can = ruido_ret(330 + (lado == "d"), 2.4, 26)                   # caneluras verticais
    can2 = ruido_ret(332 + (lado == "d"), 7, 40)
    estr = ruido_ret(334 + (lado == "d"), 60, 3.0)                  # estratos horizontais
    nx = nx_face + (can - 0.5) * 1.4 + (can2 - 0.5) * 0.6
    ny = np.full_like(nx, 0.45)
    nz = 0.25 + (estr - 0.5) * 0.4
    nn = np.sqrt(nx * nx + ny * ny + nz * nz)
    D = np.clip((nx * L[0] + ny * L[1] + nz * L[2]) / nn, 0, 1)
    D = np.floor(D * 5 + BAYER_HW * 0.6) / 5
    rocha = pal(*per["rocha"], "#8a90a4", "#a8acbc") if not nevado() else pal("#4a5266", "#5e6678", "#727a8c", "#8a90a0", "#a0a6b4", "#b6bac6")
    k = np.clip((D * 4 + (estr - 0.5) * 1.6 + 0.6 + BAYER_HW * 0.7).astype(int), 0, 5)
    cor = rocha[k]
    # plataformas de neve: faixas finas onde o estrato "faz degrau" (e muito mais na nevasca)
    lim = 0.62 if not nevado() else 0.5
    plataforma = m & (estr > lim) & (np.abs(np.sin(YA * 0.55 + can2 * 3)) < (0.35 if not nevado() else 0.6))
    cor = np.where(plataforma[:, :, None], NEVE[np.clip((4 + D * 2.5).astype(int), 3, 6)], cor)
    # beirada de cima com cornija de neve
    beira = m & ~np.roll(m, 2, 0)
    cor = np.where(beira[:, :, None], NEVE[6], cor)
    P.c.mascara(m, cor)
    P.d = np.where(m, np.where(plataforma, direto(L, (0, 0.3, 1)), D * 0.8), 0).astype(np.float32)
    P.cint = (plataforma & (BAYER_HW > 0.3)).astype(np.float32) * 0.4
    # pinheiros na beira de cima e nas saliências
    g = np.random.default_rng(340 + (lado == "d"))
    if lado == "e":
        tp = topo_parede_esq()
        for x in range(-4, 212, 5):
            if g.random() < 0.85:
                yb = tp[int(np.clip(x, 0, W - 1))] + 3 + g.random() * 3
                pinheirinho(P, x + g.random() * 3, yb, 8 + g.random() * 7, L, seed=x * 7 + 1)
        for _ in range(26):
            x = g.random() * 190
            y = 40 + g.random() * 70
            if m[int(y), int(x)] and m[int(y) + 3, int(x)]:
                pinheirinho(P, x, y, 4 + g.random() * 5, L, seed=int(x * 31 + y))
    else:
        for x in range(372, W + 4, 5):
            yb = 44 - (x - 380) * 0.08 + 3 + g.random() * 3
            pinheirinho(P, x, yb, 7 + g.random() * 6, L, seed=x * 5 + 3)
    return P


def cachoeira(nome: str, per: dict) -> tuple[Plano, Camada]:
    """A cachoeira que cai do alto do paredão (a do vale das 72 cachoeiras), meio congelada: o véu d'água que o vento
    espalha, a cortina de gelo e pingentes na borda, o cone de gelo e a névoa no pé."""
    P = Plano()
    E = Camada()
    L = normal3(per["L"])
    x0, y0, y1 = 184, int(topo_parede_esq()[184]) + 2, 112
    g = np.random.default_rng(351)
    for y in range(y0, y1):
        f = (y - y0) / (y1 - y0)
        cx = x0 + 3 * f * f + math.sin(y * 0.21) * 0.6 * f
        larg = 1.2 + f * 4.2
        for x in range(int(cx - larg - 1), int(cx + larg + 2)):
            u = (x - cx) / larg
            if abs(u) > 1:
                continue
            fio = math.sin(x * 2.3 + y * 0.35) * 0.5 + 0.5
            k = int(np.clip(4 + fio * 2.4 - abs(u) * 2.0 + g.random() * 0.8 - f * 0.6, 1, 6))
            a = 1.0 if abs(u) < 0.55 else 0.55 + 0.35 * fio
            P.p(x, y, NEVE[k], 0.55 + 0.4 * fio, a=a, cint=0.25 if k >= 5 else 0)
    # cortina de gelo na borda de cima e pingentes pendurados na rocha ao lado
    for x in range(x0 - 7, x0 + 8):
        comp = int(2 + abs(math.sin(x * 1.7)) * 7 + g.random() * 3)
        for k in range(comp):
            P.p(x, y0 + k, "#d8ecff" if k < comp - 1 else "#ffffff", 0.7, cint=0.5 if k == comp - 1 else 0)
    # cone de gelo no pé e névoa
    for y in range(y1 - 7, y1 + 1):
        r = (y - (y1 - 7)) * 1.4 + 2
        for x in range(int(x0 + 3 - r), int(x0 + 3 + r) + 1):
            P.p(x, y, NEVE[6 if (x + y) % 3 else 5], direto(L, (0, 0.3, 1)), cint=0.5)
    for _ in range(90):
        x = x0 + 3 + g.normal(0, 6)
        y = y1 - 3 - abs(g.normal(0, 4))
        E.p(x, y, "#e8f2ff", 0.10 + g.random() * 0.12)
    return P, E


# ─────────────────────────────── O vale lá embaixo ───────────────────────────────
PREFEITURA = (330, 95)            # base da torre do relógio (o salão vai para a direita), logo atrás do trilho
TRILHO = [(150, 104), (230, 101), (300, 99), (372, 97)]


def trilho_y(x: float) -> float:
    for (xa, ya), (xb, yb) in zip(TRILHO[:-1], TRILHO[1:]):
        if xa <= x <= xb:
            return ya + (yb - ya) * (x - xa) / (xb - xa)
    return TRILHO[0][1] if x < TRILHO[0][0] else TRILHO[-1][1]


def vale(nome: str, per: dict) -> tuple[Plano, Camada, list]:
    """O fundo do vale visto do alto: campos de neve em perspectiva, o rio, cercas, bosques, casinhas, a prefeitura e o
    trilho. Devolve o plano, os emissivos (janelas) e as luzinhas do vale."""
    P = Plano()
    E = Camada()
    L = normal3(per["L"])
    luzes = []
    fundo = 84
    m = YA >= fundo + (ruido(361, 14)[0][None, :] - 0.5) * 3
    # campos: relevo suave, divididos por sebes e cercas
    v = 0.62 + (ruido(362, 18) - 0.5) * 0.3 + (ruido(363, 5) - 0.5) * 0.12 + (YA - fundo) / 60 * 0.18
    k = pontilhar(np.clip(v, 0, 1), 4, 0.5) + 2
    cor = NEVE[np.clip(k, 0, 6)]
    P.c.mascara(m, cor)
    P.d = np.where(m, direto(L, (0, 0.6, 0.8)) * 0.95, 0).astype(np.float32)
    P.cint = (m & (BAYER_HW > 0.42)).astype(np.float32) * 0.15
    # o rio: serpenteia do fundo (centro) até a frente à esquerda
    for y in range(fundo + 2, BEIRA + 2):
        f = (y - fundo) / (BEIRA - fundo)
        cx = 292 - f * 64 + math.sin(f * 7.5) * 9
        larg = 0.6 + f * 1.8
        for x in range(int(cx - larg), int(cx + larg) + 1):
            P.p(x, y, "#1c2a3c" if (x + y) % 4 else "#3a5272", 0.3)
        P.p(cx - larg - 1, y, NEVE[2], 0.4)
    # bosques escuros (pinheirinhos juntos), mais miúdos no fundo
    g = np.random.default_rng(364)
    for (bx, by, n, esp) in ((214, 96, 9, 3.0), (262, 92, 7, 2.6), (372, 93, 6, 2.6), (232, 112, 10, 3.6), (360, 108, 6, 3.4),
                             (282, 116, 7, 3.8), (206, 120, 8, 4.0)):
        for i in range(n):
            x = bx + (i - n / 2) * esp + g.normal(0, 1)
            y = by + g.normal(0, 1.2)
            esc = 0.6 + (y - fundo) / 40
            pinheirinho(P, x, y, 3 + esc * 3 + g.random() * 2, L, seed=int(x * 11 + y))
    # cercas: linhas pontilhadas de moirões com neve
    for (xa, ya, xb, yb) in ((208, 108, 266, 104), (300, 112, 360, 116), (246, 92, 300, 90), (216, 124, 262, 120)):
        n = int(abs(xb - xa))
        for i in range(n):
            x = xa + (xb - xa) * i / n
            y = ya + (yb - ya) * i / n
            if i % 3 == 0:
                P.p(x, y - 1, "#3a2a20", 0.4)
            P.p(x, y, "#4a3a2c" if i % 2 else "#6a5444", 0.5)
    # o trilho do trem de montanha (com a cremalheira): dois fios escuros e o leito sem neve
    for x in range(int(TRILHO[0][0]), int(TRILHO[-1][0])):
        y = trilho_y(x)
        P.p(x, y + 1, "#5a5662", 0.5)
        P.p(x, y, "#2a2830", 0.4)
        if x % 4 == 0:
            P.p(x, y + 1, "#3a2a20", 0.3)
    # casinhas: telhado de neve, parede de madeira, janelas acesas (mais à noite)
    casas = [(222, 103, 6), (236, 98, 5), (252, 106, 6), (270, 97, 5), (288, 104, 6), (300, 110, 7), (346, 106, 6), (366, 104, 5),
             (338, 114, 7), (366, 116, 7), (244, 118, 7), (214, 114, 6), (280, 92, 4), (316, 93, 4)]
    for (cx, cy, s) in casas:
        casinha(P, E, cx, cy, s, L, luzes, nome)
    prefeitura(P, E, L, luzes, nome)
    if nome == "manha" and not nevado():
        # o sol baixo da manhã vem da direita: o paredão da cachoeira ainda deixa a metade de cá do vale na sombra azul,
        # com a borda serrilhada das copas; a outra metade já brilha (o contraste que faltava lá embaixo)
        borda = 262 + (YA - fundo) * 1.1 + (ruido(366, 6) - 0.5) * 10 + (ruido(367, 2) - 0.5) * 4
        na_sombra = XA < borda
        P.d = np.where(na_sombra, P.d * 0.22, P.d * 1.08).astype(np.float32)
        P.cint = np.where(na_sombra, 0, P.cint).astype(np.float32)
        # a sombra azul fria e o lado do sol um pouco mais quente: a cor também separa as duas metades
        rgb = P.c.c[:, :, :3]
        P.c.c[:, :, :3] = np.where(na_sombra[:, :, None], rgb * np.array([0.7, 0.77, 0.94], np.float32),
                                   np.clip(rgb * np.array([1.05, 1.01, 0.93], np.float32), 0, 1))
    return P, E, luzes


def casinha(P: Plano, E: Camada, cx: int, cy: int, s: int, L, luzes: list, nome: str) -> None:
    alt = max(3, int(s * 0.7))
    d_f = direto(L, (0, 1, 0.1))
    for y in range(cy - alt, cy + 1):
        for x in range(cx - s // 2, cx + s // 2 + 1):
            P.p(x, y, ESCURA[4 if x < cx else 3] if (y + x) % 5 else ESCURA[2], d_f * 0.9)
    # telhado largo de chalé, carregado de neve
    for k in range(s // 2 + 2):
        y = cy - alt - 1 - k * 0.55
        for x in range(cx - s // 2 - 2 + k, cx + s // 2 + 3 - k):
            P.p(x, y, NEVE[6] if k else NEVE[5], direto(L, (0, 0.3, 1)), cint=0.6)
    P.p(cx - s // 2 - 2, cy - alt, NEVE[3], 0.5)
    P.p(cx + s // 2 + 2, cy - alt, NEVE[3], 0.5)
    acesa = nome == "noite" or (nome == "tarde" and (cx * 7) % 3 == 0) or nevado()
    for jx in (cx - s // 4, cx + s // 4):
        if (jx + cy) % 3 == 0 and not acesa:
            continue
        cor = "#ffc66a" if acesa else "#2a3040"
        P.p(jx, cy - alt // 2, cor, 0.0 if acesa else 0.3)
        if acesa:
            E.p(jx, cy - alt // 2, cor, 1.0)
            luzes.append((jx, cy - alt // 2))


def prefeitura(P: Plano, E: Camada, L, luzes: list, nome: str) -> None:
    """A prefeitura do vale (12/11/2026: sem símbolo religioso, docs/design/DIRECAO-ARTISTICA.md), logo atrás do trilho:
    a torre do relógio de reboco branco com cunhais de pedra, o relógio dourado, o mirante com duas aberturas, a flecha
    de ardósia com neve e a bandeirinha vermelha no mastro; à direita, o salão de dois andares com o telhado escuro de
    ardósia carregado de neve, as janelas com venezianas (acesas à tarde, à noite e na nevasca) e o muro da praça."""
    bx, by = PREFEITURA
    lado = 1 if L[0] > 0 else -1
    d_f = direto(L, (0, 1, 0.15))
    d_luz = direto(L, (0.9 * lado, 0.35, 0.2))
    d_somb = direto(L, (-0.9 * lado, 0.35, 0.2))
    d_teto = direto(L, (0, 0.35, 1))
    ARD = ("#161a22", "#1f2430", "#2a313f", "#38404f", "#4a5364")
    acesa = nome != "manha" or nevado()
    # ── o salão (à direita da torre): parede de reboco com o lado da luz mais claro, rodapé de pedra
    nx0, nx1, alt = bx + 4, bx + 27, 11
    for y in range(by - alt, by + 1):
        for x in range(nx0, nx1 + 1):
            u = (x - nx0) / (nx1 - nx0)
            k = 5 if y > by - alt + 1 else 6
            if (x * 3 + y * 5) % 11 == 0:
                k -= 1
            if y >= by - 1:
                k = 2 if (x + y) % 3 else 1          # rodapé de pedra
            if y == by - 6:
                k = 4                                # friso entre os andares
            P.p(x, y, REBOCO[k], d_f * (0.85 + 0.15 * (u if lado > 0 else 1 - u)))
    for x in range(nx0, nx1 + 1):
        P.p(x, by - alt, REBOCO[3], d_f * 0.6)
    # telhado de ardósia visto de lado: faixa inclinada com beiral, neve em cima
    for k in range(6):
        y = by - alt - 1 - k
        x0, x1 = nx0 - 2 + k // 2, nx1 + 2 - k // 2
        for x in range(x0, x1 + 1):
            if k >= 4:
                P.p(x, y, NEVE[6] if k == 5 else NEVE[5], d_teto, cint=0.6)
            elif k == 3 and (x * 7) % 5 < 3:
                P.p(x, y, NEVE[4], d_teto, cint=0.5)
            else:
                t = ARD[3 if k == 0 else 2] if (x + k) % 4 else ARD[1]
                P.p(x, y, t, d_teto * 0.7)
        P.p(x0, y, ARD[0], 0.2)
    for x in range(nx0 - 2, nx1 + 3, 3):           # pingentes de neve no beiral
        P.p(x, by - alt, NEVE[5], d_teto * 0.8, cint=0.4)
    # janelas retangulares em dois andares, com venezianas vermelhas e o peitoril com neve
    for jx in range(nx0 + 3, nx1 - 1, 5):
        for y0 in (by - 9, by - 4):
            for y in (y0, y0 + 1):
                for dx in (0, 1):
                    cor = ("#ffd27a" if y == y0 else "#ffb24a") if acesa else ("#24304a" if dx == 0 else "#3a4a66")
                    P.p(jx + dx, y, cor, 0.0 if acesa else 0.35)
                    if acesa:
                        E.p(jx + dx, y, cor, 0.95)
                P.p(jx - 1, y, VERMELHO[2], d_f * 0.7)
                P.p(jx + 2, y, VERMELHO[3], d_f * 0.8)
            P.p(jx, y0 + 2, NEVE[5], d_teto, cint=0.4)
            P.p(jx + 1, y0 + 2, NEVE[6], d_teto, cint=0.4)
            luzes.append((jx, y0))
    # ── a torre: reboco branco com cunhais de pedra alternados, lado da luz e lado da sombra
    tx0, tx1, ttopo = bx - 3, bx + 3, by - 27
    for y in range(ttopo, by + 1):
        for x in range(tx0, tx1 + 1):
            borda = x in (tx0, tx1)
            frente_luz = (x - bx) * lado > 0
            k = 6 if frente_luz else 4
            if x == bx:
                k = 5
            if borda and ((y - ttopo) // 2) % 2 == 0:
                k = 2 if not frente_luz else 3          # cunhal de pedra
            if y >= by - 1:
                k = 2 if (x + y) % 3 else 1
            P.p(x, y, REBOCO[k], d_luz if frente_luz else (d_somb if x != bx else d_f))
    # cornijas que marcam os andares
    for yc in (by - 13, ttopo + 7, ttopo):
        for x in range(tx0 - 1, tx1 + 2):
            P.p(x, yc, REBOCO[3] if x not in (tx0 - 1, tx1 + 1) else REBOCO[2], d_f * 0.8)
        for x in range(tx0, tx1 + 1, 2):
            P.p(x, yc - 1, NEVE[5], d_teto, cint=0.5)
    # porta de madeira em arco com a guirlanda e o degrau de neve
    for y in range(by - 5, by + 1):
        for x in range(bx - 1, bx + 2):
            if y == by - 5 and x != bx:
                continue
            P.p(x, y, ESCURA[3] if x == bx else ESCURA[2], 0.3)
    P.p(bx, by - 6, "#2a5a32", 0.3)
    P.p(bx, by - 4, "#c8323a", 0.5)
    for x in range(bx - 2, bx + 3):
        P.p(x, by + 1, NEVE[6], d_teto, cint=0.6)
    # janela redonda acima da porta
    P.p(bx, by - 10, "#ffcf70" if acesa else "#2a3650", 0.0 if acesa else 0.3)
    if acesa:
        E.p(bx, by - 10, "#ffcf70", 0.85)
    # relógio dourado: aro de ouro, mostrador claro e os ponteiros
    cy_r = by - 19
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            r2 = dx * dx + dy * dy
            if r2 > 5:
                continue
            if r2 >= 4:
                cor = "#d4a640" if (dx * lado + dy) < 0 else "#a87a28"
            else:
                cor = "#f6eed2"
            P.p(bx + dx, cy_r + dy, cor, 0.95)
    P.p(bx, cy_r - 1, "#2a1a0c", 0.5)
    P.p(bx, cy_r, "#2a1a0c", 0.5)
    P.p(bx + 1, cy_r, "#2a1a0c", 0.5)
    if nome == "noite" or nevado():
        for (dx, dy) in ((-1, -1), (1, 1), (-1, 1), (1, -1)):
            E.p(bx + dx, cy_r + dy, "#ffe8a8", 0.8)
    # o mirante da torre: duas aberturas em arco
    for ax in (bx - 2, bx + 1):
        for y in range(ttopo + 2, ttopo + 6):
            if y == ttopo + 2:
                P.p(ax + (1 if ax < bx else 0), y, "#141820", 0.1)
                continue
            for dx in (0, 1):
                P.p(ax + dx, y, "#141820", 0.1)
    # a flecha de ardósia: lado da luz e da sombra, faixas de neve presas nas juntas; no alto, o mastro e a bandeira
    alt_f = 17
    for k in range(alt_f):
        y = ttopo - 1 - k
        meia = 3.6 * (1 - k / alt_f) ** 1.1
        for x in range(int(round(bx - meia)), int(round(bx + meia)) + 1):
            luz_lado = (x - bx) * lado > 0 or x == bx
            t = ARD[3] if luz_lado else ARD[1]
            if (k % 4 == 1) and abs(x - bx) <= meia - 0.5:
                t = NEVE[5] if luz_lado else NEVE[3]
            P.p(x, y, t, d_luz * 0.8 if luz_lado else d_somb * 0.5, cint=0.4 if t in NEVE else 0)
    yt = ttopo - alt_f - 1
    P.p(bx, yt, "#f4d478", 0.9)                     # a bola dourada da ponta
    for k in range(1, 6):                           # o mastro fino
        P.p(bx, yt - k, "#8a8e98" if k % 2 else "#6a6e78", 0.6)
    for dy in (5, 4, 3):                            # a bandeirinha vermelha ao vento, para o lado de cá
        for dx in range(1, 4 - (dy == 3)):
            P.p(bx + dx, yt - dy, VERMELHO[4] if dy == 5 else VERMELHO[3], 0.7)
    P.p(bx + 1, yt - 4, "#f0ead8", 0.8)             # a faixa clara da bandeira
    # o muro baixo da praça, com neve em cima, e os dois lampiões do portão
    for x in range(bx - 6, nx1 + 4):
        P.p(x, by + 2, "#5a5c66" if x % 3 else "#46484f", 0.5)
        P.p(x, by + 1, NEVE[6] if x % 5 else NEVE[5], d_teto, cint=0.5)
    for gx in (bx - 5, bx + 5):
        P.p(gx, by, "#3a3c44", 0.3)
        P.p(gx, by - 1, "#ffcf70" if acesa else "#c8b890", 0.0 if acesa else 0.6)
        if acesa:
            E.p(gx, by - 1, "#ffcf70", 0.9)


# ─────────────────────────────── O terraço ───────────────────────────────
PORTA = (446, 152)
PEGADAS = [(PORTA[0] - 8, PORTA[1] + 2), (420, 160), (392, 164), (360, 168), (322, 166), (296, 162), (270, 160)]
PEGADAS_ESQ = [(226, 160), (206, 166), (176, 170), (146, 176), (112, 186), (84, 198)]
TRENO = (330, 372, 182)
CESTO = (208, 172)
PLACA = (150, 158)
PINHEIRINHO = (364, 152)
POSTE = (322, 145)
TERRACO = (BEIRA + (ruido(371, 9)[0] - 0.5) * 2.5).astype(np.float32)


def caminho_pontos(pts, passo: float = 4.5):
    return nv.caminho_pontos(pts, passo)


def pintar_terraco(nome: str, per: dict) -> tuple[Plano, np.ndarray]:
    P = Plano()
    L = normal3(per["L"])
    fx, fy = FOGO
    nev = nevado()
    h = (ruido(372, 40) - 0.5) * 6 + (ruido(373, 14) - 0.5) * 2.6
    ondas = ruido_ret(374, 16, 3.0) * 0.7 + ruido_ret(375, 7, 2.0) * 0.3
    h += (ondas - 0.5) * (2.0 if not nev else 3.2) * suave(BEIRA, 160, YA)
    h += np.exp(-((XA - 60) / 70) ** 2) * np.exp(-((YA - 176) / 34) ** 2) * 6          # duna grande à esquerda
    h += np.exp(-((XA - 430) / 50) ** 6) * np.exp(-((YA - 154) / 4.5) ** 2) * 2.4       # monte junto ao chalé
    pisado = np.zeros((H, W), np.float32)
    pits = np.zeros((H, W), np.float32)
    if not nev:
        trilha = np.full((H, W), 1e9, np.float32)
        for trajeto in (PEGADAS, [PEGADAS[-1]] + PEGADAS_ESQ):
            for (x0, y0), (x1, y1) in zip(trajeto[:-1], trajeto[1:]):
                vx, vy = x1 - x0, y1 - y0
                t = np.clip(((XA - x0) * vx + (YA - y0) * vy) / (vx * vx + vy * vy), 0, 1)
                trilha = np.minimum(trilha, np.hypot(XA - (x0 + t * vx), (YA - (y0 + t * vy)) * 1.6))
        pisado = np.clip(1 - trilha / 5, 0, 1)
        h = h * (1 - pisado * 0.7) - pisado * 0.8
        for trajeto in (PEGADAS, [PEGADAS[-1]] + PEGADAS_ESQ):
            for i, (x, y, ang) in enumerate(caminho_pontos(trajeto, 4.2)):
                lado = 1.5 if i % 2 else -1.5
                px = x - math.sin(ang) * lado * 0.6
                py = y + math.cos(ang) * lado
                pits += (((XA - px) / 1.3) ** 2 + ((YA - py) / 0.9) ** 2 < 1).astype(np.float32)
        h -= pits * 1.5
        # rastro do trenó: dois sulcos que vêm da direita até ele
        for off in (0, 6):
            for k in range(130):
                x = TRENO[1] + 2 + k
                y = TRENO[2] - 3 + off * 0.5 - k * 0.08 + math.sin(k / 26) * 1.5 + off
                if x < W and y < H:
                    h[int(y), int(x)] -= 1.1
    # derretido em volta da fogueira (na nevasca, menor: a neve nova volta a cobrir a beirada)
    borda = (ruido(376, 3) - 0.5) * 0.5
    dfo = ((XA - fx) / (29 if not nev else 24)) ** 2 + ((YA - fy - 1) / (9.5 if not nev else 8)) ** 2
    molhado = dfo < 1 + borda
    lama = dfo < 0.55 + borda * 0.6
    h = np.where(molhado, np.minimum(h, -0.8), h)
    h += np.clip(1.3 - np.abs(dfo - 1.15) * 3, 0, 1) * 1.2
    hx = np.zeros_like(h)
    hy = np.zeros_like(h)
    hx[:, 1:-1] = (h[:, 2:] - h[:, :-2]) * 0.5
    hy[1:-1, :] = (h[2:, :] - h[:-2, :]) * 0.5
    nx, ny, nz = -hx * 0.9, -hy * 1.3 + 0.25, np.ones_like(h)
    nn = np.sqrt(nx * nx + ny * ny + nz * nz)
    D = np.clip((nx * L[0] + ny * L[1] + nz * L[2]) / nn, 0, 1)
    D = np.clip(D * 2.1 - 0.06, 0, 1.0)
    cav = np.clip(-(h - desfocar(h[:, :, None], 3)[:, :, 0]) * 0.8, -1, 1)
    v = 0.62 + (ruido(377, 2) - 0.5) * 0.25 - cav * 0.25 - pisado * 0.18 - pits * 0.2 + (0.06 if nev else 0)
    k = pontilhar(np.clip(v, 0, 1), 4, 0.35) + 2
    cor = NEVE[np.clip(k, 0, 6)]
    terra = pal("#120e0c", "#1a1410", "#241a14", "#30241a", "#3e3024")
    kt = pontilhar(np.clip(0.45 + (ruido(378, 2) - 0.5) * 0.7 - (1 - dfo) * 0.3, 0, 1), 5, 0.9)
    lama_neve = pal("#4a4a56", "#646672", "#80848e")[pontilhar(np.clip(0.5 + (ruido(379, 1.5) - 0.5), 0, 1), 3, 0.9)]
    cor = np.where(molhado[:, :, None], np.where(lama[:, :, None], terra[kt], lama_neve), cor)
    chao = YA >= TERRACO[None, :]
    beira = chao & (YA < TERRACO[None, :] + 2)
    cor = np.where(beira[:, :, None], NEVE[6], cor)
    P.c.mascara(chao, cor)
    D = np.floor(D * 6 + BAYER_HW * 0.3 + 0.45) / 6
    P.d = np.where(chao, np.where(molhado, D * 0.6, D), 0).astype(np.float32)
    gr = np.random.default_rng(380).random((H, W))
    P.cint = (chao & ~molhado & (gr < (0.05 if not nev else 0.03))).astype(np.float32) * np.clip(D * 1.4, 0, 1)
    g = np.random.default_rng(381)
    for _ in range(26):
        a = g.random() * math.tau
        r = 0.6 + g.random() * 0.35
        x, y = fx + math.cos(a) * 25 * r, fy + 1 + math.sin(a) * 8.5 * r
        if molhado[int(y), int(x)]:
            P.p(x, y, ["#141010", "#4a4a50", "#6a5038"][int(g.random() * 3)], D[int(y), int(x)] * 0.5)
    P.normal = (nx / nn, ny / nn, nz / nn)
    P.chao = chao & ~molhado
    return P, molhado


def esp_neve(base: float) -> float:
    return base * (1.7 if nevado() else 1.0)


def guarda_corpo(P: Plano, E: Camada, L, luzes: list) -> None:
    """O guarda-corpo do terraço: moirões, corrimão e tábuas recortadas (o recorte de coração dos chalés), com a
    guirlanda de pinheiro em festões, os laços vermelhos nos moirões e as luzinhas acesas na guirlanda."""
    x0, x1 = 122, 394
    t = Camada()
    d_f = direto(L, (0, 1, 0.15))
    postes = list(range(x0, x1 + 1, 24))
    for xp in postes:
        yb = int(TERRACO[min(xp, W - 1)]) + 1
        for y in range(yb - 13, yb + 1):
            t.p(xp, y, ESCURA[5])
            t.p(xp + 1, y, ESCURA[3])
            t.p(xp + 2, y, ESCURA[1])
        t.p(xp, yb - 14, ESCURA[6])
        t.p(xp + 1, yb - 14, ESCURA[5])
        t.p(xp + 2, yb - 14, ESCURA[3])
    for x in range(x0, x1 + 3):
        yb = int(TERRACO[min(x, W - 1)]) + 1
        t.p(x, yb - 12, ESCURA[6])         # corrimão
        t.p(x, yb - 11, ESCURA[4])
        t.p(x, yb - 10, ESCURA[2])
        t.p(x, yb - 2, ESCURA[3])          # travessa de baixo
        t.p(x, yb - 1, ESCURA[1])
        # tábuas recortadas: 3 px de tábua, 1 px de vão; o recorte de coração no meio de cada tábua
        r = (x - x0) % 4
        if r < 3:
            for y in range(yb - 9, yb - 2):
                k = [5, 4, 2][r]
                if (y == yb - 6 and r == 1) or (y == yb - 5 and r in (0, 2)) or (y == yb - 4 and r == 1):
                    continue                # o vão em coração
                t.p(x, y, ESCURA[k] if (x * 7 + y) % 11 else ESCURA[k - 1])
    m = t.c[:, :, 3] > 0.4
    P.juntar(t, np.where(m, d_f, 0).astype(np.float32), base=BEIRA + 1)
    nevar(P, m, L, 391, esp=esp_neve(1.6), lumps=0.8, base=BEIRA + 1)
    # guirlanda em festões entre os moirões, com laço vermelho em cada moirão e luzinhas
    g = np.random.default_rng(392)
    for i, (xa, xb) in enumerate(zip(postes[:-1], postes[1:])):
        for k in range(xb - xa + 1):
            f = k / (xb - xa)
            x = xa + 1 + k
            yb = int(TERRACO[min(int(x), W - 1)]) + 1
            y = yb - 12 + math.sin(f * math.pi) * 4.5
            for dy in (-1, 0, 1):
                tom = 2 + ((x + dy * 3) % 3) + (dy < 0)
                P.p(x, y + dy, VERDE_PINHO[min(6, tom)], direto(L, (0, 0.8, 0.5)) * 0.8)
            if (x + i) % 3 == 0:
                P.p(x, y + 2, VERDE_PINHO[1], 0.4)
            if k % 5 == 2:
                cor = LUZES[(k // 5 + i) % len(LUZES)]
                P.p(x, y + 1, cor, 0.0)
                E.p(x, y + 1, cor, 1.0)
                luzes.append((x, y + 1, cor))
            if nevado() and g.random() < 0.35:
                P.p(x, y - 1, NEVE[6], direto(L, (0, 0.3, 1)), cint=0.6)
    for xp in postes:
        yb = int(TERRACO[min(xp, W - 1)]) + 1
        laco(P, xp + 1, yb - 12, L)


def laco(P: Plano, x: int, y: int, L) -> None:
    """Laço de fita vermelha com as duas pontas caídas."""
    d = direto(L, (0, 0.9, 0.4))
    for (dx, dy, k) in ((-2, -1, 4), (-1, -1, 5), (-1, 0, 3), (-2, 0, 2), (1, -1, 5), (2, -1, 4), (1, 0, 3), (2, 0, 2), (0, 0, 5),
                        (-1, 1, 3), (-1, 2, 2), (-2, 3, 1), (1, 1, 3), (1, 2, 2), (2, 3, 1)):
        P.p(x + dx, y + dy, VERMELHO[k], d)


# ─────────────────────────────── O chalé ───────────────────────────────
CH = dict(x0=400, x1=490, chao=152, terreo=30, apice=(446, 38), beiral=70, incl=1.94)


def chale(P: Plano, E: Camada, per: dict, nome: str, luzes: list) -> tuple[list, list, list]:
    """O chalé suíço visto de frente: térreo de alvenaria branca, andar de madeira escura com a sacada recortada,
    telhado largo de duas águas carregado de neve, cordão de luzes no beiral, estrela do Advento no sótão.
    Devolve as janelas [(x0, y0, x1, y1)], os lampiões [(x, y)] e os pingentes."""
    L = normal3(per["L"])
    x0, x1, ch = CH["x0"], CH["x1"], CH["chao"]
    ax, ay = CH["apice"]
    d_f = direto(L, (0, 1, 0.08))
    d_teto = direto(L, (0.2 * np.sign(L[0]), 0.3, 0.95))
    janelas, lampioes, pingentes = [], [], []
    y_terreo = ch - CH["terreo"]                       # 122: o térreo de alvenaria
    y_sacada = y_terreo - 6                            # 116: o piso da sacada
    incl = CH["incl"]                                  # meia largura da fachada sob o telhado, por pixel de altura
    veio = ruido_ret(401, 7, 1)
    # ── térreo de alvenaria: reboco branco com pedras aparecendo, cunhais de pedra no canto
    for y in range(y_terreo, ch + 1):
        for x in range(x0, min(W, x1)):
            v = 4.6 + (ruido(402, 3)[y, x] - 0.5) * 1.8 + (0.6 if y < y_terreo + 2 else 0)
            k = int(np.clip(v + BAYER_HW[y, x] * 0.6, 2, 6))
            P.p(x, y, REBOCO[k], d_f)
    g = np.random.default_rng(403)
    for _ in range(14):                                # pedras onde o reboco caiu
        px, py = int(x0 + 3 + g.random() * (W - x0 - 6)), int(y_terreo + 3 + g.random() * 20)
        for (dx, dy) in ((0, 0), (1, 0), (2, 0), (0, 1), (1, 1)):
            P.p(px + dx, py + dy, PEDRA_CHAM[3 + ((dx + dy) % 2)], d_f * 0.9)
        P.p(px, py + 2, PEDRA_CHAM[1], d_f * 0.6)
    for y in range(y_terreo, ch + 1, 4):               # cunhal de pedra no canto da esquerda
        for x in range(x0, x0 + (5 if (y // 4) % 2 else 3)):
            P.p(x, y, PEDRA_CHAM[4], d_f)
            P.p(x, y + 1, PEDRA_CHAM[3], d_f)
            P.p(x, y + 2, PEDRA_CHAM[3], d_f)
            P.p(x, y + 3, PEDRA_CHAM[1], d_f * 0.6)
    for x in range(x0 - 1, W):                         # embasamento
        P.p(x, ch + 1, PEDRA_CHAM[2 + (x % 5 == 0)], d_f * 0.8)
        P.p(x, ch + 2, PEDRA_CHAM[1], d_f * 0.6)
    # ── andar de madeira (toras de 3 px) entre o térreo e a empena, recortado pela linha do telhado
    y_emp = ay + 46                                    # 84: daqui para cima, a empena de tábuas
    for y in range(ay + 6, y_terreo):
        meia = (y - ay - 6) * incl
        for x in range(max(x0, int(ax - meia)), min(W, int(ax + meia) + 1)):
            if y >= y_emp:
                r = (y - y_emp) % 3
                k = [4, 3, 1][r] + (veio[y, x] - 0.5) * 2.2 + (0.6 if (x * 13 + y * 7) % 37 == 0 else 0)
                P.p(x, y, ESCURA[int(np.clip(k, 0, 6))], d_f * (1.0 if r == 0 else 0.85))
            else:                                      # empena em tábuas verticais com mata-juntas
                tab = (x - ax) % 5
                k = [3, 4, 4, 3, 1][tab] + (veio[y, x * 3 % W] - 0.5) * 1.6
                P.p(x, y, ESCURA[int(np.clip(k, 0, 6))], d_f * 0.95)
    for x in range(x0, W):   # viga entre a empena e o andar, com dentículos entalhados
        P.p(x, y_emp - 1, ESCURA[6], d_f)
        P.p(x, y_emp, ESCURA[2], d_f)
        if x % 3 == 0:
            P.p(x, y_emp + 1, ESCURA[5], d_f)
    for x in range(x0, W):                              # viga entre a sacada e o térreo
        for e, k in enumerate((5, 3, 2, 1)):
            P.p(x, y_terreo - 4 + e, ESCURA[k], d_f)
    # ── estrela do Advento na janelinha do sótão (a estrela de muitas pontas, acesa)
    jx, jy = ax, ay + 26
    for y in range(jy - 5, jy + 6):
        for x in range(jx - 4, jx + 5):
            borda = abs(x - jx) == 4 or abs(y - jy) == 5
            if borda:
                P.p(x, y, ESCURA[6] if y == jy - 5 else ESCURA[1], d_f)
            else:
                P.p(x, y, "#3a2010", 0.0)
                E.p(x, y, "#ff9a40", 0.35)
    estrela = ["....#....", "..#.#.#..", "...###...", ".#######.", "...###...", "..#.#.#..", "....#...."]
    for j, linha in enumerate(estrela):
        for i, c in enumerate(linha):
            if c == "#":
                cor = "#fff4c8" if (i == 4 and j == 3) else "#ffd870"
                P.p(jx - 4 + i, jy - 3 + j, cor, 0.0)
                E.p(jx - 4 + i, jy - 3 + j, cor, 1.0)
    lampioes.append((jx, jy))
    for x in range(jx - 5, jx + 6):                    # peitoril com neve
        P.p(x, jy + 6, ESCURA[5], d_f)
        P.p(x, jy + 5, NEVE[6], d_teto, cint=1)
    # ── janelas do andar (duas pequenas, acesas, com cortina)
    for jx0 in (414, 466):
        janela(P, E, jx0, y_sacada - 25, 9, 9, L, janelas, venezianas=False, cortina=True)
    # ── sacada: piso, consoles, balaústre recortado, guirlanda com luzes e laços
    for x in range(x0 - 4, W):
        P.p(x, y_sacada, ESCURA[6], d_f)
        P.p(x, y_sacada + 1, ESCURA[3], d_f)
        P.p(x, y_sacada + 2, ESCURA[1], d_f * 0.5)
    for xc in range(x0, W, 14):                        # consoles entalhados embaixo da sacada
        for k in range(4):
            P.p(xc + k * 0.4, y_sacada + 3 + k, ESCURA[4 - k // 2], d_f)
            P.p(xc + 1 + k * 0.4, y_sacada + 3 + k, ESCURA[2], d_f)
    for x in range(x0 - 4, W):
        r = (x - x0) % 4
        P.p(x, y_sacada - 11, ESCURA[6], d_f)
        P.p(x, y_sacada - 10, ESCURA[4], d_f)
        if r < 3:
            for y in range(y_sacada - 9, y_sacada):
                if (y == y_sacada - 6 and r == 1) or (y == y_sacada - 5 and r in (0, 2)) or (y == y_sacada - 4 and r == 1):
                    P.p(x, y, "#1a0e08", 0.2)
                    continue
                P.p(x, y, ESCURA[[5, 4, 2][r]], d_f)
    for x in range(x0 - 4, W):                         # neve no corrimão da sacada
        P.p(x, y_sacada - 12, NEVE[6], d_teto, cint=0.8)
        if nevado() or x % 3:
            P.p(x, y_sacada - 13, NEVE[5] if nevado() else NEVE[6], d_teto, cint=0.4)
    for k in range(W - x0 + 4):                        # guirlanda da sacada em festões
        x = x0 - 4 + k
        f = (k % 22) / 22
        y = y_sacada - 10 + math.sin(f * math.pi) * 3.5
        for dy in (-1, 0, 1):
            P.p(x, y + dy, VERDE_PINHO[2 + ((x + dy) % 3) + (dy < 0)], d_f * 0.8)
        if k % 4 == 1:
            cor = LUZES[(k // 4) % len(LUZES)]
            P.p(x, y + 1, cor, 0.0)
            E.p(x, y + 1, cor, 1.0)
            luzes.append((x, y + 1, cor))
        if k % 22 == 0:
            laco(P, x, y_sacada - 11, L)
    # ── janelas do térreo com venezianas de chamas vermelhas e brancas; a da esquerda mostra a árvore de Natal
    janela(P, E, 413, y_terreo + 6, 12, 12, L, janelas, venezianas=True, arvore=True)
    janela(P, E, 456, y_terreo + 6, 10, 12, L, janelas, venezianas=True)
    # porta com guirlanda (à direita, saindo do quadro)
    dx0 = 478
    for y in range(y_terreo + 3, ch + 1):
        for x in range(dx0, W):
            tab = (x - dx0) % 3
            P.p(x, y, ESCURA[[4, 3, 2][tab]], d_f * 0.8)
    for x in range(dx0 - 1, W):
        P.p(x, y_terreo + 2, ESCURA[6], d_f)
    for y in range(y_terreo + 3, ch + 1):
        P.p(dx0 - 1, y, ESCURA[5], d_f)
    guirlanda_porta(P, E, dx0 + 1, y_terreo + 10, L, luzes)
    # sino de vaca pendurado com a correia bordada
    sino(P, 470, y_terreo + 4, L)
    # lampião de parede entre as janelas
    lampiao(P, E, 440, y_terreo + 7)
    lampioes.append((440, y_terreo + 10))
    # ── telhado de duas águas: a beirada larga vista de frente, carregado de neve, com caibros entalhados
    beir = CH["beiral"]
    esq = (x0 - 24, beir + 4)
    dir_ = (W + 40, beir + 4)
    esp_t = int(round(esp_neve(6)))
    # parte de baixo do beiral (madeira escura com as pontas dos caibros)
    for (a_, b_) in ((CH["apice"], esq), (CH["apice"], dir_)):
        n = int(max(abs(b_[0] - a_[0]), abs(b_[1] - a_[1]))) + 1
        for i in range(n + 1):
            t_ = i / n
            x = a_[0] + (b_[0] - a_[0]) * t_
            y = a_[1] + (b_[1] - a_[1]) * t_
            for e in range(4):
                P.p(x, y + 1 + e, ESCURA[[6, 5, 3, 1][e]], d_f * (0.8 - e * 0.15))
            if i % 6 == 0:
                for e in range(3, 6):
                    P.p(x, y + e, ESCURA[2 + (e == 3)], d_f * 0.5)
                P.p(x, y + 6, ESCURA[4], d_f * 0.6)
            # a neve por cima, grossa, com a borda arredondada
            for e in range(esp_t + 1):
                k = 6 if e < esp_t - 1 else 5
                P.p(x, y - e, NEVE[k], d_teto * (1.1 if e > esp_t // 2 else 0.95), cint=1 if e == esp_t else 0.2)
            if i % 9 == 4:
                P.p(x, y - esp_t - 1, NEVE[6], d_teto * 1.15, cint=1)
    # rolo de neve pendurado na beirada de baixo e pingentes de gelo
    gp = np.random.default_rng(405)
    for x in range(x0 - 22, x0 + 2):                   # a ponta da esquerda do beiral, vista de frente
        y = beir + 4 - (x - (x0 - 24)) * ((beir + 4 - ay) / (ax - (x0 - 24)))
        comp = int(1 + gp.random() ** 1.6 * (6 if not nevado() else 4))
        for k in range(comp):
            cor = "#e8f4ff" if k < comp - 1 else "#ffffff"
            P.p(x, y + 4 + k, cor if (k + x) % 3 else "#b8d0ec", 0.7, cint=1 if k == comp - 1 else 0.4)
        pingentes.append((x, int(y + 3 + comp)))
    # cordão de luzes no beiral (as duas águas)
    for (a_, b_) in ((CH["apice"], esq), (CH["apice"], dir_)):
        n = int(max(abs(b_[0] - a_[0]), abs(b_[1] - a_[1]))) + 1
        for i in range(2, n + 1, 4):
            t_ = i / n
            x = a_[0] + (b_[0] - a_[0]) * t_
            y = a_[1] + (b_[1] - a_[1]) * t_ + 5 + math.sin(i * 0.8) * 0.8
            if x >= W or x < 0:
                continue
            cor = LUZES[(i // 4) % 4]
            P.p(x, y, "#1a1410", 0.2)
            P.p(x, y + 1, cor, 0.0)
            E.p(x, y + 1, cor, 1.0)
            luzes.append((x, y + 1, cor))
    # chaminé de pedra na água da direita
    cx0, cx1, ctop = 458, 467, 30
    cbase = int(ay + (cx1 - ax) * ((beir + 4 - ay) / (dir_[0] - ax)))
    for y in range(ctop, cbase + 1):
        for x in range(cx0, cx1):
            row = (y - ctop) // 3
            junta = (y - ctop) % 3 == 2 or (x + row * 2) % 5 == 0
            u = (x - cx0) / (cx1 - cx0 - 1)
            k = 2 + u * 1.4 * (1 if L[0] > 0 else -1) + ((x * 7 + y * 3) % 5) * 0.25 + 0.6
            P.p(x, y, PEDRA_CHAM[int(np.clip(k - (1.5 if junta else 0), 0, 6))], direto(L, ((u - 0.5) * 1.4, 0.8, 0.1)))
    for x in range(cx0 - 1, cx1 + 1):
        P.p(x, ctop, PEDRA_CHAM[4], d_teto)
        for e in range(1, 2 + int(nevado()) * 2):
            P.p(x, ctop - e, NEVE[6], d_teto, cint=1)
    for x in range(cx0 + 1, cx1 - 1):
        P.p(x, ctop, "#1a1410", 0)
        E.p(x, ctop, "#ff7a30", 0.5)
    return janelas, lampioes, pingentes


def janela(P: Plano, E: Camada, jx0: int, jy0: int, jw: int, jh: int, L, janelas: list, venezianas=False, cortina=False,
           arvore=False) -> None:
    d_f = direto(L, (0, 1, 0.08))
    d_teto = direto(L, (0, 0.3, 0.95))
    for y in range(jy0 - 1, jy0 + jh + 1):
        for x in range(jx0 - 1, jx0 + jw + 1):
            if x in (jx0 - 1, jx0 + jw) or y in (jy0 - 1, jy0 + jh):
                P.p(x, y, "#e8e2d0" if y == jy0 - 1 else "#b8b0a0", d_f)
    for y in range(jy0, jy0 + jh):
        for x in range(jx0, jx0 + jw):
            t = (y - jy0) / jh
            cor = hexa("#ffd890") * (1 - t) + hexa("#ff9a48") * t
            if x == jx0 + jw // 2 or y == jy0 + jh // 2:
                cor = hexa("#f0ead8")               # caixilho em cruz, pintado de branco
            cant = min(x - jx0, jx0 + jw - 1 - x) + (jy0 + jh - 1 - y)
            if cant <= 1:
                cor = hexa("#dfeaf8")               # geada nos cantos de baixo
            P.p(x, y, cor, 0.0)
            if cant > 1 and not (x == jx0 + jw // 2 or y == jy0 + jh // 2):
                E.p(x, y, cor, 1.0)
    if arvore:   # a árvore de Natal de dentro da casa, em silhueta, com luzinhas coloridas
        cx = jx0 + 3
        for k in range(jh - 1):
            meia = k * 0.45
            for x in range(int(cx - meia), int(cx + meia) + 1):
                if jx0 <= x < jx0 + jw and x != jx0 + jw // 2:
                    P.p(x, jy0 + 1 + k, "#1e3a22", 0.0)
                    E.p(x, jy0 + 1 + k, "#3a5a2a", 0.6)
        for (dx, dy, cor) in ((0, 2, "#ff5a4a"), (-1, 4, "#ffd27a"), (1, 5, "#7ab8ff"), (-2, 7, "#ff5a4a"), (2, 8, "#ffd27a"), (0, 9, "#7aff8a")):
            if jy0 + dy < jy0 + jh:
                P.p(cx + dx, jy0 + dy, cor, 0.0)
                E.p(cx + dx, jy0 + dy, cor, 1.0)
        P.p(cx, jy0, "#fff0a0", 0.0)
        E.p(cx, jy0, "#fff0a0", 1.0)
    if cortina:
        for y in range(jy0, jy0 + jh - 1):
            P.p(jx0, y, "#b0402a", 0.0)
            P.p(jx0 + jw - 1, y, "#b0402a", 0.0)
            E.p(jx0, y, "#ff7a40", 0.5)
            E.p(jx0 + jw - 1, y, "#ff7a40", 0.5)
    if venezianas:   # as venezianas abertas, com as chamas vermelhas e brancas (o desenho dos chalés)
        for (vx0, s) in ((jx0 - 6, 1), (jx0 + jw + 1, -1)):
            for y in range(jy0 - 1, jy0 + jh + 1):
                for x in range(vx0, vx0 + 5):
                    u = x - vx0
                    chama = ((y - jy0) + (u if s > 0 else 4 - u) * 1) % 6 < 3
                    cor = VERMELHO[4 if chama else 3] if (u % 4) else VERMELHO[2]
                    if not chama and u % 4:
                        cor = REBOCO[6]
                    P.p(x, y, cor, d_f)
                P.p(vx0 + (4 if s > 0 else 0), y, "#3a1a10", d_f * 0.4)
    # floreira com galhos de pinheiro, pinhas e neve
    for x in range(jx0 - 2, jx0 + jw + 2):
        P.p(x, jy0 + jh + 1, ESCURA[5], d_f)
        P.p(x, jy0 + jh + 2, ESCURA[3], d_f)
        P.p(x, jy0 + jh + 3, ESCURA[1], d_f * 0.5)
        P.p(x, jy0 + jh, VERDE_PINHO[3 + (x % 3 == 0)], d_f * 0.8)
        if x % 4 == 1:
            P.p(x, jy0 + jh - 1, VERDE_PINHO[4], d_f * 0.8)
        if x % 5 == 2:
            P.p(x, jy0 + jh, "#7a4a24", d_f)        # pinha
        P.p(x, jy0 + jh - (2 if x % 4 == 1 else 1), NEVE[6], d_teto, cint=0.8)
    janelas.append((jx0, jy0, jx0 + jw, jy0 + jh))


def guirlanda_porta(P: Plano, E: Camada, cx: int, cy: int, L, luzes: list) -> None:
    d = direto(L, (0, 1, 0.3))
    for y in range(cy - 6, cy + 7):
        for x in range(cx - 6, cx + 7):
            r = math.hypot(x - cx, y - cy)
            if 3.2 <= r <= 6.2:
                k = 2 + int((math.atan2(y - cy, x - cx) * 3 + r) % 3) + (y < cy)
                P.p(x, y, VERDE_PINHO[min(6, k)], d * (0.7 + 0.1 * (y < cy)))
    for (dx, dy) in ((-4, -3), (3, -4), (5, 2), (-5, 3), (0, 5)):
        P.p(cx + dx, cy + dy, "#d03030", d)                  # frutinhas
    for (dx, dy) in ((-2, -5), (4, 0), (-3, 4)):
        P.p(cx + dx, cy + dy, "#ffd27a", 0.0)
        E.p(cx + dx, cy + dy, "#ffd27a", 1.0)
        luzes.append((cx + dx, cy + dy, "#ffd27a"))
    laco(P, cx, cy + 6, L)


def sino(P: Plano, x: int, y: int, L) -> None:
    """O sino de vaca (o grande, de desfile) pendurado num gancho, com a correia de couro bordada de flores brancas."""
    d = direto(L, (0.2, 0.9, 0.3))
    for k in range(9):                                       # a correia em arco
        xx = x - 4 + k
        yy = y + abs(k - 4) * -0.5 + 2
        P.p(xx, yy, "#8a2418", d)
        P.p(xx, yy + 1, "#5a160e", d)
        if k % 2 == 0:
            P.p(xx, yy, "#f4ecd8", d)                        # o bordado
    P.p(x, y, "#3a3a40", 0.4)
    for j in range(7):                                       # o sino de latão
        meia = 1 + j * 0.45
        for xx in range(int(round(x - meia)), int(round(x + meia)) + 1):
            u = (xx - x) / max(meia, 1)
            k = int(np.clip(3 + u * 1.6 * (1 if L[0] > 0 else -1) - j * 0.15, 0, 5))
            P.p(xx, y + 3 + j, OURO[k], d)
    P.p(x - 1, y + 5, OURO[5], d * 1.2)
    P.p(x, y + 10, "#2a2016", 0.3)


# ─────────────────────────────── Objetos do terraço ───────────────────────────────
def pinheirinho_enfeitado(P: Plano, E: Camada, L, luzes: list) -> None:
    """O pinheirinho na tina de madeira, com bolas de vidro vermelhas e douradas, o cordão de luzes e a estrela."""
    x, yb = PINHEIRINHO
    t = Plano()
    pinheiro(t, x, yb - 7, 34, 13, L, seed=777, neve=0.8 if not nevado() else 1.6, tronco_alt=1)
    juntar_plano(P, t, yb)
    # a tina de aduelas com os aros de ferro
    for y in range(yb - 8, yb + 1):
        meia = 7 - (y - (yb - 8)) * 0.18
        for xx in range(int(x - meia), int(x + meia) + 1):
            u = (xx - x) / meia
            k = int(np.clip(3.5 + u * 1.8 * (1 if L[0] > 0 else -1) + ((xx - x) % 3 == 0) * -1, 0, 6))
            P.p(xx, y, MADEIRA_ARR[k], direto(L, (u, 0.8, 0.2)))
            P.base[y, xx] = yb
        if y in (yb - 6, yb - 1):
            for xx in range(int(x - meia), int(x + meia) + 1):
                P.p(xx, y, "#3a3a44" if (xx - x) % 4 else "#7a7a88", direto(L, (0, 0.8, 0.2)))
    for xx in range(x - 7, x + 8):                           # neve na borda da tina
        P.p(xx, yb - 9, NEVE[6], direto(L, (0, 0.3, 1)), cint=0.6)
    g = np.random.default_rng(778)
    alto = yb - 7 - 1 - 34
    for k in range(26):                                      # bolas e luzinhas espalhadas na copa
        f = 0.15 + g.random() * 0.8
        yy = alto + 4 + f * 30
        larg = 1 + f * 11
        xx = x + (g.random() * 2 - 1) * larg * 0.8
        if k < 12:
            cor = ["#c8202a", "#e8b440", "#c8202a", "#e0e0f0"][k % 4]
            P.p(xx, yy, cor, 0.9)
            P.p(xx - 0.6, yy - 1, "#ffffff", 1.0)
        else:
            cor = LUZES[k % 4]
            P.p(xx, yy, cor, 0.0)
            E.p(xx, yy, cor, 1.0)
            luzes.append((xx, yy, cor))
    # estrela dourada no topo
    for (dx, dy, cor) in ((0, -2, "#fff2b8"), (0, -1, "#ffd870"), (-1, -1, "#ffd870"), (1, -1, "#ffd870"), (-2, -1, "#e8b440"),
                          (2, -1, "#e8b440"), (0, -3, "#ffd870"), (0, 0, "#e8b440"), (-1, 0, "#c89430"), (1, 0, "#c89430")):
        P.p(x + dx, alto + dy, cor, 0.0)
        E.p(x + dx, alto + dy, cor, 1.0)
    luzes.append((x, alto - 1, "#fff0a0"))


MADEIRA_ARR = ("#2a1a0e", "#3e2614", "#56361c", "#704626", "#8a5a30", "#a8723e", "#c48c50")


def poste(P: Plano, E: Camada, L) -> tuple[int, int]:
    """Poste de ferro batido com o lampião pendurado e um ramo de azevinho com laço."""
    x, yb = POSTE
    d = direto(L, (0.3, 0.8, 0.3))
    for y in range(yb - 26, yb + 1):
        P.p(x, y, "#2a2a32", d * 0.6)
        P.p(x + 1, y, "#4a4a56", d)
        P.base[y, x] = P.base[y, x + 1] = yb
    for xx in range(x - 6, x + 2):
        P.p(xx, yb - 25, "#3a3a44", d)
    for k in range(4):                                       # a voluta do braço
        P.p(x - 2 - k, yb - 24 + (k > 1), "#2a2a32", d)
    for xx in range(x - 7, x + 3):
        for e in range(1, 2 + int(nevado())):
            P.p(xx, yb - 25 - e, NEVE[6], direto(L, (0, 0.3, 1)), cint=1)
    lampiao(P, E, x - 5, yb - 22)
    laco(P, x + 1, yb - 14, L)
    for (dx, dy) in ((-1, -12), (2, -12), (0, -11), (-2, -11), (1, -10)):
        P.p(x + dx, yb + dy, VERDE_PINHO[4], d)
    P.p(x, yb - 12, "#d02828", d)
    P.p(x + 1, yb - 11, "#d02828", d)
    for yy in range(yb - 1, yb + 2):
        for xx in range(x - 3, x + 5):
            if ((xx - x - 0.5) / 3.6) ** 2 + ((yy - yb - 0.5) / 1.5) ** 2 <= 1:
                P.p(xx, yy, NEVE[5], direto(L, (0, 0.4, 1)), cint=0.5)
    return (x - 5, yb - 18)


def treno(P: Plano, L) -> None:
    """O trenó de madeira com patins curvos de ferro, carregado de presentes embrulhados com fita."""
    x0, x1, yb = TRENO
    t = Camada()
    for x in range(x0, x1 + 1):
        t.p(x, yb, "#2a2a32")
        t.p(x, yb - 1, "#6a6a78")
    for k in range(6):
        t.p(x1 + 1 + (k > 1) + (k > 3), yb - 1 - k, "#6a6a78")
        t.p(x1 + 2 + (k > 1) + (k > 3), yb - 1 - k, "#2a2a32")
    for x in (x0 + 4, x0 + 14, x0 + 24, x0 + 34):
        for y in range(yb - 4, yb - 1):
            t.p(x, y, "#4a2e18")
            t.p(x + 1, y, "#2e1c10")
    for y in range(yb - 6, yb - 3):
        for x in range(x0 - 1, x1 + 2):
            t.p(x, y, ["#c08850", "#a06c3a", "#6a4424"][y - (yb - 6)])
    # presentes: caixas com fita e laço
    for (bx, bw, bh, c1, c2) in ((x0 + 3, 11, 8, "#b8242a", "#f2d27a"), (x0 + 15, 9, 11, "#2a6a44", "#e8e2d0"),
                                 (x0 + 25, 10, 7, "#e8e0cc", "#c8242a"), (x0 + 18, 7, 5, "#3a4a9a", "#f2d27a")):
        topo = yb - 6 - bh
        for y in range(topo, yb - 6):
            for x in range(bx, bx + bw):
                cor = c1
                if x == bx + bw // 2 or y == topo + bh // 2:
                    cor = c2
                if x == bx:
                    cor = c1 if c1 != "#e8e0cc" else "#c8c0ac"
                t.p(x, y, cor)
        t.p(bx + bw // 2 - 1, topo - 1, c2)
        t.p(bx + bw // 2 + 1, topo - 1, c2)
        t.p(bx + bw // 2 - 2, topo - 2, c2)
        t.p(bx + bw // 2 + 2, topo - 2, c2)
    m = t.c[:, :, 3] > 0.4
    dd = np.where(m, np.clip(direto(L, (0, 0.8, 0.6)) - np.clip((YA - (yb - 17)) / 20, 0, 1) * 0.3, 0, 1), 0)
    P.juntar(t, dd.astype(np.float32), base=yb)
    nevar(P, m, L, 471, esp=esp_neve(1.2), lumps=0.5, base=yb)


def cesto(P: Plano, L) -> None:
    """O cesto de vime com a almofada xadrez vermelha (o lugar do gato perto do fogo)."""
    cx, yb = CESTO
    t = Camada()
    for y in range(yb - 6, yb + 1):
        meia = 13 - (y - (yb - 6)) * 0.5
        for x in range(int(cx - meia), int(cx + meia) + 1):
            tranca = ((x + (y % 2) * 2) % 4 < 2)
            t.p(x, y, "#a87a40" if tranca else "#7a5428")
            if y == yb - 6:
                t.p(x, y, "#c89a58")
    for x in range(cx - 13, cx + 14):                        # a almofada aparecendo por cima da borda
        if abs(x - cx) < 12:
            xad = ((x // 2) + 0) % 2
            t.p(x, yb - 7, "#b8302a" if xad else "#e8d8b8")
            t.p(x, yb - 8, "#9a2420" if xad else "#c83a30") if abs(x - cx) < 10 else None
    m = t.c[:, :, 3] > 0.4
    P.juntar(t, np.where(m, direto(L, (0, 0.8, 0.5)), 0).astype(np.float32), base=yb)


def placa_trilha(P: Plano, L) -> None:
    """A placa amarela de trilha (as setas de caminhada das montanhas), sem letra nenhuma, com neve em cima."""
    x, yb = PLACA
    d = direto(L, (0.2, 0.9, 0.3))
    t = Camada()
    for y in range(yb - 24, yb + 1):
        t.p(x, y, "#6a6a74")
        t.p(x + 1, y, "#3a3a44")
    for (yy, s) in ((yb - 22, 1), (yb - 16, -1), (yb - 10, 1)):
        for k in range(16):
            xx = x + 2 + k if s > 0 else x - 1 - k
            for dy in range(4):
                ponta = k >= 13 and abs(dy - 1.5) > (15 - k) * 1.2
                if ponta:
                    continue
                t.p(xx, yy + dy, "#e8b818" if dy < 3 else "#a87a10")
            if k % 4 == 2 and 1 <= k <= 10:
                t.p(xx, yy + 1, "#3a3018")             # a "escrita" em risquinhos, sem letras
        t.p(x + (2 if s > 0 else -1), yy, "#fff0a0")
    m = t.c[:, :, 3] > 0.4
    P.juntar(t, np.where(m, d, 0).astype(np.float32), base=yb)
    nevar(P, m, L, 481, esp=esp_neve(1.4), lumps=0.6, base=yb)


def lenha(P: Plano, L) -> None:
    """Lenha empilhada encostada no chalé, sob o beiral."""
    nv.LENHA = (378, 396, 153)
    nv.lenha(P, L)


def moitas(P: Plano, L) -> None:
    g = np.random.default_rng(491)
    lugares = [(112, 150, 2), (84, 168, 0), (138, 180, 1), (180, 186, 2), (296, 188, 0), (402, 186, 2), (448, 194, 1), (60, 140, 2),
               (166, 140, 0), (388, 160, 1)]
    for (x, y, tipo) in lugares:
        t = Plano()
        if tipo == 0:
            d_cima = direto(L, (0, 0.3, 1))
            for k in range(7):
                a = -math.pi / 2 + (k - 3) * 0.32
                comp = 4 + g.random() * 4
                for s_ in range(int(comp)):
                    t.p(x + math.cos(a) * s_, y + math.sin(a) * s_, "#3a2a1e" if s_ % 3 else "#5a4030", 0.3)
            for yy in range(y - 3, y + 1):
                for xx in range(x - 5, x + 6):
                    if ((xx - x) / 5.5) ** 2 + ((yy - y) / (3.2 + nevado())) ** 2 <= 1:
                        t.p(xx, yy, NEVE[5 if yy < y - 1 else 3], d_cima * (1.1 if yy < y - 1 else 0.6), cint=0.8)
            # azevinho: folhas escuras e frutinhas vermelhas aparecendo
            for (dx, dy) in ((-2, -3), (2, -2), (0, -4)):
                t.p(x + dx, y + dy, VERDE_PINHO[3], 0.4)
            t.p(x + 1, y - 4, "#d02828", 0.6)
            t.p(x - 1, y - 3, "#d02828", 0.6)
        elif tipo == 1:
            c = Camada()
            pedra(c, x, y - 1.5, 4.2, 2.6, (L[0], -L[2]), seed=x, paleta=PEDRA[:6])
            dd = np.where(c.c[:, :, 3] > 0.4, 0.4, 0).astype(np.float32)
            t.juntar(c, dd)
            nevar(t, c.c[:, :, 3] > 0.4, L, x, esp=esp_neve(2.2), lumps=0.7)
        else:
            pinheiro(t, x, y, 12 + g.random() * 8, 5 + g.random() * 2, L, seed=x + 7, neve=1.0 if not nevado() else 1.8, tronco_alt=1)
        juntar_plano(P, t, y)


class Objetos:
    def __init__(self) -> None:
        self.P = Plano()
        self.E = Camada()


def pintar_objetos(nome: str, per: dict, luzes: list):
    o = Objetos()
    L = per["L"]
    t = Plano()
    guarda_corpo(t, o.E, normal3(L), luzes)
    juntar_plano(o.P, t, None)
    t = Plano()
    janelas, lampioes, pingentes = chale(t, o.E, per, nome, luzes)
    juntar_plano(o.P, t, CH["chao"])
    t = Plano()
    lenha(t, L)
    juntar_plano(o.P, t, None)
    for fn in (moitas, treno, cesto, placa_trilha):
        t = Plano()
        fn(t, L)
        juntar_plano(o.P, t, None)
    t = Plano()
    pinheirinho_enfeitado(t, o.E, L, luzes)
    juntar_plano(o.P, t, None)
    t = Plano()
    lampioes.append(poste(t, o.E, L))
    juntar_plano(o.P, t, None)
    t = Plano()
    nv.fogueira(t, o.E, L)
    juntar_plano(o.P, t, FOGO[1] + 4)
    o.P.c.contornar("#10101c", 0.28)
    return o, janelas, lampioes, pingentes


def pintar_pinheiros(nome: str, per: dict) -> tuple[Plano, Plano]:
    """Os pinheiros grandes: a borda do terraço à esquerda (escura, sob o texto) e o pinheirão da frente à esquerda."""
    L = per["L"]
    neve = 1.0 if not nevado() else 1.8
    meio = Plano()
    for (x, b, alt, lg, s, esc) in sorted([(18, 150, 120, 30, 501, 0.4), (54, 140, 96, 26, 502, 0.35), (86, 134, 70, 20, 503, 0.3),
                                           (106, 131, 44, 14, 504, 0.25), (34, 136, 64, 18, 505, 0.4)], key=lambda a: a[1]):
        t = Plano()
        pinheiro(t, x, b, alt, lg, L, seed=s, neve=neve, tronco_alt=4, escuro=esc)
        juntar_plano(meio, t, b)
    perto = Plano()
    t = Plano()
    pinheiro(t, -6, 200, 190, 44, L, seed=511, neve=neve, tronco_alt=10, escuro=0.55)
    juntar_plano(perto, t, 200)
    return meio, perto


def pintar_frente(nome: str, per: dict) -> Camada:
    """Galhos nevados bem perto da câmera nos cantos de baixo, com azevinho e frutinhas vermelhas à direita."""
    c = nv.pintar_frente(nome, per)
    g = np.random.default_rng(521)
    for k in range(60):
        x = 430 + k * 0.9
        y = 198 - k * 0.12 + math.sin(k / 7) * 1.5
        c.p(x, y, "#2a1c12")
        if k % 3 == 0:
            for j in range(1, 6):
                c.p(x + j * 0.4, y - j, VERDE_PINHO[2 + (j % 2)])
                c.p(x - j * 0.3, y - j * 0.7, VERDE_PINHO[3])
        if g.random() < 0.18:
            c.p(x, y - 3, "#d02828")
            c.p(x + 1, y - 3, "#a01818")
        if g.random() < 0.4:
            c.p(x, y - 4, NEVE[5])
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
def montar(nome: str) -> Image.Image:
    per = periodo(nome)
    nev = nevado()
    fx, fy = FOGO
    L = normal3(per["L"])

    ceu = ampliar(pintar_ceu(nome, per))
    mlonge, d_longe = nv.cordilheira(nome, per, PICOS_LONGE, 120, 30 if not nev else 40, 100, 0.8)
    mmeio, d_meio = nv.cordilheira(nome, per, PICOS_MEIO, 140, 14 if not nev else 22, 104, 1.1)
    p_dir = paredao(nome, per, "d")
    p_esq = paredao(nome, per, "e")
    cach, e_cach = cachoeira(nome, per)
    luzes_vale = []
    vale_p, e_vale, luzes_vale = vale(nome, per)
    chao, molhado = pintar_terraco(nome, per)
    pin_meio, pin_perto = pintar_pinheiros(nome, per)
    luzes = []
    obj, janelas, lampioes, pingentes = pintar_objetos(nome, per, luzes)
    frente = pintar_frente(nome, per)
    juntar_plano(p_esq, cach, None)

    k_n = 1.0 if not nev else 1.0
    planos = [  # (camada, luz direta, desfoque, névoa, recebe fogo, cintila)
        (mlonge.c, d_longe, 2.2, 0.46 if not nev else 0.86, 0.0, None),
        (mmeio.c, d_meio, 1.6, 0.3 if not nev else 0.72, 0.0, None),
        # o vale: menos desfoque e menos névoa de manhã, para as casinhas, a prefeitura e o trilho se lerem lá de cima
        (vale_p.c.c, vale_p.d, 1.0 if nev else (0.55 if nome == "manha" else 0.75),
         (0.5 if nev else {"manha": 0.08, "tarde": 0.16, "noite": 0.2}[nome]) * k_n, 0.0, vale_p.cint),
        (p_dir.c.c, p_dir.d, 1.2, 0.22 if not nev else 0.55, 0.0, p_dir.cint),
        (p_esq.c.c, p_esq.d, 1.0, 0.16 if not nev else 0.5, 0.0, p_esq.cint),
        (chao.c.c, chao.d, 0.0, 0.0 if not nev else 0.06, 1.0, chao.cint),
        (pin_meio.c.c, pin_meio.d, 0.6, 0.04, 0.4, pin_meio.cint),
        (obj.P.c.c, obj.P.d, 0.0, 0.0, 1.0, obj.P.cint),
        (pin_perto.c.c, pin_perto.d, 1.8, 0.0, 0.35, pin_perto.cint),
    ]
    img = ceu.copy()
    sol_m = np.zeros(img.shape[:2], np.float32)
    m_d = np.zeros_like(sol_m)
    m_nev = np.zeros_like(sol_m)
    m_fogo = np.zeros_like(sol_m)
    m_cint = np.zeros_like(sol_m)
    alfas = []
    for cam, d, r, nevk, fo, ci in planos:
        a = desfocar_rgba(ampliar(cam), r)
        al = a[:, :, 3]
        alfas.append(al)
        dd = desfocar(ampliar(d[:, :, None]), r)[:, :, 0] if r > 0 else ampliar(d[:, :, None])[:, :, 0]
        img = sobre(img, a)
        sol_m = sol_m * (1 - al) + al
        m_d = m_d * (1 - al) + dd * al
        m_nev = m_nev * (1 - al) + nevk * al
        m_fogo = m_fogo * (1 - al) + fo * al
        cc = ampliar(ci[:, :, None])[:, :, 0] if ci is not None else 0
        m_cint = m_cint * (1 - al) + cc * al * (r < 0.8)
    obj_a = alfas[7]

    # ── sombras projetadas (sol/lua e fogueira) e oclusão de contato
    so_chao = ((YA >= TERRACO[None, :]) & (obj.P.c.c[:, :, 3] < 0.4)).astype(np.float32)
    sombra = np.maximum.reduce([projetar_sombra(obj.P.c.c[:, :, 3], obj.P.base, per["sombra"]),
                                projetar_sombra(pin_meio.c.c[:, :, 3], pin_meio.base, per["sombra"]),
                                projetar_sombra(pin_perto.c.c[:, :, 3], pin_perto.base, per["sombra"])]) * so_chao
    if nome == "manha":   # o pinheirão e a mata da esquerda deixam o lado do texto na sombra
        sombra = np.maximum(sombra, (1 - suave(100, 190, XA + (YA - 150) * 0.4)) * 0.9 * so_chao)
    if nome != "noite":   # o chalé faz uma sombra larga no chão
        sombra = np.maximum(sombra, ((XA > 392) & (YA > CH["chao"]) & (YA < CH["chao"] + (16 if nome == "manha" else 6))).astype(np.float32) * 0.8 * so_chao)
    sombra = desfocar(ampliar(sombra[:, :, None]), 1.6)[:, :, 0] * (0.35 if nev else 1.0)

    def do_fogo(xs, b):
        vx, vy = xs - fx, b - fy
        n = np.maximum(np.hypot(vx, vy * 2.6), 1)
        k = np.clip(n / 24, 0.4, 2.6)
        return vx / n * k, vy / n * k * 0.45
    s_fogo = projetar_sombra(obj.P.c.c[:, :, 3], obj.P.base, do_fogo)
    s_fogo[fy - 8:fy + 7, fx - 19:fx + 20] = 0
    s_fogo = desfocar(ampliar((s_fogo * so_chao)[:, :, None]), 3)[:, :, 0]
    pe = (obj.P.c.c[:, :, 3] > 0.4) & (obj.P.base >= 0) & (np.abs(YA - obj.P.base) < 2.5)
    ao = pe.astype(np.float32)
    ao = np.maximum(ao, ((pin_meio.c.c[:, :, 3] > 0.4) & (np.abs(YA - pin_meio.base) < 3)).astype(np.float32) * 0.8)
    ao[CH["chao"] + 3:CH["chao"] + 6, CH["x0"] - 2:W] = 0.7
    ao = desfocar(ampliar(ao[:, :, None]), 4)[:, :, 0] * (1 - obj_a * 0.6)

    # ── a luz: céu + sol/lua + fogueira + janelas + lampiões + luzinhas
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = amb[None, None, :] * (1 - ao[:, :, None] * 0.55)
    direta = m_d * (1 - sombra * 0.93)
    cor_sol = np.broadcast_to(hexa(per["sol"]), (H * ESC, W * ESC, 3))
    if nome == "tarde" and not nev:
        t_ = np.clip((GYa - 8) / 60, 0, 1)[:, :, None]
        cor_sol = hexa("#ffc47a") * (1 - t_) + hexa(per["sol"]) * t_
    luz = luz + cor_sol * per["sol_k"] * direta[:, :, None]
    fk = per["fogo_k"]
    raio_f = {"manha": 70, "tarde": 90, "noite": 120}[nome] * (0.9 if nev else 1.0)
    fogo = luz_em_degraus(fx, fy - 4, raio_f, 0.5, 21, 7)[:, :, None] * hexa("#ff7418") * 1.15
    fogo += luz_em_degraus(fx, fy - 5, raio_f * 0.45, 0.55, 22, 5)[:, :, None] * hexa("#ffb048") * 0.75
    fogo += luz_pontual(fx, fy - 6, 16, 0.7)[:, :, None] * hexa("#ffd890") * 0.6
    fogo = fogo * (1 - s_fogo * 0.85)[:, :, None]
    nxa, nya, nza = (ampliar(v[:, :, None])[:, :, 0] for v in chao.normal)
    vx, vy, vz = (fx - GXa), (fy - GYa) * 2.2, np.full_like(GXa, 9.0)
    vn = np.sqrt(vx * vx + vy * vy + vz * vz)
    rel = np.floor(np.clip((nxa * vx + nya * vy + nza * vz) / vn, 0, 1) * 6 + 0.5) / 6
    no_chao = ampliar(chao.chao[:, :, None].astype(np.float32))[:, :, 0] * (1 - obj_a)
    perto_fogo = desfocar(ampliar((((XA - fx) / 30) ** 2 + ((YA - fy) / 10) ** 2 < 1)[:, :, None].astype(np.float32)), 8)[:, :, 0]
    m_fogo = m_fogo * (1 - perto_fogo * 0.45)
    luz = luz + fogo * fk * m_fogo[:, :, None] * (1 + (rel * 1.5 - 0.8) * no_chao)[:, :, None]
    jk = per["jan_k"]
    # poças de luz das janelas do térreo na neve
    poca_a = np.zeros((H, W), np.float32)
    ch = CH["chao"]
    for (jx0, jy0, jx1, jy1) in janelas:
        if jy1 < ch - 20:
            continue
        m = poli([(jx0, ch + 4), (jx1, ch + 4), (jx1 + 4, ch + 16), (jx0 - 4, ch + 16)])
        poca_a = np.maximum(poca_a, m * np.clip(1 - (YA - ch - 4) / 13, 0, 1))
    poca_a = np.floor(poca_a * 4 + 0.6) / 4
    poca = desfocar(ampliar(poca_a[:, :, None]), 1.2)[:, :, 0]
    poca = poca * {"manha": 0.25, "tarde": 0.55, "noite": 1.0}[nome] * (1.3 if nev and nome != "noite" else 1.0)
    luz = luz + poca[:, :, None] * hexa("#ffb45a") * 1.4 * jk * (1 - obj_a[:, :, None] * 0.6)
    for i, (lpx, lpy) in enumerate(lampioes):
        luz = luz + luz_em_degraus(lpx, lpy, 30, 0.8, 7 + i, 5)[:, :, None] * hexa("#ffc068") * 0.75 * jk * np.maximum(m_fogo, 0.4)[:, :, None]
    for (jx0, jy0, jx1, jy1) in janelas:
        luz = luz + luz_pontual((jx0 + jx1) / 2, jy1 + 2, 16, 0.7)[:, :, None] * hexa("#ffb050") * 0.5 * jk
    # as luzinhas coloridas acendem um pouquinho o que está perto (guirlandas, árvore, beiral)
    brilho_luzes = np.zeros((H * ESC, W * ESC, 3), np.float32)
    for (x, y, cor) in luzes:
        X, Y = int(x * ESC), int(y * ESC)
        r = 9 * ESC
        y0, y1, x0, x1 = max(0, Y - r), min(H * ESC, Y + r), max(0, X - r), min(W * ESC, X + r)
        if y0 < y1 and x0 < x1:
            yy, xx = np.mgrid[y0:y1, x0:x1]
            brilho_luzes[y0:y1, x0:x1] += np.exp(-((xx - X) ** 2 + (yy - Y) ** 2) / (2 * (3.2 * ESC) ** 2))[:, :, None] * hexa(cor)
    k_lz = {"manha": 0.12, "tarde": 0.25, "noite": 0.5}[nome] * (1.4 if nev else 1.0)
    luz = luz + brilho_luzes * k_lz
    img = img * (1 - sol_m[:, :, None]) + img * sol_m[:, :, None] * luz

    # ── luz de recorte na borda de cima das silhuetas
    alto = np.maximum.reduce([pin_meio.c.c[:, :, 3], pin_perto.c.c[:, :, 3], obj.P.c.c[:, :, 3]]) > 0.5
    ddx = 2 if L[0] > 0 else -2
    viz = np.roll(np.roll(alto, 1, 0), ddx, 1)
    viz[:3, :] = viz[-3:, :] = True
    viz[:, :3] = viz[:, -3:] = True
    rec = desfocar(ampliar((alto & ~viz).astype(np.float32)[:, :, None]), 0.8)[:, :, 0]
    cor_rec = {"manha": "#fff0d0", "tarde": "#ffb090", "noite": "#90aaff"}[nome]
    img += rec[:, :, None] * hexa(cor_rec) * {"manha": 0.45, "tarde": 0.6, "noite": 0.35}[nome] * (0.3 if nev else 1.0)

    # ── névoa por distância e névoa baixa no fundo do vale
    nev_c = hexa(per["nevoa"]) * per["nevoa_k"]
    baixa = np.exp(-((GYa - 112) / 10) ** 2) * (0.4 if nev else (0.1 if nome == "manha" else 0.22)) * (1 - obj_a) * (GYa < BEIRA + 2)
    mn = np.clip(m_nev + baixa * sol_m, 0, 1)[:, :, None]
    img = img * (1 - mn) + nev_c * mn

    # ── emissivos: janelas, estrela, luzinhas, brasas, lampiões, o vale aceso
    em = ampliar(obj.E.c)
    ev = desfocar_rgba(ampliar(e_vale.c), 0.6)
    ec = ampliar(e_cach.c)
    k_em = {"manha": 0.6, "tarde": 0.85, "noite": 1.05}[nome] * (1.1 if nev else 1.0)
    img = img * (1 - em[:, :, 3:4] * min(1, k_em)) + em[:, :, :3] * em[:, :, 3:4] * k_em
    k_v = {"manha": 0.35, "tarde": 0.7, "noite": 1.0}[nome] * (0.75 if nev else 1.0)
    img = img * (1 - ev[:, :, 3:4] * k_v) + ev[:, :, :3] * ev[:, :, 3:4] * k_v
    img = img * (1 - ec[:, :, 3:4]) + ec[:, :, :3] * ec[:, :, 3:4]
    halo = desfocar(em[:, :, :3] * em[:, :, 3:4], 4) * 0.8 + desfocar(em[:, :, :3] * em[:, :, 3:4], 16) * 0.9
    halo += desfocar(ev[:, :, :3] * ev[:, :, 3:4], 5) * 0.8
    img += halo * k_em * (0.42 if not nev else 0.62)

    # ── fumaça da chaminé
    fum = np.zeros((H * ESC, W * ESC), np.float32)
    gf = np.random.default_rng(13)
    for k in range(70):
        t = k / 70
        r = (3 + t * 13) * ESC * (0.8 + gf.random() * 0.4)
        x = 462 - t ** 1.7 * (110 if not nev else 70) + gf.normal(0, 0.3 + t * 3)
        y = 27 - t * 40 + gf.normal(0, 0.3 + t * 2)
        X, Y = int(x * ESC), int(y * ESC)
        a = (1 - t) ** 1.3 * 0.42 * (0.6 + gf.random() * 0.8)
        ri = int(r * 1.3)
        y0, y1, x0, x1 = max(0, Y - ri), min(H * ESC, Y + ri), max(0, X - ri), min(W * ESC, X + ri)
        if y0 < y1 and x0 < x1:
            yy, xx = np.mgrid[y0:y1, x0:x1]
            fum[y0:y1, x0:x1] += np.exp(-(((xx - X) ** 2 + (yy - Y) ** 2) / (r * r)) * 2.0) * a
    textura = ampliar(ruido(15, 5)[:, :, None])[:, :, 0]
    fum = np.clip(fum * (0.6 + textura * 0.8), 0, 0.85) * (0.6 if nome == "noite" else 1.0) * (0.7 if nev else 1.0)
    fum = desfocar(fum[:, :, None], 3)[:, :, 0]
    desl = int(round(L[0] * 12)), int(round(-L[2] * 12))
    grad = fum - np.roll(np.roll(fum, desl[1], 0), desl[0], 1)
    lado_luz = np.clip(0.5 - grad * 6, 0, 1)[:, :, None]
    k_f = {"manha": 1.0, "tarde": 0.95, "noite": 0.4}[nome]
    escura = hexa({"manha": "#7a88a8", "tarde": "#6a5a8a", "noite": "#202a4a"}[nome])
    luz_f = (escura * (1 - lado_luz) + hexa(per["fumaca"]) * lado_luz) * k_f
    if nome == "noite":
        luz_f = luz_f + luz_pontual(462, 26, 14, 1.0)[:, :, None] * hexa("#ff9a50") * 0.5
    img = img * (1 - fum[:, :, None]) + luz_f * fum[:, :, None]

    # ── feixes de luz e pó de gelo (só no tempo firme)
    poe = ampliar(ruido(81, 3)[:, :, None])[:, :, 0]
    if nev:
        cor_p, peso_p = "#ffffff", np.zeros_like(GXa)
    elif nome == "manha":
        vis = ((1 - sol_m) * (GYa < 80)).astype(np.float32)
        brilho = np.exp(-np.hypot(GXa - 452, (GYa - 14)) / 30)
        raios = raios_de_luz((vis * (0.3 + brilho * 4)).astype(np.float32), (452, 14), passos=80, alcance=0.96, queda=0.975)
        img += desfocar(raios[:, :, None], 4) * hexa("#fff0d0") * 0.7
        f = (facho(452, 0, 300, 160, 6, 30, 1.4) * 0.7 + facho(452, 0, 240, 172, 4, 22, 1.4) * 0.5)
        f = f * (0.5 + 0.7 * poe) * np.clip((GXa - 160) / 160, 0, 1)
        f = desfocar(f[:, :, None], 3)[:, :, 0] * (1 - obj_a * 0.5)
        img += f[:, :, None] * hexa("#ffeccc") * 0.45
        cor_p, peso_p = "#ffffff", f * 1.6
    elif nome == "tarde":
        f = (facho(-60, 40, 150, 170, 10, 60, 1.2) * 0.5 + facho(-60, 40, 300, 150, 8, 40, 1.3) * 0.35)
        f = desfocar((f * (0.5 + 0.7 * poe))[:, :, None], 4)[:, :, 0] * (1 - obj_a * 0.5)
        img += f[:, :, None] * hexa("#ffb898") * 0.22
        cor_p, peso_p = "#ffd8c8", f * 1.2 + 0.05
    else:
        cor_p, peso_p = "#c8d8ff", luz_pontual(240, 120, 120, 0.6) * 0.25
    gp = np.random.default_rng(83)
    rgbp = hexa(cor_p)
    for _ in range(700):
        X, Y = int(gp.random() * (W * ESC - 4)), int(gp.random() * (H * ESC - 4))
        if any(x0 * ESC <= X <= x1 * ESC and y0 * ESC <= Y <= y1 * ESC for (x0, y0, x1, y1) in LIVRE.values()):
            continue
        k = peso_p[Y, X] * (0.3 + gp.random() * 0.8)
        if k > 0.05:
            img[Y:Y + 2, X:X + 2] += rgbp * k

    # ── cintilar da neve onde a luz bate
    luz_tot = (hexa(per["sol"]) * per["sol_k"] * direta[:, :, None] + fogo * fk * 0.6 + poca[:, :, None] * hexa("#ffb45a") * jk
               + brilho_luzes * k_lz)
    forca = luz_tot.max(2) * (m_cint > 0.05)
    gc = np.random.default_rng(97)
    ys, xs = np.nonzero(forca[::ESC, ::ESC] > 0.3)
    for y, x in zip(ys, xs):
        if gc.random() > m_cint[y * ESC + 1, x * ESC + 1] * 0.16:
            continue
        X, Y = x * ESC + 1, y * ESC + 1
        k = min(forca[Y, X], 1.4) * (0.5 + gc.random() * 0.7)
        cor = luz_tot[Y, X] / max(luz_tot[Y, X].max(), 1e-3)
        img[Y, X] += cor * k * 1.4
        if k > 0.95 and gc.random() < 0.25:
            for dd in (-2, -1, 1, 2):
                kk = k * (0.5 if abs(dd) == 1 else 0.2)
                img[Y + dd, X] += cor * kk
                img[Y, X + dd] += cor * kk
    for (x, y) in pingentes:
        X, Y = x * ESC + 1, min(y * ESC + 1, H * ESC - 1)
        img[Y, X] += luz_tot[Y, X] * 0.6 + 0.15

    # ── na nevasca: o véu branco que apaga o fundo e alguns flocos grandes e desfocados parados na frente
    if nev:
        veu = np.clip(1 - (GYa - 40) / 140, 0, 1) * 0.12 * (1 - obj_a * 0.7)
        img = img * (1 - veu[:, :, None]) + hexa(per["nevoa"]) * veu[:, :, None]

    # ── primeiro plano desfocado e escuro
    fr = desfocar_rgba(ampliar(frente.c), 8)
    k_fr = {"manha": 0.5, "tarde": 0.42, "noite": 0.3}[nome]
    img = sobre(img, fr * np.array([k_fr, k_fr, k_fr * 1.08, 1], dtype=np.float32))

    # ── acabamento: brilho, curva de tom, cor, lado calmo do texto, vinheta e grão
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.86) * 5, 0, 1), 0, 2)
    img = img + desfocar(claro, 10) * 0.35 + desfocar(claro, 32) * 0.28
    joelho = 0.74
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, fr_ = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.8 + 0.2 * (lum * q + (1 - lum) * (fr_ * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.06 + 0.48, 0, 1.2)
    xn, yn = GX / (W * ESC), GY / (H * ESC)
    calma = ((1 - suave(0.24, 0.42, xn)) * (0.55 + 0.45 * (1 - suave(0.5, 0.8, yn))))[:, :, None]
    canto = ((1 - suave(0.2, 0.42, xn)) * suave(0.55, 0.85, yn))[:, :, None]
    media = desfocar(np.clip(img, 0, 1.2), 14)
    img = media + (img - media) * (1 - 0.42 * calma)
    img *= 1 - 0.22 * calma - 0.12 * canto
    v = (xn - 0.55) ** 2 * 1.3 + (yn - 0.55) ** 2 * 1.5
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.0)[:, :, None]
    gg = np.random.default_rng(99)
    img += (gg.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.012
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


ANCORAS = {
    # gato: canto superior esquerdo da caixa de 36 x 22 px (arte), em algo firme
    "gato": [
        {"x": 222, "y": 153, "pose": "fogueira"},     # na neve derretida junto ao fogo
        {"x": 190, "y": 148, "pose": "repouso"},      # no cesto com a almofada xadrez
        {"x": 332, "y": 150, "pose": "sentado"},      # em cima dos presentes do trenó
        {"x": 300, "y": 162, "pose": "observando"},   # na neve entre o banco e o trenó, olhando o vale
        {"x": 416, "y": 104, "pose": "repouso"},      # na sacada do chalé
    ],
    # coruja: o ponto dos pés: moirões do guarda-corpo, o braço do poste, a lenha, o sino e a sacada
    "coruja": [
        {"x": 171, "y": 114},
        {"x": 316, "y": 119},
        {"x": 387, "y": 134},
        {"x": 147, "y": 115},
        {"x": 440, "y": 112},
    ],
    "particulas": "neve",
}


def pintar_trem() -> Image.Image:
    """O trenzinho de montanha (30 x 7 px da arte, duas linhas: de dia e de noite com as janelas acesas): a locomotiva
    vermelha de cremalheira com o farol, dois carros com janelas, teto com neve e o pantógrafo."""
    img = np.zeros((14, 30, 4), np.uint8)
    def p(x, y, cor, linha):
        r, g, b = (int(cor[i:i + 2], 16) for i in (1, 3, 5))
        img[y + linha * 7, x] = (r, g, b, 255)
    for linha in (0, 1):
        noite = linha == 1
        for (x0, x1, loco) in ((1, 9, False), (10, 19, False), (20, 29, True)):
            for x in range(x0, x1):
                for y in range(1, 6):
                    cor = "#b8242a" if y < 5 else "#5e1418"
                    if y == 1:
                        cor = "#e8eef8"                      # teto com neve
                    elif y == 2 and x in (x0, x1 - 1):
                        cor = "#86201e"
                    elif y in (2, 3) and x0 < x < x1 - 1 and (x - x0) % 2 == 1:
                        cor = ("#ffd27a" if noite else "#2a3448") if not loco or x > x1 - 4 else cor
                    elif y == 4:
                        cor = "#f0e2c0" if (x - x0) % 3 else "#d8c8a0"   # a faixa creme
                    p(x, y, cor, linha)
            p(x0, 6, "#1a1a20", linha)
            p(x1 - 2, 6, "#1a1a20", linha)
        for x in range(1, 29):
            p(x, 6, "#2a2a32", linha) if x % 3 == 0 else None
        p(24, 0, "#3a3a44", linha)                      # pantógrafo
        p(25, 0, "#3a3a44", linha)
        p(29, 4, "#fff4c8" if noite else "#e8e0b0", linha)   # farol
    return Image.fromarray(img, "RGBA")


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    nomes = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    variantes = [v for v in ("limpo", "nevado") if v in sys.argv[1:]] or ["limpo", "nevado"]
    for var in variantes:
        ESTADO["nevado"] = var == "nevado"
        for nome in nomes:
            t0 = time.time()
            img = montar(nome)
            base = f"cena-vale{'-nevado' if var == 'nevado' else ''}-{nome}"
            img.save(PASTA / f"{base}.webp", quality=84, method=6)
            img.resize((960, 400), Image.LANCZOS).save(PASTA / f"{base}-960.webp", quality=82, method=6)
            print(base, (PASTA / f"{base}.webp").stat().st_size // 1024, "KB",
                  (PASTA / f"{base}-960.webp").stat().st_size // 1024, "KB", f"{time.time() - t0:.1f}s")
    pintar_trem().save(PASTA / "trem-vale.png", optimize=True)
    (Path(__file__).resolve().parent / "cena-vale.json").write_text(json.dumps(ANCORAS, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
