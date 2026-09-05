"""
Reconhecimento de linguagem nos enunciados.

Fica separado do pipeline de propósito: é lógica de texto puro, sem
dependência de PDF, o que deixa o teste rodar em qualquer lugar — inclusive na
integração contínua, sem instalar nada.
"""

from __future__ import annotations

import re

# Citar "radiografia" não quer dizer que a questão traga uma: em
# "a radiografia está indicada se", nada é mostrado. Só conta como figura
# ausente quando a frase aponta para algo exibido. Três formas cobrem os casos
# reais sem arrastar falso positivo junto.
#
# O \b inicial não é decoração: sem ele, "gráficos" casa dentro de
# "radiográficos" e a questão vira falso positivo.
PADRAO_VISUAL = (
    r"\b(figuras?|imagem|imagens|radiografias?|tomografias?|resson[âa]ncias?|"
    r"fotografias?|fotos?|esquemas?|gr[áa]ficos?|exame de imagem)\b"
)

# "a figura abaixo", "a imagem a seguir"
PADRAO_LOCATIVO = re.compile(
    PADRAO_VISUAL + r"[^.;]{0,20}?\b(abaixo|acima|a seguir|ao lado|seguinte|em anexo)\b",
    re.IGNORECASE,
)

# "traçada na figura", "apontada na imagem"
PADRAO_MOSTRA_EM = re.compile(
    r"\b(assinalad|apontad|tra[çc]ad|representad|mostrad|destacad|ilustrad|demonstrad)\w*"
    r"\s+(na|no|em|pela|pelo|nas|nos)\s+" + PADRAO_VISUAL,
    re.IGNORECASE,
)

# "o dermátomo assinalado", "a linha traçada" — sem substantivo visual, mas
# inequivocamente sobre algo mostrado. Ficam de fora, de propósito:
#   "indicada"  — "a radiografia está indicada" é recomendação, não figura;
#   "apontada"  — "a idade apontada na literatura" é citação;
#   "destacado" — "fragmento osteocondral destacado" é fragmento solto.
# Todas as três continuam valendo quando vêm com o substantivo visual junto,
# pela regra PADRAO_MOSTRA_EM ("destacada na figura").
PADRAO_APONTA = re.compile(r"\b(assinalad|tra[çc]ad)\w+\b", re.IGNORECASE)


def cita_figura(enunciado: str) -> bool:
    """A questão pergunta sobre algo que precisa estar na tela?"""
    return bool(
        PADRAO_LOCATIVO.search(enunciado)
        or PADRAO_MOSTRA_EM.search(enunciado)
        or PADRAO_APONTA.search(enunciado)
    )
