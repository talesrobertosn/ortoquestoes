import { useEffect, useMemo, useState } from 'react'
import { carregarIndiceBiblioteca } from '../../biblioteca/conteudo'
import { quadroDoDia } from '../../componentes/admin/agora'
import { diaSP } from '../../componentes/admin/estudoHoje'
import { registrarTitulosResumos } from '../../componentes/admin/formatos'
import { rotuloPlano } from '../../componentes/admin/rotulos'
import { PLANOS_RECENTE_DIAS, viuPlanos, type SinalUsuario } from '../../componentes/admin/sinais'
import { usarFunil, usarSerie } from '../dados/consultas'
import { usarPainel } from '../dados/painel'
import { nomeDe, type LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { haQuanto, horario, iniciais, inteiro, reais } from '../ui/formato'
import { Carregando, Estado, Painel } from '../ui/kit'
import { Faz, LinhaDoDia, Listas, NumeroDia } from './dia'
import { LinhaFila, useIrDestino, usarFila } from './fila'

/** Último sinal da pessoa (aparelho, atividade ou login), para saber se entrou hoje. */
const ultimoSinal = (u: LinhaUsuario) => [u.visto_em, u.ultima_atividade, u.ultimo_login].filter(Boolean).sort().slice(-1)[0] ?? null
const quandoPlanos = (s: SinalUsuario | undefined) => s?.planos_ultima ? haQuanto(s.planos_ultima) : ''

/**
 * Página inicial do painel (pedido do Tales, 02/11/2026): a primeira coisa é quem está online, com
 * assinante e não assinante separados por cor; depois, os assinantes que não entraram hoje e quem
 * viu os planos; depois, o dia. Tudo atualiza a cada 5 minutos (ou no botão Atualizar), para poupar o banco.
 */
export default function Inicio() {
  const p = usarPainel()
  const nav = usarNav()
  const serieQ = usarSerie(7, true)
  const { funil } = usarFunil()
  const fila = usarFila()
  const irDestino = useIrDestino()
  const [, recontar] = useState(0)
  useEffect(() => { carregarIndiceBiblioteca().then(i => { registrarTitulosResumos(i.capitulos); recontar(k => k + 1) }).catch(() => undefined) }, [])
  const sinaisLista = Array.isArray(p.sinaisQ.dados) ? p.sinaisQ.dados : null
  const quadro = useMemo(() => quadroDoDia({ usuarios: p.usuarios, sinais: sinaisLista, serie: Array.isArray(serieQ.dados) ? serieQ.dados : null, resumo: p.resumo, funil, assinaturas: p.reais, cobrancas: p.cobrancas }),
    [p.usuarios, sinaisLista, serieQ.dados, p.resumo, funil, p.reais, p.cobrancas])
  const nm = quadro.numeros

  const grupos = useMemo(() => {
    if (!p.usuarios) return null
    const hoje = diaSP(Date.now())
    const porRecente = (a: LinhaUsuario, b: LinhaUsuario) => (b.pagina_em ?? b.visto_em ?? '').localeCompare(a.pagina_em ?? a.visto_em ?? '')
    const online = p.usuarios.filter(u => u.online && !u.administrador)
    const assinantes = p.usuarios.filter(u => u.plano_vigente && !u.administrador)
    const ausentes = assinantes.filter(u => { const s = ultimoSinal(u); return !s || diaSP(s) !== hoje })
      .sort((a, b) => (ultimoSinal(b) ?? '').localeCompare(ultimoSinal(a) ?? ''))
    const viram = p.usuarios.filter(u => !u.plano_vigente && !u.administrador && viuPlanos(p.sinais.get(u.id_usuario)))
      .sort((a, b) => (p.sinais.get(b.id_usuario)?.planos_ultima ?? '').localeCompare(p.sinais.get(a.id_usuario)?.planos_ultima ?? ''))
    return {
      assinantesOnline: online.filter(u => u.plano_vigente).sort(porRecente),
      outrosOnline: online.filter(u => !u.plano_vigente).sort(porRecente),
      totalAssinantes: assinantes.length, ausentes,
      ausentesViram: ausentes.filter(u => viuPlanos(p.sinais.get(u.id_usuario))),
      viram, viramHoje: viram.filter(u => { const s = p.sinais.get(u.id_usuario)?.planos_ultima; return !!s && diaSP(s) === hoje }),
    }
  }, [p.usuarios, p.sinais])

  const semSinais = !p.sinaisQ.dados

  return <div className="a3-pilha a3-pilha--larga">
    <header className="a3-inicio-topo">
      <div>
        <span className="a3-rotulo">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })}</span>
        <h1 className="a3-titulo-1">Agora</h1>
      </div>
      <p className="a3-mudo a3-pequeno">Online = sinal do aparelho nos últimos 5 minutos. Os dados se atualizam a cada 5 minutos; para ver na hora, use Atualizar.</p>
    </header>

    {/* 1. Quem está online, assinantes e não assinantes separados por cor. */}
    <section className="a3-online" aria-label="Quem está online agora">
      {!grupos ? <div className="a3-painel" style={{ padding: 20 }}>{p.usuariosQ.erro ? <Estado tipo="erro" titulo="A lista de quem está online não carregou" texto={p.erroDados} /> : <Carregando linhas={4} texto="Vendo quem está online…" />}</div> : <>
        <GrupoOnline tipo="assinante" titulo="Assinantes online" lista={grupos.assinantesOnline} sinais={p.sinais} vazio="Nenhum assinante online agora." />
        <GrupoOnline tipo="gratis" titulo="Não assinantes online" lista={grupos.outrosOnline} sinais={p.sinais} vazio="Nenhum não assinante online agora." />
      </>}
    </section>

    {/* 2. Assinantes que não entraram hoje e quem viu os planos. */}
    {grupos && <div className="a3-grade a3-grade--2" style={{ alignItems: 'start' }}>
      <Painel justo titulo={<><b className="num" style={{ fontSize: 22, marginRight: 8 }}>{grupos.ausentes.length}</b>de {grupos.totalAssinantes} assinantes não entraram hoje</>}
        descricao={grupos.ausentesViram.length ? `${grupos.ausentesViram.length} ${grupos.ausentesViram.length === 1 ? 'deles viu' : 'deles viram'} os planos nos últimos 30 dias.` : 'Nenhum deles viu os planos nos últimos 30 dias.'}>
        <ListaPessoas lista={grupos.ausentes} vazio="Todos os assinantes entraram hoje." detalhe={u => {
          const s = ultimoSinal(u), viu = viuPlanos(p.sinais.get(u.id_usuario))
          return <>{s ? `última vez ${haQuanto(s)}` : 'nunca entrou'} · {rotuloPlano(u.plano_vigente)}{viu && <b className="a3-tag a3-tag--planos">viu os planos {quandoPlanos(p.sinais.get(u.id_usuario))}</b>}</>
        }} />
      </Painel>
      <Painel justo titulo={<><b className="num" style={{ fontSize: 22, marginRight: 8 }}>{grupos.viram.length}</b>não assinantes viram os planos</>}
        descricao={semSinais ? 'Sinal de planos indisponível (falta colar a parte 25 no Supabase).' : `Últimos 30 dias · ${grupos.viramHoje.length} hoje. Bons nomes para uma carta pessoal.`}>
        <ListaPessoas lista={grupos.viram} vazio="Ninguém sem assinatura abriu os planos nos últimos 30 dias." detalhe={u => {
          const s = p.sinais.get(u.id_usuario)
          return <>{s?.planos_vezes ?? 0} {s?.planos_vezes === 1 ? 'vez' : 'vezes'} · última {quandoPlanos(s)}{u.online && <b className="a3-tag a3-tag--vivo">online</b>}{viuPlanos(s, PLANOS_RECENTE_DIAS) && <b className="a3-tag a3-tag--planos">esta semana</b>}</>
        }} acao={u => nav.abrirPessoa(u.id_usuario, 'carta')} />
      </Painel>
    </div>}

    {/* 3. O dia em números. */}
    <section className="a3-painel" aria-label="Números de hoje">
      <div className="a3-faixa-metricas" style={{ '--colunas': 5 } as React.CSSProperties}>
        <NumeroDia rotulo="Entraram hoje" numero={nm.entraram} nota="estudando ou não" />
        <NumeroDia rotulo="Estudaram hoje" numero={nm.estudaram} aoClicar={() => nav.ir('usuarios', { filtro: 'hoje' })} />
        <NumeroDia rotulo="Questões hoje" numero={nm.questoes} />
        <NumeroDia rotulo="Cadastros hoje" numero={nm.cadastros} nota={nm.cadastros7d !== null ? `${inteiro(nm.cadastros7d)} em 7 dias` : undefined} aoClicar={() => nav.ir('usuarios', { filtro: 'novos' })} />
        <NumeroDia rotulo="Recebido hoje" numero={nm.valorPago} formato={reais} nota={nm.valorPago.hoje === null ? undefined : `${inteiro(nm.pagaram.hoje)} ${nm.pagaram.hoje === 1 ? 'pagamento' : 'pagamentos'}`} aoClicar={() => nav.ir('cobrancas')} />
      </div>
    </section>

    {/* 4. O que pede ação e a linha do dia. */}
    <div className="a3-grade a3-grade--12" style={{ alignItems: 'start' }}>
      <div style={{ gridColumn: 'span 5' }}>
        <Painel justo titulo={fila.length ? 'Pede ação' : 'Nada pedindo ação'} descricao={fila.length ? 'Do mais grave ao menos grave' : 'Sem falha de pagamento, relato aberto ou fonte fora do ar.'}>
          {fila.length ? <ol className="a3-fila">{fila.map(i => <LinhaFila key={i.id} item={i} aoAgir={irDestino} />)}</ol>
            : <div style={{ padding: '0 20px 20px' }}><Estado compacto icone="certo" titulo="Tudo em dia" /></div>}
        </Painel>
      </div>
      <div style={{ gridColumn: 'span 7' }}><LinhaDoDia quadro={quadro} /></div>
    </div>

    <Listas quadro={quadro} />
  </div>
}

function GrupoOnline({ tipo, titulo, lista, sinais, vazio }: { tipo: 'assinante' | 'gratis'; titulo: string; lista: LinhaUsuario[]; sinais: Map<string, SinalUsuario>; vazio: string }) {
  const nav = usarNav()
  const [todos, definirTodos] = useState(false)
  const visiveis = todos ? lista : lista.slice(0, 8)
  return <div className={`a3-online__grupo a3-online__grupo--${tipo}`}>
    <div className="a3-online__cabeca">
      <span className="a3-online__selo" aria-hidden="true" />
      <h2>{titulo}</h2>
      <b className="num">{lista.length}</b>
    </div>
    {!lista.length ? <p className="a3-online__vazio">{vazio}</p> : <ul className="a3-online__lista">{visiveis.map(u => {
      const s = sinais.get(u.id_usuario)
      return <li key={u.id_usuario}><button type="button" onClick={() => nav.abrirPessoa(u.id_usuario)}>
        <span className="a3-avatar">{iniciais(u.nome ?? u.email)}<i className="a3-ponto a3-ponto--vivo" /></span>
        <span className="a3-online__texto">
          <span className="a3-online__nome">{nomeDe(u)}{tipo === 'assinante' ? <b className="a3-tag a3-tag--assinante">{rotuloPlano(u.plano_vigente)}</b> : viuPlanos(s) && <b className="a3-tag a3-tag--planos">viu os planos {quandoPlanos(s)}</b>}</span>
          <span className="a3-online__faz"><Faz u={u} /></span>
          <span className="a3-mudo a3-pequeno">{u.pagina_em ? `desde ${horario(u.pagina_em)}` : ''}{u.respondidas_hoje ? ` · ${u.respondidas_hoje} questões hoje` : ''}{u.aparelho ? ` · ${u.aparelho}` : ''}</span>
        </span>
      </button></li>
    })}</ul>}
    {lista.length > 8 && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirTodos(!todos)}>{todos ? 'Mostrar menos' : `Ver todos os ${lista.length}`}</button>}
  </div>
}

function ListaPessoas({ lista, vazio, detalhe, acao }: { lista: LinhaUsuario[]; vazio: string; detalhe: (u: LinhaUsuario) => React.ReactNode; acao?: (u: LinhaUsuario) => void }) {
  const nav = usarNav()
  const [todos, definirTodos] = useState(false)
  if (!lista.length) return <div style={{ padding: '0 20px 20px' }}><Estado compacto icone="certo" titulo={vazio} /></div>
  const visiveis = todos ? lista : lista.slice(0, 6)
  return <>
    <ul className="a3-lista-curta">{visiveis.map(u => <li key={u.id_usuario}>
      <button type="button" onClick={() => nav.abrirPessoa(u.id_usuario)}>
        <span className="a3-avatar">{iniciais(u.nome ?? u.email)}</span>
        <span style={{ minWidth: 0, display: 'grid' }}><span className="a3-nome">{nomeDe(u)}</span><span className="a3-sub">{detalhe(u)}</span></span>
      </button>
      {acao && !u.administrador && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => acao(u)}><Icone nome="carta" tamanho={14} />Carta</button>}
    </li>)}</ul>
    {lista.length > 6 && <div className="a3-paginacao"><span>{todos ? lista.length : 6} de {lista.length}</span><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirTodos(!todos)}>{todos ? 'Mostrar menos' : 'Ver todos'}</button></div>}
  </>
}
