import type { Ancora } from './ancoras'

/**
 * Biblioteca (resumos de capítulos): o conteúdo é compartilhado e estático
 * (public/biblioteca/, gerado de conteudo/biblioteca/*.md); o que é de cada pessoa
 * (marcações, notas, posição, preferências) fica na chave sincronizada `biblioteca`.
 */

// ─── Conteúdo ─────────────────────────────────────────────────────────────

export type Radar = 'confirmado' | 'fundamento' | 'clinico' | 'oportunidade'

export type Bloco =
  | { id: string; tipo: 'p' | 'h3' | 'li' | 'prova'; t: string }
  | { id: string; tipo: 'questoes'; central: string[]; relacionadas: string[]; treino: string[]; conceito: string; como?: string; armadilhas?: string[]; alerta?: string }
  | { id: string; tipo: 'figura'; numero: string; legenda: string; imagem: string | null; licenca: 'pendente' | 'autorizada' }
  | { id: string; tipo: 'tabela'; titulo: string; cab: string[]; linhas: string[][] }

export type BlocoTexto = Extract<Bloco, { t: string }>
export const ehTexto = (b: Bloco): b is BlocoTexto => 't' in b

export interface Secao { id: string; titulo: string; radar: Radar; blocos: Bloco[] }

export interface Capitulo {
  id: string
  versao: number
  titulo: string
  especialidade: string
  livro: string
  edicao: string
  capitulo: string
  autores: string
  fonte: string
  resumo: string
  /** Plano gratuito: até 5 resumos abertos; os outros só para assinantes. */
  acesso: 'gratis' | 'assinante'
  /** Subtemas do acervo que o resumo ensina (adendo "Frases que caem" no fim do leitor). */
  subtemas?: string[]
  minutos: number
  secoes: Secao[]
}

export interface ResumoCapitulo {
  id: string
  versao: number
  titulo: string
  especialidade: string
  livro: string
  edicao: string
  capitulo: string
  resumo: string
  acesso: 'gratis' | 'assinante'
  minutos: number
  secoes: Array<{ id: string; titulo: string; radar: Radar }>
  /** Questões de prova real citadas (central ou relacionada). */
  questoes: string[]
  /** Questões de treino (OrtoQuestões Simulados) citadas. */
  treino: string[]
  /** Subtemas do acervo que o resumo ensina (o cronograma e a questão sugerem a leitura por eles). */
  subtemas?: string[]
}

export interface IndiceBiblioteca { geradoEm: string; capitulos: ResumoCapitulo[] }

// ─── Dados da pessoa (sincronizados) ──────────────────────────────────────

export type CorMarca = 'amarelo' | 'verde' | 'azul' | 'rosa' | 'roxo'
export const CORES: CorMarca[] = ['amarelo', 'verde', 'azul', 'rosa', 'roxo']

export interface Marca {
  tipo: 'marca'
  id: string
  capitulo: string
  ancora: Ancora
  cor: CorMarca
  nota: string
  favorita?: boolean
  /** Marcador de página: guarda o lugar, sem pintar o texto. */
  marcador?: boolean
  criadaEm: number
  editadaEm: number
  /** Apagada: fica como lápide para a exclusão chegar aos outros aparelhos sem a marca voltar. */
  apagadaEm?: number
  /** Notas editadas ao mesmo tempo em outro aparelho, guardadas para a pessoa decidir. */
  notasDeOutroAparelho?: string[]
}

export interface Leitura {
  tipo: 'leitura'
  capitulo: string
  /** Onde a pessoa estava: o bloco no topo da tela e o deslocamento dentro dele. */
  bloco: string
  deslocamento: number
  /** 0 a 100: quanto do capítulo já passou pela tela. */
  progresso: number
  em: number
  concluidoEm?: number
  /** Últimas aberturas (para "Continuar estudando" e o histórico). */
  aberturas?: number[]
  /**
   * Segundos de leitura ativa neste capítulo (aba visível, leitor aberto e a pessoa mexendo nele
   * nos últimos 2 minutos; no máximo 60 por minuto). Alimenta os emblemas de tempo dos resumos.
   */
  segundos?: number
  /** Dias de São Paulo (numeroDoDia) com pelo menos 1 minuto de leitura ativa; só os últimos DIAS_LEITURA_MAXIMO. */
  dias?: number[]
}

/** Quantos dias de leitura cada capítulo guarda (o documento não cresce sem limite). */
export const DIAS_LEITURA_MAXIMO = 120

export interface Preferencias {
  tipo: 'pref'
  tema: 'claro' | 'sepia' | 'escuro'
  fonte: number
  entrelinha: number
  largura: 'estreita' | 'media' | 'larga'
  justificar: boolean
  modo: 'rolagem' | 'paginado'
  fonteFamilia: 'serifa' | 'sem-serifa'
  prova: boolean
  em: number
}

// Sépia é o padrão de quem nunca escolheu (Tales, 30/10/2026); a escolha da pessoa fica salva na conta.
export const PREFERENCIAS_PADRAO: Preferencias = { tipo: 'pref', tema: 'sepia', fonte: 19, entrelinha: 1.7, largura: 'media', justificar: false, modo: 'rolagem', fonteFamilia: 'serifa', prova: true, em: 0 }

export type DocBiblioteca = Marca | Leitura | Preferencias

/** Itens do mapa sincronizado: m.<id>, l.<capitulo>, pref. */
export const itemMarca = (id: string) => `m.${id}`
export const itemLeitura = (capitulo: string) => `l.${capitulo}`
export const ITEM_PREF = 'pref'
export const CHAVE_BIBLIOTECA = 'biblioteca'
