import { useEffect, useMemo, useState } from 'react'
import { baixarCsv } from '../../componentes/admin/formatos'
import { linkMercadoPago } from '../../componentes/admin/pagamentos'
import { MES, cobrancas as cobrancasDe, cobrancasReembolsadas, somarMesChave } from '../../componentes/admin/receita'
import { SITUACAO_COBRANCA, rotuloMeio, rotuloPlano, rotuloTipoCobranca, type SituacaoCobranca } from '../../componentes/admin/rotulos'
import { usarPainel } from '../dados/painel'
import { usarNav } from '../nav'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { combina, dataSemana, inteiro, normalizar, pct, reais } from '../ui/formato'
import { Busca, Cabeca, Carregando, Estado, Faixa, Filtro, Segmento, Selo, SeloQualidade } from '../ui/kit'

type Periodo = 'mes' | 'passado' | '90' | '365' | 'tudo'
const PERIODOS: Array<[Periodo, string]> = [['mes', 'Este mês'], ['passado', 'Mês passado'], ['90', '3 meses'], ['365', '12 meses'], ['tudo', 'Tudo']]
const NOME_PERIODO: Record<Periodo, string> = { mes: 'neste mês', passado: 'no mês passado', '90': 'nos últimos 3 meses', '365': 'nos últimos 12 meses', tudo: 'desde o começo' }
type FiltroSituacao = 'todas' | SituacaoCobranca
const POR_VEZ = 60
const FUSO = 'America/Sao_Paulo'
const diaChave = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: FUSO })
const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })
const dataBr = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: FUSO })

interface Linha {
  chave: string; em: Date; id_usuario: string; nome: string; email: string | null
  plano: string; meio: 'pix' | 'cartao'; tipo: string; valor: number; situacao: SituacaoCobranca
  id_pagamento: string | null; reembolsadaEm: Date | null
}

/**
 * Receita › Cobranças: o dinheiro que entrou, como um extrato agrupado por dia. Mesmas contas da Visão financeira
 * (receita.ts), então os totais batem. Reembolsadas aparecem riscadas e não somam; estimadas ficam marcadas.
 */
export default function Cobrancas() {
  const p = usarPainel()
  const nav = usarNav()
  const [periodo, definirPeriodo] = useState<Periodo>('mes')
  const [meio, definirMeio] = useState<'todos' | 'pix' | 'cartao'>('todos')
  const [situacao, definirSituacao] = useState<FiltroSituacao>('todas')
  const [busca, definirBusca] = useState('')
  const [limite, definirLimite] = useState(POR_VEZ)
  useEffect(() => { definirLimite(POR_VEZ) }, [periodo, meio, situacao, busca])
  const assinaturas = p.reais
  const parte = defParte('cobrancas')

  const linhas = useMemo((): Linha[] => {
    if (!assinaturas) return []
    const nomes = new Map<string, { nome: string | null; email: string | null }>()
    for (const a of assinaturas) { const x = nomes.get(a.id_usuario); if (!x || (!x.nome && a.nome)) nomes.set(a.id_usuario, { nome: a.nome ?? x?.nome ?? null, email: a.usuario ?? x?.email ?? null }) }
    const pessoa = (id: string) => { const n = nomes.get(id); return { nome: n?.nome || n?.email || 'Pessoa sem nome', email: n?.email ?? null } }
    const pagas = cobrancasDe(assinaturas, p.cobrancas).map((c, i): Linha => ({ chave: `p${i}`, em: c.em, id_usuario: c.id_usuario, ...pessoa(c.id_usuario), plano: c.plano, meio: c.meio, tipo: rotuloTipoCobranca(c), valor: c.valor, situacao: c.estimada ? 'estimada' : 'paga', id_pagamento: c.id_pagamento ?? null, reembolsadaEm: null }))
    const devolvidas = cobrancasReembolsadas(assinaturas, p.cobrancas).map((c, i): Linha => ({ chave: `r${i}`, em: c.em, id_usuario: c.id_usuario, ...pessoa(c.id_usuario), plano: c.plano, meio: c.meio, tipo: rotuloTipoCobranca(c), valor: c.valor, situacao: 'reembolsada', id_pagamento: c.id_pagamento ?? null, reembolsadaEm: c.reembolsadaEm }))
    return [...pagas, ...devolvidas].sort((x, y) => y.em.getTime() - x.em.getTime())
  }, [assinaturas, p.cobrancas])

  const doPeriodo = useMemo(() => {
    const agora = new Date(), esteMes = MES(agora)
    return linhas.filter(l => periodo === 'tudo' ? true : periodo === 'mes' ? MES(l.em) === esteMes : periodo === 'passado' ? MES(l.em) === somarMesChave(esteMes, -1) : agora.getTime() - l.em.getTime() <= Number(periodo) * 86_400_000)
  }, [linhas, periodo])
  const doMeio = useMemo(() => doPeriodo.filter(l => meio === 'todos' || l.meio === meio), [doPeriodo, meio])
  const termo = normalizar(busca.trim())
  const visiveis = useMemo(() => doMeio.filter(l => (situacao === 'todas' || l.situacao === situacao) && combina([l.nome, l.email, rotuloPlano(l.plano), l.id_pagamento], termo)), [doMeio, situacao, termo])
  const totais = useMemo(() => {
    const entram = doMeio.filter(l => l.situacao !== 'reembolsada'), soma = (x: Linha[]) => x.reduce((s, l) => s + l.valor, 0)
    const devolvidas = doMeio.filter(l => l.situacao === 'reembolsada')
    return { bruto: soma(entram), quantidade: entram.length, confirmado: soma(entram.filter(l => l.situacao === 'paga')), estimado: soma(entram.filter(l => l.situacao === 'estimada')), estimadas: entram.filter(l => l.situacao === 'estimada').length,
      cartao: soma(entram.filter(l => l.meio === 'cartao')), pix: soma(entram.filter(l => l.meio === 'pix')), devolvido: soma(devolvidas), devolvidas: devolvidas.length }
  }, [doMeio])
  const dias = useMemo(() => {
    const grupos: Array<{ dia: string; data: Date; linhas: Linha[]; soma: number }> = []
    for (const l of visiveis.slice(0, limite)) {
      const k = diaChave(l.em), ultimo = grupos[grupos.length - 1]
      if (ultimo?.dia === k) { ultimo.linhas.push(l); if (l.situacao !== 'reembolsada') ultimo.soma += l.valor }
      else grupos.push({ dia: k, data: l.em, linhas: [l], soma: l.situacao !== 'reembolsada' ? l.valor : 0 })
    }
    return grupos
  }, [visiveis, limite])

  if (!assinaturas || p.cobrancasCarregando) return <Carregando linhas={8} texto="Carregando as cobranças…" />
  const exportar = () => baixarCsv(`ortoquestoes-cobrancas-lista-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Data', 'Hora', 'Pessoa', 'E-mail', 'Plano', 'Meio', 'Tipo', 'Valor bruto', 'Situação', 'Reembolsada em', 'Pagamento no Mercado Pago'],
    visiveis.map(l => [dataBr(l.em), hora(l.em), l.nome, l.email, rotuloPlano(l.plano), rotuloMeio(l.meio), l.tipo, l.valor.toFixed(2).replace('.', ','), SITUACAO_COBRANCA[l.situacao], l.reembolsadaEm ? dataBr(l.reembolsadaEm) : '', l.id_pagamento ?? '']))
  const contagem = (s: FiltroSituacao) => doMeio.filter(l => s === 'todas' || l.situacao === s).length

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Receita" titulo={parte.rotulo} pergunta={`${parte.pergunta} Valores brutos; taxa e líquido estão no extrato do Mercado Pago (o banco não guarda a taxa).${p.testes ? ' Contas de teste do dono ficam de fora.' : ''}`}
      acoes={<><Segmento rotulo="Período" valor={periodo} aoMudar={definirPeriodo} opcoes={PERIODOS} />
        <button type="button" className="a3-botao a3-botao--contorno" onClick={exportar} disabled={!visiveis.length}><Icone nome="baixar" tamanho={15} />CSV</button></>} />
    {p.avisoCobrancas && <Faixa tom="aviso" titulo="Cobranças gravadas indisponíveis">{p.avisoCobrancas}</Faixa>}

    <section className="a3-painel a3-extrato-topo" aria-label={`Totais ${NOME_PERIODO[periodo]}`}>
      <div className="a3-metrica a3-metrica--grande">
        <span className="a3-rotulo">Recebido {NOME_PERIODO[periodo]}</span>
        <span className="a3-metrica__valor">{reais(totais.bruto)}</span>
        <span className="a3-metrica__linha">{inteiro(totais.quantidade)} {totais.quantidade === 1 ? 'cobrança' : 'cobranças'}{meio !== 'todos' ? ` · só ${rotuloMeio(meio)}` : ''}</span>
      </div>
      <dl className="a3-pares">
        <div><dt><SeloQualidade q="confirmado" /> Confirmado</dt><dd>{reais(totais.confirmado)}</dd></div>
        <div><dt><SeloQualidade q="estimado" /> Reconstruído</dt><dd>{reais(totais.estimado)} <span className="a3-mudo">· {totais.estimadas}</span></dd></div>
        <div><dt>Cartão · Pix</dt><dd>{reais(totais.cartao)} · {reais(totais.pix)} {totais.bruto ? <span className="a3-mudo">({pct(Math.round((totais.pix / totais.bruto) * 100))} Pix)</span> : null}</dd></div>
        <div><dt>Devolvido (fora do total)</dt><dd style={{ color: totais.devolvido ? 'var(--a3-erro)' : undefined }}>{reais(totais.devolvido)} <span className="a3-mudo">· {totais.devolvidas}</span></dd></div>
      </dl>
    </section>

    <section className="a3-painel" aria-label="Extrato de cobranças">
      <div className="a3-filtros">
        <Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar pessoa, e-mail ou número do pagamento" />
        <label className="a3-filtro">Meio<select value={meio} onChange={e => definirMeio(e.target.value as typeof meio)}><option value="todos">Pix e cartão</option><option value="pix">Pix</option><option value="cartao">Cartão</option></select></label>
      </div>
      <div className="a3-filtros" style={{ paddingTop: 0 }} role="group" aria-label="Situação">
        {(['todas', 'paga', 'estimada', 'reembolsada'] as const).map(s => <Filtro key={s} ativo={situacao === s} aoClicar={() => definirSituacao(s)} contagem={contagem(s)}>{s === 'todas' ? 'Todas' : s === 'paga' ? 'Pagas' : s === 'estimada' ? 'Reconstruídas' : 'Reembolsadas'}</Filtro>)}
      </div>
      {dias.length === 0 ? <div style={{ padding: 20 }}><Estado icone="receita" titulo={`Nenhuma cobrança ${NOME_PERIODO[periodo]}`} texto={situacao !== 'todas' || busca ? 'Tire um filtro para ver mais.' : 'É zero de verdade, não falta de dado.'} /></div> :
        <ol className="a3-extrato">{dias.map(d => <li key={d.dia}>
          <div className="a3-extrato__dia"><span>{dataSemana(d.data)}</span><b>{reais(d.soma)}</b></div>
          <ul>{d.linhas.map(l => {
            const link = linkMercadoPago(l.id_pagamento)
            return <li key={l.chave} className={'a3-extrato__linha' + (l.situacao === 'reembolsada' ? ' devolvida' : '')}>
              <span className="a3-extrato__hora num">{hora(l.em)}</span>
              <button type="button" className="a3-extrato__quem" onClick={() => nav.abrirPessoa(l.id_usuario, 'assinatura')}>
                <span className="a3-nome">{l.nome}</span>
                <span className="a3-sub">{rotuloPlano(l.plano)} · {l.tipo}{l.email && l.email !== l.nome ? ` · ${l.email}` : ''}</span>
              </button>
              <span className="a3-extrato__selos"><Selo contorno>{rotuloMeio(l.meio)}</Selo>{l.situacao === 'estimada' && <Selo>Reconstruída</Selo>}{l.situacao === 'reembolsada' && <Selo tom="erro">Reembolsada{l.reembolsadaEm ? ` em ${dataBr(l.reembolsadaEm)}` : ''}</Selo>}</span>
              <span className="a3-extrato__valor num">{l.situacao === 'reembolsada' ? '−' : '+'}{reais(l.valor)}</span>
              {link ? <a className="a3-botao a3-botao--fantasma a3-botao--icone a3-botao--pequeno" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Abrir o pagamento de ${l.nome} no Mercado Pago`} title="Abrir no Mercado Pago"><Icone nome="externo" tamanho={15} /></a> : <span className="a3-extrato__vazio" />}
            </li>
          })}</ul>
        </li>)}</ol>}
      {visiveis.length > limite && <div className="a3-paginacao"><span>{inteiro(limite)} de {inteiro(visiveis.length)}</span>
        <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => definirLimite(n => n + POR_VEZ)}>Mostrar mais {Math.min(POR_VEZ, visiveis.length - limite)}</button></div>}
    </section>
    <p className="a3-mudo a3-pequeno">Reconstruída: renovação antiga do cartão refeita pelo período do plano (o banco guarda só a última cobrança de cada cartão) ou assinatura paga sem a cobrança gravada.</p>
  </div>
}
