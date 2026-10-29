// Serviços (29/10/2026): o mesmo hospital escrito de vários jeitos vira um nome só no painel,
// e a busca do cadastro mostra primeiro os serviços do estado da pessoa.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-servicos-'))
const arquivo = join(pasta, 's.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/admin/servicosConhecidos'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const igual = (textos, nome, uf) => { for (const t of textos) assert.equal(m.servicoConhecido(t, uf), nome, `${t} (${uf ?? 'sem UF'})`) }

  // Os grupos da tabela do Tales.
  igual(['Conjunto Hospitalar do Mandaqui', 'Complexo Hospitalar do Mandaqui'], 'Conjunto Hospitalar do Mandaqui')
  igual(['Hospital Santa Marcelina', 'Sta Marcelina'], 'Hospital Santa Marcelina', 'SP')
  igual(['Hospital José Carvalho Florence', 'Hospital Municipal Dr. José de Carvalho Florence (São José dos Campos, SP)'], 'Hospital Municipal Dr. José de Carvalho Florence (São José dos Campos, SP)')
  igual(['HOSPITAL SANTA IZABEL', 'Santa Casa de Misericórdia da Bahia', 'Hospital Santa Isabel (BA)'], 'Hospital Santa Izabel (Santa Casa da Bahia)', 'BA')
  igual(['Pucsp', 'PUC SP', 'PUC-SP'], 'PUC-SP (Sorocaba)')
  igual(['Hospital Independência', 'Hospital independência porto alegre'], 'Hospital Independência (Porto Alegre)', 'RS')
  igual(['HSPM', 'HSPM-SP'], 'Hospital do Servidor Público Municipal (HSPM)')
  igual(['UFVJM', 'Universidade Federal dos Vales do Jequitinhonha e Mucuri UFVJM'], 'Universidade Federal dos Vales do Jequitinhonha e Mucuri (UFVJM)')
  igual(['HOSPITAL DAS CLINICAS DA UFU', 'Hospital de Clínicas de Uberlândia'], 'Hospital de Clínicas da UFU')
  igual(['Hu uepg', 'HU hepg'], 'Hospital Universitário Regional dos Campos Gerais (UEPG)')
  igual(['hospital regional do oeste', 'UFFS/HRO CHAPECO'], 'Hospital Regional do Oeste (Chapecó)', 'SC')
  igual(['Hospital Universitario Ciencias Medicas', 'Ciências Médicas'], 'Hospital Universitário Ciências Médicas', 'MG')
  igual(['marcio cunha'], 'Hospital Márcio Cunha')
  igual(['O Instituto de Ortopedia e Traumatologia do Hospital das Clínicas da FMUSP (IOT/HCFMUSP)'], 'Instituto de Ortopedia e Traumatologia do HC-FMUSP (IOT)')
  igual(['Hospital de Clinicas PR'], 'Complexo Hospital de Clínicas da UFPR')
  igual(['HOSPITAL UNIVERSITÁRIO DO OESTE DO PARANA'], 'Hospital Universitário do Oeste do Paraná (HUOP)', 'PR')
  // Erros de digitação em nomes compridos.
  igual(['Santa Lúcia poços de csldas', 'Samara Lúcia de poços de caldas'], 'Hospital Santa Lúcia (Poços de Caldas)', 'MG')
  igual(['Hospital Angelina Carom', 'Conjunto Hospitalar do Mandaki'], null, 'BA')
  assert.equal(m.servicoConhecido('Conjunto Hospitalar do Mandaki', 'SP'), 'Conjunto Hospitalar do Mandaqui')
  assert.equal(m.servicoConhecido('Hospital Angelina Carom'), 'Hospital Angelina Caron (PR)')

  // O estado decide: "oeste" no PR não é Chapecó; "Ciências Médicas" fora de MG fica como escrito.
  assert.equal(m.servicoConhecido('hospital regional do oeste', 'PR'), null)
  assert.equal(m.servicoConhecido('Faculdade de Ciências Médicas da Santa Casa de São Paulo', 'SP'), 'Santa Casa de São Paulo')
  assert.equal(m.servicoConhecido('Ciências Médicas', 'PB'), null)
  // Siglas ambíguas e lugares genéricos ficam como estão.
  igual(['HRC', 'HGVC', 'Hospital de Base', 'Santa Casa', 'Gatti', 'Puc'], null)
  for (const t of ['clinica', 'Clínica própria', 'Ortopedia', 'Vários serviços']) assert.equal(m.chaveServico(t), m.SERVICO_GERAL, t)
  assert.equal(m.chaveServico('Ortopedia do Hospital Xingu'), 'xingu')

  // Nenhum nome repetido, e todo nome da lista se reconhece a si mesmo.
  const nomes = m.SERVICOS_CONHECIDOS.map((s) => s.nome)
  assert.equal(new Set(nomes).size, nomes.length)
  for (const s of m.SERVICOS_CONHECIDOS) assert.equal(m.servicoConhecido(s.nome, s.uf), s.nome, s.nome)

  // Busca do cadastro: pelo pedaço do nome, pela cidade ou pela sigla; o estado da pessoa vem primeiro.
  assert.deepEqual(m.buscarServicos('manda').map((s) => s.nome), ['Conjunto Hospitalar do Mandaqui'])
  assert.ok(m.buscarServicos('curitiba').every((s) => s.cidade === 'Curitiba'))
  assert.ok(m.buscarServicos('hcpa').some((s) => s.nome === 'Hospital de Clínicas de Porto Alegre'))
  assert.equal(m.buscarServicos('', 'RS')[0].uf, 'RS')
  assert.equal(m.buscarServicos('', 'ba')[0].uf, 'BA')
  assert.equal(m.buscarServicos('hospital de clinicas', 'MG')[0].uf, 'MG')
  assert.equal(m.buscarServicos('nada parecido aqui').length, 0)

  console.log(`Serviços: ${nomes.length} conhecidos, junções, erros de digitação e busca ok.`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
