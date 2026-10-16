// Painel do administrador (15/10/2026): "Estudo de hoje" (hoje x ontem, fuso de São Paulo) e
// "Exportar dados do painel" (Markdown/JSON/CSV, privacidade e falha por seção).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-exportacao-'))
const arquivo = join(pasta, 'e.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/admin/exportacao'\nexport * from './src/componentes/admin/estudoHoje'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  // 15/10/2026 às 01:30 em São Paulo = 04:30 UTC: o "hoje" é o de São Paulo, não o de UTC.
  const agora = new Date('2026-10-15T04:30:00Z').getTime()
  assert.equal(m.diaSP(agora), '2026-10-15')
  assert.equal(m.diaSP('2026-10-15T02:00:00Z'), '2026-10-14')
  assert.equal(m.diaAnterior('2026-10-01'), '2026-09-30')
  assert.equal(m.diaAnterior('2026-01-01'), '2025-12-31')

  const serie = [
    { dia: '2026-10-13', cadastros: 1, ativos: 3, respostas: 40 },
    { dia: '2026-10-14', cadastros: 2, ativos: 5, respostas: 100 },
    { dia: '2026-10-15', cadastros: 0, ativos: 4, respostas: 120 },
  ]
  const usuarios = [
    { id_usuario: 'a', nome: 'Ana Souza', email: 'ana@exemplo.com', criado_em: '2026-09-01T12:00:00Z', ultima_atividade: '2026-10-15T04:00:00Z', respondidas: 300, acertos: 200, erros: 100, respondidas_7d: 50, respondidas_hoje: 20, plano_vigente: 'anual', administrador: false },
    { id_usuario: 'b', nome: 'Bruno Lima', email: 'bruno@exemplo.com', criado_em: '2026-10-01T12:00:00Z', ultima_atividade: '2026-10-14T20:00:00Z', respondidas: 10, acertos: 5, erros: 5, respondidas_7d: 10, respondidas_hoje: 0, plano_vigente: null, administrador: false },
    { id_usuario: 'c', nome: null, email: 'carla@exemplo.com', criado_em: '2026-10-10T12:00:00Z', ultima_atividade: null, respondidas: 0, acertos: 0, erros: 0, respondidas_7d: 0, plano_vigente: null, administrador: true },
  ]
  // Bruno só usou flashcards hoje; Ana fez questões.
  const sinais = [{ id_usuario: 'b', planos_vezes: 2, planos_ultima: '2026-10-12T12:00:00Z', condicoes_ultima: null, flashcards_unicos: 30, flashcards_7d: 12, flashcards_ultima: '2026-10-15T04:10:00Z', cripta_andar: null, locais_trabalho: null }]

  const e = m.estudoDeHoje({ serie, usuarios, sinais, agora })
  assert.deepEqual(e.pessoasQuestoes, { hoje: 4, ontem: 5 })
  assert.deepEqual(e.questoes, { hoje: 120, ontem: 100 })
  assert.equal(e.flashcards, 1)
  // União (Ana + Bruno = 2) é menor que a série (4): fica o maior.
  assert.equal(e.estudaram, 4)
  assert.equal(m.estudoDeHoje({ serie: null, usuarios, sinais: null, agora }).estudaram, 1)
  assert.equal(m.estudoDeHoje({ serie: null, usuarios: null, sinais: null, agora }).flashcards, null)

  const dados = {
    geradoEm: new Date(agora), serie, usuarios, sinais,
    resumo: { online_agora: 1, usuarios: 3, novos_7d: 1, ativos_hoje: 1, ativos_7d: 2, ativos_30d: 2, respondidas_hoje: 20, respondidas_7d: 60, assinantes_vigentes: 1 },
    funil: { cadastrados: 3, confirmaram: 3, responderam: 2, passaram_50: 1, passaram_500: 0, assinaram: 1 },
    retencao: [{ semana: '2026-09-28', cadastros: 1, estudaram_1a_semana: 1, voltaram_2a_semana: 0 }],
    assinaturas: [{ id_usuario: 'a', usuario: 'ana@exemplo.com', nome: 'Ana Souza', plano: 'anual', status: 'ativa', meio: 'pix', cancelar_ao_fim: true, criada_em: '2026-10-02T12:00:00Z', inicio_periodo: '2026-10-02T12:00:00Z', fim_periodo: '2027-10-02T12:00:00Z', ultima_cobranca_em: '2026-10-02T12:00:00Z', ultima_atualizacao: '2026-10-02T12:00:00Z' }],
    cobrancasReais: [{ id_usuario: 'a', plano: 'anual', meio: 'pix', valor: 199.9, em: '2026-10-02T12:00:00Z', id_pagamento: '123', situacao: 'paga' }],
    eventos: [{ id: 1, id_evento: 'x', tipo: 'payment', id_recurso: '123', status_processamento: 'erro', erro: 'sem_assinatura', recebido_em: '2026-10-02T12:00:00Z', processado_em: null, id_usuario: 'a' }],
    falhas: { indicacoes: 'a consulta ainda não existe no banco' },
  }
  // Padrão: e-mails ocultos, nomes reais.
  const padrao = m.montarExportacao(dados, { ocultarEmails: true, pseudonimizar: false })
  assert.ok(padrao.markdown.startsWith('# Orto Questões · dados do painel do administrador'))
  assert.ok(!padrao.markdown.includes('@exemplo.com'), 'nenhum e-mail com "Ocultar e-mails"')
  assert.ok(!padrao.json.includes('@exemplo.com'))
  assert.ok(!padrao.csvPessoas.includes('@exemplo.com'))
  assert.ok(padrao.markdown.includes('Ana Souza'))
  assert.ok(padrao.markdown.includes('contém dados pessoais'))
  for (const titulo of ['## 1. Resumo rápido', '## 2. Atividade', '## 3. Crescimento', '## 4. Receita e financeiro', '## 5. Pessoas (3)', '## Glossário', '## Limitações', '### Pagamentos recebidos (1', '### Assinaturas (1)'])
    assert.ok(padrao.markdown.includes(titulo), titulo)
  // A seção que falhou vira aviso; o resto sai normalmente.
  assert.ok(padrao.markdown.includes('Indicações: a consulta ainda não existe no banco'))
  assert.ok(padrao.markdown.includes('_Esta seção não veio: a consulta ainda não existe no banco_'))
  // Os números do Financeiro são os da tela (mesmas funções): o Pix anual de outubro entra no mês.
  assert.match(padrao.markdown, /Receita de outubro de 2026 \| R\$ 199,90/)
  assert.ok(padrao.markdown.includes('| Fizeram questões hoje / ontem | 4 / 5 |'))
  // Situação padronizada do Pix anual dentro do período.
  assert.ok(padrao.markdown.includes('| Ana Souza | Anual | Pix | Ativa |'))
  const json = JSON.parse(padrao.json)
  // Sem nome e com e-mail oculto: não usa o e-mail como nome.
  assert.equal(json.pessoas[2].Pessoa, 'Sem nome')
  // Admin identificado pelo papel da conta; assinante; viu os planos.
  assert.equal(json.pessoas[2].Grupo, 'Administrador')
  assert.equal(json.pessoas[1].Grupo, 'Viu os planos (30 dias)')
  assert.equal(json.pessoas[0].Grupo, 'Assinante')

  // Com e-mails.
  const comEmail = m.montarExportacao(dados, { ocultarEmails: false, pseudonimizar: false })
  assert.ok(comEmail.markdown.includes('ana@exemplo.com'))
  assert.ok(comEmail.csvPessoas.split('\r\n')[0].includes('E-mail'))

  // Pseudonimizar: nada de nome nem e-mail; a mesma pessoa tem o mesmo número em todas as seções.
  const pseudo = m.montarExportacao(dados, { ocultarEmails: false, pseudonimizar: true })
  for (const texto of [pseudo.markdown, pseudo.json, pseudo.csvPessoas]) {
    assert.ok(!texto.includes('Ana Souza') && !texto.includes('Bruno') && !texto.includes('@exemplo.com'))
  }
  assert.ok(pseudo.markdown.includes('| Pessoa 001 | Anual | Pix | Ativa |'), 'Ana é a 1ª a se cadastrar')
  assert.ok(pseudo.csvPessoas.includes('Pessoa 003'))
  // CSV: cabeçalho com ; e BOM.
  assert.ok(pseudo.csvPessoas.startsWith('﻿Pessoa;Cadastro;'))
  assert.match(pseudo.nomeBase, /^ortoquestoes-painel-2026-10-15-01-30$/)

  // Tabela: barra vertical e quebra de linha não quebram o Markdown.
  assert.equal(m.tabela(['a'], [['x|y\nz']]), '| a |\n| --- |\n| x\\|y z |')
  console.log('Estudo de hoje e exportação do painel: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
