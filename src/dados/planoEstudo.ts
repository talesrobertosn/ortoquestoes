import type { Indice } from './tipos'
import { diaCivil, inicioDaChave, inicioDoDia, somarDias } from '../util/dia'
import { AREAS, focoPorQuestao, idsDoFoco, pesoIncidenciaDoTema, posicaoDaArea, type Nivel } from './incidencia'

/**
 * Cronograma até a prova. Tudo é recalculado a cada dia a partir do que a pessoa
 * já respondeu: atrasou, a meta sobe um pouco; adiantou, ela desce. As duas
 * últimas semanas antes da prova são a reta final, sem conteúdo novo: a
 * penúltima é de revisão forte (erros, dúvidas e o que mais cai) e a última,
 * o modo prova (simulado cronometrado, os erros que importam e o resumão).
 * Plano com menos de 6 semanas tem reta final de uma semana só.
 * Os temas que mais caem na prova ganham mais espaço e vêm antes, e dentro de
 * cada tema o dia começa pelos assuntos mais cobrados.
 *
 * Reforma de 14/10/2026 (docs/cronograma/PLANO.md): o conteúdo novo anda em
 * três passadas por incidência (1ª: prioridade máxima em todas as áreas; 2ª:
 * prioridade alta; 3ª: o resto), em blocos de cerca de 3 dias por área, e
 * cada dia mistura 30% da próxima área da fila. O plano é simulado dia a dia:
 * folga, dia leve (plantão), semana difícil (dia mínimo) e mini-simulado a
 * cada duas semanas. Atrasou, a meta sobe no máximo 25%; o que não couber sai
 * do fim da fila (a 3ª passada) e a projeção avisa.
 *
 * Entram as questões de Ortopedia e, se a pessoa escolher (padrão), os
 * OrtoQuestões Simulados. Ficam de fora as áreas à parte (campo `ar`:
 * Fellowship Quadril, R4, mão), as duplicatas e as anuladas.
 */

export type Intensidade = 'leve' | 'firme' | 'completo'
export interface PlanoSalvo {
  data_prova: string
  intensidade: Intensidade
  folgas: number[]
  prova: string
  base_respondidas: number
  criado_em: string
  /** Ausente em planos antigos: conta como sim. */
  incluir_simulados?: boolean
  /** Ajustes finos (dia leve, semana difícil, começar por, áreas dominadas). */
  opcoes?: OpcoesPlano | null
}

export interface OpcoesPlano {
  /** Dias da semana (0 = domingo) de plantão: dia leve, com poucas questões. */
  diasLeves?: number[]
  /** Questões num dia leve. */
  qtdLeve?: number
  /** Segundas-feiras ("AAAA-MM-DD") das semanas difíceis: só o dia mínimo. */
  semanasDificeis?: string[]
  /** Área (slug do tema) que abre a fila. */
  comecarPor?: string | null
  /** Áreas que a pessoa já domina: entram só com o que mais cai (1ª passada). */
  dominadas?: string[]
  /** Outra prova antes da principal (ex.: TARO antes do TEOT): só um marco no caminho. */
  provaExtra?: { nome: string; data: string } | null
  /**
   * Adiantamentos: nos dias em que a pessoa foi além da meta, a meta daquele dia
   * ("AAAA-MM-DD") e quanto ela pediu para adiantar. O que passou da meta sai dos
   * dias seguintes, começando pelo próximo dia de estudo.
   */
  adiantados?: RegistroAdiantado[]
  /** O que foi feito hoje fora das questões, em qualquer aparelho (ver conta/marcasDia.ts). */
  marcasDia?: { em: string; resumao?: string[]; flashcards?: boolean; mini?: boolean }
}

export interface RegistroAdiantado { em: string; meta: number; pedido?: number }

/** Dia mínimo: mantém a sequência e é a meta da semana difícil. */
export const DIA_MINIMO = 10
export const QTD_LEVE_PADRAO = 15
/** Atrasou: a meta de um dia normal sobe no máximo 25% sobre a planejada. */
export const TETO_ATRASO = 1.25
/** Fatia de cada dia que vem da próxima área da fila. */
export const MISTURA = 0.3
/** Tamanho de um bloco de área, em dias de estudo. */
export const DIAS_BLOCO = 3
/** Mini-simulado: a cada 14 dias, com 30 questões cronometradas do que já foi visto. */
export const INTERVALO_MINI = 14
export const TAMANHO_MINI = 30
/** Minutos por questão quando ainda não há histórico. */
export const MINUTOS_POR_QUESTAO = 1.5

export const opcoesDe = (plano: Pick<PlanoSalvo, 'opcoes'> | null | undefined): Required<Omit<OpcoesPlano, 'provaExtra' | 'marcasDia'>> => ({
  diasLeves: plano?.opcoes?.diasLeves ?? [],
  qtdLeve: Math.max(5, Math.min(40, plano?.opcoes?.qtdLeve ?? QTD_LEVE_PADRAO)),
  semanasDificeis: plano?.opcoes?.semanasDificeis ?? [],
  comecarPor: plano?.opcoes?.comecarPor ?? null,
  dominadas: plano?.opcoes?.dominadas ?? [],
  adiantados: (plano?.opcoes?.adiantados ?? []).filter((r) => r && /^\d{4}-\d{2}-\d{2}$/.test(r.em) && Number.isFinite(r.meta)),
})

/** "AAAA-MM-DD" de uma data local. */
export const chaveData = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const incluiSimulados = (plano: Pick<PlanoSalvo, 'incluir_simulados'> | null | undefined) => plano?.incluir_simulados !== false

type QuestaoIndice = Indice['questoes'][number]
/** Se a questão entra no cronograma (sem áreas à parte, cópias e anuladas; simulados conforme a escolha). */
export const entraNoPlano = (q: QuestaoIndice, simulados: boolean) => !q.dup && !q.ar && q.an !== 1 && (simulados || q.sim !== 1)

export const COBERTURA: Record<Intensidade, number> = { leve: 0.5, firme: 0.8, completo: 1 }
export const ROTULO_INTENSIDADE: Record<Intensidade, { nome: string; texto: string }> = {
  leve: { nome: 'Leve', texto: 'Metade das questões que faltam. Para quem concilia com plantão pesado.' },
  firme: { nome: 'Firme', texto: '80% das questões que faltam. O equilíbrio para a maioria.' },
  completo: { nome: 'Completo', texto: 'Todas as questões que faltam. Para quem quer ver o acervo inteiro.' },
}
/** Reta final completa (duas semanas) e a curta, para planos com menos de 6 semanas. */
export const DIAS_RETA_FINAL = 14
export const DIAS_RETA_FINAL_CURTA = 7
/** Semana do modo prova: os últimos 7 dias, véspera incluída. */
export const DIAS_MODO_PROVA = 7
/** Duas semanas de reta final só quando o plano começou com 6 semanas ou mais. */
export function diasRetaFinal(criadoEm: string, dataProva: string): number {
  return diasEntre(diaCivil(Date.parse(criadoEm)), dataLocal(dataProva)) >= 42 ? DIAS_RETA_FINAL : DIAS_RETA_FINAL_CURTA
}
/** conteudo: questões novas; revisao: semana −2; prova: semana −1; vespera: o dia anterior. */
export type FaseCronograma = 'conteudo' | 'revisao' | 'prova' | 'vespera' | 'passou'
const DIA = 86_400_000

/** Meia-noite local de uma data "AAAA-MM-DD". */
export function dataLocal(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d)
}
const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const diasEntre = (a: Date, b: Date) => Math.round((meiaNoite(b).getTime() - meiaNoite(a).getTime()) / DIA)
/** Dias de hoje (dia de São Paulo) até a data (AAAA-MM-DD), na mesma conta do painel do cronograma. */
export const diasAte = (data: string, agora: Date | number = Date.now()) => diasEntre(diaCivil(agora), dataLocal(data))

/** Dias de estudo em [inicio, fim), sem os dias da semana de folga. */
export function diasDeEstudo(inicio: Date, fim: Date, folgas: number[]): number {
  let n = 0
  for (let d = meiaNoite(inicio); d < meiaNoite(fim); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (!folgas.includes(d.getDay())) n++
  }
  return n
}

export interface RegistroMinimo { c: boolean | null; q?: number; confianca?: 'seguro' | 'duvida' | 'chute'; historico?: Array<{ em: number; correta: boolean | null }> }

/**
 * acerto: o real, a partir de 10 respostas. acertoEstimado: a partir de 3,
 * puxado para a média geral quando há poucas respostas (o diagnóstico já
 * calibra o plano sem esperar 10 por tema). Acerto marcado como chute vale meio.
 */
export interface TemaPlano { slug: string; nome: string; faltam: number; acerto: number | null; acertoEstimado: number | null; respondidas: number; reforcado: boolean; incidencia: number }
/** Um assunto dentro do tema da semana: quantas questões dele entram e quanto ele cai. */
/** posicao: lugar do assunto no ranking da área (1 = o que mais cai); 0 fora do ranking. */
export interface AssuntoSemana { nome: string; n: number; nivel: Nivel | 0; posicao: number }
export type Passada = 1 | 2 | 3
export const ROTULO_PASSADA: Record<Passada, { nome: string; texto: string }> = {
  1: { nome: '1ª passada', texto: 'os assuntos de prioridade máxima de todas as áreas' },
  2: { nome: '2ª passada', texto: 'os assuntos de prioridade alta' },
  3: { nome: '3ª passada', texto: 'os de prioridade média e baixa' },
}
export type TipoDia = 'estudo' | 'leve' | 'dificil' | 'folga'
/** Uma área dentro de um dia: as questões novas dela e os assuntos. */
export interface ItemDia { slug: string; nome: string; n: number; assuntos: string[]; mistura: boolean; passada: Passada; ids: string[] }
export interface DiaPlano {
  data: Date; tipo: TipoDia; meta: number; itens: ItemDia[]; total: number; passada: Passada | null; mini: boolean
  /** Questões deste dia que a pessoa já adiantou (fez antes): saem da meta dele. */
  adiantado: number
}
export interface SemanaPlano { inicio: Date; fim: Date; diasEstudo: number; temas: Array<{ slug: string; nome: string; n: number; focos: string[]; assuntos: AssuntoSemana[]; posicaoArea: number | null; depois: string[] }>; total: number; atual: boolean }
export interface CalculoPlano {
  diasAteProva: number
  diasEstudoRestantes: number
  inicioRetaFinal: Date
  /** 14 ou 7 (plano curto). */
  diasRetaFinal: number
  /** Início da semana do modo prova (prova − 7 dias) e a véspera. */
  inicioModoProva: Date
  vespera: Date
  fase: FaseCronograma
  /** Média de questões por dia de estudo planejada: vira a meta da revisão na reta final. */
  metaMedia: number
  alvo: number
  feitas: number
  restante: number
  metaDiaria: number
  feitasHoje: number
  faltaHoje: number
  /** Adiantar: o que hoje já perdeu da meta por adiantamentos de dias anteriores. */
  adiantadoHoje: number
  /** Feitas hoje além da meta (vão para os próximos dias). */
  extraHoje: number
  /** O que a pessoa pediu para adiantar hoje e o quanto ainda falta disso. */
  adiantarPedido: number
  adiantarFalta: number
  /** Meta de hoje se não houvesse adiantamento (para mostrar "era X"). */
  metaHojeSemAdiantar: number
  esperadoAteHoje: number
  /** Positivo = adiantado, em % do esperado. */
  ritmo: number
  temas: TemaPlano[]
  semanas: SemanaPlano[]
  hoje: { slug: string; nome: string; n: number; focos: string[]; itens: ItemDia[]; mini: boolean; tipo: TipoDia } | null
  naRetaFinal: boolean
  provaPassou: boolean
  /** Meta de um dia de estudo normal (a de hoje pode ser leve, difícil ou de mini-simulado). */
  metaDiaNormal: number
  /** Tipo de hoje e se hoje é dia de mini-simulado. */
  tipoHoje: TipoDia
  miniHoje: boolean
  /** Os dias de estudo de hoje até a reta final, um a um. */
  dias: DiaPlano[]
  /** Próximo dia com tarefa (depois de hoje). */
  amanha: DiaPlano | null
  /** Passada em que a pessoa está e quando cada uma começa. */
  passadaAtual: Passada | null
  inicioPassada: Partial<Record<Passada, Date>>
  /** Semana atual (1 = a da criação) e total de semanas até a prova. */
  semanaNumero: number
  semanasTotal: number
  /** Projeção no ritmo do plano: % do alvo, % do que mais cai e quando o que mais cai termina. */
  projecao: { alvoPct: number; maisCaiPct: number; fimMaisCai: Date | null; cortadas: number; tetoAtivo: boolean }
}

export function calcularPlano(indice: Indice, respondidas: Record<string, RegistroMinimo>, plano: PlanoSalvo, agora: Date | number = new Date(), interno: { soMeta?: boolean } = {}): CalculoPlano {
  // Hoje e o dia de criação são dias de São Paulo (src/util/dia.ts), como datas civis.
  const hoje = diaCivil(agora)
  const inicioHoje = inicioDoDia(agora)
  const prova = dataLocal(plano.data_prova)
  const simulados = incluiSimulados(plano)
  const criado = diaCivil(Date.parse(plano.criado_em))
  const diasFinais = diasRetaFinal(plano.criado_em, plano.data_prova)
  const inicioRetaFinal = new Date(prova.getFullYear(), prova.getMonth(), prova.getDate() - diasFinais)
  const inicioModoProva = new Date(prova.getFullYear(), prova.getMonth(), prova.getDate() - DIAS_MODO_PROVA)
  const vespera = new Date(prova.getFullYear(), prova.getMonth(), prova.getDate() - 1)
  const fimEstudo = inicioRetaFinal > hoje ? inicioRetaFinal : prova

  // Acervo por tema: quantas faltam e o acerto de cada um.
  const porTema = new Map<number, { faltam: number; certas: number; erradas: number; respondidas: number }>()
  // Acerto no chute não é saber: conta meio acerto e meio erro.
  let elegiveis = 0, respondidasNoAcervo = 0
  for (const q of indice.questoes) {
    if (!entraNoPlano(q, simulados)) continue
    elegiveis++
    const t = porTema.get(q.t) ?? { faltam: 0, certas: 0, erradas: 0, respondidas: 0 }
    const r = respondidas[q.id]
    if (!r) t.faltam++
    else {
      respondidasNoAcervo++; t.respondidas++
      if (r.c === true) { const meio = r.confianca === 'chute' ? 0.5 : 1; t.certas += meio; t.erradas += 1 - meio }
      else if (r.c === false) t.erradas++
    }
    porTema.set(q.t, t)
  }
  const certasTotal = [...porTema.values()].reduce((s, t) => s + t.certas, 0)
  const validasTotal = [...porTema.values()].reduce((s, t) => s + t.certas + t.erradas, 0)
  const media = validasTotal ? (certasTotal / validasTotal) * 100 : null

  const temas: TemaPlano[] = [...porTema.entries()].map(([i, t]) => {
    const tema = indice.temas[i]
    const validas = t.certas + t.erradas
    const acerto = validas >= 10 ? Math.round((t.certas / validas) * 100) : null
    const acertoEstimado = validas >= 3 && media !== null ? Math.round(((t.certas + (media / 100) * 5) / (validas + 5)) * 100) : null
    const slug = tema?.slug ?? String(i)
    return { slug, nome: tema?.nome ?? String(i), faltam: t.faltam, acerto, acertoEstimado, respondidas: t.respondidas, reforcado: acertoEstimado !== null && media !== null && acertoEstimado < media - 5, incidencia: pesoIncidenciaDoTema(slug) }
  })

  const alvo = Math.max(0, Math.ceil((elegiveis - Math.min(plano.base_respondidas, elegiveis)) * COBERTURA[plano.intensidade]))
  const feitas = Math.max(0, respondidasNoAcervo - plano.base_respondidas)
  const restante = Math.max(0, alvo - feitas)

  // Primeira resposta de hoje (não conta revisão de questão já vista).
  // Só o que entra no cronograma: cirurgia da mão, cópias e anuladas não contam.
  // (contadas por dia, para saber também quanto foi feito nos dias em que a pessoa adiantou)
  const primeirasPorDia = new Map<number, number>()
  for (const q of indice.questoes) {
    if (!entraNoPlano(q, simulados)) continue
    const r = respondidas[q.id]
    const primeira = r?.historico?.[0]?.em ?? r?.q
    if (primeira === undefined) continue
    const dia = primeira >= inicioHoje ? hoje.getTime() : diaCivil(primeira).getTime()
    primeirasPorDia.set(dia, (primeirasPorDia.get(dia) ?? 0) + 1)
  }
  const feitasHoje = primeirasPorDia.get(hoje.getTime()) ?? 0

  const diasEstudoRestantes = diasDeEstudo(hoje, fimEstudo, plano.folgas)

  const totalDiasPlano = Math.max(1, diasDeEstudo(criado, inicioRetaFinal > criado ? inicioRetaFinal : prova, plano.folgas))
  const decorridos = Math.min(totalDiasPlano, diasDeEstudo(criado, hoje, plano.folgas))
  const esperadoAteHoje = Math.round((alvo * decorridos) / totalDiasPlano)
  const feitasAntesDeHoje = feitas - feitasHoje
  const ritmo = esperadoAteHoje > 0 ? Math.round(((feitasAntesDeHoje - esperadoAteHoje) / esperadoAteHoje) * 100) : 0

  const opcoes = opcoesDe(plano)
  // Dias até a reta final, cada um com o seu tipo e peso na meta.
  const semanasDificeis = new Set(opcoes.semanasDificeis)
  const chaveSegunda = (d: Date) => { const s2 = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); return `${s2.getFullYear()}-${String(s2.getMonth() + 1).padStart(2, '0')}-${String(s2.getDate()).padStart(2, '0')}` }
  const tipoDe = (d: Date): TipoDia => plano.folgas.includes(d.getDay()) ? 'folga' : semanasDificeis.has(chaveSegunda(d)) ? 'dificil' : opcoes.diasLeves.includes(d.getDay()) ? 'leve' : 'estudo'
  const diasDeEstudoCriacao: Date[] = []
  for (let d = criado; d < fimEstudo && diasDeEstudoCriacao.length < 800; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) if (!plano.folgas.includes(d.getDay())) diasDeEstudoCriacao.push(d)
  // Mini-simulado: a cada INTERVALO_MINI dias corridos desde a criação, num dia de estudo normal.
  const ehMini = (d: Date) => {
    const desde = diasEntre(criado, d)
    if (desde < INTERVALO_MINI || hoje >= inicioRetaFinal) return false
    const marco = desde - (desde % INTERVALO_MINI)
    const alvoMini = new Date(criado.getFullYear(), criado.getMonth(), criado.getDate() + marco)
    // o primeiro dia de estudo normal a partir do marco
    for (let k = 0; k < 7; k++) { const x = new Date(alvoMini.getFullYear(), alvoMini.getMonth(), alvoMini.getDate() + k); if (tipoDe(x) === 'estudo') return x.getTime() === d.getTime() }
    return false
  }
  const calendario: Array<{ data: Date; tipo: TipoDia; mini: boolean }> = []
  for (let d = hoje; d < fimEstudo && calendario.length < 800; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const tipo = tipoDe(d)
    calendario.push({ data: d, tipo, mini: tipo === 'estudo' && ehMini(d) })
  }
  // Meta de um dia normal: o que falta, menos o que os dias leves e difíceis levam, dividido pelos dias normais (mini vale meio).
  let fixos = 0, pesoNormal = 0
  for (const c of calendario) {
    if (c.tipo === 'leve') fixos += opcoes.qtdLeve
    else if (c.tipo === 'dificil') fixos += DIA_MINIMO
    else if (c.tipo === 'estudo') pesoNormal += c.mini ? 0.5 : 1
  }
  // A meta planejada usa o mesmo calendário de tipos desde a criação: contar dias
  // leves e difíceis como normais deixava a planejada baixa e o teto disparava
  // no primeiro dia de um plano novo com dois ou mais dias leves.
  let fixosCriacao = 0, pesoCriacao = 0
  for (const d of diasDeEstudoCriacao) {
    const tipo = tipoDe(d)
    if (tipo === 'leve') fixosCriacao += opcoes.qtdLeve
    else if (tipo === 'dificil') fixosCriacao += DIA_MINIMO
    else if (tipo === 'estudo') pesoCriacao += ehMini(d) ? 0.5 : 1
  }
  const metaPlanejada = pesoCriacao > 0
    ? Math.max(1, Math.ceil(Math.max(0, alvo - fixosCriacao) / pesoCriacao))
    : Math.max(1, Math.ceil(alvo / Math.max(1, diasDeEstudoCriacao.length)))
  // A meta normal; `devolver` são questões que dias de hoje em diante já não pedem (foram adiantadas antes de hoje).
  const normalCom = (devolver: number) => {
    const precisa = pesoNormal > 0 ? Math.ceil(Math.max(0, restante + feitasHoje - fixos + devolver) / pesoNormal) : Math.max(0, restante + feitasHoje)
    const teto = precisa > Math.ceil(metaPlanejada * TETO_ATRASO)
    return { normal: teto ? Math.ceil(metaPlanejada * TETO_ATRASO) : precisa, teto }
  }
  const metaDoTipoCom = (normal: number) => (tipo: TipoDia, mini: boolean) => tipo === 'folga' ? 0 : tipo === 'leve' ? Math.min(opcoes.qtdLeve, normal || opcoes.qtdLeve) : tipo === 'dificil' ? Math.min(DIA_MINIMO, normal || DIA_MINIMO) : mini ? Math.ceil(normal / 2) : normal
  // Adiantar: o que a pessoa fez além da meta num dia sai dos dias seguintes, a começar pelo próximo
  // dia de estudo (até zerar a meta dele; o resto vai para o outro). Só vale para os registros guardados
  // (dia e meta daquele dia); o de hoje usa o que ela já fez a mais ou o que pediu, o que for maior.
  // Dias recentes sem registro (a pessoa passou da meta e não abriu o cronograma nem a página
  // inicial depois, ou estudou noutro aparelho e fechou): a meta daquele dia é refeita com as
  // respostas que havia até o fim dele, e o que passou dela vale como adiantado, como se o
  // registro tivesse sido gravado. Antes, esse extra se diluía pelo plano inteiro.
  const inferidos = interno.soMeta ? [] : inferirAdiantados(indice, respondidas, plano, hoje, criado, inicioRetaFinal, primeirasPorDia)
  const registros = [...opcoes.adiantados, ...inferidos]
    .map((r) => ({ data: dataLocal(r.em), meta: Math.max(0, r.meta), pedido: Math.max(0, Math.min(400, r.pedido ?? 0)) }))
    .filter((r) => r.data <= hoje && r.data >= criado && hoje.getTime() - r.data.getTime() <= 30 * DIA)
    .sort((a, b) => a.data.getTime() - b.data.getTime())
  const proximo = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  const alocar = (metaBase: (d: Date) => number, deHoje: number) => {
    const mapa = new Map<number, number>()
    const lista = registros.some((r) => r.data.getTime() === hoje.getTime()) || !deHoje ? registros : [...registros, { data: hoje, meta: 0, pedido: 0 }]
    for (const r of lista) {
      let resto = r.data.getTime() === hoje.getTime() ? deHoje : Math.max(0, (primeirasPorDia.get(r.data.getTime()) ?? 0) - r.meta)
      for (let d = proximo(r.data); resto > 0 && d < fimEstudo; d = proximo(d)) {
        const livre = Math.max(0, metaBase(d) - (mapa.get(d.getTime()) ?? 0))
        const t = Math.min(resto, livre)
        if (t) { mapa.set(d.getTime(), (mapa.get(d.getTime()) ?? 0) + t); resto -= t }
      }
    }
    return mapa
  }
  const baseDoDia = (normal: number) => { const m = metaDoTipoCom(normal); return (d: Date) => { const tipo = tipoDe(d); return tipo === 'estudo' ? m(tipo, ehMini(d)) : m(tipo, false) } }
  const devolvido = (mapa: Map<number, number>) => [...mapa].reduce((s2, [t, n]) => s2 + (t >= hoje.getTime() ? n : 0), 0)
  const passo1 = alocar(baseDoDia(normalCom(0).normal), 0)
  const { normal: metaDiaNormal, teto: tetoAtivo } = normalCom(devolvido(passo1))
  const metaDoTipo = metaDoTipoCom(metaDiaNormal)
  const anteriores = alocar(baseDoDia(metaDiaNormal), 0)
  const tipoHoje = calendario[0]?.tipo ?? tipoDe(hoje)
  const miniHoje = !!calendario[0]?.mini
  const metaHojeSemAdiantar = hoje >= inicioRetaFinal ? 0 : Math.min(restante + feitasHoje, metaDoTipo(tipoHoje, miniHoje))
  const adiantadoHoje = Math.min(metaHojeSemAdiantar, anteriores.get(hoje.getTime()) ?? 0)
  const metaDiaria = metaHojeSemAdiantar - adiantadoHoje
  const faltaHoje = Math.max(0, metaDiaria - feitasHoje)
  const extraHoje = hoje >= inicioRetaFinal ? 0 : Math.max(0, feitasHoje - metaDiaria)
  const adiantarPedido = hoje >= inicioRetaFinal ? 0 : registros.find((r) => r.data.getTime() === hoje.getTime())?.pedido ?? 0
  const adiantarFalta = Math.max(0, Math.min(restante, adiantarPedido - extraHoje))
  // Só a meta do dia (para refazer a meta de um dia passado, em inferirAdiantados).
  if (interno.soMeta) return { metaDiaria, naRetaFinal: hoje >= inicioRetaFinal } as CalculoPlano
  const creditos = alocar(baseDoDia(metaDiaNormal), Math.max(extraHoje, adiantarPedido))
  const focosPendentes = focosQueFaltam(indice, respondidas)

  // Distribuição: cada tema pesa pelo que falta, com reforço para os fracos
  // e para os que mais caem na prova.
  const fator = (t: TemaPlano) => (1 + (t.acertoEstimado !== null && media !== null ? Math.min(1.5, Math.max(0, ((media - t.acertoEstimado) / 100) * 4)) : 0)) * t.incidencia
  const focos = focoPorQuestao(indice)
  const dominados = assuntosDominados(indice, respondidas)
  // Passada de cada questão pelo nível do assunto; assunto dominado (85%+ em 15+) vai para a 3ª.
  const passadaDe = (id: string): Passada => {
    const f = focos.get(id)
    if (!f || dominados.has(f.nome)) return 3
    return f.nivel >= 4 ? 1 : f.nivel === 3 ? 2 : 3
  }
  const livresPorTema = new Map<string, string[]>()
  for (const q of indice.questoes) {
    if (!entraNoPlano(q, simulados) || respondidas[q.id]) continue
    const slug = indice.temas[q.t]?.slug ?? String(q.t)
    const lista = livresPorTema.get(slug) ?? []
    lista.push(q.id)
    livresPorTema.set(slug, lista)
  }
  // Fila de cada tema: os assuntos que mais caem primeiro; área dominada fica só com a 1ª passada.
  const filaDoTema = new Map<string, string[]>()
  for (const [slug, lista] of livresPorTema) {
    const ordenada = ordenarPorFoco(lista, focos, passadaDe)
    filaDoTema.set(slug, opcoes.dominadas.includes(slug) ? ordenada.filter((id) => passadaDe(id) === 1) : ordenada)
  }
  const pesos = temas.filter((t) => (filaDoTema.get(t.slug)?.length ?? 0) > 0).map((t) => ({ t, peso: (filaDoTema.get(t.slug)!.length) * fator(t) }))
  // Cotas proporcionais ao peso, limitadas ao que o tema tem; a sobra vai para quem ainda tem espaço.
  const cotaDe = new Map<string, number>()
  // Primeiro garante a 1ª passada (o que mais cai) de todas as áreas; se não couber tudo, divide pelo peso.
  const primeira = pesos.map((p) => ({ p, n: filaDoTema.get(p.t.slug)!.filter((id) => passadaDe(id) === 1).length }))
  const totalPrimeira = primeira.reduce((s2, x) => s2 + x.n, 0)
  if (totalPrimeira <= restante) for (const x of primeira) cotaDe.set(x.p.t.slug, x.n)
  let sobra = restante - [...cotaDe.values()].reduce((s2, n) => s2 + n, 0)
  // Plano menor que a 1ª passada: divide só a prioridade máxima entre as áreas.
  const limite = (slug: string) => totalPrimeira > restante ? primeira.find((x) => x.p.t.slug === slug)!.n : filaDoTema.get(slug)!.length
  for (let volta = 0; volta < 5 && sobra > 0; volta++) {
    const abertos = pesos.filter((p) => (cotaDe.get(p.t.slug) ?? 0) < limite(p.t.slug))
    const soma = abertos.reduce((s2, p) => s2 + p.peso, 0)
    if (!soma) break
    let usado = 0
    for (const p of abertos) {
      const atual = cotaDe.get(p.t.slug) ?? 0
      const mais = Math.min(limite(p.t.slug) - atual, Math.max(1, Math.round((sobra * p.peso) / soma)), sobra - usado)
      cotaDe.set(p.t.slug, atual + mais); usado += mais
    }
    sobra -= usado
    if (!usado) break
  }
  // Ordem das áreas: começar por (se escolhido), depois os mais fracos e os que mais caem.
  const ordemTemas = pesos.map((p) => p.t).filter((t) => (cotaDe.get(t.slug) ?? 0) > 0)
    .sort((x, y) => (y.slug === opcoes.comecarPor ? 1 : 0) - (x.slug === opcoes.comecarPor ? 1 : 0) || fator(y) - fator(x))

  // Blocos: em cada passada, as áreas se revezam em blocos de ~3 dias.
  const tamanhoBloco = Math.max(20, Math.round(metaDiaNormal * DIAS_BLOCO * (1 - MISTURA)))
  // (a mistura sai do fim da fila das outras áreas, então cada bloco dura ~3 dias de foco)
  const blocos: Array<{ t: TemaPlano; passada: Passada; ids: string[] }> = []
  const selecionadas = new Map(ordemTemas.map((t) => [t.slug, filaDoTema.get(t.slug)!.slice(0, cotaDe.get(t.slug) ?? 0)]))
  for (const passada of [1, 2, 3] as Passada[]) {
    const restos = ordemTemas.map((t) => ({ t, ids: selecionadas.get(t.slug)!.filter((id) => passadaDe(id) === passada) })).filter((r) => r.ids.length)
    while (restos.some((r) => r.ids.length)) {
      for (const r of restos) if (r.ids.length) blocos.push({ t: r.t, passada, ids: r.ids.splice(0, tamanhoBloco) })
    }
  }
  // Junta blocos vizinhos da mesma área (quando só ela sobrou na passada).
  for (let i = blocos.length - 1; i > 0; i--) if (blocos[i].t.slug === blocos[i - 1].t.slug && blocos[i].passada === blocos[i - 1].passada) { blocos[i - 1].ids.push(...blocos[i].ids); blocos.splice(i, 1) }

  // Simulação dia a dia: ~70% do bloco atual e ~30% do próximo bloco de outra área.
  const nomeFoco = (id: string) => focos.get(id)?.nome ?? 'Outros assuntos'
  const tirar = (bloco: { ids: string[] }, n: number) => bloco.ids.splice(0, n)
  const dias: DiaPlano[] = []
  for (const [i, c] of calendario.entries()) {
    const adiantado = i === 0 ? adiantadoHoje : Math.min(metaDoTipo(c.tipo, c.mini), creditos.get(c.data.getTime()) ?? 0)
    const meta = i === 0 ? faltaHoje + adiantarFalta : metaDoTipo(c.tipo, c.mini) - adiantado
    const itens: ItemDia[] = []
    let capacidade = meta
    const adicionar = (bloco: { t: TemaPlano; passada: Passada; ids: string[] }, n: number, mistura: boolean) => {
      const ids = tirar(bloco, Math.min(n, capacidade))
      if (!ids.length) return
      capacidade -= ids.length
      const igual = itens.find((it) => it.slug === bloco.t.slug && it.passada === bloco.passada && it.mistura === mistura)
      if (igual) { igual.n += ids.length; igual.ids.push(...ids); igual.assuntos = unicos([...igual.assuntos, ...ids.map(nomeFoco)]) }
      else itens.push({ slug: bloco.t.slug, nome: bloco.t.nome, n: ids.length, assuntos: unicos(ids.map(nomeFoco)), mistura, passada: bloco.passada, ids })
    }
    while (blocos.length && !blocos[0].ids.length) blocos.shift()
    if (capacidade > 0 && blocos.length) {
      const principal = blocos[0]
      // A mistura reveza entre as outras áreas da mesma passada e sai do fim da fila de cada uma,
      // para não gastar o bloco que vem logo depois.
      // Candidatas: as outras áreas da passada, as que mais têm questões primeiro (a próxima da fila fica de fora).
      const proximaArea = blocos.find((b2) => b2.ids.length && b2.t.slug !== principal.t.slug)?.t.slug
      const restam = new Map<string, number>()
      for (const b2 of blocos) if (b2.ids.length && b2.passada === principal.passada && b2.t.slug !== principal.t.slug) restam.set(b2.t.slug, (restam.get(b2.t.slug) ?? 0) + b2.ids.length)
      const ordenadas = [...restam].sort((x, y) => y[1] - x[1]).map(([slug]) => slug)
      const semProxima = ordenadas.filter((slug) => slug !== proximaArea)
      const outras = (semProxima.length ? semProxima : ordenadas).slice(0, 5)
      let daMistura = outras.length && capacidade >= 8 ? Math.round(capacidade * MISTURA) : 0
      adicionar(principal, capacidade - daMistura, false)
      // Sobra pequena do bloco (até 5): fecha o bloco hoje, em vez de deixar uma questão para amanhã.
      if (principal.ids.length > 0 && principal.ids.length <= 5) { const resto = principal.ids.splice(0); const it = itens.find((x) => x.slug === principal.t.slug && !x.mistura); if (it) { it.n += resto.length; it.ids.push(...resto); daMistura = Math.max(0, daMistura - resto.length) } }
      // Fim da fila (só a próxima área sobrou): a mistura não passa da proporção do foco que o dia
      // realmente recebeu; o resto da próxima área entra como foco, não como mistura.
      if (!semProxima.length) { const foco = itens.find((x) => x.slug === principal.t.slug && !x.mistura)?.n ?? 0; daMistura = Math.min(daMistura, Math.round(foco * MISTURA / (1 - MISTURA))) }
      // Revezando a partir da área do dia; se uma não tiver o bastante, a próxima completa.
      for (let k = 0; k < outras.length && daMistura > 0 && capacidade > 0; k++) {
        const slug = outras[(i + k) % outras.length]
        const fonte = [...blocos].reverse().find((b2) => b2.t.slug === slug && b2.passada === principal.passada && b2.ids.length)
        if (!fonte) continue
        const ids = fonte.ids.splice(Math.max(0, fonte.ids.length - Math.min(daMistura, capacidade)))
        if (!ids.length) continue
        capacidade -= ids.length; daMistura -= ids.length
        itens.push({ slug: fonte.t.slug, nome: fonte.t.nome, n: ids.length, assuntos: unicos(ids.map(nomeFoco)), mistura: true, passada: fonte.passada, ids })
      }
      // Sobrou espaço (o bloco acabou no meio do dia): o dia segue pela fila.
      for (const b2 of blocos) { if (capacidade <= 0) break; adicionar(b2, capacidade, false) }
      // A mesma área não aparece duas vezes no dia: junta e fica como principal.
      for (let a2 = 0; a2 < itens.length; a2++) for (let b2 = itens.length - 1; b2 > a2; b2--) {
        if (itens[a2].slug !== itens[b2].slug) continue
        itens[a2].n += itens[b2].n; itens[a2].ids.push(...itens[b2].ids); itens[a2].assuntos = unicos([...itens[a2].assuntos, ...itens[b2].assuntos])
        itens[a2].mistura = itens[a2].mistura && itens[b2].mistura; itens.splice(b2, 1)
      }
      // Se a área do dia acabou no meio e a seguinte entrou com mais questões, ela vem primeiro.
      itens.sort((a2, b2) => Number(a2.mistura) - Number(b2.mistura) || (a2.mistura ? 0 : b2.n - a2.n))
    }
    dias.push({ data: c.data, tipo: c.tipo, meta, itens, total: itens.reduce((s2, it) => s2 + it.n, 0), passada: itens[0]?.passada ?? null, mini: c.mini, adiantado })
  }
  const cortadas = blocos.reduce((s2, b2) => s2 + b2.ids.length, 0)

  // Semanas, a partir dos dias (formato antigo, usado pela página inicial e pelo histórico da semana).
  const semanas: SemanaPlano[] = []
  for (const d of dias) {
    const segunda = new Date(d.data.getFullYear(), d.data.getMonth(), d.data.getDate() - ((d.data.getDay() + 6) % 7))
    let s2 = semanas[semanas.length - 1]
    if (!s2 || s2.inicio.getTime() !== Math.max(segunda.getTime(), hoje.getTime())) {
      s2 = { inicio: segunda < hoje ? hoje : segunda, fim: d.data, diasEstudo: 0, temas: [], total: 0, atual: segunda <= hoje && hoje.getTime() - segunda.getTime() < 7 * DIA }
      semanas.push(s2)
    }
    s2.fim = d.data
    if (d.tipo !== 'folga') s2.diasEstudo++
    for (const it of d.itens) {
      let t = s2.temas.find((x) => x.slug === it.slug)
      if (!t) { t = { slug: it.slug, nome: it.nome, n: 0, focos: focosPendentes.get(it.slug) ?? [], assuntos: [], posicaoArea: posicaoDaArea(it.slug), depois: [] }; s2.temas.push(t) }
      t.n += it.n
      for (const id of it.ids) {
        const f = focos.get(id)
        const nome = f?.nome ?? 'Outros assuntos'
        const a2 = t.assuntos.find((x) => x.nome === nome)
        if (a2) a2.n++
        else t.assuntos.push({ nome, n: 1, nivel: f?.nivel ?? 0, posicao: f?.posicao ?? 0 })
      }
    }
    s2.total = s2.temas.reduce((s3, t) => s3 + t.n, 0)
  }
  // "Depois" de cada tema da semana: os próximos assuntos dele nas semanas seguintes.
  semanas.forEach((s2, i) => {
    for (const t of s2.temas) {
      const vistos = new Set(t.assuntos.map((a2) => a2.nome))
      for (const seg of semanas.slice(i + 1)) for (const a2 of seg.temas.find((x) => x.slug === t.slug)?.assuntos ?? []) {
        if (!vistos.has(a2.nome) && !t.depois.includes(a2.nome) && t.depois.length < 4) t.depois.push(a2.nome)
      }
      t.assuntos.sort((x, y) => (y.nivel - x.nivel) || (x.posicao || 99) - (y.posicao || 99))
    }
  })

  const diaHoje = dias[0] && dias[0].data.getTime() === hoje.getTime() ? dias[0] : null
  const principalHoje = diaHoje?.itens[0]
  const hojeTarefa = diaHoje && principalHoje && faltaHoje + adiantarFalta > 0
    ? { slug: principalHoje.slug, nome: principalHoje.nome, n: Math.min(faltaHoje + adiantarFalta, 100), focos: principalHoje.assuntos.slice(0, 3), itens: diaHoje.itens, mini: diaHoje.mini, tipo: diaHoje.tipo }
    : null
  const amanha = dias.slice(1).find((d) => d.total > 0 || d.mini || d.adiantado > 0) ?? null

  // Passadas: a de hoje e o primeiro dia de cada uma.
  const inicioPassada: Partial<Record<Passada, Date>> = {}
  for (const d of dias) for (const it of d.itens) if (!inicioPassada[it.passada]) inicioPassada[it.passada] = d.data
  const passadaAtual: Passada | null = hoje >= inicioRetaFinal ? null : diaHoje?.passada ?? dias.find((d) => d.passada)?.passada ?? null

  // Projeção: o que estará feito até a reta final, se o plano for seguido.
  const agendadas = dias.reduce((s2, d) => s2 + d.total, 0) + feitasHoje
  const maisCai = indice.questoes.filter((q) => entraNoPlano(q, simulados) && passadaDe(q.id) === 1)
  const maisCaiFeitas = maisCai.filter((q) => respondidas[q.id]).length
  const maisCaiAgendadas = dias.reduce((s2, d) => s2 + d.itens.filter((it) => it.passada === 1).reduce((s3, it) => s3 + it.n, 0), 0)
  let fimMaisCai: Date | null = null
  for (const d of dias) if (d.itens.some((it) => it.passada === 1)) fimMaisCai = d.data
  const projecao = {
    alvoPct: alvo ? Math.min(100, Math.round(((feitas - feitasHoje + agendadas) / alvo) * 100)) : 100,
    maisCaiPct: maisCai.length ? Math.min(100, Math.round(((maisCaiFeitas + maisCaiAgendadas) / maisCai.length) * 100)) : 100,
    fimMaisCai, cortadas, tetoAtivo,
  }
  const semanaNumero = Math.max(1, Math.floor(diasEntre(criado, hoje) / 7) + 1)
  const semanasTotal = Math.max(semanaNumero, Math.ceil(diasEntre(criado, prova) / 7))

  const metaMedia = Math.max(20, Math.min(80, Math.round(alvo / totalDiasPlano) || 30))
  const fase: FaseCronograma = hoje >= prova ? 'passou' : hoje >= vespera ? 'vespera' : hoje >= inicioModoProva ? 'prova' : hoje >= inicioRetaFinal ? 'revisao' : 'conteudo'

  return {
    diasAteProva: diasEntre(hoje, prova),
    diasEstudoRestantes, inicioRetaFinal, diasRetaFinal: diasFinais, inicioModoProva, vespera, fase, metaMedia, alvo, feitas, restante, metaDiaria, feitasHoje, faltaHoje,
    adiantadoHoje, extraHoje, adiantarPedido, adiantarFalta, metaHojeSemAdiantar,
    esperadoAteHoje, ritmo, temas, semanas, hoje: hojeTarefa,
    naRetaFinal: hoje >= inicioRetaFinal && hoje < prova,
    provaPassou: hoje >= prova,
    metaDiaNormal, tipoHoje, miniHoje, dias, amanha, passadaAtual, inicioPassada, semanaNumero, semanasTotal, projecao,
  }
}

const unicos = (lista: string[]) => [...new Set(lista)]

/** Até quantos dias para trás um dia sem registro de adiantamento é refeito. */
export const DIAS_INFERIR_ADIANTADO = 7
const cacheMetaDoDia = new WeakMap<object, Map<string, number>>()

/**
 * A meta que um dia passado teve, refeita com as respostas que existiam até o fim dele
 * (e os adiantamentos conhecidos até ali). Guardada em cache: as respostas de dias
 * passados quase não mudam, e o cálculo roda a cada resposta.
 */
function metaDoDiaPassado(indice: Indice, respondidas: Record<string, RegistroMinimo>, plano: PlanoSalvo, dia: Date): number {
  const chave = chaveData(dia)
  const fim = inicioDaChave(somarDias(chave, 1))
  const ate: Record<string, RegistroMinimo> = {}
  let n = 0, soma = 0
  for (const [id, r] of Object.entries(respondidas)) {
    const primeira = r?.historico?.[0]?.em ?? r?.q
    if (primeira === undefined || primeira >= fim) continue
    ate[id] = r; n++; soma = (soma + primeira) % 1e12
  }
  const { marcasDia: _m, ...opcoes } = plano.opcoes ?? {}
  const assinatura = JSON.stringify([chave, plano.data_prova, plano.intensidade, plano.folgas, plano.base_respondidas, plano.criado_em, plano.incluir_simulados, opcoes, n, soma])
  let cache = cacheMetaDoDia.get(indice)
  if (!cache) { cache = new Map(); cacheMetaDoDia.set(indice, cache) }
  const guardada = cache.get(assinatura)
  if (guardada !== undefined) return guardada
  const c = calcularPlano(indice, ate, plano, inicioDaChave(chave) + 12 * 3_600_000, { soMeta: true })
  const meta = c.naRetaFinal ? Number.POSITIVE_INFINITY : c.metaDiaria
  if (cache.size > 200) cache.clear()
  cache.set(assinatura, meta)
  return meta
}

/**
 * Registros de adiantamento que faltam nos últimos dias: em cada dia de estudo sem
 * registro, a meta é refeita (metaDoDiaPassado) e, se a pessoa passou dela, o dia
 * ganha o registro { em, meta }. Em dia de folga a meta é zero. Vai do mais antigo ao
 * mais novo, levando os já conhecidos, para que um dia adiantado alivie o seguinte.
 */
function inferirAdiantados(indice: Indice, respondidas: Record<string, RegistroMinimo>, plano: PlanoSalvo, hoje: Date, criado: Date, inicioRetaFinal: Date, primeirasPorDia: Map<number, number>): RegistroAdiantado[] {
  const reais = opcoesDe(plano).adiantados
  const conhecidos = [...reais]
  const novos: RegistroAdiantado[] = []
  for (let k = DIAS_INFERIR_ADIANTADO; k >= 1; k--) {
    const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - k)
    if (dia < criado || dia >= inicioRetaFinal) continue
    const em = chaveData(dia)
    if (reais.some((r) => r.em === em)) continue
    const feitas = primeirasPorDia.get(dia.getTime()) ?? 0
    if (!feitas) continue
    const meta = plano.folgas.includes(dia.getDay()) ? 0 : metaDoDiaPassado(indice, respondidas, { ...plano, opcoes: { ...(plano.opcoes ?? {}), adiantados: conhecidos.filter((r) => r.em < em) } }, dia)
    if (feitas <= meta) continue
    const registro = { em, meta }
    novos.push(registro); conhecidos.push(registro)
  }
  return novos
}

/** Assuntos que a pessoa já domina: 85% ou mais de acerto em 15 ou mais questões. Saem para a 3ª passada. */
export function assuntosDominados(indice: Indice, respondidas: Record<string, RegistroMinimo>): Set<string> {
  const focos = focoPorQuestao(indice)
  const conta = new Map<string, { certas: number; total: number }>()
  for (const [id, r] of Object.entries(respondidas)) {
    if (r.c === null) continue
    const nome = focos.get(id)?.nome
    if (!nome) continue
    const c = conta.get(nome) ?? { certas: 0, total: 0 }
    c.total++; if (r.c === true && r.confianca !== 'chute') c.certas++
    conta.set(nome, c)
  }
  return new Set([...conta].filter(([, c]) => c.total >= 15 && c.certas / c.total >= 0.85).map(([nome]) => nome))
}

/** Linha de base do plano: questões do acervo (sem cópias nem anuladas) já respondidas. */
export function respondidasNoAcervo(indice: Indice, respondidas: Record<string, unknown>, simulados = true): number {
  return indice.questoes.filter((q) => entraNoPlano(q, simulados) && respondidas[q.id]).length
}

/** Meta diária que um plano novo teria, para mostrar ao escolher a intensidade. */
export function simularMeta(indice: Indice, respondidas: Record<string, RegistroMinimo>, dataProva: string, intensidade: Intensidade, folgas: number[], simulados = true): number {
  const base = respondidasNoAcervo(indice, respondidas, simulados)
  return calcularPlano(indice, respondidas, { data_prova: dataProva, intensidade, folgas, prova: '', base_respondidas: base, criado_em: new Date().toISOString(), incluir_simulados: simulados }).metaDiaria
}

/**
 * Por tema do acervo, os assuntos mais cobrados (os que caem muito ou com
 * frequência) que ainda têm questão por fazer, do mais para o menos cobrado.
 */
export function focosQueFaltam(indice: Indice, respondidas: Record<string, unknown>, maximo = 3): Map<string, string[]> {
  const porTema = new Map<string, Array<{ nome: string; nivel: Nivel }>>()
  for (const area of AREAS) {
    for (const foco of area.focos) {
      if (foco.nivel < 3) continue
      if (!idsDoFoco(indice, area, foco).some((id) => !respondidas[id])) continue
      const lista = porTema.get(area.slug) ?? []
      if (!lista.some((f) => f.nome === foco.nome)) lista.push({ nome: foco.nome, nivel: foco.nivel })
      porTema.set(area.slug, lista)
    }
  }
  const resultado = new Map<string, string[]>()
  for (const [slug, lista] of porTema) resultado.set(slug, lista.sort((a, b) => b.nivel - a.nivel).slice(0, maximo).map((f) => f.nome))
  return resultado
}

/** Semente estável a partir do id, para sortear sempre na mesma ordem. */
function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * Ordem fixa das questões de um tema no cronograma: primeiro os assuntos que
 * mais caem, um assunto de cada vez (na ordem do ranking), e dentro de cada
 * assunto uma ordem sorteada, mas sempre a mesma.
 */
export function ordenarPorFoco(ids: string[], focos: Map<string, { nivel: number; ordem: number }>, antes?: (id: string) => number): string[] {
  // As chaves de cada questão são calculadas uma vez (antes, o mapa e o hash rodavam a cada comparação).
  // `antes` ordena primeiro por outro critério (a passada), mantendo esta ordem dentro dele.
  const chaves = ids.map((id) => { const f = focos.get(id); return { id, a: antes ? antes(id) : 0, n: f?.nivel ?? 0, o: f?.ordem ?? 1e6, h: hashId(id) } })
  chaves.sort((x, y) => x.a - y.a || y.n - x.n || x.o - y.o || x.h - y.h)
  return chaves.map((c) => c.id)
}

function ordemDoTema(indice: Indice, livres: string[]): string[] {
  return ordenarPorFoco(livres, focoPorQuestao(indice))
}

/**
 * As questões de hoje dentro de um tema: só as que ainda não foram feitas,
 * começando pelos assuntos que mais caem (sorteadas dentro de cada nível).
 */
export function idsDoDia(indice: Indice, slug: string, respondidas: Record<string, unknown>, n: number, simulados = true, sortear: () => number = Math.random): string[] {
  const tema = indice.temas.findIndex((t) => t.slug === slug)
  if (tema < 0 || n <= 0) return []
  const livres = indice.questoes.filter((q) => q.t === tema && entraNoPlano(q, simulados) && !respondidas[q.id])
  if (!simulados) return ordemDoTema(indice, livres.map((q) => q.id)).slice(0, n)
  // Oficiais e simulados em filas separadas: a quantidade de simulados é controlada
  // (entre o mínimo e o máximo) e eles entram espalhados, não acumulados no fim.
  const oficiais = ordemDoTema(indice, livres.filter((q) => q.sim !== 1).map((q) => q.id))
  const doTema = embaralhar(livres.filter((q) => q.sim === 1).map((q) => q.id), sortear)
  const outros = embaralhar(indice.questoes.filter((q) => q.sim === 1 && q.t !== tema && entraNoPlano(q, true) && !respondidas[q.id]).map((q) => q.id), sortear)
  const { minimo, maximo } = faixaSimulados(n)
  // Alvo: um número sorteado dentro da faixa; se faltar oficial, os simulados completam.
  const alvo = minimo + Math.floor(sortear() * (maximo - minimo + 1))
  const sims = [...doTema, ...outros].slice(0, Math.max(alvo, n - oficiais.length))
  const base = oficiais.slice(0, n - Math.min(sims.length, n))
  return intercalar(base, sims.slice(0, n - base.length), sortear)
}

/** OrtoQuestões Simulados por sessão do cronograma (decisão do dono, 08/10/2026): de 2 a 6, nunca mais de ~30% da sessão. */
export function faixaSimulados(n: number): { minimo: number; maximo: number } {
  const minimo = n >= 4 ? 2 : n >= 2 ? 1 : 0
  return { minimo, maximo: Math.max(minimo, Math.min(6, Math.round(n * 0.3))) }
}

function embaralhar<T>(lista: T[], sortear: () => number): T[] {
  for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(sortear() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]] }
  return lista
}

/**
 * Espalha os simulados pela sessão: divide a sessão em faixas iguais e põe um
 * simulado numa posição sorteada de cada faixa. Assim o primeiro cai no começo
 * e nenhum trecho fica cheio deles.
 */
function intercalar(oficiais: string[], sims: string[], sortear: () => number): string[] {
  const total = oficiais.length + sims.length
  if (!sims.length) return oficiais
  const posicoes = new Set<number>()
  sims.forEach((_, k) => {
    const ini = Math.floor((k * total) / sims.length), fim = Math.floor(((k + 1) * total) / sims.length)
    posicoes.add(ini + Math.floor(sortear() * Math.max(1, fim - ini)))
  })
  const resultado: string[] = []
  let o = 0, s = 0
  for (let i = 0; i < total; i++) resultado.push(posicoes.has(i) && s < sims.length ? sims[s++] : o < oficiais.length ? oficiais[o++] : sims[s++])
  return resultado
}

/**
 * As questões da sessão de hoje com mais de uma área (reforma de 14/10/2026):
 * cada área com a sua parte (e a mesma regra de simulados de idsDoDia), e a
 * mistura espalhada pela sessão em vez de ficar no fim.
 */
export function idsDoDiaPlano(indice: Indice, itens: Array<{ slug: string; n: number; mistura: boolean }>, respondidas: Record<string, unknown>, simulados = true, sortear: () => number = Math.random): string[] {
  const usados = new Set<string>()
  const partes = itens.map((it) => {
    const ids = idsDoDia(indice, it.slug, respondidas, it.n, simulados, sortear).filter((id) => !usados.has(id))
    ids.forEach((id) => usados.add(id))
    return { mistura: it.mistura, ids }
  })
  const principal = partes.filter((p) => !p.mistura).flatMap((p) => p.ids)
  const mistura = partes.filter((p) => p.mistura).flatMap((p) => p.ids)
  if (!mistura.length) return principal
  // Uma da mistura a cada k da principal, começando um pouco depois do início.
  const resultado: string[] = []
  const passo = Math.max(1, Math.round((principal.length + mistura.length) / mistura.length))
  let m = 0
  for (let i = 0, p = 0; p < principal.length || m < mistura.length; i++) {
    if (m < mistura.length && (i % passo === passo - 1 || p >= principal.length)) resultado.push(mistura[m++])
    else if (p < principal.length) resultado.push(principal[p++])
  }
  return resultado
}
