import { desbloqueado, EMBLEMAS, valorDe, type Emblema, type Metricas, type NivelMedalha } from '../estado/conquistas'
import { perfilDoEmblema, unidadeRestante, type CenarioConquista } from './catalogoAvisos'

export { CHAVE_AVISOS } from './chaves'
export const PAUSA_METAS = 5 * 60_000
export const MAX_METAS_POR_CONTEXTO = 2
export interface EstadoAvisos {
  conhecidas: string[]
  pendentes: string[]
  geracao: number
  silenciado?: boolean
  metasPorContexto: Record<string, string[]>
  metas: { contexto: string; ids: string[]; em: number; atividades: number }
}
export interface MetaProxima { emblema: Emblema; valor: number; falta: number; texto: string; distante: boolean }
export const PESO_NIVEL: Record<NivelMedalha, number> = { bronze: 1, prata: 2, ouro: 3, esmeralda: 4, lendario: 5, mitico: 6 }

export function estadoInicial(geracao = 0): EstadoAvisos {
  return { conhecidas: [], pendentes: [], geracao, metasPorContexto: {}, metas: { contexto: '', ids: [], em: 0, atividades: 0 } }
}
export function lerEstadoAvisos(valor: unknown, geracao: number): EstadoAvisos | null {
  const e = valor as EstadoAvisos | null
  if (!e || e.geracao !== geracao || !Array.isArray(e.conhecidas) || !Array.isArray(e.pendentes)) return null
  const ids = new Set(EMBLEMAS.map(b => b.id))
  return { ...estadoInicial(geracao), silenciado: e.silenciado === true, metasPorContexto: Object.fromEntries(Object.entries(e.metasPorContexto ?? {}).filter(([, ids]) => Array.isArray(ids) && ids.every(id => typeof id === 'string')).slice(-50)), conhecidas: e.conhecidas.filter(id => typeof id === 'string'), pendentes: e.pendentes.filter(id => ids.has(id)),
    metas: e.metas && typeof e.metas.contexto === 'string' && Array.isArray(e.metas.ids) && Number.isFinite(e.metas.em) && Number.isFinite(e.metas.atividades) ? e.metas : estadoInicial().metas }
}
/** A primeira carga importa o passado em silêncio. Depois, cada emblema novo entra na fila uma vez. */
export function reconciliarAvisos(estado: EstadoAvisos | null, metricas: Metricas, geracao = 0): EstadoAvisos {
  const atuais = EMBLEMAS.filter(e => desbloqueado(e, metricas)).map(e => e.id)
  if (!estado || estado.geracao !== geracao) return { ...estadoInicial(geracao), conhecidas: atuais }
  if (estado.silenciado) return { ...estado, silenciado: false, conhecidas: [...new Set([...estado.conhecidas, ...atuais])], pendentes: [] }
  const conhecidas = new Set(estado.conhecidas)
  const novas = atuais.filter(id => !conhecidas.has(id))
  return { ...estado, conhecidas: [...new Set([...estado.conhecidas, ...atuais])], pendentes: [...new Set([...estado.pendentes, ...novas])] }
}
/** Um único cartão agrupa desbloqueios simultâneos, mostrando o mais raro. */
export function loteConquistado(estado: EstadoAvisos, metricas: Metricas): Emblema[] {
  const ids = new Set(estado.pendentes)
  return EMBLEMAS.filter(e => ids.has(e.id) && desbloqueado(e, metricas)).sort((a, b) => PESO_NIVEL[b.nivel] - PESO_NIVEL[a.nivel] || b.minimo - a.minimo)
}
export function contextoDaRota(rota: string, sessaoId?: string, dia = ''): { id: string; cenarios: CenarioConquista[] } | null {
  if (/^\/(sessao|questao|revisao)(\/|$)/.test(rota)) return { id: sessaoId ? `sessao:${sessaoId}` : `questoes:${dia}`, cenarios: ['questoes', 'revisao', 'comunidade'] }
  if (/^\/resumos(\/|$)/.test(rota)) return { id: `biblioteca:${dia}`, cenarios: ['biblioteca'] }
  if (/^\/flashcards(\/|$)/.test(rota)) return { id: `flashcards:${dia}`, cenarios: ['flashcards'] }
  return null
}
export function podeApresentar(rota: string, s: { simulado?: boolean; nacional?: string; limiteSegundos?: number | null; concluidaEm?: number | null } | null, visivel: boolean, ocupado: boolean): boolean {
  if (!visivel || ocupado || /^\/(admin|conta|entrar|assinatura|emails|termos|condicoes-assinatura|contato|simulado-nacional)(\/|$)/.test(rota)) return false
  if (s && !s.concluidaEm && (s.simulado || s.nacional || (s.limiteSegundos ?? 0) > 0)) return false
  // O combate e os diálogos de Flashcards têm seus próprios controles; a fila espera a central.
  if (/^\/flashcards\//.test(rota)) return false
  return true
}
/** Metas atuais e maiores: até os últimos 10%, entre 1 e 100 ações, sem percentuais ou requisitos ocultos. */
export function escolherMeta(antes: Metricas, agora: Metricas, estado: EstadoAvisos, contexto: { id: string; cenarios: CenarioConquista[] }, instante: number, atividades: number): MetaProxima | null {
  const m = estado.metas
  if (instante >= m.em && instante - m.em < PAUSA_METAS) return null
  const idsMostrados = estado.metasPorContexto[contexto.id] ?? (m.contexto === contexto.id ? m.ids : [])
  if (idsMostrados.length >= MAX_METAS_POR_CONTEXTO || (m.em > 0 && atividades - m.atividades < 10)) return null
  const opcoes: MetaProxima[] = []
  const familias = new Set<string>()
  for (const e of EMBLEMAS) {
    const perfil = perfilDoEmblema(e)
    if (!perfil.acompanhar || !contexto.cenarios.includes(perfil.cenario) || desbloqueado(e, agora)) continue
    // Só o primeiro nível que falta em cada família. A conta precisa ter avançado agora.
    if (familias.has(e.familia)) continue
    familias.add(e.familia)
    if (idsMostrados.includes(e.id)) continue
    const valor = valorDe(e, agora), anterior = valorDe(e, antes), falta = e.minimo - valor
    if (!Number.isFinite(valor) || valor <= anterior || valor <= 0 || falta <= 0 || falta > Math.min(100, Math.max(3, Math.floor(e.minimo * .1))) || valor / e.minimo < .8) continue
    opcoes.push({ emblema: e, valor, falta, texto: unidadeRestante(e, falta), distante: falta > 10 })
  }
  // Mais próximo primeiro, com qualidade/revisão antes de volume quando empata.
  return opcoes.sort((a, b) => a.falta / a.emblema.minimo - b.falta / b.emblema.minimo || Number(b.emblema.familia === 'revisoes' || b.emblema.familia === 'redencao') - Number(a.emblema.familia === 'revisoes' || a.emblema.familia === 'redencao'))[0] ?? null
}

/** Confere uma meta que ficou esperando a resposta ou o fechamento de outro aviso. */
export function atualizarMeta(meta: MetaProxima, metricas: Metricas, estado: EstadoAvisos, contexto: { id: string; cenarios: CenarioConquista[] }, instante: number, atividades: number): MetaProxima | null {
  const e = meta.emblema, perfil = perfilDoEmblema(e), m = estado.metas
  if (!perfil.acompanhar || !contexto.cenarios.includes(perfil.cenario) || desbloqueado(e, metricas)) return null
  if (instante >= m.em && instante - m.em < PAUSA_METAS) return null
  const idsMostrados = estado.metasPorContexto[contexto.id] ?? (m.contexto === contexto.id ? m.ids : [])
  if (idsMostrados.includes(e.id) || idsMostrados.length >= MAX_METAS_POR_CONTEXTO || (m.em > 0 && atividades - m.atividades < 10)) return null
  const valor = valorDe(e, metricas), falta = e.minimo - valor
  if (!Number.isFinite(valor) || falta <= 0 || falta > Math.min(100, Math.max(3, Math.floor(e.minimo * .1))) || valor / e.minimo < .8) return null
  return { ...meta, valor, falta, texto: unidadeRestante(e, falta), distante: falta > 10 }
}
