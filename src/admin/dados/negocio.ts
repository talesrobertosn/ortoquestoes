import { DIA, MES, inicioDoMes, somarMesChave, type Cobranca } from '../../componentes/admin/receita'
import type { LinhaUsuario } from './pessoas'

export const UM_DIA = 86_400_000
export const dataSP = (dia: string) => new Date(`${dia}T03:00:00Z`)
export const moverDia = (dia: string, n: number) => new Date(dataSP(dia).getTime() + n * UM_DIA).toISOString().slice(0, 10)
export const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
export type Escala = 'dia' | 'semana' | 'mes'
export const segunda = (dia: string) => moverDia(dia, -((new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7))
export const chavePeriodo = (d: Date, escala: Escala) => escala === 'mes' ? MES(d) : escala === 'semana' ? segunda(DIA(d)) : DIA(d)

/** Recorte comparável: mesmo horário, mesmo trecho da semana ou mesmos dias do mês anterior. */
export function janelas(escala: Escala, agora = new Date()) {
  const hoje = DIA(agora), t = agora.getTime()
  const inicio = escala === 'dia' ? dataSP(hoje) : escala === 'semana' ? dataSP(segunda(hoje)) : inicioDoMes(MES(agora))
  const anterior = escala === 'mes' ? inicioDoMes(somarMesChave(MES(agora), -1)) : new Date(inicio.getTime() - UM_DIA * (escala === 'dia' ? 1 : 7))
  const ateAnterior = Math.min(inicio.getTime(), anterior.getTime() + t - inicio.getTime())
  return { inicio: inicio.getTime(), fim: t, anterior: anterior.getTime(), ateAnterior }
}
export interface EventoNegocio { id: string; em: Date; tipo: 'cadastro' | Cobranca['tipo']; valor: number; estimada?: boolean }
export function eventosNegocio(usuarios: LinhaUsuario[], cobrancas: Cobranca[]): EventoNegocio[] {
  const ids = new Set(usuarios.map(u => u.id_usuario))
  return [...usuarios.map(u => ({ id: u.id_usuario, em: new Date(u.criado_em), tipo: 'cadastro' as const, valor: 0 })), ...cobrancas.filter(c => ids.has(c.id_usuario)).map(c => ({ id: c.id_usuario, em: c.em, tipo: c.tipo, valor: c.valor, estimada: c.estimada }))].filter(e => Number.isFinite(e.em.getTime()))
}
export function serieNegocio(eventos: EventoNegocio[], escala: Escala, agora = new Date()) {
  const hoje = DIA(agora), inicio = escala === 'dia' ? moverDia(hoje, -29) : escala === 'semana' ? moverDia(segunda(hoje), -77) : somarMesChave(MES(agora), -11)
  const chaves = Array.from({ length: escala === 'dia' ? 30 : 12 }, (_, i) => escala === 'dia' ? moverDia(inicio, i) : escala === 'semana' ? moverDia(inicio, i * 7) : somarMesChave(inicio, i))
  const pontos = chaves.map(chave => ({ chave, cadastro: 0, nova: 0, renovacao: 0, volta: 0, receita: 0 }))
  const mapa = new Map(pontos.map(p => [p.chave, p]))
  for (const e of eventos) { if (e.em > agora) continue; const p = mapa.get(chavePeriodo(e.em, escala)); if (p) { p[e.tipo]++; p.receita += e.valor } }
  return pontos
}
export interface PrimeirosEstudos { id_usuario: string; primeira: string | null; decima: string | null }
export interface CoorteCompra { mes: string; pessoas: LinhaUsuario[]; comecaram: number; dez: number; compraram: number; janelas: Array<{ dias: number; elegiveis: number; pagaram: number }>; tempos: number[] }
export function coortesCompra(usuarios: LinhaUsuario[], cobrancas: Cobranca[], estudos: PrimeirosEstudos[] | null, agora = Date.now()): CoorteCompra[] {
  const primeira = new Map<string, number>()
  for (const c of cobrancas) if (c.em.getTime() <= agora) primeira.set(c.id_usuario, Math.min(primeira.get(c.id_usuario) ?? Infinity, c.em.getTime()))
  const mapa = new Map<string, CoorteCompra>()
  const porPessoa = new Map((estudos ?? []).map(e => [e.id_usuario, e]))
  for (const u of usuarios) {
    const criado = new Date(u.criado_em).getTime(); if (criado > agora) continue
    const mes = MES(new Date(criado)), c = mapa.get(mes) ?? { mes, pessoas: [], comecaram: 0, dez: 0, compraram: 0, janelas: [7, 14, 30].map(dias => ({ dias, elegiveis: 0, pagaram: 0 })), tempos: [] }
    c.pessoas.push(u)
    const estudo = porPessoa.get(u.id_usuario)
    if (estudo?.primeira || u.respondidas > 0) c.comecaram++
    if (estudo?.decima || u.respondidas >= 10) c.dez++
    const compra = primeira.get(u.id_usuario), tempo = compra === undefined ? null : Math.max(0, (compra - criado) / UM_DIA)
    if (tempo !== null) { c.compraram++; c.tempos.push(tempo) }
    for (const j of c.janelas) if (agora - criado >= j.dias * UM_DIA) { j.elegiveis++; if (tempo !== null && tempo <= j.dias) j.pagaram++ }
    mapa.set(mes, c)
  }
  return [...mapa.values()].sort((a, b) => b.mes.localeCompare(a.mes))
}
export const mediana = (valores: number[]) => { const v = [...valores].sort((a, b) => a - b); return v.length ? (v[Math.floor((v.length - 1) / 2)] + v[Math.floor(v.length / 2)]) / 2 : null }
export const percentual = (n: number, d: number) => d ? `${Math.round(n / d * 100)}%` : '—'

const TIPOS_MOVIMENTO = ['cadastro', 'nova', 'renovacao', 'volta'] as const
/** Contagens e curvas de períodos equivalentes. Nunca usa registros futuros ou o restante do período anterior na comparação principal. */
export function compararMovimento(eventos: readonly EventoNegocio[], escala: Escala, agora = new Date()) {
  const janela = janelas(escala, agora)
  const contagens = Object.fromEntries(TIPOS_MOVIMENTO.map(tipo => [tipo, {
    atuais: eventos.filter(e => e.tipo === tipo && e.em.getTime() >= janela.inicio && e.em.getTime() <= janela.fim),
    anteriores: eventos.filter(e => e.tipo === tipo && e.em.getTime() >= janela.anterior && e.em.getTime() < janela.ateAnterior),
    anteriorCompleto: eventos.filter(e => e.tipo === tipo && e.em.getTime() >= janela.anterior && e.em.getTime() < janela.inicio),
  }])) as Record<typeof TIPOS_MOVIMENTO[number], { atuais: EventoNegocio[]; anteriores: EventoNegocio[]; anteriorCompleto: EventoNegocio[] }>
  const passo = escala === 'dia' ? 3_600_000 : UM_DIA
  const cortes: number[] = []
  for (let t = janela.inicio + passo; t < janela.fim; t += passo) cortes.push(t)
  cortes.push(janela.fim)
  const hora = (t: number) => new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(t)
  const pontos = [{ rotulo: 'Início', atualAte: janela.inicio, anteriorAte: janela.anterior, cadastro: [0, 0], nova: [0, 0] }, ...cortes.map((t, i) => {
    const ultimo = i === cortes.length - 1
    const anteriorAte = Math.min(janela.ateAnterior, janela.anterior + t - janela.inicio)
    const rotulo = escala === 'dia' ? hora(t) : escala === 'semana'
      ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][Math.min(6, Math.floor((t - janela.inicio - (ultimo ? 0 : 1)) / UM_DIA))]
      : String(Math.min(31, Math.floor((t - janela.inicio - (ultimo ? 0 : 1)) / UM_DIA) + 1)).padStart(2, '0')
    const valores = (tipo: 'cadastro' | 'nova') => [
      contagens[tipo].atuais.filter(e => ultimo ? e.em.getTime() <= t : e.em.getTime() < t).length,
      contagens[tipo].anteriores.filter(e => e.em.getTime() < anteriorAte).length,
    ]
    return { rotulo: ultimo && escala !== 'dia' ? `${rotulo} · agora` : rotulo, atualAte: t, anteriorAte, cadastro: valores('cadastro'), nova: valores('nova') }
  })]
  return { janela, contagens, pontos, anteriorMaisCurto: escala === 'mes' && janela.ateAnterior === janela.inicio && janela.fim - janela.inicio > janela.inicio - janela.anterior }
}
