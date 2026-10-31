/**
 * As cenas do gato na espera (O Gato Aventureiro, 31/10/2026). Dados puros (sem React), para o teste
 * fixtures/testar_espera_gato.mjs e para o painel de prévia de desenvolvimento.
 *
 * A arte é de scripts/gerar_gato_cenas.py: public/pixel/mascote/gato-cenas.png, uma linha por trecho de cena,
 * quadros de LARGURA x ALTURA. Uma cena é uma sequência de trechos (entrada, ação, reação, fecho); cada trecho é uma
 * linha da folha, tocada uma vez ou repetida. O último trecho de toda cena termina numa pose de descanso compatível
 * com o começo de outra (sentado ou deitado), e a caminhada liga uma à outra quando é preciso.
 */
export const FOLHA_CENAS = 'pixel/mascote/gato-cenas.png?v=1'
export const QUADRO = { w: 96, h: 56 }
export const QUADROS_POR_LINHA = 8

export type Pose = 'sentado' | 'deitado' | 'em-pe'
export interface Trecho { linha: string; quadros: number; ms: number; vezes?: number }
export interface Cena {
  id: string
  nome: string
  trechos: Trecho[]
  /** Pose em que a cena começa e em que termina (para ligar uma cena na outra sem pulo). */
  de: Pose
  ate: Pose
  /** Frases da cena (temáticas, nunca "status" técnico). */
  frases: string[]
  /** Peso no sorteio; as raras (segredos) têm peso baixo. */
  peso: number
  /** Cena para comemorar: só aparece quando algo foi de fato concluído (nunca numa espera comum). */
  so?: 'conclusao'
  rara?: boolean
}

/** A ordem das linhas na folha (tem de bater com LINHAS em scripts/gerar_gato_cenas.py). */
export const LINHAS_CENAS = [
  'idle-sentado', 'idle-deitado',
  'dormir-chega', 'dormir-gira', 'dormir-respira',
  'espreguicar-acorda', 'espreguicar-estica', 'espreguicar-boceja',
  'novelo-percebe', 'novelo-toca', 'novelo-salta', 'novelo-senta',
  'estudo-olha', 'estudo-vira', 'estudo-deita',
  'banho-lambe', 'banho-rosto', 'banho-orelha',
  'luz-ve', 'luz-agacha', 'luz-salta', 'luz-olha',
  'pergaminho-toca', 'pergaminho-abre', 'pergaminho-pula', 'pergaminho-senta',
  'livro-ve', 'livro-segura', 'livro-descansa',
  'borboleta-ve', 'borboleta-pata', 'borboleta-salta',
  'cochilo-orelha', 'cochilo-olho', 'cochilo-ajeita',
  'festa-percebe', 'festa-pula', 'festa-cauda',
  'andar-direita', 'andar-esquerda', 'andar-para',
  'segredo-cauda', 'segredo-coruja', 'segredo-livro', 'segredo-desliza',
] as const
export type IdLinha = (typeof LINHAS_CENAS)[number]

const t = (linha: IdLinha, quadros = 8, ms = 120, vezes = 1): Trecho => ({ linha, quadros, ms, vezes })

export const CENAS: Cena[] = [
  { id: 'dormindo', nome: 'Gato dormindo', de: 'em-pe', ate: 'deitado', peso: 10,
    trechos: [t('dormir-chega', 8, 140), t('dormir-gira', 8, 150), t('dormir-respira', 8, 260, 6)],
    frases: ['Uma pausa também faz parte da jornada.', 'Até os aventureiros precisam de uma soneca.', 'O gato está supervisionando a biblioteca (de olhos fechados).'] },
  { id: 'espreguicando', nome: 'Espreguiçando', de: 'deitado', ate: 'sentado', peso: 10,
    trechos: [t('espreguicar-acorda', 8, 150), t('espreguicar-estica', 8, 140), t('espreguicar-boceja', 8, 140), t('idle-sentado', 8, 160, 2)],
    frases: ['Preparando as patinhas para mais uma sessão.', 'Uma patinha de cada vez.'] },
  { id: 'novelo', nome: 'Brincando com o novelo', de: 'sentado', ate: 'sentado', peso: 10,
    trechos: [t('novelo-percebe', 8, 130), t('novelo-toca', 8, 110), t('novelo-salta', 8, 100), t('novelo-senta', 8, 150, 2)],
    frases: ['Enquanto você estuda, alguém encontrou outra missão.', 'Os livros estão em ordem. O gato, nem tanto.'] },
  { id: 'estudioso', nome: 'Gato estudioso', de: 'sentado', ate: 'deitado', peso: 10,
    trechos: [t('estudo-olha', 8, 160), t('estudo-vira', 8, 130), t('estudo-deita', 8, 170, 2)],
    frases: ['Conferindo os capítulos da biblioteca...', 'O gato encontrou um capítulo interessante.', 'Um bom estudo começa com curiosidade.'] },
  { id: 'banho', nome: 'Banho de gato', de: 'sentado', ate: 'sentado', peso: 10,
    trechos: [t('banho-lambe', 8, 130), t('banho-rosto', 8, 130, 2), t('banho-orelha', 8, 140), t('idle-sentado', 8, 160)],
    frases: ['Organizando tudo com o cuidado de um gato.'] },
  { id: 'luz', nome: 'Caçando uma luz', de: 'sentado', ate: 'sentado', peso: 9,
    trechos: [t('luz-ve', 8, 140), t('luz-agacha', 8, 130), t('luz-salta', 8, 90), t('luz-olha', 8, 170)],
    frases: ['Até os detalhes mais difíceis merecem atenção.'] },
  { id: 'pergaminho', nome: 'Gato e pergaminho', de: 'sentado', ate: 'sentado', peso: 9,
    trechos: [t('pergaminho-toca', 8, 140), t('pergaminho-abre', 8, 130), t('pergaminho-pula', 8, 100), t('pergaminho-senta', 8, 170)],
    frases: ['Desenrolando os próximos assuntos...', 'Revisando os pergaminhos...'] },
  { id: 'livro', nome: 'Livro quase caindo', de: 'sentado', ate: 'sentado', peso: 9,
    trechos: [t('livro-ve', 8, 150), t('livro-segura', 8, 130), t('livro-descansa', 8, 180)],
    frases: ['Colocando cada conteúdo em seu lugar.', 'Separando os livros da próxima aventura.'] },
  { id: 'borboleta', nome: 'Borboleta mágica', de: 'sentado', ate: 'sentado', peso: 9,
    trechos: [t('borboleta-ve', 8, 150), t('borboleta-pata', 8, 130), t('borboleta-salta', 8, 110)],
    frases: ['Às vezes, a curiosidade leva às melhores descobertas.'] },
  { id: 'cochilo', nome: 'Cochilo interrompido', de: 'deitado', ate: 'deitado', peso: 7,
    trechos: [t('dormir-respira', 8, 260, 2), t('cochilo-orelha', 8, 180), t('cochilo-olho', 8, 200), t('cochilo-ajeita', 8, 180), t('dormir-respira', 8, 260, 4)],
    frases: ['Shhh... o bibliotecário auxiliar está descansando.'] },
  { id: 'comemorando', nome: 'Gato comemorando', de: 'sentado', ate: 'sentado', peso: 0, so: 'conclusao',
    trechos: [t('festa-percebe', 8, 130), t('festa-pula', 8, 100), t('festa-cauda', 8, 150)],
    frases: ['Mais uma etapa da jornada concluída!'] },
  { id: 'caminhando', nome: 'Gato caminhando', de: 'em-pe', ate: 'sentado', peso: 6,
    trechos: [t('andar-direita', 8, 110, 3), t('andar-para', 8, 140), t('idle-sentado', 8, 160, 2)],
    frases: ['Preparando sua próxima jornada.', 'Organizando a próxima sessão de estudo.'] },
  // Segredos: raros de propósito (o encanto some se aparecem sempre).
  { id: 'segredo-cauda', nome: 'Perseguindo a cauda', de: 'sentado', ate: 'sentado', peso: 0.6, rara: true,
    trechos: [t('segredo-cauda', 8, 90, 2), t('idle-sentado', 8, 160)], frases: ['Quase... quase...'] },
  { id: 'segredo-coruja', nome: 'A coruja passa', de: 'deitado', ate: 'deitado', peso: 0.6, rara: true,
    trechos: [t('dormir-respira', 8, 260), t('segredo-coruja', 8, 150), t('dormir-respira', 8, 260, 2)], frases: ['Alguém de óculos acabou de passar voando.'] },
  { id: 'segredo-livro', nome: 'Livrinho misterioso', de: 'sentado', ate: 'sentado', peso: 0.5, rara: true,
    trechos: [t('estudo-olha', 8, 150), t('segredo-livro', 8, 150), t('idle-sentado', 8, 160)], frases: ['Este capítulo não está no sumário.'] },
  { id: 'segredo-desliza', nome: 'Soneca exagerada', de: 'deitado', ate: 'deitado', peso: 0.5, rara: true,
    trechos: [t('dormir-respira', 8, 260), t('segredo-desliza', 8, 200), t('dormir-respira', 8, 260, 2)], frases: ['Profundamente concentrado. Em dormir.'] },
]

/** Frases soltas para esperas longas (trocadas de vez em quando), sem prometer "quase pronto". */
export const FRASES_GERAIS = [
  'Separando os livros da próxima aventura.', 'Organizando a próxima sessão de estudo.', 'Revisando os pergaminhos...',
  'Um bom estudo começa com curiosidade.', 'Preparando sua próxima jornada.', 'O gato está supervisionando a biblioteca.',
  'Uma patinha de cada vez.', 'Os livros estão em ordem. O gato, nem tanto.',
]

export const duracaoTrecho = (tr: Trecho) => tr.quadros * tr.ms * (tr.vezes ?? 1)
export const duracaoCena = (c: Cena) => c.trechos.reduce((s, tr) => s + duracaoTrecho(tr), 0)

/**
 * Sorteia a próxima cena: nunca a mesma das duas últimas (quando há outra), nunca a de comemorar numa espera comum,
 * e as raras com peso baixo. `aleatorio` entra para o teste ser determinístico.
 */
export function escolherCena(ultimas: string[], aleatorio: () => number = Math.random, contexto?: 'conclusao'): Cena {
  const candidatas = CENAS.filter((c) => (contexto ? c.so === contexto : !c.so) && !ultimas.slice(-2).includes(c.id))
  const lista = candidatas.length ? candidatas : CENAS.filter((c) => !c.so)
  const total = lista.reduce((s, c) => s + c.peso, 0)
  let r = aleatorio() * total
  for (const c of lista) { r -= c.peso; if (r <= 0) return c }
  return lista[lista.length - 1]
}

/** A ponte entre duas cenas: se a pose não bate, o gato se levanta e anda (ou senta) antes da próxima. */
export function ponte(de: Pose, para: Pose): Trecho[] {
  if (de === para) return []
  if (para === 'em-pe') return [t('andar-para', 8, 120)]
  if (de === 'deitado' && para === 'sentado') return [t('espreguicar-acorda', 8, 120)]
  if (de === 'sentado' && para === 'deitado') return [t('dormir-gira', 8, 130)]
  return [t('andar-direita', 8, 110), t('andar-para', 8, 130)]
}
