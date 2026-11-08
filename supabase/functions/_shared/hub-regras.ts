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
  fonte: 'pessoal' | 'campanha' | 'lembrete' | 'mensal' | 'quinzenal'
  origem_dados?: Record<string, unknown>
}
export const PRIORIDADE: Partial<Record<TipoCarta, number>> = {
  pix_hoje: 0,
  vespera_prova: 10,
  simulado_lembrete: 11,
  simulado_resultado: 12,
  relatorio: 20,
  aniversario: 25,
  depois_prova: 26,
  pix_3_dias: 30,
  assinou_sem_cronograma: 40,
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
  if (d.assinante && Number(d.respondidas) > 0 && !['marco', 'reta_final'].includes(e.tipo)) {
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
export function selecionarHub(candidatas: MensagemHub[]) {
  const grupos = new Map<string, MensagemHub[]>()
  for (const m of candidatas) grupos.set(m.id_usuario, [...(grupos.get(m.id_usuario) ?? []), m])
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
