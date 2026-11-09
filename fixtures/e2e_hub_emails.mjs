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
  carta('Mariana Almeida', 'comecou_parou', { respondidas: 20, acertos: 15, erros: 5, dias_parado: 6 }),
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
  { ...prontas[3], chave: 'ad-1', id_usuario: 'ad-1', nome: 'Camila Farias', email: 'camila@exemplo.com', bloqueio: 'Intervalo mínimo de 48 horas' },
  { ...prontas[0], chave: 'ad-2', id_usuario: 'ad-2', nome: 'Felipe Ramos', email: 'felipe@exemplo.com', bloqueio: 'Limite de três e-mails em 14 dias' },
  { ...prontas[6], chave: 'ad-3', id_usuario: 'ad-3', nome: 'Juliana Nunes', email: 'juliana@exemplo.com', bloqueio: 'Preferência de e-mail desligada' },
]
export const CENARIO_HUB = { dia: DIA, prontas, adiadas, opcoes: [...prontas, ...adiadas], avisos: [], consultadas: 118 }
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
    if (a.acao === 'preparar') {
      const opcoes = [...prontas, ...adiadas].map(x => ({ ...x, bloqueio: fila.some(f => f.mensagem.id_usuario === x.id_usuario) ? 'Já incluído nos envios de hoje' : x.bloqueio }))
      resposta = { dia: DIA, ...m.selecionarHub(opcoes), opcoes, avisos: [], consultadas: 118 }
    }
    else if (a.acao === 'iniciar') {
      if (!rodada) {
        rodada = {
          id: '00000000-0000-4000-8000-000000000099',
          dia: DIA,
          status: 'ativa',
          criado_em: '2026-11-08T21:00:00Z',
        }
        fila = []
      }
      const novas = a.itens.filter(i => !fila.some(f => f.mensagem.chave === i.chave))
      fila.push(...novas.map((i, n) => ({
          id: String(n),
          mensagem: { ...prontas.find((m) => m.chave === i.chave), assunto: i.assunto, corpo: i.corpo },
          status: 'pendente',
          motivo: null,
        })))
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
  const geral = () => p.getByRole('button', { name: /^Enviar todos os cenários/ })
  const card = titulo => p.locator('.hub-cenario').filter({ has: p.getByRole('heading', { name: titulo, exact: true }) })
  await p.getByRole('heading', { name: 'Quem precisa de um e-mail hoje?', exact: true }).waitFor()
  await geral().filter({ hasText: '7' }).waitFor()
  assert.equal(await p.locator('.hub-cenario').count(), 7)
  await foto('00-liberados', {fullPage:true})
  await p.getByRole('checkbox', {name:'Mostrar também cenários sem pessoas liberadas'}).check()
  assert.equal(await p.locator('.hub-cenario').count(), m.CENARIOS_HUB.length)
  assert.equal(await p.getByText('Assinou e não montou o cronograma', { exact: true }).count(), 0)
  await foto('01-cenarios', { fullPage: true }); await foto('01-dobra')
  await card('Pix: faltam 3 dias').getByRole('button', { name: 'Ver pessoas e mensagens' }).click()
  await p.getByRole('heading', { name: 'Pix: faltam 3 dias', exact: true }).last().waitFor()
  assert.equal(await p.locator('.hub-lista .hub-pessoa').count(), 1)
  await p.getByRole('button', { name: 'Ver mensagem', exact: true }).click()
  await p.getByRole('dialog').waitFor(); await foto('02-previa')
  await p.getByRole('button', { name: 'Fechar prévia' }).click()
  await p.getByLabel('Filtrar cenário').selectOption('todos')
  await p.getByRole('textbox', { name: 'Buscar pessoa ou assunto' }).fill('Mariana')
  assert.equal(await p.locator('.hub-lista .hub-pessoa').count(), 1)
  await p.getByRole('textbox', { name: 'Buscar pessoa ou assunto' }).fill('')
  await p.getByRole('button', { name: 'Pular Ana Costa', exact: true }).click()
  assert.match(await geral().innerText(), /6/)
  assert.equal(await card('Criou a conta e não começou').getByRole('button', { name: /Enviar cenário/ }).isDisabled(), true)
  await p.getByRole('button', { name: 'Incluir Ana Costa', exact: true }).click()
  await card('Pix: faltam 3 dias').getByRole('button', { name: /Enviar cenário/ }).click()
  await p.getByRole('heading', { name: 'Envios de hoje', exact: true }).waitFor()
  await p.waitForFunction(() => /6/.test(document.querySelector('.hub-dia__acao button')?.textContent ?? ''))
  assert.equal(await card('Pix: faltam 3 dias').getByRole('button', { name: /Enviar cenário/ }).isDisabled(), true)
  await card('Fogo apagando').getByRole('button', { name: /Enviar cenário/ }).click()
  await p.waitForFunction(() => /5/.test(document.querySelector('.hub-dia__acao button')?.textContent ?? ''))
  assert.equal(await p.locator('.hub-pessoa--fila').count(), 2)
  await p.getByRole('button', { name: 'Pausar próximos envios', exact: true }).click()
  await p.getByText('A fila está pausada', { exact: true }).waitFor()
  await card('Começou e parou').getByRole('button', { name: /Enviar cenário/ }).click()
  await p.waitForFunction(() => document.querySelectorAll('.hub-pessoa--fila').length === 3)
  await foto('03-fila-pausada', { fullPage: true })
  await p.getByRole('button', { name: 'Retomar fila', exact: true }).first().click()
  await p.getByRole('button', { name: 'Pausar próximos envios', exact: true }).waitFor()
  await geral().click()
  await p.waitForFunction(() => document.querySelectorAll('.hub-pessoa--fila').length === 7)
  await p.waitForFunction(() => /· 0$/.test(document.querySelector('.hub-dia__acao button')?.textContent ?? ''))
  assert.match(await geral().innerText(), /0/)
  await foto('04-fila', { fullPage: true })
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'sem transbordamento horizontal')
  console.log('Hub', nome, ': cenários, busca, pular, prévia, envios parciais, fila ampliada, pausa e botão geral OK')
}
