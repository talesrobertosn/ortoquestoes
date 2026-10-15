/**
 * E-mails automáticos do OrtoQuestões. Desde 15/10/2026 todos saem como carta
 * (ver cartas.ts): só texto, sem logo, sem botão colorido, um link no máximo e
 * a assinatura fixa "Um abraço, / Tales, do Orto Questões". O texto vem do mesmo
 * motor das cartas do painel, com várias versões por situação; a semente é fixa
 * por pessoa e envio, para uma nova tentativa sair igual.
 *
 * Só funções puras (sem Deno nem rede): a Edge Function e os testes usam o mesmo arquivo.
 */
import { escolherTipo, gerarCarta, primeiroNome, tipoCombina, questoes, renderizarCarta, sementeDe, type Carta, type DadosRelatorioCarta, type EnvioAnterior, type PerfilCarta } from './cartas.ts'

export interface Marco {
  minimo: number
  rotulo: string
  nivel: 'bronze' | 'prata' | 'ouro' | 'esmeralda'
}

/** Os mesmos emblemas de volume do site (src/estado/conquistas.ts). */
export const MARCOS: readonly Marco[] = [
  { minimo: 50, rotulo: 'Primeiros passos', nivel: 'bronze' },
  { minimo: 100, rotulo: 'Interno', nivel: 'bronze' },
  { minimo: 250, rotulo: 'R1', nivel: 'prata' },
  { minimo: 500, rotulo: 'R2', nivel: 'prata' },
  { minimo: 1000, rotulo: 'R3', nivel: 'ouro' },
  { minimo: 2000, rotulo: 'Preceptor', nivel: 'ouro' },
  { minimo: 3000, rotulo: 'Chefe de serviço', nivel: 'esmeralda' },
  { minimo: 4000, rotulo: 'Lenda do OrtoQuestões', nivel: 'esmeralda' },
]

export function marcoAtingido(total: number): Marco | null {
  let atual: Marco | null = null
  for (const m of MARCOS) if (total >= m.minimo) atual = m
  return atual
}
export function proximoMarco(total: number): Marco | null {
  return MARCOS.find((m) => total < m.minimo) ?? null
}

export interface DadosMarco {
  nome: string | null
  marco: Marco
  respondidas: number
  acertos: number
  erros: number
  respondidas7d: number
  /** Texto do administrador, no envio manual antigo ("parabens"). */
  recado?: string | null
  site: string
  linkDescadastro: string
  /** Perfil completo (parte 27), quando disponível: deixa a carta mais pessoal. */
  perfil?: PerfilCarta | null
  /** E-mails anteriores da pessoa, para não repetir a versão. */
  anteriores?: readonly EnvioAnterior[]
  semente?: number
}

/** O e-mail pronto, com o modelo e a versão para o histórico. */
export interface EmailPronto { assunto: string; html: string; texto: string; modelo: string | null; versao: string | null }

function pronto(carta: Carta, descadastro: string | null, aviso: string): EmailPronto {
  const e = renderizarCarta({ assunto: carta.assunto, corpo: carta.corpo, descadastro, textoDescadastro: aviso })
  return { ...e, modelo: carta.modelo, versao: carta.versao }
}

function perfilDe(d: { nome: string | null; respondidas: number; acertos?: number; erros?: number; respondidas7d?: number }, extra?: PerfilCarta | null): PerfilCarta {
  return {
    nome: d.nome, respondidas: Number(d.respondidas) || 0, acertos: d.acertos ?? null, erros: d.erros ?? null, semana: d.respondidas7d ?? null,
    ...(extra ?? {}),
    ...(extra?.nome ? {} : { nome: d.nome }),
  }
}

/** Parabéns automático ao passar de um marco (50, 100, 250...). */
export function emailMarco(d: DadosMarco): EmailPronto {
  const carta = gerarCarta(perfilDe(d, d.perfil), {
    tipo: 'marco', marco: d.marco.minimo, anteriores: d.anteriores, site: d.site,
    semente: d.semente ?? sementeDe(`marco:${d.marco.minimo}:${d.nome ?? ''}:${d.respondidas}`),
  })
  return pronto(carta, d.linkDescadastro, 'Se preferir não receber mais os e-mails de conquistas')
}

/**
 * Carta escrita pelo administrador (ação antiga "parabens", mantida para o painel
 * que ainda estiver aberto com a versão anterior). Sem cabeçalho de envio em massa.
 */
export function emailCarta(d: DadosMarco): EmailPronto {
  const nome = primeiroNome(d.nome)
  const recado = d.recado?.trim()
  const padrao = d.respondidas > 0
    ? `Passando para te dar parabéns: você já passou de ${questoes(d.respondidas)} no Orto Questões. Constância é o que mais faz diferença na prova, e você está construindo isso.`
    : 'Passando para dar um oi. Sua conta está pronta, e quando quiser começar, cinco questões já bastam para pegar o jeito.'
  const corpo = [nome ? `Oi, ${nome},` : 'Oi,', recado || padrao].join('\n\n')
  const e = renderizarCarta({ assunto: nome ? `${nome}, um recado sobre o seu estudo` : 'Um recado sobre o seu estudo', corpo })
  return { ...e, modelo: null, versao: null }
}

const esc = (texto: string) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Alerta curto para os administradores (só para o dono, por isso o formato de painel). */
export function emailAlerta(titulo: string, linhas: string[], link: string): { assunto: string; html: string; texto: string } {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:24px 12px;background:#eef2f1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:14px;">
<tr><td style="padding:22px 28px 6px 28px;font-size:12px;letter-spacing:2px;color:#146b61;text-transform:uppercase;font-weight:bold;">Painel do administrador</td></tr>
<tr><td style="padding:0 28px 10px 28px;font-size:20px;line-height:26px;font-weight:bold;color:#1b2624;">${esc(titulo)}</td></tr>
<tr><td style="padding:0 28px 8px 28px;font-size:15px;line-height:23px;color:#33413d;">${linhas.map((l) => esc(l)).join('<br>')}</td></tr>
<tr><td style="padding:14px 28px 26px 28px;"><a href="${link}" style="display:inline-block;padding:12px 22px;background:#146b61;color:#ffffff;border-radius:10px;font-weight:bold;text-decoration:none;font-size:14px;">Abrir o painel</a></td></tr>
</table></td></tr></table></body></html>`
  return { assunto: `[OrtoQuestões] ${titulo}`, html, texto: `${titulo}\n\n${linhas.join('\n')}\n\n${link}` }
}

/** Nomes dos temas pelo prefixo do id da questão ("ombro-cotovelo-0012"). */
export const TEMAS: Record<string, string> = {
  'mao': 'Mão e punho', 'ombro-cotovelo': 'Ombro e cotovelo', 'quadril': 'Quadril', 'joelho': 'Joelho', 'coluna': 'Coluna',
  'pe-tornozelo': 'Pé e tornozelo', 'trauma': 'Trauma adulto', 'pediatria': 'Ortopedia pediátrica',
  'tumores': 'Tumores ósseos e de partes moles', 'conceitos-basicos': 'Conceitos básicos', 'osteometabolicas': 'Osteometabólicas',
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** "2026-10-q1" → "1 a 15 de outubro"; "2026-10-q2" → "16 a 31 de outubro". */
export function nomeQuinzena(ref: string): string | null {
  const m = ref.match(/^(\d{4})-(\d{2})-q([12])$/)
  if (!m) return null
  const ultimo = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate()
  return `${m[3] === '1' ? '1 a 15' : `16 a ${ultimo}`} de ${MESES[Number(m[2]) - 1]}`
}
/** "2026-09" → "setembro de 2026". */
export function nomeMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  return MESES[m - 1] ? `${MESES[m - 1]} de ${ano}` : mes
}

export interface DadosRelatorio {
  nome: string | null
  mes: string
  respostas: number
  certas: number
  erradas: number
  dias_ativos: number
  respostas_anterior: number
  certas_anterior: number
  erradas_anterior: number
  total_acumulado: number
  temas: Array<{ tema: string; certas: number; total: number; certas_ant: number; total_ant: number }>
  simulado: { titulo: string; acertos: number; total: number } | null
  site: string
  linkDescadastro: string
}

const pctDe = (certas: number, total: number) => (total > 0 ? Math.round((certas / total) * 100) : null)

/** O que o relatório conclui do mês: pura para o teste conferir as regras. */
export function analisarMes(d: DadosRelatorio) {
  const acerto = pctDe(d.certas, d.certas + d.erradas)
  const acertoAnterior = pctDe(d.certas_anterior, d.certas_anterior + d.erradas_anterior)
  const comparaveis = d.temas
    .filter((t) => t.total >= 5 && t.total_ant >= 5 && TEMAS[t.tema])
    .map((t) => ({ slug: t.tema, nome: TEMAS[t.tema], agora: pctDe(t.certas, t.total)!, antes: pctDe(t.certas_ant, t.total_ant)! }))
    .map((t) => ({ ...t, delta: t.agora - t.antes }))
  const subiram = comparaveis.filter((t) => t.delta >= 5).sort((a, b) => b.delta - a.delta).slice(0, 3)
  const cairam = comparaveis.filter((t) => t.delta <= -5).sort((a, b) => a.delta - b.delta).slice(0, 3)
  const doMes = d.temas.filter((t) => t.total >= 5 && TEMAS[t.tema]).map((t) => ({ slug: t.tema, nome: TEMAS[t.tema], acerto: pctDe(t.certas, t.total)!, total: t.total }))
  const maisFraco = [...doMes].sort((a, b) => a.acerto - b.acerto)[0] ?? null
  const maisEstudados = [...doMes].sort((a, b) => b.total - a.total).slice(0, 3)
  return { acerto, acertoAnterior, subiram, cairam, maisFraco, maisEstudados }
}

export type CampanhaLembrete = 'nunca' | 'tres_dias' | 'sete_dias' | 'renovacao_pix' | 'renovacao_pix_hoje'

export interface DadosLembrete {
  campanha: CampanhaLembrete
  nome: string | null
  respondidas: number
  diasFora: number
  site: string
  linkDescadastro: string
  /** Renovação do Pix: dias até o acesso acabar, a data e o plano. */
  diasRestantes?: number
  fimEm?: string | null
  plano?: string | null
  /** Renovação do Pix: desempenho da pessoa, para o quadro de números. */
  acertos?: number
  respondidas7d?: number
}


/** Lembretes (reengajamento e renovação do Pix), em forma de carta. */
export function emailLembrete(d: DadosLembrete & { perfil?: PerfilCarta | null; anteriores?: readonly EnvioAnterior[]; semente?: number; referencia?: string }): EmailPronto {
  const tipo = ({ nunca: 'nunca_comecou', tres_dias: 'pausa', sete_dias: 'sumiu', renovacao_pix: 'pix_3_dias', renovacao_pix_hoje: 'pix_hoje' } as const)[d.campanha]
  const perfil = perfilDe({ nome: d.nome, respondidas: d.respondidas, acertos: d.acertos, respondidas7d: d.respondidas7d,
    erros: d.acertos !== undefined && d.respondidas > 0 ? Math.max(0, d.respondidas - d.acertos) : undefined }, d.perfil)
  // A ausência que vale é a da campanha (dias desde o último acesso).
  if (d.campanha === 'tres_dias' || d.campanha === 'sete_dias') perfil.diasParado = Math.max(1, d.diasFora)
  const carta = gerarCarta(perfil, {
    // Se a pessoa mudou de situação desde que a lista foi montada, vale a carta da situação nova.
    tipo: tipoCombina(tipo, perfil) ? tipo : escolherTipo(perfil, d.anteriores).tipo, anteriores: d.anteriores, site: d.site,
    semente: d.semente ?? sementeDe(`${d.campanha}:${d.referencia ?? ''}:${d.nome ?? ''}`),
    pix: { diasRestantes: d.diasRestantes ?? 3, fimEm: d.fimEm ?? null, plano: d.plano ?? null },
  })
  return pronto(carta, d.linkDescadastro, 'Se preferir não receber mais lembretes de estudo')
}

/** Resumo quinzenal (todos que estudaram) ou relatório do mês (assinantes), em forma de carta. */
export function emailRelatorio(d: DadosRelatorio & { perfil?: PerfilCarta | null; anteriores?: readonly EnvioAnterior[]; semente?: number }): EmailPronto {
  const a = analisarMes(d)
  const quinzena = nomeQuinzena(d.mes)
  const mes = nomeMes(d.mes).split(' ')[0]
  const relatorio: DadosRelatorioCarta = {
    rotulo: quinzena ? `de ${quinzena}` : `de ${mes}`,
    em: quinzena ? `de ${quinzena}` : `em ${mes}`,
    frase: quinzena ? `Entre ${quinzena.replace(' a ', ' e ')}` : `Em ${mes}`,
    quinzena: !!quinzena,
    respostas: Number(d.respostas) || 0, certas: Number(d.certas) || 0, erradas: Number(d.erradas) || 0, diasAtivos: Number(d.dias_ativos) || 0,
    respostasAnterior: Number(d.respostas_anterior) || 0, acertoAnterior: a.acertoAnterior, totalAcumulado: Number(d.total_acumulado) || 0,
    subiram: a.subiram.map((t) => ({ slug: t.slug, antes: t.antes, agora: t.agora })),
    cairam: a.cairam.map((t) => ({ slug: t.slug, antes: t.antes, agora: t.agora })),
    maisFraco: a.maisFraco ? { slug: a.maisFraco.slug, acerto: a.maisFraco.acerto } : null,
    simulado: d.simulado,
  }
  const carta = gerarCarta(perfilDe({ nome: d.nome, respondidas: Number(d.total_acumulado) || 0 }, d.perfil), {
    tipo: 'relatorio', relatorio, anteriores: d.anteriores, site: d.site, semente: d.semente ?? sementeDe(`relatorio:${d.mes}:${d.nome ?? ''}`),
  })
  return pronto(carta, d.linkDescadastro, 'Se preferir não receber mais os resumos de estudo')
}

export interface DadosRelatoResolvido {
  nome: string | null
  idQuestao: string
  /** O que a pessoa escreveu ao relatar. */
  relato: string
  /** O que foi feito, escrito pelo administrador (opcional). */
  nota: string | null
  site: string
}

/** Rótulo da questão pelo id: "Trauma adulto, questão 44". */
export function rotuloQuestao(id: string): string {
  const [, prefixo, numero] = id.match(/^(.*)-(\d+)$/) ?? []
  return prefixo && TEMAS[prefixo] ? `${TEMAS[prefixo]}, questão ${Number(numero)}` : id
}


/**
 * Aviso de que um relato de erro foi resolvido. Uma resposta a quem escreveu,
 * não uma campanha: sem link de descadastro.
 */
export function emailRelatoResolvido(d: DadosRelatoResolvido): { assunto: string; html: string; texto: string } {
  const nome = primeiroNome(d.nome)
  const rotulo = rotuloQuestao(d.idQuestao)
  const link = `${d.site}#/questao/${encodeURIComponent(d.idQuestao)}`
  const relato = d.relato.trim().replace(/\s+/g, ' ')
  const trecho = relato.length > 240 ? relato.slice(0, 240).replace(/\s\S*$/, '') + '…' : relato
  const nota = d.nota?.trim() || null
  const corpo = [
    nome ? `Oi, ${nome},` : 'Oi,',
    `Você relatou um problema na questão de ${rotulo}: "${trecho}"`,
    `Conferi e a questão já está corrigida no site.${nota ? ` O que foi feito: ${nota}` : ''}`,
    'Obrigado por avisar. Cada relato deixa o banco de questões melhor para todo mundo que está estudando.',
    `Se quiser ver como ficou: ${link.replace(/^https?:\/\//, '')}`,
  ].join('\n\n')
  return renderizarCarta({ assunto: `Corrigi a questão que você relatou (${rotulo})`, corpo })
}
