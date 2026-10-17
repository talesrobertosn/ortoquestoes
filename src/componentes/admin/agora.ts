/**
 * Agora como torre de controle (pedido do Tales, 17/10/2026): tudo o que aconteceu hoje, com nomes,
 * em listas completas, e um quadro de números do dia sem repetição. Só lê o que as consultas do
 * painel já trazem (nenhuma RPC nova): listar_usuarios_admin, sinais_usuarios_admin,
 * serie_diaria_admin, resumo_admin, funil_admin, listar_assinaturas_admin e cobrancas_admin.
 * O que nenhuma delas mede fica marcado como `null` e a tela escreve "ainda não medido".
 */
import { diaAnterior, diaSP, estudoDeHoje, type DiaSerie } from './estudoHoje'
import { resumoDaPagina } from './formatos'
import type { SinalUsuario } from './sinais'
import { meioDe, precoDe, vigente, type AssinaturaBase, type CobrancaReal } from './receita'

export interface PessoaDoDia {
  id_usuario: string; nome: string | null; email: string | null
  criado_em: string; ultimo_login: string | null; ultima_atividade: string | null
  respondidas: number; respondidas_7d: number; plano_vigente: string | null; administrador: boolean
  online?: boolean; respondidas_hoje?: number; tentativas_hoje?: number
  pagina?: string | null; pagina_em?: string | null; visto_em?: string | null
}
export interface ResumoServidor { usuarios: number; novos_7d: number; ativos_hoje: number; ativos_7d: number; ativos_30d: number; respondidas_hoje: number; respondidas_7d: number; assinantes_vigentes: number }
export interface FunilServidor { cadastrados: number; confirmaram: number }

/** Um número do dia: o valor de hoje e o de ontem quando alguma consulta dá (null = ainda não medido). */
export interface Numero { hoje: number | null; ontem: number | null }
const n = (hoje: number | null, ontem: number | null = null): Numero => ({ hoje, ontem })

/** O que cada pessoa fez hoje, para a lista "Estudaram hoje". */
export interface FeitoHoje<P extends PessoaDoDia = PessoaDoDia> {
  pessoa: P
  questoes: number
  tentativas: number
  flashcards: boolean
  /** Id do capítulo do resumo aberto hoje (a última página registrada), com o quanto leu. */
  resumo: { capitulo: string; extra: string | null } | null
  /** Última atividade registrada hoje (resposta, flashcard ou página), para ordenar e mostrar a hora. */
  em: string | null
}

export interface MovimentoDinheiro { id_usuario: string; nome: string | null; email: string | null; plano: string; meio: string; valor: number | null; em: string | null }

export interface QuadroDoDia<P extends PessoaDoDia = PessoaDoDia> {
  hoje: string; ontem: string
  numeros: {
    contas: Numero; cadastros: Numero; cadastros7d: number | null; confirmaramEmail: number | null
    entraram: Numero; estudaram: Numero; pessoasQuestoes: Numero; cincoOuMais: Numero
    questoes: Numero; flashcards: Numero; resumosAbertos: Numero
    assinantes: Numero; pagaram: Numero; valorPago: Numero; novasAssinaturas: Numero; cancelamentos: Numero; pixPendentes: Numero
  }
  estudaram: FeitoHoje<P>[]
  /** Abriram o site hoje sem responder nem usar flashcards. */
  entraram: Array<{ pessoa: P; em: string | null }>
  recemCadastrados: P[]
  maisAtivosSemana: P[]
  pagaram: MovimentoDinheiro[]
  novasAssinaturas: MovimentoDinheiro[]
  cancelamentos: MovimentoDinheiro[]
  pixPendentes: MovimentoDinheiro[]
}

const t = (v: string | null | undefined) => v ? new Date(v).getTime() : 0
const maisRecente = (...vs: Array<string | null | undefined>) => vs.filter((v): v is string => !!v).sort((a, b) => t(b) - t(a))[0] ?? null
const valorDe = (c: { valor?: number | string | null; plano: string }) => c.valor != null && Number.isFinite(Number(c.valor)) ? Number(c.valor) : precoDe(c.plano)?.total ?? null

export function quadroDoDia<P extends PessoaDoDia>({ usuarios, sinais, serie, resumo, funil, assinaturas, cobrancas, agora = Date.now() }: {
  usuarios: P[] | null; sinais: SinalUsuario[] | null; serie: DiaSerie[] | null; resumo: ResumoServidor | null
  funil: FunilServidor | null; assinaturas: AssinaturaBase[] | null; cobrancas: CobrancaReal[] | null; agora?: number
}): QuadroDoDia<P> {
  const hoje = diaSP(agora), ontem = diaAnterior(hoje)
  const eHoje = (v: string | null | undefined) => !!v && diaSP(v) === hoje
  const eOntem = (v: string | null | undefined) => !!v && diaSP(v) === ontem
  const lista = usuarios ?? []
  const sinalDe = new Map((sinais ?? []).map(s => [s.id_usuario, s]))
  const estudo = estudoDeHoje({ serie, usuarios, sinais, agora })
  const linhaSerie = (dia: string) => serie?.find(d => String(d.dia).slice(0, 10) === dia)
  const serieOntem = linhaSerie(ontem)

  // ---- Pessoas ----
  const estudaram: FeitoHoje<P>[] = []
  const entraram: Array<{ pessoa: P; em: string | null }> = []
  for (const u of lista) {
    const s = sinalDe.get(u.id_usuario)
    const questoes = u.respondidas_hoje ?? 0
    const respondeuHoje = questoes > 0 || eHoje(u.ultima_atividade)
    const flashcards = !!s?.flashcards_ultima && eHoje(s.flashcards_ultima)
    const capitulo = eHoje(u.pagina_em) ? resumoDaPagina(u.pagina) : null
    const emEstudo = maisRecente(eHoje(u.ultima_atividade) ? u.ultima_atividade : null, flashcards ? s?.flashcards_ultima : null, capitulo ? u.pagina_em : null)
    if (respondeuHoje || flashcards || capitulo) {
      estudaram.push({ pessoa: u, questoes, tentativas: u.tentativas_hoje ?? 0, flashcards, resumo: capitulo ? { capitulo, extra: (u.pagina ?? '').split(' · ')[1] ?? null } : null, em: emEstudo ?? (eHoje(u.pagina_em) ? u.pagina_em! : null) })
    } else if (eHoje(u.visto_em) || eHoje(u.pagina_em) || eHoje(u.ultimo_login)) {
      entraram.push({ pessoa: u, em: maisRecente(u.visto_em, u.pagina_em, u.ultimo_login) })
    }
  }
  estudaram.sort((a, b) => t(b.em) - t(a.em) || b.questoes - a.questoes)
  entraram.sort((a, b) => t(b.em) - t(a.em))
  const recemCadastrados = lista.filter(u => agora - t(u.criado_em) < 14 * 86_400_000).sort((a, b) => t(b.criado_em) - t(a.criado_em))
  const maisAtivosSemana = lista.filter(u => u.respondidas_7d > 0).sort((a, b) => b.respondidas_7d - a.respondidas_7d || (b.respondidas_hoje ?? 0) - (a.respondidas_hoje ?? 0))

  // ---- Dinheiro ----
  const pessoaDe = (id: string) => lista.find(u => u.id_usuario === id)
  const mov = (a: { id_usuario: string; nome?: string | null; usuario?: string | null; plano: string; valor?: number | string | null }, em: string | null, meio: string): MovimentoDinheiro => {
    const p = pessoaDe(a.id_usuario)
    return { id_usuario: a.id_usuario, nome: a.nome ?? p?.nome ?? null, email: a.usuario ?? p?.email ?? null, plano: a.plano, meio, valor: valorDe(a), em }
  }
  const movA = (a: AssinaturaBase, em: string | null) => mov(a, em, meioDe(a))
  const pagas = (cobrancas ?? []).filter(c => c.situacao === 'paga')
  const pagaramHoje = pagas.filter(c => eHoje(c.em)).sort((a, b) => t(b.em) - t(a.em)).map(c => mov(c, c.em, c.meio))
  const pagaramOntem = pagas.filter(c => eOntem(c.em))
  const soma = (xs: Array<{ valor: number | null }>) => xs.reduce((s, x) => s + (x.valor ?? 0), 0)
  const ass = assinaturas ?? []
  const inicioDe = (a: AssinaturaBase) => a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao ?? null
  const novasHoje = ass.filter(a => a.status !== 'pendente' && eHoje(inicioDe(a))).sort((a, b) => t(inicioDe(b)) - t(inicioDe(a))).map(a => movA(a, inicioDe(a)))
  const novasOntem = ass.filter(a => a.status !== 'pendente' && eOntem(inicioDe(a))).length
  const canceladas = (dia: (v: string | null | undefined) => boolean) => ass.filter(a => (a.status === 'cancelada' || a.cancelar_ao_fim) && dia(a.cancelada_em))
  const cancelamentosHoje = canceladas(eHoje).sort((a, b) => t(b.cancelada_em) - t(a.cancelada_em)).map(a => movA(a, a.cancelada_em ?? null))
  const pixPendentes = ass.filter(a => a.status === 'pendente').sort((a, b) => t(inicioDe(b)) - t(inicioDe(a))).map(a => movA(a, inicioDe(a)))

  // ---- Números ----
  const cadastrosHoje = usuarios ? lista.filter(u => eHoje(u.criado_em)).length : null
  const cadastrosOntem = serieOntem ? Number(serieOntem.cadastros) : usuarios ? lista.filter(u => eOntem(u.criado_em)).length : null
  const resumosHoje = new Set(estudaram.filter(f => f.resumo).map(f => f.resumo!.capitulo))
  return {
    hoje, ontem,
    numeros: {
      contas: n(resumo?.usuarios ?? (usuarios ? lista.length : null)),
      cadastros: n(cadastrosHoje, cadastrosOntem),
      cadastros7d: resumo?.novos_7d ?? (usuarios ? lista.filter(u => agora - t(u.criado_em) < 7 * 86_400_000).length : null),
      confirmaramEmail: funil ? Number(funil.confirmaram) : null,
      entraram: n(usuarios ? entraram.length + estudaram.length : null),
      // Questões, flashcards ou resumo: a lista "Estudaram hoje" e este número contam a mesma coisa.
      estudaram: n(usuarios ? Math.max(estudaram.length, estudo.estudaram ?? 0) : resumo?.ativos_hoje ?? null),
      pessoasQuestoes: n(estudo.pessoasQuestoes?.hoje ?? (usuarios ? estudaram.filter(f => f.questoes > 0).length : null), estudo.pessoasQuestoes?.ontem ?? null),
      cincoOuMais: n(usuarios ? estudaram.filter(f => f.questoes >= 5).length : null),
      questoes: n(estudo.questoes?.hoje ?? resumo?.respondidas_hoje ?? null, estudo.questoes?.ontem ?? null),
      flashcards: n(estudo.flashcards),
      resumosAbertos: n(usuarios ? resumosHoje.size : null),
      assinantes: n(resumo?.assinantes_vigentes ?? (assinaturas ? ass.filter(a => vigente(a, agora)).length : null)),
      pagaram: n(cobrancas ? pagaramHoje.length : null, cobrancas ? pagaramOntem.length : null),
      valorPago: n(cobrancas ? soma(pagaramHoje) : null, cobrancas ? soma(pagaramOntem.map(c => ({ valor: valorDe(c) }))) : null),
      novasAssinaturas: n(assinaturas ? novasHoje.length : null, assinaturas ? novasOntem : null),
      cancelamentos: n(assinaturas ? cancelamentosHoje.length : null, assinaturas ? canceladas(eOntem).length : null),
      pixPendentes: n(assinaturas ? pixPendentes.length : null),
    },
    estudaram, entraram, recemCadastrados, maisAtivosSemana,
    pagaram: pagaramHoje, novasAssinaturas: novasHoje, cancelamentos: cancelamentosHoje, pixPendentes,
  }
}

/** Os blocos da página, na ordem, para o sumário fixo do topo (âncoras). */
export const BLOCOS_AGORA: Array<[string, string]> = [
  ['agora-online', 'Online agora'], ['agora-numeros', 'Números do dia'], ['agora-atencao', 'Pede atenção'], ['agora-estudaram', 'Estudaram hoje'],
  ['agora-entraram', 'Entraram hoje'], ['agora-cadastros', 'Recém-cadastrados'], ['agora-semana', 'Mais ativos na semana'], ['agora-dinheiro', 'Dinheiro hoje'], ['agora-biblioteca', 'Biblioteca hoje'],
]
