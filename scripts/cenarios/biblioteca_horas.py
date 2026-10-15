"""Biblioteca Ancestral em cinco horas do dia: o fundo que muda com os acertos.

Pedido do Tales (15/10/2026): "ter fundos diferentes, deixar mais bonito, e que o
fundo vá mudando conforme vai acertando". Na sessão da Biblioteca, a luz anda:
amanhecer -> dia -> tarde dourada -> pôr do sol -> noite estrelada.

O dia é a pintura original (biblioteca.py). Este script parte dela (as mesmas
camadas, já nossas) e repinta a hora:
  - o céu do janelão (gradiente da hora, copas em silhueta; à noite, lua e estrelas),
    com a mesma geometria de biblioteca.py;
  - a luz da sala (multiplicação por um tom da hora; as velas seguram o calor);
  - a camada de luz separada em feixes do janelão (cor e força da hora) e chamas
    das velas (mais fortes quanto mais escuro).
Nada baixado nem gerado por IA; sem anatomia. Uso:
  python3 scripts/cenarios/biblioteca_horas.py [pasta]
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, BAYER, fbm, hexrgb  # noqa: E402

PASTA = Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'

# céu do janelão (alto, horizonte), cor das copas, tom da sala, luz dos feixes e força das velas
HORAS = {
    'amanhecer': dict(ceu=('#8fa4d8', '#f6b8a0'), copa='#4a5a6a', tom=(0.86, 0.84, 0.98), brilho=0.92,
                      feixe='#ffc8c0', forca=0.75, velas=1.05, sol=('#fff0d8', 0.80, 0.10)),
    'tarde': dict(ceu=('#f2c060', '#ffe6a0'), copa='#6a7a3a', tom=(1.14, 0.9, 0.6), brilho=1.0,
                  feixe='#ffcf70', forca=1.25, velas=1.1, sol=None),
    'entardecer': dict(ceu=('#5a3a78', '#ff8a4a'), copa='#3a2a3a', tom=(0.98, 0.72, 0.68), brilho=0.86,
                       feixe='#ff9a60', forca=0.95, velas=1.5, sol=('#ffd090', 0.86, 0.12)),
    'noite': dict(ceu=('#0a1030', '#24306a'), copa='#0e1420', tom=(0.42, 0.48, 0.78), brilho=0.78,
                  feixe='#a8c0ff', forca=0.35, velas=2.1, sol=None),
}


def geometria(W: int, H: int):
    """Mesmo janelão de biblioteca.py (mesmas fórmulas)."""
    retrato = H > W
    y, x = np.mgrid[0:H, 0:W].astype(F)
    cx = W / 2
    jl, jr = (W * 0.16, W * 0.84) if retrato else (W * 0.3, W * 0.7)
    chao_fundo = H * (0.56 if retrato else 0.6)
    jw = (jr - jl) * (0.42 if retrato else 0.36)
    jtopo, jbase = H * 0.06, chao_fundo - H * 0.07
    raio = jw / 2
    dentro = (np.abs(x - cx) < raio) & (y < jbase) & ((y > jtopo + raio) | (np.hypot(x - cx, y - (jtopo + raio)) < raio))
    copa = dentro & (y > jbase - (jbase - jtopo) * (0.35 + 0.12 * fbm(x / 7, 1, 3, 9)))
    mainel = dentro & ((np.abs(x - cx) < 0.8) | (np.abs(y - (jtopo + raio + (jbase - jtopo - raio) * 0.45)) < 0.7) | (np.abs(np.abs(x - cx) - raio * 0.5) < 0.6))
    return dict(x=x, y=y, cx=cx, jtopo=jtopo, jbase=jbase, raio=raio, dentro=dentro, copa=copa, mainel=mainel)


def rgba(caminho: Path) -> np.ndarray:
    return np.asarray(Image.open(caminho).convert('RGBA'), F)


def salvar(a: np.ndarray, caminho: Path, paleta=False):
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
    if paleta:  # como as camadas originais de meio e frente: 256 cores, bem mais leve
        img = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    img.save(caminho, optimize=True)


def degraus(v: np.ndarray, x, y, n=10):
    """Quantiza 0..1 em degraus com pontilhado ordenado (o mesmo jeito de pintor.py)."""
    b = BAYER[(y.astype(int) % 4), (x.astype(int) % 4)]
    return np.floor(np.clip(v, 0, 0.999) * n + b) / n


def ceu(g, hora):
    x, y = g['x'], g['y']
    alto, baixo = (np.array(hexrgb(c), F) for c in hora['ceu'])
    t = degraus(np.clip((y - g['jtopo']) / (g['jbase'] - g['jtopo']), 0, 1), x, y, 12)[..., None]
    cor = alto * (1 - t) + baixo * t
    if hora['sol']:
        c, py, r = hora['sol']
        sy = g['jtopo'] + (g['jbase'] - g['jtopo']) * py
        d = np.hypot(x - g['cx'] - g['raio'] * 0.25, y - sy)
        halo = np.exp(-(d / (g['raio'] * 0.9)) ** 2) * 0.55
        cor = cor + (np.array(hexrgb(c), F) - cor) * halo[..., None]
        disco = d < g['raio'] * r
        cor[disco] = np.array(hexrgb(c), F)
    return cor


def noite(g, cor):
    """Estrelas (pontos fixos por hash) e lua crescente no alto do janelão."""
    x, y = g['x'], g['y']
    ix, iy = x.astype(np.int64), y.astype(np.int64)
    h = ((ix * 374761393 + iy * 668265263) & 0xFFFFFFFF)
    h = ((h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF) / 0xFFFFFFFF
    estrela = g['dentro'] & ~g['copa'] & (h > 0.985)
    forte = estrela & (h > 0.996)
    cor[estrela] = np.array(hexrgb('#c8d4ff'), F)
    cor[forte] = np.array(hexrgb('#fff8e0'), F)
    lx, ly, r = g['cx'] + g['raio'] * 0.38, g['jtopo'] + g['raio'] * 0.75, max(2.5, g['raio'] * 0.2)
    lua = np.hypot(x - lx, y - ly) < r
    sombra = np.hypot(x - lx - r * 0.45, y - ly + r * 0.2) < r * 0.9
    halo = np.exp(-((np.hypot(x - lx, y - ly)) / (r * 3.2)) ** 2) * 0.35
    cor += (np.array(hexrgb('#9fb4ff'), F) - cor) * (halo * g['dentro'])[..., None]
    cor[lua & ~sombra] = np.array(hexrgb('#fff4d0'), F)
    return cor


def pintar(formato: str, nome: str, hora: dict, pasta: Path):
    base = lambda c: rgba(PASTA / f'biblioteca-{formato}-{c}.png')  # noqa: E731
    fundo, meio, frente, luz = base('fundo'), base('meio'), base('frente'), base('luz')
    H, W = fundo.shape[:2]
    g = geometria(W, H)
    x, y = g['x'], g['y']

    # velas: a parte alaranjada da camada de luz (os feixes do janelão são amarelo-claros)
    la = luz[..., 3] / 255
    razao = luz[..., 1] / np.maximum(luz[..., 0], 1)
    vela = la * (razao < 0.8)
    calor = np.asarray(Image.fromarray((np.clip(vela * 2.2, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(W, H) / 40)), F) / 255

    tom = np.array(hora['tom'], F) * hora['brilho']
    def luz_da_sala(a):
        # perto das velas a sala segura o tom quente original
        k = np.clip(calor * (hora['velas'] - 0.6), 0, 0.85)[..., None]
        quente = np.array([1.06, 0.92, 0.72], F)
        fator = tom * (1 - k) + quente * k
        a = a.copy(); a[..., :3] = a[..., :3] * fator
        return a

    f2 = luz_da_sala(fundo)
    # céu do janelão, com as copas em silhueta e os mainéis de pedra preservados
    cor = ceu(g, hora)
    if nome == 'noite':
        cor = noite(g, cor)
    vidro = g['dentro'] & ~g['mainel']
    f2[..., :3][vidro] = cor[vidro]
    copa = g['copa'] & ~g['mainel']
    sil = np.array(hexrgb(hora['copa']), F)
    var = (0.85 + 0.3 * fbm(x / 4, y / 4, 2, 11))[..., None]
    f2[..., :3][copa] = (sil * var)[copa]
    # o halo do janelão na parede (luz que entra) leva a cor do céu
    halo = np.exp(-(((x - g['cx']) / (g['raio'] * 2.2)) ** 2 + ((y - (g['jtopo'] + g['jbase']) / 2) / ((g['jbase'] - g['jtopo']) * 0.9)) ** 2)) * 0.18 * hora['forca']
    halo = halo * ~g['dentro']
    f2[..., :3] += (np.array(hexrgb(hora['feixe']), F) - f2[..., :3]) * halo[..., None] * (f2[..., 3:] > 0)

    m2, fr2 = luz_da_sala(meio), luz_da_sala(frente)

    # camada de luz: feixes recoloridos pela hora, velas mais fortes no escuro
    feixe = la * (razao >= 0.8)
    corf = np.array(hexrgb(hora['feixe']), F)
    corv = np.array(hexrgb('#ffb060'), F)
    # dentro do janelão o brilho é do céu: à noite e no pôr do sol ele quase some
    af = np.clip(feixe * hora['forca'] * np.where(g['dentro'], min(1.0, hora['forca']) ** 1.5, 1.0), 0, 1)
    av = np.clip(vela * hora['velas'], 0, 1)
    a = np.clip(af + av, 0, 1)
    mix = np.where(a > 0, av / np.maximum(a, 1e-3), 0)[..., None]
    l2 = np.zeros_like(luz)
    l2[..., :3] = corf * (1 - mix) + corv * mix
    l2[..., 3] = a * 255

    prefixo = pasta / f'biblioteca-{nome}-{formato}'
    salvar(f2, Path(f'{prefixo}-fundo.png'))
    salvar(m2, Path(f'{prefixo}-meio.png'), True)
    salvar(fr2, Path(f'{prefixo}-frente.png'), True)
    salvar(l2, Path(f'{prefixo}-luz.png'))


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else PASTA
    saida.mkdir(parents=True, exist_ok=True)
    for nome, hora in HORAS.items():
        for formato in ('paisagem', 'retrato'):
            pintar(formato, nome, hora, saida)
    print('ok', saida)
