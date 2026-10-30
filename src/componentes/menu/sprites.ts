import type { Grade, Paleta } from '../../biblioteca/salao/sprites'

/**
 * Desenhos em pixel da seção "Hoje" do menu (30/10/2026): folha de prova, ampulheta e estante.
 * Mesma técnica do salão: grade de letras → box-shadow (componente Sprite). Uma paleta para todos.
 * O teste fixtures/testar_salao_biblioteca.mjs confere as larguras e as letras.
 */
export const PALETA_MENU: Paleta = {
  k: '#1b1208', w: '#f6efe0', y: '#f3c64a', Y: '#ffe08a', o: '#e0892a', r: '#c0392b', g: '#2f9e7a',
  b: '#2b6cb0', m: '#8a5530', M: '#5b3519', l: '#ad6f3e', p: '#8e44ad', c: '#9fe3d4', t: '#0b2b27', a: '#b5b9c2',
}
export const FOLHA: Grade = [
  '..kkkkkkkkkkk...', '..kwwwwwwwwwk...', '..kwkkkkkkwwk...', '..kwwwwwwwwwk...', '..kwrwkkkkwwk...', '..kwwwwwwwwwk...',
  '..kwgwkkkkkwk...', '..kwwwwwwwwwk...', '..kwrwkkkwwwk.k.', '..kwwwwwwwwwkkyk', '..kwwwwwwwwkkyk.', '..kwwwwwwwkkyk..',
  '..kwwwwwwkkyk...', '..kwwwwwkoyk....', '..kkkkkkkkk.....',
]
export const AMPULHETA: Grade = [
  '...kkkkkkkkkk...', '...kmmmmmmmmk...', '....kwwwwwwk....', '....kyyyyyyk....', '.....kyyyyk.....', '......kyyk......', '.......kk.......',
  '.......kk.......', '......kwyk......', '.....kwwywk.....', '....kwwyyywk....', '....kyyyyyyk....', '...kmmmmmmmmk...', '...kkkkkkkkkk...',
]
export const ESTANTE: Grade = [
  '..kkkkkkkkkkkk..', '..kmmmmmmmmmmk..', '..kmMMbbMMyymk..', '..kmrrbbggyymk..', '..kmrrbbggyymk..', '..kmrrbbggyymk..', '..kmmmmmmmmmmk..',
  '..kmppMMMMbbmk..', '..kmppggMrbbmk..', '..kmppggrrbbmk..', '..kmppggrrbbmk..', '..kmmmmmmmmmmk..', '..kkkkkkkkkkkk..', '..kk........kk..',
]

/** Todos os desenhos, para o teste conferir as grades. */
export const OBJETOS_MENU: Record<string, Grade> = { FOLHA, AMPULHETA, ESTANTE }
