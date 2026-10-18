import { gravar, ler, usuarioLocal } from '../estado/armazenamento'
import { chamarFuncao } from '../servicos/supabase'
import type { RegistroQuestao } from '../estado/revisao'

/**
 * Os automáticos novos (17/10/2026) que o SITE dispara, logo depois do acontecimento:
 *   boas_vindas_dia0   primeiro login depois de confirmar o e-mail;
 *   primeiras_10       ao passar de 10 questões (junto da checagem do marco);
 *   voltou             primeiro acesso depois de 10 dias ou mais fora;
 *   cronograma_pronto  no dia em que a pessoa monta o plano até a prova.
 * (Pagamento aprovado e obrigado pelo tempo saem pelo servidor: webhook e gerenciar-plano.)
 *
 * O site só avisa; a função `enviar-email` (ação `automatico`) confere o acontecimento,
 * a cadência e manda uma vez por pessoa e tipo. Aqui, três cuidados:
 *   - à prova de falha: nenhum erro de e-mail chega a quem chamou;
 *   - uma vez por sessão por tipo (a sincronização avisa várias vezes seguidas);
 *   - uma marca "já pedi" por tipo no aparelho, para não chamar a função a cada carregamento.
 *     Os que saem uma vez só guardam `true`; o "voltou" guarda o dia, porque pode repetir
 *     em outra ausência.
 */
export type TipoAutomaticoSite = 'boas_vindas_dia0' | 'primeiras_10' | 'voltou' | 'cronograma_pronto'
const CHAVE = (tipo: TipoAutomaticoSite) => `emails:automatico:${tipo}`
const CHAVE_VISITA = 'emails:ultima-visita'
/** Dias fora a partir dos quais a volta ganha carta (a mesma regra do servidor). */
export const DIAS_PARA_VOLTOU = 10
const DIA = 86_400_000

/** Resultados em que o servidor pede para tentar de novo mais tarde (nada foi enviado nem recusado de vez). */
const TENTAR_DEPOIS = new Set(['ainda_nao', 'falhou', 'adiado', 'sql_pendente', 'email_nao_configurado', 'sem_cronograma'])

const pedidosNestaSessao = new Set<string>()
/** Só para os testes: esquece a trava de "uma vez por sessão". */
export function esquecerPedidosDaSessao() { pedidosNestaSessao.clear() }

/** Dia de hoje em São Paulo ("2026-10-17"). */
const diaDeHoje = (agora = Date.now()) => new Date(agora - 3 * 3_600_000).toISOString().slice(0, 10)

/** A marca "já pedi" deste tipo vale agora? */
export function jaPedido(tipo: TipoAutomaticoSite, agora = Date.now()): boolean {
  const marca = ler<boolean | string | null>(CHAVE(tipo), null)
  if (tipo === 'voltou') return marca === diaDeHoje(agora)
  return marca === true
}

/**
 * Pede à função um automático. Devolve o resultado do servidor ("enviado", "ja_enviado",
 * "adiado"…), ou null quando não chamou (já pedido, sem conta) ou a chamada falhou.
 */
export async function pedirAutomatico(tipo: TipoAutomaticoSite, extra: Record<string, unknown> = {}, agora = Date.now()): Promise<string | null> {
  if (!usuarioLocal()) return null
  const chaveSessao = `${usuarioLocal()}:${tipo}`
  if (pedidosNestaSessao.has(chaveSessao) || jaPedido(tipo, agora)) return null
  pedidosNestaSessao.add(chaveSessao)
  try {
    const { resultado } = await chamarFuncao<{ resultado?: string }>('enviar-email', { acao: 'automatico', tipo, ...extra })
    const r = resultado ?? ''
    // Enviado, já enviado, pessoa não quer, sem e-mail…: não há por que perguntar de novo neste aparelho.
    if (!TENTAR_DEPOIS.has(r)) gravar(CHAVE(tipo), tipo === 'voltou' ? diaDeHoje(agora) : true)
    else pedidosNestaSessao.delete(chaveSessao)
    return r || null
  } catch {
    // Função não publicada, sem rede, sessão vencida: tenta em outra sessão.
    pedidosNestaSessao.delete(chaveSessao)
    return null
  }
}

/** Primeiro login depois de confirmar o e-mail. */
export function avisarConfirmacao() { return pedirAutomatico('boas_vindas_dia0') }

/** Ao passar de 10 questões (o servidor confere o total sincronizado). */
export function avisarPrimeirasDez(totalRespondidas: number) {
  if (totalRespondidas < 10) return Promise.resolve(null)
  return pedirAutomatico('primeiras_10')
}

/**
 * Quantos dias a pessoa ficou fora, pelo que este aparelho sabe: a última visita
 * registrada aqui ou, sem ela (aparelho novo), a última resposta sincronizada que
 * aconteceu antes desta sessão. Null quando não dá para saber.
 */
export function diasForaDe(respondidas: Record<string, RegistroQuestao>, inicioSessao: number, agora = Date.now()): number | null {
  const ultimaVisita = ler<number>(CHAVE_VISITA, 0)
  let ultimo = ultimaVisita > 0 && ultimaVisita <= agora ? ultimaVisita : 0
  if (!ultimo) {
    for (const r of Object.values(respondidas)) {
      if (!r || typeof r !== 'object') continue
      const momentos = [r.q, ...(r.historico ?? []).map((h) => h.em)].filter((t) => Number.isFinite(t) && t > 0 && t < inicioSessao)
      for (const t of momentos) if (t > ultimo) ultimo = t
    }
  }
  if (!ultimo) return null
  return Math.floor((agora - ultimo) / DIA)
}

/**
 * Chamada uma vez por sessão, quando a conta termina de sincronizar: se a pessoa
 * ficou 10 dias ou mais sem aparecer, pede "Que bom te ver de volta". Em seguida
 * registra a visita de hoje, para a próxima conta começar daqui.
 */
export async function conferirRetorno(respondidas: Record<string, RegistroQuestao>, inicioSessao: number, agora = Date.now()): Promise<string | null> {
  const dias = diasForaDe(respondidas, inicioSessao, agora)
  let resultado: string | null = null
  if (dias !== null && dias >= DIAS_PARA_VOLTOU) resultado = await pedirAutomatico('voltou', { dias_fora: dias, referencia: diaDeHoje(agora) }, agora)
  gravar(CHAVE_VISITA, agora)
  return resultado
}

/** Só registra a visita (quem não chegou a sincronizar): a ausência conta a partir daqui. */
export function registrarVisita(agora = Date.now()) { gravar(CHAVE_VISITA, agora) }

/** No dia em que monta o plano: dias para a prova e a prova escolhida (o servidor confere no banco). */
export function avisarCronogramaPronto(dataProva: string, prova: string | null | undefined, agora = Date.now()) {
  const dias = Math.max(1, Math.ceil((new Date(`${dataProva}T12:00:00-03:00`).getTime() - agora) / DIA))
  return pedirAutomatico('cronograma_pronto', { dias_para_prova: Number.isFinite(dias) ? dias : undefined, prova: prova || undefined })
}
