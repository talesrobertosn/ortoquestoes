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

/**
 * `url("…")` com endereço absoluto, para usar em variável CSS (`--sprite`, `--arte`).
 * Um url() relativo dentro de variável é resolvido a partir da folha de estilo que o
 * usa (assets/), não da página: com base './' a imagem some no site publicado.
 */
export function urlCss(caminho: string): string {
  const rel = recurso(caminho)
  const abs = typeof document === 'undefined' ? rel : new URL(rel, document.baseURI).href
  return `url("${abs}")`
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
 * Limite diário do gratuito ligado (VITE_LIMITES_HABILITADOS, vindo das vars do
 * GitHub no build). Fonte única: `estado/limiteDiario` reexporta este valor.
 */
export const LIMITES_HABILITADOS = import.meta.env?.VITE_LIMITES_HABILITADOS === 'true'

/**
 * Todos os textos do site sobre o que o gratuito dá, num lugar só. Cada uso tem
 * a versão com o limite diário ligado e a versão com ele desligado: assim
 * nenhum texto promete ou avisa limite quando ele está desligado, nem fala em
 * "sem limite" quando ele está ligado. O número só aparece onde já aparecia
 * (Termos, Condições, planos e cronograma da capa).
 */
function frasesGratis(): Record<UsoFraseGratis, readonly [ligado: string, desligado: string]> {
  const n = LIMITE_GRATIS_ATUAL
  return {
    /** Convites e portões de conta. */
    frase: ['A conta é grátis e libera um número limitado de questões a cada 24 horas. Para estudar sem limite, há os planos.',
      'A conta é grátis e, nesta fase, sem limite diário de questões. Os planos trazem o cronograma e o Simulado Nacional.'],
    /** Entre parênteses ou no fim de uma frase. */
    curto: ['com um número limitado de questões a cada 24 horas', 'sem limite diário nesta fase'],
    /** Rodapé da tela de entrar. */
    rodape: ['No gratuito, um número limitado de questões a cada 24 horas; sem limite, nos planos.',
      'Nesta fase, o gratuito está sem limite diário de questões.'],
    /** Mensagem de indicação (WhatsApp). */
    convite: ['A conta é grátis e libera um número limitado de questões a cada 24 horas; os planos liberam sem limite.',
      'A conta é grátis e, nesta fase, sem limite diário de questões.'],
    /** Aviso para visitante no Treinar. */
    treinar: ['No gratuito, você responde um número limitado de questões a cada 24 horas; os planos liberam sem limite.',
      'Nesta fase, o gratuito está sem limite diário de questões.'],
    /** Complemento de "A conta é grátis" no portão de conta. */
    exige: ['e libera um número limitado de questões a cada 24 horas.', 'e, nesta fase, sem limite diário de questões.'],
    exigePlanos: ['Para estudar sem limite,', 'Para o cronograma e o Simulado Nacional,'],
    /** Página do projeto (Sobre), em "Como funciona hoje". */
    sobre: ['O gratuito libera um número limitado de questões a cada 24 horas; os planos, opcionais, liberam sem limite e trazem o cronograma e o Simulado Nacional.',
      'Nesta fase, o gratuito está sem limite diário de questões; os planos, opcionais, trazem o cronograma e o Simulado Nacional.'],
    /** Atalho para os planos na capa. */
    cartaoPlanos: ['Cronograma pelo que mais cai, Simulado Nacional e questões sem limite.', 'Cronograma pelo que mais cai e Simulado Nacional.'],
    /** Oferta de quando a cota acaba (só aparece com o limite ligado). */
    projeto: ['O Orto Questões é um projeto independente: a assinatura paga o site e mantém para todo mundo o gratuito, com um número limitado de questões a cada 24 horas.',
      'O Orto Questões é um projeto independente: a assinatura paga o site e mantém o gratuito para todo mundo.'],
    /** Cronograma da capa, quando o ritmo escolhido passa do gratuito. */
    ritmo: [`O gratuito libera ${n} a cada 24 horas. Nesse ritmo, o plano libera sem limite.`, ''],
    /** Página de planos: título da comparação e linha "Questões por dia". */
    comparacaoTitulo: ['O gratuito é generoso. O assinante vai além.', 'O acervo é de todos. O assinante vai além.'],
    questoesPorDia: [`${n} a cada 24 horas`, 'Sem limite nesta fase'],
    flashcardsPorDia: ['10 a cada 24 horas', 'Sem limite nesta fase'],
    /** Página de planos: pergunta "Como funciona o limite do plano gratuito?". */
    perguntaPlanos: [`O gratuito tem um número limitado de respostas novas (hoje, ${n}) a cada 24 horas. O relógio começa na primeira questão respondida e, 24 horas depois, a cota volta inteira; o site mostra quanto falta.`,
      `O limite diário está desligado nesta fase, portanto o acesso gratuito também está sem limite de respostas. Se o limite for ativado, o patamar gratuito previsto é de ${n} respostas novas a cada 24 horas.`],
    /** Termos de Uso, item 7.1 (texto jurídico: mudar só com nova versão dos Termos). */
    termos: [`O plano gratuito permite registrar um número limitado de novas respostas a cada período de 24 horas, atualmente ${n}; o período começa na primeira resposta registrada e, ao final dele, a cota é renovada integralmente. Esse número pode ser alterado pelo ${SITE.nome}, com aviso no site.`,
      `Nesta fase, o plano gratuito permite responder sem limite diário, por decisão operacional do ${SITE.nome}. O limite gratuito planejado, mas ainda desligado, é de ${n} respostas novas por dia.`],
    /** Termos de Uso, resumo em linguagem direta. */
    termosResumo: [`o acesso gratuito permite um número limitado de novas respostas a cada 24 horas (atualmente ${n})`, 'o acesso gratuito está sem limite diário nesta fase'],
    /** Condições da Assinatura. */
    condicoes: [`O acesso gratuito permite registrar um número limitado de novas respostas a cada período de 24 horas, atualmente ${n}; o período começa na primeira resposta registrada e, ao final dele, a cota é renovada integralmente. A assinatura oferece respostas novas sem esse limite durante o período pago.`,
      `Nesta fase, o acesso gratuito está sem limite diário de respostas, por decisão operacional do projeto. A assinatura assegura acesso sem limite diário durante o período pago caso o limite gratuito planejado de ${n} novas respostas por dia venha a ser ativado.`],
  }
}
export type UsoFraseGratis = 'frase' | 'curto' | 'rodape' | 'convite' | 'treinar' | 'exige' | 'exigePlanos' | 'sobre' | 'cartaoPlanos' | 'projeto' | 'ritmo'
  | 'comparacaoTitulo' | 'questoesPorDia' | 'flashcardsPorDia' | 'perguntaPlanos' | 'termos' | 'termosResumo' | 'condicoes'

/** O texto do gratuito para cada lugar do site, conforme o limite diário esteja ligado ou não. */
export function fraseGratis(uso: UsoFraseGratis = 'frase', limites: boolean = LIMITES_HABILITADOS): string {
  const [ligado, desligado] = frasesGratis()[uso]
  return limites ? ligado : desligado
}

/** Prefixo de todas as chaves gravadas no localStorage. */
export const PREFIXO_ARMAZENAMENTO = 'ortoquestoes:'
