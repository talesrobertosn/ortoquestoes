import { ANOS, SITUACOES, lerProvas, rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import { vigente, type AssinaturaBase } from '../../componentes/admin/receita'
import type { LinhaUsuario } from './pessoas'

/** Apenas dados declarados: não deduzir R3 por prova de interesse nem preencher ano ausente. */
export function perfilNaLista(u: Pick<LinhaUsuario, 'situacao' | 'ano_residencia' | 'provas'>) {
  const conhecida = SITUACOES.some(([s]) => s === u.situacao)
  const etapa = !conhecida ? null : u.situacao === 'residente' && !ANOS.some(([a]) => a === u.ano_residencia)
    ? 'Residente' : rotuloEtapa(u.situacao, u.ano_residencia)
  const objetivos = [...new Set(lerProvas(u.provas))].map(rotuloProva)
  return { etapa, objetivos }
}

/** Uma passagem pelos dados já carregados. Acesso pago total: o período válido que termina mais longe. */
export function assinaturasNaLista<A extends AssinaturaBase>(assinaturas: A[], agora = Date.now()) {
  const mapa = new Map<string, A>()
  for (const a of assinaturas) {
    if (!vigente(a, agora)) continue
    const atual = mapa.get(a.id_usuario)
    const fim = a.fim_periodo ? new Date(a.fim_periodo).getTime() : 0
    const anterior = atual?.fim_periodo ? new Date(atual.fim_periodo).getTime() : 0
    if (!atual || (Number.isFinite(fim) && fim > anterior)) mapa.set(a.id_usuario, a)
  }
  return mapa
}

const DIA_SP = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' })
/** Dias de calendário, inclusive perto da meia-noite, sempre no fuso do painel. */
export function diasAteVencimento(iso: string, agora = Date.now()) {
  const fim = new Date(iso)
  if (!Number.isFinite(fim.getTime())) return null
  return Math.round((Date.parse(DIA_SP.format(fim)) - Date.parse(DIA_SP.format(agora))) / 86_400_000)
}
