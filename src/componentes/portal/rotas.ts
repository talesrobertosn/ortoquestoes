/**
 * O catálogo do menu (Portal do Aventureiro, 31/10/2026): todas as páginas do menu num lugar só, com o nome, a frase
 * curta, o ícone em pixel (public/pixel/menu/<icone>.png, scripts/gerar_icones_menu.py), as regras de acesso e as
 * palavras de quem procura (para a busca). O menu, a busca e os atalhos leem daqui: renomear aqui muda em todo lugar.
 */
export type IconeMenu =
  | 'treinar' | 'revisao' | 'flashcards' | 'cronograma' | 'resumos' | 'atlas'
  | 'cronograma-mao' | 'temas' | 'torneio' | 'simulado' | 'ranking' | 'liga' | 'conquistas'
  | 'desempenho' | 'erros' | 'favoritas' | 'relatorio' | 'conta' | 'assinatura' | 'indicar' | 'suporte' | 'projeto' | 'admin' | 'entrar'


export interface Pagina {
  destino: string
  rotulo: string
  texto: string
  icone: IconeMenu
  /** Recurso do assinante: quem não assina vê o cadeado e abre a prévia. */
  assinante?: boolean
  /** Selo discreto de novidade. */
  novo?: string
  /** Palavras de quem procura (sem acento). */
  chaves?: string
}

export const PRINCIPAIS: Pagina[] = [
  { destino: '/treinar', rotulo: 'Treinar', texto: 'Monte sua sessão de questões.', icone: 'treinar', chaves: 'questoes fazer praticar sessao estudar prova treino' },
  { destino: '/revisao', rotulo: 'Revisão', texto: 'Reveja o que precisa lembrar.', icone: 'revisao', chaves: 'revisar repeticao espacada voltar' },
  { destino: '/flashcards', rotulo: 'Flashcards', texto: 'Memorize com revisões rápidas.', icone: 'flashcards', chaves: 'cartas cards memorizar jogo' },
  { destino: '/cronograma', rotulo: 'Cronograma', texto: 'Seu plano, dia após dia.', icone: 'cronograma', assinante: true, chaves: 'plano de estudo calendario dia agenda meta' },
  { destino: '/resumos', rotulo: 'Resumos', texto: 'Estude pelos livros de referência.', icone: 'resumos', chaves: 'livro capitulo rockwood resumo biblioteca leitura ler classificacao campbell green' },
  { destino: '/atlas', rotulo: 'Atlas 3D', texto: 'Explore ossos, fraturas e anatomia.', icone: 'atlas', novo: 'Novo', chaves: 'anatomia 3d osso esqueleto classificacao fratura musculo nervo modelo tridimensional' },
]

export interface Grupo { id: string; titulo: string; itens: Pagina[] }

export const GRUPOS: Grupo[] = [
  {
    id: 'estudar', titulo: 'Estudar',
    itens: [
      { destino: '/cronograma-mao', rotulo: 'Cronograma da Mão', texto: 'Prepare-se para ingresso e título em Cirurgia da Mão.', icone: 'cronograma-mao', assinante: true, chaves: 'cirurgia da mao plano estudo sbcm simao ingresso titulo residencia data da prova' },
      { destino: '/temas-que-mais-caem', rotulo: 'Temas que mais caem', texto: 'Veja os assuntos mais cobrados por prova.', icone: 'temas', assinante: true, chaves: 'incidencia mais cobrado o que cai assuntos teot taro mao sbcm simao' },
      { destino: '/flashcards/cripta', rotulo: 'Torneio de Flashcards', texto: 'Aprenda com flashcards em formato de jogo.', icone: 'torneio', chaves: 'cripta jogo cartas torneio' },
    ],
  },
  {
    id: 'competir', titulo: 'Competir',
    itens: [
      { destino: '/simulado-nacional', rotulo: 'Simulado Nacional', texto: 'Teste seus conhecimentos em um simulado nacional.', icone: 'simulado', assinante: true, chaves: 'prova simulado nota posicao nacional' },
      { destino: '/ranking', rotulo: 'Ranking', texto: 'Acompanhe sua posição e evolução.', icone: 'ranking', chaves: 'posicao classificacao pontos missoes' },
      { destino: '/ligas', rotulo: 'Liga da Residência', texto: 'Participe da competição entre serviços.', icone: 'liga', assinante: true, chaves: 'liga servico residencia equipe' },
      { destino: '/conquistas', rotulo: 'Conquistas', texto: 'Explore seus emblemas e recompensas.', icone: 'conquistas', chaves: 'emblemas medalhas trofeus vitrine inventario' },
      { destino: '/bichos', rotulo: 'Sala dos bichos', texto: 'Conheça o esqueleto, o gato e a coruja.', icone: 'conquistas', novo: 'Novo', chaves: 'mascote mascotes gato coruja esqueleto album raridades bichos personagens' },
    ],
  },
  {
    id: 'acompanhar', titulo: 'Acompanhar',
    itens: [
      { destino: '/dados', rotulo: 'Seu desempenho', texto: 'Analise seus acertos e pontos de melhoria.', icone: 'desempenho', chaves: 'estatistica acerto desempenho grafico evolucao' },
      { destino: '/erros', rotulo: 'Caderno de erros', texto: 'Revisite as questões que você errou.', icone: 'erros', chaves: 'errei erradas erros' },
      { destino: '/favoritas', rotulo: 'Favoritas', texto: 'Acesse suas questões marcadas.', icone: 'favoritas', chaves: 'estrela salvas marcadas' },
      // O relatório chega por e-mail todo dia 1º (assinantes); a página da conta mostra a escolha de receber.
      { destino: '/conta', rotulo: 'Relatório do mês', texto: 'Consulte sua evolução mensal.', icone: 'relatorio', assinante: true, chaves: 'relatorio mensal evolucao mes email' },
    ],
  },
]

/** Conta e ajuda (montado na hora: depende de haver conta, assinatura e administrador). */
export function grupoConta(o: { contas: boolean; logado: boolean; premium: boolean; administrador: boolean }): Grupo {
  const itens: Pagina[] = []
  if (o.contas) itens.push(o.logado
    ? { destino: '/conta', rotulo: 'Minha conta', texto: 'Perfil, preferências e informações pessoais.', icone: 'conta', chaves: 'perfil login senha preferencias' }
    : { destino: '/conta?modo=entrar', rotulo: 'Entrar ou criar conta', texto: 'Guarde o progresso em qualquer aparelho.', icone: 'entrar', chaves: 'login entrar cadastro criar conta senha' })
  itens.push(o.premium
    ? { destino: '/conta/assinatura', rotulo: 'Minha assinatura', texto: 'Consulte plano, renovação e pagamentos.', icone: 'assinatura', chaves: 'assinatura plano renovacao pagamento cartao pix' }
    : { destino: '/assinatura', rotulo: 'Planos e assinatura', texto: 'Cronograma, Simulado Nacional e o Atlas completo.', icone: 'assinatura', chaves: 'assinar preco pagar pix cartao plano planos' })
  itens.push(
    { destino: '/indicar', rotulo: 'Indique e ganhe', texto: 'Compartilhe a plataforma e veja os benefícios.', icone: 'indicar', chaves: 'indicar convidar amigo colega ganhar' },
    { destino: '/contato', rotulo: 'Suporte e contato', texto: 'Envie dúvidas, sugestões e problemas.', icone: 'suporte', chaves: 'ajuda suporte duvida problema contato' },
    { destino: '/sobre', rotulo: 'O projeto', texto: 'Conheça a história e a proposta do OrtoQuestões.', icone: 'projeto', chaves: 'sobre historia quem faz' },
  )
  // Só aparece para quem o servidor confirma como administrador (eh_administrador); a página e os dados do painel
  // continuam protegidos no servidor (exigir_administrador), não só escondidos aqui.
  if (o.administrador) itens.push({ destino: '/admin', rotulo: 'Painel do administrador', texto: 'Gestão da plataforma.', icone: 'admin', chaves: 'admin administrador gestao painel' })
  return { id: 'conta', titulo: 'Conta e ajuda', itens }
}

/** Páginas que não estão no menu, mas que a busca deve achar. */
export const SO_NA_BUSCA: Pagina[] = [
  { destino: '/flashcards/biblioteca', rotulo: 'Estudar flashcards', texto: 'Direto para a Biblioteca: revisão calma, sem jogo.', icone: 'flashcards', chaves: 'flashcards biblioteca estudar calma' },
  { destino: '/resumos/frases', rotulo: 'Frases que caem', texto: 'Uma frase por assunto, dos comentários das questões de prova.', icone: 'resumos', chaves: 'resumao frases na prova vespera' },
  { destino: '/resumos/caderno', rotulo: 'Meu caderno de estudo', texto: 'Seus destaques e notas dos resumos.', icone: 'resumos', chaves: 'marcacoes notas grifos destaques caderno' },
]
