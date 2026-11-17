/**
 * Regras puras da carta de convite (ConviteDiario.tsx e convite/CartaConvite.tsx). Relógio e armazenamento entram
 * por argumento, para o teste (fixtures/testar_carta_convite.mjs) conferir sem navegador.
 *
 * Quando aparece (as mesmas regras desde a primeira versão, aprovadas pelo Tales): uma vez por dia depois de
 * 5 minutos de uso de verdade (aba visível e alguém mexendo) e de novo a cada hora de uso contínuo (uma pausa de
 * mais de 10 minutos zera essa conta). Nunca no meio de uma sessão, login, pagamento ou de outra janela aberta.
 * Quem compartilha fica um mês sem ver.
 *
 * Quem entrega (Tales, 12/11/2026): a coruja e o gato, um em cada dia (no mesmo dia, sempre o mesmo).
 */

export const USO_NECESSARIO = 5 * 60
export const PASSO = 10
/** Sem toque, clique, tecla ou rolagem há mais que isto, o tempo não conta. */
export const OCIOSO = 90_000
export const PAUSA_COMPARTILHOU = 30 * 86_400_000
/** Uso contínuo que traz a carta de novo, e a pausa que zera essa conta. */
export const USO_CONTINUO = 60 * 60
export const PAUSA_ZERA = 10 * 60_000
export const ROTAS_PROTEGIDAS = ['sessao', 'entrar', 'assinatura', 'condicoes-assinatura', 'admin', 'emails', 'flashcards', 'dev']
/** Outras janelas do site: a carta espera elas fecharem (e nunca aparece duas vezes). */
/** .cvc é a própria carta; .cc, o calendário do cronograma aberto. */
export const JANELAS_ABERTAS = '.jc, .cvc, .cc, .ca-pequeno, .ca-fundo, .nc'

export type Bicho = 'coruja' | 'gato'

export type Estado = { dia: string; segundos: number; mostrado: boolean; pausaAte?: number }

/** O dia em São Paulo, no formato 2026-11-12. */
export function hoje(agora = Date.now()): string {
  return new Date(agora).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/** Lê o estado salvo; num dia novo, zera o tempo e mantém a pausa de quem compartilhou. */
export function estadoDoDia(salvo: Estado | null, dia: string): Estado {
  if (salvo && salvo.dia === dia) return salvo
  return { dia, segundos: 0, mostrado: false, pausaAte: salvo?.pausaAte }
}

/** Um passo do relógio (a cada PASSO segundos de aba aberta). Devolve o novo estado e se a carta deve abrir. */
export function passo(estado: Estado, continuo: number, agora: number): { estado: Estado; continuo: number; abrir: boolean } {
  if ((estado.pausaAte ?? 0) > agora) return { estado, continuo, abrir: false }
  const novo = estado.mostrado ? estado : { ...estado, segundos: estado.segundos + PASSO }
  const c = continuo + PASSO
  const abrir = (!novo.mostrado && novo.segundos >= USO_NECESSARIO) || c >= USO_CONTINUO
  return { estado: novo, continuo: c, abrir }
}

/** A rota permite abrir a carta agora? */
export function rotaLivre(caminho: string): boolean {
  return !ROTAS_PROTEGIDAS.includes(caminho.replace(/^\//, '').split(/[/?]/)[0])
}

/** A coruja nos dias pares (contados desde 1970) e o gato nos ímpares. */
export function bichoDoDia(dia: string): Bicho {
  const [a, m, d] = dia.split('-').map(Number)
  const n = Math.floor(Date.UTC(a, (m || 1) - 1, d || 1) / 86_400_000)
  return Number.isFinite(n) && n % 2 === 1 ? 'gato' : 'coruja'
}

/** O que a carta oferece, conforme a conta e o andamento das indicações. */
export type Situacao = 'visitante' | 'carregando' | 'indicar' | 'agradecer' | 'completo' | 'sem-link'

export interface Indicacoes { codigo: string; convidados: number; confirmados: number; dias_ganhos: number; limite: number }

export function situacao(logado: boolean, carregado: boolean, dados: Indicacoes | null, novos: number): Situacao {
  if (!logado) return 'visitante'
  if (!carregado) return 'carregando'
  if (!dados) return 'sem-link'
  if (novos > 0) return 'agradecer'
  if (dados.confirmados >= dados.limite) return 'completo'
  return 'indicar'
}

/**
 * Colegas que confirmaram desde a última carta. Na primeira vez (nada salvo) só guarda a conta, sem festejar
 * indicações antigas, que a pessoa já viu na página Indicar.
 */
export function novosConfirmados(confirmados: number, visto: number | undefined): number {
  if (visto === undefined || !Number.isFinite(visto)) return 0
  return Math.max(0, confirmados - visto)
}

/** As vagas do placar: confirmadas (douradas), a caminho (entraram e ainda não chegaram às 20) e livres. */
export function vagas(dados: Indicacoes): ('confirmada' | 'caminho' | 'livre')[] {
  const total = Math.max(1, dados.limite)
  const confirmadas = Math.min(total, Math.max(0, dados.confirmados))
  const caminho = Math.min(total - confirmadas, Math.max(0, dados.convidados - dados.confirmados))
  return Array.from({ length: total }, (_, i) => (i < confirmadas ? 'confirmada' : i < confirmadas + caminho ? 'caminho' : 'livre'))
}
