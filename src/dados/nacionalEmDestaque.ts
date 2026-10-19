import { useEffect, useState } from 'react'
import { snObter, type EdicaoSN } from './apiSimuladoNacional'

/**
 * A edição em destaque do Simulado Nacional, lida uma vez a cada minuto e
 * dividida entre quem pergunta (o menu, a questão avulsa). Falhar (a parte 32
 * ainda não está no banco, sem rede) devolve null, sem erro.
 */
const VALIDADE_MS = 60_000
const cache = new Map<string, { em: number; pedido: Promise<EdicaoSN | null> }>()

export function edicaoEmDestaque(logado: boolean): Promise<EdicaoSN | null> {
  const chave = logado ? 'logado' : 'visitante'
  const salvo = cache.get(chave)
  if (salvo && Date.now() - salvo.em < VALIDADE_MS) return salvo.pedido
  const pedido = snObter(null, { logado }).then((ed) => (ed?.edicao ? ed : null)).catch(() => null)
  cache.set(chave, { em: Date.now(), pedido })
  return pedido
}

/** Depois de começar, entregar ou se inscrever: a próxima leitura vem do servidor. */
export function esquecerEdicaoEmDestaque() { cache.clear() }

/** A edição em destaque é aberta a todos com conta grátis (o menu não põe o cadeado). */
export function usarNacionalAbertoATodos(): boolean {
  const [aberto, definir] = useState(false)
  useEffect(() => {
    let vivo = true
    edicaoEmDestaque(false).then((ed) => {
      if (vivo) definir(!!ed?.aberto_a_todos && !!ed.fecha_em && Date.parse(ed.fecha_em) > Date.now())
    })
    return () => { vivo = false }
  }, [])
  return aberto
}
