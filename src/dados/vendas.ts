import { MENSAL, PLANOS, PLANOS_PRECO_ANTIGO, real, type Plano } from './planos'
import contagem from './incidencia.json'
import { rotuloEtapa, rotuloProva, lerProvas } from '../conta/perfilEstudo'

/**
 * Contas e textos da página de vendas (16/10/2026), sem React, para poder testar
 * (fixtures/testar_pagina_vendas.mjs). Regras que valem aqui:
 *  - nada de citar o total de questões do acervo nem da contagem das provas:
 *    as estatísticas aparecem só em porcentagem e em posição no ranking;
 *  - nada de número inventado: o que não vem dos planos, da contagem das provas
 *    ou da própria conta da pessoa não aparece;
 *  - abaixo de 50% de acerto, nenhuma porcentagem (docs/emails/TOM.md).
 */

export type { Plano }
export const [PLANO_MENSAL, PLANO_SEMESTRAL, PLANO_ANUAL] = PLANOS

/** Os três planos com o preço desta pessoa: o antigo para quem já assinava antes do reajuste. */
export function planosDaPessoa(precoAntigo: boolean) {
  const [mensal, semestral, anual] = precoAntigo ? PLANOS_PRECO_ANTIGO : PLANOS
  return { mensal, semestral, anual, pipoca: [mensal, semestral, anual] as readonly Plano[] }
}

/** Da pipoca pequena para a grande: a grande é a que salta aos olhos. */
export const PLANOS_PIPOCA: readonly Plano[] = [PLANO_MENSAL, PLANO_SEMESTRAL, PLANO_ANUAL]
/** No celular, o destaque vem primeiro e os outros dois logo abaixo, lado a lado. */
export const PLANOS_CELULAR: readonly Plano[] = [PLANO_ANUAL, PLANO_SEMESTRAL, PLANO_MENSAL]

export const porMes = (p: Plano) => p.total / p.meses
export const porDia = (p: Plano) => p.total / (p.meses * 365 / 12)
/** Arredonda para cima ao centavo: o "por dia" nunca sai menor que o real. */
export const centavos = (v: number) => real(Math.ceil(v * 100) / 100)
export const semMoeda = (v: number) => real(v).replace('R$', '').trim()
export const numero = (n: number) => n.toLocaleString('pt-BR')
/** Quanto o plano economiza em relação a pagar o mensal pelo mesmo tempo. */
export const economia = (p: Plano) => Math.max(0, MENSAL * p.meses - p.total)
export const descontoPct = (p: Plano) => Math.round((1 - porMes(p) / MENSAL) * 100)
export const periodo = (p: Plano) => p.meses === 1 ? 'por mês' : p.meses === 6 ? 'a cada 6 meses' : 'por ano'
export const cobranca = (p: Plano) => p.meses === 1 ? 'cobrado todo mês' : `${real(p.total)} ${periodo(p)}, de uma vez`

/**
 * O "decoy": do semestral para o anual, quanto a mais se paga e quanto tempo a
 * mais se leva. Com os preços de hoje, R$ 149,40 a mais por 6 meses a mais.
 */
export function degrauAnual(semestral: Plano = PLANO_SEMESTRAL, anual: Plano = PLANO_ANUAL) {
  const diferenca = anual.total - semestral.total
  const mesesAMais = anual.meses - semestral.meses
  return { diferenca, mesesAMais, porMesAMais: diferenca / mesesAMais, texto: `Por ${real(diferenca)} a mais que o semestral, ${mesesAMais} meses a mais de estudo.` }
}

/** Selo de cada plano: só o anual leva selo, e ele diz uma verdade aritmética. */
export function seloPlano(p: Plano): string | null {
  return p.destaque ? 'Melhor custo-benefício' : null
}

/* ------------------------------------------------------------------------- */
/* Temas que mais caem: porcentagens da contagem das provas oficiais.         */
/* ------------------------------------------------------------------------- */

export interface AreaQueCai { id: string; nome: string; pct: number }
/** Áreas da que mais cai para a que menos cai, com a fatia de cada uma (em %). */
export const AREAS_QUE_CAEM: AreaQueCai[] = contagem.areas
  .filter((a) => typeof a.pct === 'number')
  .map((a) => ({ id: a.id, nome: a.nome, pct: a.pct as number }))
  .sort((x, y) => y.pct - x.pct)

/** Quanto as duas áreas que mais caem somam juntas, arredondado para baixo. */
export function fatiaDasDuasPrimeiras(): { nomes: [string, string]; pct: number } {
  const [a, b] = AREAS_QUE_CAEM
  return { nomes: [a.nome, b.nome], pct: Math.floor(a.pct + b.pct) }
}

/** Os assuntos que mais caem, só os nomes (o número fica para quem assina). */
export const ASSUNTOS_QUE_MAIS_CAEM: string[] = contagem.top.map((t) => t.nome)

/** Formata uma porcentagem da contagem ("20,9%"). */
export const pct = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

/* ------------------------------------------------------------------------- */
/* Personalização: o que a página sabe da pessoa logada.                      */
/* ------------------------------------------------------------------------- */

interface Registro { c: boolean | null }
export interface DadosPessoa {
  nome: string
  respondidas: number
  sequencia: number
  /** Acerto geral em %, só quando é 50% ou mais e há pelo menos 20 respostas corrigidas. */
  acerto: number | null
  /** Área com melhor acerto (60% ou mais, com pelo menos 15 respostas), sem número. */
  areaForte: string | null
  /** Primeira prova de interesse, pelo rótulo ("TEOT", "TARO"…). */
  prova: string | null
  etapa: string | null
  servico: string | null
}

const NOMES_AREAS: Record<string, string> = Object.fromEntries(contagem.areas.map((a) => [a.id, a.nome]))

/**
 * Junta o que a conta tem (metadados do cadastro, total de respostas do servidor)
 * com as respostas guardadas no aparelho, para o herói falar com a pessoa.
 */
export function dadosDaPessoa(meta: Record<string, unknown> | null | undefined, respondidasServidor: number | null | undefined, sequencia: number | null | undefined, locais: Record<string, Registro>): DadosPessoa {
  const m = meta ?? {}
  const nome = primeiroNome(m.nome)
  const lista = Object.entries(locais)
  const respondidas = Math.max(respondidasServidor ?? 0, lista.length)
  let certas = 0, corrigidas = 0
  const porArea: Record<string, [number, number]> = {}
  for (const [id, r] of lista) {
    if (r?.c === null || r?.c === undefined) continue
    corrigidas++
    if (r.c) certas++
    const area = id.replace(/-\d+$/, '')
    if (!NOMES_AREAS[area]) continue
    const par = (porArea[area] ??= [0, 0])
    par[1]++
    if (r.c) par[0]++
  }
  // Acerto só com 30 respostas corrigidas e 50% ou mais (regras de tato de docs/emails/TOM.md).
  const geral = corrigidas >= 30 ? Math.round((certas / corrigidas) * 100) : null
  const forte = Object.entries(porArea)
    .filter(([, [c, t]]) => t >= 15 && c / t >= 0.6)
    .sort((x, y) => y[1][0] / y[1][1] - x[1][0] / x[1][1] || y[1][1] - x[1][1])[0]
  const provas = lerProvas(m.provas_interesse)
  const situacao = String(m.situacao ?? '')
  const etapa = situacao ? rotuloEtapa(situacao, String(m.ano_residencia ?? '')) : null
  return {
    nome,
    respondidas,
    sequencia: sequencia ?? 0,
    acerto: geral !== null && geral >= 50 ? geral : null,
    areaForte: forte ? NOMES_AREAS[forte[0]] : null,
    prova: provas.length && provas[0] !== 'atualizacao' ? rotuloProva(provas[0]) : null,
    etapa: etapa && etapa !== 'Não informado' && !etapa.includes('não informado') ? etapa : null,
    servico: String(m.servico ?? '').trim() || null,
  }
}

/** O primeiro nome, como nas cartas (supabase/functions/_shared/cartas.ts): sem e-mail, número ou apelido estranho. */
export function primeiroNome(nome: unknown): string {
  const primeiro = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

/** Título do topo: com o nome e o que a pessoa já fez, ou a versão para quem chega. */
export function tituloHeroi(d: DadosPessoa | null): { linha1: string; linha2: string } {
  // Regra dos 10: abaixo de dez questões, nada de número, só "os primeiros passos".
  if (d?.nome && d.respondidas > 0 && d.respondidas < 10) return { linha1: `${d.nome}, você já deu os primeiros passos.`, linha2: 'Agora deixe o plano decidir os próximos.' }
  if (d?.nome && d.respondidas > 0) {
    return { linha1: `${d.nome}, você já respondeu ${numero(d.respondidas)} ${d.respondidas === 1 ? 'questão' : 'questões'}.`, linha2: 'Agora deixe o plano decidir a próxima.' }
  }
  if (d?.nome) return { linha1: `${d.nome}, a residência já ocupa o seu dia.`, linha2: 'O que estudar, deixe com a gente.' }
  return { linha1: 'A residência já ocupa o seu dia.', linha2: 'O que estudar, deixe com a gente.' }
}

/** "Minha assinatura" com o nome e o que a pessoa já fez (regra dos 10; sem nome, nada). */
export function saudacaoAssinante(d: DadosPessoa | null): string | null {
  if (!d?.nome) return null
  const feito = d.respondidas >= 10 ? ` Já são ${numero(d.respondidas)} questões feitas.` : ''
  return `${d.nome}, que bom ter você por aqui.${feito} O próximo dia de estudo já está pronto no cronograma.`
}

/** O elogio do topo, só com o que é verdade e bom de ouvir. */
export function elogioHeroi(d: DadosPessoa | null): string | null {
  if (!d || d.respondidas === 0) return null
  // No máximo duas observações aqui: o título já fala das questões (até três por tela, TOM.md).
  const partes: string[] = []
  if (d.sequencia >= 2) partes.push(`${d.sequencia} dias seguidos de estudo`)
  if (d.areaForte) partes.push(partes.length ? `com ${d.areaForte.toLocaleLowerCase('pt-BR')} como ponto forte` : `${d.areaForte} como ponto forte`)
  if (d.acerto !== null && partes.length < 2) partes.push(`${d.acerto}% de acerto`)
  if (!partes.length) return 'Dá para ver que você é de quem não desiste.'
  const lista = partes.length === 1 ? partes[0] : partes[1].startsWith('com ') ? `${partes[0]}, ${partes[1]}` : `${partes[0]} e ${partes[1]}`
  return `${lista[0].toUpperCase()}${lista.slice(1)}: dá para ver que você é de quem não desiste.`
}
