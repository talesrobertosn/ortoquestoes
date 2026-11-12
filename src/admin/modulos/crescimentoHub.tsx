import { useMemo, useState } from 'react'
import { DIA, MES, NOME_MES, cobrancas as lerCobrancas } from '../../componentes/admin/receita'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { chavesPeriodos } from '../dados/hub'
import { META_OFICIAL } from '../dados/metas'
import { chavePeriodo, dataSP, eventosNegocio, janelas, type Escala, type EventoNegocio } from '../dados/negocio'
import { usarPainel } from '../dados/painel'
import { usarNav } from '../nav'
import { inteiro } from '../ui/formato'
import { Carregando, Segmento } from '../ui/kit'
import { Torres, Variacao, type PontoTorre } from '../ui/torres'
import './hub.css'

/**
 * O topo do Crescimento refeito em 11/11/2026 (Tales: "os gráficos do crescimento são difíceis de entender; vi que
 * não mudou nada"). No mesmo padrão do Financeiro: um placar de hoje, da semana e do mês com a comparação justa
 * (o mesmo trecho do período anterior), os totais desde o começo e as torres de cadastros e de assinantes novos por
 * dia, semana ou mês, com a meta do plano e as anotações de campanha na dica. Toque num número para ver as pessoas.
 */
const PERIODOS: Array<{ escala: Escala; nome: string; contra: string }> = [
  { escala: 'dia', nome: 'Hoje', contra: 'ontem até esta hora' },
  { escala: 'semana', nome: 'Nesta semana', contra: 'semana passada até agora' },
  { escala: 'mes', nome: 'Neste mês', contra: 'mês passado até o mesmo dia' },
]
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
interface Anotacao { id: number; dia: string; texto: string }

export function PlacarCrescimento() {
  const p = usarPainel()
  const nav = usarNav()
  const anotacoes = usarRpc<Anotacao[]>(p.conta, 'listar_anotacoes_negocio_admin')
  const [escala, definirEscala] = useState<Escala>('dia')
  const [aberto, abrir] = useState<{ titulo: string; eventos: EventoNegocio[] } | null>(null)
  const eventos = useMemo(() => p.usuariosReais && p.reais ? eventosNegocio(p.usuariosReais, lerCobrancas(p.reais, p.cobrancas)) : null, [p.usuariosReais, p.reais, p.cobrancas])
  if (!eventos || p.cobrancasCarregando) return <Carregando linhas={5} texto="Contando cadastros e assinaturas…" />
  const agora = new Date()
  const contar = (tipo: string, de: number, ate: number) => eventos.filter(e => e.tipo === tipo && e.em.getTime() >= de && e.em.getTime() < ate)
  const linhas = [
    { tipo: 'cadastro', nome: 'Cadastros', cor: 'verde' as const },
    { tipo: 'nova', nome: 'Assinantes novos', cor: 'ouro' as const },
  ].map(l => ({ ...l, periodos: PERIODOS.map(per => { const j = janelas(per.escala, agora); return { ...per, atuais: contar(l.tipo, j.inicio, j.fim + 1), antes: contar(l.tipo, j.anterior, j.ateAnterior).length } }) }))
  const contas = p.usuariosReais?.length ?? 0
  const compraram = new Set(eventos.filter(e => e.tipo === 'nova').map(e => e.id)).size
  const semana = (p.usuariosReais ?? []).filter(u => u.respondidas_7d > 0).length
  const mesAtual = linhas.map(l => l.periodos[2].atuais.length)
  // Torres por período.
  const n = escala === 'dia' ? 30 : escala === 'semana' ? 12 : Math.max(3, (() => { const primeiro = eventos.reduce((m, e) => e.em < m ? e.em : m, agora); let k = MES(primeiro), c = 1; while (k < MES(agora) && c < 60) { const [a, mm] = k.split('-').map(Number); k = mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}`; c++ } return c })())
  const chaves = chavesPeriodos(escala, n, agora)
  const meta = new Map(META_OFICIAL.meses.map(m => [m.mes, m]))
  const notas = (k: string) => (anotacoes.dados ?? []).filter(a => chavePeriodo(dataSP(String(a.dia).slice(0, 10)), escala) === k).map(a => a.texto).join(' · ')
  const rot = (k: string) => escala === 'mes' ? { curto: NOME_MES(k, true).replace('.', ''), longo: maiuscula(NOME_MES(k)) } : escala === 'semana' ? { curto: `${k.slice(8)}/${k.slice(5, 7)}`, longo: `Semana de ${k.slice(8)}/${k.slice(5, 7)}` } : { curto: k.slice(8), longo: maiuscula(new Date(`${k}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' })) }
  const serie = (tipo: string, chaveMeta: 'cadastros' | 'novosPagantes'): PontoTorre[] => chaves.map((k, i) => {
    const v = eventos.filter(e => e.tipo === tipo && e.em <= agora && chavePeriodo(e.em, escala) === k).length
    const nota = notas(k)
    return { ...rot(k), partes: [v], parcial: i === chaves.length - 1, meta: escala === 'mes' ? meta.get(k)?.[chaveMeta] : undefined, nota: nota ? `Anotação: ${nota}` : undefined }
  })
  const nomeP = escala === 'dia' ? 'dia' : escala === 'semana' ? 'semana' : 'mês'
  const porId = new Map((p.usuariosReais ?? []).map(u => [u.id_usuario, u]))
  return <section id="cr-pulso" className="hb-secao" aria-labelledby="cr-pulso-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Movimento</span><h2 id="cr-pulso-t">Quem chegou e quem assinou</h2><p>Hoje, nesta semana e neste mês, contra o mesmo trecho do período anterior. Toque num número para ver as pessoas.</p></div></div>
    <div className="hb-painel hb-cresc">
      <div className="hb-cresc__grade" role="table" aria-label="Cadastros e assinantes novos por período">
        <div className="hb-cresc__linha hb-cresc__cab" role="row"><span role="columnheader" />{PERIODOS.map(per => <span key={per.escala} role="columnheader">{per.nome}</span>)}</div>
        {linhas.map(l => <div key={l.tipo} className="hb-cresc__linha" role="row">
          <span role="rowheader" className="hb-cresc__nome"><i className={`hb-chave hb-c-${l.cor}`} aria-hidden="true" />{l.nome}</span>
          {l.periodos.map(per => { const maior = Math.max(1, per.atuais.length, per.antes); return <span key={per.escala} role="cell" className="hb-cresc__cel">
            <button type="button" className="hb-cresc__num" onClick={() => abrir({ titulo: `${l.nome} · ${per.nome.toLowerCase()}`, eventos: per.atuais })} aria-label={`${l.nome} ${per.nome.toLowerCase()}: ${per.atuais.length}. Ver pessoas`}>{inteiro(per.atuais.length)}</button>
            <Variacao atual={per.atuais.length} anterior={per.antes} />
            <span className="hb-cresc__barras" aria-hidden="true"><i className={`hb-c-${l.cor}`} style={{ width: `${per.atuais.length / maior * 100}%` }} /><i className="hb-c-cinza-claro" style={{ width: `${per.antes / maior * 100}%` }} /></span>
            <small>contra {inteiro(per.antes)} ({per.contra})</small>
          </span> })}
        </div>)}
        <div className="hb-cresc__linha" role="row">
          <span role="rowheader" className="hb-cresc__nome"><i className="hb-chave hb-c-azul" aria-hidden="true" />Assinaram, entre os cadastros</span>
          {PERIODOS.map((per, i) => { const c = linhas[0].periodos[i].atuais, ids = new Set(eventos.filter(e => e.tipo === 'nova').map(e => e.id)), pagaram = c.filter(e => ids.has(e.id)).length; return <span key={per.escala} role="cell" className="hb-cresc__cel"><b className="hb-cresc__num hb-cresc__num--fixo">{c.length ? `${Math.round(pagaram / c.length * 100)}%` : '—'}</b><small>{pagaram} de {c.length} já assinaram</small></span> })}
        </div>
      </div>
      {aberto && <div className="hb-pessoas">
        <div className="hb-titulo"><h3>{aberto.titulo} <small>{aberto.eventos.length} {aberto.eventos.length === 1 ? 'pessoa' : 'pessoas'}</small></h3><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => abrir(null)}>Fechar</button></div>
        {aberto.eventos.length ? <ul>{[...aberto.eventos].sort((a, b) => b.em.getTime() - a.em.getTime()).map((ev, i) => { const u = porId.get(ev.id); return <li key={i}><button type="button" onClick={() => nav.abrirPessoa(ev.id)}><span>{u?.nome || u?.email || 'Pessoa sem nome'}</span><small>{ev.em.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}{u?.servico ? ` · ${u.servico}` : ''}</small></button></li> })}</ul> : <p className="hb-nota">Ninguém neste período ainda.</p>}
      </div>}
      <dl className="hb-mini">
        <div><dt>Contas reais desde o começo</dt><dd>{inteiro(contas)}</dd><small>sem teste, administrador e fora do público</small></div>
        <div><dt>Já assinaram</dt><dd>{inteiro(compraram)}</dd><small>{contas ? `${Math.round(compraram / contas * 100)}% das contas` : '—'}</small></div>
        <div><dt>Estudaram nos últimos 7 dias</dt><dd>{inteiro(semana)}</dd><small>{contas ? `${Math.round(semana / contas * 100)}% das contas` : '—'} · hoje {DIA(agora).slice(8)}/{DIA(agora).slice(5, 7)}</small></div>
      </dl>
      <p className="hb-nota">Neste mês: {mesAtual[0]} cadastros e {mesAtual[1]} assinantes novos{meta.get(MES(agora)) ? ` (plano do mês: ${meta.get(MES(agora))!.cadastros} e ${meta.get(MES(agora))!.novosPagantes})` : ''}. Primeira assinatura = primeira compra paga da pessoa; renovação fica no Financeiro.</p>
    </div>
    <div className="hb-titulo"><div><h3>Por {nomeP}</h3><p>{escala === 'mes' ? 'O traço é a meta do plano de cada mês. ' : ''}O último período ainda está em andamento. Passe o dedo ou o mouse para ver a anotação de campanha do período, se houver.</p></div>
      <Segmento rotulo="Período dos gráficos de crescimento" valor={escala} aoMudar={definirEscala} opcoes={[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']]} /></div>
    <div className="hb-cresc__torres">
      <div className="hb-painel"><h3 className="hb-cresc__h">Cadastros por {nomeP}</h3><Torres titulo={`Cadastros por ${nomeP}`} pontos={serie('cadastro', 'cadastros')} series={[{ nome: 'Cadastros', cor: 'verde' }]} altura={220} rotuloMeta="Meta do plano" /></div>
      <div className="hb-painel"><h3 className="hb-cresc__h">Assinantes novos por {nomeP}</h3><Torres titulo={`Assinantes novos por ${nomeP}`} pontos={serie('nova', 'novosPagantes')} series={[{ nome: 'Assinantes novos', cor: 'ouro' }]} altura={220} rotuloMeta="Meta do plano" /></div>
    </div>
  </section>
}
