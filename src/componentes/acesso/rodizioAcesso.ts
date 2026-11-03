import RESUMO from '../../dados/amostrasAcesso.json'
import type { AmostraInicio } from '../../dados/rodizioAmostras'

/*
 * O sorteio da questão da tela de entrar (01/11/2026). As questões saem de scripts/gerar_amostras_acesso.py: reais,
 * de várias provas, com gabarito sem alerta e o porquê de cada alternativa tirado do comentário. A lista curta vem com
 * a página; a questão completa só é baixada quando é a da vez. Cada carregamento (F5) e cada "Outra questão" sorteiam
 * uma nova, sem repetir as últimas que este aparelho viu; re-renderizar a página não troca nada.
 */
export type ResumoAcesso = { id: string; origem: string; prova: string; tema: string }
export type AmostraAcesso = AmostraInicio & { prova: string }

export const AMOSTRAS_ACESSO: readonly ResumoAcesso[] = RESUMO
const CHAVE = 'oq:amostra-acesso:recentes'
const LEMBRAR = 8

const CARREGAR = import.meta.glob<AmostraAcesso>('../../dados/amostrasAcesso/*.json', { import: 'default' })
export function carregarAmostraAcesso(id: string): Promise<AmostraAcesso> {
  const ler = CARREGAR[`../../dados/amostrasAcesso/${id}.json`]
  return ler ? ler() : Promise.reject(new Error(`Amostra ${id} não encontrada`))
}

function recentes(): string[] {
  try { const r = JSON.parse(localStorage.getItem(CHAVE) ?? '[]'); return Array.isArray(r) ? r : [] } catch { return [] }
}

/** Sorteia uma questão que não esteja entre as últimas vistas (nem a atual) e a guarda como vista. */
export function sortearAmostraAcesso(atual?: string): ResumoAcesso {
  const vistas = new Set([...recentes(), ...(atual ? [atual] : [])])
  const livres = AMOSTRAS_ACESSO.filter((a) => !vistas.has(a.id))
  const opcoes = livres.length ? livres : AMOSTRAS_ACESSO.filter((a) => a.id !== atual)
  const escolhida = opcoes[Math.floor(Math.random() * opcoes.length)]
  try { localStorage.setItem(CHAVE, JSON.stringify([escolhida.id, ...recentes().filter((id) => id !== escolhida.id)].slice(0, LEMBRAR))) } catch { /* sem armazenamento */ }
  return escolhida
}

/** A questão desta abertura da página: sorteada uma vez por carregamento (o StrictMode e as remontagens não sorteiam de novo). */
let daVez: ResumoAcesso | null = null
export function amostraAcessoDaVez(): ResumoAcesso {
  return (daVez ??= sortearAmostraAcesso())
}
export function trocarAmostraAcessoDaVez(atual: string): ResumoAcesso {
  return (daVez = sortearAmostraAcesso(atual))
}
