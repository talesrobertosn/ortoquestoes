#!/usr/bin/env python3
"""Gera o Resumão da véspera: as frases "Na prova" dos assuntos que mais caem.

Cada comentário do acervo termina, quase sempre, com uma linha "**Na prova:**"
que resume em uma frase o que a banca cobra. Este script junta essas frases só
dos assuntos de prioridade alta e máxima (src/dados/incidencia.json), área por
área, do que mais cai para o que menos cai, sem repetir frase. O resultado é um
arquivo leve (public/acervo/resumao.json), para ler na reta final sem baixar
os comentários inteiros. Questões oficiais vêm antes; os OrtoQuestões
Simulados completam quando o assunto tem poucas.

O resumão cresce sozinho: cada comentário novo ou reescrito com a linha
"**Na prova:**" entra na próxima publicação (até 6 frases por assunto).

Uso: python3 scripts/gerar_resumao.py  (a publicação roda a cada deploy)
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_ACERVO, DIR_COMENTARIOS, DIR_TEMAS, RAIZ, gravar_json, normalizar  # noqa: E402

INCIDENCIA = RAIZ / "src" / "dados" / "incidencia.json"
SAIDA = DIR_ACERVO / "resumao.json"
FRASES_POR_ASSUNTO = 6
DEPENDE = re.compile(r"\b(seta|imagem|figura|apontad|assinalad|indicad[oa] (?:na|pela)|alerta)|(?:^|[\s,;])\d\s*=", re.I)
NA_PROVA = re.compile(r"\*\*Na prova:?\*\*:?\s*(.+?)(?:\n\n|$)", re.S)


def frase_na_prova(comentario: dict | None) -> str | None:
    if not comentario:
        return None
    achado = NA_PROVA.search(comentario.get("conceito") or "")
    if not achado:
        return None
    texto = " ".join(achado.group(1).split()).strip()
    texto = re.sub(r"\s*\((?:veja|ver) [^)]*\)", "", texto).replace("==", "**")
    # Frases que dependem da figura ou de outra parte do comentário não se leem sozinhas.
    if len(texto) < 15 or DEPENDE.search(texto):
        return None
    # Começa com maiúscula e termina com ponto, para ler como lista.
    texto = texto[0].upper() + texto[1:]
    return texto if texto.endswith((".", "!", "?")) else texto + "."


def main() -> None:
    incidencia = json.loads(INCIDENCIA.read_text(encoding="utf-8"))
    questoes_por_tema: dict[str, list[dict]] = {}
    comentarios_por_tema: dict[str, dict] = {}
    areas_saida = []
    total = 0
    for area in incidencia["areas"]:
        slug = area["slug"]
        if slug not in questoes_por_tema:
            dados = json.loads((DIR_TEMAS / f"{slug}.json").read_text(encoding="utf-8"))
            questoes_por_tema[slug] = dados["questoes"] if isinstance(dados, dict) else dados
            arquivo = DIR_COMENTARIOS / f"{slug}.json"
            comentarios_por_tema[slug] = json.loads(arquivo.read_text(encoding="utf-8")) if arquivo.exists() else {}
        questoes = [q for q in questoes_por_tema[slug] if not q.get("anulada") and not q.get("duplicataDe")]
        comentarios = comentarios_por_tema[slug]
        focos_saida = []
        for foco in area["focos"]:
            if foco["nivel"] < 3:
                continue
            exigidos = {normalizar(s) for s in (area.get("subtema"), foco.get("noAcervo") or foco["nome"]) if s}
            do_foco = [q for q in questoes if exigidos <= {normalizar(s) for s in q.get("subtemas") or []}]
            # Oficiais primeiro (as mais recentes antes), simulados depois.
            do_foco.sort(key=lambda q: (bool(q.get("simulado")), -(q.get("ano") or 0), q["id"]))
            frases, vistas = [], set()
            for q in do_foco:
                texto = frase_na_prova(comentarios.get(q["id"]))
                if not texto or normalizar(texto) in vistas:
                    continue
                vistas.add(normalizar(texto))
                frases.append({"texto": texto, "id": q["id"]})
                if len(frases) >= FRASES_POR_ASSUNTO:
                    break
            if frases:
                focos_saida.append({"nome": foco["nome"], "nivel": foco["nivel"], "frases": frases})
                total += len(frases)
        if focos_saida:
            areas_saida.append({"nome": area["nome"], "slug": slug, "focos": focos_saida})
    gravar_json(SAIDA, {"geradoEm": date.today().isoformat(), "total": total, "areas": areas_saida})
    print(f"{SAIDA.relative_to(RAIZ)}: {len(areas_saida)} áreas, {total} frases")


if __name__ == "__main__":
    main()
