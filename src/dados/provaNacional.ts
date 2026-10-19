/**
 * Simulado Nacional 2.0, parte C: as regras puras da página e da prova
 * (docs/superpowers/specs/2026-10-19-simulado-nacional-contrato.md). Sem React
 * e sem rede, para os testes em fixtures/testar_prova_nacional.mjs.
 *
 * Letras: a edição embaralha as alternativas. `permutacao` 'CADB' quer dizer
 * que a letra nova A mostra a alternativa original C, a nova B mostra a A, e
 * assim por diante. Na prova e no servidor, valem as letras NOVAS; no acervo
 * (e no comentário da questão avulsa), as originais.
 */
import type { EstadoSessao, Filtros, Letra, Questao, Resposta } from './tipos'
import { letraNova, letraOriginal, prontidaoDoTema, situacao, type Prontidao } from './simuladoNacional'
import type { DestaqueInicioSN, EdicaoSN, InicioSN, RespostasSN } from './apiSimuladoNacional'

const LETRAS = 'ABCDE'

/** A permutação serve para esta questão: mesmas letras, uma vez cada, do tamanho das alternativas. */
export function permutacaoValida(permutacao: string | undefined | null, nAlternativas: number): permutacao is string {
  if (!permutacao || permutacao.length !== nAlternativas || nAlternativas > LETRAS.length) return false
  return [...permutacao].sort().join('') === LETRAS.slice(0, nAlternativas)
}

/**
 * A questão como aparece na edição: as alternativas na ordem nova, com as letras
 * novas, e o gabarito traduzido. Sem permutação válida, a questão volta como está.
 */
export function permutarQuestao(questao: Questao, permutacao: string | undefined | null): Questao {
  const porLetra = new Map(questao.alternativas.map((a) => [a.letra, a]))
  if (!permutacaoValida(permutacao, questao.alternativas.length) || [...permutacao].some((l) => !porLetra.has(l as Letra))) return questao
  return {
    ...questao,
    alternativas: [...permutacao].map((original, i) => ({ letra: LETRAS[i] as Letra, texto: porLetra.get(original as Letra)!.texto })),
    gabarito: questao.gabarito ? letraNova(permutacao, questao.gabarito) as Letra : null,
  }
}

/** A letra do acervo (a do comentário) para uma letra nova. */
export function paraOriginal(permutacao: string | undefined | null, nova: string | null): string | null {
  if (!nova) return null
  if (!permutacao) return nova
  return letraOriginal(permutacao, nova) ?? nova
}

export interface AlternativaCorrigida {
  /** Letra na prova (ordem da edição). */
  letra: string
  /** Letra no acervo, a que o comentário usa. */
  original: string
  texto: string
  gabarito: boolean
  marcada: boolean
}

/** As alternativas da correção, na ordem da edição, com a letra do acervo ao lado. */
export function alternativasDaCorrecao(questao: Questao, permutacao: string, gabarito: string, marcada: string | null): AlternativaCorrigida[] {
  const exibida = permutarQuestao(questao, permutacao)
  const valida = exibida !== questao || !permutacao
  return exibida.alternativas.map((a) => ({
    letra: a.letra,
    original: valida ? paraOriginal(permutacao, a.letra) ?? a.letra : a.letra,
    texto: a.texto,
    gabarito: a.letra === gabarito,
    marcada: a.letra === marcada,
  }))
}

// ---------------------------------------------------------------------------
// A sessão da prova
// ---------------------------------------------------------------------------

/** As respostas do servidor no formato da sessão (a correção é do servidor: correta fica null). */
export function respostasDoServidor(respostas: RespostasSN | null | undefined): Record<string, Resposta> {
  const saida: Record<string, Resposta> = {}
  for (const [id, letra] of Object.entries(respostas ?? {})) {
    if (letra && /^[A-E]$/.test(letra)) saida[id] = { escolhida: letra as Letra, correta: null, segundos: 0, confianca: 'seguro' }
  }
  return saida
}

/**
 * A sessão da prova a partir de sn_iniciar. O servidor manda; o que este
 * aparelho marcou e ainda não subiu (pendentesNacional) vence, para não perder
 * a última marcação feita sem rede.
 */
export function montarSessaoNacional(inicio: InicioSN, local: EstadoSessao | null, filtros: Filtros): EstadoSessao {
  const itens = [...inicio.itens].sort((a, b) => a.ordem - b.ordem)
  const ids = itens.map((i) => i.id_questao)
  const permutacoes = Object.fromEntries(itens.map((i) => [i.id_questao, i.permutacao]))
  const criadaEm = Date.parse(inicio.iniciado_em)
  const prazoEm = Date.parse(inicio.prazo_em)
  const mesma = !!local && local.nacional === inicio.edicao && !local.concluidaEm
  const respostas = respostasDoServidor(inicio.respostas)
  for (const id of Object.keys(respostas)) if (!ids.includes(id)) delete respostas[id]
  const pendentes = mesma ? (local!.pendentesNacional ?? []).filter((id) => ids.includes(id)) : []
  for (const id of pendentes) {
    const r = local!.respostas[id]
    if (r) respostas[id] = r
    else delete respostas[id]
  }
  // Tempo e confiança desta mesma prova ficam (o servidor só guarda a letra).
  if (mesma) for (const [id, r] of Object.entries(local!.respostas)) {
    if (respostas[id] && respostas[id].escolhida === r.escolhida) respostas[id] = { ...respostas[id], segundos: r.segundos, confianca: r.confianca }
  }
  const revisar = mesma && local!.revisarPendente ? local!.revisar.filter((id) => ids.includes(id)) : (inicio.revisar ?? []).filter((id) => ids.includes(id))
  const primeiraEmBranco = ids.findIndex((id) => !respostas[id])
  const posicao = mesma ? Math.min(local!.posicao, ids.length - 1) : Math.max(0, primeiraEmBranco)
  return {
    id: `nacional-${inicio.edicao}`,
    criadaEm,
    filtros,
    ids,
    posicao: Math.max(0, posicao),
    respostas,
    revisar,
    riscadas: mesma ? local!.riscadas : {},
    concluidaEm: null,
    simulado: true,
    limiteSegundos: Math.max(0, Math.round((prazoEm - criadaEm) / 1000)),
    nacional: inicio.edicao,
    permutacoes,
    prazoEm,
    pendentesNacional: pendentes,
    revisarPendente: mesma ? !!local!.revisarPendente : false,
  }
}

/** As letras marcadas (novas) para o servidor; `ids` limita a algumas (as pendentes), null apaga. */
export function respostasParaServidor(sessao: EstadoSessao, ids?: string[]): RespostasSN {
  const saida: RespostasSN = {}
  for (const id of ids ?? sessao.ids) {
    const letra = sessao.respostas[id]?.escolhida ?? null
    if (ids || letra) saida[id] = letra as RespostasSN[string]
  }
  return saida
}

/** Segundos até o prazo da prova (o do servidor, se houver). Null fora do simulado cronometrado. */
export function restanteDaProva(sessao: Pick<EstadoSessao, 'prazoEm' | 'criadaEm' | 'limiteSegundos'>, agora = Date.now()): number | null {
  if (sessao.prazoEm) return Math.round((sessao.prazoEm - agora) / 1000)
  if (!sessao.limiteSegundos) return null
  return Math.round((sessao.criadaEm + sessao.limiteSegundos * 1000 - agora) / 1000)
}

/** Alerta calmo de tempo: em 15 e em 5 minutos (uma vez cada). */
export function alertaDeTempo(restante: number | null, jaAvisados: number[]): 15 | 5 | null {
  if (restante === null || restante <= 0) return null
  if (restante <= 300 && !jaAvisados.includes(5)) return 5
  if (restante <= 900 && restante > 300 && !jaAvisados.includes(15)) return 15
  return null
}

/** O que dizer antes de entregar: em branco e marcadas para rever. */
export function resumoParaEntregar(sessao: EstadoSessao): { brancas: number; revisar: number; total: number } {
  const brancas = sessao.ids.filter((id) => !sessao.respostas[id]?.escolhida).length
  return { brancas, revisar: sessao.revisar.filter((id) => sessao.ids.includes(id)).length, total: sessao.ids.length }
}

// ---------------------------------------------------------------------------
// A página
// ---------------------------------------------------------------------------

/**
 * O estado da página para esta pessoa, com um botão principal cada:
 * visitante → "Criar conta grátis e participar"; inscrever → "Quero participar";
 * inscrito → "Você está inscrito"; assinar → convite do plano; comecar → "Começar
 * a prova"; continuar → "Continuar a prova"; entregando → entrega automática;
 * resultado → "Ver meu resultado"; encerrada → "Ver o ranking final".
 */
export type EstadoPagina = 'visitante' | 'inscrever' | 'inscrito' | 'assinar' | 'comecar' | 'continuar' | 'entregando' | 'resultado' | 'encerrada'

export function estadoDaPagina(
  ed: Pick<EdicaoSN, 'abre_em' | 'fecha_em' | 'minha' | 'minha_inscricao' | 'aberto_a_todos'>,
  pessoa: { logado: boolean; premium: boolean },
  agora = Date.now(),
): EstadoPagina {
  if (!ed.abre_em || !ed.fecha_em) return 'encerrada'
  const s = situacao({ abre_em: ed.abre_em, fecha_em: ed.fecha_em, minha: pessoa.logado ? ed.minha : null }, agora)
  if (s === 'entregue') return 'resultado'
  if (s === 'andamento') return 'continuar'
  if (s === 'tempo-esgotado') return 'entregando'
  if (s === 'encerrada') return 'encerrada'
  if (!pessoa.logado) return 'visitante'
  if (!ed.aberto_a_todos && !pessoa.premium) return 'assinar'
  if (s === 'em-breve') return ed.minha_inscricao ? 'inscrito' : 'inscrever'
  return 'comecar'
}

/** O cartão do Simulado Nacional no Início: um botão por estado (sn_destaque_inicio). */
export type EstadoChamada = 'visitante' | 'inscrever' | 'inscrito' | 'comecar' | 'continuar' | 'resultado'
export function estadoDaChamada(d: Pick<DestaqueInicioSN, 'abre_em' | 'inscrito' | 'minha_situacao'>, logado: boolean, agora = Date.now()): EstadoChamada {
  if (d.minha_situacao === 'entregue') return 'resultado'
  if (d.minha_situacao === 'andamento') return 'continuar'
  if (!logado) return 'visitante'
  if (agora < Date.parse(d.abre_em)) return d.inscrito ? 'inscrito' : 'inscrever'
  return 'comecar'
}

const FUSO = 'America/Sao_Paulo'
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** Partes de uma data em São Paulo. */
function partesSP(iso: string | number) {
  const d = new Date(iso)
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((x) => [x.type, x.value]))
  const semana = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  return { dia: p.day, mes: p.month, ano: p.year, hora: Number(p.hour), minuto: Number(p.minute), semana }
}

/** "8h", "23h59". */
export function horaCurta(iso: string | number): string {
  const p = partesSP(iso)
  return p.minuto ? `${p.hora}h${String(p.minuto).padStart(2, '0')}` : `${p.hora}h`
}

/** { semana: 'sábado', data: '24/10', hora: '8h' } em São Paulo (o dia da semana sai da data). */
export function dataDaEdicao(iso: string | number): { semana: string; data: string; hora: string } {
  const p = partesSP(iso)
  return { semana: DIAS[p.semana], data: `${p.dia}/${p.mes}`, hora: horaCurta(iso) }
}

/** "sábado, 24/10, às 8h". */
export function dataPorExtenso(iso: string | number): string {
  const d = dataDaEdicao(iso)
  return `${d.semana}, ${d.data}, às ${d.hora}`
}

/** O dia seguinte ao fechamento, quando sai o ranking final ("01/11"). */
export function diaDoRankingFinal(fechaEm: string): string {
  return dataDaEdicao(Date.parse(fechaEm) + 60_000).data
}

/** "5 dias e 3 h", "3 h e 20 min", "12 min": quanto falta, sem segundos. */
export function contagem(ms: number): string {
  if (ms <= 0) return 'agora'
  const minutos = Math.ceil(ms / 60_000)
  const dias = Math.floor(minutos / 1440)
  const horas = Math.floor((minutos % 1440) / 60)
  const resto = minutos % 60
  if (dias >= 1) return horas ? `${dias} ${dias === 1 ? 'dia' : 'dias'} e ${horas} h` : `${dias} ${dias === 1 ? 'dia' : 'dias'}`
  if (horas >= 1) return resto ? `${horas} h e ${resto} min` : `${horas} h`
  return `${resto} min`
}

/** "1h12", "48 min": o tempo que sobra na prova, no botão. */
export function tempoCurto(segundos: number): string {
  const m = Math.max(0, Math.floor(segundos / 60))
  const h = Math.floor(m / 60)
  return h ? `${h}h${String(m % 60).padStart(2, '0')}` : `${m} min`
}

/** O título sem o prefixo ("Simulado Nacional · Outubro de 2026" → "Outubro de 2026"). */
export function nomeDaEdicao(titulo: string | null | undefined): string {
  return (titulo ?? '').replace(/^Simulado Nacional\s*[·:-]\s*/i, '').trim() || 'Simulado Nacional'
}

/** Um evento de calendário (.ics) para o dia da abertura, com o prazo na descrição. */
export function icsDaEdicao(ed: { edicao: string; titulo: string; abre_em: string; fecha_em: string; duracao_min: number }, url: string, agora = Date.now()): string {
  const utc = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const escapar = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  const inicio = Date.parse(ed.abre_em)
  const descricao = `${nomeDaEdicao(ed.titulo)}: ${ed.duracao_min / 60 >= 1 ? `${Math.round(ed.duracao_min / 6) / 10} horas` : `${ed.duracao_min} minutos`} de prova, quando você quiser até ${dataPorExtenso(ed.fecha_em)} (horário de Brasília).\n${url}`
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Orto Questoes//Simulado Nacional//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:simulado-nacional-${ed.edicao}@ortoquestoes.com.br`, `DTSTAMP:${utc(agora)}`,
    `DTSTART:${utc(inicio)}`, `DTEND:${utc(inicio + ed.duracao_min * 60_000)}`,
    `SUMMARY:${escapar(`Simulado Nacional OrtoQuestões (${nomeDaEdicao(ed.titulo)})`)}`, `DESCRIPTION:${escapar(descricao)}`, `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:O Simulado Nacional abre agora', 'TRIGGER:-PT30M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return linhas.map(dobrar).join('\r\n') + '\r\n'
}
/** RFC 5545: 75 octetos por linha. */
function dobrar(linha: string): string {
  const encoder = new TextEncoder()
  let saida = '', bytes = 0
  for (const c of linha) {
    const n = encoder.encode(c).length
    if (bytes + n > 75) { saida += '\r\n '; bytes = 1 }
    saida += c; bytes += n
  }
  return saida
}

export interface AreaProntidao { area: string; certas: number; total: number; media: number | null; estado: Prontidao; pct: number }

/** As áreas do resultado com a prontidão de cada uma, da mais forte para a que mais rende revisar. */
export function prontidaoPorArea(porArea: Array<{ area: string; certas: number; total: number; media: number | null }>): AreaProntidao[] {
  return porArea
    .map((a) => ({ ...a, estado: prontidaoDoTema(a.certas, a.total, a.media), pct: a.total ? Math.round((a.certas / a.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct || b.total - a.total || a.area.localeCompare(b.area, 'pt-BR'))
}

const lista = (nomes: string[]) => nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`

/**
 * A frase do resultado (regras de tato de docs/emails/TOM.md): o forte com o
 * nome da área, o fraco como oportunidade e sem número, nenhuma porcentagem
 * abaixo de 50% na frase.
 */
export function fraseDoResultado(areas: AreaProntidao[], nome: string): string {
  const prontas = areas.filter((a) => a.estado === 'pronto').map((a) => a.area)
  const revisar = areas.filter((a) => a.estado === 'reforcar').map((a) => a.area).reverse()
  const seus = nome ? `${nome}, seus pontos fortes` : 'Seus pontos fortes'
  if (prontas.length && revisar.length) return `${seus} nesta prova: ${lista(prontas.slice(0, 3))}. O que mais rende revisar agora: ${lista(revisar.slice(0, 2))}.`
  if (prontas.length) return `${seus} nesta prova: ${lista(prontas.slice(0, 4))}. Siga nesse ritmo.`
  if (revisar.length) return `${nome ? `${nome}, o` : 'O'} que mais rende revisar agora: ${lista(revisar.slice(0, 3))}. Cada questão da correção abaixo tem o comentário completo.`
  return `${nome ? `${nome}, você` : 'Você'} está no caminho em todas as áreas. Um pouco mais de volume e a nota sobe.`
}
