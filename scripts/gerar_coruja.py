"""A coruja bibliotecária em pixel art HD-2D (31/10/2026): personagem original da Biblioteca de Resumos.

Feita do zero por este script, com o mesmo pintor de campos de distância, a mesma luz, o mesmo contorno e a mesma
densidade de pixel do gato oficial (scripts/gerar_mascote.py). Nada é baixado nem gerado por IA.

A personagem: coruja pequena e sábia, plumagem castanho-dourada, tufos curtos nas orelhas, disco facial creme com aro
escuro, olhos grandes cor de âmbar (pupila escura e ponto de luz), óculos redondos de latão apoiados baixo no bico,
estola verde (o verde do site) de bibliotecária, peito creme com riscas em "V", asas mais escuras com pintas claras
e garras cinza-acastanhadas que seguram o poleiro (o poleiro é pintado no cenário; o fundo aqui é transparente).
Expressão séria e gentil: sem sorriso nem bochecha rosada.

Gera public/pixel/mascote/coruja.png: quadros de 48 x 56, 6 por linha, uma linha por comportamento, nesta ordem
(ids do lado do TypeScript):
  0 repouso   respiração lenta, penas assentando, meia piscada no fim
  1 piscando  abre, meio, fecha, meio, abre, abre
  2 lendo     segura um livrinho aberto com as asas, olha para baixo e vira uma página
  3 olhando   a cabeça gira devagar para a esquerda e para a direita (o corpo fica parado)
  4 reagindo  alegria: agacha, estica as pernas (as garras não soltam o poleiro), abre as asas e ergue os tufos
  5 voando    ciclo de bater de asas, corpo erguido e patas soltas
  6 girando   o giro famoso da cabeça (até 270 graus): a nuca aparece no meio e a cabeça volta
  7 piando    o pio: o peito estufa, o bico abre um pouco e a cabeça inclina para cima

Nas linhas 0 a 4, 6 e 7 as garras ficam sempre na mesma linha de base (BASE_Y) e no mesmo centro (PES_X), para a
coruja nunca flutuar sobre o poleiro.

Uso: python3 scripts/gerar_coruja.py [--previa PASTA]   (a prévia salva folhas ampliadas para conferir)
"""
from __future__ import annotations

import math
import sys
from dataclasses import dataclass, replace
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_mascote as gm  # noqa: E402
from gerar_mascote import (  # noqa: E402
    MATS, PASTA, TAU, Forma, Mat, Quadro2D, Tela, bezier, capsula, caixa, cintila, circulo, elipse, hx, poligono,
    rampa, ruido, salvar, semiplano, traco,
)

CW, CH, CQ = 48, 56, 6            # quadro da coruja e quadros por linha
PES_X = 24.0                      # centro das garras (x, pixels de arte)
CHAO = 54.0                       # ponta de baixo dos dedos (antes do contorno)


# ═══════════════════════════════ materiais da coruja ═══════════════════════════════
def _registra(nome: str, mat: Mat) -> None:
    """Acrescenta um material ao pintor do mascote sem mexer nos que já existem (as folhas antigas não mudam)."""
    MATS[nome] = mat
    if nome not in gm.IDX_MAT:
        gm.NOMES_MAT.append(nome)
        gm.IDX_MAT[nome] = len(gm.NOMES_MAT) - 1


_registra("pena", Mat(rampa("#21120a", "#38200e", "#553214", "#74461b", "#965d24", "#b5782f", "#cf9440", "#e6b25a"), hx("#140a06"), rim=0.5, tex=0.07))
_registra("pena_escura", Mat(rampa("#140b06", "#22140a", "#34210f", "#492e15", "#613e1c", "#7b5025", "#94642f"), hx("#0d0704"), rim=0.45, tex=0.06))
_registra("pena_creme", Mat(rampa("#4a3b30", "#76624e", "#a08868", "#c4ab84", "#ddc8a0", "#efe2c2", "#fbf4e2"), hx("#241a12"), rim=0.4, tex=0.03))
_registra("olho_coruja", Mat(rampa("#5e2c04", "#93500a", "#c87a12", "#ec9f22", "#ffc444", "#ffe28c"), hx("#1a0c02"), emite=True))
_registra("bico", Mat(rampa("#211b17", "#3c332c", "#5e5248", "#857766", "#ab9d88", "#cfc3ae"), hx("#120e0b"), rim=0.3, brilho=0.35))
_registra("garra", Mat(rampa("#1b1512", "#2f2621", "#4a3e35", "#685a4c", "#8a7a68", "#ab9c88"), hx("#100c0a"), rim=0.35, tex=0.04))
_registra("estola", Mat(rampa("#04120b", "#081d12", "#0e2a1b", "#153a26", "#1d4c33", "#25603f", "#2f7a4f", "#459465"), hx("#020b08"), rim=0.5, tex=0.08))


# ═══════════════════════════════ pose ═══════════════════════════════
@dataclass
class PoseC:
    dy: float = 0.0            # corpo e cabeça (negativo = sobe); as garras ficam no chão
    resp: float = 0.0          # respiração (-1..1): o peito sobe
    vira: float = 0.0          # guinada da cabeça, em graus (positivo = olha para a direita da tela)
    inc: float = 0.0           # inclinação da cabeça (rolagem, graus)
    ergue: float = 0.0         # cabeça para cima (pixels; negativo = baixa)
    palp: float = 0.18         # pálpebra: 0 aberto, 1 fechado (0,12 = olhar calmo, de quem já leu muito)
    olhar: tuple = (0.0, 0.0)  # deslocamento das pupilas
    tufos: float = 0.0         # 0 normais, 1 em pé
    asas: str = "fechadas"     # fechadas | abertas | livro
    asa_ang: float = 0.0       # ângulo das asas abertas (graus; negativo = para cima)
    asa_abre: float = 0.0      # asas fechadas afastando do corpo (alegria)
    bico: float = 0.0          # bico aberto 0..1
    estufa: float = 0.0        # peito estufado (pio) 0..1
    pernas: float = 0.0        # pernas esticadas (pixels a mais entre corpo e garras)
    voo: bool = False          # patas soltas, penduradas
    livro: float | None = None  # virar a página (0..1) ou None sem livro
    penas: float = 0.0         # penas do peito se acomodando (-1..1)


# ═══════════════════════════════ partes ═══════════════════════════════
CAB_Y = 19.6                      # centro da cabeça em repouso
RX_CAB, RY_CAB = 13.2, 10.6
OLHO_X = 5.0                      # meio da distância entre os olhos (inteiro: o olho fica redondo na grade)
PHI_OLHO = math.degrees(math.asin(OLHO_X / RX_CAB))
CORPO_Y = 41.5
OCULOS = "aro"                    # aro | baixo | monoculo (modelos para comparar; o escolhido fica como padrão)


def _proj(phi_graus: float, vira: float):
    """Ponto da superfície da cabeça na longitude phi (0 = bico): (seno na tela, escala horizontal, visível?)."""
    a = math.radians(phi_graus + vira)
    return math.sin(a), max(0.0, math.cos(a)), math.cos(a) > 0.08


def _q_sup(q: Quadro2D, phi: float, y: float, vira: float, raio=RX_CAB):
    """Quadro local de um detalhe pintado na superfície da cabeça (comprime na horizontal quando vira de lado)."""
    sx, esc, vis = _proj(phi, vira)
    e = esc / max(abs(math.cos(math.radians(phi))), 0.2)
    return Quadro2D(q.p(sx * raio, y), q.ang, max(e, 0.04)), vis, esc


def cabeca(t: Tela, c, p: PoseC, z=4.0):
    """Cabeça larga com tufos, disco facial, olhos, bico e óculos; gira em torno do eixo vertical (vira)."""
    q = Quadro2D(c, p.inc)
    uv = q.uv()
    vira = p.vira
    forma_cab = (elipse((0, 0.2), RX_CAB, RY_CAB - 0.6).suave(elipse((0, -2.4), RX_CAB - 1.0, RY_CAB - 2.4), 2.0)
                 .suave(elipse((0, 4.4), RX_CAB - 2.0, RY_CAB - 3.6), 2.0).borda(0.3, 1.1, 41))
    cab_tela = q.forma(forma_cab)
    # tufos das orelhas: triângulos curtos e grossos nos cantos de cima (vão para trás da cabeça quando o lado some)
    for s_ in (-1, 1):
        phi = s_ * 52.0
        sx, esc, vis = _proj(phi, vira)
        frente = math.cos(math.radians(phi + vira))
        x0 = sx * (RX_CAB - 3.4)
        lado = 1 if sx >= 0 else -1
        lb = 3.8 * max(abs(frente), 0.55)
        alto = 7.6 + 1.2 * p.tufos
        ponta = (x0 + lado * (3.0 + 0.8 * p.tufos) * max(abs(sx), 0.3), -7.0 - alto)
        tufo = poligono([(x0 - lb, -6.0), ponta, (x0 + lb, -6.4)]).suave(circulo((x0, -6.6), 2.6), 1.0)
        zt = z - 0.5 if frente > -0.2 else z - 1.2
        t.pinta(q.forma(tufo), "pena", zt, R=1.4, pid=f"tufo{s_}", uv=uv, semente=601)
        t.pinta(q.forma(capsula((x0 + lado * lb * 0.25, -8.0), (ponta[0] - lado * 0.2, ponta[1] + 1.4), 0.7)), "pena_escura", 0, sobre=f"tufo{s_}", R=0.8)
    t.pinta(cab_tela, "pena", z, R=6.5, pid="cabeca", uv=uv, semente=602)
    # pintinhas claras no alto e atrás da cabeça (giram com ela: ajudam a ler o giro)
    for (phi, y, r) in ((-150, -5.4, 0.6), (-105, -6.6, 0.55), (-62, -7.4, 0.55), (62, -7.4, 0.55), (105, -6.6, 0.55),
                        (150, -5.4, 0.6), (180, -7.0, 0.6), (-130, -1.4, 0.6), (130, -1.4, 0.6), (-165, 2.8, 0.6),
                        (165, 2.8, 0.6), (-28, -7.8, 0.5), (28, -7.8, 0.5)):
        sx, esc, vis = _proj(phi, vira)
        if vis:
            t.pinta(q.forma(elipse((sx * (RX_CAB - 1.0), y), max(0.45, r * esc + 0.15), r)), "pena_creme", 0, sobre="cabeca", tom=-0.3, R=0.6)
    # nuca: "rosto falso" escuro de costas (só aparece no giro)
    qn, vis, esc = _q_sup(q, 180.0, 1.6, vira, RX_CAB * 0.95)
    if vis:
        t.pinta(qn.forma(traco([(-5.6, -3.0), (0, 2.4), (5.6, -3.0)], 1.5)), "pena", 0, sobre="cabeca", R=1.0, tom=-0.14)
        for (x, y) in ((-3.4, -4.0), (3.4, -4.0), (-4.6, 0.4), (4.6, 0.4), (-2.6, 3.6), (2.6, 3.6), (-1.6, -1.6), (1.6, -1.6)):
            t.pinta(qn.forma(circulo((x, y), 0.62)), "pena_creme", 0, sobre="cabeca", R=0.6, tom=-0.1)
    # disco facial: dois discos creme com aro escuro
    for s_ in (-1, 1):
        qf, vis, esc = _q_sup(q, s_ * PHI_OLHO, 0.7, vira)
        if not vis:
            continue
        t.pinta(qf.forma(circulo((0, 0), 6.4)) & cab_tela, "pena_escura", 0, sobre="cabeca", R=3.0, tom=-0.16)
        t.pinta(qf.forma(circulo((0, 0.1), 5.4).borda(0.3, 1.4, 44 + s_)) & cab_tela, "pena_creme", 0, sobre="cabeca", R=3.5, tom=0.04)
    # testa: o "V" escuro entre os olhos, que desce até o bico
    qm, vis, esc = _q_sup(q, 0.0, 0.0, vira)
    if vis:
        t.pinta(qm.forma(poligono([(-2.0, -5.4), (2.0, -5.4), (0.6, -0.6), (-0.6, -0.6)])) & cab_tela, "pena", 0, sobre="cabeca", R=1.0, tom=-0.02)
    # olhos
    ox, oy = p.olhar
    for s_ in (-1, 1):
        qo, vis, esc = _q_sup(q, s_ * PHI_OLHO, 0.0, vira)
        if not vis or esc < 0.3:
            continue
        cy_o = qo.o[1]
        t.pinta(qo.forma(circulo((0, 0), 3.6)), "pupila", z + 0.2, R=0.8, pid="olho", sem_contorno=True)
        t.pinta(qo.forma(circulo((0, 0), 2.62)), "olho_coruja", z + 0.25, pid="olho", sem_contorno=True,
                tom=lambda X, Y, cy=cy_o: 0.98 - np.clip((cy + 0.6 - Y) * 0.22, 0, 0.6))
        t.pinta(qo.forma(circulo((ox, oy), 1.25)), "pupila", z + 0.3, pid="olho", sem_contorno=True)
        t.pinta(qo.forma(circulo((-1.0 + ox * 0.5, -1.0 + oy * 0.5), 0.5)), "olho_coruja", z + 0.35, pid="olho", tom=1.0, sem_contorno=True)
        if p.palp > 0:   # pálpebra de penas descendo de cima
            alto = -3.6 + 7.2 * min(p.palp, 1.0)
            t.pinta(qo.forma(circulo((0, 0), 3.65) & semiplano((0, alto), (0, 1))), "pena_creme", z + 0.4, R=1.4, pid="palpebra",
                    sem_contorno=True, tom=-0.1)
            larg = math.sqrt(max(0.0, 3.6 ** 2 - alto ** 2))
            if larg > 0.8:
                t.pinta(qo.forma(capsula((-larg + 0.3, alto), (larg - 0.3, alto), 0.42)), "pena_escura", z + 0.41, pid="palpebra",
                        sem_contorno=True, tom=-0.35)
    # bico em gancho
    qb, vis, esc = _q_sup(q, 0.0, 0.0, vira, RX_CAB + 0.8)
    if vis or abs(vira) < 100:
        if p.bico > 0:
            ab = p.bico
            t.pinta(qb.forma(poligono([(-1.3, 3.2), (1.3, 3.2), (0.4, 5.2 + ab * 1.8), (-0.4, 5.2 + ab * 1.8)])), "bico", z + 0.45, R=0.6, pid="bico_baixo", tom=-0.1)
            t.pinta(qb.forma(elipse((0, 4.4 + ab * 0.6), 0.95, 0.4 + ab * 0.8)), "pupila", z + 0.47, pid="bico_baixo", sem_contorno=True)
        t.pinta(qb.forma(poligono([(-1.5, 1.0), (1.5, 1.0), (0.9, 3.4 - p.bico * 0.3), (0, 5.0 - p.bico * 0.8), (-0.9, 3.4 - p.bico * 0.3)])),
                "bico", z + 0.5, R=1.0, pid="bico", semente=603)
    oculos(t, q, p, z + 0.6)
    return q


def oculos(t: Tela, q: Quadro2D, p: PoseC, z: float):
    """Óculos redondos de latão (ou monóculo com corrente), conforme OCULOS."""
    vira = p.vira
    aros = None
    for s_ in (-1, 1):
        if OCULOS == "monoculo" and s_ < 0:
            continue
        if OCULOS == "baixo":
            qo, vis, esc = _q_sup(q, s_ * PHI_OLHO * 0.72, 3.0, vira)
            r_ext, r_int = 2.9, 2.15
        else:
            qo, vis, esc = _q_sup(q, s_ * PHI_OLHO, 0.6, vira)
            r_ext, r_int = 4.75, 3.95
        if not vis or esc < 0.2:
            continue
        aro = qo.forma(circulo((0, 0), r_ext) - circulo((0, 0), r_int))
        aros = aro if aros is None else aros | aro
    qm, vis, esc = _q_sup(q, 0.0, 0.0, vira)
    if aros is not None and vis and OCULOS != "monoculo":
        if OCULOS == "baixo":
            ponte = traco(bezier((-1.4, 2.6), (0, 1.6), (1.4, 2.6), 5), 0.42)
        else:
            ponte = traco(bezier((-1.2, 0.2), (0, -0.5), (1.2, 0.2), 5), 0.45)
        aros = aros | qm.forma(ponte)
    if aros is not None:
        t.pinta(aros, "latao", z, R=0.7, pid="oculos")


def corpo(t: Tela, p: PoseC, z=2.0):
    """Corpo em pera, peito creme com riscas em V."""
    cy = CORPO_Y + p.dy
    e = p.estufa
    f = (elipse((PES_X, cy - 1.4 - 0.2 * p.resp), 11.6 + 0.6 * e + 0.2 * p.resp, 9.6 + 0.4 * p.resp + 0.4 * e)
         .suave(elipse((PES_X, cy + 4.2), 8.2, 6.0), 3.0).borda(0.35, 1.0, 51))
    t.pinta(f, "pena", z, R=7.5, pid="corpo", semente=611)
    peito = elipse((PES_X, cy + 0.6 - 0.4 * p.resp), 8.2 + 1.0 * e, 9.4 + 0.6 * e).borda(0.6, 1.0, 52)
    t.pinta(peito, "pena_creme", 0, sobre="corpo", R=5.5)
    # riscas em V (chevrons) em fileiras desencontradas
    for fila, y in enumerate((-3.8, -0.2, 3.4)):
        n = 2 if fila % 2 == 0 else 3
        for i in range(n):
            x = PES_X + (i - (n - 1) / 2) * 4.6 + 0.3 * p.penas * (1 if fila % 2 else -1)
            yy = cy + y - 0.4 * p.resp
            v = traco([(x - 1.4, yy - 0.9), (x, yy + 0.4), (x + 1.4, yy - 0.9)], 0.45)
            t.pinta(v & peito.engrossa(-1.0), "pena", 0, sobre="corpo", R=0.5, tom=-0.05)
    if e > 0:   # garganta branca que estufa no pio
        t.pinta(elipse((PES_X, cy - 7.2), 2.0 + 3.0 * e, 1.0 + 1.8 * e), "pena_creme", 0, sobre="corpo", R=2.0, tom=0.14)
    return cy


def estola(t: Tela, p: PoseC, cy_cab, z=4.7):
    """Estola verde de bibliotecária: a volta no pescoço e uma ponta caída à esquerda, com filete dourado e franja."""
    y = cy_cab + 9.6
    volta = traco(bezier((PES_X - 10.4, y - 1.6), (PES_X, y + 2.6), (PES_X + 10.4, y - 1.6), 9), [1.2, 1.35, 1.5, 1.55, 1.55, 1.55, 1.5, 1.35, 1.2])
    t.pinta(volta, "estola", z, R=1.6, pid="estola", semente=621)
    t.pinta(elipse((PES_X - 4.8, y + 0.9), 2.0, 1.6), "estola", z + 0.15, R=1.4, pid="estola_no", semente=623)
    sw = 0.3 * p.resp + 0.6 * p.asa_abre
    pts = [(PES_X - 6.2, y + 0.2), (PES_X - 3.0, y + 0.9), (PES_X - 3.4 + sw, y + 7.6), (PES_X - 6.8 + sw, y + 7.2)]
    t.pinta(poligono(pts), "estola", z + 0.1, R=1.3, pid="estola_ponta", semente=622)
    t.pinta(capsula((PES_X - 6.6 + sw, y + 5.6), (PES_X - 3.4 + sw, y + 6.0), 0.4), "latao", 0, sobre="estola_ponta", R=0.5)
    for i in range(3):
        x = PES_X - 6.2 + i * 1.3 + sw
        yy = y + 7.5 - 0.15 * i
        t.pinta(capsula((x, yy), (x + 0.1, yy + 1.1), 0.34), "latao", z + 0.05, R=0.4, pid="franja", sem_contorno=True, tom=-0.1)


def asa_fechada(t: Tela, s_: int, p: PoseC, cy, z=3.0):
    """Asa dobrada ao lado do corpo, mais escura, com pintas claras nas coberteiras e rêmiges listradas."""
    ab = p.asa_abre
    ombro = (PES_X + s_ * (8.8 + ab * 2.0), cy - 8.6 + ab * 0.6)
    ponta = (PES_X + s_ * (5.4 + ab * 7.0), cy + 9.6 - ab * 3.6)
    ang = math.degrees(math.atan2(ponta[1] - ombro[1], ponta[0] - ombro[0])) - 90
    q = Quadro2D(ombro, ang)
    comp = math.hypot(ponta[0] - ombro[0], ponta[1] - ombro[1])
    f = elipse((s_ * 0.6, comp * 0.42), 3.8, comp * 0.5).suave(poligono([(-2.6, comp * 0.55), (2.4, comp * 0.55), (-s_ * 0.4, comp + 0.4)]), 1.4)
    nome = f"asa{s_}"
    t.pinta(q.forma(f.borda(0.25, 1.2, 60 + s_)), "pena_escura", z, R=3.4, pid=nome, uv=q.uv(), semente=631 + s_)
    t.pinta(q.forma(elipse((s_ * 0.2, comp * 0.24), 3.6, comp * 0.27)), "pena", 0, sobre=nome, R=3.0, tom=-0.02)
    for (u, v) in ((-1.4, 0.18), (1.2, 0.26), (-1.0, 0.38), (1.6, 0.44)):
        t.pinta(q.forma(elipse((u * s_, comp * v), 0.75, 0.6)), "pena_creme", 0, sobre=nome, R=0.6, tom=-0.3)
    for v in (0.62, 0.78):   # rêmiges: barras claras atravessadas
        t.pinta(q.forma(capsula((-2.4, comp * v), (2.4, comp * v + 0.6 * s_), 0.42)), "pena", 0, sobre=nome, R=0.6, tom=0.02)


def _penas_asa():
    """Rêmiges da asa aberta em coordenadas locais (ombro na origem, a ponta para +x): (raiz, ponta, raio)."""
    prim = [((10.4, -1.6 + i * 1.3), (10.4 + math.cos(math.radians(a)) * L, -1.6 + i * 1.3 + math.sin(math.radians(a)) * L), 1.25)
            for i, (a, L) in enumerate(((-22, 6.6), (-6, 7.2), (10, 7.0), (26, 6.2), (42, 5.2)))]
    sec = [((2.0 + i * 2.4, 2.0), (1.6 + i * 2.6, 7.6 - abs(i - 1.5) * 0.5), 1.35) for i in range(4)]
    return prim, sec


def asa_aberta(t: Tela, s_: int, p: PoseC, cy, z=1.6):
    """Asa estendida: braço com coberteiras, rêmiges em leque com barras claras; erguida mostra a face de baixo."""
    ombro = (PES_X + s_ * 7.0, cy - 6.8)
    a = p.asa_ang
    enc = 0.8 + 0.2 * math.cos(math.radians(a) * 1.5)
    q = Quadro2D(ombro, a if s_ > 0 else -a, esp=float(s_) * enc)
    uv = q.uv()
    nome = f"asa{s_}"
    baixo = a < -20      # asa erguida: vê-se a face de baixo, mais clara
    prim, sec = _penas_asa()
    braco = traco([(0, 0.4), (5.6, -1.2), (10.8, -0.4)], [3.4, 3.0, 2.4]).suave(elipse((6.0, 2.0), 5.6, 2.6), 1.4)
    f = braco
    for r0, r1, r in prim + sec:
        f = f | capsula(r0, r1, r, r * 0.7)
    t.pinta(q.forma(f.borda(0.15, 1.6, 70 + s_)), "pena_escura", z, R=2.6, pid=nome, uv=uv, semente=641 + s_)
    # coberteiras: castanho (de cima) ou camurça (de baixo)
    t.pinta(q.forma(braco.engrossa(-0.6)), "pena_creme" if baixo else "pena", 0, sobre=nome, R=2.0, tom=-0.32 if baixo else 0.0)
    # barras claras atravessando as rêmiges e riscos de separação entre as penas
    for r0, r1, r in prim + sec:
        for fr in (0.45, 0.8):
            c = (r0[0] + (r1[0] - r0[0]) * fr, r0[1] + (r1[1] - r0[1]) * fr)
            t.pinta(q.forma(circulo(c, r * 0.62)), "pena", 0, sobre=nome, R=0.6, tom=0.04 if not baixo else 0.12)
    if not baixo:
        for (x, y) in ((3.4, 0.6), (6.4, -0.2), (8.6, 1.2)):
            t.pinta(q.forma(elipse((x, y), 0.7, 0.55)), "pena_creme", 0, sobre=nome, R=0.6, tom=-0.2)


def pes(t: Tela, p: PoseC, cy, z=3.6):
    """Garras: três dedos à frente agarrando o poleiro, sob a barriga (ou pendurados no voo)."""
    for s_ in (-1, 1):
        fx = PES_X + s_ * 3.5
        if p.voo:
            base = (fx + s_ * 0.3, cy + 11.6)
            t.pinta(capsula((fx, cy + 7.0), base, 1.6, 1.3), "pena_creme", 1.8, R=1.6, pid=f"perna{s_}", semente=651, tom=-0.08)
            for i, dx in enumerate((-1.0, 0.0, 1.0)):
                tip = (base[0] + dx * 1.3, base[1] + 2.6 - abs(dx) * 0.4)
                t.pinta(capsula((base[0] + dx * 0.5, base[1] + 0.4), tip, 0.6, 0.45), "garra", z, R=0.6, pid=f"dedo{s_}{i}")
            continue
        pe_y = CHAO - 2.8
        topo = min(cy + 7.0, pe_y - 0.6)
        t.pinta(capsula((fx, topo), (fx, pe_y), 1.7, 1.9), "pena_creme", 1.8, R=1.8, pid=f"perna{s_}", semente=652, tom=-0.22)
        for i, dx in enumerate((-1.0, 0.0, 1.0)):
            raiz = (fx + dx * 1.1, pe_y + 0.2)
            tip = (fx + dx * 1.7, CHAO - 0.9)
            t.pinta(capsula(raiz, tip, 0.72, 0.62), "garra", z, R=0.7, pid=f"dedo{s_}{i}", semente=653)
            t.pinta(capsula((tip[0], tip[1]), (tip[0] - dx * 0.25, CHAO - 0.2), 0.45), "pupila", z + 0.05, pid=f"dedo{s_}{i}", sem_contorno=True)


def cauda(t: Tela, p: PoseC, cy, z=1.0):
    f = poligono([(PES_X - 5.0, cy + 4.0), (PES_X + 5.0, cy + 4.0), (PES_X + 3.0, cy + 10.4), (PES_X - 3.0, cy + 10.4)])
    t.pinta(f, "pena_escura", z, R=2.0, pid="cauda", semente=661)


def livrinho_aberto(t: Tela, c, virar: float, z=5.0):
    """Livrinho aberto de capa vinho, as páginas viradas para quem olha (a coruja lê por cima)."""
    q = gm._escala(Quadro2D(c, 0.0), 1.2)
    capa = poligono([(-7.6, -2.4), (0, -1.2), (7.6, -2.4), (7.8, 3.8), (0, 5.0), (-7.8, 3.8)])
    t.pinta(q.forma(capa), "livro_vinho", z, R=1.0, pid="livro_capa", plano=(0, 0.45, 0.9))
    for s_ in (-1, 1):
        pts = bezier((0, -1.2), (s_ * 3.4, -3.4), (s_ * 7.0, -2.8), 5) + bezier((s_ * 7.2, 2.8), (s_ * 3.4, 2.2), (0, 4.0), 5)
        t.pinta(q.forma(poligono(pts)), "papel", z + 0.1, R=1.2, pid=f"livro_pag{s_}", plano=(s_ * -0.25, 0.45, 0.86), semente=670)
        for j in range(3):
            y0 = -1.0 + j * 1.4
            t.pinta(q.forma(capsula((s_ * 1.8, y0), (s_ * (5.4 if j < 2 else 3.8), y0 - 0.4), 0.22)), "papel", 0, sobre=f"livro_pag{s_}", tom=-0.32, normal=False)
    t.pinta(q.forma(capsula((0, -0.8), (0, 3.8), 0.35)), "papel", z + 0.15, R=0.4, pid="livro_meio", tom=-0.35)
    if 0 < virar < 1:
        kk = math.cos(virar * math.pi)
        topo = -1.0 - math.sin(virar * math.pi) * 3.0
        t.pinta(q.forma(poligono([(0, -0.9), (kk * 6.6, topo - 0.8), (kk * 6.8, topo + 3.6), (0, 3.8)])), "papel", z + 0.3, R=1.0,
                pid="livro_folha", tom=0.06)


def pio(t: Tela, c, forca: float):
    """Arquinhos de som saindo do bico (o "uu" do pio), em pixel."""
    x0, y0 = int(round(c[0])), int(round(c[1]))
    for i, a in enumerate((0.85 * forca, 0.45 * forca)):
        x = x0 + 1 + i * 2
        for (dx, dy) in ((0, -2), (1, -1), (1, 0), (1, 1), (0, 2)):   # um ")" limpo de 5 pixels
            t.ponto_fx(x + dx + 0.5, y0 + dy + 0.5, "#f3e4c0", a)


def coruja(t: Tela, p: PoseC):
    """Monta a coruja inteira na pose p."""
    t.origem = (0.0, 0.0)
    t.luz(58.0, 6.0, 10.0, "#ffb15c", 60.0, 0.55)   # lamparina da biblioteca, de cima à direita (contraluz quente)
    cy = CORPO_Y + p.dy
    cauda(t, p, cy)
    if p.asas == "abertas":
        for s_ in (-1, 1):
            asa_aberta(t, s_, p, cy)
    pes(t, p, cy)
    corpo(t, p, z=2.0)
    if p.asas in ("fechadas", "livro"):
        for s_ in (-1, 1):
            asa_fechada(t, s_, p, cy)
    cy_cab = CAB_Y + p.dy - p.ergue
    estola(t, p, cy_cab)
    q = cabeca(t, (PES_X, cy_cab), p)
    if p.bico > 0.6:
        pio(t, q.p(RX_CAB + 0.4, 3.6), p.bico)
    if p.livro is not None:
        livrinho_aberto(t, (PES_X, cy - 1.0), p.livro, z=5.2)
        for s_ in (-1, 1):   # pontas das asas segurando as bordas do livro
            t.pinta(elipse((PES_X + s_ * 9.2, cy + 0.4), 1.9, 3.4, s_ * -20), "pena_escura", 5.6, R=1.6, pid=f"segura{s_}", semente=680)
            t.pinta(capsula((PES_X + s_ * 8.8, cy - 0.8), (PES_X + s_ * 9.6, cy + 2.2), 0.35), "pena", 0, sobre=f"segura{s_}", tom=0.05)


# ═══════════════════════════════ as linhas ═══════════════════════════════
def _sn(k, desloc=0.0):
    return math.sin((k + desloc) / CQ * TAU)


def l_repouso(k):
    palp = [0.12, 0.12, 0.12, 0.12, 0.12, 0.55][k]
    return PoseC(resp=_sn(k), dy=-0.25 * _sn(k), penas=_sn(k, 1.5), palp=palp)


def l_piscando(k):
    palp = [0.12, 0.55, 1.0, 0.55, 0.12, 0.12][k]
    return PoseC(palp=palp, resp=0.3 * _sn(k))


def l_lendo(k):
    virar = [0.0, 0.0, 0.3, 0.6, 0.85, 0.0][k]
    return PoseC(asas="livro", livro=virar, ergue=-1.0, olhar=(0.25 * _sn(k), 1.1), palp=0.42, inc=2.0 * _sn(k), resp=0.5 * _sn(k))


def l_olhando(k):
    vira = -28.0 * _sn(k)
    return PoseC(vira=vira, olhar=(-0.6 * _sn(k), 0.0), resp=0.4 * _sn(k))


def l_reagindo(k):
    dy = [0.0, 1.0, -1.8, -2.2, -0.8, 0.0][k]
    abre = [0.0, 0.0, 0.9, 1.0, 0.5, 0.0][k]
    tufos = [0.0, 0.3, 1.0, 1.0, 0.6, 0.0][k]
    return PoseC(dy=dy, pernas=max(0.0, -dy), asa_abre=abre, tufos=tufos, palp=[0.12, 0.3, 0.0, 0.0, 0.05, 0.12][k], ergue=0.2 * abre)


def l_voando(k):
    ang = [-48.0, -18.0, 16.0, 34.0, 12.0, -26.0][k]
    dy = [-2.2, -2.8, -3.2, -2.6, -2.0, -1.8][k]
    return PoseC(asas="abertas", asa_ang=ang, dy=dy, voo=True, palp=0.05, tufos=0.3)


def l_girando(k):
    vira = [0.0, 60.0, 120.0, 180.0, 120.0, 60.0][k]
    return PoseC(vira=vira)


def l_piando(k):
    est = [0.0, 0.5, 1.0, 1.0, 0.5, 0.0][k]
    return PoseC(estufa=est, bico=[0, 0, 0.7, 1.0, 0.3, 0][k], ergue=1.4 * est, inc=-4.0 * est, palp=0.12 + 0.2 * est)


LINHAS_CORUJA = [("repouso", l_repouso), ("piscando", l_piscando), ("lendo", l_lendo), ("olhando", l_olhando),
                 ("reagindo", l_reagindo), ("voando", l_voando), ("girando", l_girando), ("piando", l_piando)]


def quadro(fn, k) -> np.ndarray:
    t = Tela(CW, CH)
    coruja(t, fn(k))
    return t.render()


def folha_coruja() -> Image.Image:
    folha = Image.new("RGBA", (CW * CQ, CH * len(LINHAS_CORUJA)), (0, 0, 0, 0))
    for li, (_, fn) in enumerate(LINHAS_CORUJA):
        for k in range(CQ):
            folha.paste(Image.fromarray(quadro(fn, k), "RGBA"), (k * CW, li * CH))
    return folha


def main() -> None:
    folha = folha_coruja()
    salvar(folha, PASTA / "coruja.png")
    if "--previa" in sys.argv:
        destino = Path(sys.argv[sys.argv.index("--previa") + 1])
        destino.mkdir(parents=True, exist_ok=True)
        im = Image.open(PASTA / "coruja.png").convert("RGBA")
        for esc in (1, 2, 4, 6):
            fundo = Image.new("RGBA", im.size, (42, 29, 20, 255))
            fundo.alpha_composite(im)
            fundo.resize((im.width * esc, im.height * esc), Image.NEAREST).save(destino / f"coruja-{esc}x.png")


if __name__ == "__main__":
    main()
