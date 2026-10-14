"""Artes de divulgação dos flashcards (beta público, 13/10/2026), dentro do site.

Feitas só com elementos reais do jogo: as camadas pintadas dos cenários
(floresta, masmorra, biblioteca), as folhas de sprite do herói e dos
adversários, e dois adereços pintados com o mesmo motor (a entrada da masmorra
ao fundo e o baú iluminado). Nada baixado, nada gerado por IA.

    python3 scripts/cenarios/promo.py            # grava em public/flashcards/promo/
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa, ruido  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
CEN = RAIZ / 'public' / 'flashcards' / 'cenarios'
SPR = RAIZ / 'public' / 'flashcards' / 'sprites'
SAI = RAIZ / 'public' / 'flashcards' / 'promo'

PEDRA = rampa(['#141714', '#1f2420', '#2c332d', '#3b443b', '#4d574b', '#62705e', '#7d8a74'])
MADEIRA = rampa(['#1c0f08', '#2e1a0e', '#452813', '#5e3818', '#7a4a20', '#9a6229'])
OURO = rampa(['#5a3a0a', '#8a5a14', '#c28a2a', '#f2c45a', '#fff1b0'])


def cena(nome: str, formato: str) -> Image.Image:
    """Compõe fundo + meio + frente + luz (em tela) como no jogo, sem o desfoque."""
    base = Image.open(CEN / f'{nome}-{formato}-fundo.png').convert('RGBA')
    for camada in ('meio', 'frente'):
        p = CEN / f'{nome}-{formato}-{camada}.png'
        if p.exists():
            base.alpha_composite(Image.open(p).convert('RGBA'))
    luz = CEN / f'{nome}-{formato}-luz.png'
    if luz.exists():
        lz = Image.open(luz).convert('RGBA')
        L = Image.new('RGB', base.size)
        L.paste(lz.convert('RGB'), mask=lz.split()[3])
        base = Image.merge('RGBA', (*ImageChops.screen(base.convert('RGB'), L).split(), base.split()[3]))
    return base


def quadro(sprite: str, anim: str = 'parado', k: int = 0) -> Image.Image:
    meta = json.loads((SPR / f'{sprite}.json').read_text())
    folha = Image.open(SPR / f'{sprite}.png').convert('RGBA')
    a = meta['animacoes'][anim]
    w, h = meta['largura'], meta['altura']
    q = folha.crop((k * w, a['linha'] * h, (k + 1) * w, (a['linha'] + 1) * h))
    return q.crop(q.getbbox())


def colar(base: Image.Image, img: Image.Image, cx: int, pe: int, escala: int = 1, sombra: bool = True):
    if escala != 1:
        img = img.resize((img.width * escala, img.height * escala), Image.NEAREST)
    x, y = cx - img.width // 2, pe - img.height
    if sombra:
        s = Image.new('RGBA', base.size, (0, 0, 0, 0))
        sx, sy = img.width * 0.42, max(2, img.width * 0.09)
        arr = np.zeros((base.height, base.width, 4), np.uint8)
        yy, xx = np.mgrid[0:base.height, 0:base.width]
        d = ((xx - cx) / sx) ** 2 + ((yy - pe) / sy) ** 2
        arr[..., 3] = (np.clip(1 - d, 0, 1) * 120).astype(np.uint8)
        s = Image.fromarray(arr, 'RGBA')
        base.alpha_composite(s)
    base.alpha_composite(img, (int(x), int(y)))


def entrada_masmorra(W: int, H: int, cx: float, base_y: float, larg: float) -> Image.Image:
    """Arco de pedra com escada descendo para o escuro e duas tochas (fica ao fundo, na névoa)."""
    t = Tela(W, H)
    x, y = t.x, t.y
    alto = larg * 1.25
    topo = base_y - alto
    # moldura: blocos de pedra em arco
    dx = (x - cx) / (larg / 2)
    meia_alt = np.where(np.abs(dx) <= 1, topo + (larg / 2) * (1 - np.sqrt(np.clip(1 - dx ** 2, 0, 1))), base_y)
    externo = (np.abs(x - cx) < larg / 2 + 5) & (y > topo - 5) & (y < base_y) & (y > meia_alt - 5)
    interno = (np.abs(x - cx) < larg / 2 - 1) & (y > meia_alt + 1) & (y < base_y)
    bloco = (ruido(np.floor((x - cx) / 5), np.floor(y / 4), 7) - 0.5)
    juntas = ((np.mod(y - topo, 4) < 0.8) | (np.mod(x - cx + 2 * np.floor(y / 4), 6) < 0.8))
    luz = 0.35 + 0.35 * bloco - 0.25 * juntas + 0.2 * np.clip(-(x - cx) / larg, 0, 1)
    t.tingir(externo & ~interno, np.clip(luz, 0, 0.999), PEDRA, 0.6)
    # o escuro de dentro, com degraus que descem e um brilho quente lá no fundo
    prof = np.clip((y - meia_alt) / (base_y - topo), 0, 1)
    brilho = np.exp(-(((x - cx) / (larg * 0.25)) ** 2 + ((y - (base_y - alto * 0.3)) / (alto * 0.25)) ** 2))
    cor = np.stack([10 + 80 * brilho, 7 + 40 * brilho, 8 + 14 * brilho], -1)
    degrau = (np.mod(y - base_y, 3) < 1) & (y > base_y - alto * 0.35)
    cor = cor + degrau[..., None] * np.array([22, 18, 16], F) * (1 - prof[..., None] * 0.3)
    t.rgb[interno] = cor[interno]; t.a[interno] = 1
    # musgo no alto do arco
    musgo = externo & ~interno & (y < topo + 6) & (fbm(x / 3, y / 3, 2, 9) > 0.45)
    t.tingir(musgo, np.clip(0.3 + 0.4 * fbm(x / 2, y / 2, 2, 3), 0, 0.999), rampa(['#1a311b', '#2e5126', '#507b35']))
    # tochas
    for lado in (-1, 1):
        tx = cx + lado * (larg / 2 + 8)
        haste = (np.abs(x - tx) < 0.8) & (y > base_y - alto * 0.62) & (y < base_y - alto * 0.42)
        t.tingir(haste, np.full(x.shape, 0.5, F), MADEIRA)
        chama = np.hypot((x - tx) / 1.6, (y - (base_y - alto * 0.66)) / 2.6) < 1
        t.tingir(chama, np.clip(0.5 + 0.5 * ruido(x, y, 11), 0, 0.999), rampa(['#c2401a', '#f08a2a', '#ffd070', '#fff6c8']), 0.3)
    return Image.fromarray(np.dstack([np.clip(t.rgb, 0, 255), t.a * 255]).astype(np.uint8), 'RGBA')


def bau(escala_px: int = 34) -> Image.Image:
    """Baú de madeira com cintas e fecho de ouro, tampa entreaberta deixando escapar luz."""
    W, H = escala_px + 6, int(escala_px * 0.95)
    t = Tela(W, H)
    x, y = t.x, t.y
    x0, x1 = 3, W - 3
    corpo_top, corpo_bot = H * 0.45, H - 2
    corpo = (x >= x0) & (x <= x1) & (y >= corpo_top) & (y <= corpo_bot)
    tampa_c = H * 0.45
    tampa = (x >= x0) & (x <= x1) & (y >= tampa_c - H * 0.3 + ((x - W / 2) / (W / 2)) ** 2 * H * 0.08) & (y < tampa_c - 2)
    tabua = np.mod(y, 4) < 0.9
    luz = 0.35 + 0.35 * np.clip((W / 2 - x) / W + 0.3, 0, 1) - 0.2 * tabua + 0.1 * (fbm(x / 2, y / 6, 2, 5) - 0.5)
    t.tingir(corpo | tampa, np.clip(luz, 0, 0.999), MADEIRA, 0.6)
    cinta = ((np.abs(x - (x0 + 4)) < 1.5) | (np.abs(x - (x1 - 4)) < 1.5)) & (corpo | tampa)
    borda = (corpo & ((y < corpo_top + 1.5) | (y > corpo_bot - 1.5))) | (tampa & (y > tampa_c - 4))
    t.tingir(cinta | borda, np.clip(0.55 + 0.35 * np.clip((W / 2 - x) / W + 0.5, 0, 1), 0, 0.999), OURO, 0.4)
    fecho = (np.abs(x - W / 2) < 2.5) & (np.abs(y - (corpo_top + 3)) < 2.5)
    t.tingir(fecho, np.full(x.shape, 0.9, F), OURO)
    # fresta da tampa: brilho
    fresta = (x > x0 + 1) & (x < x1 - 1) & (np.abs(y - (tampa_c - 1)) < 1)
    t.tingir(fresta, np.full(x.shape, 0.95, F), rampa(['#ffe9a8', '#fffbe6']))
    a = t.a > 0
    viz = np.zeros_like(a)
    viz[1:] |= a[:-1]; viz[:-1] |= a[1:]; viz[:, 1:] |= a[:, :-1]; viz[:, :-1] |= a[:, 1:]
    t.cor(viz & ~a, '#0c0805')
    return Image.fromarray(np.dstack([np.clip(t.rgb, 0, 255), t.a * 255]).astype(np.uint8), 'RGBA')


def brilho(base: Image.Image, cx: float, cy: float, raio: float, cor: str, forca: float):
    W, H = base.size
    yy, xx = np.mgrid[0:H, 0:W]
    g = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / raio ** 2)) * forca
    c = np.array(hexrgb(cor), F)
    arr = np.asarray(base.convert('RGB'), F)
    arr = 255 - (255 - arr) * (1 - (g[..., None] * c / 255))
    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    out.putalpha(base.split()[3])
    return out


def vinheta(base: Image.Image, forca=0.45):
    W, H = base.size
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot((xx - W / 2) / (W * 0.62), (yy - H * 0.5) / (H * 0.62))
    f = np.clip(d - 0.55, 0, 1) * forca * 2
    arr = np.asarray(base.convert('RGB'), F) * (1 - np.clip(f, 0, 0.8)[..., None])
    out = Image.fromarray(arr.astype(np.uint8), 'RGB').convert('RGBA')
    return out


def capa(formato: str) -> Image.Image:
    base = cena('floresta', formato)
    W, H = base.size
    retrato = formato == 'retrato'
    hz = H * (0.33 if retrato else 0.4)
    # entrada da masmorra ao fundo, na clareira, meio apagada pela névoa
    larg = W * (0.16 if retrato else 0.075)
    ent = entrada_masmorra(W, H, W * 0.5, hz + H * 0.05, larg)
    nevoa = Image.new('RGBA', (W, H), (217, 230, 184, 0))
    base.alpha_composite(ent)
    arr = np.asarray(base, F).copy()
    m = np.asarray(ent, F)[..., 3] > 0
    arr[m, :3] = arr[m, :3] * 0.72 + np.array(hexrgb('#d9e6b8'), F) * 0.28
    base = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    base = brilho(base, W * 0.5, hz - larg * 0.1, larg * 0.9, '#ffb060', 0.35)
    # herói em primeiro plano (pose de vitória) e o baú iluminado como segundo foco
    heroi = quadro('heroi-4', 'vitoria', 2)   # herói chibi (mascote, 14/10/2026), em escala 1: o quadro já é grande
    if retrato:
        colar(base, heroi, int(W * 0.36), int(H * 0.86), 1)
        b = bau(30)
        colar(base, b, int(W * 0.74), int(H * 0.84), 1)
        base = brilho(base, W * 0.74, H * 0.8, 22, '#ffd36a', 0.55)
        golem = quadro('golem', 'parado', 0)
        colar(base, golem.resize((golem.width // 2, golem.height // 2), Image.NEAREST), int(W * 0.72), int(hz + H * 0.16), 1)
    else:
        colar(base, heroi, int(W * 0.36), int(H * 0.93), 1)
        b = bau(38)
        colar(base, b, int(W * 0.62), int(H * 0.9), 1)
        base = brilho(base, W * 0.62, H * 0.85, 30, '#ffd36a', 0.55)
        golem = quadro('golem', 'parado', 0)
        colar(base, golem.resize((golem.width * 2 // 3, golem.height * 2 // 3), Image.NEAREST), int(W * 0.76), int(hz + H * 0.2), 1)
    _ = nevoa
    return vinheta(base, 0.35)


def cartao(tipo: str) -> Image.Image:
    if tipo == 'biblioteca':
        base = cena('biblioteca', 'paisagem').crop((130, 60, 390, 210))
        return vinheta(base, 0.3)
    if tipo == 'cripta':
        base = cena('covil', 'paisagem').crop((110, 70, 410, 240))
        drag = quadro('dragao', 'parado', 0)
        drag = drag.resize((drag.width * 3 // 5, drag.height * 3 // 5), Image.NEAREST)
        colar(base, drag, base.width // 2 + 10, base.height - 10, 1)
        return vinheta(base, 0.3)
    # progresso: o herói em três estágios, do aprendiz à lenda (os mesmos sprites do jogo)
    base = cena('floresta', 'paisagem').crop((130, 150, 390, 300))
    for k, (est, fx) in enumerate([('heroi-1', 0.24), ('heroi-4', 0.5), ('heroi-6', 0.76)]):
        colar(base, quadro(est, 'parado', 0), int(base.width * fx), base.height - 12, 1)
    return vinheta(base, 0.3)


if __name__ == '__main__':
    SAI.mkdir(parents=True, exist_ok=True)
    capa('paisagem').save(SAI / 'capa-larga.png', optimize=True)
    capa('retrato').crop((0, 60, 250, 430)).save(SAI / 'capa-retrato.png', optimize=True)
    for t in ('biblioteca', 'cripta', 'progresso'):
        cartao(t).save(SAI / f'cartao-{t}.png', optimize=True)
    print('ok', SAI)
