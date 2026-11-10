// Cronograma novo (10/11/2026): quem já tinha cronograma continua de onde estava, e as peças novas do
// roteiro do dia (resumos do dia pelos dados, erros dos dias anteriores, balanço de ontem, só TEOT).
//
// Parte 1 (migração): planos guardados nos formatos antigos (sem `incluir_simulados`, sem `opcoes`,
// `opcoes: null`, opções completas de antes da mudança e chaves desconhecidas) têm de dar EXATAMENTE os
// mesmos números de antes. Os números de referência foram gravados com o motor anterior à mudança
// (`node fixtures/testar_cronograma_roteiro.mjs --gravar`, rodado no commit da base) e ficam em
// fixtures/cronograma_formato_antigo.json. Não regrave esse arquivo para "consertar" o teste: se ele
// falhar, o motor mudou o andamento de quem já estava no plano.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const GRAVAR = process.argv.includes('--gravar')
const REFERENCIA = 'fixtures/cronograma_formato_antigo.json'
const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
const temRoteiro = existsSync('src/dados/cronogramaRoteiro.ts')
try {
  await build({ stdin: { contents: `export * from './src/dados/planoEstudo'\n${temRoteiro ? `export * from './src/dados/cronogramaRoteiro'` : ''}`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const DIA = 86_400_000
  const agora = new Date(2026, 10, 10, 9) // terça, 10/11/2026
  const criado = new Date(2026, 9, 20, 8) // três semanas antes
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(36) }

  // Respostas de uma pessoa de verdade, sempre as mesmas: 300 antes do plano, depois ~45 por dia de estudo
  // (domingo de folga), 68% de acerto, um dia fraco (12) e ontem pela metade (20).
  const elegiveis = indice.questoes.filter((q) => !q.dup && !q.ar && q.an !== 1)
  const respondidas = {}
  let k = 0
  const responder = (em, certa) => { const q = elegiveis[(k * 37) % elegiveis.length]; k++; if (respondidas[q.id]) return; respondidas[q.id] = { c: certa, q: em, historico: [{ em, correta: certa, confianca: certa ? 'seguro' : 'duvida' }] } }
  for (let i = 0; i < 300; i++) responder(criado.getTime() - 5 * DIA - i * 60_000, i % 3 !== 0)
  for (let d = new Date(criado); d < agora; d = new Date(d.getTime() + DIA)) {
    if (d.getDay() === 0) continue
    const ontem = iso(new Date(agora.getTime() - DIA)) === iso(d)
    const n = ontem ? 20 : d.getDate() === 28 ? 12 : 45
    for (let i = 0; i < n; i++) responder(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 20, 0).getTime() + i * 60_000, (k * 7) % 25 < 17)
  }
  const base = 300

  // Os formatos antigos do plano guardado (linha de planos_estudo como o servidor devolve).
  const comum = { data_prova: '2027-01-10', intensidade: 'firme', folgas: [0], prova: 'TEOT', base_respondidas: base, criado_em: criado.toISOString() }
  const seg = (d) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); return iso(s) }
  const planos = {
    'antes-dos-simulados': { ...comum },
    'opcoes-nulas': { ...comum, incluir_simulados: true, opcoes: null },
    'sem-simulados': { ...comum, incluir_simulados: false, opcoes: {} },
    'opcoes-de-outubro': { ...comum, intensidade: 'completo', folgas: [0, 6], incluir_simulados: true, opcoes: { diasLeves: [3], qtdLeve: 15, semanasDificeis: [seg(new Date(agora.getTime() + 7 * DIA))], comecarPor: 'joelho', dominadas: ['mao'], provaExtra: { nome: 'TARO', data: '2026-12-06' } } },
    'com-adiantados-e-marcas': { ...comum, intensidade: 'leve', incluir_simulados: true, opcoes: { adiantados: [{ em: iso(new Date(agora.getTime() - 3 * DIA)), meta: 30, pedido: 10 }], marcasDia: { em: iso(agora), resumao: ['trauma'], flashcards: true }, chaveQueNaoExisteMais: { qualquer: 1 } } },
  }
  // Um plano com um dia puxado: as questões presas a amanhã saem do próprio cálculo.
  const cPux = m.calcularPlano(indice, respondidas, planos['opcoes-nulas'], agora)
  const amanha = cPux.dias.slice(1).find((d) => d.tipo !== 'folga' && d.total > 0)
  planos['com-dia-puxado'] = { ...comum, incluir_simulados: true, opcoes: { puxados: { [iso(amanha.data)]: amanha.itens.flatMap((i) => i.ids) } } }

  const retrato = (plano) => {
    const c = m.calcularPlano(indice, respondidas, plano, agora)
    return {
      alvo: c.alvo, feitas: c.feitas, restante: c.restante, metaDiaria: c.metaDiaria, metaDiaNormal: c.metaDiaNormal, feitasHoje: c.feitasHoje, faltaHoje: c.faltaHoje,
      adiantadoHoje: c.adiantadoHoje, ritmo: c.ritmo, fase: c.fase, diasAteProva: c.diasAteProva, semanaNumero: c.semanaNumero, passadaAtual: c.passadaAtual,
      dias: c.dias.length, agendadas: c.dias.reduce((s, d) => s + d.total, 0),
      hoje: c.hoje ? { slug: c.hoje.slug, n: c.hoje.n, itens: c.hoje.itens.map((i) => `${i.slug}:${i.n}:${i.mistura ? 'm' : 'p'}`) } : null,
      // A ordem exata das questões dos 10 primeiros dias e o desenho do plano inteiro.
      primeirosDias: hash(c.dias.slice(0, 10).map((d) => `${iso(d.data)}|${d.tipo}|${d.meta}|${d.itens.map((i) => i.ids.join(',')).join(';')}`).join('\n')),
      planoInteiro: hash(c.dias.map((d) => `${iso(d.data)}|${d.tipo}|${d.meta}|${d.total}|${d.mini ? 1 : 0}|${d.itens.map((i) => `${i.slug}:${i.n}`).join(',')}`).join('\n')),
      projecao: `${c.projecao.alvoPct}/${c.projecao.maisCaiPct}/${c.projecao.cortadas}`,
    }
  }

  if (GRAVAR) {
    const saida = Object.fromEntries(Object.entries(planos).map(([nome, p]) => [nome, retrato(p)]))
    await writeFile(REFERENCIA, JSON.stringify({ gravadoEm: '2026-11-10', acervo: indice.questoes.length, planos: saida }, null, 1) + '\n')
    console.log(`referência gravada em ${REFERENCIA} (${Object.keys(saida).length} planos)`)
    process.exit(0)
  }

  // ── 1. Migração: o formato antigo dá os mesmos números ──
  const ref = JSON.parse(await readFile(REFERENCIA, 'utf8'))
  if (ref.acervo !== indice.questoes.length) {
    // O acervo cresce toda semana: com outro acervo os números mudam por causa das questões, não do motor.
    // Aí vale a comparação entre o plano antigo cru e o mesmo plano normalizado (abaixo), que não depende do acervo.
    console.log(`  (acervo mudou: ${ref.acervo} → ${indice.questoes.length}; referência absoluta pulada)`)
  } else {
    for (const [nome, p] of Object.entries(planos)) assert.deepEqual(retrato(p), ref.planos[nome], `o plano antigo "${nome}" mudou de andamento`)
  }
  for (const [nome, p] of Object.entries(planos)) {
    const normal = m.normalizarPlano(JSON.parse(JSON.stringify(p)))
    assert.deepEqual(retrato(normal), retrato(p), `normalizar mudou o andamento de "${nome}"`)
    assert.deepEqual(m.normalizarPlano(normal), normal, `normalizar não é estável em "${nome}"`)
    // Nada some: a data, a base, a criação e cada opção antiga continuam lá.
    for (const chave of ['data_prova', 'intensidade', 'prova', 'base_respondidas', 'criado_em']) assert.equal(normal[chave], p[chave], `${nome}: ${chave} mudou`)
    assert.deepEqual(normal.folgas, p.folgas)
    for (const [chave, valor] of Object.entries(p.opcoes ?? {})) assert.deepEqual(normal.opcoes[chave], valor, `${nome}: a opção ${chave} se perdeu`)
    // As funções novas nascem desligadas em plano antigo.
    assert.equal(m.soTeot(normal), false, `${nome}: "só TEOT" não pode vir ligado`)
    assert.equal(normal.opcoes?.diaErros ?? null, null)
  }
  // Linha estragada do servidor não derruba a página.
  assert.equal(m.normalizarPlano(null), null)
  assert.equal(m.normalizarPlano({ data_prova: 'x' }), null)
  const torto = m.normalizarPlano({ ...comum, folgas: null, intensidade: 'turbo', opcoes: 'texto', base_respondidas: '300' })
  assert.deepEqual([torto.folgas, torto.intensidade, torto.opcoes, torto.base_respondidas], [[], 'firme', null, 300])

  // ── 2. Só TEOT ──
  const iTeot = indice.provas.indexOf('TEOT')
  const planoTeot = { ...planos['opcoes-nulas'], opcoes: { soTeot: true } }
  const cT = m.calcularPlano(indice, respondidas, planoTeot, agora)
  const porId = new Map(indice.questoes.map((q) => [q.id, q]))
  const idsT = cT.dias.flatMap((d) => d.itens.flatMap((i) => i.ids))
  assert.ok(idsT.length > 100, 'o plano só TEOT ficou vazio')
  assert.ok(idsT.every((id) => porId.get(id).p === iTeot || porId.get(id).sim === 1), 'entrou questão de outra prova no plano só TEOT')
  assert.ok(idsT.some((id) => porId.get(id).p === iTeot))
  const semSim = m.calcularPlano(indice, respondidas, { ...planoTeot, incluir_simulados: false }, agora)
  assert.ok(semSim.dias.flatMap((d) => d.itens.flatMap((i) => i.ids)).every((id) => porId.get(id).p === iTeot), 'sem simulados, só TEOT de verdade')
  // O que a pessoa já fez do TEOT desde a criação continua contando; ligar não zera nem infla o andamento.
  const feitasTeot = Object.entries(respondidas).filter(([id, r]) => { const q = porId.get(id); return (q.p === iTeot || q.sim === 1) && r.q >= Date.parse(comum.criado_em) }).length
  assert.equal(cT.feitas, feitasTeot, 'andamento do TEOT desde a criação')
  assert.ok(cT.alvo > 0 && cT.alvo < cPux.alvo)
  // Desligar devolve o plano de antes, igualzinho.
  assert.deepEqual(retrato({ ...planoTeot, opcoes: { soTeot: false } }), retrato(planos['opcoes-nulas']))
  // A sessão do dia sai do mesmo recorte.
  const iT = m.indiceDoPlano(indice, planoTeot)
  assert.equal(m.indiceDoPlano(indice, planoTeot), iT, 'o recorte é guardado (mesmo objeto)')
  assert.equal(m.indiceDoPlano(indice, planos['opcoes-nulas']), indice)
  const sessao = m.idsDoDiaPlano(iT, cT.hoje.itens, respondidas, true, () => 0.5)
  assert.ok(sessao.length && sessao.every((id) => porId.get(id).p === iTeot || porId.get(id).sim === 1))

  // ── 3. Balanço de ontem: o que acontece quando o dia anterior não foi completado ──
  const b = m.balancoDiaAnterior(indice, respondidas, planos['opcoes-nulas'], agora)
  assert.equal(iso(b.data), '2026-11-09')
  assert.equal(b.feitas, 20)
  assert.ok(b.meta > 20 && b.faltou === b.meta - 20, 'ontem ficou abaixo da meta')
  // Nada se perde: o que faltou continua agendado (o plano agenda exatamente o que resta).
  assert.equal(cPux.dias.reduce((s, d) => s + d.total, 0) + cPux.projecao.cortadas, cPux.restante)
  // Segunda-feira olha para sábado (domingo é folga); plano criado hoje não tem dia anterior.
  const seg9 = m.balancoDiaAnterior(indice, respondidas, planos['opcoes-nulas'], new Date(2026, 10, 9, 9))
  assert.equal(iso(seg9.data), '2026-11-07')
  assert.equal(m.balancoDiaAnterior(indice, {}, { ...comum, criado_em: agora.toISOString() }, agora), null)

  // ── 4. Erros dos dias anteriores do cronograma ──
  const e = m.errosDoCronograma(indice, respondidas, planos['opcoes-nulas'], agora)
  const erradasNoPlano = Object.entries(respondidas).filter(([, r]) => r.c === false && r.q >= new Date(2026, 9, 27).getTime() && r.q < new Date(2026, 10, 10).getTime()).map(([id]) => id)
  assert.equal(e.pendentes.length, erradasNoPlano.length)
  assert.deepEqual([...e.pendentes].sort(), [...erradasNoPlano].sort())
  assert.equal(e.dias[0].chave, '2026-11-09', 'o dia mais recente vem primeiro')
  assert.ok(e.dias.every((d) => d.chave < '2026-11-10'), 'os erros de hoje não entram (são do dia em andamento)')
  assert.ok(e.dias.every((d, i) => i === 0 || d.chave < e.dias[i - 1].chave))
  assert.deepEqual(e.pendentes.slice(0, e.dias[0].pendentes.length), e.dias[0].pendentes, 'a fila começa pelos de ontem')
  // Refazer e acertar tira da fila; errar de novo mantém.
  const [refeita, erradaDeNovo] = e.dias[0].pendentes
  const depois = { ...respondidas,
    [refeita]: { ...respondidas[refeita], c: true, historico: [...respondidas[refeita].historico, { em: agora.getTime() - 1000, correta: true, confianca: 'seguro' }] },
    [erradaDeNovo]: { ...respondidas[erradaDeNovo], c: false, historico: [...respondidas[erradaDeNovo].historico, { em: agora.getTime() - 500, correta: false, confianca: 'duvida' }] } }
  const e2 = m.errosDoCronograma(indice, depois, planos['opcoes-nulas'], agora)
  assert.ok(!e2.pendentes.includes(refeita) && e2.pendentes.includes(erradaDeNovo))
  assert.equal(e2.resolvidos, e.resolvidos + 1)
  assert.equal(e2.dias[0].total, e.dias[0].total)
  // Registro antigo, sem histórico: vale a data e o resultado guardados.
  const antigo = { 'x': 1 }
  const idAntigo = elegiveis.find((q) => !respondidas[q.id]).id
  const e3 = m.errosDoCronograma(indice, { ...respondidas, [idAntigo]: { c: false, q: agora.getTime() - 2 * DIA } }, planos['opcoes-nulas'], agora)
  assert.ok(e3.pendentes.includes(idAntigo) && antigo)
  // Erro de antes do plano não é "erro do cronograma".
  assert.ok(!e.pendentes.some((id) => respondidas[id].q < Date.parse(comum.criado_em)))
  // A sessão de erros tem tamanho máximo e começa pelos mais recentes.
  assert.deepEqual(m.idsRevanche(e, 5), e.pendentes.slice(0, 5))

  // ── 5. Resumos do dia: saem dos dados da Biblioteca ──
  const biblioteca = JSON.parse(await readFile('public/biblioteca/indice.json', 'utf8'))
  const nomeSub = (id) => porId.get(id).s.map((s) => indice.subtemas[s])
  // Um dia de lesões fisárias e de espondilólise: os resumos desses temas aparecem.
  const alvoRes = ['rockwoodcriancas10-02-consolidacao-fise', 'campbell15-espondilolistese'].map((id) => biblioteca.capitulos.find((c2) => c2.id === id)).filter(Boolean)
  assert.equal(alvoRes.length, 2, 'a Biblioteca deveria ter resumo de lesões fisárias e de espondilólise')
  const idsDia = alvoRes.flatMap((c2) => c2.questoes.filter((id) => porId.has(id)).slice(0, 12))
  const doDia = m.resumosDoDia(biblioteca, indice, idsDia)
  assert.ok(doDia.length >= 2 && doDia.length <= 3, 'no máximo 3 resumos')
  for (const c2 of alvoRes) assert.ok(doDia.some((r) => r.resumo.id === c2.id), `faltou o resumo ${c2.id} no dia dele`)
  assert.ok(doDia.every((r, i) => i === 0 || r.pontos <= doDia[i - 1].pontos), 'do mais próximo para o menos')
  assert.ok(doDia.every((r) => r.questoes > 0 || r.assuntos.length > 0), 'todo resumo sugerido tem um motivo nos dados')
  // Resumo novo aparece sozinho: basta entrar no índice citando as questões do dia.
  const idsSem = elegiveis.filter((q) => !biblioteca.capitulos.some((c2) => c2.questoes.includes(q.id) || c2.treino.includes(q.id))).slice(0, 8).map((q) => q.id)
  const novo = { id: 'resumo-novo-de-teste', versao: 1, titulo: 'Novo', especialidade: 'trauma', livro: 'L', edicao: '1', capitulo: 'C', resumo: '', acesso: 'assinante', minutos: 10, secoes: [], questoes: idsSem.slice(0, 6), treino: [], subtemas: [] }
  const comNovo = m.resumosDoDia({ ...biblioteca, capitulos: [...biblioteca.capitulos, novo] }, indice, idsSem)
  assert.equal(comNovo[0].resumo.id, 'resumo-novo-de-teste')
  assert.equal(comNovo[0].questoes, 6)
  // Só pelo subtema (resumo que ainda não cita as questões novas do tema).
  const subs = [...new Set(idsSem.flatMap(nomeSub))]
  const porSub = m.resumosDoDia({ geradoEm: '', capitulos: [{ ...novo, questoes: [], subtemas: subs.slice(0, 1) }] }, indice, idsSem)
  assert.equal(porSub.length, 1)
  assert.ok(porSub[0].assuntos.includes(subs[0]))
  // Tema sem resumo, Biblioteca ainda carregando ou dia sem questões: lista vazia, sem erro.
  assert.deepEqual(m.resumosDoDia({ geradoEm: '', capitulos: [] }, indice, idsDia), [])
  assert.deepEqual(m.resumosDoDia(null, indice, idsDia), [])
  assert.deepEqual(m.resumosDoDia(biblioteca, indice, []), [])
  // Todo dia de um plano de verdade recebe sugestão (os 284 temas que mais caem têm resumo).
  const comResumo = cPux.dias.filter((d) => d.total > 0).slice(0, 30).map((d) => m.resumosDoDia(biblioteca, indice, d.itens.flatMap((i) => i.ids)).length)
  assert.ok(comResumo.every((n) => n >= 1), `dia sem resumo nos 30 primeiros: ${comResumo.join(',')}`)

  // ── 6. Painel: previsão no ritmo real, áreas para melhorar e histórico dos dias ──
  const pv = m.previsaoDeTermino(indice, respondidas, planos['opcoes-nulas'], cPux, agora)
  // 7 dias antes de hoje: 3 a 9/11; domingo 8 é folga → 6 dias de estudo; 5 dias de 45 e ontem com 20.
  assert.equal(pv.ritmo, Math.round(((45 * 5 + 20) / 6) * 10) / 10)
  assert.equal(pv.precisa, cPux.metaDiaNormal)
  assert.ok(pv.termina > agora && pv.folga < 0, 'no ritmo de ~41 por dia o conteúdo passa do começo da reta final')
  const rapido = m.previsaoDeTermino(indice, respondidas, planos['opcoes-nulas'], { ...cPux, restante: 40 }, agora)
  assert.ok(rapido.folga > 0 && rapido.termina.getDay() !== 0, 'termina num dia de estudo, com folga')
  assert.deepEqual(m.previsaoDeTermino(indice, {}, { ...comum, criado_em: agora.toISOString() }, cPux, agora).ritmo, null)
  const hist = m.historicoDosDias(indice, respondidas, planos['opcoes-nulas'])
  assert.equal(hist.get('2026-11-09').n, 20)
  assert.equal(hist.get('2026-10-28').n, 12)
  assert.ok(!hist.has('2026-11-08') && !hist.has('2026-10-15'), 'folga e dias de antes do plano ficam de fora')
  assert.equal([...hist.values()].reduce((s, d) => s + d.n, 0), cPux.feitas, 'o histórico soma o que o plano conta como feito')
  assert.ok([...hist.values()].every((d) => d.areas.reduce((s, a) => s + a.n, 0) === d.n && d.certas <= d.validas))
  const { areas: ar, media: md } = m.areasParaMelhorar(cPux.temas)
  assert.ok(md > 50 && md < 90)
  assert.ok(ar.length >= 10 && ar.every((a) => a.cobertura >= 0 && a.cobertura <= 100))
  assert.ok(ar.every((a, i) => i === 0 || a.impacto <= ar[i - 1].impacto), 'a ordem é de onde vale mais melhorar')
  assert.ok(ar.filter((a) => a.situacao === 'melhorar').every((a) => a.diferenca <= -5))
  const fraca = m.areasParaMelhorar([{ slug: 'a', nome: 'A', faltam: 10, acerto: 40, acertoEstimado: 40, respondidas: 50, incidencia: 2 }, { slug: 'b', nome: 'B', faltam: 10, acerto: 90, acertoEstimado: 90, respondidas: 50, incidencia: 1 }, { slug: 'c', nome: 'C', faltam: 5, acerto: null, acertoEstimado: null, respondidas: 0, incidencia: 3 }])
  assert.deepEqual(fraca.areas.map((a) => [a.slug, a.situacao]), [['a', 'melhorar'], ['b', 'forte'], ['c', 'sem-dados']])
  assert.equal(fraca.media, 65)

  console.log('OK: cronograma novo (migração do formato antigo, só TEOT, balanço de ontem, erros do cronograma e resumos do dia).')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
