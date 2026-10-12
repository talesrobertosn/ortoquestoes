/**
 * Adversários da Batalha. A regra geral (docs/flashcards/BATALHA.md):
 * é mais fácil morrer do que matar. Você causa 10, 20 ou 30 de dano por acerto
 * (fácil, moderada, difícil); o adversário multiplica o dano-base do erro
 * (2, 5 e 10, a tabela aprovada pelo Tales) pela própria força.
 */

export type Cenario = 'campo' | 'masmorra' | 'salao'

export interface FaseChefe {
  /** Entra quando a vida do chefe cai a esta fração da vida máxima. */
  abaixoDe: number
  nome: string
  forca: number
  armadura: number
}

export interface Inimigo {
  id: string
  nome: string
  sprite: 'golem' | 'serpente' | 'guardiao'
  cenario: Cenario
  vida: number
  /** Multiplica o dano-base do erro. */
  forca: number
  /** Desconta de cada acerto (mínimo de 5 de dano). */
  armadura: number
  /** Rodadas contra ele antes da Fúria (dano ×1,5). */
  paciencia: number
  /** Dano extra por erro consecutivo (o veneno da serpente, a pressão do chefe). */
  porErroSeguido: number
  chefe?: boolean
  fase2?: FaseChefe
  /** Dificuldade mínima dos flashcards que ele joga. */
  dificuldadeMinima: 1 | 2 | 3
  /** Frase curta que aparece na apresentação. */
  lema: string
  /** O que ele faz de diferente, em linguagem de jogo. */
  habilidade: string
}

export const BESTIARIO: Inimigo[] = [
  {
    id: 'golem-de-gesso', nome: 'Golem de Gesso', sprite: 'golem', cenario: 'campo',
    vida: 80, forca: 3, armadura: 0, paciencia: 10, porErroSeguido: 0, dificuldadeMinima: 1,
    lema: 'Lento, duro e cheio de gesso.',
    habilidade: 'Bate pouco, mas aguenta muito.',
  },
  {
    id: 'serpente-do-ciatico', nome: 'Serpente do Ciático', sprite: 'serpente', cenario: 'masmorra',
    vida: 100, forca: 3.5, armadura: 0, paciencia: 10, porErroSeguido: 3, dificuldadeMinima: 1,
    lema: 'Ela espera o primeiro erro.',
    habilidade: 'Veneno: cada erro seguido causa +3 de dano.',
  },
  {
    id: 'guardiao-do-acetabulo', nome: 'Guardião do Acetábulo', sprite: 'guardiao', cenario: 'salao',
    vida: 190, forca: 4, armadura: 5, paciencia: 14, porErroSeguido: 2, dificuldadeMinima: 2, chefe: true,
    fase2: { abaixoDe: 0.5, nome: 'Teto rachado', forca: 5, armadura: 0 },
    lema: 'Ninguém passa do teto sem conhecer as colunas.',
    habilidade: 'Armadura 5. Com metade da vida, perde a armadura e bate mais forte.',
  },
]

/** O ciclo seguinte repete a masmorra com adversários 25% mais fortes. */
export function inimigoDoAndar(andar: number): { inimigo: Inimigo; ciclo: number } {
  const i = (andar - 1) % BESTIARIO.length
  const ciclo = Math.floor((andar - 1) / BESTIARIO.length)
  const base = BESTIARIO[i]
  if (ciclo === 0) return { inimigo: base, ciclo }
  const k = 1 + 0.25 * ciclo
  return {
    ciclo,
    inimigo: { ...base, vida: Math.round(base.vida * k), forca: +(base.forca * k).toFixed(2), fase2: base.fase2 && { ...base.fase2, forca: +(base.fase2.forca * k).toFixed(2) } },
  }
}
