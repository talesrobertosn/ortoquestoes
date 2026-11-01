import { CenaArquivo } from '../componentes/flashcards/CenaArquivo'
import { usarDiaAtual } from '../util/usarDiaAtual'
import { usarConta } from '../conta/ContextoConta'
import { DATA_TEOT } from '../dados/calendarioProvas'
/**
 * Cronograma dos flashcards, reprojetado em 15/10/2026 (pedido do Tales: "transformar em algo
 * palpável de verdade, não aleatório"). Segue os princípios de docs/cronograma/PLANO.md:
 * onde você está, hoje, amanhã, esta semana, depois. O cálculo fica em
 * src/flashcards/cronograma.ts; aqui só a apresentação e o ajuste do plano.
 */
import { useEffect, useMemo, useState } from 'react'
import { Icone } from '../componentes/Icone'
import { corDaArea } from '../dados/coresAreas'
import { EVENTO_DADOS, chaveCompleta, gravar, ler } from '../estado/armazenamento'
import {
  CHAVE_PLANO, RITMOS, calcularCronograma, migrarPlano, rotuloTempo,
  type AssuntoDoPlano, type Cronograma, type DiaDoPlano, type FatiaDoDia, type PlanoFlashcards,
} from '../flashcards/cronograma'
import { carregarAcervo, indiceDoAcervo } from '../flashcards/dados/acervo'
import { CHAVE_REGISTROS, type RegistroFlashcard } from '../flashcards/progresso'
import type { Flashcard } from '../flashcards/tipos'
import { chaveDoDia, diaDaSemana, somarDias } from '../util/dia'
import { href } from '../util/rotas'
import '../estilos/paginas/CronogramaFlashcards.css'

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']

/** "15 out." ou "10 jan. 2027" (o ano só quando não é o de hoje). */
export function dataCurta(chave: string, hoje = chaveDoDia()) {
  const [a, m, d] = chave.split('-').map(Number)
  return `${d} ${MESES[m - 1]}${String(a) !== hoje.slice(0, 4) ? ` ${a}` : ''}`
}
const n = (x: number) => x.toLocaleString('pt-BR')
const plural = (x: number, um: string, varios: string) => `${n(x)} ${x === 1 ? um : varios}`

/** Endereço da sessão do cronograma na Biblioteca. `extra`: adiantar os próximos novos. */
export const linkSessaoCronograma = (extra = 0) => `/flashcards/biblioteca?categoria=plano${extra ? `&extra=${extra}` : ''}`

/** Acervo, registros e plano, recalculados quando os dados mudam (outra aba, sincronização, sessão). */
export function usarCronograma() {
  const dia = usarDiaAtual()
  const { sessao } = usarConta()
  const conta = sessao?.user.id ?? null
  const [cartas, definirCartas] = useState<Flashcard[] | null>(null)
  const [versao, definirVersao] = useState(0)
  useEffect(() => { let vivo = true; void carregarAcervo().then((c) => { if (vivo) definirCartas(c) }); return () => { vivo = false } }, [])
  useEffect(() => {
    const mudou = (e: Event) => {
      const chave = (e as CustomEvent<{ chave?: string }>).detail?.chave
      if (!chave || chave === CHAVE_REGISTROS || chave === CHAVE_PLANO) definirVersao((v) => v + 1)
    }
    const outraAba = (e: StorageEvent) => { if (e.key === null || e.key === chaveCompleta(CHAVE_PLANO) || e.key === chaveCompleta(CHAVE_REGISTROS)) definirVersao(v => v + 1) }
    window.addEventListener(EVENTO_DADOS, mudou); window.addEventListener('storage', outraAba)
    return () => { window.removeEventListener(EVENTO_DADOS, mudou); window.removeEventListener('storage', outraAba) }
  }, [])
  const salvo = useMemo(() => migrarPlano(ler<unknown>(CHAVE_PLANO, null)), [versao, conta]) // eslint-disable-line react-hooks/exhaustive-deps
  const registros = useMemo(() => ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {}), [versao, conta]) // eslint-disable-line react-hooks/exhaustive-deps
  const crono = useMemo(() => (cartas ? calcularCronograma(salvo, cartas, registros) : null), [cartas, salvo, registros, dia])
  const nomes = useMemo(() => {
    const r: Record<string, string> = {}
    const ind = cartas ? indiceDoAcervo() : null
    if (ind) for (const [id, a] of Object.entries(ind.areas)) r[id] = a.nome
    return r
  }, [cartas])
  const salvar = (p: PlanoFlashcards) => { gravar(CHAVE_PLANO, p); definirVersao((v) => v + 1) }
  return { cartas, crono, salvo, nomes, registros, salvar }
}

/* --------------------------------------------------------------- peças */

function Chip({ f, curto }: { f: Pick<FatiaDoDia, 'assunto' | 'areaId' | 'n'>; curto?: boolean }) {
  return (
    <span className="cfc-chip" style={{ ['--area' as string]: corDaArea(f.areaId) }}>
      <i aria-hidden="true" />{f.assunto}{!curto && <b className="numerico">{f.n}</b>}
    </span>
  )
}

/** O que a pessoa faz hoje, em uma frase e um botão (para a central, a Biblioteca e o fim da sessão). */
export function resumoDeHoje(c: Cronograma) {
  const faltaNovos = c.novosHoje.length
  const revisoes = Math.min(c.revisoes.length, c.sessaoHoje.length - faltaNovos)
  const partes = [revisoes ? plural(revisoes, 'revisão', 'revisões') : '', faltaNovos ? plural(faltaNovos, 'novo', 'novos') : ''].filter(Boolean)
  return { revisoes, faltaNovos, total: c.sessaoHoje.length, texto: partes.join(' + ') }
}

function BotaoHoje({ c, grande }: { c: Cronograma; grande?: boolean }) {
  const r = resumoDeHoje(c)
  const classe = `botao botao--principal${grande ? ' botao--grande' : ''}`
  if (r.total) return <a className={classe} href={href(linkSessaoCronograma())}><Icone nome="rota" tamanho={18} /> Seguir cronograma · faltam {n(r.total)}</a>
  if (!c.novosRestantes) return null
  return <a className={classe} href={href(linkSessaoCronograma(c.plano.ritmo))}><Icone nome="raio" tamanho={18} /> Adiantar {n(Math.min(c.plano.ritmo, c.novosRestantes))} do próximo dia</a>
}

/** Linha "Amanhã: assunto · N novos". */
function LinhaAmanha({ dia }: { dia: DiaDoPlano | null }) {
  if (!dia) return null
  const quando = dia.dia === somarDias(chaveDoDia(), 1) ? 'Amanhã' : `Próximo dia de estudo (${DIAS_LONGOS[diaDaSemana(dia.dia)]})`
  return (
    <p className="cfc-amanha"><strong>{quando}:</strong> {dia.novos
      ? <>{dia.assuntos.map((f) => <Chip key={f.areaId + f.assunto} f={f} />)} <span>{plural(dia.novos, 'novo', 'novos')} + as revisões que vencerem</span></>
      : <span>só as revisões que vencerem</span>}</p>
  )
}

/* ------------------------------------------------------ cartão da central */

/** Cronograma em destaque na central de Flashcards: hoje, progresso de hoje e amanhã. */
export function CartaoCronograma({ c, sugerido }: { c: Cronograma | null; sugerido: boolean }) {
  if (!c) return <section className="cf-crono" aria-busy="true"><h2><Icone nome="calendario" tamanho={20} /> Meu cronograma</h2><p className="cf-nota">Montando a fila de hoje…</p></section>
  const r = resumoDeHoje(c)
  const feitos = c.novosFeitosHoje + c.revisoesFeitasHoje
  const alvo = feitos + r.total
  return (
    <section className="cf-crono cfc-cartao" aria-labelledby="cf-crono-titulo">
      <h2 id="cf-crono-titulo"><Icone nome="calendario" tamanho={20} /> Meu cronograma</h2>
      {c.concluido ? <p>Você já viu todos os flashcards do plano e nenhuma revisão venceu. Escolha mais assuntos quando quiser.</p> : (
        <>
          <div className="cfc-cartao__hoje">
            <span className="cfc-rotulo">Hoje</span>
            {c.semana[0].assuntos.length ? <div className="cfc-chips">{c.semana[0].assuntos.map((f) => <Chip key={f.areaId + f.assunto} f={f} />)}</div> : null}
            <p>{r.total ? <>{r.texto} · <span className="cf-nota">{rotuloTempo(r.total)}</span></> : c.ehDiaDeEstudo ? <><Icone nome="certo" tamanho={16} /> Meta de hoje feita. O que passar disso adianta o plano.</> : 'Hoje é folga no seu plano. Se quiser, adiante.'}</p>
          </div>
          {alvo > 0 && (
            <div className="cf-crono__meta" role="meter" aria-label="Feito hoje" aria-valuemin={0} aria-valuemax={alvo} aria-valuenow={feitos}>
              <span>Feito hoje</span><b className="numerico">{n(feitos)}/{n(alvo)}</b>
              <i><em style={{ width: `${Math.round((100 * feitos) / alvo)}%` }} /></i>
            </div>
          )}
          <LinhaAmanha dia={c.amanha} />
          {c.previsao && <p className="cf-nota">No ritmo de {c.plano.ritmo} por dia, você vê o último flashcard novo em {dataCurta(c.previsao)}.</p>}
        </>
      )}
      {sugerido && <p className="cf-nota">Plano sugerido: todos os assuntos, na ordem dos que mais caem. Ajuste quando quiser.</p>}
      <div className="cf-crono__botoes">
        <BotaoHoje c={c} />
        <a className="botao botao--fantasma" href={href('/flashcards/cronograma')}>Ver cronograma</a>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------- página */

export function PaginaCronogramaFlashcards({ abas }: { abas: React.ReactNode }) {
  const { crono, salvo, nomes, cartas, registros, salvar } = usarCronograma()
  const [ajustando, definirAjustando] = useState(false)
  return (
    <article className="cf cfc empilha-2 cf--arquivo">
      {abas}
      <header className="cf-cabeca cf-cabeca--arquivo">
        <CenaArquivo />
        <p className="cf-selo"><span className="cf-beta">Beta</span> Flashcards</p>
        <h1>Meu cronograma de flashcards</h1>
        <p>Uma fila concreta: os assuntos na ordem em que mais caem na prova, do flashcard mais fácil ao mais difícil. As revisões que venceram vêm primeiro. A meta do dia é uma sugestão: fez mais, o plano adianta; fez menos, amanhã continua de onde parou.</p>
      </header>
      {!crono || !cartas ? <p role="status">Montando a sua fila…</p> : (
        <>
          {!salvo && !ajustando && (
            <aside className="cfc-sugerido" role="note">
              <p><strong>Este é o plano sugerido:</strong> todos os assuntos, {crono.plano.ritmo} flashcards novos por dia, de segunda a sábado. Já dá para seguir; ajuste se quiser.</p>
              <button type="button" className="botao botao--fantasma" onClick={() => definirAjustando(true)}><Icone nome="lapis" tamanho={16} /> Ajustar</button>
            </aside>
          )}
          {ajustando && (
            <Ajustes atual={crono.plano} nomes={nomes} cartas={cartas} registros={registros}
              aoSalvar={(p) => { salvar(p); definirAjustando(false) }} aoCancelar={() => definirAjustando(false)} />
          )}
          <OndeVoceEsta c={crono} aoAjustar={() => definirAjustando(true)} />
          <Hoje c={crono} />
          <Semana c={crono} />
          <Depois c={crono} />
          {salvo && !ajustando && (
            <p className="cfc-rodape"><button type="button" className="botao botao--fantasma" onClick={() => { definirAjustando(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icone nome="lapis" tamanho={16} /> Ajustar ritmo, dias, assuntos ou data</button>
              <span className="cf-nota">O cronograma de flashcards fica salvo neste aparelho e é separado do cronograma de questões.</span></p>
          )}
        </>
      )}
    </article>
  )
}

function OndeVoceEsta({ c, aoAjustar }: { c: Cronograma; aoAjustar: () => void }) {
  const pct = c.totalFlashcards ? Math.round((100 * c.estudados) / c.totalFlashcards) : 0
  const daVez = c.assuntos.findIndex((a) => a.estado === 'agora')
  const vistos = c.assuntos.filter((a) => a.estado === 'feito').length
  return (
    <section className="cf-bloco cfc-onde" aria-labelledby="cfc-onde">
      <h2 id="cfc-onde" className="cfc-etapa"><span>Onde você está</span></h2>
      <div className="cfc-trilho" role="meter" aria-label="Flashcards do plano já vistos" aria-valuemin={0} aria-valuemax={c.totalFlashcards} aria-valuenow={c.estudados}>
        <i style={{ width: `${pct}%` }} />
        <b style={{ left: `${pct}%` }} aria-hidden="true">você</b>
      </div>
      <p className="cfc-onde__numeros">
        <span><b className="numerico">{n(c.estudados)}</b> de {n(c.totalFlashcards)} flashcards vistos ({pct}%)</span>
        <span>{daVez >= 0 ? <>assunto <b className="numerico">{daVez + 1}</b> de {n(c.assuntos.length)}: <strong>{c.assuntos[daVez].assunto}</strong></> : `${n(vistos)} de ${n(c.assuntos.length)} assuntos vistos`}</span>
      </p>
      <Previsao c={c} aoAjustar={aoAjustar} />
    </section>
  )
}

/** Previsão sempre positiva: quando termina no ritmo atual e, com data, o ritmo que chega nela. */
function Previsao({ c, aoAjustar }: { c: Cronograma; aoAjustar?: () => void }) {
  if (!c.previsao) return <p className="cfc-previsao cfc-previsao--ok"><Icone nome="certo" tamanho={18} /> Você já viu todos os flashcards novos do plano. Agora é manter as revisões em dia.</p>
  const base = <>No ritmo de <b>{c.plano.ritmo} novos por dia</b>, você vê o último flashcard novo em <b>{dataCurta(c.previsao)}</b>.</>
  if (!c.alvo) return <p className="cfc-previsao">{base}</p>
  if (c.alvo.folga >= 0) return <p className="cfc-previsao cfc-previsao--ok">{base} Isso é {c.alvo.folga ? plural(c.alvo.folga, 'dia', 'dias') + ' antes' : 'no dia'} da sua data ({dataCurta(c.alvo.data)}): sobra tempo para revisar.</p>
  return (
    <div className="cfc-previsao">
      <p>{base} Para chegar a {dataCurta(c.alvo.data)} com tudo visto, seriam cerca de <b>{c.alvo.ritmoNaData} por dia</b>.</p>
      <p className="cf-nota">Os dois caminhos funcionam: mantenha o seu ritmo (o que passar da meta adianta) ou suba a meta.</p>
      {aoAjustar && <button type="button" className="botao botao--fantasma" onClick={aoAjustar}>Ajustar o ritmo</button>}
    </div>
  )
}

function Hoje({ c }: { c: Cronograma }) {
  const r = resumoDeHoje(c)
  const hoje = c.semana[0]
  const itens: Array<{ rotulo: React.ReactNode; num: string; estado: 'feito' | 'agora' | 'a-fazer'; tempo?: string }> = []
  if (c.revisoes.length || c.revisoesFeitasHoje) itens.push({
    rotulo: <>Revisões que venceram{c.revisoes.length > r.revisoes ? <small> · as outras {n(c.revisoes.length - r.revisoes)} ficam para a próxima sessão</small> : null}</>,
    num: c.revisoes.length ? plural(r.revisoes, 'revisão', 'revisões') : plural(c.revisoesFeitasHoje, 'feita', 'feitas'),
    estado: c.revisoes.length ? 'agora' : 'feito', tempo: r.revisoes ? rotuloTempo(r.revisoes) : undefined,
  })
  if (c.metaNovos || c.novosFeitosHoje) itens.push({
    rotulo: <>Flashcards novos {hoje.assuntos.length ? <span className="cfc-chips">{hoje.assuntos.map((f) => <Chip key={f.areaId + f.assunto} f={f} curto />)}</span> : null}</>,
    num: `${n(Math.min(c.novosFeitosHoje, c.metaNovos || c.novosFeitosHoje))} de ${n(c.metaNovos || c.novosFeitosHoje)}${c.novosFeitosHoje > c.metaNovos ? ` (+${n(c.novosFeitosHoje - c.metaNovos)} adiantados)` : ''}`,
    estado: c.novosHoje.length ? (c.revisoes.length ? 'a-fazer' : 'agora') : 'feito', tempo: c.novosHoje.length ? rotuloTempo(c.novosHoje.length) : undefined,
  })
  return (
    <section className="cf-bloco cfc-hoje" aria-labelledby="cfc-hoje">
      <div className="cfc-hoje__topo">
        <h2 id="cfc-hoje" className="cfc-etapa"><span>Hoje</span> <small>{DIAS_LONGOS[diaDaSemana(c.hoje)]}, {dataCurta(c.hoje)}</small></h2>
        {r.total > 0 && <span className="cfc-total">{n(r.total)} flashcards · {rotuloTempo(r.total)}</span>}
      </div>
      {!c.ehDiaDeEstudo && !c.revisoes.length && <p className="cfc-folga">Hoje é folga no seu plano. Descanse ou, se quiser, adiante: o que fizer agora sai da fila dos próximos dias.</p>}
      {itens.length > 0 && (
        <ol className="cfc-lista">
          {itens.map((it, i) => (
            <li key={i} data-estado={it.estado}>
              <span className="cfc-lista__marca" aria-hidden="true">{it.estado === 'feito' ? <Icone nome="certo" tamanho={14} /> : i + 1}</span>
              <span className="cfc-lista__texto">{it.rotulo}</span>
              <span className="cfc-lista__num">{it.num}{it.tempo && <small>{it.tempo}</small>}</span>
            </li>
          ))}
        </ol>
      )}
      {c.metaFeita && c.ehDiaDeEstudo && <p className="cfc-feito"><Icone nome="certo" tamanho={18} /> Meta de hoje feita. Quer seguir? Tudo o que passar da meta adianta o plano.</p>}
      <div className="cfc-hoje__botoes"><BotaoHoje c={c} grande /></div>
      <LinhaAmanha dia={c.amanha} />
    </section>
  )
}

function Semana({ c }: { c: Cronograma }) {
  const muda = c.semana.find((d, i) => i > 0 && d.assuntos.length && d.assuntos.some((f) => !c.semana[0].assuntos.some((g) => g.assunto === f.assunto && g.areaId === f.areaId)))
  return (
    <section className="cf-bloco" aria-labelledby="cfc-semana">
      <h2 id="cfc-semana" className="cfc-etapa"><span>Esta semana</span></h2>
      <ol className="cfc-semana">
        {c.semana.map((d) => {
          const folgaSemEstudo = d.hoje && !d.estudo && !c.sessaoHoje.length && !c.novosFeitosHoje && !c.revisoesFeitasHoje
          const feito = d.hoje && !c.sessaoHoje.length && !folgaSemEstudo
          const estado = folgaSemEstudo ? 'folga' : d.hoje ? (c.sessaoHoje.length ? 'hoje' : 'feito') : !d.estudo ? 'folga' : d.novos ? 'a-fazer' : 'livre'
          const cor = d.assuntos[0] ? corDaArea(d.assuntos[0].areaId) : undefined
          return (
            <li key={d.dia} data-estado={estado} style={cor ? { ['--area' as string]: cor } : undefined}>
              <span className="cfc-semana__dia">{DIAS_CURTOS[diaDaSemana(d.dia)]} <small>{Number(d.dia.slice(8))}</small></span>
              <b className="numerico">{folgaSemEstudo ? '' : d.hoje ? (c.sessaoHoje.length ? n(c.novosHoje.length) : <Icone nome="certo" tamanho={16} />) : d.estudo ? (d.novos ? n(d.novos) : '–') : ''}</b>
              <span className="cfc-semana__assunto">{feito ? 'feito' : !d.estudo ? 'folga' : d.assuntos.map((f) => f.assunto).join(' · ') || (d.novos ? '' : 'revisões')}</span>
            </li>
          )
        })}
      </ol>
      {muda && <p className="cf-nota">{DIAS_LONGOS[diaDaSemana(muda.dia)].replace(/^./, (x) => x.toUpperCase())} entra <strong>{muda.assuntos.find((f) => !c.semana[0].assuntos.some((g) => g.assunto === f.assunto))?.assunto ?? muda.assuntos[0].assunto}</strong>.</p>}
      <p className="cf-nota">Os números são flashcards novos previstos. As revisões entram a cada dia, antes deles, conforme vencem.</p>
    </section>
  )
}

function Depois({ c }: { c: Cronograma }) {
  const [todos, definirTodos] = useState(false)
  const inicio = Math.max(0, c.assuntos.findIndex((a) => a.estado !== 'feito'))
  const lista = todos ? c.assuntos : c.assuntos.slice(Math.max(0, inicio - 1), inicio + 7)
  return (
    <section className="cf-bloco" aria-labelledby="cfc-depois">
      <div className="cf-bloco__cabeca">
        <h2 id="cfc-depois" className="cfc-etapa"><span>Depois: a fila dos assuntos</span></h2>
        <span className="cf-nota">Ordem dos temas que mais caem nas provas</span>
      </div>
      <ol className="cfc-fila" start={todos ? 1 : Math.max(0, inicio - 1) + 1}>
        {lista.map((a) => <LinhaAssunto key={a.chave} a={a} pos={c.assuntos.indexOf(a) + 1} hoje={c.hoje} />)}
      </ol>
      {c.assuntos.length > lista.length || todos ? (
        <button type="button" className="botao botao--fantasma" aria-expanded={todos} onClick={() => definirTodos((v) => !v)}>{todos ? 'Mostrar só os próximos' : `Ver todos os ${n(c.assuntos.length)} assuntos`}</button>
      ) : null}
    </section>
  )
}

function LinhaAssunto({ a, pos, hoje }: { a: AssuntoDoPlano; pos: number; hoje: string }) {
  const pct = Math.round((100 * a.estudados) / a.total)
  const quando = a.estado === 'feito' ? 'todos vistos' : a.inicio === hoje ? (a.fim && a.fim !== hoje ? `hoje até ${dataCurta(a.fim, hoje)}` : 'hoje') : a.inicio ? (a.fim && a.fim !== a.inicio ? `${dataCurta(a.inicio, hoje)} a ${dataCurta(a.fim, hoje)}` : dataCurta(a.inicio, hoje)) : ''
  return (
    <li className="cfc-assunto" data-estado={a.estado} style={{ ['--area' as string]: corDaArea(a.areaId) }}>
      <span className="cfc-assunto__pos numerico">{pos}</span>
      <span className="cfc-assunto__nome"><strong>{a.assunto}</strong><small>{a.area}{a.questoesProva ? ` · ${plural(a.questoesProva, 'questão de prova', 'questões de prova')}` : ''}</small></span>
      <span className="cfc-assunto__barra" role="meter" aria-label={`${a.assunto}: ${a.estudados} de ${a.total} vistos`} aria-valuemin={0} aria-valuemax={a.total} aria-valuenow={a.estudados}><i style={{ width: `${pct}%` }} /></span>
      <span className="cfc-assunto__num numerico">{a.estudados}/{a.total}</span>
      <span className="cfc-assunto__quando">{a.estado === 'agora' && <em>agora</em>}{quando}</span>
    </li>
  )
}

/* ----------------------------------------------------------- ajustes */

function Ajustes({ atual, nomes, cartas, registros, aoSalvar, aoCancelar }: {
  atual: PlanoFlashcards; nomes: Record<string, string>; cartas: Flashcard[]; registros: Record<string, RegistroFlashcard>
  aoSalvar: (p: PlanoFlashcards) => void; aoCancelar: () => void
}) {
  const hoje = chaveDoDia()
  const [ritmo, definirRitmo] = useState(atual.ritmo)
  const [diasSemana, definirDias] = useState<number[]>(atual.diasSemana.length ? atual.diasSemana : [0, 1, 2, 3, 4, 5, 6])
  const [areas, definirAreas] = useState<string[]>(atual.areas)
  const [comData, definirComData] = useState(!!atual.data && atual.data > hoje)
  const [data, definirData] = useState(atual.data && atual.data > hoje ? atual.data : DATA_TEOT > hoje ? DATA_TEOT : somarDias(hoje, 90))
  const rascunho: PlanoFlashcards = { ...atual, versao: 2, ritmo, diasSemana: diasSemana.length === 7 ? [] : [...diasSemana].sort(), areas, data: comData ? data : null }
  // simulador: a previsão muda na hora, antes de salvar
  const previa = useMemo(() => calcularCronograma(rascunho, cartas, registros), [cartas, registros, ritmo, diasSemana.join(), areas.join(), comData, data]) // eslint-disable-line react-hooks/exhaustive-deps
  const lista = Object.entries(nomes).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
  const alterna = <T,>(v: T[], x: T) => (v.includes(x) ? v.filter((y) => y !== x) : [...v, x])
  return (
    <form className="cf-bloco cf-form cfc-ajustes" onSubmit={(e) => { e.preventDefault(); if (diasSemana.length) aoSalvar(rascunho) }}>
      <h2>Ajustar o plano</h2>
      <fieldset className="cf-campo">
        <legend>Flashcards novos por dia (sugestão)</legend>
        <div className="cf-chips" role="radiogroup" aria-label="Novos por dia">
          {RITMOS.map((r) => <button key={r} type="button" role="radio" aria-checked={ritmo === r} onClick={() => definirRitmo(r)}>{r}</button>)}
          <label className="cfc-outro">Outro <input type="number" inputMode="numeric" min={1} max={500} value={ritmo} onChange={(e) => definirRitmo(Math.max(1, Math.min(500, Math.round(Number(e.target.value)) || 1)))} /></label>
        </div>
        <small>{rotuloTempo(ritmo)} por dia, mais as revisões. Dá para passar da meta sempre que quiser.</small>
      </fieldset>
      <fieldset className="cf-campo">
        <legend>Dias com meta</legend>
        <div className="cf-chips">{DIAS_CURTOS.map((d, i) => <button key={d} type="button" aria-pressed={diasSemana.includes(i)} onClick={() => definirDias(alterna(diasSemana, i))}>{d}</button>)}</div>
        <small>Nos outros dias não há meta; se estudar, adianta.</small>
      </fieldset>
      <fieldset className="cf-campo">
        <legend>Assuntos</legend>
        <div className="cf-chips">
          <button type="button" aria-pressed={!areas.length} onClick={() => definirAreas([])}>Todos</button>
          {lista.map(([id, nome]) => <button key={id} type="button" aria-pressed={areas.includes(id)} onClick={() => definirAreas(alterna(areas, id))}>{nome}</button>)}
        </div>
      </fieldset>
      <fieldset className="cf-campo">
        <legend>Data da prova (opcional)</legend>
        <div className="cf-chips" role="radiogroup" aria-label="Data da prova">
          <button type="button" role="radio" aria-checked={!comData} onClick={() => definirComData(false)}>Sem data</button>
          <button type="button" role="radio" aria-checked={comData} onClick={() => definirComData(true)}>Com data</button>
        </div>
        {comData && <input type="date" value={data} min={somarDias(hoje, 1)} onChange={(e) => e.target.value && definirData(e.target.value)} aria-label="Data da prova" />}
        <small>A data só serve para comparar com a previsão. Nunca trava o plano.</small>
      </fieldset>
      <div className="cfc-ajustes__previa" aria-live="polite">
        <Previsao c={previa} />
        {previa.alvo && previa.alvo.folga < 0 && <button type="button" className="botao botao--fantasma" onClick={() => definirRitmo(Math.min(500, previa.alvo!.ritmoNaData))}>Usar {previa.alvo.ritmoNaData} por dia</button>}
      </div>
      {!diasSemana.length && <p className="cf-nota" role="status">Escolha ao menos um dia com meta.</p>}
      <div className="cf-form__botoes">
        <button type="submit" className="botao botao--principal" disabled={!diasSemana.length}>Salvar plano</button>
        <button type="button" className="botao botao--fantasma" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
