import { useCallback, useMemo, useState } from 'react'
import { AdminFichaUsuario } from './AdminFichaUsuario'
import type { LinhaUsuario } from './AdminUsuarios'
import { Icone } from '../Icone'
import { proximaData, rotuloMeio, rotuloPlano, situacaoAssinatura } from './rotulos'
import { contaDeTeste } from './contasTeste'
import { meioDe, precoDe } from './receita'
import { real } from '../../dados/planos'
import { baixarCsv, corresponde, data, haQuanto, normalizar } from './formatos'

/** Linha de listar_assinaturas_admin. */
export interface LinhaAssinatura {
  id_usuario: string
  usuario: string
  plano: string
  status: string
  proxima_cobranca: string | null
  ultima_atualizacao: string
  // Da migração 202609290100 em diante.
  nome?: string | null
  criada_em?: string | null
  inicio_periodo?: string | null
  fim_periodo?: string | null
  ultima_cobranca_em?: string | null
  cancelar_ao_fim?: boolean
  // Da migração 202609290200 em diante.
  cancelada_em?: string | null
  // Da migração 202610060100 em diante: 'pix' ou 'cartao'.
  meio?: string | null
}

/** Assinatura que dá acesso agora (em dia, ou cancelada que ainda vale até o fim do período). */
export const vigente = (a: LinhaAssinatura) =>
  (a.status === 'ativa' || (a.status === 'cancelada' && !!a.cancelar_ao_fim)) && (!a.fim_periodo || new Date(a.fim_periodo) > new Date())
export const inicioDe = (a: LinhaAssinatura) => a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao


type FiltroAssinatura = 'vigentes' | 'todas' | 'pendente' | 'falha_pagamento' | 'encerradas'
type Periodo = 'tudo' | '7' | '30' | '90' | '365'
const FILTROS_ASSINATURA: Array<[FiltroAssinatura, string]> = [
  ['vigentes', 'Com acesso'], ['todas', 'Todas'], ['pendente', 'Pendentes'],
  ['falha_pagamento', 'Falha no pagamento'], ['encerradas', 'Encerradas, expiradas e reembolsadas'],
]
const PERIODOS: Array<[Periodo, string]> = [['tudo', 'Desde sempre'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 3 meses'], ['365', 'Último ano']]
const TOM_SELO = { ok: 'adm-selo--ok', aviso: 'adm-selo--aviso', ruim: 'adm-selo--ruim', neutro: 'adm-selo--neutro' } as const

/** Receita › Assinaturas: quem paga, por qual meio e plano, e até quando vale o acesso. Nomes de rotulos.ts. */
export function AdminListaAssinaturas({ linhas, usuarios }: { linhas: LinhaAssinatura[]; usuarios: LinhaUsuario[] | null }) {
  const [filtro, definirFiltro] = useState<FiltroAssinatura>('vigentes')
  const [periodo, definirPeriodo] = useState<Periodo>('tudo')
  const [ordem, definirOrdem] = useState<'recentes' | 'antigas'>('recentes')
  const [plano, definirPlano] = useState<'todos' | 'mensal' | 'semestral' | 'anual'>('todos')
  const [meio, definirMeio] = useState<'todos' | 'pix' | 'cartao'>('todos')
  const [busca, definirBusca] = useState('')
  const [ficha, definirFicha] = useState<LinhaUsuario | null>(null)

  const passa = useCallback((a: LinhaAssinatura, f: FiltroAssinatura) =>
    f === 'todas' ? true : f === 'vigentes' ? vigente(a) : f === 'encerradas' ? !vigente(a) && ['cancelada', 'vencida', 'reembolsada', 'pausada'].includes(a.status) : a.status === f, [])

  // Período, plano e meio valem para os números dos filtros também.
  const recorte = useCallback((a: LinhaAssinatura) =>
    (periodo === 'tudo' || Date.now() - new Date(inicioDe(a)).getTime() <= Number(periodo) * 86_400_000)
    && (plano === 'todos' || a.plano === plano) && (meio === 'todos' || meioDe(a) === meio), [periodo, plano, meio])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    return linhas.filter(a => passa(a, filtro) && recorte(a) && corresponde([a.nome, a.usuario, rotuloPlano(a.plano), situacaoAssinatura(a).rotulo, rotuloMeio(meioDe(a))], termo))
      .sort((x, y) => (new Date(inicioDe(y)).getTime() - new Date(inicioDe(x)).getTime()) * (ordem === 'recentes' ? 1 : -1))
  }, [linhas, filtro, recorte, busca, ordem, passa])
  const usuarioDe = (id: string) => usuarios?.find(u => u.id_usuario === id) ?? null
  // Renovação: a pessoa já tinha uma assinatura paga antes desta (no Pix, cada renovação vira uma linha nova;
  // passar do Pix ao cartão também). A primeira paga de cada pessoa é a "nova".
  const ordemNaPessoa = useMemo(() => {
    const mapa = new Map<string, number>()
    const porPessoa = new Map<string, LinhaAssinatura[]>()
    for (const a of linhas) if (a.status !== 'pendente' && a.status !== 'falha_pagamento') porPessoa.set(a.id_usuario, [...(porPessoa.get(a.id_usuario) ?? []), a])
    for (const lista of porPessoa.values()) lista.sort((x, y) => new Date(inicioDe(x)).getTime() - new Date(inicioDe(y)).getTime()).forEach((a, i) => mapa.set(`${a.id_usuario}:${a.ultima_atualizacao}:${inicioDe(a)}`, i))
    return mapa
  }, [linhas])

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-assinaturas">
    <div className="adm-secao__cabeca"><div>
      <h2 id="adm-titulo-assinaturas">Assinaturas</h2>
      <p>Quem paga, por qual meio e plano, desde quando e até quando vale o acesso. Cartão renova sozinho; Pix é pago uma vez e termina no fim do período.</p>
    </div>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-assinaturas-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Nome', 'E-mail', 'Plano', 'Meio', 'Situação', 'Assinante desde', 'Última cobrança paga', 'Data', 'Qual data', 'Cancela ao fim', 'Teste'],
        visiveis.map(a => { const p = proximaData(a); return [a.nome, a.usuario, rotuloPlano(a.plano), rotuloMeio(meioDe(a)), situacaoAssinatura(a).rotulo, data(inicioDe(a)), a.ultima_cobranca_em ? data(a.ultima_cobranca_em) : '', p.valor ? data(p.valor) : '', p.rotulo, a.cancelar_ao_fim ? 'sim' : 'não', contaDeTeste(a) ? 'sim' : ''] }))}>
        <Icone nome="baixar" tamanho={15} /> Exportar planilha
      </button>
    </div>
    <div className="adm-filtros" role="group" aria-label="Filtrar assinaturas">
      {FILTROS_ASSINATURA.map(([valor, rotulo]) => <button key={valor} type="button" className="adm-chip" aria-pressed={filtro === valor} onClick={() => definirFiltro(valor)}>{rotulo}<span>{linhas.filter(a => passa(a, valor) && recorte(a)).length}</span></button>)}
    </div>
    <div className="adm-busca adm-busca--filtros">
      <label className="campo">Buscar nome ou e-mail<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
      <label className="campo">Plano<select className="entrada" value={plano} onChange={e => definirPlano(e.target.value as typeof plano)}>
        <option value="todos">Todos</option><option value="mensal">Mensal</option><option value="semestral">Semestral</option><option value="anual">Anual</option>
      </select></label>
      <label className="campo">Meio<select className="entrada" value={meio} onChange={e => definirMeio(e.target.value as typeof meio)}>
        <option value="todos">Pix e cartão</option><option value="pix">Só Pix</option><option value="cartao">Só cartão</option>
      </select></label>
      <label className="campo">Assinou em<select className="entrada" value={periodo} onChange={e => definirPeriodo(e.target.value as Periodo)}>
        {PERIODOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
      </select></label>
      <label className="campo">Ordem<select className="entrada" value={ordem} onChange={e => definirOrdem(e.target.value as 'recentes' | 'antigas')}>
        <option value="recentes">Mais recentes primeiro</option><option value="antigas">Mais antigas primeiro</option>
      </select></label>
    </div>
    <p className="adm-nota" role="status">Mostrando {visiveis.length} de {linhas.length} assinatura(s). As de teste do dono aparecem aqui com o selo "Teste" e ficam fora dos números.</p>
    {visiveis.length === 0 ? <p className="adm-vazio">Nenhuma assinatura neste filtro.</p> : <ul className="adm-cartoes">
      {visiveis.map(a => {
        const inicio = inicioDe(a)
        const s = situacaoAssinatura(a)
        const proxima = proximaData(a)
        const preco = precoDe(a.plano)
        const u = usuarioDe(a.id_usuario)
        return <li key={`${a.id_usuario}:${a.ultima_atualizacao}`} className={`adm-cartao adm-cartao--${s.tom}`}>
          <div className="adm-cartao__topo">
            <div><strong className="adm-reticencias" title={a.nome ?? a.usuario}>{a.nome ?? a.usuario}</strong>{a.nome && <span className="adm-usuario__email adm-reticencias" title={a.usuario}>{a.usuario}</span>}</div>
            <span className={`adm-selo ${TOM_SELO[s.tom]}`}>{s.rotulo}</span>
          </div>
          <div className="adm-cartao__selos">
            <span className="adm-selo adm-selo--neutro">{rotuloPlano(a.plano)}{preco ? ` · ${real(preco.total)}` : ''}</span>
            <span className={'adm-selo adm-selo--meio adm-selo--' + meioDe(a)}>{rotuloMeio(meioDe(a))}</span>
            {(ordemNaPessoa.get(`${a.id_usuario}:${a.ultima_atualizacao}:${inicio}`) ?? 0) > 0 && <span className="adm-selo adm-selo--neutro" title="Já era assinante antes desta: conta como renovação, não como assinatura nova">Renovação</span>}
            {contaDeTeste(a) && <span className="adm-selo adm-selo--aviso">Teste</span>}
          </div>
          <dl className="adm-cartao__dados">
            <div><dt>Assinante desde</dt><dd>{data(inicio)} <small>({haQuanto(inicio)})</small></dd></div>
            <div><dt>Última cobrança paga</dt><dd>{a.ultima_cobranca_em ? data(a.ultima_cobranca_em) : '—'}</dd></div>
            <div><dt>{proxima.rotulo}</dt><dd>{data(proxima.valor)}</dd></div>
            {a.cancelada_em && <div><dt>Desligou a renovação em</dt><dd>{data(a.cancelada_em)}</dd></div>}
          </dl>
          {s.detalhe && <small className="adm-ajuda">{s.detalhe}</small>}
          {u && <button type="button" className="adm-link adm-cartao__acao" onClick={() => definirFicha(u)}><Icone nome="usuario" tamanho={15} /> Abrir a ficha e os pagamentos</button>}
        </li>
      })}
    </ul>}
    {ficha && <AdminFichaUsuario usuario={ficha} abaInicial="pagamentos" aoFechar={() => definirFicha(null)} />}
  </section>
}

