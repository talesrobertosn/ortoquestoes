"""Base comum das cenas da espera (O Gato Aventureiro): quadro de 96 x 56, chão na linha 52, gato no centro.

Reaproveita o gato fofo de scripts/gerar_gato_fofo.py (importado como G). Os corpos de G usam o global G.CHAO;
aqui ele passa a 52 para o gato pisar perto da base do quadro maior (sobra espaço em cima para pulos e objetos).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import gerar_gato_fofo as G  # noqa: E402

QW, QH, NQ = 96, 56, 8     # quadro das cenas e quadros por linha
CHAO = 52                  # linha do contorno de baixo das patas
X_SENTA = 47.0             # âncora do gato sentado (como G.X0 = 31 no quadro de 64)
X_PE = 46.5
X_DEITA = 47.0
G.CHAO = CHAO

# O padrão de Tela.sombra (y) ficou preso no chão de 45 quando G foi carregado; aqui ele segue o chão novo, para os
# corpos de G (enrolado, em pé) terem a sombra no chão das cenas e não escondida embaixo do corpo.
_sombra_original = G.Tela.sombra


def _sombra_no_chao(self, cx, larg, y=None, **kw):
    return _sombra_original(self, cx, larg, y=G.CHAO + 0.2 if y is None or y == 45.2 else y, **kw)


G.Tela.sombra = _sombra_no_chao


def tela() -> "G.Tela":
    return G.Tela(QW, QH)


def sombra(t, cx, larg, **kw):
    """t.sombra com o chão novo (o padrão de Tela.sombra ficou preso em y = 45)."""
    t.sombra(cx, larg, y=CHAO + 0.2, **kw)


def fase(k, n=NQ, d=0.0):
    import math
    return math.sin((k / n + d) * math.tau)


# Poses de descanso canônicas: TODA linha que começa ou termina "sentado" usa exatamente esta pose no quadro de
# entrada/saída, e toda linha "deitado" usa a de deitado. Assim uma cena emenda na outra sem pulo.
def repouso_sentado(t, k=0, **mudar):
    p = G.Pose(cauda=G.cauda_enrolada_frente(0, 0.0), cauda_frente=True)
    for a, v in mudar.items():
        setattr(p, a, v)
    G.corpo_sentado(t, X_SENTA, p)
    return p


def repouso_deitado(t, k=0, **mudar):
    p = G.Pose(cab=(9.0, -8.2), cab_ang=12, olhos="fechado", boca="nada", respira=0.5,
               cauda=((-14.5, -5.0), (-10.0, -3.0), (-2.0, -2.6), (4.5, -2.8), (8.5, -4.6)))
    for a, v in mudar.items():
        setattr(p, a, v)
    G.corpo_enrolado(t, X_DEITA, p)
    return p
