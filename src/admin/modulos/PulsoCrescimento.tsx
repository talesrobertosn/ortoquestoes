import { useMemo, useState } from 'react'
import { baixarCsv } from '../../componentes/admin/formatos'
import { cobrancas as lerCobrancas, DIA, NOME_MES } from '../../componentes/admin/receita'
import { CINCO_MIN, usarRpc } from '../../componentes/admin/usarRpc'
import { chamarRpc } from '../../servicos/supabase'
import { chavePeriodo, coortesCompra, dataSP, diaCurto, eventosNegocio, janelas, mediana, moverDia, percentual, serieNegocio, UM_DIA, type Escala, type EventoNegocio, type PrimeirosEstudos } from '../dados/negocio'
import { usarPainel } from '../dados/painel'
import type { Coorte } from '../dados/consultas'
import type { DiaSerie } from '../../componentes/admin/estudoHoje'
import { usarNav } from '../nav'
import { inteiro } from '../ui/formato'
import { Colunas } from '../ui/graficos'
import { Linhas } from '../ui/linhas'
import { Carregando, Estado, Segmento } from '../ui/kit'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'

export interface Jornada { serie: DiaSerie[]; coortes: Coorte[]; primeiros: PrimeirosEstudos[] }
export function usarJornada() {
  const p = usarPainel()
  const excluidos = useMemo(() => { const ids = new Set((p.usuariosReais ?? []).map(u => u.id_usuario)); return (p.usuarios ?? []).filter(u => !ids.has(u.id_usuario)).map(u => u.id_usuario).sort() }, [p.usuarios, p.usuariosReais])
  return usarRpc<Jornada>(p.conta, 'jornada_crescimento_admin', { p_excluir: excluidos, p_dias: 365 }, { ativo: !!p.usuariosReais, atualizarCada: CINCO_MIN, prazoMs: 25000 })
}
const TIPOS = [['cadastro', 'Cadastros'], ['nova', 'Primeiras assinaturas'], ['renovacao', 'Renovações'], ['volta', 'Voltaram a pagar']] as const
const ESCALAS: Array<[Escala, string]> = [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']]

export function PulsoCrescimento() {
  const p = usarPainel()
  const nav = usarNav()
  const anotacoes = usarRpc<Anotacao[]>(p.conta, 'listar_anotacoes_negocio_admin')
  const [escala, escolherEscala] = useState<Escala>('dia')
  const [metrica, escolherMetrica] = useState<'cadastro' | 'nova'>('cadastro')
  const [visual, escolherVisual] = useState<'colunas' | 'tendencia'>('colunas')
  const [abertas, mostrar] = useState<{ titulo: string; eventos: EventoNegocio[] } | null>(null)
  const [dia, escolherDia] = useState(DIA(new Date()))
  const eventos = useMemo(() => p.usuariosReais && p.reais ? eventosNegocio(p.usuariosReais, lerCobrancas(p.reais, p.cobrancas)) : null, [p.usuariosReais, p.reais, p.cobrancas])
  if (!eventos && (p.usuariosQ.erro || p.assinaturasQ.erro)) return <div className="ng-painel"><Estado tipo="erro" titulo="Não foi possível carregar o movimento" texto="Os números estão indisponíveis; tente atualizar os dados." /><button type="button" className="a3-botao" onClick={() => void p.atualizar()}>Tentar novamente</button></div>
  if (!eventos || p.cobrancasCarregando) return <Carregando texto="Organizando cadastros e compras…" />
  const agora = new Date(), serie = serieNegocio(eventos, escala, agora)
  const porId = new Map((p.usuariosReais ?? []).map(u => [u.id_usuario, u]))
  const nome = (id: string) => porId.get(id)?.nome || porId.get(id)?.email || 'Pessoa sem nome'
  const porTipo = (e: EventoNegocio, tipo: string) => e.tipo === tipo
  const nomeP = (k: string) => escala === 'mes' ? NOME_MES(k, true).replace('.', '') : diaCurto(k)
  const pontos = serie.map((s, i) => ({ longo: [s.chave, ...(anotacoes.dados ?? []).filter(n => chavePeriodo(dataSP(String(n.dia).slice(0,10)), escala) === s.chave).map(n => n.texto)].join(' · '), curto: nomeP(s.chave), partes: [s.cadastro, s.nova], parcial: i === serie.length - 1 }))
  const diario = serieNegocio(eventos, 'dia', agora)
  const medias = diario.map((_, i) => { const fim = dataSP(diario[i].chave).getTime(); return eventos.filter(e => e.tipo === metrica && e.em.getTime() >= fim - 6 * UM_DIA && e.em.getTime() < fim + UM_DIA && e.em <= agora).length / 7 })
  const calor = Array.from({ length: 91 }, (_, i) => { const chave = moverDia(DIA(agora), i - 90); return { chave, n: eventos.filter(e => e.tipo === metrica && DIA(e.em) === chave && e.em <= agora).length } })
  const maxCalor = Math.max(1, ...calor.map(d => d.n))
  const doDia = eventos.filter(e => e.tipo === metrica && DIA(e.em) === dia && e.em <= agora)
  return <section id="cr-pulso" className="ng-secao">
    <div className="ng-titulo"><div><span className="ng-kicker">01 / Movimento</span><h2>Cadastros e assinaturas, de perto</h2><p>Hoje, nesta semana e neste mês. Clique nos números para ver as pessoas.</p></div><button className="a3-botao a3-botao--contorno a3-botao--pequeno" type="button" onClick={() => baixarCsv('crescimento-por-periodo.csv', ['Período', 'Cadastros', 'Primeiras assinaturas', 'Renovações', 'Voltas'], serie.map(s => [s.chave, s.cadastro, s.nova, s.renovacao, s.volta]))}>Baixar CSV</button></div>
    <div className="ng-painel">
      <div className="a3-tabela-caixa ng-so-pc"><table className="ng-tabela"><thead><tr><th scope="col">Período</th>{TIPOS.map(([k, n]) => <th key={k} scope="col">{n}</th>)}</tr></thead><tbody>{ESCALAS.map(([e], i) => {
        const j = janelas(e, agora)
        return <tr key={e}><th scope="row"><b>{['Hoje', 'Nesta semana', 'Neste mês'][i]}</b><small>{['até agora', 'desde segunda-feira', 'desde o dia 1º'][i]}</small></th>{TIPOS.map(([tipo, rotulo]) => {
          const atuais = eventos.filter(ev => porTipo(ev, tipo) && ev.em.getTime() >= j.inicio && ev.em.getTime() <= j.fim)
          const antes = eventos.filter(ev => porTipo(ev, tipo) && ev.em.getTime() >= j.anterior && ev.em.getTime() < j.ateAnterior).length
          const delta = atuais.length - antes
          return <td key={tipo}><button type="button" className="ng-numero" aria-label={`${rotulo}: ${atuais.length}, ${['hoje', 'nesta semana', 'neste mês'][i]}. Ver pessoas`} onClick={() => mostrar({ titulo: `${rotulo} · ${['hoje', 'nesta semana', 'neste mês'][i]}`, eventos: atuais })}><strong>{inteiro(atuais.length)}</strong></button><small className={delta > 0 ? 'ng-positivo' : delta < 0 ? 'ng-negativo' : ''}>{delta > 0 ? '+' : ''}{delta} vs. {antes} antes</small></td>
        })}</tr>
      })}</tbody></table></div>
      <table className="ng-tabela ng-so-cel"><thead><tr><th>Movimento</th><th>Hoje</th><th>Semana</th><th>Mês</th></tr></thead><tbody>{TIPOS.map(([tipo, rotulo]) => <tr key={tipo}><th scope="row">{rotulo}</th>{ESCALAS.map(([e], i) => {
        const j = janelas(e, agora), atuais = eventos.filter(ev => porTipo(ev, tipo) && ev.em.getTime() >= j.inicio && ev.em.getTime() <= j.fim)
        const antes = eventos.filter(ev => porTipo(ev, tipo) && ev.em.getTime() >= j.anterior && ev.em.getTime() < j.ateAnterior).length
        return <td key={e}><button type="button" className="ng-numero" aria-label={`${rotulo}: ${atuais.length}, ${['hoje','nesta semana','neste mês'][i]}. Ver pessoas`} onClick={() => mostrar({ titulo: `${rotulo} · ${['hoje','nesta semana','neste mês'][i]}`, eventos: atuais })}><strong>{atuais.length}</strong></button><small>antes: {antes}</small></td>
      })}</tr>)}</tbody></table>
      <p className="ng-nota">Comparação até o mesmo horário: ontem, os mesmos dias da semana anterior e o mesmo trecho do mês anterior. Primeira assinatura = primeira compra paga; renovação e volta são cobranças, podendo repetir uma pessoa. Contas de teste, administrador e fora do público ficam de fora; horário de São Paulo.</p>
      {abertas && <div id="cr-pessoas-do-numero" className="ng-detalhe-numero"><div className="ng-titulo"><h3>{abertas.titulo}</h3><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => mostrar(null)}>Fechar pessoas</button></div>{abertas.eventos.length ? <ul className="ng-pessoas">{[...abertas.eventos].sort((a, b) => b.em.getTime() - a.em.getTime()).map((ev, i) => <li key={i}><button type="button" onClick={() => nav.abrirPessoa(ev.id)}><span>{nome(ev.id)}{ev.estimada && <small>Compra com valor ou histórico estimado</small>}</span><small>{ev.em.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</small></button></li>)}</ul> : <p className="ng-nota">Nenhum registro neste período.</p>}</div>}
    </div>
    <div className="ng-painel">
      <div className="ng-titulo"><div><h3>O ritmo ao longo do tempo</h3><p>Cadastros e primeiras assinaturas lado a lado. O último período está em andamento.</p></div><Segmento rotulo="Escala do crescimento" valor={escala} aoMudar={escolherEscala} opcoes={ESCALAS} /></div>
      <div className="ng-filtros"><Segmento rotulo="Visual do crescimento" valor={visual} aoMudar={escolherVisual} opcoes={[['colunas', 'Colunas'], ['tendencia', 'Linhas']]} /></div>
      {visual === 'colunas' ? <Colunas descricao="Cadastros e primeiras assinaturas por período" pontos={pontos} series={[{ nome: 'Cadastros' }, { nome: 'Primeiras assinaturas', estilo: 2 }]} lado altura={260} media={false} /> : <Linhas titulo="Evolução de cadastros e primeiras assinaturas" pontos={serie.map(s => ({ rotulo: nomeP(s.chave), valores: [s.cadastro, s.nova], nota: (anotacoes.dados ?? []).filter(n => chavePeriodo(dataSP(String(n.dia).slice(0,10)), escala) === s.chave).map(n => n.texto).join(' · ') || undefined }))} series={[{ nome: 'Cadastros' }, { nome: 'Primeiras assinaturas' }]} />}
      <details className="ng-dados"><summary>Ver todas as contagens deste gráfico</summary><div className="a3-tabela-caixa"><table className="a3-tabela"><thead><tr><th>Período</th>{TIPOS.map(([k, n]) => <th key={k}>{n}</th>)}</tr></thead><tbody>{serie.map(s => <tr key={s.chave}><th>{s.chave}</th>{TIPOS.map(([k]) => <td key={k}>{s[k]}</td>)}</tr>)}</tbody></table></div></details>
    </div>
    <div className="ng-grade-2">
      <div className="ng-painel"><div className="ng-titulo"><div><h3>A tendência, sem o ruído diário</h3><p>A média de sete dias suaviza os picos. Hoje ainda está incompleto.</p></div></div><Segmento rotulo="Métrica da tendência e calendário" valor={metrica} aoMudar={escolherMetrica} opcoes={[['cadastro', 'Cadastros'], ['nova', 'Primeiras assinaturas']]} /><Linhas titulo="Contagem diária e média móvel de sete dias" pontos={diario.map((s, i) => ({ rotulo: diaCurto(s.chave), valores: [s[metrica], medias[i]] }))} series={[{ nome: 'No dia' }, { nome: 'Média de 7 dias', tracejada: true }]} formato={v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} /></div>
      <div className="ng-painel"><div className="ng-titulo"><div><h3>91 dias de movimento</h3><p>{metrica === 'cadastro' ? 'Cadastros' : 'Primeiras assinaturas'} por dia. Cada coluna reúne sete dias, do mais antigo ao mais recente. Quanto mais forte a cor, maior o movimento.</p></div></div><div className="ng-calor">{calor.map(d => <button key={d.chave} type="button" data-nivel={d.n === 0 ? 0 : Math.min(3, Math.ceil(d.n / maxCalor * 3))} aria-pressed={dia === d.chave} aria-label={`${diaCurto(d.chave)}: ${d.n} ${metrica === 'cadastro' ? 'cadastros' : 'primeiras assinaturas'}`} title={`${diaCurto(d.chave)} · ${d.n}`} onClick={() => escolherDia(d.chave)}>{d.n || ''}</button>)}</div><p className="ng-nota" style={{ marginTop: 16 }}><b>{diaCurto(dia)} · {doDia.length}</b> {metrica === 'cadastro' ? 'cadastros' : 'primeiras assinaturas'} <button type="button" className="ng-numero" onClick={() => mostrar({ titulo: `${diaCurto(dia)} · ${metrica === 'cadastro' ? 'Cadastros' : 'Primeiras assinaturas'}`, eventos: doDia })}>Ver pessoas ↑</button></p></div>
    </div>
    <Anotacoes />
  </section>
}

export function JornadaDeCompra({ estudos, carregando, erro }: { estudos: PrimeirosEstudos[] | null; carregando: boolean; erro: unknown }) {
  const p = usarPainel()
  const coortes = useMemo(() => p.usuariosReais && p.reais ? coortesCompra(p.usuariosReais, lerCobrancas(p.reais, p.cobrancas), estudos) : null, [p.usuariosReais, p.reais, p.cobrancas, estudos])
  if (!coortes) return null
  const total = coortes.reduce((n, c) => n + c.pessoas.length, 0), comecaram = coortes.reduce((n, c) => n + c.comecaram, 0), dez = coortes.reduce((n, c) => n + c.dez, 0), compraram = coortes.reduce((n, c) => n + c.compraram, 0)
  const tempoCompra = mediana(coortes.flatMap(c => c.tempos))
  const usuarios = new Map((p.usuariosReais ?? []).map(u => [u.id_usuario, new Date(u.criado_em).getTime()]))
  const tempoEstudo = mediana((estudos ?? []).filter(e => e.primeira && usuarios.has(e.id_usuario)).map(e => Math.max(0, (new Date(e.primeira!).getTime() - usuarios.get(e.id_usuario)!) / 3600000)))
  return <section id="cr-funil" className="ng-secao"><div className="ng-titulo"><div><span className="ng-kicker">02 / Da chegada à compra</span><h2>O que acontece depois do cadastro?</h2><p>A mesma base de pessoas do público-alvo, do começo ao fim. Comprar e estudar são comportamentos medidos separadamente.</p></div></div>
    <div className="ng-painel"><div className="ng-jornada">{[['Cadastraram', total], ['Começaram a estudar', comecaram], ['Fizeram 10 questões', dez], ['Já compraram', compraram]].map(([n, v]) => <div key={String(n)} className="ng-etapa"><span>{n}</span><b>{inteiro(Number(v))}</b><div className="mt-barra"><i style={{ width: `${Number(v) / Math.max(1, total) * 100}%` }} /></div><small>{percentual(Number(v), total)} dos cadastros</small></div>)}</div>
      <dl className="ng-resumo"><div><dt>Até a primeira questão</dt><dd>{tempoEstudo === null ? '—' : tempoEstudo < 1 ? `${Math.round(tempoEstudo * 60)} min` : `${Math.round(tempoEstudo)} h`}</dd><small>Mediana do primeiro registro disponível</small></div><div><dt>Até a primeira compra</dt><dd>{tempoCompra === null ? '—' : tempoCompra < 1 ? 'menos de 1 dia' : `${Math.round(tempoCompra)} dias`}</dd><small>Mediana entre quem já comprou</small></div><div><dt>Já se tornaram clientes</dt><dd>{percentual(compraram, total)}</dd><small>Histórico completo; inclui cadastros recentes</small></div></dl>
      {carregando && <p className="ng-nota">Carregando os primeiros eventos de estudo…</p>}{!!erro && <p className="ng-nota">Datas de primeiro estudo indisponíveis. As contagens de questões continuam disponíveis; tente Atualizar.</p>}
      <p className="ng-nota">Datas de estudo vêm do primeiro registro disponível no progresso atual. Reiniciar o progresso pode alterar essa medida.</p>
      <h3>O destino de cada mês de cadastro</h3><p className="ng-nota">Conversão em 7, 14 ou 30 dias só considera pessoas que já tiveram todo esse tempo para comprar. Cadastros recentes aguardam completar a janela.</p>
      <div className="a3-tabela-caixa"><table className="a3-tabela"><thead><tr><th>Mês de cadastro</th><th className="num">Cadastros</th><th className="num">Começaram</th><th className="num">10 questões</th><th className="num">Já compraram</th>{[7, 14, 30].map(n => <th key={n} className="num">Em {n} dias</th>)}</tr></thead><tbody>{coortes.map(c => <tr key={c.mes}><th scope="row">{NOME_MES(c.mes)}</th><td className="num">{c.pessoas.length}</td><td className="num">{c.comecaram}</td><td className="num">{c.dez}</td><td className="num">{c.compraram}<small className="a3-sub">{percentual(c.compraram, c.pessoas.length)}</small></td>{c.janelas.map(j => <td key={j.dias} className="num">{percentual(j.pagaram, j.elegiveis)}<small className="a3-sub">{j.elegiveis ? `${j.pagaram} de ${j.elegiveis}` : 'aguardando'}</small></td>)}</tr>)}</tbody></table></div>
      <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => baixarCsv('coortes-de-cadastro.csv', ['Mês', 'Cadastros', 'Começaram', '10 questões', 'Compraram', 'Compraram 7d', 'Elegíveis 7d', 'Compraram 14d', 'Elegíveis 14d', 'Compraram 30d', 'Elegíveis 30d'], coortes.map(c => [c.mes, c.pessoas.length, c.comecaram, c.dez, c.compraram, ...c.janelas.flatMap(j => [j.pagaram, j.elegiveis])]))}>Baixar coortes em CSV</button>
    </div>
  </section>
}

interface Anotacao { id: number; dia: string; texto: string }
function Anotacoes() {
  const p = usarPainel()
  const q = usarRpc<Anotacao[]>(p.conta, 'listar_anotacoes_negocio_admin')
  const [dia, definirDia] = useState(DIA(new Date())), [texto, definirTexto] = useState(''), [ocupado, ocupar] = useState(false)
  async function salvar() { ocupar(true); try { await chamarRpc('salvar_anotacao_negocio_admin', { p_dia: dia, p_texto: texto.trim() }); definirTexto(''); await q.recarregar(); avisoRapido('Anotação salva.') } catch { avisoRapido('Não foi possível salvar a anotação.', 'erro') } finally { ocupar(false) } }
  async function remover(id: number) { if (!await confirmar({ titulo: 'Excluir esta anotação?', texto: 'Somente a anotação será excluída; os dados do negócio continuam iguais.', sim: 'Excluir' })) return; ocupar(true); try { await chamarRpc('remover_anotacao_negocio_admin', { p_id: id }); await q.recarregar() } catch { avisoRapido('Não foi possível excluir.', 'erro') } finally { ocupar(false) } }
  return <details className="ng-detalhes"><summary>O que aconteceu nesses dias? <small>Anote campanhas, posts e mudanças</small></summary><p className="ng-nota">Contexto para investigar os gráficos. Uma coincidência no calendário não prova que uma campanha causou o resultado.</p>
    {!!q.erro ? <Estado compacto tipo="erro" titulo="Anotações indisponíveis" texto="Tente atualizar os dados." /> : <><form className="ng-formulario" onSubmit={e => { e.preventDefault(); void salvar() }}><label>Data<input className="a3-entrada" type="date" required value={dia} onChange={e => definirDia(e.target.value)} /></label><label>O que aconteceu?<input className="a3-entrada" required minLength={3} maxLength={200} value={texto} onChange={e => definirTexto(e.target.value)} placeholder="Ex.: campanha de TEOT começou" /></label><button type="submit" className="a3-botao" disabled={ocupado || texto.trim().length < 3}>Salvar anotação</button></form><ul className="ng-anotacoes">{(q.dados ?? []).map(n => <li key={n.id}><time>{diaCurto(String(n.dia).slice(0, 10))}</time><span>{n.texto}</span><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" disabled={ocupado} onClick={() => void remover(n.id)}>Excluir</button></li>)}</ul>{q.dados?.length === 0 && <p className="ng-nota">Nenhuma anotação ainda.</p>}</>}
  </details>
}
