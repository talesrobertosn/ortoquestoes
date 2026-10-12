/**
 * Motor de regras da Batalha: funções puras, sem tela, sem relógio e sem
 * sorteio solto. Cada ação recebe o estado e devolve { estado, eventos }; os
 * eventos são a lista do que aconteceu, na ordem, e a tela só os anima.
 * Uma ação fora de hora (responder duas vezes, seguir antes de responder)
 * devolve o mesmo estado e nenhum evento: é o que impede corrida entre
 * cliques, teclas e animações.
 */
import type { Dificuldade, Flashcard } from '../tipos'
import { embaralhar, sortear } from './aleatorio'
import { inimigoDoAndar, type Cenario, type Inimigo } from './bestiario'
import { ENCAIXES, PODERES, RECOMPENSAS, RELIQUIAS, ehPoder, type Recompensa, type TipoPoder, type TipoReliquia } from './poderes'

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
export const CURA_POCAO = 20

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
}

export interface EstadoInimigo {
  id: string
  vida: number
  vidaMax: number
  rodadas: number
  fase: 1 | 2
  errosSeguidos: number
  furia: boolean
}

export type Fase = 'pergunta' | 'resposta' | 'recompensa' | 'fim'

export interface Partida {
  versao: 1
  semente: number
  rodada: number
  andar: number
  fase: Fase
  vida: number
  vidaMax: number
  inimigo: EstadoInimigo
  baralho: string[]
  descarte: string[]
  atual: Jogada | null
  sequencia: number
  melhorSequencia: number
  pontos: number
  acertos: number
  erros: number
  assistidos: number
  encaixes: Encaixe[]
  reliquias: TipoReliquia[]
  imortalUsado: boolean
  pocao: number
  recompensas: Recompensa[]
  derrubaram: string[]
  derrotados: number
  chefesDerrotados: number
  venceu: boolean
}

export type Evento =
  | { tipo: 'novo-inimigo'; inimigo: Inimigo; ciclo: number; trocaCenario: boolean }
  | { tipo: 'compra'; id: string }
  | { tipo: 'pista'; posicao: number }
  | { tipo: 'resposta'; id: string; certo: boolean; escolha: number; certa: number; assistida: boolean; dificuldade: Dificuldade }
  | { tipo: 'dano-inimigo'; valor: number; critico: boolean; combo: number; duplo: boolean; absorvido: number }
  | { tipo: 'combo'; sequencia: number }
  | { tipo: 'fase-chefe'; nome: string }
  | { tipo: 'furia' }
  | { tipo: 'escudo'; restante: number }
  | { tipo: 'dano-heroi'; valor: number; veneno: number; furia: boolean }
  | { tipo: 'imortal' }
  | { tipo: 'cura'; valor: number; motivo: 'sequencia' | 'lendaria' | 'pocao' }
  | { tipo: 'pocao'; cumprida: boolean; perdida: boolean; faltam: number }
  | { tipo: 'inimigo-derrotado'; chefe: boolean }
  | { tipo: 'heroi-derrotado' }
  | { tipo: 'recompensas'; opcoes: Recompensa[]; aposChefe: boolean }
  | { tipo: 'equipou'; recompensa: Recompensa; substituiu: TipoPoder | null }

export interface Resultado { estado: Partida; eventos: Evento[] }

const nada = (estado: Partida): Resultado => ({ estado, eventos: [] })

export function criarMotor(cartas: Flashcard[]) {
  const porId = new Map(cartas.map((c) => [c.id, c]))
  const carta = (id: string) => {
    const c = porId.get(id)
    if (!c) throw new Error(`Flashcard ${id} fora do baralho`)
    return c
  }

  function inimigoAtual(p: Partida): Inimigo {
    return inimigoDoAndar(p.andar).inimigo
  }

  /** Força e armadura do momento, contando a fase 2 do chefe. */
  function atributos(p: Partida) {
    const i = inimigoAtual(p)
    const f2 = p.inimigo.fase === 2 && i.fase2
    return { forca: f2 ? i.fase2!.forca : i.forca, armadura: f2 ? i.fase2!.armadura : i.armadura }
  }

  /** O que o adversário fará se você errar o flashcard da mesa (a "intenção"). */
  function intencao(p: Partida): { dano: number; veneno: number; furia: boolean; bloqueado: boolean } {
    if (!p.atual) return { dano: 0, veneno: 0, furia: false, bloqueado: false }
    const c = carta(p.atual.id)
    const { forca } = atributos(p)
    const i = inimigoAtual(p)
    const veneno = i.porErroSeguido * p.inimigo.errosSeguidos
    let dano = Math.round(DANO_BASE[c.dificuldade] * forca * (p.inimigo.furia ? 1.5 : 1)) + veneno
    if (p.reliquias.includes('gesso')) dano = Math.max(1, dano - 2)
    return { dano, veneno, furia: p.inimigo.furia, bloqueado: p.encaixes.some((e) => e.tipo === 'escudo') }
  }

  function prepararInimigo(andar: number): EstadoInimigo {
    const { inimigo } = inimigoDoAndar(andar)
    return { id: inimigo.id, vida: inimigo.vida, vidaMax: inimigo.vida, rodadas: 0, fase: 1, errosSeguidos: 0, furia: false }
  }

  /** Tira o próximo flashcard que o adversário aceita jogar; refaz o baralho com o descarte quando acaba. */
  function comprar(p: Partida): Resultado {
    let baralho = p.baralho.slice()
    let descarte = p.descarte.slice()
    let semente = p.semente
    const minimo = inimigoAtual(p).dificuldadeMinima
    const aceita = (id: string) => carta(id).dificuldade >= minimo
    if (!baralho.some(aceita)) {
      ;[descarte, semente] = embaralhar(descarte, semente)
      baralho = [...baralho, ...descarte]
      descarte = []
    }
    // Se nenhum flashcard atinge a dificuldade mínima, o chefe joga o que houver.
    // Evita repetir em seguida o flashcard que acabou de sair, se houver outro.
    const ultimo = p.descarte[p.descarte.length - 1]
    let pos = baralho.findIndex((x) => aceita(x) && x !== ultimo)
    if (pos < 0) pos = baralho.findIndex(aceita)
    if (pos < 0) pos = 0
    const id = baralho[pos]
    baralho.splice(pos, 1)
    const c = carta(id)
    let ordem: number[]
    ;[ordem, semente] = embaralhar(c.opcoes.map((_, k) => k), semente)
    const atual: Jogada = { id, ordem, eliminadas: [], respondida: false, escolha: null, assistida: false }
    return { estado: { ...p, baralho, descarte, semente, atual, fase: 'pergunta' }, eventos: [{ tipo: 'compra', id }] }
  }

  function novaPartida(semente: number, ids = cartas.map((c) => c.id)): Resultado {
    const [baralho, s] = embaralhar(ids, semente)
    const base: Partida = {
      versao: 1, semente: s, rodada: 0, andar: 1, fase: 'pergunta', vida: VIDA_INICIAL, vidaMax: VIDA_INICIAL,
      inimigo: prepararInimigo(1), baralho, descarte: [], atual: null,
      sequencia: 0, melhorSequencia: 0, pontos: 0, acertos: 0, erros: 0, assistidos: 0,
      encaixes: [], reliquias: [], imortalUsado: false, pocao: 0, recompensas: [], derrubaram: [],
      derrotados: 0, chefesDerrotados: 0, venceu: false,
    }
    const { inimigo, ciclo } = inimigoDoAndar(1)
    const r = comprar(base)
    return { estado: r.estado, eventos: [{ tipo: 'novo-inimigo', inimigo, ciclo, trocaCenario: true }, ...r.eventos] }
  }

  /** Gasta um pergaminho: elimina uma alternativa errada ainda visível. */
  function usarPista(p: Partida): Resultado {
    if (p.fase !== 'pergunta' || !p.atual || p.atual.respondida) return nada(p)
    const k = p.encaixes.findIndex((e) => e.tipo === 'pista')
    if (k < 0) return nada(p)
    const c = carta(p.atual.id)
    const candidatas = p.atual.ordem
      .map((opcao, posicao) => ({ opcao, posicao }))
      .filter(({ opcao, posicao }) => opcao !== c.certa && !p.atual!.eliminadas.includes(posicao))
    // Sempre sobram ao menos duas alternativas na mão.
    if (candidatas.length <= 1) return nada(p)
    const [v, semente] = sortear(p.semente)
    const { posicao } = candidatas[Math.floor(v * candidatas.length)]
    const encaixes = gastar(p.encaixes, k)
    return {
      estado: { ...p, semente, encaixes, atual: { ...p.atual, eliminadas: [...p.atual.eliminadas, posicao], assistida: true } },
      eventos: [{ tipo: 'pista', posicao }],
    }
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
    let e: Partida = {
      ...p,
      rodada: p.rodada + 1,
      fase: 'resposta',
      atual: { ...p.atual, respondida: true, escolha: posicao },
      descarte: [...p.descarte, c.id],
      inimigo: { ...p.inimigo, rodadas: p.inimigo.rodadas + 1 },
    }
    eventos.push({ tipo: 'resposta', id: c.id, certo, escolha: posicao, certa: p.atual.ordem.indexOf(c.certa), assistida: p.atual.assistida, dificuldade: c.dificuldade })

    if (certo) {
      const sequencia = e.sequencia + 1
      const duploK = e.encaixes.findIndex((x) => x.tipo === 'duplo')
      const duplo = duploK >= 0
      const { armadura } = atributos(e)
      let bruto = ATAQUE[c.dificuldade] + (sequencia >= COMBO_MINIMO ? BONUS_COMBO : 0) + (c.dificuldade === 3 && e.reliquias.includes('bisturi') ? 5 : 0)
      if (duplo) bruto *= 2
      const valor = Math.max(5, bruto - armadura)
      const vidaInimigo = Math.max(0, e.inimigo.vida - valor)
      e = {
        ...e, sequencia, melhorSequencia: Math.max(e.melhorSequencia, sequencia),
        acertos: e.acertos + 1, assistidos: e.assistidos + Number(p.atual.assistida), pontos: e.pontos + valor,
        encaixes: duplo ? gastar(e.encaixes, duploK) : e.encaixes,
        inimigo: { ...e.inimigo, vida: vidaInimigo, errosSeguidos: 0 },
      }
      eventos.push({ tipo: 'dano-inimigo', valor, critico: c.dificuldade === 3, combo: sequencia, duplo, absorvido: Math.max(0, bruto - valor) })
      if (sequencia >= COMBO_MINIMO) eventos.push({ tipo: 'combo', sequencia })

      let cura = 0
      const motivos: Array<{ valor: number; motivo: 'sequencia' | 'lendaria' | 'pocao' }> = []
      if (sequencia % 3 === 0) motivos.push({ valor: CURA_SEQUENCIA, motivo: 'sequencia' })
      if (c.raridade === 'lendaria') motivos.push({ valor: e.reliquias.includes('amuleto') ? 6 : CURA_LENDARIA, motivo: 'lendaria' })
      if (e.pocao > 0) {
        const faltam = e.pocao - 1
        e = { ...e, pocao: faltam, encaixes: faltam === 0 ? semPocao(e.encaixes) : e.encaixes }
        if (faltam === 0) motivos.push({ valor: CURA_POCAO, motivo: 'pocao' })
        eventos.push({ tipo: 'pocao', cumprida: faltam === 0, perdida: false, faltam })
      }
      for (const m of motivos) {
        const antes = e.vida + cura
        const ganho = Math.min(e.vidaMax - antes, m.valor)
        if (ganho > 0) { cura += ganho; eventos.push({ tipo: 'cura', valor: ganho, motivo: m.motivo }) }
      }
      e = { ...e, vida: e.vida + cura }

      if (vidaInimigo <= 0) {
        e = derrotarInimigo(e, eventos)
      } else if (i.fase2 && e.inimigo.fase === 1 && vidaInimigo <= e.inimigo.vidaMax * i.fase2.abaixoDe) {
        e = { ...e, inimigo: { ...e.inimigo, fase: 2 } }
        eventos.push({ tipo: 'fase-chefe', nome: i.fase2.nome })
      }
    } else {
      const { dano, veneno, furia } = intencao(e)
      e = {
        ...e, sequencia: 0, erros: e.erros + 1, derrubaram: e.derrubaram.includes(c.id) ? e.derrubaram : [...e.derrubaram, c.id],
        inimigo: { ...e.inimigo, errosSeguidos: e.inimigo.errosSeguidos + 1 },
      }
      if (e.pocao > 0) { e = { ...e, pocao: 0, encaixes: semPocao(e.encaixes) }; eventos.push({ tipo: 'pocao', cumprida: false, perdida: true, faltam: 0 }) }
      const escudo = e.encaixes.findIndex((x) => x.tipo === 'escudo')
      if (escudo >= 0) {
        e = { ...e, encaixes: gastar(e.encaixes, escudo) }
        eventos.push({ tipo: 'escudo', restante: e.encaixes.find((x) => x.tipo === 'escudo')?.carga ?? 0 })
      } else {
        let vida = e.vida - dano
        eventos.push({ tipo: 'dano-heroi', valor: dano, veneno, furia })
        if (vida <= 0 && e.encaixes.some((x) => x.tipo === 'imortal')) {
          vida = 1
          e = { ...e, encaixes: gastar(e.encaixes, e.encaixes.findIndex((x) => x.tipo === 'imortal')), imortalUsado: true }
          eventos.push({ tipo: 'imortal' })
        }
        e = { ...e, vida: Math.max(0, vida) }
        if (e.vida <= 0) { e = { ...e, fase: 'fim' }; eventos.push({ tipo: 'heroi-derrotado' }) }
      }
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
    const [opcoes, semente] = sortearRecompensas(e, !!i.chefe)
    eventos.push({ tipo: 'recompensas', opcoes, aposChefe: !!i.chefe })
    return {
      ...e, semente, fase: 'recompensa', recompensas: opcoes,
      derrotados: e.derrotados + 1, chefesDerrotados: e.chefesDerrotados + Number(!!i.chefe), venceu: e.venceu || !!i.chefe,
    }
  }

  function sortearRecompensas(e: Partida, aposChefe: boolean): [Recompensa[], number] {
    const reliquiasLivres = RELIQUIAS.filter((r) => !e.reliquias.includes(r) && (aposChefe || !RECOMPENSAS[r].rara))
    let lista: Recompensa[]
    let s = e.semente
    // Depois do chefe: duas relíquias (as raras entram) e um poder. Antes: dois poderes e uma relíquia comum.
    // Imortal e poção não empilham: não oferecer o que já está equipado e não somaria nada.
    const poderesLivres = PODERES.filter((x) => !((x === 'imortal' || x === 'pocao') && e.encaixes.some((enc) => enc.tipo === x)))
    const [poderes, s1] = embaralhar<Recompensa>(poderesLivres, s)
    const [reliquias, s2] = embaralhar<Recompensa>(reliquiasLivres, s1)
    s = s2
    lista = aposChefe ? [...reliquias.slice(0, 2), ...poderes] : [...poderes.slice(0, 2), ...reliquias.slice(0, 1), ...poderes.slice(2)]
    lista = [...new Set(lista)].slice(0, 3)
    return [lista, s]
  }

  /** Escolhe a recompensa e chama o próximo adversário. */
  function escolher(p: Partida, recompensa: Recompensa): Resultado {
    if (p.fase !== 'recompensa' || !p.recompensas.includes(recompensa)) return nada(p)
    const eventos: Evento[] = []
    let e: Partida = { ...p, recompensas: [] }
    if (ehPoder(recompensa)) {
      const [encaixes, substituiu] = equipar(e.encaixes, recompensa)
      // Se a poção saiu do encaixe, o desafio dela acaba junto.
      e = { ...e, encaixes, pocao: recompensa === 'pocao' ? 3 : substituiu === 'pocao' ? 0 : e.pocao }
      eventos.push({ tipo: 'equipou', recompensa, substituiu })
    } else {
      e = { ...e, reliquias: [...e.reliquias, recompensa] }
      eventos.push({ tipo: 'equipou', recompensa, substituiu: null })
    }
    const andar = e.andar + 1
    const antes = inimigoAtual(e).cenario
    e = { ...e, andar, inimigo: prepararInimigo(andar), sequencia: e.sequencia }
    const { inimigo, ciclo } = inimigoDoAndar(andar)
    if (e.reliquias.includes('lupa')) e = { ...e, encaixes: equipar(e.encaixes, 'pista')[0] }
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

  return { novaPartida, responder, encerrar, usarPista, escolher, seguir, intencao, atributos, inimigoAtual, carta }
}

export type Motor = ReturnType<typeof criarMotor>

const semPocao = (encaixes: Encaixe[]) => encaixes.filter((x) => x.tipo !== 'pocao')

function gastar(encaixes: Encaixe[], k: number): Encaixe[] {
  return encaixes.flatMap((x, i) => (i !== k ? [x] : x.carga > 1 ? [{ ...x, carga: x.carga - 1 }] : []))
}

/** Mesmo poder empilha no mesmo encaixe; com os 3 cheios, o novo toma o lugar do mais antigo. */
export function equipar(encaixes: Encaixe[], tipo: TipoPoder): [Encaixe[], TipoPoder | null] {
  const k = encaixes.findIndex((x) => x.tipo === tipo)
  if (k >= 0) {
    // Imortal e poção não empilham: a regra deles é "uma vez".
    if (tipo === 'imortal' || tipo === 'pocao') return [encaixes, null]
    return [encaixes.map((x, i) => (i === k ? { ...x, carga: Math.min(x.carga + 1, 3) } : x)), null]
  }
  if (encaixes.length < ENCAIXES) return [[...encaixes, { tipo, carga: 1 }], null]
  return [[...encaixes.slice(1), { tipo, carga: 1 }], encaixes[0].tipo]
}

export const cenarioDo = (andar: number): Cenario => inimigoDoAndar(andar).inimigo.cenario
