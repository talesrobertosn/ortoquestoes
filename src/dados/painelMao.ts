import type { CalculoPlano, DiaPlano, ItemDia, Passada, PlanoSalvo, SemanaPlano, TemaPlano } from './planoEstudo'
import type { DiaMao, PlanoMao, ProvaMao } from './cronogramaMao'
import { slugDaAreaMao } from './modalidades'
import { diaCivil, diasEntre, hojeBR, inicioDaChave, somarDias } from '../util/dia'

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
    data: diaCivil(dia.data), tipo: dia.dificil ? 'dificil' : 'estudo', meta: dia.n, itens, total: dia.n,
    passada: itens.length ? (Math.min(...itens.map((i) => i.passada)) as Passada) : null,
    mini: dia.tipo === 'simulado', adiantado: dia.adiantado ?? 0, puxado: null,
  }
}

export function painelMao(p: PlanoMao, agora = Date.now()): { plano: PlanoSalvo; calculo: CalculoPlano } {
  const c = p.config
  const hoje = diaCivil(hojeBR(agora))
  const prova = diaCivil(c.dataProva)
  const plano: PlanoSalvo = {
    data_prova: c.dataProva, intensidade: 'firme', folgas: [0, 1, 2, 3, 4, 5, 6].filter((d) => !c.dias.includes(d)),
    prova: NOME_PROVA_MAO[c.prova], base_respondidas: 0, criado_em: new Date(inicioDaChave(c.criadoEm)).toISOString(), incluir_simulados: true, opcoes: c.semanasDificeis?.length ? { semanasDificeis: c.semanasDificeis } : null,
  }
  // dias de estudo até a reta final (o calendário pinta a reta final pelas datas)
  const dias = p.agenda.filter((d) => d.tipo === 'estudo' || d.tipo === 'simulado').map(diaDoPlano)
  const hojeMao = p.hoje
  const naRetaFinal = p.fase === 'revisao' || p.fase === 'prova' || p.fase === 'vespera'
  const itensHoje = itensDoDia(hojeMao)
  const principal = itensHoje[0]
  const hojeDia = naRetaFinal || p.encerrado ? null : {
    slug: principal?.slug ?? 'mao-geral', nome: principal?.nome ?? (hojeMao.tipo === 'simulado' ? 'Mini-simulado' : 'Folga'), n: p.metaHoje,
    focos: principal?.assuntos ?? [], itens: itensHoje, mini: hojeMao.tipo === 'simulado', tipo: hojeMao.tipo === 'folga' ? 'folga' as const : hojeMao.dificil ? 'dificil' as const : 'estudo' as const,
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
    adiantadoHoje: hojeMao.adiantado ?? 0,
    extraHoje: Math.max(0, p.feitasHoje - p.metaHoje),
    adiantarPedido: 0,
    adiantarFalta: 0,
    metaHojeSemAdiantar: p.metaHoje + (hojeMao.adiantado ?? 0),
    esperadoAteHoje: p.esperadoAteHoje,
    ritmo: p.esperadoAteHoje > 0 ? Math.round((100 * (p.feitasDesdeInicio - p.esperadoAteHoje)) / p.esperadoAteHoje) : 0,
    temas: [...porArea.values()].sort((a, b) => b.incidencia - a.incidencia),
    semanas,
    hoje: hojeDia,
    naRetaFinal,
    provaPassou: p.encerrado,
    metaDiaNormal: p.metaNormal,
    tipoHoje: hojeMao.tipo === 'folga' ? 'folga' : hojeMao.dificil ? 'dificil' : 'estudo',
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

type Respondidas = Record<string, { c: boolean | null; q?: number; historico?: Array<{ em: number; correta: boolean | null }> } | undefined>

/**
 * O resumo da semana que passou (domingo e segunda), como no cronograma de ortopedia, só com as questões do
 * plano da mão; a área mais fraca é a grande área da mão com o menor acerto (8 respostas ou mais).
 */
export function resumoSemanaMao(p: PlanoMao, respondidas: Respondidas, calculo: CalculoPlano, agora = Date.now()) {
  const hoje = diaCivil(hojeBR(agora))
  if (hoje.getDay() !== 0 && hoje.getDay() !== 1) return null
  const chaveFim = somarDias(hojeBR(agora), hoje.getDay() === 1 ? 0 : 1)
  const fim = inicioDaChave(chaveFim)
  const inicio = inicioDaChave(somarDias(chaveFim, -7))
  const areaDe = new Map(p.temas.flatMap((t) => t.ids.map((id) => [id, t.area] as const)))
  let feitas = 0, certas = 0, validas = 0
  const dias = new Set<string>()
  const porArea = new Map<string, { c: number; v: number }>()
  for (const [id, area] of areaDe) {
    const r = respondidas[id]
    if (!r) continue
    for (const h of r.historico ?? (r.q !== undefined ? [{ em: r.q, correta: r.c }] : [])) {
      if (h.em < inicio || h.em >= fim) continue
      feitas++; dias.add(hojeBR(h.em))
      if (h.correta === null) continue
      validas++; if (h.correta) certas++
      const x = porArea.get(area) ?? { c: 0, v: 0 }; x.v++; if (h.correta) x.c++; porArea.set(area, x)
    }
  }
  const fraca = [...porArea].filter(([, x]) => x.v >= 8).sort((a, b) => a[1].c / a[1].v - b[1].c / b[1].v)[0]
  const proximos = calculo.dias.filter((d) => d.data.getTime() >= fim && d.data.getTime() < fim + 7 * 86_400_000)
  const nomes = [...new Set(proximos.flatMap((d) => d.itens.filter((i) => !i.mistura).map((i) => i.nome)))]
  return { feitas, dias: dias.size, acerto: validas >= 5 ? Math.round((certas / validas) * 100) : null, fraca: fraca?.[0] ?? null, proxima: nomes.length ? nomes.join(', ') : null }
}

/** As próximas questões do plano depois de hoje, na ordem da agenda (para adiantar). */
export function idsParaAdiantar(p: PlanoMao, n: number): string[] {
  return p.agenda.filter((d) => d.data > p.hoje.data).flatMap((d) => d.partes.flatMap((x) => x.ids)).slice(0, n)
}
