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
 */
import type { Dificuldade, Flashcard } from '../tipos'
import { embaralhar, sortear } from './aleatorio'
import { ESTAGIOS, LIMITES, inimigoDoAndar, type Cenario, type Inimigo } from './bestiario'
import {
  ENCAIXES, EVENTOS, PESO_RARIDADE_RECOMPENSA, PODERES, RECOMPENSAS, RELIQUIAS, ehEvento, ehPoder,
  type Recompensa, type TipoPoder, type TipoReliquia,
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
/** Todo chefe vencido devolve esta fração da vida máxima. */
export const CURA_CHEFE = 0.15
export const XP_POR_NIVEL = { comum: 1, elite: 2, chefe: 4 } as const

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
}

export type Fase = 'pergunta' | 'resposta' | 'recompensa' | 'fim'

export interface Partida {
  versao: 2
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
}

export type MotivoCura = 'sequencia' | 'lendaria' | 'pocao' | 'selo' | 'roubo' | 'vital' | 'insignia' | 'chefe' | 'ritual' | 'descanso' | 'coracao' | 'evolucao'

export type Evento =
  | { tipo: 'novo-inimigo'; inimigo: Inimigo; ciclo: number; trocaCenario: boolean }
  | { tipo: 'compra'; id: string; criticoInimigo: boolean }
  | { tipo: 'pista'; posicao: number }
  | { tipo: 'resposta'; id: string; certo: boolean; escolha: number; certa: number; assistida: boolean; dificuldade: Dificuldade }
  | { tipo: 'dano-inimigo'; valor: number; critico: boolean; combo: number; duplo: boolean; absorvido: number; eco: number; barreira: number; especial: boolean }
  | { tipo: 'combo'; sequencia: number }
  | { tipo: 'fase-chefe'; nome: string }
  | { tipo: 'furia' }
  | { tipo: 'escudo'; restante: number }
  | { tipo: 'mitigado'; motivo: 'barreira' | 'foco' | 'preceptor'; valor: number }
  | { tipo: 'dano-heroi'; valor: number; veneno: number; furia: boolean; critico: boolean }
  | { tipo: 'imortal' }
  | { tipo: 'cura'; valor: number; motivo: MotivoCura }
  | { tipo: 'regenera'; valor: number }
  | { tipo: 'pocao'; cumprida: boolean; perdida: boolean; faltam: number }
  | { tipo: 'inimigo-derrotado'; chefe: boolean }
  | { tipo: 'evolucao'; estagio: number; nome: string }
  | { tipo: 'heroi-derrotado' }
  | { tipo: 'recompensas'; opcoes: Recompensa[]; aposChefe: boolean }
  | { tipo: 'equipou'; recompensa: Recompensa; substituiu: TipoPoder | null }

export interface Resultado { estado: Partida; eventos: Evento[] }

const nada = (estado: Partida): Resultado => ({ estado, eventos: [] })
const contar = (lista: readonly string[], x: string) => lista.reduce((n, y) => n + Number(y === x), 0)

export interface OpcoesMotor {
  /**
   * Reposição do baralho (seleção procedural, motor/selecao.ts): devolve novos
   * ids, sem os que estão em `excluir`, e a próxima semente. Sem ela, o
   * descarte é reembaralhado.
   */
  repor?: (excluir: ReadonlySet<string>, semente: number) => [string[], number]
}

export function criarMotor(cartas: Flashcard[], opcoes: OpcoesMotor = {}) {
  const porId = new Map(cartas.map((c) => [c.id, c]))
  const carta = (id: string) => {
    const c = porId.get(id)
    if (!c) throw new Error(`Flashcard ${id} fora do baralho`)
    return c
  }

  function inimigoAtual(p: Partida): Inimigo {
    return inimigoDoAndar(p.andar, p.sementeBase).inimigo
  }

  /** Força e armadura do momento, contando a fase 2 do chefe e a Ruptura. */
  function atributos(p: Partida) {
    const i = inimigoAtual(p)
    const f2 = p.inimigo.fase === 2 && i.fase2
    const armadura = Math.max(0, (f2 ? i.fase2!.armadura : i.armadura) - p.inimigo.armaduraPerdida)
    return { forca: f2 ? i.fase2!.forca : i.forca, armadura, barreira: p.inimigo.barreira }
  }

  /** Dano do golpe antes dos consumíveis: base, crítico, teto e reduções passivas. */
  function danoBruto(p: Partida, critico: boolean) {
    const c = carta(p.atual!.id)
    const i = inimigoAtual(p)
    const { forca } = atributos(p)
    const veneno = i.porErroSeguido * p.inimigo.errosSeguidos
    let dano = DANO_BASE[c.dificuldade] * forca * (p.inimigo.furia ? 1.5 : 1) + veneno
    if (critico) dano *= LIMITES.multCritico
    const teto = p.vidaMax * (critico ? LIMITES.critico : LIMITES[i.nivel])
    dano = Math.min(dano, teto)
    const placas = p.reliquias.includes('placas') ? RECOMPENSAS.placas.v.fracao : 0
    const mestre = i.chefe && p.reliquias.includes('mestre') ? RECOMPENSAS.mestre.v.fracao : 0
    dano = dano * (1 - placas - mestre) - ESTAGIOS[p.estagio - 1].defesa
    if (p.reliquias.includes('gesso')) dano -= RECOMPENSAS.gesso.v.reducao
    return { dano: Math.max(1, Math.round(dano)), veneno }
  }

  /** Aplica os consumíveis de defesa na ordem fixa: escudo, preceptor, foco, barreira. */
  function defender(p: Partida, dano: number) {
    if (p.encaixes.some((e) => e.tipo === 'escudo')) return { final: 0, bloqueado: true, passos: [] as Array<{ motivo: 'barreira' | 'foco' | 'preceptor'; valor: number }> }
    const passos: Array<{ motivo: 'barreira' | 'foco' | 'preceptor'; valor: number }> = []
    let d = dano
    if (p.reliquias.includes('preceptor') && !p.inimigo.preceptorUsado) { const n = Math.ceil(d * RECOMPENSAS.preceptor.v.fracao); passos.push({ motivo: 'preceptor', valor: d - n }); d = n }
    if (p.encaixes.some((e) => e.tipo === 'foco')) { const n = Math.ceil(d * RECOMPENSAS.foco.v.fracao); passos.push({ motivo: 'foco', valor: d - n }); d = n }
    if (p.encaixes.some((e) => e.tipo === 'barreira')) { const a = Math.min(d, RECOMPENSAS.barreira.v.absorve); passos.push({ motivo: 'barreira', valor: a }); d -= a }
    return { final: d, bloqueado: false, passos }
  }

  /**
   * O que o adversário fará se você errar o flashcard da mesa (a "intenção"):
   * o dano EXATO que chega em você, já com crítico, teto e proteções.
   */
  function intencao(p: Partida) {
    if (!p.atual) return { dano: 0, bruto: 0, veneno: 0, furia: false, bloqueado: false, critico: false, protecoes: [] as string[] }
    const critico = p.atual.criticoInimigo
    const { dano, veneno } = danoBruto(p, critico)
    const def = defender(p, dano)
    return { dano: def.final, bruto: dano, veneno, furia: p.inimigo.furia, bloqueado: def.bloqueado, critico, protecoes: def.passos.map((x) => x.motivo) }
  }

  function prepararInimigo(andar: number, sementeBase: number): EstadoInimigo {
    const { inimigo } = inimigoDoAndar(andar, sementeBase)
    return {
      id: inimigo.id, vida: inimigo.vida, vidaMax: inimigo.vida, rodadas: 0, fase: 1, errosSeguidos: 0, furia: false,
      barreira: inimigo.barreira ?? 0, armaduraPerdida: 0, regenerado: 0, preceptorUsado: false, ultimoCritico: false,
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
      ;[baralho, semente] = opcoes.repor(new Set([...descarte, ...p.baralho]), semente)
    }
    if (!baralho.length) {
      ;[descarte, semente] = embaralhar(descarte.filter((id) => porId.has(id)), semente)
      baralho = descarte
      descarte = []
    }
    // Evita repetir em seguida o flashcard que acabou de sair, se houver outro.
    const ultimo = p.descarte[p.descarte.length - 1]
    let pos = baralho.findIndex((x) => x !== ultimo)
    if (pos < 0) pos = 0
    const id = baralho[pos]
    baralho.splice(pos, 1)
    const c = carta(id)
    let ordem: number[]
    ;[ordem, semente] = embaralhar(c.opcoes.map((_, k) => k), semente)
    let u: number
    ;[u, semente] = sortear(semente)
    const criticoInimigo = !p.inimigo.ultimoCritico && u < inimigoAtual(p).critico
    const atual: Jogada = { id, ordem, eliminadas: [], respondida: false, escolha: null, assistida: false, criticoInimigo }
    return { estado: { ...p, baralho, descarte, semente, atual, fase: 'pergunta' }, eventos: [{ tipo: 'compra', id, criticoInimigo }] }
  }

  function novaPartida(semente: number, ids?: string[]): Resultado {
    let baralho: string[], s: number
    if (!ids && opcoes.repor) [baralho, s] = opcoes.repor(new Set(), semente)
    else [baralho, s] = embaralhar(ids ?? cartas.map((c) => c.id), semente)
    const base: Partida = {
      versao: 2, sementeBase: semente >>> 0, semente: s, rodada: 0, andar: 1, fase: 'pergunta', vida: VIDA_INICIAL, vidaMax: VIDA_INICIAL,
      estagio: 1, xp: 0, inimigo: prepararInimigo(1, semente >>> 0), baralho, descarte: [], atual: null,
      sequencia: 0, sequenciaLimpa: 0, melhorSequencia: 0, pontos: 0, acertos: 0, erros: 0, assistidos: 0,
      encaixes: [], reliquias: [], imortalUsado: false, pocao: 0, recompensas: [], derrubaram: [],
      derrotados: 0, chefesDerrotados: 0, venceu: false, danoSofrido: 0, danoEvitado: 0, curaTotal: 0,
    }
    const { inimigo, ciclo } = inimigoDoAndar(1, base.sementeBase)
    const r = comprar(base)
    return { estado: r.estado, eventos: [{ tipo: 'novo-inimigo', inimigo, ciclo, trocaCenario: true }, ...r.eventos] }
  }

  /** Cura com teto na vida máxima; registra o evento só se curou algo. */
  function curar(e: Partida, valor: number, motivo: MotivoCura, eventos: Evento[]): Partida {
    const ganho = Math.max(0, Math.min(e.vidaMax - e.vida, Math.round(valor)))
    if (ganho <= 0) return e
    eventos.push({ tipo: 'cura', valor: ganho, motivo })
    return { ...e, vida: e.vida + ganho, curaTotal: e.curaTotal + ganho }
  }

  /** Gasta um poder ativo: pergaminho da pista ou poção de emergência. */
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
      const duploK = tem('duplo'), devK = tem('devastador'), ecoK = tem('eco'), rupK = tem('ruptura')
      const especial = e.reliquias.includes('marca') && sequenciaLimpa > 0 && sequenciaLimpa % RECOMPENSAS.marca.v.a_cada === 0
      let bruto = ATAQUE[c.dificuldade] + ESTAGIOS[e.estagio - 1].ataque
        + (sequencia >= COMBO_MINIMO ? BONUS_COMBO : 0)
        + (c.dificuldade === 3 && e.reliquias.includes('bisturi') ? RECOMPENSAS.bisturi.v.bonus : 0)
        + (e.reliquias.includes('residente') && sequencia % RECOMPENSAS.residente.v.a_cada === 0 ? RECOMPENSAS.residente.v.bonus : 0)
        + (especial ? RECOMPENSAS.marca.v.bonus : 0)
        + (devK >= 0 ? RECOMPENSAS.devastador.v.bonus : 0)
      if (duploK >= 0) bruto *= RECOMPENSAS.duplo.v.multiplicador
      let encaixes = e.encaixes
      for (const k of [duploK, devK, ecoK, rupK].filter((k) => k >= 0).sort((a, b) => b - a)) encaixes = gastar(encaixes, k)
      const { armadura } = atributos(e)
      const armaduraUsada = rupK >= 0 ? 0 : armadura
      const golpe = Math.max(5, bruto - armaduraUsada)
      const eco = ecoK >= 0 ? Math.round(golpe * RECOMPENSAS.eco.v.fracao) : 0
      const total = golpe + eco
      const absorvidoBarreira = Math.min(e.inimigo.barreira, total)
      const vidaInimigo = Math.max(0, e.inimigo.vida - (total - absorvidoBarreira))
      e = {
        ...e, sequencia, sequenciaLimpa, melhorSequencia: Math.max(e.melhorSequencia, sequencia),
        acertos: e.acertos + 1, assistidos: e.assistidos + Number(assistida), pontos: e.pontos + total, encaixes,
        inimigo: {
          ...e.inimigo, vida: vidaInimigo, errosSeguidos: 0, barreira: e.inimigo.barreira - absorvidoBarreira,
          armaduraPerdida: e.inimigo.armaduraPerdida + (rupK >= 0 ? RECOMPENSAS.ruptura.v.reducao : 0),
        },
      }
      eventos.push({ tipo: 'dano-inimigo', valor: total, critico: c.dificuldade === 3 || especial, combo: sequencia, duplo: duploK >= 0, absorvido: Math.max(0, bruto - golpe), eco, barreira: absorvidoBarreira, especial })
      if (sequencia >= COMBO_MINIMO) eventos.push({ tipo: 'combo', sequencia })

      if (sequencia % 3 === 0) e = curar(e, CURA_SEQUENCIA, 'sequencia', eventos)
      if (e.reliquias.includes('selo') && sequencia % RECOMPENSAS.selo.v.a_cada === 0) e = curar(e, RECOMPENSAS.selo.v.cura, 'selo', eventos)
      if (c.raridade === 'lendaria') e = curar(e, e.reliquias.includes('amuleto') ? RECOMPENSAS.amuleto.v.cura : CURA_LENDARIA, 'lendaria', eventos)
      if (c.dificuldade === 3 && !assistida && e.reliquias.includes('roubo')) e = curar(e, RECOMPENSAS.roubo.v.cura, 'roubo', eventos)
      if (e.pocao > 0) {
        const faltam = e.pocao - 1
        e = { ...e, pocao: faltam, encaixes: faltam === 0 ? semPocao(e.encaixes) : e.encaixes }
        eventos.push({ tipo: 'pocao', cumprida: faltam === 0, perdida: false, faltam })
        if (faltam === 0) e = curar(e, RECOMPENSAS.pocao.v.cura, 'pocao', eventos)
      }

      if (vidaInimigo <= 0) {
        e = derrotarInimigo(e, eventos)
      } else if (i.fase2 && e.inimigo.fase === 1 && vidaInimigo <= e.inimigo.vidaMax * i.fase2.abaixoDe) {
        e = { ...e, inimigo: { ...e.inimigo, fase: 2, barreira: i.fase2.barreira ?? 0 } }
        eventos.push({ tipo: 'fase-chefe', nome: i.fase2.nome })
      }
    } else {
      const critico = p.atual.criticoInimigo
      const { dano, veneno } = danoBruto(e, critico)
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
      } else {
        for (const passo of def.passos) {
          eventos.push({ tipo: 'mitigado', motivo: passo.motivo, valor: passo.valor })
          if (passo.motivo === 'preceptor') e = { ...e, inimigo: { ...e.inimigo, preceptorUsado: true } }
          else e = { ...e, encaixes: gastar(e.encaixes, e.encaixes.findIndex((x) => x.tipo === passo.motivo)) }
        }
        e = { ...e, danoEvitado: e.danoEvitado + (dano - def.final) }
        let vida = e.vida - def.final
        if (def.final > 0) eventos.push({ tipo: 'dano-heroi', valor: def.final, veneno, furia, critico })
        if (vida <= 0 && e.encaixes.some((x) => x.tipo === 'imortal')) {
          vida = 1
          e = { ...e, encaixes: gastar(e.encaixes, e.encaixes.findIndex((x) => x.tipo === 'imortal')), imortalUsado: true }
          eventos.push({ tipo: 'imortal' })
        }
        e = { ...e, vida: Math.max(0, vida), danoSofrido: e.danoSofrido + Math.min(e.vida, def.final) }
        if (e.vida <= 0) { e = { ...e, fase: 'fim' }; eventos.push({ tipo: 'heroi-derrotado' }) }
      }
    }

    // Regeneração do adversário, a cada rodada, até o total do confronto.
    if (e.fase === 'resposta' && i.regenera && e.inimigo.vida > 0) {
      const v = Math.min(i.regenera.porRodada, i.regenera.total - e.inimigo.regenerado, e.inimigo.vidaMax - e.inimigo.vida)
      if (v > 0) { e = { ...e, inimigo: { ...e.inimigo, vida: e.inimigo.vida + v, regenerado: e.inimigo.regenerado + v } }; eventos.push({ tipo: 'regenera', valor: v }) }
    }
    // A paciência acaba: daqui em diante o adversário bate com Fúria.
    if (e.fase === 'resposta' && !e.inimigo.furia && e.inimigo.rodadas >= i.paciencia) {
      e = { ...e, inimigo: { ...e.inimigo, furia: true } }
      eventos.push({ tipo: 'furia' })
    }
    return { estado: e, eventos }
  }

  function derrotarInimigo(e: Partida, eventos: Evento[]): Partida {
    const i = inimigoAtual(e)
    eventos.push({ tipo: 'inimigo-derrotado', chefe: !!i.chefe })
    e = { ...e, xp: e.xp + XP_POR_NIVEL[i.nivel], derrotados: e.derrotados + 1, chefesDerrotados: e.chefesDerrotados + Number(!!i.chefe), venceu: e.venceu || !!i.chefe }
    if (e.reliquias.includes('insignia')) e = curar(e, RECOMPENSAS.insignia.v.cura, 'insignia', eventos)
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
    const [opcoes, semente] = sortearRecompensas(e, !!i.chefe)
    eventos.push({ tipo: 'recompensas', opcoes, aposChefe: !!i.chefe })
    return { ...e, semente, fase: 'recompensa', recompensas: opcoes }
  }

  /** Pode ser oferecida agora? (limites, únicas, já equipadas, pós-chefe) */
  function disponivel(e: Partida, r: Recompensa): boolean {
    const dsc = RECOMPENSAS[r]
    if (dsc.aposChefe && e.chefesDerrotados === 0) return false
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

  /** Três opções distintas, sorteadas com peso pela raridade; no máximo um evento; depois do chefe, pelo menos uma rara. */
  function sortearRecompensas(e: Partida, aposChefe: boolean): [Recompensa[], number] {
    let s = e.semente
    const candidatas = [...PODERES, ...RELIQUIAS, ...EVENTOS].filter((r) => disponivel(e, r))
    const peso = (r: Recompensa) => {
      let w = PESO_RARIDADE_RECOMPENSA[RECOMPENSAS[r].raridade]
      if (r === 'descanso') w *= e.vida < e.vidaMax * 0.6 ? 3 : 0.6
      if (RECOMPENSAS[r].categoria === 'cura' && e.vida < e.vidaMax * 0.5) w *= 1.6
      return w
    }
    const chaves = candidatas.map((r) => { const [u, p] = sortear(s); s = p; return { r, k: Math.log(Math.max(u, 1e-12)) / peso(r) } })
    chaves.sort((a, b) => b.k - a.k)
    const lista: Recompensa[] = []
    if (aposChefe) {
      const rara = chaves.find((x) => RECOMPENSAS[x.r].raridade === 'rara')
      if (rara) lista.push(rara.r)
    }
    for (const { r } of chaves) {
      if (lista.length >= 3) break
      if (lista.includes(r)) continue
      if (ehEvento(r) && lista.some(ehEvento)) continue
      lista.push(r)
    }
    return [lista, s]
  }

  /** Escolhe a recompensa (aplica o efeito imediato, se houver) e chama o próximo adversário. */
  function escolher(p: Partida, recompensa: Recompensa): Resultado {
    if (p.fase !== 'recompensa' || !p.recompensas.includes(recompensa)) return nada(p)
    const eventos: Evento[] = []
    let e: Partida = { ...p, recompensas: [] }
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
      eventos.push({ tipo: 'equipou', recompensa, substituiu: null })
    } else {
      const copias = contar(e.reliquias, recompensa)
      e = { ...e, reliquias: [...e.reliquias, recompensa] }
      if (recompensa === 'coracao') { e = { ...e, vidaMax: e.vidaMax + dsc.v.vida }; e = curar(e, dsc.v.vida, 'coracao', eventos) }
      if (recompensa === 'vigor') {
        const pct = copias === 0 ? dsc.v.primeira : copias === 1 ? dsc.v.segunda : dsc.v.demais
        e = { ...e, vidaMax: e.vidaMax + Math.round(VIDA_INICIAL * pct) }
      }
      if (recompensa === 'livro') e = { ...e, encaixes: equipar(e.encaixes, 'pista', dsc.v.cargas)[0] }
      eventos.push({ tipo: 'equipou', recompensa, substituiu: null })
    }
    const andar = e.andar + 1
    const antes = inimigoAtual(e).cenario
    e = { ...e, andar, inimigo: prepararInimigo(andar, e.sementeBase) }
    const { inimigo, ciclo } = inimigoDoAndar(andar, e.sementeBase)
    if (e.reliquias.includes('lupa')) e = { ...e, encaixes: equipar(e.encaixes, 'pista', RECOMPENSAS.lupa.v.cargas)[0] }
    eventos.push({ tipo: 'novo-inimigo', inimigo, ciclo, trocaCenario: inimigo.cenario !== antes })
    const r = comprar({ ...e, atual: null })
    return { estado: r.estado, eventos: [...eventos, ...r.eventos] }
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

  return { novaPartida, responder, encerrar, usarPista, usarPoder, escolher, seguir, intencao, atributos, inimigoAtual, carta }
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

export const cenarioDo = (andar: number, semente = 0): Cenario => inimigoDoAndar(andar, semente).inimigo.cenario
