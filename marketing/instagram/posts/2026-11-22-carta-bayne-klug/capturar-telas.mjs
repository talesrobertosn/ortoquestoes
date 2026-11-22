// Telas novas do story 3 (22/11/2026), a partir de marketing/instagram/telas.mjs (conta de exemplo, Supabase simulado).
// Precisa do site rodando: npm run build && npx vite preview --port 4175. Depois, com PASTA=<pasta de saída>/ TEMA=claro LARGURA=1440 ALTURA=900 ESCALA=2:
//   node capturar-telas.mjs calendario   (Cronograma, mês seguinte)
//   CAMADA=Artérias node capturar-telas.mjs atlas
//   CAP=green-deficiencias-longitudinais node capturar-telas.mjs resumo
// Os recortes usados estão em img/ (tela-resumo-pc, tela-atlas-pc, tela-calendario).
// Captura telas do site com uma conta de exemplo (Supabase simulado) para usar nos posts.
// Precisa do site rodando: npm run build && npx vite preview --port 4175
// Uso: node marketing/instagram/telas.mjs [rota ...] [nome=rota@seletor ...]   (salva em marketing/instagram/telas/)
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const PASTA = process.env.PASTA
mkdirSync(PASTA, { recursive: true })
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const agora = Math.floor(Date.now() / 1000)
const uid = '11111111-1111-1111-1111-111111111111'
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: agora + 36000, email: 'residente@exemplo.com' })}.x`
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'residente@exemplo.com', user_metadata: { nome: 'Marina' }, app_metadata: {}, created_at: '2026-03-01T00:00:00Z' }
const sessao = { access_token: jwt, token_type: 'bearer', expires_in: 36000, expires_at: agora + 36000, refresh_token: 'r', user }
const nomes = ['Rafael M.', 'Beatriz C.', 'Thiago A.', 'Marina S.', 'Pedro H.', 'Camila R.', 'Gustavo L.', 'Larissa P.', 'Felipe D.', 'Juliana F.']
const mov = [[0, 1, false], [1, 2, false], [-1, -1, false], [2, 4, false], [-1, 0, false], [0, -2, false], [null, null, true], [1, 1, false], [-2, -3, false], [0, 0, false]]
const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
// Vitrine de emblemas e fogueira (dias seguidos) de cada nome, para as telas do ranking.
const vitrines = [['questoes-2000', 'dias-30', 'acertos-1000'], ['questoes-500', 'mestre-joelho'], ['questoes-500'], ['questoes-1000', 'mestre-trauma', 'precisao-25'], [], ['questoes-250', 'dias-30'], [], ['questoes-100']]
const fogueiras = [12, 0, 5, 9, 0, 31, 0, 4, 0, 0]
const linhas = nomes.map((apelido, i) => ({ emblemas: vitrines[i] ?? [], sequencia: fogueiras[i], posicao: i + 1, apelido, total: 412 - i * 29, total_geral: 1890 - i * 131, eh_voce: i === 3, variacao: mov[i][0], variacao_semana: mov[i][1], novo: mov[i][2], referencia_em: mov[i][2] ? null : ontem }))
const BASE = 'http://localhost:4175/'
const indice = await (await fetch(BASE + 'acervo/indice.json')).json()
const porTema = {}
for (const q of indice.questoes) (porTema[q.t] ??= []).push(q.id)
const taxa = [0.78, 0.71, 0.82, 0.74, 0.66, 0.8, 0.69, 0.76, 0.58, 0.85, 0.72]
const qtd = [150, 140, 120, 160, 110, 120, 170, 100, 60, 90, 40]
const hojeMs = Date.now(), DIA = 864e5
const respondidas = {}
let n = 0
for (const [t, lista] of Object.entries(porTema)) {
  lista.slice(0, qtd[t] ?? 50).forEach((id, i) => {
    const dia = hojeMs - (((n++ * 13) % 28) + 1) * DIA - 3600e3
    const certa = ((i * 37) % 100) / 100 < (taxa[t] ?? 0.7)
    respondidas[id] = { c: certa, q: dia, tentativas: 1, acertos: certa ? 1 : 0, erros: certa ? 0 : 1, sequencia: 1, proximaRevisao: certa ? hojeMs + ((i % 9) + 1) * DIA : hojeMs - (i % 3) * DIA, m: 'A', confianca: 'seguro', historico: [{ em: dia, correta: certa, confianca: 'seguro' }] }
  })
}
const historico = Array.from({ length: 14 }, (_, i) => ({ id: 's' + i, criadaEm: hojeMs - i * DIA - 4000e3, concluidaEm: hojeMs - i * DIA - 3600e3, total: 20, respondidas: 20, acertos: 14 + (i % 5), segundos: 1500, descricao: ['Joelho · TEOT', 'Trauma adulto', 'Coluna · TARO', 'Mão e punho'][i % 4] }))
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })
const ctx = await b.newContext({ viewport: { width: Number(process.env.LARGURA ?? 390), height: Number(process.env.ALTURA ?? 844) }, deviceScaleFactor: Number(process.env.ESCALA ?? (process.env.LARGURA ? 1 : 3)), isMobile: !process.env.LARGURA, hasTouch: !process.env.LARGURA, colorScheme: 'light' })
const p = await ctx.newPage()
await p.route(/supabase\.co/, rota => {
  const u = rota.request().url()
  // Assinante com cronograma montado, para as telas dos recursos pagos.
  if (u.includes('obter_acesso_premium')) return rota.fulfill({ json: [{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }] })
  if (u.includes('obter_plano_estudo')) return rota.fulfill({ json: [{ data_prova: process.env.DATA_PROVA ?? '2027-01-10', intensidade: 'firme', folgas: [0], prova: 'TEOT', base_respondidas: Object.keys(respondidas).length, criado_em: new Date(hojeMs).toISOString() }] })
  if (u.includes('obter_ranking_com_movimento')) return rota.fulfill({ json: linhas })
  if (u.includes('minha_posicao_ranking')) return rota.fulfill({ json: [{ posicao: 4, total: 325, total_geral: 1497 }] })
  if (u.includes('obter_estado_conta')) return rota.fulfill({ json: [{ respostas_total: Object.keys(respondidas).length, sequencia: 23, plano: 'anual', status_assinatura: 'ativa', fim_periodo: '2027-03-01T00:00:00Z', ultima_cobranca_em: null, cancelar_ao_fim: false }] })
  if (u.includes('/auth/v1/user')) return rota.fulfill({ json: user })
  if (u.includes('perfis_publicos')) return rota.fulfill({ json: { apelido: 'Marina S.', participa_ranking: true, emblemas: vitrines[3] } })
  if (u.includes('registrar_aparelho') || u.includes('sinal_aparelho')) return rota.fulfill({ json: true })
  if (u.includes('obter_aviso_site')) return rota.fulfill({ json: [] })
  return rota.fulfill({ json: [] })
})
await p.addInitScript(([s, id, r, h, t]) => {
  localStorage.setItem('sb-ortoquestoes-auth', s)
  localStorage.setItem('oq-aparelho-conta', id)
  localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
  localStorage.setItem('oq:eventos:ligados:v1', '0')
  localStorage.setItem('oq-termos-adiado', String(Date.now()))
  // O site sorteia claro ou escuro a cada visita; TEMA=claro|escuro fixa um dos dois.
  if (t) localStorage.setItem('ortoquestoes:tema', JSON.stringify(t))
  const k = 'ortoquestoes:conta:' + id + ':'
  if (!localStorage.getItem(k + 'respondidas')) {
    localStorage.setItem(k + 'respondidas', JSON.stringify(r))
    localStorage.setItem(k + 'historico', JSON.stringify(h))
  }
}, [JSON.stringify(sessao), uid, respondidas, historico, process.env.TEMA ?? ''])

const esconder = async () => { await p.addStyleTag({ content: '.aviso-cookies,.navegacao-mobile,vite-error-overlay{display:none!important}' }) }
const passo = process.argv[2]
if (passo === 'calendario') {
  await p.goto(BASE + '#/cronograma'); await p.waitForTimeout(2500); await esconder()
  await p.getByRole('button', { name: /Depois/ }).first().click({ timeout: 2000 }).catch(() => {})
  await p.getByRole('button', { name: /Abrir o mês inteiro/ }).first().click({ timeout: 4000 })
  await p.waitForTimeout(1500); await esconder()
  const prox = p.locator('button[aria-label*="róximo"]').first()
  await prox.click({ timeout: 3000 }).catch(async () => { const bs = p.locator('.cc-mes button, [class*="calend"] button'); console.log('botoes', await bs.count()) })
  await p.waitForTimeout(1200)
  const cal = p.locator('[class*="cc-"]').filter({ hasText: /Dezembro|Novembro/ }).first()
  const bb = await p.locator('text=/de 2026/').first().evaluate((e) => { let n = e; for (let i = 0; i < 6 && n.parentElement; i++) { n = n.parentElement; if (n.getBoundingClientRect().height > 600) break } n.scrollIntoView(); return true })
  await p.waitForTimeout(600)
  await p.screenshot({ path: PASTA + 'cal.png', fullPage: false })
}
if (passo === 'atlas') {
  await p.goto(BASE + '#/atlas'); await p.waitForTimeout(9000); await esconder()
  p.on('pageerror', (e) => console.log('ERRO', e.message))
  await p.keyboard.press('Escape'); await p.waitForTimeout(1500)
  if (process.env.CAMADA) { await p.getByText(process.env.CAMADA, { exact: true }).last().click({ timeout: 3000 }).catch((e) => console.log('sem camada', e.message)); await p.waitForTimeout(5000) }
  await p.screenshot({ path: PASTA + 'atlas.png' })
}
if (passo === 'resumo') {
  await p.goto(BASE + '#/resumos/' + process.env.CAP); await p.waitForTimeout(4000); await esconder()
  await p.addStyleTag({ content: '.lr-aviso,.lr-restante{display:none!important}' })
  if (process.env.ROLAR) await p.evaluate((y) => scrollTo(0, Number(y)), process.env.ROLAR)
  await p.waitForTimeout(800)
  await p.screenshot({ path: PASTA + 'resumo.png' })
}
await b.close()
