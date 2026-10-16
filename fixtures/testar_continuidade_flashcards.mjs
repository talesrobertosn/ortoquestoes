// Continuidade da Cripta entre aparelhos (15/10/2026): mescla de partidas pela data, lápides
// (partida encerrada não ressuscita), união do Bestiário e do Altar sem perder nem duplicar
// cristais, e compatibilidade com o que versões anteriores do site guardaram.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// sem localStorage: o armazenamento usa a memória (visitante), suficiente para ler e gravar as chaves
globalThis.window = Object.assign(new EventTarget(), { localStorage: undefined, sessionStorage: undefined })
globalThis.CustomEvent ??= class extends Event { constructor(t, o) { super(t); this.detail = o?.detail } }
const pasta = await mkdtemp(join(tmpdir(), 'oq-continuidade-'))
const arquivo = join(pasta, 'c.mjs')
try {
  await build({
    stdin: {
      contents: `export * from './src/flashcards/continuidade'; export { criarMotor, migrarPartida } from './src/flashcards/motor/regras'; export { BARALHO_DEMO } from './src/flashcards/dados/baralhoDemo'; export { gravar, ler } from './src/estado/armazenamento'; export * from './src/flashcards/progresso'; export { ganharCristais, comprarTalento } from './src/flashcards/motor/altar'`,
      resolveDir: process.cwd(),
    },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const motor = m.criarMotor(m.BARALHO_DEMO)
  const nova = (semente, modo = 'masmorra', extra = {}) => ({ ...motor.novaPartida(semente, { modo }).estado, ...extra })
  const vaga = (p, em, aparelho = 'A') => ({ id: m.idDaPartida(p), em, andar: p.andar, aparelho, partida: p.fase === 'fim' ? null : p })
  const jogo = (partidas = {}, extra = {}) => ({ versao: 1, atualizadoEm: 0, partidas, patamar: null, encerradas: [], bestiario: { vistos: [], vencidos: [] }, altar: { versao: 1, cristais: 0, ganhos: 0, talentos: {}, porAparelho: {} }, ...extra })

  // 1. Mescla por data: vale a partida mais recente, venha de onde vier
  const golem = nova(11, 'masmorra', { idPartida: 'p-golem', andar: 3 })
  const anel = nova(22, 'masmorra', { idPartida: 'p-anel', andar: 9 })
  assert.equal(m.mesclarVaga(vaga(golem, 100), vaga(anel, 200, 'B')).id, 'p-anel', 'servidor mais novo vence')
  assert.equal(m.mesclarVaga(vaga(golem, 300), vaga(anel, 200, 'B')).id, 'p-golem', 'aparelho mais novo vence')
  assert.equal(m.mesclarVaga(undefined, vaga(anel, 200, 'B')).id, 'p-anel', 'aparelho sem partida recebe a da conta')
  assert.equal(m.mesclarVaga(vaga(golem, 100), undefined).id, 'p-golem', 'conta sem partida fica com a do aparelho')
  // a mesma partida mais adiantada no outro aparelho
  const golemAdiante = { ...golem, andar: 5 }
  assert.equal(m.mesclarVaga(vaga(golem, 100), vaga(golemAdiante, 180, 'B')).andar, 5)
  // duas partidas antigas (sem carimbo): fica a mais funda; empate, a do aparelho
  assert.equal(m.mesclarVaga(vaga(golem, 0), vaga(anel, 0, 'B')).id, 'p-anel')
  assert.equal(m.mesclarVaga(vaga(anel, 0), vaga({ ...anel }, 0, 'B')).aparelho, 'A')

  // 2. Lápide: partida encerrada não ressuscita
  const morta = { ...golem, fase: 'fim' }
  // o outro aparelho morreu no Golem (lápide às 150); este aparelho ainda tinha a cópia viva e mexeu nela às 300
  const r1 = m.mesclarVaga(vaga(golem, 300), vaga(morta, 150, 'B'))
  assert.equal(r1.partida, null, 'a cópia viva da partida encerrada não volta')
  assert.equal(r1.id, 'p-golem')
  // a lápide só sai da vaga quando outra partida a substitui, mas continua na lista de encerradas
  const z = nova(33, 'masmorra', { idPartida: 'p-nova' })
  const encerradas = [{ id: 'p-golem', modo: 'masmorra', andar: 3, em: 150 }]
  assert.equal(m.mesclarVaga(vaga(golem, 500), vaga(z, 400, 'B'), encerradas).id, 'p-nova', 'cópia velha de partida encerrada perde até para uma partida mais antiga')
  // jogo inteiro: a lápide entra nas encerradas dos dois lados
  const jl = jogo({ masmorra: vaga(golem, 300) })
  const jr = jogo({ masmorra: vaga(morta, 150, 'B') })
  const jm = m.mesclarJogos(jl, jr)
  assert.equal(jm.partidas.masmorra.partida, null)
  assert.deepEqual(jm.encerradas.map((e) => e.id), ['p-golem'])
  // depois, uma partida nova neste aparelho (sem a lápide na vaga) e a cópia velha num terceiro aparelho
  const jNovo = m.mesclarJogos(jogo({ masmorra: vaga(z, 600) }, { encerradas: jm.encerradas }), jm)
  assert.equal(jNovo.partidas.masmorra.id, 'p-nova')
  const jTerceiro = m.mesclarJogos(jogo({ masmorra: vaga(golem, 700, 'C') }), jNovo)
  assert.equal(jTerceiro.partidas.masmorra.id, 'p-nova', 'o terceiro aparelho não ressuscita a partida encerrada')
  // lápide de outra partida, mais nova: vale a mais recente (desistir no outro aparelho por último)
  assert.equal(m.mesclarVaga(vaga(anel, 100), vaga(morta, 150, 'B')).partida, null)

  // 3. Bestiário: união, vencido também é visto
  assert.deepEqual(m.mesclarBestiario({ vistos: ['golem', 'serpente'], vencidos: ['golem'] }, { vistos: ['anel'], vencidos: ['anel', 'corvo'] }),
    { vistos: ['golem', 'serpente', 'anel', 'corvo'], vencidos: ['golem', 'anel', 'corvo'] })
  assert.deepEqual(m.mesclarBestiario(null, { vistos: 'quebrado' }), { vistos: [], vencidos: [] })

  // 4. Altar: talentos pelo maior nível; cristais ganhos por aparelho (somados); saldo = ganhos - custo
  const altarA = m.normalizarAltar({ versao: 1, cristais: 80, ganhos: 100, talentos: { vida: 1 } }, 'A') // gastou 20 no Vigor
  const altarB = m.normalizarAltar({ versao: 1, cristais: 50, ganhos: 50, talentos: {} }, 'B')
  assert.deepEqual(altarA.porAparelho, { A: 100 })
  const altarM = m.mesclarAltar(altarA, altarB)
  assert.equal(altarM.ganhos, 150)
  assert.equal(altarM.cristais, 130, 'nada do que foi ganho nos dois aparelhos se perde')
  assert.deepEqual(altarM.talentos, { vida: 1 })
  assert.deepEqual(m.mesclarAltar(altarM, altarM), altarM, 'mesclar de novo não duplica')
  assert.deepEqual(m.mesclarAltar(altarM, altarA), altarM, 'a cópia velha de um aparelho não duplica')
  // B, já mesclado, ganha 30 e compra o Bolso (30); A segue com a cópia antiga
  let b2 = m.ganharCristais(altarM, 30)
  b2 = m.comprarTalento(b2, 'pista')
  b2 = m.normalizarAltar(b2, 'B')
  assert.equal(b2.porAparelho.B, 80)
  const deVolta = m.mesclarAltar(m.normalizarAltar(altarM, 'A'), b2)
  assert.equal(deVolta.ganhos, 180)
  assert.equal(deVolta.cristais, 180 - 20 - 30, 'compra feita no outro aparelho desconta uma vez só')
  assert.deepEqual(deVolta.talentos, { vida: 1, pista: 1 })
  // Altar antigo (sem "ganhos" coerente): os cristais guardados nunca diminuem
  assert.equal(m.normalizarAltar({ versao: 1, cristais: 40, ganhos: 0, talentos: { ouro: 1 } }, 'A').cristais, 40)
  assert.equal(m.gastoDoAltar({ vida: 2, pista: 1 }), 20 + 45 + 30)

  // 5. Compatibilidade: formato antigo do aparelho e do servidor
  assert.equal(m.validarJogo(null), null)
  assert.equal(m.validarJogo({ versao: 2 }), null)
  assert.equal(m.validarJogo('lixo'), null)
  const doServidor = m.validarJogo({ versao: 1, partidas: { masmorra: { id: 'p-anel', em: 200, andar: 9, aparelho: 'B', partida: anel }, torre: { id: 'x', partida: { modo: 'masmorra' } } }, encerradas: [{ id: 'q', em: 5 }] })
  assert.equal(doServidor.partidas.masmorra.partida.andar, 9)
  assert.equal(doServidor.partidas.torre, undefined, 'partida de outro modo na vaga é ignorada')
  assert.deepEqual(doServidor.bestiario, { vistos: [], vencidos: [] })
  assert.equal(m.mesclarJogos(jl, null), jl, 'servidor sem jogo (SQL não colado ou conta nova): fica o do aparelho')
  // partida da versão 2 do motor e partida sem carimbo continuam abrindo
  const v2 = { ...golem, versao: 2 }
  delete v2.ouro; delete v2.idPartida
  const daV2 = m.vagaDe(v2, 'masmorra', 'A')
  assert.equal(daV2.em, 0)
  assert.equal(daV2.id, `masmorra-${golem.sementeBase}`, 'partida antiga ganha um id derivado da semente')
  assert.equal(m.estavel({ b: 1, a: [2, { d: 1, c: 2 }] }), m.estavel({ a: [2, { c: 2, d: 1 }], b: 1 }), 'comparação não depende da ordem das chaves (jsonb)')

  // 6. Aparelho: ler, mesclar e gravar as mesmas chaves de antes
  const eu = m.idDoAparelho()
  assert.equal(m.idDoAparelho(), eu)
  const antigo = { ...golem }
  delete antigo.idPartida; delete antigo.atualizadoEm // como o site antigo salvava
  m.gravar(m.CHAVE_PARTIDA, antigo)
  m.gravar(m.CHAVE_ALTAR, { versao: 1, cristais: 12, ganhos: 12, talentos: {} })
  m.gravar(m.CHAVE_BESTIARIO, { vistos: ['golem'], vencidos: [] })
  const local = m.lerJogoLocal()
  assert.equal(local.partidas.masmorra.partida.andar, 3)
  assert.equal(local.altar.porAparelho[eu], 12)
  // a conta tem a partida do Senhor do Anel Pélvico, feita no computador
  const remoto = jogo({ masmorra: { id: 'p-anel', em: Date.now(), andar: 9, aparelho: 'computador', partida: anel } }, {
    bestiario: { vistos: ['anel'], vencidos: ['anel'] }, altar: m.normalizarAltar({ versao: 1, cristais: 30, ganhos: 30, talentos: {} }, 'computador'),
  })
  const vindas = m.gravarJogoLocal(m.mesclarJogos(local, remoto), local)
  assert.deepEqual(vindas, { masmorra: 9 }, 'avisa que a partida veio do outro aparelho')
  const salva = m.ler(m.CHAVE_PARTIDA, null)
  assert.equal(salva.idPartida, 'p-anel')
  assert.equal(m.migrarPartida(salva).andar, 9, 'o formato salvo continua o da partida (o site antigo abre)')
  assert.deepEqual(m.ler(m.CHAVE_BESTIARIO, null).vistos.sort(), ['anel', 'golem'])
  assert.equal(m.ler(m.CHAVE_ALTAR, null).cristais, 42)
  // modo aberto na tela: não troca por baixo, fica pendente para a arena adotar
  m.protegerModo('masmorra')
  const local2 = m.lerJogoLocal()
  const maisNova = { ...anel, andar: 10 }
  m.gravarJogoLocal(m.mesclarJogos(local2, jogo({ masmorra: { id: 'p-anel', em: Date.now() + 1000, andar: 10, aparelho: 'computador', partida: maisNova } })), local2)
  assert.equal(m.migrarPartida(m.ler(m.CHAVE_PARTIDA, null)).andar, 9, 'a partida aberta não muda por baixo')
  assert.equal(m.tomarPendente('masmorra').andar, 10)
  assert.equal(m.tomarPendente('masmorra'), undefined)
  m.protegerModo(null)

  // 7. Gravações do jogo: carimbo, lápide de "começar do zero", fim da partida e patamar
  const c = m.salvarPartidaLocal(anel, 1234)
  assert.equal(c.atualizadoEm, 1234)
  assert.equal(c.aparelho, eu)
  m.encerrarPartidaSalva('masmorra', eu, 2000)
  const lapide = m.ler(m.CHAVE_PARTIDA, null)
  assert.equal(lapide.encerrada, true)
  assert.equal(m.migrarPartida(lapide), null, 'o site antigo lê a lápide como "sem partida"')
  assert.equal(m.lerJogoLocal().encerradas[0].id, 'p-anel')
  m.salvarPartidaLocal({ ...z, fase: 'fim' }, 2500)
  assert.ok(m.lerJogoLocal().encerradas.some((e) => e.id === 'p-nova'), 'morte ou vitória entra nas encerradas')
  const torre = nova(44, 'torre', { idPartida: 'p-torre', andar: 10 })
  m.salvarPatamar(torre, 3000)
  assert.equal(m.lerJogoLocal().patamar.partida.andar, 10)
  m.limparPatamar(4000)
  assert.deepEqual(m.lerJogoLocal().patamar, { em: 4000, partida: null })
  assert.equal(m.migrarPartida(m.ler(m.CHAVE_PATAMAR, null)), null, 'patamar limpo continua "sem patamar" para o site antigo')
  // patamar: o mais recente vale (limpar depois de salvar não traz o antigo de volta)
  assert.equal(m.mesclarPatamar({ em: 4000, partida: null }, { em: 3000, partida: torre }).partida, null)
  assert.equal(m.mesclarPatamar({ em: 1000, partida: null }, { em: 3000, partida: torre }).partida.andar, 10)

  console.log('Continuidade da Cripta: mescla por data, lápides, Bestiário, Altar e formato antigo OK')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
