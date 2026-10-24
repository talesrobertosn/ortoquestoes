/** Modelo de dados do acervo. Espelhado no pipeline de importação (Python). */

export type Letra = 'A' | 'B' | 'C' | 'D' | 'E'

export type Dificuldade = 'facil' | 'medio' | 'dificil'

export type TipoProva = string // "TEOT", "TARO", "Simulado"

export interface Alternativa {
  letra: Letra
  texto: string
}

export interface Imagem {
  arquivo: string
  legenda?: string | null
  /** Créditos: de onde a imagem foi tirada, com link se houver. */
  fonte?: string | null
  largura?: number | null
  altura?: number | null
}

export interface Origem {
  arquivo: string
  pagina: number | null
  numeroOriginal: number | null
}

/**
 * Comentário enviado por um colega e publicado com crédito.
 * Chega por e-mail, é conferido e entra no acervo pela mão do autor do site —
 * não há servidor nem envio automático, o que mantém o site estático e sem
 * moderação automática de conteúdo médico.
 */
export interface ComentarioComunidade {
  texto: string
  autor: string
  especialidade?: string | null
  subespecialidade?: string | null
  centro?: string | null
  referencias?: string[]
  imagens?: Imagem[]
  data?: string | null
}

/**
 * Comentário escrito por inteligência artificial: por que a certa está certa e
 * por que cada uma das outras não está. Fica separado do comentário do autor e
 * dos da comunidade de propósito — quem lê precisa saber de onde veio o texto
 * para decidir quanto peso dar. Enquanto `conferido` for falso, a interface diz
 * em letras claras que ninguém revisou aquilo.
 */
/** Fonte de uma revisão editorial individual apoiada nos resumos da Biblioteca. */
export interface BaseResumo {
  tipo: 'resumo'
  versao: 1
  fontes: Array<{
    resumo: string
    titulo: string
    livro: string
    edicao: string
    capitulo: string
    secoes: string[]
    blocos: string[]
    sha256: string
    trechosSha256: string
  }>
  questaoSha256: string
  comentarioSha256: string
}

export interface ComentarioIA {
  /** Ausente nos comentários antigos, candidatos ou ainda não revisados neste fluxo. */
  baseResumo?: BaseResumo

  /**
   * Aviso sobre a própria questão, quando o gabarito oficial parece errado ou
   * o enunciado é incoerente. Aparece antes de tudo, em destaque: quem estuda
   * precisa saber disso antes de ler a explicação, não depois.
   */
  alerta?: string | null
  /** Conceito de fundo, quando ajuda a entender antes de ir alternativa a alternativa. */
  conceito?: string | null
  /**
   * Só em questão sem gabarito oficial: a alternativa que a bibliografia
   * sustenta. Aparece como "Resposta pela bibliografia", sem virar gabarito
   * nem contar no desempenho.
   */
  provavel?: Letra | null
  /** Por que a alternativa do gabarito (ou a provável) é a correta. */
  correta: string
  /** Por que cada uma das outras está errada, indexado pela letra. */
  incorretas: Partial<Record<Letra, string>>
  referencias?: string[]
  /** Imagens do comentário (enviadas pelo painel do administrador). */
  imagens?: Imagem[]
  /** Quando o texto foi gerado, para saber o que reler quando a conduta mudar. */
  geradoEm?: string | null
  /** Conferido por médico. Enquanto falso, o aviso fica em destaque. */
  conferido?: boolean
}

export interface Questao {
  id: string
  /** "cirurgia-mao" nas provas de cirurgia da mão; ausente nas de ortopedia */
  area?: 'cirurgia-mao'
  /** Simulado de ortopedia também disponível no treino desta especialidade. */
  areasAdicionais?: Array<'cirurgia-mao'>
  /**
   * Dissertativa: sem alternativas. A pessoa escreve a resposta, vê a resposta
   * esperada e o comentário e ela mesma avalia se acertou.
   */
  tipo?: 'dissertativa'
  /** Resposta esperada (espelho da banca), nas dissertativas */
  respostaEsperada?: string | null
  tema: string
  subtemas: string[]
  prova: TipoProva | null
  /** Etiqueta OrtoQuestões Simulados: questão elaborada no padrão da prova, soma-se a ela. */
  simulado?: boolean
  /** cópia de outra questão do acervo: fica fora de sessões e contagens, mas o id continua válido para o histórico */
  duplicataDe?: string
  ano: number | null
  dificuldade: Dificuldade | null
  enunciado: string
  imagens: Imagem[]
  alternativas: Alternativa[]
  gabarito: Letra | null
  /**
   * Prova sem gabarito oficial divulgado (TAROs antigos, como 2006 a 2010): a letra que a
   * bibliografia sustenta, definida pelo Orto Questões. Ao carregar, vira o
   * gabarito de correção e conta no desempenho; a tela avisa que não é oficial.
   */
  gabaritoBibliografia?: Letra
  comentario: string | null
  comentarioIA?: ComentarioIA | null
  comentariosComunidade?: ComentarioComunidade[]
  referencias: string[]
  anulada: boolean
  /** Enunciado se refere a uma figura que não veio no PDF de origem. */
  figuraPendente?: boolean
  revisado: boolean
  /** Subtemas propostos pelo pipeline e ainda não conferidos por humano. */
  subtemasPendentes?: boolean
  origem?: Origem
}

/** Registro leve por questão, presente no índice: sem enunciado, sem alternativas. */
export interface ItemIndice {
  /** id */
  id: string
  /** índice do tema em Indice.temas */
  t: number
  /** índices dos subtemas em Indice.subtemas */
  s: number[]
  /** índice da prova em Indice.provas, ou null */
  p: number | null
  /** ano, ou null */
  a: number | null
  /** dificuldade, ou null */
  d: Dificuldade | null
  /** tem imagem no enunciado */
  img: 0 | 1
  /** anulada */
  an: 0 | 1
  /** tem comentário, de qualquer origem — é o que alimenta o filtro */
  c: 0 | 1
  /** tem comentário de IA */
  cia: 0 | 1
  /** tem ao menos um comentário da comunidade */
  cc: 0 | 1
  /** OrtoQuestões Simulados (ausente nas demais) */
  sim?: 1
  /** é cópia da questão com este id: não entra em sessões nem contagens */
  dup?: string
  /** categoria fora da ortopedia base (TEOT e TARO): fica fora do treino padrão e do cronograma */
  ar?: Exclude<Area, 'base'>
  /** Presença adicional: conserva a área principal e o mesmo ID/histórico. */
  aa?: Array<'mao'>
}

/**
 * Um ponto da série de progresso: quantas questões do acervo já estavam
 * comentadas naquela data. Vem de public/acervo/progresso.json, reconstruído
 * do histórico do git e acrescido de um ponto por dia de trabalho.
 */
export interface MarcoProgresso {
  /** AAAA-MM-DD */
  data: string
  total: number
  ia: number
  comunidade: number
}

export interface Progresso {
  geradoEm: string
  marcos: MarcoProgresso[]
}

export interface TemaIndice {
  slug: string
  nome: string
  arquivo: string
  total: number
}

export interface Indice {
  versao: number
  geradoEm: string | null
  total: number
  temas: TemaIndice[]
  subtemas: string[]
  provas: string[]
  anos: number[]
  questoes: ItemIndice[]
}

/**
 * Recorte pelo que já aconteceu neste navegador. Não é propriedade da questão
 * e sim do histórico de quem está estudando — por isso mora aqui e não no
 * índice do acervo.
 */
export type Situacao = 'todas' | 'naoRespondidas' | 'erradas' | 'acertadas' | 'favoritas' | 'revisarHoje' | 'dominadas' | 'incertas' | 'turmaErra' | 'turmaAcertaVoceErrou'

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  todas: 'Todas',
  naoRespondidas: 'Não respondidas',
  erradas: 'Que eu errei',
  acertadas: 'Que eu acertei',
  favoritas: 'Favoritas',
  revisarHoje: 'Revisar hoje',
  dominadas: 'Dominadas',
  incertas: 'Chute ou dúvida',
  turmaErra: 'As que a turma mais erra',
  turmaAcertaVoceErrou: 'A turma acerta, você errou',
}

/** Situações que dependem de "como a turma respondeu": só para assinantes. */
export const SITUACOES_TURMA: Situacao[] = ['turmaErra', 'turmaAcertaVoceErrou']

/** Filtros de montagem de sessão. */
/**
 * Categorias de prova. "base" é a ortopedia e traumatologia (TEOT, TARO e afins),
 * o padrão do site; R4 ENARE, R4 Coluna e Cirurgia da mão são mais avançadas e só
 * entram no treino quando a pessoa marca.
 */
export type Area = 'base' | 'enare' | 'coluna' | 'quadril' | 'mao'
export const AREAS_TREINO: Area[] = ['base', 'enare', 'coluna', 'quadril', 'mao']
export const ROTULO_AREA: Record<Area, string> = { base: 'Ortopedia (TEOT e TARO)', enare: 'R4 ENARE', coluna: 'R4 Coluna', quadril: 'Fellowship Quadril', mao: 'Cirurgia da mão' }

export interface Filtros {
  /** categorias incluídas no treino */
  areas: Area[]
  temas: string[]
  subtemas: string[]
  provas: string[]
  anos: number[]
  dificuldades: Dificuldade[]
  comImagem: boolean
  comComentario: boolean
  /** só as questões com a etiqueta OrtoQuestões Simulados */
  soSimulados: boolean
  /** só as questões das provas oficiais, sem os OrtoQuestões Simulados */
  semSimulados?: boolean
  incluirAnuladas: boolean
  embaralhar: boolean
  limite: number | null
  situacao: Situacao
  busca: string
}

export const FILTROS_VAZIOS: Filtros = {
  areas: ['base'],
  temas: [],
  subtemas: [],
  provas: [],
  anos: [],
  dificuldades: [],
  comImagem: false,
  comComentario: false,
  soSimulados: false,
  incluirAnuladas: false,
  embaralhar: true,
  limite: null,
  situacao: 'todas',
  busca: '',
}

export const ROTULO_DIFICULDADE: Record<Dificuldade, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
}

/** Uma resposta dada dentro de uma sessão. */
export interface Resposta {
  /** null na dissertativa: ela é autoavaliada, não há letra marcada. */
  escolhida: Letra | null
  correta: boolean | null
  segundos: number
  confianca?: 'seguro' | 'duvida' | 'chute'
  /** Respondida em outro aparelho (ou aba) e trazida pela sincronização: não conta de novo no histórico. */
  outroAparelho?: boolean
}

export interface EstadoSessao {
  id: string
  criadaEm: number
  filtros: Filtros
  ids: string[]
  posicao: number
  respostas: Record<string, Resposta>
  revisar: string[]
  riscadas: Record<string, Letra[]>
  concluidaEm: number | null
  /**
   * Simulado: o gabarito fica guardado até o fim, como em prova. Sem isso, o
   * modo seria só um cronômetro em cima do treino comum.
   */
  simulado?: boolean
  /** Tempo total do simulado. O relógio corre no mundo, não na aba aberta. */
  limiteSegundos?: number | null
  /** Edição do Simulado Nacional ("2026-10"). Entregar manda as letras para a correção no servidor. */
  nacional?: string
  /** Simulado Nacional: a ordem das alternativas de cada questão na edição ('CADB': a letra nova A mostra a original C). */
  permutacoes?: Record<string, string>
  /** Simulado Nacional: o prazo da prova no servidor (ms). O relógio conta até ele. */
  prazoEm?: number
  /** Simulado Nacional: questões marcadas aqui que ainda não subiram para o servidor. */
  pendentesNacional?: string[]
  /** Simulado Nacional: a lista "para rever" mudou e ainda não subiu. */
  revisarPendente?: boolean
  /** De onde a sessão nasceu, para oferecer a volta no lugar certo (ex.: o cronograma). */
  origem?: 'cronograma' | 'diagnostico' | 'reta-final' | 'reativar'
}

/** Quanto falta, em segundos. Negativo quando o tempo acabou. */
export function segundosRestantes(sessao: EstadoSessao, agora = Date.now()): number | null {
  // Simulado Nacional: o prazo é o do servidor.
  if (sessao.prazoEm) return Math.round((sessao.prazoEm - agora) / 1000)
  if (!sessao.limiteSegundos) return null
  return Math.round((sessao.criadaEm + sessao.limiteSegundos * 1000 - agora) / 1000)
}

export function formatarDuracao(segundos: number): string {
  const total = Math.max(0, segundos)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const dois = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`
}
