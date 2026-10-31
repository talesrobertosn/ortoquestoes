import type { Grade, Paleta } from '../../biblioteca/salao/sprites'

/**
 * Objetos em pixel do menu: um por página (Tales escolheu em 31/10/2026 "objeto em pixel" para todos os ícones).
 * Mesma técnica do salão: grade de letras → box-shadow (componente Sprite). Uma paleta para todos.
 * O teste fixtures/testar_salao_biblioteca.mjs confere as larguras e as letras.
 */
export const PALETA_MENU: Paleta = {
  k: '#1b1208', w: '#f6efe0', y: '#f3c64a', Y: '#ffe08a', o: '#e0892a', r: '#c0392b', g: '#2f9e7a',
  b: '#2b6cb0', m: '#8a5530', M: '#5b3519', l: '#ad6f3e', p: '#8e44ad', c: '#9fe3d4', t: '#0b2b27', a: '#b5b9c2',
}
/** Cronograma da Mão: o mesmo calendário, com a capa azul. */
export const PALETA_MENU_AZUL: Paleta = { ...PALETA_MENU, r: '#2b6cb0' }

export const FOLHA: Grade = [
  '..kkkkkkkkkkk...', '..kwwwwwwwwwk...', '..kwkkkkkkwwk...', '..kwwwwwwwwwk...', '..kwrwkkkkwwk...', '..kwwwwwwwwwk...',
  '..kwgwkkkkkwk...', '..kwwwwwwwwwk...', '..kwrwkkkwwwk.k.', '..kwwwwwwwwwkkyk', '..kwwwwwwwwkkyk.', '..kwwwwwwwkkyk..',
  '..kwwwwwwkkyk...', '..kwwwwwkoyk....', '..kkkkkkkkk.....',
]
export const AMPULHETA: Grade = [
  '...kkkkkkkkkk...', '...kmmmmmmmmk...', '....kwwwwwwk....', '....kyyyyyyk....', '.....kyyyyk.....', '......kyyk......', '.......kk.......',
  '.......kk.......', '......kwyk......', '.....kwwywk.....', '....kwwyyywk....', '....kyyyyyyk....', '...kmmmmmmmmk...', '...kkkkkkkkkk...',
]
export const CARTAS: Grade = [
  '....kkkkkkkk....', '....kbbbbbbk....', '..kkkkkkkkkbk...', '..kwwwwwwwkbk...', '..kwwkkkwwkbk...', '..kwkwwwkwkbk...', '..kwwwwkwwkbk...',
  '..kwwwkwwwkbk...', '..kwwwkwwwkbk...', '..kwwwwwwwkbk...', '..kwwwkwwwkkk...', '..kwwwwwwwk.....', '..kkkkkkkkk.....',
]
export const CALENDARIO: Grade = [
  '...k.k....k.k...', '..kkkkkkkkkkkk..', '..krrrrrrrrrrk..', '..krrrrrrrrrrk..', '..kkkkkkkkkkkk..', '..kwwwwwwwwwwk..', '..kwkwkwkwkwwk..',
  '..kwwwwwwwwwwk..', '..kwkwkwgggwwk..', '..kwwwwwgggwwk..', '..kwkwkwkwkwwk..', '..kwwwwwwwwwwk..', '..kkkkkkkkkkkk..',
]
export const ESTANTE: Grade = [
  '..kkkkkkkkkkkk..', '..kmmmmmmmmmmk..', '..kmMMbbMMyymk..', '..kmrrbbggyymk..', '..kmrrbbggyymk..', '..kmrrbbggyymk..', '..kmmmmmmmmmmk..',
  '..kmppMMMMbbmk..', '..kmppggMrbbmk..', '..kmppggrrbbmk..', '..kmppggrrbbmk..', '..kmmmmmmmmmmk..', '..kkkkkkkkkkkk..', '..kk........kk..',
]
export const CAIXA_3D: Grade = [
  '...kkkkkkkkkk...', '..kllllllllllk..', '..kkkkkkkkkkkk..', '..kmmmmmmmmmmk..', '..kmkkkkkkkkmk..', '..kmkttttttkmk..', '..kmktcctcckmk..',
  '..kmkttttttkmk..', '..kmkkkkkkkkmk..', '..kmmmmmmmmmmk..', '..kMMMMMMMMMMk..', '..kkkkkkkkkkkk..',
]
export const INGRESSO: Grade = [
  '.kkkkkkkkkkkkkk.', '.kYYYYYYYkYYYYk.', 'kYYrrrrYYkYYYYYk', 'kYYYYYYYY.YYYYYk', 'kYYrrrYYYkYYoYYk', 'kYYYYYYYY.YYYYYk', '.kYYYYYYYkYYYYk.', '.kkkkkkkkkkkkkk.',
]
export const TROFEU: Grade = [
  '...kkkkkkkkkk...', '.kkkyyyyyyyykkk.', 'kykkyYYyyyyykkyk', 'kyk.kyYyyyyk.kyk', '.kyykyyyyyykyyk.', '..kkkyyyyyykkk..', '.....kyyyyk.....',
  '......kyyk......', '......kyyk......', '.....kyyyyk.....', '....kmmmmmmk....', '....kMMMMMMk....', '....kkkkkkkk....',
]
export const BAU: Grade = [
  '..kkkkkkkkkkkk..', '.kmmmmmmmmmmmmk.', '.kmllllllllllmk.', '.kkkkkkkkkkkkkk.', '.kmmmmmkkkmmmmk.', '.kmllllkykllllk.', '.kmllllkkkllllk.',
  '.kmllllllllllmk.', '.kmmmmmmmmmmmmk.', '.kkkkkkkkkkkkkk.',
]
export const BANDEIRA: Grade = [
  '..kk............', '..kMkkkkkkk.....', '..kMrrrrrrrk....', '..kMrrwwrrrrk...', '..kMrrwwrrrk....', '..kMrrrrrrk.....', '..kMkkkkkk......',
  '..kMk...........', '..kMk...........', '..kMk...........', '..kMk...........', '.kkkkk..........', '.kmmmk..........', '.kkkkk..........',
]
export const PODIO: Grade = [
  '......kkkk......', '......kyyk......', '......kyyk......', '..kkkkkyyk......', '..kaakkyyk......', '..kaakkyykkkkk..', '..kaakkyykkook..',
  '..kaakkyykkook..', '..kaakkyykkook..', '..kkkkkkkkkkkk..',
]
export const ESCUDO: Grade = [
  '..kkkkkkkkkkkk..', '..kbbbbbbbbbbk..', '..kbbbbyybbbbk..', '..kbbbyyyybbbk..', '..kbbbbyybbbbk..', '..kbbbbyybbbbk..', '...kbbbyybbbk...',
  '...kbbbbbbbbk...', '....kbbbbbbk....', '.....kbbbbk.....', '......kkkk......',
]

// Desenhados em 31/10/2026 para completar o menu: progresso, conta e ajuda.
export const GRAFICO: Grade = [
  '............kkk.', '............kgk.', '........kkk.kgk.', '........kbk.kgk.', '....kkk.kbk.kgk.', '....kyk.kbk.kgk.',
  '....kyk.kbk.kgk.', 'kkk.kyk.kbk.kgk.', 'krk.kyk.kbk.kgk.', 'krk.kyk.kbk.kgk.', 'kkkkkkkkkkkkkkkk',
]
export const CADERNO: Grade = [
  '.kkkkkkkkkkkkk..', '.kakwwwwwwwwwk..', '.kkkwwwwwwwwwk..', '.kakwrwwwwrwwk..', '.kkkwwrwwrwwwk..', '.kakwwwrrwwwwk..',
  '.kkkwwwrrwwwwk..', '.kakwwrwwrwwwk..', '.kkkwrwwwwrwwk..', '.kakwwwwwwwwwk..', '.kkkkkkkkkkkkk..',
]
export const ESTRELA: Grade = [
  '.......kk.......', '......kyyk......', '......kyyk......', '.kkkkkkyykkkkkk.', '.kyyyyyYyyyyyyk.', '..kyyyyYyyyyyk..',
  '...kyyyyyyyyk...', '....kyyyyyyk....', '....kyykkyyk....', '...kyyk..kyyk...', '...kyk....kyk...', '...kk......kk...',
]
export const ENVELOPE: Grade = [
  '.kkkkkkkkkkkkkk.', '.kwkwwwwwwwwkwk.', '.kwwkwwwwwwkwwk.', '.kwwwkwwwwkwwwk.', '.kwwwwkrrkwwwwk.', '.kwwwwwkkwwwwwk.',
  '.kwwwwwwwwwwwwk.', '.kwwwwwwwwwwwwk.', '.kkkkkkkkkkkkkk.',
]
export const PESSOA: Grade = [
  '......kkkk......', '.....kwwwwk.....', '....kwwwwwwk....', '....kwwwwwwk....', '....kwwwwwwk....', '.....kwwwwk.....',
  '......kkkk......', '....kkbbbbkk....', '...kbbbbbbbbk...', '..kbbbbbbbbbbk..', '..kbbbbbbbbbbk..', '..kkkkkkkkkkkk..',
]
export const MEDALHA: Grade = [
  '...kkk....kkk...', '...krrk..kbbk...', '....krrkkbbk....', '.....krrbbk.....', '......kkkk......', '.....kyyyyk.....',
  '....kyYYyyyk....', '....kyYyyyyk....', '....kyyyyyok....', '....kyyyyook....', '.....kyoook.....', '......kkkk......',
]
export const PRESENTE: Grade = [
  '....kk....kk....', '...krrk..krrk...', '....krrkkrrk....', '.kkkkkkkkkkkkkk.', '.kgggggrrgggggk.', '.kgggggrrgggggk.',
  '.kkkkkkkkkkkkkk.', '..kggggrrggggk..', '..kggggrrggggk..', '..kggggrrggggk..', '..kggggrrggggk..', '..kkkkkkkkkkkk..',
]
export const BALAO: Grade = [
  '..kkkkkkkkkkkk..', '.kwwwwwwwwwwwwk.', '.kwwwwkkkwwwwwk.', '.kwwwkwwwkwwwwk.', '.kwwwwwwkwwwwwk.', '.kwwwwwkwwwwwwk.',
  '.kwwwwwwwwwwwwk.', '.kwwwwwkwwwwwwk.', '..kkkkkkkkkkkk..', '...kwk..........', '...kk...........', '...k............',
]
export const PERGAMINHO: Grade = [
  '.kkkkkkkkkkkk...', 'kllkwwwwwwwwwk..', 'kllkwkkkkkkwwk..', '.kkkwwwwwwwwwk..', '...kwkkkkkwwwk..', '...kwwwwwwwwwk..',
  '...kwkkkkkkwwk..', '...kwwwwwwwwwk..', '...kwwwwwwwkkkk.', '...kwwwwwwkllk..', '...kkkkkkkkllk..', '..........kkk...',
]
export const CHAVE: Grade = [
  '..kkkk..........', '.kyyyyk.........', 'kyykkyyk........', 'kyk..kyk........', 'kyykkyykkkkkkkk.', '.kyyyyyyyyyyyyyk',
  '..kkkkkkkkkykyk.', '..........kykyk.', '...........k.k..',
]

/** Todos os objetos, para o teste conferir as grades. */
export const OBJETOS_MENU: Record<string, Grade> = {
  FOLHA, AMPULHETA, CARTAS, CALENDARIO, ESTANTE, CAIXA_3D, INGRESSO, TROFEU, BAU, BANDEIRA, PODIO, ESCUDO,
  GRAFICO, CADERNO, ESTRELA, ENVELOPE, PESSOA, MEDALHA, PRESENTE, BALAO, PERGAMINHO, CHAVE,
}
