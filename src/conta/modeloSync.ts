/** Documentos por questão: alterações independentes nunca substituem o progresso inteiro. */
export const TIPOS_SYNC = ['respondidas', 'favoritos', 'notas', 'historico'] as const
export type TipoSync = typeof TIPOS_SYNC[number]
export interface Documento {
  tipo: TipoSync
  item: string
  valor: unknown
  versao: number
  operacao: string
}
export interface Alteracao {
  tipo: TipoSync
  item: string
  valor: unknown
  base: number
  operacao: string
}
export interface EstadoSync {
  cursor: number
  reinicio: number
  versoes: Record<string, number>
  pendentes: Record<string, Alteracao>
  conflitos: Record<string, Documento>
}
export const estadoVazio = (): EstadoSync => ({ cursor: 0, reinicio: 0, versoes: {}, pendentes: {}, conflitos: {} })
export const identificador = (tipo: TipoSync, item: string) => `${tipo}/${item}`
export const ehTipoSync = (chave: string): chave is TipoSync => TIPOS_SYNC.includes(chave as TipoSync)
export function itens(tipo: TipoSync, valor: unknown): Record<string, unknown> {
  if (tipo === 'favoritos') return Object.fromEntries((Array.isArray(valor) ? valor : []).map(id => [id, true]))
  if (tipo === 'historico') return Object.fromEntries((Array.isArray(valor) ? valor : []).map(h => [h.id, h]))
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : {}
}
export function deItens(tipo: TipoSync, mapa: Record<string, unknown>): unknown {
  if (tipo === 'favoritos') return Object.keys(mapa).filter(id => mapa[id] === true)
  if (tipo === 'historico') return Object.values(mapa).filter(Boolean).sort((a, b) => (b as { concluidaEm: number }).concluidaEm - (a as { concluidaEm: number }).concluidaEm).slice(0, 50)
  return Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== null))
}
export function registrarAlteracoes(estado: EstadoSync, tipo: TipoSync, antes: unknown, depois: unknown) {
  const a = itens(tipo, antes), b = itens(tipo, depois)
  for (const item of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const valor = b[item] ?? null
    if (JSON.stringify(a[item] ?? null) === JSON.stringify(valor)) continue
    const id = identificador(tipo, item)
    estado.pendentes[id] = { tipo, item, valor, base: estado.pendentes[id]?.base ?? estado.versoes[id] ?? 0, operacao: crypto.randomUUID() }
  }
}
/** Uma resposta à rede só confirma a operação enviada; edições posteriores continuam pendentes. */
export function receberDocumento(estado: EstadoSync, doc: Documento, enviada?: Alteracao): boolean {
  const id = identificador(doc.tipo, doc.item)
  if (doc.versao < (estado.versoes[id] ?? 0)) return false
  const pendente = estado.pendentes[id]
  estado.versoes[id] = doc.versao
  if (pendente) {
    if (doc.operacao === pendente.operacao) {
      delete estado.pendentes[id]; delete estado.conflitos[id]
      return true
    }
    if (enviada && doc.operacao === enviada.operacao) {
      pendente.base = doc.versao
      delete estado.conflitos[id]
      return false
    }
    if (pendente.base !== doc.versao) estado.conflitos[id] = doc
    return false
  }
  delete estado.conflitos[id]
  return true
}
