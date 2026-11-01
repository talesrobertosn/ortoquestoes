import { useEffect, useMemo, useState } from 'react'
import { real } from '../../dados/planos'
import { Icone } from '../Icone'
import { AdminFichaUsuario } from './AdminFichaUsuario'
import type { LinhaUsuario } from './AdminUsuarios'
import { nomesDasAssinaturas, type AssinaturaFinanceira } from './AdminFinanceiro'
import { baixarCsv, corresponde, normalizar } from './formatos'
import { linkMercadoPago } from './pagamentos'
import { MES, cobrancas, cobrancasReembolsadas, somarMesChave, type CobrancaReal } from './receita'
import { SITUACAO_COBRANCA, rotuloMeio, rotuloPlano, rotuloTipoCobranca, type SituacaoCobranca } from './rotulos'

type Periodo = 'mes' | 'passado' | '90' | '365' | 'tudo'
const PERIODOS: Array<[Periodo, string]> = [['mes', 'Este mês'], ['passado', 'Mês passado'], ['90', 'Últimos 3 meses'], ['365', 'Últimos 12 meses'], ['tudo', 'Desde o começo']]
type FiltroMeio = 'todos' | 'pix' | 'cartao'
type FiltroSituacao = 'todas' | SituacaoCobranca
const POR_PAGINA = 50
const FUSO = 'America/Sao_Paulo'
const dataCurta = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: FUSO })
const horaCurta = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })

interface Linha {
  chave: string; em: Date; id_usuario: string; nome: string; email: string | null
  plano: string; meio: 'pix' | 'cartao'; tipo: string; valor: number; situacao: SituacaoCobranca
  id_pagamento: string | null; reembolsadaEm: Date | null
}

/**
 * Financeiro › Pagamentos (aba "cobrancas"): o dinheiro que entrou, uma linha por cobrança, da mais nova para a mais
 * antiga, com os totais do período. Sai das mesmas contas do Financeiro (receita.ts), então os
 * totais batem; as devolvidas aparecem riscadas e não somam. Taxa e valor líquido não aparecem
 * porque o banco não guarda a taxa do Mercado Pago (está no extrato dele).
 */
export function AdminCobrancas({ assinaturas, reais, avisoReais, usuarios, testes = 0 }: {
  assinaturas: AssinaturaFinanceira[]; reais: CobrancaReal[] | null; avisoReais: string | null
  usuarios: LinhaUsuario[] | null; testes?: number
}) {
  const [periodo, definirPeriodo] = useState<Periodo>('tudo')
  const [meio, definirMeio] = useState<FiltroMeio>('todos')
  const [situacao, definirSituacao] = useState<FiltroSituacao>('todas')
  const [busca, definirBusca] = useState('')
  const [limite, definirLimite] = useState(POR_PAGINA)
  const [ficha, definirFicha] = useState<LinhaUsuario | null>(null)
  useEffect(() => { definirLimite(POR_PAGINA) }, [periodo, meio, situacao, busca])

  const linhas = useMemo((): Linha[] => {
    const nomes = nomesDasAssinaturas(assinaturas)
    const pessoa = (id: string) => { const n = nomes.get(id); return { nome: n?.nome || n?.email || 'Pessoa sem nome', email: n?.email ?? null } }
    const pagas = cobrancas(assinaturas, reais).map((c, i): Linha => ({
      chave: `p${i}`, em: c.em, id_usuario: c.id_usuario, ...pessoa(c.id_usuario), plano: c.plano, meio: c.meio, tipo: rotuloTipoCobranca(c), valor: c.valor,
      situacao: c.estimada ? 'estimada' : 'paga', id_pagamento: c.id_pagamento ?? null, reembolsadaEm: null,
    }))
    const devolvidas = cobrancasReembolsadas(assinaturas, reais).map((c, i): Linha => ({
      chave: `r${i}`, em: c.em, id_usuario: c.id_usuario, ...pessoa(c.id_usuario), plano: c.plano, meio: c.meio, tipo: rotuloTipoCobranca(c), valor: c.valor,
      situacao: 'reembolsada', id_pagamento: c.id_pagamento ?? null, reembolsadaEm: c.reembolsadaEm,
    }))
    return [...pagas, ...devolvidas].sort((x, y) => y.em.getTime() - x.em.getTime())
  }, [assinaturas, reais])

  const noPeriodo = useMemo(() => {
    const agora = new Date(), esteMes = MES(agora)
    return (l: Linha) => periodo === 'tudo' ? true
      : periodo === 'mes' ? MES(l.em) === esteMes
      : periodo === 'passado' ? MES(l.em) === somarMesChave(esteMes, -1)
      : agora.getTime() - l.em.getTime() <= Number(periodo) * 86_400_000
  }, [periodo])

  const doPeriodo = useMemo(() => linhas.filter(noPeriodo), [linhas, noPeriodo])
  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    return doPeriodo.filter(l => (meio === 'todos' || l.meio === meio) && (situacao === 'todas' || l.situacao === situacao)
      && corresponde([l.nome, l.email, rotuloPlano(l.plano), l.id_pagamento], termo))
  }, [doPeriodo, meio, situacao, busca])

  // Totais do período (com o filtro de meio): devolvidas não somam.
  const totais = useMemo(() => {
    const doMeio = doPeriodo.filter(l => meio === 'todos' || l.meio === meio)
    const entram = doMeio.filter(l => l.situacao !== 'reembolsada')
    const soma = (lista: Linha[]) => lista.reduce((s, l) => s + l.valor, 0)
    return {
      bruto: soma(entram), quantidade: entram.length,
      cartao: soma(entram.filter(l => l.meio === 'cartao')), pix: soma(entram.filter(l => l.meio === 'pix')),
      estimadas: entram.filter(l => l.situacao === 'estimada').length,
      devolvido: soma(doMeio.filter(l => l.situacao === 'reembolsada')), devolvidas: doMeio.filter(l => l.situacao === 'reembolsada').length,
    }
  }, [doPeriodo, meio])
  const contagem = (s: FiltroSituacao) => doPeriodo.filter(l => (meio === 'todos' || l.meio === meio) && (s === 'todas' || l.situacao === s)).length
  const usuarioDe = (id: string) => usuarios?.find(u => u.id_usuario === id) ?? null
  const desenhadas = visiveis.slice(0, limite)
  const nomePeriodo = PERIODOS.find(([v]) => v === periodo)?.[1].toLowerCase() ?? ''

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-cobrancas">
    <div className="adm-secao__cabeca">
      <div>
        <h2 id="adm-titulo-cobrancas">Pagamentos recebidos</h2>
        <p>O dinheiro que entrou, da cobrança mais nova para a mais antiga. Valores brutos; as mesmas contas de Receita › Resultados.{testes > 0 && ` Contas de teste do dono ficam de fora.`}</p>
      </div>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-cobrancas-lista-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Data', 'Hora', 'Pessoa', 'E-mail', 'Plano', 'Meio', 'Tipo', 'Valor bruto', 'Situação', 'Reembolsada em', 'Pagamento no Mercado Pago'],
        visiveis.map(l => [dataCurta(l.em), horaCurta(l.em), l.nome, l.email, rotuloPlano(l.plano), rotuloMeio(l.meio), l.tipo, l.valor.toFixed(2).replace('.', ','), SITUACAO_COBRANCA[l.situacao], l.reembolsadaEm ? dataCurta(l.reembolsadaEm) : '', l.id_pagamento ?? '']))}>
        <Icone nome="baixar" tamanho={15} /> Exportar planilha
      </button>
    </div>
    {avisoReais && <p className="adm-alerta" role="status">{avisoReais}</p>}

    <div className="adm-busca adm-busca--tres">
      <label className="campo">Buscar pessoa, e-mail ou número<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
      <label className="campo">Período<select className="entrada" value={periodo} onChange={e => definirPeriodo(e.target.value as Periodo)}>
        {PERIODOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
      </select></label>
      <label className="campo">Meio<select className="entrada" value={meio} onChange={e => definirMeio(e.target.value as FiltroMeio)}>
        <option value="todos">Pix e cartão</option><option value="pix">Só Pix</option><option value="cartao">Só cartão</option>
      </select></label>
    </div>

    <div className="adm-kpis adm-cob-totais" aria-label={`Totais: ${nomePeriodo}`}>
      <div className="adm-kpi adm-kpi--destaque adm-kpi--dinheiro"><span>Recebido ({nomePeriodo})</span><strong>{real(totais.bruto)}</strong><small>{totais.quantidade.toLocaleString('pt-BR')} cobrança(s){totais.estimadas ? ` · ${totais.estimadas} estimada(s)` : ''}</small></div>
      <div className="adm-kpi"><span><i className="adm-pastilha adm-serie-cartao" aria-hidden="true" />Cartão</span><strong>{real(totais.cartao)}</strong><small>{totais.bruto ? `${Math.round((totais.cartao / totais.bruto) * 100)}% do período` : '—'}</small></div>
      <div className="adm-kpi"><span><i className="adm-pastilha adm-serie-pix" aria-hidden="true" />Pix</span><strong>{real(totais.pix)}</strong><small>{totais.bruto ? `${Math.round((totais.pix / totais.bruto) * 100)}% do período` : '—'}</small></div>
      <div className="adm-kpi"><span>Devolvido</span><strong>{real(totais.devolvido)}</strong><small>{totais.devolvidas} reembolso(s), fora do total</small></div>
    </div>

    <div className="adm-filtros" role="group" aria-label="Filtrar por situação">
      {(['todas', 'paga', 'estimada', 'reembolsada'] as const).map(s => <button key={s} type="button" className="adm-chip" aria-pressed={situacao === s} onClick={() => definirSituacao(s)}>
        {s === 'todas' ? 'Todas' : s === 'paga' ? 'Pagas' : s === 'estimada' ? 'Estimadas' : 'Reembolsadas'}<span>{contagem(s)}</span>
      </button>)}
    </div>
    <p className="adm-nota">"Estimada": renovação antiga do cartão reconstruída pelo período do plano (o banco guarda só a última cobrança de cada cartão) ou assinatura paga sem a cobrança gravada. Taxa do Mercado Pago e valor líquido não aparecem: o banco não guarda a taxa; veja no extrato do Mercado Pago.</p>

    {visiveis.length === 0 ? <p className="adm-vazio">Nenhuma cobrança neste filtro.</p> : <div className="adm-tabela-rolagem adm-tabela-cartoes" role="region" aria-label="Lista de cobranças" tabIndex={0}>
      <table className="tabela adm-tabela adm-cob">
        <thead><tr><th scope="col">Data</th><th scope="col">Pessoa</th><th scope="col">Plano</th><th scope="col">Meio</th><th scope="col" className="numerico">Valor bruto</th><th scope="col">Situação</th><th scope="col"><span className="so-leitor">Ações</span></th></tr></thead>
        <tbody>{desenhadas.map(l => {
          const link = linkMercadoPago(l.id_pagamento)
          const u = usuarioDe(l.id_usuario)
          return <tr key={l.chave} className={l.situacao === 'reembolsada' ? 'adm-cob--devolvida' : undefined}>
            <td data-rotulo="Data"><span className="numerico">{dataCurta(l.em)}</span><small>{horaCurta(l.em)}</small></td>
            <td data-rotulo="Pessoa" className="adm-cob__pessoa"><span className="adm-reticencias" title={l.nome}>{l.nome}</span>{l.email && l.email !== l.nome && <small className="adm-reticencias" title={l.email}>{l.email}</small>}</td>
            <td data-rotulo="Plano">{rotuloPlano(l.plano)}<small>{l.tipo}</small></td>
            <td data-rotulo="Meio"><span className={'adm-selo adm-selo--meio adm-selo--' + l.meio}>{rotuloMeio(l.meio)}</span></td>
            <td data-rotulo="Valor bruto" className="numerico adm-cob__valor">{real(l.valor)}</td>
            <td data-rotulo="Situação"><span className={'adm-selo ' + (l.situacao === 'paga' ? 'adm-selo--ok' : l.situacao === 'reembolsada' ? 'adm-selo--ruim' : 'adm-selo--neutro')}>{SITUACAO_COBRANCA[l.situacao]}</span>{l.reembolsadaEm && <small>em {dataCurta(l.reembolsadaEm)}</small>}</td>
            <td className="adm-cob__acoes">
              {u && <button type="button" className="adm-link" onClick={() => definirFicha(u)}>Ficha</button>}
              {link && <a className="adm-link" href={link} target="_blank" rel="noopener noreferrer">Mercado Pago <Icone nome="direita" tamanho={13} /></a>}
            </td>
          </tr>
        })}</tbody>
      </table>
    </div>}
    {desenhadas.length < visiveis.length && <div className="linha">
      <button type="button" className="botao botao--fantasma" onClick={() => definirLimite(n => n + POR_PAGINA)}>Mostrar mais {Math.min(POR_PAGINA, visiveis.length - desenhadas.length)} <small>({visiveis.length - desenhadas.length} restante(s))</small></button>
    </div>}
    {ficha && <AdminFichaUsuario usuario={ficha} abaInicial="pagamentos" aoFechar={() => definirFicha(null)} />}
  </section>
}
