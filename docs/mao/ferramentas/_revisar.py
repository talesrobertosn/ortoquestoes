"""Revisão das questões já publicadas do SIMÃO 2023 (pedido do Tales, 20/10/2026).

Cada revisao_NN.py carrega o lote_NN.py publicado e troca, por número da questão:
  enun / alts      -> redação mais próxima do original (mesma ordem de letras do publicado);
  cita             -> parágrafo com a citação literal do Green, antes de "Por que esta questão foi criada.";
  gab, conceito, correta, inc, sub, refs -> só quando a questão inteira foi refeita;
  troca            -> lista de (antigo, novo) aplicada ao conceito, à correta e às incorretas.
O parágrafo "Por que esta questão foi criada." passa a começar por "Inspirada na questão N do SIMÃO 2023".
"""
import importlib.util
import json
import re
from pathlib import Path

POR_QUE = "**Por que esta questão foi criada.**"
ACERVO = Path.home() / "ortoquestoes/public/acervo/temas"


def ids_publicados(arq="SIMAO 2023"):
    ids = {}
    for tema in ("mao", "ombro-cotovelo"):
        for q in json.load(open(ACERVO / f"{tema}.json", encoding="utf8"))["questoes"]:
            o = q.get("origem") or {}
            if o.get("arquivo") == arq and o.get("numeroOriginal"):
                ids[o["numeroOriginal"]] = q["id"]
    return ids


def carregar(nome):
    p = Path(__file__).with_name(nome + ".py")
    sp = importlib.util.spec_from_file_location("base_" + nome, p)
    m = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m


def revisar(base, mud):
    ids = ids_publicados()
    saida = []
    for q in base.QUESTOES:
        q = dict(q)
        num = q["num"]
        r = dict(mud.get(num, {}))
        cita = r.pop("cita", None)
        troca = r.pop("troca", [])
        q.update(r)
        for velho, novo in troca:
            achou = False
            for k in ("conceito", "correta"):
                if velho in q[k]:
                    q[k] = q[k].replace(velho, novo)
                    achou = True
            inc = dict(q["inc"])
            for k, v in inc.items():
                if velho in v:
                    inc[k] = v.replace(velho, novo)
                    achou = True
            q["inc"] = inc
            if not achou:
                raise SystemExit(f"Q{num}: trecho a trocar não encontrado: {velho[:60]}")
        c = q["conceito"]
        c, n = re.subn(r"\*\*Por que esta questão foi criada\.\*\* No SIMÃO 2023 a banca ",
                       f"{POR_QUE} Inspirada na questão {num} do SIMÃO 2023, em que a banca ", c)
        if n != 1 and f"Inspirada na questão {num} do SIMÃO 2023" not in c:
            raise SystemExit(f"Q{num}: parágrafo 'Por que' fora do padrão")
        if cita:
            c = c.replace(POR_QUE, cita.strip() + "\n\n" + POR_QUE, 1)
        q["conceito"] = c
        q["id"] = ids[num]
        saida.append(q)
    faltam = set(mud) - {q["num"] for q in saida}
    if faltam:
        raise SystemExit(f"números fora do lote: {faltam}")
    return saida
