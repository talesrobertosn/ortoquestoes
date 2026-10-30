import { ler, gravar } from '../../estado/armazenamento'

/**
 * Segredos do salão da Biblioteca (pedido do Tales, 30/10/2026: "ainda mais easter eggs"). Regras puras,
 * sem React, para o teste fixtures/testar_salao_biblioteca.mjs. Os achados ficam na conta (chave local
 * `resumos:segredos`); a caderneta mostra a pista dos que faltam.
 */

export type IdSegredo =
  | 'passagem' | 'gato' | 'garden' | 'codman' | 'cafe' | 'gesso' | 'lowell' | 'coruja' | 'lanterna'
  | 'madrugada' | 'orto' | 'relogio' | 'escada' | 'cap404' | 'sazonal' | 'gatoMenu' | 'relogioMenu'

export interface Segredo { id: IdSegredo; nome: string; pista: string }

export const SEGREDOS: Segredo[] = [
  { id: 'passagem', nome: 'A passagem secreta', pista: 'Um livro torto nunca está ali por acaso.' },
  { id: 'gato', nome: 'O gato derrubou um livro', pista: 'Quem insiste em acordar o gato ganha uma leitura.' },
  { id: 'garden', nome: 'O jardim de Garden', pista: 'Busque quem classificou o colo do fêmur pelas trabéculas.' },
  { id: 'codman', nome: 'Os quatro fragmentos', pista: 'Busque quem dividiu o úmero proximal em quatro partes.' },
  { id: 'cafe', nome: 'Café de plantão', pista: 'Peça um café no fichário.' },
  { id: 'gesso', nome: 'O gato engessado', pista: 'O gato precisa de imobilização. Busque o material.' },
  { id: 'lowell', nome: 'A curva em S', pista: 'Busque o sinal das curvas suaves na junção cabeça-colo.' },
  { id: 'coruja', nome: 'Duzentos e setenta graus', pista: 'Insista com a coruja.' },
  { id: 'lanterna', nome: 'Leitura no escuro', pista: 'Apague todas as luzes do salão.' },
  { id: 'madrugada', nome: 'Plantão da madrugada', pista: 'Volte depois da meia-noite.' },
  { id: 'orto', nome: 'Bibliotecário honorário', pista: 'Digite o nome do site no teclado ou toque sete vezes na placa.' },
  { id: 'relogio', nome: 'Hora de estudar', pista: 'Mexa nos ponteiros do relógio.' },
  { id: 'escada', nome: 'O livro mais alto', pista: 'Suba a escada da biblioteca.' },
  { id: 'cap404', nome: 'O capítulo 404', pista: 'Procure um capítulo que ainda não foi escrito.' },
  { id: 'sazonal', nome: 'Visita de época', pista: 'Volte no fim de outubro ou em dezembro.' },
  { id: 'gatoMenu', nome: 'O gato fugiu para o menu', pista: 'Ele também cochila fora do salão.' },
  { id: 'relogioMenu', nome: 'Voltar no tempo', pista: 'No menu, o tempo também anda para trás.' },
]

const CHAVE = 'resumos:segredos'
export const segredosAchados = (): IdSegredo[] => ler<IdSegredo[]>(CHAVE, []).filter((id) => SEGREDOS.some((s) => s.id === id))
/** Marca o segredo; devolve true se é a primeira vez. */
export function acharSegredo(id: IdSegredo): boolean {
  const lista = segredosAchados()
  if (lista.includes(id)) return false
  gravar(CHAVE, [...lista, id])
  window.dispatchEvent(new CustomEvent<IdSegredo>(EVENTO_SEGREDO, { detail: id }))
  return true
}
export const EVENTO_SEGREDO = 'ortoquestoes:segredo'

/** Palavras do fichário que fazem alguma coisa no salão (sem acento, minúsculas, a busca inteira). */
export const PALAVRAS: Record<string, { segredo: IdSegredo; aviso: string }> = {
  garden: { segredo: 'garden', aviso: 'As plantas floresceram. Garden ficaria orgulhoso.' },
  codman: { segredo: 'codman', aviso: 'Quatro lamparinas, quatro fragmentos: cabeça, tubérculo maior, tubérculo menor e diáfise.' },
  cafe: { segredo: 'cafe', aviso: 'Café servido. Os resumos mais curtos estão na mesa.' },
  gesso: { segredo: 'gesso', aviso: 'O gato foi imobilizado. Retorno em 4 semanas.' },
  lowell: { segredo: 'lowell', aviso: 'Curvas suaves em S: o gato se espreguiçou do jeito certo.' },
}
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
/** Só as palavras do dicionário: "constructor" ou "__proto__" na busca não viram palavra mágica. */
export const palavraMagica = (busca: string) => { const p = normalizar(busca); return Object.prototype.hasOwnProperty.call(PALAVRAS, p) ? PALAVRAS[p] : null }

/** Época do ano no salão: abóboras de 24 a 31 de outubro, pisca-pisca em dezembro. */
export function epoca(d: Date): 'halloween' | 'natal' | null {
  const m = d.getMonth() + 1, dia = d.getDate()
  if (m === 10 && dia >= 24) return 'halloween'
  if (m === 12) return 'natal'
  return null
}
/** Da meia-noite às 5 h: o salão entra em plantão. */
export const madrugada = (d: Date) => d.getHours() < 5

/** Dias até a próxima data de prova (inteiro, 0 no dia), ou null se nenhuma estiver por vir. */
export function diasAteProva(hoje: Date, datas: readonly string[]): number | null {
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const dias = datas.map((s) => { const [a, m, d] = s.split('-').map(Number); return Math.round((Date.UTC(a, m - 1, d) - base) / 86400000) }).filter((n) => n >= 0)
  return dias.length ? Math.min(...dias) : null
}

/** O quanto o capítulo cai na prova, como raridade de item: pelas questões de prova citadas no resumo. */
export type Raridade = 'comum' | 'raro' | 'epico' | 'lendario'
export function raridade(questoes: number): Raridade {
  return questoes >= 80 ? 'lendario' : questoes >= 40 ? 'epico' : questoes >= 15 ? 'raro' : 'comum'
}
export const NOME_RARIDADE: Record<Raridade, string> = { comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' }
