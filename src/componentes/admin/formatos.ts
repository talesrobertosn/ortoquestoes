/** Textos e formatos compartilhados pelas abas do painel do administrador. */

export const data = (valor: string | null | undefined) => valor ? new Date(valor).toLocaleDateString('pt-BR') : '—'
export const dataHora = (valor: string | null | undefined) => valor ? new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

/** "hoje", "ontem", "há 5 dias", "há 3 meses". */
export function haQuanto(valor: string | null | undefined): string {
  if (!valor) return 'nunca'
  const dias = Math.floor((Date.now() - new Date(valor).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(dias / 365)
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

export const normalizar = (texto: string) => texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '')
export const corresponde = (termos: Array<string | null | undefined>, busca: string) =>
  !busca || termos.some((termo) => termo && normalizar(termo).includes(busca))

// Nomes de planos, status e avisos moram em rotulos.ts (um lugar só); reexportados aqui para quem já importava daqui.
export { PLANOS, STATUS_ASSINATURA, STATUS_EVENTO, TIPOS_EVENTO } from './rotulos'

/** O que cada código de erro do webhook quer dizer, e o que fazer. */
export const ERROS_EVENTO: Record<string, string> = {
  erro_interno: 'Erro inesperado no processamento. O detalhe fica só nos logs da Function (Supabase › Edge Functions › webhook-mercado-pago).',
  consulta_mercado_pago_falhou: 'O Mercado Pago não respondeu à consulta. Costuma resolver com "Reprocessar".',
  consulta_assinatura_falhou: 'Não foi possível ler a assinatura no banco. Tente reprocessar.',
  consulta_conta_teste_falhou: 'Não foi possível conferir se a conta é de teste. Tente reprocessar.',
  criacao_assinatura_falhou: 'O pagamento chegou, mas a assinatura não foi gravada no banco. Reprocesse.',
  atualizacao_assinatura_falhou: 'A assinatura existe, mas não foi atualizada no banco. Reprocesse.',
  atualizacao_cobranca_falhou: 'A cobrança não foi registrada na assinatura. Reprocesse.',
  atualizacao_evento_falhou: 'O evento foi tratado, mas o status dele não foi salvo.',
  assinatura_nao_encontrada: 'O Mercado Pago cita uma assinatura que não existe no banco. Confira o e-mail do pagador no Mercado Pago.',
  data_aprovacao_ausente: 'Pagamento aprovado sem data de aprovação. Confira no Mercado Pago.',
  recorrencia_ausente: 'A assinatura veio sem período de cobrança.',
  recorrencia_desconhecida: 'Período de cobrança diferente de mensal, semestral ou anual.',
  recorrencia_invalida: 'Período de cobrança inválido.',
  pagamento_divergente: 'O valor ou o pagador não bate com a assinatura. Confira no Mercado Pago antes de liberar.',
  evento_divergente: 'O mesmo evento chegou duas vezes com conteúdo diferente.',
  evento_invalido: 'Aviso em formato inválido. Pode ser teste do Mercado Pago.',
  assinatura_invalida: 'Assinatura digital do aviso não confere: possível chamada falsa. Nada foi liberado.',
}

export function nomeErro(codigo: string | null): string {
  if (!codigo) return ''
  if (ERROS_EVENTO[codigo]) return ERROS_EVENTO[codigo]
  const texto = codigo.replace(/[_:-]+/g, ' ').trim()
  return texto.charAt(0).toUpperCase() + texto.slice(1) + '.'
}

/** Motivo de um e-mail que não saiu, em português, com o texto do Resend quando houver. */
export function motivoFalhaEmail(bruto: string | null | undefined): string {
  const texto = (bruto ?? '').replace(/^Error: /, '').trim()
  const [, status, detalhe] = texto.match(/^envio_recusado_(\d+)(?::\s*(.*))?$/) ?? []
  const doResend = detalhe ? ` Resposta do Resend: "${detalhe}"` : ''
  if (texto === 'email_nao_configurado') return 'Faltam segredos no Supabase (Edge Functions › Secrets): RESEND_API_KEY, EMAIL_REMETENTE e EMAIL_SEGREDO, com esses nomes exatos.'
  if (texto === 'pessoa_nao_quer_emails') return 'Esta pessoa desligou os e-mails do site (em Minha conta ou pelo link do e-mail).'
  if (texto === 'acao_invalida') return 'A função enviar-email publicada no Supabase ainda é a antiga. Publique a nova (docs/emails/ENTREGABILIDADE.md, seção Publicar).'
  if (texto === 'sql_pendente') return 'Falta colar no Supabase a parte 27 (supabase/colar-no-painel/sql-202610152100-parte27.sql).'
  if (texto === 'administrador') return 'Conta de administrador: fica fora do envio em lote.'
  if (texto === 'email_nao_confirmado') return 'A pessoa ainda não confirmou o e-mail.'
  if (texto === 'sem_aceite_novidades') return 'A pessoa não marcou "Quero receber novidades" (Termos, item 17.5.3); convite em lote não vai.'
  if (texto === 'mesmo_tipo_30_dias') return 'Já recebeu esta carta nos últimos 30 dias.'
  if (texto === 'recebeu_email_recente') return 'Recebeu outro e-mail do site nas últimas 48 horas.'
  if (texto === 'usuario_sem_email') return 'Conta sem e-mail.'
  if (texto === 'carta_invalida') return 'Assunto ou texto vazio (ou longo demais).'
  if (texto.startsWith('carta_com_problema')) return 'O texto tem um valor vazio ou um marcador sem preencher, como {nome}.'
  if (status === '401') return 'O Resend não reconheceu a chave. Confira o segredo RESEND_API_KEY (começa com re_).' + doResend
  if (status === '403') return 'O Resend recusou o remetente: o domínio ortoquestoes.com.br ainda não está "Verified" no Resend, ou o EMAIL_REMETENTE usa outro domínio.' + doResend
  if (status === '422') return 'O Resend achou algum dado inválido, quase sempre o formato do EMAIL_REMETENTE. Use: OrtoQuestões <contato@ortoquestoes.com.br>.' + doResend
  if (status === '429') return 'Limite de envios do Resend atingido. Tente de novo mais tarde.' + doResend
  if (status) return `O Resend recusou o envio (código ${status}).` + doResend
  return texto || 'Motivo não registrado.'
}

export const porcentagem = (parte: number, todo: number) => todo > 0 ? Math.round((parte / todo) * 100) : null

/** Mensagem única para uma função do painel que ainda não existe no banco. */
export function erroDoPainel(falha: unknown, migracao: string): string {
  const texto = String(falha)
  if (texto.includes('(403)')) return 'Acesso negado. Esta área é exclusiva de administradores.'
  if (texto.includes('(404)')) return `Falta rodar no Supabase a migração ${migracao}.`
  return 'Não foi possível carregar agora. Tente atualizar.'
}

/** Baixa uma planilha CSV (separador ;, que o Excel em português abre direto). */
export function baixarCsv(nomeArquivo: string, cabecalho: string[], linhas: Array<Array<string | number | null | undefined>>) {
  const celula = (v: string | number | null | undefined) => {
    const texto = v === null || v === undefined ? '' : String(v)
    // Fórmulas começando com = + - @ viram texto: planilha aberta não executa nada.
    const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto
    return /[;"\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
  }
  const conteudo = '﻿' + [cabecalho, ...linhas].map(l => l.map(celula).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = nomeArquivo
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Acerto de uma conta (ou de um grupo somado). "Real" é a primeira resposta de
 * cada questão; "após revisão" é a última (quem errou e acertou na revisão conta
 * como acerto); "por tentativa" soma todas as tentativas, como a pessoa vê no
 * Desempenho. Os dois últimos vêm da migração 202610060400; sem ela, só há o
 * "após revisão" e o real fica nulo.
 */
export interface NumerosAcerto { acertos: number; erros: number; acertos_primeira?: number | null; erros_primeira?: number | null; acertos_tentativas?: number | null; erros_tentativas?: number | null }
export const acertoReal = (n: NumerosAcerto) => n.acertos_primeira == null ? null : porcentagem(Number(n.acertos_primeira), Number(n.acertos_primeira) + Number(n.erros_primeira ?? 0))
export const acertoAposRevisao = (n: NumerosAcerto) => porcentagem(Number(n.acertos), Number(n.acertos) + Number(n.erros))
export const acertoPorTentativa = (n: NumerosAcerto) => n.acertos_tentativas == null ? null : porcentagem(Number(n.acertos_tentativas), Number(n.acertos_tentativas) + Number(n.erros_tentativas ?? 0))
/** Soma os números de várias contas. */
export function somarAcertos(lista: NumerosAcerto[]): Required<NumerosAcerto> {
  const temReal = lista.some(n => n.acertos_primeira != null)
  const soma = (f: (n: NumerosAcerto) => number | null | undefined) => lista.reduce((t, n) => t + Number(f(n) ?? 0), 0)
  return {
    acertos: soma(n => n.acertos), erros: soma(n => n.erros),
    acertos_primeira: temReal ? soma(n => n.acertos_primeira) : null as unknown as number, erros_primeira: temReal ? soma(n => n.erros_primeira) : null as unknown as number,
    acertos_tentativas: temReal ? soma(n => n.acertos_tentativas) : null as unknown as number, erros_tentativas: temReal ? soma(n => n.erros_tentativas) : null as unknown as number,
  }
}

/** "Instagram · anúncio · teot-tepot": fonte, meio e campanha do cadastro. */
const NOMES_FONTE: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', 'instagram/facebook': 'Instagram ou Facebook', google: 'Google', whatsapp: 'WhatsApp', youtube: 'YouTube', x: 'X (Twitter)', direto: 'Acesso direto' }
const NOMES_MEIO: Record<string, string> = { anuncio: 'anúncio', bio: 'link da bio', link: 'link', busca: 'busca', stories: 'stories', story: 'stories' }
export function rotuloOrigem(o: { fonte?: string; meio?: string; campanha?: string }): string {
  const fonte = o.fonte ? NOMES_FONTE[o.fonte] ?? o.fonte : 'Sem fonte'
  const meio = o.meio ? NOMES_MEIO[o.meio] ?? o.meio : null
  return [fonte, meio, o.campanha].filter(Boolean).join(' · ')
}

const PAGINAS: Record<string, string> = {
  '/': 'Início', '/treinar': 'Montando uma sessão', '/sessao': 'Respondendo questões', '/resumo': 'Resumo da sessão',
  '/questao': 'Vendo uma questão', '/dados': 'Desempenho', '/revisao': 'Revisão', '/erros': 'Caderno de erros',
  '/favoritas': 'Favoritas', '/ranking': 'Ranking', '/conquistas': 'Emblemas', '/conta': 'Minha conta',
  '/conta/assinatura': 'Dados da assinatura', '/assinatura': 'Planos (olhando preços)', '/cronograma': 'Cronograma',
  '/plano-de-estudo': 'Cronograma', '/simulado-nacional': 'Simulado Nacional', '/temas-que-mais-caem': 'Temas que mais caem',
  '/indicar': 'Indique e ganhe', '/ligas': 'Liga da residência', '/admin': 'Painel do administrador', '/termos': 'Termos de uso',
  '/contato': 'Suporte e contato', '/sobre': 'O projeto', '/projeto': 'O projeto', '/progresso': 'Progresso dos comentários',
  '/emails': 'Preferências de e-mail',
  // Biblioteca de resumos (16/10/2026); o resumo aberto no leitor vira "Lendo o resumo: <título>" (rotuloPagina)
  '/resumos': 'Biblioteca de resumos (estante)', '/resumos/caderno': 'Resumos: caderno de estudo', '/resumos/frases': 'Resumos: frases que caem',
  // Flashcards (beta): em que parte a pessoa está, com o nome público fora do jogo
  '/flashcards': 'Flashcards: página inicial', '/flashcards/desempenho': 'Flashcards: vendo o desempenho',
  '/flashcards/cronograma': 'Flashcards: montando o cronograma', '/flashcards/entrada': 'Torneio de Flashcards: escolhendo o modo',
  '/flashcards/cripta': 'Torneio de Flashcards: batalha na Cripta', '/flashcards/masmorra': 'Torneio de Flashcards: batalha na Cripta',
  '/flashcards/torre': 'Torneio de Flashcards: subindo a Torre', '/flashcards/biblioteca': 'Estudando flashcards (Biblioteca)',
  '/flashcards/estudo': 'Estudando flashcards (Biblioteca)', '/flashcards/ranking': 'Flashcards: vendo o ranking',
}
/** Títulos dos resumos da Biblioteca (o painel registra ao abrir), para "Lendo o resumo: Fratura do colo do fêmur". */
const titulosResumos = new Map<string, string>()
export function registrarTitulosResumos(lista: Array<{ id: string; titulo: string }>) { for (const c of lista) titulosResumos.set(c.id, c.titulo) }
export const tituloResumo = (id: string) => titulosResumos.get(id) ?? id.replace(/^[a-z]+\d+-\d+-/, '').replace(/-/g, ' ')
/** Id do capítulo quando a página é um resumo aberto no leitor (fora a estante, o caderno e as frases). */
export function resumoDaPagina(pagina: string | null | undefined): string | null {
  const m = (pagina ?? '').split(' · ')[0].match(/^\/resumos\/([a-z0-9-]{3,80})$/)
  return m && m[1] !== 'caderno' && m[1] !== 'frases' ? m[1] : null
}
/** Só o nome da página, sem o complemento ("Respondendo questões"). */
function nomeDaRota(rota: string): string {
  const capitulo = resumoDaPagina(rota)
  return capitulo ? `Lendo o resumo: ${tituloResumo(capitulo)}` : PAGINAS[rota] ?? (rota.startsWith('/convite') ? 'Abrindo um convite' : rota.startsWith('/flashcards') ? 'Flashcards' : rota)
}
/** "/sessao · 3 de 10" vira "Respondendo questões (3 de 10)". */
export function rotuloPagina(pagina: string | null | undefined): string {
  if (!pagina) return 'sem registro'
  const [rota, extra] = pagina.split(' · ')
  const nome = nomeDaRota(rota)
  return extra ? `${nome} (${extra})` : nome
}
/** Área da questão pelo prefixo do id ("trauma-0412" → "Trauma adulto"), com os nomes da taxonomia. */
const AREAS: Record<string, string> = {
  mao: 'Mão e punho', 'ombro-cotovelo': 'Ombro e cotovelo', quadril: 'Quadril', joelho: 'Joelho', coluna: 'Coluna', 'pe-tornozelo': 'Pé e tornozelo',
  trauma: 'Trauma adulto', pediatria: 'Ortopedia pediátrica', tumores: 'Tumores ósseos e de partes moles', 'conceitos-basicos': 'Conceitos básicos',
  'ortopedia-geral': 'Ortopedia geral', osteometabolicas: 'Osteometabólicas',
}
export const areaDaQuestao = (id: string | null | undefined): string | null => id ? AREAS[id.replace(/-\d+$/, '')] ?? null : null
/**
 * O que a pessoa está fazendo agora, em pedaços para o monitor ao vivo escrever a frase inteira
 * ("Respondendo questões · Trauma adulto · trauma-0412 · 3 de 10"; "Lendo o resumo: … · 40% lido").
 */
export function pedacosAtividade(u: { pagina?: string | null; questao?: string | null }): { nome: string; area: string | null; questao: string | null; extra: string | null } {
  if (!u.pagina) return { nome: 'Página ainda não registrada', area: null, questao: null, extra: null }
  const [rota, extra] = u.pagina.split(' · ')
  return { nome: nomeDaRota(rota), area: areaDaQuestao(u.questao), questao: u.questao ?? null, extra: extra ?? null }
}
/** Iniciais e cor fixa por pessoa, para reconhecer de relance nas listas do painel. */
export const iniciais = (u: { nome?: string | null; email?: string | null }) => (u.nome ?? u.email ?? '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
export const corDe = (id: string) => `hsl(${[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)} 45% 42%)`
/** "14:32" no relógio de São Paulo. */
export const hora = (valor: string | number | null | undefined) => valor ? new Date(valor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—'
/** "agora", "há 4 min", "há 2 h", ou a data. */
export function haQuantoTempo(valor: string | null | undefined): string {
  if (!valor) return 'nunca'
  const min = Math.floor((Date.now() - new Date(valor).getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  return haQuanto(valor)
}

/**
 * Envios em lote do painel (lembretes, resumo quinzenal, relatório do mês): poucos por chamada
 * e uma espera longa. Cada e-mail leva 1 a 2 s na função; com 40 por chamada e a tela esperando
 * só 20 s, ela desistia no meio, recarregava a lista com o servidor ainda mandando e mostrava as
 * mesmas pessoas com o botão de enviar de novo (relato do Tales, 21/10/2026).
 */
export const LOTE_EMAILS = 10
export const PRAZO_LOTE_MS = 120_000
export interface RespostaLote { enviados: number; falhas: number; adiados?: number; recusados?: number; lote?: number; talvez_restem: boolean }
/**
 * Soma as voltas de um envio em lote. Quem a função pula (cadência ou e-mails desligados) não
 * fica registrado e volta na próxima chamada; por isso a volta seguinte pede mais gente (até 80),
 * para os pulados não taparem a fila. Para quando não sobra ninguém ou quando nem pedindo 80
 * alguém sai.
 */
export async function enviarEmLotes(chamar: (limite: number) => Promise<RespostaLote>, aoAvancar: (total: number) => void, voltas = 60) {
  const soma = { enviados: 0, falhas: 0, adiados: 0, recusados: 0 }
  let limite = LOTE_EMAILS
  for (let volta = 0; volta < voltas; volta++) {
    aoAvancar(soma.enviados)
    const r = await chamar(limite)
    const pulados = Number(r.adiados ?? 0) + Number(r.recusados ?? 0)
    soma.enviados += r.enviados; soma.falhas += r.falhas
    // Os pulados voltam a cada chamada: conta a maior volta, não a soma.
    soma.adiados = Math.max(soma.adiados, Number(r.adiados ?? 0)); soma.recusados = Math.max(soma.recusados, Number(r.recusados ?? 0))
    if (!r.talvez_restem) break
    if (r.enviados + r.falhas === 0 && limite >= 80) break
    limite = Math.min(80, LOTE_EMAILS + pulados)
  }
  return soma
}
/** "3 e-mails enviados, 1 com falha, 2 ficaram para depois (outro e-mail há menos de 48 h)". */
export function textoLote(s: { enviados: number; falhas: number; adiados: number; recusados: number }) {
  return [
    `${s.enviados} ${s.enviados === 1 ? 'e-mail enviado' : 'e-mails enviados'}`,
    s.falhas ? `${s.falhas} com falha (o motivo fica na ficha de cada pessoa)` : '',
    s.adiados ? `${s.adiados} ${s.adiados === 1 ? 'ficou' : 'ficaram'} para depois (já ${s.adiados === 1 ? 'recebeu' : 'receberam'} outro e-mail há menos de 48 h ou 3 em 14 dias)` : '',
    s.recusados ? `${s.recusados} desligaram esses e-mails` : '',
  ].filter(Boolean).join(', ')
}

/**
 * Enviar e-mails é uma página só (21/10/2026): lembretes, cartas, relatórios e os últimos envios.
 * Quando uma parte manda e-mails, as outras recarregam (a cadência e o histórico mudam para todas).
 */
const EVENTO_EMAILS = 'oq:admin:emails-enviados'
export const avisarEmailsEnviados = () => window.dispatchEvent(new Event(EVENTO_EMAILS))
export function ouvirEmailsEnviados(aoMudar: () => void) {
  window.addEventListener(EVENTO_EMAILS, aoMudar)
  return () => window.removeEventListener(EVENTO_EMAILS, aoMudar)
}
