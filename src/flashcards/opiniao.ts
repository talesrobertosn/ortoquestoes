/**
 * Opiniões do beta público dos flashcards (13/10/2026). Vão para a tabela
 * opinioes_flashcards pela RPC enviar_opiniao_flashcards (SQL parte 18). Nada de
 * print, resposta médica ou dado pessoal: só notas, a categoria e dois textos.
 */
import { gravar, ler } from '../estado/armazenamento'
import { chamarRpc } from '../servicos/supabase'

export type CategoriaOpiniao = 'som' | 'visual' | 'desempenho' | 'conteudo' | 'outro'
export type OrigemOpiniao = 'central' | 'fim_sessao' | 'fim_partida' | 'convite'

export const CATEGORIAS_OPINIAO: Array<{ id: CategoriaOpiniao; nome: string }> = [
  { id: 'som', nome: 'Som' },
  { id: 'visual', nome: 'Visual' },
  { id: 'desempenho', nome: 'Desempenho' },
  { id: 'conteudo', nome: 'Conteúdo' },
  { id: 'outro', nome: 'Outro' },
]

export interface Opiniao {
  categoria: CategoriaOpiniao
  facil: number | null
  visual: number | null
  som: 'sim' | 'nao' | 'nao_testei' | null
  problema: string
  melhorar: string
  origem: OrigemOpiniao
}

export function aparelhoAtual(): 'celular' | 'tablet' | 'computador' {
  if (typeof window === 'undefined') return 'computador'
  const toque = window.matchMedia?.('(pointer: coarse)').matches
  const menor = Math.min(window.screen?.width ?? 1024, window.screen?.height ?? 768)
  return !toque ? 'computador' : menor < 600 ? 'celular' : 'tablet'
}

/** Traduz o erro do servidor em uma frase; nunca diz que deu certo quando não deu. */
export function mensagemDeErro(falha: unknown): string {
  const texto = falha instanceof Error ? falha.message : String(falha)
  if (texto.includes('muitas_opinioes')) return 'Você já mandou várias opiniões nesta hora. Tente de novo mais tarde.'
  if (texto.includes('opiniao_vazia')) return 'Escolha uma nota ou escreva alguma coisa antes de enviar.'
  if (texto.includes('Entre na sua conta')) return 'Entre na sua conta para enviar a opinião.'
  return 'Não conseguimos enviar agora. Confira a internet e tente de novo; o texto continua aqui.'
}

export async function enviarOpiniao(o: Opiniao): Promise<number> {
  const id = await chamarRpc<number>('enviar_opiniao_flashcards', {
    p_categoria: o.categoria, p_facil: o.facil, p_visual: o.visual, p_som: o.som,
    p_problema: o.problema.trim().slice(0, 1500) || null, p_melhorar: o.melhorar.trim().slice(0, 1500) || null,
    p_origem: o.origem, p_aparelho: aparelhoAtual(),
  })
  gravar(CHAVE_ENVIADA, Date.now())
  return id
}

/* Convite discreto: depois de 3 sessões terminadas, uma vez; some se a pessoa fechar ou já tiver mandado. */
const CHAVE_SESSOES = 'flashcards:opiniao-sessoes'
const CHAVE_DISPENSADO = 'flashcards:opiniao-dispensada'
const CHAVE_ENVIADA = 'flashcards:opiniao-enviada'
export const SESSOES_PARA_CONVITE = 3

export function contarSessaoTerminada() { gravar(CHAVE_SESSOES, ler<number>(CHAVE_SESSOES, 0) + 1) }
export function deveConvidar() {
  return ler<number>(CHAVE_SESSOES, 0) >= SESSOES_PARA_CONVITE && !ler<number>(CHAVE_DISPENSADO, 0) && !ler<number>(CHAVE_ENVIADA, 0)
}
export function dispensarConvite() { gravar(CHAVE_DISPENSADO, Date.now()) }
