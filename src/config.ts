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
  nome: 'Orto Questões',
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
 * Flashcards (docs/flashcards/). Beta público desde 13/10/2026: menu, central
 * em #/flashcards, quadro na capa, ranking e planos (LANCAMENTO-BETA.md). As
 * travas abaixo seguem existindo para desligar cada parte; o publicar.yml liga todas.
 */
export const FLASHCARDS_LIBERADO = true
export const FLASHCARDS_NO_MENU = import.meta.env.DEV || import.meta.env?.VITE_FLASHCARDS === '1'
/**
 * Travas de cada parte do beta (todas ligadas no publicar.yml desde 13/10/2026):
 *  - VITE_FLASHCARDS_CAPA=1: quadro dos flashcards na página inicial;
 *  - VITE_FLASHCARDS_RANKING=1: ranking da Cripta (Normal e Difícil) no servidor;
 *  - VITE_FLASHCARDS_VENDA=1: flashcards na página de planos.
 */
export const FLASHCARDS_NA_CAPA = import.meta.env?.VITE_FLASHCARDS_CAPA === '1'
export const FLASHCARDS_RANKING = import.meta.env.DEV || import.meta.env?.VITE_FLASHCARDS_RANKING === '1'
export const FLASHCARDS_NA_VENDA = import.meta.env?.VITE_FLASHCARDS_VENDA === '1'

/**
 * Questões grátis por dia no momento. Quem decide de verdade é o painel
 * (Configurações > Limite gratuito); este número só aparece nos Termos, nas
 * Condições da Assinatura e na página de planos. Ao mudar no painel, mude aqui
 * também. Os demais textos do site falam em "um número limitado por dia".
 */
export const LIMITE_GRATIS_ATUAL = 20

/**
 * O que o gratuito dá, num lugar só. Com o limite diário desligado
 * (VITE_LIMITES_HABILITADOS), nenhum texto do site promete ou avisa limite:
 * antes, oito componentes falavam em limite mesmo com ele desligado, enquanto
 * a página de planos dizia "sem limite nesta fase".
 */
const LIMITE_LIGADO = import.meta.env?.VITE_LIMITES_HABILITADOS === 'true'
export const TEXTO_GRATIS = LIMITE_LIGADO ? {
  /** Convites e portões de conta. */
  frase: 'A conta é grátis e libera um número limitado de questões a cada 24 horas. Para estudar sem limite, há os planos.',
  /** Entre parênteses, no meio de uma frase. */
  curto: 'com um número limitado de questões a cada 24 horas',
  /** Rodapé da tela de entrar. */
  rodape: 'No gratuito, um número limitado de questões a cada 24 horas; sem limite, nos planos.',
  /** Mensagem de indicação (WhatsApp). */
  convite: 'A conta é grátis e libera um número limitado de questões a cada 24 horas; os planos liberam sem limite.',
  /** Aviso para visitante no Treinar. */
  treinar: 'No gratuito, você responde um número limitado de questões a cada 24 horas; os planos liberam sem limite.',
  /** Complemento de "A conta é grátis" no portão de conta. */
  exige: 'e libera um número limitado de questões a cada 24 horas.',
  exigePlanos: 'Para estudar sem limite,',
} : {
  frase: 'A conta é grátis e, nesta fase, sem limite diário de questões. Os planos trazem o cronograma e o Simulado Nacional.',
  curto: 'sem limite diário nesta fase',
  rodape: 'Nesta fase, o gratuito está sem limite diário de questões.',
  convite: 'A conta é grátis e, nesta fase, sem limite diário de questões.',
  treinar: 'Nesta fase, o gratuito está sem limite diário de questões.',
  exige: 'e, nesta fase, sem limite diário de questões.',
  exigePlanos: 'Para o cronograma e o Simulado Nacional,',
}
/** Frase curta para convites: o que o gratuito dá e o que os planos acrescentam. */
export const FRASE_GRATIS = TEXTO_GRATIS.frase

/** Prefixo de todas as chaves gravadas no localStorage. */
export const PREFIXO_ARMAZENAMENTO = 'ortoquestoes:'
