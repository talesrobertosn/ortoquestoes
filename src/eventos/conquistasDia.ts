/**
 * Conquistas do dia (Tales, 26/10/2026): pequenos cartões em pixel art, no tom de jogo aconchegante
 * mas de quem trabalha com ortopedia. As questões de hoje consolidam uma fratura no raio-X (traço,
 * calo mole, ponte óssea, consolidada); o acerto alto é a fixação estável (placa e parafusos); a
 * virada depois de erros é o reflexo recuperado (martelo de reflexo); os dias seguidos são o plantão
 * em dia (caneca) e a escala cumprida (prancheta). Poucas e com sentido, para nunca virar spam:
 * quando várias valem juntas, só a mais especial aparece (as outras ficam guardadas em silêncio),
 * no máximo três cartões por dia e com intervalo entre eles. Diferentes dos emblemas da página de
 * Conquistas, que são difíceis e permanentes. Regras puras: o histórico e o relógio entram por argumento.
 */
import { chaveDoDia, somarDias } from '../util/dia'

export type ArteConquista = 'fratura' | 'caloMole' | 'ponteOssea' | 'consolidada' | 'placa' | 'martelo' | 'caneca' | 'prancheta'
/** O fundo do cartão: azul-ardósia do raio-X, aço do instrumental, verde do plantão. */
export type TomConquista = 'raiox' | 'metal' | 'plantao'
export interface ConquistaDia { id: string; titulo: string; texto: string; arte: ArteConquista; tom: TomConquista; /** a linha pequena: "25 questões hoje" */ marca: string }

/** Limites anti-spam: cartões por dia neste aparelho e o intervalo mínimo entre dois. */
export const MAXIMO_POR_DIA = 3
export const INTERVALO_MINIMO = 15 * 60_000

type Registro = { c?: boolean | null; q?: number; historico?: Array<{ em: number; correta?: boolean | null }> }
export interface EstudoDoDia {
  /** respostas de hoje (cada vez que respondeu conta) */
  feitas: number
  certas: number
  /** respostas certas ou erradas (as sem gabarito ou puladas ficam de fora do acerto) */
  validas: number
  /** maior sequência de acertos hoje */
  seguidas: number
  /** errou três ou mais seguidas e logo acertou três ou mais seguidas */
  virada: boolean
  /** áreas diferentes (trauma, mão, coluna...) hoje */
  areas: number
  /** dias seguidos, até hoje, com 10 ou mais respostas */
  diasSeguidos: number
}

export const MINIMO_DIA_FIRME = 10
const area = (id: string) => id.replace(/-\d+$/, '')

/** O estudo de hoje, a partir do registro de respostas (o histórico de cada questão, ou a última resposta). */
export function estudoDoDia(registros: Record<string, Registro | undefined>, agora: number): EstudoDoDia {
  const hoje = chaveDoDia(agora)
  const porDia = new Map<string, number>()
  const deHoje: Array<{ em: number; correta: boolean | null; area: string }> = []
  for (const [id, r] of Object.entries(registros)) {
    if (!r) continue
    const respostas = r.historico?.length ? r.historico : r.q !== undefined ? [{ em: r.q, correta: r.c ?? null }] : []
    const vistos = new Set<number>()
    for (const h of respostas) {
      if (!Number.isFinite(h.em) || vistos.has(h.em)) continue
      vistos.add(h.em)
      const dia = chaveDoDia(h.em)
      porDia.set(dia, (porDia.get(dia) ?? 0) + 1)
      if (dia === hoje) deHoje.push({ em: h.em, correta: h.correta ?? null, area: area(id) })
    }
  }
  deHoje.sort((a, b) => a.em - b.em)
  let certas = 0, validas = 0, seguidas = 0, atual = 0, erros = 0, acertosDepois = 0, virada = false
  for (const h of deHoje) {
    if (h.correta === null) continue
    validas++
    if (h.correta) {
      certas++; atual++; seguidas = Math.max(seguidas, atual)
      if (erros >= 3) { acertosDepois++; if (acertosDepois >= 3) virada = true } else { erros = 0; acertosDepois = 0 }
    } else {
      atual = 0
      erros = acertosDepois > 0 ? 1 : erros + 1
      acertosDepois = 0
    }
  }
  let diasSeguidos = 0
  if ((porDia.get(hoje) ?? 0) >= MINIMO_DIA_FIRME) {
    diasSeguidos = 1
    for (let d = somarDias(hoje, -1); (porDia.get(d) ?? 0) >= MINIMO_DIA_FIRME && diasSeguidos < 400; d = somarDias(d, -1)) diasSeguidos++
  }
  return { feitas: deHoje.length, certas, validas, seguidas, virada, areas: new Set(deHoje.map((h) => h.area)).size, diasSeguidos }
}

interface Regra { id: string; arte: ArteConquista; tom: TomConquista; /** quanto maior, mais especial (é a que aparece quando várias valem juntas) */ peso: number; vale: (e: EstudoDoDia) => boolean; titulos: string[]; textos: string[]; marca: (e: EstudoDoDia) => string }
const acerto = (e: EstudoDoDia) => (e.validas ? e.certas / e.validas : 0)
const questoes = (n: number) => (e: EstudoDoDia) => `${Math.max(n, e.feitas)} questões hoje`

export const REGRAS_CONQUISTA: readonly Regra[] = [
  // a fratura consolida com as questões do dia
  { id: 'fratura', arte: 'fratura', tom: 'raiox', peso: 1, vale: (e) => e.feitas >= 10, marca: questoes(10), titulos: ['Primeiro raio-X do dia', 'Atendimento iniciado'], textos: ['Dez questões. O traço está no filme; agora é deixar consolidar.', 'As primeiras dez de hoje. Todo tratamento começa pela primeira imagem.'] },
  { id: 'calo', arte: 'caloMole', tom: 'raiox', peso: 2, vale: (e) => e.feitas >= 25, marca: questoes(25), titulos: ['Calo mole', 'Consolidação em curso'], textos: ['Vinte e cinco questões. O calo já começou a se formar.', 'Vinte e cinco por hoje. Biologia trabalhando a seu favor.'] },
  { id: 'ponte', arte: 'ponteOssea', tom: 'raiox', peso: 4, vale: (e) => e.feitas >= 50, marca: questoes(50), titulos: ['Ponte óssea', 'Calo duro'], textos: ['Cinquenta questões. Já dá para ver a ponte óssea no filme.', 'Meia centena hoje. Vale uma água e um alongamento antes de seguir.'] },
  { id: 'consolidada', arte: 'consolidada', tom: 'raiox', peso: 6, vale: (e) => e.feitas >= 100, marca: questoes(100), titulos: ['Consolidação completa', 'Alta do ambulatório'], textos: ['Cem questões hoje. Fratura consolidada; agora o descanso faz a remodelação.', 'A centena chegou. Comemore e durma bem: é no sono que fixa.'] },
  // acerto, virada e constância
  { id: 'fixacao', arte: 'placa', tom: 'metal', peso: 5, vale: (e) => e.validas >= 20 && acerto(e) > 0.75, marca: (e) => `${Math.round(acerto(e) * 100)}% de acerto`, titulos: ['Fixação estável', 'Redução anatômica'], textos: ['Mais de 75% de acerto em vinte questões ou mais. Montagem firme.', 'Vinte questões ou mais e mais de 75% certas. Nada a revisar no controle.'] },
  { id: 'reflexo', arte: 'martelo', tom: 'metal', peso: 3, vale: (e) => e.virada, marca: () => 'três erros, três acertos', titulos: ['Reflexo recuperado', 'Resposta presente'], textos: ['Três erros seguidos e logo três acertos. O reflexo voltou.', 'Errou três e acertou as três seguintes. É assim que se aprende.'] },
  { id: 'plantao', arte: 'caneca', tom: 'plantao', peso: 3, vale: (e) => e.diasSeguidos >= 3, marca: () => '3 dias seguidos', titulos: ['Plantão em dia', 'Rotina firme'], textos: ['Três dias seguidos de estudo. A constância ganha da intensidade.', 'Terceiro dia seguido. O café é por conta do hábito.'] },
  { id: 'escala', arte: 'prancheta', tom: 'plantao', peso: 7, vale: (e) => e.diasSeguidos >= 7, marca: () => '7 dias seguidos', titulos: ['Escala cumprida', 'Uma semana sem faltar'], textos: ['Sete dias seguidos de estudo. Escala da semana fechada.', 'Uma semana inteira de estudo. Assim se chega pronto à prova.'] },
]

/**
 * As conquistas que esta resposta acabou de liberar: valiam depois e não valiam antes (resposta
 * sincronizada de outro aparelho não chega aqui). `ja`: as já guardadas hoje neste aparelho.
 * `sorteio` escolhe o título e o texto (cada uma tem mais de um jeito de comemorar).
 * A primeira da lista é a mais especial: é ela que aparece; as outras ficam guardadas.
 */
export function novasConquistas(antes: EstudoDoDia, depois: EstudoDoDia, ja: (id: string) => boolean, sorteio = Math.random()): ConquistaDia[] {
  const i = (n: number) => Math.min(n - 1, Math.floor(Math.max(0, Math.min(0.9999, sorteio)) * n))
  return REGRAS_CONQUISTA.filter((r) => r.vale(depois) && !r.vale(antes) && !ja(r.id)).sort((a, b) => b.peso - a.peso)
    .map((r) => ({ id: r.id, titulo: r.titulos[i(r.titulos.length)], texto: r.textos[i(r.textos.length)], arte: r.arte, tom: r.tom, marca: r.marca(depois) }))
}

/**
 * Pode mostrar um cartão agora? `mostrados`: os instantes dos cartões de hoje neste aparelho.
 * A consolidação das cem questões e a escala da semana sempre aparecem (são raros); o resto respeita
 * o máximo do dia e o intervalo. O que não aparece fica guardado do mesmo jeito.
 */
export function cabeHoje(c: ConquistaDia, mostrados: number[], agora: number): boolean {
  if (c.id === 'consolidada' || c.id === 'escala') return true
  if (mostrados.length >= MAXIMO_POR_DIA) return false
  return !mostrados.some((t) => agora - t < INTERVALO_MINIMO && agora >= t)
}
