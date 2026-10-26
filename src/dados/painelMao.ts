import type { CalculoPlano, DiaPlano, ItemDia, Passada, PlanoSalvo, SemanaPlano, TemaPlano } from './planoEstudo'
import type { DiaMao, PlanoMao, ProvaMao } from './cronogramaMao'
import { slugDaAreaMao } from './modalidades'
import { diaCivil, diasEntre, hojeBR, inicioDaChave } from '../util/dia'

/**
 * O plano da mão no formato do cronograma de ortopedia (27/10/2026, pedido do Tales: "a arquitetura parecida
 * com o cronograma do TEOT/TARO"). O motor continua o da mão (src/dados/cronogramaMao.ts); aqui só se traduz
 * o resultado para os mesmos componentes da página de ortopedia: o topo "Onde você está" com as passadas e a
 * reta final, o calendário, o cartão Hoje, amanhã, esta semana, depois, como você está indo e a prontidão.
 * Cada grande área da mão vira uma "área" com cor própria (src/dados/coresAreas.ts).
 */
export const NOME_PROVA_MAO: Record<ProvaMao, string> = {
  ingresso: 'Ingresso em Cirurgia da Mão',
  titulo: 'Título da Mão (SBCM e SIMÃO)',
}

const segundaDe = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
const menosDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - n)

/** As partes de um dia agrupadas por grande área: a primeira é a principal, as outras a mistura. */
function itensDoDia(dia: DiaMao): ItemDia[] {
  const porArea = new Map<string, ItemDia>()
  for (const p of dia.partes) {
    const slug = slugDaAreaMao(p.area)
    const item = porArea.get(slug) ?? { slug, nome: p.area, n: 0, assuntos: [], mistura: porArea.size > 0, passada: p.passada as Passada, ids: [] }
    item.n += p.n
    if (!item.assuntos.includes(p.nome)) item.assuntos.push(p.nome)
    item.ids.push(...p.ids)
    item.passada = Math.min(item.passada, p.passada) as Passada
    porArea.set(slug, item)
  }
  return [...porArea.values()]
}

function diaDoPlano(dia: DiaMao): DiaPlano {
  const itens = itensDoDia(dia)
  return {
    data: diaCivil(dia.data), tipo: 'estudo', meta: dia.n, itens, total: dia.n,
    passada: itens.length ? (Math.min(...itens.map((i) => i.passada)) as Passada) : null,
    mini: dia.tipo === 'simulado', adiantado: 0, puxado: null,
  }
}

export function painelMao(p: PlanoMao, agora = Date.now()): { plano: PlanoSalvo; calculo: CalculoPlano } {
  const c = p.config
  const hoje = diaCivil(hojeBR(agora))
  const prova = diaCivil(c.dataProva)
  const plano: PlanoSalvo = {
    data_prova: c.dataProva, intensidade: 'firme', folgas: [0, 1, 2, 3, 4, 5, 6].filter((d) => !c.dias.includes(d)),
    prova: NOME_PROVA_MAO[c.prova], base_respondidas: 0, criado_em: new Date(inicioDaChave(c.criadoEm)).toISOString(), incluir_simulados: true, opcoes: null,
  }
  // dias de estudo até a reta final (o calendário pinta a reta final pelas datas)
  const dias = p.agenda.filter((d) => d.tipo === 'estudo' || d.tipo === 'simulado').map(diaDoPlano)
  const hojeMao = p.hoje
  const naRetaFinal = p.fase === 'revisao' || p.fase === 'prova' || p.fase === 'vespera'
  const itensHoje = itensDoDia(hojeMao)
  const principal = itensHoje[0]
  const hojeDia = naRetaFinal || p.encerrado ? null : {
    slug: principal?.slug ?? 'mao-geral', nome: principal?.nome ?? (hojeMao.tipo === 'simulado' ? 'Mini-simulado' : 'Folga'), n: p.metaHoje,
    focos: principal?.assuntos ?? [], itens: itensHoje, mini: hojeMao.tipo === 'simulado', tipo: hojeMao.tipo === 'folga' ? 'folga' as const : 'estudo' as const,
  }
  const futuros = dias.filter((d) => d.data > hoje)

  // semanas, para o "semana a semana" e a exportação do calendário
  const semanas: SemanaPlano[] = []
  for (const d of dias) {
    const seg = segundaDe(d.data)
    let s = semanas[semanas.length - 1]
    if (!s || s.inicio.getTime() !== seg.getTime()) { s = { inicio: seg, fim: d.data, diasEstudo: 0, temas: [], total: 0, atual: seg.getTime() === segundaDe(hoje).getTime() }; semanas.push(s) }
    s.fim = d.data; s.diasEstudo++; s.total += d.total
    for (const it of d.itens) {
      const t = s.temas.find((x) => x.slug === it.slug) ?? (s.temas.push({ slug: it.slug, nome: it.nome, n: 0, focos: [], assuntos: [], posicaoArea: null, depois: [] }), s.temas[s.temas.length - 1])
      t.n += it.n
      for (const a of it.assuntos) {
        const ja = t.assuntos.find((x) => x.nome === a)
        const n = it.ids.length && it.assuntos.length === 1 ? it.n : 0
        if (ja) ja.n += n; else t.assuntos.push({ nome: a, n, nivel: it.passada === 1 ? 4 : it.passada === 2 ? 3 : 2, posicao: 0 })
      }
    }
  }

  // as grandes áreas da mão como "áreas" do plano (prontidão e desempenho por área)
  const porArea = new Map<string, TemaPlano>()
  const certasDa = new Map<string, number>()
  for (const t of p.temas) {
    const slug = slugDaAreaMao(t.area)
    const a = porArea.get(slug) ?? { slug, nome: t.area, faltam: 0, acerto: null, acertoEstimado: null, respondidas: 0, reforcado: false, incidencia: 0 }
    a.faltam += t.pendentes.length
    a.respondidas += t.validas
    a.incidencia += t.pctEdicao
    const certas = (certasDa.get(slug) ?? 0) + t.certas
    certasDa.set(slug, certas)
    a.acerto = a.respondidas >= 5 ? Math.round((100 * certas) / a.respondidas) : null
    a.acertoEstimado = a.acerto
    porArea.set(slug, a)
  }

  const feitas = p.feitasDesdeInicio + p.feitasHoje
  const restante = p.total - p.feitas
  const passadaComData = (x: 1 | 2 | 3) => (p.inicioPassada[x] ? diaCivil(p.inicioPassada[x]!) : undefined)
  const inicioPassada: Partial<Record<Passada, Date>> = {}
  for (const x of [1, 2, 3] as const) { const d = passadaComData(x); if (d) inicioPassada[x] = d }
  const calculo: CalculoPlano = {
    diasAteProva: p.diasRestantes,
    diasEstudoRestantes: p.diasDeEstudo,
    inicioRetaFinal: menosDias(prova, p.diasRetaFinal),
    diasRetaFinal: p.diasRetaFinal,
    inicioModoProva: menosDias(prova, 7),
    vespera: menosDias(prova, 1),
    fase: p.fase,
    metaMedia: p.metaNormal,
    alvo: feitas + restante,
    feitas,
    restante,
    metaDiaria: p.metaHoje,
    feitasHoje: p.feitasHoje,
    faltaHoje: Math.max(0, p.metaHoje - p.feitasHoje),
    adiantadoHoje: 0,
    extraHoje: Math.max(0, p.feitasHoje - p.metaHoje),
    adiantarPedido: 0,
    adiantarFalta: 0,
    metaHojeSemAdiantar: p.metaHoje,
    esperadoAteHoje: p.esperadoAteHoje,
    ritmo: p.esperadoAteHoje > 0 ? Math.round((100 * (p.feitasDesdeInicio - p.esperadoAteHoje)) / p.esperadoAteHoje) : 0,
    temas: [...porArea.values()].sort((a, b) => b.incidencia - a.incidencia),
    semanas,
    hoje: hojeDia,
    naRetaFinal,
    provaPassou: p.encerrado,
    metaDiaNormal: p.metaNormal,
    tipoHoje: hojeMao.tipo === 'folga' ? 'folga' : 'estudo',
    miniHoje: hojeMao.tipo === 'simulado',
    dias,
    amanha: futuros[0] ?? null,
    passadaAtual: p.passadaAtual as Passada | null,
    inicioPassada,
    semanaNumero: Math.floor(Math.max(0, diasEntre(c.criadoEm, hojeBR(agora))) / 7) + 1,
    semanasTotal: Math.max(1, Math.ceil(Math.max(1, diasEntre(c.criadoEm, c.dataProva)) / 7)),
    projecao: { alvoPct: p.projecaoAlvo, maisCaiPct: p.projecaoMaisCai, fimMaisCai: p.fimMaisCai ? diaCivil(p.fimMaisCai) : null, cortadas: p.cortadas, tetoAtivo: p.tetoAtivo },
    puxados: {},
    reservados: [],
  }
  return { plano, calculo }
}

/** Os ids de um dia do plano ("AAAA-MM-DD"), para fazer as questões dele antes da hora. */
export function idsDoDiaMao(p: PlanoMao, dia: string): string[] {
  return p.agenda.find((d) => d.data === dia)?.partes.flatMap((x) => x.ids) ?? []
}
