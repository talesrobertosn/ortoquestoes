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
 * Comentário de IA de uma questão. Busca o arquivo do tema na primeira vez que
 * alguém revela um gabarito daquele tema e reaproveita dali em diante.
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
    carregarComentarios(slug).then((arquivo) => {
      if (!vivo) return
      definir(arquivo[questao.id] ?? null)
      definirCarregando(false)
    })
    return () => {
      vivo = false
    }
  }, [questao.id, questao.comentarioIA, slug, ativo, indice])

  return { comentario, carregando: carregando && !comentario }
}
