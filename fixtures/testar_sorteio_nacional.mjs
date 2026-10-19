// Simulado Nacional 2.0, parte A (docs/superpowers/specs/2026-10-19-simulado-nacional-contrato.md):
// candidatas do acervo, cotas por área (peso 2 para provas recentes), sorteio
// determinístico (60% dos assuntos que mais caem, teto por ano, usadas por
// último), permutação das alternativas, troca de questão e datas da edição.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-sorteio-'))
const arquivo = join(pasta, 's.mjs')
try {
  await build({
    entryPoints: ['src/dados/simuladoNacional.ts'], outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))

  // ---- Constantes do contrato
  assert.equal(m.QUESTOES_MENSAL, 50)
  assert.equal(m.DURACAO_MENSAL_MIN, 120)
  assert.deepEqual([...m.PROVAS_NACIONAL].sort(), ['TARO', 'TEOT', 'TEOT/TARO'])

  // ---- Acervo sintético: 4 áreas de tamanhos diferentes, níveis e anos variados
  const AREAS = [['Trauma adulto', 'trauma', 120], ['Joelho', 'joelho', 60], ['Coluna', 'coluna', 30], ['Osteometabólicas', 'osteo', 8]]
  const sintetico = []
  for (const [area, areaSlug, n] of AREAS) {
    for (let i = 0; i < n; i++) {
      const nAlternativas = i % 3 ? 5 : 4
      sintetico.push({
        id: `${areaSlug}-${String(i).padStart(4, '0')}`, area, areaSlug,
        foco: `Foco ${i % 5}`, nivel: i % 5, ano: 2010 + (i % 16), gabarito: 'ABCDE'[i % nAlternativas], nAlternativas,
      })
    }
  }

  // ---- Cotas: soma exata, mínimo 1, peso 2 para provas dos últimos 5 anos
  const cotas = m.cotasPorArea(sintetico, 50, 2026)
  assert.equal(cotas.reduce((s, c) => s + c.alvo, 0), 50)
  assert.equal(cotas.length, 4)
  for (const c of cotas) assert.ok(c.alvo >= 1, `${c.area} sem questão`)
  assert.ok(Math.abs(cotas.reduce((s, c) => s + c.pct, 0) - 100) < 0.01)
  // Peso: ano ≥ 2022 vale 2. Na área de 8 questões (anos 2010–2017), tudo pesa 1.
  assert.equal(cotas.find((c) => c.areaSlug === 'osteo').peso, 8)
  const pesoJoelho = sintetico.filter((c) => c.areaSlug === 'joelho').reduce((s, c) => s + (c.ano >= 2022 ? 2 : 1), 0)
  assert.equal(cotas.find((c) => c.areaSlug === 'joelho').peso, pesoJoelho)
  // Área minúscula ainda ganha 1; área grande leva a maior parte.
  const cotasMin = m.cotasPorArea([...sintetico.filter((c) => c.areaSlug === 'trauma'), sintetico.find((c) => c.areaSlug === 'osteo')], 50, 2026)
  assert.equal(cotasMin.find((c) => c.areaSlug === 'osteo').alvo, 1)
  assert.equal(cotasMin.find((c) => c.areaSlug === 'trauma').alvo, 49)
  // Soma exata em vários tamanhos (inclusive os da véspera).
  for (const total of [10, 50, 80, 100, 120]) assert.equal(m.cotasPorArea(sintetico, total, 2026).reduce((s, c) => s + c.alvo, 0), total)

  // ---- Sorteio
  const ed = m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026 })
  assert.equal(ed.length, 50)
  assert.deepEqual(ed.map((i) => i.ordem), Array.from({ length: 50 }, (_, i) => i + 1))
  assert.equal(new Set(ed.map((i) => i.id)).size, 50, 'questão repetida')
  for (const c of cotas) {
    const n = ed.filter((i) => i.area === c.area).length
    assert.ok(Math.abs(n - c.alvo) <= 1, `${c.area}: ${n} sorteadas para alvo ${c.alvo}`)
  }
  // Determinismo: mesma edição, mesmo resultado; outra edição, outro.
  assert.deepEqual(m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026 }), ed)
  const nov = m.sortearEdicao(sintetico, '2026-11', { anoAtual: 2026 })
  assert.notDeepEqual(nov.map((i) => i.id), ed.map((i) => i.id))
  // A ordem final é embaralhada (não fica agrupada por área).
  const trocasDeArea = ed.slice(1).filter((it, i) => it.area !== ed[i].area).length
  assert.ok(trocasDeArea > 10, `ordem agrupada demais (${trocasDeArea} trocas)`)
  // ~60% dos níveis 3–4 dentro da área grande (há de sobra dos dois lados).
  const trauma = ed.filter((i) => i.areaSlug === 'trauma')
  const altos = trauma.filter((i) => i.nivel >= 3).length
  assert.ok(Math.abs(altos - Math.round(trauma.length * 0.6)) <= 1, `trauma: ${altos} de ${trauma.length} nos níveis 3–4`)
  // Área só de nível baixo: completa com o que tem, sem quebrar.
  const soBaixo = sintetico.map((c) => (c.areaSlug === 'coluna' ? { ...c, nivel: 1 } : c))
  assert.equal(m.sortearEdicao(soBaixo, '2026-10', { anoAtual: 2026 }).filter((i) => i.areaSlug === 'coluna').length, cotas.find((c) => c.areaSlug === 'coluna').alvo)

  // Permutação de cada item: letras de A até a quantidade de alternativas, e gabarito novo coerente.
  for (const it of ed) {
    assert.equal(it.permutacao.length, it.nAlternativas)
    assert.deepEqual([...it.permutacao].sort().join(''), 'ABCDE'.slice(0, it.nAlternativas))
    assert.equal(it.gabaritoNovo, m.letraNova(it.permutacao, it.gabarito))
    assert.equal(m.letraOriginal(it.permutacao, it.gabaritoNovo), it.gabarito)
  }
  // Nem todas as permutações são a identidade.
  assert.ok(ed.filter((i) => i.permutacao !== 'ABCDE'.slice(0, i.nAlternativas)).length > 30)

  // ---- Usadas ficam de fora quando dá
  const usadas = new Set(ed.map((i) => i.id))
  const semRepetir = m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026, usadas })
  assert.equal(semRepetir.length, 50)
  assert.equal(semRepetir.filter((i) => usadas.has(i.id)).length, 0, 'repetiu questão usada com alternativa disponível')
  // Se faltar, aceita usada por último: a área de 8 questões com todas usadas ainda entra.
  const todasOsteo = new Set(sintetico.filter((c) => c.areaSlug === 'osteo').map((c) => c.id))
  const comFalta = m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026, usadas: todasOsteo })
  assert.equal(comFalta.length, 50)
  assert.equal(comFalta.filter((i) => i.areaSlug === 'osteo').length, cotas.find((c) => c.areaSlug === 'osteo').alvo)

  // ---- Teto por ano: no máximo ceil(50/3) = 17 do mesmo ano, quando é possível
  const anoConcentrado = sintetico.map((c, i) => ({ ...c, ano: i % 4 ? 2024 : 2000 + (i % 20) }))
  const concentrada = m.sortearEdicao(anoConcentrado, '2026-10', { anoAtual: 2026 })
  const porAno = new Map()
  for (const it of concentrada) porAno.set(it.ano, (porAno.get(it.ano) ?? 0) + 1)
  assert.ok(Math.max(...porAno.values()) <= 17, `ano repetido demais: ${JSON.stringify([...porAno])}`)
  assert.equal(concentrada.length, 50)
  // Impossível respeitar (tudo do mesmo ano): relaxa e completa.
  const umAno = m.sortearEdicao(sintetico.map((c) => ({ ...c, ano: 2024 })), '2026-10', { anoAtual: 2026 })
  assert.equal(umAno.length, 50)

  // ---- Permutação: ida e volta para 4 e 5 alternativas
  for (const n of [4, 5]) {
    for (let s = 1; s < 40; s++) {
      const p = m.permutar(n, s * 7919)
      assert.equal(p.length, n)
      assert.deepEqual([...p].sort().join(''), 'ABCDE'.slice(0, n))
      for (const x of 'ABCDE'.slice(0, n)) {
        assert.equal(m.letraOriginal(p, m.letraNova(p, x)), x)
        assert.equal(m.letraNova(p, m.letraOriginal(p, x)), x)
      }
    }
    assert.equal(m.permutar(n, 123), m.permutar(n, 123))
  }
  // Leitura da permutação: 'CADB' = a letra nova A mostra a original C.
  assert.equal(m.letraOriginal('CADB', 'A'), 'C')
  assert.equal(m.letraNova('CADB', 'C'), 'A')
  assert.equal(m.letraNova('CADB', 'B'), 'D')

  // ---- Trocar uma questão: mesma área (e foco, se der), fora da edição
  for (const ordem of [1, 7, 23, 50]) {
    const antigo = ed.find((i) => i.ordem === ordem)
    const novo = m.trocarItem(sintetico, ed, ordem, '2026-10')
    assert.ok(novo, `sem troca para a ordem ${ordem}`)
    assert.equal(novo.ordem, ordem)
    assert.equal(novo.area, antigo.area)
    assert.equal(novo.foco, antigo.foco)
    assert.ok(!ed.some((i) => i.id === novo.id), 'troca trouxe questão que já está na edição')
    assert.equal(novo.gabaritoNovo, m.letraNova(novo.permutacao, novo.gabarito))
  }
  // Sem candidata livre na área: null.
  const soOsteo = ed.filter((i) => i.areaSlug === 'osteo')
  const poucas = sintetico.filter((c) => soOsteo.some((i) => i.id === c.id))
  assert.equal(m.trocarItem(poucas, soOsteo, soOsteo[0].ordem, '2026-10'), null)
  assert.equal(m.trocarItem(sintetico, ed, 999, '2026-10'), null)

  // ---- Candidatas do índice: só TEOT/TARO oficiais, sem an/dup/sim, com gabarito A–E
  const indiceFalso = {
    versao: 1, geradoEm: null, total: 7, subtemas: ['Fratura do escafoide'], anos: [2024],
    temas: [{ slug: 'mao', nome: 'Mão e punho', arquivo: 'temas/mao.json', total: 7 }],
    provas: ['TEOT', 'CET-PR', 'TARO', 'TEOT/TARO'],
    questoes: [
      { id: 'q1', t: 0, s: [0], p: 0, a: 2024, d: null, img: 0, an: 0, c: 0, cia: 0, cc: 0 },
      { id: 'q2', t: 0, s: [0], p: 1, a: 2024, d: null, img: 0, an: 0, c: 0, cia: 0, cc: 0 },
      { id: 'q3', t: 0, s: [0], p: 2, a: 2024, d: null, img: 0, an: 1, c: 0, cia: 0, cc: 0 },
      { id: 'q4', t: 0, s: [0], p: 3, a: null, d: null, img: 0, an: 0, c: 0, cia: 0, cc: 0, dup: 'q1' },
      { id: 'q5', t: 0, s: [0], p: 3, a: null, d: null, img: 0, an: 0, c: 0, cia: 0, cc: 0, sim: 1 },
      { id: 'q6', t: 0, s: [0], p: null, a: null, d: null, img: 0, an: 0, c: 0, cia: 0, cc: 0 },
      { id: 'q7', t: 0, s: [0], p: 2, a: 2023, d: null, img: 0, an: 0, c: 0, cia: 0, cc: 0 },
      { id: 'q8', t: 0, s: [0], p: 3, a: 2022, d: null, img: 0, an: 0, c: 0, cia: 0, cc: 0 },
    ],
  }
  const gabs = { q1: 'B', q2: 'A', q3: 'C', q4: 'A', q5: 'A', q6: 'A', q7: 'X', q8: 'E' }
  const cands = m.candidatasDoIndice(indiceFalso, (id) => gabs[id], (id) => (id === 'q8' ? 4 : 5))
  // q8: gabarito E com só 4 alternativas não serve.
  assert.deepEqual(cands.map((c) => c.id), ['q1'])
  assert.deepEqual({ ...cands[0], foco: undefined, nivel: undefined }, { id: 'q1', area: 'Mão e punho', areaSlug: 'mao', foco: undefined, nivel: undefined, ano: 2024, prova: 'TEOT', gabarito: 'B', nAlternativas: 5 })
  assert.ok([0, 1, 2, 3, 4].includes(cands[0].nivel))

  // Provas configuráveis: incluir o CET-PR traz a q2.
  assert.deepEqual(m.candidatasDoIndice(indiceFalso, (id) => gabs[id], () => 5, new Set(['TEOT', 'CET-PR'])).map((c) => c.id), ['q1', 'q2'])
  assert.equal(cands[0].prova, 'TEOT')

  // ---- Configuração do sorteio (addendum do contrato)
  assert.deepEqual(m.CONFIG_PADRAO, { provas: ['TEOT', 'TARO', 'TEOT/TARO'], pesoRecentes: 2, anosRecentes: 5, nivelAltoPct: 60, cotas: null })
  // Peso 1 para recentes: o peso vira a contagem simples.
  assert.equal(m.cotasPorArea(sintetico, 50, { anoAtual: 2026, pesoRecentes: 1 }).find((c) => c.areaSlug === 'joelho').peso, 60)
  // Janela de 1 ano: só 2026 pesa 2.
  const pesoJanela1 = sintetico.filter((c) => c.areaSlug === 'joelho').reduce((s, c) => s + (c.ano >= 2026 ? 3 : 1), 0)
  assert.equal(m.cotasPorArea(sintetico, 50, { anoAtual: 2026, pesoRecentes: 3, anosRecentes: 1 }).find((c) => c.areaSlug === 'joelho').peso, pesoJanela1)
  // Compatível com o formato antigo (ano no terceiro argumento).
  assert.deepEqual(m.cotasPorArea(sintetico, 50, 2026), cotas)
  // Total configurável.
  assert.equal(m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026, total: 80 }).length, 80)
  // Nível alto em 100%: a área grande só com níveis 3–4 (há de sobra).
  const tudoAlto = m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026, nivelAltoPct: 100 }).filter((i) => i.areaSlug === 'trauma')
  assert.ok(tudoAlto.every((i) => i.nivel >= 3), 'nivelAltoPct = 100 trouxe nível baixo')
  const nadaAlto = m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026, nivelAltoPct: 0 }).filter((i) => i.areaSlug === 'trauma')
  assert.ok(nadaAlto.every((i) => i.nivel < 3), 'nivelAltoPct = 0 trouxe nível alto')
  // Cotas manuais: usadas se somam o total…
  const manual = { 'Trauma adulto': 20, Joelho: 20, Coluna: 5, 'Osteometabólicas': 5 }
  const comManual = m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026, cotas: manual })
  assert.equal(comManual.length, 50)
  for (const [area, n] of Object.entries(manual)) assert.equal(comManual.filter((i) => i.area === area).length, n, area)
  // …e ignoradas se não somam (ou pedem mais do que a área tem).
  const contar = (lista) => Object.fromEntries(cotas.map((c) => [c.area, lista.filter((i) => i.area === c.area).length]))
  assert.deepEqual(contar(m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026, cotas: { ...manual, Coluna: 4 } })), contar(ed))
  assert.deepEqual(contar(m.sortearEdicao(sintetico, '2026-10', { anoAtual: 2026, cotas: { 'Trauma adulto': 30, Joelho: 10, 'Osteometabólicas': 10 } })), contar(ed))
  // Filtro de provas no sorteio: só as candidatas das provas pedidas.
  const comProva = sintetico.map((c, i) => ({ ...c, prova: i % 2 ? 'TEOT' : 'TARO' }))
  const soTeot = m.sortearEdicao(comProva, '2026-10', { anoAtual: 2026, provas: new Set(['TEOT']) })
  assert.equal(soTeot.length, 50)
  assert.ok(soTeot.every((i) => i.prova === 'TEOT'))

  // ---- Datas da edição (São Paulo, UTC−3)
  assert.equal(m.edicaoDoMes(new Date('2026-11-01T02:59:59Z')), '2026-10')
  assert.equal(m.edicaoDoMes(new Date('2026-11-01T03:00:00Z')), '2026-11')
  assert.equal(m.inicioDoMes('2026-10'), '2026-10-01T00:00:00-03:00')
  assert.equal(m.fimDoMes('2026-10'), '2026-10-31T23:59:59-03:00')
  assert.equal(m.fimDoMes('2026-02'), '2026-02-28T23:59:59-03:00')
  assert.equal(m.fimDoMes('2028-02'), '2028-02-29T23:59:59-03:00')
  assert.equal(m.fimDoMes('2026-12'), '2026-12-31T23:59:59-03:00')
  assert.equal(Date.parse(m.fimDoMes('2026-10')) + 1000, Date.parse('2026-11-01T03:00:00Z'))
  assert.equal(m.inicioDoMes('2026-10-vespera-teot'), '2026-10-01T00:00:00-03:00')

  // ---- Situação e relógio
  const t = (iso) => Date.parse(iso)
  const e = { abre_em: '2026-11-01T03:00:00Z', fecha_em: '2026-12-01T02:59:59Z', minha: null }
  assert.equal(m.situacao(e, t('2026-10-29T12:00:00Z')), 'em-breve')
  assert.equal(m.situacao(e, t('2026-11-10T12:00:00Z')), 'aberta')
  assert.equal(m.situacao(e, t('2026-12-02T12:00:00Z')), 'encerrada')
  const fazendo = { ...e, minha: { prazo_em: '2026-11-10T14:00:00Z', entregue_em: null } }
  assert.equal(m.situacao(fazendo, t('2026-11-10T13:00:00Z')), 'andamento')
  assert.equal(m.situacao(fazendo, t('2026-11-10T14:00:01Z')), 'tempo-esgotado')
  // Começou antes de fechar: segue em andamento mesmo depois do fechamento, até o prazo.
  assert.equal(m.situacao({ ...e, minha: { prazo_em: '2026-12-01T04:00:00Z', entregue_em: null } }, t('2026-12-01T03:30:00Z')), 'andamento')
  assert.equal(m.situacao({ ...e, minha: { prazo_em: '2026-11-10T14:00:00Z', entregue_em: '2026-11-10T13:30:00Z' } }, t('2026-12-05T00:00:00Z')), 'entregue')
  assert.equal(m.segundosRestantes('2026-11-10T14:00:00Z', t('2026-11-10T13:00:00Z')), 3600)
  assert.equal(m.segundosRestantes('2026-11-10T14:00:00Z', t('2026-11-10T13:59:59.500Z')), 1)
  assert.equal(m.segundosRestantes('2026-11-10T14:00:00Z', t('2026-11-10T15:00:00Z')), 0)

  // ---- Acervo real: as cotas de 50 batem e fazem sentido
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const gabarito = new Map(), nAlt = new Map()
  for (const tema of indice.temas) {
    const { questoes } = JSON.parse(await readFile(`public/acervo/${tema.arquivo}`, 'utf8'))
    for (const q of questoes) {
      if (q.anulada || q.figuraPendente) continue
      gabarito.set(q.id, q.gabarito)
      nAlt.set(q.id, q.alternativas?.length)
    }
  }
  const reais = m.candidatasDoIndice(indice, (id) => gabarito.get(id), (id) => nAlt.get(id))
  assert.ok(reais.length > 1000, `poucas candidatas reais: ${reais.length}`)
  for (const c of reais) assert.ok(m.PROVAS_NACIONAL.has(indice.provas[indice.questoes.find((q) => q.id === c.id).p]))
  const cotasReais = m.cotasPorArea(reais, 50, 2026)
  assert.equal(cotasReais.reduce((s, c) => s + c.alvo, 0), 50)
  for (const c of cotasReais) assert.ok(c.alvo >= 1 && c.alvo <= 15, `${c.area}: ${c.alvo}`)
  const edReal = m.sortearEdicao(reais, '2026-10', { anoAtual: 2026 })
  assert.equal(edReal.length, 50)
  assert.equal(new Set(edReal.map((i) => i.id)).size, 50)
  for (const c of cotasReais) assert.ok(Math.abs(edReal.filter((i) => i.area === c.area).length - c.alvo) <= 1)
  console.log(`Cotas reais de 50 (${reais.length} candidatas):`)
  for (const c of cotasReais) console.log(`  ${c.area.padEnd(24)} ${c.pct.toFixed(1).padStart(5)}%  ${String(c.alvo).padStart(2)}`)
  const altosReais = edReal.filter((i) => i.nivel >= 3).length
  console.log(`  níveis 3–4 no sorteio de 2026-10: ${altosReais} de 50`)
  console.log('Sorteio do Simulado Nacional: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
