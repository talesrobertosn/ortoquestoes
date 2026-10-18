/**
 * O que a vitrine da tela de entrar mostra (pedido do Tales, 17/10/2026: "sempre apresentar frases ou imagens
 * diferentes a cada vez que o usuário entra; o legal é o site ser dinâmico").
 *
 * A cada visita sorteia um título, uma frase de apoio, uma questão de exemplo e quatro emblemas, sem repetir a
 * combinação da visita anterior (o índice da última fica no aparelho). As questões de exemplo são reais, com o
 * gabarito oficial do acervo (prova e ano conferidos); mostram a certa e duas das erradas, como no site.
 */

export interface AmostraQuestao { prova: string; enunciado: string; certa: string; erradas: [string, string] }

const TITULOS_ENTRAR = [
  'Que bom ter você de volta.',
  'A prova não espera. Bora continuar?',
  'Seu progresso ficou guardado.',
  'Mais um dia mais perto da prova.',
  'Pronto para a próxima questão?',
  'A constância passa na frente.',
]
const TITULOS_CRIAR = [
  'Sua preparação, organizada do primeiro ao último dia.',
  'Estude o que mais cai, na ordem certa.',
  'Questões oficiais, comentadas como uma aula.',
  'Do primeiro dia até a prova, com um plano.',
  'Treine como a banca pergunta.',
]
const LIDES = [
  'Questões das provas oficiais com comentário e referência, revisão que se monta sozinha e resumos na ordem em que a prova cobra.',
  'Cada questão vem com o porquê de cada alternativa, inclusive a certa, e a referência da bibliografia.',
  'O cronograma diz o que estudar hoje; a revisão traz de volta o que você errou, na hora certa.',
  'Resumos feitos por engenharia reversa: primeiro o que caiu, ano a ano, depois o texto na ordem da cobrança.',
  'Errou? A questão volta na revisão espaçada até virar acerto. Chutou? Ela volta também.',
  'Ranking, sequência de dias e emblemas para transformar o estudo num hábito.',
]
/** Questões reais (gabarito oficial no acervo), curtas o bastante para a vitrine. */
const AMOSTRAS: AmostraQuestao[] = [
  { prova: 'TEOT 2024', enunciado: 'Na via de Hardinge, dissecar mais de 5 cm acima do trocânter coloca em risco o nervo', certa: 'glúteo superior', erradas: ['ciático', 'femoral'] },
  { prova: 'TARO 2023', enunciado: 'No trauma toracolombar, o tipo de fratura mais associado a lesões abdominais é a', certa: 'de CHANCE', erradas: ['por explosão', 'fratura-luxação'] },
  { prova: 'TARO 2014', enunciado: 'Na fratura subtrocantérica, a flexão e a rotação lateral do fragmento proximal são promovidas pelo músculo', certa: 'iliopsoas', erradas: ['quadríceps', 'glúteo médio'] },
  { prova: 'TARO 2016', enunciado: 'Na epicondilite lateral do cotovelo, as alterações envolvem principalmente a origem do músculo', certa: 'extensor radial curto do carpo', erradas: ['extensor ulnar do carpo', 'extensor comum dos dedos'] },
  { prova: 'TARO 2024', enunciado: 'A causa mais comum de escoliose dolorosa em adolescentes é', certa: 'osteoma osteoide', erradas: ['espondilodiscite', 'neurofibromatose'] },
  { prova: 'TARO 2018', enunciado: 'Na fratura por estresse da tíbia, a cintilografia com tecnécio geralmente mostra aumento de captação', certa: 'focal nas 3 fases do exame', erradas: ['focal somente na fase tardia', 'difuso nas 3 fases do exame'] },
  { prova: 'TARO 2023', enunciado: 'A técnica de BILHAUT-CLOQUET é indicada para', certa: 'duplicação do polegar', erradas: ['dimelia ulnar', 'acrossindactilia'] },
  { prova: 'TARO 2017', enunciado: 'Na lesão do nervo axilar, a hipoestesia no braço ocorre nas faces', certa: 'lateral e superior', erradas: ['lateral e inferior', 'medial e inferior'] },
  { prova: 'TARO 2019', enunciado: 'No cotovelo, o último núcleo de ossificação a se fundir no úmero distal é o', certa: 'do epicôndilo medial', erradas: ['da tróclea', 'do capítulo'] },
]
const EMBLEMAS = [
  ['acertos-50', 'aproveitamento-70', 'bib-dias-7', 'assuntos-30'],
  ['sequencia-14', 'questoes-500', 'fogueira', 'revisoes-250'],
  ['mestre-trauma', 'mestre-joelho', 'mestre-mao', 'mestre-quadril'],
  ['especialista-teot', 'especialista-taro', 'precisao-25', 'dias-30'],
  ['bib-marcas-50', 'bib-concluidos-3', 'bib-tempo-120', 'bib-notas-10'],
  ['nacional-3', 'podio-1', 'constancia-21', 'cronograma-28'],
]

export interface Vitrine { titulo: string; lide: string; amostra: AmostraQuestao; emblemas: string[]; ordem: number[]; indices: Record<string, number> }

const CHAVE = 'oq:vitrine-acesso:v1'
/** Sorteia sem repetir o que apareceu na última visita (cada lista anda por conta própria). */
function sortear(n: number, antes: number | undefined) {
  if (n <= 1) return 0
  let i = Math.floor(Math.random() * (n - 1))
  if (antes !== undefined && i >= antes) i++
  return i
}

export function sortearVitrine(modo: 'entrar' | 'criar'): Vitrine {
  let ultima: Record<string, number> = {}
  try { ultima = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') ?? {} } catch { /* sem armazenamento: só sorteia */ }
  const titulos = modo === 'criar' ? TITULOS_CRIAR : TITULOS_ENTRAR
  const iT = sortear(titulos.length, ultima[modo]), iL = sortear(LIDES.length, ultima.lide)
  const iA = sortear(AMOSTRAS.length, ultima.amostra), iE = sortear(EMBLEMAS.length, ultima.emblemas)
  // a ordem das alternativas também muda, como numa prova
  const ordem = [0, 1, 2].sort(() => Math.random() - 0.5)
  return { titulo: titulos[iT], lide: LIDES[iL], amostra: AMOSTRAS[iA], emblemas: EMBLEMAS[iE], ordem, indices: { [modo]: iT, lide: iL, amostra: iA, emblemas: iE } }
}

/** Grava o que foi mostrado (depois de aparecer na tela), para a próxima visita sortear outra coisa. */
export function guardarVitrine(v: Vitrine) {
  try {
    const ultima = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') ?? {}
    localStorage.setItem(CHAVE, JSON.stringify({ ...ultima, ...v.indices }))
  } catch { /* sem armazenamento: só sorteia */ }
}

/**
 * Nome de quem já entrou neste aparelho (adendo do Tales, 18/10/2026: "citar o nome da pessoa sempre que possível").
 * Guarda só o primeiro nome, junto do e-mail da conta: a tela de entrar cumprimenta pelo nome apenas enquanto o
 * e-mail no campo for o mesmo (outra pessoa digitando outro e-mail não vê o nome de ninguém).
 */
const CHAVE_NOME = 'oq:vitrine-acesso:nome'

export function lembrarNome(email: string, nome: string) {
  const primeiro = nome.trim().split(/\s+/)[0]?.slice(0, 40) ?? ''
  const conta = email.trim().toLowerCase()
  if (!primeiro || !conta) return
  try { localStorage.setItem(CHAVE_NOME, JSON.stringify({ email: conta, nome: primeiro })) } catch { /* sem armazenamento */ }
}

export function nomeLembrado(email: string): string {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_NOME) ?? 'null') as { email?: unknown; nome?: unknown } | null
    return dados && typeof dados.nome === 'string' && dados.email === email.trim().toLowerCase() ? dados.nome : ''
  } catch { return '' }
}
