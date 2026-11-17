import type { EstadoSessao } from '../dados/tipos'

/** A sessão tem sua própria identidade; respostas de outros treinos não a preenchem. */
export function sessaoSincronizavel(valor: unknown): valor is EstadoSessao {
  const s = valor as EstadoSessao | null
  return !!s && typeof s.id === 'string' && Array.isArray(s.ids) && !s.nacional
}
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Junção em três vias: só os campos editados aqui substituem os do servidor. */
export function juntarSessao(remota: unknown, local: unknown, anterior: unknown): unknown {
  const r = remota as EstadoSessao | null, l = local as EstadoSessao | null
  const a = anterior as EstadoSessao | null | undefined
  if (!l) return r && a && r.id !== a.id ? r : null
  // Um aparelho offline editando o treino anterior não reabre uma sessão encerrada
  // nem substitui o treino novo. Uma criação explícita aqui pode substituí-lo.
  if (!r || r.id !== l.id) return a?.id === l.id || anterior === undefined ? r : l
  const base = a?.id === l.id ? a : undefined
  const mapa = <T,>(servidor: Record<string, T> = {}, aqui: Record<string, T> = {}, antes: Record<string, T> = {}) => {
    const junto = { ...servidor }
    for (const k of new Set([...Object.keys(aqui), ...Object.keys(antes)])) {
      if (igual(aqui[k], antes[k])) continue
      if (k in aqui) junto[k] = aqui[k]
      else delete junto[k]
    }
    return junto
  }
  const revisar = new Set(r.revisar)
  for (const id of new Set([...l.revisar, ...(base?.revisar ?? [])])) {
    if (l.revisar.includes(id) === (base?.revisar.includes(id) ?? false)) continue
    if (l.revisar.includes(id)) revisar.add(id); else revisar.delete(id)
  }
  return {
    ...r,
    respostas: mapa(r.respostas, l.respostas, base?.respostas),
    ordens: mapa(r.ordens, l.ordens, base?.ordens),
    riscadas: mapa(r.riscadas, l.riscadas, base?.riscadas),
    revisar: [...revisar],
    posicao: base && l.posicao === base.posicao ? r.posicao : l.posicao,
    // Conclusão é terminal, mesmo quando uma resposta offline chega depois.
    concluidaEm: r.concluidaEm ?? l.concluidaEm,
  }
}
