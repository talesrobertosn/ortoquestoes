import type { Rota } from '../../util/rotas'
import type { IdComportamento } from '../mascote/comportamentos'

/**
 * A Vila do Orto (30/10/2026, brainstorm aprovado pelo Tales): cada página de uso frequente é um lugar pintado da
 * mesma vila, com a luz da hora do dia. A fantasia fica só na arte: os nomes que aparecem são os do site.
 * Cada lugar aponta para outros (as placas do topo e as portas do fim da página), e o conjunto vira o mapa da vila.
 * As artes ficam em public/pixel/paginas/<lugar>-<periodo>[-960].webp (scripts/gerar_cena_*.py).
 */
export type IdLugar =
  | 'arena' | 'trofeus' | 'torre' | 'estrada' | 'ferreiro' | 'jardim' | 'taverna' | 'biblioteca'
  | 'observatorio' | 'quarto' | 'bau' | 'correio' | 'guilda' | 'conselho'

/** Retângulo na arte (480 x 160). */
export interface Caixa { x: number; y: number; w: number; h: number }

export interface Lugar {
  id: IdLugar
  /** Nome da página no site (é o que aparece). */
  pagina: string
  destino: string
  /** Uma linha para a porta e o mapa. */
  texto: string
  /** Céu aberto: nuvens, sol, estrelas e chuva; os de dentro ganham poeira na luz e brasas. */
  exterior: boolean
  mascote: IdComportamento
  /** O segredo da cena: onde clicar e o que o mascote responde. */
  segredo: Caixa & { fala: string }
  /** Para onde as placas e as portas levam. */
  saidas: IdLugar[]
}

export const LUGARES: Record<IdLugar, Lugar> = {
  arena: { id: 'arena', pagina: 'Ranking', destino: '/ranking', texto: 'Quem mais respondeu questões no mês.', exterior: true, mascote: 'malabares',
    segredo: { x: 380, y: 30, w: 50, h: 40, fala: 'A torcida grita o seu apelido. Ou era "fratura de Colles"?' }, saidas: ['trofeus', 'guilda', 'observatorio'] },
  trofeus: { id: 'trofeus', pagina: 'Conquistas', destino: '/conquistas', texto: 'Seus emblemas e os que estão quase lá.', exterior: false, mascote: 'reflexo',
    segredo: { x: 230, y: 40, w: 50, h: 50, fala: 'Esta taça tem uma rachadura igual à minha. Coincidência.' }, saidas: ['arena', 'observatorio', 'torre'] },
  torre: { id: 'torre', pagina: 'Revisão', destino: '/revisao', texto: 'As questões que vencem hoje para revisar.', exterior: true, mascote: 'parado',
    segredo: { x: 250, y: 10, w: 50, h: 50, fala: 'O relógio da torre atrasa 5 minutos. Igual ao centro cirúrgico.' }, saidas: ['estrada', 'ferreiro', 'taverna'] },
  estrada: { id: 'estrada', pagina: 'Cronograma', destino: '/cronograma', texto: 'O plano da semana até o dia da prova.', exterior: true, mascote: 'alongar',
    segredo: { x: 209, y: 104, w: 17, h: 34, fala: 'Achou a muleta! Quem pula as semanas do Cronograma chega na prova assim.' }, saidas: ['torre', 'biblioteca', 'observatorio'] },
  ferreiro: { id: 'ferreiro', pagina: 'Caderno de erros', destino: '/erros', texto: 'As questões que você errou, para acertar de novo.', exterior: false, mascote: 'raiox',
    segredo: { x: 302, y: 24, w: 22, h: 26, fala: 'Molde aprovado: este fêmur já foi reforjado nove vezes. Seus erros também têm conserto.' }, saidas: ['torre', 'biblioteca', 'jardim'] },
  jardim: { id: 'jardim', pagina: 'Favoritas', destino: '/favoritas', texto: 'As questões que você guardou.', exterior: true, mascote: 'cafe',
    segredo: { x: 287, y: 103, w: 21, h: 28, fala: 'Essa fratura consolidou tão bem que até floresceu. Retirada do gesso só em 6 semanas!' }, saidas: ['ferreiro', 'taverna', 'torre'] },
  taverna: { id: 'taverna', pagina: 'Flashcards', destino: '/flashcards', texto: 'Cartões rápidos para fixar o que cai.', exterior: false, mascote: 'malabares',
    segredo: { x: 403, y: 36, w: 57, h: 17, fala: 'Troféu da casa: o único fêmur daqui que nunca precisou de haste intramedular.' }, saidas: ['biblioteca', 'torre', 'arena'] },
  biblioteca: { id: 'biblioteca', pagina: 'Resumos', destino: '/resumos', texto: 'Os capítulos resumidos, do jeito que cai.', exterior: false, mascote: 'ler',
    segredo: { x: 200, y: 30, w: 60, h: 50, fala: 'Shh. A coruja está lendo o capítulo de coluna.' }, saidas: ['ferreiro', 'taverna', 'estrada'] },
  observatorio: { id: 'observatorio', pagina: 'Desempenho', destino: '/dados', texto: 'Seu acerto por área e o que treinar a seguir.', exterior: false, mascote: 'raiox',
    segredo: { x: 194, y: 74, w: 40, h: 74, fala: 'Até os astros concordam: fêmur proximal cai em toda prova.' }, saidas: ['ferreiro', 'estrada', 'arena'] },
  quarto: { id: 'quarto', pagina: 'Minha conta', destino: '/conta', texto: 'Perfil, aparência, assinatura e preferências.', exterior: false, mascote: 'dormir',
    segredo: { x: 414, y: 86, w: 20, h: 24, fala: 'Ser ou não ser… cirúrgico? Eis a questão.' }, saidas: ['bau', 'correio', 'estrada'] },
  bau: { id: 'bau', pagina: 'Planos', destino: '/assinatura', texto: 'Tudo o que o plano completo libera.', exterior: true, mascote: 'acenar',
    segredo: { x: 260, y: 90, w: 60, h: 40, fala: 'Dentro do baú: cronograma, simulados e um café.' }, saidas: ['correio', 'quarto', 'biblioteca'] },
  correio: { id: 'correio', pagina: 'Indique e ganhe', destino: '/indicar', texto: 'Chame um colega e os dois ganham dias.', exterior: true, mascote: 'acenar',
    segredo: { x: 260, y: 60, w: 50, h: 40, fala: 'Carta para o R1: "Estude o Salter-Harris". Entregue.' }, saidas: ['guilda', 'bau', 'quarto'] },
  guilda: { id: 'guilda', pagina: 'Liga da residência', destino: '/ligas', texto: 'O ranking privado do seu serviço.', exterior: false, mascote: 'acenar',
    segredo: { x: 151, y: 33, w: 18, h: 64, fala: 'Tô aqui desde o R1. Ninguém me deu alta.' }, saidas: ['arena', 'correio', 'trofeus'] },
  conselho: { id: 'conselho', pagina: 'Painel do administrador', destino: '/admin', texto: 'Assinaturas, números e cartas do site.', exterior: false, mascote: 'ler',
    segredo: { x: 396, y: 72, w: 56, h: 56, fala: 'Senha do cofre: o ângulo de Böhler. Entre 20 e 40, boa sorte.' }, saidas: ['quarto', 'correio', 'arena'] },
}

/** Ordem do mapa da vila (do centro para as bordas). */
export const ORDEM_MAPA: IdLugar[] = ['estrada', 'torre', 'biblioteca', 'ferreiro', 'taverna', 'jardim', 'observatorio', 'arena', 'trofeus', 'guilda', 'correio', 'bau', 'quarto']

/** O lugar de uma rota, ou null nas páginas que ficam sem cenário (questões, leitura, SEO, jogos...). */
export function lugarDaRota(rota: Rota): IdLugar | null {
  const [a, b] = rota.segmentos
  switch (a) {
    case 'ranking': return 'arena'
    case 'conquistas': return 'trofeus'
    case 'revisao': return 'torre'
    case 'cronograma': case 'plano-de-estudo': case 'cronograma-mao': return 'estrada'
    case 'erros': return 'ferreiro'
    case 'favoritas': return 'jardim'
    case 'flashcards': return !b || b === 'desempenho' || b === 'cronograma' ? 'taverna' : null
    case 'resumos': return !b ? 'biblioteca' : null
    case 'dados': return 'observatorio'
    case 'simulado-nacional': return 'arena'
    case 'conta': return b === 'assinatura' ? 'bau' : 'quarto'
    case 'entrar': return 'quarto'
    case 'assinatura': return 'bau'
    case 'indicar': case 'convite': case 'contato': return 'correio'
    case 'ligas': return 'guilda'
    case 'admin': case 'emails': return 'conselho'
    default: return null
  }
}

export const imagemLugar = (id: IdLugar, periodo: string, larg: 960 | 1440) => `pixel/paginas/${id}-${periodo}${larg === 960 ? '-960' : ''}.webp`
