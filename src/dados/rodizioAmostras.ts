/**
 * Rodízio das questões de amostra da vitrine do visitante ("Experimente agora").
 * A lista sai de scripts/gerar_amostras_inicio.py (dados copiados do acervo). Como as
 * frases do título: cada abertura da página traz a próxima de uma ordem embaralhada fixa,
 * guardada no aparelho, e só depois de passar por todas uma questão se repete.
 */
import AMOSTRAS from './amostrasInicio.json'

export interface ResumoAmostra { id: string; origem: string; simulado: boolean; tema: string }

export interface AmostraInicio extends ResumoAmostra {
  temaSlug: string
  subtema: string | null
  enunciado: string
  imagem: { arquivo: string; legenda: string | null; largura: number; altura: number } | null
  alternativas: Array<{ letra: string; texto: string; porque: string }>
  gabarito: string
}

export const AMOSTRAS_INICIO: ResumoAmostra[] = AMOSTRAS

const CHAVE = 'oq-amostra-inicio'

/** Ordem embaralhada, mas fixa, para o rodízio não repetir antes de passar por todas. */
const ORDEM = (() => {
  const indices = AMOSTRAS_INICIO.map((_, i) => i)
  let semente = 11
  for (let i = indices.length - 1; i > 0; i--) {
    semente = (semente * 9301 + 49297) % 233280
    const j = Math.floor((semente / 233280) * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
})()

/** A próxima amostra do rodízio; sem armazenamento (janela anônima), uma sorteada. */
export function proximaAmostraInicio(): ResumoAmostra {
  try {
    const salvo = localStorage.getItem(CHAVE)
    const anterior = salvo === null ? NaN : Number(salvo)
    const posicao = Number.isInteger(anterior) && anterior >= 0 ? (anterior + 1) % ORDEM.length : Math.floor(Math.random() * ORDEM.length)
    localStorage.setItem(CHAVE, String(posicao))
    return AMOSTRAS_INICIO[ORDEM[posicao]]
  } catch {
    return AMOSTRAS_INICIO[Math.floor(Math.random() * AMOSTRAS_INICIO.length)]
  }
}

/** Uma escolha por carregamento da página (o StrictMode e as remontagens não avançam o rodízio). */
let daVez: ResumoAmostra | null = null
export function amostraDaVez(): ResumoAmostra {
  return (daVez ??= proximaAmostraInicio())
}

/** Endereços de criar conta que, depois do cadastro, voltam para esta questão ou para o treino do tema. */
export function destinosDaAmostra(a: Pick<AmostraInicio, 'id' | 'temaSlug' | 'subtema' | 'simulado'>) {
  const conta = (voltar: string) => `/conta?modo=criar&voltar=${encodeURIComponent(voltar)}`
  const subtema = a.subtema ? `&subtemas=${encodeURIComponent(a.subtema)}` : ''
  return {
    comentario: conta(`/questao/${a.id}`),
    maisComoEsta: conta(`/treinar?temas=${encodeURIComponent(a.temaSlug)}${subtema}&limite=10`),
  }
}
