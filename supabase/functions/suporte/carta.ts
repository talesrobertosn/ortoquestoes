/**
 * O e-mail que chega ao Tales quando alguém escreve no suporte (03/11/2026): um cartão com
 * quem escreveu, o motivo, as respostas de um toque, a situação da assinatura, a mensagem em
 * destaque e um botão para responder. Os detalhes técnicos ficam pequenos no rodapé. Sem Deno,
 * para testar no Node (fixtures/testar_suporte.mjs).
 */

export const MOTIVOS_SUPORTE: Record<string, string> = {
  pagar: 'Não consegui assinar ou pagar', assinatura: 'Minha assinatura', acesso: 'Acesso à conta',
  questao: 'Erro em questão', dados: 'Meus dados', direitos: 'Direitos autorais', outro: 'Sugestão ou outro assunto',
}

export interface DadosCarta {
  motivo: string
  assunto: string
  mensagem: string
  email: string
  nome: string
  /** Respostas de um toque, já conferidas: [rótulo, valor]. */
  campos: Array<[string, string]>
  /** "Anual no cartão · ativa até 05/11/2027", "Sem assinatura" ou "Visitante, sem conta". */
  situacao: string
  /** Detalhes técnicos: conta, página, navegador, tela... */
  detalhes: Array<[string, string]>
  /** Nomes das imagens anexadas (vão como anexo do e-mail). */
  imagens?: string[]
}

/** Limites das imagens do suporte: os mesmos de src/conta/suporte.ts (a página já reduz antes de enviar). */
export const MAX_IMAGENS = 3
export const MAX_BYTES_IMAGEM = 2_000_000
export const MAX_BYTES_TOTAL = 5_000_000
const TIPOS_IMAGEM: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

/**
 * Confere as imagens que a página mandou ({ nome, tipo, base64 }) e devolve os anexos para o
 * Resend. Imagem de tipo estranho, base64 inválido ou grande demais é recusada com um código
 * que a página entende; nunca passa nada além de imagem.
 */
export function conferirAnexos(bruto: unknown): { anexos: Array<{ filename: string; content: string }>; erro?: string } {
  if (bruto === undefined || bruto === null) return { anexos: [] }
  if (!Array.isArray(bruto)) return { anexos: [], erro: 'anexo_invalido' }
  if (bruto.length > MAX_IMAGENS) return { anexos: [], erro: 'anexos_demais' }
  const anexos: Array<{ filename: string; content: string }> = []
  let total = 0
  for (const [i, item] of bruto.entries()) {
    const { nome, tipo, base64 } = (item ?? {}) as Record<string, unknown>
    const extensao = typeof tipo === 'string' ? TIPOS_IMAGEM[tipo] : undefined
    if (!extensao || typeof base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { anexos: [], erro: 'anexo_invalido' }
    const bytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
    total += bytes
    if (bytes > MAX_BYTES_IMAGEM || total > MAX_BYTES_TOTAL) return { anexos: [], erro: 'anexo_grande' }
    const base = (typeof nome === 'string' ? nome : '').replace(/\.[a-z0-9]{1,5}$/i, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    anexos.push({ filename: `${base || `imagem-${i + 1}`}.${extensao}`, content: base64 })
  }
  return { anexos }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function montarCarta(d: DadosCarta): { html: string; texto: string } {
  const titulo = MOTIVOS_SUPORTE[d.motivo] ?? MOTIVOS_SUPORTE.outro
  const quem = d.nome ? `${d.nome} · ${d.email}` : d.email
  const imagens = d.imagens ?? []
  const fichas: Array<[string, string]> = [...d.campos, ['Conta', d.situacao], ...(imagens.length ? [['Anexos', imagens.length === 1 ? '1 imagem' : `${imagens.length} imagens`] as [string, string]] : [])]
  const responder = `mailto:${encodeURIComponent(d.email)}?subject=${encodeURIComponent(`Re: ${d.assunto}`)}`
  const primeiroNome = d.nome.trim().split(/\s+/)[0] ?? ''

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(d.assunto)}</title></head>
<body style="margin:0;padding:24px 12px;background:#eef2f1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td style="padding:20px 28px 18px 28px;background:#146b61;">
<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#bfe9e1;">Suporte · Orto Questões</div>
<div style="margin-top:6px;font-size:21px;line-height:27px;font-weight:bold;color:#ffffff;">${esc(titulo)}</div>
<div style="margin-top:4px;font-size:14px;line-height:20px;color:#dff3ef;">${esc(quem)}</div>
</td></tr>
<tr><td style="padding:18px 28px 4px 28px;">
${fichas.map(([k, v]) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:5px 11px;border-radius:999px;background:#eef6ee;border:1px solid #c9e2c6;font-size:13px;line-height:18px;color:#24452a;"><b>${esc(k)}:</b> ${esc(v)}</span>`).join('')}
</td></tr>
<tr><td style="padding:6px 28px 6px 28px;">
<div style="white-space:pre-wrap;padding:14px 16px;border-left:4px solid #146b61;border-radius:6px;background:#fbfaf6;font-size:15px;line-height:23px;color:#1b2624;">${esc(d.mensagem)}</div>
</td></tr>
<tr><td style="padding:16px 28px 22px 28px;">
<a href="${responder}" style="display:inline-block;padding:12px 22px;background:#146b61;color:#ffffff;border-radius:10px;font-weight:bold;text-decoration:none;font-size:14px;">Responder${primeiroNome ? ` a ${esc(primeiroNome)}` : ''}</a>
<span style="display:inline-block;margin-left:10px;font-size:12px;color:#5b6b67;">ou só responda este e-mail</span>
</td></tr>
<tr><td style="padding:14px 28px 22px 28px;border-top:1px solid #e3e9e7;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:12px;line-height:17px;color:#5b6b67;">
${d.detalhes.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;font-weight:bold;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:2px 0;word-break:break-word;">${esc(v)}</td></tr>`).join('')}
</table>
</td></tr>
</table></td></tr></table></body></html>`

  const texto = `${titulo}
${quem}

${fichas.map(([k, v]) => `${k}: ${v}`).join('\n')}

${d.mensagem}

---
${d.detalhes.map(([k, v]) => `${k}: ${v}`).join('\n')}

Responda este e-mail para falar direto com ${d.email}.`
  return { html, texto }
}

/** A situação da assinatura em uma linha, para o Tales saber com quem fala. */
export function descreverSituacao(a: { plano?: string | null; status?: string | null; id_externo?: string | null; fim_periodo?: string | null; cancelar_ao_fim?: boolean | null } | null, precoAntigo = false, agora = Date.now()): string {
  if (!a?.plano) return 'Sem assinatura'
  const plano = a.plano.charAt(0).toUpperCase() + a.plano.slice(1)
  const meio = a.id_externo?.startsWith('pix:') ? 'no Pix' : 'no cartão'
  const fim = a.fim_periodo ? Date.parse(a.fim_periodo) : NaN
  const data = Number.isFinite(fim) ? new Date(fim).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''
  const vigente = Number.isFinite(fim) && fim > agora
  const estado = a.status === 'reembolsada' ? 'reembolsada'
    : a.status === 'falha_pagamento' ? 'cobrança recusada'
    : a.status === 'pendente' ? 'pagamento pendente'
    : vigente ? `ativa até ${data}${a.cancelar_ao_fim && !a.id_externo?.startsWith('pix:') ? ', sem renovar' : ''}`
    : data ? `terminou em ${data}` : (a.status ?? '')
  return `${plano} ${meio} · ${estado}${precoAntigo ? ' · preço antigo garantido' : ''}`
}
