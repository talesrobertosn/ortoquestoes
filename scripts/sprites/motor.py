"""
Motor de sprites da Cripta do Residente.

Cada personagem é modelado como um conjunto de formas 3D (campos de distância
com sinal: esferas, elipsoides, cápsulas cônicas, caixas arredondadas, toros),
presas a um esqueleto simples. O motor:

  1. lança um raio ortográfico por pixel nativo do sprite (câmera de 3/4, um
     pouco de cima, como nos dioramas HD-2D);
  2. acha a superfície (sphere tracing), a normal, a oclusão ambiente e a
     sombra projetada da luz principal;
  3. converte a luz em degraus da rampa de cor do material (pixel art com
     paleta fechada, sombras frias e luzes quentes), com textura própria
     (rachadura, escama, chapa, osso) e brilho especular nos metais;
  4. desenha contorno externo e linhas internas onde uma parte passa na frente
     de outra (leitura de silhueta), e grava a folha de animação em PNG com os
     metadados em JSON.

Nada aqui é desenho médico: são criaturas de fantasia.
"""
from __future__ import annotations

import colorsys
import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image

F = np.float32

# ------------------------------------------------------------------ vetores


def v3(x, y, z):
    return np.array([x, y, z], dtype=F)


def normalizar(v):
    return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-9)


def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=F)


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=F)


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], dtype=F)


class Osso:
    """Junta do esqueleto: posição e rotação no mundo, com filhos relativos."""

    def __init__(self, pos=(0, 0, 0), rot=None):
        self.pos = np.asarray(pos, dtype=F)
        self.rot = np.eye(3, dtype=F) if rot is None else rot.astype(F)

    def filho(self, desloc=(0, 0, 0), rx=0.0, ry=0.0, rz=0.0) -> "Osso":
        r = self.rot @ rot_z(rz) @ rot_y(ry) @ rot_x(rx)
        return Osso(self.pos + self.rot @ np.asarray(desloc, dtype=F), r)

    def ponto(self, local) -> np.ndarray:
        return self.pos + self.rot @ np.asarray(local, dtype=F)


# ------------------------------------------------------------------ formas (em coordenadas locais)


def comp(p):
    return np.sqrt(np.sum(p * p, axis=-1))


def sd_esfera(p, r):
    return comp(p) - r


def sd_elipsoide(p, r):
    r = np.asarray(r, dtype=F)
    k0 = comp(p / r)
    k1 = comp(p / (r * r))
    return k0 * (k0 - 1.0) / (k1 + 1e-6)


def sd_caixa(p, b, r=0.0):
    q = np.abs(p) - (np.asarray(b, dtype=F) - r)
    return comp(np.maximum(q, 0)) + np.minimum(np.max(q, axis=-1), 0) - r


def sd_cone_redondo(p, a, b, ra, rb):
    """Cápsula cônica entre os pontos a e b, com raios ra e rb (iq)."""
    a = np.asarray(a, dtype=F)
    b = np.asarray(b, dtype=F)
    ba = b - a
    l2 = float(ba @ ba)
    rr = ra - rb
    a2 = l2 - rr * rr
    il2 = 1.0 / max(l2, 1e-6)
    pa = p - a
    y = pa @ ba
    z = y - l2
    xv = pa * l2 - np.outer(y, ba)
    x2 = np.sum(xv * xv, axis=-1)
    y2 = y * y * l2
    z2 = z * z * l2
    k = math.copysign(1.0, rr) * rr * rr * x2
    d1 = np.sqrt(x2 + z2) * il2 - rb
    d2 = np.sqrt(x2 + y2) * il2 - ra
    d3 = (np.sqrt(x2 * a2 * il2) + y * rr) * il2 - ra
    return np.where(np.sign(z) * a2 * z2 > k, d1, np.where(np.sign(y) * a2 * y2 < k, d2, d3))


def sd_toro(p, R, r):
    q = np.stack([np.sqrt(p[:, 0] ** 2 + p[:, 2] ** 2) - R, p[:, 1]], axis=-1)
    return comp(q) - r


def sd_arco(p, R, r, abertura):
    """Toro cortado (arco) no plano xz, centrado em +x, com meia-abertura em radianos."""
    ang = np.arctan2(p[:, 2], p[:, 0])
    dentro = np.abs(ang) < abertura
    toro = sd_toro(p, R, r)
    # pontas do arco
    e1 = v3(R * math.cos(abertura), 0, R * math.sin(abertura))
    e2 = v3(R * math.cos(abertura), 0, -R * math.sin(abertura))
    pontas = np.minimum(comp(p - e1), comp(p - e2)) - r
    return np.where(dentro, toro, pontas)


def suave_min(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


# ------------------------------------------------------------------ ruído (texturas em coordenadas locais)


def _hash3(i):
    i = i.astype(np.int64)
    h = (i[..., 0] * 73856093) ^ (i[..., 1] * 19349663) ^ (i[..., 2] * 83492791)
    h = (h ^ (h >> 13)) * 1274126177
    return ((h ^ (h >> 16)) & 0xFFFF).astype(F) / 65535.0


def ruido3(p):
    i = np.floor(p)
    f = p - i
    u = f * f * (3 - 2 * f)
    acc = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (u[:, 0] if dx else 1 - u[:, 0]) * (u[:, 1] if dy else 1 - u[:, 1]) * (u[:, 2] if dz else 1 - u[:, 2])
                acc = acc + w * _hash3(i + np.array([dx, dy, dz]))
    return acc


def fbm3(p, oitavas=3):
    s, a, t = 0.0, 0.5, 0.0
    for _ in range(oitavas):
        s = s + a * ruido3(p)
        t += a
        p = p * 2.03 + 17.1
        a *= 0.5
    return s / t


def voronoi3(p):
    """Distância à borda de célula (F2 - F1) e id da célula: placas, escamas, rachaduras."""
    i = np.floor(p)
    f = p - i
    d1 = np.full(len(p), 9.0, dtype=F)
    d2 = np.full(len(p), 9.0, dtype=F)
    cid = np.zeros(len(p), dtype=F)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                o = np.array([dx, dy, dz], dtype=F)
                c = i + o
                jit = np.stack([_hash3(c), _hash3(c + 31), _hash3(c + 67)], axis=-1)
                d = comp(o + jit - f)
                menor = d < d1
                d2 = np.where(menor, d1, np.minimum(d2, d))
                cid = np.where(menor, _hash3(c + 101), cid)
                d1 = np.where(menor, d, d1)
    return d2 - d1, cid


# ------------------------------------------------------------------ cores


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rampa(base: str, n=6, escuro=0.28, claro=1.25, giro=0.16, sat_sombra=1.2):
    """
    Rampa de cor de pixel art a partir de uma cor média: as sombras giram para
    o azul/violeta e saturam um pouco; as luzes giram para o amarelo e
    dessaturam. Devolve n cores do mais escuro ao mais claro.
    """
    r, g, b = [c / 255 for c in hex_rgb(base)]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    cores = []
    for k in range(n):
        t = k / (n - 1)  # 0 escuro .. 1 claro
        vv = v * (escuro + (claro - escuro) * t)
        # giro de matiz: sombra em direção a 0,7 (violeta), luz em direção a 0,13 (amarelo)
        alvo = 0.70 if t < 0.5 else 0.13
        peso = abs(t - 0.5) * 2 * giro
        dh = ((alvo - h + 0.5) % 1.0) - 0.5
        hh = (h + dh * peso) % 1.0
        ss = min(1, s * (sat_sombra if t < 0.5 else 1 - 0.35 * (t - 0.5)))
        rr, gg, bb = colorsys.hsv_to_rgb(hh, ss, min(1, vv))
        if vv > 1:
            mistura = min(0.5, vv - 1)
            rr, gg, bb = [c + (1 - c) * mistura for c in (rr, gg, bb)]
        cores.append((int(rr * 255), int(gg * 255), int(bb * 255)))
    return cores


@dataclass
class Material:
    cores: list  # rampa do escuro ao claro (tuplas RGB)
    brilho: float = 0.0  # especular (metal, esmalte, olho)
    cor_brilho: tuple = (255, 252, 235)
    emissivo: bool = False
    contorno: tuple | None = None  # cor do contorno; padrão: rampa[0] escurecida
    textura: Callable | None = None  # f(p_local, normal) -> deslocamento em degraus
    borda_luz: float = 1.0  # luz de recorte (rim)
    cores_textura: list | None = None  # rampa dos pixels que a textura marca (rachadura luminosa, runa)


# ------------------------------------------------------------------ cena


@dataclass
class Parte:
    mat: str
    forma: Callable  # f(p_local) -> distância
    osso: Osso
    suave: float = 0.0  # mistura suave com a parte anterior do mesmo grupo
    grupo: int = 0
    tex_escala: float = 1.0


@dataclass
class Cena:
    partes: list = field(default_factory=list)

    def add(self, mat, forma, osso, suave=0.0, grupo=0):
        self.partes.append(Parte(mat, forma, osso, suave, grupo))
        return self

    def avaliar(self, p):
        """Distância e índice da parte mais próxima para cada ponto (N, 3)."""
        d_tot = None
        idx = None
        grupos: dict[int, tuple] = {}
        ordem = []
        for k, pt in enumerate(self.partes):
            loc = (p - pt.osso.pos) @ pt.osso.rot  # mundo -> local
            d = pt.forma(loc).astype(F)
            if pt.grupo in grupos:
                gd, gi = grupos[pt.grupo]
                gi = np.where(d < gd, k, gi)
                gd = suave_min(gd, d, pt.suave) if pt.suave > 0 else np.minimum(gd, d)
                grupos[pt.grupo] = (gd, gi)
            else:
                grupos[pt.grupo] = (d, np.full(len(p), k))
                ordem.append(pt.grupo)
        for g in ordem:
            gd, gi = grupos[g]
            if d_tot is None:
                d_tot, idx = gd, gi
            else:
                idx = np.where(gd < d_tot, gi, idx)
                d_tot = np.minimum(d_tot, gd)
        return d_tot, idx


# ------------------------------------------------------------------ render


@dataclass
class Camera:
    largura: int
    altura: int
    origem: tuple  # (x, y) do ponto (0,0,0) do mundo no sprite, em pixels (y para baixo)
    inclinacao: float = 0.30  # olhar de cima (rad)
    giro: float = 0.0
    escala: float = 1.0  # pixels do sprite por unidade do mundo


LUZ = normalizar(v3(-0.55, 0.75, 0.55))
LUZ_PREENCHE = normalizar(v3(0.8, 0.1, 0.4))
LUZ_RECORTE = normalizar(v3(0.6, 0.5, -0.8))


def _base_camera(cam: Camera):
    rot = rot_y(cam.giro) @ rot_x(-cam.inclinacao)
    direita = rot @ v3(1, 0, 0)
    cima = rot @ v3(0, 1, 0)
    tras = rot @ v3(0, 0, 1)  # do personagem para a câmera
    return direita, cima, tras


def render(cena: Cena, mats: dict[str, Material], cam: Camera, passos=110, sombras=True):
    W, H = cam.largura, cam.altura
    direita, cima, tras = _base_camera(cam)
    ys, xs = np.mgrid[0:H, 0:W]
    u = ((xs + 0.5 - cam.origem[0]) / cam.escala).astype(F).ravel()
    v = ((cam.origem[1] - ys - 0.5) / cam.escala).astype(F).ravel()
    longe = float(max(W, H)) * 1.5 / cam.escala
    o = np.outer(u, direita) + np.outer(v, cima) + tras * longe
    d = -tras
    n = len(u)
    t = np.zeros(n, dtype=F)
    vivo = np.ones(n, dtype=bool)
    acerto = np.zeros(n, dtype=bool)
    idx_final = np.full(n, -1)
    lim = longe * 2.2
    ativos = np.arange(n)
    for _ in range(passos):
        if len(ativos) == 0:
            break
        p = o[ativos] + np.outer(t[ativos], d)
        dist, idx = cena.avaliar(p)
        bateu = dist < 0.02
        acerto[ativos[bateu]] = True
        idx_final[ativos[bateu]] = idx[bateu]
        t[ativos] += np.where(bateu, 0, np.maximum(dist * 0.85, 0.02))
        sai = t[ativos] > lim
        vivo[ativos[bateu | sai]] = False
        ativos = ativos[~(bateu | sai)]

    rgb = np.zeros((n, 3), dtype=F)
    alfa = np.zeros(n, dtype=bool)
    prof = np.full(n, -1e9, dtype=F)
    hit = np.where(acerto)[0]
    if len(hit) == 0:
        return np.zeros((H, W, 4), np.uint8), np.full((H, W), -1), np.full((H, W), -1e9)
    P = o[hit] + np.outer(t[hit], d)
    # normal por diferenças centrais
    e = 0.35
    nrm = np.zeros_like(P)
    for k in range(3):
        dv = np.zeros(3, dtype=F)
        dv[k] = e
        nrm[:, k] = cena.avaliar(P + dv)[0] - cena.avaliar(P - dv)[0]
    nrm = normalizar(nrm)
    # oclusão ambiente
    ao = np.ones(len(P), dtype=F)
    for i, hh in enumerate((1.0, 2.5, 4.5, 7.0)):
        dd = cena.avaliar(P + nrm * hh)[0]
        ao -= np.clip(hh - dd, 0, None) / hh * (0.5 ** i) * 0.55
    ao = np.clip(ao, 0, 1)
    # sombra projetada
    sombra = np.ones(len(P), dtype=F)
    if sombras:
        ts = np.full(len(P), 1.2, dtype=F)
        for _ in range(40):
            q = P + nrm * 0.4 + np.outer(ts, LUZ)
            dd = cena.avaliar(q)[0]
            sombra = np.minimum(sombra, np.clip(6 * dd / ts, 0, 1))
            ts += np.clip(dd, 0.4, 6)
        sombra = np.clip(sombra, 0, 1)
    V = tras
    ndl = np.clip(nrm @ LUZ, 0, 1)
    ndf = np.clip(nrm @ LUZ_PREENCHE, 0, 1)
    ndv = np.clip(nrm @ V, 0, 1)
    rim = np.clip(nrm @ LUZ_RECORTE, 0, 1) * (1 - ndv) ** 2
    luz = 0.03 + 0.20 * ao + 0.92 * ndl * (0.18 + 0.82 * sombra) + 0.08 * ndf
    meio = (LUZ + V)
    meio = meio / np.linalg.norm(meio)
    especular = np.clip(nrm @ meio, 0, 1)

    idx_h = idx_final[hit]
    BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=F) + 0.5) / 16 - 0.5
    px_x = (hit % W)
    px_y = (hit // W)
    pontilhado = BAYER[px_y % 4, px_x % 4]
    nomes = [cena.partes[k].mat for k in range(len(cena.partes))]
    for k, pt in enumerate(cena.partes):
        sel = idx_h == k
        if not sel.any():
            continue
        m = mats[pt.mat]
        mascara = None
        cores = np.array(m.cores, dtype=F)
        nc = len(cores)
        if m.emissivo:
            nivel = np.full(sel.sum(), nc - 1.0) - (1 - ndv[sel]) * 1.6
        else:
            nivel = luz[sel] * (nc - 0.6) - 0.5
            nivel = nivel + rim[sel] * 2.2 * m.borda_luz
            if m.textura is not None:
                loc = (P[sel] - pt.osso.pos) @ pt.osso.rot
                r = m.textura(loc, nrm[sel])
                if isinstance(r, tuple):
                    r, mascara = r
                nivel = nivel + r
        nivel = nivel + pontilhado[sel] * 0.4
        ki = np.clip(np.round(nivel), 0, nc - 1).astype(int)
        cor = cores[ki]
        if m.textura is not None and mascara is not None and m.cores_textura:
            # pixels marcados pela textura (rachadura luminosa, runa) usam a rampa própria, sem luz
            ct = np.array(m.cores_textura, dtype=F)
            kt = np.clip(np.round((len(ct) - 1) * (0.55 + 0.45 * ndv[sel]) + pontilhado[sel] * 0.5), 0, len(ct) - 1).astype(int)
            cor = np.where(mascara[:, None] > 0, ct[kt], cor)
        if m.brilho > 0:
            s = especular[sel] ** (12 + 60 * m.brilho) * sombra[sel]
            forte = s > 0.55
            cor = np.where(forte[:, None], np.array(m.cor_brilho, dtype=F), cor)
        rgb[hit[sel]] = cor
    alfa[hit] = True
    prof[hit] = -t[hit]
    img = np.zeros((H, W, 4), dtype=np.uint8)
    img[..., :3] = rgb.reshape(H, W, 3).clip(0, 255).astype(np.uint8)
    img[..., 3] = alfa.reshape(H, W) * 255
    rot = idx_final.reshape(H, W)
    rot[~alfa.reshape(H, W)] = -1
    return img, rot, prof.reshape(H, W)


def contornar(img, rotulo, prof, cena: Cena, mats: dict[str, Material], limiar=3.0, externo=True):
    """Contorno externo (fora da silhueta) e linhas internas onde uma parte passa na frente de outra."""
    H, W = rotulo.shape
    saida = img.copy()
    opaco = rotulo >= 0

    def cor_contorno(k):
        m = mats[cena.partes[k].mat]
        if m.contorno is not None:
            return m.contorno
        c = m.cores[0]
        return tuple(int(x * 0.55) for x in c)

    # linhas internas: o pixel de trás, vizinho de algo bem mais perto da câmera, escurece
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        viz_rot = np.full_like(rotulo, -1)
        viz_prof = np.full_like(prof, -1e9)
        ys = slice(max(dy, 0), H + min(dy, 0))
        yd = slice(max(-dy, 0), H + min(-dy, 0))
        xs = slice(max(dx, 0), W + min(dx, 0))
        xd = slice(max(-dx, 0), W + min(-dx, 0))
        viz_rot[yd, xd] = rotulo[ys, xs]
        viz_prof[yd, xd] = prof[ys, xs]
        linha = opaco & (viz_rot >= 0) & (viz_prof - prof > limiar)
        for y, x in zip(*np.where(linha)):
            k = rotulo[y, x]
            m = mats[cena.partes[k].mat]
            if m.emissivo:
                continue
            saida[y, x, :3] = m.cores[0] if m.contorno is None else m.contorno
    if externo:
        borda = np.zeros_like(opaco)
        fonte = np.full(rotulo.shape, -1)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ys = slice(max(dy, 0), H + min(dy, 0))
            yd = slice(max(-dy, 0), H + min(-dy, 0))
            xs = slice(max(dx, 0), W + min(dx, 0))
            xd = slice(max(-dx, 0), W + min(-dx, 0))
            viz = np.full_like(rotulo, -1)
            viz[yd, xd] = rotulo[ys, xs]
            novo = (~opaco) & (viz >= 0) & (fonte < 0)
            fonte[novo] = viz[novo]
            borda |= novo
        for y, x in zip(*np.where(borda)):
            k = fonte[y, x]
            m = mats[cena.partes[k].mat]
            c = (m.cores[1] if m.emissivo else cor_contorno(k))
            saida[y, x, :3] = c
            saida[y, x, 3] = 255
    return saida


def limpar_orfaos(img):
    """Pixels isolados (diferentes de todos os vizinhos) viram a cor do vizinho mais comum: menos ruído."""
    H, W = img.shape[:2]
    a = img[..., 3] > 0
    out = img.copy()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not a[y, x]:
                continue
            c = tuple(img[y, x, :3])
            viz = [tuple(img[y + dy, x + dx, :3]) for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)) if a[y + dy, x + dx]]
            if len(viz) == 4 and all(v != c for v in viz):
                mais = max(set(viz), key=viz.count)
                if viz.count(mais) >= 3:
                    out[y, x, :3] = mais
    return out


def quadro(cena: Cena, mats, cam: Camera, contorno=True):
    img, rot, prof = render(cena, mats, cam)
    img = limpar_orfaos(img)
    if contorno:
        img = contornar(img, rot, prof, cena, mats)
    return img


# ------------------------------------------------------------------ folha de animação


def gravar_folha(nome: str, animacoes: dict[str, list[np.ndarray]], tempos: dict[str, int], destino: Path, ancora, extra=None):
    """Uma linha por animação, um quadro por coluna. Metadados ao lado, em JSON."""
    H, W = next(iter(animacoes.values()))[0].shape[:2]
    colunas = max(len(q) for q in animacoes.values())
    folha = np.zeros((H * len(animacoes), W * colunas, 4), dtype=np.uint8)
    meta = {'largura': W, 'altura': H, 'colunas': colunas, 'ancora': list(ancora), 'animacoes': {}}
    # caixa do corpo (união de todos os quadros parados)
    for linha, (anim, quadros) in enumerate(animacoes.items()):
        for c, q in enumerate(quadros):
            folha[linha * H:(linha + 1) * H, c * W:(c + 1) * W] = q
        meta['animacoes'][anim] = {'linha': linha, 'quadros': len(quadros), 'ms': tempos.get(anim, 120)}
    parado = animacoes[next(iter(animacoes))][0]
    ys, xs = np.where(parado[..., 3] > 0)
    meta['caixa'] = [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]
    if extra:
        meta.update(extra)
    destino.mkdir(parents=True, exist_ok=True)
    Image.fromarray(folha, 'RGBA').save(destino / f'{nome}.png', optimize=True)
    (destino / f'{nome}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    return folha, meta
