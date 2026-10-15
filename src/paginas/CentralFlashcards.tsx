import { useEffect, useMemo, useState } from 'react'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { JanelaCentral } from '../componentes/JanelaCentral'
import { recurso } from '../config'
import { ler } from '../estado/armazenamento'
import { revisarHoje } from '../estado/revisao'
import { href, navegar } from '../util/rotas'
import { calcularEstatisticas, chaveDoDia, type DiaResumido } from '../flashcards/aprendizagem'
import { corDaArea } from '../dados/coresAreas'
import { CartaoCronograma, PaginaCronogramaFlashcards, linkSessaoCronograma, usarCronograma } from './CronogramaFlashcards'
import { carregarAcervo, indiceDoAcervo } from '../flashcards/dados/acervo'
import {
  CATEGORIAS_OPINIAO, deveConvidar, dispensarConvite, enviarOpiniao, mensagemDeErro,
  type CategoriaOpiniao, type OrigemOpiniao,
} from '../flashcards/opiniao'
import { CHAVE_RECORDES, RECORDES_VAZIOS, type Recordes } from '../flashcards/progresso'
import type { Flashcard } from '../flashcards/tipos'
import '../estilos/paginas/CentralFlashcards.css'

export const AVISO_BETA = 'O Torneio de Flashcards está em beta. Estamos aprimorando o visual, o áudio e as mecânicas. Teste e conte o que funcionou — ou o que precisa melhorar.'

function usarAcervo() {
  const [cartas, definirCartas] = useState<Flashcard[] | null>(null)
  useEffect(() => { let vivo = true; void carregarAcervo().then((c) => { if (vivo) definirCartas(c) }); return () => { vivo = false } }, [])
  const nomes = useMemo(() => {
    const n: Record<string, string> = {}
    const ind = cartas ? indiceDoAcervo() : null
    if (ind) for (const [id, a] of Object.entries(ind.areas)) n[id] = a.nome
    return n
  }, [cartas])
  return { cartas, nomes }
}

const estudar = (categoria: string, n?: number, areas: string[] = []) => {
  const q = new URLSearchParams({ categoria })
  for (const a of areas) q.append('area', a)
  if (n) q.set('n', String(n))
  return `/flashcards/biblioteca?${q}`
}
/** Biblioteca já num assunto (pontos fracos do desempenho). */
const estudarAssunto = (area: string, assunto: string) => `/flashcards/biblioteca?${new URLSearchParams({ categoria: 'area:' + area, area, assunto, n: '20' })}`

function Abas({ atual }: { atual: 'central' | 'desempenho' | 'cronograma' }) {
  const abas: Array<{ id: typeof atual; rotulo: string; destino: string; icone: NomeIcone }> = [
    { id: 'central', rotulo: 'Central', destino: '/flashcards', icone: 'mapa' },
    { id: 'desempenho', rotulo: 'Meu desempenho', destino: '/flashcards/desempenho', icone: 'grafico' },
    { id: 'cronograma', rotulo: 'Meu cronograma', destino: '/flashcards/cronograma', icone: 'calendario' },
  ]
  return (
    <nav className="cf-abas" aria-label="Seções dos flashcards">
      {abas.map((a) => (
        <a key={a.id} href={href(a.destino)} aria-current={a.id === atual ? 'page' : undefined}><Icone nome={a.icone} tamanho={16} /> {a.rotulo}</a>
      ))}
    </nav>
  )
}

/* ------------------------------------------------------------------ Central */

export function CentralFlashcards() {
  const { cartas, nomes, crono, salvo, registros } = usarCronograma()
  const rec = useMemo(() => ({ ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }), [])
  // #/flashcards?opiniao=fim_sessao (fim da sessão de estudo ou da partida) já abre a janela
  const [opiniao, definirOpiniao] = useState<OrigemOpiniao | null>(() => {
    const o = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('opiniao')
    return o === 'fim_sessao' || o === 'fim_partida' ? o : null
  })
  const [convite, definirConvite] = useState(() => deveConvidar())

  const contagem = useMemo(() => {
    const v = Object.values(registros)
    return {
      hoje: v.filter((r) => revisarHoje(r)).length,
      errei: v.filter((r) => r.c === false).length,
      hesitei: v.filter((r) => r.c === true && r.confianca === 'duvida').length,
      estudados: v.length,
    }
  }, [registros])
  const novos = cartas ? cartas.filter((c) => !registros[c.id]).length : null
  const areas = useMemo(() => Object.entries(nomes).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), [nomes])

  return (
    <article className="cf empilha-2">
      <Abas atual="central" />
      <section className="cf-heroi">
        <picture className="cf-heroi__arte">
          <img src={recurso('flashcards/promo/capa-larga.png')} alt="" width={520} height={330} decoding="async" />
        </picture>
        <div className="cf-heroi__texto">
          <p className="cf-selo"><span className="cf-beta">Beta público</span> Flashcards</p>
          <h1>Treine flashcards<br />de Ortopedia.</h1>
          <p>Por área, tirados das questões comentadas das provas reais. Revisão espaçada: o que você erra volta antes, o que você sabe espaça. E, se quiser, os mesmos flashcards em modo jogo.</p>
          <div className="cf-heroi__botoes">
            <a className="botao botao--ouro botao--grande" href={href('/flashcards/biblioteca')}><Icone nome="livro" tamanho={18} /> Estudar flashcards</a>
            <a className="botao botao--principal" href={href('/flashcards/cripta')}><Icone nome="raio" tamanho={18} /> Jogar o Torneio</a>
            <a className="botao botao--fantasma cf-heroi__crono" href={href(linkSessaoCronograma())}><Icone nome="rota" tamanho={18} /> Seguir cronograma</a>
          </div>
        </div>
      </section>

      {convite && (
        <aside className="cf-convite" role="note">
          <p><strong>Você já terminou algumas sessões.</strong> Leva um minuto contar como está sendo.</p>
          <div className="cf-convite__botoes">
            <button type="button" className="botao botao--principal" onClick={() => { definirConvite(false); definirOpiniao('convite') }}>Dar opinião</button>
            <button type="button" className="botao botao--fantasma" onClick={() => { dispensarConvite(); definirConvite(false) }}>Agora não</button>
          </div>
        </aside>
      )}

      <div className="cf-painel">
      <section className="cf-hoje" aria-labelledby="cf-hoje-titulo">
        <div className="cf-hoje__cabeca">
          <h2 id="cf-hoje-titulo"><Icone nome="reiniciar" tamanho={20} /> Revisões de hoje</h2>
          <p>{contagem.hoje
            ? `${contagem.hoje} ${contagem.hoje === 1 ? 'flashcard venceu' : 'flashcards venceram'} hoje pela repetição espaçada.`
            : contagem.estudados ? 'Nada vence hoje. Bom momento para flashcards novos.' : 'Responda os primeiros flashcards e as revisões se montam sozinhas.'}</p>
        </div>
        <div className="cf-hoje__grade">
          <AtalhoEstudo destino={estudar('pendentes', Math.min(contagem.hoje || 20, 50))} rotulo="Revisões de hoje" numero={contagem.hoje} icone="calendario" desligado={!contagem.hoje} />
          <AtalhoEstudo destino={estudar('errados', 20)} rotulo="Errei" numero={contagem.errei} icone="alerta" desligado={!contagem.errei} />
          <AtalhoEstudo destino={estudar('hesitei', 20)} rotulo="Hesitei" numero={contagem.hesitei} icone="olho" desligado={!contagem.hesitei} />
          <AtalhoEstudo destino={estudar('novos', 20)} rotulo="Nunca estudados" numero={novos} icone="estrela" desligado={novos === 0} />
        </div>
        {areas.length > 0 && <PorAssunto areas={areas} />}
      </section>
      <CartaoCronograma c={crono} sugerido={!salvo} />
      </div>

      <section aria-labelledby="cf-passos-titulo">
        <h2 id="cf-passos-titulo" className="cf-titulo">Como funciona</h2>
        <ol className="cf-passos">
          <li><b>1</b><strong>Escolha um assunto</strong><span>Por área, pelas revisões de hoje, pelos que você errou ou pelos que nunca viu.</span></li>
          <li><b>2</b><strong>Responda e revise o flashcard</strong><span>Escolha a alternativa, veja o verso e diga se errou, hesitou ou sabia. A data da próxima revisão sai disso.</span></li>
          <li><b>3</b><strong>Acompanhe seu aprendizado e sua progressão</strong><span>Desempenho por assunto, cronograma até a data da prova e o seu recorde no Torneio.</span></li>
        </ol>
      </section>

      <section aria-labelledby="cf-modos-titulo">
        <h2 id="cf-modos-titulo" className="cf-titulo">Por onde seguir</h2>
        <div className="cf-modos">
          <CartaoModo arte="biblioteca" titulo="Revisar flashcards" texto="Estudo calmo, sem combate, por assunto ou pelas revisões do dia." destino="/flashcards/biblioteca" acao="Abrir a Biblioteca" />
          <CartaoModo arte="cripta" titulo="Torneio de Flashcards" texto={`Os mesmos flashcards em forma de jogo: cada acerto é um golpe. Uma jornada que começa pelo que é mais familiar e avança para seus desafios.${rec.andarMaximo ? ` Seu recorde: andar ${rec.andarMaximo}.` : ''}`} destino="/flashcards/entrada" acao="Entrar no Torneio" />
          <CartaoModo arte="progresso" titulo="Meu desempenho" texto={`${contagem.estudados.toLocaleString('pt-BR')} flashcards únicos estudados neste aparelho e na sua conta.`} destino="/flashcards/desempenho" acao="Ver desempenho" />
        </div>
        <ul className="cf-links">
          <li><a href={href('/ranking?aba=flashcards')}><Icone nome="trofeu" tamanho={18} /><span><strong>Ranking dos flashcards</strong><small>Uma jornada · um ranking</small></span></a></li>
        </ul>
      </section>

      <aside className="cf-aviso" role="note">
        <Icone nome="correio" tamanho={22} />
        <p><strong>Estamos construindo os próximos flashcards com você.</strong><br />O beta está aberto. Conte o que gostou e o que podemos melhorar: a sua opinião chega direto ao painel da equipe.</p>
        <button type="button" className="botao botao--principal" onClick={() => definirOpiniao('central')}>Enviar opinião</button>
      </aside>

      {opiniao && <JanelaOpiniao origem={opiniao} aoFechar={() => definirOpiniao(null)} />}
    </article>
  )
}

function AtalhoEstudo({ destino, rotulo, numero, icone, desligado }: { destino: string; rotulo: string; numero: number | null; icone: NomeIcone; desligado: boolean }) {
  const conteudo = <><Icone nome={icone} tamanho={18} /><span>{rotulo}</span><b className="numerico">{numero === null ? '…' : numero.toLocaleString('pt-BR')}</b></>
  return desligado
    ? <span className="cf-atalho cf-atalho--vazio" aria-disabled="true">{conteudo}</span>
    : <a className="cf-atalho" href={href(destino)}>{conteudo}</a>
}

function PorAssunto({ areas }: { areas: Array<[string, string]> }) {
  const [area, definirArea] = useState('')
  return (
    <form className="cf-assunto" onSubmit={(e) => { e.preventDefault(); if (area) navegar(estudar('area:' + area, 20, [area])) }}>
      <label htmlFor="cf-area">Por assunto</label>
      <select id="cf-area" value={area} onChange={(e) => definirArea(e.target.value)}>
        <option value="">Escolha a área</option>
        {areas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
      </select>
      <button type="submit" className="botao" disabled={!area}>Estudar 20</button>
    </form>
  )
}

function CartaoModo({ arte, titulo, texto, destino, acao }: { arte: string; titulo: string; texto: string; destino: string; acao: string }) {
  return (
    <a className={`cf-modo cf-modo--${arte}`} href={href(destino)}>
      <img src={recurso(`flashcards/promo/cartao-${arte}.png`)} alt="" width={260} height={150} loading="lazy" decoding="async" />
      <strong>{titulo}</strong>
      <span>{texto}</span>
      <em>{acao} <Icone nome="direita" tamanho={14} /></em>
    </a>
  )
}

/* -------------------------------------------------------------- Desempenho */

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—')
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/**
 * Meu desempenho (visual refeito em 15/10/2026): números principais, evolução por dia com
 * as autoavaliações empilhadas, cada área com a sua cor e os pontos fracos com botão para treinar.
 */
export function DesempenhoFlashcards() {
  const { cartas, nomes } = usarAcervo()
  const [dias, definirDias] = useState(30)
  const est = useMemo(() => (cartas ? calcularEstatisticas(cartas, nomes, dias) : null), [cartas, nomes, dias])
  if (!est) return <article className="cf empilha-2"><Abas atual="desempenho" /><p role="status">Carregando o acervo…</p></article>
  const p = est.periodo
  const avaliacoes = p.errei + p.hesitei + p.sabia
  const fracos = est.porAssunto.filter((a) => a.acertos < a.tentativas).slice(0, 6)
  const estudadas = est.porArea.filter((a) => a.estudados > 0)
  const naoEstudadas = est.porArea.filter((a) => !a.estudados)
  return (
    <article className="cf empilha-2">
      <Abas atual="desempenho" />
      <header className="cf-cabeca">
        <p className="cf-selo"><span className="cf-beta">Beta</span> Flashcards</p>
        <h1>Meu desempenho nos flashcards</h1>
        <p>O aprendizado conta junto o que você responde na Biblioteca e no Torneio. Andares, ouro e chefes do jogo ficam de fora destes números.</p>
      </header>

      <section className="cf-numeros" aria-label="Totais desde o começo">
        <Numero rotulo="Flashcards únicos estudados" valor={est.unicos} nota={cartas ? `de ${cartas.length.toLocaleString('pt-BR')} no acervo` : 'Cada flashcard conta uma vez.'} barra={cartas?.length ? est.unicos / cartas.length : undefined} />
        <Numero rotulo="Respostas no total" valor={est.revisoes} nota="Todas as vezes que você respondeu, contando as repetições." />
        <Numero rotulo="Revisões pendentes hoje" valor={est.pendentes} nota="Venceram pela repetição espaçada." destino={est.pendentes ? estudar('pendentes', Math.min(est.pendentes, 50)) : undefined} />
        <Numero rotulo="Dominados" valor={est.dominados} nota="Acertou todas as voltas da escada de revisão." barra={est.unicos ? est.dominados / est.unicos : undefined} />
      </section>

      <section className="cf-bloco" aria-labelledby="cf-periodo">
        <div className="cf-bloco__cabeca">
          <h2 id="cf-periodo">Evolução nos últimos {dias} dias</h2>
          <div className="cf-chips" role="radiogroup" aria-label="Período">
            {[7, 30, 90].map((d) => <button key={d} type="button" role="radio" aria-checked={dias === d} onClick={() => definirDias(d)}>{d} dias</button>)}
          </div>
        </div>
        <div className="cf-numeros cf-numeros--miudo">
          <Numero rotulo="Respostas" valor={p.revisoes} nota={`${p.diasAtivos} ${p.diasAtivos === 1 ? 'dia' : 'dias'} com estudo`} />
          <Numero rotulo="Flashcards novos" valor={p.novos} nota="Vistos pela primeira vez no período" />
          <Numero rotulo="Acerto na primeira resposta" valor={pct(p.primeirasCertas, p.primeiras)} nota={`${p.primeirasCertas} de ${p.primeiras} na primeira vez com alternativas`} />
          <Numero rotulo="Acerto nas alternativas" valor={pct(p.objetivasCertas, p.objetivas)} nota={`${p.objetivasCertas} de ${p.objetivas} respostas com alternativa`} />
        </div>
        <GraficoDias porDia={p.porDia} />
        <h3 className="cf-sub">Como você se avaliou</h3>
        {avaliacoes ? (
          <div className="cf-barra" role="img" aria-label={`Errei ${p.errei}, hesitei ${p.hesitei}, sabia ${p.sabia}`}>
            {(['errei', 'hesitei', 'sabia'] as const).map((k) => p[k] ? <span key={k} className={`cf-barra__${k}`} style={{ flexGrow: p[k] }}>{rotuloAvaliacao[k]} {p[k]}</span> : null)}
          </div>
        ) : <p className="cf-nota">Ainda sem autoavaliações no período. Elas vêm da Biblioteca (Errei, Hesitei, Sabia); no Torneio conta só o acerto da alternativa.</p>}
        <p className="cf-nota">“Sabia” é a sua impressão, não um acerto conferido: o acerto objetivo é o da alternativa escolhida.{est.desde ? ` Registro diário desde ${formatarData(est.desde)}; nada é estimado para trás.` : ''}</p>
      </section>

      <section className="cf-bloco" aria-labelledby="cf-fracos">
        <h2 id="cf-fracos">Pontos fracos</h2>
        {fracos.length ? (
          <ul className="cfd-fracos">
            {fracos.map((a) => (
              <li key={a.area + a.assunto} style={{ ['--area' as string]: corDaArea(a.area) }}>
                <span className="cfd-fracos__nome"><strong>{a.assunto}</strong><small>{a.nome} · {a.acertos} de {a.tentativas} respostas certas{a.pendentes ? ` · ${a.pendentes} para revisar` : ''}</small></span>
                <span className="cfd-fracos__pct numerico" aria-hidden="true" data-faixa={a.acertos / a.tentativas >= 0.75 ? 'bom' : a.acertos / a.tentativas >= 0.5 ? 'medio' : 'baixo'}>{pct(a.acertos, a.tentativas)}</span>
                <a className="botao botao--principal" href={href(estudarAssunto(a.area, a.assunto))}>Treinar</a>
              </li>
            ))}
          </ul>
        ) : <p className="cf-nota">Os assuntos com menor acerto aparecem aqui depois de três respostas em cada um. Por enquanto, nada para destacar.</p>}
      </section>

      <section className="cf-bloco" aria-labelledby="cf-areas">
        <h2 id="cf-areas">Por área</h2>
        <ul className="cfd-areas">
          {[...estudadas, ...naoEstudadas].map((a) => {
            const prog = a.total ? a.estudados / a.total : 0
            const acerto = a.tentativas ? a.acertos / a.tentativas : null
            return (
              <li key={a.area} style={{ ['--area' as string]: corDaArea(a.area) }}>
                <span className="cfd-areas__nome"><i aria-hidden="true" /><strong>{a.nome}</strong></span>
                <span className="cfd-areas__barra" role="meter" aria-label={`${a.nome}: ${a.estudados} de ${a.total} estudados`} aria-valuemin={0} aria-valuemax={a.total} aria-valuenow={a.estudados} title={`${a.estudados} de ${a.total} estudados`}>
                  <i style={{ width: `${Math.max(prog ? 1.5 : 0, prog * 100)}%` }} />
                </span>
                <span className="cfd-areas__num numerico">{a.estudados}<small>/{a.total}</small></span>
                <span className="cfd-areas__acerto numerico" data-faixa={acerto === null ? 'vazio' : acerto >= 0.75 ? 'bom' : acerto >= 0.5 ? 'medio' : 'baixo'}>{acerto === null ? '—' : pct(a.acertos, a.tentativas)}<small>acerto</small></span>
                <a className="cfd-areas__acao" href={href(estudar(a.pendentes ? 'pendentes' : 'area:' + a.area, 20, [a.area]))}>{a.pendentes ? `Revisar ${a.pendentes}` : 'Estudar'}</a>
              </li>
            )
          })}
        </ul>
        <p className="cf-nota">Barra: flashcards da área já estudados. Acerto: respostas certas sobre todas as respostas daquela área, desde o começo.</p>
      </section>
    </article>
  )
}

/** Respostas por dia, empilhadas por autoavaliação (a Cripta e as respostas sem avaliação ficam em cinza). */
function GraficoDias({ porDia }: { porDia: DiaResumido[] }) {
  const max = Math.max(1, ...porDia.map((d) => d.revisoes))
  const topo = max <= 5 ? max : Math.ceil(max / 5) * 5
  const hoje = chaveDoDia(Date.now())
  const total = porDia.reduce((s, d) => s + d.revisoes, 0)
  const rotulo = (d: DiaResumido) => { const [, m, dd] = d.dia.split('-'); return `${Number(dd)}/${Number(m)}` }
  const marcas = porDia.length <= 7 ? porDia.map((_, i) => i) : [0, Math.floor(porDia.length / 2), porDia.length - 1]
  return (
    <figure className="cfd-grafico">
      <figcaption>
        <strong>Respostas por dia</strong>
        <span className="cfd-legenda" aria-hidden="true"><i className="cfd-c--sabia" /> Sabia <i className="cfd-c--hesitei" /> Hesitei <i className="cfd-c--errei" /> Errei <i className="cfd-c--outras" /> Torneio e sem avaliação</span>
      </figcaption>
      {total ? (
        <div className="cfd-grafico__area">
          <span className="cfd-grafico__eixo" aria-hidden="true"><b>{topo}</b><b>0</b></span>
          <ol className="cfd-grafico__barras" aria-label={`Respostas por dia nos últimos ${porDia.length} dias`}>
            {porDia.map((d) => {
              const outras = Math.max(0, d.revisoes - d.sabia - d.hesitei - d.errei)
              const ds = new Date(d.dia + 'T12:00:00')
              const texto = `${DIAS_CURTOS[ds.getDay()]}, ${rotulo(d)}: ${d.revisoes} ${d.revisoes === 1 ? 'resposta' : 'respostas'}${d.revisoes ? ` (sabia ${d.sabia}, hesitei ${d.hesitei}, errei ${d.errei}, outras ${outras})` : ''}`
              return (
                <li key={d.dia} data-hoje={d.dia === hoje || undefined} title={texto} aria-label={texto} tabIndex={d.revisoes ? 0 : -1}>
                  <span className="cfd-pilha" style={{ height: `${(100 * d.revisoes) / topo}%` }}>
                    {outras > 0 && <i className="cfd-c--outras" style={{ flexGrow: outras }} />}
                    {d.errei > 0 && <i className="cfd-c--errei" style={{ flexGrow: d.errei }} />}
                    {d.hesitei > 0 && <i className="cfd-c--hesitei" style={{ flexGrow: d.hesitei }} />}
                    {d.sabia > 0 && <i className="cfd-c--sabia" style={{ flexGrow: d.sabia }} />}
                  </span>
                </li>
              )
            })}
          </ol>
          <span className="cfd-grafico__datas" aria-hidden="true">{marcas.map((i) => <b key={i} style={{ left: `${((i + 0.5) * 100) / porDia.length}%` }}>{porDia[i].dia === hoje ? 'hoje' : rotulo(porDia[i])}</b>)}</span>
        </div>
      ) : <p className="cf-nota cfd-grafico__vazio">Nenhuma resposta no período. Os dias de estudo aparecem aqui como barras.</p>}
    </figure>
  )
}

const rotuloAvaliacao = { errei: 'Errei', hesitei: 'Hesitei', sabia: 'Sabia' }

function Numero({ rotulo, valor, nota, destino, barra }: { rotulo: string; valor: number | string; nota: string; destino?: string; barra?: number }) {
  return (
    <div className="cf-numero">
      <span>{rotulo}</span>
      <b className="numerico">{typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}</b>
      {barra !== undefined && <i className="cfd-mini" aria-hidden="true"><em style={{ width: `${Math.min(100, Math.max(barra > 0 ? 2 : 0, barra * 100))}%` }} /></i>}
      <small>{nota}</small>
      {destino && <a href={href(destino)}>Revisar agora</a>}
    </div>
  )
}

function formatarData(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* -------------------------------------------------------------- Cronograma */

export function CronogramaFlashcards() {
  return <PaginaCronogramaFlashcards abas={<Abas atual="cronograma" />} />
}

/* ---------------------------------------------------------------- Opinião */

export function JanelaOpiniao({ origem, aoFechar }: { origem: OrigemOpiniao; aoFechar: () => void }) {
  const [categoria, definirCategoria] = useState<CategoriaOpiniao>('outro')
  const [facil, definirFacil] = useState<number | null>(null)
  const [visual, definirVisual] = useState<number | null>(null)
  const [som, definirSom] = useState<'sim' | 'nao' | 'nao_testei' | null>(null)
  const [problema, definirProblema] = useState('')
  const [melhorar, definirMelhorar] = useState('')
  const [estado, definirEstado] = useState<'editando' | 'enviando' | 'enviada'>('editando')
  const [erro, definirErro] = useState('')
  const vazio = !facil && !visual && !som && !problema.trim() && !melhorar.trim()
  const enviar = async () => {
    definirEstado('enviando'); definirErro('')
    try {
      await enviarOpiniao({ categoria, facil, visual, som, problema, melhorar, origem })
      definirEstado('enviada')
    } catch (falha) {
      definirErro(mensagemDeErro(falha)); definirEstado('editando')
    }
  }
  return (
    <JanelaCentral aberta rotulo="Enviar opinião sobre os flashcards" aoFechar={aoFechar} className="cf-opiniao">
      {estado === 'enviada' ? (
        <div className="cf-opiniao__feito" role="status">
          <Icone nome="certo" tamanho={28} />
          <h2>Opinião recebida. Obrigado!</h2>
          <p>Ela chegou ao painel do Tales e entra na próxima rodada de ajustes do beta.</p>
          <button type="button" className="botao botao--principal" onClick={aoFechar}>Fechar</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (!vazio) void enviar() }}>
          <header className="cf-opiniao__cabeca"><span className="cf-opiniao__icone"><Icone nome="correio" tamanho={24} /></span><div><p className="cf-opiniao__selo">Sua experiência importa</p><h2>O que podemos melhorar?</h2><p>Um minuto da sua opinião ajuda a construir os próximos flashcards.</p></div></header>

          <fieldset className="cf-campo">
            <legend>Sobre o quê?</legend>
            <div className="cf-chips" role="radiogroup">
              {CATEGORIAS_OPINIAO.map((c) => <button key={c.id} type="button" role="radio" aria-checked={categoria === c.id} onClick={() => definirCategoria(c.id)}>{c.nome}</button>)}
            </div>
          </fieldset>
          <div className="cf-opiniao__notas"><Nota rotulo="Foi fácil estudar?" valor={facil} aoMudar={definirFacil} /><Nota rotulo="E o visual?" valor={visual} aoMudar={definirVisual} /></div>
          <fieldset className="cf-campo">
            <legend>O som funcionou no seu celular?</legend>
            <div className="cf-chips" role="radiogroup">
              {([['sim', 'Sim'], ['nao', 'Não'], ['nao_testei', 'Não testei']] as const).map(([v, n]) => <button key={v} type="button" role="radio" aria-checked={som === v} onClick={() => definirSom(som === v ? null : v)}>{n}</button>)}
            </div>
          </fieldset>
          <label className="cf-campo"><span>Algo não funcionou?</span><textarea aria-label="Algo não funcionou?" rows={3} maxLength={1500} value={problema} onChange={(e) => definirProblema(e.target.value)} placeholder="Ex.: a tela cortou no celular deitado" /></label>
          <label className="cf-campo"><span>Qual seria sua próxima melhoria?</span><textarea aria-label="Qual seria sua próxima melhoria?" rows={3} maxLength={1500} value={melhorar} onChange={(e) => definirMelhorar(e.target.value)} /></label>
          {erro && <p className="cf-alerta" role="alert">{erro}</p>}
          <p className="cf-opiniao__privacidade">Conte apenas sobre a experiência, sem dados pessoais. Para corrigir conteúdo médico, use “Relatar erro” na questão.</p>
          <div className="cf-form__botoes">
            <button type="submit" className="botao botao--principal" disabled={vazio || estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviar opinião'}</button>
            <button type="button" className="botao botao--fantasma" onClick={aoFechar}>Cancelar</button>
          </div>
        </form>
      )}
    </JanelaCentral>
  )
}

function Nota({ rotulo, valor, aoMudar }: { rotulo: string; valor: number | null; aoMudar: (n: number | null) => void }) {
  return (
    <fieldset className="cf-campo">
      <legend>{rotulo}</legend>
      <div className="cf-chips cf-chips--nota" role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n} de 5`} onClick={() => aoMudar(valor === n ? null : n)}>{n}</button>)}
      </div>
      <small className="cf-nota">1 = ruim · 5 = ótimo</small>
    </fieldset>
  )
}
