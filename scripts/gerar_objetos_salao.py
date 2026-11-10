"""Peças originais HD-2D para o salão: latão, vidro, cerâmica e plantas.

Desenho em grade dupla da pintura (detalhes menores sem mudar sua escala),
sementes fixas, luz por pixel e exportação 3x. Sem texto rasterizado.
Uso: python3 scripts/gerar_objetos_salao.py
"""
from pathlib import Path
import math
import random
import numpy as np
from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / 'public/pixel/biblioteca/objetos'
OURO = ['#251c18', '#4b3525', '#765333', '#ac7e46', '#d0a662', '#f0d196']
VERDES = ['#101f20', '#17372c', '#24503b', '#38734b', '#5c925b', '#94b578']


def lanterna(acesa):
    im = Image.new('RGBA', (32, 56))
    d = ImageDraw.Draw(im)
    # Argola, espigão e chapéu de cobre com abas escalonadas.
    d.ellipse((12, 1, 20, 10), fill=OURO[0], outline=OURO[3])
    d.ellipse((14, 3, 18, 7), fill=(0, 0, 0, 0))
    d.rectangle((14, 9, 18, 12), fill=OURO[2])
    d.polygon([(16, 10), (24, 17), (27, 20), (5, 20), (8, 17)], fill=OURO[0])
    d.polygon([(15, 12), (21, 17), (10, 17)], fill=OURO[3])
    d.line((9, 17, 22, 17), fill=OURO[5])
    d.rectangle((5, 19, 27, 22), fill=OURO[1])
    d.line((6, 19, 25, 19), fill=OURO[4])
    # Vidro facetado: centro luminoso, bordas âmbar, lado oposto frio.
    d.polygon([(7, 23), (25, 23), (23, 44), (9, 44)], fill='#302b26')
    for y in range(24, 44):
        for x in range(9, 24):
            if acesa:
                t = max(0, 1 - math.hypot((x - 15) / 11, (y - 35) / 16))
                c = tuple(int(a + (b - a) * t) for a, b in zip((114, 63, 30), (255, 222, 140)))
            else:
                t = max(0, 1 - abs(x - 12) / 12)
                c = tuple(int(a + (b - a) * t) for a, b in zip((29, 38, 39), (77, 88, 78)))
            d.point((x, y), fill=c)
    d.polygon([(11, 26), (13, 26), (11, 38), (10, 38)], fill='#ffe4a4' if acesa else '#8a998d')
    d.line((22, 25, 21, 41), fill='#b78b53' if acesa else '#52615e')
    # Réchaud, pavio e chama em camadas, sem mancha branca estourada.
    d.ellipse((12, 39, 20, 42), fill=OURO[2])
    d.rectangle((15, 37, 17, 40), fill=OURO[0])
    if acesa:
        d.polygon([(16, 28), (19, 34), (18, 38), (14, 38), (13, 35)], fill='#ec913e')
        d.polygon([(16, 31), (17, 35), (16, 38), (15, 36)], fill='#fff0bd')
    # Estrutura de latão, quatro montantes, rebites e pé torneado.
    for x in (7, 12, 21, 25):
        d.line((x, 22, x + (1 if x < 16 else -1), 44), fill=OURO[1], width=2)
        d.line((x, 23, x + (1 if x < 16 else -1), 43), fill=OURO[3])
    d.rectangle((8, 44, 24, 47), fill=OURO[1])
    d.line((8, 44, 24, 44), fill=OURO[5])
    d.line((10, 47, 22, 47), fill=OURO[3])
    for x in (9, 23):
        d.point((x, 21), fill=OURO[5])
        d.point((x + (1 if x == 9 else -1), 45), fill=OURO[5])
    d.polygon([(12, 48), (20, 48), (18, 51), (14, 51)], fill=OURO[2])
    d.rectangle((15, 51, 17, 53), fill=OURO[4])
    return im


def relogio():
    im = Image.new('RGBA', (64, 64))
    d = ImageDraw.Draw(im)
    # Moldura de nogueira entalhada, filetes de bronze e sombra do aro.
    for box, cor in [((1, 2, 62, 63), '#121416'), ((1, 0, 62, 61), '#34251d'),
                     ((3, 2, 60, 59), '#946b3d'), ((4, 3, 59, 58), '#d1a564'),
                     ((6, 5, 57, 56), '#493324'), ((8, 7, 55, 54), '#aa8049'),
                     ((9, 8, 54, 53), '#ead5a1'), ((11, 10, 52, 51), '#39332b'),
                     ((12, 11, 51, 50), '#ddcba4')]:
        d.ellipse(box, fill=cor)
    rng = random.Random(107)
    for y in range(12, 50):
        for x in range(12, 52):
            if (x - 31.5)**2 + (y - 30.5)**2 < 19**2:
                k = rng.randrange(-5, 6) - int(max(0, y - 20) * .45)
                d.point((x, y), fill=(max(0, 237+k), max(0, 222+k), max(0, 184+k)))
    # Doze índices incrustados e marcas de minutos; sem texto rasterizado.
    for i in range(60):
        a = i * math.tau / 60 - math.pi / 2
        r0, r1 = (15, 18) if i % 5 == 0 else (17.5, 18)
        d.line((round(31.5 + math.cos(a)*r0), round(30.5 + math.sin(a)*r0),
                round(31.5 + math.cos(a)*r1), round(30.5 + math.sin(a)*r1)),
               fill='#59472f', width=2 if i % 5 == 0 else 1)
    for i in range(24):
        a = i * math.tau / 24
        x, y = round(31.5 + math.cos(a)*27), round(30.5 + math.sin(a)*27)
        d.point((x, y), fill='#e8bc79')
    d.arc((3, 2, 60, 59), 195, 285, fill='#f1d39a', width=1)
    d.arc((5, 4, 58, 57), 20, 105, fill='#322d26', width=1)
    return im


def planta(tipo, florida=False):
    im = Image.new('RGBA', (64, 88))
    d = ImageDraw.Draw(im)
    rng = random.Random(72 + tipo)
    # Sombra de contato, prato, cerâmica vidrada verde e aro de latão.
    d.ellipse((7, 80, 59, 87), fill=(6, 12, 15, 100))
    d.ellipse((11, 78, 55, 85), fill='#1d2422')
    d.ellipse((13, 78, 53, 82), fill='#a47c4b')
    d.polygon([(14, 58), (52, 58), (46, 79), (20, 79)], fill='#152d2c')
    for y in range(60, 79):
        inset = (y - 60) // 4
        for x in range(16 + inset, 51 - inset):
            t = max(0, 1 - abs(x - 25) / 26)
            k = rng.randrange(-4, 5)
            d.point((x, y), fill=tuple(max(0, int(v*t)+k) for v in (49, 88, 72)))
    d.line((19, 62, 23, 75), fill='#78917a', width=2)
    for x in range(23, 48, 6):
        d.line((x, 66, x, 73), fill='#ad965e')
        d.point((x + 1, 70), fill='#d0b374')
    d.ellipse((12, 54, 54, 63), fill='#aa8250')
    d.ellipse((14, 55, 52, 60), fill='#283328')
    d.ellipse((16, 56, 50, 59), fill='#141d18')
    d.arc((12, 54, 54, 63), 0, 170, fill='#ebc687', width=1)

    def folha(base, ponta, largura, tom):
        bx, by = base; tx, ty = ponta
        dx, dy = tx-bx, ty-by
        n = math.hypot(dx, dy) or 1
        nx, ny = -dy/n*largura, dx/n*largura
        mx, my = bx+dx*.55, by+dy*.55
        p = [(bx, by), (round(bx+dx*.26+nx*.7), round(by+dy*.26+ny*.7)),
             (round(mx+nx), round(my+ny)), (round(bx+dx*.82+nx*.45), round(by+dy*.82+ny*.45)),
             (tx, ty), (round(mx-nx*.75), round(my-ny*.75)),
             (round(bx+dx*.22-nx*.45), round(by+dy*.22-ny*.45))]
        d.polygon(p, fill=VERDES[max(0, tom-1)])
        d.polygon([(bx, by), *p[1:5]], fill=VERDES[tom])
        d.line((bx, by, tx, ty), fill=VERDES[min(5, tom+1)])
        for t in (.35, .55, .73):
            xx, yy = bx+dx*t, by+dy*t
            d.line((round(xx), round(yy), round(xx+nx*.42), round(yy+ny*.42)), fill=VERDES[max(1, tom-1)])

    if tipo == 0:
        # Aspidistra de biblioteca: folhas largas em vários planos.
        for tx, ty, bx, by, l, t in [(8, 23, 30, 57, 5, 2), (53, 28, 34, 57, 5, 2),
                                      (18, 8, 31, 57, 5, 3), (42, 10, 33, 57, 5, 3),
                                      (7, 39, 30, 57, 4, 3), (58, 40, 34, 57, 4, 3),
                                      (29, 4, 32, 57, 5, 4), (46, 25, 33, 57, 6, 4),
                                      (17, 28, 31, 57, 6, 4), (35, 21, 32, 57, 5, 3)]:
            folha((bx, by), (tx, ty), l, t)
    else:
        # Samambaia: frondes arqueadas, pares de folíolos que diminuem na ponta.
        for j, (tx, ty) in enumerate([(7, 39), (14, 17), (32, 5), (51, 19), (59, 41)]):
            pontos = []
            for i in range(13):
                t = i/12
                x = 33 + (tx-33)*t
                y = 57 + (ty-57)*t - math.sin(t*math.pi)*10
                pontos.append((round(x), round(y)))
            d.line(pontos, fill=VERDES[3])
            for i in range(2, 12):
                x, y = pontos[i]
                ln = math.sin(i/13*math.pi)*7
                for lado in (-1, 1):
                    folha((x, y), (round(x+lado*ln), round(y-3)), 1.5, 2+j%2)
    if florida:
        for x, y in [(20, 17), (41, 19), (30, 8), (48, 35)]:
            d.line((33, 56, x, y), fill=VERDES[3])
            for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
                d.ellipse((x+dx-1, y+dy-1, x+dx+2, y+dy+2), fill='#d3ae80')
            d.point((x, y), fill='#fff0bb')
    return im


def iluminar(im, periodo, emissiva=False):
    arr = np.asarray(im).astype(float)
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[:h, :w]
    # Mesma direção da janela da pintura; sombra fria, borda quente à esquerda.
    luz = .82 + .18*(1-xx/w) + .08*(1-yy/h)
    tint = {'manha': (1.0, .95, .84), 'tarde': (1.02, .86, .67), 'noite': (.60, .70, .83)}[periodo]
    if emissiva:
        tint = (1, .96, .87)
    arr[:, :, :3] = np.clip(arr[:, :, :3]*luz[:, :, None]*np.array(tint), 0, 255)
    return Image.fromarray(arr.astype('uint8')).resize((w*3, h*3), Image.Resampling.NEAREST)


def main():
    PASTA.mkdir(parents=True, exist_ok=True)
    objetos = {'lanterna-acesa': lanterna(True), 'lanterna-apagada': lanterna(False), 'relogio': relogio()}
    for i in range(2):
        for florida in (False, True):
            objetos[f'planta-{i}' + ('-florida' if florida else '')] = planta(i, florida)
    for periodo in ('manha', 'tarde', 'noite'):
        for nome, im in objetos.items():
            saida = PASTA / f'{nome}-{periodo}.webp'
            iluminar(im, periodo, nome == 'lanterna-acesa').save(saida, lossless=True, method=6)
    print(f'{len(objetos)*3} sprites HD-2D em {PASTA}')


if __name__ == '__main__':
    main()
