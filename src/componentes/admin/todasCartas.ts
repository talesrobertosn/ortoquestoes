/**
 * E-mails › Todas as cartas (17/10/2026, fase 2 de docs/emails/PLANO.md): o catálogo vivo de
 * TODOS os tipos de carta que o site manda, com uma amostra gerada pelo mesmo motor da Edge
 * Function (cartas.ts, no navegador) para uma pessoa fictícia. Este arquivo é puro (sem
 * React): os modelos, quando cada um sai, para quem, e as pessoas inventadas das amostras.
 */
import { SITE } from '../../config'
import {
  FAIXAS, ROTULO_FAIXA, TIPOS, TIPOS_AUTOMATICOS_NOVOS, TIPOS_TRANSACIONAIS, gerarCarta, sementeDe, versoesDe,
  type Carta, type Faixa, type OpcoesCarta, type PerfilCarta, type TipoCarta,
} from './modelosEmail'

export type GrupoCatalogo = 'situacao' | 'faixa' | 'convite' | 'pessoal' | 'automatico' | 'novo'
export const GRUPOS: Array<{ id: GrupoCatalogo; rotulo: string; descricao: string }> = [
  { id: 'situacao', rotulo: 'Situações', descricao: 'A carta que o motor escolhe sozinho pela situação da pessoa (ficha e lote).' },
  { id: 'faixa', rotulo: 'Faixas de acerto', descricao: 'Estudando: uma voz para cada faixa de acerto, com 30 questões ou mais.' },
  { id: 'convite', rotulo: 'Convites', descricao: 'Para quem não assina: o que o plano faz pela rotina, sem preço.' },
  { id: 'pessoal', rotulo: 'Pessoais', descricao: 'Escritas pelo administrador a partir da ficha, com a espinha nova em volta.' },
  { id: 'automatico', rotulo: 'Automáticos', descricao: 'Saem sozinhas: lembretes, Pix, resumos e marcos.' },
  { id: 'novo', rotulo: 'Novos (17/10, sem SQL)', descricao: 'Os seis disparados por um acontecimento no site ou no pagamento.' },
]

export interface Gatilho { quando: string; paraQuem: string }
/** Quando cada carta sai e para quem (a partir do PLANO.md e do cabeçalho de enviar-email/index.ts). */
export const GATILHOS: Record<TipoCarta, Gatilho> = {
  nunca_comecou: { quando: 'Lembrete "Primeira missão" (botão em Lembretes) ou pela ficha; o motor escolhe sozinho quando a pessoa não respondeu nada.', paraQuem: 'Conta confirmada há pelo menos um dia e nenhuma questão respondida. Uma vez por pessoa.' },
  boas_vindas: { quando: 'Pela ficha ou pelo lote, quando o motor vê conta de até 3 dias com questões respondidas.', paraQuem: 'Chegou nos últimos 3 dias e já respondeu algumas questões (menos de 30).' },
  comecando: { quando: 'Pela ficha ou pelo lote, quando ainda não dá para falar de acerto.', paraQuem: 'Ativo, com menos de 30 questões.' },
  comecou_parou: { quando: 'Pela ficha ou pelo lote.', paraQuem: 'Menos de 30 questões e 3 dias ou mais sem aparecer.' },
  pausa: { quando: 'Lembrete "Fogueira apagando" (botão em Lembretes), um por ausência.', paraQuem: 'Respondia e está de 3 a 6 dias sem aparecer.' },
  sumiu: { quando: 'Lembrete "Retomar a jornada" (botão), lote "Sumiu" ou ficha.', paraQuem: 'Respondia e está há 10 dias ou mais sem aparecer (até 90 no lembrete).' },
  ativo: { quando: 'Pela ficha ou pelo lote, quando nenhuma situação especial se aplica.', paraQuem: 'Estudando, com 30 questões ou mais: a faixa vem do acerto.' },
  obrigado_assinatura: { quando: 'Pela ficha; o motor escolhe sozinho para assinante que ainda não recebeu nem este nem o recibo.', paraQuem: 'Quem acabou de assinar.' },
  convite_20: { quando: 'Lote "De 21 a 50 questões" (Cartas pessoais) ou ficha; nunca em cima de outro e-mail (48 h) nem repetido em 30 dias.', paraQuem: 'Não assina, mais de 20 questões, aceitou novidades.' },
  convite_50: { quando: 'Lote "Mais de 50 questões" (Cartas pessoais) ou ficha; mesmas travas do convite 20+.', paraQuem: 'Não assina, mais de 50 questões, aceitou novidades.' },
  reta_final: { quando: 'Pela ficha ou pelo lote, uma vez a cada 30 dias.', paraQuem: 'Prova a 60 dias ou menos (TEOT ou a data do cronograma).' },
  marco: { quando: 'Automático: o site avisa ao passar do marco e o servidor manda uma vez por marco, respeitando a cadência.', paraQuem: 'Quem acabou de passar de 100, 250, 500, 1.000 ou 2.000 questões e não desligou os e-mails de conquistas.' },
  opiniao: { quando: 'Só pela ficha, quando o administrador escolhe.', paraQuem: 'Qualquer pessoa ativa, de preferência com histórico para contar.' },
  indicar: { quando: 'Só pela ficha.', paraQuem: 'Quem gosta do site e pode conhecer colegas na mesma prova.' },
  cronograma: { quando: 'Só pela ficha.', paraQuem: 'Assinante que ainda não montou o cronograma, ou quem está decidindo assinar.' },
  pix_3_dias: { quando: 'Agendador diário e botão "Pix: faltam 3 dias"; um por compra.', paraQuem: 'Pagou no Pix e o acesso termina em 3 dias, sem renovar.' },
  pix_hoje: { quando: 'Agendador diário e botão "Pix: termina hoje"; transacional (fora da cadência).', paraQuem: 'Pagou no Pix e o acesso termina hoje, sem renovar.' },
  relatorio: { quando: 'Agendador nos dias 1 e 16 (quinzenal, para quem estudou) e no dia 1 (mensal, assinantes); também pelos botões.', paraQuem: 'Quem estudou na quinzena; assinantes recebem o do mês, mesmo sem estudar.' },
  boas_vindas_dia0: { quando: 'O site avisa no primeiro login depois de confirmar o e-mail (link de confirmação). Uma vez por pessoa.', paraQuem: 'Quem acabou de confirmar a conta.' },
  primeiras_10: { quando: 'O site avisa ao passar de 10 questões (junto da checagem do marco). Uma vez por pessoa.', paraQuem: 'Quem acabou de responder a décima questão.' },
  voltou: { quando: 'O site avisa na primeira sincronização da sessão, depois de 10 dias ou mais fora. Uma por dia de volta.', paraQuem: 'Quem voltou depois de 10 dias ou mais sem abrir o site.' },
  cronograma_pronto: { quando: 'O site avisa logo depois de a pessoa salvar o cronograma; o servidor confere o plano no banco. Uma vez por pessoa.', paraQuem: 'Quem acabou de montar o plano até a prova.' },
  pagamento_aprovado: { quando: 'Webhook do Mercado Pago (cartão e Pix) e gerenciar-plano ao sincronizar a cobrança, com x-segredo; transacional, idempotente pelo id do pagamento.', paraQuem: 'Quem acabou de ter um pagamento aprovado (compra ou renovação).' },
  obrigado_tempo: { quando: 'gerenciar-plano ao cancelar ou reembolsar, e webhook em refunded, charged_back ou cancelled; transacional.', paraQuem: 'Quem cancelou a assinatura ou pediu reembolso.' },
}

/** Um modelo do catálogo: um tipo, ou uma faixa de "ativo". */
export interface ModeloCatalogo {
  id: string
  tipo: TipoCarta
  faixa: Faixa | null
  grupo: GrupoCatalogo
  rotulo: string
  descricao: string
  gatilho: Gatilho
  /** Quem é a pessoa fictícia da amostra. */
  pessoa: string
  perfil: PerfilCarta
  opcoes: Omit<OpcoesCarta, 'tipo' | 'faixa' | 'semente'>
  versoes: number
  transacional: boolean
}

const pessoa = (nome: string, acerto: number, extra: Partial<PerfilCarta> = {}): PerfilCarta => ({
  nome, respondidas: 290, acertos: Math.round(acerto * 2.9), erros: Math.round((100 - acerto) * 2.9), semana: 35, diasParado: 1, diasConta: 70, ...extra,
})
/** Pessoas e números fictícios: nenhum dado real sai desta página. */
const FICTICIOS: Record<Faixa, [string, PerfilCarta]> = {
  '0-10': ['Caio Mendes, R1, 48 questões', pessoa('Caio Mendes', 6, { respondidas: 48, acertos: 3, erros: 45, semana: 0, situacao: 'residente', ano: 'r1' })],
  '10-20': ['Lívia Rocha, R1, TARO, Hospital Miguel Couto', pessoa('Lívia Rocha', 16, { situacao: 'residente', ano: 'r1', provas: ['taro'], servico: 'Hospital Municipal Miguel Couto' })],
  '20-30': ['Diego Farias, estuda de madrugada', pessoa('Diego Farias', 26, { horas: [{ hora: 23, n: 30 }, { hora: 0, n: 22 }, { hora: 1, n: 14 }] })],
  '30-40': ['Marina Teles, trauma e pediatria, 2 resumos lidos', pessoa('Marina Teles', 36, { areas: [{ slug: 'trauma', total: 80, certas: 34 }, { slug: 'pediatria', total: 40, certas: 9 }], resumosLidos: { total: 2, titulos: ['Fraturas do fêmur na criança'] } })],
  '40-60': ['Rafael Couto, R2, TARO, Curitiba, 5 dias seguidos', pessoa('Rafael Couto', 52, { situacao: 'residente', ano: 'r2', provas: ['taro'], areas: [{ slug: 'joelho', total: 60, certas: 40 }, { slug: 'coluna', total: 30, certas: 9 }], sequencia: 5, cidade: 'Curitiba' })],
  '60-70': ['Beatriz Lins, ótima em mão, estuda no almoço', pessoa('Beatriz Lins', 66, { areas: [{ slug: 'mao', total: 120, certas: 92 }, { slug: 'quadril', total: 30, certas: 15 }], horas: [{ hora: 12, n: 40 }, { hora: 13, n: 20 }, { hora: 20, n: 10 }] })],
  '70-80': ['Pedro Alves, R3, TEOT a 87 dias, 31º no ranking, à noite', pessoa('Pedro Alves', 75, { situacao: 'residente', ano: 'r3', provas: ['teot'], posicaoRanking: 31, areas: [{ slug: 'tumores', total: 30, certas: 27 }, { slug: 'trauma', total: 90, certas: 63 }], horas: [{ hora: 21, n: 50 }, { hora: 22, n: 40 }], diasParaProva: 87, provaCronograma: 'TEOT' })],
  '80-90': ['Júlia Prado, 1.450 questões, 7ª no ranking, 21 dias seguidos', pessoa('Júlia Prado', 84, { respondidas: 1450, acertos: 1218, erros: 232, posicaoRanking: 7, sequencia: 21, flashcards: 300 })],
  '90-100': ['Henrique Sá, ortopedista, estuda para se manter em dia', pessoa('Henrique Sá', 93, { respondidas: 160, acertos: 149, erros: 11, semana: 40, situacao: 'ortopedista', provas: ['atualizacao'] })],
}
const rica: PerfilCarta = { ...FICTICIOS['70-80'][1], sequencia: 6, flashcards: 80, limiteGratisLigado: true, servico: 'Hospital das Clínicas', resumosLidos: { total: 3, titulos: ['Fraturas do rádio distal'] } }
const otavio: PerfilCarta = { ...pessoa('Otávio Reis', 68), respondidas: 340, diasParado: 24, areas: [{ slug: 'joelho', total: 70, certas: 58 }] }
const fernanda: PerfilCarta = { ...pessoa('Fernanda Luz', 71), assinante: true, provas: ['teot'], areas: [{ slug: 'mao', total: 60, certas: 50 }] }

const EXTRAS: Omit<OpcoesCarta, 'tipo' | 'faixa' | 'semente'> = {
  pix: { diasRestantes: 3, fimEm: new Date(Date.now() + 3 * 86_400_000).toISOString(), plano: 'semestral' },
  pagamento: { plano: 'semestral', inicioEm: new Date().toISOString(), fimEm: new Date(Date.now() + 182 * 86_400_000).toISOString(), meio: 'cartao', renovacao: false },
  encerramento: { reembolso: false, fimEm: new Date(Date.now() + 30 * 86_400_000).toISOString() },
  relatorio: { rotulo: 'de 1 a 15 de outubro', em: 'de 1 a 15 de outubro', frase: 'Entre 1 e 15 de outubro', quinzena: true, respostas: 84, certas: 60, erradas: 24, diasAtivos: 6, respostasAnterior: 50, acertoAnterior: 60, totalAcumulado: 900, subiram: [{ slug: 'joelho', antes: 62, agora: 79 }], cairam: [], maisFraco: { slug: 'tumores', acerto: 40 }, simulado: null },
  // Prévia: a cadência não bloqueia (ninguém recebe nada daqui).
  ignorarCadencia: true, site: SITE.url,
}

/** A pessoa fictícia de cada tipo (os que não são "ativo"). */
const PESSOA_DO_TIPO: Partial<Record<TipoCarta, [string, PerfilCarta, Partial<OpcoesCarta>?]>> = {
  nunca_comecou: ['Ana Beatriz, R3, TEOT, conta de 6 dias, nenhuma questão', { nome: 'Ana Beatriz', respondidas: 0, diasConta: 6, diasParado: null, provas: ['teot'], situacao: 'residente', ano: 'r3' }],
  boas_vindas: ['Tiago, TARO, conta de 2 dias, 12 questões', { nome: 'Tiago', respondidas: 12, diasConta: 2, diasParado: 0, provas: ['taro'] }],
  comecando: ['Sem nome no cadastro, 18 questões', { nome: null, respondidas: 18, diasConta: 20, diasParado: 0 }],
  comecou_parou: ['Clara, 7 questões (o número não aparece), 6 dias fora', { nome: 'Clara', respondidas: 7, diasConta: 25, diasParado: 6 }],
  pausa: ['Bruno, 230 questões, estava em joelho, 4 dias fora', { ...pessoa('Bruno', 64), respondidas: 230, diasParado: 4, areas: [{ slug: 'joelho', total: 90, certas: 60 }, { slug: 'coluna', total: 20, certas: 12 }] }],
  sumiu: ['Otávio Reis, 340 questões, 24 dias fora, ótimo em joelho', otavio],
  obrigado_assinatura: ['Fernanda Luz, TEOT, acabou de assinar', fernanda],
  convite_20: ['Gabriel, 34 questões, não assina', { nome: 'Gabriel', respondidas: 34, acertos: 21, erros: 13, diasConta: 12, diasParado: 0, limiteGratisLigado: true }],
  convite_50: ['Pedro Alves, 290 questões, 75%, R3, TEOT a 87 dias', { ...FICTICIOS['70-80'][1], limiteGratisLigado: true }],
  reta_final: ['Pedro Alves, R3, TEOT a 87 dias', FICTICIOS['70-80'][1]],
  marco: ['Júlia Prado passou de 500 questões', { ...FICTICIOS['80-90'][1], respondidas: 507 }, { marco: 500 }],
  opiniao: ['Júlia Prado, 1.450 questões', FICTICIOS['80-90'][1]],
  indicar: ['Rafael Couto, R2, Curitiba', FICTICIOS['40-60'][1]],
  cronograma: ['Pedro Alves, TEOT, ainda sem cronograma', { ...FICTICIOS['70-80'][1], diasParaProva: null, provaCronograma: null }],
  pix_3_dias: ['Diego, semestral no Pix, 610 questões', { ...pessoa('Diego Farias', 69), respondidas: 610, semana: 70, assinante: true }],
  pix_hoje: ['Diego, último dia do Pix', { ...pessoa('Diego Farias', 69), respondidas: 610, semana: 70, assinante: true }],
  relatorio: ['Marina, 84 questões na quinzena, joelho subiu 17 pontos', { ...pessoa('Marina Teles', 71), respondidas: 900, horas: [{ hora: 21, n: 50 }, { hora: 22, n: 30 }] }],
  boas_vindas_dia0: ['Ana, R3, TEOT, confirmou o e-mail hoje', { nome: 'Ana', respondidas: 0, diasConta: 0, diasParado: null, situacao: 'residente', ano: 'r3', provas: ['teot'] }],
  primeiras_10: ['Tiago, R1, TARO, acabou de passar de 10', { nome: 'Tiago', respondidas: 11, diasConta: 1, diasParado: 0, provas: ['taro'], situacao: 'residente', ano: 'r1' }],
  voltou: ['Otávio Reis, voltou depois de 24 dias', otavio],
  cronograma_pronto: ['Pedro Alves montou o plano: TEOT a 87 dias', rica],
  pagamento_aprovado: ['Fernanda Luz, semestral no cartão', fernanda],
  obrigado_tempo: ['Fernanda Luz cancelou (acesso até o fim do período)', fernanda],
}

function grupoDe(tipo: TipoCarta): GrupoCatalogo {
  if ((TIPOS_AUTOMATICOS_NOVOS as readonly string[]).includes(tipo)) return 'novo'
  return TIPOS[tipo].grupo
}

/** Todos os modelos do catálogo: cada tipo, e "ativo" aberto nas 9 faixas. */
export function modelosDoCatalogo(): ModeloCatalogo[] {
  const lista: ModeloCatalogo[] = []
  for (const tipo of Object.keys(TIPOS) as TipoCarta[]) {
    const info = TIPOS[tipo]
    if (tipo === 'ativo') {
      for (const faixa of FAIXAS) {
        const [quem, perfil] = FICTICIOS[faixa]
        lista.push({ id: `ativo:${faixa}`, tipo, faixa, grupo: 'faixa', rotulo: `Estudando, acerto ${ROTULO_FAIXA[faixa]}`, descricao: info.descricao, gatilho: GATILHOS[tipo], pessoa: quem, perfil: { ...perfil, assinante: true }, opcoes: EXTRAS, versoes: versoesDe(tipo, faixa).length, transacional: false })
      }
      continue
    }
    const [quem, perfil, extra] = PESSOA_DO_TIPO[tipo] ?? [`Pessoa fictícia (${info.rotulo.toLowerCase()})`, rica]
    lista.push({ id: tipo, tipo, faixa: null, grupo: grupoDe(tipo), rotulo: info.rotulo, descricao: info.descricao, gatilho: GATILHOS[tipo], pessoa: quem, perfil, opcoes: { ...EXTRAS, ...(extra ?? {}) }, versoes: versoesDe(tipo, null).length, transacional: TIPOS_TRANSACIONAIS.includes(tipo) })
  }
  return lista
}

/** Semente inicial estável por modelo (a página abre sempre igual; "Sortear" troca). */
export const sementeInicial = (modelo: ModeloCatalogo) => sementeDe(`catalogo:${modelo.id}`)

/** A amostra de um modelo com uma semente. Lança se o motor não conseguir (o painel mostra o motivo). */
export function amostraDe(modelo: ModeloCatalogo, semente: number, hoje = new Date()): Carta {
  return gerarCarta(modelo.perfil, { ...modelo.opcoes, tipo: modelo.tipo, faixa: modelo.faixa ?? undefined, semente, hoje })
}

/** Uma semente nova que troca a versão (quando há mais de uma); até 25 tentativas. */
export function outraSemente(modelo: ModeloCatalogo, versaoAtual: string, aleatorio = Math.random): number {
  let semente = Math.floor(aleatorio() * 2 ** 31)
  if (modelo.versoes <= 1) return semente
  for (let i = 0; i < 25; i++) {
    try { if (amostraDe(modelo, semente).versao !== versaoAtual) return semente } catch { /* tenta outra */ }
    semente = Math.floor(aleatorio() * 2 ** 31)
  }
  return semente
}

/** Busca por texto: rótulo, descrição, gatilho, pessoa e o texto da amostra. */
export function combinaBusca(modelo: ModeloCatalogo, carta: Carta | null, busca: string): boolean {
  const termo = normalizar(busca)
  if (!termo) return true
  const alvo = normalizar([modelo.rotulo, modelo.descricao, modelo.gatilho.quando, modelo.gatilho.paraQuem, modelo.pessoa, modelo.tipo, carta?.assunto ?? '', carta?.corpo ?? ''].join(' '))
  return termo.split(/\s+/).every((p) => alvo.includes(p))
}
const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
