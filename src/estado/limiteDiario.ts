import { useCallback, useState } from 'react'
import { chamarRpc } from '../servicos/supabase'
import { gravar, ler } from './armazenamento'
import { registrarAssinante } from '../conta/plano'

export const FUSO_DIA = 'America/Sao_Paulo'
export const LIMITES_HABILITADOS = import.meta.env.VITE_LIMITES_HABILITADOS === 'true'
const CHAVE_BLOQUEIO = 'limite:bloqueio'
const CHAVE_SALDO = 'limite:saldo'

/**
 * Último saldo informado pelo servidor, só para avisos de interface (quem
 * decide é autorizar_resposta). Sem registro, o limite não vale para esta
 * conta; janela de 24 h já vencida significa cota cheia de novo.
 */
export function saldoGratuitoHoje(): number | null {
  if (!LIMITES_HABILITADOS) return null
  const saldo = ler<{ liberaEm?: string; dia?: string; restantes: number; limite: number } | null>(CHAVE_SALDO, null)
  if (!saldo) return null
  // Registros anteriores à janela de 24 h guardavam o dia de São Paulo.
  const valendo = saldo.liberaEm ? Date.parse(saldo.liberaEm) > Date.now() : saldo.dia === chaveDia()
  return valendo ? saldo.restantes : saldo.limite
}

/** Quantas questões grátis por janela de 24 h a conta tinha na última resposta do servidor (o painel pode mudar). */
export function limiteGratisConhecido(): number | null {
  if (!LIMITES_HABILITADOS) return null
  const saldo = ler<{ limite?: number } | null>(CHAVE_SALDO, null)
  return typeof saldo?.limite === 'number' && saldo.limite > 0 ? saldo.limite : null
}

export function lerBloqueioDiario(): string | null {
  const registro = ler<{ liberaEm: string } | null>(CHAVE_BLOQUEIO, null)
  const instante = Date.parse(registro?.liberaEm ?? '')
  if (!Number.isFinite(instante) || instante <= Date.now() || instante > Date.now() + 26 * 60 * 60 * 1000) return null
  return registro!.liberaEm
}

export function limparBloqueioDiario(): void {
  gravar(CHAVE_BLOQUEIO, null)
}

function registrarBloqueioDiario(liberaEm: string): void {
  const instante = Date.parse(liberaEm)
  if (Number.isFinite(instante) && instante > Date.now() && instante <= Date.now() + 26 * 60 * 60 * 1000) {
    gravar(CHAVE_BLOQUEIO, { liberaEm })
  }
}

// Criar um Intl.DateTimeFormat custa caro (dezenas de microssegundos, mais no
// celular) e chaveDia roda uma vez por resposta do histórico: um formato só,
// criado na primeira vez, deixa a página inicial bem mais leve.
let formatoDia: Intl.DateTimeFormat | null = null
let formatoHora: Intl.DateTimeFormat | null = null

export function chaveDia(data: Date | number = new Date()): string {
  formatoDia ??= new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_DIA, year: 'numeric', month: '2-digit', day: '2-digit' })
  return formatoDia.format(data)
}
export function inicioDia(data = new Date()): Date {
  const [ano, mes, dia] = chaveDia(data).split('-').map(Number)
  const meiaNoiteUtc = Date.UTC(ano, mes - 1, dia)
  // Calcula o deslocamento real do fuso nessa data, sem cristalizar “UTC-3”.
  const referencia = new Date(Date.UTC(ano, mes - 1, dia, 12))
  formatoHora ??= new Intl.DateTimeFormat('en-US', { timeZone: FUSO_DIA, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' })
  const partes = formatoHora.formatToParts(referencia)
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value)
  const comoUtc = Date.UTC(valor('year'), valor('month') - 1, valor('day'), valor('hour'), valor('minute'), valor('second'))
  const deslocamento = comoUtc - referencia.getTime()
  return new Date(meiaNoiteUtc - deslocamento)
}

export interface EstadoLimite {
  permitido: boolean
  paywallAtivo: boolean
  ilimitado: boolean
  consumidas: number
  limite: number
  restantes: number | null
  liberaEm: string
  sequencia: number
  motivo?: string
  falhaValidacao?: boolean
}

/**
 * Falha de rede ao validar a resposta. Vira erro junto ao botão "Responder"
 * (o cartão mostra a mensagem), e não o painel de limite diário, que fazia a
 * pessoa achar que tinha acabado a cota.
 */
export function erroDeConexao(): Error {
  const erro = new Error('não deu para confirmar com o servidor; confira a internet')
  erro.name = 'Conexão'
  return erro
}

export function usarLimiteDiario() {
  const [estado, definirEstado] = useState<EstadoLimite | null>(null)
  const [validando, definirValidando] = useState(false)

  const autorizar = useCallback(async (idQuestao: string, chaveIdempotencia: string) => {
    if (!LIMITES_HABILITADOS) return { permitido: true } as EstadoLimite
    definirValidando(true)
    try {
      // Prazo total: nenhuma combinação de sessão lenta e rede lenta pode
      // deixar o botão de responder esperando para sempre.
      const prazo = new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('A validação demorou demais.')), 12_000))
      const resposta = await Promise.race([chamarRpc<Array<Record<string, unknown>>>('autorizar_resposta', {
        p_chave_idempotencia: chaveIdempotencia,
        p_id_questao: idQuestao,
      }), prazo])
      const r = resposta[0]
      const normalizado: EstadoLimite = {
        permitido: Boolean(r.permitido), paywallAtivo: Boolean(r.paywall_ativo), ilimitado: Boolean(r.ilimitado),
        consumidas: Number(r.consumidas), limite: Number(r.limite), restantes: r.restantes === null ? null : Number(r.restantes),
        liberaEm: String(r.libera_em), sequencia: Number(r.sequencia ?? 0), motivo: r.motivo ? String(r.motivo) : undefined,
      }
      if (normalizado.paywallAtivo) registrarAssinante(normalizado.ilimitado)
      if (normalizado.paywallAtivo && !normalizado.ilimitado && normalizado.restantes !== null) gravar(CHAVE_SALDO, { liberaEm: normalizado.liberaEm, restantes: normalizado.restantes, limite: normalizado.limite })
      else if (!normalizado.paywallAtivo || normalizado.ilimitado) gravar(CHAVE_SALDO, null)
      // A 20ª resposta já fecha a janela: o aviso e o convite aparecem sem esperar a 21ª tentativa.
      if ((!normalizado.permitido && !normalizado.falhaValidacao && normalizado.paywallAtivo) || (normalizado.permitido && normalizado.paywallAtivo && !normalizado.ilimitado && normalizado.restantes === 0)) registrarBloqueioDiario(normalizado.liberaEm)
      else if (normalizado.permitido && (normalizado.ilimitado || !normalizado.paywallAtivo || (normalizado.restantes ?? 0) > 0)) limparBloqueioDiario()
      definirEstado(normalizado)
      return normalizado
    } catch (erro) {
      // Uma falha técnica não é limite atingido nem autorização. Quando a
      // validação estiver ligada, não registre progresso sem resposta do servidor.
      const falha: EstadoLimite = { permitido: false, paywallAtivo: false, ilimitado: false, consumidas: 0, limite: 0, restantes: null, liberaEm: '', sequencia: 0, motivo: erro instanceof Error ? erro.message : 'Não foi possível validar o limite.', falhaValidacao: true }
      definirEstado(falha)
      return falha
    } finally { definirValidando(false) }
  }, [])
  return { estado, definirEstado, autorizar, validando }
}

const CHAVE_CONVITE = 'limite:convite-visto'
/** O convite do limite aparece uma vez por janela bloqueada, sozinho; depois só quando a pessoa tenta responder. */
export function conviteLimiteJaVisto(liberaEm: string): boolean {
  return ler<string | null>(CHAVE_CONVITE, null) === liberaEm
}
export function marcarConviteLimiteVisto(liberaEm: string): void {
  gravar(CHAVE_CONVITE, liberaEm)
}
