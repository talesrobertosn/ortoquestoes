// Painel do administrador como painel de observação (17/10/2026): seis seções, cada parte numa seção
// só, os endereços antigos (?aba=geral, hoje, configuracoes, avaliacoes, relatos, receita, operacoes…)
// continuam abrindo no lugar certo, e o endereço novo guarda só o que vale para a parte aberta.
// Também confere as contas de Financeiro › Ganhos (ganhos.ts).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-admin-secoes-'))
const arquivo = join(pasta, 's.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/admin/secoes'\nexport * from './src/componentes/admin/ganhos'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const ler = (texto) => m.lerUrl(new URLSearchParams(texto))
  const ida = (texto) => m.urlDe(ler(texto))

  // Seis seções, na ordem do painel, e cada parte numa seção só.
  assert.deepEqual(m.SECOES.map(s => s.id), ['agora', 'pessoas', 'financeiro', 'conteudo', 'emails', 'ajustes'])
  const partes = m.SECOES.flatMap(s => s.abas.map(a => a.id))
  assert.equal(new Set(partes).size, partes.length, 'parte repetida em duas seções')
  // Nenhuma parte some na reorganização.
  for (const parte of ['agora', 'usuarios', 'crescimento', 'financeiro', 'assinaturas', 'cobrancas', 'pagamentos', 'conteudo', 'questoes', 'opinioes', 'simulados', 'lembretes', 'cartas', 'ajustes'])
    assert.ok(partes.includes(parte), parte)
  assert.equal(m.secaoDe('crescimento'), 'pessoas')
  assert.equal(m.secaoDe('simulados'), 'conteudo')
  assert.equal(m.secaoDe('lembretes'), 'emails')
  assert.equal(m.secaoDe('cartas'), 'emails')
  assert.equal(m.secaoDe('pagamentos'), 'financeiro')
  // "Pagamentos" (aba cobrancas) é o dinheiro recebido; "Avisos de pagamento" mantém o endereço ?aba=pagamentos dos e-mails.
  assert.equal(m.secaoDe('cobrancas'), 'financeiro')
  assert.deepEqual(m.definicaoDe('financeiro').abas.map(a => a.id), ['financeiro', 'assinaturas', 'cobrancas', 'pagamentos'])
  assert.equal(m.definicaoDe('financeiro').abas.find(a => a.id === 'pagamentos').rotulo, 'Avisos de pagamento')
  assert.equal(m.definicaoDe('financeiro').abas.find(a => a.id === 'cobrancas').rotulo, 'Pagamentos')
  assert.equal(m.secaoDe('questoes'), 'conteudo')

  // Endereços antigos → parte nova.
  const mapa = {
    '': 'agora', 'aba=geral': 'agora', 'aba=hoje': 'agora', 'aba=usuarios': 'usuarios', 'aba=conteudo': 'conteudo', 'aba=questoes': 'questoes',
    'aba=opinioes': 'opinioes', 'aba=crescimento': 'crescimento', 'aba=financeiro': 'financeiro', 'aba=assinaturas': 'assinaturas',
    'aba=pagamentos': 'pagamentos', 'aba=cobrancas': 'cobrancas', 'aba=avisos': 'pagamentos', 'aba=configuracoes': 'ajustes', 'aba=avaliacoes': 'conteudo', 'aba=relatos': 'conteudo',
    'aba=receita': 'financeiro', 'aba=pessoas': 'usuarios', 'aba=operacoes': 'lembretes', 'aba=emails': 'lembretes', 'aba=cartas': 'cartas',
    'aba=simulados': 'simulados', 'aba=lembretes': 'lembretes', 'aba=ajustes': 'ajustes', 'aba=qualquer-coisa': 'agora',
  }
  for (const [consulta, aba] of Object.entries(mapa)) assert.equal(ler(consulta).aba, aba, consulta)
  // Os e-mails de alerta levam à vista certa de Conteúdo.
  assert.equal(ler('aba=avaliacoes').vista, 'avaliacoes')
  assert.equal(ida('aba=relatos'), '/admin?aba=conteudo&vista=relatos')
  assert.equal(ida('aba=pagamentos'), '/admin?aba=pagamentos')
  // Filtro, vista e questão sobrevivem ida e volta, e só aparecem na parte a que pertencem.
  assert.equal(ida('aba=usuarios&filtro=novos'), '/admin?aba=usuarios&filtro=novos')
  assert.equal(ida('aba=conteudo&vista=temas'), '/admin?aba=conteudo&vista=temas')
  assert.equal(ida('aba=questoes&id=mao-0853'), '/admin?aba=questoes&id=mao-0853')
  assert.equal(ida('aba=assinaturas&filtro=novos&id=x'), '/admin?aba=assinaturas')
  assert.equal(ida('aba=usuarios&filtro=invalido'), '/admin?aba=usuarios')
  assert.equal(ida('aba=geral'), '/admin')
  assert.equal(ida('aba=hoje'), '/admin')
  // Só endereço antigo é reescrito (sem criar histórico); o atual fica como está.
  for (const antigo of ['aba=geral', 'aba=hoje', 'aba=configuracoes', 'aba=avaliacoes', 'aba=receita', 'aba=operacoes', 'aba=emails', 'aba=xyz']) assert.ok(m.urlAntiga(new URLSearchParams(antigo)), antigo)
  for (const atual of ['', 'aba=agora', 'aba=usuarios&filtro=novos', 'aba=lembretes', 'aba=cartas', 'aba=ajustes', 'aba=simulados', 'aba=conteudo&vista=relatos']) assert.ok(!m.urlAntiga(new URLSearchParams(atual)), atual)
  // A primeira parte de cada seção é a que abre por padrão.
  assert.deepEqual(m.SECOES.map(s => m.abaPadrao(s.id)), ['agora', 'usuarios', 'financeiro', 'conteudo', 'lembretes', 'ajustes'])

  // ---------- Financeiro › Ganhos ----------
  // 17/10/2026 15h em Brasília (18h UTC).
  const agora = new Date('2026-10-17T18:00:00Z')
  const c = (iso, valor, meio = 'cartao') => ({ em: new Date(iso), valor, meio, plano: 'mensal', id_usuario: 'u', estimada: false, tipo: 'nova' })
  const todas = [
    c('2026-10-17T12:00:00Z', 50, 'pix'),       // hoje
    c('2026-10-17T02:00:00Z', 30),              // 16/10 23h em Brasília: ontem
    c('2026-10-12T15:00:00Z', 100),             // 7 dias
    c('2026-10-05T15:00:00Z', 70),              // 7 dias antes; mês
    c('2026-09-10T15:00:00Z', 40),              // mês passado até o dia 17
    c('2026-09-25T15:00:00Z', 60, 'pix'),       // mês passado depois do dia 17
    c('2025-12-20T15:00:00Z', 200),             // ano passado
    c('2026-10-18T15:00:00Z', 999),             // futuro: não conta
  ]
  const g = m.calcularGanhos(todas, agora)
  assert.deepEqual(g.hoje, { valor: 50, quantidade: 1 })
  assert.deepEqual(g.ontem, { valor: 30, quantidade: 1 })
  assert.equal(g.semana.valor, 180)
  assert.equal(g.semanaAnterior.valor, 70)
  assert.equal(g.mes.valor, 250)
  assert.equal(g.mesPassado.valor, 100)
  assert.equal(g.mesPassadoAteHoje.valor, 40)
  assert.equal(g.ano.valor, 350)
  assert.equal(g.total.valor, 550)
  assert.equal(g.chaveAno, '2026')
  assert.equal(g.porDia.length, 30)
  assert.equal(g.porDia.at(-1).dia, '2026-10-17')
  assert.deepEqual(g.porDia.at(-1), { dia: '2026-10-17', cartao: 0, pix: 50 })
  assert.equal(g.porDia.at(-2).cartao, 30)
  const f = m.fechamentoDoMes(250, '2026-10', [['2026-10', { valor: 80, quantidade: 2 }], ['2026-11', { valor: 9, quantidade: 1 }]], [['2026-10', { valor: 12, quantidade: 0.5 }]])
  assert.equal(f.total, 342)
  assert.equal(f.cartao.quantidade, 2)

  console.log('Painel do administrador: 6 seções, endereços antigos, estado na URL e ganhos ok.')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
