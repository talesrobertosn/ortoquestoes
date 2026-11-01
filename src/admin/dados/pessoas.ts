/**
 * Regras das pessoas no painel 3.0 (sem React). Mesmas regras do painel anterior, agora num lugar só:
 * online, ativo hoje, novo que parou, filtros do Explorador e o acerto que ordena.
 */
import { acertoAposRevisao, acertoReal } from '../../componentes/admin/formatos'
import { viuPlanos, type SinalUsuario } from '../../componentes/admin/sinais'
import type { FiltroPessoas } from '../rotas'

export interface LinhaUsuario {
  id_usuario: string
  email: string | null
  nome: string | null
  criado_em: string
  ultimo_login: string | null
  ultima_atividade: string | null
  respondidas: number
  acertos: number
  erros: number
  respondidas_7d: number
  plano_vigente: string | null
  administrador: boolean
  online?: boolean
  aparelho?: string | null
  situacao?: string | null
  servico?: string | null
  cidade?: string | null
  uf?: string | null
  ano_residencia?: string | null
  provas?: string | null
  acertos_primeira?: number | null
  erros_primeira?: number | null
  acertos_tentativas?: number | null
  erros_tentativas?: number | null
  origem?: { fonte?: string; meio?: string; campanha?: string; conteudo?: string; marcada?: boolean; pagina?: string; em?: string } | null
  respondidas_hoje?: number
  tentativas_hoje?: number
  pagina?: string | null
  questao?: string | null
  pagina_em?: string | null
  visto_em?: string | null
}

export interface ResumoAdmin {
  online_agora: number
  usuarios: number; novos_7d: number
  ativos_hoje: number; ativos_7d: number; ativos_30d: number
  respondidas_hoje: number; respondidas_7d: number
  assinantes_vigentes: number
}

/**
 * Online = sinal do aparelho nos últimos 5 minutos (o aparelho manda a cada 40 s com a aba à vista; a lista
 * é relida a cada 5 min ou no Atualizar, e a conta é refeita no painel a cada 10 s).
 */
export const ONLINE_MS = 300_000
export const estaOnline = (u: Pick<LinhaUsuario, 'online' | 'visto_em'>, agora = Date.now()) =>
  u.visto_em ? agora - new Date(u.visto_em).getTime() < ONLINE_MS : !!u.online

const DIA = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' })
const memo = new Map<string, string>()
const diaSP = (iso: string) => { let d = memo.get(iso); if (!d) { d = DIA.format(new Date(iso)); if (memo.size > 20_000) memo.clear(); memo.set(iso, d) } return d }
export const hojeSP = () => DIA.format(Date.now())
export const ativoHoje = (u: LinhaUsuario) => !!u.ultima_atividade && diaSP(u.ultima_atividade) === hojeSP()
export const ativoSemana = (u: LinhaUsuario) => u.respondidas_7d > 0
/** Cadastro nos últimos 14 dias. */
export const novo = (u: LinhaUsuario, agora = Date.now()) => agora - new Date(u.criado_em).getTime() < 14 * 86_400_000
/** Chegou há 2 a 30 dias, fez menos de 10 questões e não estuda há 2 dias: pede um empurrão. */
export const novoParado = (u: Pick<LinhaUsuario, 'criado_em' | 'ultima_atividade' | 'respondidas'>, agora = Date.now()) => {
  const idade = agora - new Date(u.criado_em).getTime()
  const parado = !u.ultima_atividade || agora - new Date(u.ultima_atividade).getTime() > 2 * 86_400_000
  return idade > 2 * 86_400_000 && idade < 30 * 86_400_000 && u.respondidas < 10 && parado
}

export const ROTULO_FILTRO: Record<FiltroPessoas, string> = {
  todos: 'Todas as contas', online: 'Online agora', hoje: 'Ativas hoje', ativos: 'Ativas na semana', novos: 'Recém-cadastradas',
  novos_parados: 'Novas que pararam', planos: 'Viram os planos', assinantes: 'Assinantes', parados: 'Sem respostas',
}
export const DICA_FILTRO: Partial<Record<FiltroPessoas, string>> = {
  online: 'Sinal do aparelho nos últimos 5 minutos.',
  hoje: 'Estudaram hoje, no dia de São Paulo.',
  novos: 'Cadastro nos últimos 14 dias.',
  novos_parados: 'Chegaram nas últimas semanas, fizeram menos de 10 questões e não voltam há 2 dias. Um recado pessoal costuma trazer de volta.',
  planos: 'Abriram a página de planos nos últimos 30 dias (o histórico guarda 30 dias).',
  parados: 'Contas que nunca responderam uma questão.',
}

export function passaFiltro(u: LinhaUsuario, f: FiltroPessoas, sinais: Map<string, SinalUsuario>) {
  switch (f) {
    case 'todos': return true
    case 'online': return !!u.online
    case 'hoje': return ativoHoje(u)
    case 'ativos': return ativoSemana(u)
    case 'novos': return novo(u)
    case 'novos_parados': return novoParado(u)
    case 'assinantes': return !!u.plano_vigente
    case 'parados': return u.respondidas === 0
    case 'planos': return viuPlanos(sinais.get(u.id_usuario))
  }
}

/** Com poucas respostas o acerto oscila demais para comparar. */
export const MINIMO_PARA_ACERTO = 20
/** O acerto que ordena: o real (1ª tentativa) quando existe; senão, o após revisão. */
export const acertoDe = (u: LinhaUsuario) => acertoReal(u) ?? acertoAposRevisao(u)
export const nomeDe = (u: Pick<LinhaUsuario, 'nome' | 'email'>) => u.nome ?? u.email?.split('@')[0] ?? 'Sem nome'
