import type { NomeIcone } from '../componentes/Icone'

/*
 * Motivos e perguntas do suporte (/contato), reorganizados em 03/11/2026 a pedido do Tales.
 * Sem React, para testar (fixtures/testar_suporte.mjs). A função supabase/functions/suporte
 * repete os ids e os títulos: mudar aqui exige mudar lá.
 *
 * Em vez de um modelo de texto para completar no meio, cada motivo traz um exemplo no campo
 * vazio, dicas do que ajuda contar e, quando faz sentido, perguntas de um toque (plano e forma
 * de pagamento) que chegam organizadas no e-mail.
 */

export type MotivoSuporte = 'pagar' | 'assinatura' | 'acesso' | 'questao' | 'dados' | 'outro'

export interface Motivo {
  id: MotivoSuporte
  titulo: string
  descricao: string
  icone: NomeIcone
  exemplo: string
  dicas: readonly string[]
  /** Pergunta plano e forma de pagamento com botões de um toque. */
  perguntaPagamento?: boolean
}

export const MOTIVOS: readonly Motivo[] = [
  {
    id: 'pagar', titulo: 'Não consegui assinar ou pagar', descricao: 'Erro no Pix, no cartão ou no botão de assinar.', icone: 'alerta',
    exemplo: 'Ex.: cliquei em "Gerar Pix" e apareceu uma mensagem de erro. Tentei de novo e aconteceu a mesma coisa.',
    dicas: ['O que você clicou e o que apareceu na tela', 'Se tentou mais de uma vez', 'Se chegou a ser cobrado'],
    perguntaPagamento: true,
  },
  {
    id: 'assinatura', titulo: 'Minha assinatura', descricao: 'Renovação, cancelamento, reembolso ou cobrança.', icone: 'medalha',
    exemplo: 'Ex.: quero desligar a renovação automática, mas não encontrei onde.',
    dicas: ['O que você quer fazer ou o que estranhou', 'A data aproximada da cobrança, se for sobre ela'],
    perguntaPagamento: true,
  },
  {
    id: 'acesso', titulo: 'Acesso à conta', descricao: 'Entrar, senha ou progresso que sumiu.', icone: 'cadeado',
    exemplo: 'Ex.: troquei de celular e, ao entrar, meu progresso não apareceu.',
    dicas: ['O e-mail da conta, se for outro', 'O aparelho e a mensagem que apareceu', 'Nunca mande senha ou código'],
  },
  {
    id: 'questao', titulo: 'Erro em questão', descricao: 'Gabarito, enunciado, imagem ou comentário.', icone: 'livro',
    exemplo: 'Ex.: o gabarito diz B, mas o comentário explica a alternativa C.',
    dicas: ['O número da questão', 'O que está errado e o que você esperava', 'A fonte, se tiver (livro e página)'],
  },
  {
    id: 'dados', titulo: 'Meus dados', descricao: 'Privacidade, exportação ou exclusão da conta.', icone: 'usuario',
    exemplo: 'Ex.: quero saber quais dados meus ficam guardados.',
    dicas: ['O que você quer saber ou pedir'],
  },
  {
    id: 'outro', titulo: 'Sugestão ou outro assunto', descricao: 'Ideia, elogio ou qualquer dúvida.', icone: 'correio',
    exemplo: 'Ex.: seria ótimo poder filtrar as questões por ano da prova.',
    dicas: ['Pode escrever do seu jeito'],
  },
]

export const PLANOS_SUPORTE = ['Mensal', 'Semestral', 'Anual', 'Não sei'] as const
export const MEIOS_SUPORTE = ['Pix', 'Cartão', 'Não cheguei a escolher'] as const

export const motivo = (id: MotivoSuporte) => MOTIVOS.find((m) => m.id === id) ?? MOTIVOS[MOTIVOS.length - 1]

/** O motivo que a página abre, pelo link que trouxe a pessoa (?assunto=… ou ?questao=…). */
export function motivoInicial(consulta: URLSearchParams): MotivoSuporte {
  if (consulta.has('questao')) return 'questao'
  const assunto = consulta.get('assunto')
  if (assunto === 'exclusao-conta') return 'dados'
  if (assunto === 'sincronizacao') return 'acesso'
  if (assunto === 'assinatura' || assunto === 'pagar') return assunto
  return 'outro'
}

/** Pedido formal de exclusão: o único caso em que a mensagem já vem escrita. */
export const TEXTO_EXCLUSAO = 'Solicito a exclusão da minha conta e dos dados pessoais associados.'

/** As respostas de um toque, na ordem em que chegam no e-mail (só as preenchidas). */
export function camposDoMotivo(id: MotivoSuporte, respostas: { plano?: string; meio?: string; questao?: string }): Array<[string, string]> {
  const campos: Array<[string, string]> = []
  if (motivo(id).perguntaPagamento) {
    if (respostas.plano) campos.push(['Plano', respostas.plano])
    if (respostas.meio) campos.push(['Pagamento', respostas.meio])
  }
  if (id === 'questao' && respostas.questao?.trim()) campos.push(['Questão', respostas.questao.trim()])
  return campos
}

/** Linha de assunto do e-mail: "[Suporte] Não consegui assinar ou pagar · Maria". */
export function assuntoSuporte(id: MotivoSuporte, nome: string, questao?: string, exclusao = false) {
  const titulo = exclusao ? 'Pedido de exclusão da conta' : id === 'questao' && questao?.trim() ? `Erro na questão ${questao.trim()}` : motivo(id).titulo
  return `[Suporte] ${titulo}${nome.trim() ? ` · ${nome.trim()}` : ''}`
}
