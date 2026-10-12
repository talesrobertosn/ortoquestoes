/**
 * Poderes (ocupam os 3 encaixes e se gastam) e relíquias (duram a partida toda).
 * Depois de cada adversário, a pessoa escolhe 1 de 3 recompensas sorteadas.
 */

export type TipoPoder = 'escudo' | 'imortal' | 'pocao' | 'pista' | 'duplo'
export type TipoReliquia = 'bisturi' | 'gesso' | 'amuleto' | 'lupa'
export type Recompensa = TipoPoder | TipoReliquia

export interface Descricao {
  id: Recompensa
  nome: string
  texto: string
  /** Ícone em pixel art (sprites.ts). */
  icone: string
  /** Cor do brilho da carta de escolha. */
  cor: string
  tipo: 'poder' | 'reliquia'
  /** Só aparece depois de um chefe. */
  rara?: boolean
}

export const RECOMPENSAS: Record<Recompensa, Descricao> = {
  escudo: { id: 'escudo', nome: 'Escudo', texto: 'Bloqueia o próximo golpe que você levar.', icone: 'escudo', cor: '#5fa8ff', tipo: 'poder' },
  imortal: { id: 'imortal', nome: 'Imortal', texto: 'Uma vez, não cai: fica com 1 de vida.', icone: 'coroa', cor: '#ffcf5a', tipo: 'poder' },
  pocao: { id: 'pocao', nome: 'Poção do desafio', texto: 'Acerte os próximos 3 e ganhe +20 de vida. Um erro e ela se perde.', icone: 'pocao', cor: '#ff7a5c', tipo: 'poder' },
  pista: { id: 'pista', nome: 'Pergaminho da pista', texto: 'Use quando quiser: elimina uma alternativa errada. O acerto conta como assistido.', icone: 'pergaminho', cor: '#e8d28a', tipo: 'poder' },
  duplo: { id: 'duplo', nome: 'Golpe duplo', texto: 'O próximo acerto causa o dobro de dano.', icone: 'espada', cor: '#b07cff', tipo: 'poder' },
  bisturi: { id: 'bisturi', nome: 'Bisturi afiado', texto: 'Relíquia: +5 de dano nos acertos difíceis.', icone: 'bisturi', cor: '#9fe0ff', tipo: 'reliquia' },
  gesso: { id: 'gesso', nome: 'Tala reforçada', texto: 'Relíquia: todo golpe recebido perde 2 de dano.', icone: 'tala', cor: '#e6e0d0', tipo: 'reliquia' },
  amuleto: { id: 'amuleto', nome: 'Amuleto da incidência', texto: 'Relíquia: acertar um lendário cura +6, em vez de +3.', icone: 'amuleto', cor: '#ffcf5a', tipo: 'reliquia', rara: true },
  lupa: { id: 'lupa', nome: 'Lupa do preceptor', texto: 'Relíquia: no início de cada adversário, ganha 1 pergaminho da pista.', icone: 'lupa', cor: '#7fe08f', tipo: 'reliquia', rara: true },
}

export const PODERES: TipoPoder[] = ['escudo', 'imortal', 'pocao', 'pista', 'duplo']
export const RELIQUIAS: TipoReliquia[] = ['bisturi', 'gesso', 'amuleto', 'lupa']
export const ENCAIXES = 3

export const ehPoder = (r: Recompensa): r is TipoPoder => (PODERES as string[]).includes(r)
