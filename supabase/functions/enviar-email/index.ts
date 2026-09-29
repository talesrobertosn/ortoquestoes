import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'
import { alertarAdministradores, emailConfigurado, enviarEmail, linkDescadastro, site, tokenDescadastroValido } from '../_shared/email.ts'
import { MARCOS, emailMarco, marcoAtingido, type Marco } from '../_shared/modelo-email.ts'

/**
 * E-mails do OrtoQuestões. Ações (POST, corpo JSON):
 *   marco              a própria pessoa, ao atingir um emblema: o servidor confere
 *                      o total sincronizado e manda uma vez por emblema.
 *   parabens           administrador: e-mail de parabéns para uma pessoa, com recado.
 *   previa             administrador: devolve assunto e HTML sem enviar.
 *   alerta_avaliacao   a própria pessoa, depois de dizer que um comentário não ajudou
 *                      e escrever o motivo: avisa os administradores.
 *   descadastrar       link do rodapé do e-mail (sem login, com assinatura).
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

async function montar(id: string, marco: Marco | null, recado?: string | null) {
  const dados = await dadosUsuario(id)
  if (!dados?.email) return null
  const m = marco ?? marcoAtingido(Number(dados.respondidas)) ?? MARCOS[0]
  const email = emailMarco({
    nome: dados.nome, marco: m, respondidas: Number(dados.respondidas), acertos: Number(dados.acertos),
    erros: Number(dados.erros), respondidas7d: Number(dados.respondidas_7d), recado,
    site: site(), linkDescadastro: await linkDescadastro(id),
  })
  return { dados, marco: m, email }
}

async function registrar(corpo: Record<string, unknown>) {
  return banco('emails_enviados', { method: 'POST', body: JSON.stringify(corpo) })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405, req)
  try {
    const corpo = await req.json() as { acao?: string; id_usuario?: string; recado?: string; id_questao?: string; u?: string; t?: string }

    if (corpo.acao === 'descadastrar') {
      if (!corpo.u || !corpo.t || !/^[0-9a-f-]{36}$/.test(corpo.u) || !await tokenDescadastroValido(corpo.u, corpo.t)) return json({ erro: 'link_invalido' }, 400, req)
      const r = await banco('preferencias_email', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ id_usuario: corpo.u, conquistas: false, atualizado_em: new Date().toISOString() }),
      })
      return r.ok ? json({ ok: true }, 200, req) : json({ erro: 'nao_foi_possivel' }, 503, req)
    }

    const usuario = await usuarioDoPedido(req)

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
      if (!reserva.ok) return json({ resultado: 'ja_enviado', marco: marco.minimo }, 200, req)
      const [linha] = await reserva.json() as Array<{ id: number }>
      const pronto = await montar(usuario.id, marco)
      try {
        await enviarEmail(pronto!.dados.email!, pronto!.email.assunto, pronto!.email.html, pronto!.email.texto, await linkDescadastro(usuario.id))
        await banco(`emails_enviados?id=eq.${linha.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'enviado', assunto: pronto!.email.assunto }) })
        return json({ resultado: 'enviado', marco: marco.minimo }, 200, req)
      } catch (falha) {
        await banco(`emails_enviados?id=eq.${linha.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'falhou', erro: String(falha).slice(0, 200) }) })
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
      const pronto = await montar(corpo.id_usuario, null, recado)
      if (!pronto) return json({ erro: 'usuario_sem_email' }, 404, req)
      if (corpo.acao === 'previa') return json({ assunto: pronto.email.assunto, html: pronto.email.html, quer_conquistas: pronto.dados.quer_conquistas }, 200, req)
      if (!emailConfigurado()) return json({ erro: 'email_nao_configurado' }, 503, req)
      if (!pronto.dados.quer_conquistas) return json({ erro: 'pessoa_nao_quer_emails' }, 409, req)
      try {
        await enviarEmail(pronto.dados.email!, pronto.email.assunto, pronto.email.html, pronto.email.texto, await linkDescadastro(corpo.id_usuario))
        await registrar({ id_usuario: corpo.id_usuario, tipo: 'parabens', marco: pronto.marco.minimo, assunto: pronto.email.assunto, enviado_por: usuario.id })
        return json({ resultado: 'enviado' }, 200, req)
      } catch (falha) {
        await registrar({ id_usuario: corpo.id_usuario, tipo: 'parabens', marco: pronto.marco.minimo, assunto: pronto.email.assunto, status: 'falhou', erro: String(falha).slice(0, 200), enviado_por: usuario.id })
        return json({ erro: 'envio_falhou' }, 502, req)
      }
    }

    return json({ erro: 'acao_invalida' }, 400, req)
  } catch (falha) {
    const texto = String(falha)
    if (texto.includes('autenticacao_necessaria')) return json({ erro: 'autenticacao_necessaria' }, 401, req)
    return json({ erro: 'erro_interno' }, 500, req)
  }
})
