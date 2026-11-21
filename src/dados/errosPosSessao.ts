import type { Indice } from './tipos'
import { focoPorQuestao } from './incidencia'
import type { RegistroQuestao } from '../estado/revisao'
import { chaveDoDia, inicioDoDia } from '../util/dia'

export const INTENSIDADES_ERROS = [
  { id: 'leve', nome: 'Leve', proporcao: 0.10, teto: 5 },
  { id: 'moderada', nome: 'Moderada', proporcao: 0.25, teto: 12 },
  { id: 'agressiva', nome: 'Agressiva', proporcao: 0.50, teto: 25 },
] as const

export interface ErroParaRefazer {
  id: string
  area: string
  assunto: string
  dia: string
  peso: number
}

export function errosAnteriores(indice: Indice, registros: Record<string, RegistroQuestao>, excluir: ReadonlySet<string>, agora = Date.now()): ErroParaRefazer[] {
  const hoje = inicioDoDia(agora)
  const focos = focoPorQuestao(indice)
  return indice.questoes.flatMap((q) => {
    const r = registros[q.id]
    if (q.dup || q.an === 1 || excluir.has(q.id) || r?.c !== false || !Number.isFinite(r.q) || r.q >= hoje) return []
    const foco = focos.get(q.id)
    const area = indice.temas[q.t]?.slug ?? q.ar ?? 'outras'
    const assunto = foco?.nome ?? indice.subtemas[q.s[0]] ?? area
    const peso = 1 + (foco?.nivel ?? 0) + Math.max(0, Math.min(3, (r.erros ?? 1) - 1)) + Number(r.confianca === 'seguro')
    return [{ id: q.id, area, assunto, dia: chaveDoDia(r.q), peso }]
  })
}

export function tamanhosRevisao(total: number) {
  return INTENSIDADES_ERROS.map((nivel) => ({
    ...nivel,
    quantidade: Math.min(total, nivel.teto, Math.ceil(total * nivel.proporcao)),
  }))
}

/** Cada sorteio favorece os erros prioritários e alterna assunto, área e data quando há variedade. */
export function sortearErrosAnteriores(erros: readonly ErroParaRefazer[], quantidade: number, aleatorio = Math.random): string[] {
  let restantes = [...new Map(erros.map((erro) => [erro.id, erro])).values()]
  const ids: string[] = []
  let anterior: ErroParaRefazer | undefined
  while (ids.length < quantidade && restantes.length > 0) {
    const outrosAssuntos = anterioresDistintos(restantes, anterior)
    const pesos = outrosAssuntos.map((erro) => erro.peso * (erro.area !== anterior?.area ? 2 : 1) * (erro.dia !== anterior?.dia ? 1.5 : 1))
    let sorte = aleatorio() * pesos.reduce((a, b) => a + b, 0)
    const i = pesos.findIndex((peso) => (sorte -= peso) < 0)
    const escolhida = outrosAssuntos[i < 0 ? outrosAssuntos.length - 1 : i]
    restantes = restantes.filter((erro) => erro.id !== escolhida.id)
    anterior = escolhida
    ids.push(escolhida.id)
  }
  return ids
}

function anterioresDistintos(restantes: ErroParaRefazer[], anterior?: ErroParaRefazer) {
  const outros = restantes.filter((erro) => erro.assunto !== anterior?.assunto)
  return outros.length ? outros : restantes
}
