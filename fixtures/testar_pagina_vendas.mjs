// Página de vendas (16/10/2026): contas dos planos, personalização e regras da marca.
// O fluxo de compra no navegador fica em testar_compra_planos.mjs (npm run test:compra).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/vendas'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const [mensal, semestral, anual] = m.PLANOS_PIPOCA
  const brl = (s) => s.replace(/\s/g, ' ')

  // Pipoca pequena, média e grande; no celular o anual vem primeiro.
  assert.deepEqual(m.PLANOS_PIPOCA.map((p) => p.id), ['mensal', 'semestral', 'anual'])
  assert.equal(m.PLANOS_CELULAR[0].id, 'anual')
  // Escada de R$ 5 por mês (reajuste de 31/10/2026): 39,90 / 34,90 / 29,90.
  assert.equal(brl(m.semMoeda(m.porMes(anual))), '29,90')
  assert.equal(brl(m.semMoeda(m.porMes(semestral))), '34,90')
  assert.equal(brl(m.semMoeda(m.porMes(mensal))), '39,90')
  assert.equal(m.descontoPct(anual), 25)
  assert.equal(m.descontoPct(semestral), 13)
  assert.equal(m.descontoPct(mensal), 0)
  assert.equal(brl(m.centavos(m.porDia(anual))), 'R$ 0,99')
  assert.ok(Math.abs(m.economia(anual) - 120) < 0.001)
  assert.equal(m.economia(mensal), 0)
  const degrau = m.degrauAnual()
  assert.ok(Math.abs(degrau.diferenca - 149.4) < 0.001 && degrau.mesesAMais === 6)
  assert.equal(brl(degrau.texto), 'Por R$ 149,40 a mais que o semestral, 6 meses a mais de estudo.')
  // Quem já assinava antes do reajuste continua vendo o preço antigo.
  const antigo = m.planosDaPessoa(true)
  assert.equal(brl(m.semMoeda(m.porMes(antigo.anual))), '19,99')
  assert.equal(brl(m.semMoeda(m.porMes(antigo.semestral))), '29,98')
  assert.equal(m.descontoPct(antigo.anual), 50)
  assert.equal(brl(m.degrauAnual(antigo.semestral, antigo.anual).texto), 'Por R$ 60,00 a mais que o semestral, 6 meses a mais de estudo.')
  assert.equal(m.planosDaPessoa(false).anual.total, anual.total)
  assert.equal(m.seloPlano(anual), 'Melhor custo-benefício')
  assert.equal(m.seloPlano(semestral), null)

  // Temas que mais caem: só porcentagens, da que mais cai para a que menos cai.
  assert.ok(m.AREAS_QUE_CAEM.length >= 10)
  for (let i = 1; i < m.AREAS_QUE_CAEM.length; i++) assert.ok(m.AREAS_QUE_CAEM[i - 1].pct >= m.AREAS_QUE_CAEM[i].pct)
  assert.ok(m.fatiaDasDuasPrimeiras().pct > 0 && m.fatiaDasDuasPrimeiras().pct < 100)

  // Personalização: nome, questões, acerto só de 50% para cima, ponto forte só com amostra.
  const respostas = (area, n, certas) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${area}-${String(i + 1).padStart(4, '0')}`, { c: i < certas }]))
  const meta = { nome: 'Ana Beatriz', situacao: 'residente', ano_residencia: 'r3', provas_interesse: ['teot', 'taro'], servico: 'Hospital X' }
  const boa = m.dadosDaPessoa(meta, 312, 6, { ...respostas('joelho', 20, 18), ...respostas('trauma', 30, 18) })
  assert.equal(boa.nome, 'Ana')
  assert.equal(boa.respondidas, 312)
  assert.equal(boa.acerto, 72)
  assert.equal(boa.areaForte, 'Joelho')
  assert.equal(boa.prova, 'TEOT')
  assert.equal(boa.etapa, 'R3')
  assert.equal(boa.servico, 'Hospital X')
  assert.equal(m.tituloHeroi(boa).linha1, 'Ana, você já respondeu 312 questões.')
  // No máximo duas observações no elogio (o título já cita as questões): sequência e ponto forte primeiro.
  assert.ok(m.elogioHeroi(boa).startsWith('6 dias seguidos de estudo, com joelho como ponto forte'))
  assert.ok(m.elogioHeroi(m.dadosDaPessoa(meta, 312, 0, { ...respostas('joelho', 20, 18), ...respostas('trauma', 30, 18) })).startsWith('Joelho como ponto forte e 72% de acerto'))
  // Acerto só com 30 respostas corrigidas.
  assert.equal(m.dadosDaPessoa(meta, 25, 0, respostas('joelho', 25, 25)).acerto, null)
  const baixa = m.dadosDaPessoa({ nome: 'Bia' }, 40, 0, respostas('mao', 40, 12))
  assert.equal(baixa.acerto, null, 'Acerto abaixo de 50% não aparece')
  assert.equal(baixa.areaForte, null)
  assert.equal(m.elogioHeroi(baixa), 'Dá para ver que você é de quem não desiste.')
  assert.ok(!/\d+%/.test(m.elogioHeroi(baixa)))
  const nova = m.dadosDaPessoa({ nome: 'Caio' }, 0, 0, {})
  assert.equal(m.tituloHeroi(nova).linha1, 'Caio, a residência já ocupa o seu dia.')
  assert.equal(m.tituloHeroi(null).linha1, 'A residência já ocupa o seu dia.')
  assert.equal(m.elogioHeroi(nova), null)
  // Regra dos 10: abaixo de dez questões, sem número.
  assert.equal(m.tituloHeroi(m.dadosDaPessoa({ nome: 'Duda' }, 1, 0, {})).linha1, 'Duda, você já deu os primeiros passos.')
  assert.equal(m.tituloHeroi(m.dadosDaPessoa({ nome: 'Duda' }, 10, 0, {})).linha1, 'Duda, você já respondeu 10 questões.')
  assert.equal(m.dadosDaPessoa({ nome: 'ana@x.com' }, 0, 0, {}).nome, '')
  assert.equal(m.dadosDaPessoa({ nome: 'BRUNO souza' }, 0, 0, {}).nome, 'Bruno')

  // Regras da marca na página: nada do total de questões nem de promessa que não existe.
  const pagina = [
    await readFile('src/paginas/Assinatura.tsx', 'utf8'),
    await readFile('src/componentes/vendas/CartoesPlanos.tsx', 'utf8'),
    await readFile('src/componentes/vendas/PreviaCronograma.tsx', 'utf8'),
  ].join('\n')
  const visivel = pagina.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  assert.ok(!/numero\(BASE_CONTAGEM\)|\{BASE_CONTAGEM\}|indice\.total/.test(visivel), 'A página mostra um total de questões')
  for (const proibido of ['mais escolhido', 'mais vendido', 'últimas vagas', 'só hoje', 'depoimento', 'reembolso é integral e automático', 'Cancelar plano']) {
    assert.ok(!visivel.toLowerCase().includes(proibido.toLowerCase()), `Texto proibido na página: ${proibido}`)
  }
  for (const preciso of ['Desistir e solicitar reembolso integral', 'atendimento manual', 'fraseGratis(\'comparacaoTitulo\')', 'aceite_termos_versao: VERSAO_CONDICOES_ASSINATURA', 'prefers-reduced-motion']) {
    const css = await readFile('src/estilos/paginas/Assinatura.css', 'utf8')
    assert.ok(pagina.includes(preciso) || css.includes(preciso) || (await readFile('src/componentes/vendas/usarRevelar.ts', 'utf8')).includes(preciso), `Falta na página: ${preciso}`)
  }
  // O botão descrito na página é o mesmo que existe em Minha conta.
  assert.ok((await readFile('src/componentes/ResumoAssinatura.tsx', 'utf8')).includes('Desistir e solicitar reembolso integral'))
  console.log('Página de vendas: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
