"""As cenas do gato na tela de espera (O Gato Aventureiro, 31/10/2026): monta public/pixel/mascote/gato-cenas.png.

Quadros de 96 x 56, 8 por linha, uma linha por trecho de cena, na ordem de LINHAS (a mesma de LINHAS_CENAS em
src/componentes/espera/cenas.ts; o teste fixtures/testar_espera_gato.mjs confere). Cada linha é desenhada por uma
função f(t, k) (t = quadro vazio de scripts/gato_cenas/base.py, k = 0..7) em scripts/gato_cenas/parte_a.py e
parte_b.py, com o gato fofo de scripts/gerar_gato_fofo.py.

Uso:  python3 scripts/gerar_gato_cenas.py [--previa PASTA]   (a prévia salva a folha 4x e um GIF por linha)
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gato_cenas import base as B  # noqa: E402
from gato_cenas import parte_a, parte_b  # noqa: E402

RAIZ = Path(__file__).resolve().parents[1]
LINHAS = [
    'idle-sentado', 'idle-deitado',
    'dormir-chega', 'dormir-gira', 'dormir-respira',
    'espreguicar-acorda', 'espreguicar-estica', 'espreguicar-boceja',
    'novelo-percebe', 'novelo-toca', 'novelo-salta', 'novelo-senta',
    'estudo-olha', 'estudo-vira', 'estudo-deita',
    'banho-lambe', 'banho-rosto', 'banho-orelha',
    'luz-ve', 'luz-agacha', 'luz-salta', 'luz-olha',
    'pergaminho-toca', 'pergaminho-abre', 'pergaminho-pula', 'pergaminho-senta',
    'livro-ve', 'livro-segura', 'livro-descansa',
    'borboleta-ve', 'borboleta-pata', 'borboleta-salta',
    'cochilo-orelha', 'cochilo-olho', 'cochilo-ajeita',
    'festa-percebe', 'festa-pula', 'festa-cauda',
    'andar-direita', 'andar-esquerda', 'andar-para',
    'segredo-cauda', 'segredo-coruja', 'segredo-livro', 'segredo-desliza',
]


def desenhos() -> dict:
    d = {}
    for parte in (parte_a, parte_b):
        for nome, fn in getattr(parte, 'LINHAS', {}).items():
            assert nome in LINHAS, f'linha desconhecida: {nome}'
            assert nome not in d, f'linha repetida: {nome}'
            d[nome] = fn
    return d


def quadro(fn, k) -> Image.Image:
    t = B.tela()
    fn(t, k)
    return Image.fromarray(t.render(), 'RGBA')


def main() -> None:
    import gerar_gato_fofo as G
    d = desenhos()
    faltam = [n for n in LINHAS if n not in d]
    if faltam:
        print('AVISO: linhas sem desenho (usam o gato sentado):', ', '.join(faltam))
    folha = Image.new('RGBA', (B.QW * B.NQ, B.QH * len(LINHAS)), (0, 0, 0, 0))
    quadros = {}
    for li, nome in enumerate(LINHAS):
        fn = d.get(nome, lambda t, k: B.repouso_sentado(t))
        quadros[nome] = [quadro(fn, k) for k in range(B.NQ)]
        for k, q in enumerate(quadros[nome]):
            folha.paste(q, (k * B.QW, li * B.QH))
    G.salvar(folha, RAIZ / 'public/pixel/mascote/gato-cenas.png')
    if '--previa' in sys.argv:
        destino = Path(sys.argv[sys.argv.index('--previa') + 1])
        (destino / 'gif').mkdir(parents=True, exist_ok=True)
        for nome_fundo, cor in (('escuro', (42, 29, 20, 255)), ('claro', (251, 250, 246, 255))):
            f = Image.new('RGBA', folha.size, cor)
            f.alpha_composite(folha)
            f.resize((folha.width * 3, folha.height * 3), Image.NEAREST).save(destino / f'gato-cenas-3x-{nome_fundo}.png')
        for li, nome in enumerate(LINHAS):
            fr = []
            for q in quadros[nome]:
                f = Image.new('RGBA', q.size, (251, 250, 246, 255))
                f.alpha_composite(q)
                fr.append(f.convert('RGB').resize((B.QW * 4, B.QH * 4), Image.NEAREST))
            fr[0].save(destino / 'gif' / f'{li:02d}-{nome}.gif', save_all=True, append_images=fr[1:], duration=130, loop=0)


if __name__ == '__main__':
    main()
