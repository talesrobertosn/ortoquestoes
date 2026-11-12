"""Os bichos da carta de convite (12/11/2026, pedido do Tales: trocar o mensageiro pela coruja e pelo gato).

Gera duas folhas pequenas, só para a carta (src/componentes/convite/), e a cartinha solta:

- public/pixel/mascote/gato-convite.png: quadros de 64 x 64 (o gato fofo de scripts/gerar_gato_fofo.py com o chão na
  mesma linha y = 45; os 18 px de baixo deixam o rabo pendurar para fora da borda da carta), 6 quadros por linha:
    0 andando_carta   andando com a cartinha na boca (laço)
    1 deitando        de pé até deitado, olhando para a frente (toca uma vez; ao contrário, levanta)
    2 deitado         deitado na borda, rabo pendurado balançando, pisca (laço)
    3 deitado_olhando deitado, olhando para baixo e para a direita, para os botões (laço)
    4 deitado_feliz   deitado, olhos felizes, rabo animado e corações (laço)
    5 andando         andando sem a carta, para ir embora (laço)
- public/pixel/mascote/coruja-convite.png: quadros de 44 x 32 (o desenho do Tales no PixelLab, coruja-nova.png, sem
  nenhum pixel alterado), 5 por linha:
    0 andando_carta   os dois passos sem lanterna da linha "andando", com a cartinha no bico (4 quadros)
    1 parada, 2 olhando, 3 acenando, 4 voando  (cópias das linhas de coruja-nova.png)
- public/pixel/mascote/carta-mini.png: a cartinha sozinha (9 x 7), que cai na carta grande quando o bicho entrega.

Tudo feito por código, sem IA. Uso: python scripts/sprites/convite_bichos.py [--previa PASTA]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import gerar_gato_fofo as G  # noqa: E402

# ─────────────────────────────── a cartinha ───────────────────────────────
CARTA = [
    "KKKKKKKKK",
    "KdPPPPPdK",
    "KPdPPPdPK",
    "KPPdRdPPK",
    "KPPPrPPPK",
    "KPPPPPPPK",
    "KKKKKKKKK",
]
CORES_CARTA = {"K": "#3b1c10", "P": "#fbf3df", "d": "#c9a777", "R": "#c4473d", "r": "#8e2a24"}


def carta_img() -> Image.Image:
    img = Image.new("RGBA", (len(CARTA[0]), len(CARTA)), (0, 0, 0, 0))
    for y, linha in enumerate(CARTA):
        for x, ch in enumerate(linha):
            if ch != ".":
                img.putpixel((x, y), tuple(int(CORES_CARTA[ch][i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    return img


# ─────────────────────────────── o gato ───────────────────────────────
GW, GH, GN = 64, 64, 6
X_DEITA = 33.0


def _boca_andando(k: int) -> tuple[float, float]:
    """Onde fica a boca do gato no quadro k do passo (a cabeça de gato_andando sobe e desce 1 px)."""
    f = k / G.NQ
    dy = round(-0.8 + 0.8 * abs(math.cos(f * G.TAU)))
    return 43.5, 30.0 + dy


def gato_andando_carta(t, k):
    G.gato_andando(t, k)
    x, y = _boca_andando(k)
    t.molde(CARTA, x + 0.5, y + 1.5, cores=CORES_CARTA)


# O rabo pendurado passa da linha do chão, que a Tela do gato corta (nada do corpo passa dela). Ele é pintado numa
# Tela própria, sem chão, e fica atrás do corpo; no corpo, o rabo vira um toco escondido dentro da anca.
TOCO = ((-9.0, -6.0), (-10.0, -6.0))


def _cauda_pendurada(k, amp=1.0, vel=1.0):
    """Rabo que sai do quadril, passa da borda (y > 0 é abaixo do chão) e balança lá embaixo."""
    w = math.sin((k / GN * vel) * G.TAU) * amp
    return ((-13.0, -3.6), (-17.0, -1.4), (-18.6 + 0.4 * w, 4.0), (-18.0 + 1.6 * w, 9.5), (-15.6 + 3.0 * w, 13.6))


def gato_deitando(t, k):
    if k == 0:
        G.gato_andando(t, 0)
        return
    if k in (1, 2):
        u = 0.45 if k == 1 else 0.85
        q = (-7.5, -12.5 + 5.0 * u)
        o = (6.5, -12.5 + 4.2 * u)
        pes = ((-6.0, 0.0), (-8.6, 0.0), (7.5 + 1.2 * u, 0.0), (5.0 + 1.2 * u, 0.0))
        p = G.Pose(quadril=q, ombro=o, pes=pes, cab=(10.5, -22.5 + 5.0 * u), cab_ang=-2 * u,
                   cauda=((-12.0, -14.0 + 6 * u), (-17.0, -14.0 + 8 * u), (-19.0, -10.0 + 10 * u), (-17.0, -6.0 + 12 * u)))
        G.corpo_em_pe(t, G.X_PE, p)
        return
    olhos = "meio" if k == 3 else "aberto"
    p = G.Pose(cab=(10.4, -17.0 + (0.6 if k == 3 else 0.0)), olhos=olhos, respira=0.5, orelhas=(0, 0), cauda=TOCO)
    G.corpo_deitado(t, X_DEITA, p)
    t.rabo = ((-13.0, -3.6), (-17.0, -2.6), (-20.0, -1.4), (-22.0, -0.8)) if k == 3 else _cauda_pendurada(0, [0.6, 1.0][k - 4])


def gato_deitado(t, k):
    resp = 0.5 + 0.5 * G._sn(k)
    p = G.Pose(cab=(10.4, -17.0), cab_ang=0.8 * G._sn(k, d=0.3), olhos="fechado" if k == 4 else "aberto",
               olhar=(-0.4, 0.2), respira=resp, orelhas=(0.0, -14.0) if k == 2 else (0.0, 0.0),
               cauda=TOCO)
    G.corpo_deitado(t, X_DEITA, p)
    t.rabo = _cauda_pendurada(k, 1.0)


def gato_deitado_olhando(t, k):
    resp = 0.5 + 0.5 * G._sn(k)
    p = G.Pose(cab=(10.8, -16.6), cab_ang=-6.0, olhos="fechado" if k == 5 else "aberto", olhar=(1.0, 0.9), vira=0.35,
               respira=resp, orelhas=(-8.0, -8.0), cauda=TOCO)
    G.corpo_deitado(t, X_DEITA, p)
    t.rabo = _cauda_pendurada(k, 0.6)


def gato_deitado_feliz(t, k):
    resp = 0.5 + 0.5 * G._sn(k)
    p = G.Pose(cab=(10.4, -17.4), cab_ang=3.0 * G._sn(k), olhos="feliz", boca="w", respira=resp, orelhas=(-4, -4),
               cauda=TOCO)
    G.corpo_deitado(t, X_DEITA, p)
    t.rabo = _cauda_pendurada(k, 1.6, 2.0)
    if k in (0, 1, 3, 4):
        G.coracao(t, 50 + (k % 2), 16 - (k % 3) * 2)


def gato_andando_livre(t, k):
    G.gato_andando(t, k)


LINHAS_GATO = [
    ("andando_carta", gato_andando_carta), ("deitando", gato_deitando), ("deitado", gato_deitado),
    ("deitado_olhando", gato_deitado_olhando), ("deitado_feliz", gato_deitado_feliz), ("andando", gato_andando_livre),
]


def folha_gato() -> Image.Image:
    img = Image.new("RGBA", (GW * GN, GH * len(LINHAS_GATO)), (0, 0, 0, 0))
    for li, (_, fn) in enumerate(LINHAS_GATO):
        for k in range(GN):
            t = G.Tela(GW, GH)
            t.rabo = None
            fn(t, k)
            q = Image.new("RGBA", (GW, GH), (0, 0, 0, 0))
            if t.rabo is not None:
                r = G.Tela(GW, GH)
                xf = G.Xf(X_DEITA, G.CHAO - 0.5)
                G.cauda(r, [xf(c) for c in t.rabo], 2.4, 1.8)
                q.alpha_composite(Image.fromarray(r.render(), "RGBA"))
            q.alpha_composite(Image.fromarray(t.render(), "RGBA"))
            img.paste(q, (k * GW, li * GH))
    return img


# ─────────────────────────────── a coruja ───────────────────────────────
CW, CH, CN = 44, 32, 5
CORUJA = RAIZ / "public/pixel/mascote/coruja-nova.png"
LINHAS_CORUJA_NOVA = ["parada", "andando", "voando", "pousando", "lendo", "dormindo", "acenando", "olhando"]
# Os dois passos da linha "andando" que não têm a lanterna, alternados; a cartinha pende do bico, em (25, 12) nos dois.
PASSOS = [(0, 0), (1, 0), (0, -1), (1, -1)]   # (quadro de origem, deslocamento vertical do corpo)
BICO = (25.5, 16.5)


def quadro_coruja(src: Image.Image, linha: str, k: int) -> Image.Image:
    li = LINHAS_CORUJA_NOVA.index(linha)
    return src.crop((k * CW, li * CH, (k + 1) * CW, (li + 1) * CH))


def folha_coruja() -> Image.Image:
    src = Image.open(CORUJA).convert("RGBA")
    linhas = ["andando_carta", "parada", "olhando", "acenando", "voando"]
    img = Image.new("RGBA", (CW * CN, CH * len(linhas)), (0, 0, 0, 0))
    carta = carta_img()
    for k, (orig, dy) in enumerate(PASSOS):
        q = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        q.alpha_composite(quadro_coruja(src, "andando", orig), (0, dy))
        q.alpha_composite(carta, (int(BICO[0] - carta.width / 2), int(BICO[1] + dy - 2)))
        img.paste(q, (k * CW, 0))
    for li, nome in enumerate(linhas[1:], start=1):
        for k in range(CN):
            img.paste(quadro_coruja(src, nome, k), (k * CW, li * CH))
    return img


def main() -> None:
    saidas = {
        "gato-convite.png": folha_gato(),
        "coruja-convite.png": folha_coruja(),
        "carta-mini.png": carta_img(),
    }
    for nome, img in saidas.items():
        G.salvar(img, RAIZ / "public/pixel/mascote" / nome)
    if "--previa" in sys.argv:
        destino = Path(sys.argv[sys.argv.index("--previa") + 1])
        destino.mkdir(parents=True, exist_ok=True)
        for nome, img in saidas.items():
            for tom, cor in (("escuro", (42, 29, 20, 255)), ("claro", (251, 250, 246, 255))):
                f = Image.new("RGBA", img.size, cor)
                f.alpha_composite(img)
                f.resize((img.width * 4, img.height * 4), Image.NEAREST).save(destino / f"{nome[:-4]}-4x-{tom}.png")


if __name__ == "__main__":
    main()
