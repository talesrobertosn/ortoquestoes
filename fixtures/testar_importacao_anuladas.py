"""Anulação oficial não pode virar resposta válida durante a importação."""
import argparse
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import adicionar_prova as importar
from aplicar_comentarios import conferir
from gerar_incidencia import conta


class Anuladas(unittest.TestCase):
    def test_provas_de_mao_nao_alteram_incidencia_do_treino_padrao(self):
        self.assertTrue(conta({"prova": "TEOT"}))
        self.assertFalse(conta({"prova": "USP-SP", "area": "cirurgia-mao"}))
        self.assertFalse(conta({"prova": "TEOT", "anulada": True}))

    def comentario(self):
        return {"conceito": "Tema para estudo.", "correta": "Anulada no gabarito oficial.",
                "incorretas": {l: "Análise de " + l for l in "ABCD"}}

    def questao(self):
        return {"anulada": True, "gabarito": None,
                "alternativas": [{"letra": l, "texto": l} for l in "ABCD"]}

    def test_analise_sem_escolher_resposta(self):
        self.assertEqual(conferir("teste", self.comentario(), self.questao()), [])

    def test_recusa_resposta_provavel_e_analise_incompleta(self):
        c = self.comentario()
        c["provavel"] = "A"
        del c["incorretas"]["D"]
        self.assertEqual(len(conferir("teste", c, self.questao())), 2)

    def executar(self, resposta):
        with tempfile.TemporaryDirectory() as pasta:
            raiz = Path(pasta)
            for nome in ("temas", "comentarios", "novas"):
                (raiz / nome).mkdir()
            (raiz / "temas/mao.json").write_text(json.dumps({"tema": "Mão e punho", "questoes": []}))
            (raiz / "comentarios/mao.json").write_text("{}")
            (raiz / "novas/usp-sp-2025.json").write_text(json.dumps({
                "arquivo": "prova.pdf", "questoes": [{"numero": 10, "pagina": 4,
                "enunciado": "Questão anulada da prova.", "alternativas": list("ABCD")}]}))
            item = {"numero": 10, "tema": "mao", "anulada": True,
                    "resposta": resposta, "subtemas": ["Anatomia da mão e punho"], **self.comentario()}
            lote = raiz / "lote.json"
            lote.write_text(json.dumps({"prova": "USP-SP", "ano": 2025,
                "gabaritoOficial": True, "area": "cirurgia-mao", "itens": [item]}))
            with patch.object(importar, "DIR_TEMAS", raiz / "temas"), \
                 patch.object(importar, "DIR_COMENTARIOS", raiz / "comentarios"), \
                 patch.object(importar, "DIR_NOVAS", raiz / "novas"), contextlib.redirect_stdout(io.StringIO()):
                resultado = importar.aplicar(argparse.Namespace(lote=lote, seco=False))
            return resultado, json.loads((raiz / "temas/mao.json").read_text()), json.loads((raiz / "comentarios/mao.json").read_text())

    def test_importa_anulada_com_analise_das_quatro_opcoes(self):
        resultado, tema, comentarios = self.executar(None)
        self.assertEqual(resultado, 0)
        q = tema["questoes"][0]
        self.assertTrue(q["anulada"])
        self.assertIsNone(q["gabarito"])
        self.assertEqual(q["area"], "cirurgia-mao")
        self.assertEqual(set(comentarios[q["id"]]["incorretas"]), set("ABCD"))

    def test_recusa_lote_sem_gravar_quando_anulada_tem_resposta(self):
        resultado, tema, comentarios = self.executar("A")
        self.assertEqual(resultado, 1)
        self.assertEqual(tema["questoes"], [])
        self.assertEqual(comentarios, {})


if __name__ == "__main__":
    unittest.main()
