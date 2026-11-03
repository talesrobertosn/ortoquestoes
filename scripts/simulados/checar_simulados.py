"""Portão de estilo dos OrtoQuestões Simulados (Tales, 31/10/2026).

"Antes de fazer a questão do OrtoQuestões Simulados tem que fazer uma engenharia reversa e copiar o
jeito de escrever o enunciado, alternativas etc.; as questões estão ficando muito fáceis, seja mais
realista." Ver docs/biblioteca/FLUXO-MESTRE.md, seções 5 e 6.

Usado por aplicar_lote.py (também no --conferir). Pode rodar sozinho:
  python3 scripts/simulados/checar_simulados.py <pasta> <lote1,lote2>
"""
import re
import statistics
from collections import Counter

# Citar o livro ou o capítulo no enunciado não é o jeito da banca.
FONTE_NO_ENUNCIADO = re.compile(
    r"segundo (o|a|os|as) (cap[ií]tulo|livro|autor|autores|texto)"
    r"|conforme (o|a) (cap[ií]tulo|livro|autor)"
    r"|de acordo com (o|a) (cap[ií]tulo|livro|autor)"
    r"|citad[oa]s? (pelo|no) "
    r"|(?<!DIAS-)\b(Rockwood|Campbell|Tachdjian|Netter|Callaghan|Green's|Lovell|Sizínio|Sizinio)\b",  # DIAS-TACHDJIAN é classificação
    re.I,
)
# Palavras que facilitam eliminar a alternativa (só aviso: às vezes a banca usa).
ABSOLUTAS = re.compile(r"\b(sempre|nunca|qualquer|dispensa\w*|obrigatoriamente|jamais|todos os casos|todas as)\b", re.I)


def checar(questoes):
    """questoes: lista de (rotulo, q) com q no formato dos lotes (enun, alts, gab). Devolve (erros, avisos)."""
    erros, avisos = [], []
    for rot, q in questoes:
        alts = q["alts"]
        letras = "ABCDE"[: len(alts)]
        if q["gab"] not in letras:
            continue
        i = letras.index(q["gab"])
        correta = len(alts[i])
        erradas = [len(t) for j, t in enumerate(alts) if j != i]
        media = statistics.mean(erradas)
        if correta > 1.3 * media and correta - media > 12:
            erros.append(f"{rot}: a correta ({correta} caracteres) é bem mais longa que a média das erradas ({media:.0f}); a resposta se denuncia")
        elif correta > max(erradas) * 1.1 and correta - max(erradas) > 8:
            erros.append(f"{rot}: a correta é a alternativa mais longa ({correta} contra {max(erradas)}); a resposta se denuncia")
        if FONTE_NO_ENUNCIADO.search(q["enun"]):
            erros.append(f"{rot}: o enunciado cita o livro ou o capítulo ('{FONTE_NO_ENUNCIADO.search(q['enun']).group(0)}'); a banca não faz isso")
        for j, t in enumerate(alts):
            m = ABSOLUTAS.search(t)
            if m and j != i:
                avisos.append(f"{rot}: alternativa {letras[j]} com '{m.group(0)}' (fácil de eliminar; revise)")
        tam = [len(t) for t in alts]
        if min(tam) and max(tam) / min(tam) > 3 and max(tam) - min(tam) > 40:
            avisos.append(f"{rot}: alternativas com tamanhos muito desiguais ({min(tam)} a {max(tam)} caracteres)")
    gabs = Counter(q["gab"] for _, q in questoes)
    if len(questoes) >= 4 and gabs and gabs.most_common(1)[0][1] > len(questoes) / 2:
        erros.append(f"gabarito concentrado: {dict(gabs)}; distribua entre as letras")
    return erros, avisos


if __name__ == "__main__":
    import importlib.util
    import sys
    from pathlib import Path

    pasta, lotes = Path(sys.argv[1]), sys.argv[2].split(",")
    qs = []
    for nome in lotes:
        sp = importlib.util.spec_from_file_location(nome, pasta / f"{nome}.py")
        m = importlib.util.module_from_spec(sp)
        sp.loader.exec_module(m)
        qs += [(f"[{nome}] {q['enun'][:50]}", q) for q in m.QUESTOES]
    e, a = checar(qs)
    for x in a:
        print("aviso:", x)
    for x in e:
        print("ERRO:", x)
    print(f"{len(qs)} questões, {len(e)} erros, {len(a)} avisos")
    sys.exit(1 if e else 0)
