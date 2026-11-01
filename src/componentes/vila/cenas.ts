import type { CenaVila } from './TopoVila'

/*
 * As cenas da vila que viram topo de página (TopoVila). Os pontos saem das próprias pinturas (pixels da arte de
 * 480 x 160): onde a coruja pousa, onde o gato fica no chão livre e onde a chama pintada respira.
 */

/** Revisão: a estufa da vila (scripts/gerar_cena_estufa.py). Regar no dia certo o que você plantou. */
export const CENA_ESTUFA: CenaVila = {
  arquivo: 'estufa',
  // A coruja no topo da viga treliçada (só vidro acima dela); o gato dorme nas lajotas entre as bancadas.
  coruja: { x: 418, y: 46 },
  gato: { x: 338, y: 125, estado: 'dormindo', acordado: 'acordado' },
  // A lanterna da viga e a vela da bancada da direita: acesas à tarde e à noite.
  chamas: [{ x: 286.5, y: 62.5, r: 12, horas: ['tarde', 'noite'] }, { x: 447.5, y: 86.5, r: 9, horas: ['tarde', 'noite'] }],
  particulas: [250, 40, 170, 90],
}

/** Caderno de erros: o campo de treino ao pé da muralha (scripts/gerar_cena_treino.py). O lugar da revanche. */
export const CENA_TREINO: CenaVila = {
  arquivo: 'treino',
  // A coruja na trave do suporte do alvo (céu e mata acima); o gato na terra batida entre o boneco e o alvo.
  coruja: { x: 406, y: 76 },
  gato: { x: 338, y: 125, estado: 'sentado', acordado: 'brincando' },
  // O braseiro, aceso à tarde e à noite. A tocha da muralha fica só pintada: no computador ela encosta no título.
  chamas: [{ x: 453, y: 89, r: 16, horas: ['tarde', 'noite'] }],
  particulas: [250, 70, 180, 80],
}

/** Dicas que a coruja dá a cada quatro toques, no lugar do conceito. */
export const DICAS_REVISAO = [
  'Errou na revisão? Ela volta hoje e o ciclo recomeça. Acertou com certeza, ela espaça bastante.',
  'Plantão amanhã? Marque o dia como folga em "Seu ritmo": a sequência de revisão não quebra.',
  'Muitas vencidas de uma vez? Escolha um teto por dia e o resto se distribui, começando pelas que você errou.',
]
export const DICAS_ERROS = [
  'Os erros marcados com certeza são os mais valiosos: era uma ideia errada, não um chute.',
  'Refez e acertou? A questão passa para "Já recuperei" e fica guardada como prova da revanche.',
  'O caderno imprime bonito: dá para levar os erros para o plantão no papel.',
]

/** Favoritas: o gabinete das relíquias do castelo (scripts/gerar_cena_gabinete.py). O que vale guardar para rever. */
export const CENA_GABINETE: CenaVila = {
  arquivo: 'gabinete',
  // A coruja na cornija do armário-vitrine; o gato lê no tapete, na mancha de sol da manhã.
  coruja: { x: 431, y: 41 },
  gato: { x: 338, y: 125, estado: 'lendo', acordado: 'sentado' },
  // O castiçal da prateleira e a luminária-estrela, acesos à noite. A lamparina das gavetas fica só pintada: no
  // computador ela encosta no texto.
  chamas: [{ x: 362.5, y: 64.5, r: 8, horas: ['noite'] }, { x: 350.5, y: 31.5, r: 13, horas: ['noite'] }],
  particulas: [270, 40, 150, 100],
}
export const DICAS_FAVORITAS = [
  'No computador, a tecla F favorita a questão que está aberta. Na sessão, a estrela fica no alto.',
  'Favoritou e errou? Ela aparece em "Errou na última": é por ali que a revisão rende mais.',
  'Treinar as favoritas monta uma sessão só com elas. Logo abaixo dá para filtrar por situação, prova e tema.',
]
