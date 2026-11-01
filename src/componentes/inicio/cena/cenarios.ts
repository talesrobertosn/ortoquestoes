import type { IdLinhaGato } from '../../mascote/sprites'

/**
 * Os cenários do topo da página inicial (01/11/2026, pedido do Tales: "um cenário diferente para ficar trocando",
 * cada um tantas horas por dia). Todos seguem o mesmo esqueleto de composição, para o fogo e o mascote não mudarem de
 * lugar: o fogo animado na caixa x 220-260, y 104-152 da arte (480 x 200), o esqueleto em pé em x 262-308 com os pés
 * em y 163, o lado esquerdo calmo para o texto. Cada cenário diz onde o gato passeia e onde a coruja pousa (sempre em
 * algo firme). As artes saem dos scripts de scripts/ (gerar_cena_inicio.py e scripts/cenarios/inicio_*.py).
 */
export type PoseGato = 'repouso' | Extract<IdLinhaGato, 'sentado' | 'observando' | 'fogueira'>
export type Particulas = 'vagalumes' | 'faiscas' | 'neve' | 'estrelas'
export type Cenario = {
  id: 'acampamento' | 'forja' | 'cais' | 'observatorio' | 'neve'
  /** Prefixo dos arquivos em public/pixel/inicio/: `${arquivo}-${periodo}[-960].webp`. */
  arquivo: string
  /** Cantos do chão por onde o gato passeia: canto de cima à esquerda da caixa do gato (36 x 22 px da arte). */
  gato: readonly { x: number; y: number; pose: PoseGato }[]
  /** Onde a coruja pousa: o ponto dos pés (33 x 24 px da arte). */
  coruja: readonly { x: number; y: number }[]
  particulas: Particulas
  /** A espada fincada na fogueira (o easter egg do acampamento). */
  espada?: boolean
}

export const CENARIOS: readonly Cenario[] = [
  {
    id: 'acampamento', arquivo: 'cena', particulas: 'vagalumes', espada: true,
    gato: [
      { x: 219, y: 150, pose: 'repouso' }, { x: 176, y: 166, pose: 'sentado' }, { x: 256, y: 170, pose: 'observando' },
      { x: 300, y: 165, pose: 'fogueira' }, { x: 322, y: 150, pose: 'sentado' }, { x: 236, y: 168, pose: 'repouso' },
    ],
    // Sempre em algo firme (no alto ela parecia flutuar): a pilha de livros, o caixote ao lado do lampião e a grama.
    coruja: [{ x: 318, y: 137 }, { x: 212, y: 156 }, { x: 346, y: 170 }, { x: 166, y: 176 }, { x: 282, y: 184 }],
  },
]

/** Dias corridos desde 1/1/1970 no fuso de quem vê (para o rodízio andar um cenário por dia). */
const diaLocal = (d: Date) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)

/**
 * O cenário desta hora: o dia é dividido em fatias iguais, uma por cenário (2 cenários, 12 horas cada; 3, 8 horas;
 * 5, 4h48). A ordem anda um passo por dia, para cada cenário aparecer de manhã, de tarde e de noite em dias diferentes.
 * Para testar: ?cenario=forja na URL (ou sessionStorage 'inicio:cenario').
 */
export function cenarioDaHora(agora: Date = new Date(), lista: readonly Cenario[] = CENARIOS): Cenario {
  let forcado = ''
  try { forcado = new URLSearchParams(location.search).get('cenario') ?? sessionStorage.getItem('inicio:cenario') ?? '' } catch { /* sem janela */ }
  const pedido = lista.find((c) => c.id === forcado)
  if (pedido) return pedido
  const n = lista.length
  const minutos = agora.getHours() * 60 + agora.getMinutes()
  const fatia = Math.floor(minutos / (1440 / n))
  return lista[(fatia + diaLocal(agora)) % n]
}
