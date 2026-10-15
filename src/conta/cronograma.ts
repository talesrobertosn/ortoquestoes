import { useEffect, useState } from 'react'
import { chamarRpc, ErroRpc } from '../servicos/supabase'
import { gravar, ler } from '../estado/armazenamento'
import { chaveData, incluiSimulados, opcoesDe, type CalculoPlano, type OpcoesPlano, type PlanoSalvo } from '../dados/planoEstudo'

/**
 * Leitura e gravação do cronograma no servidor. O plano mora numa linha só
 * (`planos_estudo`) e vale para todos os aparelhos da pessoa. A escolha de
 * incluir os OrtoQuestões Simulados vai na coluna `incluir_simulados`;
 * enquanto o banco não tiver a coluna, fica guardada no aparelho.
 */
const CHAVE = 'cronograma:simulados'
const CHAVE_AVISO = 'cronograma:aviso-simulados'
/** Toda leitura ou gravação bem-sucedida avisa as telas abertas, para todas mostrarem a mesma cópia. */
const EVENTO_PLANO = 'ortoquestoes:plano'

/** O aviso de novidade dos simulados aparece uma vez para quem já tinha cronograma. */
export const avisoSimuladosVisto = () => ler<boolean>(CHAVE_AVISO, false)
export const marcarAvisoSimulados = () => gravar(CHAVE_AVISO, true)

const funcaoInexistente = (falha: unknown) => falha instanceof ErroRpc && falha.status === 404

function anunciar(plano: PlanoSalvo | null) {
  window.dispatchEvent(new CustomEvent<PlanoSalvo | null>(EVENTO_PLANO, { detail: plano }))
}

/**
 * Leituras podem se sobrepor (foco, aba, rede, intervalo, gravações). Cada pedido
 * leva um número; uma resposta só é anunciada se for mais nova que a última
 * anunciada e se o pedido saiu depois da última gravação. Assim, uma leitura
 * lenta feita antes de salvar não traz de volta o plano velho para a tela.
 */
let pedidos = 0
let ultimoAnunciado = 0
let ultimaGravacao = 0
const marcarGravacao = () => { ultimaGravacao = ++pedidos }

export async function obterPlano(): Promise<PlanoSalvo | null> {
  const numero = ++pedidos
  const [bruto] = await chamarRpc<PlanoSalvo[]>('obter_plano_estudo', {})
  const plano = !bruto ? null : {
    ...bruto,
    incluir_simulados: typeof bruto.incluir_simulados === 'boolean' ? bruto.incluir_simulados : ler<boolean>(CHAVE, true),
    opcoes: bruto.opcoes && typeof bruto.opcoes === 'object' ? bruto.opcoes : {},
  }
  if (numero > ultimoAnunciado && numero > ultimaGravacao) {
    ultimoAnunciado = numero
    anunciar(plano)
  }
  return plano
}

/**
 * O plano salvo, sempre a cópia mais recente do servidor: relê ao voltar para a
 * aba, ao reconectar e a cada minuto. Sem isso, o celular deixado aberto
 * mostrava (e regravava) um plano velho, desfazendo o que foi salvo no computador.
 */
export function usarPlanoSalvo(ativo: boolean) {
  const [plano, definirPlano] = useState<PlanoSalvo | null | undefined>(undefined)
  const [falhou, definirFalhou] = useState(false)
  useEffect(() => {
    // Inativo (sem assinatura ou ainda carregando o acesso): nada foi lido ainda.
    if (!ativo) { definirPlano(undefined); return }
    let vivo = true
    const reler = () => {
      if (document.visibilityState === 'hidden') return
      obterPlano().then(() => { if (vivo) definirFalhou(false) }).catch(() => {
        if (!vivo) return
        definirFalhou(true)
        definirPlano((atual) => atual === undefined ? null : atual)
      })
    }
    const aoAnunciar = (e: Event) => { if (vivo) definirPlano((e as CustomEvent<PlanoSalvo | null>).detail) }
    window.addEventListener(EVENTO_PLANO, aoAnunciar)
    window.addEventListener('focus', reler)
    window.addEventListener('online', reler)
    document.addEventListener('visibilitychange', reler)
    const intervalo = window.setInterval(reler, 60_000)
    reler()
    return () => {
      vivo = false
      window.removeEventListener(EVENTO_PLANO, aoAnunciar)
      window.removeEventListener('focus', reler)
      window.removeEventListener('online', reler)
      document.removeEventListener('visibilitychange', reler)
      window.clearInterval(intervalo)
    }
  }, [ativo])
  return { plano, definirPlano, falhou }
}

export interface DadosPlano {
  p_data_prova: string
  p_intensidade: string
  p_folgas: number[]
  p_prova: string
  p_base: number
  p_recomecar: boolean
}

export async function salvarPlano(dados: DadosPlano, incluirSimulados: boolean, opcoes?: OpcoesPlano): Promise<PlanoSalvo | null> {
  gravar(CHAVE, incluirSimulados)
  // Banco mais novo primeiro; sem a parte 20 (opções) ou a 202610070200 (simulados), cai para a versão anterior.
  const tentativas = [
    ...(opcoes ? [{ ...dados, p_incluir_simulados: incluirSimulados, p_opcoes: opcoes }] : []),
    { ...dados, p_incluir_simulados: incluirSimulados },
    { ...dados },
  ]
  for (const [i, corpo] of tentativas.entries()) {
    marcarGravacao()
    try { await chamarRpc('salvar_plano_estudo', corpo); break } catch (falha) {
      if (!funcaoInexistente(falha) || i === tentativas.length - 1) throw falha
    }
  }
  return obterPlano()
}

/** Planos criados antes da etapa 4 do formulário: a pessoa ainda não escolheu sobre os simulados. */
const ETAPA_SIMULADOS_EM = Date.parse('2026-10-06T21:45:00Z')
export function mostrarNovidadeSimulados(plano: PlanoSalvo | null | undefined): plano is PlanoSalvo {
  return !!plano && incluiSimulados(plano) && Date.parse(plano.criado_em) < ETAPA_SIMULADOS_EM && !avisoSimuladosVisto()
}

/** Tira os simulados do plano sem recomeçar: ele foi montado quando os simulados ainda não entravam. */
export async function ficarSoComOficiais(copia: PlanoSalvo): Promise<PlanoSalvo | null> {
  const plano = (await obterPlano()) ?? copia
  const salvo = await salvarPlano({ p_data_prova: plano.data_prova, p_intensidade: plano.intensidade, p_folgas: plano.folgas, p_prova: plano.prova, p_base: plano.base_respondidas, p_recomecar: false }, false, plano.opcoes ?? undefined)
  marcarAvisoSimulados()
  return salvo
}

/**
 * Muda só as opções (semana difícil, adiantamento), sem recomeçar a contagem.
 * Relê o plano antes: a alteração entra sobre o que está no servidor agora, e
 * não sobre a cópia desta tela, que pode ter sido mudada em outro aparelho.
 */
export async function salvarOpcoes(alterar: (atual: PlanoSalvo) => OpcoesPlano | null): Promise<PlanoSalvo | null> {
  const plano = await obterPlano()
  if (!plano) return null
  const opcoes = alterar(plano)
  if (!opcoes) return plano
  // Com a parte 21, manda só as chaves que mudaram; o servidor junta com o resto.
  const antes = plano.opcoes ?? {}
  const removeu = Object.keys(antes).some((k) => !(k in opcoes))
  const patch = Object.fromEntries(Object.entries(opcoes).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify((antes as Record<string, unknown>)[k])))
  if (!Object.keys(patch).length && !removeu) return plano
  if (!removeu) {
    marcarGravacao()
    try { await chamarRpc('ajustar_opcoes_plano', { p_patch: patch }); return obterPlano() } catch (falha) {
      if (!funcaoInexistente(falha)) throw falha
    }
  }
  return salvarPlano({ p_data_prova: plano.data_prova, p_intensidade: plano.intensidade, p_folgas: plano.folgas, p_prova: plano.prova, p_base: plano.base_respondidas, p_recomecar: false }, incluiSimulados(plano), opcoes)
}

/**
 * Adiantar: as opções com o registro de hoje (a meta do dia e quanto a pessoa pediu
 * para adiantar), ou null se nada mudou. É o que permite, amanhã, tirar da meta o que
 * ela fez a mais hoje. Sem `pedido`, mantém o que já estava pedido.
 */
export function opcoesComAdiantamento(plano: PlanoSalvo, calculo: Pick<CalculoPlano, 'metaDiaria' | 'extraHoje' | 'adiantarPedido' | 'naRetaFinal' | 'provaPassou'>, pedido?: number): OpcoesPlano | null {
  if (calculo.naRetaFinal || calculo.provaPassou) return null
  const hoje = chaveData(new Date())
  const limite = chaveData(new Date(Date.now() - 30 * 86_400_000))
  const lista = opcoesDe(plano).adiantados.filter((r) => r.em >= limite)
  const atual = lista.find((r) => r.em === hoje)
  const novoPedido = Math.max(0, Math.round(pedido ?? atual?.pedido ?? 0))
  const outros = lista.filter((r) => r.em !== hoje).slice(-9)
  const precisa = calculo.extraHoje > 0 || novoPedido > 0
  if (!precisa) return atual ? { ...(plano.opcoes ?? {}), adiantados: outros } : null
  // A meta do registro de hoje só sobe: se ela cair no meio do dia (semana difícil
  // ligada depois de estudar), o que já era meta não vira adiantamento para amanhã.
  const meta = Math.max(atual?.meta ?? 0, calculo.metaDiaria)
  if (atual && atual.meta === meta && (atual.pedido ?? 0) === novoPedido) return null
  return { ...(plano.opcoes ?? {}), adiantados: [...outros, { em: hoje, meta, ...(novoPedido ? { pedido: novoPedido } : {}) }] }
}

/** Grava o registro de hoje se mudou, sobre o plano atual do servidor. Uma falha sobe para quem chamou. */
export async function guardarAdiantamento(calculo: Parameters<typeof opcoesComAdiantamento>[1], pedido?: number): Promise<PlanoSalvo | null> {
  return salvarOpcoes((atual) => opcoesComAdiantamento(atual, calculo, pedido))
}
