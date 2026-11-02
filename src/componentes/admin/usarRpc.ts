import { useCallback, useEffect, useReducer, useRef } from 'react'
import { ErroRpc, chamarRpc, type OpcoesRpc } from '../../servicos/supabase'

/**
 * Camada de dados do painel do administrador (auditoria de 15/10/2026, T6.3).
 *
 * - Cache em memória por chave: trocar de aba e voltar mostra na hora o que já veio.
 * - Um pedido por chave de cada vez: dois componentes (ou um clique duplo) pedindo a
 *   mesma coisa recebem a mesma resposta, sem disparar outra RPC.
 * - Quem sai da tela para de ouvir; se ninguém mais ouve, o pedido em voo é cancelado.
 * - Atualização periódica só enquanto a seção está montada e a aba do navegador visível.
 */
interface Estado { dados: unknown; erro: unknown; em: number }
interface Voo { controle: AbortController; promessa: Promise<unknown> }
interface Entrada { estado: Estado; voo: Voo | null; ouvintes: Set<() => void> }

const entradas = new Map<string, Entrada>()

function entradaDe(chave: string): Entrada {
  let e = entradas.get(chave)
  if (!e) { e = { estado: { dados: undefined, erro: null, em: 0 }, voo: null, ouvintes: new Set() }; entradas.set(chave, e) }
  return e
}
const avisar = (e: Entrada) => e.ouvintes.forEach(ouvir => ouvir())

export type Buscador<T> = (sinal: AbortSignal) => Promise<T>

/** Busca pela chave, reaproveitando o pedido que já estiver em voo. */
export function buscarConsulta<T>(chave: string, buscador: Buscador<T>): Promise<T> {
  const e = entradaDe(chave)
  if (e.voo) return e.voo.promessa as Promise<T>
  const voo: Voo = { controle: new AbortController(), promessa: Promise.resolve() }
  voo.promessa = buscador(voo.controle.signal).then(
    dados => { if (e.voo === voo) e.estado = { dados, erro: null, em: Date.now() }; return dados },
    // Falha mantém os dados anteriores na tela (o aviso aparece por cima).
    erro => { if (e.voo === voo) e.estado = { ...e.estado, erro }; throw erro },
  ).finally(() => { if (e.voo === voo) { e.voo = null; avisar(e) } })
  e.voo = voo
  avisar(e)
  return voo.promessa as Promise<T>
}

export interface OpcoesConsulta {
  /** Atualiza sozinho a cada N ms, só com a aba do navegador visível. */
  atualizarCada?: number
  /** Ao montar, dados mais novos que isto são usados sem pedir de novo. */
  validadeMs?: number
}

export interface Consulta<T> {
  dados: T | undefined
  erro: unknown
  carregando: boolean
  /** Instante (ms) da última resposta boa, ou null antes da primeira. */
  atualizadoEm: number | null
  recarregar: () => Promise<void>
}

/**
 * Atualização automática do painel (pedido do Tales, 21/10/2026): a cada 5 minutos, ou na hora pelo
 * botão Atualizar. As leituras do painel são pesadas para o banco; de 10 em 10 s elas o sobrecarregavam.
 */
export const CINCO_MIN = 300_000

/**
 * Consulta com cache. `chave` null deixa a consulta parada (seção que ainda não precisa
 * dos dados). O `buscador` recebe o sinal de cancelamento.
 */
export function usarConsulta<T>(chave: string | null, buscador: Buscador<T>, { atualizarCada, validadeMs = CINCO_MIN }: OpcoesConsulta = {}): Consulta<T> {
  const ref = useRef(buscador)
  ref.current = buscador
  const [, redesenhar] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (!chave) return
    const e = entradaDe(chave)
    e.ouvintes.add(redesenhar)
    if (!e.voo && Date.now() - e.estado.em > validadeMs) void buscarConsulta(chave, s => ref.current(s)).catch(() => undefined)
    else redesenhar()
    return () => {
      e.ouvintes.delete(redesenhar)
      // Ninguém mais espera a resposta: cancela o pedido (e não grava nada dele).
      if (!e.ouvintes.size && e.voo) { e.voo.controle.abort(); e.voo = null }
    }
  }, [chave, validadeMs])

  useEffect(() => {
    if (!chave || !atualizarCada) return
    const tique = () => { if (document.visibilityState === 'visible') void buscarConsulta(chave, s => ref.current(s)).catch(() => undefined) }
    const t = window.setInterval(tique, atualizarCada)
    // Voltando à aba do navegador depois de um tempo fora: atualiza já, sem esperar o próximo tique.
    const aoVoltar = () => { if (Date.now() - entradaDe(chave).estado.em >= atualizarCada) tique() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [chave, atualizarCada])

  const recarregar = useCallback(async () => {
    if (chave) await buscarConsulta(chave, s => ref.current(s)).then(() => undefined, () => undefined)
  }, [chave])

  const e = chave ? entradas.get(chave) : undefined
  return { dados: e?.estado.dados as T | undefined, erro: e?.estado.erro ?? null, carregando: !!e?.voo, atualizadoEm: e?.estado.em || null, recarregar }
}

/**
 * Uma RPC do painel com cache. `conta` entra na chave: outra pessoa entrando no mesmo
 * navegador nunca vê o que ficou guardado da anterior. `ativo: false` deixa parada.
 */
export function usarRpc<T>(conta: string | null | undefined, nome: string, args: Record<string, unknown> = {}, opcoes: OpcoesConsulta & { ativo?: boolean; prazoMs?: number } = {}): Consulta<T> {
  const { ativo = true, prazoMs, ...resto } = opcoes
  const corpo = JSON.stringify(args)
  const chave = conta && ativo ? `${conta}:${nome}:${corpo}` : null
  return usarConsulta<T>(chave, sinal => chamarRpc<T>(nome, JSON.parse(corpo) as Record<string, unknown>, { sinal, prazoMs } satisfies OpcoesRpc), resto)
}

/** A função ainda não existe no banco (SQL novo não colado): PostgREST responde 404 / PGRST202. */
export const rpcInexistente = (falha: unknown) =>
  falha instanceof ErroRpc && (falha.status === 404 || /PGRST202|could not find the function/i.test(falha.codigo))
