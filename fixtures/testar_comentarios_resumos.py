#!/usr/bin/env python3
"""As barreiras impedem substituir conteúdo lido por versões concorrentes/não verificadas."""
import copy
import sys
import unittest
from unittest.mock import patch
from tempfile import TemporaryDirectory
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts/comentarios-resumos'))
import catalogo
from catalogo import fonte, sha, fingerprint_questao, fingerprint_comentario
from aplicar import preparar

class Aplicacao(unittest.TestCase):
    def setUp(self):
        self.q={'enunciado':'Qual estrutura?', 'alternativas':[{'letra':'A','texto':'A'},{'letra':'B','texto':'B'}], 'gabarito':'A','imagens':[]}
        self.cap={'c':{'id':'c','titulo':'Resumo','livro':'Livro','edicao':'10ª','capitulo':'45', 'secoes':[{'titulo':'Seção','blocos':[{'id':'b','tipo':'p','t':'Fonte lida.'}]}]}}
        self.ant={'correta':'Texto antigo.'}
        self.c={'conceito':'Conceito sustentado.', 'correta':'Análise A.', 'incorretas':{'B':'Análise B.'},'referencias':['Fonte consultada.']}
        self.item={'questaoSha256':fingerprint_questao(self.q),'comentarioAnteriorSha256':sha(self.ant), 'comentario':self.c,'fontes':[fonte('c',['b'],self.cap)]}
    def aplicar(self):
        return preparar({'q':self.item},{'q':('tema',self.q)},{'q':self.ant},self.cap)
    def test_preserva_oficial_e_nao_atribui_revisao_medica(self):
        antes=copy.deepcopy(self.q); c=self.aplicar()['tema']['q']
        self.assertEqual(self.q,antes); self.assertFalse(c['conferido'])
        self.assertEqual(c['baseResumo']['comentarioSha256'],fingerprint_comentario(c))
    def test_gabarito_alterado_depois_da_leitura(self):
        self.q['gabarito']='B'
        with self.assertRaisesRegex(ValueError,'mudou desde'): self.aplicar()
    def test_comentario_concorrente(self):
        self.ant['correta']='Edição de outro agente.'
        with self.assertRaisesRegex(ValueError,'mudou desde'): self.aplicar()
    def test_fonte_modificada(self):
        self.cap['c']['secoes'][0]['blocos'][0]['t']='Dado modificado.'
        with self.assertRaisesRegex(ValueError,'fonte mudou'): self.aplicar()
    def test_alternativa_sem_analise(self):
        self.c['incorretas']={}
        with self.assertRaisesRegex(ValueError,'cada alternativa'): self.aplicar()
    def test_medico_protegido(self):
        self.ant['conferido']=True
        with self.assertRaisesRegex(ValueError,'protegida'): self.aplicar()
    def test_nao_eliminar_alerta_silenciosamente(self):
        self.ant['alerta']='Divergência.'; self.item['comentarioAnteriorSha256']=sha(self.ant)
        with self.assertRaisesRegex(ValueError,'retirada do alerta'): self.aplicar()
    def test_imagem_nao_inspecionada(self):
        self.q['imagens']=[{'arquivo':'figura.png'}]; self.item['questaoSha256']=fingerprint_questao(self.q)
        with self.assertRaisesRegex(ValueError,'inspeção individual'): self.aplicar()
    def test_sem_fonte(self):
        self.item['fontes']=[]
        with self.assertRaisesRegex(ValueError,'falta fonte'): self.aplicar()
    def test_bloco_inexistente(self):
        with self.assertRaisesRegex(ValueError,'bloco ausente'): fonte('c',['inexistente'],self.cap)

class Catalogo(unittest.TestCase):
    def test_candidatura_nao_atesta_revisao_e_alteracoes_reabrem_item(self):
        q={'id':'q','enunciado':'Pergunta','alternativas':[], 'subtemas':['Tema']}
        cap={'id':'c','titulo':'Capítulo','livro':'Livro','edicao':'10ª','capitulo':'1','secoes':[{'titulo':'Seção','blocos':[{'id':'b','tipo':'p','t':'Texto'}]}]}
        fonte_revisada=fonte('c',['b'],{'c':cap})
        c={'conceito':'Aula','correta':'Resposta','incorretas':{}}
        c['baseResumo']={'fontes':[fonte_revisada], 'questaoSha256':fingerprint_questao(q), 'comentarioSha256':fingerprint_comentario(c)}
        comentarios={}
        contexto=({'q':('tema',q)},comentarios,[{'id':'c','titulo':'Capítulo','subtemas':['Tema']}],{'c':cap},{})
        with TemporaryDirectory() as tmp, patch.object(catalogo,'DOC',Path(tmp)), patch.object(catalogo,'dados',return_value=contexto):
            self.assertEqual(catalogo.inventario()['questoes']['q']['estado'],'pendente')
            comentarios['q']=c
            self.assertEqual(catalogo.inventario()['questoes']['q']['estado'],'revisada')
            c['correta']='Editado depois da revisão'
            self.assertEqual(catalogo.inventario()['questoes']['q']['estado'],'revalidar')
            c['correta']='Resposta'
            cap['secoes'][0]['blocos'][0]['t']='Fonte modificada'
            self.assertEqual(catalogo.inventario()['questoes']['q']['estado'],'revalidar')

    def test_revisoes_registradas_do_acervo_tem_proveniencia_atual(self):
        d=catalogo.inventario()
        for qid,x in d['questoes'].items():
            if x.get('baseResumo'):
                self.assertIn(x['estado'],('revisada','preservar-revisao-medica'),qid)

unittest.main()
