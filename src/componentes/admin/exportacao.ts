import { real } from '../../dados/planos'
import { rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import type { LinhaUsuario } from './AdminUsuarios'
import type { EventoPagamento } from './pagamentos'
import { contaDeTeste } from './contasTeste'
import { acertoAposRevisao, acertoReal, porcentagem } from './formatos'
import { HORIZONTES, calcularFinanceiro, taxaPixSugerida } from './financeiro'
import { estudoDeHoje, diaSP, type DiaSerie } from './estudoHoje'
import { NOME_MES, aReceberNoPix, cobrancas, cobrancasReembolsadas, meioDe, mesAMes, type AssinaturaBase, type CobrancaReal } from './receita'
import { STATUS_EVENTO, TIPOS_EVENTO, SITUACAO_COBRANCA, proximaData, rotuloMeio, rotuloPlano, rotuloTipoCobranca, situacaoAssinatura } from './rotulos'
import { categoriaPessoa, ROTULOS_CATEGORIA, type SinalUsuario } from './sinais'

/**
 * "Exportar dados do painel" (15/10/2026): junta os números importantes do painel num documento
 * para o dono mandar a um assistente de análise. Formato principal em Markdown (tabelas por
 * seção, glossário e limitações); também JSON (os mesmos dados) e CSV (só as pessoas).
 * Tudo aqui é puro (sem rede nem tela): o componente AdminExportar busca as consultas, uma por
 * seção, e passa para cá o que veio e o que falhou. As contas do Financeiro são as da tela
 * (financeiro.ts e receita.ts), então os números batem.
 */

export interface ResumoPainel {
  online_agora: number; usuarios: number; novos_7d: number
  ativos_hoje: number; ativos_7d: number; ativos_30d: number
  respondidas_hoje: number; respondidas_7d: number; assinantes_vigentes: number
}
export interface Funil { cadastrados: number; confirmaram: number; responderam: number; passaram_50: number; passaram_500: number; assinaram: number }
export interface Coorte { semana: string; cadastros: number; estudaram_1a_semana: number; voltaram_2a_semana: number }
export interface ResumoIndicacoes { codigos: number; convidados: number; confirmados: number; confirmados_7d: number; dias_dados: number }
export interface AssinaturaExportada extends AssinaturaBase {
  usuario?: string | null; nome?: string | null; ultima_atualizacao: string; proxima_cobranca?: string | null
}

/** O que as consultas trouxeram; `undefined`/null = a seção não veio (ver `falhas`). */
export interface DadosPainel {
  geradoEm: Date
  resumo?: ResumoPainel | null
  usuarios?: LinhaUsuario[] | null
  sinais?: SinalUsuario[] | null
  serie?: DiaSerie[] | null
  funil?: Funil | null
  retencao?: Coorte[] | null
  indicacoes?: ResumoIndicacoes | null
  assinaturas?: AssinaturaExportada[] | null
  cobrancasReais?: CobrancaReal[] | null
  eventos?: EventoPagamento[] | null
  /** Seção → motivo da falha (as outras seções saem normalmente). */
  falhas: Record<string, string>
}

export interface OpcoesExportacao {
  /** Marcado por padrão: nenhuma coluna de e-mail sai no arquivo. */
  ocultarEmails: boolean
  /** Troca nomes por "Pessoa 001"… (na ordem de cadastro); também oculta os e-mails. */
  pseudonimizar: boolean
}

export interface Exportacao { markdown: string; json: string; csvPessoas: string; nomeBase: string }

/** Nomes das seções para o progresso e os avisos de falha. */
export const SECOES_EXPORTACAO = {
  resumo: 'Resumo do painel', usuarios: 'Pessoas', sinais: 'Planos vistos e flashcards', serie: 'Questões e cadastros por dia',
  funil: 'Funil', retencao: 'Retenção', indicacoes: 'Indicações', assinaturas: 'Assinaturas', cobrancas: 'Pagamentos gravados',
  eventos: 'Avisos de pagamento',
} as const
export type SecaoExportacao = keyof typeof SECOES_EXPORTACAO

const FUSO = 'America/Sao_Paulo'
const dataBR = (v: string | Date | null | undefined) => v ? new Date(v).toLocaleDateString('pt-BR', { timeZone: FUSO }) : ''
const dataHoraBR = (v: string | Date) => new Date(v).toLocaleString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const n = (v: number | null | undefined) => v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR')
const pct = (v: number | null | undefined) => v === null || v === undefined ? '—' : `${v}%`
const dinheiro = (v: number) => real(v).replace(/ /g, ' ')
/** Célula de tabela Markdown: sem quebra de linha nem barra vertical solta. */
const celula = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v)).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|')
export function tabela(cabecalho: string[], linhas: unknown[][]): string {
  if (linhas.length === 0) return '_Nada a listar._'
  return [`| ${cabecalho.map(celula).join(' | ')} |`, `| ${cabecalho.map(() => '---').join(' | ')} |`, ...linhas.map(l => `| ${l.map(celula).join(' | ')} |`)].join('\n')
}
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

/** CSV com ";" (planilha em português), BOM e fórmulas neutralizadas, como o resto do painel. */
export function textoCsv(cabecalho: string[], linhas: Array<Array<string | number | null | undefined>>) {
  const c = (v: string | number | null | undefined) => {
    const texto = v === null || v === undefined ? '' : String(v)
    const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto
    return /[;"\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
  }
  return '﻿' + [cabecalho, ...linhas].map(l => l.map(c).join(';')).join('\r\n')
}

/**
 * Quem é quem no arquivo: nome real ou "Pessoa 001" (ordem de cadastro, a mesma em todas as
 * seções), e o e-mail só quando permitido.
 */
export function identificador(dados: Pick<DadosPainel, 'usuarios' | 'assinaturas' | 'eventos'>, op: OpcoesExportacao) {
  const semEmail = op.ocultarEmails || op.pseudonimizar
  const numeros = new Map<string, number>()
  const ordem = [...(dados.usuarios ?? [])].sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime() || a.id_usuario.localeCompare(b.id_usuario))
  for (const u of ordem) numeros.set(u.id_usuario, numeros.size + 1)
  const conhecidos = new Map<string, { nome: string | null; email: string | null }>()
  for (const u of dados.usuarios ?? []) conhecidos.set(u.id_usuario, { nome: u.nome, email: u.email })
  for (const a of dados.assinaturas ?? []) if (!conhecidos.has(a.id_usuario)) conhecidos.set(a.id_usuario, { nome: a.nome ?? null, email: a.usuario ?? null })
  const largura = Math.max(3, String(conhecidos.size + 10).length)
  return {
    nome(id: string | null | undefined): string {
      if (!id) return 'Sem conta ligada'
      if (op.pseudonimizar) {
        if (!numeros.has(id)) numeros.set(id, numeros.size + 1)
        return `Pessoa ${String(numeros.get(id)).padStart(largura, '0')}`
      }
      const c = conhecidos.get(id)
      return c?.nome || (semEmail ? 'Sem nome' : c?.email) || 'Sem nome'
    },
    email(id: string | null | undefined): string | null {
      return semEmail || !id ? null : conhecidos.get(id)?.email ?? null
    },
    semEmail,
  }
}

const FORMATO_HORA = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
function semanaDe(instante: string) {
  const p = Object.fromEntries(FORMATO_HORA.formatToParts(new Date(instante)).map(x => [x.type, x.value]))
  const d = new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`)
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10)
}
function contar<T>(lista: T[], chave: (x: T) => string[]): Array<[string, number]> {
  const m = new Map<string, number>()
  for (const x of lista) for (const k of chave(x)) m.set(k, (m.get(k) ?? 0) + 1)
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

/** Linhas da tabela de pessoas (Markdown e CSV usam as mesmas colunas). */
function pessoas(dados: DadosPainel, id: ReturnType<typeof identificador>, agora: number) {
  const sinais = new Map((dados.sinais ?? []).map(s => [s.id_usuario, s]))
  const ultimaAssinatura = new Map<string, AssinaturaExportada>()
  for (const a of dados.assinaturas ?? []) {
    const atual = ultimaAssinatura.get(a.id_usuario)
    if (!atual || new Date(a.ultima_atualizacao).getTime() > new Date(atual.ultima_atualizacao).getTime()) ultimaAssinatura.set(a.id_usuario, a)
  }
  const cabecalho = ['Pessoa', ...(id.semEmail ? [] : ['E-mail']), 'Cadastro', 'Etapa', 'Serviço', 'UF', 'Provas de interesse', 'Plano / situação', 'Grupo',
    'Última atividade', 'Questões (total)', 'Na semana', 'Hoje', 'Acerto real 1ª tentativa (%)', 'Acerto após revisão (%)',
    'Flashcards únicos', 'Flashcards na semana', 'Viu os planos (30 dias)', 'Última vez nos planos', 'Conta de teste']
  const ordem = [...(dados.usuarios ?? [])].sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
  const linhas = ordem.map(u => {
    const s = sinais.get(u.id_usuario)
    const a = ultimaAssinatura.get(u.id_usuario)
    const plano = u.plano_vigente ? `Assinante ${rotuloPlano(u.plano_vigente)}` : a ? `${rotuloPlano(a.plano)} · ${situacaoAssinatura(a, agora).rotulo}` : 'Grátis (nunca assinou)'
    return [
      id.nome(u.id_usuario), ...(id.semEmail ? [] : [u.email ?? '']), dataBR(u.criado_em),
      u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : '', u.servico ?? '', u.uf ?? '',
      (u.provas ?? '').split(',').filter(Boolean).map(rotuloProva).join(', '), plano,
      ROTULOS_CATEGORIA[categoriaPessoa(u, s, agora)],
      u.ultima_atividade ? dataBR(u.ultima_atividade) : '', u.respondidas, u.respondidas_7d, u.respondidas_hoje ?? '',
      acertoReal(u) ?? '', acertoAposRevisao(u) ?? '',
      s?.flashcards_unicos ?? '', s?.flashcards_7d ?? '', s?.planos_vezes || '', s?.planos_ultima ? dataBR(s.planos_ultima) : '',
      contaDeTeste({ nome: u.nome, usuario: u.email }) ? 'sim' : '',
    ]
  })
  return { cabecalho, linhas }
}

/** Monta os três arquivos. `agora` só para testes. */
export function montarExportacao(dados: DadosPainel, op: OpcoesExportacao, agora = dados.geradoEm.getTime()): Exportacao {
  const id = identificador(dados, op)
  const hojeDia = diaSP(agora)
  const md: string[] = []
  const json: Record<string, unknown> = {}
  const falhou = (s: SecaoExportacao) => dados.falhas[s] ? `_Esta seção não veio: ${dados.falhas[s]}_` : null

  // Contas de teste do dono ficam fora dos números (como no painel); continuam marcadas nas listas.
  const usuariosReais = (dados.usuarios ?? []).filter(u => !contaDeTeste({ nome: u.nome, usuario: u.email }))
  const assinaturasReais = (dados.assinaturas ?? []).filter(a => !contaDeTeste(a))
  const testes = (dados.assinaturas?.length ?? 0) - assinaturasReais.length

  md.push('# Orto Questões · dados do painel do administrador', '')
  md.push(`- **Gerado em:** ${dataHoraBR(dados.geradoEm)} (horário de São Paulo)`)
  md.push(`- **Período:** contas, assinaturas e pagamentos desde o início; questões e cadastros por dia nos últimos ${dados.serie?.length ?? 0} dias; mês a mês nos últimos 12 meses.`)
  md.push(`- **Privacidade:** ${op.pseudonimizar ? 'nomes trocados por "Pessoa 001"… (a mesma pessoa tem o mesmo número em todo o arquivo)' : 'nomes reais'}; ${id.semEmail ? 'e-mails ocultos' : 'e-mails incluídos'}.`)
  md.push('', '> Este arquivo contém dados pessoais de quem usa o site. Guarde com cuidado, não publique e apague quando terminar a análise.', '')
  const listaFalhas = Object.entries(dados.falhas)
  if (listaFalhas.length) {
    md.push('**Seções que não vieram** (o resto do arquivo está completo):', '')
    for (const [s, motivo] of listaFalhas) md.push(`- ${SECOES_EXPORTACAO[s as SecaoExportacao] ?? s}: ${motivo}`)
    md.push('')
  }
  json.gerado_em = dados.geradoEm.toISOString()
  json.privacidade = { emails_ocultos: id.semEmail, nomes_pseudonimizados: op.pseudonimizar }
  json.falhas = dados.falhas

  // ---------- 1. Resumo rápido ----------
  const r = dados.resumo
  const estudo = estudoDeHoje({ serie: dados.serie, usuarios: dados.usuarios, sinais: dados.sinais, agora })
  const todas = cobrancas(assinaturasReais, dados.cobrancasReais)
  const fin = calcularFinanceiro(assinaturasReais, todas, new Date(agora))
  const meses = mesAMes(assinaturasReais, 12, new Date(agora), dados.cobrancasReais)
  md.push('## 1. Resumo rápido', '')
  md.push(tabela(['Métrica', 'Valor'], [
    ['Contas cadastradas', n(r?.usuarios ?? dados.usuarios?.length)],
    ['Contas novas nos últimos 7 dias', n(r?.novos_7d)],
    ['Online agora (últimos 3 min)', n(r?.online_agora)],
    ['Pessoas que estudaram hoje (questões ou flashcards)', n(estudo.estudaram)],
    ['Fizeram questões hoje / ontem', estudo.pessoasQuestoes ? `${n(estudo.pessoasQuestoes.hoje)} / ${n(estudo.pessoasQuestoes.ontem)}` : '—'],
    ['Questões respondidas hoje / ontem', estudo.questoes ? `${n(estudo.questoes.hoje)} / ${n(estudo.questoes.ontem)}` : '—'],
    ['Usaram flashcards hoje', n(estudo.flashcards)],
    ['Ativos na semana (7 dias) / no mês (30 dias)', r ? `${n(r.ativos_7d)} / ${n(r.ativos_30d)}` : '—'],
    ['Questões respondidas nos últimos 7 dias', n(r?.respondidas_7d)],
    ['Assinantes com acesso agora', n(fin.comAcesso)],
    [`Receita de ${NOME_MES(fin.chaveMes)}`, dinheiro(fin.esteMes)],
    [`Receita de ${NOME_MES(fin.chaveMesPassado)}`, dinheiro(fin.mesPassado)],
    ['Receita recorrente por mês (cartões que renovam)', dinheiro(fin.mrr)],
    ['Total recebido desde o começo', dinheiro(fin.total)],
  ]), '')
  json.resumo = { painel: r ?? null, estudo_de_hoje: estudo }

  // ---------- 2. Atividade ----------
  md.push('## 2. Atividade', '')
  md.push('### Ativos na semana e no mês', '')
  const ativosLista = (dias: number) => usuariosReais.filter(u => u.ultima_atividade && agora - new Date(u.ultima_atividade).getTime() <= dias * 86_400_000).length
  md.push(tabela(['Janela', 'Pessoas ativas (resumo do painel)', 'Pessoas com atividade (lista, sem contas de teste)'], [
    ['Hoje', n(r?.ativos_hoje), n(usuariosReais.filter(u => u.ultima_atividade && diaSP(u.ultima_atividade) === hojeDia).length)],
    ['7 dias', n(r?.ativos_7d), dados.usuarios ? n(ativosLista(7)) : '—'],
    ['30 dias', n(r?.ativos_30d), dados.usuarios ? n(ativosLista(30)) : '—'],
  ]), '')
  md.push('### Questões e cadastros por dia', '')
  md.push(falhou('serie') ?? tabela(['Dia', 'Questões respondidas', 'Pessoas que fizeram questões', 'Cadastros novos'],
    [...(dados.serie ?? [])].reverse().map(d => [`${ddmm(String(d.dia))}/${String(d.dia).slice(0, 4)}`, n(Number(d.respostas)), n(Number(d.ativos)), n(Number(d.cadastros))])), '')
  json.atividade = { serie_diaria: dados.serie ?? null }

  // ---------- 3. Crescimento ----------
  md.push('## 3. Crescimento', '')
  md.push('### Funil', '')
  const f = dados.funil
  md.push(falhou('funil') ?? (f ? tabela(['Etapa', 'Pessoas', 'Em relação à etapa anterior'], [
    ['Cadastraram', n(f.cadastrados), ''],
    ['Confirmaram o e-mail', n(f.confirmaram), pct(porcentagem(f.confirmaram, f.cadastrados))],
    ['Responderam a 1ª questão', n(f.responderam), pct(porcentagem(f.responderam, f.confirmaram))],
    ['Passaram de 50 questões', n(f.passaram_50), pct(porcentagem(f.passaram_50, f.responderam))],
    ['Passaram de 500 questões', n(f.passaram_500), pct(porcentagem(f.passaram_500, f.passaram_50))],
    ['Assinaram', n(f.assinaram), `${pct(porcentagem(f.assinaram, f.responderam))} de quem estudou`],
  ]) : '_Sem dados._'), '')
  md.push('### Retenção por semana de cadastro', '')
  md.push(falhou('retencao') ?? tabela(['Semana (segunda)', 'Cadastros', 'Estudaram na 1ª semana', 'Voltaram na 2ª semana'],
    (dados.retencao ?? []).map(c => [ddmm(String(c.semana)), n(Number(c.cadastros)),
      `${n(Number(c.estudaram_1a_semana))} (${pct(porcentagem(Number(c.estudaram_1a_semana), Number(c.cadastros)) ?? 0)})`,
      `${n(Number(c.voltaram_2a_semana))} (${pct(porcentagem(Number(c.voltaram_2a_semana), Number(c.cadastros)) ?? 0)})`])), '')
  if (dados.usuarios) {
    const porSemana = contar(usuariosReais, u => [semanaDe(u.criado_em)]).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
    const porMes = contar(usuariosReais, u => [diaSP(u.criado_em).slice(0, 7)]).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
    md.push('### Cadastros por semana (últimas 12 com cadastro)', '', tabela(['Semana (segunda)', 'Cadastros'], porSemana.map(([k, v]) => [`${ddmm(k)}/${k.slice(0, 4)}`, n(v)])), '')
    md.push('### Cadastros por mês', '', tabela(['Mês', 'Cadastros'], porMes.map(([k, v]) => [NOME_MES(k), n(v)])), '')
    const etapas = contar(usuariosReais, u => [u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : 'Não informado'])
    const provas = contar(usuariosReais, u => { const p = (u.provas ?? '').split(',').filter(Boolean); return p.length ? p.map(rotuloProva) : ['Não informado'] })
    const ufs = contar(usuariosReais, u => [u.uf || 'Não informado'])
    const origens = contar(usuariosReais, u => [u.origem?.fonte || 'Sem origem registrada'])
    const total = usuariosReais.length || 1
    const comPct = (l: Array<[string, number]>) => l.map(([k, v]) => [k, n(v), pct(porcentagem(v, total))])
    md.push('### Perfis', '')
    md.push('**Por etapa**', '', tabela(['Etapa', 'Pessoas', '% das contas'], comPct(etapas)), '')
    md.push('**Por prova de interesse** (uma pessoa pode marcar várias)', '', tabela(['Prova', 'Pessoas', '% das contas'], comPct(provas)), '')
    md.push('**Por estado**', '', tabela(['UF', 'Pessoas', '% das contas'], comPct(ufs)), '')
    md.push('**Origem do cadastro**', '', tabela(['Fonte', 'Pessoas', '% das contas'], comPct(origens)), '')
    json.crescimento_perfis = { cadastros_por_semana: porSemana, cadastros_por_mes: porMes, etapas, provas, ufs, origens }
  }
  md.push('### Indicações', '')
  const ind = dados.indicacoes
  md.push(falhou('indicacoes') ?? (ind ? tabela(['Métrica', 'Valor'], [
    ['Códigos criados', n(ind.codigos)], ['Convidados', n(ind.convidados)], ['Confirmados (20 questões)', n(ind.confirmados)],
    ['Confirmados nos últimos 7 dias', n(ind.confirmados_7d)], ['Dias de acesso dados', n(ind.dias_dados)],
  ]) : '_Sem dados._'), '')
  json.crescimento = { funil: f ?? null, retencao: dados.retencao ?? null, indicacoes: ind ?? null }

  // ---------- 4. Receita ----------
  md.push('## 4. Receita e financeiro', '')
  if (testes > 0) md.push(`_${testes} assinatura(s) de teste do dono ficam fora de todos os números (aparecem marcadas na lista de assinaturas)._`, '')
  if (dados.falhas.cobrancas) md.push(`_Pagamentos gravados no banco não vieram (${dados.falhas.cobrancas}); os valores abaixo são estimados pelo preço dos planos._`, '')
  if (dados.falhas.assinaturas) md.push(falhou('assinaturas')!, '')
  const { taxa: taxaPix, observado } = taxaPixSugerida(assinaturasReais, new Date(agora))
  const pix = HORIZONTES.map(m => ({ meses: m, ...aReceberNoPix(assinaturasReais, m, taxaPix, new Date(agora)) }))
  const conversao = r?.usuarios ? porcentagem(fin.pagantes, r.usuarios) : null
  md.push('### Resumo', '')
  md.push(tabela(['Métrica', 'Valor'], [
    [`Receita de ${NOME_MES(fin.chaveMes)} (até agora)`, dinheiro(fin.esteMes)],
    [`Receita de ${NOME_MES(fin.chaveMesPassado)}`, dinheiro(fin.mesPassado)],
    ['Total recebido desde o começo', `${dinheiro(fin.total)}${fin.primeira ? ` (desde ${dataBR(fin.primeira)})` : ''}`],
    ['Média por mês', dinheiro(fin.mediaMensal)],
    ['Ticket médio por pagamento', dinheiro(fin.ticket)],
    ['Recebido por pessoa que pagou', dinheiro(fin.porPagante)],
    ['Pessoas que já pagaram', n(fin.pagantes)],
    ['Conversão (já pagaram ÷ contas)', pct(conversao)],
    ['Recebido no cartão / no Pix', `${dinheiro(fin.receitaCartao)} / ${dinheiro(fin.receitaPix)}`],
    ['Renovações automáticas do cartão (desde o começo)', `${n(fin.renovacoes)} · ${dinheiro(fin.receitaRenovacoes)}`],
    ['Cancelamento acumulado no cartão', fin.pagasCartao ? `${pct(porcentagem(fin.cancelaram, fin.pagasCartao))} (${fin.cancelaram} de ${fin.pagasCartao})` : '—'],
    ['Reembolsos (desde o começo)', n(fin.reembolsos)],
  ]), '')
  md.push('**Por plano (desde o começo)**', '', tabela(['Plano', 'Recebido', 'Pagamentos', '% do total'], fin.receitaPorPlano.map(p => [p.nome, dinheiro(p.valor), n(p.cobrancas), pct(porcentagem(p.valor, fin.total))])), '')
  md.push('### Assinantes agora', '')
  md.push(tabela(['Métrica', 'Valor'], [
    ['Com acesso pago', n(fin.comAcesso)], ['No cartão que renova sozinho', n(fin.renovamAgora)], ['No Pix (não renova)', n(fin.pixComAcesso)],
    ['Cartão cancelado ainda com acesso', n(fin.cartaoSemRenovar)],
    ['Renovações de cartão nos próximos 30 dias', `${n(fin.renovacoes30)} · ${dinheiro(fin.valorRenovacoes30)}`],
    ['Pix que vencem nos próximos 30 dias', n(fin.pixAcabando30)],
  ]), '')
  md.push(tabela(['Plano', 'Com acesso', 'Renovam no cartão', 'No Pix', 'Cartão cancelado com acesso', 'Receita recorrente por mês'],
    fin.porPlano.map(p => [p.nome, n(p.vigentes), n(p.renovam), n(p.pix), n(p.cartaoSemRenovar), dinheiro(p.mensal)])), '')
  md.push('### Previsão', '')
  md.push(`Receita recorrente por mês: **${dinheiro(fin.mrr)}** (${fin.recorrentes.length} cartão(ões) renovando; ${dinheiro(fin.valorRecorrente)} por ciclo). Pix estimado com ${Math.round(taxaPix * 100)}% de recompra${observado.encerrados ? ` (observado: ${observado.renovados} de ${observado.encerrados} Pix encerrados renovaram)` : ' (ainda sem Pix encerrado para medir; suposição de 60%)'}.`, '')
  md.push(tabela(['Horizonte', 'Cartão (se ninguém cancelar)', 'Renovações no cartão', 'Pix (estimado)', 'Recompras de Pix (estimadas)', 'Total'],
    fin.aReceber.map((x, i) => [x.meses === 1 ? 'Próximo mês' : `Próximos ${x.meses} meses`, dinheiro(x.valor), n(x.cobrancas), dinheiro(pix[i].valor), (Math.round(pix[i].renovacoes * 10) / 10).toLocaleString('pt-BR'), dinheiro(x.valor + pix[i].valor)])), '')
  md.push('### Mês a mês (últimos 12 meses)', '')
  md.push(tabela(['Mês', 'Receita', 'Novas no cartão', 'Novas no Pix', 'Renovações', 'Receita de renovações', 'Cancelamentos', 'Reembolsos', 'Valor reembolsado', 'Pix encerrados', 'Cartões ativos no fim do mês'],
    [...meses].reverse().map(m => [NOME_MES(m.chave), dinheiro(m.receita), n(m.novasCartao), n(m.novasPix), n(m.renovacoes), dinheiro(m.receitaRenovacoes), n(m.cancelamentos), n(m.reembolsos), dinheiro(m.valorReembolsado), n(m.pixEncerrados), n(m.baseCartao)])), '')

  const assinaturasLinhas = [...(dados.assinaturas ?? [])]
    .sort((a, b) => new Date(b.criada_em ?? b.inicio_periodo ?? b.ultima_atualizacao).getTime() - new Date(a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao).getTime())
    .map(a => { const p = proximaData(a, agora); return {
      pessoa: id.nome(a.id_usuario), email: id.email(a.id_usuario), plano: rotuloPlano(a.plano), meio: rotuloMeio(meioDe(a)), situacao: situacaoAssinatura(a, agora).rotulo,
      desde: dataBR(a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao), ultima_cobranca: dataBR(a.ultima_cobranca_em), data: p.valor ? `${p.rotulo}: ${dataBR(p.valor)}` : '', teste: contaDeTeste(a),
    } })
  md.push(`### Assinaturas (${assinaturasLinhas.length})`, '')
  md.push(falhou('assinaturas') ?? tabela(['Pessoa', ...(id.semEmail ? [] : ['E-mail']), 'Plano', 'Meio', 'Situação', 'Desde', 'Última cobrança paga', 'Próxima data', 'Teste'],
    assinaturasLinhas.map(a => [a.pessoa, ...(id.semEmail ? [] : [a.email ?? '']), a.plano, a.meio, a.situacao, a.desde, a.ultima_cobranca, a.data, a.teste ? 'sim' : ''])), '')

  const pagos = [
    ...todas.map(c => ({ c, situacao: c.estimada ? 'estimada' as const : 'paga' as const, reembolsadaEm: null as Date | null })),
    ...cobrancasReembolsadas(assinaturasReais, dados.cobrancasReais).map(c => ({ c, situacao: 'reembolsada' as const, reembolsadaEm: c.reembolsadaEm })),
  ].sort((x, y) => y.c.em.getTime() - x.c.em.getTime())
  const pagamentosLinhas = pagos.map(({ c, situacao, reembolsadaEm }) => ({
    data: dataBR(c.em), pessoa: id.nome(c.id_usuario), plano: rotuloPlano(c.plano), meio: rotuloMeio(c.meio), tipo: rotuloTipoCobranca(c),
    valor: Math.round(c.valor * 100) / 100, situacao: SITUACAO_COBRANCA[situacao], reembolsada_em: reembolsadaEm ? dataBR(reembolsadaEm) : '',
  }))
  const somaPagos = pagos.filter(p => p.situacao !== 'reembolsada').reduce((s, p) => s + p.c.valor, 0)
  md.push(`### Pagamentos recebidos (${pagamentosLinhas.length}, do mais novo ao mais antigo)`, '')
  md.push(`Total que entrou: **${dinheiro(somaPagos)}** (reembolsados aparecem na lista e não somam).`, '')
  md.push(tabela(['Data', 'Pessoa', 'Plano', 'Meio', 'Tipo', 'Valor bruto', 'Situação', 'Reembolsado em'],
    pagamentosLinhas.map(p => [p.data, p.pessoa, p.plano, p.meio, p.tipo, dinheiro(p.valor), p.situacao, p.reembolsada_em])), '')

  md.push('### Avisos de pagamento', '')
  const eventos = dados.eventos ?? []
  md.push(falhou('eventos') ?? tabela(['Situação', 'Avisos'], Object.entries(STATUS_EVENTO).map(([k, v]) => [v, n(eventos.filter(e => e.status_processamento === k).length)])), '')
  const comErro = eventos.filter(e => e.status_processamento === 'erro').slice(0, 20)
  if (comErro.length) md.push('**Avisos que precisam de atenção (até 20)**', '', tabela(['Recebido em', 'Tipo', 'Pessoa', 'Erro'], comErro.map(e => [dataHoraBR(e.recebido_em), TIPOS_EVENTO[e.tipo ?? ''] ?? e.tipo, e.id_usuario ? id.nome(e.id_usuario) : '—', e.erro])), '')

  json.financeiro = {
    resumo: {
      mes: fin.chaveMes, receita_mes: fin.esteMes, receita_mes_passado: fin.mesPassado, total: fin.total, media_mensal: fin.mediaMensal,
      ticket_medio: fin.ticket, por_pagante: fin.porPagante, pagantes: fin.pagantes, conversao_pct: conversao,
      receita_cartao: fin.receitaCartao, receita_pix: fin.receitaPix, receita_recorrente_mensal: fin.mrr, valor_recorrente_ciclo: fin.valorRecorrente,
      cartoes_renovando: fin.recorrentes.length, com_acesso: fin.comAcesso, renovam_agora: fin.renovamAgora, pix_com_acesso: fin.pixComAcesso,
      cartao_cancelado_com_acesso: fin.cartaoSemRenovar, renovacoes_30d: fin.renovacoes30, valor_renovacoes_30d: fin.valorRenovacoes30,
      pix_vencem_30d: fin.pixAcabando30, cancelaram_cartao: fin.cancelaram, pagas_cartao: fin.pagasCartao, reembolsos: fin.reembolsos,
      por_plano_recebido: fin.receitaPorPlano, base_por_plano: fin.porPlano.map(p => ({ plano: p.nome, com_acesso: p.vigentes, renovam: p.renovam, pix: p.pix, cartao_cancelado_com_acesso: p.cartaoSemRenovar, recorrente_mensal: p.mensal })),
      assinaturas_de_teste_fora: testes,
    },
    previsao: { taxa_recompra_pix: taxaPix, pix_observado: observado, horizontes: fin.aReceber.map((x, i) => ({ meses: x.meses, cartao: x.valor, renovacoes_cartao: x.cobrancas, pix_estimado: pix[i].valor, recompras_pix: pix[i].renovacoes })) },
    mes_a_mes: meses,
    assinaturas: assinaturasLinhas.map(a => id.semEmail ? { ...a, email: undefined } : a),
    pagamentos: pagamentosLinhas,
    avisos_de_pagamento: Object.fromEntries(Object.keys(STATUS_EVENTO).map(k => [k, eventos.filter(e => e.status_processamento === k).length])),
  }

  // ---------- 5. Pessoas ----------
  const tab = pessoas(dados, id, agora)
  md.push(`## 5. Pessoas (${tab.linhas.length})`, '')
  md.push('Em ordem de cadastro. "Grupo" é a cor do cartão no painel: assinante, não assinante, viu os planos nos últimos 30 dias ou administrador.', '')
  md.push(falhou('usuarios') ?? tabela(tab.cabecalho, tab.linhas), '')
  json.pessoas = tab.linhas.map(l => Object.fromEntries(tab.cabecalho.map((c, i) => [c, l[i]])))

  // ---------- Glossário e limitações ----------
  md.push('## Glossário', '')
  md.push(...[
    '- **Estudou hoje:** respondeu ao menos 1 questão ou usou flashcards no dia de hoje (horário de São Paulo).',
    '- **Ativo na semana / no mês:** respondeu questões nos últimos 7 / 30 dias.',
    '- **Acerto real:** acerto na 1ª tentativa de cada questão. **Após revisão:** última resposta de cada questão.',
    '- **Assinante com acesso:** assinatura ativa, ou cancelada que ainda vale até o fim do período pago.',
    '- **Cartão:** renova sozinho a cada período do plano. **Pix:** pago uma vez; o acesso termina no fim do período (não renova).',
    '- **Receita recorrente por mês:** soma dos cartões que renovam sozinhos, cada um dividido pelos meses do plano (anual ÷ 12, semestral ÷ 6).',
    '- **Pagamento estimado:** renovação antiga do cartão reconstruída pelo período do plano (o banco guarda só a última de cada cartão) ou assinatura paga sem o pagamento gravado.',
    '- **Situações:** Ativa · Renovação desligada (não cobra mais, sem reembolso; acesso até o fim do período pago) · Encerrada · Expirada · Aguardando renovação · Pendente · Falha no pagamento · Reembolsada · Pausada. Cortesia é acesso liberado pelo administrador, sem pagamento (aparece na ficha da pessoa).',
    '- **Viu os planos:** abriu a página de planos e preços nos últimos 30 dias (o histórico de páginas guarda 30 dias).',
  ], '')
  md.push('## Limitações', '')
  md.push(...[
    '- Valores brutos: não descontam a taxa do processador de pagamento e não substituem o extrato oficial.',
    '- A data de uma resposta é a do aparelho de quem respondeu; "ativos" do resumo contam pela sincronização. Pequenas diferenças entre as duas contagens são normais.',
    '- Flashcards por dia não ficam guardados por pessoa: "usaram flashcards hoje" vem do último uso de cada um e não tem comparação com ontem.',
    '- Contas de cortesia não aparecem numa lista própria (só na ficha de cada pessoa).',
    '- Contas de teste do dono ficam fora dos números e aparecem marcadas nas listas.',
    '- A previsão supõe que ninguém cancele o cartão e que a fração indicada de quem pagou Pix compre de novo.',
  ], '')

  const csv = textoCsv(tab.cabecalho, tab.linhas as Array<Array<string | number | null | undefined>>)
  const carimbo = new Date(agora).toLocaleString('sv-SE', { timeZone: FUSO }).slice(0, 16).replace(/[ :]/g, '-')
  return { markdown: md.join('\n'), json: JSON.stringify(json, null, 2), csvPessoas: csv, nomeBase: `ortoquestoes-painel-${carimbo}` }
}
