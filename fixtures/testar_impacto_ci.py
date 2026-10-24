#!/usr/bin/env python3
"""Exercita o filtro com commits, exclusões e renomes reais."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('impacto', Path(__file__).resolve().parents[1] / 'scripts/ci/impacto.py')
impacto = importlib.util.module_from_spec(spec)
spec.loader.exec_module(impacto)


class Impacto(unittest.TestCase):
    def test_classificacao_conservadora(self):
        self.assertTrue(impacto.apenas_documentacao(['AGENTS.md', 'docs/comentarios-resumos/ANDAMENTO.md']))
        for p in ['docs/ativacao-e-rollback-assinaturas.md', 'docs/exemplo.json', 'conteudo/biblioteca/resumo.md', 'public/acervo/temas/mao.json', '.github/workflows/publicar.yml', 'src/App.tsx', 'package-lock.json', 'fixtures/testar_x.py', 'novo-arquivo']:
            with self.subTest(p=p):
                self.assertFalse(impacto.apenas_documentacao(['README.md', p]))

    def test_historico_e_falha_fechada(self):
        anterior = os.getcwd()
        with tempfile.TemporaryDirectory() as tmp:
            try:
                os.chdir(tmp)
                def git(*args):
                    return subprocess.check_output(['git', *args], stderr=subprocess.DEVNULL).decode().strip()
                git('init'); git('config', 'user.name', 'Teste'); git('config', 'user.email', 'teste@example.invalid')
                Path('src').mkdir(); Path('src/app.ts').write_text('app')
                git('add', '.'); git('commit', '-m', 'base'); base = git('rev-parse', 'HEAD')
                Path('README.md').write_text('orientação'); git('add', '.'); git('commit', '-m', 'docs')
                docs = git('rev-parse', 'HEAD')
                self.assertFalse(impacto.exige_execucao(base, docs))
                # A mesma regra deixa publicar um build seguido só de documentação.
                self.assertFalse(impacto.exige_execucao(docs, base))
                git('mv', 'src/app.ts', 'docs.md'); git('commit', '-m', 'renomeia')
                self.assertTrue(impacto.exige_execucao(docs, 'HEAD'))
                self.assertTrue(impacto.exige_execucao('sha-ausente', 'HEAD'))
                self.assertFalse(impacto.exige_execucao('HEAD', 'HEAD'))
            finally:
                os.chdir(anterior)


if __name__ == '__main__':
    unittest.main()
