// Teste local: node e rede simulados. Rodar com
//   npx deno run --allow-env --allow-read supabase/tests/enviar_email_teste.ts
let handler: (req: Request) => Promise<Response> = async () => new Response()
;(Deno as unknown as { serve: unknown }).serve = (h: typeof handler) => { handler = h; return {} }
Deno.env.set('SUPABASE_URL', 'https://banco.teste'); Deno.env.set('SUPABASE_ANON_KEY', 'anon'); Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service')
Deno.env.set('RESEND_API_KEY', 're_teste'); Deno.env.set('EMAIL_REMETENTE', 'OrtoQuestões <contato@ortoquestoes.com.br>'); Deno.env.set('EMAIL_SEGREDO', 'segredo-de-teste-bem-longo')

const ANA = '00000000-0000-0000-0000-00000000000b', ADM = '00000000-0000-0000-0000-00000000000a'
const estado = { respondidas: 510, quer: true, marcosEnviados: new Set<number>(), enviados: [] as Array<{ to: string[]; subject: string; corpo?: Record<string, unknown> }>, prefs: [] as unknown[], resendFalha: false, linhas: new Map<number, string>(), ultimoErro: '', relatorioEnviado: false, relatorios: [] as unknown[] }
globalThis.fetch = async (entrada: RequestInfo | URL, opcoes: RequestInit = {}) => {
  const url = String(entrada), metodo = opcoes.method ?? 'GET'
  const corpo = opcoes.body ? JSON.parse(String(opcoes.body)) : null
  const j = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s })
  if (url.endsWith('/auth/v1/user')) {
    const auth = new Headers(opcoes.headers).get('authorization')
    return auth === 'Bearer ana' ? j({ id: ANA, email: 'ana@x.com' }) : auth === 'Bearer adm' ? j({ id: ADM, email: 'admin@x.com' }) : j({}, 401)
  }
  if (url.includes('api.resend.com') && estado.resendFalha) return j({ statusCode: 403, message: 'The ortoquestoes.com.br domain is not verified.' }, 403)
  if (url.includes('api.resend.com')) { estado.enviados.push({ to: corpo.to, subject: corpo.subject, corpo }); return j({ id: 'x' }) }
  if (url.includes('configuracao_emails')) return j([{ marcos_automaticos: true, alertas_admin: true }])
  if (url.includes('rpc/dados_email_usuario')) return j([{ email: 'ana@x.com', nome: 'Ana Paula', respondidas: estado.respondidas, acertos: 370, erros: 130, respondidas_7d: 80, dias_de_conta: 20, quer_conquistas: estado.quer }])
  if (url.includes('rpc/destinatarios_relatorio_mensal')) return j(estado.relatorioEnviado ? [] : [{ id_usuario: ANA }])
  if (url.includes('rpc/dados_relatorio_mensal')) return j({ email: 'ana@x.com', nome: 'Ana Paula', mes: corpo.p_mes, respostas: 320, certas: 230, erradas: 90, dias_ativos: 18,
    respostas_anterior: 250, certas_anterior: 160, erradas_anterior: 90, total_acumulado: 1400,
    temas: [{ tema: 'joelho', certas: 40, total: 50, certas_ant: 25, total_ant: 40 }, { tema: 'tumores', certas: 8, total: 20, certas_ant: 12, total_ant: 20 }],
    simulado: { titulo: 'Simulado Nacional · Setembro de 2026', acertos: 36, total: 50 } })
  if (url.includes('rpc/emails_administradores')) return j([{ email: 'admin@x.com' }])
  if (url.includes('administradores?id_usuario=eq.')) return j(url.includes(ADM) ? [{ id_usuario: ADM }] : [])
  if (url.includes('avaliacoes_comentario')) return j([{ observacao: 'Não entendi a inervação', motivo: 'confuso', atualizado_em: new Date().toISOString() }])
  if (url.includes('emails_enviados?tipo=eq.alerta_admin')) return j([])
  if (url.includes('emails_enviados') && metodo === 'POST') {
    if (corpo.tipo === 'relatorio') { estado.relatorios.push(corpo); return j([{ id: 900 }], 201) }
    if (corpo.tipo === 'marco') { if (estado.marcosEnviados.has(corpo.marco)) return j({ code: '23505' }, 409); estado.marcosEnviados.add(corpo.marco); estado.linhas.set(corpo.marco, corpo.status) }
    if (corpo.status === 'falhou') estado.ultimoErro = corpo.erro
    return j([{ id: corpo.marco ?? 1 }], 201)
  }
  if (url.includes('emails_enviados') && metodo === 'PATCH') {
    const retomar = url.match(/marco=eq\.(\d+)&status=eq\.falhou/), porId = url.match(/id=eq\.(\d+)$/)
    if (retomar) { const m = Number(retomar[1]); if (estado.linhas.get(m) !== 'falhou') return j([]); estado.linhas.set(m, corpo.status); return j([{ id: m }]) }
    if (porId) { estado.linhas.set(Number(porId[1]), corpo.status); if (corpo.erro) estado.ultimoErro = corpo.erro }
    return j([], 200)
  }
  if (url.includes('preferencias_email')) { estado.prefs.push(corpo); return new Response(null, { status: 201 }) }
  throw new Error('fetch inesperado: ' + url)
}

await import('../functions/enviar-email/index.ts')
const chamar = async (token: string | null, corpo: unknown) => {
  const r = await handler(new Request('https://f.teste/enviar-email', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(corpo) }))
  return { status: r.status, dados: await r.json() }
}
const confere = (nome: string, ok: boolean, extra: unknown = '') => { console.log(ok ? 'ok   ' : 'FALHA', nome, ok ? '' : JSON.stringify(extra)); if (!ok) Deno.exitCode = 1 }

let r = await chamar('ana', { acao: 'marco' })
confere('marco 500 enviado', r.dados.resultado === 'enviado' && r.dados.marco === 500 && estado.enviados.length === 1, r)
confere('assunto do marco', estado.enviados[0]?.subject === 'Ana, você chegou a 500 questões', estado.enviados[0])
r = await chamar('ana', { acao: 'marco' })
confere('segundo pedido não duplica', r.dados.resultado === 'ja_enviado' && estado.enviados.length === 1, r)
estado.respondidas = 900
r = await chamar('ana', { acao: 'marco' })
confere('longe do marco não envia atrasado', r.dados.resultado === 'longe_do_marco' && estado.enviados.length === 1, r)
estado.respondidas = 1003; estado.quer = false
r = await chamar('ana', { acao: 'marco' })
confere('quem desligou não recebe', r.dados.resultado === 'nao_quer', r)
estado.quer = true
r = await chamar('ana', { acao: 'marco' })
confere('marco 1000 enviado', r.dados.resultado === 'enviado' && r.dados.marco === 1000 && estado.enviados.length === 2, r)
r = await chamar(null, { acao: 'marco' })
confere('sem login recusa', r.status === 401, r)
r = await chamar('ana', { acao: 'parabens', id_usuario: ANA })
confere('não admin não manda parabéns', r.status === 403, r)
r = await chamar('adm', { acao: 'previa', id_usuario: ANA, recado: 'Continue assim!' })
confere('prévia devolve HTML com recado', r.status === 200 && r.dados.html.includes('Continue assim!') && estado.enviados.length === 2, { status: r.status })
r = await chamar('adm', { acao: 'parabens', id_usuario: ANA, recado: 'Continue assim!' })
confere('admin manda parabéns', r.dados.resultado === 'enviado' && estado.enviados.length === 3, r)
{
  const carta = estado.enviados[2]
  confere('parabéns sai como carta pessoal', carta.subject === 'Ana, um recado sobre o seu estudo' && !String(carta.corpo?.html).includes('Emblema desbloqueado') && String(carta.corpo?.text).startsWith('Oi, Ana,'), carta.subject)
  confere('carta sem cabeçalho de envio em massa, com descadastro no rodapé', !carta.corpo?.headers && String(carta.corpo?.html).includes('Descadastrar'), carta.corpo?.headers)
  const cartao = await chamar('adm', { acao: 'previa', id_usuario: ANA, formato: 'cartao' })
  confere('formato cartão mantém o emblema', cartao.dados.html.includes('Emblema desbloqueado') && cartao.dados.assunto.startsWith('Ana, você chegou a'), cartao.dados.assunto)
  const semRecado = await chamar('adm', { acao: 'previa', id_usuario: ANA })
  confere('carta sem recado tem texto padrão', semRecado.dados.html.includes('Passando para te dar parabéns'), '')
}
r = await chamar('ana', { acao: 'alerta_avaliacao', id_questao: 'coluna-0028' })
confere('alerta de avaliação vai para o admin', r.dados.resultado === 'ok' && estado.enviados.at(-1)?.to[0] === 'admin@x.com', estado.enviados.at(-1))
r = await chamar(null, { acao: 'descadastrar', u: ANA, t: 'token-falso-0000000000000000000000000000' })
confere('descadastro com link falso recusado', r.status === 400 && estado.prefs.length === 0, r)
const { linkDescadastro } = await import('../functions/_shared/email.ts')
const t = new URL((await linkDescadastro(ANA)).replace('#/emails', 'emails')).searchParams.get('t')!
r = await chamar(null, { acao: 'descadastrar', u: ANA, t })
confere('descadastro com link verdadeiro', r.status === 200 && (estado.prefs[0] as { conquistas: boolean }).conquistas === false, r)

estado.respondidas = 2010; estado.resendFalha = true
r = await chamar('ana', { acao: 'marco' })
confere('falha do Resend fica registrada com o motivo', r.dados.resultado === 'falhou' && estado.linhas.get(2000) === 'falhou' && estado.ultimoErro.startsWith('envio_recusado_403: The ortoquestoes.com.br domain is not verified'), estado.ultimoErro)
estado.resendFalha = false
r = await chamar('ana', { acao: 'marco' })
confere('marco que falhou é reenviado depois', r.dados.resultado === 'enviado' && estado.linhas.get(2000) === 'enviado', r)
r = await chamar('ana', { acao: 'marco' })
confere('e não duplica depois de enviado', r.dados.resultado === 'ja_enviado', r)
estado.resendFalha = true
r = await chamar('adm', { acao: 'parabens', id_usuario: ANA })
confere('parabéns que falha devolve o motivo', r.status === 502 && String(r.dados.erro).startsWith('envio_recusado_403:'), r)

// Relatório mensal
estado.resendFalha = false
r = await chamar('ana', { acao: 'relatorios_mensais', mes: '2026-09' })
confere('não admin não dispara relatórios', r.status === 403, r)
r = await chamar('adm', { acao: 'previa_relatorio', mes: '2026-09' })
confere('prévia do relatório', r.status === 200 && r.dados.assunto === 'Ana, você respondeu 320 questões em setembro' && r.dados.html.includes('Joelho') && r.dados.html.includes('63% → 80%') && r.dados.html.includes('Tumores'), { status: r.status, assunto: r.dados.assunto })
const antes = estado.enviados.length
r = await chamar('adm', { acao: 'relatorios_mensais', mes: '2026-09' })
confere('admin envia o lote do mês', r.status === 200 && r.dados.enviados === 1 && estado.enviados.length === antes + 1 && estado.enviados.at(-1)?.to[0] === 'ana@x.com', r)
estado.relatorioEnviado = true
const semSegredo = await handler(new Request('https://f.teste/enviar-email', { method: 'POST', headers: { 'content-type': 'application/json', 'x-segredo': 'errado' }, body: JSON.stringify({ acao: 'relatorios_mensais' }) }))
confere('agendador com segredo errado recusado', semSegredo.status === 403)
const comSegredo = await handler(new Request('https://f.teste/enviar-email', { method: 'POST', headers: { 'content-type': 'application/json', 'x-segredo': 'segredo-de-teste-bem-longo' }, body: JSON.stringify({ acao: 'relatorios_mensais', mes: '2026-09' }) }))
confere('agendador com segredo certo', comSegredo.status === 200 && (await comSegredo.json()).lote === 0)
const { linkDescadastro: linkTipo } = await import('../functions/_shared/email.ts')
const tRel = new URL((await linkTipo(ANA, 'relatorio')).replace('#/emails', 'emails')).searchParams.get('t')!
r = await chamar(null, { acao: 'descadastrar', u: ANA, t: tRel })
confere('link do relatório não vale para conquistas', r.status === 400, r)
r = await chamar(null, { acao: 'descadastrar', u: ANA, t: tRel, tipo: 'relatorio' })
confere('descadastro do relatório', r.status === 200 && (estado.prefs.at(-1) as { relatorio_mensal?: boolean }).relatorio_mensal === false, r)
