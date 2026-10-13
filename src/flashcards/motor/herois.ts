/**
 * Heróis jogáveis. Hoje só o Cavaleiro está liberado; os outros ficam
 * descritos aqui (estilo, atributos e equipamento inicial) para a seleção
 * futura. A partida guarda o id do herói; o motor aplica o kit na partida nova
 * (regras.ts, `novaPartida`). Nenhum herói muda o conteúdo médico: só o jogo.
 */
import type { TipoPoder, TipoReliquia } from './poderes'

export interface Heroi {
  id: string
  nome: string
  titulo: string
  /** Estilo de jogo em uma frase. */
  estilo: string
  /** Vida a mais ou a menos que os 100 do Cavaleiro. */
  vida: number
  /** Dano a mais em cada acerto. */
  ataque: number
  /** Poderes e relíquias com que começa. */
  poderes: Array<{ tipo: TipoPoder; cargas: number }>
  reliquias: TipoReliquia[]
  /** Sprite (por enquanto todos usam o do Cavaleiro com outra paleta). */
  sprite: 'heroi'
  cor: string
  icone: string
  liberado: boolean
}

export const HEROIS: Heroi[] = [
  { id: 'cavaleiro', nome: 'Cavaleiro do Torneio', titulo: 'Equilíbrio', estilo: 'Escudo e espada: o herói de todos os dias.', vida: 0, ataque: 0, poderes: [], reliquias: [], sprite: 'heroi', cor: '#5fa8ff', icone: 'escudo', liberado: true },
  { id: 'cavaleira-coluna', nome: 'Cavaleira da Coluna', titulo: 'Tanque', estilo: 'Muita vida e defesa; bate devagar.', vida: 25, ataque: -2, poderes: [{ tipo: 'barreira', cargas: 2 }], reliquias: ['gesso'], sprite: 'heroi', cor: '#b9c6d8', icone: 'muralha', liberado: false },
  { id: 'arqueiro-carpo', nome: 'Arqueiro do Carpo', titulo: 'Crítico', estilo: 'Menos vida, críticos frequentes.', vida: -15, ataque: 2, poderes: [], reliquias: ['olhoaguia'], sprite: 'heroi', cor: '#7fe08f', icone: 'alvo', liberado: false },
  { id: 'maga-anatomia', nome: 'Maga da Anatomia', titulo: 'Raios', estilo: 'Raios extras e pistas; frágil no corpo a corpo.', vida: -10, ataque: 0, poderes: [{ tipo: 'pista', cargas: 2 }], reliquias: ['cadeia'], sprite: 'heroi', cor: '#c8a0ff', icone: 'raio', liberado: false },
  { id: 'monge-joelho', nome: 'Monge do Joelho', titulo: 'Sequência', estilo: 'Cresce a cada acerto seguido.', vida: 0, ataque: 0, poderes: [], reliquias: ['residente'], sprite: 'heroi', cor: '#ffcf8a', icone: 'chama', liberado: false },
  { id: 'sentinela-trauma', nome: 'Sentinela do Trauma', titulo: 'Retaliação', estilo: 'Devolve parte de cada golpe.', vida: 10, ataque: 0, poderes: [], reliquias: ['contra'], sprite: 'heroi', cor: '#ff8a6a', icone: 'espadas', liberado: false },
  { id: 'sacerdotisa-pediatria', nome: 'Sacerdotisa da Pediatria', titulo: 'Cura', estilo: 'Recupera vida a cada acerto.', vida: 5, ataque: -1, poderes: [{ tipo: 'vital', cargas: 1 }], reliquias: ['seiva'], sprite: 'heroi', cor: '#ff9ac0', icone: 'folha', liberado: false },
  { id: 'alquimista-biomecanica', nome: 'Alquimista da Biomecânica', titulo: 'Brasas', estilo: 'Queimaduras que se acumulam.', vida: -5, ataque: 0, poderes: [{ tipo: 'devastador', cargas: 1 }], reliquias: ['brasa'], sprite: 'heroi', cor: '#ff9a3c', icone: 'frasco', liberado: false },
]

export const heroiPorId = (id?: string) => HEROIS.find((h) => h.id === id) ?? HEROIS[0]
