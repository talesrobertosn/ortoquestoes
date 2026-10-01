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
    'Banco de questões de ortopedia e traumatologia com provas anteriores do TEOT, do TARO e do R4 do ENARE, organizadas por assunto, com comentários baseados na bibliografia de referência e contribuições da comunidade.',
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

/**
 * Por enquanto, ver questões e montar sessões de treino exige conta. As páginas
 * com questões (treinar, sessão, questão, revisão, favoritas, caderno de erros,
 * resumo e simulado nacional) mostram o convite para criar a conta a quem não
 * entrou. Para liberar de novo, trocar para false.
 */
export const EXIGIR_CONTA_PARA_QUESTOES = true

/**
 * Questões grátis por dia no momento. Quem decide de verdade é o painel
 * (Configurações > Limite gratuito); este número só aparece nos Termos, nas
 * Condições da Assinatura e na página de planos. Ao mudar no painel, mude aqui
 * também. Os demais textos do site falam em "um número limitado por dia".
 */
export const LIMITE_GRATIS_ATUAL = 20

/** Frase curta para convites: o que o gratuito dá e que os planos tiram o limite. */
export const FRASE_GRATIS = 'A conta é grátis e libera um número limitado de questões por dia, renovado todos os dias. Para estudar sem limite, há os planos.'

/** Prefixo de todas as chaves gravadas no localStorage. */
export const PREFIXO_ARMAZENAMENTO = 'ortoquestoes:'
