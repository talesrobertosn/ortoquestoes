import { useMemo, useState, type ReactNode } from 'react'
import { PROVAS, rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import { acertoAposRevisao, acertoReal, baixarCsv, dataHora as dataHoraAntiga, porcentagem, rotuloOrigem } from '../../componentes/admin/formatos'
import { cobrancas as cobrancasDe } from '../../componentes/admin/receita'
import { SERVICO_GERAL, chaveServico, servicoConhecido } from '../../componentes/admin/servicosConhecidos'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { serieLimpa } from '../dados/consultas'
import { usarPainel } from '../dados/painel'
import type { LinhaUsuario } from '../dados/pessoas'
import { Icone } from '../ui/Icone'
import { inteiro, pct } from '../ui/formato'
import { Barras, Colunas, type PontoColuna } from '../ui/graficos'
import { Carregando, Estado, Faixa, Segmento } from '../ui/kit'
import { Tabela } from '../ui/tabela'
import { contarPorPeriodo, type Agrupamento } from './ritmo'
import { FaixaMetas } from './metasResumo'
import { SemanaTipica } from './semanaTipica'
import { PulsoCrescimento, JornadaDeCompra, usarJornada } from './PulsoCrescimento'
import { Canais, Duplicadas, ForaDoPublico, RetencaoPorTipo } from './qualidade'

/**
 * Crescimento (08/11/2026): movimento comparável e investigação visual na frente;
 * jornada/coortes na mesma base, e todos os relatórios úteis nas seções de detalhe.
 * Gráficos separados de dia/semana/mês continuam disponíveis em expansão.
 */

/* ───────────── Datas de São Paulo ───────────── */

const DIA_MS = 86_400_000
const fim = (n: number, um: string, varios: string) => `${inteiro(n)} ${n === 1 ? um : varios}`

/* ───────────── Página ───────────── */

const SECOES: Array<[string,string]> = [['cr-pulso','Movimento'],['cr-funil','Da chegada à compra'],['cr-estudo','Estudo'],['cr-retencao','Continuidade'],['cr-quando','Semana típica'],['cr-perfis','Público'],['cr-origem','Canais'],['cr-indicacoes','Indicações'],['cr-dados','Qualidade']]

export default function Crescimento() {
  const p = usarPainel()
  const jornadaQ = usarJornada()
  const serieQ = { dados: jornadaQ.dados?.serie, carregando: jornadaQ.carregando }
  const retQ = { dados: jornadaQ.dados?.coortes, carregando: jornadaQ.carregando }

  const base = useMemo(() => {
    if (!p.usuariosReais || !p.reais) return null
    const publico = new Set(p.usuariosReais.map(u => u.id_usuario))
    const primeira = new Map<string, Date>()
    for (const c of cobrancasDe(p.reais, p.cobrancas)) if (publico.has(c.id_usuario) && c.tipo === 'nova' && !primeira.has(c.id_usuario)) primeira.set(c.id_usuario, c.em)
    const cadastros = p.usuariosReais.map(u => new Date(u.criado_em)).filter(d => Number.isFinite(d.getTime()))
    const assinaturas = [...primeira.values()]
    const contar = (a: Agrupamento) => { const [c, s] = contarPorPeriodo([cadastros, assinaturas], a); return { c, s } }
    return { cadastros, assinaturas, dia: contar('dia'), semana: contar('semana'), mes: contar('mes') }
  }, [p.usuariosReais, p.reais, p.cobrancas])

  const estudo = useMemo(() => {
    const s = serieLimpa(serieQ.dados)
    if (!s) return null
    const ordenada = [...s].sort((a, b) => a.dia.localeCompare(b.dia))
    const i0 = ordenada.findIndex(d => d.ativos > 0 || d.cadastros > 0)
    const desde = i0 < 0 ? [] : ordenada.slice(i0)
    const hoje = desde[desde.length - 1]?.dia
    // Média por dia da semana, só com dias completos (hoje fica de fora).
    const somas = Array.from({ length: 7 }, () => ({ pessoas: 0, questoes: 0, dias: 0 }))
    for (const d of desde) { if (d.dia === hoje) continue; const k = (new Date(`${d.dia}T12:00:00Z`).getUTCDay() + 6) % 7; somas[k].pessoas += d.ativos; somas[k].questoes += d.respostas; somas[k].dias++ }
    const mediaPessoas = somas.map(x => x.dias ? x.pessoas / x.dias : 0), mediaQuestoes = somas.map(x => x.dias ? x.questoes / x.dias : 0)
    return { dias: desde, mediaPessoas, mediaQuestoes, melhorDia: mediaPessoas.indexOf(Math.max(...mediaPessoas)), piorDia: mediaPessoas.indexOf(Math.min(...mediaPessoas)) }
  }, [serieQ.dados])

  const coortes = Array.isArray(retQ.dados) ? retQ.dados.map(c => ({ semana: String(c.semana).slice(0, 10), cadastros: Number(c.cadastros), e1: Number(c.estudaram_1a_semana), v2: Number(c.voltaram_2a_semana) })) : null

  return <div className="a3-pilha a3-pilha--larga cr ng">
    <header className="ng-cabeca">
      <span className="a3-rotulo">Crescimento</span>
      <h1 className="a3-titulo-1">Seu crescimento, com contexto</h1>
      <p>Acompanhe quem chega, quem compra e quem continua estudando.</p>
      <nav className="ng-ancoras" aria-label="Partes da página">{SECOES.map(([id, nome]) => <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{nome}</a>)}</nav>
    </header>

    <PulsoCrescimento />
    <FaixaMetas titulo="Objetivos do mês" chaves={['cadastros', 'novosPagantes']} />

    {!base ? <div className="a3-painel" style={{ padding: 20 }}>{p.usuariosQ.erro ? <Estado tipo="erro" titulo="As contas não carregaram" texto={p.erroDados} /> : <Carregando linhas={8} texto="Contando cadastros e assinaturas…" />}</div> : <>
      <JornadaDeCompra estudos={jornadaQ.dados?.primeiros ?? null} carregando={jornadaQ.carregando} erro={jornadaQ.erro} />
      <details className="ng-detalhes"><summary>Cadastros e primeiras assinaturas em gráficos separados <small>Dia, semana e mês</small></summary>

      <Secao id="cr-cadastros" numero={1} titulo="Cadastros" texto="Quantas contas novas foram criadas. Cada gráfico conta de um jeito; o último período ainda está em andamento (tracejado).">
        <div className="cr-grade-3">
          <CartaoContagem titulo="Por dia" sub="últimos 30 dias" pontos={base.dia.c} nomes={['Hoje', 'Ontem', 'dia']} />
          <CartaoContagem titulo="Por semana" sub="segunda a domingo" pontos={base.semana.c} nomes={['Esta semana', 'Semana passada', 'semana']} />
          <CartaoContagem titulo="Por mês" sub="últimos 12 meses" pontos={base.mes.c} nomes={['Este mês', 'Mês passado', 'mês']} />
        </div>
      </Secao>

      <Secao id="cr-assinantes" numero={2} titulo="Assinantes novos" texto="Primeira compra paga de cada pessoa. Renovação não conta aqui (está no Financeiro).">
        <div className="cr-grade-3">
          <CartaoContagem titulo="Por dia" sub="últimos 30 dias" pontos={base.dia.s} nomes={['Hoje', 'Ontem', 'dia']} cor="ouro" />
          <CartaoContagem titulo="Por semana" sub="segunda a domingo" pontos={base.semana.s} nomes={['Esta semana', 'Semana passada', 'semana']} cor="ouro" />
          <CartaoContagem titulo="Por mês" sub="últimos 12 meses" pontos={base.mes.s} nomes={['Este mês', 'Mês passado', 'mês']} cor="ouro" />
        </div>

      </Secao>

      </details>

      <Secao id="cr-estudo" numero={6} titulo="Estudo no dia a dia" texto="Pessoas diferentes que estudaram e questões respondidas em cada dia. Hoje ainda está em andamento.">
        <Estudo dias={estudo?.dias ?? null} carregando={serieQ.carregando} />
      </Secao>

      <Secao id="cr-retencao" numero={5} titulo="Quem fica" texto="Cada semana de cadastro: quantos estudaram na primeira semana e quantos voltaram na segunda.">
        <RetencaoPorTipo />
        <Retencao coortes={coortes} carregando={retQ.carregando} />
        <Adocao />
      </Secao>

      <Secao id="cr-quando" numero={3} titulo="A semana típica e os horários" texto="A média de cada dia da semana (cadastros, assinaturas, recebido, quem estuda e quantas questões) e a grade de dia × hora. Hoje fica de fora das médias.">
        <SemanaTipica calor />
      </Secao>

      <Perfis />
      <Indicacoes />
      <Secao id="cr-dados" numero={10} titulo="Qualidade dos dados" texto="Contas fora do público-alvo (residentes e ortopedistas) e possíveis contas repetidas. Nada é apagado ou fundido.">
        <ForaDoPublico />
        <Duplicadas />
      </Secao>
    </>}
  </div>
}

function Secao({ id, titulo, texto, children }: { id: string; numero: number; titulo: string; texto: string; children: ReactNode }) {
  return <section id={id} className="cr-secao a3-ancora" aria-labelledby={`${id}-t`}>
    <header className="cr-secao__cabeca"><div><h2 id={`${id}-t`}>{titulo}</h2><p>{texto}</p></div></header>
    {children}
  </section>
}

/* ───────────── 0. Resumo em frases ───────────── */

function CartaoContagem({ titulo, sub, pontos, nomes, cor = 'verde' }: { titulo: string; sub: string; pontos: PontoColuna[]; nomes: [string, string, string]; cor?: 'verde' | 'ouro' }) {
  const v = pontos.map(x => x.partes[0])
  const atual = v[v.length - 1] ?? 0, anterior = v[v.length - 2] ?? 0
  const completos = pontos.filter(x => !x.parcial).map(x => x.partes[0])
  const media = completos.length ? completos.reduce((s, x) => s + x, 0) / completos.length : 0
  const recorde = Math.max(0, ...completos)
  const iRecorde = completos.indexOf(recorde)
  const [aberta, abrir] = useState(false)
  return <article className={`cr-cartao cr-contagem cr-contagem--${cor}`}>
    <h3>{titulo} <small>{sub}</small></h3>
    <div className="cr-contagem__numeros">
      <div className="cr-contagem__agora"><span>{nomes[0]}</span><b>{inteiro(atual)}</b><small>{atual > anterior ? `↑ ${inteiro(atual - anterior)} sobre ${nomes[1].toLowerCase()}` : atual < anterior ? `${inteiro(anterior - atual)} a menos que ${nomes[1].toLowerCase()} (ainda em andamento)` : `igual a ${nomes[1].toLowerCase()}`}</small></div>
      <dl>
        <div><dt>{nomes[1]}</dt><dd>{inteiro(anterior)}</dd></div>
        <div><dt>Média por {nomes[2]}</dt><dd>{media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</dd></div>
        <div><dt>Recorde</dt><dd>{inteiro(recorde)}{recorde > 0 && <small> · {pontos[iRecorde]?.curto}</small>}</dd></div>
      </dl>
    </div>
    <Colunas descricao={`${titulo}: ${sub}`} pontos={pontos} series={[{ nome: titulo }]} cor={cor} altura={200} />
    <button type="button" className="cr-ver" aria-expanded={aberta} onClick={() => abrir(!aberta)}>{aberta ? 'Esconder os números' : 'Ver os números'}<Icone nome={aberta ? 'cima' : 'baixo'} tamanho={14} /></button>
    {aberta && <ul className="cr-lista-numeros">{[...pontos].reverse().map(x => <li key={x.longo}><span>{x.longo}{x.parcial ? ' (em andamento)' : ''}</span><b>{inteiro(x.partes[0])}</b></li>)}</ul>}
  </article>
}

/* ───────────── 5. Retenção ───────────── */

const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
function Retencao({ coortes, carregando }: { coortes: Array<{ semana: string; cadastros: number; e1: number; v2: number }> | null; carregando: boolean }) {
  if (carregando && !coortes) return <div className="cr-cartao"><Carregando linhas={6} /></div>
  if (!coortes) return <div className="cr-cartao"><Estado compacto tipo="erro" titulo="Retenção indisponível" texto="Não foi possível carregar as coortes. Use Atualizar para tentar novamente." /></div>
  if (!coortes.length) return <div className="cr-cartao"><Estado compacto titulo="Ainda não há semanas completas" /></div>
  const lista = [...coortes].sort((a, b) => b.semana.localeCompare(a.semana)).slice(0, 12)
  return <article className="cr-cartao">
    <h3>Semana a semana <small>em verde, estudou na 1ª semana; em verde claro, voltou na 2ª</small></h3>
    <ul className="cr-coortes">{lista.map(c => {
      const a = c.cadastros ? c.e1 / c.cadastros : 0, b = c.cadastros ? c.v2 / c.cadastros : 0
      return <li key={c.semana}>
        <span className="cr-coortes__semana">Semana de {ddmm(c.semana)}<small>{fim(c.cadastros, 'cadastro', 'cadastros')}</small></span>
        <span className="cr-coortes__barras">
          <span><i style={{ width: `${a * 100}%` }} /><b>{Math.round(a * 100)}%</b><small>{c.e1} na 1ª</small></span>
          <span className="claro"><i style={{ width: `${b * 100}%` }} /><b>{Math.round(b * 100)}%</b><small>{c.v2} na 2ª</small></span>
        </span>
      </li>
    })}</ul>
  </article>
}

function Adocao() {
  const p = usarPainel()
  const a = useMemo(() => {
    const u = p.usuariosReais
    if (!u) return null
    const s = p.sinais
    return { contas: u.length, questoes: u.filter(x => x.respondidas > 0).length, cinquenta: u.filter(x => x.respondidas >= 50).length, quinhentas: u.filter(x => x.respondidas >= 500).length, cem: u.filter(x => x.respondidas >= 100).length, flashcards: u.filter(x => (s.get(x.id_usuario)?.flashcards_unicos ?? 0) > 0).length, resumos: u.filter(x => (x.pagina ?? '').startsWith('/resumos')).length, semana: u.filter(x => x.respondidas_7d > 0).length, planos: u.filter(x => !!s.get(x.id_usuario)?.planos_ultima).length, temSinais: s.size > 0 }
  }, [p.usuariosReais, p.sinais])
  if (!a) return null
  return <article className="cr-cartao">
    <h3>O que as contas usam <small>de {inteiro(a.contas)} contas reais, desde o começo</small></h3>
    <Barras total={a.contas} itens={[
      { nome: 'Responderam questões', valor: a.questoes }, { nome: 'Ativas nesta semana', valor: a.semana }, { nome: 'Fizeram 50 questões', valor: a.cinquenta }, { nome: 'Fizeram 100 questões', valor: a.cem }, { nome: 'Fizeram 500 questões', valor: a.quinhentas },
      ...(a.temSinais ? [{ nome: 'Usaram flashcards', valor: a.flashcards }, { nome: 'Viram os planos (30 dias)', valor: a.planos }] : []),
      { nome: 'Última página num resumo', valor: a.resumos },
    ]} />
  </article>
}

/* ───────────── 6. Estudo ───────────── */

function Estudo({ dias, carregando }: { dias: Array<{ dia: string; ativos: number; respostas: number; cadastros: number }> | null; carregando: boolean }) {
  const [janela, definirJanela] = useState<30 | 90>(30)
  if (carregando && !dias) return <div className="cr-cartao"><Carregando linhas={5} /></div>
  if (!dias) return <div className="cr-cartao"><Estado compacto tipo="erro" titulo="Série indisponível" /></div>
  const ult = dias.slice(-janela)
  const rot = (d: string) => ({ longo: new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }), curto: ddmm(d) })
  return <>
    <div className="cr-acoes"><Segmento rotulo="Janela" valor={janela} aoMudar={definirJanela} opcoes={[[30, 'Últimos 30 dias'], [90, 'Últimos 90 dias']]} /></div>
    <div className="cr-grade-2">
      <article className="cr-cartao"><h3>Pessoas que estudaram por dia</h3>
        <Colunas descricao="Pessoas que estudaram por dia" pontos={ult.map((d, i) => ({ ...rot(d.dia), partes: [d.ativos], parcial: i === ult.length - 1 }))} series={[{ nome: 'Pessoas' }]} altura={200} /></article>
      <article className="cr-cartao"><h3>Questões respondidas por dia</h3>
        <Colunas descricao="Questões respondidas por dia" pontos={ult.map((d, i) => ({ ...rot(d.dia), partes: [d.respostas], parcial: i === ult.length - 1 }))} series={[{ nome: 'Questões' }]} cor="claro" altura={200} /></article>
    </div>
  </>
}

/* ───────────── 7 e 8. Quem são e de onde vêm ───────────── */

const ORDEM_ETAPAS = ['R1', 'R2', 'R3', 'Residente (ano não informado)', 'R4 / fellowship', 'Residente de mão', 'Ortopedista', 'Estudante', 'Outro', 'Não informado']
interface Grupo { rotulo: string; contas: number; ativos7d: number; comRespostas: number; respondidas: number; acertos: number; erros: number; acertos_primeira: number | null; erros_primeira: number | null; assinantes: number; novos30: number }
function agrupar(lista: LinhaUsuario[], chave: (u: LinhaUsuario) => string[]): Grupo[] {
  const mapa = new Map<string, Grupo>(), agora = Date.now()
  for (const u of lista) for (const rotulo of chave(u)) {
    const g = mapa.get(rotulo) ?? { rotulo, contas: 0, ativos7d: 0, comRespostas: 0, respondidas: 0, acertos: 0, erros: 0, acertos_primeira: null, erros_primeira: null, assinantes: 0, novos30: 0 }
    g.contas++; if (u.respondidas_7d > 0) g.ativos7d++; if (u.respondidas > 0) g.comRespostas++
    g.respondidas += Number(u.respondidas); g.acertos += Number(u.acertos); g.erros += Number(u.erros)
    if (u.acertos_primeira != null) { g.acertos_primeira = (g.acertos_primeira ?? 0) + Number(u.acertos_primeira); g.erros_primeira = (g.erros_primeira ?? 0) + Number(u.erros_primeira ?? 0) }
    if (u.plano_vigente && u.plano_vigente !== 'cortesia') g.assinantes++
    if (agora - new Date(u.criado_em).getTime() < 30 * DIA_MS) g.novos30++
    mapa.set(rotulo, g)
  }
  return [...mapa.values()]
}
const etapaDe = (u: LinhaUsuario) => u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : 'Não informado'
const provasDe = (u: LinhaUsuario) => (u.provas ?? '').split(',').filter(Boolean)
const acertoG = (g: Grupo) => acertoReal(g) ?? acertoAposRevisao(g)

function Perfis() {
  const p = usarPainel()
  const [criterio, definirCriterio] = useState<'contas' | 'ativos'>('contas')
  const usuarios = p.usuariosReais
  const d = useMemo(() => {
    if (!usuarios) return null
    const base = criterio === 'ativos' ? usuarios.filter(u => u.respondidas_7d > 0) : usuarios
    const etapas = agrupar(base, u => [etapaDe(u)]).sort((a, b) => ORDEM_ETAPAS.indexOf(a.rotulo) - ORDEM_ETAPAS.indexOf(b.rotulo))
    const comProva = base.filter(u => provasDe(u).length).length
    const provas = PROVAS.map(([v]) => { const g = agrupar(base.filter(u => provasDe(u).includes(v)), () => [rotuloProva(v)])[0]; return { v, rotulo: rotuloProva(v), contas: g?.contas ?? 0, g } }).sort((a, b) => b.contas - a.contas)
    const ufs = agrupar(base.filter(u => u.uf), u => [u.uf!]).sort((a, b) => b.contas - a.contas)
    const comServico = base.filter(u => u.servico)
    const servicos = agrupar(comServico, u => [chaveServico(u.servico!, u.uf)]).sort((a, b) => b.contas - a.contas)
    const nomeServico = new Map<string, string>()
    for (const u of comServico) { const k = chaveServico(u.servico!, u.uf); nomeServico.set(k, k === SERVICO_GERAL ? SERVICO_GERAL : servicoConhecido(u.servico, u.uf) ?? nomeServico.get(k) ?? u.servico!.trim()) }
    const comOrigem = base.filter(u => u.origem)
    const origens = agrupar(comOrigem, u => [rotuloOrigem(u.origem!)]).sort((a, b) => b.contas - a.contas)
    const ids = new Set(base.map(u => u.id_usuario)), uf = new Map(base.map(u => [u.id_usuario, u.uf]))
    const locais = new Map<string, { nome: string; pessoas: Set<string> }>()
    for (const [id, s] of p.sinais) { if (!s.locais_trabalho || !ids.has(id)) continue; for (const l of s.locais_trabalho.split(' · ')) { const k = chaveServico(l, uf.get(id)); const g = locais.get(k) ?? { nome: k === SERVICO_GERAL ? SERVICO_GERAL : servicoConhecido(l, uf.get(id)) ?? l.trim(), pessoas: new Set<string>() }; g.pessoas.add(id); locais.set(k, g) } }
    return { base, etapas, comProva, provas, ufs, servicos, nomeServico, comOrigem: comOrigem.length, origens, informaram: base.filter(u => u.situacao).length,
      completos: base.filter(u => u.situacao && (u.situacao !== 'residente' || u.ano_residencia) && provasDe(u).length).length,
      locais: [...locais.values()].map(g => ({ nome: g.nome, valor: g.pessoas.size })).sort((a, b) => b.valor - a.valor), temOrigem: base.some(u => u.origem !== undefined), temMigracao: base.some(u => u.provas !== undefined) }
  }, [usuarios, criterio, p.sinais])
  if (!d) return null
  const total = d.base.length
  return <>
    <Secao id="cr-perfis" numero={7} titulo="Quem são" texto="Etapa de formação, provas de interesse, estados e serviços.">
      <div className="cr-acoes"><Segmento rotulo="Quem entra na conta" valor={criterio} aoMudar={definirCriterio} opcoes={[['contas', 'Todas as contas'], ['ativos', 'Ativas na semana']]} />
        <span className="a3-mudo a3-pequeno">{pct(porcentagem(d.completos, total))} dos perfis completos · {inteiro(d.informaram)} informaram a etapa</span></div>
      {!d.temMigracao && <Faixa tom="aviso">Para ver ano da residência e provas de interesse, rode a migração 202610060100_perfil_estudo_admin.sql.</Faixa>}
      <div className="cr-grade-2">
        <article className="cr-cartao"><h3>Etapa de formação <small>com assinantes e acerto de cada uma</small></h3>
          <Barras total={total} itens={d.etapas.map(e => ({ nome: e.rotulo, valor: e.contas, detalhe: `${e.assinantes} ${e.assinantes === 1 ? 'assinante' : 'assinantes'} · acerto ${acertoReal(e) ?? '—'}%` }))} /></article>
        <article className="cr-cartao"><h3>Provas de interesse <small>% sobre as {inteiro(d.comProva)} que responderam</small></h3>
          <Barras total={d.comProva} cor="claro" itens={d.provas.map(x => ({ nome: x.rotulo, valor: x.contas, detalhe: x.g ? `acerto ${acertoG(x.g) ?? '—'}%` : undefined }))} /></article>
        <article className="cr-cartao"><h3>Estados <small>os 12 com mais contas</small></h3>
          <Barras limite={12} total={d.ufs.reduce((s, x) => s + x.contas, 0)} itens={d.ufs.map(u => ({ nome: u.rotulo, valor: u.contas, detalhe: `${u.ativos7d} ativas na semana · ${u.assinantes} ${u.assinantes === 1 ? 'assinante' : 'assinantes'}` }))} /></article>
        <article className="cr-cartao"><h3>Outros locais de trabalho <small>além do serviço principal</small></h3>
          {d.locais.length ? <Barras limite={12} cor="claro" itens={d.locais} /> : <p className="a3-mudo">{p.sinais.size ? 'Ninguém marcou outros locais.' : 'Aparece com a parte 25 no Supabase.'}</p>}</article>
      </div>
      {d.servicos.length > 0 && <article className="cr-cartao"><h3>Serviços <small>variações do mesmo lugar ficam juntas; acerto só com 50 respostas ou mais</small></h3>
        <Tabela rotulo="Serviços" linhas={d.servicos} chave={s => s.rotulo} compacta porPagina={15} ordemInicial={{ coluna: 'c', sentido: 'desc' }} colunas={[
          { id: 's', titulo: 'Serviço', celula: s => <span className="a3-nome">{d.nomeServico.get(s.rotulo)}</span>, ordem: s => d.nomeServico.get(s.rotulo) ?? s.rotulo },
          { id: 'c', titulo: 'Contas', numero: true, celula: s => inteiro(s.contas), ordem: s => s.contas, rotuloCelular: 'Contas' },
          { id: 'a', titulo: 'Ativas 7 d', numero: true, celula: s => inteiro(s.ativos7d), ordem: s => s.ativos7d, rotuloCelular: 'Ativas' },
          { id: 'q', titulo: 'Questões/conta', numero: true, celula: s => inteiro(Math.round(s.respondidas / (s.contas || 1))), ordem: s => s.respondidas / (s.contas || 1), soLargo: true },
          { id: 'r', titulo: 'Acerto real', numero: true, celula: s => s.respondidas >= 50 && acertoG(s) !== null ? `${acertoG(s)}%` : '—', ordem: s => s.respondidas >= 50 ? acertoG(s) : null, rotuloCelular: 'Acerto' },
          { id: 'x', titulo: 'Assinantes', numero: true, celula: s => inteiro(s.assinantes), ordem: s => s.assinantes, soLargo: true },
        ]} /></article>}
      <article className="cr-cartao"><h3>Por etapa, em detalhe <small>cada linha com o seu denominador</small></h3>
        <Tabela rotulo="Contas por etapa" linhas={d.etapas} chave={e => e.rotulo} compacta colunas={[
          { id: 'e', titulo: 'Etapa', celula: e => <span className="a3-nome">{e.rotulo}</span> },
          { id: 'c', titulo: 'Contas', numero: true, celula: e => <>{inteiro(e.contas)} <span className="fraco">{pct(porcentagem(e.contas, total))}</span></>, ordem: e => e.contas, rotuloCelular: 'Contas' },
          { id: 'n', titulo: 'Novas 30 d', numero: true, celula: e => inteiro(e.novos30), ordem: e => e.novos30, soLargo: true },
          { id: 'a', titulo: 'Ativas 7 d', numero: true, celula: e => pct(porcentagem(e.ativos7d, e.contas)), ordem: e => porcentagem(e.ativos7d, e.contas), rotuloCelular: 'Ativas' },
          { id: 'q', titulo: 'Questões/conta', numero: true, celula: e => inteiro(Math.round(e.respondidas / (e.contas || 1))), ordem: e => e.respondidas / (e.contas || 1), soLargo: true },
          { id: 'r', titulo: 'Acerto real', numero: true, celula: e => acertoReal(e) === null ? '—' : `${acertoReal(e)}%`, ordem: e => acertoReal(e), rotuloCelular: 'Acerto' },
          { id: 's', titulo: 'Assinantes', numero: true, celula: e => pct(porcentagem(e.assinantes, e.contas)), ordem: e => porcentagem(e.assinantes, e.contas), rotuloCelular: 'Assinantes' },
        ]} />
        <button type="button" className="cr-ver" onClick={() => baixarCsv(`ortoquestoes-etapas-${new Date().toISOString().slice(0, 10)}.csv`, ['Etapa', 'Contas', '% das contas', 'Novos em 30 dias', 'Ativos 7 dias (%)', 'Começaram (%)', 'Questões por conta', 'Acerto real (%)', 'Acerto após revisão (%)', 'Assinantes (%)'], d.etapas.map(e => [e.rotulo, e.contas, porcentagem(e.contas, total), e.novos30, porcentagem(e.ativos7d, e.contas), porcentagem(e.comRespostas, e.contas), Math.round(e.respondidas / (e.contas || 1)), acertoReal(e), acertoAposRevisao(e), porcentagem(e.assinantes, e.contas)]))}><Icone nome="baixar" tamanho={14} />Baixar CSV</button>
      </article>
    </Secao>

    <Secao id="cr-origem" numero={8} titulo="De onde vêm" texto={d.temOrigem ? `${inteiro(d.comOrigem)} contas com origem registrada (desde que a medição começou).` : 'Rode a migração 202610070100_origem_cadastro.sql para medir.'}>
      <Canais />
      {d.origens.length ? <div className="cr-grade-2">
        <article className="cr-cartao"><h3>Cadastros por origem</h3><Barras total={d.comOrigem} itens={d.origens.map(o => ({ nome: o.rotulo, valor: o.contas }))} /></article>
        <article className="cr-cartao"><h3>Quantos assinaram, por origem <small>a origem que traz quem paga</small></h3>
          <Barras cor="ouro" itens={[...d.origens].sort((a, b) => b.assinantes - a.assinantes).map(o => ({ nome: o.rotulo, valor: o.assinantes, detalhe: `${o.comRespostas} começaram a estudar · ${pct(porcentagem(o.assinantes, o.contas))} assinaram` }))} /></article>
      </div> : <div className="cr-cartao"><p className="a3-mudo">{d.temOrigem ? 'Nenhuma conta nova com origem ainda. Use os links marcados (utm) no anúncio e na bio.' : ''}</p></div>}
    </Secao>
  </>
}

/* ───────────── 9. Indicações ───────────── */

interface Indicacao { id_convidado: string; convidado: string | null; email_convidado: string | null; id_padrinho: string; padrinho: string | null; email_padrinho: string | null; criado_em: string; confirmada_em: string | null; respondidas: number; dias_padrinho: number; dias_convidado: number }
interface ResumoIndicacoes { codigos: number; convidados: number; confirmados: number; confirmados_7d: number; dias_dados: number }
const META = 20
function Indicacoes() {
  const p = usarPainel()
  const resumoQ = usarRpc<ResumoIndicacoes[]>(p.conta, 'resumo_indicacoes_admin')
  const listaQ = usarRpc<Indicacao[]>(p.conta, 'listar_indicacoes_admin')
  const [filtro, definirFiltro] = useState<'todas' | 'confirmadas' | 'pendentes'>('todas')
  const r = resumoQ.dados?.[0]
  const linhas = Array.isArray(listaQ.dados) ? listaQ.dados : null
  const padrinhos = useMemo(() => {
    const m = new Map<string, { nome: string; total: number; ok: number }>()
    for (const l of linhas ?? []) { const x = m.get(l.id_padrinho) ?? { nome: l.padrinho ?? l.email_padrinho ?? 'Sem nome', total: 0, ok: 0 }; x.total++; if (l.confirmada_em) x.ok++; m.set(l.id_padrinho, x) }
    return [...m.values()].sort((a, b) => b.total - a.total)
  }, [linhas])
  const convidados = Number(r?.convidados ?? linhas?.length ?? 0)
  const confirmados = Number(r?.confirmados ?? (linhas ?? []).filter(l => l.confirmada_em).length)
  const vis = (linhas ?? []).filter(l => filtro === 'todas' || (filtro === 'confirmadas' ? !!l.confirmada_em : !l.confirmada_em))
  return <Secao id="cr-indicacoes" numero={9} titulo="Indicações" texto={`Quem chegou por convite. A indicação confirma quando o convidado responde ${META} questões; aí os dois ganham os dias.`}>
    <div className="cr-numeros">
      <div><span>Chegaram por indicação</span><b>{inteiro(convidados)}</b><small>{r ? `${r.codigos} pessoas pegaram o link` : ''}</small></div>
      <div><span>Confirmadas</span><b>{inteiro(confirmados)}</b><small>{pct(porcentagem(confirmados, convidados))} chegaram às {META}</small></div>
      <div><span>Confirmadas na semana</span><b>{inteiro(Number(r?.confirmados_7d ?? 0))}</b></div>
      <div><span>Dias de plano dados</span><b>{inteiro(Number(r?.dias_dados ?? 0))}</b><small>somando os dois lados</small></div>
    </div>
    {listaQ.erro && !linhas ? <div className="cr-cartao"><Estado compacto tipo="erro" titulo="Lista de indicações indisponível" texto="Rode a migração 202610120100_indicacoes_admin.sql." /></div>
      : !linhas ? <div className="cr-cartao"><Carregando /></div> : !linhas.length ? <div className="cr-cartao"><Estado compacto titulo="Ninguém chegou por indicação ainda" /></div> :
        <div className="cr-grade-2 cr-grade-2--1-2">
          <article className="cr-cartao"><h3>Quem mais indicou</h3><Barras limite={8} itens={padrinhos.map(x => ({ nome: x.nome, valor: x.total, detalhe: `${x.ok} confirmadas` }))} /></article>
          <article className="cr-cartao">
            <div className="cr-acoes"><Segmento rotulo="Situação dos convites" valor={filtro} aoMudar={definirFiltro} opcoes={[['todas', 'Todas'], ['confirmadas', 'Confirmadas'], ['pendentes', 'Pendentes']]} />
              <button type="button" className="cr-ver" onClick={() => baixarCsv(`ortoquestoes-indicacoes-${new Date().toISOString().slice(0, 10)}.csv`, ['Convidado', 'E-mail do convidado', 'Indicado por', 'E-mail de quem indicou', 'Entrou em', 'Questões', 'Confirmada em', 'Dias para quem indicou', 'Dias para o convidado'], linhas.map(l => [l.convidado, l.email_convidado, l.padrinho, l.email_padrinho, dataHoraAntiga(l.criado_em), l.respondidas, l.confirmada_em ? dataHoraAntiga(l.confirmada_em) : '', l.dias_padrinho, l.dias_convidado]))}><Icone nome="baixar" tamanho={14} />CSV</button></div>
            <Tabela rotulo="Convites" linhas={vis} chave={l => l.id_convidado} compacta porPagina={10} colunas={[
              { id: 'c', titulo: 'Quem chegou', celula: l => <span style={{ display: 'grid' }}><span className="a3-nome">{l.convidado ?? l.email_convidado}</span><span className="a3-sub">{dataHoraAntiga(l.criado_em)}</span></span> },
              { id: 'p', titulo: 'Indicado por', celula: l => l.padrinho ?? l.email_padrinho, rotuloCelular: 'Por' },
              { id: 'q', titulo: 'Questões', numero: true, celula: l => `${Number(l.respondidas)}/${META}`, ordem: l => Number(l.respondidas), rotuloCelular: 'Questões' },
              { id: 's', titulo: 'Situação', celula: l => l.confirmada_em ? <span style={{ color: 'var(--a3-ok)' }}>Confirmada · +{l.dias_padrinho}/+{l.dias_convidado} dias</span> : <span className="fraco">Pendente</span>, rotuloCelular: 'Situação' },
            ]} />
          </article>
        </div>}
  </Secao>
}
