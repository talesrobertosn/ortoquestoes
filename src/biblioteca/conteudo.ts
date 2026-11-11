import { recurso } from '../config'
import type { Bloco, Capitulo, IndiceBiblioteca, IndiceBibliotecaLeve } from './tipos'
import { ehTexto } from './tipos'

/**
 * Conteúdo da Biblioteca: um índice pequeno e um arquivo por capítulo (public/biblioteca/),
 * baixados só quando abertos. Nada do livro inteiro é carregado de uma vez.
 */

let indice: Promise<IndiceBiblioteca> | null = null
let indiceEmMemoria: IndiceBiblioteca | null = null
/** O índice da Biblioteca, se alguma tela já o carregou (o menu não baixa por conta própria). */
export const indiceBibliotecaCarregado = () => indiceEmMemoria
const capitulos = new Map<string, Promise<Capitulo | null>>()

export function carregarIndiceBiblioteca(): Promise<IndiceBiblioteca> {
  indice ??= fetch(recurso('biblioteca/indice.json'), { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(`Índice da biblioteca: ${r.status}`)
    return r.json() as Promise<IndiceBiblioteca>
  }).then((i) => (indiceEmMemoria = i)).catch((e) => { indice = null; throw e })
  return indice
}

let indiceLeve: Promise<IndiceBibliotecaLeve> | null = null
/**
 * O índice sem as seções, para as caixas de sugestão. Se o índice completo já está na memória, serve ele; se o
 * leve não existir (no `vite dev` ele não é gerado), cai no completo.
 */
export function carregarIndiceBibliotecaLeve(): Promise<IndiceBibliotecaLeve> {
  if (indiceEmMemoria) return Promise.resolve(indiceEmMemoria)
  indiceLeve ??= fetch(recurso('biblioteca/indice-leve.json'), { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() as Promise<IndiceBibliotecaLeve> : carregarIndiceBiblioteca()))
    .catch((e) => { indiceLeve = null; throw e })
  return indiceLeve
}

export function carregarCapitulo(id: string): Promise<Capitulo | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return Promise.resolve(null)
  let p = capitulos.get(id)
  if (!p) {
    p = fetch(recurso(`biblioteca/capitulos/${id}.json`), { cache: 'no-cache' }).then((r) => r.status === 404 ? null : r.ok ? r.json() as Promise<Capitulo> : Promise.reject(new Error(`Capítulo: ${r.status}`)))
      .catch((e) => { capitulos.delete(id); throw e })
    capitulos.set(id, p)
  }
  return p
}

/** Trecho de texto com negrito (o único realce do formato de autoria: **assim**). */
export interface Pedaco { texto: string; negrito: boolean }

export function pedacos(t: string): Pedaco[] {
  const r: Pedaco[] = []
  const partes = t.split('**')
  partes.forEach((p, i) => { if (p) r.push({ texto: p, negrito: i % 2 === 1 }) })
  return r
}

/** O texto puro de um bloco: é sobre ele que as marcações contam caracteres. */
export const textoPuro = (t: string) => t.replace(/\*\*/g, '')

/** Ordem e texto puro dos blocos de texto de um capítulo (para ancorar e reencontrar marcações). */
export function textosDoCapitulo(c: Capitulo): { ordem: string[]; textos: Map<string, string>; secaoDe: Map<string, string> } {
  const ordem: string[] = [], textos = new Map<string, string>(), secaoDe = new Map<string, string>()
  for (const s of c.secoes) for (const b of s.blocos) {
    secaoDe.set(b.id, s.id)
    if (ehTexto(b)) { ordem.push(b.id); textos.set(b.id, textoPuro(b.t)) }
  }
  return { ordem, textos, secaoDe }
}

/** Questões de prova real de um bloco de questões (central primeiro). */
export const questoesReais = (b: Extract<Bloco, { tipo: 'questoes' }>) => [...b.central, ...b.relacionadas.filter((q) => !b.central.includes(q))]
