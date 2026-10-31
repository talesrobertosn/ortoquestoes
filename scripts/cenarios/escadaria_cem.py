"""Cenário "HD-2D" da página do ranking (O Salão dos Cem): a Escadaria da Ascensão (31/10/2026).

Base: o salão com a grande escadaria que o próprio Tales fez no PixelLab e autorizou usar e alterar à vontade
("pode alterar o que precisar"), guardado em `scripts/cenarios/cem/escadaria-fonte.png` (1200 x 675, macio,
reamostrado, sem grade de pixel limpa e todo aceso em vermelho). Este script refaz a arte pelo fluxo aprovado em
`.claude/skills/arte-hd2d/SKILL.md`:

1. Pixel art limpa na resolução nativa (400 x 225): redução por média de área e quantização por material (pedra,
   vidro/céu, velas, tapete, estandartes, musgo) em rampas fechadas, sem pixel borrado; a luz vermelha que vinha
   "assada" na pintura é separada do material (o excesso de vermelho vira máscara de luz, o verde/azul vira o tom da
   pedra) e volta como luz dourada em faixas.
2. Paleta do castelo: pedra greige quente, sombras azul-noite (#171C30), luz dourada (#E4B85C / #F0C46A), toques de
   verde-floresta e esmeralda (#0C3C34 / #17675B) no tapete, nos estandartes e no musgo, altas luzes marfim (#F6F7F3).
   O céu da rosácea e das janelas vira um fim de tarde dourado; as chamas, amarelo-laranja.
3. As duas estátuas encapuzadas dos nichos viram cavaleiros de pedra, a partir do cavaleiro do Tales
   (`scripts/cenarios/cem/cavaleiro-fonte.png`, cópia do cavaleiro-base), dessaturado na rampa da pedra, com contorno escuro e um pouco de musgo,
   espelhado no nicho da direita para os dois olharem para a escada. Nenhum símbolo religioso.
4. Luz HD-2D em 3x (1200 x 675): fachos volumétricos da rosácea descendo a escada com poeira, luz pontual em cada vela
   (borda em faixas e brilho), sombras de contato, profundidade de campo (a janela do fundo um pouco mais macia),
   mapeamento de tons, altas luzes quentes e sombras frias, vinheta e grão.
5. Interface: o site mostra uma faixa larga (recorte vertical em escadaria.json) com três cartões claros sobre o chão
   da frente; essa faixa de baixo fica mais calma e um pouco mais escura, e a escada com a janela fica no centro.

Saída: public/ranking/cem/escadaria.webp (1200 x 675), escadaria-960.webp (960 x 540) e escadaria.json.
Uso: python3 scripts/cenarios/escadaria_cem.py [--arte PASTA]   (--arte grava também a base 400 x 225 para revisão)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parents[2]
FONTE = RAIZ / "scripts" / "cenarios" / "cem" / "escadaria-fonte.png"
# cópia do cavaleiro-base.png do Tales (antes em scripts/sprites/cem/), guardada junto da fonte do cenário
CAVALEIRO = RAIZ / "scripts" / "cenarios" / "cem" / "cavaleiro-fonte.png"
PASTA = RAIZ / "public" / "ranking" / "cem"
W, H, ESC = 400, 225, 3

# Velas (ponta da chama, em pixels de arte). Arandelas ao longo dos corrimãos e velas soltas no chão.
ARANDELAS = [(46, 8), (57, 13), (70, 16), (81, 22), (100, 31), (110, 35), (121, 43),
             (277, 41), (287, 36), (297, 31), (308, 26), (327, 16), (341, 13), (350, 8), (362, 4), (371, 1), (27, 1)]
VELAS_CHAO = [(58, 173), (67, 161), (69, 173), (70, 192), (75, 165), (121, 166), (123, 208),
              (271, 208), (280, 206), (289, 158), (296, 167), (300, 153), (301, 169), (320, 127), (324, 124)]
VELAS = ARANDELAS + VELAS_CHAO
ROSACEA = (200.0, 17.0)                  # centro da rosácea (fonte dos fachos)
# Nichos: área visível do fundo (x0, y0, x1, y1), coluna do corrimão que fica na frente (x, y a partir dos quais
# o pilar tampa) e onde ficam os pés do cavaleiro.
NICHO_E = dict(caixa=(76, 43, 105, 108), pilar=lambda x, y: (x >= 93) & (y >= 75), pe=(87, 106), espelho=False)
NICHO_D = dict(caixa=(290, 43, 326, 108), pilar=lambda x, y: (x <= 304) & (y >= 75), pe=(312, 106), espelho=True)
# Tapete na frente da escada (trapézio em perspectiva).
TAPETE = [(97, 172), (303, 172), (344, 221), (55, 221)]


def hexa(c: str) -> np.ndarray:
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


def rampa(*cores: str) -> np.ndarray:
    return np.stack([hexa(c) for c in cores])


def suave(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ─────────────────────────────── Paletas por material ───────────────────────────────
# Pedra em quatro faixas de luz (0 sombra fria, 3 luz dourada direta); o índice vem do tom da pedra.
PEDRA = [
    rampa("#0b0e1a", "#121629", "#191d30", "#232639", "#2f2f3e", "#3d3a44", "#4c4749", "#5e574f", "#736a5c", "#8a7f6b"),
    rampa("#15131e", "#1e1a26", "#28222d", "#342b33", "#423739", "#52443f", "#635347", "#776550", "#8d785c", "#a48c69"),
    rampa("#221a20", "#2e2327", "#3c2e2c", "#4d3b31", "#5f4a38", "#735a40", "#896c48", "#a07f52", "#b8935c", "#cea869"),
    rampa("#3a2a24", "#4c3729", "#614630", "#795838", "#936b40", "#ad7f48", "#c49552", "#d8a95a", "#e8bc68", "#f2d190"),
]
CEU = rampa("#7c4a2e", "#9c6236", "#bc7c3e", "#d6964a", "#e4ac58", "#efc26c", "#f5d68e", "#f8e6b4", "#fbf1d8")
TAPETE_R = [rampa("#06110f", "#081a17", "#0a231f", "#0c2e28", "#0c3c34", "#11493f"),
            rampa("#0b1a15", "#0f251d", "#133027", "#173d31", "#1d4c3c", "#255b47"),
            rampa("#1c2a1a", "#28361f", "#354426", "#45532d", "#566436", "#6b7642"),
            rampa("#3a3a20", "#4c4a26", "#615c2e", "#7a7036", "#94853f", "#b09b4c")]
CERA = rampa("#5e5244", "#857760", "#ab9a7c", "#cbbc9a", "#e8dcbc")
ESTANDARTE = rampa("#061512", "#0a231e", "#0c3c34", "#13544a", "#17675b", "#23806f")
OURO = rampa("#5a4020", "#8a6430", "#b88a40", "#e4b85c", "#f0c46a", "#f8e2a6")
MUSGO = rampa("#0f2219", "#173326", "#1f4532", "#2b5a3c")
ESTATUA = rampa("#0c0f1c", "#1b1f2e", "#2a2d3b", "#3c3d48", "#525058", "#6a6560", "#847c70", "#a09682", "#bcb19a")


def ruido(seed: int, escala: float, w: int = W, h: int = H) -> np.ndarray:
    g = np.random.default_rng(seed)
    gw, gh = int(w / escala) + 3, int(h / escala) + 3
    base = g.random((gh, gw)).astype(np.float32)
    im = Image.fromarray((base * 255).astype(np.uint8)).resize((int(gw * escala), int(gh * escala)), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32)[:h, :w] / 255


def poli(pts, w: int = W, h: int = H) -> np.ndarray:
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    return np.asarray(m) > 127


YY, XX = np.mgrid[0:H, 0:W]


# ─────────────────────────────── 1. Base 400 x 225 ───────────────────────────────
def reduzir() -> np.ndarray:
    a = np.asarray(Image.open(FONTE).convert("RGB"), dtype=np.float32) / 255
    return a.reshape(H, ESC, W, ESC, 3).mean((1, 3))


def discos(pontos, raio: float) -> np.ndarray:
    m = np.zeros((H, W), bool)
    for x, y in pontos:
        m |= (XX - x) ** 2 + ((YY - y - 1.5) * 1.0) ** 2 <= raio ** 2
    return m


def separar(s: np.ndarray) -> dict:
    """Separa a pintura vermelha em material (tom da pedra) e luz (excesso de vermelho)."""
    r, g, b = s[..., 0], s[..., 1], s[..., 2]
    tom = (g * 0.55 + b * 0.45)
    luz = np.clip(r - np.maximum(g, b) * 1.02, 0, 1)
    lum = r * 0.45 + g * 0.4 + b * 0.15
    halo = discos(ARANDELAS, 5.6) | discos(VELAS_CHAO, 7.2)
    # a vela em si: chama clara e haste clara logo abaixo da chama
    chama = np.zeros((H, W), bool)
    haste = np.zeros((H, W), bool)
    for x, y in VELAS:
        chama |= (np.abs(XX - x) <= 1) & (YY >= y - 2) & (YY <= y + 1) & (r > 0.55)
        haste |= (np.abs(XX - x) <= 1) & (YY > y) & (YY <= y + 6) & (tom > 0.22)
    # halos vermelhos assados: some o vermelho e o tom volta ao da parede em volta
    anel = (discos(ARANDELAS, 8.0) | discos(VELAS_CHAO, 9.0)) & ~halo
    fundo = np.zeros((H, W), np.float32)
    for x, y in VELAS:
        rr = 7.2 if (x, y) in VELAS_CHAO else 5.6
        m = ((XX - x) ** 2 + (YY - y - 1.5) ** 2 <= (rr + 2.5) ** 2) & anel
        v = np.percentile(tom[m], 40) if m.any() else 0.08
        d = ((XX - x) ** 2 + (YY - y - 1.5) ** 2 <= rr ** 2) & (fundo == 0)
        fundo[d] = v
    # dentro do halo: o tom é o da vizinhança, mantendo só a textura (variação em volta da média local)
    media = np.asarray(Image.fromarray((tom * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(2)),
                       np.float32) / 255
    limpar = halo & ~haste & ~chama
    tom = np.where(limpar, np.clip(fundo + (tom - media) * 0.6, 0, 1), tom)
    luz = np.where(halo | discos(VELAS_CHAO, 11.5), 0, luz)
    janela = ((YY < 47) & (XX > 96) & (XX < 304) & (luz > 0.13) & (r > 0.36) & ~halo)
    janela &= ~((XX > 140) & (XX < 262) & (YY > 44))
    return dict(tom=tom, luz=luz, lum=lum, chama=chama, haste=haste, janela=janela)


def quantizar(s: np.ndarray, d: dict) -> np.ndarray:
    tom, luz = d["tom"], d["luz"]
    arte = np.zeros((H, W, 3), np.float32)
    # índice da pedra: curva que abre as sombras (a pintura original é muito escura)
    t = np.clip(tom / 0.46, 0, 1) ** 0.72
    idx = np.clip(np.round(t * 9.4 - 0.2), 0, 9).astype(int)
    faixa = np.digitize(luz, [0.05, 0.13, 0.24])
    # faixas de luz sem pontinhos soltos: filtro de moda 3 x 3 (a textura fica no tom, não na luz)
    faixa = np.asarray(Image.fromarray(faixa.astype(np.uint8)).filter(ImageFilter.ModeFilter(3))).astype(int)
    # a luz direta também clareia o material um degrau
    idx = np.clip(idx + (faixa >= 2) + (faixa >= 3), 0, 9)
    for f in range(4):
        m = faixa == f
        arte[m] = PEDRA[f][idx[m]]
    # céu da janela (fim de tarde dourado): pelo brilho geral
    jan = d["janela"]
    tc = np.clip((d["lum"] - 0.24) / 0.42, 0, 1) ** 0.9
    ic = np.clip(np.round(tc * 7.2), 0, 8).astype(int)
    arte[jan] = CEU[ic[jan]]
    # tapete esmeralda: campo com a sombra rendada da rosácea, barra escura com losangos e dois filetes dourados
    tapete(arte, tom, faixa)
    # velas: cera marfim e chama amarelo-laranja
    ic = np.clip(np.round(np.clip((d["tom"] - 0.18) / 0.4, 0, 1) * 4), 0, 4).astype(int)
    h = d["haste"]
    arte[h] = CERA[ic[h]]
    return arte


def tapete(arte: np.ndarray, tom: np.ndarray, faixa: np.ndarray) -> None:
    (xa, ya), (xb, _), (xc, yc), (xd, _) = TAPETE
    tap = poli(TAPETE)
    v = (YY - ya) / (yc - ya)
    xl = xa + (xd - xa) * v
    xr = xb + (xc - xb) * v
    dx = np.minimum(XX - xl, xr - XX)               # distância à borda lateral (em pixels)
    dy = np.minimum(YY - ya, yc - YY)                # distância à borda de cima/baixo
    db = np.floor(np.minimum(dx, dy)).astype(int)
    it = np.clip(np.round(np.clip(tom / 0.34, 0, 1) ** 0.85 * 4.2 + 0.2), 0, 5).astype(int)
    f = np.minimum(faixa, 3)
    campo = tap & (db >= 6)
    for k in range(4):
        m = campo & (f == k)
        arte[m] = TAPETE_R[k][it[m]]
    escuro = rampa("#040b0a", "#06110f", "#0a1a17", "#0f2520")
    m = tap & (db == 0)
    arte[m] = escuro[0]
    for anel, nivel in ((1, 2), (5, 1)):
        m = tap & (db == anel)
        arte[m] = OURO[np.clip(nivel + f[m], 0, 4)]
    barra = tap & (db >= 2) & (db <= 4)
    arte[barra] = escuro[np.clip(1 + f[barra] // 2, 0, 3)]
    # losangos dourados na barra: ao longo da borda (passo de 7 px), centrados na fileira do meio (db == 3)
    lado = dx < dy
    fase = np.mod(np.floor(XX - xl), 7)
    los = barra & ~lado & (np.abs(fase - 3) + np.abs(db - 3) <= 1)
    fase = np.where(lado, np.mod(YY - ya, 6), fase)
    los |= barra & lado & (fase == 3) & (db == 3)
    arte[los] = OURO[np.clip(1 + f[los], 0, 4)]
    ponto = barra & (fase == 3) & (db == 3)
    arte[ponto] = OURO[np.clip(3 + f[ponto] // 2, 0, 5)]


def limpar_ruido(arte: np.ndarray) -> np.ndarray:
    """Tira pixels soltos: um pixel cuja cor não aparece em nenhum dos 4 vizinhos e cujos vizinhos concordam
    entre si vira a cor da maioria (sem mexer em linhas finas, que têm vizinho igual)."""
    out = arte.copy()
    cod = (arte * 255).astype(np.int32)
    cod = cod[..., 0] * 65536 + cod[..., 1] * 256 + cod[..., 2]
    viz = [np.roll(cod, s, a) for s, a in ((1, 0), (-1, 0), (1, 1), (-1, 1))]
    vizc = [np.roll(arte, s, a) for s, a in ((1, 0), (-1, 0), (1, 1), (-1, 1))]
    igual = sum((v == cod).astype(int) for v in viz)
    for i in range(4):
        conc = sum((viz[j] == viz[i]).astype(int) for j in range(4))
        m = (igual == 0) & (conc >= 3)
        out[m] = vizc[i][m]
    return out


def chamas(arte: np.ndarray) -> np.ndarray:
    """Chama de vela de 4 px: ponta laranja, miolo marfim, base âmbar; a cera logo abaixo com a borda derretida."""
    for x, y in VELAS:
        for dy, cor in ((-2, "#e8963a"), (-1, "#ffd27a"), (0, "#fff2cc"), (1, "#f2a640")):
            if 0 <= y + dy < H:
                arte[y + dy, x] = hexa(cor)
        if y + 2 < H:
            arte[y + 2, x] = CERA[4]
    return arte


def estandarte(arte: np.ndarray, x0: int, y0: int, w: int, h: int, seed: int) -> None:
    """Estandarte esmeralda com barra e debrum dourados e um losango (o emblema do site), sem símbolo religioso."""
    g = np.random.default_rng(seed)
    cx = x0 + w // 2
    # haste de ferro
    arte[y0 - 2, x0 - 2:x0 + w + 2] = hexa("#2a2420")
    arte[y0 - 3, x0 - 2:x0 + w + 2] = hexa("#6a5434")
    arte[y0 - 3, x0 - 3] = arte[y0 - 3, x0 + w + 2] = OURO[3]
    for y in range(y0, y0 + h + w // 2):
        for x in range(x0, x0 + w):
            ponta = y - (y0 + h)
            if ponta > 0 and abs(x - cx + 0.5) > (w / 2 - ponta):
                continue
            # dobras verticais: claro-escuro alternando, sombra no lado esquerdo
            u = (x - x0) / max(w - 1, 1)
            dobra = 0.5 + 0.5 * np.cos(u * np.pi * 3.0 + 0.6)
            k = 1.2 + dobra * 2.6 + (1 - u) * -0.4 + (y - y0) / h * -0.8 + g.random() * 0.3
            arte[y, x] = ESTANDARTE[int(np.clip(round(k), 0, 5))]
            borda = x in (x0, x0 + w - 1) or (ponta > 0 and abs(x - cx + 0.5) > (w / 2 - ponta) - 1.2)
            if borda:
                arte[y, x] = OURO[2] if dobra > 0.4 else OURO[1]
    # barra dourada no alto e losango
    arte[y0 + 2, x0 + 1:x0 + w - 1] = OURO[3]
    arte[y0 + 3, x0 + 1:x0 + w - 1] = OURO[1]
    ly = y0 + h // 2
    for dy in range(-4, 5):
        r = 4 - abs(dy)
        for dx in range(-r, r + 1):
            c = OURO[4] if (dx + dy) < 0 else OURO[2]
            if abs(dx) == r:
                c = OURO[1]
            arte[ly + dy, cx + dx] = c
    arte[ly, cx] = OURO[5]


def musgo(arte: np.ndarray, d: dict) -> None:
    """Musgo nas juntas das lajes e nos escombros dos cantos (verde-floresta, pouco)."""
    n = ruido(11, 6) * 0.7 + ruido(12, 2) * 0.3
    tom = d["tom"]
    escuro = (tom < 0.11) & (tom > 0.035)
    claro_viz = np.roll(tom, -1, 0) > 0.14
    lado = (XX < 70) | (XX > 330) | ((YY > 120) & ((XX < 110) | (XX > 300)))
    m = escuro & claro_viz & lado & (n > 0.56) & (YY > 95) & (d["luz"] < 0.05) & ~poli(TAPETE)
    # só tufos (pelo menos dois vizinhos com musgo), nada de pontinho solto
    viz = sum(np.roll(m, s_, ax).astype(int) for s_, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)))
    m &= viz >= 1
    m |= np.roll(m, 1, 1) & escuro & (n > 0.5)
    k = np.clip(((n - 0.56) / 0.2 * 3)).astype(int)
    arte[m] = MUSGO[np.clip(k[m], 0, 3)]


def nicho(arte: np.ndarray, d: dict, cfg: dict) -> None:
    """Apaga a estátua encapuzada: o fundo do nicho volta a ser um recesso de pedra escura com fiadas de blocos."""
    x0, y0, x1, y1 = cfg["caixa"]
    cx = (x0 + x1) / 2
    arco = ((XX - cx) / ((x1 - x0) / 2 + 0.5)) ** 2 + ((YY - (y0 + 12)) / 13.5) ** 2 <= 1
    dentro = (XX >= x0) & (XX <= x1) & (YY <= y1) & ((YY >= y0 + 12) | arco) & ~cfg["pilar"](XX, YY)
    n = ruido(7 + x0, 3)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if not dentro[y, x]:
                continue
            # recesso: mais escuro no alto (sombra do arco) e nas bordas
            k = 1.6 + (y - y0) / (y1 - y0) * 1.3 - abs(x - cx) / (x1 - x0) * 1.4 + n[y, x] * 0.5
            junta = (y - y0) % 7 == 0 or ((x + (3 if ((y - y0) // 7) % 2 else 0)) % 11 == 0)
            if junta:
                k -= 1.2
            arte[y, x] = PEDRA[0][int(np.clip(round(k), 0, 9))]
    # plinto sob o cavaleiro
    px, py = cfg["pe"]
    for y in range(py, py + 3):
        for x in range(px - 11, px + 12):
            if 0 <= x < W and not cfg["pilar"](x, y):
                k = [5, 3, 2][y - py] + (1 if abs(x - px) < 8 else 0)
                arte[y, x] = PEDRA[1][k]
    for x in range(px - 11, px + 12):
        if not cfg["pilar"](x, py - 1):
            pass


def estatua(cfg: dict) -> tuple[np.ndarray, int, int]:
    """Cavaleiro do Tales em pedra entalhada (RGBA, na escala final), com o canto onde ele entra."""
    k = Image.open(CAVALEIRO).convert("RGBA")
    a = np.asarray(k, dtype=np.float32) / 255
    if cfg["espelho"]:
        a = a[:, ::-1]
    al = a[..., 3] > 0.5
    # o penacho de pena vira uma crista curta de pedra (estátua não tem pluma solta e assim cabe no nicho)
    ww = a.shape[1]
    pena = (a[..., 0] - np.maximum(a[..., 1], a[..., 2]) > 0.18) & (np.arange(a.shape[0])[:, None] < 40)
    # o contorno escuro da pena também sai (pixels escuros que só encostam na pena e no vazio)
    viz_pena = np.zeros_like(pena)
    for s_, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)):
        viz_pena |= np.roll(pena, s_, ax)
    lum0 = a[..., 0] * 0.35 + a[..., 1] * 0.45 + a[..., 2] * 0.2
    al = al & ~pena
    for _ in range(3):
        claro_viz = np.zeros_like(al)
        for s_, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)):
            claro_viz |= np.roll(al & (lum0 >= 0.2), s_, ax)
        al &= ~((lum0 < 0.2) & ~claro_viz & (np.arange(a.shape[0])[:, None] < 40))
    lum = a[..., 0] * 0.35 + a[..., 1] * 0.45 + a[..., 2] * 0.2
    # pedra: rampa da estátua pelo brilho do sprite; contorno (os tons mais escuros) vira o tom mais fundo
    t = np.clip((lum - 0.12) / 0.62, 0, 1) ** 0.85
    idx = np.clip(np.round(t * 4.6 + 0.9), 1, 6).astype(int)
    contorno = lum < 0.2
    # contorno novo onde o penacho foi cortado
    viz = np.zeros_like(al)
    for s_, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)):
        viz |= ~np.roll(al, s_, ax)
    contorno |= al & viz
    idx[contorno] = 0
    # luz de borda do lado da escada (a janela) e um degrau mais escuro do lado de fora
    lado = -1 if not cfg["espelho"] else 1          # vizinho em direção à escada
    borda_luz = al & ~np.roll(al, lado, 1) & ~contorno
    borda_luz |= al & ~contorno & ~np.roll(np.roll(al, lado, 1), 1, 0)
    idx = np.where(borda_luz, np.minimum(idx + 2, 8), idx)
    idx = np.where(al & ~contorno & ~borda_luz & ~np.roll(al, -lado, 1), np.maximum(idx - 1, 1), idx)
    rgb = ESTATUA[idx]
    # musgo nos pés e na base do penacho (tons mais escuros do alto e de baixo)
    g = np.random.default_rng(5 + int(cfg["espelho"]))
    hh = a.shape[0]
    for y in range(hh):
        for x in range(a.shape[1]):
            if al[y, x] and not contorno[y, x] and y > hh - 10 and idx[y, x] <= 4 and g.random() < 0.4:
                rgb[y, x] = MUSGO[int(g.integers(1, 4))]
    rgb[~al] = 0
    rgba = np.concatenate([rgb, al[..., None].astype(np.float32)], -1)
    # sombra do chão pintada no sprite (a faixa clara embaixo) sai: a sombra é feita na luz
    ys, xs = np.nonzero(al)
    base = ys.max()
    rgba[base:, :, 3] = 0
    rgba[base - 1, :, 3] *= (a[base - 1, :, 3] > 0.5) & (lum[base - 1] < 0.6)
    esc = 2                                       # 2 px finais por pixel do sprite (o cavaleiro cabe no nicho)
    big = rgba.repeat(esc, 0).repeat(esc, 1)
    ys, xs = np.nonzero(big[..., 3] > 0.5)
    corpo = 30 if not cfg["espelho"] else a.shape[1] - 1 - 30
    px, py = cfg["pe"]
    X0 = int(px * ESC + 1 - corpo * esc - esc // 2)
    Y0 = int(py * ESC - (ys.max() + 1))
    return big, X0, Y0


def pintar_arte() -> tuple[np.ndarray, dict]:
    s = reduzir()
    d = separar(s)
    arte = quantizar(s, d)
    arte = limpar_ruido(arte)
    musgo(arte, d)
    for cfg in (NICHO_E, NICHO_D):
        nicho(arte, d, cfg)
    estandarte(arte, 52, 40, 13, 46, 3)
    estandarte(arte, 336, 40, 13, 46, 4)
    arte = chamas(arte)
    return arte, d


# ─────────────────────────────── 2. Luz em 3x ───────────────────────────────
def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def _caixa(arr: np.ndarray, r: int, eixo: int) -> np.ndarray:
    pad = [(0, 0)] * arr.ndim
    pad[eixo] = (r + 1, r)
    a = np.pad(arr, pad, mode="edge")
    s = np.cumsum(a, axis=eixo, dtype=np.float64)
    n = arr.shape[eixo]
    alto = np.take(s, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo)
    baixo = np.take(s, np.arange(0, n), axis=eixo)
    return ((alto - baixo) / (2 * r + 1)).astype(np.float32)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque gaussiano aproximado (três passadas de caixa), em float: preserva luzes acima de 1."""
    if raio <= 0:
        return arr
    r = max(1, int(round(raio * 0.85)))
    out = arr.astype(np.float32)
    for _ in range(3):
        out = _caixa(out, r, 0)
        out = _caixa(out, r, 1)
    return out


GY, GX = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)
GYa, GXa = GY / ESC, GX / ESC


def luz_em_degraus(cx: float, cy: float, raio: float, achatar: float, seed: int, degraus: int = 6) -> np.ndarray:
    """Poça de luz com a borda irregular e anéis de pixel art na queda."""
    x0, x1 = int(max(0, (cx - raio * 2.2) * ESC)), int(min(W * ESC, (cx + raio * 2.2) * ESC))
    y0, y1 = int(max(0, (cy - raio * 2.2 * achatar) * ESC)), int(min(H * ESC, (cy + raio * 2.2 * achatar) * ESC))
    out = np.zeros((H * ESC, W * ESC), np.float32)
    gx, gy = GXa[y0:y1, x0:x1], GYa[y0:y1, x0:x1]
    ang = np.arctan2(gy - cy, gx - cx)
    g = np.random.default_rng(abs(int(seed)))
    f = [g.random() * 6.28 for _ in range(3)]
    mod = 1 + 0.08 * np.sin(5 * ang + f[0]) + 0.05 * np.sin(9 * ang + f[1]) + 0.03 * np.sin(14 * ang + f[2])
    d2 = ((gx - cx) / (raio * mod)) ** 2 + ((gy - cy) / (raio * achatar * mod)) ** 2
    i = np.exp(-d2 * 2.2)
    # faixas presas à grade de arte (cada degrau muda em blocos de 3 px)
    ia = np.exp(-(((np.floor(gx) + 0.5 - cx) / (raio * mod)) ** 2 +
                  ((np.floor(gy) + 0.5 - cy) / (raio * achatar * mod)) ** 2) * 2.2)
    out[y0:y1, x0:x1] = i * 0.5 + np.floor(ia * degraus) / degraus * 0.5
    return out


def raios_de_luz(mascara: np.ndarray, fonte: tuple[float, float], passos: int = 80, alcance: float = 0.95,
                 queda: float = 0.972) -> np.ndarray:
    hh, ww = mascara.shape
    sx, sy = fonte[0] * ESC, fonte[1] * ESC
    acum = np.zeros_like(mascara)
    peso = 1.0
    for i in range(passos):
        t = i / passos * alcance
        px = np.clip((GX + (sx - GX) * t).astype(np.int32), 0, ww - 1)
        py = np.clip((GY + (sy - GY) * t).astype(np.int32), 0, hh - 1)
        acum += mascara[py, px] * peso
        peso *= queda
    return acum / passos


def facho(x_topo, y_topo, x_base, y_base, larg_topo, larg_base, dureza: float = 1.0) -> np.ndarray:
    t = np.clip((GYa - y_topo) / (y_base - y_topo), 0, 1.3)
    centro = x_topo + (x_base - x_topo) * t
    larg = larg_topo + (larg_base - larg_topo) * t
    dist = np.abs(GXa - centro) / np.maximum(larg, 0.5)
    return np.exp(-dist ** (2 * dureza) * 2.4) * (GYa > y_topo)


def elipse_sombra(cx, cy, rx, ry) -> np.ndarray:
    d = ((GXa - cx) / rx) ** 2 + ((GYa - cy) / ry) ** 2
    return np.clip(1 - d, 0, 1) ** 0.8


def montar(arte: np.ndarray, d: dict) -> Image.Image:
    img = ampliar(arte).astype(np.float32)
    # cavaleiros de pedra (na escala final, atrás do pilar do corrimão)
    for cfg in (NICHO_E, NICHO_D):
        big, X0, Y0 = estatua(cfg)
        hh, ww = big.shape[:2]
        sub = img[Y0:Y0 + hh, X0:X0 + ww]
        m = big[..., 3] > 0.5
        m &= ~cfg["pilar"](GXa[Y0:Y0 + hh, X0:X0 + ww], GYa[Y0:Y0 + hh, X0:X0 + ww])
        sub[m] = big[..., :3][m]
    jan = ampliar(d["janela"].astype(np.float32))
    luz_assada = ampliar(np.digitize(d["luz"], [0.05, 0.13, 0.24]).astype(np.float32) / 3)

    # ── ambiente: o salão fica na penumbra fria; a luz vem da janela e das velas
    img *= 0.86
    # faixa dos cartões (o chão da frente): menos contraste e um pouco mais escura, sem corte visível; as velas e
    # a luz entram depois, então as chamas continuam vivas
    calma = suave(0.64, 0.78, GY / (H * ESC))[:, :, None]
    media = desfocar(img, 14)
    img = media + (img - media) * (1 - 0.3 * calma)
    img *= 1 - 0.22 * calma
    # sombras de contato (pés das estátuas, bloco, base dos pilares e da escada)
    sombra = (elipse_sombra(87, 107, 12, 2.2) + elipse_sombra(312, 107, 12, 2.2) + elipse_sombra(322, 163, 24, 4) +
              elipse_sombra(68, 177, 14, 3) + elipse_sombra(296, 172, 13, 3) + elipse_sombra(108, 131, 14, 3) +
              elipse_sombra(292, 131, 14, 3))
    img *= (1 - np.clip(sombra, 0, 1) * 0.45)[:, :, None]

    # ── a janela: céu emissivo e fachos volumétricos descendo a escada
    img += jan[:, :, None] * img * 0.25
    brilho = np.exp(-np.hypot(GXa - ROSACEA[0], (GYa - ROSACEA[1]) * 1.1) / 18)
    raios = raios_de_luz((jan * (0.35 + brilho * 1.6)).astype(np.float32), ROSACEA, passos=96, alcance=0.97,
                         queda=0.978)
    raios = desfocar(raios[:, :, None], 3)[:, :, 0]
    img += raios[:, :, None] * (1 - jan * 0.8)[:, :, None] * hexa("#ffc87a") * 1.1
    poe = ruido(31, 40, W * ESC, H * ESC)
    f = (facho(200, 22, 200, 168, 22, 70, 1.25) * 0.35 + facho(186, 22, 146, 162, 5, 20, 2.2) * 0.45 +
         facho(214, 22, 256, 162, 5, 20, 2.2) * 0.45 + facho(200, 22, 200, 150, 4, 14, 2.4) * 0.4 +
         facho(193, 22, 172, 160, 3, 10, 2.4) * 0.3 + facho(207, 22, 230, 160, 3, 10, 2.4) * 0.3)
    f = f * (0.6 + 0.55 * poe) * (1 - suave(150, 200, GYa))
    f = desfocar(f[:, :, None], 2)[:, :, 0]
    img += f[:, :, None] * hexa("#ffcf88") * 0.36
    # a luz assada (as manchas da rosácea na escada) ganha um brilho quente a mais
    img += (luz_assada * (1 - jan))[:, :, None] * img * 0.12 * (1 - suave(140, 200, GYa))[:, :, None]
    # a poça de luz no chão da frente desce um pouco (os cartões ficam por cima)
    img *= (1 - luz_assada * suave(132, 165, GYa) * 0.22)[:, :, None]
    # poeira dourada no facho
    g = np.random.default_rng(83)
    pp = f * 2.2 + raios * 1.2
    for _ in range(2200):
        X, Y = int(g.random() * (W * ESC - 4)), int(g.random() * (H * ESC - 4))
        k = pp[Y, X] * (0.3 + g.random() * 0.8)
        if k > 0.06:
            tam = 2 if g.random() < 0.7 else 3
            img[Y:Y + tam, X:X + tam] += hexa("#ffe2a8") * k * 0.9

    # ── velas: luz pontual em faixas, núcleo e brilho
    vela = np.zeros((H, W), np.float32)
    for x, y in VELAS:
        vela[max(0, y - 2):y + 7, x - 1:x + 2] = 1
    vela = ampliar(vela)
    pontual = np.zeros((H * ESC, W * ESC), np.float32)
    nucleo = np.zeros((H * ESC, W * ESC), np.float32)
    for i, (x, y) in enumerate(VELAS):
        chao = (x, y) in VELAS_CHAO
        baixo = suave(180, 215, y)
        raio = (15 if chao else 12.5) * (1 - 0.3 * baixo)
        k = (1.5 if chao else 1.15) * (1 - 0.45 * baixo)
        pontual += luz_em_degraus(x + 0.5, y + 1, raio, 0.75 if chao else 1.0, 100 + i) * k
        nucleo[y * ESC - 2:y * ESC + 3, x * ESC:x * ESC + 3] += 1
    # a vela não estoura: na cera e na chama a luz pontual entra fraca (o brilho vem do núcleo)
    img += (pontual * (1 - vela * 0.8))[:, :, None] * img * hexa("#ffa040") * 1.9
    img += pontual[:, :, None] * hexa("#ff8a30") * 0.13
    img += nucleo[:, :, None] * img * 0.5
    img += desfocar(nucleo[:, :, None], 3) * hexa("#ffb050") * 0.9
    img += desfocar(nucleo[:, :, None], 10) * hexa("#ff9038") * 1.0

    # ── profundidade de campo: a janela do fundo mais macia, a borda de baixo um pouco
    longe = ((1 - suave(38, 52, GYa)) * suave(120, 140, GXa) * (1 - suave(260, 280, GXa)))[:, :, None]
    perto = suave(205, 225, GYa)[:, :, None]
    img = img * (1 - longe * 0.5) + desfocar(img, 1.0) * longe * 0.5
    img = img * (1 - perto * 0.8) + desfocar(img, 2.5) * perto * 0.8

    # ── acabamento: brilho, curva de tom, cor, faixa calma dos cartões, vinheta e grão
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.85) * 4, 0, 1), 0, 2)
    img = img + desfocar(claro, 10) * 0.35 + desfocar(claro, 32) * 0.3
    joelho = 0.7
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, fr = hexa("#ffd9a0"), hexa("#8fa0d8")
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.8 + 0.2 * (lum * q + (1 - lum) * (fr * 0.5 + 0.5)))
    img = np.clip((img - 0.45) * 1.06 + 0.45, 0, 1.2)
    yn, xn = GY / (H * ESC), GX / (W * ESC)
    v = (xn - 0.5) ** 2 * 1.2 + (yn - 0.45) ** 2 * 1.4
    img *= (1 - np.clip(v - 0.06, 0, 1) * 1.15)[:, :, None]
    gg = np.random.default_rng(99)
    img += (gg.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.014
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    arte, d = pintar_arte()
    if "--arte" in sys.argv:
        pasta = Path(sys.argv[sys.argv.index("--arte") + 1])
        pasta.mkdir(parents=True, exist_ok=True)
        Image.fromarray((arte * 255).astype(np.uint8)).save(pasta / "arte400.png")
    img = montar(arte, d)
    PASTA.mkdir(parents=True, exist_ok=True)
    img.save(PASTA / "escadaria.webp", quality=84, method=6)
    img.resize((960, 540), Image.LANCZOS).save(PASTA / "escadaria-960.webp", quality=82, method=6)
    meta = {
        "base": [W, H], "escala": ESC,
        "recorte_desktop": {"y0": 0.14, "y1": 0.86},
        "foco": {"x": 0.5, "y": 0.34},
        "notas": "Escadaria da Ascensão (Salão dos Cem). Base do Tales (PixelLab) refeita em pixel art 400x225 e luz "
                 "HD-2D em 3x por scripts/cenarios/escadaria_cem.py. Cartões claros sobre o chão da frente "
                 "(faixa de baixo calma e mais escura); escada e rosácea no centro.",
    }
    (PASTA / "escadaria.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
    for n in ("escadaria.webp", "escadaria-960.webp"):
        print(n, (PASTA / n).stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
