// Shorts (25/11/2026): peso da imagem, primeira com imagem, revisão escondida e índice real.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-shorts-'))
try {
  const saida = join(pasta, 's.mjs')
  await build({ entryPoints: ['src/shorts/sorteio.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const s = await import(pathToFileURL(saida))
  let semente = 42
  const sorte = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648 }

  const indice = JSON.parse(await readFile('public/acervo/shorts.json', 'utf8'))
  const itens = s.lerIndice(indice)
  assert.ok(itens.length > 5000, 'índice dos Shorts com as questões do site')
  const aptas = s.aptas(itens, s.AJUSTES_PADRAO)
  assert.ok(aptas.every((q) => q.grupo !== 2), 'Mão fica de fora por padrão')
  assert.ok(aptas.filter((q) => q.grupo === 3).every((q) => q.imagem), 'outras provas entram só com imagem')
  assert.ok(s.aptas(itens, { ...s.AJUSTES_PADRAO, mao: true }).some((q) => q.grupo === 2), 'Mão entra quando ligada')
  assert.ok(itens.filter((q) => q.grupo === 4).every((q) => q.imagem), 'OrtoQuestões Simulados só com imagem no índice')
  assert.ok(aptas.some((q) => q.grupo === 4), 'Simulados com imagem entram por padrão')
  assert.ok(s.aptas(itens, { ...s.AJUSTES_PADRAO, simulados: false }).every((q) => q.grupo !== 4), 'Simulados saem quando desligados')
  assert.ok(s.aptas(itens, { ...s.AJUSTES_PADRAO, soImagem: true }).every((q) => q.imagem), 'só com imagem')
  // Simulados de especialidade e seleções de mão separados (27/11/2026): nada disso entra com TEOT e TARO.
  assert.ok(aptas.every((q) => q.grupo < 5), 'Fellowship Quadril, SIMÃO e SBCM ficam de fora por padrão')
  for (const [k, g] of [['simQuadril', 5], ['simSimao', 6], ['simSbcm', 7]]) {
    const so = s.aptas(itens, { ...s.AJUSTES_PADRAO, teot: false, taro: false, simulados: false, [k]: true })
    assert.ok(so.length > 0 && so.every((q) => q.grupo === g), `${k} sozinho traz só o próprio simulado`)
  }
  const capasIdx = JSON.parse(await readFile('public/acervo/shorts-capas.json', 'utf8'))
  const capasMao = new Set(capasIdx.q.filter((c) => /SIMÃO|SBCM|Fellowship/.test(c[6])).map((c) => c[0]))
  assert.ok(aptas.every((q) => !capasMao.has(q.id)), 'nenhuma capa de SIMÃO, SBCM ou Fellowship no padrão')

  // Peso da imagem: mira ~60% sem roteiro fixo.
  assert.equal(s.pesoImagem(0, 10), 1)
  assert.ok(Math.abs(s.pesoImagem(50, 50) - 1.5) < 1e-9)
  let comImagem = 0, primeiraOk = true, temaRepetido = 0
  const N = 600
  for (let rodada = 0; rodada < 6; rodada++) {
    const noFeed = new Set(); let anterior = null
    for (let i = 0; i < N / 6; i++) {
      const r = s.sortear({ itens, historico: {}, ajustes: s.AJUSTES_PADRAO, noFeed, anterior, posicao: i, desdeRevisao: 0, agora: 0, sorte })
      assert.ok(r, 'sempre há uma próxima')
      if (i === 0 && !r.item.imagem) primeiraOk = false
      if (anterior && anterior.tema === r.item.tema) temaRepetido++
      if (r.item.imagem) comImagem++
      noFeed.add(r.item.id); anterior = r.item
    }
  }
  assert.ok(primeiraOk, 'a primeira do feed tem imagem')
  const fracao = comImagem / N
  assert.ok(fracao > 0.45 && fracao < 0.72, `imagem em torno de 60% (deu ${(fracao * 100).toFixed(0)}%)`)
  assert.ok(temaRepetido / N < 0.2, 'raramente dois do mesmo tema seguidos')

  // Revisão escondida.
  const agora = 1_000 * s.DIA
  let voltas = 0, dentro = true
  for (let i = 0; i < 2000; i++) {
    const v = s.agendarVolta(false, false, agora, sorte)
    if (v !== null) { voltas++; const d = (v - agora) / s.DIA; if (d < 3 || d > 7) dentro = false }
  }
  assert.ok(voltas > 1250 && voltas < 1550, 'errou: cerca de 70% voltam')
  assert.ok(dentro, 'sempre de 3 a 7 dias')
  let voltasAcerto = 0
  for (let i = 0; i < 2000; i++) if (s.agendarVolta(true, false, agora, sorte) !== null) voltasAcerto++
  assert.ok(voltasAcerto > 450 && voltasAcerto < 750, 'acertou: cerca de 30% voltam')
  assert.equal(s.agendarVolta(true, true, agora, sorte), null, 'acertou na revisão: fixou')
  assert.equal(s.agendarVolta(false, true, agora, sorte), agora + 3 * s.DIA, 'errou na revisão: 3 dias')

  const alvo = aptas[10]
  const h = { [alvo.id]: { id: alvo.id, em: agora - 4 * s.DIA, certo: false, revisao: false, voltaEm: agora - 1 } }
  const ctx = (posicao, desde) => ({ itens, historico: h, ajustes: s.AJUSTES_PADRAO, noFeed: new Set(), posicao, desdeRevisao: desde, agora, sorte })
  assert.equal(s.sortear(ctx(0, 9)).revisao, null, 'revisão nunca é a primeira')
  assert.equal(s.sortear(ctx(2, 1)).revisao, null, 'no máximo uma a cada quatro')
  const rev = s.sortear(ctx(5, 3))
  assert.equal(rev.item.id, alvo.id, 'revisão vencida volta')
  assert.equal(s.textoRevisao(rev.revisao, agora), 'Você errou essa há 4 dias')
  assert.equal(s.sortear({ ...ctx(5, 3), ajustes: { ...s.AJUSTES_PADRAO, revanche: false } }).revisao, null, 'revanche desligada')
  // Questão esperando a revisão não volta pelo sorteio comum.
  const h2 = { [alvo.id]: { ...h[alvo.id], voltaEm: agora + s.DIA } }
  for (let i = 0; i < 200; i++) assert.notEqual(s.sortear({ ...ctx(1, 0), historico: h2 }).item.id, alvo.id)
  console.log('Shorts: sorteio e revisão escondida ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
