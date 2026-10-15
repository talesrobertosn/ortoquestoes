import { useCallback, useEffect, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { carregarIndice, carregarQuestoes } from '../../dados/acervo'
import { DURACAO_EDICAO_MIN, DURACAO_VESPERA_MIN, QUESTOES_EDICAO, QUESTOES_VESPERA, escolherEdicao, escolherVespera, edicaoDoMes, fimDaEdicao, type CandidataEdicao } from '../../dados/simuladoNacional'
import { nivelPorQuestao } from '../../dados/incidencia'
import { nomeEdicao } from '../../estado/sessao'
import { dataHora, erroDoPainel } from './formatos'
import { confirmar } from '../Confirmar'

const MIGRACAO = '202609300100_recursos_pagos.sql'
const PROVAS_NACIONAL = new Set(['TEOT/TARO', 'TEOT', 'TARO', 'CET-PR'])

interface Edicao { edicao: string; titulo: string; abre_em: string; fecha_em: string; duracao_min: number; total: number; iniciaram: number; entregaram: number; media: number | null; ids: string[] | null }

/** O mês seguinte à última edição publicada (e nunca um mês que já passou). */
export function proximaEdicao(existentes: string[], atual = edicaoDoMes()) {
  // Só as mensais ("2026-11"); edições especiais, como a de véspera, não contam.
  const ultima = existentes.filter((e) => /^\d{4}-\d{2}$/.test(e)).sort().pop()
  if (!ultima || ultima < atual) return atual
  let [ano, mes] = ultima.split('-').map(Number)
  mes++; if (mes > 12) { mes = 1; ano++ }
  return `${ano}-${String(mes).padStart(2, '0')}`
}

const contarPorTema = (itens: CandidataEdicao[]) => {
  const contagem = new Map<string, number>()
  for (const i of itens) contagem.set(i.tema, (contagem.get(i.tema) ?? 0) + 1)
  return [...contagem].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(' · ')
}

/** Painel › Operações › Simulados: Simulado Nacional do mês e simulado de véspera (antes ficavam em Ajustes). */
export function AdminSimulados() {
  const [edicoes, definirEdicoes] = useState<Edicao[] | null>(null)
  const [montada, definirMontada] = useState<{ edicao: string; itens: CandidataEdicao[] } | null>(null)
  const [montando, definirMontando] = useState(false)
  const [erro, definirErro] = useState('')
  const [vespera, definirVespera] = useState({ prova: '2027-01-10', abre: '2026-12-27', questoes: QUESTOES_VESPERA, duracao: DURACAO_VESPERA_MIN })
  const [montadaVespera, definirMontadaVespera] = useState<{ edicao: string; itens: CandidataEdicao[] } | null>(null)
  // Sucesso e erro tinham a mesma cor verde: erro parecia confirmação.
  const [mensagem, definirRecado] = useState<{ texto: string; erro: boolean }>({ texto: '', erro: false })
  const definirMensagem = (texto: string) => definirRecado({ texto, erro: false })
  const definirFalha = (texto: string) => definirRecado({ texto, erro: true })

  const carregar = useCallback(async () => {
    try { definirEdicoes(await chamarRpc<Edicao[]>('listar_simulados_admin', {})); definirErro('') }
    catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  /** Questões de prova candidatas a simulado: TEOT/TARO, com gabarito, sem anuladas nem figura faltando. */
  async function candidatasDeProva() {
    const indice = await carregarIndice()
    const elegiveis = indice.questoes.filter((q) => !q.dup && q.an !== 1 && q.sim !== 1 && q.p !== null && PROVAS_NACIONAL.has(indice.provas[q.p]))
    const questoes = await carregarQuestoes(indice, elegiveis.map((q) => q.id))
    return { indice, questoes: questoes.filter((q) => !q.anulada && !q.figuraPendente && /^[A-E]$/.test(q.gabarito ?? '')) }
  }

  async function montarProxima() {
    if (!edicoes) return
    definirMontando(true); definirMontada(null)
    try {
      const { questoes } = await candidatasDeProva()
      const candidatas = questoes.map((q) => ({ id: q.id, tema: q.tema, gabarito: q.gabarito! }))
      const usadas = new Set(edicoes.flatMap((e) => e.ids ?? []))
      const edicao = proximaEdicao(edicoes.map((e) => e.edicao))
      definirMontada({ edicao, itens: escolherEdicao(candidatas, edicao, QUESTOES_EDICAO, usadas) })
    } catch { definirFalha('Não foi possível montar a edição (acervo não carregou).') }
    finally { definirMontando(false) }
  }

  async function montarVespera() {
    if (!edicoes) return
    definirMontando(true); definirMontadaVespera(null)
    try {
      const { indice, questoes } = await candidatasDeProva()
      const niveis = nivelPorQuestao(indice)
      const candidatas = questoes.map((q) => ({ id: q.id, tema: q.tema, gabarito: q.gabarito!, nivel: niveis.get(q.id) ?? 0, ano: q.ano }))
      const usadas = new Set(edicoes.flatMap((e) => e.ids ?? []))
      const edicao = `${vespera.prova.slice(0, 7)}-vespera`
      definirMontadaVespera({ edicao, itens: escolherVespera(candidatas, edicao, vespera.questoes, usadas) })
    } catch { definirFalha('Não foi possível montar o simulado de véspera (acervo não carregou).') }
    finally { definirMontando(false) }
  }

  async function publicarVespera() {
    if (!montadaVespera) return
    // Abre às 00:00 e fecha às 23:59 da véspera, no horário de Brasília (UTC-3).
    const abre = new Date(`${vespera.abre}T00:00:00-03:00`)
    const fecha = new Date(new Date(`${vespera.prova}T00:00:00-03:00`).getTime() - 1000)
    if (!(fecha > abre)) { definirFalha('A abertura precisa ser antes da véspera da prova.'); return }
    const anoProva = vespera.prova.slice(0, 4)
    const titulo = `Simulado de véspera · Prova ${anoProva}`
    if (!(await confirmar({ titulo: `Publicar "${titulo}"?`, texto: `${montadaVespera.itens.length} questões em ${vespera.duracao / 60} h. Fica no ar de ${abre.toLocaleDateString('pt-BR')} até ${fecha.toLocaleDateString('pt-BR')}.`, sim: 'Publicar' }))) return
    try {
      await chamarRpc('publicar_simulado_admin', { p_edicao: montadaVespera.edicao, p_titulo: titulo, p_abre: abre.toISOString(), p_fecha: fecha.toISOString(), p_duracao: vespera.duracao, p_itens: montadaVespera.itens })
      definirMontadaVespera(null); definirMensagem(`${titulo} publicado.`); await carregar()
    } catch (f) { definirFalha(`Não foi possível publicar: ${erroDoPainel(f, '202610050100_editor_questoes.sql')}`) }
  }

  async function publicar() {
    if (!montada) return
    const [ano, m] = montada.edicao.split('-').map(Number)
    const abre = new Date(Date.UTC(ano, m - 1, 1, 3, 0, 0))
    const titulo = `Simulado Nacional · ${nomeEdicao(montada.edicao).replace(/^./, (c) => c.toUpperCase())}`
    if (!(await confirmar({ titulo: `Publicar "${titulo}"?`, texto: `Abre em ${abre.toLocaleDateString('pt-BR')} e fecha no fim do mês.`, sim: 'Publicar' }))) return
    try {
      await chamarRpc('publicar_simulado_admin', { p_edicao: montada.edicao, p_titulo: titulo, p_abre: abre.toISOString(), p_fecha: fimDaEdicao(montada.edicao), p_duracao: DURACAO_EDICAO_MIN, p_itens: montada.itens })
      definirMontada(null); definirMensagem(`${titulo} publicado.`); await carregar()
    } catch { definirFalha('Não foi possível publicar (edição já tem participantes?).') }
  }

  if (erro) return <section className="adm-secao"><h2>Simulados</h2><p role="alert" className="adm-alerta">{erro}</p></section>
  if (!edicoes) return <section className="adm-secao"><p role="status">Carregando os simulados…</p></section>

  return <div className="empilha-2">
    {mensagem.texto && <p role={mensagem.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (mensagem.erro ? ' adm-mensagem--erro' : '')}>{mensagem.texto}</p>}
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-nacional">
      <div><h2 id="adm-titulo-nacional">Simulado Nacional</h2><p>{QUESTOES_EDICAO} questões de TEOT e TARO em {DURACAO_EDICAO_MIN / 60} horas, uma edição por mês. O sorteio segue a proporção dos temas e evita repetir questões de edições anteriores.</p></div>
      {edicoes.length === 0 ? <p className="adm-vazio">Nenhuma edição publicada.</p> : <ul className="adm-mini">
        {edicoes.map((e) => <li key={e.edicao}><span className="adm-mini__nome">{e.titulo}<small>{dataHora(e.abre_em)} a {dataHora(e.fecha_em)} · {e.total} questões · {e.iniciaram} começaram · {e.entregaram} entregaram{e.media != null ? ` · média ${Math.round(e.media)}%` : ''}</small></span><span className={'adm-selo ' + (Date.parse(e.fecha_em) < Date.now() ? 'adm-selo--neutro' : Date.parse(e.abre_em) > Date.now() ? '' : 'adm-selo--ok')}>{Date.parse(e.fecha_em) < Date.now() ? 'Encerrada' : Date.parse(e.abre_em) > Date.now() ? 'Agendada' : 'No ar'}</span></li>)}
      </ul>}
      {montada && <div className="adm-edicao-previa">
        <p><strong>{nomeEdicao(montada.edicao)}</strong>: {montada.itens.length} questões</p>
        <p className="adm-nota">{contarPorTema(montada.itens)}</p>
      </div>}
      <div className="linha">
        {!montada ? <button type="button" className="botao" disabled={montando} onClick={() => void montarProxima()}>{montando ? 'Sorteando…' : 'Montar a próxima edição'}</button>
          : <><button type="button" className="botao botao--principal" onClick={() => void publicar()}>Publicar {nomeEdicao(montada.edicao)}</button><button type="button" className="botao botao--fantasma" onClick={() => definirMontada(null)}>Descartar</button></>}
      </div>
    </section>

    <section className="empilha adm-secao" aria-labelledby="adm-titulo-vespera">
      <div><h2 id="adm-titulo-vespera">Simulado de véspera</h2><p>Uma prova inteira para a reta final: as questões seguem a proporção dos temas, com prioridade para os assuntos que mais caem e as provas mais recentes, sem repetir o que já saiu no Simulado Nacional. Aparece na mesma página do Simulado Nacional, com ranking e correção.</p></div>
      <div className="adm-editor__linha">
        <label className="campo">Dia da prova<input className="entrada" type="date" value={vespera.prova} onChange={(e) => e.target.value && definirVespera({ ...vespera, prova: e.target.value })} /></label>
        <label className="campo">Abre em<input className="entrada" type="date" value={vespera.abre} onChange={(e) => e.target.value && definirVespera({ ...vespera, abre: e.target.value })} /></label>
        <label className="campo">Questões<select className="entrada" value={vespera.questoes} onChange={(e) => definirVespera({ ...vespera, questoes: Number(e.target.value) })}>{[50, 80, 100, 120].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <label className="campo">Duração<select className="entrada" value={vespera.duracao} onChange={(e) => definirVespera({ ...vespera, duracao: Number(e.target.value) })}>{[120, 180, 240, 300].map((n) => <option key={n} value={n}>{n / 60} horas</option>)}</select></label>
      </div>
      <p className="adm-nota">Fica no ar até 23:59 da véspera. Enquanto estiver no ar, é o simulado em destaque na página; depois aparece entre as edições anteriores.</p>
      {montadaVespera && <div className="adm-edicao-previa">
        <p><strong>{nomeEdicao(montadaVespera.edicao)}</strong>: {montadaVespera.itens.length} questões</p>
        <p className="adm-nota">{contarPorTema(montadaVespera.itens)}</p>
      </div>}
      <div className="linha">
        {!montadaVespera ? <button type="button" className="botao" disabled={montando} onClick={() => void montarVespera()}>{montando ? 'Sorteando…' : 'Montar o simulado de véspera'}</button>
          : <><button type="button" className="botao botao--principal" onClick={() => void publicarVespera()}>Publicar simulado de véspera</button><button type="button" className="botao botao--fantasma" onClick={() => definirMontadaVespera(null)}>Descartar</button></>}
      </div>
    </section>
  </div>
}
