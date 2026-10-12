/**
 * Sorteio com semente (mulberry32). O estado do sorteio fica salvo na partida:
 * a mesma semente repete a mesma partida, o que serve aos testes e, no futuro,
 * ao Desafio do dia (o mesmo baralho para todos).
 */
export function sortear(semente: number): [valor: number, proxima: number] {
  const proxima = (semente + 0x6d2b79f5) >>> 0
  let t = proxima
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, proxima]
}

/** Embaralha sem mutar a lista original. */
export function embaralhar<T>(lista: readonly T[], semente: number): [T[], number] {
  const copia = lista.slice()
  let s = semente
  for (let i = copia.length - 1; i > 0; i--) {
    const [v, p] = sortear(s)
    s = p
    const j = Math.floor(v * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return [copia, s]
}

export function sementeNova(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
