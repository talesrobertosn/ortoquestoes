import { cors, json } from '../_shared/http.ts'
import { emailConfigurado, enviarEmail } from '../_shared/email.ts'

/**
 * Suporte do site (19/10/2026): a página /contato manda a mensagem por aqui e ela chega
 * no e-mail do Tales (SUPORTE_PARA, padrão talesroberto23@gmail.com, o SITE.contato do
 * src/config.ts), pelo Resend, com "responder para" no e-mail de quem escreveu.
 *
 * POST, corpo JSON:
 *   motivo     id do motivo escolhido ("assinatura", "acesso", "questao", "dados", "outro")
 *   assunto    linha de assunto montada pela página (até 160 caracteres)
 *   mensagem   o texto (10 a 6000 caracteres)
 *   email      e-mail para a resposta (obrigatório para visitante; com conta, vale o da conta)
 *   nome       opcional
 *   questao    opcional, o id da questão quando veio de "Relatar erro"
 *   contexto   opcional: pagina, navegador, tela, tema, idioma, fuso (o que a página coleta)
 *   site       campo-isca: gente não preenche (fica escondido); robô preenche e é ignorado
 *
 * Funciona com conta (cabeçalho Authorization com o token da sessão) e sem conta (só a
 * chave publicável). Por isso, no painel, a função fica com "Verify JWT" desligado.
 *
 * Limite simples por pessoa (id da conta, ou IP do visitante): 3 mensagens em 10 minutos e
 * 12 por dia. Fica na memória da instância da função: segura o clique repetido e o robô
 * simples, sem tabela nova no banco.
 *
 * Respostas: { ok: true } | { erro: "mensagem_curta" | "email_invalido" | "muitas_mensagens"
 * | "email_nao_configurado" | "envio_falhou" | ... }. Quando falha, a página mostra o
 * caminho de reserva (copiar, Gmail, aplicativo de e-mail).
 */

const PARA = () => (Deno.env.get('SUPORTE_PARA') ?? 'talesroberto23@gmail.com').trim()
const MOTIVOS: Record<string, string> = {
  assinatura: 'Assinatura ou cobrança', acesso: 'Acesso à conta', questao: 'Questão ou comentário',
  dados: 'Meus dados', outro: 'Outro assunto',
}

const JANELA_CURTA = 10 * 60_000, MAX_CURTA = 3
const JANELA_DIA = 24 * 60 * 60_000, MAX_DIA = 12
const envios = new Map<string, number[]>()

function podeEnviar(chave: string, agora = Date.now()): boolean {
  const lista = (envios.get(chave) ?? []).filter((t) => agora - t < JANELA_DIA)
  const recentes = lista.filter((t) => agora - t < JANELA_CURTA).length
  if (recentes >= MAX_CURTA || lista.length >= MAX_DIA) { envios.set(chave, lista); return false }
  lista.push(agora)
  envios.set(chave, lista)
  if (envios.size > 5000) for (const [k, v] of envios) if (!v.some((t) => agora - t < JANELA_DIA)) envios.delete(k)
  return true
}

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v : '').replace(/\r\n?/g, '\n').trim().slice(0, max)
const linha = (v: unknown, max: number) => texto(v, max).replace(/[\n\t]+/g, ' ')
const emailValido = (e: string) => /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(e) && e.length <= 200
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A conta de quem escreveu, se o pedido trouxe um token de sessão válido. Sem token (visitante), null. */
async function contaDoPedido(req: Request): Promise<{ id: string; email?: string; nome?: string } | null> {
  const auth = req.headers.get('authorization') ?? ''
  if (!/^Bearer\s+ey/i.test(auth)) return null
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } })
    if (!r.ok) return null
    const u = await r.json() as { id: string; email?: string; user_metadata?: { nome?: string } }
    return u?.id ? { id: u.id, email: u.email, nome: u.user_metadata?.nome } : null
  } catch {
    return null
  }
}

function ipDoPedido(req: Request) {
  return (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'sem-ip').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405, req)
  try {
    const corpo = await req.json().catch(() => ({})) as Record<string, unknown>
    // Campo-isca preenchido: responde como se tivesse enviado, sem enviar.
    if (texto(corpo.site, 200)) return json({ ok: true }, 200, req)

    const mensagem = texto(corpo.mensagem, 6000)
    if (mensagem.length < 10) return json({ erro: 'mensagem_curta' }, 400, req)

    const conta = await contaDoPedido(req)
    const email = (linha(corpo.email, 200) || conta?.email || '').toLowerCase()
    if (!emailValido(email)) return json({ erro: 'email_invalido' }, 400, req)

    if (!podeEnviar(conta ? `u:${conta.id}` : `ip:${ipDoPedido(req)}`)) return json({ erro: 'muitas_mensagens' }, 429, req)
    if (!emailConfigurado()) return json({ erro: 'email_nao_configurado' }, 503, req)

    const motivo = MOTIVOS[linha(corpo.motivo, 30)] ?? MOTIVOS.outro
    const nome = linha(corpo.nome, 80) || linha(conta?.nome, 80)
    const questao = linha(corpo.questao, 80)
    const assunto = linha(corpo.assunto, 160) || `Orto Questões — ${motivo}`
    const ctx = (corpo.contexto && typeof corpo.contexto === 'object' ? corpo.contexto : {}) as Record<string, unknown>
    const detalhes: Array<[string, string]> = [
      ['Motivo', motivo],
      ['De', nome ? `${nome} <${email}>` : email],
      ['Conta', conta ? `${conta.id}${conta.email && conta.email.toLowerCase() !== email ? ` (e-mail da conta: ${conta.email})` : ''}` : 'visitante, sem conta'],
      ...(questao ? [['Questão', questao] as [string, string]] : []),
      ['Página', linha(ctx.pagina, 300)],
      ['Navegador', linha(ctx.navegador, 300)],
      ['Tela', linha(ctx.tela, 60)],
      ['Tema', linha(ctx.tema, 20)],
      ['Idioma e fuso', [linha(ctx.idioma, 20), linha(ctx.fuso, 60)].filter(Boolean).join(' · ')],
    ].filter(([, v]) => v) as Array<[string, string]>

    const textoEmail = `${mensagem}\n\n---\n${detalhes.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nResponda este e-mail para falar direto com ${email}.`
    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.55;color:#1b1208;max-width:640px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#14655e;font-weight:700">Suporte do Orto Questões · ${esc(motivo)}</p>
<div style="white-space:pre-wrap;padding:14px 16px;border:2px solid #c9d5d1;border-radius:6px;background:#fbfaf6">${esc(mensagem)}</div>
<table style="margin-top:14px;border-collapse:collapse;font-size:13px;color:#4a5652">${detalhes.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;font-weight:700;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:2px 0">${esc(v)}</td></tr>`).join('')}</table>
<p style="margin-top:14px;font-size:13px;color:#4a5652">Responda este e-mail para falar direto com ${esc(email)}.</p>
</div>`

    try {
      await enviarEmail(PARA(), assunto, html, textoEmail, undefined, email)
    } catch (falha) {
      console.error('suporte: envio falhou', String(falha))
      return json({ erro: 'envio_falhou' }, 502, req)
    }
    return json({ ok: true }, 200, req)
  } catch (falha) {
    console.error('suporte: erro', String(falha))
    return json({ erro: 'erro_interno' }, 500, req)
  }
})
