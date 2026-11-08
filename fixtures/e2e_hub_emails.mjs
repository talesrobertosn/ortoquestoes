// Captura e interação com a interface real, dados fictícios e nenhuma rede de envio real.
// CHROMIUM=/usr/bin/chromium node scripts/capturar_telas.mjs '/admin?aba=prontas' hub --admin --sem-cracha --roteiro fixtures/e2e_hub_emails.mjs --pasta work/hub/revisao --agora 2026-11-08T21:00:00Z
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const tmp = await mkdtemp(join(process.cwd(), 'node_modules/.hub-e2e-'))
await build({
  stdin: {
    contents:
      "export * from './supabase/functions/_shared/cartas.ts';export * from './supabase/functions/_shared/hub-regras.ts'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(tmp, 'cen.mjs'),
})
const m = await import(pathToFileURL(join(tmp, 'cen.mjs')))
await rm(tmp, { recursive: true, force: true })
const DIA = '2026-11-08',
  HOJE = new Date(DIA + 'T21:00:00Z')
const perf = (nome, extra = {}) => ({
  nome,
  email: nome.split(' ')[0].toLowerCase() + '@exemplo.com',
  confirmado: true,
  quer_cartas: true,
  novidades: true,
  respondidas: 164,
  acertos: 116,
  erros: 48,
  semana: 0,
  dias_conta: 70,
  dias_parado: 13,
  assinante: false,
  ...extra,
})
function carta(nome, tipo, extra = {}, op = {}) {
  const dados = perf(nome, extra),
    id_usuario = '00000000-0000-4000-8000-' + m.sementeDe(nome).toString(16).padStart(12, '0')
  const c = m.gerarCarta(m.perfilDosDados(dados), {
    tipo,
    hoje: HOJE,
    ignorarCadencia: true,
    semente: m.sementeDe(nome),
    ...op,
  })
  return {
    ...c,
    chave: nome,
    id_usuario,
    nome,
    email: dados.email,
    tipo,
    categoria: 'cartas',
    tipo_log: 'carta',
    referencia: nome,
    prioridade: m.PRIORIDADE[tipo] ?? 80,
    motivo: m.TIPOS[tipo].descricao,
    ultimo_envio: '2026-10-27T13:00:00Z',
    concorrentes: [],
    bloqueio: null,
    fonte: 'pessoal',
  }
}
const prontas = [
  carta(
    'Pedro Ribeiro',
    'simulado_resultado',
    {},
    {
      campanha: {
        simulado: { titulo: 'Simulado Nacional de outubro', acertos: 42, total: 50, posicao: 8, participantes: 180 },
      },
    },
  ),
  carta('Mariana Almeida', 'assinou_sem_cronograma', { assinante: true, dias_parado: 1 }),
  carta(
    'Rafaela Martins',
    'pix_3_dias',
    { assinante: true },
    { pix: { diasRestantes: 3, fimEm: '2026-11-11T23:59:00-03:00', plano: 'mensal' } },
  ),
  carta('Bruno Cortez', 'sumiu'),
  carta('Lívia Santos', 'reta_final', { provas: ['teot'], dias_para_prova: 48 }),
  carta('Ana Costa', 'nunca_comecou', { respondidas: 0, acertos: 0, erros: 0, dias_parado: null, dias_conta: 4 }),
  carta('Gabriel Rocha', 'marco', { respondidas: 250, acertos: 180, erros: 70 }, { marco: 250 }),
]
const adiadas = [
  { ...prontas[3], chave: 'ad-1', nome: 'Camila Farias', bloqueio: 'Intervalo mínimo de 48 horas' },
  { ...prontas[0], chave: 'ad-2', nome: 'Felipe Ramos', bloqueio: 'Limite de três e-mails em 14 dias' },
  { ...prontas[6], chave: 'ad-3', nome: 'Juliana Nunes', bloqueio: 'Preferência de e-mail desligada' },
]
export const CENARIO_HUB = { dia: DIA, prontas, adiadas, avisos: [], consultadas: 118 }
export async function antes(p) {
  await p.emulateMedia({ reducedMotion: 'reduce' })
  let rodada = null,
    fila = []
  const automaticos = [
    { id: 1, assunto: 'Marcos, obrigado pela assinatura', status: 'enviado', enviado_em: '2026-11-08T19:00:00Z' },
    { id: 2, assunto: 'Seu cronograma está pronto, Beatriz', status: 'enviado', enviado_em: '2026-11-08T16:40:00Z' },
  ]
  const estado = () => ({ worker_ativo: true, dia: DIA, rodada, fila, rodadas: rodada ? [rodada] : [], automaticos })
  await p.route('**/functions/v1/hub-emails', async (route) => {
    const a = route.request().postDataJSON()
    let resposta
    if (a.acao === 'preparar') resposta = { dia: DIA, prontas, adiadas, avisos: [], consultadas: 118 }
    else if (a.acao === 'iniciar') {
      if (!rodada) {
        rodada = {
          id: '00000000-0000-4000-8000-000000000099',
          dia: DIA,
          status: 'ativa',
          criado_em: '2026-11-08T21:00:00Z',
        }
        fila = a.itens.map((i, n) => ({
          id: String(n),
          mensagem: { ...prontas.find((m) => m.chave === i.chave), assunto: i.assunto, corpo: i.corpo },
          status: n < 2 ? 'enviado' : 'pendente',
          motivo: null,
        }))
      }
      resposta = estado()
    } else if (a.acao === 'pausar') {
      rodada.status = 'pausada'
      resposta = estado()
    } else if (a.acao === 'retomar') {
      rodada.status = 'ativa'
      resposta = estado()
    } else resposta = estado()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resposta) })
  })
  await p.route('**/rest/v1/rpc/listar_emails_admin', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await p.route('**/rest/v1/rpc/obter_config_emails_admin', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ marcos_automaticos: true, alertas_admin: true }]),
    }),
  )
}
export default async function (p, foto, nome) {
  await p.getByRole('heading', { name: 'Central de e-mails', exact: true }).waitFor()
  await p.getByRole('button', { name: 'Enviar rodada de hoje · 7', exact: true }).waitFor()
  await foto('01-hoje', { fullPage: true })
  await foto('01-dobra')
  // A lista responde a busca e filtros, sem afetar a seleção do envio.
  await p.getByRole('textbox', { name: 'Buscar pessoa ou assunto' }).fill('Mariana')
  await p.waitForFunction(() => document.querySelectorAll('.hub-pessoa').length === 1, null, { timeout: 5000 })
  assert.equal(await p.locator('.hub-pessoa').count(), 1)
  await p.getByRole('textbox', { name: 'Buscar pessoa ou assunto' }).fill('')
  await p.getByRole('button', { name: 'Pular Ana Costa', exact: true }).click()
  await p.getByRole('button', { name: 'Enviar rodada de hoje · 6', exact: true }).waitFor()
  await p.getByRole('button', { name: 'Incluir Ana Costa', exact: true }).click()
  await p.getByRole('button', { name: 'Ver mensagem', exact: true }).first().click()
  await p.getByRole('dialog').waitFor()
  await foto('02-previa')
  await p.getByRole('button', { name: 'Fechar prévia' }).click()
  await p.getByRole('button', { name: /3 contatos aguardam/ }).click()
  await foto('03-adiados', { fullPage: true })
  // Confira todos os tamanhos pedidos sem rolagem lateral, com o mesmo conteúdo.
  for (const largura of [320, 390, 768, 1024, 1440, 1920]) {
    await p.setViewportSize({ width: largura, height: 900 })
    await p.waitForTimeout(60)
    const tamanhos = await p.evaluate(() => ({ corpo: document.documentElement.scrollWidth, janela: innerWidth }))
    if (tamanhos.corpo > tamanhos.janela + 1)
      console.log(
        await p.evaluate(() =>
          [...document.querySelectorAll('body *')]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 2)
            .map((e) => ({
              tag: e.tagName,
              cls: e.className,
              text: e.textContent?.slice(0, 70),
              right: e.getBoundingClientRect().right,
            }))
            .slice(-15),
        ),
      )
    assert.ok(tamanhos.corpo <= tamanhos.janela + 1, `${nome}/${largura}: rolagem lateral ${JSON.stringify(tamanhos)}`)
  }
  await p.setViewportSize({ width: nome === 'pc' ? 1440 : 390, height: nome === 'pc' ? 900 : 844 })
  await p.getByRole('button', { name: 'Enviar rodada de hoje · 7', exact: true }).click()
  await p.getByRole('heading', { name: 'Sua rodada está em andamento.' }).waitFor()
  await foto('04-andamento', { fullPage: true })
  await p.getByRole('button', { name: 'Pausar próximos envios' }).click()
  await p.getByRole('heading', { name: 'Sua rodada está pausada.' }).waitFor()
  await foto('05-pausada', { fullPage: true })
  await p.getByRole('button', { name: 'Retomar rodada' }).click()
  await p.reload()
  await p.getByRole('heading', { name: 'Sua rodada está em andamento.' }).waitFor()
  assert.equal(
    await p.getByRole('button', { name: 'Enviar rodada de hoje · 7', exact: true }).count(),
    0,
    'reabrir não oferece novo disparo',
  )
  await p.getByRole('link', { name: 'Modelos e regras', exact: true }).first().click()
  await p.getByRole('heading', { name: 'Como a rodada é escolhida' }).waitFor()
  assert.equal((await p.getByRole('button', { name: /Obrigado pela assinatura.*v\./ }).count()) <= 1, true)
  await foto('06-regras', { fullPage: true })
}
