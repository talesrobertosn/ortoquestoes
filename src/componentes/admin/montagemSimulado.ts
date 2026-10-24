/*
 * Painel › Conteúdo › Simulados (Simulado Nacional 2.0, parte D do plano em
 * docs/superpowers/specs/2026-10-19-simulado-nacional-contrato.md): as contas puras
 * da montagem, sem React, para o painel e para fixtures/testar_admin_simulados.mjs.
 * Datas no horário de Brasília (-03:00, sem horário de verão desde 2019).
 */
import { CONFIG_PADRAO, DURACAO_MENSAL_MIN, QUESTOES_MENSAL, edicaoDoMes, fimDoMes, inicioDoMes, sortearEdicao, type CandidataNacional, type ConfigSorteio, type ItemSorteado, type TipoEdicao } from '../../dados/simuladoNacional'
import { codigoErroSN, type ConfigSorteioSN, type EdicaoAdminSN, type ItemAdminSN, type LetraSN } from '../../dados/apiSimuladoNacional'
import { ErroRpc } from '../../servicos/supabase'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const dois = (n: number) => String(n).padStart(2, '0')
const maiuscula = (t: string) => t.replace(/^./, (c) => c.toUpperCase())

/** Tamanhos prontos da prova; outro número vale de 10 a 200. */
export const TAMANHOS = [50, 80, 100, 120] as const
export const MIN_QUESTOES = 10
export const MAX_QUESTOES = 200
/** A edição de lançamento: datas do contrato (24/10 08:00 → 31/10 23:59) e aberta a todos. */
export const MES_LANCAMENTO = '2026-10'

/** "outubro de 2026" de '2026-10' (ou de '2026-10-vespera-…'). */
export function nomeDoMes(mes: string): string {
  const [ano, m] = mes.slice(0, 7).split('-').map(Number)
  return `${MESES[m - 1]} de ${ano}`
}

/** '2026-10' + n meses. */
export function somarMeses(mes: string, n: number): string {
  const [ano, m] = mes.slice(0, 7).split('-').map(Number)
  const total = ano * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${dois((total % 12) + 1)}`
}

/** Só as edições novas (sn_): 'AAAA-MM' ou 'AAAA-MM-vespera-<slug>'. */
export const ehEdicaoNova = (edicao: string) => /^\d{4}-(0[1-9]|1[0-2])(-vespera-[a-z0-9]+(-[a-z0-9]+)*)?$/.test(edicao)

/**
 * O mês sugerido para montar: o mês atual, se ele ainda não tem edição mensal
 * (outubro de 2026 dá para montar agora); senão o primeiro mês seguinte livre.
 */
export function mesPadrao(edicoes: Array<Pick<EdicaoAdminSN, 'edicao' | 'tipo'>>, agora = new Date()): string {
  const mensais = new Set(edicoes.filter((e) => e.tipo === 'mensal').map((e) => e.edicao))
  let mes = edicaoDoMes(agora)
  while (mensais.has(mes)) mes = somarMeses(mes, 1)
  return mes
}

/** Hora local de Brasília ('2026-10-25T08:00', para o <input type="datetime-local">) → ISO com -03:00. */
export function localParaIso(local: string, fimDoMinuto = false): string {
  return `${local.slice(0, 16)}:${fimDoMinuto ? '59' : '00'}-03:00`
}

/** ISO (qualquer fuso) → hora local de Brasília no formato do datetime-local. */
export function isoParaLocal(iso: string): string {
  return new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 16)
}

/** Slug da véspera: 'TEOT 2027' → 'teot-2027'. */
export function slugVespera(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

/** O código da edição: '2026-10' (mensal) ou '2027-01-vespera-teot' (véspera, pelo mês da prova). */
export function codigoEdicao(f: { mes: string; tipo: TipoEdicao; slug: string; dataProva: string }): string {
  if (f.tipo === 'mensal') return f.mes
  const mes = f.dataProva ? f.dataProva.slice(0, 7) : f.mes
  return `${mes}-vespera-${slugVespera(f.slug) || 'prova'}`
}

export function tituloPadrao(f: { mes: string; tipo: TipoEdicao; dataProva: string }): string {
  if (f.tipo === 'vespera') return `Simulado de véspera · ${maiuscula(nomeDoMes(f.dataProva || f.mes))}`
  return `Simulado Nacional · ${maiuscula(nomeDoMes(f.mes))}`
}

/**
 * Datas sugeridas (hora de Brasília, formato datetime-local):
 * mensal do dia 1º 00:00 ao último dia 23:59; outubro de 2026 de 24/10 08:00 a 31/10 23:59;
 * véspera abre 7 dias antes da prova e fecha às 23:59 da véspera.
 */
export function datasPadrao(f: { mes: string; tipo: TipoEdicao; dataProva: string }): { abre: string; fecha: string } {
  if (f.tipo === 'vespera' && /^\d{4}-\d{2}-\d{2}$/.test(f.dataProva)) {
    const prova = Date.parse(`${f.dataProva}T00:00:00Z`)
    const dia = (ms: number) => new Date(ms).toISOString().slice(0, 10)
    return { abre: `${dia(prova - 7 * 86_400_000)}T00:00`, fecha: `${dia(prova - 86_400_000)}T23:59` }
  }
  if (f.mes === MES_LANCAMENTO) return { abre: '2026-10-24T08:00', fecha: '2026-10-31T23:59' }
  return { abre: inicioDoMes(f.mes).slice(0, 16), fecha: fimDoMes(f.mes).slice(0, 16) }
}

/** O formulário de montagem inteiro. Datas em hora de Brasília (datetime-local). */
export interface FormEdicao {
  mes: string
  tipo: TipoEdicao
  /** Véspera: nome curto da prova (vira o slug do código) e o dia da prova (AAAA-MM-DD). */
  slug: string
  dataProva: string
  titulo: string
  descricao: string
  abre: string
  fecha: string
  duracao: number
  total: number
  abertoATodos: boolean
  destaqueInicio: boolean
  config: ConfigSorteio
  /** 0 = a semente é o próprio código da edição (a mesma do script); cada "Sortear de novo" soma 1. */
  variante: number
}

export function formularioPadrao(mes: string, tipo: TipoEdicao = 'mensal', dataProva = ''): FormEdicao {
  const base = { mes, tipo, dataProva }
  return {
    ...base, slug: tipo === 'vespera' ? 'prova' : '', ...datasPadrao(base),
    titulo: tituloPadrao(base), descricao: '',
    duracao: DURACAO_MENSAL_MIN, total: QUESTOES_MENSAL,
    abertoATodos: mes === MES_LANCAMENTO && tipo === 'mensal', destaqueInicio: true,
    config: { ...CONFIG_PADRAO, provas: [...CONFIG_PADRAO.provas], cotas: null }, variante: 0,
  }
}

/** Uma edição salva de volta no formulário (para continuar o rascunho). */
export function formularioDaEdicao(e: EdicaoAdminSN): FormEdicao {
  const vespera = e.tipo === 'vespera'
  const { config, variante } = lerConfig(e.config)
  return {
    mes: e.edicao.slice(0, 7), tipo: e.tipo, slug: vespera ? e.edicao.replace(/^\d{4}-\d{2}-vespera-/, '') : '',
    dataProva: vespera ? isoParaLocal(new Date(Date.parse(e.fecha_em) + 60_000).toISOString()).slice(0, 10) : '',
    titulo: e.titulo, descricao: e.descricao ?? '', abre: isoParaLocal(e.abre_em), fecha: isoParaLocal(e.fecha_em),
    duracao: e.duracao_min, total: e.total || QUESTOES_MENSAL, abertoATodos: e.aberto_a_todos, destaqueInicio: e.destaque_inicio,
    config, variante,
  }
}

/** A semente do sorteio: o código da edição e, depois de "Sortear de novo", a variante. */
export const sementeDe = (edicao: string, variante: number) => (variante > 0 ? `${edicao}~${variante}` : edicao)

/** ConfigSorteio + variante → o registro guardado em sn_edicoes.config (nomes do banco). */
export function configParaBanco(c: ConfigSorteio, variante: number): ConfigSorteioSN {
  return {
    provas: [...c.provas], peso_recentes: c.pesoRecentes, anos_recentes: c.anosRecentes, nivel_alto_pct: c.nivelAltoPct,
    ...(c.cotas ? { cotas: { ...c.cotas } } : {}), variante,
  }
}

/** O registro do banco de volta (o que faltar fica no padrão do contrato). */
export function lerConfig(c: ConfigSorteioSN | null | undefined): { config: ConfigSorteio; variante: number } {
  const num = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao)
  // Configurações gravadas antes de 21/10/2026 usam o nome antigo "TEOT/TARO", hoje "Ortopedia".
  const provas = Array.isArray(c?.provas) && c.provas.length
    ? [...new Set(c.provas.filter((p): p is string => typeof p === 'string').map(p => (p === 'TEOT/TARO' ? 'Ortopedia' : p)))]
    : [...CONFIG_PADRAO.provas]
  const cotas = c?.cotas && typeof c.cotas === 'object' && Object.keys(c.cotas).length ? { ...c.cotas } : null
  return {
    config: {
      provas, cotas,
      pesoRecentes: num(c?.peso_recentes, CONFIG_PADRAO.pesoRecentes),
      anosRecentes: num(c?.anos_recentes, CONFIG_PADRAO.anosRecentes),
      nivelAltoPct: num(c?.nivel_alto_pct, CONFIG_PADRAO.nivelAltoPct),
    },
    variante: Math.max(0, Math.floor(num(c?.variante, 0))),
  }
}

export interface ConferenciaCotas {
  soma: number
  total: number
  ok: boolean
  /** Áreas pedindo mais questões do que têm candidatas. */
  semCandidatas: string[]
  mensagem: string
}

/** Confere as cotas manuais: inteiras, sem negativas, dentro das candidatas e somando o total. */
export function conferirCotas(cotas: Record<string, number>, total: number, disponiveis: Map<string, number>): ConferenciaCotas {
  const entradas = Object.entries(cotas)
  const soma = entradas.reduce((s, [, n]) => s + (Number.isFinite(n) ? n : 0), 0)
  const invalidas = entradas.some(([, n]) => !Number.isInteger(n) || n < 0)
  const semCandidatas = entradas.filter(([area, n]) => n > (disponiveis.get(area) ?? 0)).map(([area]) => area)
  const ok = !invalidas && !semCandidatas.length && soma === total
  let mensagem = `Soma ${soma} de ${total}.`
  if (invalidas) mensagem = 'Use só números inteiros, de zero para cima.'
  else if (semCandidatas.length) mensagem = `${semCandidatas.join(', ')}: mais questões do que o acervo tem nessa área.`
  else if (soma < total) mensagem = `Soma ${soma} de ${total}: faltam ${total - soma}.`
  else if (soma > total) mensagem = `Soma ${soma} de ${total}: sobram ${soma - total}.`
  return { soma, total, ok, semCandidatas, mensagem }
}

/** O que o formulário ainda impede (null quando dá para salvar). */
export function conferirFormulario(f: FormEdicao): string | null {
  const titulo = f.titulo.trim()
  if (titulo.length < 3 || titulo.length > 120) return 'O título precisa ter de 3 a 120 caracteres.'
  if (!Number.isInteger(f.total) || f.total < MIN_QUESTOES || f.total > MAX_QUESTOES) return `O número de questões vai de ${MIN_QUESTOES} a ${MAX_QUESTOES}.`
  if (!Number.isInteger(f.duracao) || f.duracao < 10 || f.duracao > 360) return 'A duração vai de 10 a 360 minutos.'
  if (!f.abre || !f.fecha || f.fecha.slice(0, 16) <= f.abre.slice(0, 16)) return 'O fechamento precisa vir depois da abertura.'
  if (f.tipo === 'vespera' && !slugVespera(f.slug)) return 'Dê um nome curto à prova da véspera (vira o código da edição).'
  if (f.tipo === 'vespera' && !/^\d{4}-\d{2}-\d{2}$/.test(f.dataProva)) return 'Escolha o dia da prova.'
  if (!f.config.provas.length) return 'Marque pelo menos uma prova.'
  return null
}

/** Os códigos da parte 32 em português do painel. */
const MENSAGENS: Record<string, string> = {
  nao_admin: 'Só administradores podem mexer no Simulado Nacional.',
  edicao_com_participantes: 'Esta edição já tem participantes: só dá para mudar título, descrição, destaque e estender o prazo.',
  edicao_invalida: 'Código de edição inválido ou edição não encontrada. A mensal é AAAA-MM; a véspera, AAAA-MM-vespera-nome.',
  itens_invalidos: 'A lista de questões não passou na conferência do banco (de 10 a 200 questões, sem repetir, com gabarito e ordem das alternativas válidos).',
  datas_invalidas: 'Datas recusadas: o fechamento precisa vir depois da abertura e, com a edição já aberta, só dá para estender o fechamento.',
  duracao_invalida: 'A duração vai de 10 a 360 minutos.',
  titulo_invalido: 'O título precisa ter de 3 a 120 caracteres.',
  config_invalida: 'A configuração do sorteio veio num formato que o banco não aceita.',
  autenticacao_necessaria: 'A sessão expirou. Entre de novo na conta.',
  rede: 'Sem resposta do servidor. Confira a conexão e tente de novo.',
}

/** A mensagem certa para uma falha de RPC do admin. */
export function mensagemDeFalha(falha: unknown): string {
  if (falha instanceof ErroRpc && falha.status === 404) return 'As funções do Simulado Nacional ainda não estão no banco: falta colar a parte 32 no Supabase.'
  const codigo = codigoErroSN(falha)
  return MENSAGENS[codigo] ?? 'O servidor recusou o pedido sem dizer o motivo. Tente de novo; se repetir, confira o registro do Supabase.'
}

export const mensagemDoCodigo = (codigo: string) => MENSAGENS[codigo] ?? null

export type StatusEdicao = 'rascunho' | 'agendada' | 'inscricoes' | 'no-ar' | 'encerrada'
export const ROTULO_STATUS: Record<StatusEdicao, string> = {
  rascunho: 'Rascunho', agendada: 'Agendada', inscricoes: 'Inscrições abertas', 'no-ar': 'No ar', encerrada: 'Encerrada',
}

/**
 * Em que pé está a edição. Publicada antes de abrir já aceita inscrição; "Agendada"
 * quando faltam mais de 7 dias (ainda sem a chamada na página inicial nem os lembretes),
 * "Inscrições abertas" na última semana antes de abrir.
 */
export function statusEdicao(e: Pick<EdicaoAdminSN, 'publicado' | 'abre_em' | 'fecha_em'>, agora = Date.now()): StatusEdicao {
  if (!e.publicado) return 'rascunho'
  if (agora > Date.parse(e.fecha_em)) return 'encerrada'
  if (agora >= Date.parse(e.abre_em)) return 'no-ar'
  return Date.parse(e.abre_em) - agora > 7 * 86_400_000 ? 'agendada' : 'inscricoes'
}

/** Dia do mês em Brasília. */
const diaEmBrasilia = (agora: Date) => new Date(agora.getTime() - 3 * 3_600_000).getUTCDate()

/** Do dia 25 em diante, o mês seguinte sem edição mensal publicada (para o aviso do topo), ou null. */
export function mensalAtrasada(edicoes: Array<Pick<EdicaoAdminSN, 'edicao' | 'tipo' | 'publicado'>>, agora = new Date()): string | null {
  if (diaEmBrasilia(agora) < 25) return null
  const proximo = somarMeses(edicaoDoMes(agora), 1)
  return edicoes.some((e) => e.tipo === 'mensal' && e.edicao === proximo && e.publicado) ? null : proximo
}

/** Questões já usadas: as de todas as edições publicadas, menos a que está sendo montada. */
export function idsUsados(edicoes: Array<Pick<EdicaoAdminSN, 'edicao' | 'publicado' | 'ids'>>, exceto: string | null): Set<string> {
  return new Set(edicoes.filter((e) => e.publicado && e.edicao !== exceto && ehEdicaoNova(e.edicao)).flatMap((e) => e.ids ?? []))
}

/** Os primeiros caracteres do enunciado, sem marcação. */
export function trechoEnunciado(texto: string | undefined, limite = 120): string {
  const limpo = (texto ?? '').replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim()
  return limpo.length > limite ? `${limpo.slice(0, limite - 1).trimEnd()}…` : limpo
}

/** Contagem por chave, na ordem pedida. */
export function contarPor<T>(itens: T[], chave: (i: T) => string): Array<[string, number]> {
  const mapa = new Map<string, number>()
  for (const i of itens) mapa.set(chave(i), (mapa.get(chave(i)) ?? 0) + 1)
  return [...mapa]
}

/** "25/10, sáb., 08:00" no horário de Brasília. */
export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

/** "sábado, 25 de outubro, às 8h" / "às 23h59": a frase de data da página. */
export function dataPorExtenso(iso: string): string {
  const d = new Date(Date.parse(iso) - 3 * 3_600_000)
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  const h = d.getUTCHours(), m = d.getUTCMinutes()
  return `${dias[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}, ${h === 0 && !m ? 'à 0h' : `às ${h}h${m ? dois(m) : ''}`}`
}

/**
 * Refaz os itens de uma edição salva a partir dos ids (na ordem salva) e da semente:
 * a ordem das alternativas depende só da semente e do id, então sai igual à gravada.
 * `faltando`: ids que não estão mais entre as candidatas (questão anulada depois, por exemplo).
 */
export function itensDaEdicao(candidatas: CandidataNacional[], ids: string[], semente: string): { itens: ItemSorteado[]; faltando: string[] } {
  const porId = new Map(candidatas.map((c) => [c.id, c]))
  const achadas = ids.map((id) => porId.get(id)).filter((c): c is CandidataNacional => !!c)
  const faltando = ids.filter((id) => !porId.has(id))
  if (!achadas.length) return { itens: [], faltando }
  const cotas = Object.fromEntries(contarPor(achadas, (c) => c.area))
  const sorteio = new Map(sortearEdicao(achadas, semente, { total: achadas.length, cotas }).map((i) => [i.id, i]))
  const itens = ids.flatMap((id, i) => { const item = sorteio.get(id); return item ? [{ ...item, ordem: i + 1 }] : [] })
  return { itens, faltando }
}

/** Os itens no formato de sn_admin_salvar (o gabarito novo o banco calcula). */
export function itensParaBanco(itens: ItemSorteado[]): ItemAdminSN[] {
  return itens.map((i) => ({ ordem: i.ordem, id_questao: i.id, area: i.area, foco: i.foco, gabarito_original: i.gabarito as LetraSN, permutacao: i.permutacao }))
}
