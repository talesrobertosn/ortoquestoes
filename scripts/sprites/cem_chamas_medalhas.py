"""Chamas e medalhas do Salão dos Cem (ranking), pintadas pixel a pixel por código (numpy + PIL).

Gera em public/ranking/cem/:
- chama-16.png: 6 quadros de 16 x 16 em faixa (marcador "em chamas" da tabela), laço contínuo;
- chama-24.png: a mesma chama em 24 x 24, 6 quadros, com mais detalhe e faíscas;
- tocha.png: a chama da tocha de parede do salão, 8 quadros de 20 x 32 (só o fogo; o suporte está pintado no
  cenário). Âncora = centro da base (x = 10, última linha);
- medalhas.png: 2 linhas x 3 colunas de 32 x 40 (colunas: ouro, prata, bronze; linha 0 = base, linha 1 = brilho
  diagonal), moeda de ~26 px com aro chanfrado, anel interno, estrela em relevo e fita de duas pontas;
- medalhas.json: o mapa da folha.

A chama segue o desenho clássico de gota: miolo creme, depois ouro, laranja e vermelho, sem contorno preto (a
silhueta é dada pelos pixels vermelhos mais de fora, com 1 px vermelho-castanho em baixo e nos lados para não sumir
no fundo marfim). Todo movimento é feito de senos com frequência inteira no laço, então o último quadro emenda no
primeiro sem salto.

Uso: python3 scripts/sprites/cem_chamas_medalhas.py [--previa PASTA]
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / "public/ranking/cem"
TAU = 2 * math.pi


def hx(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------------------------------------------------------
# Chama
# ---------------------------------------------------------------------------------------------------------------
# Rampa do fogo, de fora para dentro. 0 = aro castanho (base e lados), 1 = vermelho da ponta, 2 = vermelho-laranja,
# 3 = laranja, 4 = ouro, 5 = amarelo-pálido, 6 = creme do miolo.
FOGO = [hx(c) for c in ("#6e2210", "#b0301a", "#dc4a1e", "#f3842a", "#fbbd3c", "#ffe27a", "#fff4b0")]
FAISCA = [hx(c) for c in ("#fff1a0", "#ffc443", "#f5852a", "#cf4420")]


def gota(X, Y, cx, base, alt, larg, giro, onda=0.0, fase=0.0):
    """Máscara de uma gota de fogo: base arredondada em `base`, ponta `alt` px acima, meia-largura máxima `larg`.

    `giro` entorta a ponta para o lado (cresce com a altura); `onda` ondula a borda (as línguas balançam)."""
    v = (base - Y) / alt
    p = (v + 0.24) / 1.24
    pc = np.clip(p, 0, 1)
    g = np.where((p > 0) & (p < 1), np.sin(np.pi * pc ** 0.56), 0.0)
    vc = np.clip(v, 0, 1)
    centro = cx + giro * vc ** 1.7 + onda * np.sin(fase + vc * 5.0) * vc
    return np.abs(X - centro) <= larg * g


def vizinhos4(m):
    p = np.pad(m, 1)
    return p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]


def limpar(m):
    """Tira pixels soltos e pontinhas de 1 px pendurados só pela diagonal (o fogo fica em tufos, não em poeira)."""
    for _ in range(2):
        m = m & (vizinhos4(m) >= 1)
    return m


def chama(w: int, h: int, q: int, nq: int, cfg: dict) -> np.ndarray:
    """Um quadro de chama em RGBA (h, w, 4)."""
    a = TAU * q / nq
    s = cfg["escala"]
    ys, xs = np.mgrid[0:h, 0:w]
    X = xs + 0.5
    Y = ys + 0.5
    cx = cfg["cx"]
    base = cfg["base"]
    alt = cfg["alt"] + cfg["pulo"] * math.sin(a + 0.6) + 0.5 * cfg["pulo"] * math.sin(2 * a + 2.1)
    giro = cfg["giro"] * math.sin(a) + 0.35 * cfg["giro"] * math.sin(2 * a + 1.3)
    larg = cfg["larg"] * (1 + 0.04 * math.sin(2 * a + 0.4))

    # Corpo + línguas. Cada língua tem altura, ponto de partida e balanço próprios, defasados entre si.
    corpo = gota(X, Y, cx, base, alt, larg, giro, cfg["onda"], a)
    externa = corpo.copy()
    for (dx, v0, fa, fl, fase, amp, sep) in cfg["linguas"]:
        # sep: quanto a língua se afasta e volta (abre e fecha no laço: separa e junta de novo).
        afasta = dx + sep * (0.5 - 0.5 * math.cos(a + fase))
        la = alt * fa + amp * math.sin(a + fase) * s
        lb = base - alt * v0
        lx = cx + afasta + giro * v0 ** 1.7 * 0.9
        externa |= gota(X, Y, lx, lb, la, larg * fl, giro * 0.8 + 0.6 * s * math.sin(a + fase + 1.0), 0, 0)

    # Pedaço que se solta da ponta e sobe (só nos quadros de "fôlego"), como nas chamas desenhadas à mão.
    for (fx, f0, f1, tam) in cfg.get("solta", []):
        t = (q / nq - f0) % 1.0
        dur = (f1 - f0) % 1.0
        if t < dur:
            k = t / dur
            yb = base - alt * (0.92 + 0.55 * k)
            xb = cx + giro + fx * s
            r = tam * s * (1 - 0.55 * k)
            externa |= ((X - xb) ** 2 + ((Y - yb) * 0.8) ** 2) <= r * r

    externa = limpar(externa)

    # Camadas internas: cópias menores e mais baixas da gota, balançando menos (o miolo quase não se mexe).
    pulso = 1 + 0.08 * math.sin(a * 2 + 0.9) + 0.05 * math.sin(a + 2.0)
    camadas = []
    for (fa, fl, sobe, fg) in cfg["miolo"]:
        m = gota(X, Y, cx + giro * 0.15, base - sobe * s, alt * fa * pulso, larg * fl * (0.97 + 0.03 * pulso),
                 giro * fg, cfg["onda"] * 0.5, a + 0.5)
        camadas.append(limpar(m & externa))

    nivel = np.full((h, w), -1, int)
    nivel[externa] = 2
    for i, m in enumerate(camadas):
        nivel[m] = 3 + i
    # Borda: pixels de fora da silhueta. Em cima (pontas das línguas) vermelho; na base e nos lados, castanho.
    borda = externa & (vizinhos4(externa) < 4)
    v = (base - Y) / alt
    alto = v > cfg["corte_aro"]
    nivel[borda & alto] = 1
    nivel[borda & ~alto] = 0
    # Ponta das línguas: o último pixel de cada coluna bem no alto fica vermelho mesmo se encostar em laranja.

    img = np.zeros((h, w, 4), np.uint8)
    for i, c in enumerate(FOGO):
        sel = nivel == i
        img[sel, :3] = c
        img[sel, 3] = 255

    # Faíscas: sobem, desviam de leve e esfriam (amarelo -> vermelho) antes de sumir.
    for (fx, off, sobe, vida, desvio) in cfg["faiscas"]:
        t = (q / nq + off) % 1.0
        if t > vida:
            continue
        k = t / vida
        yy = base - alt * 0.75 - k * sobe
        xx = cx + fx + desvio * math.sin(TAU * k + off * 7)
        ix, iy = int(round(xx - 0.5)), int(round(yy - 0.5))
        if 0 <= ix < w and 0 <= iy < h and nivel[iy, ix] < 0:
            c = FAISCA[min(3, int(k * 4))]
            img[iy, ix, :3] = c
            img[iy, ix, 3] = 255
    return img


def faixa(w, h, nq, cfg):
    return np.concatenate([chama(w, h, q, nq, cfg) for q in range(nq)], axis=1)


CFG16 = dict(
    escala=1.0, cx=8.0, base=15.6, alt=12.4, pulo=0.7, larg=4.9, giro=0.9, onda=0.25, corte_aro=0.55,
    # (dx, v0, fração da altura, fração da largura, fase, amplitude, separação)
    linguas=[(-2.4, 0.35, 0.62, 0.38, 0.0, 1.2, 0.0), (2.5, 0.42, 0.52, 0.34, 2.4, 1.0, 0.0)],
    miolo=[(0.80, 0.74, 0.8, 0.6), (0.56, 0.52, 1.6, 0.35), (0.33, 0.33, 2.2, 0.15)],
    faiscas=[(1.5, 0.0, 4.0, 0.55, 0.8)],
)
CFG24 = dict(
    escala=1.4, cx=12.0, base=23.5, alt=18.2, pulo=1.0, larg=7.0, giro=1.3, onda=0.35, corte_aro=0.5,
    linguas=[(-3.6, 0.32, 0.64, 0.36, 0.0, 1.2, 0.0), (3.6, 0.40, 0.55, 0.32, 2.3, 1.1, 0.0),
             (0.6, 0.55, 0.50, 0.30, 4.1, 1.0, 0.0)],
    miolo=[(0.80, 0.74, 1.0, 0.6), (0.58, 0.54, 1.6, 0.35), (0.36, 0.34, 2.3, 0.15)],
    faiscas=[(2.5, 0.0, 6.0, 0.6, 1.0), (-3.0, 0.5, 5.0, 0.5, 0.8)],
    solta=[(0.6, 0.15, 0.5, 1.2)],
)
CFG_TOCHA = dict(
    escala=1.2, cx=10.0, base=31.6, alt=22.5, pulo=1.3, larg=6.4, giro=1.5, onda=0.5, corte_aro=0.45,
    # As duas línguas de lado abrem e voltam a encostar no corpo (separam e juntam) com fases diferentes.
    linguas=[(-2.2, 0.30, 0.66, 0.36, 0.0, 1.6, -2.4), (2.2, 0.36, 0.58, 0.34, 3.3, 1.5, 2.4),
             (0.0, 0.62, 0.44, 0.28, 1.7, 1.3, 0.0)],
    miolo=[(0.78, 0.72, 1.2, 0.6), (0.56, 0.52, 2.0, 0.35), (0.34, 0.32, 2.8, 0.15)],
    faiscas=[(2.5, 0.0, 9.0, 0.7, 1.2), (-2.0, 0.45, 8.0, 0.6, 1.0)],
    solta=[(-0.6, 0.0, 0.32, 1.4), (0.8, 0.5, 0.82, 1.2)],
)


# ---------------------------------------------------------------------------------------------------------------
# Medalhas
# ---------------------------------------------------------------------------------------------------------------
MW, MH = 32, 40
METAL = {
    # 6 tons, do mais escuro ao brilho; contorno; fita (sombra, meio, luz); listra (sombra, luz)
    "ouro": dict(r=["#5e3a0c", "#8a5a16", "#a8741e", "#e4b85c", "#f6d98a", "#fff2b8"], cont="#2a1a10",
                 fita=["#08261f", "#0c3c34", "#17675b"], listra=["#b8862e", "#e4b85c"]),
    "prata": dict(r=["#4c5a68", "#6b7d8e", "#8fa3b5", "#c9d3dc", "#e6ecf1", "#ffffff"], cont="#1c2430",
                  fita=["#22406e", "#3f6fb5", "#6a95d2"], listra=["#c9d3dc", "#ffffff"]),
    "bronze": dict(r=["#5a3218", "#7e4a26", "#ae7854", "#d08a54", "#eab084", "#ffd2a8"], cont="#2a140c",
                   fita=["#4a1220", "#7a2436", "#a23a4e"], listra=["#c9802a", "#f0b048"]),
}
CX, CY, RAIO = 16.0, 13.5, 12.6   # moeda (o contorno de 1 px fica por fora: diâmetro total ~26-27 px)
LUZ = np.array([-0.62, -0.78])     # luz vindo de cima à esquerda (x, y de tela)
LUZ = LUZ / np.linalg.norm(LUZ)


def estrela_vertices(r1, r2, giro=-math.pi / 2):
    pts = []
    for i in range(10):
        r = r1 if i % 2 == 0 else r2
        t = giro + i * math.pi / 5
        pts.append((CX + r * math.cos(t), CY + 0.4 + r * math.sin(t)))
    return pts


def dentro_poligono(px, py, pts):
    n = len(pts)
    ins = np.zeros(px.shape, bool)
    j = n - 1
    for i in range(n):
        xi, yi = pts[i]
        xj, yj = pts[j]
        cond = ((yi > py) != (yj > py)) & (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi)
        ins ^= cond
        j = i
    return ins


def fita(X, Y, x0, y0, x1, y1, larg, entalhe):
    """Ponta de fita reta de (x0,y0) a (x1,y1), com corte em V na ponta. Devolve (máscara, s across -1..1, t 0..1)."""
    d = np.array([x1 - x0, y1 - y0], float)
    L = np.linalg.norm(d)
    d /= L
    n = np.array([-d[1], d[0]])
    rx, ry = X - x0, Y - y0
    t = rx * d[0] + ry * d[1]
    s = (rx * n[0] + ry * n[1]) / (larg / 2)
    m = (np.abs(s) <= 1) & (t >= 0) & (t <= L - entalhe * (1 - np.abs(s)))
    return m, s, t / L


def medalha(nome: str, brilho: bool) -> np.ndarray:
    M = METAL[nome]
    R = [hx(c) for c in M["r"]]
    ys, xs = np.mgrid[0:MH, 0:MW]
    X, Y = xs + 0.5, ys + 0.5
    img = np.zeros((MH, MW, 4), np.uint8)
    cor = np.full((MH, MW), -1, int)        # índice numa paleta local
    pal: list[tuple[int, int, int]] = []

    def p(c):
        pal.append(c)
        return len(pal) - 1

    fs, fm, fl = [p(hx(c)) for c in M["fita"]]
    ls, ll = [p(hx(c)) for c in M["listra"]]
    tons = [p(c) for c in R]
    contorno = p(hx(M["cont"]))

    # --- Fita: duas pontas que saem de trás da moeda e abrem em V para baixo. A da direita fica na frente.
    larg = 9.0
    pontas = [(-1, (19.0, 18.0, 9.2, 39.4)), (1, (13.0, 18.0, 22.8, 39.4))]
    for lado, (x0, y0, x1, y1) in pontas:
        m, s, t = fita(X, Y, x0, y0, x1, y1, larg, 3.4)
        traseira = lado < 0
        # Tom: borda do lado da sombra mais escura; dobra (meio do comprimento) com uma faixa de luz.
        luz = -s * lado * 0.6 + 0.25 * np.cos(t * 6.5 + (0.0 if traseira else 1.6))
        if traseira:
            luz -= 0.35
        tom = np.where(luz > 0.35, fl, np.where(luz > -0.45, fm, fs))
        # listra central de 2 px (com seu próprio claro/escuro)
        lis = np.abs(s) < 0.26
        tom = np.where(lis, np.where(luz > -0.2, ll, ls), tom)
        cor[m] = tom[m]
    # Sombra da moeda sobre a fita (1-2 px logo abaixo do aro).
    rr = np.hypot(X - (CX + 0.6), Y - (CY + 1.6))
    somb = (cor >= 0) & (rr <= RAIO + 1.6)
    cor[somb & ((cor == fm) | (cor == fl))] = fs
    cor[somb & (cor == ll)] = ls

    # --- Moeda
    dx, dy = X - CX, Y - CY
    r = np.hypot(dx, dy)
    nx, ny = dx / np.maximum(r, 1e-6), dy / np.maximum(r, 1e-6)
    lam = -(nx * LUZ[0] + ny * LUZ[1])         # >0: lado de onde vem a luz
    moeda = r <= RAIO
    # Aro chanfrado externo (r 10.4-12.6): voltado para fora, claro em cima à esquerda.
    aro = moeda & (r > 10.3)
    t_aro = np.clip(2.6 + 2.6 * lam, 0, 5)
    # Sulco (anel interno, r 9.3-10.3): rebaixado, então a luz se inverte (escuro em cima à esquerda).
    sulco = moeda & (r > 9.2) & (r <= 10.3)
    t_sulco = np.clip(1.6 - 1.4 * lam, 0, 3.4)
    # Campo: chapado com degradê suave da luz, mais escuro embaixo à direita.
    campo = moeda & (r <= 9.2)
    g = -(dx * LUZ[0] + dy * LUZ[1]) / 9.2
    t_campo = np.clip(2.85 + 0.9 * g, 2, 4)

    tom = np.zeros((MH, MW))
    tom[aro] = t_aro[aro]
    tom[sulco] = t_sulco[sulco]
    tom[campo] = t_campo[campo]
    # Aresta viva do aro: 1 px mais claro na borda de dentro do chanfro, em cima à esquerda.
    aresta = moeda & (r > 10.3) & (r <= 11.2) & (lam > 0.3)
    tom[aresta] = np.minimum(5, tom[aresta] + 1)

    # Estrela em relevo: 10 facetas (cada braço partido na crista), cada uma com a luz da sua inclinação.
    pts = estrela_vertices(7.4, 3.05)
    est = dentro_poligono(X, Y, pts) & campo
    ang = np.arctan2(Y - (CY + 0.4), X - CX)
    # setor de cada pixel: entre a crista do braço (ponta) e o vale (vértice interno)
    k = ((ang + math.pi / 2) / (math.pi / 5)) % 10      # 0 = crista da ponta de cima
    braco = np.floor((k + 1) / 2) % 5                   # qual braço
    metade = np.where(((k + 1) % 2) < 1, -1, 1)          # lado da crista
    a_crista = -math.pi / 2 + braco * 2 * math.pi / 5
    # normal da faceta: aponta para fora do braço e para o lado da metade
    fn_x = np.cos(a_crista) * 0.5 + np.cos(a_crista + metade * math.pi / 2) * 0.9
    fn_y = np.sin(a_crista) * 0.5 + np.sin(a_crista + metade * math.pi / 2) * 0.9
    nl = np.hypot(fn_x, fn_y)
    lf = -(fn_x * LUZ[0] + fn_y * LUZ[1]) / nl
    t_est = np.clip(3.2 + 1.9 * lf, 1, 5)
    tom[est] = t_est[est]
    # Sombra projetada da estrela no campo (embaixo à direita) e borda escura do relevo.
    est_d = np.zeros_like(est)
    est_d[1:, 1:] = est[:-1, :-1]
    sombra_est = est_d & ~est & campo
    tom[sombra_est] = np.minimum(tom[sombra_est], 1.6)

    ti = np.clip(np.round(tom), 0, 5).astype(int)
    if brilho:
        # Reflexo diagonal: faixa de 2 px atravessando a moeda (de cima à direita para baixo à esquerda) e um
        # brilho em cruz no aro, em cima à esquerda.
        diag = (X - CX) + (Y - CY)
        faixa_b = moeda & (np.abs(diag + 3.0) < 1.25)
        faixa_f = moeda & (np.abs(diag + 6.2) < 0.6)
        ti = np.where(faixa_b, np.minimum(5, ti + 2), ti)
        ti = np.where(faixa_f, np.minimum(5, ti + 1), ti)
    cor[moeda] = np.array(tons)[ti][moeda]

    # Contorno de 1 px em volta de tudo (moeda + fita).
    cheio = cor >= 0
    pad = np.pad(cheio, 1)
    viz = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    fora = viz & ~cheio
    cor[fora] = contorno
    # Linha escura entre a moeda e a fita (separa os dois planos).
    sep = (~moeda) & (r <= RAIO + 1.0) & (cor >= 0) & (cor != contorno)
    cor[sep] = contorno

    for i, c in enumerate(pal):
        sel = cor == i
        img[sel, :3] = c
        img[sel, 3] = 255
    if brilho:
        # Cintilação em cruz (4 pontas) no aro, em cima à esquerda.
        bx, by = 7, 6
        for (ddx, ddy, c) in [(0, 0, "#ffffff"), (1, 0, R[5]), (-1, 0, R[5]), (0, 1, R[5]), (0, -1, R[5]),
                              (2, 0, R[4]), (-2, 0, R[4]), (0, 2, R[4]), (0, -2, R[4])]:
            x, y = bx + ddx, by + ddy
            if 0 <= x < MW and 0 <= y < MH:
                img[y, x, :3] = hx(c) if isinstance(c, str) else c
                img[y, x, 3] = 255
    return img


def folha_medalhas() -> np.ndarray:
    linhas = []
    for brilho in (False, True):
        linhas.append(np.concatenate([medalha(n, brilho) for n in ("ouro", "prata", "bronze")], axis=1))
    return np.concatenate(linhas, axis=0)


# ---------------------------------------------------------------------------------------------------------------
# Prévias
# ---------------------------------------------------------------------------------------------------------------
def previa_quadro(arr, esc, fundos, borda=8):
    im = Image.fromarray(arr, "RGBA")
    w, h = im.size
    big = im.resize((w * esc, h * esc), Image.NEAREST)
    out = Image.new("RGBA", (big.width + 2 * borda, (big.height + 2 * borda) * len(fundos)))
    for i, f in enumerate(fundos):
        bg = Image.new("RGBA", (big.width + 2 * borda, big.height + 2 * borda), hx(f) + (255,))
        bg.alpha_composite(big, (borda, borda))
        out.paste(bg, (0, i * bg.height))
    return out


def gif(frames, w, h, esc, fundo, caminho, ms):
    imgs = []
    for f in frames:
        bg = Image.new("RGBA", (w * esc, h * esc), hx(fundo) + (255,))
        bg.alpha_composite(Image.fromarray(f, "RGBA").resize((w * esc, h * esc), Image.NEAREST))
        imgs.append(bg.convert("P", palette=Image.ADAPTIVE))
    imgs[0].save(caminho, save_all=True, append_images=imgs[1:], duration=ms, loop=0, disposal=2)


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    folhas = {
        "chama-16.png": (16, 16, 6, CFG16),
        "chama-24.png": (24, 24, 6, CFG24),
        "tocha.png": (20, 32, 8, CFG_TOCHA),
    }
    geradas = {}
    for nome, (w, h, nq, cfg) in folhas.items():
        arr = faixa(w, h, nq, cfg)
        Image.fromarray(arr, "RGBA").save(SAIDA / nome, optimize=True)
        geradas[nome] = (arr, w, h, nq)
    med = folha_medalhas()
    Image.fromarray(med, "RGBA").save(SAIDA / "medalhas.png", optimize=True)
    (SAIDA / "medalhas.json").write_text(json.dumps(
        {"quadro": [MW, MH], "colunas": {"1": 0, "2": 1, "3": 2}, "linhas": {"base": 0, "brilho": 1}},
        ensure_ascii=False, indent=1) + "\n")

    if "--previa" in sys.argv:
        dst = Path(sys.argv[sys.argv.index("--previa") + 1])
        dst.mkdir(parents=True, exist_ok=True)
        fundos = ["#F6F7F3", "#171C30", "#ffffff", "#0C3C34"]
        for nome, (arr, w, h, nq) in geradas.items():
            previa_quadro(arr, 6 if w < 24 else 5, fundos).save(dst / f"previa-{nome}")
            frames = [arr[:, i * w:(i + 1) * w] for i in range(nq)]
            for f in ("#F6F7F3", "#171C30"):
                gif(frames, w, h, 8, f, dst / f"{nome[:-4]}-{f[1:]}.gif", 110 if nq == 6 else 100)
        previa_quadro(med, 4, ["#F6F7F3", "#171C30"]).save(dst / "previa-medalhas.png")
        # tamanho real (1x e 2x) lado a lado, para ver a leitura na tela
        real = Image.new("RGBA", (240, 120), hx("#F6F7F3") + (255,))
        real.paste(Image.new("RGBA", (240, 60), hx("#171C30") + (255,)), (0, 60))
        m1 = Image.fromarray(med[:MH], "RGBA")
        c16 = Image.fromarray(geradas["chama-16.png"][0][:, :16], "RGBA")
        for yy in (10, 70):
            real.alpha_composite(m1, (4, yy - 6))
            real.alpha_composite(m1.resize((m1.width * 2, m1.height * 2), Image.NEAREST).crop((0, 0, 100, 50)),
                                 (104, yy - 6))
            real.alpha_composite(c16, (210, yy + 10))
        real.resize((480, 240), Image.NEAREST).save(dst / "previa-real.png")


if __name__ == "__main__":
    main()
