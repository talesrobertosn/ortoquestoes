// Sorteia as questões de uma edição do Simulado Nacional a partir do acervo em
// public/acervo e imprime o SQL que a publica (o mesmo sorteio do painel).
// Uso: node scripts/gerar_simulado_nacional.mjs 2026-10 [--abre-agora]
import { build } from 'esbuild'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const edicao = process.argv[2]
if (!/^\d{4}-\d{2}$/.test(edicao ?? '')) { console.error('Informe a edição, ex.: 2026-10'); process.exit(1) }
const abreAgora = process.argv.includes('--abre-agora')

const saida = join(tmpdir(), `simulado-nacional-${process.pid}.mjs`)
await build({ entryPoints: ['src/dados/simuladoNacional.ts'], outfile: saida, bundle: true, format: 'esm', platform: 'node', logLevel: 'warning' })
const { escolherEdicao, fimDaEdicao, QUESTOES_EDICAO, DURACAO_EDICAO_MIN } = await import(saida)

const PROVAS = new Set(['TEOT/TARO', 'TEOT', 'TARO'])
const indice = JSON.parse(readFileSync('public/acervo/indice.json', 'utf8'))
const elegiveis = new Map(indice.questoes
  .filter((q) => !q.dup && q.an !== 1 && q.sim !== 1 && q.p !== null && PROVAS.has(indice.provas[q.p]))
  .map((q) => [q.id, indice.temas[q.t]]))

const candidatas = []
for (const tema of indice.temas) {
  const { questoes } = JSON.parse(readFileSync(`public/acervo/${tema.arquivo}`, 'utf8'))
  for (const q of questoes) {
    if (!elegiveis.has(q.id) || q.anulada || q.figuraPendente || !/^[A-E]$/.test(q.gabarito ?? '')) continue
    candidatas.push({ id: q.id, tema: tema.nome, gabarito: q.gabarito })
  }
}
const itens = escolherEdicao(candidatas, edicao, QUESTOES_EDICAO)
const [ano, mes] = edicao.split('-').map(Number)
const nomeMes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][mes - 1]
const titulo = `Simulado Nacional · ${nomeMes[0].toUpperCase() + nomeMes.slice(1)} de ${ano}`
const abre = abreAgora ? 'now()' : `'${ano}-${String(mes).padStart(2, '0')}-01T03:00:00Z'`
const q = (t) => `'${String(t).replace(/'/g, "''")}'`

console.log(`-- ${titulo}: ${itens.length} questões de ${candidatas.length} elegíveis.`)
console.log(`insert into public.simulado_edicoes (edicao, titulo, abre_em, fecha_em, duracao_min)`)
console.log(`values (${q(edicao)}, ${q(titulo)}, ${abre}, ${q(fimDaEdicao(edicao))}, ${DURACAO_EDICAO_MIN})`)
console.log(`on conflict (edicao) do nothing;`)
console.log(`insert into public.simulado_itens (edicao, ordem, id_questao, gabarito, tema)`)
console.log(`select ${q(edicao)}, x.ordem, x.id, x.gabarito, x.tema from (values`)
console.log(itens.map((it, i) => `  (${i + 1}, ${q(it.id)}, ${q(it.gabarito)}, ${q(it.tema)})`).join(',\n'))
console.log(`) as x(ordem, id, gabarito, tema)`)
console.log(`where not exists (select 1 from public.simulado_itens i where i.edicao = ${q(edicao)});`)
