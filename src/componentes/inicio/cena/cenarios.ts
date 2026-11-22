import type { IdLinhaGato } from '../../mascote/sprites'
import type { IdComportamento } from '../../mascote/comportamentos'
import { MODO_NATAL } from '../../../natal/modoNatal'

/**
 * Os cenários do topo da página inicial (01/11/2026, pedido do Tales: "um cenário diferente para ficar trocando",
 * cada um 2 horas, sem repetir até passarem todos). A maioria segue o mesmo esqueleto de composição, para o fogo e o mascote não mudarem de
 * lugar: o fogo animado na caixa x 220-260, y 104-152 da arte (480 x 200), o esqueleto em pé em x 262-308 com os pés
 * em y 163, o lado esquerdo calmo para o texto. Cada cenário diz onde o gato passeia e onde a coruja pousa (sempre em
 * algo firme). As artes saem dos scripts de scripts/ (gerar_cena_inicio.py e scripts/cenarios/inicio_*.py).
 */
export type PoseGato = 'repouso' | Extract<IdLinhaGato, 'sentado' | 'observando' | 'fogueira'>
export type Particulas = 'vagalumes' | 'faiscas' | 'neve' | 'estrelas'
export type Cenario = {
  id: 'acampamento' | 'forja' | 'cais' | 'observatorio' | 'neve' | 'abrigo' | 'praca' | 'vale' | 'sala_natal'
  /** Prefixo dos arquivos em public/pixel/inicio/: `${arquivo}-${periodo}[-960].webp`. */
  arquivo: string
  /** Cantos do chão por onde o gato passeia: canto de cima à esquerda da caixa do gato (36 x 22 px da arte). */
  gato: readonly { x: number; y: number; pose: PoseGato }[]
  /** Onde a coruja pousa: o ponto dos pés (33 x 24 px da arte). */
  coruja: readonly { x: number; y: number }[]
  particulas: Particulas
  /**
   * A espada fincada na fogueira, "estilo Dark Souls": a marca do site, em todos os cenários (Tales, 01/11/2026); antes só
   * no acampamento. A espada acompanha a âncora `fogo`; quando ausente, usa a caixa original do acampamento. `false` só se um cenário futuro não tiver fogueira.
   */
  espada?: boolean
  /** Centro da base da fogueira e caixa do mascote, em pixels da pintura 480x200. */
  fogo?: readonly [number, number]
  mascote?: { x: number; y: number; w: number; h: number }
  posePadrao?: 'fogueira'
  /** Onde o dragão pousa quando visita a cena (o ponto dos pés, em pixels da pintura); só os cenários que deixam esse chão livre. */
  dragao?: { x: number; y: number }
  /**
   * A época em que o cenário entra no rodízio ([mês, dia] de começo e de fim, no horário de Brasília; pode virar o ano).
   * Sem época, ele fica o ano todo. O de Natal vai de novembro ao Dia de Reis.
   */
  epoca?: { de: readonly [number, number]; ate: readonly [number, number] }
  /**
   * O sistema de neve (clima.ts, 12/11/2026): o cenário que aceita neve recebe a nevasca animada quando o tempo vira, e,
   * se tiver `arquivo`, troca devagar a pintura pela versão nevada (`${arquivo}-${periodo}[-960].webp`).
   */
  neve?: { arquivo?: string }
  /**
   * Cenário de Natal (vale, sala do chalé): some do rodízio quando a chave geral do modo Natal está desligada.
   * Cenário de inverno (neve, praça, vale, sala do chalé): marca para as versões de Natal dos cenários (etapa 3).
   */
  natal?: true
  inverno?: true
  /** A versão de Natal da pintura (etapa 3 do modo Natal): prefixo dos arquivos, no lugar de `arquivo` quando o modo está no ar. */
  pinturaNatal?: string
  /** As atividades do esqueleto neste cenário (no lugar do sorteio de sempre): ex. sentado no banco, no vale de Natal. */
  repertorio?: readonly IdComportamento[]
  /** O trenzinho de montanha que atravessa o fundo do vale (pontos de começo e de fim, em pixels da pintura). */
  trem?: { de: readonly [number, number]; ate: readonly [number, number] }
}

export const CENARIOS: readonly Cenario[] = [
  {
    id: 'acampamento', arquivo: 'cena', particulas: 'vagalumes', pinturaNatal: 'cena-natal',
    gato: [
      { x: 219, y: 150, pose: 'repouso' }, { x: 176, y: 166, pose: 'sentado' }, { x: 256, y: 170, pose: 'observando' },
      { x: 300, y: 165, pose: 'fogueira' }, { x: 322, y: 150, pose: 'sentado' }, { x: 236, y: 168, pose: 'repouso' },
    ],
    // Sempre em algo firme (no alto ela parecia flutuar): a pilha de livros, o caixote ao lado do lampião e a grama.
    coruja: [{ x: 318, y: 137 }, { x: 212, y: 156 }, { x: 346, y: 170 }, { x: 166, y: 176 }, { x: 282, y: 184 }],
  },
  {
    id: 'forja', arquivo: 'cena-forja', particulas: 'faiscas', pinturaNatal: 'cena-forja-natal',
    gato: [{ x: 204, y: 154, pose: 'fogueira' }, { x: 166, y: 166, pose: 'repouso' }, { x: 232, y: 172, pose: 'sentado' }, { x: 274, y: 166, pose: 'observando' }, { x: 316, y: 172, pose: 'repouso' }, { x: 190, y: 178, pose: 'sentado' }],
    coruja: [{ x: 172, y: 140 }, { x: 326, y: 139 }, { x: 360, y: 132 }, { x: 208, y: 184 }, { x: 300, y: 192 }],
  },
  {
    id: 'observatorio', arquivo: 'cena-observatorio', particulas: 'estrelas', pinturaNatal: 'cena-observatorio-natal',
    gato: [{ x: 222, y: 162, pose: 'fogueira' }, { x: 154, y: 170, pose: 'repouso' }, { x: 264, y: 168, pose: 'sentado' }, { x: 310, y: 152, pose: 'observando' }, { x: 190, y: 176, pose: 'sentado' }, { x: 296, y: 176, pose: 'repouso' }],
    coruja: [{ x: 176, y: 104 }, { x: 200, y: 104 }, { x: 201, y: 155 }, { x: 346, y: 176 }, { x: 322, y: 198 }],
  },
  {
    id: 'cais', arquivo: 'cena-cais', particulas: 'vagalumes', pinturaNatal: 'cena-cais-natal',
    gato: [{ x: 222, y: 153, pose: 'fogueira' }, { x: 176, y: 148, pose: 'repouso' }, { x: 318, y: 122, pose: 'sentado' }, { x: 330, y: 92, pose: 'observando' }, { x: 262, y: 168, pose: 'repouso' }, { x: 290, y: 172, pose: 'sentado' }],
    coruja: [{ x: 320, y: 95 }, { x: 358, y: 96 }, { x: 342, y: 160 }, { x: 186, y: 135 }, { x: 177, y: 111 }],
  },
  {
    id: 'neve', arquivo: 'cena-neve', particulas: 'neve', neve: {}, inverno: true, pinturaNatal: 'cena-neve-natal',
    gato: [{ x: 222, y: 153, pose: 'fogueira' }, { x: 168, y: 170, pose: 'repouso' }, { x: 263, y: 167, pose: 'sentado' }, { x: 301, y: 176, pose: 'observando' }, { x: 226, y: 177, pose: 'repouso' }],
    coruja: [{ x: 201, y: 134 }, { x: 164, y: 154 }, { x: 356, y: 165 }, { x: 147, y: 104 }, { x: 191, y: 104 }],
  },
  {
    id: 'abrigo', arquivo: 'cena-abrigo', particulas: 'faiscas', pinturaNatal: 'cena-abrigo-natal',
    fogo: [274, 151], mascote: { x: 293, y: 103, w: 42, h: 60 }, posePadrao: 'fogueira',
    gato: [{ x: 222, y: 149, pose: 'fogueira' }, { x: 285, y: 170, pose: 'sentado' }, { x: 342, y: 169, pose: 'repouso' }],
    coruja: [{ x: 370, y: 101 }, { x: 207, y: 98 }, { x: 348, y: 132 }],
  },
  {
    // A Praça do Pinheiro (10/11/2026, scripts/cenarios/inicio_praca.py): a praça de pedra da vila, com um toque de Natal.
    id: 'praca', arquivo: 'cena-praca', particulas: 'vagalumes', inverno: true, pinturaNatal: 'cena-praca-natal',
    gato: [{ x: 222, y: 153, pose: 'fogueira' }, { x: 174, y: 139, pose: 'sentado' }, { x: 262, y: 170, pose: 'repouso' }, { x: 330, y: 164, pose: 'observando' }, { x: 204, y: 174, pose: 'repouso' }],
    // O telhadinho do poço, o encosto do banco, o caixote, o presente e a pilha de lenha.
    coruja: [{ x: 166, y: 102 }, { x: 198, y: 150 }, { x: 213, y: 114 }, { x: 396, y: 150 }, { x: 308, y: 162 }],
    dragao: { x: 392, y: 174 },
  },
  {
    // Natal no Vale (12/11/2026, scripts/cenarios/inicio_vale.py): o terraço de um chalé suíço no alto do vale, com a
    // cachoeira, a prefeitura com a torre do relógio lá embaixo e o trem de montanha. Só na época do Natal; o esqueleto fica sentado no banco.
    id: 'vale', arquivo: 'cena-vale', particulas: 'neve', natal: true, inverno: true,
    epoca: { de: [11, 10], ate: [1, 6] },
    neve: { arquivo: 'cena-vale-nevado' },
    repertorio: ['natal_chocolate', 'natal_tricotar', 'natal_castanhas', 'natal_cantar', 'natal_cochilo'],
    trem: { de: [150, 104], ate: [372, 97] },
    // O cesto com a almofada xadrez, os presentes do trenó, a neve olhando o vale e a sacada do chalé.
    gato: [{ x: 222, y: 153, pose: 'fogueira' }, { x: 190, y: 148, pose: 'repouso' }, { x: 332, y: 150, pose: 'sentado' }, { x: 300, y: 162, pose: 'observando' }, { x: 416, y: 104, pose: 'repouso' }],
    // Os moirões do guarda-corpo, o braço do poste do lampião, a lenha e a sacada.
    coruja: [{ x: 171, y: 114 }, { x: 316, y: 119 }, { x: 387, y: 134 }, { x: 147, y: 115 }, { x: 440, y: 112 }],
  },
  {
    // O interior do mesmo chalé: a vila do vale continua visível pela janela.
    id: 'sala_natal', arquivo: 'cena-sala-natal', particulas: 'faiscas', natal: true, inverno: true,
    epoca: { de: [11, 10], ate: [1, 6] },
    fogo: [298, 146], mascote: { x: 333, y: 100, w: 46, h: 67 },
    repertorio: ['natal_chocolate', 'natal_tricotar', 'natal_castanhas', 'natal_cantar', 'natal_cochilo'],
    gato: [{ x: 378, y: 149, pose: 'repouso' }, { x: 361, y: 169, pose: 'sentado' }, { x: 426, y: 169, pose: 'observando' }],
    coruja: [{ x: 372, y: 78 }, { x: 244, y: 124 }, { x: 342, y: 77 }],
  },
]

/** O relógio de Brasília para todos, sem depender do fuso do aparelho. */
const relogio = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  second: '2-digit', hourCycle: 'h23',
})
/** O dia (aaaa-mm-dd) e quantos milissegundos dele já passaram, em Brasília; `inicio` é o instante da meia-noite. */
export function horaDeBrasilia(agora = new Date()) {
  const p = Object.fromEntries(relogio.formatToParts(agora).map(v => [v.type, v.value]))
  const dia = `${p.year}-${p.month}-${p.day}`
  const local = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
  const offset = local - Math.floor(agora.getTime() / 1000) * 1000
  const decorrido = agora.getTime() + offset - Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))
  return { dia, mes: Number(p.month), diaDoMes: Number(p.day), decorrido, inicio: agora.getTime() - decorrido }
}

/** O cenário está na época dele hoje? (sem época: sempre) */
export function naEpoca(c: Cenario, mes: number, dia: number): boolean {
  if (!c.epoca) return true
  const v = mes * 100 + dia, de = c.epoca.de[0] * 100 + c.epoca.de[1], ate = c.epoca.ate[0] * 100 + c.epoca.ate[1]
  return de <= ate ? v >= de && v <= ate : v >= de || v <= ate
}

/** Os cenários do rodízio de hoje (os sem época e os que estão na época deles). */
export function cenariosDoDia(agora = new Date(), lista: readonly Cenario[] = CENARIOS): Cenario[] {
  const { mes, diaDoMes } = horaDeBrasilia(agora)
  // Chave geral do modo Natal desligada: os cenários de Natal saem do rodízio, mesmo na época deles.
  const base = MODO_NATAL.ligado ? lista : lista.filter((c) => !c.natal)
  const hoje = base.filter((c) => naEpoca(c, mes, diaDoMes))
  return hoje.length ? hoje : [...base]
}

/** Cada cenário fica 2 horas no topo (Tales, 12/11/2026: "a cada 2 horas um diferente, sem repetir até irem todos"). */
export const FAIXA_MS = 2 * 3_600_000
/** O marco das faixas: 1º/1/2026 à meia-noite de Brasília (UTC-3, sem horário de verão), então as viradas caem nas horas pares. */
const MARCO = Date.UTC(2026, 0, 1, 3)

/** A faixa de 2 horas em que estamos (contada desde o marco), quando ela começou e quando vira. Igual para todos. */
export function faixaDoCenario(agora = new Date()) {
  const faixa = Math.floor((agora.getTime() - MARCO) / FAIXA_MS)
  return { faixa, inicio: MARCO + faixa * FAIXA_MS, proxima: MARCO + (faixa + 1) * FAIXA_MS }
}

function embaralhar(chave: string, lista: readonly Cenario[]): Cenario[] {
  let seed = 2166136261
  for (const ch of chave) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0
  const aleatorio = () => {
    seed = (seed + 0x6D2B79F5) >>> 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const ordem = [...lista]
  for (let i = ordem.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[ordem[i], ordem[j]] = [ordem[j], ordem[i]]
  }
  return ordem
}

/**
 * A ordem de um ciclo: cada cenário do rodízio aparece uma vez, numa ordem sorteada com semente (a mesma para todos,
 * sem servidor). O primeiro de um ciclo nunca é o último do ciclo anterior, então nada repete na emenda.
 */
export function ordemDoCiclo(ciclo: number, lista: readonly Cenario[] = CENARIOS): Cenario[] {
  const chave = (c: number) => `inicio:v2:${c}:${lista.map((x) => x.id).join(',')}`
  const ordem = embaralhar(chave(ciclo), lista)
  if (ordem.length > 2) {
    const antes = embaralhar(chave(ciclo - 1), lista)
    const ultimoAntes = antes[antes.length - 1]
    if (ordem[0].id === ultimoAntes?.id) [ordem[0], ordem[1]] = [ordem[1], ordem[0]]
  }
  return ordem
}

/** Mesmo cenário para todo mundo até a próxima faixa de 2 horas. Prévia explícita por ?cenario=vale; não grava preferência. */
export function cenarioDaHora(agora: Date = new Date(), lista: readonly Cenario[] = CENARIOS): Cenario {
  if (!lista.length) throw new Error('É necessário ao menos um cenário')
  let forcado = ''
  try {
    forcado = new URLSearchParams(location.search).get('cenario')
      ?? new URLSearchParams(location.hash.split('?')[1] ?? '').get('cenario') ?? ''
  } catch { /* sem janela */ }
  const pedido = lista.find(c => c.id === forcado)
  if (pedido) return pedido
  // Faixas de 2 horas em ciclos: num ciclo de n faixas passam os n cenários do rodízio, cada um uma vez.
  const { faixa, inicio } = faixaDoCenario(agora)
  const hoje = cenariosDoDia(new Date(inicio), lista)
  const n = hoje.length
  return ordemDoCiclo(Math.floor(faixa / n), hoje)[((faixa % n) + n) % n]
}
