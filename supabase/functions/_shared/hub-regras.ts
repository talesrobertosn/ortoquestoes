import { avaliarRisco } from '../../../src/admin/dados/risco.ts'
import {
  TIPOS,
  anterioresDosDados,
  escolherTipo,
  gerarCarta,
  perfilDosDados,
  sementeDe,
  type DadosCartaBanco,
  type TipoCarta,
} from './cartas.ts'

export interface MensagemHub {
  chave: string
  id_usuario: string
  nome: string
  email: string
  tipo: TipoCarta
  categoria: 'cartas' | 'lembretes' | 'relatorio' | 'conquistas'
  tipo_log: 'carta' | 'lembrete' | 'relatorio' | 'marco'
  referencia: string
  prioridade: number
  motivo: string
  assunto: string
  corpo: string
  modelo: string
  versao: string
  personalizacao: string[]
  ultimo_envio: string | null
  concorrentes: string[]
  bloqueio: string | null
  fonte: 'pessoal' | 'campanha' | 'lembrete' | 'mensal' | 'quinzenal' | 'pagamento'
  origem_dados?: Record<string, unknown>
}
export const CENARIOS_HUB = [
  { id: 'cartao_recusado', titulo: 'O cartão não passou', descricao: 'Ajuda cordial para quem não conseguiu concluir o pagamento, com a alternativa do Pix.', grupo: 'Com prazo', tipos: ['cartao_recusado'] },
  { id: 'pix_hoje', titulo: 'Pix: acesso termina hoje', descricao: 'Último dia do período pago no Pix.', grupo: 'Com prazo', tipos: ['pix_hoje'] },
  { id: 'pix_3_dias', titulo: 'Pix: faltam 3 dias', descricao: 'O acesso pago no Pix termina em três dias.', grupo: 'Com prazo', tipos: ['pix_3_dias'] },
  { id: 'fogo_apagando', titulo: 'Fogo apagando', descricao: 'Já estudava e está sem responder. A mensagem considera há quanto tempo parou.', grupo: 'Voltar a estudar', tipos: ['pausa', 'sumiu', 'como_estao', 'assinante_parado_7'] },
  { id: 'comecou_parou', titulo: 'Começou e parou', descricao: 'Deu os primeiros passos, com menos de 30 questões, e interrompeu o estudo.', grupo: 'Voltar a estudar', tipos: ['comecou_parou'] },
  { id: 'nunca_comecou', titulo: 'Criou a conta e não começou', descricao: 'Ainda não respondeu nenhuma questão. O primeiro convite não se repete.', grupo: 'Voltar a estudar', tipos: ['nunca_comecou'] },
  { id: 'acesso_terminou', titulo: 'Acesso pago terminou', descricao: 'O período pago acabou e a pessoa ainda não renovou.', grupo: 'Voltar a estudar', tipos: ['acesso_terminou'] },
  { id: 'reta_final', titulo: 'Reta final', descricao: 'A prova se aproxima: revisar erros e treinar com tempo marcado.', grupo: 'Provas e estudo', tipos: ['reta_final'] },
  { id: 'vespera_prova', titulo: 'A prova é amanhã', descricao: 'Véspera da data informada no cronograma.', grupo: 'Provas e estudo', tipos: ['vespera_prova'] },
  { id: 'depois_prova', titulo: 'Depois da prova: como foi?', descricao: 'De um a três dias depois da prova, sem presumir o resultado.', grupo: 'Provas e estudo', tipos: ['depois_prova'] },
  { id: 'simulado_lembrete', titulo: 'Simulado: inscrição feita', descricao: 'Aviso para quem se inscreveu na edição e ainda precisa fazê-la.', grupo: 'Provas e estudo', tipos: ['simulado_lembrete'] },
  { id: 'simulado_resultado', titulo: 'Resultado do simulado', descricao: 'A edição encerrou; o resultado já pode ser consultado.', grupo: 'Provas e estudo', tipos: ['simulado_resultado'] },
  { id: 'marco', titulo: 'Marco de questões', descricao: '100, 250, 500, 1.000 ou 2.000 questões respondidas.', grupo: 'Acompanhar e celebrar', tipos: ['marco'] },
  { id: 'relatorio', titulo: 'Resumo de estudo', descricao: 'Relatórios mensais e quinzenais, nas datas devidas.', grupo: 'Acompanhar e celebrar', tipos: ['relatorio'] },
  { id: 'aniversario', titulo: 'Aniversário', descricao: 'Aniversário da pessoa, sem sugestão de estudo ou de compra.', grupo: 'Acompanhar e celebrar', tipos: ['aniversario'] },
  { id: 'um_ano', titulo: 'Aniversário da conta', descricao: 'Um ano ou mais de Orto Questões.', grupo: 'Acompanhar e celebrar', tipos: ['um_ano'] },
  { id: 'indicacao_deu_certo', titulo: 'Indicação deu certo', descricao: 'A pessoa indicada alcançou o marco necessário.', grupo: 'Acompanhar e celebrar', tipos: ['indicacao_deu_certo'] },
  { id: 'resumo_do_tema', titulo: 'Resumo novo do tema', descricao: 'Novidade da Biblioteca relacionada ao estudo da pessoa.', grupo: 'Provas e estudo', tipos: ['resumo_do_tema'] },
  { id: 'convite', titulo: 'Conhecer o plano completo', descricao: 'Já usa as questões e aceitou receber novidades.', grupo: 'Convites', tipos: ['convite_20', 'convite_50'] },
  { id: 'boas_vindas', titulo: 'Primeiros dias de estudo', descricao: 'Criou a conta recentemente e já começou a responder.', grupo: 'Acompanhar e celebrar', tipos: ['boas_vindas'] },
] as const
export type CenarioHub = typeof CENARIOS_HUB[number]['id']
export const cenarioValido = (id: unknown): id is CenarioHub => CENARIOS_HUB.some(c => c.id === id)

export const PRIORIDADE: Partial<Record<TipoCarta, number>> = {
  pix_hoje: 0,
  cartao_recusado: 5,
  vespera_prova: 10,
  simulado_lembrete: 11,
  simulado_resultado: 12,
  relatorio: 20,
  aniversario: 25,
  depois_prova: 26,
  pix_3_dias: 30,
  marco: 45,
  reta_final: 46,
  assinante_parado_7: 50,
  como_estao: 51,
  sumiu: 52,
  pausa: 53,
  comecou_parou: 54,
  acesso_terminou: 55,
  nunca_comecou: 60,
  boas_vindas: 61,
  resumo_do_tema: 70,
  indicacao_deu_certo: 71,
  um_ano: 72,
  convite_50: 90,
  convite_20: 91,
}
export const diaSP = (hoje = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(hoje)
export const intencao = (tipo: string) =>
  tipo.startsWith('convite')
    ? 'convite'
    : ['sumiu', 'pausa', 'comecou_parou', 'assinante_parado_7', 'como_estao', 'voltou'].includes(tipo)
      ? 'retomada'
      : tipo

/** Os critérios antigos de contas de teste também valem para a central no servidor. */
export function contaTeste(nome: string | null | undefined, email: string | null | undefined) {
  const n = (nome ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
  let hash = 2166136261
  for (const b of new TextEncoder().encode((email ?? '').trim().toLowerCase())) {
    hash ^= b
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return (
    n.split(' ')[0] === 'tales' ||
    ['thales roberto', 'valeria godoy'].some((x) => n === x || n.startsWith(x + ' ')) ||
    ['d0140159', '9e0ee00a'].includes(hash.toString(16).padStart(8, '0'))
  )
}
/** Não inventa um contato só para preencher a rodada. Cartas genéricas seguem disponíveis na ficha. */
export function sugestaoPessoal(id: string, d: DadosCartaBanco, hoje = new Date(), site?: string): MensagemHub | null {
  if (!d.email || contaTeste(d.nome, d.email) || d.administrador || !d.confirmado || d.quer_cartas === false)
    return null
  const p = perfilDosDados(d),
    hist = anterioresDosDados(d),
    e = escolherTipo(p, hist, hoje)
  if (Number(d.respondidas) > 0 && Number(d.respondidas) < 10 && Number(d.dias_conta) >= 2 && Number(d.dias_conta) < 30 && Number(d.dias_parado) >= 2) {
    e.tipo = 'comecou_parou'
    e.motivo = 'Conta recente: deu os primeiros passos e está há pelo menos dois dias sem estudar.'
  }
  if (d.assinante && Number(d.respondidas) > 0 && !['marco', 'reta_final', 'comecou_parou'].includes(e.tipo)) {
    const risco = avaliarRisco(
      {
        ultimaAtividade: d.ultima_atividade ?? null,
        criadoEm: d.criado_em ?? hoje.toISOString(),
        respondidas: Number(d.respondidas),
        respondidas7d: Number(d.semana ?? 0),
        fimSemRenovar: d.renova_sozinho ? null : (d.fim_acesso ?? null),
      },
      undefined,
      hoje.getTime(),
    )
    if (risco.nivel !== 'baixo') {
      e.tipo = 'como_estao'
      e.motivo = `Risco ${risco.nivel} de parar: ${risco.motivos.join('; ')}.`
    }
  }
  if (['ativo', 'comecando', 'obrigado_assinatura'].includes(e.tipo)) return null
  if (e.tipo === 'nunca_comecou' && Number(d.dias_conta ?? 0) < 1) return null
  if (e.tipo.startsWith('convite') && !d.novidades) return null
  if (['sumiu', 'comecou_parou'].includes(e.tipo) && Number(d.dias_parado ?? 0) > 90) return null
  const carta = gerarCarta(p, {
    tipo: e.tipo,
    marco: e.marco ?? undefined,
    anteriores: hist,
    hoje,
    site,
    ignorarCadencia: true,
    semente: sementeDe(`${id}:${diaSP(hoje)}`),
  })
  const referencia =
    e.tipo === 'marco'
      ? `marco:${e.marco}`
      : e.tipo === 'nunca_comecou'
        ? 'nunca_comecou'
        : `hub:${intencao(e.tipo)}:${diaSP(hoje)}`
  return {
    chave: `${id}:${referencia}`,
    id_usuario: id,
    nome: d.nome ?? d.email,
    email: d.email,
    tipo: e.tipo,
    categoria: e.tipo === 'marco' ? 'conquistas' : 'cartas',
    tipo_log: e.tipo === 'marco' ? 'marco' : 'carta',
    referencia,
    prioridade: PRIORIDADE[e.tipo] ?? 80,
    motivo: e.motivo,
    assunto: carta.assunto,
    corpo: carta.corpo,
    modelo: carta.modelo,
    versao: carta.versao,
    personalizacao: carta.personalizacao,
    ultimo_envio: hist.find((x) => x.status !== 'falhou')?.em ?? null,
    concorrentes: [],
    bloqueio: null,
    fonte: 'pessoal',
  }
}
/** Uma decisão por pessoa. Uma opção bloqueada não esconde outra opção permitida. */
export function selecionarHub(candidatas: readonly MensagemHub[], cenario?: CenarioHub) {
  const grupos = new Map<string, MensagemHub[]>()
  for (const original of candidatas) {
    if (cenario && !(CENARIOS_HUB.find(c => c.id === cenario)!.tipos as readonly string[]).includes(original.tipo)) continue
    const m = { ...original }
    grupos.set(m.id_usuario, [...(grupos.get(m.id_usuario) ?? []), m])
  }
  const prontas: MensagemHub[] = [],
    adiadas: MensagemHub[] = []
  for (const grupo of grupos.values()) {
    grupo.sort((a, b) => a.prioridade - b.prioridade || a.chave.localeCompare(b.chave))
    const principal = grupo.find((m) => !m.bloqueio) ?? grupo[0]
    principal.concorrentes = [...new Set(grupo.filter((m) => m !== principal).map((m) => TIPOS[m.tipo].rotulo))]
    ;(principal.bloqueio ? adiadas : prontas).push(principal)
  }
  return {
    prontas: prontas.sort((a, b) => a.prioridade - b.prioridade || a.nome.localeCompare(b.nome, 'pt-BR')),
    adiadas,
  }
}
