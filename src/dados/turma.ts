import { useEffect, useState } from 'react'
import { chamarRpc, codigoErro } from '../servicos/supabase'
import { gravar, ler } from '../estado/armazenamento'

/** Menos que isso e a porcentagem diz mais sobre uma pessoa do que sobre a turma. */
export const MINIMO_TURMA = 3

export interface TurmaQuestao {
  respondentes: number
  /** Nulos para quem não tem o plano: só o número de pessoas aparece. */
  acertos: number | null
  com_letra: number | null
  letras: Record<string, number> | null
  premium: boolean
}

const cacheQuestao = new Map<string, { em: number; dados: TurmaQuestao }>()

/** Como a turma respondeu uma questão. Consulta uma vez a cada 10 minutos por questão. */
export function usarTurmaQuestao(id: string, ativo: boolean) {
  const [dados, definirDados] = useState<TurmaQuestao | null>(() => cacheQuestao.get(id)?.dados ?? null)
  const [falhou, definirFalhou] = useState(false)
  useEffect(() => {
    if (!ativo) return
    const guardado = cacheQuestao.get(id)
    if (guardado && Date.now() - guardado.em < 10 * 60_000) { definirDados(guardado.dados); return }
    let vivo = true
    definirDados(null); definirFalhou(false)
    chamarRpc<TurmaQuestao[]>('turma_da_questao', { p_id_questao: id })
      .then(([linha]) => {
        if (!linha) return
        cacheQuestao.set(id, { em: Date.now(), dados: linha })
        if (vivo) definirDados(linha)
      })
      .catch(() => { if (vivo) definirFalhou(true) })
    return () => { vivo = false }
  }, [id, ativo])
  return { dados, falhou }
}

export interface TurmaAcervo { respondentes: number; acerto: number }
const CHAVE_ACERVO = 'turma:acervo'
let pedidoAcervo: Promise<Map<string, TurmaAcervo> | null> | null = null

/**
 * Acerto de primeira da turma em cada questão, para os filtros do Treinar.
 * Guardado por 6 horas: muda devagar e são 3 mil linhas.
 */
export function carregarTurmaAcervo(): Promise<Map<string, TurmaAcervo> | null> {
  const salvo = ler<{ em: number; linhas: Array<[string, number, number]> } | null>(CHAVE_ACERVO, null)
  if (salvo && Date.now() - salvo.em < 6 * 3600_000) {
    return Promise.resolve(new Map(salvo.linhas.map(([id, n, a]) => [id, { respondentes: n, acerto: a }])))
  }
  pedidoAcervo ??= chamarRpc<Array<{ id_questao: string; respondentes: number; acertos: number }>>('turma_acervo', {})
    .then((linhas) => {
      const compactas = linhas.map((l) => [l.id_questao, l.respondentes, Math.round((l.acertos / l.respondentes) * 100)] as [string, number, number])
      gravar(CHAVE_ACERVO, { em: Date.now(), linhas: compactas })
      return new Map(compactas.map(([id, n, a]) => [id, { respondentes: n, acerto: a }]))
    })
    .catch((falha) => {
      // Sem o plano o servidor recusa; não é erro para mostrar.
      if (codigoErro(falha) !== 'premium_necessario') console.warn('turma_acervo', falha)
      return null
    })
    .finally(() => { pedidoAcervo = null })
  return pedidoAcervo
}
