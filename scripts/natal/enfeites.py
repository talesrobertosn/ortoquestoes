"""
Enfeites de Natal da página inicial (modo Natal, docs/design/MODO-NATAL.md, 21/11/2026).

Pixel art HD-2D pintada por código: cada peça é desenhada em pixels pequenos (agulha por agulha, vidro com reflexo,
fita com dobra, neve com sombra azulada), ampliada 2x e iluminada com luz calculada (as lâmpadas acesas tingem as
agulhas em volta). Nada copiado das referências; elas só deram o clima.

Saídas em public/pixel/natal/:
  festao-miolo.png        festão de pinheiro que repete na horizontal (uma barriga por peça)
  festao-ponta.png        o laço vermelho da ponta (o da direita é o mesmo espelhado no CSS)
  festao-luzes-a.png / -b as duas turmas de lâmpadas acesas do festão, para piscar alternadas
  pisca-fio.png           a barriga do fio do pisca-pisca (estica na largura de cada atalho)
  lampadas.png            5 cores x (apagada, acesa), cada quadro 12 x 18 px da arte
  lampadas-brilho.png     o halo de cada cor (5 quadros de 40 x 40 px da arte)
  guirlanda.png           coroa de pinho com laço, fitas e luzinhas, para o canto da barra
  arvore.png              a árvore de Natal com estrela, bolas, cordão de luz e presentes
  arvore-estrela.png      o brilho da estrela (pulsa no CSS)
  neve-borda.png          neve acumulada em cima das caixas (repete na horizontal)
  laco.png                laço de presente para o canto das faixas

Uso: python3 scripts/natal/enfeites.py   (numpy + Pillow)
"""
from __future__ import annotations

import math
import os

import numpy as np
from PIL import Image, ImageFilter

S = 2  # cada pixel da arte vira 2 x 2 na tela
SAIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'pixel', 'natal')

# ---------------------------------------------------------------- paletas (5 a 7 tons por material)
PINHO = [(10, 30, 26), (16, 46, 36), (24, 64, 44), (36, 86, 52), (54, 110, 60), (82, 138, 70), (122, 166, 88)]
PINHO_FRIO = [(10, 28, 32), (14, 42, 44), (22, 58, 56), (32, 78, 66), (48, 100, 76), (74, 128, 92), (112, 156, 112)]
VERMELHO = [(58, 10, 18), (98, 18, 28), (142, 28, 36), (186, 44, 46), (220, 78, 66), (246, 128, 104)]
OURO = [(78, 46, 10), (128, 82, 18), (178, 124, 30), (222, 170, 52), (246, 210, 104), (255, 240, 180)]
NEVE = [(126, 150, 186), (162, 186, 216), (196, 214, 236), (226, 236, 248), (246, 250, 255)]
CASCA = [(36, 20, 14), (62, 36, 22), (92, 56, 32), (124, 80, 44), (156, 108, 62)]
METAL = [(38, 40, 44), (78, 80, 86), (128, 130, 136), (184, 186, 190), (232, 232, 236)]
CONTORNO = (12, 18, 16)

# As cores das lâmpadas: vidro (escuro, meio, claro, reflexo) e a cor da luz.
LAMPADAS = {
    'vermelha': ([(96, 16, 22), (176, 36, 40), (232, 84, 72), (255, 196, 180)], (255, 92, 70)),
    'ouro': ([(120, 76, 12), (206, 150, 30), (250, 206, 84), (255, 246, 206)], (255, 196, 80)),
    'verde': ([(14, 80, 62), (34, 150, 112), (96, 214, 164), (220, 255, 236)], (90, 230, 170)),
    'azul': ([(22, 46, 120), (52, 98, 204), (120, 170, 250), (226, 238, 255)], (110, 160, 255)),
    'quente': ([(128, 92, 40), (222, 184, 112), (255, 232, 172), (255, 252, 236)], (255, 220, 150)),
}
ORDEM_CORES = ['vermelha', 'ouro', 'verde', 'azul', 'quente']


def rng(semente: int) -> np.random.Generator:
    return np.random.default_rng(semente)


class Tela:
    """Uma tela RGBA na resolução da arte (1 pixel = 1 pixel de pixel art)."""

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.cor = np.zeros((h, w, 3), np.float32)
        self.a = np.zeros((h, w), np.float32)

    def p(self, x, y, c, a=1.0):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.cor[y, x] = c
            self.a[y, x] = max(self.a[y, x], a)

    def pw(self, x, y, c):
        """Pinta com volta na horizontal (peças que repetem)."""
        self.p(int(round(x)) % self.w, y, c)

    def vazio(self, x, y):
        return not (0 <= x < self.w and 0 <= y < self.h) or self.a[y, x] == 0

    def contorno(self, cor=CONTORNO, volta=False):
        """Contorno de 1 px por fora de tudo o que foi pintado (lê bem sobre fundo claro e escuro)."""
        cheio = self.a > 0
        viz = np.zeros_like(cheio)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if volta:
                viz |= np.roll(np.roll(cheio, dy, 0), dx, 1) & ~((dy == 1) & (np.arange(self.h)[:, None] == 0)) & ~((dy == -1) & (np.arange(self.h)[:, None] == self.h - 1))
            else:
                s = np.zeros_like(cheio)
                ys = slice(max(dy, 0), self.h + min(dy, 0)); yd = slice(max(-dy, 0), self.h + min(-dy, 0))
                xs = slice(max(dx, 0), self.w + min(dx, 0)); xd = slice(max(-dx, 0), self.w + min(-dx, 0))
                s[ys, xs] = cheio[yd, xd]
                viz |= s
        borda = viz & ~cheio
        self.cor[borda] = cor
        self.a[borda] = 1.0

    def ampliar(self) -> tuple[np.ndarray, np.ndarray]:
        cor = self.cor.repeat(S, 0).repeat(S, 1)
        a = self.a.repeat(S, 0).repeat(S, 1)
        return cor, a


# ---------------------------------------------------------------- materiais
def agulhas(t: Tela, cx, cy, raio, semente, paleta=PINHO, volta=False, densidade=1.0, neve=0.0, brilho=1.0):
    """Um tufo de pinheiro: agulhas curtas saindo do centro, luz de cima à esquerda, neve nas pontas de cima."""
    r = rng(semente)
    n = int(18 * densidade * raio / 4)
    pinta = t.pw if volta else t.p
    for _ in range(n):
        ang = r.uniform(0, 2 * math.pi)
        comp = r.uniform(raio * 0.45, raio * 1.05)
        # Agulhas que apontam para cima e para a esquerda pegam mais luz.
        luz = 0.5 - 0.35 * math.sin(ang) - 0.2 * math.cos(ang)
        for k in range(int(comp) + 1):
            f = k / max(comp, 1)
            x = cx + math.cos(ang) * k
            y = cy + math.sin(ang) * k * 0.8
            tom = 1 + int(np.clip((luz + f * 0.6) * 4.2 * brilho + r.uniform(-0.6, 0.6), 0, 5))
            pinta(x, y, paleta[tom])
    # Miolo escuro (profundidade) e ponta clara aqui e ali.
    for _ in range(int(3 * densidade)):
        pinta(cx + r.integers(-1, 2), cy + r.integers(-1, 2), paleta[0])
    for _ in range(int(2 * densidade)):
        a = r.uniform(math.pi * 1.1, math.pi * 1.6)
        pinta(cx + math.cos(a) * raio, cy + math.sin(a) * raio * 0.8, paleta[6])
    if neve > 0:
        for _ in range(int(6 * neve * raio / 4)):
            x = cx + r.uniform(-raio, raio * 0.8)
            y = cy - r.uniform(raio * 0.35, raio * 0.85)
            pinta(x, y, NEVE[r.integers(2, 5)])
            pinta(x + 1, y, NEVE[r.integers(1, 4)])


def lampada(t: Tela, x, y, cor, acesa=False, volta=False):
    """Lâmpada de vidro em gota com soquete de metal: 3 de largura, 5 de altura, soquete de 2."""
    vidro, _ = LAMPADAS[cor]
    pinta = t.pw if volta else t.p
    # soquete
    pinta(x, y, METAL[1]); pinta(x + 1, y, METAL[3]); pinta(x + 2, y, METAL[1])
    pinta(x, y + 1, METAL[0]); pinta(x + 1, y + 1, METAL[2]); pinta(x + 2, y + 1, METAL[0])
    base = 1 if not acesa else 2
    corpo = [(0, 2, base - 1), (1, 2, base), (2, 2, base - 1),
             (0, 3, base), (1, 3, base + 1 if acesa else base), (2, 3, base - 1),
             (0, 4, base - 1), (1, 4, base), (2, 4, max(base - 1, 0)),
             (1, 5, base - 1)]
    for dx, dy, tom in corpo:
        pinta(x + dx, y + dy, vidro[min(max(tom, 0), 3)])
    pinta(x, y + 2, vidro[3] if acesa else vidro[2])  # reflexo na quina de luz


def halo(w, h, pontos, raio, forca=1.0):
    """Mapa de luz (float, na escala da tela): gaussiana somada em volta de cada ponto [(x, y, (r,g,b)), ...]."""
    luz = np.zeros((h * S, w * S, 3), np.float32)
    yy, xx = np.mgrid[0:h * S, 0:w * S].astype(np.float32)
    for x, y, c in pontos:
        cx, cy = (x + 0.5) * S, (y + 0.5) * S
        d2 = (xx - cx) ** 2 + (yy - cy) ** 2
        g = np.exp(-d2 / (2 * (raio * S) ** 2)) * forca
        # anel de borda em faixas (pixel art: a luz cai em degraus)
        g = np.floor(g * 6) / 6
        luz += g[..., None] * (np.array(c, np.float32) / 255.0)
    return luz


def salvar(nome, cor, a):
    img = np.dstack([np.clip(cor, 0, 255), np.clip(a * 255, 0, 255)]).astype(np.uint8)
    Image.fromarray(img, 'RGBA').save(os.path.join(SAIDA, nome), optimize=True)
    print('salvo', nome, img.shape[1], 'x', img.shape[0])


def iluminar(cor, a, luz, forca=0.9):
    """Luz quente na pintura: soma a cor da lâmpada ao material, sem estourar (mapeamento de tom suave)."""
    lit = cor / 255.0
    lit = lit + lit * luz * forca * 1.6 + luz * 0.18 * forca
    lit = 1 - np.exp(-lit * 1.25)  # tom
    lit = lit / (1 - math.exp(-1.25))
    return np.clip(lit * 255, 0, 255) * (a[..., None] > 0)


def brilho_png(w, h, pontos, raio):
    """Camada só de luz (halo + miolo aceso), com alfa vindo da intensidade: piscar = mexer na opacidade."""
    luz = halo(w, h, [(x, y, c) for x, y, c in pontos], raio, 0.85)
    lum = luz.max(axis=2)
    a = np.clip(lum * 1.15, 0, 0.92)
    cor = np.where(lum[..., None] > 0, luz / np.maximum(lum[..., None], 1e-4), 0) * 255
    cor = np.clip(cor * 0.75 + 255 * 0.25 * (lum[..., None] > 0.55), 0, 255)
    return cor, a


def brilho_luz(w, h, pontos, raio, raio_largo, volta=False, forca_larga=0.42):
    """Halo perto (forte, em faixas) + luz espalhada larga (fraca, contínua): a luz que cai no que está em volta.
    Com volta=True, repete os pontos uma largura para cada lado (peça que repete sem emenda)."""
    pts = list(pontos)
    if volta:
        pts = pts + [(x - w, y, c) for x, y, c in pontos] + [(x + w, y, c) for x, y, c in pontos]
    perto = halo(w, h, pts, raio, 0.85)
    yy, xx = np.mgrid[0:h * S, 0:w * S].astype(np.float32)
    largo = np.zeros_like(perto)
    for x, y, c in pts:
        d2 = (xx - (x + 0.5) * S) ** 2 + (yy - (y + 0.5) * S) ** 2
        g = np.exp(-d2 / (2 * (raio_largo * S) ** 2)) * forca_larga
        g = np.floor(g * 14) / 14  # degraus finos, como luz em pixel art
        largo += g[..., None] * (np.array(c, np.float32) / 255.0)
    luz = perto + largo
    # A luz morre antes da borda da imagem (sem quina reta): janela suave nos quatro lados (só em cima e embaixo
    # quando a peça repete na horizontal).
    def janela(n, m):
        t = np.minimum(np.arange(n) + 0.5, n - np.arange(n) - 0.5) / (n * m)
        return np.clip(t, 0, 1) ** 1.5
    jy = janela(h * S, 0.22)[:, None]
    jx = np.ones((1, w * S)) if volta else janela(w * S, 0.22)[None, :]
    luz = luz * (jy * jx)[..., None]
    lum = luz.max(axis=2)
    a = np.clip(lum * 1.1, 0, 0.92)
    cor = np.where(lum[..., None] > 0, luz / np.maximum(lum[..., None], 1e-4), 0) * 255
    cor = np.clip(cor * 0.85 + 255 * 0.15 * (lum[..., None] > 0.7), 0, 255)
    return cor, a


# ---------------------------------------------------------------- 1. festão
def curva_festao(x, W):
    return 5 + 11 * math.sin(math.pi * (x % W) / W)


def festao():
    W, H = 128, 50
    t = Tela(W, H)
    r = rng(11)
    # fio escuro por dentro (só aparece entre os tufos)
    for x in range(W):
        t.pw(x, curva_festao(x, W) + 1, PINHO[0])
    # tufos de trás (escuros e frios), depois os da frente
    for x in np.arange(0, W, 3.2):
        y = curva_festao(x, W)
        agulhas(t, x, y + 1, 4.2, int(x * 7) + 1, PINHO_FRIO, volta=True, densidade=0.9)
    for x in np.arange(1.5, W, 4.1):
        y = curva_festao(x, W)
        agulhas(t, x + r.uniform(-0.6, 0.6), y + r.uniform(-0.8, 0.4), 4.6, int(x * 13) + 5, PINHO, volta=True, densidade=1.1, neve=0.8)
    # fita vermelha em espiral por cima (só a metade da frente da volta)
    for i in range(W * 3):
        x = i / 3
        fase = 2 * math.pi * x / 16
        if math.cos(fase) < -0.1:
            continue
        y = curva_festao(x, W) + 3.2 * math.sin(fase)
        tom = 3 + int(math.cos(fase) > 0.75) - int(math.sin(fase) > 0.55)
        t.pw(x, y, VERMELHO[tom]); t.pw(x, y + 1, VERMELHO[max(tom - 2, 0)])
    # frutinhas vermelhas e pinhas
    for bx in (26, 70, 102):
        by = curva_festao(bx, W) + 2
        for dx, dy, tom in ((0, 0, 4), (1, 0, 3), (0, 1, 2), (2, 1, 3), (1, 2, 1), (2, 2, 4)):
            t.pw(bx + dx, by + dy, VERMELHO[tom])
        t.pw(bx, by, VERMELHO[5])
    for px in (48, 90):
        py = curva_festao(px, W) + 2
        for dy in range(5):
            for dx in range(-1 + (dy in (0, 4)), 2 - (dy in (0, 4))):
                t.pw(px + dx, py + dy, CASCA[1 + ((dx + dy) % 3)])
        t.pw(px - 1, py + 1, CASCA[4]); t.pw(px, py + 3, CASCA[4])
    # lâmpadas penduradas: 6 por barriga, cores em rodízio
    luzes = []
    for i, lx in enumerate(np.linspace(10, W - 11, 6)):
        lx = int(lx)
        ly = int(curva_festao(lx, W) + 4)
        cor = ORDEM_CORES[i % len(ORDEM_CORES)]
        t.pw(lx + 1, ly - 1, PINHO[0])
        lampada(t, lx, ly, cor, acesa=False, volta=True)
        luzes.append((lx + 1, ly + 3, LAMPADAS[cor][1], cor, i % 2))
    t.contorno(volta=True)
    cor, a = t.ampliar()
    # luz ambiente fraca das lâmpadas na própria pintura (sempre um pouco acesas)
    luz = halo(W, H, [(x, y, c) for x, y, c, _, _ in luzes], 5.5, 0.55)
    salvar('festao-miolo.png', iluminar(cor, a, luz, 0.7), a)
    # as duas turmas acesas
    for turma, nome in ((0, 'a'), (1, 'b')):
        tl = Tela(W, H)
        pts = []
        for x, y, c, nomecor, tt in luzes:
            if tt != turma:
                continue
            lampada(tl, x - 1, y - 3, nomecor, acesa=True, volta=True)
            pts.append((x, y, c))
        bc, ba = brilho_luz(W, H, pts, 4.6, 13.0, volta=True)
        lc, la = tl.ampliar()
        m = la > 0
        bc[m] = lc[m]; ba[m] = 1.0
        salvar(f'festao-luzes-{nome}.png', bc, ba)


def laco(t: Tela, cx, cy, escala=1.0, caudas=10):
    """Laço de veludo vermelho: duas alças, nó com conta dourada e duas caudas com ponta em V."""
    e = escala
    for lado in (-1, 1):
        # alça: elipse inclinada, oca no meio
        for yy in range(-int(5 * e), int(5 * e) + 1):
            for xx in range(0, int(9 * e) + 1):
                u = (xx - 4.5 * e) / (4.7 * e)
                v = (yy + xx * 0.18 * lado * 0) / (4.6 * e)
                d = u * u + v * v
                if d <= 1.0:
                    x = cx + lado * (xx + 2)
                    y = cy + yy - int(xx * 0.25)
                    if d > 0.42 or yy > 1:
                        luz = -yy / (5 * e) * 0.9 + (0.3 if lado < 0 else -0.1) - d * 0.6
                        t.p(x, y, VERMELHO[int(np.clip(2.6 + luz * 2.4, 0, 5))])
                    else:
                        t.p(x, y, VERMELHO[0])
    # caudas
    for lado in (-1, 1):
        for k in range(caudas):
            x = cx + lado * (1 + k * 0.45)
            y = cy + 2 + k
            larg = 3 if k < caudas - 2 else 2
            for j in range(larg):
                tom = 2 + (j == 0) - (k > caudas * 0.6)
                t.p(x + lado * j, y, VERMELHO[max(tom, 0)])
        # ponta em V
        t.p(cx + lado * (1 + caudas * 0.45) + lado, cy + 2 + caudas, VERMELHO[1])
    # nó
    for yy in range(-2, 3):
        for xx in range(-2, 3):
            if abs(xx) + abs(yy) <= 3:
                t.p(cx + xx, cy + yy, VERMELHO[3 + (yy < 0) - (xx > 0)])
    t.p(cx, cy, OURO[4]); t.p(cx - 1, cy - 1, OURO[5]); t.p(cx + 1, cy, OURO[2]); t.p(cx, cy + 1, OURO[2])


def festao_ponta():
    W, H = 30, 34
    t = Tela(W, H)
    # tufo final do pinheiro, preso no gancho
    for i, (x, y, rr) in enumerate(((20, 6, 5), (24, 9, 4.6), (16, 9, 4.2), (27, 5, 4))):
        agulhas(t, x, y, rr, 300 + i, PINHO, densidade=1.2, neve=0.9)
    laco(t, 15, 7, 0.95, caudas=13)
    t.contorno()
    cor, a = t.ampliar()
    salvar('festao-ponta.png', cor, a)


# ---------------------------------------------------------------- 2. pisca-pisca
def pisca():
    W, H = 96, 18
    t = Tela(W, H)
    for i in range(W * 4):
        x = i / 4
        y = 1 + 10 * math.sin(math.pi * x / W) ** 1.2
        t.p(x, y, (20, 30, 26))
        t.p(x, y + 1, (44, 62, 52) if int(x) % 5 else (60, 84, 70))  # fio torcido
    t.contorno()
    cor, a = t.ampliar()
    salvar('pisca-fio.png', cor, a)
    # folha das lâmpadas: 5 cores x 2 estados, quadro 12 x 18 (lâmpada maior, 5 x 9, com cabinho de fio)
    QW, QH = 12, 18
    folha = Tela(QW * 2, QH * 5)
    for li, nome in enumerate(ORDEM_CORES):
        vidro, _ = LAMPADAS[nome]
        for ci, acesa in enumerate((False, True)):
            ox, oy = ci * QW + 3, li * QH + 1
            # cabinho e soquete serrilhado
            folha.p(ox + 3, oy, (44, 62, 52)); folha.p(ox + 3, oy + 1, (20, 30, 26))
            for dy in range(3):
                for dx in range(5):
                    folha.p(ox + 1 + dx, oy + 2 + dy, METAL[[1, 3, 4, 2, 0][dx] - (dy == 2)] if dy != 1 else METAL[[0, 2, 3, 1, 0][dx]])
            # vidro em gota 7 x 9
            forma = ['.#####.', '#######', '#######', '#######', '#######', '.#####.', '.#####.', '..###..', '...#...']
            for dy, linha in enumerate(forma):
                for dx, ch in enumerate(linha):
                    if ch != '#':
                        continue
                    u = (dx - 3) / 3.5
                    v = (dy - 3.5) / 4.5
                    luz = -u * 0.6 - v * 0.5
                    tom = 1 + (luz > 0.2) - (luz < -0.45)
                    if acesa:
                        tom = min(3, tom + 1)
                        # miolo incandescente
                        if abs(dx - 3) <= 1 and 2 <= dy <= 5:
                            tom = 3
                    folha.p(ox + dx, oy + 5 + dy, vidro[tom])
            # reflexo e filamento
            folha.p(ox + 1, oy + 6, vidro[3]); folha.p(ox + 2, oy + 6, vidro[3] if acesa else vidro[2]); folha.p(ox + 1, oy + 7, vidro[2])
            if acesa:
                folha.p(ox + 3, oy + 8, (255, 255, 240)); folha.p(ox + 3, oy + 9, (255, 252, 230))
            else:
                folha.p(ox + 3, oy + 8, METAL[2])
    folha.contorno()
    c, a = folha.ampliar()
    salvar('lampadas.png', c, a)
    # halos: 5 quadros de 40 x 40
    HW = 56
    pontos = [(li * HW + HW // 2, HW // 2, LAMPADAS[nome][1]) for li, nome in enumerate(ORDEM_CORES)]
    bc, ba = brilho_luz(HW * 5, HW, pontos, 6.0, 12.0)
    salvar('lampadas-brilho.png', bc, ba)
    # o reflexo de cada lâmpada na superfície embaixo dela: poça elíptica na cor da luz (5 quadros de 48 x 12)
    RW, RH = 48, 12
    yy, xx = np.mgrid[0:RH * S, 0:RW * 5 * S].astype(np.float32)
    luz = np.zeros((RH * S, RW * 5 * S, 3), np.float32)
    for li, nome in enumerate(ORDEM_CORES):
        cx, cy = (li * RW + RW / 2) * S, RH / 2 * S
        d = ((xx - cx) / (RW * 0.42 * S)) ** 2 + ((yy - cy) / (RH * 0.42 * S)) ** 2
        g = np.floor(np.exp(-d * 2.2) * 8) / 8 * 0.7
        luz += g[..., None] * (np.array(LAMPADAS[nome][1], np.float32) / 255.0)
    lum = luz.max(axis=2)
    cor = np.where(lum[..., None] > 0, luz / np.maximum(lum[..., None], 1e-4), 0) * 255
    salvar('lampadas-reflexo.png', cor, np.clip(lum, 0, 0.8))


# ---------------------------------------------------------------- 3. guirlanda
def guirlanda():
    W, H = 60, 76
    t = Tela(W, H)
    cx, cy, R = 30, 28, 20
    # anel de tufos em três voltas (trás frio, meio, frente com neve)
    for volta, (rr, pal, dens, nv, n) in enumerate(((R + 1, PINHO_FRIO, 0.9, 0, 20), (R - 2, PINHO, 1.0, 0.3, 22), (R, PINHO, 1.15, 0.9, 18))):
        for k in range(n):
            ang = 2 * math.pi * k / n + volta * 0.23
            agulhas(t, cx + math.cos(ang) * rr * 0.9, cy + math.sin(ang) * rr * 0.9, 5.2 - volta * 0.4, 700 + volta * 50 + k, pal, densidade=dens, neve=nv * max(0, -math.sin(ang)))
    # furo do meio
    for y in range(H):
        for x in range(W):
            if (x - cx) ** 2 + (y - cy) ** 2 < (R - 9) ** 2:
                t.a[y, x] = 0
    # frutinhas, pinhas e luzinhas quentes
    luzes = []
    for k in range(9):
        ang = 2 * math.pi * k / 9 + 0.4
        x, y = cx + math.cos(ang) * (R - 3), cy + math.sin(ang) * (R - 3)
        if k % 3 == 0:
            for dx, dy, tom in ((0, 0, 4), (1, 0, 3), (0, 1, 2), (1, 1, 1), (-1, 1, 3)):
                t.p(x + dx, y + dy, VERMELHO[tom])
            t.p(x, y, VERMELHO[5])
        elif k % 3 == 1:
            for dy in range(4):
                for dx in range(-1, 2):
                    if not (dy in (0, 3) and dx != 0):
                        t.p(x + dx, y + dy, CASCA[1 + (dx + dy) % 3])
            t.p(x - 1, y + 1, CASCA[4])
        else:
            t.p(x, y, (255, 236, 180)); t.p(x + 1, y, (255, 210, 130)); t.p(x, y + 1, (230, 170, 90))
            luzes.append((x, y, (255, 214, 140)))
    # laço embaixo, com caudas longas
    laco(t, cx, cy + R - 1, 1.15, caudas=18)
    t.contorno()
    cor, a = t.ampliar()
    luz = halo(W, H, luzes, 5.0, 0.75)
    salvar('guirlanda.png', iluminar(cor, a, luz, 0.85), a)
    bc, ba = brilho_luz(W, H, luzes, 3.0, 10.0, forca_larga=0.3)
    salvar('guirlanda-luz.png', bc, ba)


# ---------------------------------------------------------------- 4. árvore
def arvore():
    W, H = 56, 86
    t = Tela(W, H)
    r = rng(42)
    topo, base = 12, 70
    # tronco
    for y in range(base - 2, base + 6):
        for x in range(25, 31):
            t.p(x, y, CASCA[1 + (x == 26) + (x == 27) - (x == 30) + (y % 3 == 0 and x == 28)])
    # copa em quatro andares, cada um uma saia de tufos que se abre
    andares = [(topo, 22, 6), (22, 34, 10), (32, 48, 15), (45, base, 21)]
    for i, (y0, y1, larg) in enumerate(andares):
        for y in np.arange(y0, y1, 1.6):
            f = (y - y0) / (y1 - y0)
            meia = 2 + f * larg
            for x in np.arange(28 - meia, 28 + meia + 0.1, 2.6):
                sombra = (x - 28) / max(meia, 1)  # direita mais escura
                pal = PINHO if sombra < 0.35 and f < 0.8 else PINHO_FRIO
                agulhas(t, x + r.uniform(-0.8, 0.8), y, 3.6 + f * 1.4, int(x * 31 + y * 17) + i, pal, densidade=1.0, neve=0.3 if f < 0.2 else 0.0, brilho=0.62 - 0.25 * f)
        # barra de neve na borda de cada andar
        for x in np.arange(28 - larg - 1, 28 + larg + 1, 1):
            if r.random() < 0.55:
                yy = y1 - 1 + r.integers(-1, 1)
                t.p(x, yy - 2, NEVE[int(r.integers(2, 5))])
    # cordão dourado em espiral (só a frente)
    for i in range(500):
        s = i / 500
        y = topo + 6 + s * (base - topo - 8)
        larg = 3 + (y - topo) / (base - topo) * 21
        fase = s * 2 * math.pi * 3.2
        if math.cos(fase) < 0:
            continue
        x = 28 + math.sin(fase) * larg * 0.92
        t.p(x, y + math.cos(fase) * 1.2, OURO[3 + (math.sin(fase) < 0)])
    # bolas de vidro com reflexo
    bolas = [(22, 30, 'vermelha'), (33, 27, 'azul'), (18, 44, 'ouro'), (36, 41, 'vermelha'), (27, 37, 'verde'),
             (13, 60, 'azul'), (24, 54, 'vermelha'), (40, 56, 'ouro'), (31, 62, 'azul'), (45, 64, 'verde'), (19, 66, 'ouro')]
    for bx, by, nome in bolas:
        vidro, _ = LAMPADAS[nome]
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                d = dx * dx + dy * dy
                if d <= 5:
                    tom = 1 + (dx + dy < -1) - (dx + dy > 1)
                    t.p(bx + dx, by + dy, vidro[max(tom, 0)])
        t.p(bx - 1, by - 1, vidro[3]); t.p(bx, by - 3, OURO[3]); t.p(bx, by - 4, METAL[2])
    # luzinhas quentes espalhadas (acesas na pintura, com luz calculada em volta)
    luzes = []
    for k in range(16):
        s = (k + 0.5) / 16
        y = topo + 4 + s * (base - topo - 6)
        larg = 2 + (y - topo) / (base - topo) * 20
        x = 28 + (r.uniform(-1, 1)) * larg * 0.85
        c = LAMPADAS[ORDEM_CORES[k % 5]][1]
        t.p(x, y, (255, 250, 230)); t.p(x + 1, y, c); t.p(x, y + 1, c)
        luzes.append((x, y, c))
    # estrela no topo: cinco pontas, ouro com quina de luz
    sx, sy = 28, 7
    for k in range(10):
        ang = -math.pi / 2 + k * math.pi / 5
        rr = 6.2 if k % 2 == 0 else 2.6
        ang2 = -math.pi / 2 + (k + 1) * math.pi / 5
        rr2 = 6.2 if (k + 1) % 2 == 0 else 2.6
        for s in np.linspace(0, 1, 30):
            ex = (math.cos(ang) * rr * (1 - s) + math.cos(ang2) * rr2 * s)
            ey = (math.sin(ang) * rr * (1 - s) + math.sin(ang2) * rr2 * s)
            for u in np.linspace(0, 1, 8):
                x, y = sx + ex * u, sy + ey * u
                luz = -(ex * u) * 0.12 - (ey * u) * 0.14
                t.p(x, y, OURO[int(np.clip(3.4 + luz * 1.8 - u * 0.6, 1, 5))])
    t.p(sx, sy, OURO[5]); t.p(sx - 1, sy - 1, (255, 255, 236))
    # presentes no pé
    presentes = [(10, 68, 13, 10, VERMELHO, OURO), (21, 72, 11, 8, [(20, 60, 54), (30, 96, 84), (44, 128, 108), (70, 160, 132), (110, 196, 164), (170, 226, 200)], VERMELHO),
                 (33, 69, 14, 11, OURO, VERMELHO), (44, 73, 9, 7, [(40, 50, 110), (60, 80, 160), (86, 112, 200), (120, 150, 228), (170, 196, 246), (220, 232, 255)], OURO)]
    for px, py, pw, ph, pap, fita in presentes:
        for y in range(py, py + ph):
            for x in range(px, px + pw):
                luz = -(x - px) / pw * 0.8 + (0.4 if y == py else 0) - (y - py) / ph * 0.3
                tom = int(np.clip(2.5 + luz * 2, 1, 4))
                if (x + y) % 4 == 0 and y > py:
                    tom = max(tom - 1, 0)  # estampa
                t.p(x, y, pap[tom])
            t.p(px + pw - 1, y, pap[1])
        for x in range(px, px + pw):
            t.p(x, py, pap[5 if x < px + pw // 2 else 4])
        mx = px + pw // 2
        for y in range(py, py + ph):
            t.p(mx, y, fita[3]); t.p(mx + 1, y, fita[2])
        for x in range(px, px + pw):
            t.p(x, py + ph // 2, fita[3])
        # lacinho
        for dx, dy in ((-2, -1), (-1, -2), (-1, -1), (1, -2), (2, -1), (1, -1), (0, -1)):
            t.p(mx + dx, py + dy, fita[4 if dx < 0 else 2])
        t.p(mx, py - 1, fita[5])
    # neve no chão
    for x in range(4, W - 3):
        h = 1 + int(1.5 + math.sin(x * 0.7) * 1.2)
        for k in range(h):
            t.p(x, H - 3 - k, NEVE[min(4, 1 + k + (x % 5 == 0))])
        t.p(x, H - 2, NEVE[0])
    t.contorno()
    cor, a = t.ampliar()
    luz = halo(W, H, luzes + [(sx, sy, (255, 214, 120))], 2.6, 0.5)
    salvar('arvore.png', iluminar(cor, a, luz, 0.4), a)
    bc, ba = brilho_png(26, 26, [(13, 13, (255, 220, 130))], 5.5)
    salvar('arvore-estrela.png', bc, ba)
    # a luz que a árvore joga em volta: 120 x 110 da arte, com a árvore no meio-baixo (x 32..88, y 24..110)
    LW, LH, ox, oy = 120, 110, 32, 24
    pts = [(x + ox, y + oy, c) for x, y, c in luzes] + [(sx + ox, sy + oy, (255, 214, 120))]
    bc, ba = brilho_luz(LW, LH, pts, 2.2, 18.0, forca_larga=0.07)
    salvar('arvore-luz.png', bc, ba)


# ---------------------------------------------------------------- 5. neve nas caixas e laço de presente
def neve_borda():
    W, H = 64, 12
    t = Tela(W, H)
    for x in range(W):
        alto = 3.2 + 1.6 * math.sin(2 * math.pi * x / W * 2) + 0.9 * math.sin(2 * math.pi * x / W * 5 + 1)
        for y in range(H):
            yy = 6 - alto
            if y < yy:
                continue
            if y > 6:
                continue
            luz = (6 - y) / 6
            t.pw(x, y, NEVE[int(np.clip(1 + luz * 3.4 + (x % 7 == 0) * 0.5, 0, 4))])
        t.pw(x, 6, NEVE[0])
    # pingentes de gelo e escorridos
    for x, comp in ((7, 4), (19, 2), (30, 5), (44, 3), (55, 4)):
        for k in range(comp):
            t.pw(x, 7 + k, NEVE[3 - min(k, 2)] if k < comp - 1 else NEVE[1])
            if k < comp - 2:
                t.pw(x + 1, 7 + k, NEVE[1])
        t.pw(x - 1, 7, NEVE[2])
    # cintilância
    for x in (11, 26, 37, 50, 60):
        t.pw(x, 2 + x % 3, (255, 255, 255))
    t.contorno(cor=(70, 88, 112), volta=True)
    cor, a = t.ampliar()
    salvar('neve-borda.png', cor, a)


def laco_presente():
    W, H = 34, 30
    t = Tela(W, H)
    laco(t, 17, 9, 1.0, caudas=14)
    t.contorno()
    cor, a = t.ampliar()
    salvar('laco.png', cor, a)


if __name__ == '__main__':
    os.makedirs(SAIDA, exist_ok=True)
    festao()
    festao_ponta()
    pisca()
    guirlanda()
    arvore()
    neve_borda()
    laco_presente()
