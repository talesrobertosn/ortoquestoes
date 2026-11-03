#!/usr/bin/env python3
"""Gera as questões que o visitante responde na tela de entrar e criar conta (01/11/2026).

Pedido do Tales: uma questão real a cada F5 e um botão "Outra questão", com provas variadas. Usa os mesmos critérios
de vitrine das amostras da página inicial (scripts/gerar_amostras_inicio.py): gabarito sem alerta nem anulação,
comentário enriquecido, enunciado e alternativas curtos, sem imagem; tudo copiado do acervo, sem edição, e cada
"porquê" é um trecho de frases inteiras do comentário. A diferença é a escolha: automática e espalhada por prova e
por tema, das provas mais recentes para as mais antigas.

Saída:
  src/dados/amostrasAcesso.json        lista curta (id, origem, prova, tema), carregada com a página
  src/dados/amostrasAcesso/<id>.json   a questão completa, baixada só quando é a da vez

Uso: python3 scripts/gerar_amostras_acesso.py   (fixtures/testar_amostras_acesso.mjs confere)
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gerar_amostras_inicio import ACERVO, MAX_ALTERNATIVA, MAX_ENUNCIADO, RAIZ, ROTULO_SIMULADOS, porque  # noqa: E402

SAIDA_INDICE = RAIZ / 'src' / 'dados' / 'amostrasAcesso.json'
SAIDA_PASTA = RAIZ / 'src' / 'dados' / 'amostrasAcesso'

# Quantas de cada prova (as que não aparecem aqui entram com OUTRAS). "Ortopedia" fica de fora: não é o nome de uma
# banca que a pessoa reconheça.
COTA = {'TARO': 10, 'TEOT': 8, 'Simulados': 6}
OUTRAS = 2
FORA = {'Ortopedia'}
# Nenhum tema domina o sorteio de uma prova.
POR_TEMA = 3


def origem(q: dict) -> str:
    """Prova e ano como estão no acervo; sem ano cadastrado, só a prova."""
    if q.get('simulado'):
        return ROTULO_SIMULADOS
    return f"{q['prova']} {q['ano']}" if q.get('ano') else q['prova']


def elegivel(q: dict, c: dict | None) -> bool:
    if not c or not c.get('correta') or not c.get('incorretas'):
        return False
    if q['anulada'] or q.get('gabaritoBibliografia') or q.get('duplicataDe') or q.get('tipo'):
        return False
    if c.get('alerta') or c.get('provavel'):
        return False
    if '**' not in c.get('conceito', '') or len(c['conceito']) < 1500:
        return False
    if q['imagens'] or len(q['enunciado']) > MAX_ENUNCIADO or any(len(a['texto']) > MAX_ALTERNATIVA for a in q['alternativas']):
        return False
    return all(a['letra'] == q['gabarito'] or a['letra'] in c['incorretas'] for a in q['alternativas'])


def gerar() -> list[dict]:
    indice = json.loads((ACERVO / 'indice.json').read_text(encoding='utf-8'))
    candidatas: dict[str, list[tuple[dict, dict, dict]]] = {}
    for tema in indice['temas']:
        caminho = ACERVO / 'comentarios' / f"{tema['slug']}.json"
        if not caminho.exists():
            continue
        comentarios = json.loads(caminho.read_text(encoding='utf-8'))
        for q in json.loads((ACERVO / tema['arquivo']).read_text(encoding='utf-8'))['questoes']:
            prova = 'Simulados' if q.get('simulado') else q.get('prova')
            if prova in FORA or not elegivel(q, comentarios.get(q['id'])):
                continue
            candidatas.setdefault(prova, []).append((q, comentarios[q['id']], tema))
    amostras = []
    for prova in sorted(candidatas):
        # As mais recentes primeiro; empate pelo id, para a saída não mudar de uma execução para outra.
        lista = sorted(candidatas[prova], key=lambda t: (-(t[0].get('ano') or 0), t[0]['id']))
        cota, por_tema, escolhidas = COTA.get(prova, OUTRAS), Counter(), 0
        for q, c, tema in lista:
            if escolhidas >= cota:
                break
            if por_tema[tema['slug']] >= POR_TEMA:
                continue
            alternativas = []
            for a in q['alternativas']:
                certa = a['letra'] == q['gabarito']
                fonte = c['correta'] if certa else c['incorretas'][a['letra']]
                alternativas.append({'letra': a['letra'], 'texto': a['texto'], 'porque': porque(fonte, a['letra'], a['texto'], certa)})
            # Toda alternativa precisa de um porquê de verdade (não só a resposta repetida).
            if any(len(a['porque']) < 40 for a in alternativas):
                continue
            por_tema[tema['slug']] += 1
            escolhidas += 1
            amostras.append({
                'id': q['id'], 'origem': origem(q), 'prova': 'OrtoQuestões Simulados' if q.get('simulado') else q['prova'],
                'simulado': bool(q.get('simulado')), 'tema': tema['nome'], 'temaSlug': tema['slug'],
                'subtema': q['subtemas'][0] if q['subtemas'] else None, 'enunciado': q['enunciado'], 'imagem': None,
                'alternativas': alternativas, 'gabarito': q['gabarito'],
            })
    return amostras


def main() -> None:
    amostras = gerar()
    SAIDA_PASTA.mkdir(parents=True, exist_ok=True)
    for antigo in SAIDA_PASTA.glob('*.json'):
        antigo.unlink()
    for a in amostras:
        (SAIDA_PASTA / f"{a['id']}.json").write_text(json.dumps(a, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    resumo = [{'id': a['id'], 'origem': a['origem'], 'prova': a['prova'], 'tema': a['tema']} for a in amostras]
    SAIDA_INDICE.write_text(json.dumps(resumo, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(len(amostras), 'amostras')
    for prova, n in Counter(a['prova'] for a in amostras).most_common():
        print(f'  {prova:<34} {n}')


if __name__ == '__main__':
    main()
