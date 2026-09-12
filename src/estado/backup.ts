import { gravar, ler } from './armazenamento'
import type { RegistroQuestao } from './revisao'
import type { ResumoHistorico } from './sessao'

interface Backup {
  aplicativo: 'OrtoQuestões'
  versao: 1
  exportadoEm: string
  respondidas: Record<string, RegistroQuestao>
  favoritos: string[]
  notas: Record<string, string>
  historico: ResumoHistorico[]
}
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const numero = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0
const contador = (v: unknown) => numero(v) && Number.isInteger(v)
const chaveSegura = (s: string) => s.length > 0 && !['__proto__', 'constructor', 'prototype'].includes(s)

export function criarBackup(): Backup {
  return { aplicativo: 'OrtoQuestões', versao: 1, exportadoEm: new Date().toISOString(),
    respondidas: ler('respondidas', {}), favoritos: ler('favoritos', []), notas: ler('notas', {}), historico: ler('historico', []) }
}
/** Valida o arquivo inteiro antes de gravar qualquer dado. */
export function validarBackup(texto: string): Backup {
  const b: unknown = JSON.parse(texto)
  if (!objeto(b) || b.aplicativo !== 'OrtoQuestões' || b.versao !== 1 || typeof b.exportadoEm !== 'string' ||
    !objeto(b.respondidas) || !objeto(b.notas) || !Array.isArray(b.favoritos) || !Array.isArray(b.historico)) throw new Error('Arquivo de backup inválido ou de versão incompatível.')
  for (const [id, r] of Object.entries(b.respondidas)) {
    if (!chaveSegura(id) || !objeto(r) || ![true, false, null].includes(r.c as boolean | null) || !numero(r.q) ||
      ['tentativas', 'acertos', 'erros', 'sequencia'].some(k => r[k] !== undefined && !contador(r[k])) ||
      (r.proximaRevisao !== undefined && r.proximaRevisao !== null && !numero(r.proximaRevisao))) throw new Error('O histórico de respostas contém dados inválidos.')
  }
  if (!b.favoritos.every(v => typeof v === 'string' && chaveSegura(v)) ||
    !Object.entries(b.notas).every(([id, v]) => chaveSegura(id) && typeof v === 'string' && v.length <= 20000)) throw new Error('Favoritas ou anotações inválidas.')
  if (!b.historico.every(r => objeto(r) && typeof r.id === 'string' && typeof r.descricao === 'string' &&
    ['criadaEm', 'concluidaEm', 'total', 'respondidas', 'acertos', 'segundos'].every(k => numero(r[k])))) throw new Error('Histórico de sessões inválido.')
  return b as unknown as Backup
}
export function restaurarBackup(b: Backup) {
  // Um único envelope mantém uma cópia recuperável mesmo se a cota acabar durante a restauração.
  gravar('backup:anterior', criarBackup())
  gravar('respondidas', b.respondidas)
  gravar('favoritos', [...new Set(b.favoritos)])
  gravar('notas', b.notas)
  gravar('historico', b.historico)
}
