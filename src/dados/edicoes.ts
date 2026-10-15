import { recurso } from '../config'
import type { ComentarioIA, Imagem, Indice, Questao } from './tipos'

/**
 * Edições feitas no painel do administrador. O acervo continua estático (JSON
 * publicado com o site); a versão editada de uma questão mora na tabela
 * questoes_edicoes do Supabase e é aplicada por cima dela aqui, ao carregar.
 * Assim a correção vale na hora, sem novo deploy, e não se perde quando o
 * acervo é regerado.
 */
export interface EdicaoQuestao {
  prova?: string | null
  ano?: number | null
  enunciado?: string
  /** "dissertativa" ou null (volta a ser de alternativas) */
  tipo?: 'dissertativa' | null
  respostaEsperada?: string | null
  alternativas?: Questao['alternativas']
  gabarito?: Questao['gabarito']
  anulada?: boolean
  imagens?: Imagem[]
  /** Comentário do autor (texto livre, aceita **negrito** e ==destaque==). */
  comentario?: string | null
  /** Comentário completo (conceito, correta, erradas, alerta, imagens). */
  comentarioIA?: ComentarioIA | null
  /** Escondida do site: sai do índice (treino, simulados, contagens) e o link deixa de abrir. Reversível. */
  oculta?: boolean
  /** Apagada pelo painel: escondida e marcada para sair dos arquivos do acervo na próxima limpeza. */
  apagada?: boolean
}

/** A edição tira a questão do site (escondida ou apagada)? */
export const foraDoSite = (e: EdicaoQuestao | undefined) => !!(e?.oculta || e?.apagada)

/** Quanto o site espera pelas edições antes de seguir sem elas. */
const PRAZO_MS = 3_000

let promessa: Promise<Map<string, EdicaoQuestao>> | null = null

export function carregarEdicoes(): Promise<Map<string, EdicaoQuestao>> {
  if (!promessa) {
    // Import sob demanda: o acervo não puxa o cliente do Supabase para o carregamento inicial.
    const pedido = import('../servicos/supabase')
      .then(({ chamarRpcPublica }) => chamarRpcPublica<Array<{ id_questao: string; dados: EdicaoQuestao }>>('edicoes_questoes'))
      .then((linhas) => new Map(linhas.map((l) => [l.id_questao, l.dados])))
      // Tabela ainda não criada, servidor fora do ar: o site segue com o acervo puro.
      .catch(() => new Map<string, EdicaoQuestao>())
    const limite = new Promise<Map<string, EdicaoQuestao>>((resolver) => setTimeout(() => resolver(new Map()), PRAZO_MS))
    promessa = Promise.race([pedido, limite])
  }
  return promessa
}

/** O painel acabou de salvar: a próxima leitura busca de novo. */
export function esquecerEdicoes() {
  promessa = null
}

/** A questão com a edição por cima. Sem edição, devolve a mesma questão. */
/**
 * Edições salvas no painel guardam a lista inteira de imagens com o nome de
 * quando foram salvas. Depois da conversão para WebP (15/10/2026), um ".png"
 * guardado no banco apontaria para um arquivo que não existe mais: se o acervo
 * tem a mesma imagem em .webp, vale a do acervo.
 */
function comConversao(daEdicao: Imagem[], doAcervo: Imagem[] | undefined): Imagem[] {
  if (!doAcervo?.length) return daEdicao
  const semExtensao = (arquivo: string) => arquivo.replace(/\.(png|jpe?g|webp)$/i, '')
  const porNome = new Map(doAcervo.map((img) => [semExtensao(img.arquivo), img]))
  return daEdicao.map((img) => {
    if (!/\.(png|jpe?g)$/i.test(img.arquivo)) return img
    const convertida = porNome.get(semExtensao(img.arquivo))
    return convertida && convertida.arquivo !== img.arquivo ? { ...img, arquivo: convertida.arquivo, largura: convertida.largura, altura: convertida.altura } : img
  })
}

export function aplicarEdicao(q: Questao, e: EdicaoQuestao | undefined): Questao {
  if (!e) return gabaritoDeCorrecao(q)
  const nova: Questao = { ...q }
  if (e.prova !== undefined) nova.prova = e.prova
  if (e.ano !== undefined) nova.ano = e.ano
  if (e.enunciado !== undefined) nova.enunciado = e.enunciado
  if (e.tipo !== undefined) nova.tipo = e.tipo ?? undefined
  if (e.respostaEsperada !== undefined) nova.respostaEsperada = e.respostaEsperada
  if (e.alternativas !== undefined) nova.alternativas = e.alternativas
  if (e.gabarito !== undefined) nova.gabarito = e.gabarito
  if (e.anulada !== undefined) nova.anulada = e.anulada
  if (e.imagens !== undefined) {
    nova.imagens = comConversao(e.imagens, q.imagens)
    if (e.imagens.length) nova.figuraPendente = false
  }
  if (e.comentario !== undefined) nova.comentario = e.comentario
  if (e.comentarioIA !== undefined) nova.comentarioIA = e.comentarioIA
  return gabaritoDeCorrecao(nova)
}

/**
 * Prova sem gabarito oficial (TAROs antigos): a resposta pela bibliografia
 * vira o gabarito de correção, e a questão passa a contar no desempenho. O
 * campo gabaritoBibliografia só fica na questão enquanto é ele que vale; se o
 * painel registrar um gabarito oficial ou anular a questão, ele sai.
 */
export function gabaritoDeCorrecao(q: Questao): Questao {
  if (!q.gabaritoBibliografia) return q
  if (q.gabarito || q.anulada) {
    const { gabaritoBibliografia: _, ...sem } = q
    return sem
  }
  return { ...q, gabarito: q.gabaritoBibliografia }
}

/** Ajusta no índice o que a edição muda nos filtros (prova, ano, anulada, imagem, comentário). */
export function aplicarEdicoesNoIndice(indice: Indice, edicoes: Map<string, EdicaoQuestao>): Indice {
  if (!edicoes.size) return indice
  const provas = [...indice.provas]
  const anos = new Set(indice.anos)
  const questoes = indice.questoes.filter((item) => !foraDoSite(edicoes.get(item.id))).map((item) => {
    const e = edicoes.get(item.id)
    if (!e) return item
    const novo = { ...item }
    if (e.prova !== undefined) {
      if (e.prova && !provas.includes(e.prova)) provas.push(e.prova)
      novo.p = e.prova ? provas.indexOf(e.prova) : null
    }
    if (e.ano !== undefined) {
      novo.a = e.ano
      if (e.ano) anos.add(e.ano)
    }
    if (e.anulada !== undefined) novo.an = e.anulada ? 1 : 0
    if (e.imagens !== undefined) novo.img = e.imagens.length ? 1 : 0
    if (e.comentarioIA !== undefined) novo.cia = e.comentarioIA ? 1 : 0
    if (e.comentario || e.comentarioIA) novo.c = 1
    // Só zera quando a edição tira os dois comentários e não há comentário da comunidade.
    else if (e.comentario !== undefined && e.comentarioIA !== undefined && !item.cc) novo.c = 0
    return novo
  })
  return { ...indice, provas, anos: [...anos].sort((a, b) => a - b), questoes }
}

/** Endereço de uma imagem: as enviadas pelo painel já vêm com o endereço completo. */
export function urlImagem(arquivo: string): string {
  return /^https?:\/\//.test(arquivo) ? arquivo : recurso(`imagens/${arquivo}`)
}
