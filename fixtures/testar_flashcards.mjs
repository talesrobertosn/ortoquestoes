// Motor da Batalha de flashcards: regras, corridas e balanceamento ("mais fácil morrer do que matar").
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-fc-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/flashcards/motor/regras'; export * from './src/flashcards/motor/bestiario'; export * from './src/flashcards/motor/poderes'; export * from './src/flashcards/motor/altar'; export { BARALHO_DEMO } from './src/flashcards/dados/baralhoDemo'; export * from './src/flashcards/progresso'; export * from './src/flashcards/motor/selecao'`, resolveDir: process.cwd() },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const cartas = m.BARALHO_DEMO
  const motor = m.criarMotor(cartas)

  // O baralho de demonstração respeita o formato: gabarito dentro das opções, ids rastreáveis, sem HTML.
  for (const c of cartas) {
    assert.ok(c.certa >= 0 && c.certa < c.opcoes.length, `${c.id}: certa fora das opções`)
    assert.equal(new Set(c.opcoes).size, c.opcoes.length, `${c.id}: opções repetidas`)
    assert.match(c.questao, /^[a-z]+-\d{4}$/, `${c.id}: questão de origem`)
    assert.ok(!/<\/?[a-z]/i.test(c.frente + c.explicacao + c.resposta), `${c.id}: HTML no texto`)
  }

  // Mesma semente, mesma partida.
  const a = motor.novaPartida(42), b = motor.novaPartida(42)
  assert.deepEqual(a.estado, b.estado)
  assert.equal(a.eventos[0].tipo, 'novo-inimigo')

  // Responder duas vezes não conta duas vezes; seguir antes de responder não faz nada.
  let p = a.estado
  assert.equal(motor.seguir(p).eventos.length, 0)
  const certaPos = (q) => q.atual.ordem.indexOf(motor.carta(q.atual.id).certa)
  const r1 = motor.responder(p, certaPos(p))
  assert.ok(r1.eventos.some((e) => e.tipo === 'dano-inimigo'))
  const r2 = motor.responder(r1.estado, certaPos(p))
  assert.equal(r2.eventos.length, 0)
  assert.equal(r2.estado, r1.estado)

  // Erro: o dano é o da intenção mostrada antes.
  p = motor.seguir(r1.estado).estado
  const intencao = motor.intencao(p)
  const errada = p.atual.ordem.findIndex((o) => o !== motor.carta(p.atual.id).certa)
  const r3 = motor.responder(p, errada)
  const dano = r3.eventos.find((e) => e.tipo === 'dano-heroi')
  assert.equal(dano.valor, intencao.dano)
  assert.equal(r3.estado.vida, p.vida - intencao.dano)
  assert.ok(r3.estado.derrubaram.includes(p.atual.id))

  // Escudo absorve; pista elimina uma errada e marca o acerto como assistido.
  p = motor.seguir(r3.estado).estado
  p = { ...p, encaixes: [{ tipo: 'escudo', carga: 1 }, { tipo: 'pista', carga: 1 }] }
  const pista = motor.usarPista(p)
  assert.equal(pista.eventos[0].tipo, 'pista')
  assert.equal(pista.estado.atual.assistida, true)
  assert.notEqual(pista.estado.atual.ordem[pista.eventos[0].posicao], motor.carta(p.atual.id).certa)
  assert.equal(motor.responder(pista.estado, pista.eventos[0].posicao).eventos.length, 0, 'alternativa eliminada não pode ser jogada')
  const errada2 = pista.estado.atual.ordem.findIndex((o, k) => o !== motor.carta(p.atual.id).certa && !pista.estado.atual.eliminadas.includes(k))
  const r4 = motor.responder(pista.estado, errada2)
  assert.ok(r4.eventos.some((e) => e.tipo === 'escudo'))
  assert.ok(!r4.eventos.some((e) => e.tipo === 'dano-heroi'))
  assert.equal(r4.estado.vida, pista.estado.vida)

  // Equipar: mesmo poder empilha, o quarto tipo toma o lugar do mais antigo.
  let [enc] = m.equipar([], 'escudo')
  ;[enc] = m.equipar(enc, 'escudo')
  assert.deepEqual(enc, [{ tipo: 'escudo', carga: 2 }])
  ;[enc] = m.equipar(enc, 'pista'); [enc] = m.equipar(enc, 'duplo')
  const [cheio, saiu] = m.equipar(enc, 'imortal')
  assert.equal(cheio.length, 3); assert.equal(saiu, 'escudo')

  // Progresso educacional: acerto assistido não vira "certeza".
  const sem = m.registrarResposta(undefined, true, false, 1000)
  const com = m.registrarResposta(undefined, true, true, 1000)
  assert.equal(sem.confianca, 'seguro'); assert.equal(com.confianca, 'duvida')
  assert.equal(m.registrarResposta(undefined, false, false, 1000).c, false)
  const quaseDominado = { c: true, q: 1000, sequencia: 4, confianca: 'duvida', proximaRevisao: 1000 }
  const ajudado = m.registrarResposta(quaseDominado, true, true, 2000)
  assert.ok(ajudado.proximaRevisao !== null && ajudado.sequencia <= 4, 'acerto assistido não pode dominar')

  // Encerrar muda o estado mesmo sem eventos; poção substituída perde o desafio; imortal repetido não é oferecido.
  const fimVoluntario = motor.encerrar(a.estado)
  assert.equal(fimVoluntario.estado.fase, "fim")
  const comPocao = { ...a.estado, fase: 'recompensa', recompensas: ['duplo'], pocao: 2, encaixes: [{ tipo: 'pocao', carga: 1 }, { tipo: 'escudo', carga: 1 }, { tipo: 'pista', carga: 1 }] }
  assert.equal(motor.escolher(comPocao, 'duplo').estado.pocao, 0)
  for (let k = 0; k < 40; k++) {
    let q = motor.novaPartida(500 + k).estado
    q = { ...q, encaixes: [{ tipo: 'imortal', carga: 1 }], inimigo: { ...q.inimigo, vida: 1 } }
    const r = motor.responder(q, q.atual.ordem.indexOf(motor.carta(q.atual.id).certa))
    assert.ok(!r.estado.recompensas.includes('imortal'), 'imortal repetido oferecido')
  }

  // Entre os andares: compra o que der na loja, aceita a primeira ajuda do Preceptor e entra na primeira porta de combate.
  function passarPortas(estado) {
    if (estado.fase === 'loja') {
      const k = estado.loja.findIndex((x) => !x.vendido && x.preco <= estado.ouro && (x.item !== 'cura' || estado.vida < estado.vidaMax))
      return k >= 0 ? motor.comprarNaLoja(estado, k).estado : motor.sairDaLoja(estado).estado
    }
    if (estado.fase === 'sabio') return motor.aceitarSabio(estado, 0).estado
    if (estado.fase === 'sala') return motor.escolherNaSala(estado, estado.sala.opcoes.length - 1).estado
    const k = estado.portas.findIndex((x) => x.tipo === 'combate' || x.tipo === 'chefe')
    return motor.entrar(estado, k >= 0 ? k : 0).estado
  }

  // Portas: depois da recompensa vêm as portas; o andar só avança ao entrar numa de combate.
  {
    let q = motor.novaPartida(77).estado
    q = { ...q, inimigo: { ...q.inimigo, vida: 1 } }
    let r = motor.responder(q, q.atual.ordem.indexOf(motor.carta(q.atual.id).certa))
    assert.equal(r.estado.fase, 'recompensa')
    assert.ok(r.eventos.some((e) => e.tipo === 'ouro'), 'adversário vencido dá moedas')
    r = motor.escolher(r.estado, r.estado.recompensas[0])
    assert.equal(r.estado.fase, 'portas'); assert.equal(r.estado.andar, 1)
    assert.ok(r.estado.portas.length >= 2 && r.estado.portas.some((x) => x.tipo === 'combate'))
    const k = r.estado.portas.findIndex((x) => x.tipo === 'combate')
    const porta = r.estado.portas[k]
    const dentro = motor.entrar(r.estado, k)
    assert.equal(dentro.estado.andar, 2); assert.equal(dentro.estado.fase, 'pergunta'); assert.equal(dentro.estado.categoria, porta.recompensa)
    // antes do chefe só há a porta do chefe (e a loja, com moedas)
    const antesDoChefe = { ...dentro.estado, fase: 'recompensa', recompensas: ['treino'], ouro: 100 }
    const pc = motor.escolher(antesDoChefe, 'treino').estado
    assert.equal(pc.portas[0].tipo, 'chefe'); assert.ok(pc.portas.some((x) => x.tipo === 'loja'))
    // loja: compra desconta moedas e não deixa comprar duas vezes; cura não passa da vida máxima
    const naLoja = motor.entrar(pc, pc.portas.findIndex((x) => x.tipo === 'loja')).estado
    assert.equal(naLoja.fase, 'loja'); assert.equal(naLoja.loja.length, 4)
    const k2 = naLoja.loja.findIndex((x) => x.item !== 'cura')
    const comprou = motor.comprarNaLoja(naLoja, k2).estado
    assert.equal(comprou.ouro, naLoja.ouro - naLoja.loja[k2].preco)
    assert.equal(motor.comprarNaLoja(comprou, k2).estado, comprou)
    assert.equal(motor.sairDaLoja(comprou).estado.andar, 3)
    // Preceptor: aceitar a cura avança o andar
    const sab = { ...pc, fase: 'sabio', sabio: [{ tipo: 'cura', valor: 30 }], vida: 20 }
    const depois = motor.aceitarSabio(sab, 0).estado
    assert.equal(depois.vida > 20, true); assert.equal(depois.andar, 3)
  }

  // Bênçãos em dupla só aparecem com os dois patronos; a sala de bênção traz o patrono da porta.
  for (let k = 0; k < 60; k++) {
    let q = motor.novaPartida(900 + k).estado
    q = { ...q, categoria: 'bencao', patronoDaSala: 'mira', inimigo: { ...q.inimigo, vida: 1 } }
    const r = motor.responder(q, q.atual.ordem.indexOf(motor.carta(q.atual.id).certa))
    for (const x of r.estado.recompensas) assert.ok(!m.RECOMPENSAS[x].requer, 'dupla sem os dois patronos')
    assert.ok(r.estado.recompensas.some((x) => m.RECOMPENSAS[x].patrono === 'mira'), 'sala da Mira sem bênção da Mira')
    const q2 = { ...q, reliquias: ['olhoaguia', 'cadeia'] }
    const r2 = motor.responder(q2, q2.atual.ordem.indexOf(motor.carta(q2.atual.id).certa))
    assert.ok(r2.estado.recompensas.includes('tormenta'), 'dupla disponível não apareceu na sala de bênção')
  }

  // Brasas queimam no fim da rodada; contra-ataque e reflexo ferem o adversário; o Mímico rouba carga.
  {
    let q = motor.novaPartida(31).estado
    q = { ...q, reliquias: ['brasa'] }
    const r = motor.responder(q, q.atual.ordem.indexOf(motor.carta(q.atual.id).certa))
    assert.equal(r.estado.inimigo.brasas, 1)
    assert.ok(r.eventos.some((e) => e.tipo === 'queimadura' && e.valor === 3))
    const q2 = { ...motor.novaPartida(32).estado, reliquias: ['contra'] }
    const r2 = motor.responder(q2, q2.atual.ordem.findIndex((o) => o !== motor.carta(q2.atual.id).certa))
    const golpe = r2.eventos.find((e) => e.tipo === 'dano-heroi'), contra = r2.eventos.find((e) => e.tipo === 'contra')
    assert.ok(golpe && contra && contra.valor === Math.max(1, Math.round(golpe.valor * 0.25)))
  }

  // Ampulheta adia a Fúria; Carta na manga troca o flashcard sem contar resposta e mantém o golpe previsto.
  {
    let q = motor.novaPartida(55).estado
    q = { ...q, encaixes: [{ tipo: 'ampulheta', carga: 1 }, { tipo: 'trocar', carga: 1 }], inimigo: { ...q.inimigo, rodadas: 9, furia: true } }
    const a1 = motor.usarPoder(q, 'ampulheta')
    assert.equal(a1.estado.inimigo.rodadas, 0); assert.equal(a1.estado.inimigo.furia, false)
    const t1 = motor.usarPoder(a1.estado, 'trocar')
    assert.notEqual(t1.estado.atual.id, a1.estado.atual.id)
    assert.equal(t1.estado.rodada, a1.estado.rodada)
    assert.equal(t1.estado.atual.criticoInimigo, a1.estado.atual.criticoInimigo)
    assert.equal(t1.estado.encaixes.length, 0)
  }

  // Altar: compra desconta cristais, respeita o nível máximo; talentos entram na partida nova.
  {
    let alt = m.ganharCristais(m.ALTAR_VAZIO, 100)
    alt = m.comprarTalento(alt, 'vida'); alt = m.comprarTalento(alt, 'vida')
    assert.equal(alt.cristais, 100 - 20 - 45); assert.equal(alt.talentos.vida, 2)
    assert.equal(m.comprarTalento(alt, 'segunda'), alt, 'sem cristais suficientes')
    const q = motor.novaPartida(5, { talentos: { vida: 2, pista: 1, ouro: 1 } }).estado
    assert.equal(q.vidaMax, 110); assert.equal(q.ouro, 15); assert.equal(q.encaixes[0].tipo, 'pista')
  }

  // Torre: 100 andares, chefe a cada 10, patamar a cada 5, Dragão Ancestral no topo e só lá.
  {
    for (let a = 1; a <= 100; a++) {
      const { inimigo } = m.inimigoDoAndar(a, 123, 'torre')
      if (a === 100) assert.equal(inimigo.id, 'dragao-ancestral')
      else assert.notEqual(inimigo.id, 'dragao-ancestral')
      assert.equal(!!inimigo.chefe, a % 10 === 0, `andar ${a} da Torre`)
      if (a % 5 === 0 && a % 10) assert.equal(inimigo.nivel, 'elite', `andar ${a} sem elite`)
    }
    for (let a = 1; a <= 60; a++) assert.notEqual(m.inimigoDoAndar(a, 9, 'masmorra').inimigo.id, 'dragao-ancestral')
    let q = motor.novaPartida(8, { modo: 'torre' }).estado
    q = { ...q, andar: 99, inimigo: { ...q.inimigo, vida: 1 } }
    q = { ...q, inimigo: { ...q.inimigo, id: m.inimigoDoAndar(99, q.sementeBase, 'torre').inimigo.id } }
    let r = motor.responder(q, q.atual.ordem.indexOf(motor.carta(q.atual.id).certa))
    r = motor.escolher(r.estado, r.estado.recompensas[0])
    assert.equal(r.estado.portas[0].tipo, 'chefe')
    const topo = motor.entrar(r.estado, 0).estado
    assert.equal(topo.andar, 100)
    const fim = motor.responder({ ...topo, inimigo: { ...topo.inimigo, vida: 1 } }, topo.atual.ordem.indexOf(motor.carta(topo.atual.id).certa))
    assert.ok(fim.eventos.some((e) => e.tipo === 'torre-concluida')); assert.equal(fim.estado.fase, 'fim'); assert.ok(fim.estado.torreConcluida)
  }

  // Balanceamento: simula partidas com quem acerta X% e mede até onde chega.
  function simular(taxa, semente) {
    let s = semente >>> 0
    const sorte = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    let { estado } = motor.novaPartida(semente)
    for (let passo = 0; passo < 400; passo++) {
      if (estado.fase === 'fim') break
      if (estado.fase === 'recompensa') {
        if (estado.venceu) return { andar: estado.andar, chefe: true }
        estado = motor.escolher(estado, estado.recompensas[0]).estado
        continue
      }
      if (estado.fase === 'portas') { if (estado.venceu) return { andar: estado.andar, chefe: true }; estado = passarPortas(estado); continue }
      if (estado.fase === 'loja' || estado.fase === 'sabio' || estado.fase === 'sala') { estado = passarPortas(estado); continue }
      if (estado.fase === 'resposta') { estado = motor.seguir(estado).estado; continue }
      const c = motor.carta(estado.atual.id)
      const acerta = sorte() < taxa
      const pos = acerta ? estado.atual.ordem.indexOf(c.certa) : estado.atual.ordem.findIndex((o) => o !== c.certa)
      estado = motor.responder(estado, pos).estado
    }
    return { andar: estado.andar, chefe: estado.chefesDerrotados > 0 }
  }
  const tabela = {}
  for (const taxa of [0.5, 0.6, 0.7, 0.8, 0.9]) {
    let chefe = 0, andares = 0
    const N = 1500
    for (let k = 0; k < N; k++) { const r = simular(taxa, 1000 + k); chefe += r.chefe; andares += r.andar }
    tabela[taxa] = { chefe: chefe / N, andarMedio: andares / N }
  }
  console.log('Balanceamento (taxa de acerto → chance de vencer o chefe, andar médio):')
  for (const [t, v] of Object.entries(tabela)) console.log(`  ${Math.round(t * 100)}% → ${(v.chefe * 100).toFixed(1)}% · andar ${v.andarMedio.toFixed(2)}`)
  // Quem acerta 60% quase nunca vence o chefe; quem acerta 90% vence na maioria das vezes.
  assert.ok(tabela[0.6].chefe < 0.12, 'chefe fácil demais para 60%')
  assert.ok(tabela[0.7].chefe < 0.5, 'chefe fácil demais para 70%')
  assert.ok(tabela[0.9].chefe > 0.6, 'chefe impossível para 90%')
  // Partidas longas (sem parar no primeiro chefe): escalonamento, cura e mortes de um golpe só.
  function longa(taxa, semente, nivel) {
    let s = semente >>> 0
    const sorte = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    let { estado } = motor.novaPartida(semente, nivel ? { nivel } : {})
    let golpeUnico = 0, tetoFurado = 0, respostas = 0
    for (let passo = 0; passo < 3000; passo++) {
      if (estado.fase === 'fim') break
      if (estado.fase === 'recompensa') { estado = motor.escolher(estado, estado.recompensas[0]).estado; continue }
      if (estado.fase === 'portas' || estado.fase === 'loja' || estado.fase === 'sabio' || estado.fase === 'sala') { estado = passarPortas(estado); continue }
      if (estado.fase === 'resposta') { estado = motor.seguir(estado).estado; continue }
      const c = motor.carta(estado.atual.id)
      const acerta = sorte() < taxa
      const pos = acerta ? estado.atual.ordem.indexOf(c.certa) : estado.atual.ordem.findIndex((o) => o !== c.certa)
      const antes = estado
      const r = motor.responder(estado, pos)
      respostas++
      const golpe = r.eventos.find((e) => e.tipo === 'dano-heroi')
      if (golpe) {
        if (antes.vida === antes.vidaMax && golpe.valor >= antes.vida) golpeUnico++
        const teto = golpe.critico || golpe.carregado ? 0.45 : 0.35
        if (golpe.valor > Math.ceil(antes.vidaMax * teto)) tetoFurado++
      }
      estado = r.estado
    }
    return { andar: estado.andar, chefes: estado.chefesDerrotados, estagio: estado.estagio, cura: estado.curaTotal, sofrido: estado.danoSofrido, evitado: estado.danoEvitado, respostas, golpeUnico, tetoFurado }
  }
  const longo = {}
  for (const taxa of [0.5, 0.6, 0.7, 0.8, 0.9]) {
    const N = 600, soma = { andar: 0, chefes: 0, estagio: 0, cura: 0, sofrido: 0, respostas: 0, golpeUnico: 0, tetoFurado: 0, andar9: 0 }
    for (let k = 0; k < N; k++) { const r = longa(taxa, 7000 + k); for (const x in soma) soma[x] += x === 'andar9' ? Number(r.andar >= 9) : r[x] }
    longo[taxa] = Object.fromEntries(Object.entries(soma).map(([x, v]) => [x, v / N]))
  }
  console.log('Partidas longas (acerto → andar médio, chefes, estágio, respostas, cura, dano sofrido, chega ao 9º):')
  for (const [t, v] of Object.entries(longo)) console.log(`  ${Math.round(t * 100)}% → andar ${v.andar.toFixed(1)} · chefes ${v.chefes.toFixed(2)} · estágio ${v.estagio.toFixed(2)} · ${v.respostas.toFixed(0)} flashcards · cura ${v.cura.toFixed(0)} · dano ${v.sofrido.toFixed(0)} · andar 9+: ${(v.andar9 * 100).toFixed(0)}%`)
  for (const v of Object.values(longo)) {
    assert.equal(v.golpeUnico, 0, 'morte de vida cheia num golpe só')
    assert.equal(v.tetoFurado, 0, 'golpe acima do teto de dano')
  }
  assert.ok(longo[0.5].andar < longo[0.7].andar && longo[0.7].andar < longo[0.9].andar, 'quem acerta mais vai mais longe')
  assert.ok(longo[0.9].andar > 6 && longo[0.9].andar < 40, 'partida de 90% nem curta demais nem infinita')
  assert.ok(longo[0.6].andar < 4.5, 'masmorra fácil demais para 60%')

  // Dificuldades: vida, adversário, dano recebido, pontos, mistura de flashcards e ranking.
  {
    const ini = (nivel) => motor.novaPartida(99, { nivel }).estado
    const [fa, no, di] = [ini('facil'), ini('normal'), ini('dificil')]
    assert.equal(no.nivel, 'normal'); assert.equal(m.nivelDaPartida({}), 'normal', 'partida antiga sem nível vira Normal')
    assert.ok(fa.vidaMax > no.vidaMax && no.vidaMax > di.vidaMax, 'vida do herói por dificuldade')
    assert.equal(fa.inimigo.id, di.inimigo.id, 'mesmo adversário com a mesma semente')
    assert.ok(fa.inimigo.vidaMax < no.inimigo.vidaMax && no.inimigo.vidaMax < di.inimigo.vidaMax, 'vida do adversário por dificuldade')
    const errar = (q) => motor.responder(q, q.atual.ordem.findIndex((o) => o !== motor.carta(q.atual.id).certa)).eventos.find((x) => x.tipo === 'dano-heroi')?.valor ?? 0
    const igual = (q) => ({ ...q, atual: no.atual, encaixes: [], vida: 100, vidaMax: 100 })
    const [dFa, dNo, dDi] = [errar(igual(fa)), errar(igual(no)), errar(igual(di))]
    assert.ok(dFa < dNo && dNo < dDi, `dano recebido por dificuldade: ${dFa} ${dNo} ${dDi}`)
    assert.equal(m.NIVEIS.facil.ranqueado, false); assert.ok(m.NIVEIS.normal.ranqueado && m.NIVEIS.dificil.ranqueado, 'só Normal e Difícil no ranking')
    // a mistura de flashcards muda pelo peso; o conteúdo não
    const ctx = (nivel) => ({ registros: {}, recentes: [], agora: 0, nivel })
    const facilC = { ...cartas[0], dificuldade: 1 }, dificilC = { ...cartas[0], dificuldade: 3 }
    assert.ok(m.pesoDoFlashcard(facilC, ctx('facil')) > m.pesoDoFlashcard(dificilC, ctx('facil')), 'Fácil favorece flashcards fáceis')
    assert.ok(m.pesoDoFlashcard(dificilC, ctx('dificil')) > m.pesoDoFlashcard(facilC, ctx('dificil')), 'Difícil favorece flashcards difíceis')
    assert.equal(m.pesoDoFlashcard(facilC, ctx('normal')), m.pesoDoFlashcard(dificilC, ctx('normal')), 'Normal não mexe na mistura')
    const andarMedio = (nivel) => { let t = 0; for (let k = 0; k < 120; k++) t += longa(0.75, 9100 + k, nivel).andar; return t / 120 }
    const [aFa, aNo, aDi] = [andarMedio('facil'), andarMedio('normal'), andarMedio('dificil')]
    console.log(`Dificuldades (75% de acerto → andar médio): Fácil ${aFa.toFixed(1)} · Normal ${aNo.toFixed(1)} · Difícil ${aDi.toFixed(1)}`)
    assert.ok(aFa > aNo && aNo > aDi, 'quem joga no Fácil vai mais longe, no Difícil menos')
  }

  // Torre com patamares: ao cair, volta ao último patamar com o herói de lá. Mede até onde chega em 25 tentativas.
  function torre(taxa, semente) {
    let s = semente >>> 0
    const sorte = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    let { estado } = motor.novaPartida(semente, { modo: 'torre' })
    let patamar = estado, maximo = 1, tentativas = 1, golpeUnico = 0
    for (let passo = 0; passo < 60000 && tentativas <= 25; passo++) {
      if (estado.fase === 'fim') {
        if (estado.torreConcluida) return { maximo: 100, tentativas, golpeUnico, topo: true }
        tentativas++; estado = patamar; continue
      }
      if (estado.fase === 'recompensa') { estado = motor.escolher(estado, estado.recompensas[0]).estado; continue }
      if (estado.fase === 'portas' || estado.fase === 'loja' || estado.fase === 'sabio' || estado.fase === 'sala') {
        const r = estado.fase === 'portas' ? motor.entrar(estado, Math.max(0, estado.portas.findIndex((x) => x.tipo !== 'loja'))) : { estado: passarPortas(estado), eventos: [] }
        if (r.eventos.some((e) => e.tipo === 'patamar')) patamar = r.estado
        estado = r.estado
        maximo = Math.max(maximo, estado.andar)
        continue
      }
      if (estado.fase === 'resposta') { estado = motor.seguir(estado).estado; continue }
      const c = motor.carta(estado.atual.id)
      const pos = sorte() < taxa ? estado.atual.ordem.indexOf(c.certa) : estado.atual.ordem.findIndex((o) => o !== c.certa)
      const antes = estado
      const r = motor.responder(estado, pos)
      const golpe = r.eventos.find((e) => e.tipo === 'dano-heroi')
      if (golpe && antes.vida === antes.vidaMax && golpe.valor >= antes.vida) golpeUnico++
      estado = r.estado
    }
    return { maximo, tentativas, golpeUnico, topo: false }
  }
  const tabelaTorre = {}
  for (const taxa of [0.6, 0.7, 0.8, 0.9, 0.95]) {
    const N = 60, soma = { maximo: 0, topo: 0, golpeUnico: 0 }
    for (let k = 0; k < N; k++) { const r = torre(taxa, 30000 + k); soma.maximo += r.maximo; soma.topo += Number(r.topo); soma.golpeUnico += r.golpeUnico }
    tabelaTorre[taxa] = { maximo: soma.maximo / N, topo: soma.topo / N, golpeUnico: soma.golpeUnico }
  }
  console.log('Torre (acerto → andar máximo em 25 tentativas, chega ao topo):')
  for (const [t, v] of Object.entries(tabelaTorre)) console.log(`  ${Math.round(t * 100)}% → andar ${v.maximo.toFixed(1)} · topo ${(v.topo * 100).toFixed(0)}%`)
  for (const v of Object.values(tabelaTorre)) assert.equal(v.golpeUnico, 0, 'Torre: morte de vida cheia num golpe só')
  assert.ok(tabelaTorre[0.6].maximo < tabelaTorre[0.8].maximo && tabelaTorre[0.8].maximo <= tabelaTorre[0.95].maximo, 'Torre: quem acerta mais sobe mais')
  assert.ok(tabelaTorre[0.7].topo < 0.05, 'Torre fácil demais para 70%')
  assert.ok(tabelaTorre[0.95].maximo > 50, 'Torre impossível para 95%')

  // Salas de evento (Etapa 6): custo cobrado, efeito aplicado, andar avança; sem moedas a opção paga é recusada.
  {
    const base = { ...motor.novaPartida(61).estado, ouro: 60, fase: 'portas', portas: [{ tipo: 'sala', sala: 'ferreiro' }, { tipo: 'combate', recompensa: 'misto' }] }
    const na = motor.entrar(base, 0)
    assert.equal(na.estado.fase, 'sala')
    assert.equal(na.estado.sala.tipo, 'ferreiro')
    const temperar = na.estado.sala.opcoes.findIndex((o) => o.efeitos.some((f) => f.tipo === 'vidaMax'))
    const depois = motor.escolherNaSala(na.estado, temperar).estado
    assert.equal(depois.ouro, 20)
    assert.equal(depois.vidaMax, base.vidaMax + 10)
    assert.equal(depois.andar, base.andar + 1)
    const pobre = { ...na.estado, ouro: 10 }
    assert.equal(motor.escolherNaSala(pobre, temperar).estado, pobre)
    // ferido, temperar dá exatamente +10 de vida (sem cura extra); reforçar respeita o máximo de cargas de cada poder
    const ferido = motor.escolherNaSala({ ...na.estado, vida: 50 }, temperar).estado
    assert.equal(ferido.vida, 60)
    const reforcar = na.estado.sala.opcoes.findIndex((o) => o.efeitos.some((f) => f.tipo === 'cargas'))
    const poder = m.PODERES.find((r) => m.RECOMPENSAS[r].maximo === 1)
    assert.ok(poder, 'nenhum poder com máximo 1 para testar o reforço')
    const max = m.RECOMPENSAS[poder].maximo
    const reforcado = motor.escolherNaSala({ ...na.estado, ouro: 60, encaixes: [{ tipo: poder, carga: max }] }, reforcar).estado
    assert.equal(reforcado.encaixes[0].carga, max, 'carga passou do máximo na sala')
    // a curandeira cura de graça; o baú paga moedas (com ou sem armadilha) e nunca derruba
    for (const tipo of ['curandeira', 'bau', 'secreta', 'evento']) {
      const q = { ...motor.novaPartida(62).estado, vida: 40, ouro: 50, fase: 'portas', portas: [{ tipo: 'sala', sala: tipo }] }
      const s1 = motor.entrar(q, 0).estado
      assert.equal(s1.fase, 'sala', tipo)
      assert.ok(s1.sala.opcoes.length >= 2, tipo)
      const k = s1.sala.opcoes.findIndex((o) => (!o.precisaPoder || s1.encaixes.length) && (!o.custoOuro || s1.ouro >= o.custoOuro))
      const fim = motor.escolherNaSala(s1, k).estado
      assert.ok(fim.vida >= 1 && fim.andar === q.andar + 1, tipo)
    }
    // sinergia: tala + placas dão +1 Barreira no início do próximo adversário
    const comPar = { ...motor.novaPartida(64).estado, reliquias: ['gesso', 'placas'], encaixes: [], fase: 'portas', portas: [{ tipo: 'combate', recompensa: 'misto' }] }
    const r = motor.entrar(comPar, 0)
    assert.ok(r.eventos.some((e) => e.tipo === 'sinergia' && e.nome === 'Imobilização completa'))
    assert.ok(r.estado.encaixes.some((e) => e.tipo === 'barreira'))
    // partidas salvas antes das salas continuam abrindo
    const antiga = { ...motor.novaPartida(63).estado }; delete antiga.sala
    assert.equal(m.migrarPartida(antiga).sala, null)
  }

  // Rota de estudo (13/10/2026): Mapa do especialista (só a área) e Desvio de área (sem ela) pelos próximos 10.
  {
    const pool = Array.from({ length: 40 }, (_, i) => ({ ...cartas[i % cartas.length], id: 'rota-' + i, area: i % 2 ? 'Coluna' : 'Joelho', areaId: i % 2 ? 'coluna' : 'joelho', subtemas: i % 4 === 1 ? ['Cervical'] : ['Outro'], batalha: true }))
    const mr = m.criarMotor(pool)
    const areas = mr.areasDaRota()
    assert.deepEqual(areas.map((a) => a.area).sort(), ['coluna', 'joelho'])
    assert.ok(areas.find((a) => a.area === 'coluna').subtemas.some((t) => t.nome === 'Cervical'))
    const ini = mr.novaPartida(7, { ids: pool.map((c) => c.id) }).estado
    const comMapa = { ...ini, vida: 9999, vidaMax: 9999, inimigo: { ...ini.inimigo, vida: 99999, vidaMax: 99999 }, encaixes: [{ tipo: 'mapa', carga: 1 }, { tipo: 'desvio', carga: 1 }] }
    // o poder não funciona pelo caminho genérico (precisa da área)
    assert.equal(mr.usarPoder(comMapa, 'mapa').estado, comMapa)
    let e = mr.usarRota(comMapa, 'mapa', 'coluna', ['Cervical']).estado
    assert.equal(e.encaixes.find((x) => x.tipo === 'mapa'), undefined, 'a carga do mapa não foi gasta')
    const vistos = [e.atual.id]
    for (let k = 0; k < 12; k++) {
      e = mr.responder({ ...e }, e.atual.ordem.indexOf(mr.carta(e.atual.id).certa)).estado
      if (e.vida <= 0 || e.fase !== 'resposta') break
      e = mr.seguir(e).estado
      if (e.fase !== 'pergunta') break
      vistos.push(e.atual.id)
    }
    assert.ok(vistos.length >= 11, 'poucas compras no teste do mapa: ' + vistos.length)
    const primeiros = vistos.slice(0, 10).map((id) => mr.carta(id))
    assert.equal(e.rota ?? null, null, 'a rota não terminou depois de 10')
    assert.ok(primeiros.every((c) => c.areaId === 'coluna' && c.subtemas.includes('Cervical')), 'mapa deixou passar outra área ou subtema')
    let d = mr.usarRota(comMapa, 'desvio', 'joelho').estado
    const vd = [d.atual.id]
    for (let k = 0; k < 9; k++) {
      d = mr.responder({ ...d }, d.atual.ordem.indexOf(mr.carta(d.atual.id).certa)).estado
      if (d.fase !== 'resposta') break
      d = mr.seguir(d).estado
      if (d.fase !== 'pergunta') break
      vd.push(d.atual.id)
    }
    assert.equal(vd.length, 10)
    assert.ok(vd.every((id) => mr.carta(id).areaId !== 'joelho'), 'desvio deixou passar a área escolhida')
    // partidas salvas sem o campo continuam abrindo
    assert.equal(m.migrarPartida({ ...ini, rota: undefined }).rota, undefined)
    // Altar: Rota de estudo começa com os poderes
    const comAltar = mr.novaPartida(9, { ids: pool.map((c) => c.id), talentos: { rota: 2 } }).estado
    assert.ok(['mapa', 'desvio'].every((t) => comAltar.encaixes.some((x) => x.tipo === t)))
  }

  // Envenenado (superpoder das serpentes): a picada envenena; cada flashcard arde; 5 acertos seguidos curam; errar recomeça.
  {
    let achado = null
    for (let a = 1; a < 40 && !achado; a++) for (let sm = 1; sm < 40; sm++) { if (m.inimigoDoAndar(a, sm, 'masmorra').inimigo.envenena) { achado = [a, sm]; break } }
    assert.ok(achado, 'nenhuma serpente envenena')
    const [andarV, sementeV] = achado
    const iv = m.inimigoDoAndar(andarV, sementeV, 'masmorra').inimigo
    let q = motor.novaPartida(sementeV).estado
    q = { ...q, andar: andarV, sementeBase: sementeV, vida: 100, vidaMax: 100, encaixes: [], reliquias: [], inimigo: { ...q.inimigo, id: iv.id, vida: 5000, vidaMax: 5000, barreira: 0, fase: 1, rodadas: 0, errosSeguidos: 0, furia: false } }
    q = { ...q, atual: { ...q.atual, criticoInimigo: false, carregado: false } }
    const errada = (x) => x.atual.ordem.findIndex((o) => o !== motor.carta(x.atual.id).certa)
    let r = motor.responder(q, errada(q))
    assert.ok(r.eventos.some((x) => x.tipo === 'envenenado' && x.dano === iv.envenena && x.faltam === m.VENENO.acertos), 'a picada não envenenou')
    assert.ok(!r.eventos.some((x) => x.tipo === 'veneno'), 'o veneno ardeu no mesmo flashcard da picada')
    q = motor.seguir(r.estado).estado
    // acertos seguidos: arde em cada um e passa no quinto
    for (let k = 1; k <= m.VENENO.acertos; k++) {
      q = { ...q, inimigo: { ...q.inimigo, vida: 5000 } }
      const antes = q.vida
      r = motor.responder(q, certaPos(q))
      const tique = r.eventos.find((x) => x.tipo === 'veneno')
      assert.ok(tique && tique.faltam === m.VENENO.acertos - k, 'contagem do veneno')
      assert.ok(r.estado.vida <= antes - Math.min(iv.envenena, antes - 1) + 20, 'o veneno não ardeu')
      if (k < m.VENENO.acertos) assert.ok(r.estado.veneno, 'curou cedo')
      q = motor.seguir(r.estado).estado
    }
    assert.ok(r.eventos.some((x) => x.tipo === 'veneno-curado') && !r.estado.veneno, 'cinco acertos não curaram')
    // o veneno nunca derruba: deixa 1 de vida
    q = { ...q, vida: 1, veneno: { dano: 9, faltam: 3 }, inimigo: { ...q.inimigo, vida: 5000 } }
    r = motor.responder(q, certaPos(q))
    assert.ok(r.estado.vida >= 1, 'o veneno derrubou o herói')
    q = { ...q, vida: 1, sequencia: 0, atual: { ...q.atual } }
    const sem = motor.responder({ ...q, veneno: { dano: 9, faltam: 3 } }, errada(q))
    if (sem.estado.fase !== 'fim') assert.ok(sem.estado.vida >= 1)
    // errar envenenado recomeça a conta
    q = { ...motor.seguir(r.estado).estado, vida: 100, veneno: { dano: 2, faltam: 2 } }
    q = { ...q, andar: 1, sementeBase: 42, atual: { ...q.atual, criticoInimigo: false, carregado: false } }
    r = motor.responder(q, errada(q))
    if (!m.inimigoDoAndar(1, 42, 'masmorra').inimigo.envenena) assert.equal(r.estado.veneno.faltam, m.VENENO.acertos, 'o erro não recomeçou a conta')
  }

  // Em chamas (o Sopro do dragão): arde por 3 flashcards, nunca derruba, e um acerto difícil apaga.
  {
    let achado = null
    for (let a = 1; a < 80 && !achado; a++) for (let sm = 1; sm < 40; sm++) { const iv = m.inimigoDoAndar(a, sm, 'masmorra').inimigo; if (iv.queima && iv.carrega) { achado = [a, sm]; break } }
    assert.ok(achado, 'nenhum dragão queima')
    const [andarQ, sementeQ] = achado
    const iq = m.inimigoDoAndar(andarQ, sementeQ, 'masmorra').inimigo
    let q = motor.novaPartida(sementeQ).estado
    q = { ...q, andar: andarQ, sementeBase: sementeQ, vida: 300, vidaMax: 300, encaixes: [], reliquias: [], inimigo: { ...q.inimigo, id: iq.id, vida: 9000, vidaMax: 9000, barreira: 0, fase: 1, rodadas: 0, errosSeguidos: 0, furia: false } }
    q = { ...q, atual: { ...q.atual, criticoInimigo: false, carregado: true } }
    const erradaQ = (x) => x.atual.ordem.findIndex((o) => o !== motor.carta(x.atual.id).certa)
    let r = motor.responder(q, erradaQ(q))
    assert.ok(r.eventos.some((x) => x.tipo === 'chamuscado' && x.faltam === m.QUEIMADURA.flashcards), 'o Sopro não queimou')
    assert.ok(!r.eventos.some((x) => x.tipo === 'arde'), 'ardeu no mesmo flashcard do Sopro')
    // sem acerto difícil: arde nos 3 flashcards seguintes e apaga sozinho
    q = motor.seguir(r.estado).estado
    for (let k = 1; k <= m.QUEIMADURA.flashcards; k++) {
      q = { ...q, inimigo: { ...q.inimigo, vida: 9000 }, atual: { ...q.atual, carregado: false, criticoInimigo: false } }
      const naoDificil = motor.carta(q.atual.id).dificuldade !== 3
      r = motor.responder(q, naoDificil ? certaPos(q) : erradaQ(q))
      const t = r.eventos.find((x) => x.tipo === 'arde')
      assert.ok(t && t.faltam === m.QUEIMADURA.flashcards - k, 'contagem da queimadura')
      q = motor.seguir(r.estado).estado
    }
    assert.ok(r.eventos.some((x) => x.tipo === 'apagou' && x.motivo === 'tempo') && !r.estado.queimadura, 'o fogo não apagou sozinho')
    // acerto difícil apaga na hora, sem arder
    const dificil = cartas.find((c) => c.dificuldade === 3)
    if (dificil) {
      const qq = { ...q, queimadura: { dano: 3, faltam: 2 }, inimigo: { ...q.inimigo, vida: 9000 }, atual: { ...q.atual, id: dificil.id, ordem: dificil.opcoes.map((_, i) => i), eliminadas: [], respondida: false } }
      const rr = motor.responder(qq, dificil.certa)
      assert.ok(rr.eventos.some((x) => x.tipo === 'apagou' && x.motivo === 'dificil') && !rr.estado.queimadura, 'o acerto difícil não apagou')
      assert.ok(!rr.eventos.some((x) => x.tipo === 'arde'), 'ardeu mesmo apagando')
    }
  }

  // Grude (gosmas) e Tremor (golens)
  {
    const acha = (f) => { for (let a = 1; a < 80; a++) for (let sm = 1; sm < 40; sm++) { const iv = m.inimigoDoAndar(a, sm, 'masmorra').inimigo; if (f(iv)) return [a, sm, iv] } return null }
    const preparar = ([a, sm, iv], extra = {}) => {
      let q = motor.novaPartida(sm).estado
      q = { ...q, andar: a, sementeBase: sm, vida: 300, vidaMax: 300, reliquias: [], encaixes: [], ...extra, inimigo: { ...q.inimigo, id: iv.id, vida: 9000, vidaMax: 9000, barreira: 0, fase: 1, rodadas: 0, errosSeguidos: 0, furia: false } }
      return { ...q, atual: { ...q.atual, criticoInimigo: false, carregado: false } }
    }
    const errada = (x) => x.atual.ordem.findIndex((o) => o !== motor.carta(x.atual.id).certa)
    const g = acha((iv) => iv.gruda)
    assert.ok(g, 'nenhuma gosma gruda')
    let q = preparar(g)
    let r = motor.responder(q, errada(q))
    assert.ok(r.eventos.some((x) => x.tipo === 'grudou') && r.estado.grudado, 'não grudou')
    q = motor.seguir(r.estado).estado
    q = { ...q, atual: { ...q.atual, criticoInimigo: false, carregado: false } }
    const semGrude = motor.intencao({ ...q, grudado: false }).bruto, comGrude = motor.intencao(q).bruto
    assert.ok(comGrude > semGrude, 'o grude não aumentou o dano da intenção')
    r = motor.responder(q, certaPos(q))
    assert.ok(r.eventos.some((x) => x.tipo === 'desgrudou') && !r.estado.grudado, 'o acerto não desgrudou')
    const t = acha((iv) => iv.tremor)
    assert.ok(t, 'nenhum golem treme')
    q = preparar(t, { encaixes: [{ tipo: 'escudo', carga: 0 }, { tipo: 'pista', carga: 2 }].slice(1) })
    q = { ...q, atual: { ...q.atual, criticoInimigo: true } }
    r = motor.responder(q, errada(q))
    assert.ok(r.eventos.some((x) => x.tipo === 'tremor' && x.poder === 'pista'), 'o crítico do golem não derrubou carga')
    assert.equal(r.estado.encaixes.find((x) => x.tipo === 'pista')?.carga ?? 0, 1)
  }

  console.log('Motor da Batalha: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
