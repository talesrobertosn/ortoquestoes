"""Reconstrói filas editoriais sem confiar no índice ou no scratch anterior.

Uso: python3 scripts/aula/estado.py [--json]
O checkpoint versionado guarda fingerprints de questões e comentários concluídos.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ACERVO = RAIZ / 'public' / 'acervo'
CHECKPOINT = Path(__file__).with_name('progresso_enriquecimento.json')


def fingerprint(obj):
    bruto = json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(bruto.encode()).hexdigest()


def questao_fingerprint(q):
    campos = ('id', 'enunciado', 'alternativas', 'gabarito', 'anulada', 'imagens',
              'figuraPendente', 'referencias', 'prova', 'ano', 'subtemas')
    return fingerprint({k: q.get(k) for k in campos})


def aula(c, q):
    partes = [p.strip() for p in (c.get('conceito') or '').split('\n\n') if p.strip()]
    erradas = {a['letra'] for a in q['alternativas']} - {q.get('gabarito')}
    texto = c.get('conceito') or ''
    return bool(partes and all(p.startswith('**') for p in partes)
                and '###' not in texto and not re.search(r'^\s*[-*] ', texto, re.M)
                and (c.get('correta') or '').startswith('**')
                and set(c.get('incorretas') or {}) == erradas
                and all(v.startswith('**') for v in (c.get('incorretas') or {}).values()))


def reconstruir():
    checkpoint = json.loads(CHECKPOINT.read_text()) if CHECKPOINT.exists() else {}
    baseline = checkpoint.get('baselineQuestoes', {})
    concluidos = checkpoint.get('concluidos', {})
    estado = {'semComentario': [], 'melhorar': [], 'pendencias': [],
              'preservados': [], 'concluidosInalterados': [], 'porTema': {}}
    for arquivo in sorted((ACERVO / 'temas').glob('*.json')):
        dados = json.loads(arquivo.read_text())
        comentarios_path = ACERVO / 'comentarios' / arquivo.name
        comentarios = json.loads(comentarios_path.read_text()) if comentarios_path.exists() else {}
        contagem = {k: 0 for k in ('semComentario', 'melhorar', 'pendencias', 'preservados', 'concluidosInalterados')}
        for q in dados['questoes']:
            qid = q['id']; c = comentarios.get(qid, {})
            motivo = ('anulada' if q.get('anulada') else
                      'duplicata' if q.get('duplicataDe') else
                      'sem_gabarito_oficial' if not q.get('gabarito') else
                      'imagem_requer_revisao' if q.get('figuraPendente') or q.get('imagens')
                      or re.search(r'figura|imagem|radiografia (abaixo|a seguir)', q['enunciado'], re.I) else None)
            if motivo:
                estado['pendencias'].append({'id': qid, 'motivo': motivo})
                contagem['pendencias'] += 1
                continue
            if c.get('conferido') or q.get('comentariosComunidade'):
                estado['preservados'].append(qid); contagem['preservados'] += 1
                continue
            qhash = questao_fingerprint(q)
            registro = concluidos.get(qid, {})
            if registro.get('questaoSha256') == qhash and registro.get('comentarioSha256') == fingerprint(c):
                estado['concluidosInalterados'].append(qid); contagem['concluidosInalterados'] += 1
                continue
            if not (c.get('conceito') or '').strip() and not (c.get('correta') or '').strip() and not (q.get('comentario') or '').strip():
                fila = 'semComentario'
            elif registro or (qid in baseline and baseline[qid] != qhash) or (baseline and qid not in baseline) or not aula(c, q):
                fila = 'melhorar'
            else:
                estado['concluidosInalterados'].append(qid); contagem['concluidosInalterados'] += 1
                continue
            estado[fila].append(qid); contagem[fila] += 1
        estado['porTema'][arquivo.stem] = contagem
    return estado


if __name__ == '__main__':
    estado = reconstruir()
    if '--json' in sys.argv:
        print(json.dumps(estado, ensure_ascii=False, indent=1))
    else:
        print(json.dumps({'contagens': {k: len(v) for k, v in estado.items() if isinstance(v, list)},
                          'porTema': estado['porTema'],
                          'proximas': (estado['semComentario'] or estado['melhorar'])[:6]}, ensure_ascii=False, indent=2))
