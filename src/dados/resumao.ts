import type { Nivel } from './incidencia'

/** Formato de public/acervo/resumao.json (scripts/gerar_resumao.py). */
export interface FraseResumao { texto: string; id: string; /** "TEOT 2019", "OrtoQuestões Simulados" (arquivos gerados antes de 15/10/2026 não têm). */ origem?: string }
export interface FocoResumao { nome: string; nivel: Nivel; /** Questões de prova do assunto no acervo. */ n?: number; frases: FraseResumao[] }
export interface AreaResumao { nome: string; slug: string; focos: FocoResumao[] }
export interface DadosResumao { geradoEm: string; total: number; areas: AreaResumao[] }

/** Minúsculas e sem acento: "fratura", "Fratura" e "fratúra" se encontram na busca. */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Termos da busca (palavras com 2 letras ou mais, já normalizados). */
export function termosDaBusca(busca: string): string[] {
  return normalizarBusca(busca).split(/\s+/).map((t) => t.replace(/\*/g, '')).filter((t) => t.length >= 2)
}

export interface FiltroResumao { busca: string; soMaxima: boolean }

/**
 * Recorta o resumão pela busca e pela prioridade. Cada termo precisa aparecer
 * na frase, no nome do assunto ou no da área (assim "escafoide pseudartrose"
 * acha a frase certa). Assuntos e áreas sem frase sobrando somem.
 */
export function filtrarResumao(areas: AreaResumao[], filtro: FiltroResumao): AreaResumao[] {
  const termos = termosDaBusca(filtro.busca)
  if (!termos.length && !filtro.soMaxima) return areas
  const saida: AreaResumao[] = []
  for (const area of areas) {
    const nomeArea = normalizarBusca(area.nome)
    const focos: FocoResumao[] = []
    for (const foco of area.focos) {
      if (filtro.soMaxima && foco.nivel < 4) continue
      const contexto = `${nomeArea} ${normalizarBusca(foco.nome)}`
      const frases = termos.length
        ? foco.frases.filter((f) => { const alvo = `${contexto} ${normalizarBusca(f.texto.replace(/\*\*/g, ''))}`; return termos.every((t) => alvo.includes(t)) })
        : foco.frases
      if (frases.length) focos.push({ ...foco, frases })
    }
    if (focos.length) saida.push({ ...area, focos })
  }
  return saida
}

export const contarFrases = (areas: AreaResumao[]) => areas.reduce((s, a) => s + a.focos.reduce((x, f) => x + f.frases.length, 0), 0)

/** Minutos de leitura atenta (cerca de 130 palavras por minuto, texto técnico), no mínimo 1. */
export function minutosDeLeitura(area: AreaResumao): number {
  const palavras = area.focos.reduce((s, f) => s + f.frases.reduce((x, fr) => x + fr.texto.split(/\s+/).length, 0), 0)
  return Math.max(1, Math.round(palavras / 130))
}

/** A próxima área ainda não lida depois de `atual` (dando a volta), ou a primeira não lida. */
export function proximaNaoLida(areas: AreaResumao[], lidas: string[], atual?: string): AreaResumao | null {
  const i = atual ? areas.findIndex((a) => a.slug === atual) : -1
  const ordem = [...areas.slice(i + 1), ...areas.slice(0, Math.max(0, i + 1))]
  return ordem.find((a) => !lidas.includes(a.slug) && a.slug !== atual) ?? null
}

/** Link do treino de um assunto do resumão (o nome do assunto é o subtema do acervo). */
export const consultaTreinoAssunto = (assunto: string) => `/treinar?subtemas=${encodeURIComponent(assunto)}&situacao=naoRespondidas`
export const consultaTreinoArea = (slug: string) => `/treinar?temas=${slug}&situacao=naoRespondidas`
