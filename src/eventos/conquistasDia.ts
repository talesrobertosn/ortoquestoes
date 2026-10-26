/**
 * Conquistas do dia (pedido do Tales, 26/10/2026): cartões em pixel art que pulam na tela quando a
 * pessoa bate uma marca no estudo de hoje (10, 20, 40, 50, 75 e 100 questões, acerto alto, acertos
 * seguidos, virada depois de erros, várias áreas, dias seguidos). Diferentes dos emblemas da página
 * de Conquistas, que são difíceis e permanentes: aqui é um tapinha nas costas, que volta a valer
 * todo dia. Regras puras: o histórico e o relógio entram por argumento.
 */
import { chaveDoDia, somarDias } from '../util/dia'

export type ArteConquista = 'medalha' | 'trofeu' | 'alvo' | 'chama' | 'seta' | 'bussola' | 'calendario'
export type NivelConquista = 'bronze' | 'prata' | 'ouro' | 'diamante'
export interface ConquistaDia { id: string; titulo: string; texto: string; arte: ArteConquista; nivel: NivelConquista; /** a linha pequena do número: "20 questões hoje" */ marca: string }

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

interface Regra { id: string; arte: ArteConquista; nivel: NivelConquista; vale: (e: EstudoDoDia) => boolean; titulos: string[]; textos: string[]; marca: (e: EstudoDoDia) => string }
const acerto = (e: EstudoDoDia) => (e.validas ? e.certas / e.validas : 0)
const pct = (e: EstudoDoDia) => `${Math.round(acerto(e) * 100)}% de acerto`
const questoes = (n: number) => (e: EstudoDoDia) => `${Math.max(n, e.feitas)} questões hoje`

/** Volume do dia: os números que o Tales pediu (10, 20, 40, 50, 75 e 100). */
const VOLUME: Regra[] = [
  { id: 'q10', arte: 'medalha', nivel: 'bronze', vale: (e) => e.feitas >= 10, marca: questoes(10), titulos: ['Aquecimento feito', 'Bisturi afiado'], textos: ['As primeiras dez já foram. O resto do dia fica mais leve daqui.', 'Dez questões e a cabeça já entrou no modo prova.'] },
  { id: 'q20', arte: 'medalha', nivel: 'bronze', vale: (e) => e.feitas >= 20, marca: questoes(20), titulos: ['Engrenou', 'Ritmo de enfermaria'], textos: ['Vinte questões: o estudo pegou embalo.', 'Vinte por hoje e contando. Bom ritmo.'] },
  { id: 'q40', arte: 'medalha', nivel: 'prata', vale: (e) => e.feitas >= 40, marca: questoes(40), titulos: ['Plantão produtivo', 'Ronda da tarde'], textos: ['Quarenta questões. Isso já é uma prova inteira de muita gente.', 'Quarenta questões no dia: o raciocínio está aquecido.'] },
  { id: 'q50', arte: 'medalha', nivel: 'prata', vale: (e) => e.feitas >= 50, marca: questoes(50), titulos: ['Meio centenário', 'Cinquenta na conta'], textos: ['Meia centena hoje. Vale um copo de água e esticar os ombros.', 'Cinquenta questões. Sua versão de ontem ficaria orgulhosa.'] },
  { id: 'q75', arte: 'medalha', nivel: 'ouro', vale: (e) => e.feitas >= 75, marca: questoes(75), titulos: ['Maratona de ambulatório', 'Agenda lotada'], textos: ['Setenta e cinco questões. Fôlego de quem atende o ambulatório inteiro.', 'Setenta e cinco no dia: poucos chegam aqui.'] },
  { id: 'q100', arte: 'trofeu', nivel: 'diamante', vale: (e) => e.feitas >= 100, marca: questoes(100), titulos: ['Centena do dia', 'Cem questões, um troféu'], textos: ['Cem questões hoje. Agora o melhor estudo é descansar bem.', 'A centena chegou. Comemore, beba água e durma bem: é assim que fixa.'] },
]
/** Acerto (o Tales pediu 10 com mais de 75% e 20 com mais de 70%; o padrão ouro é o bônus). */
const PRECISAO: Regra[] = [
  { id: 'a75', arte: 'alvo', nivel: 'prata', vale: (e) => e.validas >= 10 && acerto(e) > 0.75, marca: pct, titulos: ['Mira calibrada', 'No centro do alvo'], textos: ['Dez ou mais questões hoje com acerto acima de 75%.', 'Mais de 75% de acerto nas questões de hoje. Mira boa.'] },
  { id: 'a70', arte: 'alvo', nivel: 'ouro', vale: (e) => e.validas >= 20 && acerto(e) > 0.7, marca: pct, titulos: ['Mão firme', 'Consistência de preceptor'], textos: ['Vinte ou mais questões com acerto acima de 70%. Volume e precisão juntos.', 'Acima de 70% em vinte questões ou mais. Isso é consistência.'] },
  { id: 'a80', arte: 'alvo', nivel: 'diamante', vale: (e) => e.validas >= 40 && acerto(e) >= 0.8, marca: pct, titulos: ['Padrão ouro', 'Laudo impecável'], textos: ['Quarenta questões ou mais com 80% de acerto. Nível de quem já passou.', '80% de acerto em quarenta questões ou mais. Raro e merecido.'] },
]
/** Extras (brainstorm): sequência, virada, variedade e constância. */
const EXTRAS: Regra[] = [
  { id: 's5', arte: 'chama', nivel: 'bronze', vale: (e) => e.seguidas >= 5, marca: () => '5 acertos seguidos', titulos: ['Cinco de cinco', 'Esquentou'], textos: ['Cinco acertos seguidos. A chama acendeu.', 'Cinco certas em sequência. Segue nesse embalo.'] },
  { id: 's10', arte: 'chama', nivel: 'ouro', vale: (e) => e.seguidas >= 10, marca: () => '10 acertos seguidos', titulos: ['Dez seguidas', 'Pegando fogo'], textos: ['Dez acertos em sequência. Isso é domínio.', 'Dez certas, uma atrás da outra. Impressionante.'] },
  { id: 'virada', arte: 'seta', nivel: 'prata', vale: (e) => e.virada, marca: () => 'três erros, três acertos', titulos: ['Volta por cima', 'Virada de jogo'], textos: ['Três erros seguidos e logo três acertos. Errar faz parte; voltar é o que importa.', 'Depois de três erros, três acertos. Resiliência de residente.'] },
  { id: 'ronda', arte: 'bussola', nivel: 'prata', vale: (e) => e.areas >= 4, marca: (e) => `${e.areas} áreas hoje`, titulos: ['Ronda completa', 'Visita a todas as alas'], textos: ['Quatro áreas diferentes no mesmo dia. A prova também mistura.', 'Você passou por quatro áreas hoje. Ótimo para a memória de longo prazo.'] },
  { id: 'd3', arte: 'calendario', nivel: 'prata', vale: (e) => e.diasSeguidos >= 3, marca: () => '3 dias seguidos', titulos: ['Três dias firmes', 'Hábito nascendo'], textos: ['Três dias seguidos com dez questões ou mais. É assim que vira hábito.', 'Terceiro dia seguido de estudo. A constância ganha da intensidade.'] },
  { id: 'd7', arte: 'calendario', nivel: 'ouro', vale: (e) => e.diasSeguidos >= 7, marca: () => '7 dias seguidos', titulos: ['Uma semana inteira', 'Sete de sete'], textos: ['Sete dias seguidos com dez questões ou mais. Uma semana de quem vai passar.', 'Uma semana sem falhar. O cronograma agradece.'] },
]
export const REGRAS_CONQUISTA: readonly Regra[] = [...VOLUME, ...PRECISAO, ...EXTRAS]

/**
 * As conquistas que esta resposta acabou de liberar: valiam depois e não valiam antes (resposta
 * sincronizada de outro aparelho não chega aqui). `ja`: as já mostradas hoje neste aparelho.
 * `sorteio` escolhe o título e o texto (cada conquista tem mais de um jeito de comemorar).
 */
export function novasConquistas(antes: EstudoDoDia, depois: EstudoDoDia, ja: (id: string) => boolean, sorteio = Math.random()): ConquistaDia[] {
  const i = (n: number) => Math.min(n - 1, Math.floor(Math.max(0, Math.min(0.9999, sorteio)) * n))
  return REGRAS_CONQUISTA.filter((r) => r.vale(depois) && !r.vale(antes) && !ja(r.id))
    .map((r) => ({ id: r.id, titulo: r.titulos[i(r.titulos.length)], texto: r.textos[i(r.textos.length)], arte: r.arte, nivel: r.nivel, marca: r.marca(depois) }))
}
