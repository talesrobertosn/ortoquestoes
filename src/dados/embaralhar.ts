/** Embaralhamento determinístico (Fisher-Yates com gerador semeado). */
export function embaralhar<T>(lista: T[], semente: number): T[] {
  const copia = lista.slice()
  let estado = semente >>> 0 || 1
  for (let i = copia.length - 1; i > 0; i--) {
    estado ^= estado << 13
    estado ^= estado >>> 17
    estado ^= estado << 5
    estado >>>= 0
    const j = estado % (i + 1)
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}
