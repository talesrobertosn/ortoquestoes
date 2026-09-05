#!/usr/bin/env python3
"""
Gera um PDF sintético com a mesma estrutura dos PDFs de prova: questões
numeradas ao longo do documento e gabarito em lista nas últimas páginas.

Serve só para exercitar o pipeline de importação de ponta a ponta. O conteúdo
é fictício e nunca deve entrar no acervo.

    python3 fixtures/gerar_pdf_teste.py /caminho/saida.pdf
"""

import sys
from pathlib import Path

import pymupdf

QUESTOES = [
    (
        "Paciente de 54 anos, do sexo feminino, refere parestesia noturna nos três "
        "primeiros dedos da mão direita, com melhora ao sacudir a mão. Ao exame, "
        "sinal de Phalen positivo. O diagnóstico mais provável é:",
        ["síndrome do túnel do carpo", "compressão do nervo ulnar no canal de Guyon",
         "radiculopatia C8", "síndrome do desfiladeiro torácico"],
    ),
    (
        "Em relação à fratura do escafoide, assinale a alternativa correta quanto ao "
        "risco de pseudartrose:",
        ["fraturas do polo proximal têm maior risco",
         "fraturas do tubérculo têm maior risco",
         "o risco independe da localização",
         "fraturas da cintura consolidam em 100% dos casos"],
    ),
    (
        "A radiografia abaixo demonstra desvio dorsal do fragmento distal do rádio "
        "após queda com a mão espalmada. A denominação clássica dessa fratura é:",
        ["fratura de Colles", "fratura de Smith", "fratura de Barton volar",
         "fratura de Galeazzi"],
    ),
    (
        "Sobre a doença de Dupuytren, é correto afirmar que:",
        ["acomete preferencialmente o quinto e o quarto dedos",
         "acomete preferencialmente o polegar",
         "é mais comum em mulheres jovens",
         "não apresenta relação com diabetes melito"],
    ),
    (
        "Na classificação de Salter-Harris, o tipo II corresponde a:",
        ["fratura fisária com fragmento metafisário",
         "descolamento epifisário puro",
         "fratura fisária com fragmento epifisário",
         "esmagamento da fise"],
    ),
    (
        "O teste de Froment avalia a função de qual músculo?",
        ["adutor do polegar", "abdutor curto do polegar",
         "flexor superficial dos dedos", "extensor ulnar do carpo"],
    ),
    (
        "Em relação ao dedo em gatilho, a estrutura anatômica envolvida é:",
        ["polia A1", "polia A2", "retináculo dos extensores", "ligamento de Cleland"],
    ),
    (
        "A tenossinovite estenosante de De Quervain envolve os tendões:",
        ["abdutor longo do polegar e extensor curto do polegar",
         "extensor longo do polegar e extensor dos dedos",
         "flexor radial do carpo e palmar longo",
         "extensor ulnar do carpo e extensor do dedo mínimo"],
    ),
    (
        "Assinale a alternativa que corresponde ao padrão de instabilidade DISI:",
        ["extensão do semilunar", "flexão do semilunar",
         "translação ulnar do carpo", "dissociação lunopiramidal isolada"],
    ),
    (
        "Sobre o reimplante de dedos, considera-se contraindicação relativa:",
        ["lesão por avulsão com grande extensão",
         "amputação de polegar em adulto",
         "amputação múltipla de dedos",
         "amputação em criança"],
    ),
    (
        "Qual das opções corresponde à via de acesso volar de Henry no antebraço?",
        ["entre o braquiorradial e o flexor radial do carpo",
         "entre o extensor ulnar do carpo e o ancôneo",
         "entre o flexor ulnar do carpo e o flexor superficial",
         "entre o braquiorradial e o extensor radial longo do carpo"],
    ),
    (
        "Questão com cinco alternativas para exercitar o pipeline. O nervo interósseo "
        "posterior é ramo de qual nervo?",
        ["radial", "mediano", "ulnar", "musculocutâneo", "axilar"],
    ),
]

GABARITO = ["A", "A", "A", "A", "A", "A", "A", "A", "A", "A", "A", "A"]
ANULADAS = {7}


def principal() -> int:
    destino = Path(sys.argv[1] if len(sys.argv) > 1 else "fixtures/teste-mao.pdf")
    documento = pymupdf.open()
    largura, altura = 595, 842
    margem = 56
    fonte = "helv"

    pagina = documento.new_page(width=largura, height=altura)
    pagina.insert_text((margem, 60), "TEOT 2019 — PROVA TEÓRICA (arquivo de teste)", fontname="hebo", fontsize=12)
    y = 100

    for numero, (enunciado, alternativas) in enumerate(QUESTOES, start=1):
        precisa = 40 + 14 * (len(enunciado) // 78 + 1) + 16 * len(alternativas)
        espaco_figura = 150 if numero == 3 else 0
        if y + precisa + espaco_figura > altura - margem:
            pagina = documento.new_page(width=largura, height=altura)
            y = 70

        caixa = pymupdf.Rect(margem, y, largura - margem, y + 200)
        texto = f"{numero}. {enunciado}"
        usado = pagina.insert_textbox(caixa, texto, fontname=fonte, fontsize=10.5, align=0)
        altura_texto = 200 - usado
        y += altura_texto + 8

        if numero == 3:
            # Figura vetorial (como muitas provas trazem), sem imagem embutida.
            retangulo = pymupdf.Rect(margem + 40, y + 10, margem + 220, y + 130)
            pagina.draw_rect(retangulo, color=(0.1, 0.1, 0.1), width=1)
            pagina.draw_line(
                pymupdf.Point(retangulo.x0 + 20, retangulo.y1 - 30),
                pymupdf.Point(retangulo.x1 - 20, retangulo.y0 + 30),
                color=(0.2, 0.2, 0.2),
                width=2,
            )
            pagina.insert_text(
                (retangulo.x0 + 6, retangulo.y0 + 16), "RX punho AP", fontname=fonte, fontsize=8
            )
            y = retangulo.y1 + 12

        for letra, opcao in zip("ABCDE", alternativas):
            caixa = pymupdf.Rect(margem + 14, y, largura - margem, y + 60)
            usado = pagina.insert_textbox(
                caixa, f"{letra}) {opcao}", fontname=fonte, fontsize=10.5
            )
            y += (60 - usado) + 2
        y += 14

    # Páginas de gabarito, em duas colunas, com uma questão anulada.
    pagina = documento.new_page(width=largura, height=altura)
    pagina.insert_text((margem, 70), "GABARITO OFICIAL", fontname="hebo", fontsize=14)
    y = 110
    for numero, letra in enumerate(GABARITO, start=1):
        valor = "ANULADA" if numero in ANULADAS else letra
        coluna = margem if numero <= len(GABARITO) / 2 else largura / 2
        linha = y + ((numero - 1) % (len(GABARITO) // 2)) * 22
        pagina.insert_text((coluna, linha), f"{numero} - {valor}", fontname=fonte, fontsize=11)

    destino.parent.mkdir(parents=True, exist_ok=True)
    documento.save(destino)
    print(f"PDF de teste gerado em {destino} ({len(documento)} páginas, {len(QUESTOES)} questões)")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
