import type { IdLinhaGato } from '../../mascote/sprites'

/**
 * Os cenários do topo da página inicial (01/11/2026, pedido do Tales: "um cenário diferente para ficar trocando",
 * cada um tantas horas por dia). A maioria segue o mesmo esqueleto de composição, para o fogo e o mascote não mudarem de
 * lugar: o fogo animado na caixa x 220-260, y 104-152 da arte (480 x 200), o esqueleto em pé em x 262-308 com os pés
 * em y 163, o lado esquerdo calmo para o texto. Cada cenário diz onde o gato passeia e onde a coruja pousa (sempre em
 * algo firme). As artes saem dos scripts de scripts/ (gerar_cena_inicio.py e scripts/cenarios/inicio_*.py).
 */
export type PoseGato = 'repouso' | Extract<IdLinhaGato, 'sentado' | 'observando' | 'fogueira'>
export type Particulas = 'vagalumes' | 'faiscas' | 'neve' | 'estrelas'
export type Cenario = {
  id: 'acampamento' | 'forja' | 'cais' | 'observatorio' | 'neve' | 'abrigo' | 'praca'
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
}

export const CENARIOS: readonly Cenario[] = [
  {
    id: 'acampamento', arquivo: 'cena', particulas: 'vagalumes',
    gato: [
      { x: 219, y: 150, pose: 'repouso' }, { x: 176, y: 166, pose: 'sentado' }, { x: 256, y: 170, pose: 'observando' },
      { x: 300, y: 165, pose: 'fogueira' }, { x: 322, y: 150, pose: 'sentado' }, { x: 236, y: 168, pose: 'repouso' },
    ],
    // Sempre em algo firme (no alto ela parecia flutuar): a pilha de livros, o caixote ao lado do lampião e a grama.
    coruja: [{ x: 318, y: 137 }, { x: 212, y: 156 }, { x: 346, y: 170 }, { x: 166, y: 176 }, { x: 282, y: 184 }],
  },
  {
    id: 'forja', arquivo: 'cena-forja', particulas: 'faiscas',
    gato: [{ x: 204, y: 154, pose: 'fogueira' }, { x: 166, y: 166, pose: 'repouso' }, { x: 232, y: 172, pose: 'sentado' }, { x: 274, y: 166, pose: 'observando' }, { x: 316, y: 172, pose: 'repouso' }, { x: 190, y: 178, pose: 'sentado' }],
    coruja: [{ x: 172, y: 140 }, { x: 326, y: 139 }, { x: 360, y: 132 }, { x: 208, y: 184 }, { x: 300, y: 192 }],
  },
  {
    id: 'observatorio', arquivo: 'cena-observatorio', particulas: 'estrelas',
    gato: [{ x: 222, y: 162, pose: 'fogueira' }, { x: 154, y: 170, pose: 'repouso' }, { x: 264, y: 168, pose: 'sentado' }, { x: 310, y: 152, pose: 'observando' }, { x: 190, y: 176, pose: 'sentado' }, { x: 296, y: 176, pose: 'repouso' }],
    coruja: [{ x: 176, y: 104 }, { x: 200, y: 104 }, { x: 201, y: 155 }, { x: 346, y: 176 }, { x: 322, y: 198 }],
  },
  {
    id: 'cais', arquivo: 'cena-cais', particulas: 'vagalumes',
    gato: [{ x: 222, y: 153, pose: 'fogueira' }, { x: 176, y: 148, pose: 'repouso' }, { x: 318, y: 122, pose: 'sentado' }, { x: 330, y: 92, pose: 'observando' }, { x: 262, y: 168, pose: 'repouso' }, { x: 290, y: 172, pose: 'sentado' }],
    coruja: [{ x: 320, y: 95 }, { x: 358, y: 96 }, { x: 342, y: 160 }, { x: 186, y: 135 }, { x: 177, y: 111 }],
  },
  {
    id: 'neve', arquivo: 'cena-neve', particulas: 'neve',
    gato: [{ x: 222, y: 153, pose: 'fogueira' }, { x: 168, y: 170, pose: 'repouso' }, { x: 263, y: 167, pose: 'sentado' }, { x: 301, y: 176, pose: 'observando' }, { x: 226, y: 177, pose: 'repouso' }],
    coruja: [{ x: 201, y: 134 }, { x: 164, y: 154 }, { x: 356, y: 165 }, { x: 147, y: 104 }, { x: 191, y: 104 }],
  },
  {
    id: 'abrigo', arquivo: 'cena-abrigo', particulas: 'faiscas',
    fogo: [274, 151], mascote: { x: 293, y: 103, w: 42, h: 60 }, posePadrao: 'fogueira',
    gato: [{ x: 222, y: 149, pose: 'fogueira' }, { x: 285, y: 170, pose: 'sentado' }, { x: 342, y: 169, pose: 'repouso' }],
    coruja: [{ x: 370, y: 101 }, { x: 207, y: 98 }, { x: 348, y: 132 }],
  },
  {
    // A Praça do Pinheiro (10/11/2026, scripts/cenarios/inicio_praca.py): a praça de pedra da vila, com um toque de Natal.
    id: 'praca', arquivo: 'cena-praca', particulas: 'vagalumes',
    gato: [{ x: 222, y: 153, pose: 'fogueira' }, { x: 174, y: 139, pose: 'sentado' }, { x: 262, y: 170, pose: 'repouso' }, { x: 330, y: 164, pose: 'observando' }, { x: 204, y: 174, pose: 'repouso' }],
    // O telhadinho do poço, o encosto do banco, o caixote, o presente e a pilha de lenha.
    coruja: [{ x: 166, y: 102 }, { x: 198, y: 150 }, { x: 213, y: 114 }, { x: 396, y: 150 }, { x: 308, y: 162 }],
    dragao: { x: 392, y: 174 },
  },
]

/** Faixas compartilhadas por todos, sempre em Brasília, sem depender do fuso do aparelho. */
export const HORAS_CENARIOS = [0, 4, 8, 12, 16, 20] as const
const relogio = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
})
export function faixaDoCenario(agora = new Date()) {
  const p = Object.fromEntries(relogio.formatToParts(agora).map(v => [v.type, v.value]))
  const dia = `${p.year}-${p.month}-${p.day}`
  const faixa = Math.floor(Number(p.hour) / 4)
  // O offset do próprio instante mantém a virada exata da faixa no horário de Brasília.
  const local = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour))
  const horaUtc = Math.floor(agora.getTime() / 3_600_000) * 3_600_000
  const offset = local - horaUtc
  const proxima = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), (faixa + 1) * 4) - offset
  return { dia, faixa, proxima }
}

/** Fisher–Yates com semente do dia. É um sorteio reproduzível, sem pedido ao servidor e sem sorte individual. */
export function ordemDoDia(dia: string, lista: readonly Cenario[] = CENARIOS): Cenario[] {
  let seed = 2166136261
  for (const ch of `inicio:v1:${dia}`) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0
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

/** Mesmo cenário para todo mundo até a próxima faixa. Prévia explícita por ?cenario=abrigo; não grava preferência. */
export function cenarioDaHora(agora: Date = new Date(), lista: readonly Cenario[] = CENARIOS): Cenario {
  if (!lista.length) throw new Error('É necessário ao menos um cenário')
  let forcado = ''
  try {
    forcado = new URLSearchParams(location.search).get('cenario')
      ?? new URLSearchParams(location.hash.split('?')[1] ?? '').get('cenario') ?? ''
  } catch { /* sem janela */ }
  const pedido = lista.find(c => c.id === forcado)
  if (pedido) return pedido
  const { dia, faixa } = faixaDoCenario(agora)
  return ordemDoDia(dia, lista)[faixa % lista.length]
}
