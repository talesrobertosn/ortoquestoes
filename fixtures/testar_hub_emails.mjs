// Contrato real da Edge Function com HTTP/DB/provedor isolados: nenhum e-mail sai desta fixture.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const tmp = await mkdtemp(join(process.cwd(), 'node_modules/.hub-teste-'))
const original = {
  fetch: globalThis.fetch,
  Deno: globalThis.Deno,
  EdgeRuntime: globalThis.EdgeRuntime,
  setTimeout: globalThis.setTimeout,
}
try {
  await build({
    entryPoints: ['supabase/functions/hub-emails/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: join(tmp, 'hub.mjs'),
  })
  await build({
    entryPoints: ['supabase/functions/enviar-email/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: join(tmp, 'individual.mjs'),
  })
  await build({
    entryPoints: ['supabase/functions/_shared/hub-regras.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: join(tmp, 'regras.mjs'),
  })
  const regras = await import(pathToFileURL(join(tmp, 'regras.mjs')))
  const ADM = '00000000-0000-4000-8000-00000000000a',
    A = '00000000-0000-4000-8000-000000000001',
    B = '00000000-0000-4000-8000-000000000002',
    DIA = regras.diaSP()
  const perfil = (nome) => ({
    nome,
    email: nome + '@exemplo.test',
    confirmado: true,
    quer_cartas: true,
    administrador: false,
    novidades: true,
    respondidas: 155,
    acertos: 110,
    erros: 45,
    semana: 0,
    dias_conta: 60,
    dias_parado: 12,
    assinante: false,
    historico: [],
  })
  const pessoas = new Map([
    [A, perfil('Ana')],
    [B, perfil('Bruno')],
  ])
  let rodada = null,
    fila = [],
    logs = [],
    envios = [],
    bloqueios = new Map(),
    handler,
    proximoPausado = false,
    provedor = 'ok',
    consultasFalham = false
  const ENV = {
    SUPABASE_URL: 'https://banco.test',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    RESEND_API_KEY: 'fake',
    EMAIL_REMETENTE: 'Teste <teste@exemplo.test>',
    EMAIL_SEGREDO: 'segredo-teste',
    APP_ORIGIN: 'https://ortoquestoes.com.br',
  }
  const fundos = []
  globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (h) => (handler = h) }
  globalThis.EdgeRuntime = { waitUntil: (p) => fundos.push(p) }
  globalThis.setTimeout = (f) => {
    f()
    return 0
  }
  const j = (v, status = 200) =>
    new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })
  const filtrar = (lista, url) =>
    lista.filter((row) =>
      [...url.searchParams].every(
        ([k, v]) =>
          ['select', 'order', 'limit'].includes(k) ||
          (v.startsWith('eq.') && String(row[k]) === v.slice(3)) ||
          (v.startsWith('gte.') && String(row[k]) >= v.slice(4)) ||
          (v.startsWith('in.(') && v.slice(4, -1).split(',').includes(String(row[k]))),
      ),
    )
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input),
      body = JSON.parse(init.body ?? '{}'),
      metodo = init.method ?? 'GET'
    if (url.pathname === '/biblioteca/indice.json') return j({ capitulos: [] })
    if (url.hostname === 'api.resend.com') {
      envios.push({ body, key: init.headers['Idempotency-Key'] })
      if (provedor === 'rede') throw new Error('conexao_interrompida')
      if (provedor === '400') return j({ message: 'rejeitado no teste' }, 400)
      return j({ id: 'provedor-' + envios.length })
    }
    if (url.pathname === '/auth/v1/user')
      return init.headers.Authorization === 'Bearer admin'
        ? j({ id: ADM })
        : init.headers.Authorization === 'Bearer comum'
          ? j({ id: A })
          : j({}, 401)
    if (url.pathname === '/rest/v1/administradores')
      return j(url.searchParams.get('id_usuario') === 'eq.' + ADM ? [{ id_usuario: ADM }] : [])
    const rpc = url.pathname.split('/rpc/')[1]
    if (rpc) {
      if (rpc === 'hub_worker_ativo') return j(true)
      if (rpc === 'hub_autenticar_processador') return j(body.p_segredo === 'a'.repeat(64))
      if (rpc === 'hub_pessoas') {
        if (consultasFalham) return j({}, 500)
        return j([...pessoas].map(([id_usuario, dados]) => ({ id_usuario, dados })))
      }
      if (rpc === 'hub_bloqueio') return j(bloqueios.get(body.p_id) ?? null)
      if (rpc === 'dados_carta_envio') return j(pessoas.get(body.p_id))
      if (rpc === 'dados_carta_usuario') return j(pessoas.get(body.p_id))
      if (rpc.startsWith('candidatos_')) return j([])
      if (rpc.startsWith('destinatarios_')) return j([])
      if (rpc === 'hub_avaliar')
        return j(body.p_itens.map((m) => ({ chave: m.chave, bloqueio: bloqueios.get(m.id_usuario) ?? null })))
      if (rpc === 'hub_iniciar') {
        if (!rodada) {
          rodada = {
            id: '00000000-0000-4000-8000-000000000099',
            dia: DIA,
            status: 'ativa',
            criado_em: new Date().toISOString(),
            resumo: body.p_resumo,
          }
          fila = body.p_itens.map((m, i) => ({
            id: 'fila-' + i,
            id_usuario: m.id_usuario,
            mensagem: m,
            status: 'pendente',
            rodada: rodada.id,
            envio_id: null,
            motivo: null,
          }))
        }
        return j(rodada.id)
      }
      if (rpc === 'hub_proximo') {
        if (proximoPausado || rodada?.status !== 'ativa') return j([])
        const f = fila.find((f) => f.status === 'pendente')
        if (f) f.status = 'processando'
        return j(f ? [f] : [])
      }
      if (rpc === 'hub_reservar') {
        const f = fila.find((f) => f.id === body.p_fila),
          b = bloqueios.get(f.id_usuario)
        if (b) {
          f.status = 'adiado'
          f.motivo = b
          return j({ bloqueio: b })
        }
        const antigo = logs.find((l) => l.id_usuario === f.id_usuario && l.status === 'falhou')
        const id = antigo?.id ?? logs.length + 1
        if (antigo) antigo.status = 'enviando'
        else logs.push({ id, id_usuario: f.id_usuario, status: 'enviando', origem: 'lote' })
        f.envio_id = id
        return j({ envio_id: id })
      }
      if (rpc === 'hub_repetir') {
        let n = 0
        for (const f of fila)
          if (f.status === 'falhou' && (!f.envio_id || logs.find((l) => l.id === f.envio_id)?.status === 'falhou')) {
            f.status = 'pendente'
            n++
          }
        if (n) rodada.status = 'ativa'
        return j(n)
      }
      throw new Error('RPC não coberta: ' + rpc)
    }
    let lista =
      url.pathname === '/rest/v1/email_rodadas'
        ? rodada
          ? [rodada]
          : []
        : url.pathname === '/rest/v1/email_fila'
          ? fila
          : url.pathname === '/rest/v1/emails_enviados'
            ? logs
            : null
    if (url.pathname === '/rest/v1/preferencias_email') return j([])
    if (url.pathname === '/rest/v1/emails_enviados' && metodo === 'POST') {
      if (logs.some((l) => l.id_usuario === body.id_usuario && l.referencia === body.referencia)) return j({}, 409)
      const l = { ...body, id: logs.length + 1 }
      logs.push(l)
      return j([l])
    }
    if (lista) {
      const escolhidas = filtrar(lista, url)
      if (metodo === 'PATCH') for (const r of escolhidas) Object.assign(r, body)
      return j(escolhidas)
    }
    throw new Error('HTTP não coberto: ' + url)
  }
  await import(pathToFileURL(join(tmp, 'hub.mjs')))
  const chamar = async (acao, extra = {}, auth = 'admin') => {
    const r = await handler(
      new Request('https://hub.test', {
        method: 'POST',
        headers: {
          authorization: 'Bearer ' + auth,
          'content-type': 'application/json',
          ...(auth === 'cron' ? { 'x-segredo': ENV.EMAIL_SEGREDO } : {}),
        },
        body: JSON.stringify({ acao, ...extra }),
      }),
    )
    return { status: r.status, dados: await r.json() }
  }
  const esperar = async () => {
    while (fundos.length) await fundos.shift()
  }
  assert.equal((await chamar('preparar', {}, 'comum')).status, 403)
  assert.equal((await chamar('processar', {}, 'admin')).status, 403)
  for (const [token, codigo] of [['a'.repeat(64), 200], ['b'.repeat(64), 403]]) {
    const resposta = await handler(new Request('https://hub.test', { method: 'POST', headers: { 'content-type': 'application/json', 'x-segredo': token }, body: JSON.stringify({ acao: 'processar' }) }))
    assert.equal(resposta.status, codigo, 'credencial exclusiva do agendador validada sem liberar chamadas anônimas')
  }
  const p = await chamar('preparar')
  assert.equal(p.status, 200)
  assert.equal(p.dados.prontas.length, 2)
  assert.equal(envios.length, 0, 'prévia nunca envia')
  assert.equal(rodada, null, 'prévia não inicia rodada')
  const itens = p.dados.prontas.map((m) => ({ chave: m.chave, assunto: m.assunto, corpo: m.corpo }))
  assert.equal((await chamar('iniciar', { itens: [{ chave: 'pessoa-injetada' }] })).status, 409)
  assert.equal(rodada, null, 'seleção desconhecida não cria rodada')
  proximoPausado = true
  await Promise.all([chamar('iniciar', { itens }), chamar('iniciar', { itens })])
  await esperar()
  assert.equal(fila.length, 2, 'clique concorrente não duplica fila')
  assert.equal(envios.length, 0)
  await chamar('pausar', { id: rodada.id })
  assert.equal(rodada.status, 'pausada')
  proximoPausado = false
  await chamar('processar', {}, 'cron')
  assert.equal(envios.length, 0, 'pausa sobrevive sem navegador')
  bloqueios.set(A, 'Preferência desligada depois da prévia')
  provedor = '400'
  await chamar('retomar', { id: rodada.id })
  await esperar()
  assert.equal(fila.find((f) => f.id_usuario === A).status, 'adiado')
  assert.equal(fila.find((f) => f.id_usuario === B).status, 'falhou')
  assert.equal(logs[0].status, 'falhou')
  assert.equal(envios.length, 1, 'preferência nova impede contato')
  assert.ok(envios[0].key.startsWith('hub/'), 'chave de idempotência no provedor')
  provedor = 'ok'
  await chamar('repetir', { id: rodada.id })
  await esperar()
  assert.equal(fila.find((f) => f.id_usuario === B).status, 'enviado')
  assert.equal(logs.length, 1, 'retry conserva o registro reservado')
  assert.equal(envios.length, 2)
  assert.equal(envios[0].key, envios[1].key, 'retry usa a mesma chave no provedor')
  await chamar('iniciar', { itens })
  await esperar()
  assert.equal(envios.length, 2, 'reabrir a rodada concluída não reenvia')
  // Uma entrega ambígua fica explícita e nunca entra no retry.
  const f = fila.find((f) => f.id_usuario === B)
  f.status = 'pendente'
  rodada.status = 'ativa'
  provedor = 'rede'
  await chamar('processar', {}, 'cron')
  assert.equal(f.status, 'incerto')
  const antes = envios.length
  await chamar('repetir', { id: rodada.id })
  await esperar()
  assert.equal(envios.length, antes)
  consultasFalham = true
  assert.equal((await chamar('preparar')).status, 500, 'consulta incompleta falha fechada')
  assert.equal(envios.length, antes)
  // Prioridade atravessa campanhas; opção bloqueada não oculta uma alternativa válida.
  const m = p.dados.prontas[0]
  const selecao = regras.selecionarHub([
    { ...m, chave: 'a', tipo: 'vespera_prova', prioridade: 10, bloqueio: '48h' },
    { ...m, chave: 'b', tipo: 'relatorio', prioridade: 20, bloqueio: null },
  ])
  assert.equal(selecao.prontas.length, 1)
  assert.equal(selecao.prontas[0].tipo, 'relatorio')
  assert.equal(selecao.prontas[0].concorrentes.length, 1)
  assert.equal(
    regras.sugestaoPessoal(B, { ...perfil('Bruno'), assinante: true, dias_parado: 1, semana: 40 }, new Date())?.tipo ??
      null,
    null,
    'nenhum contato genérico para preencher fila',
  )
  assert.equal(regras.contaTeste('Tales Roberto', 'real@exemplo.test'), true)
  // A ficha usa as mesmas regras e não manda de novo ao repetir a mesma requisição.
  await import(pathToFileURL(join(tmp, 'individual.mjs')))
  provedor = 'ok'
  consultasFalham = false
  const individual = {
    id_usuario: B,
    modelo: 'opiniao',
    origem: 'manual',
    assunto: 'Bruno, sobre o estudo',
    corpo: p.dados.prontas[1].corpo,
  }
  bloqueios.set(B, 'Limite de três e-mails em 14 dias')
  assert.equal((await chamar('carta', individual)).status, 409)
  assert.equal(envios.length, antes, 'a ficha respeita o bloqueio central')
  bloqueios.delete(B)
  assert.equal(
    (await chamar('carta', { ...individual, modelo: 'obrigado_assinatura' })).status,
    409,
    'modelo aposentado também é recusado no servidor',
  )
  assert.equal((await chamar('carta', individual)).status, 200)
  const depois = envios.length
  assert.equal((await chamar('carta', individual)).status, 409)
  assert.equal(envios.length, depois, 'duplo clique na ficha não duplica e-mail')
  provedor = '400'
  assert.equal((await chamar('carta', { ...individual, assunto: 'Bruno, teste de recusa' })).status, 502)
  assert.equal(logs.at(-1).status, 'falhou', 'recusa confirmada não é entrega incerta')
  provedor = 'rede'
  assert.equal((await chamar('carta', { ...individual, assunto: 'Bruno, teste de rede' })).status, 502)
  assert.equal(logs.at(-1).status, 'enviando', 'falha de rede conserva a reserva para não duplicar')
  console.log(
    'Hub: prévia sem envio, autenticação, seleção adulterada, clique concorrente, pausa/retomada, preferência alterada, falha confirmada, retry idempotente, entrega incerta, consulta indisponível e prioridade entre campanhas passaram. Nenhum e-mail real enviado.',
  )
} finally {
  Object.assign(globalThis, original)
  await rm(tmp, { recursive: true, force: true })
}
