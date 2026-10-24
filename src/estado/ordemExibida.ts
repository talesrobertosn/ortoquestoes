import { gravar, ler } from './armazenamento'

/**
 * Em que letra a certa apareceu da última vez em que a pessoa respondeu cada
 * questão. Só deste aparelho; serve para a próxima revisão pôr a certa em outra
 * letra. Sem registro, vale a letra da prova.
 */
const CHAVE = 'alternativas:ultimas'
const MAXIMO = 4000

export type UltimaExibida = { l: string; em: number }

export function lerUltimaExibida(id: string): UltimaExibida | null {
  return ler<Record<string, UltimaExibida>>(CHAVE, {})[id] ?? null
}

export function registrarExibida(id: string, letraDaCerta: string | null) {
  if (!letraDaCerta) return
  const mapa = ler<Record<string, UltimaExibida>>(CHAVE, {})
  mapa[id] = { l: letraDaCerta, em: Date.now() }
  const ids = Object.keys(mapa)
  if (ids.length > MAXIMO) {
    // Guarda só as mais recentes: as antigas voltam a contar a letra da prova.
    ids.sort((a, b) => mapa[b].em - mapa[a].em).slice(MAXIMO).forEach((x) => delete mapa[x])
  }
  gravar(CHAVE, mapa)
}
