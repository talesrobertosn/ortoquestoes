import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'
import { alertarAdministradores, emailConfigurado, enviarEmail, linkDescadastro, site, tokenDescadastroValido } from '../_shared/email.ts'
import { MARCOS, emailCarta, emailLembrete, emailMarco, emailRelatoResolvido, emailRelatorio, marcoAtingido, type CampanhaLembrete, type DadosRelatorio, type Marco } from '../_shared/modelo-email.ts'

/**
 * E-mails do OrtoQuestões. Ações (POST, corpo JSON):
 *   marco              a própria pessoa, ao atingir um emblema: o servidor confere
 *                      o total sincronizado e manda uma vez por emblema.
 *   parabens           administrador: e-mail de parabéns para uma pessoa, com recado.
 *                      formato "carta" (padrão, texto simples) ou "cartao" (com emblema).
 *   previa             administrador: devolve assunto e HTML sem enviar.
 *   alerta_avaliacao   a própria pessoa, depois de dizer que um comentário não ajudou
 *                      e escrever o motivo: avisa os administradores.
 *   descadastrar       link do rodapé do e-mail (sem login, com assinatura). tipo:
 *                      "conquistas" (padrão) ou "relatorio".
 *   relatorios_mensais administrador (ou o agendador, com o cabeçalho x-segredo igual
 *                      a EMAIL_SEGREDO): envia o relatório do mês a um lote de assinantes.
 *   previa_relatorio   administrador: o relatório de uma pessoa, sem enviar.
 *   lembretes          administrador: envia um lote do lembrete de uma campanha
 *                      ("nunca", "tres_dias", "sete_dias" ou "renovacao_pix"). Um por
 *                      pessoa e ausência (no Pix, um por compra). A "renovacao_pix"
 *                      também aceita o agendador diário (cabeçalho x-segredo).
 *   previa_lembrete    administrador: o lembrete de uma campanha, sem enviar.
 *   relato_resolvido   administrador: avisa quem relatou um erro (id_relato) que
 *                      a questão foi corrigida. Só relato com status resolvido.
 *   previa_relato      administrador: o mesmo aviso, sem enviar.
 */

interface DadosUsuario {
  email: string | null; nome: string | null; respondidas: number; acertos: number; erros: number
  respondidas_7d: number; dias_de_conta: number; quer_conquistas: boolean
}

/** Folga para "acabou de atingir": quem já passou muito do marco não recebe o e-mail atrasado. */
const folga = (m: Marco) => Math.max(60, Math.round(m.minimo * 0.05))

async function dadosUsuario(id: string): Promise<DadosUsuario | null> {
  const r = await banco('rpc/dados_email_usuario', { method: 'POST', body: JSON.stringify({ p_id: id }) })
  if (!r.ok) throw new Error('consulta_usuario_falhou')
  const [linha] = await r.json() as DadosUsuario[]
  return linha ?? null
}

async function ehAdministrador(id: string) {
  const r = await banco(`administradores?id_usuario=eq.${encodeURIComponent(id)}&select=id_usuario`)
  return r.ok && (await r.json() as unknown[]).length > 0
}

async function montar(id: string, marco: Marco | null, recado?: string | null, carta = false) {
  const dados = await dadosUsuario(id)
  if (!dados?.email) return null
  const m = marco ?? marcoAtingido(Number(dados.respondidas)) ?? MARCOS[0]
  const email = (carta ? emailCarta : emailMarco)({
    nome: dados.nome, marco: m, respondidas: Number(dados.respondidas), acertos: Number(dados.acertos),
    erros: Number(dados.erros), respondidas7d: Number(dados.respondidas_7d), recado,
    site: site(), linkDescadastro: await linkDescadastro(id),
  })
  return { dados, marco: m, email }
}

const motivo = (falha: unknown) => (falha instanceof Error ? falha.message : String(falha)).slice(0, 300)

/** Mês anterior ao de hoje, no fuso de São Paulo ("2026-09"). */
function mesAnterior(agora = new Date()): string {
  const sp = new Date(agora.getTime() - 3 * 3600_000)
  const ano = sp.getUTCMonth() === 0 ? sp.getUTCFullYear() - 1 : sp.getUTCFullYear()
  const mes = sp.getUTCMonth() === 0 ? 12 : sp.getUTCMonth()
  return `${ano}-${String(mes).padStart(2, '0')}`
}
const mesValido = (mes?: string) => (mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : mesAnterior())

async function segredoValido(recebido: string) {
  const esperado = Deno.env.get('EMAIL_SEGREDO') ?? ''
  if (!esperado || esperado.length !== recebido.length) return false
  let diferenca = 0
  for (let i = 0; i < esperado.length; i++) diferenca |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i)
  return diferenca === 0
}

async function montarRelatorio(id: string, mes: string) {
  const r = await banco('rpc/dados_relatorio_mensal', { method: 'POST', body: JSON.stringify({ p_id: id, p_mes: mes }) })
  if (!r.ok) throw new Error('consulta_relatorio_falhou')
  const dados = await r.json() as Omit<DadosRelatorio, 'site' | 'linkDescadastro'> & { email: string | null }
  if (!dados?.email) return null
  const email = emailRelatorio({ ...dados, site: site(), linkDescadastro: await linkDescadastro(id, 'relatorio') })
  return { ...email, para: dados.email }
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

/**
 * Envia o relatório do mês a um lote de assinantes que ainda não o receberam.
 * Cada envio reserva uma linha (um por pessoa e mês); uma falha fica
 * registrada e é tentada de novo no próximo lote. O Resend aceita 2 envios
 * por segundo no plano grátis, daí a pausa entre um e outro.
 */
async function enviarRelatorios(mesPedido?: string, limitePedido?: number) {
  const mes = mesValido(mesPedido)
  const limite = Math.max(1, Math.min(Number(limitePedido) || 40, 80))
  const r = await banco('rpc/destinatarios_relatorio_mensal', { method: 'POST', body: JSON.stringify({ p_mes: mes, p_limite: limite }) })
  if (!r.ok) throw new Error('consulta_destinatarios_falhou')
  const destinatarios = (await r.json() as Array<{ id_usuario: string }>).map((d) => d.id_usuario)
  let enviados = 0, falhas = 0
  for (const id of destinatarios) {
    const reserva = await registrar({ id_usuario: id, tipo: 'relatorio', referencia: mes, status: 'enviando' })
    let linha: { id: number } | undefined
    if (reserva.ok) [linha] = await reserva.json() as Array<{ id: number }>
    else {
      const retomada = await banco(`emails_enviados?id_usuario=eq.${id}&tipo=eq.relatorio&referencia=eq.${mes}&status=eq.falhou`, {
        method: 'PATCH', body: JSON.stringify({ status: 'enviando', erro: null, enviado_em: new Date().toISOString() }),
      })
      if (retomada.ok) [linha] = await retomada.json() as Array<{ id: number }>
    }
    if (!linha) continue
    try {
      const pronto = await montarRelatorio(id, mes)
      if (!pronto) throw new Error('usuario_sem_email')
      await enviarEmail(pronto.para, pronto.assunto, pronto.html, pronto.texto, await linkDescadastro(id, 'relatorio'))
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'enviado', assunto: pronto.assunto }) })
      enviados++
    } catch (falha) {
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'falhou', erro: motivo(falha) }) })
      falhas++
    }
    await esperar(600)
  }
  return { mes, enviados, falhas, lote: destinatarios.length, talvez_restem: destinatarios.length === limite }
}

const CAMPANHAS: readonly CampanhaLembrete[] = ['nunca', 'tres_dias', 'sete_dias', 'renovacao_pix']
const campanhaValida = (c?: string): CampanhaLembrete | null => (CAMPANHAS as readonly string[]).includes(c ?? '') ? c as CampanhaLembrete : null

/**
 * Lembretes de uma campanha, em lote. Mesmo esquema do relatório: reserva uma
 * linha por pessoa e ausência (a trava do banco impede duplicata), envia e
 * marca o resultado. Quem já recebeu nesta ausência não aparece de novo.
 */
async function enviarLembretes(campanha: CampanhaLembrete, limitePedido: number | undefined, por: string | null) {
  const limite = Math.max(1, Math.min(Number(limitePedido) || 40, 80))
  const r = campanha === 'renovacao_pix'
    ? await banco('rpc/destinatarios_renovacao_pix', { method: 'POST', body: JSON.stringify({ p_limite: limite }) })
    : await banco('rpc/destinatarios_lembrete', { method: 'POST', body: JSON.stringify({ p_campanha: campanha, p_limite: limite }) })
  if (!r.ok) throw new Error('consulta_destinatarios_falhou')
  const destinatarios = await r.json() as Array<{ id_usuario: string; referencia: string; email: string; nome: string | null; respondidas: number; dias_fora?: number; dias_restantes?: number; plano?: string; fim_periodo?: string }>
  let enviados = 0, falhas = 0
  for (const d of destinatarios) {
    const reserva = await registrar({ id_usuario: d.id_usuario, tipo: 'lembrete', referencia: d.referencia, status: 'enviando', enviado_por: por })
    let linha: { id: number } | undefined
    if (reserva.ok) [linha] = await reserva.json() as Array<{ id: number }>
    else {
      const retomada = await banco(`emails_enviados?id_usuario=eq.${d.id_usuario}&tipo=eq.lembrete&referencia=eq.${encodeURIComponent(d.referencia)}&status=eq.falhou`, {
        method: 'PATCH', body: JSON.stringify({ status: 'enviando', erro: null, enviado_em: new Date().toISOString() }),
      })
      if (retomada.ok) [linha] = await retomada.json() as Array<{ id: number }>
    }
    if (!linha) continue
    try {
      const descadastro = await linkDescadastro(d.id_usuario, 'lembretes')
      const e = emailLembrete({ campanha, nome: d.nome, respondidas: Number(d.respondidas), diasFora: Number(d.dias_fora ?? 0), diasRestantes: Number(d.dias_restantes ?? 3), fimEm: d.fim_periodo ?? null, plano: d.plano ?? null, site: site(), linkDescadastro: descadastro })
      await enviarEmail(d.email, e.assunto, e.html, e.texto, descadastro)
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'enviado', assunto: e.assunto }) })
      enviados++
    } catch (falha) {
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'falhou', erro: motivo(falha) }) })
      falhas++
    }
    await esperar(600)
  }
  return { campanha, enviados, falhas, lote: destinatarios.length, talvez_restem: destinatarios.length === limite }
}

async function registrar(corpo: Record<string, unknown>) {
  return banco('emails_enviados', { method: 'POST', body: JSON.stringify(corpo) })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405, req)
  try {
    const corpo = await req.json() as { acao?: string; id_usuario?: string; recado?: string; formato?: string; id_questao?: string; u?: string; t?: string; tipo?: string; mes?: string; limite?: number; campanha?: string; id_relato?: number }

    if (corpo.acao === 'descadastrar') {
      const tipo = corpo.tipo === 'relatorio' ? 'relatorio' : corpo.tipo === 'lembretes' ? 'lembretes' : 'conquistas'
      if (!corpo.u || !corpo.t || !/^[0-9a-f-]{36}$/.test(corpo.u) || !await tokenDescadastroValido(corpo.u, corpo.t, tipo)) return json({ erro: 'link_invalido' }, 400, req)
      const coluna = tipo === 'relatorio' ? 'relatorio_mensal' : tipo === 'lembretes' ? 'lembretes' : 'conquistas'
      const r = await banco('preferencias_email', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ id_usuario: corpo.u, [coluna]: false, atualizado_em: new Date().toISOString() }),
      })
      return r.ok ? json({ ok: true, tipo }, 200, req) : json({ erro: 'nao_foi_possivel' }, 503, req)
    }

    // Relatório mensal pelo agendador (cron): autenticado pelo segredo, sem usuário.
    if (corpo.acao === 'relatorios_mensais' && req.headers.get('x-segredo')) {
      if (!await segredoValido(req.headers.get('x-segredo')!)) return json({ erro: 'acesso_negado' }, 403, req)
      return json(await enviarRelatorios(corpo.mes, corpo.limite), 200, req)
    }

    // Lembrete de renovação do Pix pelo agendador diário: autenticado pelo segredo, sem usuário.
    if (corpo.acao === 'lembretes' && corpo.campanha === 'renovacao_pix' && req.headers.get('x-segredo')) {
      if (!await segredoValido(req.headers.get('x-segredo')!)) return json({ erro: 'acesso_negado' }, 403, req)
      if (!emailConfigurado()) return json({ erro: 'email_nao_configurado' }, 503, req)
      return json(await enviarLembretes('renovacao_pix', corpo.limite, null), 200, req)
    }

    const usuario = await usuarioDoPedido(req)

    if (corpo.acao === 'relatorios_mensais' || corpo.acao === 'previa_relatorio') {
      if (!await ehAdministrador(usuario.id)) return json({ erro: 'acesso_negado' }, 403, req)
      if (corpo.acao === 'previa_relatorio') {
        const pronto = await montarRelatorio(corpo.id_usuario && /^[0-9a-f-]{36}$/.test(corpo.id_usuario) ? corpo.id_usuario : usuario.id, mesValido(corpo.mes))
        return pronto ? json({ assunto: pronto.assunto, html: pronto.html }, 200, req) : json({ erro: 'usuario_sem_email' }, 404, req)
      }
      if (!emailConfigurado()) return json({ erro: 'email_nao_configurado' }, 503, req)
      return json(await enviarRelatorios(corpo.mes, corpo.limite), 200, req)
    }

    if (corpo.acao === 'lembretes' || corpo.acao === 'previa_lembrete') {
      if (!await ehAdministrador(usuario.id)) return json({ erro: 'acesso_negado' }, 403, req)
      const campanha = campanhaValida(corpo.campanha)
      if (!campanha) return json({ erro: 'campanha_invalida' }, 400, req)
      if (corpo.acao === 'previa_lembrete') {
        // Prévia com os dados de quem está olhando, e números de exemplo para a ausência.
        const dados = await dadosUsuario(usuario.id)
        const e = emailLembrete({ campanha, nome: dados?.nome ?? null, respondidas: Number(dados?.respondidas ?? 0), diasFora: campanha === 'sete_dias' ? 9 : 3, diasRestantes: 3, fimEm: new Date(Date.now() + 3 * 86_400_000).toISOString(), plano: 'semestral', site: site(), linkDescadastro: await linkDescadastro(usuario.id, 'lembretes') })
        return json({ assunto: e.assunto, html: e.html }, 200, req)
      }
      if (!emailConfigurado()) return json({ erro: 'email_nao_configurado' }, 503, req)
      return json(await enviarLembretes(campanha, corpo.limite, usuario.id), 200, req)
    }

    if (corpo.acao === 'relato_resolvido' || corpo.acao === 'previa_relato') {
      if (!await ehAdministrador(usuario.id)) return json({ erro: 'acesso_negado' }, 403, req)
      const idRelato = Number(corpo.id_relato)
      if (!Number.isInteger(idRelato) || idRelato <= 0) return json({ erro: 'relato_invalido' }, 400, req)
      const r = await banco(`relatos_erro?id=eq.${idRelato}&select=id,id_usuario,id_questao,texto,status,nota_admin`)
      const [relato] = r.ok ? await r.json() as Array<{ id: number; id_usuario: string | null; id_questao: string; texto: string; status: string; nota_admin: string | null }> : []
      if (!relato) return json({ erro: 'relato_nao_encontrado' }, 404, req)
      if (!relato.id_usuario) return json({ erro: 'conta_removida' }, 404, req)
      const dados = await dadosUsuario(relato.id_usuario)
      if (!dados?.email) return json({ erro: 'usuario_sem_email' }, 404, req)
      const e = emailRelatoResolvido({ nome: dados.nome, idQuestao: relato.id_questao, relato: relato.texto, nota: relato.nota_admin, site: site() })
      if (corpo.acao === 'previa_relato') return json({ assunto: e.assunto, html: e.html, para: dados.email }, 200, req)
      if (relato.status !== 'resolvido') return json({ erro: 'relato_nao_resolvido' }, 409, req)
      if (!emailConfigurado()) return json({ erro: 'email_nao_configurado' }, 503, req)
      try {
        await enviarEmail(dados.email, e.assunto, e.html, e.texto)
        await banco(`relatos_erro?id=eq.${idRelato}`, { method: 'PATCH', body: JSON.stringify({ avisado_em: new Date().toISOString() }) })
        await registrar({ id_usuario: relato.id_usuario, tipo: 'relato_resolvido', referencia: `relato:${idRelato}`, assunto: e.assunto, enviado_por: usuario.id })
        return json({ resultado: 'enviado', para: dados.email }, 200, req)
      } catch (falha) {
        await registrar({ id_usuario: relato.id_usuario, tipo: 'relato_resolvido', referencia: `relato:${idRelato}`, assunto: e.assunto, status: 'falhou', erro: motivo(falha), enviado_por: usuario.id })
        return json({ erro: motivo(falha) }, 502, req)
      }
    }

    if (corpo.acao === 'marco') {
      if (!emailConfigurado()) return json({ resultado: 'email_nao_configurado' }, 200, req)
      const config = await banco('configuracao_emails?id=eq.true&select=marcos_automaticos')
      if (config.ok && (await config.json() as Array<{ marcos_automaticos: boolean }>)[0]?.marcos_automaticos === false) return json({ resultado: 'desativado' }, 200, req)
      const dados = await dadosUsuario(usuario.id)
      if (!dados?.email) return json({ resultado: 'sem_email' }, 200, req)
      if (!dados.quer_conquistas) return json({ resultado: 'nao_quer' }, 200, req)
      const marco = marcoAtingido(Number(dados.respondidas))
      if (!marco) return json({ resultado: 'ainda_nao' }, 200, req)
      if (Number(dados.respondidas) > marco.minimo + folga(marco)) return json({ resultado: 'longe_do_marco', marco: marco.minimo }, 200, req)
      // A trava do banco (um e-mail por marco) evita duplicata com dois pedidos juntos.
      const reserva = await registrar({ id_usuario: usuario.id, tipo: 'marco', marco: marco.minimo, status: 'enviando' })
      let linha: { id: number } | undefined
      if (reserva.ok) [linha] = await reserva.json() as Array<{ id: number }>
      else {
        // Já existe registro deste marco. Se o envio anterior falhou, retoma o mesmo registro
        // (o filtro status=falhou garante que só um pedido consegue).
        const retomada = await banco(`emails_enviados?id_usuario=eq.${usuario.id}&tipo=eq.marco&marco=eq.${marco.minimo}&status=eq.falhou`, {
          method: 'PATCH', body: JSON.stringify({ status: 'enviando', erro: null, enviado_em: new Date().toISOString() }),
        })
        if (retomada.ok) [linha] = await retomada.json() as Array<{ id: number }>
      }
      if (!linha) return json({ resultado: 'ja_enviado', marco: marco.minimo }, 200, req)
      const pronto = await montar(usuario.id, marco)
      try {
        await enviarEmail(pronto!.dados.email!, pronto!.email.assunto, pronto!.email.html, pronto!.email.texto, await linkDescadastro(usuario.id))
        await banco(`emails_enviados?id=eq.${linha.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'enviado', assunto: pronto!.email.assunto }) })
        return json({ resultado: 'enviado', marco: marco.minimo }, 200, req)
      } catch (falha) {
        await banco(`emails_enviados?id=eq.${linha.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'falhou', erro: motivo(falha) }) })
        return json({ resultado: 'falhou' }, 200, req)
      }
    }

    if (corpo.acao === 'alerta_avaliacao') {
      if (!corpo.id_questao || !/^[a-z0-9-]{3,80}$/.test(corpo.id_questao)) return json({ erro: 'questao_invalida' }, 400, req)
      const r = await banco(`avaliacoes_comentario?usuario_id=eq.${usuario.id}&id_questao=eq.${corpo.id_questao}&util=eq.false&select=observacao,motivo,atualizado_em`)
      const [av] = r.ok ? await r.json() as Array<{ observacao: string | null; motivo: string | null; atualizado_em: string }> : []
      if (!av?.observacao?.trim() || Date.now() - new Date(av.atualizado_em).getTime() > 15 * 60_000) return json({ resultado: 'nada_a_avisar' }, 200, req)
      await alertarAdministradores(
        `Comentário não ajudou: ${corpo.id_questao}`,
        [`Motivo: ${av.motivo ?? 'não informado'}`, `Mensagem: ${av.observacao.trim().slice(0, 600)}`, `De: ${usuario.email ?? 'conta sem e-mail'}`],
        'avaliacoes', `avaliacao:${usuario.id}:${corpo.id_questao}:${av.atualizado_em.slice(0, 13)}`,
      )
      return json({ resultado: 'ok' }, 200, req)
    }

    if (corpo.acao === 'parabens' || corpo.acao === 'previa') {
      if (!await ehAdministrador(usuario.id)) return json({ erro: 'acesso_negado' }, 403, req)
      if (!corpo.id_usuario || !/^[0-9a-f-]{36}$/.test(corpo.id_usuario)) return json({ erro: 'usuario_invalido' }, 400, req)
      const recado = typeof corpo.recado === 'string' ? corpo.recado.slice(0, 600) : null
      // Carta (padrão): texto simples, com mais chance de cair fora de Promoções no Gmail.
      const carta = corpo.formato !== 'cartao'
      const pronto = await montar(corpo.id_usuario, null, recado, carta)
      if (!pronto) return json({ erro: 'usuario_sem_email' }, 404, req)
      if (corpo.acao === 'previa') return json({ assunto: pronto.email.assunto, html: pronto.email.html, quer_conquistas: pronto.dados.quer_conquistas }, 200, req)
      if (!emailConfigurado()) return json({ erro: 'email_nao_configurado' }, 503, req)
      if (!pronto.dados.quer_conquistas) return json({ erro: 'pessoa_nao_quer_emails' }, 409, req)
      try {
        await enviarEmail(pronto.dados.email!, pronto.email.assunto, pronto.email.html, pronto.email.texto, carta ? undefined : await linkDescadastro(corpo.id_usuario))
        await registrar({ id_usuario: corpo.id_usuario, tipo: 'parabens', marco: pronto.marco.minimo, assunto: pronto.email.assunto, enviado_por: usuario.id })
        return json({ resultado: 'enviado' }, 200, req)
      } catch (falha) {
        await registrar({ id_usuario: corpo.id_usuario, tipo: 'parabens', marco: pronto.marco.minimo, assunto: pronto.email.assunto, status: 'falhou', erro: motivo(falha), enviado_por: usuario.id })
        return json({ erro: motivo(falha) }, 502, req)
      }
    }

    return json({ erro: 'acao_invalida' }, 400, req)
  } catch (falha) {
    const texto = String(falha)
    if (texto.includes('autenticacao_necessaria')) return json({ erro: 'autenticacao_necessaria' }, 401, req)
    return json({ erro: 'erro_interno' }, 500, req)
  }
})
