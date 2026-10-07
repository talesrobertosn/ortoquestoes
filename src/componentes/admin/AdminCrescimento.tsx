import { AdminLembretes } from './AdminLembretes'
import { useEffect, useMemo, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { PLANOS as PRECOS, real } from '../../dados/planos'
import { BarrasHorizontais, GraficoColunas, type Ponto } from './AdminGraficos'
import { erroDoPainel, porcentagem } from './formatos'
import { AdminPerfis } from './AdminPerfis'
import type { LinhaUsuario } from './AdminUsuarios'
import { TabelaMensal } from './AdminMensal'
import { mesAMes, meioDe, previsao, recorrentesNoCartao, renovaSozinha, vigente, type AssinaturaBase } from './receita'

interface Dia { dia: string; cadastros: number; ativos: number; respostas: number }
interface Funil { cadastrados: number; confirmaram: number; responderam: number; passaram_50: number; passaram_500: number; assinaram: number }
interface Coorte { semana: string; cadastros: number; estudaram_1a_semana: number; voltaram_2a_semana: number }
export type AssinaturaReceita = AssinaturaBase

const MIGRACAO = '202609290200_painel_admin_2.sql'
const dataCurta = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}` }
const dataLonga = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })

/**
 * Receita: o que renova sozinho (só cartão), o que entrou e saiu no mês e a
 * série mês a mês. Pix é compra avulsa: não conta como cancelamento quando termina.
 */
function receita(assinaturas: AssinaturaReceita[]) {
  const agora = Date.now()
  const comAcesso = assinaturas.filter(a => vigente(a, agora))
  const porPlano = PRECOS.map(p => {
    const lista = comAcesso.filter(a => a.plano === p.id)
    const renovam = lista.filter(renovaSozinha)
    return { ...p, vigentes: lista.length, renovam: renovam.length, pix: lista.filter(a => meioDe(a) === 'pix').length, mensal: renovam.length * (p.total / p.meses) }
  })
  const meses = mesAMes(assinaturas, 12)
  const atual = meses[meses.length - 1], anterior = meses[meses.length - 2]
  const [prox] = previsao(assinaturas, 2)
  const proximos30 = assinaturas.filter(a => renovaSozinha(a) && a.fim_periodo && new Date(a.fim_periodo).getTime() > agora && new Date(a.fim_periodo).getTime() - agora < 30 * 86_400_000)
  const pixAcabando = comAcesso.filter(a => meioDe(a) === 'pix' && a.fim_periodo && new Date(a.fim_periodo).getTime() - agora < 30 * 86_400_000)
  const recorrentes = recorrentesNoCartao(assinaturas, agora)
  return {
    porPlano, meses, atual, anterior, proxMes: prox?.[1], recorrentes,
    mrr: porPlano.reduce((s, p) => s + p.mensal, 0),
    valorRecorrente: recorrentes.reduce((s, x) => s + x.valor, 0),
    comAcesso: comAcesso.length,
    renovam: comAcesso.filter(renovaSozinha).length,
    pixComAcesso: comAcesso.filter(a => meioDe(a) === 'pix').length,
    cartaoSemRenovar: comAcesso.filter(a => meioDe(a) === 'cartao' && !renovaSozinha(a)).length,
    renovacoes30: proximos30.length,
    valorRenovacoes30: proximos30.reduce((s, a) => s + (PRECOS.find(p => p.id === a.plano)?.total ?? 0), 0),
    pixAcabando30: pixAcabando.length,
  }
}

export function AdminCrescimento({ assinaturas, usuarios }: { assinaturas: AssinaturaReceita[]; usuarios: LinhaUsuario[] | null }) {
  const [dias, definirDias] = useState(30)
  const [serie, definirSerie] = useState<Dia[] | null>(null)
  const [funil, definirFunil] = useState<Funil | null>(null)
  const [coortes, definirCoortes] = useState<Coorte[] | null>(null)
  const [erro, definirErro] = useState('')

  useEffect(() => {
    let vivo = true
    definirSerie(null)
    chamarRpc<Dia[]>('serie_diaria_admin', { p_dias: dias }).then(d => { if (vivo) definirSerie(d) }).catch(f => vivo && definirErro(erroDoPainel(f, MIGRACAO)))
    return () => { vivo = false }
  }, [dias])
  useEffect(() => {
    let vivo = true
    Promise.all([chamarRpc<Funil[]>('funil_admin', {}), chamarRpc<Coorte[]>('retencao_admin', {})])
      .then(([f, c]) => { if (vivo) { definirFunil(f[0] ?? null); definirCoortes(c) } })
      .catch(f => vivo && definirErro(erroDoPainel(f, MIGRACAO)))
    return () => { vivo = false }
  }, [])

  const pontos = useMemo(() => {
    const mapa = (campo: keyof Omit<Dia, 'dia'>): Ponto[] => (serie ?? []).map(d => ({ rotulo: dataLonga(d.dia), rotuloCurto: dataCurta(d.dia), valor: Number(d[campo]) }))
    return { cadastros: mapa('cadastros'), ativos: mapa('ativos'), respostas: mapa('respostas') }
  }, [serie])
  const r = useMemo(() => receita(assinaturas), [assinaturas])

  if (erro) return <section className="adm-secao"><p role="alert" className="adm-alerta">{erro}</p></section>

  return <div className="empilha-2">
    <AdminLembretes />
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-dia">
      <div className="adm-secao__cabeca">
        <div><h2 id="adm-titulo-dia">Dia a dia</h2><p>Cada gráfico tem a sua escala. A data de uma resposta é a do aparelho de quem respondeu.</p></div>
        <div className="adm-filtros" role="group" aria-label="Período">
          {[30, 90].map(v => <button key={v} type="button" className="adm-chip" aria-pressed={dias === v} onClick={() => definirDias(v)}>{v} dias</button>)}
        </div>
      </div>
      {!serie ? <p role="status">Carregando…</p> : <div className="adm-graficos">
        <GraficoColunas titulo="Questões respondidas" pontos={pontos.respostas} unidade="questões" />
        <GraficoColunas titulo="Pessoas que estudaram" subtitulo="ao menos 1 questão no dia" pontos={pontos.ativos} unidade="pessoas" />
        <GraficoColunas titulo="Cadastros novos" pontos={pontos.cadastros} unidade="cadastros" />
      </div>}
    </section>

    <div className="adm-duas">
      <section className="empilha adm-secao" aria-labelledby="adm-titulo-funil">
        <div><h2 id="adm-titulo-funil">Funil</h2><p>De quem se cadastrou, quantos avançaram em cada etapa. A etapa com a maior queda é onde agir.</p></div>
        {!funil ? <p role="status">Carregando…</p> : <BarrasHorizontais maximo={funil.cadastrados || 1} itens={[
          { rotulo: 'Cadastraram', valor: funil.cadastrados },
          { rotulo: 'Confirmaram o e-mail', valor: funil.confirmaram, detalhe: `${porcentagem(funil.confirmaram, funil.cadastrados) ?? 0}% dos cadastros` },
          { rotulo: 'Responderam a 1ª questão', valor: funil.responderam, detalhe: `${porcentagem(funil.responderam, funil.confirmaram) ?? 0}% de quem confirmou` },
          { rotulo: 'Passaram de 50 questões', valor: funil.passaram_50, detalhe: `${porcentagem(funil.passaram_50, funil.responderam) ?? 0}% de quem começou` },
          { rotulo: 'Passaram de 500 questões', valor: funil.passaram_500, detalhe: `${porcentagem(funil.passaram_500, funil.passaram_50) ?? 0}% de quem passou de 50` },
          { rotulo: 'Assinaram', valor: funil.assinaram, detalhe: `${porcentagem(funil.assinaram, funil.responderam) ?? 0}% de quem estudou` },
        ]} />}
      </section>

      <section className="empilha adm-secao" aria-labelledby="adm-titulo-retencao">
        <div><h2 id="adm-titulo-retencao">Retenção</h2><p>Por semana de cadastro: quem estudou na 1ª semana e quem voltou na 2ª.</p></div>
        {!coortes ? <p role="status">Carregando…</p> : coortes.length === 0 ? <p className="adm-vazio">Ainda não há semanas completas para comparar.</p> :
          <div className="adm-tabela-rolagem" role="region" aria-label="Retenção por semana" tabIndex={0}><table className="tabela adm-retencao">
            <thead><tr><th scope="col">Semana</th><th scope="col">Cadastros</th><th scope="col">Estudaram na 1ª</th><th scope="col">Voltaram na 2ª</th></tr></thead>
            <tbody>{coortes.map(c => {
              const estudou = porcentagem(Number(c.estudaram_1a_semana), Number(c.cadastros)) ?? 0
              const voltou = porcentagem(Number(c.voltaram_2a_semana), Number(c.cadastros)) ?? 0
              return <tr key={c.semana}>
                <td>{dataCurta(c.semana)}</td><td className="numerico">{c.cadastros}</td>
                <td><span className="adm-celula" style={{ '--p': `${estudou}%` } as React.CSSProperties}>{estudou}%</span></td>
                <td><span className="adm-celula" style={{ '--p': `${voltou}%` } as React.CSSProperties}>{voltou}%</span></td>
              </tr>
            })}</tbody>
          </table></div>}
      </section>
    </div>

    {usuarios ? <AdminPerfis usuarios={usuarios} /> : <section className="adm-secao"><p className="adm-vazio">Carregando os perfis…</p></section>}

    <section className="empilha adm-secao" aria-labelledby="adm-titulo-receita">
      <div><h2 id="adm-titulo-receita">Receita</h2><p>Reconstruída a partir das assinaturas, separando cartão (renova sozinho) de Pix (pago uma vez, termina sem renovar). Cancelamento aqui é só quando a pessoa desliga a renovação do cartão; reembolsos e Pix que terminaram aparecem à parte. Contas de teste ficam de fora. Não substitui o extrato do Mercado Pago.</p></div>
      <div className="adm-kpis">
        <div className="adm-kpi adm-kpi--destaque"><span>Receita recorrente no cartão</span><strong>{real(r.valorRecorrente)}</strong><small>{r.renovam} cartão(ões) que renovam sozinhos, somando o valor de cada plano · equivale a {real(r.mrr)} por mês (anual ÷ 12, semestral ÷ 6)</small></div>
        <div className="adm-kpi"><span>Recebido neste mês</span><strong>{real(r.atual?.receita ?? 0)}</strong><small>{r.anterior ? `${real(r.anterior.receita)} no mês passado` : ''}</small></div>
        <div className="adm-kpi"><span>Assinaturas novas no mês</span><strong>{(r.atual?.novasCartao ?? 0) + (r.atual?.novasPix ?? 0)}</strong><small>{r.atual?.novasCartao ?? 0} no cartão · {r.atual?.novasPix ?? 0} no Pix{r.anterior ? ` · ${r.anterior.novasCartao + r.anterior.novasPix} no mês passado` : ''}</small></div>
        <div className="adm-kpi"><span>Renovações automáticas no mês</span><strong>{r.atual?.renovacoes ?? 0}</strong><small>{real(r.atual?.receitaRenovacoes ?? 0)} renovados</small></div>
        <div className="adm-kpi"><span>Cancelamentos no mês</span><strong>{r.atual?.cancelamentos ?? 0}</strong><small>renovação do cartão desligada · {r.atual?.reembolsos ?? 0} reembolso(s)</small></div>
        <div className="adm-kpi"><span>Renovações nos próximos 30 dias</span><strong>{r.renovacoes30}</strong><small>{real(r.valorRenovacoes30)} previstos, se ninguém cancelar</small></div>
        <div className="adm-kpi"><span>Com acesso pago agora</span><strong>{r.comAcesso}</strong><small>{r.renovam} renovam · {r.pixComAcesso} no Pix · {r.cartaoSemRenovar} cartão sem renovar</small></div>
        <div className="adm-kpi"><span>Pix que terminam em 30 dias</span><strong>{r.pixAcabando30}</strong><small>bons candidatos a um lembrete de renovação</small></div>
      </div>
      <details className="adm-grafico__tabela"><summary>Ver os {r.recorrentes.length} cartões que renovam sozinhos</summary>
        {r.recorrentes.length === 0 ? <p className="adm-vazio">Nenhum cartão renovando sozinho agora.</p> :
          <div className="adm-tabela-rolagem" role="region" aria-label="Cartões que renovam sozinhos" tabIndex={0}><table className="tabela">
            <thead><tr><th scope="col">Assinante</th><th scope="col">Plano</th><th scope="col">Valor do plano</th><th scope="col">Por mês</th><th scope="col">Próxima renovação</th></tr></thead>
            <tbody>{r.recorrentes.map((x, i) => <tr key={`${x.assinatura.id_usuario}-${i}`}>
              <td>{x.assinatura.nome || x.assinatura.usuario || x.assinatura.id_usuario.slice(0, 8)}</td><td>{x.plano}</td>
              <td className="numerico">{real(x.valor)}</td><td className="numerico">{real(x.mensal)}</td>
              <td>{x.proxima ? new Date(x.proxima).toLocaleDateString('pt-BR') : 'sem data'}</td>
            </tr>)}</tbody>
          </table></div>}
      </details>
      <p className="adm-vazio">As barras abaixo mostram o equivalente por mês de cada plano.</p>
      <BarrasHorizontais formato={v => real(v)} itens={r.porPlano.map(p => ({ rotulo: `${p.nome} · ${p.vigentes} com acesso`, valor: p.mensal, detalhe: `${real(p.total)} a cada ${p.meses === 1 ? 'mês' : `${p.meses} meses`} · ${p.renovam} renovam sozinhos${p.pix ? ` · ${p.pix} no Pix` : ''}${p.vigentes - p.renovam - p.pix > 0 ? ` · ${p.vigentes - p.renovam - p.pix} cartão sem renovar` : ''}` }))} />
      <h3>Mês a mês</h3>
      <TabelaMensal meses={r.meses} />
    </section>
  </div>
}
