// Amostras da página inicial (16/10/2026): rodízio de 10 questões (8 oficiais e 2 de OrtoQuestões
// Simulados) que o visitante responde ali mesmo. Confere que cada amostra é cópia fiel do acervo
// (enunciado, alternativas, gabarito e imagem), que nenhuma tem gabarito com alerta, que os
// porquês vêm do comentário e não repetem só a resposta, que as imagens existem e são leves, e
// que o rodízio passa por todas as dez antes de repetir (com ou sem armazenamento).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { existsSync, statSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.cwd()
const ler = async (p) => JSON.parse(await readFile(join(raiz, p), 'utf8'))
const resumo = await ler('src/dados/amostrasInicio.json')
const arquivos = (await readdir(join(raiz, 'src/dados/amostrasInicio'))).filter((n) => n.endsWith('.json')).sort()

assert.equal(resumo.length, 10, 'são 10 amostras no rodízio')
assert.deepEqual(arquivos, resumo.map((a) => `${a.id}.json`).sort(), 'um arquivo por amostra, sem sobras')
assert.equal(resumo.filter((a) => a.simulado).length, 2, '2 de OrtoQuestões Simulados')
assert.equal(resumo.filter((a) => !a.simulado).length, 8, '8 oficiais')
assert.equal(new Set(resumo.map((a) => a.id.replace(/-\d+$/, ''))).size >= 7, true, 'áreas variadas (pelo menos 7 temas)')

const indice = await ler('public/acervo/indice.json')
const temas = Object.fromEntries(indice.temas.map((t) => [t.slug, t]))
const cache = {}
const normal = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

for (const r of resumo) {
  const a = await ler(`src/dados/amostrasInicio/${r.id}.json`)
  assert.deepEqual({ id: a.id, origem: a.origem, simulado: a.simulado, tema: a.tema }, r, `${r.id}: resumo e arquivo batem`)
  const slug = a.temaSlug
  assert.equal(r.id.replace(/-\d+$/, ''), slug, `${r.id}: tema do id`)
  cache[slug] ??= { q: Object.fromEntries((await ler(`public/acervo/${temas[slug].arquivo}`)).questoes.map((q) => [q.id, q])), c: await ler(`public/acervo/comentarios/${slug}.json`) }
  const q = cache[slug].q[a.id]
  const c = cache[slug].c[a.id]
  assert.ok(q && c, `${a.id}: existe no acervo com comentário`)
  // Cópia fiel do acervo.
  assert.equal(a.enunciado, q.enunciado, `${a.id}: enunciado igual ao do acervo`)
  assert.equal(a.gabarito, q.gabarito, `${a.id}: gabarito igual ao do acervo`)
  assert.deepEqual(a.alternativas.map(({ letra, texto }) => ({ letra, texto })), q.alternativas.map(({ letra, texto }) => ({ letra, texto })), `${a.id}: alternativas iguais às do acervo`)
  assert.equal(a.tema, temas[slug].nome, `${a.id}: nome do tema`)
  assert.equal(a.origem, q.simulado ? 'OrtoQuestões Simulados' : `${q.prova} ${q.ano}`, `${a.id}: origem`)
  assert.equal(a.simulado, !!q.simulado)
  if (!q.simulado) assert.ok(['TEOT', 'TARO'].includes(q.prova), `${a.id}: oficial do TEOT ou do TARO`)
  // Critérios de vitrine.
  assert.ok(!q.anulada && !q.duplicataDe && !q.gabaritoBibliografia, `${a.id}: sem anulação, cópia ou gabarito da bibliografia`)
  assert.ok(!c.alerta && !c.provavel, `${a.id}: gabarito sem alerta`)
  assert.ok(c.conceito.length >= 1500 && c.conceito.includes('**'), `${a.id}: comentário enriquecido`)
  assert.ok(a.enunciado.length <= 240, `${a.id}: enunciado curto`)
  // Porquês: trechos do comentário (sem marcação), nunca só a resposta.
  const semMarca = (s) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ')
  for (const alt of a.alternativas) {
    const fonte = semMarca(alt.letra === a.gabarito ? c.correta : c.incorretas[alt.letra])
    assert.ok(alt.porque.length >= 40, `${a.id} ${alt.letra}: porquê com conteúdo`)
    assert.ok(fonte.includes(alt.porque), `${a.id} ${alt.letra}: porquê copiado do comentário`)
    assert.notEqual(normal(alt.porque).replace(/^[a-d] /, ''), normal(alt.texto), `${a.id} ${alt.letra}: porquê não repete só a alternativa`)
  }
  // Imagem: a do acervo, existente e leve.
  if (q.imagens?.length) {
    assert.equal(q.imagens.length, 1, `${a.id}: no máximo uma imagem`)
    assert.ok(a.imagem && a.imagem.arquivo === q.imagens[0].arquivo, `${a.id}: a imagem é a do acervo`)
    const caminho = join(raiz, 'public/imagens', a.imagem.arquivo)
    assert.ok(existsSync(caminho), `${a.id}: imagem existe`)
    assert.ok(statSync(caminho).size <= 150_000, `${a.id}: imagem leve`)
    assert.ok(a.imagem.largura > 0 && a.imagem.altura > 0, `${a.id}: imagem com tamanho (evita pulo de layout)`)
  } else assert.equal(a.imagem, null, `${a.id}: sem imagem`)
}

// Rodízio: passa por todas as dez antes de repetir; sem armazenamento, sorteia.
const pasta = await mkdtemp(join(raiz, 'node_modules', '.oq-amostras-'))
const saida = join(pasta, 'r.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/rodizioAmostras'`, resolveDir: raiz, loader: 'ts' }, outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const guardado = new Map()
  globalThis.localStorage = { getItem: (k) => guardado.get(k) ?? null, setItem: (k, v) => guardado.set(k, String(v)), removeItem: (k) => guardado.delete(k) }
  const m = await import(pathToFileURL(saida))
  const vistas = []
  for (let i = 0; i < 10; i++) vistas.push(m.proximaAmostraInicio().id)
  assert.equal(new Set(vistas).size, 10, `dez aberturas, dez amostras diferentes: ${vistas.join(', ')}`)
  const segundaVolta = []
  for (let i = 0; i < 10; i++) segundaVolta.push(m.proximaAmostraInicio().id)
  assert.deepEqual(segundaVolta, vistas, 'a segunda volta repete a mesma ordem')
  assert.equal(m.amostraDaVez().id, m.amostraDaVez().id, 'na mesma abertura a amostra não muda')
  globalThis.localStorage = { getItem() { throw new Error('sem armazenamento') }, setItem() { throw new Error('sem armazenamento') } }
  for (let i = 0; i < 20; i++) {
    const sorteada = m.proximaAmostraInicio().id
    assert.ok(resumo.some((a) => a.id === sorteada), `sem armazenamento, sorteia uma válida (veio ${sorteada})`)
  }
  const d = m.destinosDaAmostra({ id: 'mao-0102', temaSlug: 'mao', subtema: 'Neuropatia ulnar e outras compressões', simulado: false })
  assert.ok(d.comentario.startsWith('/conta?modo=criar&voltar=') && decodeURIComponent(d.comentario.split('voltar=')[1]) === '/questao/mao-0102', 'comentário completo leva a criar conta e volta para a questão')
  assert.ok(decodeURIComponent(d.maisComoEsta.split('voltar=')[1]).startsWith('/treinar?temas=mao&subtemas='), 'mais questões leva a criar conta e volta para o treino do tema')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
console.log(`amostras da página inicial: ${resumo.length} questões conferidas com o acervo, rodízio ok`)
