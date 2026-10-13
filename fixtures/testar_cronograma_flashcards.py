#!/usr/bin/env python3
"""Testes do sistema de flashcards autorais e do cronograma (sem gravar nada)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "flashcards"))
import autorais as A  # noqa: E402
import cronograma as C  # noqa: E402
import fabrica as F  # noqa: E402

areas, questoes, comentarios = F.carregar_acervo()
q, c = questoes["pediatria-0431"], comentarios["pediatria-0431"]

bom = {
    "questao": "pediatria-0431", "tipo": "Tabela", "assunto": "Lesões fisárias",
    "frente": "Qual zona da fise é a mais fraca, onde ocorre a maioria das fraturas fisárias e o deslizamento da epifisiólise?",
    "resposta": "Hipertrófica",
    "explicacao": "**Zona hipertrófica.** Os condrócitos aumentam de volume e a matriz se calcifica.",
    "trecho": "**Hipertrófica** | Os condrócitos aumentam de volume, a matriz se calcifica: é a zona **mais fraca**",
    "opcoes": ["Germinativa", "Hipertrófica"], "certa": 1,
}
falhas = 0


def espera(nome, fc, contem):
    global falhas
    erros = A.validar_autoral(fc, q, c, set())
    ok = (not erros) if contem is None else any(contem in e for e in erros)
    if not ok:
        falhas += 1
        print("FALHOU:", nome, erros)


espera("flashcard bem formado passa", bom, None)
espera("trecho inventado", {**bom, "trecho": "A zona hipertrófica é a mais vascularizada da fise inteira"}, "trecho não está")
espera("resposta fora do trecho", {**bom, "resposta": "Germinativa", "certa": 0}, "resposta não aparece")
espera("alternativa inventada", {**bom, "opcoes": ["Hipertrófica", "Zona de Kölliker"], "certa": 0}, "sem fonte")
espera("certa errada", {**bom, "certa": 0}, "'certa'")
espera("frente entrega a resposta", {**bom, "frente": "A zona hipertrófica da fise é a mais fraca, onde ocorrem as fraturas?"}, "revela")
espera("tipo desconhecido", {**bom, "tipo": "Curiosidade"}, "tipo desconhecido")
espera("assunto fora da questão", {**bom, "assunto": "Pé torto congênito"}, "assunto fora")
espera("lacuna ausente em Na prova", {**bom, "tipo": "Na prova"}, "lacuna")
espera("travessão", {**bom, "explicacao": "**Zona hipertrófica** — a mais fraca da placa de crescimento."}, "travessão")
espera("campo obrigatório", {k: v for k, v in bom.items() if k != "trecho"}, "falta o campo trecho")
espera("só Estudo (sem alternativas)", {**bom, "opcoes": []}, None)
if A.validar_autoral(bom, q, c, {F.normalizar(bom["frente"])}) == []:
    falhas += 1
    print("FALHOU: frente duplicada não foi barrada")

# completar: id, raridade e origem
novo = A.completar(bom, q, c, areas, F.niveis_de_incidencia(), 7)
assert novo["id"] == "fc-pediatria-0431-tb7" and novo["origem"] == "autoral" and novo["batalha"] and novo["raridade"] in ("comum", "rara", "epica", "lendaria"), novo

# cronograma: ordem pela incidência, assuntos de resto no fim, plano respeita o ritmo
linhas, _ = C.levantar()
reais = [l for l in linhas if not l["assunto"].startswith("Outr")]
assert all(a["incidencia"] >= b["incidencia"] for a, b in zip(reais, reais[1:])), "fila fora da ordem de incidência"
assert linhas.index(reais[-1]) < min((i for i, l in enumerate(linhas) if l["assunto"].startswith("Outr")), default=len(linhas)), "resto antes dos reais"
from datetime import date  # noqa: E402
semanas = C.planejar(linhas, 40, date(2026, 10, 19))
assert all(s["total"] <= 40 for s in semanas) and semanas[0]["itens"][0]["assunto"] == next(l for l in linhas if l["falta"] and l["comComentario"])["assunto"]

if falhas:
    print(f"Cronograma de flashcards: {falhas} falha(s)")
    sys.exit(1)
print("Cronograma de flashcards: ok")
