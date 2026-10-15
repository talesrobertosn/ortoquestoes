// Painel do administrador em cinco seções (auditoria de 15/10/2026, T6.6): cada parte pertence a uma
// seção só, os endereços antigos (?aba=geral, configuracoes, avaliacoes, relatos…) continuam abrindo no
// lugar certo, e o endereço novo guarda só o que vale para a parte aberta.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-admin-secoes-'))
const arquivo = join(pasta, 's.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/admin/secoes'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const ler = (texto) => m.lerUrl(new URLSearchParams(texto))
  const ida = (texto) => m.urlDe(ler(texto))

  // Cinco seções, na ordem do painel, e cada parte numa seção só.
  assert.deepEqual(m.SECOES.map(s => s.id), ['hoje', 'pessoas', 'receita', 'conteudo', 'operacoes'])
  const partes = m.SECOES.flatMap(s => s.abas.map(a => a.id))
  assert.equal(new Set(partes).size, partes.length, 'parte repetida em duas seções')
  // Lembretes saíram de Crescimento e Simulados de Ajustes: são partes próprias de Operações.
  assert.equal(m.secaoDe('lembretes'), 'operacoes')
  assert.equal(m.secaoDe('simulados'), 'operacoes')
  assert.equal(m.secaoDe('crescimento'), 'pessoas')
  assert.equal(m.secaoDe('pagamentos'), 'receita')
  // Revisão do Financeiro: "Pagamentos" (aba cobrancas) é o dinheiro recebido; "Avisos de pagamento" mantém o endereço ?aba=pagamentos dos e-mails.
  assert.equal(m.secaoDe('cobrancas'), 'receita')
  assert.deepEqual(m.definicaoDe('receita').abas.map(a => a.id), ['financeiro', 'assinaturas', 'cobrancas', 'pagamentos'])
  assert.equal(m.definicaoDe('receita').abas.find(a => a.id === 'pagamentos').rotulo, 'Avisos de pagamento')
  assert.equal(m.definicaoDe('receita').abas.find(a => a.id === 'cobrancas').rotulo, 'Pagamentos')
  assert.equal(m.secaoDe('questoes'), 'conteudo')

  // Endereços antigos → parte nova.
  const mapa = {
    '': 'hoje', 'aba=geral': 'hoje', 'aba=usuarios': 'usuarios', 'aba=conteudo': 'conteudo', 'aba=questoes': 'questoes',
    'aba=opinioes': 'opinioes', 'aba=crescimento': 'crescimento', 'aba=financeiro': 'financeiro', 'aba=assinaturas': 'assinaturas',
    'aba=pagamentos': 'pagamentos', 'aba=cobrancas': 'cobrancas', 'aba=avisos': 'pagamentos', 'aba=configuracoes': 'ajustes', 'aba=avaliacoes': 'conteudo', 'aba=relatos': 'conteudo',
    'aba=receita': 'financeiro', 'aba=pessoas': 'usuarios', 'aba=operacoes': 'lembretes', 'aba=qualquer-coisa': 'hoje',
  }
  for (const [consulta, aba] of Object.entries(mapa)) assert.equal(ler(consulta).aba, aba, consulta)
  // Os e-mails de alerta levam à vista certa de Conteúdo.
  assert.equal(ler('aba=avaliacoes').vista, 'avaliacoes')
  assert.equal(ida('aba=relatos'), '/admin?aba=conteudo&vista=relatos')
  // Filtro, vista e questão sobrevivem ida e volta, e só aparecem na parte a que pertencem.
  assert.equal(ida('aba=usuarios&filtro=novos'), '/admin?aba=usuarios&filtro=novos')
  assert.equal(ida('aba=conteudo&vista=temas'), '/admin?aba=conteudo&vista=temas')
  assert.equal(ida('aba=questoes&id=mao-0853'), '/admin?aba=questoes&id=mao-0853')
  assert.equal(ida('aba=assinaturas&filtro=novos&id=x'), '/admin?aba=assinaturas')
  assert.equal(ida('aba=usuarios&filtro=invalido'), '/admin?aba=usuarios')
  assert.equal(ida('aba=geral'), '/admin')
  // Só endereço antigo é reescrito (sem criar histórico); o atual fica como está.
  for (const antigo of ['aba=geral', 'aba=configuracoes', 'aba=avaliacoes', 'aba=receita', 'aba=xyz']) assert.ok(m.urlAntiga(new URLSearchParams(antigo)), antigo)
  for (const atual of ['', 'aba=hoje', 'aba=usuarios&filtro=novos', 'aba=lembretes', 'aba=ajustes', 'aba=conteudo&vista=relatos']) assert.ok(!m.urlAntiga(new URLSearchParams(atual)), atual)
  // A primeira parte de cada seção é a que abre por padrão.
  assert.deepEqual(m.SECOES.map(s => m.abaPadrao(s.id)), ['hoje', 'usuarios', 'financeiro', 'conteudo', 'lembretes'])

  console.log('Painel do administrador: 5 seções, endereços antigos e estado na URL ok.')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
