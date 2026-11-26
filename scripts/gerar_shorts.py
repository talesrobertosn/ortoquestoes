#!/usr/bin/env python3
"""
Índice leve dos Shorts (25/11/2026): uma linha por questão apta, para o sorteio do feed
sem baixar os arquivos de tema inteiros.

- public/acervo/shorts.json: {"v", "temas", "q": [[id, tema, grupo, imagem, tamanho], ...]}
  grupo: 0 TEOT, 1 TARO, 2 Cirurgia da Mão, 3 outras provas, 4 OrtoQuestões Simulados (só as com imagem);
  imagem: 1 ou 0; tamanho: letras do
  enunciado com as alternativas.
- public/acervo/shorts-capas.json: as questões com imagem, com o arquivo, as medidas e o começo do
  enunciado, para os cartões da página inicial e do Treinar (nunca o subtema, que às vezes entrega
  a resposta).

Ficam de fora as anuladas, as duplicadas, as sem gabarito de letra e as sem comentário publicado.
Roda no deploy (publicar.yml) e pode ser rodado à mão: python3 scripts/gerar_shorts.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comum import DIR_ACERVO, DIR_COMENTARIOS, DIR_TEMAS  # noqa: E402

GRUPOS = {"TEOT": 0, "TARO": 1, "SBCM": 2, "ENARE Cirurgia da Mão": 2}


def trecho(texto: str, limite: int = 110) -> str:
    texto = " ".join(texto.split())
    if len(texto) <= limite:
        return texto
    corte = texto[:limite].rsplit(" ", 1)[0]
    return corte.rstrip(",;:") + "…"


def principal() -> int:
    temas: list[str] = []
    linhas: list[list] = []
    capas: list[list] = []
    for arquivo in sorted(DIR_TEMAS.glob("*.json")):
        dados = json.loads(arquivo.read_text(encoding="utf-8"))
        slug = dados.get("slug") or arquivo.stem
        caminho_com = DIR_COMENTARIOS / f"{slug}.json"
        comentados = set(json.loads(caminho_com.read_text(encoding="utf-8"))) if caminho_com.exists() else set()
        if slug not in temas:
            temas.append(slug)
        t = temas.index(slug)
        for q in dados.get("questoes", []):
            if q.get("anulada") or q.get("duplicataDe") or q["id"] not in comentados:
                continue
            letras = {a.get("letra") for a in q.get("alternativas", [])}
            if q.get("gabarito") not in letras or len(letras) < 2:
                continue
            imagens = q.get("imagens") or []
            if q.get("simulado") and not q.get("prova"):
                # OrtoQuestões Simulados (questões autorais): nos Shorts, só as com imagem (Tales, 26/11/2026).
                if not imagens:
                    continue
                grupo = 4
            else:
                grupo = GRUPOS.get(str(q.get("prova")), 3)
            tamanho = len(q.get("enunciado", "")) + sum(len(a.get("texto", "")) for a in q["alternativas"])
            linhas.append([q["id"], t, grupo, 1 if imagens else 0, tamanho])
            if imagens:
                im = imagens[0]
                prova = "Simulados" if grupo == 4 else str(q.get("prova") or "")
                capas.append([q["id"], t, grupo, im["arquivo"], im.get("largura") or 0, im.get("altura") or 0,
                              prova, q.get("ano") or 0, trecho(q.get("enunciado", ""))])

    def gravar(nome: str, conteudo: dict) -> Path:
        caminho = DIR_ACERVO / nome
        caminho.write_text(json.dumps(conteudo, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        return caminho

    a = gravar("shorts.json", {"v": 1, "temas": temas, "q": linhas})
    b = gravar("shorts-capas.json", {"v": 1, "temas": temas, "q": capas})
    com_imagem = sum(1 for l in linhas if l[3])
    print(f"Shorts: {len(linhas)} questões aptas, {com_imagem} com imagem ({a.stat().st_size // 1024} kB; capas {b.stat().st_size // 1024} kB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
