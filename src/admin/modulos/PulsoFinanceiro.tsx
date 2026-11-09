import { useMemo, useState } from 'react'
import { baixarCsv } from '../../componentes/admin/formatos'
import { calcularGanhos } from '../../componentes/admin/ganhos'
import { DIA, MES, NOME_MES, inicioDoMes, vigentesPorPessoa, type Cobranca } from '../../componentes/admin/receita'
import { baseNoInstante, periodosPagos } from '../dados/metas'
import { diaCurto, janelas, serieNegocio, type Escala } from '../dados/negocio'
import { usarPainel, type LinhaAssinatura } from '../dados/painel'
import { usarNav } from '../nav'
import { reais } from '../ui/formato'
import { Icone } from '../ui/Icone'
import { Linhas } from '../ui/linhas'
import { AnelDeFechamento, ComparacaoVisual } from '../ui/resumosVisuais'
import { Segmento } from '../ui/kit'

export function PulsoFinanceiro({ cobrancas, assinaturas, fechamento, taxa }: { cobrancas: Cobranca[]; assinaturas: LinhaAssinatura[]; fechamento: number; taxa: number }) {
  const p = usarPainel(), nav = usarNav()
  const [escala, mudar] = useState<Escala>('dia')
  const g = useMemo(() => calcularGanhos(cobrancas), [cobrancas])
  const agora = new Date(), mes = MES(agora)
  const vigente = vigentesPorPessoa(assinaturas), idsAgora = new Set(vigente.map(a => a.id_usuario))
  const periodos = periodosPagos(cobrancas), inicio = inicioDoMes(mes).getTime()
  const inicioIds = new Set(periodos.filter(p => p.inicio < inicio && p.fim >= inicio).map(p => p.id_usuario))
  const entraram = [...idsAgora].filter(id => !inicioIds.has(id)), sairam = [...inicioIds].filter(id => !idsAgora.has(id))
  const novosIds = new Set(cobrancas.filter(c => c.tipo === 'nova' && MES(c.em) === mes).map(c => c.id_usuario))
  const novos = entraram.filter(id => novosIds.has(id)).length
  const [pessoas, definirPessoas] = useState<{ titulo: string; ids: string[] } | null>(null)
  function mostrar(grupo: { titulo: string; ids: string[] } | null) {
    definirPessoas(grupo)
    if (grupo) requestAnimationFrame(() => document.getElementById('fi-pessoas-do-numero')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }))
  }
  const eventos = cobrancas.map(c => ({ id: c.id_usuario, tipo: c.tipo, em: c.em, valor: c.valor, estimada: c.estimada }))
  const serie = serieNegocio(eventos, escala, agora)
  const confirmadas = serieNegocio(eventos.filter(e => !e.estimada), escala, agora)
  const estimadoMes = cobrancas.filter(c => c.estimada && MES(c.em) === mes && c.em <= agora).reduce((s, c) => s + c.valor, 0)
  const conhecidos = new Map(assinaturas.map(a => [a.id_usuario, a.nome || a.usuario || 'Pessoa sem nome']))
  const j = janelas('mes', agora)
  const antes = cobrancas.filter(c => c.em.getTime() >= j.anterior && c.em.getTime() < j.ateAnterior).reduce((s, c) => s + c.valor, 0)
  const base = baseNoInstante(periodos, agora.getTime())
  const planos = [['mensal','Mensal'],['semestral','Semestral'],['anual','Anual']] as const
  const composicao: Array<{ nome: string; quantidade: number }> = planos.map(([id,nome]) => ({ nome, quantidade: vigente.filter(a => a.plano === id).length }))
  const outros = vigente.filter(a => !planos.some(([id]) => id === a.plano)).length
  if (outros) composicao.push({ nome: 'Outros', quantidade: outros })
  return <>
    <header className="ng-cabeca"><div className="ng-sobre"><b>Financeiro</b><span>{NOME_MES(mes)}</span><span>Valores brutos</span></div><h1>O dinheiro e as pessoas por trás dele.</h1><p>O que já entrou, o que pode entrar e como a base de clientes está mudando. Recebimento, previsão e objetivo têm lugares diferentes.</p><nav className="ng-ancoras" aria-label="Partes do Financeiro">{[['fi-caixa','Recebido'],['fi-base','Base de clientes'],['fi-calendario','Calendário'],['fi-mensais','Mensais'],['fi-longos','Semestrais e anuais'],['fi-previsao','Previsão']].map(([id, texto]) => <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{texto}</a>)}<a href={nav.link('metas')} onClick={e => { e.preventDefault(); nav.ir('metas') }}>Objetivos do mês →</a></nav></header>
    <section className="nv-financeiro" aria-label="Visão gráfica do mês financeiro">
      <article className="nv-financeiro-recebido"><span className="nv-rotulo">Recebido neste mês</span><strong className="nv-valor">{reais(g.mes.valor)}</strong><p className="nv-contexto">{g.mes.valor > antes ? 'Acima' : g.mes.valor < antes ? 'Abaixo' : 'No mesmo nível'} do mesmo trecho do mês anterior</p><ComparacaoVisual atual={g.mes.valor} anterior={antes} rotuloAtual="Este mês" rotuloAnterior="Mês anterior" formato={reais} /><p className="ng-nota">{reais(g.mes.valor - estimadoMes)} com valor gravado{estimadoMes > 0 ? ` + ${reais(estimadoMes)} estimados` : ''}. Comparação até o mesmo horário.</p></article>
      <article className="nv-financeiro-previsao"><span className="nv-rotulo">Possível fechamento · carteira atual</span><strong className="nv-valor">{reais(fechamento)}</strong><AnelDeFechamento recebido={g.mes.valor} fechamento={fechamento} /><p className="ng-nota">Recebido + próximos vencimentos, com {Math.round(taxa * 100)}% de recompra Pix. Novos clientes ficam fora. O previsto pode mudar.</p></article>
      <article className="nv-financeiro-base"><span className="nv-rotulo">Pagantes com acesso hoje</span><button type="button" className="ng-numero nv-valor nv-base-botao" aria-label={`Ver ${idsAgora.size} pagantes com acesso hoje`} onClick={() => mostrar({ titulo: 'Pagantes com acesso hoje', ids: [...idsAgora] })}>{idsAgora.size}<span className="nv-abrir" aria-hidden="true"><Icone nome="direita" tamanho={16} /></span></button><p className="nv-contexto">Como os pagantes se distribuem por plano</p><div className="nv-composicao" role="img" aria-label={composicao.map(x => `${x.nome}: ${x.quantidade}`).join('. ')}>{composicao.map((x,i) => x.quantidade > 0 ? <span key={x.nome} className={`nv-plano-${i}`} style={{ width: `${x.quantidade / Math.max(1,idsAgora.size) * 100}%` }} /> : null)}</div><ul className="nv-planos">{composicao.map((x,i) => <li key={x.nome}><i className={`nv-plano-${i}`} /><span>{x.nome}</span><b>{x.quantidade}</b><small>{idsAgora.size ? `${(x.quantidade / idsAgora.size * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'}</small></li>)}</ul><p className="ng-nota">Uma pessoa por conta, sem cortesia.<br />Base mensalizada pelo histórico: {reais(base.receitaEquivalente)}</p></article>
    </section>
    <section id="fi-caixa" className="ng-secao"><div className="ng-titulo"><div><span className="ng-kicker">01 / Recebimento</span><h2>Quanto entrou, e quando</h2><p>Últimos 30 dias, 12 semanas ou 12 meses. O período atual está em andamento.</p></div><Segmento rotulo="Escala da receita" valor={escala} aoMudar={mudar} opcoes={[['dia','Dia'],['semana','Semana'],['mes','Mês']]} /></div>
      <div className="ng-painel"><Linhas titulo="Receita recebida e parcela com valor gravado" formato={reais} pontos={serie.map((s, i) => ({ rotulo: escala === 'mes' ? NOME_MES(s.chave, true) : diaCurto(s.chave), valores: [s.receita, confirmadas[i].receita], nota: i === serie.length - 1 ? 'Período em andamento' : undefined }))} series={[{ nome: 'Total, incluindo estimativas' }, { nome: 'Com valor gravado', tracejada: true }]} />
        <dl className="ng-resumo"><div><dt>Hoje</dt><dd>{reais(g.hoje.valor)}</dd><small>{g.hoje.quantidade} cobranças</small></div><div><dt>Últimos 7 dias</dt><dd>{reais(g.semana.valor)}</dd><small>Inclui hoje até agora</small></div><div><dt>Desde o começo</dt><dd>{reais(g.total.valor)}</dd><small>{reais(g.ano.valor)} em {g.chaveAno}</small></div></dl>
        <p className="ng-nota">Cobranças devolvidas ficam fora do recebido; reembolsos aparecem separadamente no extrato. Valores antes das taxas do Mercado Pago. Histórico reconstruído não equivale a extrato bancário.</p>
      </div>
    </section>
    <section id="fi-base" className="ng-secao"><div className="ng-titulo"><div><span className="ng-kicker">02 / Clientes</span><h2>Como a base chegou até aqui</h2><p>Base no início de {NOME_MES(mes, true).replace('.', '')}, entradas ainda ativas e pessoas que ficaram sem acesso.</p></div></div><div className="ng-painel"><div className="ng-ponte">{[
      { titulo: 'Começamos com', n: inicioIds.size, ids: [...inicioIds] },
      { titulo: '+ Novos, com acesso', n: novos, ids: entraram.filter(id => novosIds.has(id)) },
      { titulo: '+ Retornos / ajustes', n: entraram.length - novos, ids: entraram.filter(id => !novosIds.has(id)) },
      { titulo: '− Sem acesso agora', n: sairam.length, ids: sairam },
      { titulo: '= Com acesso hoje', n: idsAgora.size, ids: [...idsAgora] },
    ].map((x, i) => <div key={x.titulo} className={i === 4 ? 'ng-final' : ''}><span>{x.titulo}</span><b><button type="button" className="ng-numero" onClick={() => mostrar({ titulo: x.titulo.replace(/^[+=−]\s*/, ''), ids: x.ids })}>{x.n}</button></b></div>)}</div><p className="ng-nota">Início do mês reconstruído pelos períodos pagos; hoje usa o acesso vigente no site. A ponte acompanha a diferença entre essas duas bases, incluindo ajustes. Quem comprou e perdeu acesso dentro do mês não aparece entre as entradas ainda ativas.</p>
      {pessoas && <div id="fi-pessoas-do-numero"><div className="ng-titulo"><h3>{pessoas.titulo}</h3><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => mostrar(null)}>Fechar pessoas</button></div><ul className="ng-pessoas">{pessoas.ids.map(id => <li key={id}><button type="button" onClick={() => nav.abrirPessoa(id, 'assinatura')}>{conhecidos.get(id) ?? p.usuarios?.find(u => u.id_usuario === id)?.nome ?? 'Pessoa sem nome'}</button></li>)}</ul>{!pessoas.ids.length && <p className="ng-nota">Nenhuma pessoa neste grupo.</p>}</div>}
      <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => baixarCsv(`receita-${DIA(agora)}.csv`, ['Data','Total bruto','Com valor gravado','Estimado'], serie.map((s, i) => [s.chave, s.receita.toFixed(2), confirmadas[i].receita.toFixed(2), (s.receita - confirmadas[i].receita).toFixed(2)]))}>CSV da receita por período</button>
    </div></section>
  </>
}
