import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarIndiceBiblioteca } from '../../biblioteca/conteudo'
import { quadroDoDia } from '../../componentes/admin/agora'
import { diaSP } from '../../componentes/admin/estudoHoje'
import { registrarTitulosResumos } from '../../componentes/admin/formatos'
import { rotuloPlano } from '../../componentes/admin/rotulos'
import { viuPlanos, type SinalUsuario } from '../../componentes/admin/sinais'
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
const viuHoje = (s: SinalUsuario | undefined, hoje: string) => !!s?.planos_ultima && diaSP(s.planos_ultima) === hoje
type Tipo = 'assinante' | 'lead' | 'gratis'

/**
 * Página inicial do painel (revisões de 02/11/2026, pedidos do Tales). Três faixas bem separadas:
 * 1. Online agora: totais coloridos e três grupos — assinantes (verde), não assinantes que viram os planos HOJE
 *    (âmbar, os mais quentes) e os demais não assinantes (azul), com o que cada um faz e o histórico curto.
 * 2. Não estão online: assinantes que não entraram hoje e não assinantes que viram os planos e saíram.
 * 3. Hoje: números, o que pede ação, a linha do dia e as listas.
 * Tudo atualiza a cada 5 minutos (ou no botão Atualizar), para poupar o banco.
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

  const g = useMemo(() => {
    if (!p.usuarios) return null
    const hoje = diaSP(Date.now())
    const porRecente = (a: LinhaUsuario, b: LinhaUsuario) => (b.pagina_em ?? b.visto_em ?? '').localeCompare(a.pagina_em ?? a.visto_em ?? '')
    const pessoas = p.usuarios.filter(u => !u.administrador)
    const online = pessoas.filter(u => u.online)
    const sinal = (u: LinhaUsuario) => p.sinais.get(u.id_usuario)
    const assinantes = pessoas.filter(u => u.plano_vigente)
    const ausentes = assinantes.filter(u => { const s = ultimoSinal(u); return !s || diaSP(s) !== hoje }).sort((a, b) => (ultimoSinal(b) ?? '').localeCompare(ultimoSinal(a) ?? ''))
    const leadsHoje = pessoas.filter(u => !u.plano_vigente && viuHoje(sinal(u), hoje))
    const viram30 = pessoas.filter(u => !u.plano_vigente && viuPlanos(sinal(u)))
    const porPlanos = (a: LinhaUsuario, b: LinhaUsuario) => (sinal(b)?.planos_ultima ?? '').localeCompare(sinal(a)?.planos_ultima ?? '')
    return {
      online: {
        assinante: online.filter(u => u.plano_vigente).sort(porRecente),
        lead: online.filter(u => !u.plano_vigente && viuHoje(sinal(u), hoje)).sort(porRecente),
        gratis: online.filter(u => !u.plano_vigente && !viuHoje(sinal(u), hoje)).sort(porRecente),
      },
      totalOnline: online.length, totalAssinantes: assinantes.length, ausentes, leadsHoje,
      leadsForaHoje: leadsHoje.filter(u => !u.online).sort(porPlanos),
      viram30Fora: viram30.filter(u => !u.online && !viuHoje(sinal(u), hoje)).sort(porPlanos),
    }
  }, [p.usuarios, p.sinais])
  const semSinais = !p.sinaisQ.dados

  return <div className="a3-pilha a3-pilha--larga">
    <header className="a3-inicio-topo">
      <div>
        <span className="a3-rotulo">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })}</span>
        <h1 className="a3-titulo-1">Agora</h1>
      </div>
      <p className="a3-mudo a3-pequeno">Online = sinal do aparelho nos últimos 5 minutos. Atualiza a cada 5 minutos; para ver na hora, use Atualizar.</p>
    </header>

    {!g ? <div className="a3-painel" style={{ padding: 20 }}>{p.usuariosQ.erro ? <Estado tipo="erro" titulo="A lista de quem está online não carregou" texto={p.erroDados} /> : <Carregando linhas={5} texto="Vendo quem está online…" />}</div> : <>
      <section className="a3-totais" aria-label="Quem está online agora">
        <Total cor="vivo" rotulo="Online agora" valor={g.totalOnline} nota="sem contar administradores" />
        <Total cor="assinante" rotulo="Assinantes online" valor={g.online.assinante.length} nota={`de ${g.totalAssinantes} assinantes`} />
        <Total cor="gratis" rotulo="Não assinantes online" valor={g.online.gratis.length + g.online.lead.length} nota={`${g.online.lead.length} ${g.online.lead.length === 1 ? 'viu' : 'viram'} os planos hoje`} />
        <Total cor="lead" rotulo="Viram os planos hoje" valor={semSinais ? null : g.leadsHoje.length} nota={semSinais ? 'sinal indisponível (parte 25)' : `não assinantes · ${g.leadsHoje.filter(u => u.online).length} online agora`} />
      </section>

      <Faixa numero={1} titulo="Online agora" texto="Toque numa pessoa para abrir a ficha; o envelope abre a carta.">
        <div className="a3-online">
          <Grupo tipo="assinante" titulo="Assinantes" lista={g.online.assinante} vazio="Nenhum assinante online agora." />
          <Grupo tipo="lead" titulo="Viram os planos hoje" subtitulo="não assinantes · os mais quentes" lista={g.online.lead} vazio={semSinais ? 'Sinal de planos indisponível.' : 'Nenhum não assinante online viu os planos hoje.'} />
          <Grupo tipo="gratis" titulo="Não assinantes" lista={g.online.gratis} vazio="Nenhum não assinante online agora." />
        </div>
      </Faixa>

      <Faixa numero={2} titulo="Não estão online" texto="Quem vale acompanhar mesmo fora do site.">
        <div className="a3-grade a3-grade--3" style={{ alignItems: 'start' }}>
          <Bloco cor="assinante" titulo={<><b className="num">{g.ausentes.length}</b> de {g.totalAssinantes} assinantes não entraram hoje</>}
            descricao={`${g.ausentes.filter(u => viuPlanos(p.sinais.get(u.id_usuario))).length} deles viram os planos nos últimos 30 dias.`}>
            <ListaPessoas lista={g.ausentes} vazio="Todos os assinantes entraram hoje." detalhe={u => {
              const s = ultimoSinal(u)
              return <>{s ? `última vez ${haQuanto(s)}` : 'nunca entrou'} · {rotuloPlano(u.plano_vigente)}{viuPlanos(p.sinais.get(u.id_usuario)) && <b className="a3-tag a3-tag--lead">viu os planos</b>}</>
            }} />
          </Bloco>
          <Bloco cor="lead" titulo={<><b className="num">{g.leadsForaHoje.length}</b> viram os planos hoje e saíram</>} descricao="Não assinantes; boa hora para uma carta.">
            <ListaPessoas lista={g.leadsForaHoje} vazio={semSinais ? 'Sinal de planos indisponível.' : 'Ninguém viu os planos hoje e saiu.'} acao={u => nav.abrirPessoa(u.id_usuario, 'carta')} detalhe={u => {
              const s = p.sinais.get(u.id_usuario)
              return <>às {horario(s?.planos_ultima)} · {s?.planos_vezes ?? 0} {s?.planos_vezes === 1 ? 'vez' : 'vezes'} em 30 dias · {inteiro(u.respondidas)} questões</>
            }} />
          </Bloco>
          <Bloco cor="gratis" titulo={<><b className="num">{g.viram30Fora.length}</b> viram os planos nos últimos 30 dias</>} descricao="Não assinantes, fora agora, sem contar os de hoje.">
            <ListaPessoas lista={g.viram30Fora} vazio="Ninguém nos últimos 30 dias." acao={u => nav.abrirPessoa(u.id_usuario, 'carta')} detalhe={u => {
              const s = p.sinais.get(u.id_usuario)
              return <>última {haQuanto(s?.planos_ultima)} · {s?.planos_vezes ?? 0} {s?.planos_vezes === 1 ? 'vez' : 'vezes'} · {inteiro(u.respondidas)} questões</>
            }} />
          </Bloco>
        </div>
      </Faixa>
    </>}

    <Faixa numero={3} titulo="Hoje" texto="O dia em números, o que pede ação e o que aconteceu.">
      <div className="a3-pilha">
        <section className="a3-painel a3-faixa-colorida" aria-label="Números de hoje">
          <div className="a3-faixa-metricas" style={{ '--colunas': 5 } as React.CSSProperties}>
            <NumeroDia rotulo="Entraram hoje" numero={nm.entraram} nota="estudando ou não" />
            <NumeroDia rotulo="Estudaram hoje" numero={nm.estudaram} aoClicar={() => nav.ir('usuarios', { filtro: 'hoje' })} />
            <NumeroDia rotulo="Questões hoje" numero={nm.questoes} />
            <NumeroDia rotulo="Cadastros hoje" numero={nm.cadastros} nota={nm.cadastros7d !== null ? `${inteiro(nm.cadastros7d)} em 7 dias` : undefined} aoClicar={() => nav.ir('usuarios', { filtro: 'novos' })} />
            <NumeroDia rotulo="Recebido hoje" numero={nm.valorPago} formato={reais} nota={nm.valorPago.hoje === null ? undefined : `${inteiro(nm.pagaram.hoje)} ${nm.pagaram.hoje === 1 ? 'pagamento' : 'pagamentos'}`} aoClicar={() => nav.ir('cobrancas')} />
          </div>
        </section>
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
    </Faixa>
  </div>
}

function Faixa({ numero, titulo, texto, children }: { numero: number; titulo: string; texto: string; children: ReactNode }) {
  return <section className="a3-faixa-secao" aria-label={titulo}>
    <div className="a3-faixa-secao__cabeca"><span className="a3-faixa-secao__n">{numero}</span><h2>{titulo}</h2><p>{texto}</p></div>
    {children}
  </section>
}

function Total({ cor, rotulo, valor, nota }: { cor: 'vivo' | Tipo; rotulo: string; valor: number | null; nota: string }) {
  return <div className={`a3-total a3-total--${cor}`}>
    <span className="a3-total__rotulo">{cor === 'vivo' && <i className="a3-ponto a3-ponto--vivo" aria-hidden="true" />}{rotulo}</span>
    <b className="a3-total__valor num">{valor === null ? '—' : inteiro(valor)}</b>
    <span className="a3-total__nota">{nota}</span>
  </div>
}

function Grupo({ tipo, titulo, subtitulo, lista, vazio }: { tipo: Tipo; titulo: string; subtitulo?: string; lista: LinhaUsuario[]; vazio: string }) {
  const p = usarPainel()
  const nav = usarNav()
  const [todos, definirTodos] = useState(false)
  const visiveis = todos ? lista : lista.slice(0, 8)
  return <div className={`a3-online__grupo a3-online__grupo--${tipo}`}>
    <div className="a3-online__cabeca">
      <span className="a3-online__selo" aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}><h3>{titulo}</h3>{subtitulo && <small>{subtitulo}</small>}</div>
      <b className="num">{lista.length}</b>
    </div>
    {!lista.length ? <p className="a3-online__vazio">{vazio}</p> : <ul className="a3-online__lista">{visiveis.map(u => {
      const s = p.sinais.get(u.id_usuario)
      return <li key={u.id_usuario}><button type="button" className="a3-online__pessoa" onClick={() => nav.abrirPessoa(u.id_usuario)}>
        <span className="a3-avatar">{iniciais(u.nome ?? u.email)}<i className="a3-ponto a3-ponto--vivo" /></span>
        <span className="a3-online__texto">
          <span className="a3-online__nome">{nomeDe(u)}
            {tipo === 'assinante' && <b className="a3-tag a3-tag--assinante">{rotuloPlano(u.plano_vigente)}</b>}
            {tipo === 'lead' && <b className="a3-tag a3-tag--lead">planos às {horario(s?.planos_ultima)}</b>}
            {tipo === 'gratis' && viuPlanos(s) && <b className="a3-tag a3-tag--suave">viu os planos {haQuanto(s?.planos_ultima)}</b>}
          </span>
          <span className="a3-online__faz"><Faz u={u} /></span>
          <span className="a3-online__meta">
            {u.respondidas_hoje ? `${u.respondidas_hoje} hoje · ` : ''}{inteiro(u.respondidas)} no total
            {tipo !== 'assinante' && ` · conta ${haQuanto(u.criado_em)}`}
            {u.aparelho ? ` · ${u.aparelho}` : ''}
          </span>
        </span>
      </button>{tipo !== 'assinante' && <button type="button" className="a3-online__carta" onClick={() => nav.abrirPessoa(u.id_usuario, 'carta')} aria-label={`Escrever para ${nomeDe(u)}`}><Icone nome="carta" tamanho={15} /></button>}</li>
    })}</ul>}
    {lista.length > 8 && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirTodos(!todos)}>{todos ? 'Mostrar menos' : `Ver todos os ${lista.length}`}</button>}
  </div>
}

function Bloco({ cor, titulo, descricao, children }: { cor: Tipo; titulo: ReactNode; descricao: string; children: ReactNode }) {
  return <section className={`a3-painel a3-bloco a3-bloco--${cor}`}>
    <div className="a3-bloco__cabeca"><h3>{titulo}</h3><p>{descricao}</p></div>
    {children}
  </section>
}

function ListaPessoas({ lista, vazio, detalhe, acao }: { lista: LinhaUsuario[]; vazio: string; detalhe: (u: LinhaUsuario) => ReactNode; acao?: (u: LinhaUsuario) => void }) {
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
      {acao && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => acao(u)} aria-label={`Escrever para ${nomeDe(u)}`}><Icone nome="carta" tamanho={14} /></button>}
    </li>)}</ul>
    {lista.length > 6 && <div className="a3-paginacao"><span>{todos ? lista.length : 6} de {lista.length}</span><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirTodos(!todos)}>{todos ? 'Mostrar menos' : 'Ver todos'}</button></div>}
  </>
}
