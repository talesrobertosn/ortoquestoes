/**
 * Cripta seguindo o cronograma (15/10/2026). A Entrada calcula o assunto de hoje e deixa uma
 * rota de uso único na aba (sessionStorage); a Arena, ao abrir a partida, aplica essa rota com
 * o mesmo mecanismo do poder Mapa do especialista (Partida.rota). Partidas e saves não mudam
 * de formato: a rota já existe no motor e se esgota sozinha.
 */
import { CHAVE_ROTA_CRONOGRAMA } from './cronograma'
import type { RotaEstudo } from './motor/regras'

export function guardarRotaDoCronograma(rota: RotaEstudo) {
  try { window.sessionStorage.setItem(CHAVE_ROTA_CRONOGRAMA, JSON.stringify(rota)) } catch { /* sem armazenamento: a Cripta segue normal */ }
}

let lida: { bruta: string; em: number } | null = null

/** Lê e apaga a rota guardada; devolve a partida com ela (só na Cripta, nunca na Torre). */
export function aplicarRotaDoCronograma<P extends { modo: string; rota?: RotaEstudo | null }>(p: P): P {
  let bruta: string | null = null
  try { bruta = window.sessionStorage.getItem(CHAVE_ROTA_CRONOGRAMA); window.sessionStorage.removeItem(CHAVE_ROTA_CRONOGRAMA) } catch { return p }
  // o modo estrito do React chama o inicializador duas vezes: a segunda chamada, logo em seguida, reaproveita a leitura
  if (bruta) lida = { bruta, em: Date.now() }
  else if (lida && Date.now() - lida.em < 1500) bruta = lida.bruta
  if (!bruta || p.modo !== 'masmorra') return p
  try {
    const r = JSON.parse(bruta) as RotaEstudo
    if (r?.modo !== 'so' || typeof r.area !== 'string' || !Array.isArray(r.subtemas) || !(r.restam > 0)) return p
    return { ...p, rota: { modo: 'so', area: r.area, subtemas: r.subtemas.filter((t) => typeof t === 'string'), restam: Math.min(60, Math.round(r.restam)) } }
  } catch { return p }
}
