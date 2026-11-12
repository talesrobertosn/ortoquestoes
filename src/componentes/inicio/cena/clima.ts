import { horaDeBrasilia } from './cenarios'

/**
 * O tempo dos cenários da página inicial (12/11/2026, pedido do Tales: "às vezes está nevando, às vezes não, e a neve
 * muda o cenário"). É um padrão para todos os cenários: quem declara `neve` em cenarios.ts recebe a nevasca.
 *
 * - O mesmo tempo para todo mundo: cada dia de Brasília tem a sua semente e dela saem de 0 a 3 nevascas, de 40 minutos
 *   a 2 h 30, em horários aleatórios (uma pode atravessar a meia-noite). Sem servidor e sem sorte individual.
 * - `nevando`: a nevasca está caindo agora (a intensidade sobe nos 10 primeiros minutos e cai nos 10 últimos).
 * - `coberto`: a neve ainda está no chão, durante a nevasca e por uma hora depois dela; é quando a pintura nevada
 *   aparece no lugar da de tempo firme.
 * - Prévia: ?clima=neve, ?clima=coberto ou ?clima=limpo no endereço.
 */
export type Clima = { nevando: boolean; coberto: boolean; intensidade: number }

const MIN = 60_000
const RAMPA = 10 * MIN
export const NEVE_NO_CHAO = 60 * MIN

function sementeDo(dia: string) {
  let seed = 2166136261
  for (const ch of `clima:v1:${dia}`) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0
  return () => {
    seed = (seed + 0x6D2B79F5) >>> 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** As nevascas de um dia, em milissegundos desde a meia-noite de Brasília: [[começo, fim], ...], em ordem. */
export function nevascasDoDia(dia: string): [number, number][] {
  const sorte = sementeDo(dia)
  const r = sorte()
  const n = r < 0.2 ? 0 : r < 0.55 ? 1 : r < 0.85 ? 2 : 3
  const lista: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const dur = (40 + sorte() * 110) * MIN
    const ini = Math.floor(sorte() * (24 * 60 * MIN - 20 * MIN))
    lista.push([ini, ini + dur])
  }
  return lista.sort((a, b) => a[0] - b[0])
}

function previa(): Clima | null {
  let pedido = ''
  try {
    pedido = new URLSearchParams(location.search).get('clima') ?? new URLSearchParams(location.hash.split('?')[1] ?? '').get('clima') ?? ''
  } catch { /* sem janela */ }
  if (pedido === 'neve') return { nevando: true, coberto: true, intensidade: 1 }
  if (pedido === 'coberto') return { nevando: false, coberto: true, intensidade: 0 }
  if (pedido === 'limpo') return { nevando: false, coberto: false, intensidade: 0 }
  return null
}

/** O tempo agora (o mesmo para todos). */
export function climaAgora(agora = new Date()): Clima {
  const forcado = previa()
  if (forcado) return forcado
  const { dia, inicio } = horaDeBrasilia(agora)
  const ontem = horaDeBrasilia(new Date(inicio - 1)).dia
  const t = agora.getTime()
  // As de ontem entram também: uma nevasca das 23h ainda pode estar caindo (ou no chão) depois da meia-noite.
  const janelas = [
    ...nevascasDoDia(ontem).map(([a, b]) => [a + inicio - 86_400_000, b + inicio - 86_400_000] as const),
    ...nevascasDoDia(dia).map(([a, b]) => [a + inicio, b + inicio] as const),
  ]
  let nevando = false, coberto = false, intensidade = 0
  for (const [a, b] of janelas) {
    if (t >= a && t < b) {
      nevando = true
      coberto = true
      intensidade = Math.max(intensidade, Math.min(1, (t - a) / RAMPA, (b - t) / RAMPA))
    } else if (t >= b && t < b + NEVE_NO_CHAO) coberto = true
  }
  return { nevando, coberto, intensidade: nevando ? Math.max(0.15, intensidade) : 0 }
}
