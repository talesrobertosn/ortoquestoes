"""Fundos dos atalhos de flashcards na página inicial (16/10/2026).

Recortes das cenas pintadas do jogo (estilo "Cripta"), com adereços pintados pelo
mesmo motor: a Biblioteca ao entardecer com mesa de leitura, livros e velas, e a
entrada da Cripta (masmorra) com as tochas acesas e o cavaleiro de guarda.
O foco fica à direita, porque o texto do atalho fica à esquerda sobre um gradiente.
Nada baixado nem gerado por IA.

    python3 scripts/cenarios/atalhos_inicio.py   # grava em public/pixel/inicio/
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, rampa, ruido  # noqa: E402
from promo import MADEIRA, brilho, cena, colar, quadro, vinheta  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
SAI = RAIZ / 'public' / 'pixel' / 'inicio'
W, H = 360, 160

CERA = rampa(['#8a7a5e', '#c9b88f', '#efe2bd', '#fff8e2'])
CHAMA = rampa(['#c2401a', '#f08a2a', '#ffd070', '#fff6c8'])
CAPAS = [rampa(c) for c in (['#3a0f12', '#6e1e22', '#9a3530'], ['#0f2238', '#1f3f66', '#3a6694'],
                            ['#12301c', '#245432', '#3f7a4a'], ['#3a2a0c', '#6e5216', '#a8822c'])]
PAPEL = rampa(['#9c8a66', '#d8c9a2', '#f4ead0'])


def imagem(t: Tela) -> Image.Image:
    return Image.fromarray(np.dstack([np.clip(t.rgb, 0, 255), t.a * 255]).astype(np.uint8), 'RGBA')


def contorno(t: Tela, cor: str = '#0c0805') -> None:
    a = t.a > 0
    viz = np.zeros_like(a)
    viz[1:] |= a[:-1]; viz[:-1] |= a[1:]; viz[:, 1:] |= a[:, :-1]; viz[:, :-1] |= a[:, 1:]
    t.cor(viz & ~a, cor)


def vela(t: Tela, cx: float, base: float, alto: float, larg: float = 2.6) -> None:
    x, y = t.x, t.y
    corpo = (np.abs(x - cx) < larg / 2) & (y > base - alto) & (y <= base)
    t.tingir(corpo, np.clip(0.35 + 0.55 * np.clip((cx - x) / larg + 0.6, 0, 1), 0, 0.999), CERA, 0.4)
    pavio = (np.abs(x - cx) < 0.5) & (np.abs(y - (base - alto - 1)) < 0.6)
    t.cor(pavio, '#2a1a10')
    ch = np.hypot((x - cx) / 1.4, (y - (base - alto - 3.4)) / 2.6) < 1
    t.tingir(ch, np.clip(0.55 + 0.45 * (1 - np.hypot((x - cx) / 1.4, (y - (base - alto - 2.6)) / 2.6)), 0, 0.999), CHAMA, 0.3)


def mesa_de_leitura() -> Image.Image:
    """Mesa de madeira com pilha de livros, livro aberto e três velas."""
    t = Tela(W, H)
    x, y = t.x, t.y
    topo, x0, x1 = 128, 196, 352
    tampo = (x >= x0) & (x <= x1) & (y >= topo) & (y < topo + 5)
    t.tingir(tampo, np.clip(0.55 + 0.3 * (fbm(x / 9, y, 2, 4) - 0.5) + 0.25 * (y < topo + 1.5), 0, 0.999), MADEIRA, 0.5)
    for px in (x0 + 8, x1 - 8):
        perna = (np.abs(x - px) < 3) & (y >= topo + 5)
        t.tingir(perna, np.full(x.shape, 0.3, F), MADEIRA)
    # pilha de livros (lombadas com faixas douradas)
    ytopo = topo
    for i, (lx, larg, alt, cap) in enumerate(((214, 40, 6, 0), (217, 36, 7, 1), (212, 42, 5, 2), (219, 34, 6, 3))):
        livro = (x >= lx) & (x < lx + larg) & (y >= ytopo - alt) & (y < ytopo)
        luz = 0.4 + 0.4 * np.clip((lx + larg - x) / larg, 0, 1) - 0.2 * (y > ytopo - 1.5)
        t.tingir(livro, np.clip(luz, 0, 0.999), CAPAS[cap], 0.5)
        faixa = livro & ((np.abs(x - (lx + 4)) < 0.6) | (np.abs(x - (lx + larg - 5)) < 0.6))
        t.cor(faixa, '#e3b453')
        ytopo -= alt
    vela(t, 236, ytopo, 10)
    # livro aberto no meio da mesa
    cx = 292
    for lado in (-1, 1):
        pag = (np.sign(x - cx) == lado) & (np.abs(x - cx) < 22) & (y < topo) & (y >= topo - 5 + np.abs(x - cx) * 0.08)
        t.tingir(pag, np.clip(0.75 - 0.25 * (np.abs(x - cx) < 2) - 0.12 * (np.mod(y, 2) < 1) * (np.abs(x - cx) > 4), 0, 0.999), PAPEL, 0.4)
    capa = (np.abs(x - cx) < 23) & (np.abs(y - (topo - 0.5)) < 0.8)
    t.tingir(capa, np.full(x.shape, 0.5, F), CAPAS[0])
    # duas velas altas à direita
    vela(t, 326, topo, 18, 3.2)
    vela(t, 336, topo, 12, 3.0)
    contorno(t)
    return imagem(t)


def biblioteca() -> Image.Image:
    base = cena('biblioteca-entardecer', 'paisagem').crop((150, 50, 150 + W, 50 + H))
    base.alpha_composite(mesa_de_leitura())
    for (cx, cy, r, f) in ((236, 104, 26, 0.55), (330, 98, 34, 0.7), (292, 122, 30, 0.3)):
        base = brilho(base, cx, cy, r, '#ffc060', f)
    return vinheta(base, 0.3)


def tocha_parede(t: Tela, tx: float, ty: float) -> None:
    x, y = t.x, t.y
    suporte = (np.abs(x - tx) < 1.6) & (y > ty) & (y < ty + 12)
    t.tingir(suporte, np.full(x.shape, 0.45, F), MADEIRA)
    aro = (np.abs(x - tx) < 3) & (np.abs(y - (ty + 1)) < 1.2)
    t.cor(aro, '#4a4f52')
    # chama em gota: larga embaixo, afinando para cima
    h = np.clip((ty - y) / 17, 0, 1)
    ch = (y < ty) & (y > ty - 17) & (np.abs(x - tx) < 4.6 * np.sin(np.pi * np.clip(h * 0.9 + 0.1, 0, 1)) * (1 - h) ** 0.3)
    nucleo = 1 - np.abs(x - tx) / 4.6 - h * 0.9
    t.tingir(ch, np.clip(0.05 + 0.85 * nucleo + 0.15 * (ruido(x, y, 21) - 0.5), 0, 0.999), CHAMA, 0.3)


def cripta() -> Image.Image:
    base = cena('masmorra', 'paisagem').crop((70, 30, 70 + W, 30 + H))
    # a Cripta é mais quente que a masmorra azulada do jogo: tinge para âmbar
    arr = np.asarray(base, F).copy()
    arr[..., :3] *= np.array([1.08, 0.94, 0.78], F)
    base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
    # a porta da masmorra fica em x≈190 no recorte: tochas grandes ladeando
    t = Tela(W, H)
    for tx in (150, 230):
        tocha_parede(t, tx, 58)
    contorno(t)
    for tx in (150, 230):  # o halo vem antes, para não desbotar a chama
        base = brilho(base, tx, 50, 26, '#ff9a40', 0.55)
    base.alpha_composite(imagem(t))
    # chão aquecido pela luz das tochas e o cavaleiro de guarda à direita
    base = brilho(base, 190, 150, 70, '#ff8a30', 0.25)
    cav = quadro('cavaleiro', 'parado', 0)
    escala = 112 / cav.height
    cav = cav.resize((max(1, round(cav.width * escala)), 112), Image.NEAREST)
    colar(base, cav, 292, H - 6, 1)
    return vinheta(base, 0.32)


if __name__ == '__main__':
    SAI.mkdir(parents=True, exist_ok=True)
    for nome, img in (('atalho-biblioteca', biblioteca()), ('atalho-cripta', cripta())):
        p = SAI / f'{nome}.png'
        img.convert('RGB').quantize(128, dither=Image.Dither.NONE).save(p, optimize=True)
        print(p.relative_to(RAIZ), img.size, p.stat().st_size, 'bytes')
