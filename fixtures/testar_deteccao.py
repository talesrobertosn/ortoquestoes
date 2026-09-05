#!/usr/bin/env python3
"""
Casos que o detector de figura ausente precisa acertar.

Todos vieram de enunciados reais dos PDFs importados. Cada linha aqui é um
erro que o pipeline já cometeu: ou pediu uma imagem que a questão nunca teve,
ou deixou passar uma questão que pergunta sobre algo que não está na tela.

    python3 fixtures/testar_deteccao.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from deteccao import cita_figura  # noqa: E402

CASOS: list[tuple[str, bool]] = [
    # Pergunta sobre algo mostrado — precisa de figura.
    ("Qual o nome da linha traçada na figura?", True),
    ("A estrutura apontada na figura abaixo é", True),
    ("A estrutura assinalada é o nervo", True),
    ("O dermátomo assinalado corresponde a raiz de", True),
    ("A imagem a seguir é mais sugestiva de:", True),
    ("No tratamento do pé cavo varo, a osteotomia representada na imagem a seguir é a de", True),
    ("Analise a radiografia abaixo e assinale o diagnóstico", True),
    # Cita exame ou usa 'abaixo' para as alternativas — não precisa de figura.
    ("Qual dos achados radiográficos abaixo não é sugestivo de menisco discoide lateral:", False),
    ("Na dor lombar aguda, a realização de radiografia está indicada se", False),
    ("Qual a idade limite comumente apontada para o desenvolvimento da capacidade de andar", False),
    ("Na doença de Legg-Calve-Perthes, a classificação de Hering baseia-se na radiografia:", False),
    ("Entre as opções abaixo, qual não corresponde às Red Flags para solicitação de radiografias", False),
    ("Na mielomeningocele, a presença de medula presa na ressonância magnética é", False),
    ("Paciente com hemimelia fibular. Radiografias demonstram deformidade antero-medial da perna", False),
    ("No desenvolvimento da coxa, o centro de ossificação da cabeça do fêmur é visibilizado na radiografia:", False),
    ("A fratura osteocondral do tálus com fragmento destacado e posicionado sobre o seu leito corresponde ao estágio", False),
    ("A estrutura destacada na figura corresponde a", True),
    ("Qual a alternativa correta sobre a imagem a seguir:", True),
    ("A incidência radiográfica tangencial dorsal, mostrada na figura a seguir, é realizada com o punho", True),
]


def principal() -> int:
    falhas = 0
    for texto, esperado in CASOS:
        obtido = cita_figura(texto)
        if obtido != esperado:
            falhas += 1
            print(f"  FALHA  esperado={esperado} obtido={obtido}  {texto[:70]}")
    total = len(CASOS)
    if falhas:
        print(f"\n{falhas} de {total} casos falharam.")
        return 1
    print(f"{total} casos, todos corretos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
