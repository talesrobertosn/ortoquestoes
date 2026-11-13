import { banco, cors, json } from '../_shared/http.ts'
import { emailConfigurado, enviarEmail } from '../_shared/email.ts'
import { conferirAnexos, descreverSituacao, montarCarta, MOTIVOS_SUPORTE } from './carta.ts'

/**
 * Suporte do site (19/10/2026): a página /contato manda a mensagem por aqui e ela chega
 * no e-mail do Tales (SUPORTE_PARA, padrão talesroberto23@gmail.com, o SITE.contato do
 * src/config.ts), pelo Resend, com "responder para" no e-mail de quem escreveu.
 *
 * POST, corpo JSON:
 *   motivo     id do motivo ("pagar", "assinatura", "acesso", "questao", "dados", "direitos", "outro"; 03/11/2026 e 13/11/2026)
 *   assunto    linha de assunto montada pela página (até 160 caracteres)
 *   mensagem   o texto (10 a 6000 caracteres)
 *   email      e-mail para a resposta (obrigatório para visitante; com conta, vale o da conta)
 *   nome       opcional
 *   questao    opcional, o id da questão quando veio de "Relatar erro"
 *   campos     opcional: respostas de um toque { Plano, Pagamento, Questão } (03/11/2026)
 *   imagens    opcional: até 3 imagens [{ nome, tipo, base64 }], já reduzidas pela página; vão como
 *              anexo do e-mail (03/11/2026). Erros: "anexo_invalido" | "anexos_demais" | "anexo_grande"
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
/** As respostas de um toque que a página pode mandar, com os valores aceitos. */
const CAMPOS: Record<string, readonly string[] | null> = {
  Plano: ['Mensal', 'Semestral', 'Anual', 'Não sei'],
  Pagamento: ['Pix', 'Cartão', 'Não cheguei a escolher'],
  Questão: null,
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

/** A assinatura mais recente da conta, em uma linha. Se a consulta falhar, o e-mail sai assim mesmo. */
async function situacaoDaConta(idUsuario: string): Promise<string> {
  try {
    const r = await banco(`assinaturas?id_usuario=eq.${encodeURIComponent(idUsuario)}&order=criada_em.desc&limit=1&select=plano,status,id_externo,fim_periodo,cancelar_ao_fim`)
    if (!r.ok) return 'não consegui consultar'
    const [a] = await r.json() as Array<{ plano: string; status: string; id_externo: string | null; fim_periodo: string | null; cancelar_ao_fim: boolean | null }>
    let precoAntigo = false
    if (a && (a.plano === 'semestral' || a.plano === 'anual')) {
      const p = await banco('rpc/tem_preco_antigo', { method: 'POST', body: JSON.stringify({ p_usuario: idUsuario, p_plano: a.plano }) })
      precoAntigo = p.ok && (await p.json()) === true
    }
    return descreverSituacao(a ?? null, precoAntigo)
  } catch {
    return 'não consegui consultar'
  }
}

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
    const { anexos, erro: erroAnexo } = conferirAnexos(corpo.imagens)
    if (erroAnexo) return json({ erro: erroAnexo }, 400, req)

    if (!podeEnviar(conta ? `u:${conta.id}` : `ip:${ipDoPedido(req)}`)) return json({ erro: 'muitas_mensagens' }, 429, req)
    if (!emailConfigurado()) return json({ erro: 'email_nao_configurado' }, 503, req)

    const idMotivo = linha(corpo.motivo, 30)
    const motivo = idMotivo in MOTIVOS_SUPORTE ? idMotivo : 'outro'
    const nome = linha(corpo.nome, 80) || linha(conta?.nome, 80)
    const questao = linha(corpo.questao, 80)
    const assunto = linha(corpo.assunto, 160) || `[Suporte] ${MOTIVOS_SUPORTE[motivo]}`
    const ctx = (corpo.contexto && typeof corpo.contexto === 'object' ? corpo.contexto : {}) as Record<string, unknown>
    const brutos = (corpo.campos && typeof corpo.campos === 'object' ? corpo.campos : {}) as Record<string, unknown>
    const campos = Object.entries(CAMPOS).flatMap(([rotulo, aceitos]): Array<[string, string]> => {
      const valor = linha(brutos[rotulo], 80)
      return valor && (!aceitos || aceitos.includes(valor)) ? [[rotulo, valor]] : []
    })
    if (questao && !campos.some(([k]) => k === 'Questão')) campos.push(['Questão', questao])
    const situacao = conta ? await situacaoDaConta(conta.id) : 'Visitante, sem conta'
    const detalhes: Array<[string, string]> = [
      ['Conta', conta ? `${conta.id}${conta.email && conta.email.toLowerCase() !== email ? ` (e-mail da conta: ${conta.email})` : ''}` : 'visitante, sem conta'],
      ['Enviado em', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) + ' (Brasília)'],
      ['Página', linha(ctx.pagina, 300)],
      ['Navegador', linha(ctx.navegador, 300)],
      ['Tela', linha(ctx.tela, 60)],
      ['Tema', linha(ctx.tema, 20)],
      ['Idioma e fuso', [linha(ctx.idioma, 20), linha(ctx.fuso, 60)].filter(Boolean).join(' · ')],
    ].filter(([, v]) => v) as Array<[string, string]>

    const { html, texto: textoEmail } = montarCarta({ motivo, assunto, mensagem, email, nome, campos, situacao, detalhes, imagens: anexos.map((a) => a.filename) })

    try {
      await enviarEmail(PARA(), assunto, html, textoEmail, undefined, email, anexos)
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
