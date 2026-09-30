import { useEffect, useState } from 'react'
import { recurso } from '../config'
import type { ComentarioIA, Indice, Questao } from './tipos'

type Arquivo = Record<string, ComentarioIA>

const carregados = new Map<string, Promise<Arquivo>>()

/**
 * Os comentários ficam em arquivo separado, um por tema, e não dentro das
 * questões. Dois motivos: o arquivo do tema já é grande e quem só quer
 * responder não precisa baixar o texto de todos os comentários; e a
 * reimportação de um PDF reescreve o arquivo do tema, então guardar o
 * comentário fora dele é o que impede que ele se perca sem ninguém notar.
 */
export function carregarComentarios(slug: string): Promise<Arquivo> {
  let existente = carregados.get(slug)
  if (!existente) {
    existente = fetch(recurso(`acervo/comentarios/${slug}.json`), { cache: 'no-cache' })
      // Tema ainda sem nenhum comentário: o arquivo não existe e isso não é erro.
      .then((r) => {
        if (!r.ok) return {} as Arquivo
        // Um arquivo que não abre é defeito, não ausência: o índice promete
        // comentário, o leitor abre o gabarito e não encontra nada. Já
        // aconteceu — um arquivo de tema inteiro foi publicado truncado e o
        // silêncio daqui escondeu a perda. A tela continua servível, mas o
        // console passa a dizer o que houve.
        return (r.json() as Promise<Arquivo>).catch((erro) => {
          console.error(
            `Comentários de "${slug}" não puderam ser lidos: o arquivo está corrompido.`,
            erro,
          )
          return {} as Arquivo
        })
      })
      .catch(() => ({}))
    carregados.set(slug, existente)
  }
  return existente
}

const avulsos = new Map<string, Promise<ComentarioIA | null>>()

/**
 * O comentário de uma questão só. Busca acervo/c/<id>.json (1 a 3 KB) em vez
 * do arquivo do tema inteiro; se o tema já veio, ou o arquivo avulso faltar,
 * usa o do tema.
 */
export function carregarComentario(slug: string, id: string): Promise<ComentarioIA | null> {
  const doTema = carregados.get(slug)
  if (doTema) return doTema.then((arquivo) => arquivo[id] ?? null)
  let existente = avulsos.get(id)
  if (!existente) {
    existente = fetch(recurso(`acervo/c/${encodeURIComponent(id)}.json`), { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<ComentarioIA>) : Promise.reject(new Error(String(r.status)))))
      .catch(() => carregarComentarios(slug).then((arquivo) => arquivo[id] ?? null))
    avulsos.set(id, existente)
  }
  return existente
}

/** Adianta o comentário de uma questão que está na tela: ao responder, ele já chegou. */
export function preCarregarComentario(indice: Indice | null, questao: Questao | null) {
  if (!indice || !questao || questao.comentarioIA || !temComentario(indice, questao.id)) return
  const slug = slugDoTema(indice, questao)
  if (slug) void carregarComentario(slug, questao.id)
}

/** Slug do tema de uma questão, para achar o arquivo de comentários. */
export function slugDoTema(indice: Indice | null, questao: Questao): string | null {
  return indice?.temas.find((t) => t.nome === questao.tema)?.slug ?? null
}

/**
 * Ids que têm comentário, lidos do próprio índice (campo `c`).
 *
 * Sem isso, revelar o gabarito de uma questão de tema ainda não comentado
 * dispara um fetch de arquivo inexistente: o código trata o 404, mas o
 * navegador registra um erro no console e a rede carrega uma requisição inútil
 * a cada tema. Como o índice já sabe quem tem comentário, basta perguntar a
 * ele antes de sair buscando.
 */
let indiceDoConjunto: Indice | null = null
let conjuntoComentados: Set<string> = new Set()

function temComentario(indice: Indice | null, id: string): boolean {
  if (!indice) return false
  if (indice !== indiceDoConjunto) {
    indiceDoConjunto = indice
    conjuntoComentados = new Set(indice.questoes.filter((q) => q.c === 1).map((q) => q.id))
  }
  return conjuntoComentados.has(id)
}

/**
 * Comentário de IA de uma questão. Busca só o comentário daquela questão na
 * primeira vez que alguém revela o gabarito e reaproveita dali em diante.
 */
export function usarComentarioIA(questao: Questao, indice: Indice | null, ativo: boolean) {
  const [comentario, definir] = useState<ComentarioIA | null>(null)
  const [carregando, definirCarregando] = useState(false)
  const slug = slugDoTema(indice, questao)

  useEffect(() => {
    definir(null)
    if (!ativo || !slug) return
    // O que já veio dentro da questão vale mais: é o caso de um comentário
    // conferido e promovido para o próprio acervo.
    if (questao.comentarioIA) {
      definir(questao.comentarioIA)
      return
    }
    // O índice já diz quem tem comentário. Perguntar a ele evita baixar o
    // arquivo do tema — ou pedir um que nem existe — sem necessidade.
    if (!temComentario(indice, questao.id)) return
    let vivo = true
    definirCarregando(true)
    carregarComentario(slug, questao.id).then((achado) => {
      if (!vivo) return
      definir(achado)
      definirCarregando(false)
    })
    return () => {
      vivo = false
    }
  }, [questao.id, questao.comentarioIA, slug, ativo, indice])

  return { comentario, carregando: carregando && !comentario }
}
