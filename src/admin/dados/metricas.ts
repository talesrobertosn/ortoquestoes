/**
 * Linguagem de dados do painel (reconstrução de 01/11/2026). Fonte única do que cada número quer dizer;
 * a versão por extenso está em docs/admin/METRICAS.md e as duas precisam concordar
 * (fixtures/testar_admin_metricas.mjs confere que toda métrica daqui aparece lá).
 *
 * Funções puras: nenhuma consulta, nenhum React. A tela só formata o que sai daqui.
 */
import type { DiaSerie } from '../../componentes/admin/estudoHoje'
import { cobrancas as cobrancasDe, meioDe, vigentesPorPessoa, type AssinaturaBase, type Cobranca, type CobrancaReal } from '../../componentes/admin/receita'

/**
 * Estado de qualidade de um número.
 * confirmado: registro persistido com fonte verificável (evento, cobrança gravada).
 * derivado: calculado de registros observados por fórmula explícita.
 * estimado: reconstruído por falta de registro histórico (renovação antiga do cartão, Pix sem valor gravado).
 * previsao: futuro, com hipótese; nunca soma ao recebido.
 * incompleto: veio, mas cobre só parte do período ou da base (hoje em andamento, lista truncada).
 * indisponivel: a consulta falhou, falta permissão ou o dado é parcial; nunca vira zero.
 */
export type Qualidade = 'confirmado' | 'derivado' | 'estimado' | 'previsao' | 'incompleto' | 'indisponivel'
export const ROTULO_QUALIDADE: Record<Qualidade, string> = {
  confirmado: 'Confirmado', derivado: 'Derivado', estimado: 'Reconstruído', previsao: 'Previsão', incompleto: 'Incompleto', indisponivel: 'Indisponível',
}

export type Unidade = 'pessoas' | 'eventos' | 'contas' | 'brl' | 'pct'
export interface DefinicaoMetrica {
  nome: string
  pergunta: string
  unidade: Unidade
  numerador: string
  denominador?: string
  janela: string
  fonte: string
  qualidade: Qualidade
  testes: string
  deduplicacao: string
  latencia: string
  comparavel: string
  /** Subir é bom (cadastros) ou ruim (falhas)? */
  bom: 'sobe' | 'desce'
}

const FUSO = 'Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento.'

export const METRICAS = {
  online: {
    nome: 'Online agora', pergunta: 'Quantas pessoas estão com o site aberto neste momento?', unidade: 'pessoas',
    numerador: 'Contas com sinal do aparelho (visto_em) nos últimos 5 minutos', janela: 'Últimos 5 minutos, refeito no painel a cada 10 s',
    fonte: 'listar_usuarios_admin (visto_em); resumo_admin.online_agora quando a lista não veio', qualidade: 'confirmado',
    testes: 'Incluídas (é presença, não estatística)', deduplicacao: 'Uma por conta', latencia: 'Até 5 min + a atualização do painel (5 min)',
    comparavel: 'Não: é um instante', bom: 'sobe',
  },
  estudaramDia: {
    nome: 'Pessoas estudando por dia', pergunta: 'Quantas pessoas respondem questões num dia típico do período?', unidade: 'pessoas',
    numerador: 'Soma, dia a dia, das contas que responderam ao menos 1 questão', denominador: 'Dias do período', janela: FUSO,
    fonte: 'serie_diaria_admin.ativos', qualidade: 'derivado', testes: 'Incluídas (a série é do servidor; poucas contas)',
    deduplicacao: 'Única por dia; a mesma pessoa conta uma vez em cada dia em que estudou (não é usuário único do período)',
    latencia: 'Cache do servidor de até 5 min', comparavel: 'Sim, com os N dias anteriores', bom: 'sobe',
  },
  questoes: {
    nome: 'Questões respondidas', pergunta: 'Quanto se estudou de questões no período?', unidade: 'eventos',
    numerador: 'Respostas registradas (tentativas válidas)', janela: FUSO, fonte: 'serie_diaria_admin.respostas', qualidade: 'confirmado',
    testes: 'Incluídas', deduplicacao: 'Cada resposta é um evento', latencia: 'Cache do servidor de até 5 min',
    comparavel: 'Sim, com os N dias anteriores', bom: 'sobe',
  },
  cadastros: {
    nome: 'Cadastros', pergunta: 'Quantas contas novas chegaram?', unidade: 'contas', numerador: 'Contas criadas (auth.users.created_at)',
    janela: FUSO, fonte: 'serie_diaria_admin.cadastros', qualidade: 'confirmado', testes: 'Incluídas (o servidor não separa)',
    deduplicacao: 'Uma por conta', latencia: 'Cache do servidor de até 5 min', comparavel: 'Sim, com os N dias anteriores', bom: 'sobe',
  },
  receitaConfirmada: {
    nome: 'Receita confirmada', pergunta: 'Quanto entrou de fato no período?', unidade: 'brl',
    numerador: 'Cobranças pagas gravadas no banco (Pix pelo valor confirmado; a última cobrança do cartão pelo valor contratado)',
    janela: FUSO, fonte: 'cobrancas_admin + listar_assinaturas_admin (receita.ts › cobrancas, estimada = false)', qualidade: 'confirmado',
    testes: 'Excluídas (contasTeste.ts)', deduplicacao: 'Por cobrança; reembolsadas fora',
    latencia: 'Até o webhook do Mercado Pago chegar', comparavel: 'Sim, com os N dias anteriores', bom: 'sobe',
  },
  receitaReconstruida: {
    nome: 'Receita reconstruída', pergunta: 'Quanto do período é inferido, por falta de registro?', unidade: 'brl',
    numerador: 'Renovações antigas do cartão e pagamentos sem cobrança gravada, pelo preço do plano', janela: FUSO,
    fonte: 'receita.ts › cobrancas (estimada = true)', qualidade: 'estimado', testes: 'Excluídas', deduplicacao: 'Por cobrança reconstruída',
    latencia: '—', comparavel: 'Só como ordem de grandeza; o extrato oficial é o do Mercado Pago', bom: 'sobe',
  },
  assinantes: {
    nome: 'Assinantes com acesso', pergunta: 'Quantas pessoas têm acesso pago agora?', unidade: 'pessoas',
    numerador: 'Pessoas com assinatura vigente (ativa, ou cancelada que ainda vale até o fim do período)', janela: 'Agora',
    fonte: 'listar_assinaturas_admin › vigentesPorPessoa', qualidade: 'derivado', testes: 'Excluídas',
    deduplicacao: 'Uma por pessoa (renovar o Pix antes do fim não conta duas vezes)', latencia: 'Atualização do painel',
    comparavel: 'Não: é um retrato de agora', bom: 'sobe',
  },
  novasAssinaturas: {
    nome: 'Primeiras assinaturas', pergunta: 'Quantas pessoas pagaram pela primeira vez no período?', unidade: 'pessoas',
    numerador: 'Cobranças classificadas como "nova" (primeira compra paga da pessoa)', janela: FUSO,
    fonte: 'receita.ts › cobrancas + classificarCobrancas', qualidade: 'derivado', testes: 'Excluídas',
    deduplicacao: 'Uma por pessoa', latencia: 'Até o webhook chegar', comparavel: 'Sim, com os N dias anteriores', bom: 'sobe',
  },
  falhasProcessador: {
    nome: 'Avisos do processador com falha', pergunta: 'Algum aviso do Mercado Pago não foi aplicado?', unidade: 'eventos',
    numerador: 'Avisos com status "erro" ainda não marcados como vistos', janela: 'Os 200 avisos mais recentes',
    fonte: 'listar_eventos_pagamento_admin + lidos (marcados no painel)', qualidade: 'confirmado', testes: 'Incluídas',
    deduplicacao: 'Por aviso', latencia: 'Imediata', comparavel: 'Não', bom: 'desce',
  },
  pendenciasConteudo: {
    nome: 'Pendências de conteúdo', pergunta: 'Quantos relatos e "não ajudou" esperam revisão?', unidade: 'eventos',
    numerador: 'Relatos em aberto + avaliações "não ajudou" com texto ainda não lidas', janela: 'Agora',
    fonte: 'contadores_admin (ou as listas de relatos e avaliações)', qualidade: 'confirmado', testes: 'Incluídas',
    deduplicacao: 'Por relato / avaliação', latencia: '1 min', comparavel: 'Não', bom: 'desce',
  },
  funil: {
    nome: 'Funil de ativação', pergunta: 'Em que etapa as contas deixam de avançar?', unidade: 'contas',
    numerador: 'Contas que alcançaram cada marco', denominador: 'Contas cadastradas (coorte de todas as contas, desde o começo)',
    janela: 'Desde o começo; marcos cumulativos (50 e 500 questões não são do mesmo dia)', fonte: 'funil_admin', qualidade: 'derivado',
    testes: 'Incluídas (o servidor não separa)', deduplicacao: 'Uma por conta em cada etapa', latencia: 'Cache do servidor de até 5 min',
    comparavel: 'Não por período (coorte única)', bom: 'sobe',
  },
} satisfies Record<string, DefinicaoMetrica>
export type IdMetrica = keyof typeof METRICAS

/* ───────────────────────── Períodos ───────────────────────── */

export interface Variacao { atual: number; anterior: number | null; delta: number | null; pct: number | null }
export function variacao(atual: number, anterior: number | null): Variacao {
  if (anterior === null) return { atual, anterior, delta: null, pct: null }
  const delta = atual - anterior
  return { atual, anterior, delta, pct: anterior > 0 ? Math.round((delta / anterior) * 100) : null }
}

export interface SeriePeriodo {
  /** Os N dias do período, do mais antigo ao mais novo (hoje incluso, ainda incompleto). */
  atual: DiaSerie[]
  /** Os N dias anteriores, alinhados dia a dia com `atual`; null se a série não cobre. */
  anterior: DiaSerie[] | null
  dias: number
}

/**
 * Corta uma série de 2N dias em "período atual" e "período anterior" do mesmo tamanho.
 * Hoje entra no período atual mesmo incompleto (a tela avisa); o anterior só existe se a série cobre os 2N dias.
 */
export function cortarPeriodos(serie: DiaSerie[] | null | undefined, dias: number): SeriePeriodo | null {
  if (!serie || serie.length === 0) return null
  const ordenada = [...serie].sort((a, b) => a.dia.localeCompare(b.dia)).map(d => ({ dia: String(d.dia).slice(0, 10), cadastros: Number(d.cadastros), ativos: Number(d.ativos), respostas: Number(d.respostas) }))
  const atual = ordenada.slice(-dias)
  const resto = ordenada.slice(0, -dias)
  const anterior = resto.length >= dias ? resto.slice(-dias) : null
  return { atual, anterior, dias }
}

const somar = (lista: DiaSerie[], campo: 'cadastros' | 'ativos' | 'respostas') => lista.reduce((s, d) => s + d[campo], 0)
const media = (lista: DiaSerie[], campo: 'cadastros' | 'ativos' | 'respostas') => lista.length ? somar(lista, campo) / lista.length : 0

/** Os números de estudo e aquisição do período, cada um com o período anterior. */
export function numerosDoPeriodo(p: SeriePeriodo) {
  const ant = p.anterior
  return {
    questoes: variacao(somar(p.atual, 'respostas'), ant ? somar(ant, 'respostas') : null),
    cadastros: variacao(somar(p.atual, 'cadastros'), ant ? somar(ant, 'cadastros') : null),
    // Média de pessoas por dia, com uma casa: 3,4 pessoas/dia. Comparação pela média, então hoje incompleto pesa pouco.
    estudaramDia: variacao(Math.round(media(p.atual, 'ativos') * 10) / 10, ant ? Math.round(media(ant, 'ativos') * 10) / 10 : null),
  }
}

/* ───────────────────────── Receita por qualidade ───────────────────────── */

export interface ReceitaPeriodo {
  confirmada: Variacao
  reconstruida: number
  /** Primeiras compras pagas no período (pessoas). */
  novas: Variacao
  renovacoes: number
  porMeio: { pix: number; cartao: number }
  porPlano: Array<{ plano: string; valor: number; quantidade: number }>
  /** Um ponto por dia do período: confirmado e reconstruído separados (nunca somados num número só). */
  porDia: Array<{ dia: string; confirmada: number; reconstruida: number }>
}

const DIA_SP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
export const diaDe = (d: Date | number | string) => DIA_SP.format(new Date(d))

/** Os N dias (YYYY-MM-DD, São Paulo) que terminam hoje, e os N antes deles. */
export function janelas(dias: number, agora = Date.now()) {
  const lista = (deslocamento: number) => Array.from({ length: dias }, (_, i) => diaDe(agora - (deslocamento + dias - 1 - i) * 86_400_000))
  return { atual: lista(0), anterior: lista(dias) }
}

/**
 * Receita do período separada por qualidade: confirmada (cobrança gravada) e reconstruída (inferida),
 * a partir das mesmas cobranças que Receita › Resultados usa. Contas de teste já devem vir de fora.
 */
export function receitaDoPeriodo(assinaturas: AssinaturaBase[], reais: CobrancaReal[] | null, dias: number, agora = Date.now()): ReceitaPeriodo {
  const todas: Cobranca[] = cobrancasDe(assinaturas, reais)
  const j = janelas(dias, agora)
  const atual = new Set(j.atual), anterior = new Set(j.anterior)
  const porDia = new Map(j.atual.map(d => [d, { dia: d, confirmada: 0, reconstruida: 0 }]))
  let conf = 0, confAnt = 0, rec = 0, novas = 0, novasAnt = 0, renov = 0
  const porMeio = { pix: 0, cartao: 0 }
  const planos = new Map<string, { valor: number; quantidade: number }>()
  for (const c of todas) {
    const dia = diaDe(c.em)
    if (atual.has(dia)) {
      const ponto = porDia.get(dia)!
      if (c.estimada) { rec += c.valor; ponto.reconstruida += c.valor } else { conf += c.valor; ponto.confirmada += c.valor }
      if (c.tipo === 'nova') novas++
      else renov++
      porMeio[c.meio] += c.valor
      const p = planos.get(c.plano) ?? { valor: 0, quantidade: 0 }
      p.valor += c.valor; p.quantidade++
      planos.set(c.plano, p)
    } else if (anterior.has(dia)) {
      if (!c.estimada) confAnt += c.valor
      if (c.tipo === 'nova') novasAnt++
    }
  }
  const redondo = (v: number) => Math.round(v * 100) / 100
  return {
    confirmada: variacao(redondo(conf), redondo(confAnt)),
    reconstruida: redondo(rec),
    novas: variacao(novas, novasAnt),
    renovacoes: renov,
    porMeio: { pix: redondo(porMeio.pix), cartao: redondo(porMeio.cartao) },
    porPlano: [...planos].map(([plano, v]) => ({ plano, valor: redondo(v.valor), quantidade: v.quantidade })).sort((a, b) => b.valor - a.valor),
    porDia: [...porDia.values()].map(p => ({ ...p, confirmada: redondo(p.confirmada), reconstruida: redondo(p.reconstruida) })),
  }
}

/* ───────────────────────── Fila de atenção ───────────────────────── */

export type Severidade = 'critica' | 'alta' | 'media' | 'oportunidade'
export type GrupoAtencao = 'tecnico' | 'receita' | 'conteudo' | 'acompanhamento'
export const ORDEM_SEVERIDADE: Record<Severidade, number> = { critica: 0, alta: 1, media: 2, oportunidade: 3 }
export const ROTULO_SEVERIDADE: Record<Severidade, string> = { critica: 'Crítico', alta: 'Alta', media: 'Média', oportunidade: 'Oportunidade' }
export const ROTULO_GRUPO: Record<GrupoAtencao, string> = { tecnico: 'Erros técnicos', receita: 'Receita', conteudo: 'Conteúdo', acompanhamento: 'Acompanhamento' }

export interface ItemAtencao {
  id: string
  severidade: Severidade
  grupo: GrupoAtencao
  titulo: string
  causa: string
  contagem: number
  /** ISO do evento mais recente ligado ao item (null quando a fonte não diz). */
  ultimoEm: string | null
  destino: { aba: string; filtro?: string; vista?: string }
  acao: string
}

export interface EntradaAtencao {
  eventos: Array<{ id: number; status_processamento: string; recebido_em: string }> | null
  lidosPagamento: Set<string>
  assinaturas: AssinaturaBase[] | null
  pendenciasConteudo: number | null
  novosParados: Array<{ ultima_atividade: string | null; criado_em: string }> | null
  /** Fontes que falharam (nome legível), para virar item técnico em vez de zero. */
  fontesIndisponiveis: string[]
  agora?: number
}

/** Singular ou plural pela contagem ("1 aviso", "3 avisos"). */
const pl = (n: number, um: string, varios: string) => n === 1 ? um : varios
const maisRecente = (datas: Array<string | null | undefined>) => (datas.filter(Boolean) as string[]).sort().slice(-1)[0] ?? null

/**
 * Tudo o que pede ação, com causa, contagem, último evento, destino e ação. Ordem: severidade, depois o mais
 * recente primeiro. Um item só entra com contagem > 0 (alerta sem pendência real não ocupa a fila).
 */
export function filaDeAtencao(e: EntradaAtencao): ItemAtencao[] {
  const agora = e.agora ?? Date.now()
  const itens: ItemAtencao[] = []
  for (const fonte of e.fontesIndisponiveis) {
    itens.push({ id: `fonte:${fonte}`, severidade: 'alta', grupo: 'tecnico', titulo: `fonte indisponível: ${fonte}`, causa: 'A consulta falhou ou ainda não existe no banco; os números dela aparecem como indisponíveis, não como zero.', contagem: 1, ultimoEm: null, destino: { aba: 'comando' }, acao: 'Tentar de novo' })
  }
  if (e.eventos) {
    const falhas = e.eventos.filter(ev => ev.status_processamento === 'erro' && !e.lidosPagamento.has(String(ev.id)))
    if (falhas.length) itens.push({ id: 'processador', severidade: 'critica', grupo: 'tecnico', titulo: pl(falhas.length, 'aviso do processador com falha', 'avisos do processador com falha'), causa: 'O Mercado Pago avisou uma mudança que o site não conseguiu aplicar; a assinatura da pessoa pode estar errada.', contagem: falhas.length, ultimoEm: maisRecente(falhas.map(f => f.recebido_em)), destino: { aba: 'pagamentos' }, acao: 'Ver e reprocessar' })
  }
  if (e.assinaturas) {
    const falha = e.assinaturas.filter(a => a.status === 'falha_pagamento')
    if (falha.length) itens.push({ id: 'falha-pagamento', severidade: 'alta', grupo: 'receita', titulo: pl(falha.length, 'assinatura com falha no pagamento', 'assinaturas com falha no pagamento'), causa: 'A cobrança do cartão foi recusada; a pessoa pode perder o acesso.', contagem: falha.length, ultimoEm: maisRecente(falha.map(a => a.ultima_atualizacao)), destino: { aba: 'assinaturas' }, acao: 'Abrir as assinaturas' })
    const tresDias = 3 * 86_400_000
    const vigentes = vigentesPorPessoa(e.assinaturas, agora)
    const pixVencendo = vigentes.filter(a => meioDe(a) === 'pix' && a.fim_periodo && new Date(a.fim_periodo).getTime() - agora <= tresDias && new Date(a.fim_periodo).getTime() > agora)
    if (pixVencendo.length) itens.push({ id: 'pix-vencendo', severidade: 'media', grupo: 'receita', titulo: pl(pixVencendo.length, 'Pix vencendo em até 3 dias', 'Pix vencendo em até 3 dias'), causa: 'O Pix não renova sozinho: sem um lembrete, o acesso termina no fim do período.', contagem: pixVencendo.length, ultimoEm: maisRecente(pixVencendo.map(a => a.fim_periodo)), destino: { aba: 'lembretes' }, acao: 'Ver a campanha Pix a vencer' })
    const pendentes = e.assinaturas.filter(a => a.status === 'pendente' && agora - new Date(a.criada_em ?? a.ultima_atualizacao ?? 0).getTime() < 7 * 86_400_000)
    if (pendentes.length) itens.push({ id: 'pix-pendente', severidade: 'oportunidade', grupo: 'receita', titulo: pl(pendentes.length, 'Pix gerado e ainda não pago', 'Pix gerados e ainda não pagos'), causa: 'A pessoa escolheu um plano na última semana e o pagamento não chegou.', contagem: pendentes.length, ultimoEm: maisRecente(pendentes.map(a => a.criada_em ?? a.ultima_atualizacao)), destino: { aba: 'assinaturas' }, acao: 'Ver quem são' })
  }
  if (e.pendenciasConteudo) itens.push({ id: 'conteudo', severidade: 'media', grupo: 'conteudo', titulo: pl(e.pendenciasConteudo, 'relato ou "não ajudou" para revisar', 'relatos e "não ajudou" para revisar'), causa: 'Alguém apontou um erro numa questão ou disse que o comentário não ajudou.', contagem: e.pendenciasConteudo, ultimoEm: null, destino: { aba: 'conteudo', vista: 'relatos' }, acao: 'Abrir a triagem' })
  if (e.novosParados?.length) itens.push({ id: 'novos-parados', severidade: 'oportunidade', grupo: 'acompanhamento', titulo: pl(e.novosParados.length, 'pessoa nova que parou', 'pessoas novas que pararam'), causa: 'Chegaram nas últimas semanas, fizeram menos de 10 questões e não estudam há 2 dias.', contagem: e.novosParados.length, ultimoEm: maisRecente(e.novosParados.map(u => u.ultima_atividade ?? u.criado_em)), destino: { aba: 'usuarios', filtro: 'novos_parados' }, acao: 'Ver e mandar um recado' })
  return itens.sort((a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade] || (b.ultimoEm ?? '').localeCompare(a.ultimoEm ?? ''))
}

/* ───────────────────────── Frase do estado ───────────────────────── */

/**
 * "Estado do Orto Questões" em uma frase, só com fatos medidos (nada de correlação virando conclusão).
 * Cada pedaço some quando a fonte dele não veio.
 */
export function fraseDoEstado(f: { online: number | null; estudaramHoje: number | null; questoes: Variacao | null; dias: number; criticos: number; pendentes: number }): string {
  const partes: string[] = []
  if (f.online !== null && f.estudaramHoje !== null) partes.push(`${f.online} ${f.online === 1 ? 'pessoa online' : 'pessoas online'} e ${f.estudaramHoje} ${f.estudaramHoje === 1 ? 'estudou' : 'estudaram'} hoje`)
  else if (f.online !== null) partes.push(`${f.online} ${f.online === 1 ? 'pessoa online' : 'pessoas online'}`)
  if (f.questoes?.pct !== null && f.questoes?.pct !== undefined) {
    const p = f.questoes.pct
    partes.push(p === 0 ? `questões respondidas estáveis nos últimos ${f.dias} dias` : `questões respondidas ${p > 0 ? 'subiram' : 'caíram'} ${Math.abs(p)}% nos últimos ${f.dias} dias`)
  }
  const inicio = partes.length ? partes.join('; ') + '.' : 'Ainda sem os números de hoje.'
  const fim = f.criticos ? ` ${f.criticos} ${f.criticos === 1 ? 'problema crítico pede' : 'problemas críticos pedem'} ação agora.`
    : f.pendentes ? ` Nada crítico; ${f.pendentes} ${f.pendentes === 1 ? 'item' : 'itens'} na fila de atenção.` : ' Nada pedindo atenção.'
  return inicio.charAt(0).toUpperCase() + inicio.slice(1) + fim
}
