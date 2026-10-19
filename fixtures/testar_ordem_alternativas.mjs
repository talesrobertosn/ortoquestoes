// Revisão em ordem nova (src/dados/ordemAlternativas.ts, pedido do Tales em 19/10/2026):
// quando embaralha e quando não, a certa fora da letra da última vez, a distribuição,
// a ida e volta das letras e o comentário reordenado em TODO o acervo.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-ordem-'))
const arquivo = join(pasta, 'o.mjs')
try {
  await build({ entryPoints: ['src/dados/ordemAlternativas.ts'], outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))

  // ---- Gera o letras.json do acervo de agora (o publicar.yml gera de novo antes do build)
  const gerado = join(pasta, 'letras.json')
  execFileSync('python3', ['scripts/letras_alternativas.py', '--saida', gerado], { stdio: 'pipe' })
  const letras = JSON.parse(await readFile(gerado, 'utf8'))

  // ---- Ida e volta das letras
  for (const ordem of ['CADB', 'DCBA', 'BADCE', 'ABCD']) {
    for (let i = 0; i < ordem.length; i++) {
      const original = 'ABCDE'[i]
      assert.equal(m.letraGuardada(ordem, m.letraExibida(ordem, original)), original, `ida e volta ${ordem} ${original}`)
    }
  }
  assert.equal(m.letraExibida('CADB', 'C'), 'A', 'a original C aparece na A')
  assert.equal(m.letraGuardada('CADB', 'A'), 'C', 'a A da tela guarda a C')
  assert.equal(m.letraExibida(null, 'B'), 'B', 'sem ordem, a mesma letra')

  const q = (id, n = 4, gabarito = 'B') => ({ id, gabarito, alternativas: [...'ABCDE'.slice(0, n)].map((letra) => ({ letra })) })
  const antes = { q: 1000, historico: [{ em: 1000 }] }
  const base = { letras, registro: antes, desde: 5000, semente: 's1' }

  // ---- Quando não embaralha
  assert.equal(m.ordemParaRevisao(q('x-1'), { ...base, registro: null }), null, 'primeira vez: ordem da prova')
  assert.equal(m.ordemParaRevisao(q('x-1'), { ...base, registro: { q: 6000, historico: [{ em: 6000 }] } }), null, 'respondida só nesta sessão: continua na ordem da prova')
  assert.equal(m.ordemParaRevisao(q('x-1', 2), base), null, 'certo/errado não embaralha')
  assert.equal(m.ordemParaRevisao({ ...q('x-1'), tipo: 'dissertativa' }, base), null, 'dissertativa não embaralha')
  assert.equal(m.ordemParaRevisao(q('x-1'), { ...base, letras: null }), null, 'sem letras.json, nada embaralha')
  const fixa = Object.keys(letras.fixas)[0]
  assert.ok(fixa, 'há questões fixas')
  assert.equal(m.ordemParaRevisao(q(fixa), base), null, 'questão fixa fica na ordem da prova')

  // ---- Determinismo: mesma sessão, mesma ordem; outra sessão pode mudar
  const o1 = m.ordemParaRevisao(q('x-2'), base)
  assert.ok(o1 && o1 !== 'ABCD', 'revisão embaralha')
  assert.equal(m.ordemParaRevisao(q('x-2'), base), o1, 'recarregar mostra a mesma ordem')
  assert.equal([...o1].sort().join(''), 'ABCD', 'permutação válida')

  // ---- A certa nunca repete a letra da última vez, e a distribuição é equilibrada
  const contagem = { A: 0, B: 0, C: 0, D: 0 }
  let repetiu = 0
  const N = 8000
  for (let i = 0; i < N; i++) {
    const ultima = 'ABCD'[i % 4]
    const ordem = m.ordemParaRevisao(q(`dist-${i}`, 4, 'C'), { ...base, semente: `s${i}`, ultimaExibida: { l: ultima, em: 100 } })
    const nova = m.letraExibida(ordem, 'C')
    if (nova === ultima) repetiu++
    contagem[nova]++
  }
  assert.equal(repetiu, 0, 'a certa nunca fica na letra da última vez')
  for (const [l, n] of Object.entries(contagem)) assert.ok(n > N * 0.2 && n < N * 0.3, `letra ${l} recebe a certa em ~25% (${(100 * n / N).toFixed(1)}%)`)
  // A última exibida depois do início da sessão não conta (a decisão não muda ao responder).
  const semUltima = m.ordemParaRevisao(q('x-3'), base)
  assert.equal(m.ordemParaRevisao(q('x-3'), { ...base, ultimaExibida: { l: 'A', em: 9999 } }), semUltima, 'resposta desta sessão não muda a ordem')
  // Sem registro da última vez, a certa sai da letra da prova.
  for (let i = 0; i < 500; i++) assert.notEqual(m.letraExibida(m.ordemParaRevisao(q(`p-${i}`), { ...base, semente: `t${i}` }), 'B'), 'B', 'sai da letra da prova')
  // Cinco alternativas também.
  const o5 = m.ordemParaRevisao(q('x-5', 5, 'E'), base)
  assert.equal([...o5].sort().join(''), 'ABCDE')

  // ---- Numéricas: só invertem; alternam com a ordem da prova
  const num = letras.numeros[0]
  assert.ok(num, 'há questões numéricas')
  assert.equal(m.ordemParaRevisao(q(num, 4, 'A'), base), 'DCBA', 'numérica inverte')
  assert.equal(m.ordemParaRevisao(q(num, 4, 'A'), { ...base, ultimaExibida: { l: 'D', em: 100 } }), null, 'depois de invertida, volta à da prova')

  // ---- Comentário reordenado: em TODO o acervo, cada letra conferida vira a nova e o resto do texto não muda
  const questoes = new Map()
  for (const nome of await readdir('public/acervo/temas')) {
    const dados = JSON.parse(await readFile(join('public/acervo/temas', nome), 'utf8'))
    const lista = Array.isArray(dados) ? dados : dados.questoes ?? Object.values(dados)
    for (const x of lista) if (x && x.id) questoes.set(x.id, x)
  }
  const comentarios = new Map()
  for (const nome of await readdir('public/acervo/comentarios')) {
    for (const [id, c] of Object.entries(JSON.parse(await readFile(join('public/acervo/comentarios', nome), 'utf8')))) comentarios.set(id, c)
  }
  let conferidos = 0
  for (const [id, refs] of Object.entries(letras.refs)) {
    const com = questoes.get(id)?.comentarioIA ?? comentarios.get(id)
    assert.ok(com, `${id}: comentário existe`)
    assert.equal(m.assinaturaComentario(com), refs.h, `${id}: assinatura igual à do script`)
    const n = questoes.get(id).alternativas.length
    const ordem = n === 5 ? 'EDCBA' : 'DCBA'
    const { comentario: novo, letrasDaProva } = m.reordenarComentario(com, ordem, refs)
    assert.equal(letrasDaProva, false, `${id}: letras conferidas`)
    for (const [campo, pos, letra] of refs.r) {
      const original = campo.startsWith('i') ? com.incorretas[campo.slice(1)] : com[campo]
      const reordenado = campo.startsWith('i') ? novo.incorretas[m.letraExibida(ordem, campo.slice(1))] : novo[campo]
      assert.equal(Array.from(original)[pos], letra, `${id} ${campo}:${pos} aponta para a letra ${letra}`)
      assert.equal(Array.from(reordenado)[pos], m.letraExibida(ordem, letra), `${id} ${campo}:${pos} trocada`)
      assert.equal(Array.from(reordenado).length, Array.from(original).length, `${id} ${campo}: só a letra muda`)
      conferidos++
    }
    for (const l of Object.keys(com.incorretas ?? {})) assert.equal(novo.incorretas[m.letraExibida(ordem, l)] !== undefined, true, `${id}: análise da ${l} acompanha a alternativa`)
  }
  assert.ok(conferidos > 1000, `letras conferidas: ${conferidos}`)
  // Comentário editado depois do letras.json: a tela avisa em vez de trocar letra errada.
  const [idQualquer, refsQualquer] = Object.entries(letras.refs)[0]
  const comQualquer = questoes.get(idQualquer)?.comentarioIA ?? comentarios.get(idQualquer)
  const editado = m.reordenarComentario({ ...comQualquer, correta: comQualquer.correta + ' (texto novo)' }, 'DCBA', refsQualquer)
  assert.equal(editado.letrasDaProva, true, 'texto mudou: avisa que as letras citadas são as da prova')

  // ---- Toda questão que embaralha cita letras só onde o letras.json conferiu (nenhuma "C é a correta" solta)
  const solta = /\*\*(?:Correta|Provável correta)\s*:\s*\**[A-E](?![\w-])/
  for (const [id, x] of questoes) {
    if (letras.fixas[id] || (x.alternativas?.length ?? 0) < 3) continue
    const com = x.comentarioIA ?? comentarios.get(id)
    if (com && solta.test(com.correta ?? '')) assert.ok(letras.refs[id], `${id}: "Correta: X" precisa estar no letras.json`)
  }

  console.log(`ordem das alternativas: ok (${conferidos} letras de comentário conferidas; certa por letra ${Object.values(contagem).map((n) => (100 * n / N).toFixed(1) + '%').join(' ')})`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
