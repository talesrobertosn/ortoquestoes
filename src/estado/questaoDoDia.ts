import { useEffect, useState } from 'react'
import { carregarTema } from '../dados/acervo'
import type { Indice, Questao } from '../dados/tipos'
import { chaveDia } from './limiteDiario'

/** Cabe no cartão e na imagem de 1080×1350 sem letra miúda. */
const LIMITE_CARACTERES = 620

function semente(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function embaralhado<T>(lista: T[], s: number): T[] {
  const copia = [...lista]
  let x = s || 1
  for (let i = copia.length - 1; i > 0; i--) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0
    const j = x % (i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/**
 * A mesma questão para todo mundo no mesmo dia (horário de Brasília): o tema
 * gira conforme o dia, e dentro dele vale a primeira questão comentada, sem
 * figura e curta o bastante para caber na imagem do Instagram.
 */
export async function escolherQuestaoDoDia(indice: Indice, dia = chaveDia()): Promise<Questao | null> {
  const s = semente('questao-do-dia:' + dia)
  const temas = embaralhado(indice.temas.map((_, i) => i), s)
  for (const t of temas.slice(0, 3)) {
    const candidatas = new Set(indice.questoes.filter((q) => q.t === t && q.c === 1 && q.an === 0 && q.img === 0).map((q) => q.id))
    if (!candidatas.size) continue
    const questoes = await carregarTema(indice.temas[t].slug)
    const validas = questoes.filter((q) => candidatas.has(q.id) && !q.figuraPendente && q.gabarito &&
      q.enunciado.length + q.alternativas.reduce((n, a) => n + a.texto.length, 0) <= LIMITE_CARACTERES)
    if (validas.length) return embaralhado(validas, s)[0]
  }
  return null
}

export function usarQuestaoDoDia(indice: Indice | null) {
  const [questao, definirQuestao] = useState<Questao | null | undefined>(undefined)
  useEffect(() => {
    if (!indice) return
    let vivo = true
    escolherQuestaoDoDia(indice).then((q) => vivo && definirQuestao(q)).catch(() => vivo && definirQuestao(null))
    return () => { vivo = false }
  }, [indice])
  return questao
}
