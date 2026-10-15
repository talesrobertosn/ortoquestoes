// Perfil em poucos toques e ficha do painel (15/10/2026): atalhos de etapa, locais de trabalho,
// sinal "Viu os planos" e o filtro novo no endereço do painel.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-perfil-ficha-'))
const arquivo = join(pasta, 'p.mjs')
try {
  await build({
    stdin: {
      contents: `export * from './src/conta/perfilEstudo'\nexport * from './src/componentes/admin/sinais'\nexport { lerUrl, urlDe } from './src/componentes/admin/secoes'`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))

  // Etapas de um toque: todas as do pedido, com o ano dos residentes, e sempre valores que o formulário completo conhece.
  assert.deepEqual(m.ETAPAS_RAPIDAS.map(e => e.id), ['estudante', 'r1', 'r2', 'r3', 'r4', 'mao', 'ortopedista', 'outro'])
  for (const e of m.ETAPAS_RAPIDAS) {
    assert.ok(m.SITUACOES.some(([v]) => v === e.situacao), e.id)
    assert.equal(e.ano !== '', e.situacao === 'residente', `${e.id}: só residente tem ano`)
    assert.equal(m.etapaRapidaDe(e.situacao, e.ano), e.id)
    // Toda etapa, menos "Outro", já vem com prova sugerida: um toque basta.
    assert.equal(m.provasSugeridas(e.situacao, e.ano).length > 0, e.id !== 'outro', e.id)
  }
  assert.equal(m.etapaRapidaDe('residente', ''), '')
  assert.equal(m.etapaRapidaDe('', ''), '')
  assert.equal(m.rotuloEtapa('residente', 'r2'), 'R2')
  assert.equal(m.rotuloEtapa('mao'), 'Residente de mão')

  // Locais de trabalho: limpa, tira vazios, repetidos (sem acento e maiúscula) e o principal; no máximo 8.
  assert.deepEqual(m.lerLocais(['  Santa Casa ', 'santa  casa', '', 'x', 'Clínica Ósso', 'clinica osso', 'HC'], 'Hospital das Clínicas'), ['Santa Casa', 'Clínica Ósso', 'HC'])
  assert.deepEqual(m.lerLocais(['Hospital das Clínicas', 'INTO'], 'hospital das clinicas'), ['INTO'])
  assert.deepEqual(m.lerLocais('A1; B2\nC3'), ['A1', 'B2', 'C3'])
  assert.deepEqual(m.lerLocais(null), [])
  assert.equal(m.lerLocais(Array.from({ length: 12 }, (_, i) => `Local ${i}`)).length, m.LOCAIS_MAXIMO)
  assert.equal(m.lerLocais(['y'.repeat(200)])[0].length, m.LOCAL_TAMANHO)
  assert.ok(m.trabalhaComoEspecialista('ortopedista') && !m.trabalhaComoEspecialista('residente'))

  // "Viu os planos": dentro da janela de 30 dias; destaque só nos últimos 7.
  const agora = Date.parse('2026-10-15T15:00:00Z')
  const ha = (dias) => new Date(agora - dias * 86_400_000).toISOString()
  assert.ok(m.viuPlanos({ planos_vezes: 2, planos_ultima: ha(0.1) }, 30, agora))
  assert.ok(m.viuPlanos({ planos_vezes: 1, planos_ultima: ha(6.5) }, m.PLANOS_RECENTE_DIAS, agora))
  assert.ok(!m.viuPlanos({ planos_vezes: 1, planos_ultima: ha(8) }, m.PLANOS_RECENTE_DIAS, agora))
  assert.ok(!m.viuPlanos({ planos_vezes: 1, planos_ultima: ha(31) }, 30, agora))
  assert.ok(!m.viuPlanos({ planos_vezes: 0, planos_ultima: null }, 30, agora))
  assert.ok(!m.viuPlanos(undefined))
  assert.equal(m.textoPlanos({ planos_vezes: 3, planos_ultima: ha(0.1) }, agora), 'Viu os planos hoje · 3×')
  assert.equal(m.textoPlanos({ planos_vezes: 1, planos_ultima: ha(1.2) }, agora), 'Viu os planos ontem')
  assert.equal(m.textoPlanos({ planos_vezes: 1, planos_ultima: ha(4.5) }, agora), 'Viu os planos há 4 dias')
  assert.equal(m.indexarSinais([{ id_usuario: 'a', planos_vezes: 1 }]).get('a').planos_vezes, 1)
  assert.equal(m.indexarSinais(null).size, 0)

  // O filtro novo da lista de pessoas fica no endereço (F5 e links mantêm).
  assert.equal(m.urlDe(m.lerUrl(new URLSearchParams('aba=usuarios&filtro=planos'))), '/admin?aba=usuarios&filtro=planos')
  console.log('Perfil e ficha do painel: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
