/**
 * Configuração de endereço do site.
 *
 * `import.meta.env.BASE_URL` vem do campo `base` do vite.config.ts — o único
 * lugar onde o caminho de publicação é definido. Tudo aqui deriva dele, para
 * que a mudança de usuario.github.io/ortoquestoes para ortoquestoes.com.br
 * não exija alteração de código.
 */
export const BASE = import.meta.env.BASE_URL

/** Caminho de um recurso estático dentro de public/. */
export function recurso(caminho: string): string {
  return BASE + caminho.replace(/^\/+/, '')
}

export const SITE = {
  nome: 'OrtoQuestões',
  descricao:
    'Questões de provas anteriores de TEOT e TARO organizadas por assunto, ano e tipo de prova. Sem cadastro, sem custo.',
  autor: 'Tales',
  contato: 'contato@ortoquestoes.com.br',
} as const

/** Prefixo de todas as chaves gravadas no localStorage. */
export const PREFIXO_ARMAZENAMENTO = 'ortoquestoes:'
