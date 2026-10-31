"""Os três cavaleiros do Salão dos Cem (ranking), animados por código a partir do desenho escolhido pelo Tales.

O desenho é do Tales (PixelLab, livre de direitos; ele pediu para usar "100% igual", 31/10/2026): a saudação de 8
quadros (scripts/sprites/cem/saudacao-base.png, grade extraída do GIF dele e limpa) e, como cavaleiro parado, o
1º quadro dela. Este script não muda o traço; só:
- pinta as três versões (1º original de penacho vermelho e ouro; 2º penacho azul e prata; 3º penacho vinho e bronze);
- anima a espera em 8 quadros: respiração de 1 px (o tronco desce, as pernas ficam), o penacho que balança com um
  quadro de atraso e um brilho que passa na armadura.

Gera public/ranking/cem/cavaleiros.png (linhas 0 a 2: espera do 1º, 2º e 3º; linhas 3 a 5: a saudação de cada um;
8 quadros de 75 x 88) e cavaleiros.json.
Uso: python3 scripts/sprites/cem_cavaleiros.py [--previa PASTA]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
# A saudação (8 quadros) também é do Tales (PixelLab, 31/10/2026): a grade foi extraída do GIF dele e a franja
# clara do fundo branco foi limpa. SAUDA_DESLOC é onde a base fica dentro de cada quadro da saudação.
SAUDA = RAIZ / "scripts/sprites/cem/saudacao-base.png"
# Recorte comum a todos os quadros da saudação (x0, y0, x1, y1): o 1º quadro dela é também o cavaleiro parado,
# para a espera e a saudação serem o mesmo desenho, com os pés no mesmo lugar.
RECORTE = (16, 8, 87, 92)
SAIDA = RAIZ / "public/ranking/cem"
MARGEM = 2                    # folga em volta (penacho e brilho não encostam na borda)
NQ = 8
MS = 170
CINTURA = 68                  # da cintura para cima o corpo respira; pernas e sombra ficam paradas
RESPIRA = [0, 0, 1, 1, 1, 1, 0, 0]
PENACHO = [0, 0, 1, 1, 2, 1, 0, -1]   # balanço da ponta do penacho (px), um quadro atrás da respiração
BRILHO = [None, None, 0.0, 0.33, 0.66, 1.0, None, None]   # posição da faixa de brilho (0 = esquerda, 1 = direita)


def mascaras(b: np.ndarray):
    a = b[..., 3] > 0
    r, g, bl = (b[..., i].astype(int) for i in range(3))
    ys = np.arange(b.shape[0])[:, None]
    verm = (r > g * 1.5) & (r > bl * 1.5) & a & (ys < 40)
    ouro = (r > bl * 1.35) & (g > bl * 1.1) & a & ~verm & (r < g * 1.6)
    mx, mn = b[..., :3].max(2).astype(int), b[..., :3].min(2).astype(int)
    metal = a & ((mx - mn) < 28) & (mx > 70)
    return a, verm, ouro, metal


def tingir(b: np.ndarray, m: np.ndarray, cor, ganho=1.0) -> np.ndarray:
    b = b.astype(float).copy()
    lum = b[..., :3].mean(2, keepdims=True) / 150 * ganho
    b[..., :3] = np.where(m[..., None], np.clip(np.array(cor) * lum, 0, 255), b[..., :3])
    return b.astype(np.uint8)


def versoes(b: np.ndarray):
    _, verm, ouro, _ = mascaras(b)
    um = b
    dois = tingir(tingir(b, verm, [70, 120, 220]), ouro, [200, 215, 235], 1.05)
    tres = tingir(tingir(b, verm, [150, 40, 60]), ouro, [205, 125, 70])
    return [um, dois, tres]


def quadro(v: np.ndarray, verm: np.ndarray, metal: np.ndarray, k: int) -> np.ndarray:
    h, w = v.shape[:2]
    q = np.zeros((h + 2 * MARGEM, w + 2 * MARGEM, 4), np.uint8)
    q[MARGEM:MARGEM + h, MARGEM:MARGEM + w] = v
    vm = np.zeros(q.shape[:2], bool); vm[MARGEM:MARGEM + h, MARGEM:MARGEM + w] = verm
    mt = np.zeros(q.shape[:2], bool); mt[MARGEM:MARGEM + h, MARGEM:MARGEM + w] = metal
    corte = MARGEM + CINTURA
    # Penacho: só a parte solta, à esquerda do elmo, balança; quanto mais longe do elmo, mais.
    amp = PENACHO[k]
    if amp:
        resto = (q[..., 3] > 0) & ~vm
        novo = q.copy()
        ys, xs = np.where(vm)
        mover = []
        for y, x in zip(ys, xs):
            lim = np.where(resto[y])[0]
            borda = lim.min() if lim.size else q.shape[1]
            if x < borda - 1:
                t = min(1.0, (borda - x) / 20)
                mover.append((y, x, int(round(amp * t))))
        for y, x, d in mover:
            if d:
                novo[y, x] = 0
        for y, x, d in mover:
            if d and 0 <= x + d < q.shape[1]:
                novo[y, x + d] = q[y, x]
        q = novo
    # Respiração: do topo até a cintura desce 1 px (a linha da cintura é absorvida).
    if RESPIRA[k]:
        cima = q[:corte].copy(); mt_cima = mt[:corte].copy()
        q[1:corte + 1] = cima
        q[0] = 0
        mt[1:corte + 1] = mt_cima; mt[0] = False
    # Brilho: uma faixa diagonal que atravessa o metal (sem tocar o resto).
    pos = BRILHO[k]
    if pos is not None:
        ys, xs = np.mgrid[0:q.shape[0], 0:q.shape[1]]
        eixo = xs + ys * 0.55
        centro = -10 + pos * (q.shape[1] + q.shape[0] * 0.55 + 20)
        forca = np.clip(1 - np.abs(eixo - centro) / 3.2, 0, 1) * 70
        m = mt & (q[..., 3] > 0)
        q[..., :3] = np.where(m[..., None], np.clip(q[..., :3].astype(float) + forca[..., None] * np.array([1.0, 0.97, 0.85]), 0, 255), q[..., :3]).astype(np.uint8)
    return q


def quadros_saudacao() -> list[np.ndarray]:
    """Os 8 quadros da saudação, recortados e sem o bege do fundo preso entre as pernas."""
    tira = np.asarray(Image.open(SAUDA).convert("RGBA")).copy()
    sw = tira.shape[1] // NQ
    x0, y0, x1, y1 = RECORTE
    saida = []
    for k in range(NQ):
        f = tira[y0:y1, k * sw + x0:k * sw + x1].copy()
        r, g, b = (f[..., i].astype(int) for i in range(3))
        ys = np.arange(f.shape[0])[:, None]
        preso = (f[..., 3] > 0) & (r > 195) & (g > 175) & (b > 150) & (r - b > 12) & (ys >= 70) & (ys <= 80)
        f[preso] = 0
        saida.append(f)
    return saida


def saudacao(w: int, h: int):
    """Os 8 quadros da saudação nas três cores, no mesmo quadro (pés no mesmo lugar) da espera."""
    linhas = [[], [], []]
    for f in quadros_saudacao():
        q = np.zeros((h, w, 4), np.uint8)
        q[MARGEM:MARGEM + f.shape[0], MARGEM:MARGEM + f.shape[1]] = f
        for li, v in enumerate(versoes(q)):
            linhas[li].append(v)
    return linhas


def main() -> None:
    b = quadros_saudacao()[0]
    _, verm, _, metal = mascaras(b)
    vs = versoes(b)
    h, w = b.shape[0] + 2 * MARGEM, b.shape[1] + 2 * MARGEM
    folha = Image.new("RGBA", (w * NQ, h * len(vs) * 2), (0, 0, 0, 0))
    quadros = []
    for li, v in enumerate(vs):
        linha = [quadro(v, verm, metal, k) for k in range(NQ)]
        quadros.append(linha)
        for k, q in enumerate(linha):
            folha.paste(Image.fromarray(q, "RGBA"), (k * w, li * h))
    sauda = saudacao(w, h)
    for li, linha in enumerate(sauda):
        for k, q in enumerate(linha):
            folha.paste(Image.fromarray(q, "RGBA"), (k * w, (3 + li) * h))
    SAIDA.mkdir(parents=True, exist_ok=True)
    # Paleta de até 256 cores, sem pontilhado (os pixels ficam os mesmos e o arquivo cai para um terço).
    folha.quantize(256, method=Image.FASTOCTREE, dither=Image.NONE).save(SAIDA / "cavaleiros.png", optimize=True)
    (SAIDA / "cavaleiros.json").write_text(json.dumps({
        "largura": w, "altura": h, "quadros": NQ, "ms": MS, "linhas": {"1": 0, "2": 1, "3": 2}, "saudacao": {"1": 3, "2": 4, "3": 5}, "ms_saudacao": 120,
        "pes": [MARGEM + 35, MARGEM + 82], "nota": "pés (centro) e linha do chão em px do quadro",
    }, ensure_ascii=False, indent=1))
    print("cavaleiros.png", folha.size, (SAIDA / "cavaleiros.png").stat().st_size, "bytes")
    if "--previa" in sys.argv:
        destino = Path(sys.argv[sys.argv.index("--previa") + 1]); destino.mkdir(parents=True, exist_ok=True)
        fr = []
        for k in range(NQ):
            f = Image.new("RGBA", (w * 3 + 40, h + 20), (23, 28, 48, 255))
            for li in range(3):
                f.alpha_composite(Image.fromarray(quadros[li][k], "RGBA"), (10 + li * (w + 10), 10))
            fr.append(f.convert("RGB").resize((f.width * 4, f.height * 4), Image.NEAREST))
        fr[0].save(destino / "cavaleiros.gif", save_all=True, append_images=fr[1:], duration=MS, loop=0)
        tira = Image.new("RGBA", (w * NQ * 3, h * 3), (23, 28, 48, 255))
        for k in range(NQ):
            tira.alpha_composite(Image.fromarray(quadros[0][k], "RGBA").resize((w * 3, h * 3), Image.NEAREST), (k * w * 3, 0))
        tira.save(destino / "quadros-1.png")
        fr = []
        for k in range(NQ):
            f = Image.new("RGBA", (w * 3 + 40, h + 20), (23, 28, 48, 255))
            for li in range(3):
                f.alpha_composite(Image.fromarray(sauda[li][k], "RGBA"), (10 + li * (w + 10), 10))
            fr.append(f.convert("RGB").resize((f.width * 4, f.height * 4), Image.NEAREST))
        fr[0].save(destino / "saudacao.gif", save_all=True, append_images=fr[1:] + [fr[0]] * 4, duration=120, loop=0)


if __name__ == "__main__":
    main()
