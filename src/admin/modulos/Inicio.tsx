import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarIndiceBiblioteca } from '../../biblioteca/conteudo'
import { quadroDoDia } from '../../componentes/admin/agora'
import { diaSP } from '../../componentes/admin/estudoHoje'
import { registrarTitulosResumos } from '../../componentes/admin/formatos'
import { rotuloPlano } from '../../componentes/admin/rotulos'
import { viuPlanos, type SinalUsuario } from '../../componentes/admin/sinais'
import { usarRpc } from '../../componentes/admin/usarRpc'
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
 * Temperatura de um não assinante (02/11/2026): soma sinais de interesse em comprar, para saber em quem focar.
 * Viu os planos hoje (+2) ou na semana (+1); bateu o limite grátis hoje (+2); muitas questões no total (+1 a partir
 * de 50, +1 a partir de 200); online agora (+1). Frio 0–1 · Morno 2 · Quente 3–4 · Fervendo 5+.
 */
export function temperatura(u: LinhaUsuario, s: SinalUsuario | undefined, hoje: string, limite: number | null) {
  let pontos = 0
  if (viuHoje(s, hoje)) pontos += 2
  else if (viuPlanos(s, 7)) pontos += 1
  if (limite !== null && limite > 0 && (u.respondidas_hoje ?? 0) >= limite) pontos += 2
  if (u.respondidas >= 50) pontos += 1
  if (u.respondidas >= 200) pontos += 1
  if (u.online) pontos += 1
  const nivel = pontos >= 5 ? 'fervendo' : pontos >= 3 ? 'quente' : pontos === 2 ? 'morno' : 'frio'
  return { pontos, nivel, rotulo: { fervendo: 'Fervendo', quente: 'Quente', morno: 'Morno', frio: 'Frio' }[nivel] } as const
}

/** Questões de hoje e do total, sempre lado a lado e em destaque. */
function Questoes({ u }: { u: LinhaUsuario }) {
  const hoje = u.respondidas_hoje ?? 0
  return <span className="a3-qq" aria-label={`${hoje} questões hoje, ${u.respondidas} no total`}>
    <span className={'a3-qq__hoje' + (hoje ? '' : ' zero')}><b className="num">{inteiro(hoje)}</b><small>hoje</small></span>
    <span className="a3-qq__total"><b className="num">{inteiro(u.respondidas)}</b><small>total</small></span>
  </span>
}

/** Quanto do limite grátis do dia a pessoa já usou (só com o limite ligado). */
function Limite({ u, limite }: { u: LinhaUsuario; limite: number | null }) {
  if (limite === null || limite <= 0) return null
  const hoje = u.respondidas_hoje ?? 0
  const pct = Math.min(1, hoje / limite)
  const bateu = hoje >= limite
  return <span className={'a3-limite' + (bateu ? ' bateu' : pct >= .7 ? ' perto' : '')}>
    <span className="a3-limite__trilho" aria-hidden="true"><i style={{ width: `${pct * 100}%` }} /></span>
    <small>{bateu ? `bateu o limite grátis (${limite})` : `${hoje} de ${limite} grátis hoje`}</small>
  </span>
}

function Temperatura({ t }: { t: ReturnType<typeof temperatura> }) {
  return <b className={`a3-temp a3-temp--${t.nivel}`} title="Viu os planos, bateu o limite, questões no total e online agora">{t.rotulo}</b>
}

type Filtro = 'todos' | Tipo
type Fora = 'ausentes' | 'saiu' | 'viram'

/**
 * Página inicial do painel (revisões de 02/11/2026, pedidos do Tales: "seguir o design do site", "me perco").
 * De cima para baixo, uma coisa de cada vez:
 * 1. Faixa de abertura no estilo do herói do site, com os totais (online, assinantes, não assinantes, viram os planos
 *    hoje, limite grátis).
 * 2. Online agora: UMA lista, com filtro (todos, assinantes, viram os planos hoje, não assinantes). Um fio de cor e um
 *    selo dizem o grupo: assinante em verdete, viu os planos em ouro, não assinante em ardósia. Questões de hoje e do
 *    total sempre lado a lado.
 * 3. Fora do site agora: UMA caixa com abas (assinantes que não entraram hoje; viram os planos hoje e saíram; viram os
 *    planos nos últimos 30 dias).
 * 4. Hoje: números, o que pede ação, a linha do dia e as listas.
 * A lista de pessoas se atualiza a cada 3 minutos e o resto a cada 5; o botão Atualizar busca na hora.
 */
export default function Inicio() {
  const p = usarPainel()
  const nav = usarNav()
  const serieQ = usarSerie(7, true)
  const { funil } = usarFunil()
  const fila = usarFila()
  const irDestino = useIrDestino()
  const [filtro, definirFiltro] = useState<Filtro>('todos')
  const [foraEscolhida, definirFora] = useState<Fora | null>(null)
  const [, recontar] = useState(0)
  useEffect(() => { carregarIndiceBiblioteca().then(i => { registrarTitulosResumos(i.capitulos); recontar(k => k + 1) }).catch(() => undefined) }, [])
  const sinaisLista = Array.isArray(p.sinaisQ.dados) ? p.sinaisQ.dados : null
  const quadro = useMemo(() => quadroDoDia({ usuarios: p.usuarios, sinais: sinaisLista, serie: Array.isArray(serieQ.dados) ? serieQ.dados : null, resumo: p.resumo, funil, assinaturas: p.reais, cobrancas: p.cobrancas }),
    [p.usuarios, sinaisLista, serieQ.dados, p.resumo, funil, p.reais, p.cobrancas])
  const nm = quadro.numeros
  const configQ = usarRpc<Array<{ paywall_ativo: boolean; limite_diario_gratis: number }>>(p.conta, 'obter_config_comercial_admin')
  const cfg = Array.isArray(configQ.dados) ? configQ.dados[0] : undefined
  const limite = cfg?.paywall_ativo ? Number(cfg.limite_diario_gratis) : null

  const g = useMemo(() => {
    if (!p.usuarios) return null
    const hoje = diaSP(Date.now())
    const sinal = (u: LinhaUsuario) => p.sinais.get(u.id_usuario)
    const tipoDe = (u: LinhaUsuario): Tipo => u.plano_vigente ? 'assinante' : viuHoje(sinal(u), hoje) ? 'lead' : 'gratis'
    const ordemTipo: Record<Tipo, number> = { lead: 0, assinante: 1, gratis: 2 }
    const pessoas = p.usuarios.filter(u => !u.administrador)
    const online = pessoas.filter(u => u.online).sort((a, b) => ordemTipo[tipoDe(a)] - ordemTipo[tipoDe(b)]
      || temperatura(b, sinal(b), hoje, limite).pontos - temperatura(a, sinal(a), hoje, limite).pontos
      || (b.pagina_em ?? b.visto_em ?? '').localeCompare(a.pagina_em ?? a.visto_em ?? ''))
    const assinantes = pessoas.filter(u => u.plano_vigente)
    const porPlanos = (a: LinhaUsuario, b: LinhaUsuario) => (sinal(b)?.planos_ultima ?? '').localeCompare(sinal(a)?.planos_ultima ?? '')
    const leadsHoje = pessoas.filter(u => !u.plano_vigente && viuHoje(sinal(u), hoje))
    return {
      hoje, tipoDe, online,
      conta: { assinante: online.filter(u => tipoDe(u) === 'assinante').length, lead: online.filter(u => tipoDe(u) === 'lead').length, gratis: online.filter(u => tipoDe(u) === 'gratis').length },
      totalAssinantes: assinantes.length, leadsHoje,
      fora: {
        ausentes: assinantes.filter(u => { const s = ultimoSinal(u); return !s || diaSP(s) !== hoje }).sort((a, b) => (ultimoSinal(b) ?? '').localeCompare(ultimoSinal(a) ?? '')),
        saiu: leadsHoje.filter(u => !u.online).sort(porPlanos),
        viram: pessoas.filter(u => !u.plano_vigente && !u.online && viuPlanos(sinal(u)) && !viuHoje(sinal(u), hoje)).sort(porPlanos),
      },
      bateram: limite ? pessoas.filter(u => !u.plano_vigente && (u.respondidas_hoje ?? 0) >= limite).length : null,
      questoesGratisHoje: pessoas.filter(u => !u.plano_vigente).reduce((s, u) => s + (u.respondidas_hoje ?? 0), 0),
    }
  }, [p.usuarios, p.sinais, limite])
  const semSinais = !p.sinaisQ.dados
  // A caixa "Fora do site" abre na primeira aba que tem gente.
  const fora: Fora = foraEscolhida ?? (g ? (['saiu', 'viram', 'ausentes'] as Fora[]).find(f => g.fora[f].length) ?? 'saiu' : 'saiu')
  const visiveis = g ? g.online.filter(u => filtro === 'todos' || g.tipoDe(u) === filtro) : []

  return <div className="a3-pilha a3-pilha--larga">
    <section className="a3-heroi" aria-label="Resumo de agora">
      <div className="a3-heroi__topo">
        <div>
          <span className="a3-rotulo">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })}</span>
          <h1 className="a3-titulo-1">Agora</h1>
        </div>
        <p>Online = sinal nos últimos 5 min · pessoas atualizam a cada 3 min, o resto a cada 5 · Atualizar busca na hora</p>
      </div>
      {g && <div className="a3-heroi__numeros">
        <Numero cor="vivo" rotulo="Online agora" valor={g.online.length} nota="sem contar administradores" />
        <Numero cor="assinante" rotulo="Assinantes online" valor={g.conta.assinante} nota={`de ${g.totalAssinantes} assinantes`} />
        <Numero cor="gratis" rotulo="Não assinantes online" valor={g.conta.gratis + g.conta.lead} nota={`${g.conta.lead} ${g.conta.lead === 1 ? 'viu' : 'viram'} os planos hoje`} />
        <Numero cor="lead" rotulo="Viram os planos hoje" valor={semSinais ? null : g.leadsHoje.length} nota={semSinais ? 'sinal indisponível' : 'não assinantes, online ou não'} />
        <Numero cor="gratis" rotulo={limite ? 'Bateram o limite grátis' : 'Questões grátis hoje'} valor={g.bateram ?? g.questoesGratisHoje}
          nota={limite ? `limite de ${limite} por dia` : 'de não assinantes; limite desligado'} />
      </div>}
    </section>

    {!g ? <div className="a3-painel" style={{ padding: 20 }}>{p.usuariosQ.erro ? <Estado tipo="erro" titulo="A lista de quem está online não carregou" texto={p.erroDados} /> : <Carregando linhas={5} texto="Vendo quem está online…" />}</div> : <>
      <section className="a3-painel" aria-label="Online agora">
        <div className="a3-secao-cabeca">
          <div><h2>Online agora</h2><p>Quem viu os planos hoje vem primeiro. Toque no nome para abrir a ficha.</p></div>
          <div className="a3-acoes-linha" role="group" aria-label="Filtrar quem está online">
            <Filtro ativo={filtro === 'todos'} aoClicar={() => definirFiltro('todos')} contagem={g.online.length}>Todos</Filtro>
            <Filtro ativo={filtro === 'assinante'} aoClicar={() => definirFiltro('assinante')} contagem={g.conta.assinante}>Assinantes</Filtro>
            <Filtro ativo={filtro === 'lead'} aoClicar={() => definirFiltro('lead')} contagem={g.conta.lead}>Viram os planos hoje</Filtro>
            <Filtro ativo={filtro === 'gratis'} aoClicar={() => definirFiltro('gratis')} contagem={g.conta.gratis}>Não assinantes</Filtro>
          </div>
        </div>
        {!visiveis.length ? <div style={{ padding: 20 }}><Estado compacto icone="pessoas" titulo={g.online.length ? 'Ninguém neste filtro agora' : 'Ninguém online agora'} /></div> :
          <ul className="a3-pessoas-lista">{visiveis.map(u => <LinhaOnline key={u.id_usuario} u={u} tipo={g.tipoDe(u)} hoje={g.hoje} limite={limite} />)}</ul>}
      </section>

      <section className="a3-painel" aria-label="Fora do site agora">
        <div className="a3-secao-cabeca"><div><h2>Fora do site agora</h2><p>Quem vale acompanhar mesmo sem estar online.</p></div></div>
        <div className="a3-abas-locais" role="tablist" aria-label="Quem está fora do site">
          {([['saiu', 'Viram os planos hoje e saíram', g.fora.saiu.length], ['viram', 'Viram os planos em 30 dias', g.fora.viram.length], ['ausentes', 'Assinantes que não entraram hoje', g.fora.ausentes.length]] as Array<[Fora, string, number]>)
            .map(([id, r, n]) => <button key={id} type="button" role="tab" aria-selected={fora === id} onClick={() => definirFora(id)}>{r}<span className="a3-cont">{n}</span></button>)}
        </div>
        {(() => {
          const lista = g.fora[fora]
          if (!lista.length) return <div style={{ padding: 20 }}><Estado compacto icone="certo" titulo={fora === 'ausentes' ? 'Todos os assinantes entraram hoje.' : semSinais ? 'Sinal de planos indisponível.' : fora === 'saiu' ? 'Ninguém viu os planos hoje e saiu.' : 'Ninguém nos últimos 30 dias.'} /></div>
          return <ul className="a3-pessoas-lista">{lista.slice(0, 30).map(u => <LinhaFora key={u.id_usuario} u={u} tipo={g.tipoDe(u)} />)}</ul>
        })()}
      </section>
    </>}

    <section className="a3-painel" aria-label="Hoje">
      <div className="a3-secao-cabeca"><div><h2>Hoje</h2><p>O dia em números. Hoje ainda está em andamento; "ontem" é o dia inteiro.</p></div></div>
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
}

function Numero({ cor, rotulo, valor, nota }: { cor: 'vivo' | Tipo; rotulo: string; valor: number | null; nota: string }) {
  return <div className={`a3-heroi__numero a3-heroi__numero--${cor}`}>
    <span><i aria-hidden="true" />{rotulo}</span>
    <b className="num">{valor === null ? '—' : inteiro(valor)}</b>
    <small>{nota}</small>
  </div>
}

function Filtro({ ativo, aoClicar, contagem, children }: { ativo: boolean; aoClicar: () => void; contagem: number; children: ReactNode }) {
  return <button type="button" className="a3-filtro" aria-pressed={ativo} onClick={aoClicar}>{children}<small>{inteiro(contagem)}</small></button>
}

const ROTULO_TIPO: Record<Tipo, string> = { assinante: 'Assinante', lead: 'Viu os planos hoje', gratis: 'Não assinante' }

function LinhaOnline({ u, tipo, hoje, limite }: { u: LinhaUsuario; tipo: Tipo; hoje: string; limite: number | null }) {
  const p = usarPainel()
  const nav = usarNav()
  const s = p.sinais.get(u.id_usuario)
  return <li className={tipo}>
    <button type="button" className="a3-pessoa-linha" onClick={() => nav.abrirPessoa(u.id_usuario)}>
      <span className="a3-avatar">{iniciais(u.nome ?? u.email)}<i className="a3-ponto a3-ponto--vivo" /></span>
      <span className="a3-pessoa-linha__texto">
        <span className="a3-pessoa-linha__nome">{nomeDe(u)}
          {tipo === 'assinante' ? <b className="a3-tag a3-tag--assinante">Assinante · {rotuloPlano(u.plano_vigente)}</b>
            : tipo === 'lead' ? <b className="a3-tag a3-tag--lead">Viu os planos às {horario(s?.planos_ultima)}</b>
            : <b className="a3-tag a3-tag--suave">Não assinante</b>}
          {tipo !== 'assinante' && <Temperatura t={temperatura(u, s, hoje, limite)} />}
        </span>
        <span className="a3-pessoa-linha__faz"><Faz u={u} /></span>
        <span className="a3-pessoa-linha__meta">
          {tipo !== 'assinante' && <Limite u={u} limite={limite} />}
          {tipo === 'gratis' && viuPlanos(s) && <span>viu os planos {haQuanto(s?.planos_ultima)}</span>}
          {tipo !== 'assinante' && <span>conta {haQuanto(u.criado_em)}</span>}
          {u.aparelho && <span>{u.aparelho}</span>}
        </span>
      </span>
    </button>
    <span className="a3-pessoa-linha__acoes">
      <Questoes u={u} />
      {tipo !== 'assinante' && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--icone a3-botao--pequeno" onClick={() => nav.abrirPessoa(u.id_usuario, 'carta')} aria-label={`Escrever para ${nomeDe(u)}`} title="Escrever uma carta"><Icone nome="carta" tamanho={16} /></button>}
    </span>
  </li>
}

function LinhaFora({ u, tipo }: { u: LinhaUsuario; tipo: Tipo }) {
  const p = usarPainel()
  const nav = usarNav()
  const s = p.sinais.get(u.id_usuario)
  const sinal = ultimoSinal(u)
  return <li className={tipo}>
    <button type="button" className="a3-pessoa-linha" onClick={() => nav.abrirPessoa(u.id_usuario)}>
      <span className="a3-avatar">{iniciais(u.nome ?? u.email)}</span>
      <span className="a3-pessoa-linha__texto">
        <span className="a3-pessoa-linha__nome">{nomeDe(u)}<b className={`a3-tag a3-tag--${tipo === 'assinante' ? 'assinante' : tipo === 'lead' ? 'lead' : 'suave'}`}>{tipo === 'assinante' ? `Assinante · ${rotuloPlano(u.plano_vigente)}` : ROTULO_TIPO[tipo]}</b></span>
        <span className="a3-pessoa-linha__meta">
          <span>{sinal ? `última vez ${haQuanto(sinal)}` : 'nunca entrou'}</span>
          {viuPlanos(s) && <span>viu os planos {tipo === 'lead' ? `às ${horario(s?.planos_ultima)}` : haQuanto(s?.planos_ultima)} · {s?.planos_vezes ?? 0} {s?.planos_vezes === 1 ? 'vez' : 'vezes'} em 30 dias</span>}
        </span>
      </span>
    </button>
    <span className="a3-pessoa-linha__acoes">
      <Questoes u={u} />
      {tipo !== 'assinante' && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--icone a3-botao--pequeno" onClick={() => nav.abrirPessoa(u.id_usuario, 'carta')} aria-label={`Escrever para ${nomeDe(u)}`} title="Escrever uma carta"><Icone nome="carta" tamanho={16} /></button>}
    </span>
  </li>
}
