"""A espada fincada na fogueira do acampamento (01/11/2026, pedido do Tales: "uma espada dentro da fogueira, que
lembrasse um Dark Souls, um easter egg").

Pixel art feita por código, na mesma escala da chama animada (1 px da imagem = 1 px da arte de 480 x 200). Uma espada
original de lâmina estreita, levemente torcida (o brilho da aresta muda de lado em degraus, como uma espiral), fincada
de ponta no carvão: o terço de baixo da lâmina está em brasa (laranja e vermelho), a guarda é de ferro escuro, o cabo
tem tiras de couro e o pomo é um anel. Fica por cima da chama no site (CenaDiorama.tsx), com a chama dos dois lados.
Saída: public/pixel/inicio/espada.png (12 x 40, fundo transparente).
"""
from pathlib import Path

from PIL import Image

SAIDA = Path(__file__).resolve().parents[2] / "public" / "pixel" / "inicio" / "espada.png"
W, H = 12, 40
CX = 6  # coluna central da lâmina

CONTORNO = (24, 16, 14, 255)
FERRO = [(58, 52, 54, 255), (92, 84, 86, 255), (134, 126, 124, 255)]
ACO = [(96, 102, 112, 255), (150, 158, 168, 255), (206, 212, 220, 255), (240, 244, 248, 255)]
BRASA = [(120, 30, 18, 255), (196, 66, 22, 255), (246, 134, 40, 255), (255, 214, 120, 255)]
COURO = [(52, 30, 20, 255), (88, 54, 32, 255), (124, 82, 48, 255)]


def misturar(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)


def main() -> None:
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    p = im.load()

    def px(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            p[x, y] = c

    # Pomo em anel (y 0-3) com contorno.
    for x, y in [(5, 0), (6, 0), (4, 1), (7, 1), (4, 2), (7, 2), (5, 3), (6, 3)]:
        px(x, y, FERRO[2] if y < 2 else FERRO[1])
    for x, y in [(3, 1), (3, 2), (8, 1), (8, 2)]:
        px(x, y, CONTORNO)

    # Cabo com tiras de couro em diagonal (y 4-10).
    for y in range(4, 11):
        px(4, y, CONTORNO); px(7, y, CONTORNO)
        px(5, y, COURO[2] if y % 3 == 0 else COURO[1])
        px(6, y, COURO[1] if y % 3 == 1 else COURO[0])

    # Guarda de ferro (y 11-12), com as pontas um pouco caídas.
    for x in range(1, 11):
        px(x, 11, FERRO[2] if 3 <= x <= 8 else FERRO[1])
        px(x, 12, FERRO[0])
    for x, y in [(0, 11), (11, 11), (0, 12), (11, 12)]:
        px(x, y, CONTORNO)
    px(1, 13, FERRO[0]); px(10, 13, FERRO[0])

    # Lâmina (y 13-39): duas colunas cujo lado claro troca a cada 4 linhas (a torção em espiral), um brilho por
    # degrau e, da metade para baixo, o aço vira brasa até a ponta enterrada no carvão.
    topo = 13
    for y in range(topo, H):
        t = (y - topo) / (H - topo)
        degrau = (y - topo) // 4
        esq, dir_ = (ACO[2], ACO[0]) if degrau % 2 else (ACO[0], ACO[2])
        if (y - topo) % 4 == 0:
            esq, dir_ = (ACO[3], ACO[1]) if degrau % 2 else (ACO[1], ACO[3])
        calor = max(0.0, (t - 0.42) / 0.58)
        if calor:
            esq = misturar(esq, BRASA[min(3, int(calor * 3.4))], min(1.0, calor * 1.3))
            dir_ = misturar(dir_, BRASA[min(3, int(calor * 3.4 + 0.5))], min(1.0, calor * 1.3))
        ponta = y >= H - 3
        px(5, y, esq)
        if not ponta:
            px(6, y, dir_)
        px(4, y, CONTORNO)
        px(6 if ponta else 7, y, CONTORNO if ponta else CONTORNO)
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    im.save(SAIDA)
    print("ok", SAIDA, im.size)


if __name__ == "__main__":
    main()
