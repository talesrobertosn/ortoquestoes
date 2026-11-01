import { useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { planoRevisao, type DiaRevisao, inicioDia, chaveDia, rotuloDia, JANELA_REVISAO_DIAS, distribuirRevisoes, revisoesFeitasHoje, SEM_RITMO } from '../estado/planoRevisao'
import { usarRitmoRevisao } from '../estado/preferencias'
import { usarSessao } from '../estado/sessao'
import { AREAS_TREINO, FILTROS_VAZIOS } from '../dados/tipos'
import { href, navegar } from '../util/rotas'
import { INTERVALOS, revisarHoje } from '../estado/revisao'
import { FUSO_DIA, diaDaSemana } from '../util/dia'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { Medalha } from '../componentes/Medalha'
import { REVISOES_CINCO_MINUTOS, REVISOES_DIA_SEQUENCIA, minutosPara, resumoRevisoes, sequenciaRevisao } from '../estado/metasRevisao'
import { usarFeitos } from '../conta/feitos'
import { usarConquistas } from '../estado/usarConquistas'
import { EMBLEMAS, desbloqueado, valorDe, type FamiliaId } from '../estado/conquistas'
import { usarArmazenado } from '../estado/usarArmazenado'
import { FLASHCARDS_LIBERADO, recurso } from '../config'
import { CHAVE_REGISTROS, type RegistroFlashcard } from '../flashcards/progresso'
import { CalendarioRevisao } from './RevisaoCalendario'
import { corDaArea } from '../dados/coresAreas'
import '../estilos/componentes/Cristal.css'
import '../estilos/componentes/Mundo.css'
import '../estilos/paginas/Revisao.css'

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const TETOS: Array<number | null> = [15, 20, 30, 50, null]
const FORMATO_HOJE = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSO_DIA })
/** Famílias de emblema que a página mostra como "próxima conquista de revisão". */
const FAMILIAS_REVISAO: Array<{ familia: FamiliaId; titulo: string }> = [
  { familia: 'constancia', titulo: 'Constância' },
  { familia: 'revisoes', titulo: 'Revisões feitas' },
  { familia: 'resgate', titulo: 'Resgate de atrasadas' },
  { familia: 'filaZerada', titulo: 'Fila zerada' },
]

/** "90d" fica ilegível — a partir de 2 meses o rótulo passa a ser em meses/anos. */
function rotuloIntervalo(dias: number): string {
  if (dias >= 330) return `${Math.round(dias / 365)} ano`
  if (dias >= 60) return `${Math.round(dias / 30)} meses`
  return `${dias}d`
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const questoes = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'questão' : 'questões'}`

/** Os degraus vêm de INTERVALOS, para a explicação nunca divergir da regra real. */
const ESCADAS: { rotulo: string; icone: NomeIcone; dias: number[]; nota: string; nivel: 1 | 2 | 3 }[] = [
  { rotulo: 'Chute', icone: 'interrogacao', dias: INTERVALOS.chute, nota: 'Volta cedo', nivel: 1 },
  { rotulo: 'Dúvida', icone: 'olho', dias: INTERVALOS.duvida, nota: 'Espaça mais', nivel: 2 },
  { rotulo: 'Certeza', icone: 'certo', dias: INTERVALOS.seguro, nota: 'Espaça bastante', nivel: 3 },
]

/** Anel de progresso do dia. */
function Anel({ feitas, total }: { feitas: number; total: number }) {
  const pct = total ? Math.min(1, feitas / total) : 0
  const r = 44, c = 2 * Math.PI * r
  return <svg className="rvx-anel" viewBox="0 0 100 100" role="img" aria-label={`${feitas} de ${total} revisões de hoje feitas`}>
    <circle cx="50" cy="50" r={r} className="rvx-anel__trilha" />
    <circle cx="50" cy="50" r={r} className="rvx-anel__feito" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 50 50)" />
    <text x="50" y="47" textAnchor="middle" className="rvx-anel__numero">{feitas}</text>
    <text x="50" y="64" textAnchor="middle" className="rvx-anel__rotulo">de {total}</text>
  </svg>
}

/** Flashcards de hoje: fila à parte, com opção de esconder (preferência do aparelho). */
function FlashcardsDeHoje() {
  const [registros] = usarArmazenado<Record<string, Partial<RegistroFlashcard>>>(CHAVE_REGISTROS, {})
  const [escondido, definirEscondido] = usarArmazenado<boolean>('revisao:esconder-flashcards', false)
  const hoje = useMemo(() => Object.values(registros ?? {}).filter((r) => revisarHoje(r)).length, [registros])
  if (!FLASHCARDS_LIBERADO) return null
  if (escondido) return <p className="rvx-fc-oculto"><button type="button" className="rvx-fc-oculto__botao" onClick={() => definirEscondido(false)}><Icone nome="raio" tamanho={14} /> Mostrar os flashcards de hoje</button></p>
  const destino = hoje ? '/flashcards/biblioteca?categoria=pendentes&n=' + Math.min(hoje, 50) : '/flashcards'
  return <section className="rvx-fc" aria-label="Flashcards de hoje">
    <span className="rvx-fc__icone"><Icone nome="raio" tamanho={22} /></span>
    <div className="rvx-fc__texto">
      <p className="rvx-fc__titulo">Flashcards de hoje <span className="selo-beta">Beta</span></p>
      <p>{hoje ? <><b className="numerico">{hoje}</b> {hoje === 1 ? 'flashcard vence' : 'flashcards vencem'} hoje · ~{minutosPara(Math.ceil(hoje / 2))} min. A fila deles é separada da das questões.</> : 'Nenhum flashcard vence hoje. A fila deles é separada da das questões.'}</p>
    </div>
    <div className="rvx-fc__acoes">
      <a className="botao" href={href(destino)}>{hoje ? 'Revisar flashcards' : 'Abrir Flashcards'}</a>
      <button type="button" className="botao-icone" onClick={() => definirEscondido(true)} aria-label="Esconder os flashcards desta página" title="Esconder"><Icone nome="fechar" tamanho={16} /></button>
    </div>
  </section>
}

export function Revisao() {
  const { indice, carregando } = usarIndice(); const { contexto } = usarContextoLocal(''); const { iniciarComAviso } = usarSessao()
  const { ritmo, definirRitmo } = usarRitmoRevisao()
  // Revisar só uma área (pedido do Tales, 16/10/2026): o filtro vale para a página inteira
  // (hoje, resgate e calendário) e fica guardado no aparelho. #/revisao?area=coluna abre direto.
  const [areaGuardada, definirArea] = usarArmazenado<string | null>('revisao:area', null)
  const [areaDaUrl] = useState(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('area'))
  const area = areaDaUrl ?? areaGuardada
  const slugDe = useMemo(() => indice ? new Map(indice.questoes.map((q) => [q.id, indice.temas[q.t]?.slug ?? ''])) : null, [indice])
  const registros = useMemo(() => {
    if (!area || !slugDe) return contexto.respondidas
    return Object.fromEntries(Object.entries(contexto.respondidas).filter(([id]) => slugDe.get(id) === area))
  }, [contexto.respondidas, area, slugDe])
  // Quantas vencem hoje em cada área (sem teto), para os botões do filtro.
  const porArea = useMemo(() => {
    const m = new Map<string, number>()
    if (!slugDe) return m
    for (const { id } of distribuirRevisoes(contexto.respondidas, SEM_RITMO, 1).get(inicioDia()) ?? []) { const s = slugDe.get(id); if (s) m.set(s, (m.get(s) ?? 0) + 1) }
    return m
  }, [contexto.respondidas, slugDe])
  const feitos = usarFeitos()
  const { metricas } = usarConquistas()
  const chaveRitmo = `${ritmo.limite}:${ritmo.folgas.join(',')}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plano = useMemo(() => indice ? planoRevisao(indice, registros, JANELA_REVISAO_DIAS, ritmo) : new Map<string, DiaRevisao>(), [indice, registros, chaveRitmo])
  const vencidasHoje = useMemo(() => distribuirRevisoes(registros, SEM_RITMO, 1).get(inicioDia())?.length ?? 0, [registros])
  const feitasHoje = useMemo(() => revisoesFeitasHoje(registros), [registros])
  const resumo = useMemo(() => resumoRevisoes(contexto.respondidas), [contexto.respondidas])
  const diasZerados = feitos?.dias?.fila_zerada
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Fila de hoje zerada depois de revisar: o dia conta na hora, antes de o servidor registrar.
  const zeradaAgora = (contexto.revisaoHoje?.size ?? 0) === 0 && revisoesFeitasHoje(contexto.respondidas) > 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sequencia = useMemo(() => sequenciaRevisao(resumo.porDia, { diasZerados: [...(diasZerados ?? []), ...(zeradaAgora ? [chaveDia(inicioDia())] : [])], folgas: ritmo.folgas }), [resumo, diasZerados, chaveRitmo, zeradaAgora])
  const hoje = inicioDia(); const chaveHoje = chaveDia(hoje)
  const pendentes = [...plano.values()].reduce((n, d) => n + d.ids.length, 0)
  const incertas = Object.values(registros).filter(r => r.confianca === 'duvida' || r.confianca === 'chute').length
  const iniciarIds = async (ids: string[]) => { if (!indice || !ids.length) return; if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, areas: AREAS_TREINO, limite: ids.length, embaralhar: true, situacao: 'revisarHoje' }, ids))) return; navegar('/sessao') }
  if (carregando || !indice) return <div className="estado"><p>Preparando sua revisão…</p></div>

  const temaFragil = [...plano.values()].flatMap(d => [...d.temas.entries()]).sort((a, b) => b[1] - a[1])[0]
  const idsHoje = plano.get(chaveHoje)?.ids ?? []
  const hojeTotal = idsHoje.length
  const atrasadasHoje = plano.get(chaveHoje)?.atrasadas ?? 0
  const excedente = Math.max(0, vencidasHoje - hojeTotal)
  const folgaHoje = ritmo.folgas.includes(diaDaSemana(hoje))
  const diasFuturos = [...plano.values()].filter(d => d.inicio > hoje && d.ids.length).sort((a, b) => a.inicio - b.inicio)
  const proximoDia = diasFuturos[0]
  // Plano de resgate: até que dia o excedente de vencidas foi diluído pelo teto do ritmo.
  const resgatados = diasFuturos.filter(d => d.redistribuidas > 0)
  const ultimoResgate = resgatados[resgatados.length - 1]
  const zerado = !hojeTotal && feitasHoje > 0 && !folgaHoje
  const totalDia = feitasHoje + hojeTotal
  const curta = Math.min(REVISOES_CINCO_MINUTOS, hojeTotal)
  const alternarFolga = (d: number) => definirRitmo({ ...ritmo, folgas: ritmo.folgas.includes(d) ? ritmo.folgas.filter(x => x !== d) : [...ritmo.folgas, d].sort() })

  // Próxima conquista de cada família de revisão.
  const conquistasRevisao = FAMILIAS_REVISAO.map(({ familia, titulo }) => {
    const lista = EMBLEMAS.filter(e => e.familia === familia)
    const proxima = lista.find(e => !desbloqueado(e, metricas))
    const feitas = lista.filter(e => desbloqueado(e, metricas)).length
    const ganhas = lista.filter(e => desbloqueado(e, metricas))
    return { familia, titulo, proxima, feitas, total: lista.length, ultima: ganhas[ganhas.length - 1] }
  })

  const textoApoio = hojeTotal
    ? excedente
      ? `Você tinha ${questoes(vencidasHoje)} vencidas. Para não virar um muro, hoje ficam ${hojeTotal} e o resto foi diluído nos próximos dias, começando pelas que você errou.`
      : atrasadasHoje ? `${atrasadasHoje} ${atrasadasHoje === 1 ? 'veio' : 'vieram'} de dias anteriores. Uma sessão curta já resolve boa parte.` : 'Revisar no dia certo é o que fixa. Uma sessão curta mantém tudo em dia.'
    : folgaHoje
      ? 'Hoje é folga no seu ritmo. O que venceria hoje passou para o próximo dia de estudo.'
      : zerado
        ? `Você fez ${feitasHoje} ${feitasHoje === 1 ? 'revisão' : 'revisões'} hoje e não sobrou nenhuma. ${proximoDia ? 'Se quiser, dá para adiantar um pouco de amanhã.' : ''}`
        : pendentes ? 'Nada vence hoje. Aproveite para avançar em questões novas.' : 'Responda questões e o seu calendário de revisão se monta sozinho.'

  const nomeArea = area ? indice.temas.find((t) => t.slug === area)?.nome : undefined
  const areasFiltro = indice.temas.filter((t) => porArea.get(t.slug) || t.slug === area)
  const escolherArea = (slug: string | null) => {
    definirArea(slug)
    if (areaDaUrl) navegar(slug ? `/revisao?area=${slug}` : '/revisao')
  }

  return <div className="empilha-2 revisao-premium rvx">
    {(areasFiltro.length > 1 || area) && <nav className="rvx-areas" aria-label="Revisar só uma área">
      <span className="rvx-areas__rotulo">Revisar</span>
      <div className="rvx-areas__lista">
        <button type="button" className="rvx-area" aria-pressed={!area} onClick={() => escolherArea(null)}>Todas<small className="numerico">{[...porArea.values()].reduce((a, b) => a + b, 0)}</small></button>
        {areasFiltro.map((t) => <button key={t.slug} type="button" className="rvx-area" aria-pressed={area === t.slug} onClick={() => escolherArea(area === t.slug ? null : t.slug)} style={{ ['--cor-area' as string]: corDaArea(t.slug) }}>
          <i aria-hidden="true" />{t.nome}{porArea.get(t.slug) ? <small className="numerico">{porArea.get(t.slug)}</small> : null}
        </button>)}
      </div>
    </nav>}
    <section className={'rvx-heroi painel-mundo' + (zerado ? ' rvx-heroi--zerado' : '')}>
      <div className="rvx-heroi__principal">
        <p className="rvx-heroi__data"><Icone nome="calendario" tamanho={15} /> {capitalizar(FORMATO_HOJE.format(hoje))}</p>
        {hojeTotal ? <>
          <h1 className="rvx-heroi__titulo"><span className="numerico">{hojeTotal}</span> {nomeArea ? `de ${nomeArea.toLowerCase()} ` : ''}para hoje <span className="rvx-heroi__tempo">· ~{minutosPara(hojeTotal)} min</span></h1>
          <p className="rvx-heroi__texto">{textoApoio}</p>
          <div className="rvx-heroi__acoes">
            <button type="button" className="botao cristal rvx-comecar" onClick={() => iniciarIds(idsHoje)}>
              <Icone nome="raio" tamanho={20} />
              <span><strong>Começar revisão</strong><small>{questoes(hojeTotal)} · ~{minutosPara(hojeTotal)} min</small></span>
            </button>
            {hojeTotal > curta && <button type="button" className="botao rvx-curta" onClick={() => iniciarIds(idsHoje.slice(0, curta))}>
              <Icone nome="relogio" tamanho={16} /> Só 5 minutos <small>({curta})</small>
            </button>}
          </div>
        </> : zerado ? <>
          <div className="rvx-recompensa">
            <img className="rvx-recompensa__arte" src={recurso('emblemas/fila-7.png')} alt="" width={88} height={88} draggable={false} />
            <div>
              <h1 className="rvx-heroi__titulo">Revisão de hoje zerada</h1>
              <p className="rvx-heroi__texto">{textoApoio}</p>
            </div>
          </div>
          <div className="rvx-heroi__acoes">
            {proximoDia && <button type="button" className="botao rvx-curta" onClick={() => iniciarIds(proximoDia.ids.slice(0, REVISOES_CINCO_MINUTOS))}>
              <Icone nome="direita" tamanho={16} /> Adiantar {Math.min(REVISOES_CINCO_MINUTOS, proximoDia.ids.length)} de {rotuloDia(proximoDia.inicio)}
            </button>}
            <a className="botao rvx-curta" href={href('/treinar')}>Treinar questões novas</a>
          </div>
        </> : <>
          <h1 className="rvx-heroi__titulo">{folgaHoje ? 'Hoje é dia de folga' : nomeArea ? `${nomeArea}: tudo em dia` : 'Tudo em dia por aqui'}</h1>
          <p className="rvx-heroi__texto">{textoApoio}</p>
          <div className="rvx-heroi__acoes">
            <a className="botao cristal rvx-comecar" href={href('/treinar')}><Icone nome="alvo" tamanho={20} /><span><strong>Treinar questões novas</strong><small>As que você errar voltam aqui no dia certo</small></span></a>
            {proximoDia && <button type="button" className="botao rvx-curta" onClick={() => iniciarIds(proximoDia.ids.slice(0, REVISOES_CINCO_MINUTOS))}>Adiantar {Math.min(REVISOES_CINCO_MINUTOS, proximoDia.ids.length)} de {rotuloDia(proximoDia.inicio)}</button>}
          </div>
        </>}
      </div>
      <div className="rvx-heroi__lado">
        {totalDia > 0 && <Anel feitas={feitasHoje} total={totalDia} />}
        <div className={'rvx-chama' + (sequencia.atual ? '' : ' rvx-chama--apagada')} title={`O dia conta com ${REVISOES_DIA_SEQUENCIA} revisões ou com a fila zerada. Folgas do ritmo não quebram.`}>
          <Icone nome="fogo" tamanho={20} />
          <span><b className="numerico">{sequencia.atual}</b> {sequencia.atual === 1 ? 'dia' : 'dias'} revisando{sequencia.atual && !sequencia.hojeConta && !folgaHoje ? <small>Revise hoje para não perder</small> : sequencia.hojeConta ? <small>Hoje já conta</small> : <small>Comece a sua sequência hoje</small>}</span>
        </div>
      </div>
    </section>

    {(excedente > 0 || (ritmo.limite === null && vencidasHoje > 30)) && <section className="cartao cartao__corpo rvx-resgate">
      <div className="rvx-resgate__cabeca">
        <span className="rvx-resgate__icone"><Icone nome="rota" tamanho={20} /></span>
        <div>
          <p className="meta">PLANO DE RESGATE</p>
          <h2>{excedente > 0 ? <>{questoes(excedente)} atrasadas, diluídas até {ultimoResgate ? rotuloDia(ultimoResgate.inicio) : 'os próximos dias'}</> : <>{questoes(vencidasHoje)} vencidas de uma vez</>}</h2>
          <p className="texto-2">{excedente > 0
            ? `Com até ${ritmo.limite} por dia, ninguém encara um muro. As que você errou vêm primeiro, e cada atrasada que você revisa conta para o emblema Resgate.`
            : 'Sem teto diário, todas ficam para hoje. Escolha um teto e o resto se distribui pelos próximos dias.'}</p>
        </div>
      </div>
      <div className="tr-pilulas" role="group" aria-label="Revisões por dia">{TETOS.map(limite => <button key={String(limite)} type="button" className="tr-pilula" aria-pressed={ritmo.limite === limite} onClick={() => definirRitmo({ ...ritmo, limite })}>{limite === null ? 'Sem teto' : `até ${limite}/dia`}</button>)}</div>
    </section>}

    <FlashcardsDeHoje />

    <CalendarioRevisao indice={indice} registros={registros} plano={plano} folgas={ritmo.folgas} hoje={hoje} rotuloArea={nomeArea?.toLowerCase()} aoRevisar={iniciarIds} />

    <section className="cartao cartao__corpo rvx-conquistas" aria-label="Conquistas de revisão">
      <div className="entre">
        <div><p className="meta">CONQUISTAS DE REVISÃO</p><h2>Cada revisão conta</h2></div>
        <a className="rv-regra__link rvx-conquistas__todas" href={href('/conquistas')}>Ver todas <Icone nome="direita" tamanho={16} /></a>
      </div>
      <ul className="rvx-conquistas__lista">
        {conquistasRevisao.map(({ familia, titulo, proxima, feitas, total, ultima }) => {
          const alvo = proxima ?? ultima
          if (!alvo) return null
          const valor = Math.min(valorDe(alvo, metricas), alvo.minimo)
          return <li key={familia} className={proxima ? '' : 'rvx-conquista--completa'}>
            <span className={"rvx-conquista__arte" + (proxima ? " rvx-conquista__arte--alvo" : "")}><Medalha conquista={alvo} tamanho={52} /></span>
            <div>
              <small>{titulo} · {feitas}/{total}</small>
              <strong>{alvo.rotulo}</strong>
              <span className="rvx-conquista__desc">{alvo.descricao}</span>
              {proxima ? <span className="rvx-progresso" aria-label={`${valor} de ${alvo.minimo}`}><span style={{ width: `${Math.max(2, (valor / alvo.minimo) * 100)}%` }} /><em className="numerico">{valor.toLocaleString('pt-BR')}/{alvo.minimo.toLocaleString('pt-BR')}</em></span> : <span className="rvx-conquista__ok">Família completa</span>}
            </div>
          </li>
        })}
      </ul>
      <p className="texto-2 rvx-conquistas__nota">Seus números: <b className="numerico">{resumo.total.toLocaleString('pt-BR')}</b> revisões feitas, <b className="numerico">{resumo.resgatadas.toLocaleString('pt-BR')}</b> atrasadas resgatadas, maior sequência de <b className="numerico">{sequencia.maior}</b> {sequencia.maior === 1 ? 'dia' : 'dias'}.{temaFragil ? ` Tema com mais revisões pela frente: ${temaFragil[0]}.` : ''}</p>
    </section>

    <details className="cartao cartao__corpo rv-ritmo rv-recolhivel">
      <summary className="rv-ritmo__cabeca">
        <span><h2>Seu ritmo</h2>
        <p>{ritmo.limite === null ? 'Sem teto diário' : `Até ${ritmo.limite} por dia`} · {ritmo.folgas.length ? `folga ${ritmo.folgas.map(i => DIAS_SEMANA[i]).join(', ')}` : 'sem dias de folga'}</p></span>
        <Icone nome="baixo" tamanho={18} />
      </summary>
      <p className="rv-ritmo__nota">Quando vencem mais revisões do que cabem no dia, o excedente passa para os próximos dias, começando pelas que você errou. Nenhuma se perde.</p>
      <div className="rv-ritmo__grupo">
        <span className="tr-grupo__rotulo">Revisões por dia</span>
        <div className="tr-pilulas">{TETOS.map(limite => <button key={String(limite)} type="button" className="tr-pilula" aria-pressed={ritmo.limite === limite} onClick={() => definirRitmo({ ...ritmo, limite })}>{limite === null ? 'Sem teto' : `até ${limite}`}</button>)}</div>
      </div>
      <div className="rv-ritmo__grupo">
        <span className="tr-grupo__rotulo">Dias sem revisão</span>
        <div className="tr-pilulas">{DIAS_SEMANA.map((d, i) => <button key={d} type="button" className="tr-pilula" aria-pressed={ritmo.folgas.includes(i)} onClick={() => alternarFolga(i)}>{d}</button>)}</div>
        <p className="rv-ritmo__nota">Bom para os dias de plantão. O que venceria neles passa para o dia seguinte, e a sua sequência de revisão não quebra.</p>
      </div>
    </details>
    <details className="cartao cartao__corpo rv-regra rv-recolhivel">
      <summary className="rv-regra__cabeca">
        <span><h2>Quando cada questão volta</h2>
        <p>Depende de como você respondeu. Acertou também na última revisão? Ela sai da fila.</p></span>
        <Icone nome="baixo" tamanho={18} />
      </summary>
      <div className="rv-escadas">{ESCADAS.map(e => <div key={e.rotulo} className={`rv-escada rv-escada--${e.nivel}`}>
        <div className="rv-escada__topo">
          <span className="rv-escada__icone"><Icone nome={e.icone} tamanho={16} /></span>
          <strong>{e.rotulo}</strong>
          <small>{e.nota}</small>
        </div>
        <ol className="rv-escada__trilha" aria-label={`Volta em ${e.dias.join(', ')} dias`}>{e.dias.map(d => <li key={d}><span aria-hidden="true" /><em>{rotuloIntervalo(d)}</em></li>)}</ol>
      </div>)}</div>
      <p className="rv-regra__erro"><Icone nome="reiniciar" tamanho={16} /> <span><strong>Errou?</strong> Ela volta hoje e o ciclo recomeça.</span></p>
      {incertas > 0 && <a className="rv-regra__link" href="#/treinar?situacao=incertas">Refazer as {incertas} que respondi com dúvida ou chute <Icone nome="direita" tamanho={16} /></a>}
      <a className="rv-regra__link" href="#/erros">Abrir meu caderno de erros <Icone nome="direita" tamanho={16} /></a>
    </details>
  </div>
}
