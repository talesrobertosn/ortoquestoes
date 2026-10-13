"""Biblioteca Ancestral: o cenário do modo Estudo.

Salão alto de pedra visto um pouco de cima, em perspectiva de um ponto. O foco
de luz é o janelão em arco no fundo (sol da tarde que entra da floresta lá
fora) e cai como um tapete de luz no centro do chão, atrás do flashcard.
Valores: bordas escuras e quentes (madeira e lombadas), centro claro.
Camadas:
  fundo   parede do fundo com o janelão, galeria alta, estantes que recuam
  meio    paredes laterais com estantes cheias, piso de tábuas em perspectiva,
          tapete redondo, candelabros e pilhas de livros
  frente  cortinas pesadas nos cantos de cima e livros no canto de baixo
  luz     feixes do janelão, chamas das velas e brilho da janela
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa, ruido  # noqa: E402

PEDRA = rampa(['#120d0c', '#1c1513', '#28201b', '#362b24', '#463830', '#5a4a3e', '#706050'])
MADEIRA = rampa(['#0e0806', '#1a0f09', '#2a180e', '#3c2414', '#52331c', '#6a4426', '#865a32', '#a87a48'])
PISO = rampa(['#120a06', '#1e120a', '#2c1a0e', '#3e2614', '#54341c', '#6c4626', '#8a5c32', '#b07c46', '#d8a868'])
TAPETE = rampa(['#160606', '#240a0a', '#360e0e', '#4a1412', '#5e1c16', '#76281c'])
OURO = rampa(['#3a2408', '#6a4410', '#a8741e', '#d8a83a', '#f6d27a', '#fff1b8'])
CEU = '#fff1c8'
# cores das lombadas: vinho, musgo, azul, ocre, couro, ameixa, petróleo
LOMBADAS = [rampa(c) for c in (
    ['#1c0606', '#3a0c0c', '#5e1814', '#86281e', '#b04a32'],
    ['#06140c', '#0e2616', '#1a3e22', '#2c5a30', '#4a7c44'],
    ['#080c16', '#121a2c', '#1e2a46', '#30405e', '#4a5a7a'],
    ['#1c1206', '#3a260c', '#5e4016', '#8a6220', '#b88a36'],
    ['#140c08', '#2a1a10', '#44301e', '#64482c', '#8a6a44'],
    ['#120a14', '#22142a', '#382240', '#4e3458', '#6a4c72'],
    ['#06161a', '#0c2a30', '#164450', '#246070', '#3e8494'],
)]


def h(*a):
    v = 0
    for i, x in enumerate(a):
        v = v * 1000003 + int(x) * (7919 + i * 104729)
    return ((v ^ (v >> 13)) * 1274126177 & 0xFFFFFFFF) / 0xFFFFFFFF


def hv(*arrs):
    """hash vetorizado (0..1) de inteiros."""
    v = np.zeros(np.broadcast(*arrs).shape, np.int64)
    for i, a in enumerate(arrs):
        v = (v * 1000003 + np.asarray(a, np.int64) * (7919 + i * 104729)) & 0xFFFFFFFF
    v = (v ^ (v >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def livros(t: Tela, m, col, fila, v, luz, escala=1.0):
    """Pinta lombadas: `col` é a coordenada ao longo da prateleira (em larguras de livro),
    `fila` o número da prateleira e `v` (0..1) a altura dentro dela."""
    idl = np.floor(col).astype(np.int64)
    fr = col - idl
    alt = 0.62 + 0.33 * hv(idl, fila, 3)            # altura de cada livro
    vazio = hv(idl, fila, 5) < 0.07                  # vãos
    tomb = hv(idl, fila, 9) < 0.05                   # livro deitado (fica baixo)
    alt = np.where(tomb, 0.28, alt)
    dentro = m & (v > 1 - alt) & ~vazio
    cor = (hv(idl, fila, 7) * len(LOMBADAS)).astype(int) % len(LOMBADAS)
    # volume da lombada: claro à esquerda (luz do janelão), escuro à direita
    k = luz + 0.25 * (0.5 - np.abs(fr - 0.4)) - 0.18 * (fr > 0.82) + 0.08 * (fr < 0.2)
    # faixas douradas perto do topo e da base
    faixa = (np.abs(v - (1 - alt * 0.86)) < 0.035 * escala) | (np.abs(v - (1 - alt * 0.14)) < 0.03 * escala)
    for i, r in enumerate(LOMBADAS):
        mm = dentro & (cor == i)
        t.tingir(mm, np.clip(k, 0, 0.999), r, 0.6)
    ouro = dentro & faixa & (hv(idl, fila, 11) > 0.62)
    t.tingir(ouro, np.clip(k * 0.9, 0, 0.999), OURO[1:4], 0.5)
    # topo de cada livro mais escuro (sombra da prateleira de cima)
    topo = dentro & (v < 1 - alt + 0.06)
    t.rgb[topo] *= 0.7


def parede_estantes(t: Tela, m, prof, v, luz, n_filas, s=1):
    """Estante que cobre a máscara m: prof = coordenada ao longo (já com perspectiva), v = 0..1 da altura."""
    fila = np.floor(v * n_filas).astype(np.int64)
    vf = v * n_filas - fila
    # montantes verticais: a estante é feita de módulos
    mont = m & ((prof % 14) < 0.9)
    t.tingir(mont, np.clip(luz + 0.12, 0, 0.999), MADEIRA, 0.6)
    m = m & ~mont
    tabua = m & (vf > 0.88)
    t.tingir(tabua, np.clip(luz + 0.1 + 0.2 * (vf > 0.94), 0, 0.999), MADEIRA, 0.6)
    fundo = m & ~tabua
    t.tingir(fundo, np.clip(luz * 0.35, 0, 0.999), MADEIRA[:4], 0.6)
    livros(t, fundo, prof, fila + s * 100, vf / 0.88, luz)


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    cx = W / 2
    vy = H * (0.36 if retrato else 0.4)          # linha do horizonte (ponto de fuga)
    jl, jr = (W * 0.16, W * 0.84) if retrato else (W * 0.3, W * 0.7)   # parede do fundo
    chao_fundo = H * (0.56 if retrato else 0.6)  # base da parede do fundo
    t = Tela(W, H); x, y = t.x, t.y

    # ------------------------------------------------ fundo: parede do fundo, janelão, galeria
    f = Tela(W, H)
    fundo_m = np.ones((H, W), bool)
    luz_janela = np.exp(-(((x - cx) / (W * 0.18)) ** 2 + ((y - H * 0.28) / (H * 0.3)) ** 2))
    # pedra em blocos
    bl = (np.floor(y / 6) + 0).astype(int)
    desloc = (bl % 2) * 5
    junta = ((y % 6) < 0.9) | (((x + desloc) % 10) < 0.9)
    idb = hv(np.floor((x + desloc) / 10).astype(np.int64), bl, 1)
    lp = 0.16 + 0.35 * luz_janela + 0.08 * fbm(x / 6, y / 6, 3, 2) + 0.08 * idb - 0.14 * junta
    f.tingir(fundo_m, np.clip(lp, 0, 0.999), PEDRA, 0.6)
    # janelão em arco, com mainéis e vitral discreto
    jw = (jr - jl) * (0.42 if retrato else 0.36)
    jtopo, jbase = H * 0.06, chao_fundo - H * 0.07
    raio = jw / 2
    dentro_j = (np.abs(x - cx) < raio) & (y < jbase) & ((y > jtopo + raio) | (np.hypot(x - cx, y - (jtopo + raio)) < raio))
    moldura = (np.abs(x - cx) < raio + 2.5) & (y < jbase + 2) & ((y > jtopo + raio) | (np.hypot(x - cx, y - (jtopo + raio)) < raio + 2.5)) & ~dentro_j
    f.tingir(moldura, np.clip(0.45 + 0.4 * luz_janela, 0, 0.999), PEDRA[2:], 0.5)
    ceu = np.clip(1 - (y - jtopo) / (jbase - jtopo), 0, 1)
    f.rgb[dentro_j] = (np.array(hexrgb('#fff6d8'), F) * (0.6 + 0.4 * ceu[..., None]) + np.array(hexrgb('#f0c878'), F) * (0.4 - 0.4 * ceu[..., None]))[dentro_j]
    f.a[dentro_j] = 1
    # copas das árvores lá fora (silhuetas suaves): a biblioteca fica na floresta
    copa = dentro_j & (y > jbase - (jbase - jtopo) * (0.35 + 0.12 * fbm(x / 7, 1, 3, 9)))
    f.rgb[copa] = f.rgb[copa] * 0.55 + np.array(hexrgb('#7a9a5a'), F) * 0.45
    mainel = dentro_j & ((np.abs(x - cx) < 0.8) | (np.abs(y - (jtopo + raio + (jbase - jtopo - raio) * 0.45)) < 0.7) | (np.abs(np.abs(x - cx) - raio * 0.5) < 0.6))
    f.tingir(mainel, np.full((H, W), 0.25, F), PEDRA[1:4], 0.3)
    # estantes da parede do fundo, dos lados do janelão
    for lado in (-1, 1):
        x0, x1 = (jl, cx - raio - 6) if lado < 0 else (cx + raio + 6, jr)
        m = (x >= x0) & (x < x1) & (y > H * 0.12) & (y < chao_fundo)
        v = (y - H * 0.12) / (chao_fundo - H * 0.12)
        parede_estantes(f, m, x / 2.6, v, 0.2 + 0.4 * luz_janela, 6, s=lado + 3)
    # galeria alta (balcão) cruzando a parede do fundo
    gal = (y > H * 0.1) & (y < H * 0.12) & (x > jl) & (x < jr) & ~dentro_j
    f.tingir(gal, np.clip(0.4 + 0.3 * luz_janela, 0, 0.999), MADEIRA[2:], 0.5)
    balaustre = (y > H * 0.065) & (y < H * 0.1) & (x > jl) & (x < jr) & ((x % 5) < 1.2) & ~dentro_j & ~moldura
    f.tingir(balaustre, np.clip(0.35 + 0.3 * luz_janela, 0, 0.999), MADEIRA[2:], 0.5)
    corrimao = (np.abs(y - H * 0.065) < 0.8) & (x > jl) & (x < jr) & ~dentro_j
    f.tingir(corrimao, np.full((H, W), 0.6, F), MADEIRA[3:], 0.5)
    # névoa dourada de leve na parede do fundo (profundidade)
    f.velar(0.18 * np.clip(1 - np.abs(x - cx) / (W * 0.5), 0, 1), '#f0c890')
    f.salvar(saida / f'{nome}-fundo.png')

    # ------------------------------------------------ meio: paredes laterais, piso, tapete, objetos
    m_ = Tela(W, H)
    # piso: tábuas em perspectiva
    piso = y >= chao_fundo
    zz = (H * 0.9) / np.maximum(y - vy, 1)          # profundidade
    wx = (x - cx) * zz / 30                          # coordenada no chão (larguras de tábua)
    wz = zz * 3
    tab = np.floor(wx).astype(int)
    junta_l = (np.abs(wx - np.round(wx)) < 0.04 / np.maximum(zz / 6, 0.4))
    junta_t = (np.abs(((wz + hv(tab, 1, 2) * 3) % 4) - 2) > 1.93)
    sol = np.exp(-(((x - cx) / (W * (0.16 + 0.12 * (y - chao_fundo) / H))) ** 2 + ((y - H * 0.78) / (H * 0.2)) ** 2))
    veio = fbm(wx * 3, wz / 2, 3, 4)
    lpiso = 0.12 + 0.12 * hv(tab, 1, 5) + 0.15 * veio + 0.55 * sol - 0.15 * (junta_l | junta_t)
    lpiso = lpiso - 0.2 * np.clip(np.abs(x - cx) / (W * 0.5) - 0.3, 0, 1)
    m_.tingir(piso, np.clip(lpiso, 0, 0.999), PISO, 0.7)
    # tapete redondo (círculo no chão = elipse na tela), borda de ouro com losangos
    ty, trx = H * (0.76 if retrato else 0.78), W * (0.36 if retrato else 0.25)
    try_ = H * (0.11 if retrato else 0.13)
    d = np.hypot((x - cx) / trx, (y - ty) / try_)
    tap = piso & (d < 1)
    ang = np.arctan2((y - ty) / try_, (x - cx) / trx)
    borda = tap & (d > 0.82)
    losango = borda & (np.abs(((ang * 12 / np.pi) % 2) - 1) * 0.6 + np.abs(d - 0.91) * 8 < 0.55)
    miolo = tap & (d < 0.82)
    padrao = (np.abs(((ang * 6 / np.pi) % 2) - 1) < 0.16) & (d > 0.25) & (d < 0.72)
    lt = 0.2 + 0.5 * sol + 0.1 * fbm(x / 3, y / 2, 2, 7)
    m_.tingir(miolo, np.clip(lt - 0.08 * padrao, 0, 0.999), TAPETE, 0.6)
    m_.tingir(miolo & padrao, np.clip(lt * 0.8, 0, 0.999), OURO[:3], 0.6)
    m_.tingir(borda, np.clip(lt * 0.6, 0, 0.999), TAPETE[:4], 0.6)
    m_.tingir(losango, np.clip(lt, 0, 0.999), OURO[:4], 0.5)
    anel = tap & (np.abs(d - 0.82) < 0.025)
    m_.tingir(anel, np.clip(lt + 0.25, 0, 0.999), OURO, 0.4)
    # paredes laterais com estantes, em perspectiva (recuam até a parede do fundo)
    luzes = []
    for lado in (-1, 1):
        borda_x = 0 if lado < 0 else W
        far_x = jl if lado < 0 else jr
        u = np.clip((x - borda_x) / (far_x - borda_x), 0, 1)       # 0 perto, 1 no fundo
        topo = -H * 0.25 * (1 - u) + H * 0.04 * u
        base = H * 1.05 * (1 - u) + chao_fundo * u
        lo, hi = min(borda_x, far_x), max(borda_x, far_x)
        m = (x >= lo) & (x <= hi) & (y >= topo) & (y <= base)
        v = (y - topo) / np.maximum(base - topo, 1)
        prof = u / (1 - 0.72 * u) * 9 * (1 if lado < 0 else 1)     # livros mais estreitos ao fundo
        luz = 0.08 + 0.38 * u + 0.12 * fbm(x / 9, y / 9, 2, 3 + lado)
        parede_estantes(m_, m, prof * 3.2, v, luz, 7, s=lado + 7)
        # pilastra de pedra na quina com a parede do fundo e cornija no alto
        quina = (np.abs(x - far_x) < 3) & (y < chao_fundo + 1)
        m_.tingir(quina, np.clip(0.35 + 0.25 * (x - far_x) * -lado / 3, 0, 0.999), PEDRA[1:], 0.5)
        # candelabro de parede (luz quente) perto da frente
        for k, uu in enumerate((0.22, 0.6)):
            px_ = borda_x + (far_x - borda_x) * uu
            topo_k = -H * 0.25 * (1 - uu) + H * 0.04 * uu; base_k = H * 1.05 * (1 - uu) + chao_fundo * uu
            py_ = topo_k + (base_k - topo_k) * 0.36
            tam = (1 - uu) * 1.8 + 0.6
            haste = (np.abs(x - px_) < tam * 0.7) & (y > py_) & (y < py_ + tam * 6)
            m_.tingir(haste, np.full((H, W), 0.6, F), OURO[1:4], 0.4)
            vela = (np.abs(x - px_) < tam * 0.9) & (y > py_ - tam * 3) & (y <= py_)
            m_.tingir(vela, np.clip(0.5 + 0.4 * (x < px_), 0, 0.999), rampa(['#c8b490', '#efe3c4', '#fff8e6']), 0.4)
            chama = np.hypot((x - px_) / (tam * 0.8), (y - (py_ - tam * 4.2)) / (tam * 1.5)) < 1
            m_.tingir(chama, np.clip(1 - np.hypot(x - px_, y - (py_ - tam * 4.2)) / (tam * 2), 0, 0.999), rampa(['#d9542c', '#ffb347', '#fff1b8']), 0.3)
            luzes.append((px_, py_ - tam * 4.2, 6 + tam * 4))
    # pilhas de livros no chão, perto do tapete
    for fx, fy, n, s in ((0.24, 0.9, 5, 1), (0.78, 0.86, 4, 2), (0.3, 0.68, 3, 3), (0.71, 0.66, 3, 4)) if not retrato else ((0.14, 0.9, 5, 1), (0.86, 0.88, 4, 2)):
        bx, by = W * fx, H * fy
        esc = 1.1 + 1.2 * (fy - 0.6) / 0.4
        sombra = np.hypot((x - bx) / (11 * esc), (y - by - 1) / (3 * esc)) < 1
        m_.rgb[sombra] *= 0.6
        yy = by
        for i in range(n):
            lw = (9 + 4 * h(s, i)) * esc; lh = (2.2 + 1.2 * h(s, i, 2)) * esc
            ox = (h(s, i, 3) - 0.5) * 3 * esc
            liv = (np.abs(x - bx - ox) < lw / 2) & (y > yy - lh) & (y <= yy)
            r = LOMBADAS[int(h(s, i, 4) * len(LOMBADAS))]
            lv = 0.35 + 0.4 * ((yy - y) / lh) + 0.2 * (x < bx + ox)
            m_.tingir(liv, np.clip(lv, 0, 0.999), r, 0.5)
            pag = liv & (x > bx + ox + lw / 2 - 1.2 * esc)
            m_.tingir(pag, np.full((H, W), 0.7, F), rampa(['#b8a888', '#e8dcc0', '#fff6e0']), 0.3)
            yy -= lh
    # contorno escuro de 1 px em volta das pilhas e dos candelabros (lê melhor pequeno)
    m_.salvar(saida / f'{nome}-meio.png')

    # ------------------------------------------------ frente: cortinas e livros no canto
    fr = Tela(W, H)
    for lado in (-1, 1):
        bx = 0 if lado < 0 else W
        larg = W * (0.16 if retrato else 0.1)
        curva = larg * (1 - (y / (H * 0.5)) ** 1.6)
        m = (np.abs(x - bx) < curva) & (y < H * 0.5)
        dob = np.cos((x - bx) / larg * 9 + y / 30)
        fr.tingir(m, np.clip(0.18 + 0.22 * dob, 0, 0.999), TAPETE[:5], 0.6)
        franja = m & (np.abs(np.abs(x - bx) - curva) < 1.5)
        fr.tingir(franja, np.full((H, W), 0.6, F), OURO[1:5], 0.4)
    # sanefa no alto
    san = y < H * 0.035 + 2 * np.cos(x / 9)
    fr.tingir(san, np.clip(0.2 + 0.15 * np.cos(x / 4), 0, 0.999), TAPETE[:5], 0.6)
    fr.rgb *= 0.7
    fr.salvar(saida / f'{nome}-frente.png')

    # ------------------------------------------------ luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    # o próprio janelão brilha e solta feixes inclinados até o chão
    brilho += (np.exp(-(((x - cx) / (raio * 1.3)) ** 2 + ((y - (jtopo + jbase) / 2) / ((jbase - jtopo) * 0.7)) ** 2)) * 0.45)[..., None] * np.array(hexrgb('#fff0c0'), F)
    for i, (dx, larg, forca) in enumerate(((-0.4, 0.22, 0.4), (0.0, 0.3, 0.5), (0.45, 0.2, 0.35))):
        x_topo = cx + dx * raio
        t_ = np.clip((y - jtopo) / (H * 0.85 - jtopo), 0, 1)
        centro = x_topo + (cx + dx * raio * 2.6 - x_topo) * t_
        feixe = np.exp(-((x - centro) / (raio * larg * (1 + t_ * 1.6))) ** 2) * (y > jtopo) * (1 - t_) ** 0.8 * forca * (0.7 + 0.3 * fbm(y / 20, i, 2, 5))
        brilho += feixe[..., None] * np.array(hexrgb('#ffe2a0'), F)
    for bx, by, r in luzes:
        g = np.exp(-((x - bx) ** 2 + ((y - by) * 1.2) ** 2) / (r ** 2)) * 0.6
        brilho += g[..., None] * np.array(hexrgb('#ffb060'), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    so = sys.argv[2] if len(sys.argv) > 2 else 'ambos'
    if so in ('ambos', 'paisagem'):
        pintar(520, 330, saida, 'biblioteca-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'biblioteca-retrato')
    print('ok', saida)
