// Regra pura da parede de estantes (sem React), para o teste fixtures/testar_busca_biblioteca.mjs.

/** Medidas da estante (px de tela): largura de cada vaga de livro, laterais da estante e altura da prateleira. */
export const VAGA = 50
export const LATERAIS = 76
const MIN_VAGAS = 5

/**
 * Arruma as estantes em fileiras sem buracos (31/10/2026, "não quero prateleiras vazias"): cada obra ocupa o número de
 * vagas que a deixa com prateleiras cheias (25 livros em 2 prateleiras de 13, não 23 + 2), e as obras pequenas
 * preenchem o espaço que sobra ao lado das grandes. A ordem só muda para encaixar; "Mais cobrados" vem sempre primeiro.
 */
/** Uma fileira da parede: colunas lado a lado; cada coluna tem uma estante ou várias pequenas empilhadas. */
export type Fileira = Array<Array<{ id: string; vagas: number }>>

export function arrumarBaias(baias: Array<{ id: string; n: number }>, largura: number): Fileira[] {
  const max = Math.max(MIN_VAGAS, Math.floor((largura - LATERAIS) / VAGA))
  const largo = (v: number) => v * VAGA + LATERAIS
  const GAP = 16
  const vagasPara = (n: number, cabem: number) => Math.max(MIN_VAGAS, Math.ceil(n / Math.ceil(n / Math.max(MIN_VAGAS, cabem))))
  const medidas = baias.map((b) => ({ id: b.id, n: b.n, vagas: vagasPara(b.n, max) }))
  // Obras grandes (mais de uma prateleira) ganham ao lado uma coluna de obras pequenas empilhadas, tantas quantas
  // cabem na altura da grande (uma pequena por prateleira a mais): nada de estante pequena esticada com prateleiras vazias.
  // "Grande" é a que ocupa perto de meia parede ou mais: sozinha numa fileira, sobraria um vão enorme ao lado.
  const grandes = medidas.filter((m) => m.n >= max * 0.4)
  const pequenas = medidas.filter((m) => m.n < max * 0.4).sort((a, b) => a.vagas - b.vagas)
  const usadas = new Set<string>()
  const fileiraDe = new Map<string, Fileira>()
  // As maiores escolhem primeiro (têm mais prateleiras para acompanhar), mas cada grande fica com pelo menos uma pequena.
  const ordem = [...grandes].sort((a, b) => b.n - a.n)
  ordem.forEach((g, gi) => {
    const livres = pequenas.filter((p) => !usadas.has(p.id))
    const faltam = ordem.length - gi - 1
    if (livres.length) {
      const larguraColuna = largo(livres[0].vagas)
      const cabem = Math.floor((largura - larguraColuna - GAP - LATERAIS) / VAGA)
      g.vagas = vagasPara(g.n, cabem)
      const prateleiras = Math.ceil(g.n / g.vagas)
      const coluna = livres.filter((p) => largo(p.vagas) <= larguraColuna + VAGA).slice(0, Math.max(1, Math.min(prateleiras - 1, livres.length - faltam)))
      coluna.forEach((p) => usadas.add(p.id))
      const vagasColuna = Math.max(...coluna.map((p) => p.vagas))
      fileiraDe.set(g.id, [[{ id: g.id, vagas: g.vagas }], coluna.map((p) => ({ id: p.id, vagas: vagasColuna }))])
    } else fileiraDe.set(g.id, [[{ id: g.id, vagas: g.vagas }]])
    usadas.add(g.id)
  })
  // O resto (as pequenas e "Mais cobrados"), em fileiras cheias, na ordem; as fileiras das grandes entram no seu lugar.
  const fileiras: Fileira[] = []
  const resto = medidas.filter((m) => !usadas.has(m.id))
  for (const m of medidas) {
    if (fileiraDe.has(m.id)) { fileiras.push(fileiraDe.get(m.id)!); continue }
    if (!resto.includes(m)) continue
    resto.splice(resto.indexOf(m), 1)
    const fileira: Fileira = [[{ id: m.id, vagas: m.vagas }]]
    let usado = largo(m.vagas)
    for (let i = 0; i < resto.length;) {
      const w = largo(resto[i].vagas) + GAP
      if (usado + w <= largura) { usado += w; fileira.push([{ id: resto[i].id, vagas: resto[i].vagas }]); resto.splice(i, 1) } else i++
    }
    fileiras.push(fileira)
  }
  return fileiras
}

