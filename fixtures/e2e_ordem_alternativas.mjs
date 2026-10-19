// Ponta a ponta da revisão em ordem nova, no navegador, com conta de exemplo (Supabase simulado).
// Precisa do site rodando: npm run build && npx vite preview --port 4175
// Uso: node fixtures/e2e_ordem_alternativas.mjs [id] (padrão mao-0011: gabarito D, o conceito cita "a alternativa C")
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:4175/'
// As capturas vão para fora do repositório (SAIDA muda a pasta).
const foto = (nome) => join(process.env.SAIDA ?? tmpdir(), nome)
const id = process.argv[2] ?? 'mao-0011'
const tema = id.replace(/-\d+$/, '')
const dados = JSON.parse(await readFile(`public/acervo/temas/${tema}.json`, 'utf8'))
const lista = Array.isArray(dados) ? dados : dados.questoes ?? Object.values(dados)
const questao = lista.find((q) => q.id === id)
const textoDe = Object.fromEntries(questao.alternativas.map((a) => [a.texto.trim(), a.letra]))
const gabarito = questao.gabarito

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const agora = Math.floor(Date.now() / 1000)
const uid = '11111111-1111-1111-1111-111111111111'
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: agora + 36000, email: 'residente@exemplo.com' })}.x`
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'residente@exemplo.com', user_metadata: { nome: 'Marina' }, app_metadata: {}, created_at: '2026-03-01T00:00:00Z' }
const sessao = { access_token: jwt, token_type: 'bearer', expires_in: 36000, expires_at: agora + 36000, refresh_token: 'r', user }
// Respondida (errada, marcou A) há dois dias: a visita de hoje é uma revisão.
const antes = Date.now() - 2 * 864e5
const respondidas = { [id]: { c: false, q: antes, tentativas: 1, acertos: 0, erros: 1, m: 'A', p: 'A', confianca: 'seguro', proximaRevisao: Date.now() - 1000, historico: [{ em: antes, correta: false, confianca: 'seguro' }] } }

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })
const pagina = await (await navegador.newContext({ viewport: { width: 1100, height: 900 } })).newPage()
const erros = []
pagina.on('pageerror', (e) => erros.push(e.message))
await pagina.route(/supabase\.co/, (rota) => {
  const u = rota.request().url()
  if (u.includes('obter_acesso_premium')) return rota.fulfill({ json: [{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }] })
  if (u.includes('/auth/v1/user')) return rota.fulfill({ json: user })
  if (u.includes('obter_turma_questao') || u.includes('turma')) return rota.fulfill({ json: [{ respondentes: 40, acertos: 20, com_letra: 40, letras: { A: 4, B: 6, C: 10, D: 20 } }] })
  return rota.fulfill({ json: [] })
})
await pagina.addInitScript(([s, i, r]) => {
  localStorage.setItem('sb-ortoquestoes-auth', s)
  localStorage.setItem('oq-aparelho-conta', i)
  const k = 'ortoquestoes:conta:' + i + ':'
  if (!localStorage.getItem(k + 'respondidas')) localStorage.setItem(k + 'respondidas', r)
}, [JSON.stringify(sessao), uid, JSON.stringify(respondidas)])

const lerAlternativas = () => pagina.$$eval('ul.alternativas button.alternativa', (bs) => bs.map((b) => ({
  letra: b.querySelector('.alternativa__letra')?.textContent?.trim(),
  texto: (b.querySelector('.alternativa__texto') ?? b).textContent.replace(/^Alternativa [A-E]\.\s*/, '').trim(),
})))
const originalDe = (texto) => Object.entries(textoDe).find(([t]) => texto.startsWith(t.slice(0, 40)))?.[1]

await pagina.goto(BASE + '#/questao/' + id)
await pagina.waitForSelector('ul.alternativas button.alternativa', { timeout: 15000 })
await pagina.waitForTimeout(800)
assert.ok(await pagina.locator('.qz-ordem--nova').count(), 'aviso de ordem nova aparece na revisão')
const exibidas = await lerAlternativas()
const ordem = exibidas.map((a) => originalDe(a.texto)).join('')
assert.equal([...ordem].sort().join(''), 'ABCDE'.slice(0, exibidas.length), `todas as alternativas aparecem uma vez (${ordem})`)
assert.notEqual(ordem, 'ABCDE'.slice(0, exibidas.length), 'ordem diferente da prova')
const certaNaTela = exibidas[ordem.indexOf(gabarito)].letra
assert.notEqual(certaNaTela, gabarito, `a certa (${gabarito} na prova) está em outra letra: ${certaNaTela}`)
await pagina.screenshot({ path: foto('ordem-alternativas-1-revisao.png'), fullPage: false })

// Responde a certa pela letra da tela.
await pagina.locator('ul.alternativas button.alternativa').nth('ABCDE'.indexOf(certaNaTela)).click()
await pagina.getByRole('button', { name: 'Certeza' }).click({ timeout: 2000 }).catch(() => {})
await pagina.getByRole('button', { name: 'Responder ' + certaNaTela }).click()
await pagina.waitForSelector('.cm-alt--certa', { timeout: 15000 })
await pagina.waitForTimeout(600)
const guardado = await pagina.evaluate((i) => JSON.parse(localStorage.getItem('ortoquestoes:conta:11111111-1111-1111-1111-111111111111:respondidas'))[i], id)
assert.equal(guardado.m, gabarito, `a resposta é guardada na letra da prova (${guardado.m})`)
assert.equal(guardado.c, true, 'contou como acerto')
const cabecaCerta = await pagina.locator('.cm-alt--certa .cm-alt__letra').textContent()
assert.equal(cabecaCerta.trim(), certaNaTela, 'o comentário mostra a certa na letra da tela')
// Cada "alternativa X" do conceito que o letras.json conferiu aparece com a letra da tela.
const refs = JSON.parse(await readFile('public/acervo/letras.json', 'utf8')).refs[id]?.r ?? []
const conceito = (await pagina.locator('.cm-conceito').textContent().catch(() => '')) ?? ''
let citadas = 0
for (const [campo, , letra] of refs) {
  if (campo !== 'conceito') continue
  const nova = 'ABCDE'[ordem.indexOf(letra)]
  if (conceito.includes('alternativa ' + nova)) citadas++
}
if (refs.some(([c]) => c === 'conceito')) assert.ok(citadas > 0, 'o conceito cita a alternativa pela letra da tela')
await pagina.locator('.cm').screenshot({ path: foto('ordem-alternativas-2-comentario.png') })
const ultima = await pagina.evaluate((i) => JSON.parse(localStorage.getItem('ortoquestoes:conta:11111111-1111-1111-1111-111111111111:alternativas:ultimas') ?? '{}')[i], id)
assert.equal(ultima?.l, certaNaTela, 'guarda a letra em que a certa apareceu')

// "Ver na ordem da prova": volta tudo para as letras originais, com a resposta no lugar certo.
await pagina.getByRole('button', { name: 'Ver na ordem da prova' }).click()
await pagina.waitForTimeout(400)
const naProva = await lerAlternativas()
assert.equal(naProva.map((a) => originalDe(a.texto)).join(''), 'ABCDE'.slice(0, naProva.length), 'na ordem da prova')
assert.equal((await pagina.locator('.cm-alt--certa .cm-alt__letra').textContent()).trim(), gabarito, 'comentário volta à letra da prova')
await pagina.screenshot({ path: foto('ordem-alternativas-3-prova.png') })

// Recarregar depois de responder: a resposta de hoje continua marcada, na letra certa da ordem que aparecer.
await pagina.reload()
await pagina.waitForSelector('.cm-alt--certa', { timeout: 15000 })
const depois = await lerAlternativas()
const ordemDepois = depois.map((a) => originalDe(a.texto)).join('')
const marcada = (await pagina.locator('.cm-alt--certa .cm-alt__letra').textContent()).trim()
assert.equal(marcada, 'ABCDE'[ordemDepois.indexOf(gabarito)], 'depois de recarregar, a certa continua coerente com a ordem da tela')

// ---- Na sessão: o mesmo caminho, e o resumo mostra as letras que a pessoa viu.
const sessaoTreino = { id: 'e2e-' + Date.now().toString(36), criadaEm: Date.now(), filtros: { areas: ['base'], temas: [], subtemas: [], provas: [], anos: [], dificuldades: [], comImagem: false, comComentario: false, soSimulados: false, incluirAnuladas: false, embaralhar: true, limite: null, situacao: 'todas', busca: '' }, ids: [id], posicao: 0, respostas: {}, revisar: [], riscadas: {}, concluidaEm: null, simulado: false, limiteSegundos: null }
await pagina.evaluate(([i, s]) => {
  const k = 'ortoquestoes:conta:' + i + ':'
  // Volta o registro para "respondida há dois dias" (a visita direta acima respondeu hoje).
  const r = JSON.parse(localStorage.getItem(k + 'respondidas'))
  const id = s.ids[0]
  const antes = Date.now() - 2 * 864e5
  r[id] = { ...r[id], q: antes, m: 'A', historico: [{ em: antes, correta: false, confianca: 'seguro' }] }
  localStorage.setItem(k + 'respondidas', JSON.stringify(r))
  localStorage.setItem(k + 'sessao:atual', JSON.stringify(s))
}, [uid, sessaoTreino])
await pagina.goto(BASE + '#/sessao')
await pagina.waitForSelector('ul.alternativas button.alternativa', { timeout: 15000 })
await pagina.waitForTimeout(600)
assert.ok(await pagina.locator('.qz-ordem--nova').count(), 'sessão: aviso de ordem nova')
const naSessao = await lerAlternativas()
const ordemSessao = naSessao.map((a) => originalDe(a.texto)).join('')
const erradaNaTela = naSessao.find((a) => originalDe(a.texto) !== gabarito).letra
const erradaOriginal = ordemSessao['ABCDE'.indexOf(erradaNaTela)]
await pagina.locator('ul.alternativas button.alternativa').nth('ABCDE'.indexOf(erradaNaTela)).click()
await pagina.getByRole('button', { name: 'Responder ' + erradaNaTela }).click()
await pagina.waitForSelector('.cm-alt--certa', { timeout: 15000 })
const salva = await pagina.evaluate((i) => JSON.parse(localStorage.getItem('ortoquestoes:conta:' + i + ':sessao:atual')), uid)
assert.equal(salva.respostas[id].escolhida, erradaOriginal, `sessão guarda a letra da prova (${erradaOriginal})`)
assert.equal(salva.ordens[id], ordemSessao, 'sessão guarda a ordem em que a questão apareceu')
await pagina.goto(BASE + '#/resumo')
await pagina.waitForTimeout(2500)
await pagina.screenshot({ path: foto('ordem-alternativas-4-resumo.png'), fullPage: true })
const chips = await pagina.locator('.rs-chip').allTextContents()
assert.ok(chips.some((t) => t.includes('Marcou ' + erradaNaTela)), `resumo: marcou ${erradaNaTela} (a letra da tela) — ${chips.join(' | ')}`)
assert.ok(chips.some((t) => t.includes('Gabarito ' + 'ABCDE'[ordemSessao.indexOf(gabarito)])), 'resumo: gabarito na letra da tela')

assert.deepEqual(erros, [], 'sem erro de JavaScript')
await navegador.close()
console.log(`e2e ordem das alternativas: ok (${id}: prova ${gabarito}, tela ${certaNaTela}, ordem ${ordem})`)
