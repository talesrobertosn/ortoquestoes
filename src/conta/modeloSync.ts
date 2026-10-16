import { gerarId } from '../util/id'
import { juntarBiblioteca } from '../biblioteca/juntar'
/** Documentos por questão: alterações independentes nunca substituem o progresso inteiro. */
export const TIPOS_SYNC = ['respondidas', 'favoritos', 'notas', 'historico', 'biblioteca'] as const
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
  /** Itens que o servidor recusou mesmo enviados sozinhos: saem da fila para não travar o resto. */
  rejeitados?: Record<string, { tipo: TipoSync; item: string; valor: unknown; erro: string; em: number }>
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
    estado.pendentes[id] = { tipo, item, valor, base: estado.pendentes[id]?.base ?? estado.versoes[id] ?? 0, operacao: gerarId() }
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
    if (pendente.base !== doc.versao) return resolverConflito(estado, id, doc)
    return false
  }
  delete estado.conflitos[id]
  return true
}

/** Uma tentativa no histórico de uma questão (ver estado/revisao.ts). */
interface Tentativa { em: number; correta: boolean | null; confianca?: string }
interface RegistroSync { c: boolean | null; q: number; tentativas?: number; acertos?: number; erros?: number; p?: string; historico?: Tentativa[]; [campo: string]: unknown }
const ehRegistro = (v: unknown): v is RegistroSync => !!v && typeof v === 'object' && !Array.isArray(v) && 'q' in (v as object)
const chaveTentativa = (t: Tentativa) => `${t.em}|${t.correta}`

/**
 * Junta duas versões da mesma questão respondida em aparelhos diferentes sem
 * perder nenhuma tentativa. A base é a versão com a resposta mais recente (o
 * estado da revisão segue a última resposta); as tentativas que só a outra
 * versão conhece entram no histórico e nos contadores. Relógios diferentes
 * entre aparelhos só podem trocar qual das duas é "a última", nunca apagar uma.
 */
export function juntarRespondida(a: unknown, b: unknown): unknown {
  if (!ehRegistro(a)) return ehRegistro(b) ? b : a
  if (!ehRegistro(b)) return a
  const [novo, velho] = Number(b.q) > Number(a.q) ? [b, a] : [a, b]
  const conhecidas = new Set((novo.historico ?? []).map(chaveTentativa))
  // Registro antigo, sem histórico: a própria resposta é a única tentativa conhecida.
  const doVelho = velho.historico?.length ? velho.historico : [{ em: velho.q, correta: velho.c }]
  const extras = doVelho.filter(t => !conhecidas.has(chaveTentativa(t)) && t.em !== novo.q)
  if (!extras.length) return novo
  const historico = [...(novo.historico ?? [{ em: novo.q, correta: novo.c }]), ...extras].sort((x, y) => x.em - y.em).slice(-8)
  const primeiraMaisAntiga = (velho.historico?.[0]?.em ?? velho.q) < (novo.historico?.[0]?.em ?? novo.q)
  return {
    ...novo,
    tentativas: (novo.tentativas ?? 1) + extras.length,
    acertos: (novo.acertos ?? Number(novo.c === true)) + extras.filter(t => t.correta === true).length,
    erros: (novo.erros ?? Number(novo.c === false)) + extras.filter(t => t.correta === false).length,
    ...(primeiraMaisAntiga && velho.p ? { p: velho.p } : {}),
    historico,
  }
}

/**
 * Mesmo item alterado em dois aparelhos. Em vez de travar a fila esperando uma
 * decisão manual (que quase ninguém vê), resolve sozinho: na resposta de
 * questão, junta as duas (nenhuma tentativa se perde) e reenvia a junção sobre
 * a versão do servidor; nos demais tipos vale a deste aparelho, que é
 * reenviada sobre a versão atual do servidor. Retorna true quando o documento
 * remoto (possivelmente já juntado, em `doc.valor`) deve ser aplicado localmente.
 */
export function resolverConflito(estado: EstadoSync, id: string, doc: Documento): boolean {
  const pendente = estado.pendentes[id]
  delete estado.conflitos[id]
  if (!pendente) return true
  if (doc.tipo === 'respondidas' && doc.valor !== null && pendente.valor !== null) {
    const junto = juntarRespondida(doc.valor, pendente.valor)
    if (JSON.stringify(junto) === JSON.stringify(doc.valor)) {
      delete estado.pendentes[id]
      return true
    }
    pendente.valor = junto
    pendente.base = doc.versao
    pendente.operacao = gerarId()
    doc.valor = junto
    return true
  }
  // Biblioteca (marcações, notas, posição de leitura): junta as duas versões sem descartar
  // nenhuma nota (a do outro aparelho fica guardada para a pessoa escolher). Ver biblioteca/juntar.ts.
  if (doc.tipo === 'biblioteca' && doc.valor !== null && pendente.valor !== null) {
    const junto = juntarBiblioteca(doc.valor, pendente.valor)
    if (JSON.stringify(junto) === JSON.stringify(doc.valor)) {
      delete estado.pendentes[id]
      return true
    }
    pendente.valor = junto
    pendente.base = doc.versao
    pendente.operacao = gerarId()
    doc.valor = junto
    return true
  }
  pendente.base = doc.versao
  pendente.operacao = gerarId()
  return false
}
