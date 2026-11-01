// Questões da tela de entrar (01/11/2026, scripts/gerar_amostras_acesso.py): confere que cada uma é cópia fiel do
// acervo (enunciado, alternativas, gabarito, prova e ano), sem gabarito com alerta nem anulada, com o porquê de cada
// alternativa, que o resumo bate com os arquivos e que o sorteio cobre muitas provas.
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const raiz = process.cwd()
const ler = async (p) => JSON.parse(await readFile(join(raiz, p), 'utf8'))
const resumo = await ler('src/dados/amostrasAcesso.json')
const arquivos = (await readdir(join(raiz, 'src/dados/amostrasAcesso'))).filter((n) => n.endsWith('.json')).sort()
assert.ok(resumo.length >= 40, 'pelo menos 40 questões no sorteio')
assert.deepEqual(arquivos, resumo.map((a) => `${a.id}.json`).sort(), 'um arquivo por questão, sem sobras')
assert.ok(new Set(resumo.map((a) => a.prova)).size >= 12, 'muitas provas diferentes')

const indice = await ler('public/acervo/indice.json')
const temas = Object.fromEntries(indice.temas.map((t) => [t.slug, t]))
const cache = {}
for (const r of resumo) {
  const a = await ler(`src/dados/amostrasAcesso/${r.id}.json`)
  assert.deepEqual({ id: a.id, origem: a.origem, prova: a.prova, tema: a.tema }, r, `${r.id}: resumo e arquivo batem`)
  cache[a.temaSlug] ??= { q: Object.fromEntries((await ler(`public/acervo/${temas[a.temaSlug].arquivo}`)).questoes.map((q) => [q.id, q])), c: await ler(`public/acervo/comentarios/${a.temaSlug}.json`) }
  const q = cache[a.temaSlug].q[a.id], c = cache[a.temaSlug].c[a.id]
  assert.ok(q && c, `${a.id}: existe no acervo com comentário`)
  assert.equal(a.enunciado, q.enunciado, `${a.id}: enunciado`)
  assert.equal(a.gabarito, q.gabarito, `${a.id}: gabarito`)
  assert.deepEqual(a.alternativas.map((x) => [x.letra, x.texto]), q.alternativas.map((x) => [x.letra, x.texto]), `${a.id}: alternativas`)
  assert.ok(!q.anulada && !c.alerta && !c.provavel, `${a.id}: sem anulação nem alerta`)
  const origem = q.simulado ? 'OrtoQuestões Simulados' : q.ano ? `${q.prova} ${q.ano}` : q.prova
  assert.equal(a.origem, origem, `${a.id}: prova e ano do acervo`)
  assert.ok(!a.origem.includes('None') && !a.origem.includes('undefined'), `${a.id}: origem legível`)
  assert.ok(a.alternativas.every((x) => x.porque && x.porque.length >= 40), `${a.id}: porquê de cada alternativa`)
}
console.log(`Questões da tela de entrar: ${resumo.length} questões de ${new Set(resumo.map((a) => a.prova)).size} provas, cópias fiéis do acervo.`)
