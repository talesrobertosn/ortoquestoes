#!/usr/bin/env python3
"""Exporta uma versão compacta do acervo (id, tema, prova, ano, gabarito,
anulada, enunciado + alternativas) para uso fora deste repositório — hoje,
para o ChatGPT casar por similaridade de texto as questões de uma nova prova
contra o que já existe, sem precisar do acervo completo (que tem campos que
não interessam para esse fim, como comentário e imagens).

Uso:
    python3 scripts/exportar_acervo_para_match.py [caminho_saida.json]

Sem argumento, grava em relatorios/acervo_para_match.json.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comum import DIR_TEMAS, RAIZ  # noqa: E402


def main() -> int:
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "relatorios" / "acervo_para_match.json"

    questoes = []
    for caminho in sorted(DIR_TEMAS.glob("*.json")):
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        for q in dados["questoes"]:
            questoes.append({
                "id": q["id"],
                "tema": dados["tema"],
                "prova": q.get("prova"),
                "ano": q.get("ano"),
                "gabarito": q.get("gabarito"),
                "anulada": q.get("anulada", False),
                "enunciado": q["enunciado"],
                "alternativas": [a["texto"] for a in q.get("alternativas", [])],
            })

    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(json.dumps(questoes, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(questoes)} questões exportadas para {saida} ({saida.stat().st_size / 1024:.0f} kB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
