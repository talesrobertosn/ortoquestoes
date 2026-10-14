/** A música acompanha o clima sem alterar os volumes escolhidos pela pessoa. */
export function misturaBiblioteca(clima: string | null, tranquilo = false) {
  const chuva = tranquilo || clima === 'chuva' || clima === 'tempestade'
  return { corte: chuva ? 1600 : clima === 'nevoa' ? 3600 : 22000, coral: clima === 'gloria' && !tranquilo }
}

/** Posição da camada vocal no mesmo laço da música principal. */
export function faseDaFaixa(inicio: number, agora: number, duracao: number) {
  return Number.isFinite(duracao) && duracao > 0 ? Math.max(0, agora - inicio) % duracao : 0
}

/** Corrige a emenda após decodificação, inclusive resíduos de MP3/Opus. */
export function suavizarEmenda(dados: Float32Array, sampleRate: number) {
  const n = Math.min(dados.length, Math.max(2, Math.round(sampleRate * .014)))
  if (n < 2) return
  const primeiro = dados[0]
  for (let i = 0; i < n; i++) {
    const peso = (1 - Math.cos(Math.PI * i / (n - 1))) / 2
    const k = dados.length - n + i
    dados[k] = dados[k] * (1 - peso) + primeiro * peso
  }
}
