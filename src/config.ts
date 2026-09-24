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
    'Banco de questões de ortopedia e traumatologia com provas anteriores do TEOT, do TARO e do R4 do ENARE, organizadas por assunto, com comentários de IA e da comunidade.',
  /** Endereço público, usado em canonical, Open Graph e sitemap. */
  url: 'https://ortoquestoes.com.br/',
  autor: 'Tales',
  contato: 'talesroberto23@gmail.com',
  /** Perfil público do projeto. O @ sem arroba serve de rótulo visível. */
  instagram: 'https://www.instagram.com/ortoquestoes',
  instagramUsuario: 'ortoquestoes',
} as const

/**
 * Nome da etiqueta das questões elaboradas pelo site no padrão de uma prova
 * (campo `simulado` da questão). Ela se soma à prova, que continua sendo a da
 * prova de referência. É por essa etiqueta que um acesso de assinante poderá
 * ser aplicado.
 */
export const ROTULO_SIMULADOS = 'OrtoQuestões Simulados'

/** Prefixo de todas as chaves gravadas no localStorage. */
export const PREFIXO_ARMAZENAMENTO = 'ortoquestoes:'
