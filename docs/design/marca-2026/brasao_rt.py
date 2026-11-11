"""O brasão do aventureiro, versão 2 (11/11/2026): o ladrilho da marca como placa de pedra verde, com luz calculada.

Arte original feita por código. Diferente da versão 1 (cores pintadas à mão), aqui cada pixel recebe a luz de verdade:
- tudo tem um mapa de altura (as pedras da parede com o rejunte fundo, a placa com bisel, as linhas entalhadas, o ouro
  em relevo e as letras do nome na faixa de pedra); a normal de cada pixel sai do gradiente da altura;
- duas tochas são luzes pontuais em 3D (difusa de Lambert com queda pelo quadrado da distância e brilho especular de
  Blinn-Phong, mais forte no ouro e no metal); a placa projeta sombra suave na parede, traçada em direção a cada tocha;
- o ouro é emissivo (acende a pedra em volta), há oclusão ambiente nos cantos, um céu frio de preenchimento, bloom,
  vinheta e grão. A imagem é calculada em pixel grande (3x) e as cores são arredondadas em degraus, para continuar
  pixel art.

Saída em marketing/instagram/marca/: brasao-perfil.png (1080 x 1080, para a foto do perfil, com tudo dentro do
círculo) e brasao-post.png (1080 x 1350, com o nome Orto Questões entalhado em ouro embaixo).
Uso: python3 docs/design/marca-2026/brasao_rt.py
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[3]
SAIDA = RAIZ / "marketing" / "instagram" / "marca"
FONTE = RAIZ / "marketing" / "instagram" / "fontes" / "pixelify-sans-latin-700-normal.woff2"
K = 3


def hexa(c):
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def caixa(a, r):
    if r < 1:
        return a
    out = a.astype(np.float32)
    for _ in range(3):
        for eixo in (0, 1):
            pad = [(0, 0)] * a.ndim
            pad[eixo] = (r + 1, r)
            p = np.pad(out, pad, mode="edge")
            s = np.cumsum(p, axis=eixo, dtype=np.float64)
            n = out.shape[eixo]
            out = ((np.take(s, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo) - np.take(s, np.arange(0, n), axis=eixo)) / (2 * r + 1)).astype(np.float32)
    return out


def rr_dist(X, Y, x0, y0, w, h, r):
    """Distância (negativa por dentro) a um retângulo arredondado."""
    cx, cy = x0 + w / 2, y0 + h / 2
    qx = np.abs(X - cx) - (w / 2 - r)
    qy = np.abs(Y - cy) - (h / 2 - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def cena(W, H, pcx, pcy, ps, faixa_y, com_nome, nome_arquivo, seed=7, dt=0.95):
    g = np.random.default_rng(seed)
    Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
    alt = np.zeros((H, W), np.float32)
    albedo = np.zeros((H, W, 3), np.float32)
    brilho_esp = np.zeros((H, W), np.float32)  # quanto o material reflete (especular)
    emiss = np.zeros((H, W, 3), np.float32)

    # ── parede de pedra: blocos com altura própria, rejunte fundo e textura
    pedra_alt = np.zeros((H, W), np.float32)
    pedra_cor = np.zeros((H, W, 3), np.float32)
    fila_h = 16
    for f in range(H // fila_h + 2):
        y0 = f * fila_h - 4
        x = -int((f % 2) * 14) - 4
        j = 0
        while x < W:
            w = 24 + int(g.random() * 14)
            dist = rr_dist(X, Y, x + 1, y0 + 1, w - 2, fila_h - 2, 3)
            dentro = dist < 0
            bomb = np.clip(-dist / 3, 0, 1) ** 0.6
            pedra_alt = np.where(dentro, 2.2 * bomb + 0.4 * g.random(), pedra_alt)
            tom = hexa("#3a4642") * (0.78 + 0.32 * g.random()) + hexa("#2c3a36") * 0.08 * g.random()
            pedra_cor = np.where(dentro[:, :, None], tom, pedra_cor)
            x += w
            j += 1
    rugos = caixa(g.random((H, W)).astype(np.float32), 1)
    pedra_alt += (rugos - 0.5) * 0.9
    pedra_cor *= (0.9 + 0.2 * rugos)[:, :, None]
    musgo = (caixa(g.random((H, W)).astype(np.float32), 3) > 0.56) & (pedra_alt > 0.5) & (Y > H * 0.55)
    pedra_cor = np.where(musgo[:, :, None], pedra_cor * 0.6 + hexa("#4a6a3a") * 0.4, pedra_cor)
    rejunte = pedra_alt <= 0.05
    pedra_cor = np.where(rejunte[:, :, None], hexa("#151c1a"), pedra_cor)
    alt += pedra_alt
    albedo += pedra_cor
    brilho_esp += 0.08

    # ── a placa (o ladrilho): bisel, veio, linhas entalhadas e o ouro em relevo
    x0, y0 = pcx - ps / 2, pcy - ps / 2
    r = ps * 0.24
    d = rr_dist(X, Y, x0, y0, ps, ps, r)
    placa = d < 0
    bisel = np.clip(-d / (ps * 0.06), 0, 1)
    placa_alt = 10 + 5 * (bisel ** 0.55)
    veio = np.sin(X * 0.32 + Y * 0.85 + np.sin(Y * 0.15) * 3 + caixa(g.random((H, W)).astype(np.float32), 2) * 6)
    cor_placa = hexa("#2a9682") * (0.92 + 0.1 * veio[:, :, None]) + hexa("#0e4a42") * 0.08 * (veio[:, :, None] < -0.8)
    pintas = g.random((H, W)) > 0.985
    cor_placa = np.where(pintas[:, :, None], cor_placa * 1.25, cor_placa)
    f = ps / 100
    ouro_m = np.zeros((H, W), bool)
    sulco = np.zeros((H, W), np.float32)
    for (cy, comp, certa) in ((30, 34, False), (50, 40, True), (70, 26, False)):
        cxc, cyc = x0 + 30 * f, y0 + cy * f
        rc = (9.5 if certa else 6.5) * f
        bx, bw, bh = x0 + 43 * f, comp * f, (10.5 if certa else 9) * f
        bola = np.hypot(X - cxc, Y - cyc) - rc
        barra = rr_dist(X, Y, bx, cyc - bh / 2, bw, bh, bh / 2)
        forma = np.minimum(bola, barra)
        if certa:
            ouro_m |= forma < 0
            # o ouro é uma peça em relevo, arredondada em cima
            relevo = np.clip(-forma / (2.2 * f), 0, 1) ** 0.5
            placa_alt = np.where(forma < 0, 16 + 3.5 * relevo, placa_alt)
            # o visto gravado no ouro
            vx = X - cxc
            vy = Y - cyc
            perna1 = np.abs(vy - vx - 2.6 * f) < 1.2 * f
            perna1 &= (vx > -4.4 * f) & (vx < -0.4 * f)
            perna2 = np.abs(vy + vx * 1.2 - 1.3 * f) < 1.25 * f
            perna2 &= (vx >= -1.0 * f) & (vx < 4.6 * f)
            visto = (perna1 | perna2) & (bola < 0)
            placa_alt = np.where(visto, placa_alt - 2.2, placa_alt)
            sulco = np.where(visto, 1.0, sulco)
        else:
            fundo = np.clip(-forma / (1.4 * f), 0, 1)
            placa_alt = np.where(forma < 0, placa_alt - 3.5 * fundo, placa_alt)
            sulco = np.where(forma < 0, np.maximum(sulco, 0.7 * fundo), sulco)
    alt = np.where(placa, placa_alt, alt)
    albedo = np.where(placa[:, :, None], cor_placa, albedo)
    entalhe_cor = hexa("#cdbf9a")  # pedra clara no fundo dos entalhes
    albedo = np.where((placa & (sulco > 0.2) & ~ouro_m)[:, :, None], entalhe_cor * (0.75 + 0.25 * sulco[:, :, None]), albedo)
    ouro_cor = hexa("#e0a23a")
    albedo = np.where(ouro_m[:, :, None], ouro_cor, albedo)
    albedo = np.where((ouro_m & (sulco > 0.5))[:, :, None], hexa("#8a5a14"), albedo)
    brilho_esp = np.where(placa, 0.35, brilho_esp)
    brilho_esp = np.where(ouro_m, 0.9, brilho_esp)
    emiss += ouro_m[:, :, None] * hexa("#ffb84a") * 0.16

    # ── a faixa de pedra com o nome em ouro
    if com_nome:
        fx0, fx1, fy0, fy1 = W * 0.09, W * 0.91, faixa_y, faixa_y + 52
        df = rr_dist(X, Y, fx0, fy0, fx1 - fx0, fy1 - fy0, 6)
        faixa = df < 0
        alt = np.where(faixa, 8 + 3 * np.clip(-df / 4, 0, 1) ** 0.6, alt)
        albedo = np.where(faixa[:, :, None], hexa("#2f3a37") * (0.9 + 0.15 * rugos[:, :, None]), albedo)
        brilho_esp = np.where(faixa, 0.12, brilho_esp)
        img = Image.new("L", (W, H), 0)
        dr = ImageDraw.Draw(img)
        fnt = ImageFont.truetype(str(FONTE), 33)
        texto = "ORTO QUESTÕES"
        bb = dr.textbbox((0, 0), texto, font=fnt)
        tx = (W - (bb[2] - bb[0])) / 2 - bb[0]
        ty = fy0 + (fy1 - fy0 - (bb[3] - bb[1])) / 2 - bb[1]
        dr.text((tx, ty), texto, fill=255, font=fnt)
        letras = (np.asarray(img) > 110) & faixa
        alt = np.where(letras, alt + 3, alt)
        albedo = np.where(letras[:, :, None], hexa("#e8ae44"), albedo)
        brilho_esp = np.where(letras, 1.5, brilho_esp)
        emiss += letras[:, :, None] * hexa("#ffc060") * 0.3

    # ── tochas (suporte de ferro e chama emissiva) e chão
    tochas = [(pcx - ps * dt, pcy - ps * 0.05), (pcx + ps * dt, pcy - ps * 0.05)]
    for (tx, ty) in tochas:
        cabo = (np.abs(X - tx) < 1.6) & (Y > ty) & (Y < ty + 26)
        alt = np.where(cabo, 9, alt)
        albedo = np.where(cabo[:, :, None], hexa("#6a4428"), albedo)
        anel = (np.abs(X - tx) < 5) & (np.abs(Y - (ty + 2)) < 2.2)
        alt = np.where(anel, 10, alt)
        albedo = np.where(anel[:, :, None], hexa("#55595c"), albedo)
        brilho_esp = np.where(anel, 1.0, brilho_esp)
        for yy in range(-24, 1):
            larg = 6.2 * (1 - (-yy) / 25) ** 0.6 + 0.8 * math.sin(yy * 0.6 + tx)
            m = (np.abs(X - tx - 1.2 * math.sin(yy * 0.4 + tx)) <= larg) & (np.abs(Y - (ty - 2 + yy)) < 0.5)
            calor = 1 + yy / 25
            cor = "#fff4c8" if calor > 0.82 else "#ffd060" if calor > 0.55 else "#ff9a2a" if calor > 0.3 else "#e0501a"
            emiss = np.where(m[:, :, None], hexa(cor) * 1.6, emiss)
    chao = Y > H - 22
    alt = np.where(chao, 0, alt)
    albedo = np.where(chao[:, :, None], hexa("#1a2220"), albedo)

    # ── luz: normais, tochas em 3D, sombra suave traçada, preenchimento frio, emissivos
    gy, gx = np.gradient(caixa(alt, 0))
    nx, ny, nz = -gx, -gy, np.ones_like(alt) * 1.4
    norma = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / norma, ny / norma, nz / norma
    luz = np.zeros((H, W, 3), np.float32) + hexa("#5a6a7a") * 0.42 * np.clip(nz - ny * 0.3, 0, 1)[:, :, None]
    oc = np.clip(1 - (caixa(alt, 4) - alt) * 0.12, 0.45, 1)  # oclusão: o que está mais baixo que a vizinhança escurece
    for (tx, ty) in tochas:
        lz = 30.0
        lx, ly = tx - X, (ty - 10) - Y
        dist = np.sqrt(lx * lx + ly * ly + (lz - alt) ** 2)
        Lx, Ly, Lz = lx / dist, ly / dist, (lz - alt) / dist
        lamb = np.clip(nx * Lx + ny * Ly + nz * Lz, 0, 1)
        hx, hy, hz = Lx, Ly, Lz + 1
        hn = np.sqrt(hx * hx + hy * hy + hz * hz)
        esp = np.clip((nx * hx + ny * hy + nz * hz) / hn, 0, 1) ** 28
        # sombra: marcha em direção à tocha; se algo mais alto cruzar o raio, escurece (suave)
        sombra = np.ones((H, W), np.float32)
        for s in np.linspace(0.04, 0.6, 14):
            px = np.clip((X + lx * s).astype(int), 0, W - 1)
            py = np.clip((Y + ly * s).astype(int), 0, H - 1)
            altura_raio = alt + (lz - alt) * s
            sombra *= np.where(alt[py, px] > altura_raio + 0.5, 0.78, 1.0)
        sombra = caixa(sombra, 1)
        queda = 1 / (1 + (dist / 150) ** 2)
        cor = hexa("#ffb066")
        luz += (lamb * queda * sombra * 2.9)[:, :, None] * cor
        luz += (esp * queda * sombra * brilho_esp * 3.0)[:, :, None] * hexa("#ffe0a8")
    # o ouro acende a placa em volta
    halo = caixa(ouro_m.astype(np.float32), 9)
    luz += halo[:, :, None] * hexa("#ffc060") * 0.75
    # luz de frente, fraca e quente (a fogueira de quem olha): tira a placa do escuro
    frente = np.exp(-(((X - pcx) / (W * 0.45)) ** 2 + ((Y - pcy) / (H * 0.4)) ** 2))
    luz += (frente * np.clip(nz, 0, 1) * 0.55)[:, :, None] * hexa("#ffd8a0")
    img = albedo * luz * oc[:, :, None] + emiss
    # degraus de cor (pixel art) e ampliação 3x
    img = np.round(np.clip(img, 0, 2) * 18) / 18
    big = img.repeat(K, 0).repeat(K, 1)
    claro = np.clip(big - 0.75, 0, None)
    big += caixa(claro, 6) * 0.9 + caixa(claro, 22) * 0.7
    bh, bw = big.shape[:2]
    yy, xx = np.mgrid[0:bh, 0:bw].astype(np.float32)
    v = ((xx / bw - 0.5) ** 2 * 1.5 + (yy / bh - 0.45) ** 2 * 1.2)
    big *= (1 - np.clip(v - 0.05, 0, 1) * 1.1)[:, :, None]
    big += (g.random((bh, bw))[:, :, None] - 0.5) * 0.018
    # brasas subindo das tochas
    for (tx, ty) in tochas:
        for _ in range(16):
            bx, by = int((tx + g.normal(0, 4)) * K), int((ty - 28 - g.random() * 50) * K)
            if 0 <= by < bh - K and 0 <= bx < bw - K:
                big[by:by + K, bx:bx + K] += hexa("#ffb050") * (0.5 + g.random() * 0.7)
    SAIDA.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(big * 255, 0, 255).astype(np.uint8)).save(SAIDA / nome_arquivo, optimize=True)


if __name__ == "__main__":
    cena(360, 360, 180, 180, 172, 0, False, "brasao-perfil.png", dt=0.82)
    cena(360, 450, 180, 176, 156, 300, True, "brasao-post.png", seed=11)
    print("ok")
