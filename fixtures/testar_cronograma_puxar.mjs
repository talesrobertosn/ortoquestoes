// Puxar as questões de um dia (pedido do Tales, 19/10/2026): "Se eu clico no dia 20, puxo as questões do
// dia 20; depois quero as do dia 21, posso puxar as do 21, e as do dia 20 continuam lá para fazer depois —
// não perco o dia 20. E quando eu termino o dia 19 (hoje), aparece ali embaixo 'Puxar questões do dia 20'."
// Prova, com o acervo real:
// 1. puxar o dia 20 guarda as questões dele; fazer 8 delas hoje conta para o dia 20, não para a meta de hoje;
// 2. o plano não espalha essas questões por outros dias, e a sessão de hoje não as usa;
// 3. puxar o dia 21 depois: o dia 20 continua com as que faltam;
// 4. quando o dia 20 chega, a meta dele é o que faltou ("era 77, adiantou 8");
// 5. terminou hoje: o próximo dia de estudo (pulando a folga) aparece para puxar, com o número certo;
// 6. o "Sobrou energia? Adiante" (contagem) continua valendo junto com um dia puxado;
// 7. o registro é pequeno e se limpa sozinho.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/planoEstudo'; export * from './src/dados/frasesAdiantar'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))

  // Instantes em São Paulo (UTC−3), seja qual for o fuso da máquina.
  const sp = (dia, hora = 12, min = 0) => { const [a, mes, d] = dia.split('-').map(Number); return Date.UTC(a, mes - 1, d, hora + 3, min) }
  const criado = new Date(sp('2026-10-06', 9)).toISOString()
  const plano = (opcoes = {}) => ({ data_prova: '2027-01-10', intensidade: 'firme', folgas: [0], prova: 'TEOT', base_respondidas: 0, criado_em: criado, incluir_simulados: true, opcoes })
  const responder = (ids, quando, base = {}) => { const r = { ...base }; ids.forEach((id, k) => { const em = quando + k * 1000; r[id] = { c: true, q: em, historico: [{ em, correta: true }] } }); return r }
  const chave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const diaDe = (c, k) => c.dias.find((d) => chave(d.data) === k)
  const idsDe = (d) => d.itens.flatMap((i) => i.ids)
  const agendadas = (c) => c.dias.reduce((s, d) => s + d.total, 0)
  const coerente = (c, rotulo) => {
    const ids = c.dias.flatMap(idsDe)
    assert.equal(new Set(ids).size, ids.length, `${rotulo}: questão repetida no plano`)
    assert.equal(agendadas(c), c.restante, `${rotulo}: o plano deveria agendar exatamente o que falta`)
    assert.equal(c.projecao.cortadas, 0, `${rotulo}: o plano cortou questões`)
  }
  const HOJE = '2026-10-19', D20 = '2026-10-20', D21 = '2026-10-21', D22 = '2026-10-22'

  const base = m.calcularPlano(indice, {}, plano(), sp(HOJE, 9))
  const meta = base.metaDiaria
  const dia20 = diaDe(base, D20)
  assert.ok(dia20.total > 20 && meta > 20, 'plano de teste com metas normais')
  assert.equal(dia20.puxado ?? null, null, 'sem puxar, o dia não está puxado')

  // ── 1. Puxar o dia 20 e fazer 8 hoje ──
  const ids20 = m.idsParaPuxar(base, D20)
  assert.deepEqual(new Set(ids20), new Set(idsDe(dia20)), 'puxar leva exatamente as questões do dia 20')
  const op20 = m.opcoesComPuxado(plano(), D20, ids20, HOJE)
  assert.deepEqual(op20.puxados, { [D20]: ids20 })
  const r1 = responder(ids20.slice(0, 8), sp(HOJE, 10))
  const c1 = m.calcularPlano(indice, r1, plano(op20), sp(HOJE, 11))
  assert.equal(c1.metaDiaria, meta, 'a meta de hoje não muda')
  assert.equal(c1.feitasHoje, 0, 'as 8 do dia 20 não contam para hoje')
  assert.equal(c1.extraHoje, 0, 'nem viram "adiantadas" de hoje')
  assert.equal(c1.faltaHoje, meta)
  const d20 = diaDe(c1, D20)
  assert.deepEqual(d20.puxado, { total: ids20.length, feitas: 8 }, 'o dia 20 mostra "8 de 77 feitas"')
  assert.equal(d20.total, ids20.length - 8, 'faltam 69 no dia 20')
  assert.deepEqual(new Set(idsDe(d20)), new Set(ids20.slice(8)), 'o dia 20 fica com as que faltam dele, e só elas')
  // ── 2. O plano não espalha as questões do dia 20, e a sessão de hoje não as usa ──
  const fora = c1.dias.filter((d) => chave(d.data) !== D20).flatMap(idsDe)
  assert.ok(!fora.some((id) => ids20.includes(id)), 'questão do dia 20 apareceu noutro dia')
  assert.ok(ids20.slice(8).every((id) => c1.reservados.includes(id)), 'as que faltam do dia 20 ficam reservadas')
  const sessaoHoje = m.idsDoDiaPlano(indice, c1.hoje.itens, { ...r1, ...m.marcarReservadas(c1) }, true, () => 0.5)
  assert.ok(!sessaoHoje.some((id) => ids20.includes(id)), 'a sessão de hoje usou uma questão do dia 20')
  const sessao20 = m.idsDaSessaoDoDia(d20, r1)
  assert.deepEqual(new Set(sessao20), new Set(ids20.slice(8)), 'a sessão do dia 20 é o que falta dele')
  assert.equal(sessao20.length, ids20.length - 8)
  coerente(c1, 'dia 20 puxado')
  // Puxar de novo o mesmo dia não troca as questões.
  assert.deepEqual(m.idsParaPuxar(c1, D20), ids20)
  assert.equal(m.opcoesComPuxado(plano(op20), D20, ids20, HOJE), null, 'puxar de novo não grava nada')

  // ── 3. Puxar o dia 21 depois: o dia 20 continua lá ──
  const ids21 = m.idsParaPuxar(c1, D21)
  assert.ok(ids21.length > 0 && !ids21.some((id) => ids20.includes(id)))
  const op21 = m.opcoesComPuxado(plano(op20), D21, ids21, HOJE)
  assert.deepEqual(Object.keys(op21.puxados).sort(), [D20, D21])
  const r2 = responder(ids21.slice(0, 5), sp(HOJE, 12), r1)
  const c2 = m.calcularPlano(indice, r2, plano(op21), sp(HOJE, 13))
  assert.equal(c2.metaDiaria, meta); assert.equal(c2.feitasHoje, 0)
  assert.deepEqual(diaDe(c2, D20).puxado, { total: ids20.length, feitas: 8 })
  assert.deepEqual(new Set(idsDe(diaDe(c2, D20))), new Set(ids20.slice(8)), 'o dia 20 não perdeu nada')
  assert.deepEqual(diaDe(c2, D21).puxado, { total: ids21.length, feitas: 5 })
  assert.deepEqual(new Set(idsDe(diaDe(c2, D21))), new Set(ids21.slice(5)))
  coerente(c2, 'dias 20 e 21 puxados')

  // ── 4. O dia 20 chega: a meta é o que faltou ──
  const no20 = m.calcularPlano(indice, r2, plano(op21), sp(D20, 9))
  assert.equal(no20.metaHojeSemAdiantar, ids20.length, 'era 77')
  assert.equal(no20.adiantadoHoje, 8, 'adiantou 8')
  assert.equal(no20.metaDiaria, ids20.length - 8, 'hoje faltam 69')
  assert.deepEqual(new Set(idsDe(no20.dias[0])), new Set(ids20.slice(8)), 'a sessão do dia 20 é a que ficou guardada')
  assert.deepEqual(diaDe(no20, D21).puxado, { total: ids21.length, feitas: 5 }, 'o dia 21 segue puxado')
  coerente(no20, 'no dia 20')

  // ── 5. Terminou hoje: o próximo dia para puxar ──
  assert.equal(m.proximoDiaParaPuxar(base), null, 'com a meta de hoje aberta, não oferece')
  const rFeito = responder(idsDe(base.dias[0]), sp(HOJE, 14))
  const feito = m.calcularPlano(indice, rFeito, plano(), sp(HOJE, 15))
  assert.equal(feito.faltaHoje, 0)
  const prox = m.proximoDiaParaPuxar(feito)
  assert.equal(chave(prox.data), D20, 'oferece o dia 20')
  assert.equal(prox.total, diaDe(feito, D20).total)
  assert.equal(prox.puxado ?? null, null)
  // Com o dia 20 já começado: oferece continuar o 20, com o que falta.
  const rFeito2 = responder(idsDe(c1.dias[0]), sp(HOJE, 14), r1)
  const feito2 = m.calcularPlano(indice, rFeito2, plano(op20), sp(HOJE, 15))
  assert.equal(feito2.faltaHoje, 0, 'a meta de hoje fecha com as questões de hoje')
  const prox2 = m.proximoDiaParaPuxar(feito2)
  assert.equal(chave(prox2.data), D20); assert.equal(prox2.total, ids20.length - 8); assert.equal(prox2.puxado.feitas, 8)
  // Dia 20 todo feito: oferece o 21.
  const rTodo = responder(ids20.slice(8), sp(HOJE, 16), rFeito2)
  const feito3 = m.calcularPlano(indice, rTodo, plano(op20), sp(HOJE, 17))
  assert.equal(diaDe(feito3, D20).total, 0)
  assert.equal(chave(m.proximoDiaParaPuxar(feito3).data), D21, 'dia 20 feito: o próximo é o 21')
  coerente(feito3, 'dia 20 todo feito')
  // Sábado feito: pula o domingo de folga e oferece a segunda.
  const SAB = '2026-10-24', SEG = '2026-10-26'
  const sab = m.calcularPlano(indice, {}, plano(), sp(SAB, 9))
  const sabFeito = m.calcularPlano(indice, responder(idsDe(sab.dias[0]), sp(SAB, 10)), plano(), sp(SAB, 11))
  assert.equal(chave(m.proximoDiaParaPuxar(sabFeito).data), SEG, 'a folga fica de fora')

  // ── 6. "Sobrou energia? Adiante" junto com um dia puxado ──
  // Meta de hoje feita + 10 a mais da fila (não do dia 20): as 10 saem do dia 21, e o dia 20 fica como está.
  const extra = idsDe(diaDe(c1, D22)).slice(0, 10)
  const r6 = responder([...idsDe(c1.dias[0]), ...extra], sp(HOJE, 14), r1)
  const c6 = m.calcularPlano(indice, r6, plano(op20), sp(HOJE, 15))
  assert.equal(c6.extraHoje, 10)
  assert.equal(diaDe(c6, D20).total, ids20.length - 8, 'o dia 20 puxado não muda')
  assert.equal(diaDe(c6, D21).adiantado, 10, 'o extra de hoje sai do dia 21')
  coerente(c6, 'extra com dia puxado')

  // As palavras dos botões: "Puxar as questões de amanhã (terça, 20/10)", "Continuar terça, 20/10 · faltam 69".
  assert.equal(m.diaCurto(prox.data), 'terça, 20/10')
  assert.deepEqual(m.textoPuxar(prox, sp(HOJE, 15)), { rotulo: 'Puxar as questões de amanhã (terça, 20/10)', detalhe: `${prox.total} questões` })
  assert.deepEqual(m.textoPuxar(prox2, sp(HOJE, 15)), { rotulo: 'Continuar terça, 20/10', detalhe: `faltam ${ids20.length - 8}` })
  assert.deepEqual(m.textoPuxar(m.proximoDiaParaPuxar(sabFeito), sp(SAB, 11)), { rotulo: 'Puxar as questões de segunda, 26/10', detalhe: `${m.proximoDiaParaPuxar(sabFeito).total} questões` })
  assert.equal(m.textoAdiantadoDia(diaDe(c1, D20)), `Adiantado · 8 de ${ids20.length}`)
  assert.equal(m.textoAdiantadoDia(diaDe(base, D20)), null)

  // ── 7. Registro pequeno, que se limpa ──
  const velho = m.opcoesComPuxado(plano({ puxados: { '2026-10-01': ['x'], [D20]: ids20 } }), D21, ids21, HOJE)
  assert.deepEqual(Object.keys(velho.puxados).sort(), [D20, D21], 'dias que já passaram saem do registro')
  // Folga ou reta final não se puxam; registro de um dia que já passou não pesa no plano.
  assert.equal(m.idsParaPuxar(base, '2026-10-25').length, 0, 'domingo de folga não tem o que puxar')
  const passado = m.calcularPlano(indice, r1, plano({ puxados: { '2026-10-17': ids20 } }), sp(HOJE, 11))
  assert.equal(passado.reservados.length, 0)
  coerente(passado, 'registro antigo')

  console.log(`Puxar um dia: ok (dia 20 com ${ids20.length} questões, 8 feitas antes; dia 21 com ${ids21.length}).`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
