"""Floresta das Fises Antigas: o primeiro lugar da Cripta.

Clareira numa floresta muito antiga, vista um pouco de cima. Valores: bordas
escuras e frias, centro claro e quente (o sol entra pela abertura da copa e cai
atrás do flashcard, que é o foco). Camadas:
  fundo   copa fechada no alto, abertura luminosa no meio, fileiras de troncos
          que somem na névoa dourada
  meio    chão de musgo, tufos de capim, folhas, troncos gigantes que saem do
          quadro, raízes-escora, pedras eretas com a linha fisária acesa,
          cogumelos que brilham de leve
  frente  folhas grandes nos cantos (escuras, desfocadas no jogo)
  luz     feixes de sol e brilhos pequenos (somados por cima)
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa, ruido  # noqa: E402

CASCA = rampa(['#120c0a', '#1d1510', '#2a1f17', '#3a2c1f', '#4d3b28', '#655034', '#806844'])
MUSGO_TRONCO = rampa(['#121f17', '#1a2c1d', '#233b24', '#2f4c2b', '#3e6031', '#527638'])
CHAO = rampa(['#11261a', '#18361f', '#214826', '#2c5c2c', '#3a7232', '#4c8a38', '#64a240', '#83ba4c', '#a9d260'])
FOLHA = rampa(['#0a1a12', '#102419', '#17311f', '#1f4026', '#2a522c', '#386833', '#4d7f3a', '#6c9a44', '#95b852'])
PEDRA = rampa(['#1f2420', '#2c332d', '#3b443b', '#4d574b', '#62705e', '#7d8a74', '#9aa68c'])
NEVOA = '#e2efd2'


def _r(s, j):
    return float(((j * 7919 + s * 104729 + 13) % 1000) / 1000.0)


def suave(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ fundo
def fundo(t: Tela, hz):
    """Céu aberto (14/10/2026, pedido do Tales: fase do Golem mais verdejante, como a referência
    da clareira com a montanha): céu claro com nuvens em pixel, montanha nevada ao fundo, serras
    azuladas, fileiras de pinheiros que somem na distância e copas só nos cantos de cima."""
    W, H, x, y = t.W, t.H, t.x, t.y
    cx = W * 0.5
    chao_y = H * hz
    # céu: azul claro em cima, quase creme perto do horizonte
    k = np.clip(y / chao_y, 0, 1)
    alto, baixo = np.array(hexrgb('#7fc2e4'), F), np.array(hexrgb('#e3f1e2'), F)
    t.rgb[:] = alto * (1 - k[..., None] ** 0.9) + baixo * (k[..., None] ** 0.9); t.a[:] = 1
    # nuvens: bolos de fbm com o alto aceso e a base em sombra lilás
    nuv = fbm(x / 46, y / 15, 4, 31) + 0.35 * np.exp(-((y - H * 0.16) / (H * 0.12)) ** 2) - 0.2 * k
    corpo = nuv > 0.68
    sombra = corpo & (fbm(x / 46, (y - 3) / 15, 4, 31) + 0.35 * np.exp(-((y - 3 - H * 0.16) / (H * 0.12)) ** 2) - 0.2 * k < 0.72)
    t.cor(corpo, '#ffffff', 0.92)
    t.cor(corpo & ~sombra & (nuv < 0.7), '#e4eef6', 0.9)
    t.cor(sombra & (y > H * 0.08), '#cad7e8', 0.8)
    # montanha nevada ao fundo (um pico grande e um menor), cor fria e clara
    def serra(base_y, picos, cor_alta, cor_baixa, neve, s, aspereza):
        xs = np.arange(W) + 0.5
        cands = [py_ + np.abs(xs - px_) * (base_y - py_) / (larg * W * 0.22) for px_, py_, larg in picos]
        qual = np.argmin(np.stack(cands), axis=0)
        topo = np.minimum(np.min(np.stack(cands), axis=0), base_y)
        topo += (fbm(xs / 9, s, 3, s) - 0.5) * aspereza
        m = y >= topo[None, :]
        alt = np.clip((y - topo[None, :]) / max(base_y - topo.min(), 1), 0, 1)
        # face iluminada à esquerda do pico que forma o topo da coluna, sombra à direita
        px_col = np.array([picos[i][0] for i in qual], F)
        lado = np.broadcast_to(np.sign(xs - px_col)[None, :], x.shape)
        base_c = np.array(hexrgb(cor_baixa), F); alta_c = np.array(hexrgb(cor_alta), F)
        c = alta_c * (1 - alt[..., None]) + base_c * alt[..., None]
        c = c * (1 - (0.13 if neve else 0.0) * np.clip(lado, 0, 1)[..., None])
        t.rgb[m] = c[m]
        if neve:
            borda = topo[None, :] + (base_y - topo.min()) * 0.22 + 7 * (fbm(x / 4, y / 9, 3, s + 1) - 0.5) + 3 * np.sin(x * 0.7)
            n = m & (y < borda)
            claro, escuro = np.array(hexrgb('#eef4fa'), F), np.array(hexrgb('#aebfd6'), F)
            sombra = np.clip(lado, 0, 1)
            t.rgb[n] = (claro * (1 - sombra[..., None]) + escuro * sombra[..., None])[n]
    serra(chao_y * 0.86, [(cx + W * 0.06, H * 0.07, 1.25), (cx - W * 0.22, H * 0.17, 1.4), (cx + W * 0.36, H * 0.2, 1.5)],
          '#93add0', '#6f8eb4', True, 3, 7)
    serra(chao_y * 0.95, [(cx - W * 0.35, H * 0.22, 2.4), (cx + W * 0.15, H * 0.25, 2.8), (cx + W * 0.45, H * 0.21, 2.2)],
          '#7c9fae', '#5f8796', False, 5, 6)
    # fileiras de pinheiros: cada fileira mais perto, mais verde e mais escura (perspectiva do ar)
    fileiras = [(chao_y * 0.97, 7, 18, '#6f9c98', 41), (chao_y * 1.0, 9, 24, '#5a8c7c', 43), (chao_y * 1.03, 11, 30, '#447a5e', 47)]
    for base_y, passo, alt_max, cor, s in fileiras:
        n = int(W / passo) + 3
        cc = np.array(hexrgb(cor), F)
        for j in range(n):
            px_ = (j - 1 + _r(s, j)) * passo
            alt = alt_max * (0.55 + 0.45 * _r(s + 1, j))
            topo = base_y - alt
            meia = np.clip((y - topo) / alt, 0, 1) * (passo * 0.75)
            m = (y >= topo) & (y <= base_y + 2) & (np.abs(x - px_) <= meia)
            if not m.any():
                continue
            lado = np.clip((x - px_) / np.maximum(meia, 1), -1, 1)
            camada = ((y - topo) % 4 < 1.1)   # galhos em degraus
            f = (0.92 - 0.12 * lado - 0.08 * camada)[..., None]
            t.rgb[m] = (cc * f)[m]
        t.velar(np.clip(1 - (y - chao_y * 0.85) / (H * 0.25), 0, 1) * 0.12 * (y < base_y + 2), NEVOA)
    # chão distante
    longe = y > chao_y + 2
    t.tingir(longe, np.clip(0.55 + 0.2 * fbm(x / 30, y / 8, 3, 5), 0, 0.999), rampa(['#4f8a52', '#66a058', '#86b866']))
    t.velar(np.clip(1 - (y - chao_y) / (H * 0.1), 0, 1) * 0.35 * longe, NEVOA)
    # copas nos cantos de cima, verdes e com a borda acesa pelo céu
    rng = np.random.default_rng(11)
    blobs = []
    for lado in (-1, 1):
        for i in range(16):
            a = rng.uniform(0.0, 1.0)
            bx = cx + lado * (W * 0.3 + a * W * 0.28)
            by = H * (0.01 + 0.18 * a ** 1.3) * rng.uniform(0.3, 1.0) - H * 0.04
            r = H * rng.uniform(0.05, 0.09) * (0.8 + 0.5 * a)
            blobs.append((bx, by, r))
    cachos = []
    for bx, by, r in blobs:
        for j in range(6):
            a = rng.uniform(0.15, np.pi - 0.15)
            d = r * rng.uniform(0.82, 1.0)
            cachos.append((bx + np.cos(a) * d * 1.1, by + np.sin(a) * d * 0.85, r * rng.uniform(0.2, 0.34)))
    for i, (bx, by, r) in enumerate(blobs + cachos):
        dd = np.hypot(x - bx, (y - by) * 1.2) / r
        m = dd < 1.05 - 0.35 * fbm(x / 2.6, y / 2.6, 2, 500 + i)
        if not m.any():
            continue
        dx, dy = (x - bx) / r, (y - by) / r
        nz = np.sqrt(np.clip(1 - dd ** 2, 0, 1))
        luz = 0.2 + 0.3 * nz + 0.35 * np.clip(-dy * 0.6 - dx * 0.3, 0, 1) + 0.15 * (ruido(x * 0.8, y * 0.8, 600 + i) - 0.5)
        t.tingir(m, np.clip(luz, 0, 0.999), FOLHA, 0.8)


# ------------------------------------------------------------------ chão
def chao(t: Tela, hz):
    W, H, x, y = t.W, t.H, t.x, t.y
    m = y >= H * hz + 3 * (fbm(x / 7, 0.3, 3, 77) - 0.5)
    prof = np.clip((y - H * hz) / (H * (1 - hz)), 0, 1)  # 0 no horizonte, 1 embaixo
    esc = 0.35 + 0.65 * prof  # textura menor perto do horizonte
    X, Y = (x - W / 2) / esc, (y - H * hz) / esc
    base = fbm(X / 26, Y / 14, 4, 3)
    detalhe = ruido(X / 2.2, Y / 1.6, 9)
    clar = np.exp(-(((x - W / 2) / (W * 0.33)) ** 2 + ((y - H * 0.6) / (H * 0.32)) ** 2))
    manchas = fbm(X / 22, Y / 12, 3, 41)
    sol = suave(0.5, 0.62, manchas) * (0.3 + 0.7 * clar)
    borda = 1 - np.clip(np.hypot((x - W / 2) / (W * 0.62), (y - H * 0.55) / (H * 0.62)), 0, 1)
    luz = 0.08 + 0.22 * base + 0.08 * detalhe + 0.42 * clar + 0.22 * sol + 0.1 * borda
    luz = luz - 0.18 * (1 - prof) * (1 - clar)  # perto do horizonte, a névoa cobre depois
    t.tingir(m, np.clip(luz, 0, 0.999), CHAO, 0.8)
    # névoa baixa no fundo do chão
    t.velar(np.clip(1 - prof / 0.3, 0, 1) * 0.28 * m, NEVOA)


def flores(t: Tela, hz, n, s=1):
    """Florzinhas brancas e amarelas no musgo (mais nas bordas da clareira)."""
    rng = np.random.default_rng(s)
    W, H = t.W, t.H
    for i in range(n):
        fx, fy = rng.uniform(0, W), rng.uniform(H * (hz + 0.06), H)
        if abs(fx - W / 2) < W * 0.18 and fy < H * 0.75 and rng.uniform() < 0.7:
            continue
        cor = ['#fff6d8', '#ffe066', '#f7b7d0', '#cfe9ff'][int(rng.integers(0, 4))]
        xi, yi = int(fx), int(fy)
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, -1), (0, 1)):
            if 0 <= xi + dx < W and 0 <= yi + dy < H:
                t.rgb[yi + dy, xi + dx] = hexrgb(cor if (dx, dy) != (0, 0) else '#f0a830')


def capim(t: Tela, hz, densidade, s=1):
    """Tufos de 3 a 6 lâminas, mais densos nas bordas; a luz segue a da clareira."""
    W, H = t.W, t.H
    rng = np.random.default_rng(s)
    n = int(W * H * densidade)
    for _ in range(n):
        x0 = rng.uniform(0, W); y0 = rng.uniform(H * (hz + 0.04), H + 4)
        prof = (y0 - H * hz) / (H * (1 - hz))
        perto_meio = np.exp(-(((x0 - W / 2) / (W * 0.28)) ** 2 + ((y0 - H * 0.62) / (H * 0.22)) ** 2))
        if rng.random() < perto_meio * 0.85:
            continue  # a clareira fica limpa (é onde a arena aparece)
        alt = (2 + 4 * prof) * rng.uniform(0.7, 1.3)
        clar = np.exp(-(((x0 - W / 2) / (W * 0.33)) ** 2 + ((y0 - H * 0.6) / (H * 0.32)) ** 2))
        for k in range(rng.integers(3, 6)):
            dx = rng.uniform(-1.6, 1.6) * (0.6 + prof)
            for h in range(int(alt)):
                px_ = int(round(x0 + dx * h / alt)); py_ = int(round(y0 - h))
                if 0 <= px_ < W and 0 <= py_ < H:
                    v = 0.25 + 0.45 * clar + 0.3 * (h / alt)
                    t.rgb[py_, px_] = CHAO[min(len(CHAO) - 1, int(v * len(CHAO)))]
                    t.a[py_, px_] = 1


def folhas_caidas(t: Tela, hz, n, s=1):
    rng = np.random.default_rng(s)
    cores = rampa(['#5a3418', '#7a4a20', '#9a6428', '#c08a3a'])
    for _ in range(n):
        x0 = rng.uniform(0, t.W); y0 = rng.uniform(t.H * (hz + 0.08), t.H)
        c = cores[rng.integers(0, 4)]
        for dx, dy in [(0, 0), (1, 0), (0, 1) if rng.random() < 0.5 else (-1, 0)]:
            xi, yi = int(x0 + dx), int(y0 + dy)
            if 0 <= xi < t.W and 0 <= yi < t.H:
                t.rgb[yi, xi] = c; t.a[yi, xi] = 1


# ------------------------------------------------------------------ objetos
class Objetos:
    """Camada dos objetos: pintados à parte para ganhar contorno e sombra de contato."""

    def __init__(self, W, H):
        self.t = Tela(W, H)

    def tronco_gigante(self, cx, base, w, lado, s):
        """Tronco que sai do alto do quadro e se abre em contrafortes e raízes que entram no chão."""
        t = self.t; x, y = t.x, t.y
        k = np.clip(y / base, 0, 1)
        meia = w / 2 * (0.9 + 0.1 * k) + w * 0.55 * suave(0.7, 1.0, k) ** 2
        centro = cx + lado * w * 0.1 * np.sin(k * 2.0)
        u = (x - centro) / meia
        # pé irregular: os contrafortes descem mais que os vales entre eles (sem linha reta na base)
        lobo = np.cos(u * np.pi * 2.2 + s)
        pe = base + w * 0.1 * lobo + w * 0.1 * (fbm(x / 5, 0.5, 2, s) - 0.5) - w * 0.04 * u * u
        m = (np.abs(u) < 1) & (y <= pe)
        nz = np.sqrt(np.clip(1 - u * u, 0, 1))
        # o lado virado para a clareira recebe a luz quente; o de fora fica na sombra fria
        dentro = np.clip(-u * lado, 0, 1)
        luz = 0.06 + 0.36 * nz + 0.3 * dentro * (0.4 + 0.6 * suave(0.2, 0.9, k))
        # sulcos verticais da casca (longos), cristas acesas
        X = u * 7
        sulco = fbm(X + s, y / 70, 3, s) * 0.7 + fbm(X * 2.3 + s, y / 30, 2, s + 1) * 0.3
        luz = luz - 0.26 * suave(0.44, 0.36, sulco) + 0.1 * suave(0.6, 0.7, sulco)
        # contrafortes: vales escuros entre as raízes, cristas claras
        luz = luz + 0.16 * lobo * suave(0.78, 1.0, k)
        # escurece perto do chão (oclusão)
        luz = luz - 0.12 * suave(6, 0, pe - y)
        t.tingir(m, np.clip(luz, 0, 0.999), CASCA, 0.7)
        # musgo em listras verticais longas, mais do lado de fora e na base (nada de manchas soltas)
        listra = fbm(x / 3.2 + s, y / 48, 3, s + 9)
        dens = 0.55 * np.clip(u * lado * 0.8 + 0.45, 0, 1) + 0.5 * suave(0.7, 1.0, k)
        mus = m & (listra + 0.32 * dens + (t.bayer - 0.5) * 0.07 > 0.8)
        t.tingir(mus, np.clip(0.08 + 0.4 * nz + 0.25 * dentro + 0.12 * fbm(x / 2, y / 6, 2, s + 3), 0, 0.999), MUSGO_TRONCO, 0.7)
        # orla de musgo e terra no pé, que costura o tronco no chão
        orla = m & (pe - y < 2.5 + 3 * fbm(x / 3, 0.2, 2, s + 4))
        t.tingir(orla, np.clip(0.18 + 0.3 * nz + 0.2 * fbm(x / 1.5, y / 1.5, 2, s + 6), 0, 0.999), CHAO[1:6], 0.8)
        # raízes: espalham em leque radial no plano do chão (como uma árvore velha de verdade),
        # cada uma num ângulo, saindo de dentro do pé; ângulos diferentes evitam o aspecto de garra
        rng = np.random.default_rng(s)
        thetas = [-0.35, 0.2, 0.75, 1.3, 1.85, 2.5]
        raio_pe = w / 2 + w * 0.55
        for j, th in enumerate(thetas):
            th = th + rng.uniform(-0.15, 0.15)
            if lado > 0:
                th = np.pi - th
            sx = cx + np.cos(th) * raio_pe * 0.55
            sy = base - w * 0.04 + np.sin(th) * w * 0.05
            comp = w * rng.uniform(0.45, 0.95) * (1.0 if 0 < np.sin(th) else 0.6)
            self.raiz(sx, sy, th, comp, w * rng.uniform(0.07, 0.095), s + j * 7, gap=rng.random() < 0.6)
        # tufos de capim na frente do pé
        for i in range(int(w * 0.9)):
            px_ = cx - lado * w * 0.1 + (i / (w * 0.9) - 0.5) * w * 1.6
            uu = (px_ - cx) / (w / 2 + w * 0.55)
            if abs(uu) > 1:
                continue
            py_ = base + w * 0.075 * np.cos(uu * np.pi * 2.2 + s) + rng.uniform(-1, 2)
            self.tufo(px_, py_, rng.uniform(2, 4.5), s + i)

    def tufo(self, x0, y0, alt, s):
        t = self.t
        rng = np.random.default_rng(s)
        for k in range(rng.integers(2, 5)):
            dx = rng.uniform(-1.4, 1.4)
            for h in range(int(alt)):
                px_ = int(round(x0 + dx * h / alt)); py_ = int(round(y0 - h))
                if 0 <= px_ < t.W and 0 <= py_ < t.H:
                    v = 0.3 + 0.5 * (h / alt) + rng.uniform(-0.1, 0.1)
                    t.rgb[py_, px_] = CHAO[int(np.clip(v, 0, 0.999) * len(CHAO))]
                    t.a[py_, px_] = 1

    def raiz(self, sx, sy, ang, comp, w0, s, gap=True):
        """Raiz sinuosa no plano do chão: engrossa no começo, faz um arco e mergulha no musgo,
        reaparece e afina. Sem pontas retas paralelas (que pareciam garras)."""
        t = self.t; x, y = t.x, t.y
        n = 56
        tt = np.linspace(0, 1, n)
        rng = np.random.default_rng(s)
        curva = ang + 0.3 * np.sin(tt * np.pi * rng.uniform(1.2, 2.0) + rng.uniform(0, 6)) + rng.uniform(-0.2, 0.2) * tt
        ds = comp / n
        bx = sx + np.cumsum(np.cos(curva) * ds)
        by = sy + np.cumsum(np.sin(curva) * ds * 0.42)  # o chão é visto de cima: encurta na vertical
        r = w0 * (1 - tt) ** 0.8 + 1.0  # ponta rombuda: a raiz afunda, não espeta
        arco = w0 * 0.3 * np.sin(np.pi * np.clip(tt / 0.5, 0, 1)) * (tt < 0.5)
        by = by - arco
        # trecho enterrado (some no musgo e reaparece mais fino)
        visivel = (tt < 0.93) & ~(gap & (tt > 0.5) & (tt < 0.62))
        x0, x1 = int(max(0, bx.min() - w0 - 2)), int(min(t.W, bx.max() + w0 + 2))
        y0, y1 = int(max(0, by.min() - w0 - 2)), int(min(t.H, by.max() + w0 + 2))
        if x1 <= x0 or y1 <= y0:
            return
        sy_, sx_ = slice(y0, y1), slice(x0, x1)
        X, Y = x[sy_, sx_], y[sy_, sx_]
        M = np.full(X.shape, 9.0, F); L = np.zeros(X.shape, F); T = np.zeros(X.shape, F)
        for i in range(n):
            if not visivel[i]:
                continue
            q = np.hypot(X - bx[i], (Y - by[i]) * 1.15) / r[i]
            b = q < M
            M = np.where(b, q, M); L = np.where(b, (Y - by[i]) / r[i], L); T = np.where(b, tt[i], T)
        m = M < 1
        nz = np.sqrt(np.clip(1 - M ** 2, 0, 1))
        luz = 0.1 + 0.42 * nz + 0.24 * np.clip(-L, 0, 1) - 0.14 * (fbm(X / 3, Y / 1.5, 2, s) < 0.38)
        sub = Tela(X.shape[1], X.shape[0])
        sub.bayer = t.bayer[sy_, sx_]
        sub.rgb = t.rgb[sy_, sx_].copy(); sub.a = t.a[sy_, sx_].copy()
        sub.tingir(m, np.clip(luz, 0, 0.999), CASCA[1:], 0.6)
        mus = m & (L < -0.2) & (fbm(X / 3, Y / 3, 2, s + 1) + 0.25 * T > 0.55)
        sub.tingir(mus, np.clip(0.18 + 0.5 * nz, 0, 0.999), MUSGO_TRONCO, 0.6)
        t.rgb[sy_, sx_] = sub.rgb; t.a[sy_, sx_] = sub.a
        # musgo onde a raiz mergulha
        for tm in ((0.5, 0.62, 0.93) if gap else (0.93,)):
            i = int(tm * (n - 1))
            self.tufo(bx[i], by[i] + 1, 2 + w0 * 0.25, s + int(tm * 100))

    def tronco_medio(self, cx, topo, base, w, s):
        t = self.t; x, y = t.x, t.y
        k = np.clip((y - topo) / (base - topo), 0, 1)
        meia = w / 2 * (0.75 + 0.25 * k) + w * 0.9 * suave(0.82, 1, k) ** 2
        u = (x - cx) / meia
        m = (np.abs(u) < 1) & (y >= topo) & (y <= base + 1.5 * np.cos(u * 5))
        nz = np.sqrt(np.clip(1 - u * u, 0, 1))
        dentro = np.clip(-u * np.sign(cx - t.W / 2), 0, 1)
        sulco = fbm(u * 4 + s, y / 40, 3, s)
        luz = 0.1 + 0.42 * nz + 0.25 * dentro - 0.2 * suave(0.44, 0.36, sulco) + 0.14 * np.cos(u * 7 + s) * suave(0.85, 1, k)
        t.tingir(m, np.clip(luz, 0, 0.999), CASCA[1:], 0.6)

    def pedra(self, cx, base, w, h, s):
        """Pedra erguida, gasta, com a linha fisária acesa (faixa ondulada que brilha)."""
        t = self.t; x, y = t.x, t.y
        topo = base - h
        k = np.clip((y - topo) / h, 0, 1)
        meia = w / 2 * (0.62 + 0.38 * k) * (1 + 0.08 * (fbm(y / 3, s, 2, s) - 0.5))
        ombro = np.sqrt(np.clip((y - topo) / (w * 0.45), 0, 1))
        u = (x - cx - (y - base) * 0.05) / np.maximum(meia * ombro, 0.3)
        m = (np.abs(u) < 1) & (y >= topo) & (y <= base)
        nz = np.sqrt(np.clip(1 - u * u, 0, 1))
        rach = fbm(x / 2.5, y / 2.5, 3, s)
        luz = 0.12 + 0.48 * nz + 0.3 * np.clip(-u, 0, 1) - 0.22 * (rach < 0.36) + 0.08 * (rach > 0.66)
        t.tingir(m, np.clip(luz, 0, 0.999), PEDRA, 0.6)
        musgo = m & (y < topo + h * 0.3 + 4 * fbm(x / 3, 1, 2, s)) & (fbm(x / 3, y / 3, 2, s + 2) > 0.44)
        t.tingir(musgo, np.clip(0.3 + 0.6 * nz, 0, 0.999), MUSGO_TRONCO[1:], 0.6)
        # linha fisária, como a placa de crescimento de um osso longo
        fy = topo + h * 0.4 + 0.6 * np.sin((x - cx) * 0.45 + s) + (x - cx) * 0.08
        linha = m & (np.abs(y - fy) < 1.0)
        t.tingir(linha, np.clip(0.4 + 0.6 * nz, 0, 0.999), rampa(['#c9823a', '#f2b75a', '#ffe1a0', '#fff6d8']), 0.3)
        ys = np.nonzero(linha)
        return (cx, float(ys[0].mean()) if len(ys[0]) else topo + h * 0.38)

    def cogumelos(self, cx, cy, n, s):
        t = self.t; x, y = t.x, t.y
        pos = []
        for i in range(n):
            dx = (_r(s, i) - 0.5) * 9; alt = 2 + int(_r(s + 1, i) * 4); r = 1.2 + _r(s + 2, i) * 1.6
            bx, by = cx + dx, cy + (_r(s + 3, i) - 0.5) * 3
            pe = (np.abs(x - bx) < 0.6) & (y <= by) & (y > by - alt)
            t.tingir(pe, np.full(x.shape, 0.5, F), rampa(['#8f9a86', '#c8d2b8']))
            cy_ = by - alt
            cap = (np.hypot((x - bx) / (r * 1.3), (y - cy_) / r) < 1) & (y <= cy_ + r * 0.25)
            luz = 0.4 + 0.6 * np.clip(-(y - cy_) / r, 0, 1)
            t.tingir(cap, np.clip(luz, 0, 0.999), rampa(['#1c5e60', '#2c8f8a', '#5ccfc0', '#b8f6ea']), 0.3)
            pos.append((bx, cy_))
        return pos

    def samambaia(self, cx, cy, r, s, escuro=0.0):
        """Moita de folhas largas em leque (lê bem em poucos pixels): cada folha tem nervura clara."""
        t = self.t; x, y = t.x, t.y
        rng = np.random.default_rng(s)
        nf = 7
        for i in range(nf):
            ang = -np.pi / 2 + (i - (nf - 1) / 2) * 0.36 + rng.uniform(-0.1, 0.1)
            comp = r * rng.uniform(0.75, 1.1)
            ex, ey = cx + np.cos(ang) * comp, cy + np.sin(ang) * comp * 0.85
            # folha: elipse pontuda ao longo do eixo cx,cy -> ex,ey, curvada para baixo na ponta
            vx, vy = ex - cx, ey - cy
            L = np.hypot(vx, vy)
            ux, uy = vx / L, vy / L
            px_, py_ = x - cx, y - cy
            ao_longo = (px_ * ux + py_ * uy) / L
            de_lado = (px_ * -uy + py_ * ux)
            de_lado = de_lado - (ao_longo ** 2) * L * 0.18 * np.sign(ux + 1e-3)
            larg = L * 0.2 * np.sin(np.clip(ao_longo, 0, 1) * np.pi) ** 0.8
            m = (ao_longo > 0) & (ao_longo < 1) & (np.abs(de_lado) < larg)
            v = 0.22 + 0.4 * ao_longo + 0.22 * (de_lado < 0) - escuro + 0.1 * (i % 2)
            v = v + 0.18 * (np.abs(de_lado) < 0.6)  # nervura
            v = v - 0.12 * (np.abs(de_lado) > larg * 0.75)
            t.tingir(m, np.clip(v, 0, 0.999), FOLHA, 0.6)

    def cipo(self, x0, y0, comp, s):
        t = self.t; x, y = t.x, t.y
        curva = x0 + np.sin((y - y0) / 8 + s) * 1.8 + (y - y0) * 0.03
        m = (np.abs(x - curva) < 0.7) & (y >= y0) & (y < y0 + comp)
        t.tingir(m, np.full(x.shape, 0.4, F), FOLHA[1:5])
        folhas = (np.abs(x - curva) < 2.2) & (y >= y0) & (y < y0 + comp) & (ruido(x * 0.8, y * 0.55, s + 3) > 0.66)
        t.tingir(folhas, np.clip(0.3 + 0.5 * ruido(x, y, s + 4), 0, 0.999), FOLHA[2:8])

    def sobre(self, chao: Tela, cor_contorno='#070b07'):
        """Aplica os objetos sobre o chão com contorno de 1 px e sombra de contato."""
        a = self.t.a > 0.5
        viz = np.zeros_like(a)
        viz[1:] |= a[:-1]; viz[:-1] |= a[1:]; viz[:, 1:] |= a[:, :-1]; viz[:, :-1] |= a[:, 1:]
        contorno = viz & ~a
        chao.rgb[a] = self.t.rgb[a]; chao.a[a] = 1
        chao.rgb[contorno] = np.array(hexrgb(cor_contorno), F); chao.a[contorno] = 1


def sombra_contato(t: Tela, cx, cy, rx, ry, forca=0.5):
    d = np.hypot((t.x - cx) / rx, (t.y - cy) / ry)
    f = np.clip(1 - d, 0, 1) ** 0.8 * forca
    f = np.where(t.bayer < f * 1.6, f, f * 0.6)
    t.rgb *= (1 - f[..., None])


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    hz = 0.33 if retrato else 0.4
    # ---------------- fundo
    f = Tela(W, H)
    fundo(f, hz)
    # troncos médios atrás da clareira: no fundo, para ganharem névoa e desfoque (dão escala)
    ob = Objetos(W, H)
    medios = [(0.27, -0.02, 11, 21), (0.73, -0.02, 12, 23)] if not retrato else [(0.24, -0.02, 9, 21), (0.76, -0.02, 9, 23)]
    for fx, ft, w, s in medios:
        ob.tronco_medio(W * fx, H * ft, H * (hz + 0.035), w, s)
    a = ob.t.a > 0
    f.rgb[a] = ob.t.rgb[a]
    f.velar(a * 0.32 * np.clip(1.2 - np.abs(f.x - W / 2) / (W * 0.3), 0, 1), NEVOA)
    f.salvar(saida / f'{nome}-fundo.png')
    # ---------------- meio: chão + objetos
    m = Tela(W, H)
    chao(m, hz)
    capim(m, hz, 0.0035, s=5)
    flores(m, hz, int(W * H * 0.0009), s=9)
    folhas_caidas(m, hz, int(W * H * 0.0012), s=7)
    luzes = []
    om = Objetos(W, H)
    # pedras fisárias na beira da clareira
    pedras = [(0.235, 0.52, 18, 44, 3), (0.775, 0.51, 16, 38, 5), (0.345, 0.46, 9, 20, 7), (0.655, 0.455, 9, 19, 9)] if not retrato else [(0.2, 0.43, 11, 30, 3), (0.8, 0.425, 10, 26, 5)]
    for fx, fy, w, h, s in pedras:
        sombra_contato(m, W * fx, H * fy, w * 0.9, w * 0.28, 0.55)
        luzes.append(('fisaria',) + om.pedra(W * fx, H * fy, w, h, s))
    # troncos gigantes nas laterais
    og = Objetos(W, H)
    wg = W * (0.17 if not retrato else 0.3)
    for cx, lado, s in [(W * 0.06 if not retrato else -W * 0.02, -1, 61), (W * 0.94 if not retrato else W * 1.02, 1, 67)]:
        base = H * (0.7 if not retrato else 0.58)
        sombra_contato(m, cx, base, wg * 1.1, wg * 0.22, 0.6)
        og.tronco_gigante(cx, base, wg, lado, s)
    for i, fx in enumerate([0.13, 0.19, 0.84, 0.9] if not retrato else [0.18, 0.82]):
        og.cipo(W * fx, -2, H * (0.2 + 0.14 * _r(13, i)), s=i)
    # cogumelos e samambaias perto das raízes
    for fx, fy, n, s in ([(0.17, 0.7, 4, 101), (0.83, 0.72, 4, 103), (0.29, 0.52, 3, 105), (0.71, 0.51, 3, 107)] if not retrato else [(0.12, 0.6, 3, 101), (0.88, 0.62, 3, 103), (0.25, 0.45, 3, 105), (0.75, 0.44, 3, 107)]):
        for bx, by in om.cogumelos(W * fx, H * fy, n, s):
            luzes.append(('cogumelo', bx, by))
    for fx, fy, r, s in ([(0.12, 0.84, 22, 201), (0.88, 0.86, 24, 203), (0.3, 0.6, 10, 205), (0.7, 0.59, 10, 207)] if not retrato else [(0.1, 0.72, 20, 201), (0.9, 0.74, 20, 203), (0.08, 0.95, 18, 205), (0.92, 0.97, 18, 207)]):
        om.samambaia(W * fx, H * fy, r, s)
    for o in (om, og):
        o.sobre(m)
    m.salvar(saida / f'{nome}-meio.png')
    # ---------------- frente: folhas grandes e escuras nos cantos
    fr = Objetos(W, H)
    for cx, cy, r, s in [(-4, H + 2, H * 0.18, 301), (W + 4, H + 2, H * 0.2, 303), (W * 0.02, -6, H * 0.12, 305), (W * 0.98, -6, H * 0.14, 307)]:
        fr.samambaia(cx, cy, r, s, escuro=0.25)
    fr.t.rgb *= 0.55
    fr.t.salvar(saida / f'{nome}-frente.png')
    # ---------------- luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    for i, (fx, ang, larg, forca) in enumerate([]):   # céu aberto: sem feixes de copa
        d = np.abs((lz.x - W * fx) - lz.y * np.tan(ang))
        feixe = np.exp(-(d / larg) ** 2) * np.clip(1 - lz.y / (H * 0.85), 0, 1) ** 1.5 * (0.6 + 0.4 * fbm(lz.y / 30, i, 2, 3)) * forca
        brilho += feixe[..., None] * np.array(hexrgb('#ffeab0'), F)
    for tipo, bx, by in luzes:
        cor, raio, forca = (('#5fe8d0', 4, 0.35) if tipo == 'cogumelo' else ('#ffc070', 9, 0.55))
        g = np.exp(-((lz.x - bx) ** 2 + ((lz.y - by) * 1.3) ** 2) / (raio ** 2)) * forca
        brilho += g[..., None] * np.array(hexrgb(cor), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    so = sys.argv[2] if len(sys.argv) > 2 else 'ambos'
    if so in ('ambos', 'paisagem'):
        pintar(520, 330, saida, 'floresta-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'floresta-retrato')
    print('ok', saida)
