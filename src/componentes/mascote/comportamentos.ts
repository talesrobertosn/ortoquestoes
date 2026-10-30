/**
 * Os comportamentos do mascote (30/10/2026). Cada um é uma animação das articulações do esqueleto (Mascote.css) com
 * os objetos daquela cena (EsqueletoSvg.tsx). Os de Halloween só entram no sorteio em outubro (a fantasia do mês).
 */
export const COMPORTAMENTOS = [
  { id: 'acenar', nome: 'acenando', halloween: false },
  { id: 'dancar', nome: 'dançando', halloween: false },
  { id: 'ler', nome: 'lendo', halloween: false },
  { id: 'cafe', nome: 'tomando café', halloween: false },
  { id: 'dormir', nome: 'cochilando', halloween: false },
  { id: 'alongar', nome: 'se espreguiçando', halloween: false },
  { id: 'raiox', nome: 'olhando um raio X', halloween: false },
  { id: 'malabares', nome: 'fazendo malabares com ossos', halloween: false },
  { id: 'reflexo', nome: 'testando o próprio reflexo patelar', halloween: false },
  { id: 'comer', nome: 'comendo uma maçã', halloween: false },
  { id: 'marshmallow', nome: 'assando marshmallow', halloween: false },
  { id: 'foice', nome: 'passeando com a foice', halloween: true },
  { id: 'sorvete', nome: 'tomando sorvete', halloween: true },
  { id: 'doces', nome: 'brincando com os doces da abóbora', halloween: true },
] as const

export type IdComportamento = (typeof COMPORTAMENTOS)[number]['id']
export type Fantasia = 'nenhuma' | 'halloween'

/** A fantasia do mês: outubro é Halloween. */
export function fantasiaDoMes(d = new Date()): Fantasia {
  return d.getMonth() === 9 ? 'halloween' : 'nenhuma'
}
