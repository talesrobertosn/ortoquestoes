// Adiantar de ponta a ponta (pedido do Tales, 16/10/2026): "quem puxou questões do dia seguinte (ou dos
// dias seguintes) tem, no dia seguinte, menos questões para fazer, porque adiantou".
// Prova, com o acervo real:
// 1. adiantar pelo botão no dia D: em D+1 a meta cai exatamente o que foi adiantado;
// 2. fazer além da meta sem o botão também conta, mesmo sem registro gravado (a pessoa fechou o site);
// 3. adiantar vários dias: desconta na ordem dos dias, pulando a folga;
// 4. virada do dia em São Paulo (23h50 e 0h10), com o aparelho em fusos diferentes;
// 5. dois aparelhos: o registro gravado num vale no outro, e o outro chega ao mesmo número sem ele.
// Roda o roteiro uma vez em cada fuso (São Paulo, UTC, Tóquio, Los Angeles) em processos filhos.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const FUSOS = ['America/Sao_Paulo', 'UTC', 'Asia/Tokyo', 'America/Los_Angeles']

if (!process.env.OQ_FUSO_FILHO) {
  for (const fuso of FUSOS) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, TZ: fuso, OQ_FUSO_FILHO: '1' }, encoding: 'utf8' })
    if (r.status !== 0) { console.error(`Fuso ${fuso}:\n${r.stdout}\n${r.stderr}`); process.exit(1) }
  }
  console.log(`Adiantar de ponta a ponta: ok em ${FUSOS.length} fusos (botão, extra sem registro, vários dias, virada do dia, dois aparelhos).`)
  process.exit(0)
}

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/planoEstudo'; export { opcoesComAdiantamento } from './src/conta/cronograma'; export * from './src/dados/frasesAdiantar'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env': '{"BASE_URL":"/","DEV":false}' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))

  // Instantes em São Paulo (UTC−3, sem horário de verão desde 2019), seja qual for o fuso do aparelho.
  const sp = (dia, hora = 12, min = 0) => { const [a, mes, d] = dia.split('-').map(Number); return Date.UTC(a, mes - 1, d, hora + 3, min) }
  const criado = new Date(sp('2026-10-06', 9)).toISOString()
  const plano = (opcoes = {}) => ({ data_prova: '2027-01-10', intensidade: 'firme', folgas: [0], prova: 'TEOT', base_respondidas: 0, criado_em: criado, incluir_simulados: true, opcoes })
  const responder = (ids, quando, base = {}) => { const r = { ...base }; ids.forEach((id, k) => { const em = quando + k * 1000; r[id] = { c: true, q: em, historico: [{ em, correta: true }] } }); return r }
  const chave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const diaDe = (c, k) => c.dias.find((d) => chave(d.data) === k)
  const fila = (c, n) => c.dias.flatMap((d) => d.itens.flatMap((i) => i.ids)).slice(0, n)
  const agendadas = (c) => c.dias.reduce((s, d) => s + d.total, 0)
  const coerente = (c, rotulo) => {
    const ids = c.dias.flatMap((d) => d.itens.flatMap((i) => i.ids))
    assert.equal(new Set(ids).size, ids.length, `${rotulo}: questão repetida`)
    assert.equal(agendadas(c), c.restante, `${rotulo}: o plano deveria agendar exatamente o que falta`)
  }

  // Quarta 14/10 (D) e quinta 15/10 (D+1).
  const D = '2026-10-14', D1 = '2026-10-15'
  const antes = m.calcularPlano(indice, {}, plano(), sp(D, 8))
  const M = antes.metaDiaria
  const previstaD1 = diaDe(antes, D1).meta
  assert.ok(M > 30 && previstaD1 > 30, 'plano de teste com metas normais')

  // ── 1. Botão "adiantar +30" em D, feito em D ──
  const regBotao = m.opcoesComAdiantamento(plano(), antes, 30, sp(D, 10))
  assert.deepEqual(regBotao.adiantados, [{ em: D, meta: M, pedido: 30 }], 'o registro de hoje leva a meta e o pedido')
  const comPedido = m.calcularPlano(indice, {}, plano(regBotao), sp(D, 10))
  assert.equal(comPedido.dias[0].total, M + 30, 'a sessão de hoje leva as 30 adiantadas')
  assert.equal(diaDe(comPedido, D1).meta, previstaD1 - 30, 'amanhã já aparece com 30 a menos')
  const r1 = responder(fila(comPedido, M + 30), sp(D, 14))
  const fimD = m.calcularPlano(indice, r1, plano(regBotao), sp(D, 22))
  assert.equal(fimD.faltaHoje, 0); assert.equal(fimD.extraHoje, 30); assert.equal(fimD.adiantarFalta, 0)
  assert.equal(fimD.amanha.meta, previstaD1 - 30); assert.equal(fimD.amanha.adiantado, 30)
  const noD1 = m.calcularPlano(indice, r1, plano(regBotao), sp(D1, 8))
  assert.equal(noD1.adiantadoHoje, 30, 'em D+1 saem as 30 adiantadas')
  assert.equal(noD1.metaDiaria, noD1.metaHojeSemAdiantar - 30, 'em D+1 a meta cai exatamente 30')
  // O que foi mostrado ontem ("amanhã fica com X") é o que vale hoje; o arredondamento da meta normal só pode aliviar.
  assert.ok(noD1.metaDiaria <= fimD.amanha.meta && noD1.metaDiaria >= fimD.amanha.meta - 1, `meta de D+1 (${noD1.metaDiaria}) diferente da mostrada em D (${fimD.amanha.meta})`)
  assert.ok(noD1.metaHojeSemAdiantar <= previstaD1 && noD1.metaHojeSemAdiantar >= previstaD1 - 1)
  coerente(noD1, 'botão')
  // A interface diz a regra com os números.
  assert.match(m.fraseAdiantado(fimD), new RegExp(`^Você adiantou 30 questões; .+ sua meta é ${previstaD1 - 30} \\(era ${previstaD1}\\)\\.$`))
  assert.equal(m.fraseAdiantadoHoje(noD1), `Você adiantou 30 questões de hoje; hoje sua meta é ${noD1.metaDiaria} (era ${noD1.metaHojeSemAdiantar}).`)
  assert.match(m.fraseAdiantado(comPedido), /^Você está adiantando 30 questões;/)

  // ── 2. Além da meta sem o botão, sem registro gravado (fechou o site no fim da sessão) ──
  const semRegistro = m.calcularPlano(indice, r1, plano(), sp(D1, 8))
  assert.equal(semRegistro.adiantadoHoje, 30, 'o extra de ontem conta mesmo sem registro')
  assert.equal(semRegistro.metaDiaria, noD1.metaDiaria, 'com e sem registro, a mesma meta')
  coerente(semRegistro, 'sem registro')
  // Com o registro gravado sozinho pela tela (sem pedido), igual.
  const regAuto = m.opcoesComAdiantamento(plano(), m.calcularPlano(indice, r1, plano(), sp(D, 22)), undefined, sp(D, 22))
  assert.deepEqual(regAuto.adiantados, [{ em: D, meta: M }])
  assert.equal(m.calcularPlano(indice, r1, plano(regAuto), sp(D1, 8)).metaDiaria, noD1.metaDiaria)
  // Fez menos que a meta: nada é adiantado e o atraso não vira "adiantado".
  const pouco = m.calcularPlano(indice, responder(fila(antes, M - 10), sp(D, 14)), plano(), sp(D1, 8))
  assert.equal(pouco.adiantadoHoje, 0)

  // ── 3. Vários dias, na ordem, pulando a folga (domingo) ──
  // Sexta 16/10: adiantar "2 dias" = sábado inteiro + segunda inteira (domingo é folga).
  const SEX = '2026-10-16', SAB = '2026-10-17', DOM = '2026-10-18', SEG = '2026-10-19', TER = '2026-10-20'
  const naSexta = m.calcularPlano(indice, {}, plano(), sp(SEX, 8))
  const [p1, p2] = naSexta.dias.slice(1).filter((d) => d.meta > 0)
  assert.equal(chave(p1.data), SAB); assert.equal(chave(p2.data), SEG, 'o domingo de folga fica de fora')
  const dois = p1.meta + p2.meta
  const regDois = m.opcoesComAdiantamento(plano(), naSexta, dois, sp(SEX, 9))
  const sexta2 = m.calcularPlano(indice, {}, plano(regDois), sp(SEX, 9))
  assert.equal(diaDe(sexta2, SAB).total, 0); assert.equal(diaDe(sexta2, SEG).total, 0)
  assert.equal(diaDe(sexta2, DOM).adiantado, 0, 'nada sai da folga')
  const rDois = responder(fila(sexta2, naSexta.metaDiaria + dois), sp(SEX, 13))
  const sabado = m.calcularPlano(indice, rDois, plano(regDois), sp(SAB, 9))
  assert.equal(sabado.metaDiaria, 0, 'sábado fica livre'); assert.equal(sabado.adiantadoHoje, sabado.metaHojeSemAdiantar)
  assert.equal(diaDe(sabado, SEG).total, 0, 'segunda também, porque foi adiantada')
  const segunda = m.calcularPlano(indice, rDois, plano(regDois), sp(SEG, 9))
  assert.equal(segunda.metaDiaria, 0, 'segunda livre (o sábado ficou sem estudo e mesmo assim não volta)')
  const terca = m.calcularPlano(indice, rDois, plano(regDois), sp(TER, 9))
  assert.equal(terca.adiantadoHoje, 0, 'terça volta ao normal'); assert.ok(terca.metaDiaria > 30)
  // Adiantou 1 dia e 10: sábado livre, segunda com 10 a menos (desconta em ordem).
  const rMeio = responder(fila(naSexta, naSexta.metaDiaria + p1.meta + 10), sp(SEX, 13))
  const sabMeio = m.calcularPlano(indice, rMeio, plano(), sp(SAB, 9))
  assert.equal(sabMeio.metaDiaria, 0)
  assert.equal(diaDe(sabMeio, SEG).adiantado, 10)
  const segMeio = m.calcularPlano(indice, rMeio, plano(), sp(SEG, 9))
  assert.equal(segMeio.adiantadoHoje, 10); assert.equal(segMeio.metaDiaria, segMeio.metaHojeSemAdiantar - 10)
  coerente(segMeio, 'vários dias')

  // ── 4. Virada do dia em São Paulo ──
  // 23h50 de D conta para D (mesmo com o aparelho em Tóquio, já no dia seguinte); 0h10 de D+1 conta para D+1.
  const rNoite = responder(fila(antes, M + 12), sp(D, 23, 50) - (M + 12) * 1000 + 1000)
  const quaseMeiaNoite = m.calcularPlano(indice, rNoite, plano(), sp(D, 23, 58))
  assert.equal(quaseMeiaNoite.feitasHoje, M + 12); assert.equal(quaseMeiaNoite.extraHoje, 12)
  assert.equal(m.opcoesComAdiantamento(plano(), quaseMeiaNoite, undefined, sp(D, 23, 58)).adiantados[0].em, D, 'o registro das 23h58 é de D')
  const madrugada = m.calcularPlano(indice, rNoite, plano(), sp(D1, 0, 5))
  assert.equal(madrugada.feitasHoje, 0); assert.equal(madrugada.adiantadoHoje, 12, 'à 0h05 de D+1 as 12 a mais já saem')
  const rMadrugada = responder(fila(madrugada, 5), sp(D1, 0, 10), rNoite)
  const depois = m.calcularPlano(indice, rMadrugada, plano(), sp(D1, 0, 20))
  assert.equal(depois.feitasHoje, 5, 'a 0h10 de D+1 conta para D+1')
  assert.equal(depois.adiantadoHoje, 12)

  // ── 5. Dois aparelhos ──
  // MacBook faz M + 20 em D e grava o registro; o computador recebe as respostas pela sincronização.
  const rMac = responder(fila(antes, M + 20), sp(D, 15))
  const noMac = m.calcularPlano(indice, rMac, plano(), sp(D, 16))
  const servidor = plano(m.opcoesComAdiantamento(plano(), noMac, undefined, sp(D, 16)))
  // O computador, ainda sem as últimas respostas, vê a meta pela metade mas não apaga o registro (só grava com extra).
  const noPcAtrasado = m.calcularPlano(indice, responder(fila(antes, 10), sp(D, 15)), servidor, sp(D, 16))
  assert.equal(noPcAtrasado.extraHoje, 0)
  // Depois de sincronizar, os dois mostram o mesmo hoje e amanhã.
  const noPc = m.calcularPlano(indice, { ...rMac }, servidor, sp(D, 17))
  assert.equal(noPc.amanha.meta, noMac.amanha.meta); assert.equal(noPc.extraHoje, 20)
  // Em D+1, o computador (com o registro) e um celular que nunca viu o registro chegam à mesma meta.
  const pcD1 = m.calcularPlano(indice, rMac, servidor, sp(D1, 8))
  const celularD1 = m.calcularPlano(indice, rMac, plano(), sp(D1, 8))
  assert.equal(pcD1.adiantadoHoje, 20); assert.equal(celularD1.adiantadoHoje, 20)
  assert.equal(pcD1.metaDiaria, celularD1.metaDiaria)
  // Gravar de novo em outro aparelho não muda nada (o registro só sobe a meta).
  assert.equal(m.opcoesComAdiantamento(servidor, noPc, undefined, sp(D, 17)), null)

  console.log(`ok (${process.env.TZ})`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
