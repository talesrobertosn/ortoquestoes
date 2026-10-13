/**
 * Motor de regras da Batalha: funções puras, sem tela, sem relógio e sem
 * sorteio solto. Cada ação recebe o estado e devolve { estado, eventos }; os
 * eventos são a lista do que aconteceu, na ordem, e a tela só os anima.
 * Uma ação fora de hora (responder duas vezes, seguir antes de responder)
 * devolve o mesmo estado e nenhum evento: é o que impede corrida entre
 * cliques, teclas e animações.
 *
 * Duas dificuldades separadas (mega plano, etapa 4):
 *  - a EDUCATIVA é a do flashcard (fácil, moderada, difícil) e nunca é
 *    distorcida pelo jogo;
 *  - a do RPG vem do adversário (vida, força, armadura, barreira, regeneração,
 *    fases, críticos) e cresce por andar, com teto (bestiario.ts).
 *
 * Versão 3 (13/10/2026): dois modos (Cripta sem fim e Torre do Título de 100
 * andares), portas entre os andares que mostram a próxima recompensa (como no
 * Hades), moedas e a Caixeira do Arsenal, o Velho Preceptor (que às vezes
 * aparece para ajudar), bênçãos de patronos e talentos permanentes do Altar.
 */
import type { Dificuldade, Flashcard } from '../tipos'
import { embaralhar, sortear } from './aleatorio'
import { heroiPorId } from './herois'
import { ESTAGIOS, LIMITES, TORRE, inimigoDoAndar, type Cenario, type Inimigo, type Modo } from './bestiario'
import {
  ENCAIXES, EVENTOS, PATRONOS, PESO_RARIDADE_RECOMPENSA, PODERES, PRECO, RECOMPENSAS, RELIQUIAS, ehEvento, ehPoder, ehReliquia, patronosDe,
  type Patrono, type Recompensa, type TipoPoder, type TipoReliquia,
} from './poderes'

export const VIDA_INICIAL = 100
/** Dano que você causa ao acertar (aprovado pelo Tales). */
export const ATAQUE: Record<Dificuldade, number> = { 1: 10, 2: 20, 3: 30 }
/** Dano-base do erro (aprovado pelo Tales); o adversário multiplica pela força. */
export const DANO_BASE: Record<Dificuldade, number> = { 1: 2, 2: 5, 3: 10 }
/** A partir de 3 acertos seguidos, cada acerto causa +5 (moderado, sem sorte). */
export const COMBO_MINIMO = 3
export const BONUS_COMBO = 5
export const CURA_SEQUENCIA = 5
export const CURA_LENDARIA = 3
/**
 * Dificuldade da partida (escolhida antes de começar). Além do combate (vida do
 * herói e dos adversários, dano recebido e pontos), muda o peso de cada
 * dificuldade de flashcard no sorteio: o conteúdo é o mesmo, só a mistura
 * muda. Só Normal e Difícil contam para o ranking e para os recordes.
 */
export type NivelJogo = 'facil' | 'normal' | 'dificil'
export const NIVEIS: Record<NivelJogo, {
  nome: string; resumo: string; vidaHeroi: number; vidaInimigo: number; danoRecebido: number; pontos: number; ranqueado: boolean; pesoFlashcard: Record<Dificuldade, number>
}> = {
  facil: { nome: 'Fácil', resumo: 'Mais vida, adversários mais fracos, mais flashcards fáceis. Não conta para o ranking.', vidaHeroi: 1.3, vidaInimigo: 0.8, danoRecebido: 0.65, pontos: 0.5, ranqueado: false, pesoFlashcard: { 1: 2.4, 2: 1, 3: 0.35 } },
  normal: { nome: 'Normal', resumo: 'O equilíbrio da Cripta. Conta para o ranking.', vidaHeroi: 1, vidaInimigo: 1, danoRecebido: 1, pontos: 1, ranqueado: true, pesoFlashcard: { 1: 1, 2: 1, 3: 1 } },
  dificil: { nome: 'Difícil', resumo: 'Menos vida, adversários mais duros, mais flashcards difíceis e pontos ×1,5. Conta para o ranking.', vidaHeroi: 0.85, vidaInimigo: 1.25, danoRecebido: 1.35, pontos: 1.5, ranqueado: true, pesoFlashcard: { 1: 0.4, 2: 1, 3: 2.2 } },
}
export const nivelDaPartida = (p: { nivel?: NivelJogo }): NivelJogo => (p.nivel && p.nivel in NIVEIS ? p.nivel : 'normal')

/** Todo chefe vencido devolve esta fração da vida máxima. */
export const CURA_CHEFE = 0.15
export const XP_POR_NIVEL = { comum: 1, elite: 2, chefe: 4 } as const
/** Moedas por adversário vencido. */
export const OURO_POR_NIVEL = { comum: 12, elite: 25, chefe: 45 } as const
/** Chance de um flashcard brilhante (vale o dobro de cristais e +10 moedas). */
export const CHANCE_BRILHANTE = 0.05
/** O Velho Preceptor aparece para ajudar quando a vida cai abaixo disto (uma vez por partida, com sorte, depois do primeiro ato). */
export const AJUDA = { abaixoDe: 0.25, chance: 0.5, cura: 0.2, desdeAndar: 4 }
export const CURA_LOJA = { fracao: 0.3, preco: 30 }

/** Desgaste: a cada ato (Cripta) ou 10 andares (Torre), as curas rendem menos, até o piso. */
export const DESGASTE = { porAto: 0.05, porDezAndares: 0.07, piso: 0.35 }
export function desgaste(p: { modo: Modo; andar: number }) {
  const passos = p.modo === 'torre' ? Math.floor((p.andar - 1) / 10) * (DESGASTE.porDezAndares / DESGASTE.porAto) : Math.floor((p.andar - 1) / 3)
  return Math.max(DESGASTE.piso, 1 - DESGASTE.porAto * passos)
}

export interface Encaixe { tipo: TipoPoder; carga: number }

export interface Jogada {
  id: string
  /** Ordem em que as alternativas aparecem (índices de `opcoes`). */
  ordem: number[]
  /** Posições (na ordem mostrada) eliminadas pela pista. */
  eliminadas: number[]
  respondida: boolean
  escolha: number | null
  assistida: boolean
  /** O golpe do adversário neste flashcard será crítico (sorteado na compra e mostrado na intenção). */
  criticoInimigo: boolean
  /** Golpe carregado do adversário (o Sopro do dragão), avisado na intenção. */
  carregado: boolean
  /** Flashcard brilhante (raro, só visual e prêmio; nunca muda o conteúdo). */
  brilhante: boolean
}

export interface EstadoInimigo {
  id: string
  vida: number
  vidaMax: number
  rodadas: number
  fase: 1 | 2
  errosSeguidos: number
  furia: boolean
  /** Escudo de energia restante (absorve os seus acertos). */
  barreira: number
  /** Armadura arrancada pela Ruptura neste confronto. */
  armaduraPerdida: number
  /** Vida já regenerada neste confronto (respeita o total do adversário). */
  regenerado: number
  /** Proteção do preceptor já usada neste confronto. */
  preceptorUsado: boolean
  /** O último golpe foi crítico (nunca dois críticos seguidos). */
  ultimoCritico: boolean
  /** Brasas do Golpe em brasa (cada uma queima por rodada). */
  brasas: number
  /** A gosma já se dividiu neste confronto. */
  dividido: boolean
}

export type Fase = 'pergunta' | 'resposta' | 'recompensa' | 'portas' | 'loja' | 'sabio' | 'sala' | 'fim'

/** O que a porta promete para depois do próximo confronto (o ícone aparece na porta). */
export type CategoriaPorta = 'misto' | 'poder' | 'reliquia' | 'bencao' | 'cura' | 'ouro'
export type Porta =
  | { tipo: 'combate'; recompensa: CategoriaPorta; patrono?: Patrono }
  | { tipo: 'chefe'; recompensa: CategoriaPorta }
  | { tipo: 'loja' }
  | { tipo: 'sabio' }
  | { tipo: 'sala'; sala: TipoSala }

/**
 * Salas de evento (Etapa 6, 13/10/2026): ferreiro, curandeira, baú, sala
 * secreta e encontros pelo caminho. Cada sala oferece opções com custo (moedas
 * ou parte da vida) e efeitos; escolher uma leva ao próximo andar.
 */
export type TipoSala = 'ferreiro' | 'curandeira' | 'bau' | 'secreta' | 'evento'
export type EfeitoSala =
  | { tipo: 'cura'; fracao: number }
  | { tipo: 'ouro'; valor: number }
  | { tipo: 'cristais'; valor: number }
  | { tipo: 'vidaMax'; valor: number }
  | { tipo: 'cargas'; valor: number }
  | { tipo: 'perdeVida'; fracao: number }
  | { tipo: 'recompensa'; id: Recompensa }
export interface OpcaoSala {
  rotulo: string
  detalhe: string
  icone: string
  custoOuro?: number
  /** Fração da vida máxima paga para escolher (nunca derruba: fica com pelo menos 1). */
  custoVida?: number
  efeitos: EfeitoSala[]
  /** Sorte: com esta chance, os efeitos de `azar` entram no lugar (o baú pode ter armadilha). */
  azar?: { chance: number; efeitos: EfeitoSala[]; texto: string }
  /** Precisa de pelo menos um poder equipado. */
  precisaPoder?: boolean
}
export interface Sala { tipo: TipoSala; titulo: string; fala: string; icone: string; opcoes: OpcaoSala[] }

export interface ItemLoja { item: Recompensa | 'cura'; preco: number; vendido: boolean }
export type OfertaSabio =
  | { tipo: 'cura'; valor: number }
  | { tipo: 'reliquia'; recompensa: TipoReliquia }
  | { tipo: 'cristais'; valor: number }
  | { tipo: 'ouro'; valor: number }

/** Talentos permanentes comprados no Altar do Saber (fora da partida). */
export interface Talentos { vida?: number; pista?: number; ouro?: number; sorte?: number; segunda?: number; portas?: number }

export interface Partida {
  versao: 3
  modo: Modo
  /** Semente fixa da partida: define a masmorra (quais adversários em cada andar). */
  sementeBase: number
  semente: number
  rodada: number
  andar: number
  fase: Fase
  vida: number
  vidaMax: number
  /** Estágio do herói (1 a 5): sobe a cada chefe vencido, só nesta partida. */
  estagio: number
  xp: number
  inimigo: EstadoInimigo
  baralho: string[]
  descarte: string[]
  atual: Jogada | null
  sequencia: number
  /** Acertos seguidos sem pista (para a Marca do mestre). */
  sequenciaLimpa: number
  melhorSequencia: number
  pontos: number
  acertos: number
  erros: number
  assistidos: number
  encaixes: Encaixe[]
  /** Relíquias (acumuláveis aparecem repetidas). */
  reliquias: TipoReliquia[]
  imortalUsado: boolean
  pocao: number
  recompensas: Recompensa[]
  derrubaram: string[]
  derrotados: number
  chefesDerrotados: number
  venceu: boolean
  danoSofrido: number
  danoEvitado: number
  curaTotal: number
  /** Moedas para a Caixeira do Arsenal. */
  ouro: number
  /** Cristais de conhecimento ganhos nesta partida (vão para o Altar). */
  cristais: number
  /** Recompensa prometida pela porta do confronto atual. */
  categoria: CategoriaPorta
  /** Patrono da sala de bênção atual. */
  patronoDaSala: Patrono | null
  portas: Porta[]
  loja: ItemLoja[]
  /** Sala de evento aberta (ferreiro, curandeira, baú, secreta ou encontro). */
  sala: Sala | null
  sabio: OfertaSabio[]
  ajudaUsada: boolean
  renascerUsado: boolean
  /** Sentinela: o próximo acerto é crítico garantido. */
  critGarantido: boolean
  talentos: Talentos
  /** Torre: chegou ao topo (venceu o andar 100). */
  torreConcluida: boolean
  /** Ids dos adversários vencidos nesta partida (para o Bestiário). */
  vencidos: string[]
  /** Corrida no servidor (ranking); o motor não usa, só carrega junto. */
  idCorrida?: string
  /** Herói escolhido (motor/herois.ts); sem ele, o Cavaleiro. */
  heroi?: string
  /** Dificuldade escolhida no início; partidas antigas (sem o campo) são Normal. */
  nivel?: NivelJogo
}

export type MotivoCura =
  | 'sequencia' | 'lendaria' | 'pocao' | 'selo' | 'roubo' | 'vital' | 'insignia' | 'chefe' | 'ritual' | 'descanso' | 'coracao' | 'evolucao'
  | 'seiva' | 'colheita' | 'florescer' | 'cauterio' | 'sabio' | 'ajuda' | 'renascer' | 'loja' | 'sala'

export type Evento =
  | { tipo: 'novo-inimigo'; inimigo: Inimigo; ciclo: number; trocaCenario: boolean }
  | { tipo: 'compra'; id: string; criticoInimigo: boolean; carregado: boolean; brilhante: boolean }
  | { tipo: 'pista'; posicao: number }
  | { tipo: 'resposta'; id: string; certo: boolean; escolha: number; certa: number; assistida: boolean; dificuldade: Dificuldade }
  | { tipo: 'dano-inimigo'; valor: number; critico: boolean; combo: number; duplo: boolean; absorvido: number; eco: number; barreira: number; especial: boolean; raio: number; sorte: boolean }
  | { tipo: 'combo'; sequencia: number }
  | { tipo: 'fase-chefe'; nome: string }
  | { tipo: 'furia' }
  | { tipo: 'escudo'; restante: number }
  | { tipo: 'mitigado'; motivo: 'barreira' | 'foco' | 'preceptor'; valor: number }
  | { tipo: 'dano-heroi'; valor: number; veneno: number; furia: boolean; critico: boolean; rajada: number; carregado: string | null }
  | { tipo: 'imortal' }
  | { tipo: 'renascer'; vida: number }
  | { tipo: 'cura'; valor: number; motivo: MotivoCura }
  | { tipo: 'regenera'; valor: number }
  | { tipo: 'queimadura'; valor: number; brasas: number }
  | { tipo: 'contra'; valor: number; motivo: 'contra' | 'reflexo' }
  | { tipo: 'divide'; barreira: number }
  | { tipo: 'roubou'; poder: TipoPoder }
  | { tipo: 'ajuda'; cura: number }
  | { tipo: 'pocao'; cumprida: boolean; perdida: boolean; faltam: number }
  | { tipo: 'inimigo-derrotado'; chefe: boolean }
  | { tipo: 'evolucao'; estagio: number; nome: string }
  | { tipo: 'heroi-derrotado' }
  | { tipo: 'recompensas'; opcoes: Recompensa[]; aposChefe: boolean }
  | { tipo: 'equipou'; recompensa: Recompensa; substituiu: TipoPoder | null }
  | { tipo: 'ouro'; valor: number; motivo: 'inimigo' | 'brilhante' | 'porta' | 'bolsa' | 'sabio' | 'compra' | 'sala' }
  | { tipo: 'sala'; sala: Sala }
  | { tipo: 'sinergia'; nome: string; texto: string }
  | { tipo: 'sala-resultado'; texto: string; azar: boolean }
  | { tipo: 'cristais'; valor: number }
  | { tipo: 'portas'; portas: Porta[] }
  | { tipo: 'loja'; itens: ItemLoja[] }
  | { tipo: 'sabio'; ofertas: OfertaSabio[] }
  | { tipo: 'comprou'; item: Recompensa | 'cura'; preco: number }
  | { tipo: 'patamar'; andar: number }
  | { tipo: 'torre-concluida' }
  | { tipo: 'ampulheta' }
  | { tipo: 'trocou'; id: string }

export interface Resultado { estado: Partida; eventos: Evento[] }

const nada = (estado: Partida): Resultado => ({ estado, eventos: [] })
const contar = (lista: readonly string[], x: string) => lista.reduce((n, y) => n + Number(y === x), 0)

export interface OpcoesMotor {
  /**
   * Reposição do baralho (seleção procedural, motor/selecao.ts): devolve novos
   * ids, sem os que estão em `excluir`, e a próxima semente. Sem ela, o
   * descarte é reembaralhado.
   */
  repor?: (excluir: ReadonlySet<string>, semente: number, nivel: NivelJogo) => [string[], number]
}

export interface ConfigPartida { modo?: Modo; talentos?: Talentos; ids?: string[]; heroi?: string; nivel?: NivelJogo }

/** É andar de chefe? (Cripta: o 3º de cada ato; Torre: a cada 10.) */
/** Sinergias: pares de relíquias que, juntos, dão um bônus no início de cada adversário. */
export const SINERGIAS: Array<{ nome: string; par: [TipoReliquia, TipoReliquia]; efeito: 'barreira' | 'pista' | 'cura'; texto: string }> = [
  { nome: 'Imobilização completa', par: ['gesso', 'placas'], efeito: 'barreira', texto: 'Tala e placas juntas: +1 Barreira a cada adversário.' },
  { nome: 'Plantão de estudos', par: ['lupa', 'livro'], efeito: 'pista', texto: 'Lupa e livro juntos: +1 pergaminho da pista a cada adversário.' },
  { nome: 'Pronto-socorro', par: ['insignia', 'coracao'], efeito: 'cura', texto: 'Insígnia e coração juntos: cura 6 a cada adversário.' },
]

export const andarDeChefe = (andar: number, modo: Modo) => (modo === 'torre' ? andar % 10 === 0 : (andar - 1) % 3 === 2)

/** Partidas salvas na versão 2 continuam (Cripta, sem moedas). */
export function migrarPartida(p: unknown): Partida | null {
  const q = p as Partial<Partida> & { versao?: number }
  if (!q || typeof q !== 'object') return null
  if (q.versao === 3) return { ...(q as Partida), sala: (q as Partida).sala ?? null }
  if (q.versao !== 2) return null
  const v = q as unknown as Partida
  return {
    ...v, versao: 3, modo: 'masmorra', ouro: 0, cristais: 0, categoria: 'misto', patronoDaSala: null, portas: [], loja: [], sabio: [], sala: null,
    ajudaUsada: false, renascerUsado: false, critGarantido: false, talentos: {}, torreConcluida: false, vencidos: [],
    inimigo: { ...v.inimigo, brasas: 0, dividido: false },
    atual: v.atual && { ...v.atual, carregado: false, brilhante: false },
  }
}

export function criarMotor(cartas: Flashcard[], opcoes: OpcoesMotor = {}) {
  const porId = new Map(cartas.map((c) => [c.id, c]))
  const carta = (id: string) => {
    const c = porId.get(id)
    if (!c) throw new Error(`Flashcard ${id} fora do baralho`)
    return c
  }

  function inimigoAtual(p: Partida): Inimigo {
    return inimigoDoAndar(p.andar, p.sementeBase, p.modo).inimigo
  }

  /** Força e armadura do momento, contando a fase 2 do chefe e a Ruptura. */
  function atributos(p: Partida) {
    const i = inimigoAtual(p)
    const f2 = p.inimigo.fase === 2 && i.fase2
    const armadura = Math.max(0, (f2 ? i.fase2!.armadura : i.armadura) - p.inimigo.armaduraPerdida)
    return { forca: f2 ? i.fase2!.forca : i.forca, armadura, barreira: p.inimigo.barreira }
  }

  /** Dano do golpe antes dos consumíveis: base, crítico, carga, teto e reduções passivas. */
  function danoBruto(p: Partida, critico: boolean, carregado: boolean) {
    const c = carta(p.atual!.id)
    const i = inimigoAtual(p)
    const { forca } = atributos(p)
    const veneno = i.porErroSeguido * p.inimigo.errosSeguidos
    let dano = DANO_BASE[c.dificuldade] * forca * (p.inimigo.furia ? 1.5 : 1) + veneno
    if (critico) dano *= LIMITES.multCritico
    if (carregado && i.carrega) dano *= i.carrega.mult
    const teto = p.vidaMax * (critico || carregado ? LIMITES.critico : LIMITES[i.nivel])
    dano = Math.min(dano, teto) * NIVEIS[nivelDaPartida(p)].danoRecebido
    const placas = p.reliquias.includes('placas') ? RECOMPENSAS.placas.v.fracao : 0
    const mestre = i.chefe && p.reliquias.includes('mestre') ? RECOMPENSAS.mestre.v.fracao : 0
    dano = dano * (1 - placas - mestre) - ESTAGIOS[p.estagio - 1].defesa
    if (p.reliquias.includes('gesso')) dano -= RECOMPENSAS.gesso.v.reducao
    return { dano: Math.max(1, Math.round(dano)), veneno }
  }

  /** Aplica os consumíveis de defesa na ordem fixa: escudo, preceptor, foco, barreira (a rajada passa pela barreira). */
  function defender(p: Partida, dano: number) {
    if (p.encaixes.some((e) => e.tipo === 'escudo')) return { final: 0, bloqueado: true, passos: [] as Array<{ motivo: 'barreira' | 'foco' | 'preceptor'; valor: number }> }
    const rajada = (inimigoAtual(p).rajada ?? 1) > 1
    const passos: Array<{ motivo: 'barreira' | 'foco' | 'preceptor'; valor: number }> = []
    let d = dano
    if (p.reliquias.includes('preceptor') && !p.inimigo.preceptorUsado) { const n = Math.ceil(d * RECOMPENSAS.preceptor.v.fracao); passos.push({ motivo: 'preceptor', valor: d - n }); d = n }
    if (p.encaixes.some((e) => e.tipo === 'foco')) { const n = Math.ceil(d * RECOMPENSAS.foco.v.fracao); passos.push({ motivo: 'foco', valor: d - n }); d = n }
    if (!rajada && p.encaixes.some((e) => e.tipo === 'barreira')) { const a = Math.min(d, RECOMPENSAS.barreira.v.absorve); passos.push({ motivo: 'barreira', valor: a }); d -= a }
    return { final: d, bloqueado: false, passos }
  }

  /**
   * O que o adversário fará se você errar o flashcard da mesa (a "intenção"):
   * o dano EXATO que chega em você, já com crítico, carga, teto e proteções.
   */
  function intencao(p: Partida) {
    const vazio = { dano: 0, bruto: 0, veneno: 0, furia: false, bloqueado: false, critico: false, carregado: null as string | null, rajada: 1, protecoes: [] as string[] }
    if (!p.atual) return vazio
    const i = inimigoAtual(p)
    const critico = p.atual.criticoInimigo
    const carregado = p.atual.carregado && i.carrega ? i.carrega.nome : null
    const { dano, veneno } = danoBruto(p, critico, !!carregado)
    const def = defender(p, dano)
    return { dano: def.final, bruto: dano, veneno, furia: p.inimigo.furia, bloqueado: def.bloqueado, critico, carregado, rajada: i.rajada ?? 1, protecoes: def.passos.map((x) => x.motivo) }
  }

  function prepararInimigo(andar: number, sementeBase: number, modo: Modo, nivel: NivelJogo = 'normal'): EstadoInimigo {
    const { inimigo } = inimigoDoAndar(andar, sementeBase, modo)
    const vida = Math.max(1, Math.round(inimigo.vida * NIVEIS[nivel].vidaInimigo))
    return {
      id: inimigo.id, vida, vidaMax: vida, rodadas: 0, fase: 1, errosSeguidos: 0, furia: false,
      barreira: inimigo.barreira ?? 0, armaduraPerdida: 0, regenerado: 0, preceptorUsado: false, ultimoCritico: false, brasas: 0, dividido: false,
    }
  }

  /**
   * Tira o próximo flashcard. Qualquer adversário joga flashcards de qualquer
   * dificuldade: o desafio do RPG vem das regras do combate, não de perguntas
   * cada vez mais obscuras. Quando o baralho acaba, repõe pela seleção
   * procedural (sem repetir o que já saiu) ou, sem ela, reembaralha o descarte.
   * Aqui também se sorteia se o golpe do adversário será crítico.
   */
  function comprar(p: Partida): Resultado {
    let baralho = p.baralho.filter((id) => porId.has(id))
    let descarte = p.descarte.slice()
    let semente = p.semente
    if (!baralho.length && opcoes.repor) {
      ;[baralho, semente] = opcoes.repor(new Set([...descarte, ...p.baralho]), semente, nivelDaPartida(p))
    }
    if (!baralho.length) {
      ;[descarte, semente] = embaralhar(descarte.filter((id) => porId.has(id)), semente)
      baralho = descarte
      descarte = []
    }
    // Evita repetir em seguida o flashcard que acabou de sair, se houver outro.
    const ultimo = p.descarte[p.descarte.length - 1]
    let pos = baralho.findIndex((x) => x !== ultimo && x !== p.atual?.id)
    if (pos < 0) pos = 0
    const id = baralho[pos]
    baralho.splice(pos, 1)
    const c = carta(id)
    let ordem: number[]
    ;[ordem, semente] = embaralhar(c.opcoes.map((_, k) => k), semente)
    let u: number, b: number
    ;[u, semente] = sortear(semente)
    ;[b, semente] = sortear(semente)
    const i = inimigoAtual(p)
    const criticoInimigo = !p.inimigo.ultimoCritico && u < i.critico
    const carregado = !!i.carrega && (p.inimigo.rodadas + 1) % i.carrega.aCada === 0
    const brilhante = b < CHANCE_BRILHANTE
    const atual: Jogada = { id, ordem, eliminadas: [], respondida: false, escolha: null, assistida: false, criticoInimigo, carregado, brilhante }
    return { estado: { ...p, baralho, descarte, semente, atual, fase: 'pergunta' }, eventos: [{ tipo: 'compra', id, criticoInimigo, carregado, brilhante }] }
  }

  function novaPartida(semente: number, config: ConfigPartida | string[] = {}): Resultado {
    const cfg: ConfigPartida = Array.isArray(config) ? { ids: config } : config
    const modo = cfg.modo ?? 'masmorra'
    const t = cfg.talentos ?? {}
    let baralho: string[], s: number
    const nivel: NivelJogo = cfg.nivel && cfg.nivel in NIVEIS ? cfg.nivel : 'normal'
    if (!cfg.ids && opcoes.repor) [baralho, s] = opcoes.repor(new Set(), semente, nivel)
    else [baralho, s] = embaralhar(cfg.ids ?? cartas.map((c) => c.id), semente)
    const h = heroiPorId(cfg.heroi)
    const vida = Math.round((VIDA_INICIAL + 5 * Math.min(3, t.vida ?? 0) + h.vida) * NIVEIS[nivel].vidaHeroi)
    let encaixes: Encaixe[] = []
    for (const k of h.poderes) encaixes = equipar(encaixes, k.tipo, k.cargas)[0]
    if (t.pista) encaixes = equipar(encaixes, 'pista', Math.min(2, t.pista))[0]
    if (t.segunda) encaixes = equipar(encaixes, 'imortal', 1)[0]
    const base: Partida = {
      versao: 3, modo, sementeBase: semente >>> 0, semente: s, rodada: 0, andar: 1, fase: 'pergunta', vida, vidaMax: vida,
      estagio: 1, xp: 0, inimigo: prepararInimigo(1, semente >>> 0, modo, nivel), baralho, descarte: [], atual: null,
      sequencia: 0, sequenciaLimpa: 0, melhorSequencia: 0, pontos: 0, acertos: 0, erros: 0, assistidos: 0,
      encaixes, reliquias: [...h.reliquias], imortalUsado: false, pocao: 0, recompensas: [], derrubaram: [],
      derrotados: 0, chefesDerrotados: 0, venceu: false, danoSofrido: 0, danoEvitado: 0, curaTotal: 0,
      ouro: 15 * Math.min(3, t.ouro ?? 0), cristais: 0, categoria: 'misto', patronoDaSala: null, portas: [], loja: [], sabio: [], sala: null,
      ajudaUsada: false, renascerUsado: false, critGarantido: false, talentos: t, torreConcluida: false, vencidos: [], heroi: h.id, nivel,
    }
    const { inimigo, ciclo } = inimigoDoAndar(1, base.sementeBase, modo)
    const r = comprar(base)
    return { estado: r.estado, eventos: [{ tipo: 'novo-inimigo', inimigo, ciclo, trocaCenario: true }, ...r.eventos] }
  }

  /**
   * Cura com teto na vida máxima; registra o evento só se curou algo. Na
   * Cripta funda e no alto da Torre, o desgaste reduz as curas (a masmorra
   * cansa): é o que impede a partida infinita de quem acerta quase tudo.
   */
  function curar(e: Partida, valor: number, motivo: MotivoCura, eventos: Evento[]): Partida {
    const fixa = motivo === 'evolucao' || motivo === 'coracao' || motivo === 'florescer'
    const ganho = Math.max(0, Math.min(e.vidaMax - e.vida, Math.round(valor * (fixa ? 1 : desgaste(e)))))
    if (ganho <= 0) return e
    eventos.push({ tipo: 'cura', valor: ganho, motivo })
    return { ...e, vida: e.vida + ganho, curaTotal: e.curaTotal + ganho }
  }

  function ganharOuro(e: Partida, valor: number, motivo: Extract<Evento, { tipo: 'ouro' }>['motivo'], eventos: Evento[]): Partida {
    if (valor <= 0) return e
    eventos.push({ tipo: 'ouro', valor, motivo })
    return { ...e, ouro: e.ouro + valor }
  }

  function ganharCristais(e: Partida, valor: number, eventos: Evento[]): Partida {
    if (valor <= 0) return e
    eventos.push({ tipo: 'cristais', valor })
    return { ...e, cristais: e.cristais + valor }
  }

  /** Gasta um poder ativo: pista, poção de emergência, ampulheta ou carta na manga. */
  function usarPoder(p: Partida, tipo: TipoPoder): Resultado {
    if (p.fase !== 'pergunta' || !p.atual || p.atual.respondida) return nada(p)
    const k = p.encaixes.findIndex((e) => e.tipo === tipo)
    if (k < 0 || !RECOMPENSAS[tipo].ativo) return nada(p)
    if (tipo === 'vital') {
      if (p.vida >= p.vidaMax) return nada(p)
      const eventos: Evento[] = []
      const e = curar({ ...p, encaixes: gastar(p.encaixes, k) }, RECOMPENSAS.vital.v.cura, 'vital', eventos)
      return { estado: e, eventos }
    }
    if (tipo === 'ampulheta') {
      if (p.inimigo.rodadas === 0 && !p.inimigo.furia) return nada(p)
      return { estado: { ...p, encaixes: gastar(p.encaixes, k), inimigo: { ...p.inimigo, rodadas: 0, furia: false } }, eventos: [{ tipo: 'ampulheta' }] }
    }
    if (tipo === 'trocar') {
      const id = p.atual.id
      const r = comprar({ ...p, encaixes: gastar(p.encaixes, k), baralho: [...p.baralho, id] })
      if (r.estado.atual?.id === id) return nada(p)
      // o golpe previsto (crítico, sopro) continua o mesmo: trocar não é jeito de fugir dele
      const atual = { ...r.estado.atual!, criticoInimigo: p.atual.criticoInimigo, carregado: p.atual.carregado }
      return { estado: { ...r.estado, atual }, eventos: [{ tipo: 'trocou', id }, ...r.eventos.map((ev) => (ev.tipo === 'compra' ? { ...ev, criticoInimigo: atual.criticoInimigo, carregado: atual.carregado } : ev))] }
    }
    const c = carta(p.atual.id)
    const candidatas = p.atual.ordem
      .map((opcao, posicao) => ({ opcao, posicao }))
      .filter(({ opcao, posicao }) => opcao !== c.certa && !p.atual!.eliminadas.includes(posicao))
    // Sempre sobram ao menos duas alternativas na mão.
    if (candidatas.length <= 1) return nada(p)
    const [v, semente] = sortear(p.semente)
    const { posicao } = candidatas[Math.floor(v * candidatas.length)]
    return {
      estado: { ...p, semente, encaixes: gastar(p.encaixes, k), atual: { ...p.atual, eliminadas: [...p.atual.eliminadas, posicao], assistida: true } },
      eventos: [{ tipo: 'pista', posicao }],
    }
  }
  const usarPista = (p: Partida) => usarPoder(p, 'pista')

  /** Dano direto no adversário (queimadura, contra-ataque, reflexo): ignora armadura e barreira. */
  function ferirInimigo(e: Partida, valor: number): Partida {
    return { ...e, inimigo: { ...e.inimigo, vida: Math.max(0, e.inimigo.vida - valor) } }
  }

  /** Divisão da gosma e segunda fase do chefe, depois de qualquer dano. */
  function limiares(e: Partida, eventos: Evento[]): Partida {
    const i = inimigoAtual(e)
    if (e.inimigo.vida <= 0) return e
    if (i.divide && !e.inimigo.dividido && e.inimigo.vida <= e.inimigo.vidaMax * i.divide.abaixoDe) {
      const b = Math.round(e.inimigo.vidaMax * i.divide.barreira)
      e = { ...e, inimigo: { ...e.inimigo, dividido: true, barreira: e.inimigo.barreira + b } }
      eventos.push({ tipo: 'divide', barreira: b })
    }
    if (i.fase2 && e.inimigo.fase === 1 && e.inimigo.vida <= e.inimigo.vidaMax * i.fase2.abaixoDe) {
      e = { ...e, inimigo: { ...e.inimigo, fase: 2, barreira: Math.max(e.inimigo.barreira, i.fase2.barreira ?? 0) } }
      eventos.push({ tipo: 'fase-chefe', nome: i.fase2.nome })
    }
    return e
  }

  /** Responde com a alternativa da posição `posicao` (na ordem mostrada). */
  function responder(p: Partida, posicao: number): Resultado {
    if (p.fase !== 'pergunta' || !p.atual || p.atual.respondida) return nada(p)
    if (posicao < 0 || posicao >= p.atual.ordem.length || p.atual.eliminadas.includes(posicao)) return nada(p)
    const c = carta(p.atual.id)
    const escolhida = p.atual.ordem[posicao]
    const certo = escolhida === c.certa
    const eventos: Evento[] = []
    const i = inimigoAtual(p)
    const assistida = p.atual.assistida
    const brilhante = p.atual.brilhante
    let e: Partida = {
      ...p,
      rodada: p.rodada + 1,
      fase: 'resposta',
      atual: { ...p.atual, respondida: true, escolha: posicao },
      descarte: [...p.descarte, c.id],
      inimigo: { ...p.inimigo, rodadas: p.inimigo.rodadas + 1 },
    }
    eventos.push({ tipo: 'resposta', id: c.id, certo, escolha: posicao, certa: p.atual.ordem.indexOf(c.certa), assistida, dificuldade: c.dificuldade })

    if (certo) {
      const sequencia = e.sequencia + 1
      const sequenciaLimpa = assistida ? 0 : e.sequenciaLimpa + 1
      const tem = (t: TipoPoder) => e.encaixes.findIndex((x) => x.tipo === t)
      const rel = (r: TipoReliquia) => contar(e.reliquias, r)
      const duploK = tem('duplo'), devK = tem('devastador'), ecoK = tem('eco'), rupK = tem('ruptura')
      const especial = rel('marca') > 0 && sequenciaLimpa > 0 && sequenciaLimpa % RECOMPENSAS.marca.v.a_cada === 0
      let bruto = ATAQUE[c.dificuldade] + ESTAGIOS[e.estagio - 1].ataque + heroiPorId(e.heroi).ataque
        + (sequencia >= COMBO_MINIMO ? BONUS_COMBO : 0)
        + (c.dificuldade === 3 && rel('bisturi') ? RECOMPENSAS.bisturi.v.bonus : 0)
        + (rel('residente') && sequencia % RECOMPENSAS.residente.v.a_cada === 0 ? RECOMPENSAS.residente.v.bonus : 0)
        + (especial ? RECOMPENSAS.marca.v.bonus : 0)
        + (devK >= 0 ? RECOMPENSAS.devastador.v.bonus : 0)
        + (rel('sede') ? Math.min(RECOMPENSAS.sede.v.maximo, RECOMPENSAS.sede.v.porAcerto * (sequencia - 1)) : 0)
      if (c.dificuldade === 3 && rel('impacto')) bruto *= 1 + RECOMPENSAS.impacto.v.fracao
      if (rel('execucao') && e.inimigo.vida < e.inimigo.vidaMax * RECOMPENSAS.execucao.v.abaixoDe) bruto *= 1 + RECOMPENSAS.execucao.v.fracao
      // crítico de sorte (Olho de águia) ou garantido (Sentinela)
      let u: number, semente = e.semente
      ;[u, semente] = sortear(semente)
      const sorte = e.critGarantido || u < rel('olhoaguia') * RECOMPENSAS.olhoaguia.v.chance
      if (sorte) bruto *= RECOMPENSAS.olhoaguia.v.multiplicador
      if (duploK >= 0) bruto *= RECOMPENSAS.duplo.v.multiplicador
      bruto = Math.round(bruto)
      let encaixes = e.encaixes
      for (const k of [duploK, devK, ecoK, rupK].filter((k) => k >= 0).sort((a, b) => b - a)) encaixes = gastar(encaixes, k)
      const { armadura } = atributos(e)
      const armaduraUsada = rupK >= 0 ? 0 : armadura
      const golpe = Math.max(5, bruto - armaduraUsada)
      const eco = ecoK >= 0 ? Math.round(golpe * RECOMPENSAS.eco.v.fracao) : 0
      const critico = c.dificuldade === 3 || especial || sorte
      const raio = rel('cadeia') * RECOMPENSAS.cadeia.v.dano
        + (rel('tempestade') && sequencia % RECOMPENSAS.tempestade.v.a_cada === 0 ? RECOMPENSAS.tempestade.v.dano : 0)
        + (rel('tormenta') && critico ? RECOMPENSAS.tormenta.v.dano : 0)
      const total = golpe + eco
      const absorvidoBarreira = Math.min(e.inimigo.barreira, total)
      const vidaInimigo = Math.max(0, e.inimigo.vida - (total - absorvidoBarreira) - raio)
      const brasas = Math.min(RECOMPENSAS.brasa.v.maximo, e.inimigo.brasas + (rel('brasa') ? 1 : 0) + (rel('supernova') && raio > 0 ? 1 : 0))
      e = {
        ...e, semente, sequencia, sequenciaLimpa, melhorSequencia: Math.max(e.melhorSequencia, sequencia), critGarantido: false,
        acertos: e.acertos + 1, assistidos: e.assistidos + Number(assistida), pontos: e.pontos + Math.round((total + raio) * NIVEIS[nivelDaPartida(e)].pontos), encaixes,
        inimigo: {
          ...e.inimigo, vida: vidaInimigo, errosSeguidos: 0, barreira: e.inimigo.barreira - absorvidoBarreira, brasas,
          armaduraPerdida: e.inimigo.armaduraPerdida + (rupK >= 0 ? RECOMPENSAS.ruptura.v.reducao : 0),
        },
      }
      eventos.push({ tipo: 'dano-inimigo', valor: total + raio, critico, combo: sequencia, duplo: duploK >= 0, absorvido: Math.max(0, bruto - golpe), eco, barreira: absorvidoBarreira, especial, raio, sorte })
      if (sequencia >= COMBO_MINIMO) eventos.push({ tipo: 'combo', sequencia })

      // prêmios do acerto: moedas do brilhante e cristais de conhecimento (o difícil vale mais)
      if (brilhante) e = ganharOuro(e, 10, 'brilhante', eventos)
      e = ganharCristais(e, (1 + Number(c.dificuldade === 3)) * (brilhante ? 2 : 1), eventos)

      if (sequencia % 3 === 0) e = curar(e, CURA_SEQUENCIA, 'sequencia', eventos)
      if (rel('selo') && sequencia % RECOMPENSAS.selo.v.a_cada === 0) e = curar(e, RECOMPENSAS.selo.v.cura, 'selo', eventos)
      if (c.raridade === 'lendaria') e = curar(e, rel('amuleto') ? RECOMPENSAS.amuleto.v.cura : CURA_LENDARIA, 'lendaria', eventos)
      if (c.dificuldade === 3 && !assistida && rel('roubo')) e = curar(e, RECOMPENSAS.roubo.v.cura, 'roubo', eventos)
      if (rel('seiva')) e = curar(e, RECOMPENSAS.seiva.v.cura, 'seiva', eventos)
      if (e.pocao > 0) {
        const faltam = e.pocao - 1
        e = { ...e, pocao: faltam, encaixes: faltam === 0 ? semPocao(e.encaixes) : e.encaixes }
        eventos.push({ tipo: 'pocao', cumprida: faltam === 0, perdida: false, faltam })
        if (faltam === 0) e = curar(e, RECOMPENSAS.pocao.v.cura, 'pocao', eventos)
      }
      e = limiares(e, eventos)
    } else {
      const critico = p.atual.criticoInimigo
      const carregado = p.atual.carregado && i.carrega ? i.carrega.nome : null
      const { dano, veneno } = danoBruto(e, critico, !!carregado)
      const furia = e.inimigo.furia
      e = {
        ...e, sequencia: 0, sequenciaLimpa: 0, erros: e.erros + 1, derrubaram: e.derrubaram.includes(c.id) ? e.derrubaram : [...e.derrubaram, c.id],
        inimigo: { ...e.inimigo, errosSeguidos: e.inimigo.errosSeguidos + 1, ultimoCritico: critico },
      }
      if (e.pocao > 0) { e = { ...e, pocao: 0, encaixes: semPocao(e.encaixes) }; eventos.push({ tipo: 'pocao', cumprida: false, perdida: true, faltam: 0 }) }
      const def = defender(e, dano)
      if (def.bloqueado) {
        e = { ...e, encaixes: gastar(e.encaixes, e.encaixes.findIndex((x) => x.tipo === 'escudo')), danoEvitado: e.danoEvitado + dano }
        eventos.push({ tipo: 'escudo', restante: e.encaixes.find((x) => x.tipo === 'escudo')?.carga ?? 0 })
        if (e.reliquias.includes('sentinela')) e = { ...e, critGarantido: true }
        if (e.reliquias.includes('reflexo')) {
          const v = Math.min(e.inimigo.vida, RECOMPENSAS.reflexo.v.dano)
          e = ferirInimigo(e, v)
          eventos.push({ tipo: 'contra', valor: v, motivo: 'reflexo' })
        }
      } else {
        for (const passo of def.passos) {
          eventos.push({ tipo: 'mitigado', motivo: passo.motivo, valor: passo.valor })
          if (passo.motivo === 'preceptor') e = { ...e, inimigo: { ...e.inimigo, preceptorUsado: true } }
          else e = { ...e, encaixes: gastar(e.encaixes, e.encaixes.findIndex((x) => x.tipo === passo.motivo)) }
        }
        e = { ...e, danoEvitado: e.danoEvitado + (dano - def.final) }
        let vida = e.vida - def.final
        if (def.final > 0) eventos.push({ tipo: 'dano-heroi', valor: def.final, veneno, furia, critico, rajada: i.rajada ?? 1, carregado })
        if (vida <= 0 && e.encaixes.some((x) => x.tipo === 'imortal')) {
          vida = 1
          e = { ...e, encaixes: gastar(e.encaixes, e.encaixes.findIndex((x) => x.tipo === 'imortal')), imortalUsado: true }
          eventos.push({ tipo: 'imortal' })
        } else if (vida <= 0 && e.reliquias.includes('fenix') && !e.renascerUsado) {
          vida = Math.round(e.vidaMax * RECOMPENSAS.fenix.v.fracao)
          e = { ...e, renascerUsado: true }
          eventos.push({ tipo: 'renascer', vida })
        }
        e = { ...e, vida: Math.max(0, vida), danoSofrido: e.danoSofrido + Math.min(e.vida, def.final) }
        if (e.vida <= 0) { e = { ...e, fase: 'fim' }; eventos.push({ tipo: 'heroi-derrotado' }) }
        else {
          if (e.reliquias.includes('contra') && def.final > 0) {
            const v = Math.min(e.inimigo.vida, Math.max(1, Math.round(def.final * RECOMPENSAS.contra.v.fracao)))
            e = ferirInimigo(e, v)
            eventos.push({ tipo: 'contra', valor: v, motivo: 'contra' })
          }
          // o Velho Preceptor aparece, às vezes, quando a coisa aperta (uma vez por partida)
          if (!e.ajudaUsada && e.andar >= AJUDA.desdeAndar && e.vida <= e.vidaMax * AJUDA.abaixoDe) {
            let u: number, semente = e.semente
            ;[u, semente] = sortear(semente)
            e = { ...e, semente, ajudaUsada: u < AJUDA.chance }
            if (e.ajudaUsada) {
              const antes = e.vida
              e = curar(e, e.vidaMax * AJUDA.cura, 'ajuda', [])
              e = { ...e, encaixes: equipar(e.encaixes, 'escudo', 1)[0] }
              eventos.push({ tipo: 'ajuda', cura: e.vida - antes })
            }
          }
        }
      }
      if (e.fase !== 'fim' && i.rouba && e.encaixes.length) {
        let u: number, semente = e.semente
        ;[u, semente] = sortear(semente)
        const k = Math.floor(u * e.encaixes.length)
        const poder = e.encaixes[k].tipo
        e = { ...e, semente, encaixes: gastar(e.encaixes, k), pocao: poder === 'pocao' ? 0 : e.pocao }
        eventos.push({ tipo: 'roubou', poder })
      }
      if (e.fase !== 'fim') e = limiares(e, eventos)
    }

    // Fim da rodada: brasas queimam, o adversário regenera e a paciência acaba.
    if (e.fase === 'resposta' && e.inimigo.vida > 0 && e.inimigo.brasas > 0) {
      const v = Math.min(e.inimigo.vida, e.inimigo.brasas * RECOMPENSAS.brasa.v.porBrasa)
      e = ferirInimigo(e, v)
      eventos.push({ tipo: 'queimadura', valor: v, brasas: e.inimigo.brasas })
      if (e.reliquias.includes('cauterio')) e = curar(e, e.inimigo.brasas * RECOMPENSAS.cauterio.v.cura, 'cauterio', eventos)
      e = limiares(e, eventos)
    }
    if (e.fase === 'resposta' && e.inimigo.vida <= 0) return { estado: derrotarInimigo(e, eventos), eventos }
    if (e.fase === 'resposta' && i.regenera && e.inimigo.vida > 0) {
      const v = Math.min(i.regenera.porRodada, i.regenera.total - e.inimigo.regenerado, e.inimigo.vidaMax - e.inimigo.vida)
      if (v > 0) { e = { ...e, inimigo: { ...e.inimigo, vida: e.inimigo.vida + v, regenerado: e.inimigo.regenerado + v } }; eventos.push({ tipo: 'regenera', valor: v }) }
    }
    if (e.fase === 'resposta' && !e.inimigo.furia && e.inimigo.rodadas >= i.paciencia) {
      e = { ...e, inimigo: { ...e.inimigo, furia: true } }
      eventos.push({ tipo: 'furia' })
    }
    return { estado: e, eventos }
  }

  function derrotarInimigo(e: Partida, eventos: Evento[]): Partida {
    const i = inimigoAtual(e)
    eventos.push({ tipo: 'inimigo-derrotado', chefe: !!i.chefe })
    e = {
      ...e, xp: e.xp + XP_POR_NIVEL[i.nivel], derrotados: e.derrotados + 1, chefesDerrotados: e.chefesDerrotados + Number(!!i.chefe), venceu: e.venceu || !!i.chefe,
      vencidos: e.vencidos.includes(i.id) ? e.vencidos : [...e.vencidos, i.id],
    }
    e = ganharOuro(e, OURO_POR_NIVEL[i.nivel] + (i.ouroExtra ?? 0), 'inimigo', eventos)
    if (i.nivel !== 'comum') e = ganharCristais(e, i.chefe ? 5 : 2, eventos)
    if (e.reliquias.includes('insignia')) e = curar(e, RECOMPENSAS.insignia.v.cura, 'insignia', eventos)
    if (e.reliquias.includes('colheita')) e = curar(e, (e.vidaMax - e.vida) * RECOMPENSAS.colheita.v.fracao, 'colheita', eventos)
    if (i.chefe) {
      e = curar(e, e.vidaMax * CURA_CHEFE, 'chefe', eventos)
      if (e.reliquias.includes('ritual')) e = curar(e, e.vidaMax * RECOMPENSAS.ritual.v.fracao, 'ritual', eventos)
      // Evolução do herói: um estágio por chefe, com vida, ataque e defesa.
      if (e.estagio < ESTAGIOS.length) {
        const novo = e.estagio + 1
        const ganho = ESTAGIOS[novo - 1].vida - ESTAGIOS[e.estagio - 1].vida
        e = { ...e, estagio: novo, vidaMax: e.vidaMax + ganho }
        eventos.push({ tipo: 'evolucao', estagio: novo, nome: ESTAGIOS[novo - 1].nome })
        e = curar(e, ganho, 'evolucao', eventos)
      }
    }
    // Torre: vencer o andar 100 é chegar ao topo.
    if (e.modo === 'torre' && e.andar >= TORRE.andares) {
      eventos.push({ tipo: 'torre-concluida' })
      return { ...e, fase: 'fim', torreConcluida: true, recompensas: [] }
    }
    if (e.categoria === 'ouro') {
      e = ganharOuro(e, 35 + 5 * Math.floor(e.andar / 3), 'porta', eventos)
      return irParaPortas(e, eventos)
    }
    const [opcoesR, semente] = sortearRecompensas(e, !!i.chefe)
    eventos.push({ tipo: 'recompensas', opcoes: opcoesR, aposChefe: !!i.chefe })
    return { ...e, semente, fase: 'recompensa', recompensas: opcoesR }
  }

  /** Pode ser oferecida agora? (limites, únicas, duplas, já equipadas, pós-chefe) */
  function disponivel(e: Partida, r: Recompensa): boolean {
    const dsc = RECOMPENSAS[r]
    if (dsc.aposChefe && e.chefesDerrotados === 0) return false
    if (dsc.requer) {
      const tem = patronosDe(e.reliquias)
      if (!tem.has(dsc.requer[0]) || !tem.has(dsc.requer[1])) return false
    }
    if (ehPoder(r)) {
      const enc = e.encaixes.find((x) => x.tipo === r)
      return !enc || enc.carga < (dsc.maximo ?? 3)
    }
    if (ehEvento(r)) {
      if (r === 'forja') return e.encaixes.length > 0
      if (r === 'descanso') return e.vida < e.vidaMax
      return true
    }
    return contar(e.reliquias, r) < (dsc.maximo ?? 1)
  }

  /** Peso de sorteio: raridade, talento da sorte e o que a vida está pedindo. */
  function peso(e: Partida, r: Recompensa) {
    const d = RECOMPENSAS[r]
    let w = PESO_RARIDADE_RECOMPENSA[d.raridade]
    if (d.raridade !== 'comum' && d.raridade !== 'incomum') w *= 1 + 0.25 * Math.min(3, e.talentos.sorte ?? 0)
    if (r === 'descanso') w *= e.vida < e.vidaMax * 0.6 ? 3 : 0.6
    if (d.categoria === 'cura' && e.vida < e.vidaMax * 0.5) w *= 1.6
    return w
  }

  /** Candidatas da categoria prometida pela porta. */
  function candidatasDa(e: Partida, categoria: CategoriaPorta): Recompensa[] {
    const todas = [...PODERES, ...RELIQUIAS, ...EVENTOS].filter((r) => disponivel(e, r))
    const filtro: Record<CategoriaPorta, (r: Recompensa) => boolean> = {
      misto: (r) => !RECOMPENSAS[r].requer,
      poder: (r) => ehPoder(r),
      reliquia: (r) => ehReliquia(r) && !RECOMPENSAS[r].patrono && !RECOMPENSAS[r].requer,
      bencao: (r) => !!RECOMPENSAS[r].patrono || !!RECOMPENSAS[r].requer,
      cura: (r) => RECOMPENSAS[r].categoria === 'cura' || r === 'descanso',
      ouro: () => true,
    }
    const lista = todas.filter(filtro[categoria])
    return lista.length >= 3 ? lista : todas.filter((r) => !RECOMPENSAS[r].requer)
  }

  /**
   * Três opções distintas, sorteadas com peso pela raridade; no máximo um
   * evento; depois do chefe, pelo menos uma rara ou melhor. Na sala de bênção,
   * as três vêm do mesmo patrono (e a dupla entra se você já tem o outro).
   */
  function sortearRecompensas(e: Partida, aposChefe: boolean): [Recompensa[], number] {
    let s = e.semente
    let candidatas = candidatasDa(e, e.categoria)
    if (e.categoria === 'bencao' && e.patronoDaSala) {
      const pat = e.patronoDaSala
      const dele = candidatas.filter((r) => RECOMPENSAS[r].patrono === pat || RECOMPENSAS[r].requer?.includes(pat))
      if (dele.length >= 2) candidatas = [...dele, ...candidatas.filter((r) => !dele.includes(r)).slice(0, Math.max(0, 3 - dele.length))]
    }
    const chaves = candidatas.map((r) => { const [u, p] = sortear(s); s = p; return { r, k: Math.log(Math.max(u, 1e-12)) / peso(e, r) } })
    chaves.sort((a, b) => b.k - a.k)
    const lista: Recompensa[] = []
    if (aposChefe) {
      const rara = chaves.find((x) => ['rara', 'epica', 'lendaria'].includes(RECOMPENSAS[x.r].raridade))
      if (rara) lista.push(rara.r)
    }
    // uma dupla disponível sempre aparece na sala de bênção (é o momento de ouro do Hades)
    if (e.categoria === 'bencao') {
      const dupla = chaves.find((x) => RECOMPENSAS[x.r].requer && !lista.includes(x.r))
      if (dupla) lista.push(dupla.r)
    }
    for (const { r } of chaves) {
      if (lista.length >= 3) break
      if (lista.includes(r)) continue
      if (ehEvento(r) && lista.some(ehEvento)) continue
      lista.push(r)
    }
    return [lista, s]
  }

  /** Aplica uma recompensa (poder, relíquia ou evento); devolve o estado e o que mudou. */
  function aplicarRecompensa(e: Partida, recompensa: Recompensa, eventos: Evento[]): Partida {
    const dsc = RECOMPENSAS[recompensa]
    if (ehPoder(recompensa)) {
      const extra = recompensa === 'pista' && e.reliquias.includes('livro') ? RECOMPENSAS.livro.v.cargas : 0
      const [encaixes, substituiu] = equipar(e.encaixes, recompensa, (dsc.cargas ?? 1) + extra)
      // Se a poção saiu do encaixe, o desafio dela acaba junto.
      e = { ...e, encaixes, pocao: recompensa === 'pocao' ? RECOMPENSAS.pocao.v.acertos : substituiu === 'pocao' ? 0 : e.pocao }
      eventos.push({ tipo: 'equipou', recompensa, substituiu })
    } else if (ehEvento(recompensa)) {
      if (recompensa === 'descanso') e = curar(e, e.vidaMax * dsc.v.fracao, 'descanso', eventos)
      if (recompensa === 'treino') e = { ...e, vidaMax: e.vidaMax + dsc.v.vida }
      if (recompensa === 'forja') e = { ...e, encaixes: e.encaixes.map((x) => ({ ...x, carga: Math.min(RECOMPENSAS[x.tipo].maximo ?? 3, x.carga + dsc.v.cargas) })) }
      if (recompensa === 'bolsa') e = ganharOuro(e, dsc.v.ouro, 'bolsa', eventos)
      eventos.push({ tipo: 'equipou', recompensa, substituiu: null })
    } else {
      const copias = contar(e.reliquias, recompensa)
      e = { ...e, reliquias: [...e.reliquias, recompensa] }
      if (recompensa === 'coracao' || recompensa === 'florescer') { e = { ...e, vidaMax: e.vidaMax + dsc.v.vida }; e = curar(e, dsc.v.vida, recompensa === 'coracao' ? 'coracao' : 'florescer', eventos) }
      if (recompensa === 'vigor') {
        const pct = copias === 0 ? dsc.v.primeira : copias === 1 ? dsc.v.segunda : dsc.v.demais
        e = { ...e, vidaMax: e.vidaMax + Math.round(VIDA_INICIAL * pct) }
      }
      if (recompensa === 'livro') e = { ...e, encaixes: equipar(e.encaixes, 'pista', dsc.v.cargas)[0] }
      eventos.push({ tipo: 'equipou', recompensa, substituiu: null })
    }
    return e
  }

  /** Escolhe a recompensa (aplica o efeito imediato, se houver) e abre as portas do próximo andar. */
  function escolher(p: Partida, recompensa: Recompensa): Resultado {
    if (p.fase !== 'recompensa' || !p.recompensas.includes(recompensa)) return nada(p)
    const eventos: Evento[] = []
    let e = aplicarRecompensa({ ...p, recompensas: [] }, recompensa, eventos)
    e = irParaPortas(e, eventos)
    return { estado: e, eventos }
  }

  /**
   * Portas para o próximo andar (como no Hades): cada uma mostra o que vem
   * depois do confronto. Às vezes uma leva à Caixeira do Arsenal ou ao Velho
   * Preceptor. Antes do chefe, a porta do chefe e, com moedas, a da loja.
   */
  function gerarPortas(e: Partida): [Porta[], number] {
    let s = e.semente
    const rnd = () => { const [u, p] = sortear(s); s = p; return u }
    const proximo = e.andar + 1
    if (andarDeChefe(proximo, e.modo)) {
      const portas: Porta[] = [{ tipo: 'chefe', recompensa: 'misto' }]
      if (e.ouro >= 35) portas.push({ tipo: 'loja' })
      return [portas, s]
    }
    const n = Math.min(4, 2 + Math.min(1, e.talentos.portas ?? 0) + Number(rnd() < 0.35))
    const portas: Porta[] = []
    if (rnd() < 0.22 && e.ouro >= 35) portas.push({ tipo: 'loja' })
    if (rnd() < 0.16) portas.push({ tipo: 'sabio' })
    // salas de evento: no máximo uma por corredor, a partir do 2º andar (a secreta, rara, do 3º)
    if (e.andar >= 1 && portas.length < n - 1) {
      const u = rnd()
      const sala: TipoSala | null = e.andar >= 3 && u < 0.05 ? 'secreta' : u < 0.15 ? 'evento' : u < 0.25 ? 'bau' : u < 0.34 ? 'curandeira' : u < 0.43 && e.ouro >= 35 ? 'ferreiro' : null
      if (sala) portas.push({ tipo: 'sala', sala })
    }
    const pesos: Array<[CategoriaPorta, number]> = [
      ['misto', 3], ['poder', 2], ['reliquia', 2], ['bencao', 2.4], ['cura', e.vida < e.vidaMax * 0.5 ? 3 : 1], ['ouro', 1.2],
    ]
    const patronos = Object.keys(PATRONOS) as Patrono[]
    let tentativas = 0
    while (portas.length < n && tentativas++ < 40) {
      const total = pesos.reduce((a, [, w]) => a + w, 0)
      let u = rnd() * total, cat: CategoriaPorta = 'misto'
      for (const [c, w] of pesos) { if ((u -= w) <= 0) { cat = c; break } }
      const porta: Porta = cat === 'bencao' ? { tipo: 'combate', recompensa: cat, patrono: patronos[Math.floor(rnd() * patronos.length)] } : { tipo: 'combate', recompensa: cat }
      const repetida = portas.some((x) => x.tipo === 'combate' && x.recompensa === cat && (cat !== 'bencao' || (x as { patrono?: Patrono }).patrono === (porta as { patrono?: Patrono }).patrono))
      if (!repetida) portas.push(porta)
    }
    // sempre há pelo menos uma porta de combate (o andar só avança lutando)
    if (!portas.some((x) => x.tipo === 'combate')) portas.push({ tipo: 'combate', recompensa: 'misto' })
    return [portas, s]
  }

  function irParaPortas(e: Partida, eventos: Evento[]): Partida {
    const [portas, semente] = gerarPortas(e)
    eventos.push({ tipo: 'portas', portas })
    return { ...e, semente, fase: 'portas', portas, recompensas: [], loja: [], sabio: [], sala: null }
  }

  /** Avança para o próximo andar: novo adversário, efeitos de início de confronto e o primeiro flashcard. */
  function avancar(e: Partida, categoria: CategoriaPorta, patrono: Patrono | null, eventos: Evento[]): Resultado {
    const antes = inimigoAtual(e).cenario
    const andar = e.andar + 1
    e = { ...e, andar, categoria, patronoDaSala: patrono, portas: [], loja: [], sabio: [], sala: null, inimigo: prepararInimigo(andar, e.sementeBase, e.modo, nivelDaPartida(e)) }
    const { inimigo, ciclo } = inimigoDoAndar(andar, e.sementeBase, e.modo)
    if (e.reliquias.includes('lupa')) e = { ...e, encaixes: equipar(e.encaixes, 'pista', RECOMPENSAS.lupa.v.cargas)[0] }
    if (e.reliquias.includes('baluarte')) e = { ...e, encaixes: equipar(e.encaixes, 'barreira', RECOMPENSAS.baluarte.v.cargas)[0] }
    // sinergias de relíquias (Etapa 6): pares que valem mais juntos, no início de cada adversário
    for (const sin of SINERGIAS) {
      if (!sin.par.every((r) => e.reliquias.includes(r))) continue
      if (sin.efeito === 'barreira' || sin.efeito === 'pista') e = { ...e, encaixes: equipar(e.encaixes, sin.efeito, 1)[0] }
      else e = curar(e, 6, 'insignia', eventos)
      eventos.push({ tipo: 'sinergia', nome: sin.nome, texto: sin.texto })
    }
    if (e.modo === 'torre' && (andar - 1) % TORRE.patamarACada === 0) eventos.push({ tipo: 'patamar', andar: andar - 1 })
    eventos.push({ tipo: 'novo-inimigo', inimigo, ciclo, trocaCenario: inimigo.cenario !== antes })
    const r = comprar({ ...e, atual: null })
    return { estado: r.estado, eventos: [...eventos, ...r.eventos] }
  }

  /** Entra por uma das portas. */
  function entrar(p: Partida, k: number): Resultado {
    if (p.fase !== 'portas' || !p.portas[k]) return nada(p)
    const porta = p.portas[k]
    const eventos: Evento[] = []
    if (porta.tipo === 'loja') {
      const [itens, semente] = montarLoja(p)
      eventos.push({ tipo: 'loja', itens })
      return { estado: { ...p, semente, fase: 'loja', loja: itens, portas: [] }, eventos }
    }
    if (porta.tipo === 'sala') {
      const [sala, semente] = montarSala(p, porta.sala)
      eventos.push({ tipo: 'sala', sala })
      return { estado: { ...p, semente, fase: 'sala', sala, portas: [] }, eventos }
    }
    if (porta.tipo === 'sabio') {
      const [ofertas, semente] = ofertasDoSabio(p)
      eventos.push({ tipo: 'sabio', ofertas })
      return { estado: { ...p, semente, fase: 'sabio', sabio: ofertas, portas: [] }, eventos }
    }
    return avancar(p, porta.recompensa, porta.tipo === 'combate' ? porta.patrono ?? null : null, eventos)
  }

  /** A Caixeira do Arsenal: três itens e uma poção de cura, com preço pela raridade. */
  function montarLoja(p: Partida): [ItemLoja[], number] {
    let s = p.semente
    const candidatas = [...PODERES, ...RELIQUIAS].filter((r) => disponivel(p, r) && !RECOMPENSAS[r].requer)
    const chaves = candidatas.map((r) => { const [u, q] = sortear(s); s = q; return { r, k: Math.log(Math.max(u, 1e-12)) / Math.sqrt(peso(p, r)) } })
    chaves.sort((a, b) => b.k - a.k)
    const itens: ItemLoja[] = chaves.slice(0, 3).map(({ r }) => ({ item: r, preco: PRECO[RECOMPENSAS[r].raridade], vendido: false }))
    itens.push({ item: 'cura', preco: CURA_LOJA.preco, vendido: false })
    return [itens, s]
  }

  function comprarNaLoja(p: Partida, k: number): Resultado {
    const it = p.loja[k]
    if (p.fase !== 'loja' || !it || it.vendido || p.ouro < it.preco) return nada(p)
    if (it.item === 'cura' && p.vida >= p.vidaMax) return nada(p)
    const eventos: Evento[] = [{ tipo: 'comprou', item: it.item, preco: it.preco }]
    let e: Partida = { ...p, ouro: p.ouro - it.preco, loja: p.loja.map((x, i) => (i === k ? { ...x, vendido: true } : x)) }
    e = it.item === 'cura' ? curar(e, e.vidaMax * CURA_LOJA.fracao, 'loja', eventos) : aplicarRecompensa(e, it.item, eventos)
    return { estado: e, eventos }
  }

  function sairDaLoja(p: Partida): Resultado {
    if (p.fase !== 'loja') return nada(p)
    return avancar(p, 'misto', null, [])
  }

  /** O Velho Preceptor oferece uma de três ajudas. */
  function ofertasDoSabio(p: Partida): [OfertaSabio[], number] {
    let s = p.semente
    const raras = RELIQUIAS.filter((r) => disponivel(p, r) && ['rara', 'epica'].includes(RECOMPENSAS[r].raridade))
    const [u, s2] = sortear(s); s = s2
    const ofertas: OfertaSabio[] = [{ tipo: 'cura', valor: Math.round(p.vidaMax * 0.4) }]
    if (raras.length) ofertas.push({ tipo: 'reliquia', recompensa: raras[Math.floor(u * raras.length)] })
    else ofertas.push({ tipo: 'ouro', valor: 60 })
    ofertas.push({ tipo: 'cristais', valor: 10 + 2 * Math.floor(p.andar / 3) })
    return [ofertas, s]
  }

  function aceitarSabio(p: Partida, k: number): Resultado {
    const o = p.sabio[k]
    if (p.fase !== 'sabio' || !o) return nada(p)
    const eventos: Evento[] = []
    let e: Partida = { ...p, sabio: [] }
    if (o.tipo === 'cura') e = curar(e, o.valor, 'sabio', eventos)
    if (o.tipo === 'reliquia') e = aplicarRecompensa(e, o.recompensa, eventos)
    if (o.tipo === 'cristais') e = ganharCristais(e, o.valor, eventos)
    if (o.tipo === 'ouro') e = ganharOuro(e, o.valor, 'sabio', eventos)
    return avancar(e, 'misto', null, eventos)
  }

  /** Uma relíquia rara ou melhor, ainda disponível, sorteada pelo peso (para o baú e a sala secreta). */
  function reliquiaSorteada(p: Partida, s: number, minimas: string[]): [Recompensa | null, number] {
    const lista = RELIQUIAS.filter((r) => disponivel(p, r) && !RECOMPENSAS[r].requer && minimas.includes(RECOMPENSAS[r].raridade))
    if (!lista.length) return [null, s]
    // mesmo sorteio ponderado das portas (raridade e talento da sorte): maior chave log(u)/peso vence
    let melhor = lista[0], chave = -Infinity, q = s
    for (const r of lista) {
      const [u, prox] = sortear(q); q = prox
      const k = Math.log(Math.max(u, 1e-12)) / peso(p, r)
      if (k > chave) { chave = k; melhor = r }
    }
    return [melhor, q]
  }

  /** Monta a sala: opções com custo e efeito. Os textos falam com o residente, sem anatomia nos enfeites. */
  function montarSala(p: Partida, tipo: TipoSala): [Sala, number] {
    let s = p.semente
    const ato = Math.floor(p.andar / 3)
    if (tipo === 'ferreiro') {
      return [{ tipo, titulo: 'Forja do Mestre Ferreiro', icone: 'bigorna', fala: 'Placa torta não consolida. Deixa que eu acerto o teu equipamento.', opcoes: [
        { rotulo: 'Temperar a armadura', detalhe: '+10 de vida máxima e cura 10.', icone: 'escudo', custoOuro: 40, efeitos: [{ tipo: 'vidaMax', valor: 10 }] },
        { rotulo: 'Reforçar os poderes', detalhe: '+1 carga em cada poder equipado.', icone: 'martelo', custoOuro: 35, precisaPoder: true, efeitos: [{ tipo: 'cargas', valor: 1 }] },
        { rotulo: 'Só olhar a forja', detalhe: 'Segue para o próximo andar.', icone: 'porta', efeitos: [] },
      ] }, s]
    }
    if (tipo === 'curandeira') {
      return [{ tipo, titulo: 'Irmã do Calo Ósseo', icone: 'frasco', fala: 'Senta, colega. Ninguém passa de ato com a vida no vermelho.', opcoes: [
        { rotulo: 'Curativo da casa', detalhe: 'Recupera 30% da vida máxima.', icone: 'coracao2', efeitos: [{ tipo: 'cura', fracao: 0.3 }] },
        { rotulo: 'Tratamento completo', detalhe: 'Recupera 70% da vida máxima.', icone: 'pocao', custoOuro: 45, efeitos: [{ tipo: 'cura', fracao: 0.7 }] },
        { rotulo: 'Aprender a técnica', detalhe: `+${8 + ato * 2} cristais de conhecimento.`, icone: 'livro', efeitos: [{ tipo: 'cristais', valor: 8 + ato * 2 }] },
      ] }, s]
    }
    if (tipo === 'bau') {
      const [rel, s2] = reliquiaSorteada(p, s, ['incomum', 'rara']); s = s2
      const tesouro: EfeitoSala[] = [{ tipo: 'ouro', valor: 40 + ato * 8 }, ...(rel ? [{ tipo: 'recompensa', id: rel } as EfeitoSala] : [])]
      return [{ tipo, titulo: 'Baú esquecido', icone: 'bolsa', fala: 'Um baú de instrumental, trancado há anos. Pode ter tesouro. Pode ter mola.', opcoes: [
        { rotulo: 'Abrir o baú', detalhe: `Moedas${rel ? ' e uma relíquia' : ''}. Uma em cada quatro vezes, a mola fere (−12% da vida).`, icone: 'bolsa', efeitos: tesouro,
          azar: { chance: 0.25, efeitos: [{ tipo: 'perdeVida', fracao: 0.12 }, { tipo: 'ouro', valor: 20 + ato * 4 }], texto: 'Era armadilha! A mola feriu, mas sobraram algumas moedas.' } },
        { rotulo: 'Forçar com cuidado', detalhe: `Só as moedas, sem risco (${20 + ato * 4}).`, icone: 'moeda', efeitos: [{ tipo: 'ouro', valor: 20 + ato * 4 }] },
        { rotulo: 'Deixar fechado', detalhe: 'Segue para o próximo andar.', icone: 'porta', efeitos: [] },
      ] }, s]
    }
    if (tipo === 'secreta') {
      const [a, s2] = reliquiaSorteada(p, s, ['epica', 'lendaria']); s = s2
      const opcoes: OpcaoSala[] = []
      if (a) opcoes.push({ rotulo: RECOMPENSAS[a].nome, detalhe: RECOMPENSAS[a].texto, icone: RECOMPENSAS[a].icone, efeitos: [{ tipo: 'recompensa', id: a }] })
      opcoes.push({ rotulo: 'Cofre do arquivo', detalhe: `+${90 + ato * 10} moedas.`, icone: 'moeda', efeitos: [{ tipo: 'ouro', valor: 90 + ato * 10 }] })
      opcoes.push({ rotulo: 'Biblioteca proibida', detalhe: `+${20 + ato * 3} cristais e cura 20%.`, icone: 'livro', efeitos: [{ tipo: 'cristais', valor: 20 + ato * 3 }, { tipo: 'cura', fracao: 0.2 }] })
      return [{ tipo, titulo: 'Sala secreta', icone: 'porta', fala: 'Uma parede rachada cede. Quase ninguém chega aqui: escolha um tesouro.', opcoes }, s]
    }
    // encontros pelo caminho
    const [u, s2] = sortear(s); s = s2
    const encontros: Array<Omit<Sala, 'tipo' | 'icone'> & { icone: string }> = [
      { titulo: 'Fonte de água clara', icone: 'frasco', fala: 'Uma fonte limpa no meio da pedra. Dá para beber ou guardar para depois.', opcoes: [
        { rotulo: 'Beber agora', detalhe: 'Recupera 25% da vida máxima.', icone: 'coracao2', efeitos: [{ tipo: 'cura', fracao: 0.25 }] },
        { rotulo: 'Encher o cantil', detalhe: 'Ganha uma Poção nos encaixes.', icone: 'pocao', efeitos: [{ tipo: 'recompensa', id: 'pocao' as Recompensa }] },
      ] },
      { titulo: 'Residente perdido', icone: 'lanterna', fala: 'Um R1 perdido pede ajuda para achar a saída. Em troca, conta o que caiu na prova dele.', opcoes: [
        { rotulo: 'Guiar até a escada', detalhe: `Custa 10% da vida. +${16 + ato * 3} cristais.`, icone: 'livro', custoVida: 0.1, efeitos: [{ tipo: 'cristais', valor: 16 + ato * 3 }] },
        { rotulo: 'Dar umas moedas', detalhe: `Custa 20 moedas. +${10 + ato * 2} cristais.`, icone: 'moeda', custoOuro: 20, efeitos: [{ tipo: 'cristais', valor: 10 + ato * 2 }] },
        { rotulo: 'Seguir viagem', detalhe: 'Nada muda.', icone: 'porta', efeitos: [] },
      ] },
      { titulo: 'Pedra de amolar antiga', icone: 'martelo', fala: 'Uma pedra de amolar gasta, ainda boa. Afiar dói nos dedos.', opcoes: [
        { rotulo: 'Afiar tudo', detalhe: 'Custa 15% da vida. +1 carga em cada poder.', icone: 'espada', custoVida: 0.15, precisaPoder: true, efeitos: [{ tipo: 'cargas', valor: 1 }] },
        { rotulo: 'Levar a pedra', detalhe: 'Vende depois por moedas (+30).', icone: 'moeda', efeitos: [{ tipo: 'ouro', valor: 30 }] },
      ] },
      { titulo: 'Pilha de prontuários', icone: 'pergaminho', fala: 'Prontuários antigos espalhados no chão. Alguém estudou muito aqui.', opcoes: [
        { rotulo: 'Estudar os casos', detalhe: `+${14 + ato * 3} cristais.`, icone: 'livro', efeitos: [{ tipo: 'cristais', valor: 14 + ato * 3 }] },
        { rotulo: 'Vasculhar as gavetas', detalhe: `+${30 + ato * 5} moedas.`, icone: 'moeda', efeitos: [{ tipo: 'ouro', valor: 30 + ato * 5 }] },
      ] },
    ]
    const ev = encontros[Math.floor(u * encontros.length)]
    return [{ tipo, ...ev }, s]
  }

  function aplicarEfeitoSala(e: Partida, f: EfeitoSala, eventos: Evento[]): Partida {
    if (f.tipo === 'cura') return curar(e, e.vidaMax * f.fracao, 'sala', eventos)
    if (f.tipo === 'ouro') return ganharOuro(e, f.valor, 'sala', eventos)
    if (f.tipo === 'cristais') return ganharCristais(e, f.valor, eventos)
    if (f.tipo === 'vidaMax') return { ...e, vidaMax: e.vidaMax + f.valor, vida: e.vida + f.valor }
    if (f.tipo === 'cargas') return { ...e, encaixes: e.encaixes.map((x) => ({ ...x, carga: Math.min(RECOMPENSAS[x.tipo].maximo ?? 3, x.carga + f.valor) })) }
    if (f.tipo === 'perdeVida') return { ...e, vida: Math.max(1, e.vida - Math.round(e.vidaMax * f.fracao)) }
    return aplicarRecompensa(e, f.id, eventos)
  }

  /** Escolhe uma opção da sala (paga o custo, aplica os efeitos ou o azar) e segue para o próximo andar. */
  function escolherNaSala(p: Partida, k: number): Resultado {
    const sala = p.sala, o = sala?.opcoes[k]
    if (p.fase !== 'sala' || !sala || !o) return nada(p)
    if (o.custoOuro && p.ouro < o.custoOuro) return nada(p)
    if (o.precisaPoder && !p.encaixes.length) return nada(p)
    const eventos: Evento[] = []
    let e: Partida = { ...p, sala: null }
    if (o.custoOuro) e = { ...e, ouro: e.ouro - o.custoOuro }
    if (o.custoVida) e = { ...e, vida: Math.max(1, e.vida - Math.round(e.vidaMax * o.custoVida)) }
    let efeitos = o.efeitos, azar = false
    if (o.azar) {
      const [u, s] = sortear(e.semente); e = { ...e, semente: s }
      if (u < o.azar.chance) { efeitos = o.azar.efeitos; azar = true; eventos.push({ tipo: 'sala-resultado', texto: o.azar.texto, azar: true }) }
    }
    for (const f of efeitos) e = aplicarEfeitoSala(e, f, eventos)
    if (!azar && efeitos.length) eventos.push({ tipo: 'sala-resultado', texto: o.rotulo, azar: false })
    return avancar(e, 'misto', null, eventos)
  }

  /** Depois de ler o verso: próximo flashcard (ou nada, se a partida pede outra tela). */
  function seguir(p: Partida): Resultado {
    if (p.fase !== 'resposta') return nada(p)
    return comprar({ ...p, atual: null })
  }

  /** Encerra por vontade própria (depois de vencer o chefe, por exemplo). */
  function encerrar(p: Partida): Resultado {
    if (p.fase === 'fim') return nada(p)
    return { estado: { ...p, fase: 'fim', recompensas: [] }, eventos: [] }
  }

  return {
    novaPartida, responder, encerrar, usarPista, usarPoder, escolher, entrar, comprarNaLoja, sairDaLoja, aceitarSabio, escolherNaSala, seguir,
    intencao, atributos, inimigoAtual, carta,
  }
}

export type Motor = ReturnType<typeof criarMotor>

const semPocao = (encaixes: Encaixe[]) => encaixes.filter((x) => x.tipo !== 'pocao')

function gastar(encaixes: Encaixe[], k: number): Encaixe[] {
  if (k < 0) return encaixes
  return encaixes.flatMap((x, i) => (i !== k ? [x] : x.carga > 1 ? [{ ...x, carga: x.carga - 1 }] : []))
}

/**
 * Mesmo poder empilha no mesmo encaixe, até o máximo dele; com os 3 encaixes
 * cheios, o novo toma o lugar do mais antigo.
 */
export function equipar(encaixes: Encaixe[], tipo: TipoPoder, cargas = RECOMPENSAS[tipo].cargas ?? 1): [Encaixe[], TipoPoder | null] {
  const maximo = RECOMPENSAS[tipo].maximo ?? 3
  const k = encaixes.findIndex((x) => x.tipo === tipo)
  if (k >= 0) return [encaixes.map((x, i) => (i === k ? { ...x, carga: Math.min(x.carga + cargas, maximo) } : x)), null]
  const novo = { tipo, carga: Math.min(cargas, maximo) }
  if (encaixes.length < ENCAIXES) return [[...encaixes, novo], null]
  return [[...encaixes.slice(1), novo], encaixes[0].tipo]
}

export const cenarioDo = (andar: number, semente = 0, modo: Modo = 'masmorra'): Cenario => inimigoDoAndar(andar, semente, modo).inimigo.cenario
