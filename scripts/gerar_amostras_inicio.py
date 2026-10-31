#!/usr/bin/env python3
"""Gera as questões de amostra da página inicial do visitante ("Experimente agora").

Pedido do Tales (16/10/2026): em vez de uma questão fixa, um rodízio de 10 questões
(8 oficiais e 2 de OrtoQuestões Simulados), áreas variadas, temas que mais caem,
enunciado curto, gabarito sem alerta e comentário enriquecido. Cada abertura da página
mostra a próxima de uma ordem embaralhada guardada no aparelho.

Tudo vem do acervo, sem edição: enunciado, alternativas, gabarito e imagem iguais aos de
public/acervo/temas/<tema>.json; cada "porquê" é um trecho copiado (frases inteiras) do
comentário em public/acervo/comentarios/<tema>.json, só sem a marcação de negrito.

Saída:
  src/dados/amostrasInicio.json          lista curta (id, origem, tema), carregada com a página
  src/dados/amostrasInicio/<id>.json     a questão completa, carregada só quando é a da vez

Uso: python3 scripts/gerar_amostras_inicio.py   (fixtures/testar_amostras_inicio.mjs confere)
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ACERVO = RAIZ / 'public' / 'acervo'
SAIDA_INDICE = RAIZ / 'src' / 'dados' / 'amostrasInicio.json'
SAIDA_PASTA = RAIZ / 'src' / 'dados' / 'amostrasInicio'

ROTULO_SIMULADOS = 'OrtoQuestões Simulados'

# Escolhidas a dedo entre as que passam nos critérios de vitrine (ver docstring).
# Ordem sem importância: o rodízio embaralha.
SELECIONADAS = [
    'mao-0102',             # TEOT 2021 · túnel cubital x canal de Guyon
    'ombro-cotovelo-0244',  # TEOT 2024 · nervos em risco no LATARJET
    'joelho-0186',          # TEOT 2025 · LCP e hiperextensão
    'coluna-0090',          # TEOT 2023 · espondilolistese degenerativa
    'pediatria-0502',       # TARO 2026 · DDQ, osteotomia de Steel (imagem)
    'trauma-0757',          # TEOT 2025 · coronoide, O'Driscoll (imagem)
    'quadril-0078',         # TEOT 2023 · fratura periprotética Vancouver B2
    'pe-tornozelo-0205',    # TARO 2024 · complicação do hálux valgo
    'tumores-0370',         # OrtoQuestões Simulados · escore de Mirels
    'trauma-1225',          # OrtoQuestões Simulados · fratura da clavícula
]

MAX_ENUNCIADO = 240
MAX_ALTERNATIVA = 110
MAX_IMAGEM_BYTES = 150_000
MIN_PORQUE = 150
MAX_PORQUE = 330


def sem_marcacao(texto: str) -> str:
    texto = texto.replace('**', '')
    texto = re.sub(r'(?<![\w*])\*(\S[^*]*?)\*(?![\w*])', r'\1', texto)
    return re.sub(r'\s+', ' ', texto).strip()


def normal(texto: str) -> str:
    texto = unicodedata.normalize('NFKD', texto.lower())
    texto = ''.join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', texto).strip()


FIM_DE_FRASE = re.compile(r'(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9“"(])')


def frases(texto: str) -> list[str]:
    return [f for f in FIM_DE_FRASE.split(texto) if f]


def repete_a_alternativa(trecho: str, letra: str, alternativa: str) -> bool:
    """O trecho só repete a resposta ("**B: 10 pontos; fixação profilática.**", "Recidiva.")."""
    t, alt = normal(trecho), normal(alternativa)
    if not t:
        return True
    if t.startswith('correta'):
        return True
    t_sem_letra = re.sub(rf'^{letra.lower()}\b ?', '', t)
    return t_sem_letra == alt or (len(t_sem_letra) <= len(alt) + 12 and (t_sem_letra in alt or alt in t_sem_letra))


def porque(comentario: str, letra: str, alternativa: str, correta: bool) -> str:
    """Frases inteiras do comentário, do começo, até um resumo de leitura rápida."""
    lista = frases(sem_marcacao(comentario))
    if correta and len(lista) > 1 and repete_a_alternativa(lista[0], letra, alternativa):
        lista = lista[1:]
    escolhidas: list[str] = []
    for frase in lista:
        tamanho = len(' '.join(escolhidas + [frase]))
        if escolhidas and (tamanho > MAX_PORQUE or len(' '.join(escolhidas)) >= MIN_PORQUE):
            break
        escolhidas.append(frase)
    return ' '.join(escolhidas)


def origem(q: dict) -> str:
    if q.get('simulado'):
        return ROTULO_SIMULADOS
    return f"{q['prova']} {q['ano']}"


def gerar() -> list[dict]:
    indice = json.loads((ACERVO / 'indice.json').read_text(encoding='utf-8'))
    temas = {t['slug']: t for t in indice['temas']}
    cache: dict[str, tuple[dict, dict]] = {}
    amostras = []
    oficiais = simuladas = 0
    for qid in SELECIONADAS:
        slug = qid.rsplit('-', 1)[0]
        if slug not in cache:
            qs = json.loads((ACERVO / temas[slug]['arquivo']).read_text(encoding='utf-8'))['questoes']
            cm = json.loads((ACERVO / 'comentarios' / f'{slug}.json').read_text(encoding='utf-8'))
            cache[slug] = ({q['id']: q for q in qs}, cm)
        questoes, comentarios = cache[slug]
        q, c = questoes[qid], comentarios[qid]

        # Critérios de vitrine: falha alta em vez de publicar uma amostra ruim.
        assert not q['anulada'] and not q.get('gabaritoBibliografia') and not q.get('duplicataDe') and not q.get('tipo'), qid
        assert not c.get('alerta') and not c.get('provavel'), f'{qid}: gabarito com alerta'
        assert '**' in c['conceito'] and len(c['conceito']) >= 1500, f'{qid}: comentário não enriquecido'
        assert len(q['enunciado']) <= MAX_ENUNCIADO, f'{qid}: enunciado longo'
        assert all(len(a['texto']) <= MAX_ALTERNATIVA for a in q['alternativas']), f'{qid}: alternativa longa'
        assert len(q['imagens']) <= 1, f'{qid}: mais de uma imagem'
        if q.get('simulado'):
            simuladas += 1
        else:
            assert q['prova'] in ('TEOT', 'TARO') and q['ano'], qid
            oficiais += 1

        imagem = None
        if q['imagens']:
            im = q['imagens'][0]
            assert (RAIZ / 'public' / 'imagens' / im['arquivo']).stat().st_size <= MAX_IMAGEM_BYTES, f'{qid}: imagem pesada'
            imagem = {k: im.get(k) for k in ('arquivo', 'legenda', 'largura', 'altura')}

        alternativas = []
        for a in q['alternativas']:
            certa = a['letra'] == q['gabarito']
            fonte = c['correta'] if certa else c['incorretas'][a['letra']]
            alternativas.append({'letra': a['letra'], 'texto': a['texto'], 'porque': porque(fonte, a['letra'], a['texto'], certa)})

        amostras.append({
            'id': qid,
            'origem': origem(q),
            'simulado': bool(q.get('simulado')),
            'tema': temas[slug]['nome'],
            'temaSlug': slug,
            'subtema': q['subtemas'][0] if q['subtemas'] else None,
            'enunciado': q['enunciado'],
            'imagem': imagem,
            'alternativas': alternativas,
            'gabarito': q['gabarito'],
        })
    assert (oficiais, simuladas) == (8, 2), (oficiais, simuladas)
    return amostras


def main() -> None:
    amostras = gerar()
    SAIDA_PASTA.mkdir(parents=True, exist_ok=True)
    for antigo in SAIDA_PASTA.glob('*.json'):
        antigo.unlink()
    for a in amostras:
        (SAIDA_PASTA / f"{a['id']}.json").write_text(json.dumps(a, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    resumo = [{'id': a['id'], 'origem': a['origem'], 'simulado': a['simulado'], 'tema': a['tema']} for a in amostras]
    SAIDA_INDICE.write_text(json.dumps(resumo, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for a in amostras:
        print(f"{a['id']:<22} {a['origem']:<24} {a['tema']}")


if __name__ == '__main__':
    main()
