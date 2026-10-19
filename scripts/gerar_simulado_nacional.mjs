// Sorteia uma edição mensal do Simulado Nacional 2.0 a partir do acervo em
// public/acervo, com o mesmo sorteio e os mesmos filtros do painel
// (src/dados/simuladoNacional.ts), e imprime os itens em JSON e a chamada SQL
// `select sn_admin_salvar(...)` que grava a edição (parte 32).
//
// Uso: node scripts/gerar_simulado_nacional.mjs 2026-10 [--abre-agora] [--usadas arquivo.json] [--rascunho] [--so-json]
//        [--total 50] [--peso-recentes 2] [--nivel-alto 60]
//   --abre-agora   abre em now() em vez do dia 1º às 00:00 de São Paulo
//   --usadas       JSON com os ids já usados: ["mao-0001", ...] ou [{ "id_questao": "..." }, ...]
//                  (ficam de fora e só entram se faltar questão)
//   --rascunho     grava sem publicar (p_publicar = false)
//   --so-json      imprime só o JSON dos itens
//   --total        quantas questões (padrão 50, de 10 a 200)
//   --peso-recentes peso das provas dos últimos 5 anos (padrão 2)
//   --nivel-alto   % de cada área nos assuntos de nível 3–4 (padrão 60)
// A distribuição por área vai para a saída de erro, para conferir sem sujar o SQL.
import { build } from 'esbuild'
import { readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const args = process.argv.slice(2)
const edicao = args[0]
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(edicao ?? '')) {
  console.error('Uso: node scripts/gerar_simulado_nacional.mjs AAAA-MM [--abre-agora] [--usadas arquivo.json] [--rascunho] [--so-json] [--total N] [--peso-recentes N] [--nivel-alto PCT]')
  process.exit(1)
}
const abreAgora = args.includes('--abre-agora')
const rascunho = args.includes('--rascunho')
const soJson = args.includes('--so-json')
/** Valor numérico de uma opção, conferido entre min e max. */
function numero(nome, min, max) {
  const i = args.indexOf(nome)
  if (i < 0) return undefined
  const n = Number(args[i + 1])
  if (!Number.isFinite(n) || n < min || n > max) { console.error(`${nome} precisa de um número entre ${min} e ${max}`); process.exit(1) }
  return n
}
const totalPedido = numero('--total', 10, 200)
const pesoRecentes = numero('--peso-recentes', 1, 10)
const nivelAltoPct = numero('--nivel-alto', 0, 100)
const iUsadas = args.indexOf('--usadas')
let usadas = new Set()
if (iUsadas >= 0) {
  const caminho = args[iUsadas + 1]
  if (!caminho) { console.error('--usadas precisa do caminho de um arquivo JSON'); process.exit(1) }
  const lista = JSON.parse(readFileSync(caminho, 'utf8'))
  usadas = new Set((Array.isArray(lista) ? lista : []).map((x) => (typeof x === 'string' ? x : x.id_questao ?? x.id)).filter(Boolean))
}

const saida = join(tmpdir(), `simulado-nacional-${process.pid}.mjs`)
await build({ entryPoints: ['src/dados/simuladoNacional.ts'], outfile: saida, bundle: true, format: 'esm', platform: 'node', logLevel: 'warning' })
const sn = await import(saida)
rmSync(saida, { force: true })

// O índice não tem gabarito nem alternativas: vêm dos arquivos dos temas,
// já sem as anuladas e as com figura pendente (o mesmo que o painel faz).
const indice = JSON.parse(readFileSync('public/acervo/indice.json', 'utf8'))
const gabarito = new Map()
const nAlt = new Map()
for (const tema of indice.temas) {
  const { questoes } = JSON.parse(readFileSync(`public/acervo/${tema.arquivo}`, 'utf8'))
  for (const q of questoes) {
    if (q.anulada || q.figuraPendente) continue
    gabarito.set(q.id, q.gabarito)
    nAlt.set(q.id, Array.isArray(q.alternativas) ? q.alternativas.length : undefined)
  }
}
const candidatas = sn.candidatasDoIndice(indice, (id) => gabarito.get(id), (id) => nAlt.get(id))
const total = totalPedido === undefined ? sn.QUESTOES_MENSAL : Math.round(totalPedido)
const sorteados = sn.sortearEdicao(candidatas, edicao, { total, usadas, pesoRecentes, nivelAltoPct })
const cotas = sn.cotasPorArea(candidatas, total, { pesoRecentes })

const itens = sorteados.map((it) => ({
  ordem: it.ordem, id_questao: it.id, area: it.area, foco: it.foco,
  gabarito_original: it.gabarito, permutacao: it.permutacao,
}))

const [ano, mes] = edicao.split('-').map(Number)
const nomeMes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][mes - 1]
const titulo = `Simulado Nacional · ${nomeMes[0].toUpperCase() + nomeMes.slice(1)} de ${ano}`

// Conferência na saída de erro.
const repetidas = sorteados.filter((it) => usadas.has(it.id)).length
const porAno = new Map()
for (const it of sorteados) if (it.ano !== null) porAno.set(it.ano, (porAno.get(it.ano) ?? 0) + 1)
const [anoMaisComum, nAno] = [...porAno].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
console.error(`${titulo}: ${sorteados.length} questões de ${candidatas.length} candidatas${usadas.size ? `, ${repetidas} repetidas de ${usadas.size} usadas` : ''}.`)
console.error('Área                              Parte  Alvo  Sorteadas  Níveis 3–4')
for (const c of cotas) {
  const da = sorteados.filter((it) => it.area === c.area)
  console.error(`  ${c.area.padEnd(32)} ${c.pct.toFixed(1).padStart(5)}%  ${String(c.alvo).padStart(4)}  ${String(da.length).padStart(9)}  ${String(da.filter((it) => it.nivel >= 3).length).padStart(10)}`)
}
console.error(`Ano mais frequente: ${anoMaisComum} (${nAno} questões; teto ${Math.ceil(total / 3)}).`)

if (soJson) {
  console.log(JSON.stringify(itens, null, 2))
} else {
  const q = (t) => `'${String(t).replace(/'/g, "''")}'`
  const abre = abreAgora ? 'now()' : `${q(sn.inicioDoMes(edicao))}::timestamptz`
  console.log(`-- ${titulo}: ${itens.length} questões de ${candidatas.length} candidatas (parte 32).`)
  console.log(`-- Distribuição: ${cotas.map((c) => `${c.area} ${c.alvo}`).join(' · ')}`)
  console.log('select public.sn_admin_salvar(')
  console.log(`  ${q(edicao)}, 'mensal', ${q(titulo)},`)
  console.log(`  ${abre}, ${q(sn.fimDoMes(edicao))}::timestamptz, ${sn.DURACAO_MENSAL_MIN},`)
  console.log(`  ${q(JSON.stringify(itens, null, 2))}::jsonb,`)
  console.log(`  ${rascunho ? 'false' : 'true'}`)
  console.log(');')
}
