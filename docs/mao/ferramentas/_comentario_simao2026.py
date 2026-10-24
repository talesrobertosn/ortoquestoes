"""Refazer os comentários do SIMÃO 2026 (pedido do Tales, 20/10/2026).

Cada revisao_NN.py chama q(id, conceito=..., correta=..., inc={...}, refs=[...]) e o módulo devolve o dict que o
aplicar_lote.py espera, com enunciado, alternativas, gabarito, subtemas e número da questão tirados do acervo
publicado (nada disso muda; só o comentário é refeito). Aplicar com:
  python scripts/simulados/aplicar_lote.py ~/OrtoQuestoes-Biblioteca/lotes/simao-2026 mao revisao_NN
(questões de ombro-cotovelo vão num arquivo separado, aplicado com o tema ombro-cotovelo).
"""
import json
from pathlib import Path

ACERVO = Path.home() / "ortoquestoes/public/acervo/temas"
REF = "Green's Operative Hand Surgery, 8ª ed. (Wolfe, Pederson, Kozin, Cohen; tradução)"
ARQ = "SIMAO-2026-Questoes.docx"
PROVA = "SIMÃO"
ANO = 2026
AREA = "cirurgia-mao"

_T = {}
for _tema in ("mao", "ombro-cotovelo"):
    for _q in json.load(open(ACERVO / f"{_tema}.json", encoding="utf8"))["questoes"]:
        _T[_q["id"]] = _q


def q(qid, conceito, correta, inc, refs, sub=None):
    p = _T[qid]
    num = p["origem"]["pagina"]
    if f"Inspirada na questão {num} do SIMÃO 2026" not in conceito:
        raise SystemExit(f"{qid}: o 'Por que' deve citar a questão {num} do SIMÃO 2026")
    if not correta.startswith(f"**{p['gabarito']}:"):
        raise SystemExit(f"{qid}: a correta deve começar com **{p['gabarito']}:")
    return dict(id=qid, sub=sub or p["subtemas"], pag=num, num=num, gab=p["gabarito"],
                enun=p["enunciado"], alts=[a["texto"] for a in p["alternativas"]],
                conceito=conceito, correta=correta, inc=inc, refs=refs)


def texto(qid):
    """Para consulta ao escrever: enunciado, alternativas e gabarito publicados."""
    p = _T[qid]
    return p["enunciado"] + "\n" + "\n".join(f"{a['letra']}) {a['texto']}" for a in p["alternativas"]) + f"\nGAB {p['gabarito']}"
