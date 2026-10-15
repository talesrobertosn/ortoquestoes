import { useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { planoRevisao, type DiaRevisao, inicioDia, chaveDia, rotuloDia, JANELA_REVISAO_DIAS, distribuirRevisoes, revisoesFeitasHoje, SEM_RITMO } from '../estado/planoRevisao'
import { usarRitmoRevisao } from '../estado/preferencias'
import { usarSessao } from '../estado/sessao'
import { AREAS_TREINO, FILTROS_VAZIOS } from '../dados/tipos'
import { href, navegar } from '../util/rotas'
import { INTERVALOS, revisarHoje } from '../estado/revisao'
import { FUSO_DIA, diaDaSemana, inicioDaChave, somarDias } from '../util/dia'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { Medalha } from '../componentes/Medalha'
import { REVISOES_CINCO_MINUTOS, REVISOES_DIA_SEQUENCIA, minutosPara, resumoRevisoes, sequenciaRevisao } from '../estado/metasRevisao'
import { usarFeitos } from '../conta/feitos'
import { usarConquistas } from '../estado/usarConquistas'
import { EMBLEMAS, desbloqueado, valorDe, type FamiliaId } from '../estado/conquistas'
import { usarArmazenado } from '../estado/usarArmazenado'
import { FLASHCARDS_LIBERADO, recurso } from '../config'
import { CHAVE_REGISTROS, type RegistroFlashcard } from '../flashcards/progresso'
import '../estilos/paginas/Revisao.css'

const DIA = 86400000
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const TETOS: Array<number | null> = [15, 20, 30, 50, null]
const FORMATO_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: FUSO_DIA })
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

// O calendário anda pelos dias de São Paulo (src/util/dia.ts), como o resto da revisão.
const anoMes = (data: number) => chaveDia(data).slice(0, 7)
function inicioMes(data: number): number { return inicioDaChave(`${anoMes(data)}-01`) }
/** O mês `delta` meses depois do mês de `data`, como chave "AAAA-MM". */
function somarMeses(data: number, delta: number): string {
  const [ano, mes] = anoMes(data).split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1 + delta, 1)).toISOString().slice(0, 7)
}

/** Intensidade do mapa de calor (0 a 4). */
function nivelCarga(n: number): number {
  if (n <= 0) return 0
  if (n <= 5) return 1
  if (n <= 15) return 2
  if (n <= 30) return 3
  return 4
}

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
  const [selecionado, definirSelecionado] = useState(inicioDia())
  const [mesExibido, definirMesExibido] = useState(() => inicioMes(inicioDia()))
  const { ritmo, definirRitmo } = usarRitmoRevisao()
  const feitos = usarFeitos()
  const { metricas } = usarConquistas()
  const chaveRitmo = `${ritmo.limite}:${ritmo.folgas.join(',')}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plano = useMemo(() => indice ? planoRevisao(indice, contexto.respondidas, JANELA_REVISAO_DIAS, ritmo) : new Map<string, DiaRevisao>(), [indice, contexto.respondidas, chaveRitmo])
  const vencidasHoje = useMemo(() => distribuirRevisoes(contexto.respondidas, SEM_RITMO, 1).get(inicioDia())?.length ?? 0, [contexto.respondidas])
  const feitasHoje = useMemo(() => revisoesFeitasHoje(contexto.respondidas), [contexto.respondidas])
  const resumo = useMemo(() => resumoRevisoes(contexto.respondidas), [contexto.respondidas])
  const diasZerados = feitos?.dias?.fila_zerada
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Fila de hoje zerada depois de revisar: o dia conta na hora, antes de o servidor registrar.
  const zeradaAgora = (contexto.revisaoHoje?.size ?? 0) === 0 && feitasHoje > 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sequencia = useMemo(() => sequenciaRevisao(resumo.porDia, { diasZerados: [...(diasZerados ?? []), ...(zeradaAgora ? [chaveDia(inicioDia())] : [])], folgas: ritmo.folgas }), [resumo, diasZerados, chaveRitmo, zeradaAgora])
  const hoje = inicioDia(); const chaveHoje = chaveDia(hoje); const dia = plano.get(chaveDia(selecionado))
  const mesMinimo = useMemo(() => inicioMes(hoje - 90 * DIA), [hoje])
  const mesLimite = useMemo(() => inicioMes(hoje + JANELA_REVISAO_DIAS * DIA), [hoje])
  const celulasMes = useMemo(() => {
    const chaveMes = anoMes(mesExibido); const [ano, mes] = chaveMes.split('-').map(Number)
    const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
    const celulas: (number | null)[] = Array.from({ length: diaDaSemana(`${chaveMes}-01`) }, () => null)
    for (let d = 1; d <= diasNoMes; d++) celulas.push(inicioDaChave(`${chaveMes}-${String(d).padStart(2, '0')}`))
    return celulas
  }, [mesExibido])
  const irParaMes = (delta: number) => definirMesExibido((atual) => inicioDaChave(`${somarMeses(atual, delta)}-01`))
  const pendentes = [...plano.values()].reduce((n, d) => n + d.ids.length, 0)
  const incertas = Object.values(contexto.respondidas).filter(r => r.confianca === 'duvida' || r.confianca === 'chute').length
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

  // Próximos 7 dias (previsão da semana).
  const semana = Array.from({ length: 7 }, (_, i) => {
    const k = somarDias(chaveHoje, i); const inicio = inicioDaChave(k)
    return { k, inicio, carga: plano.get(k)?.ids.length ?? 0, folga: ritmo.folgas.includes(diaDaSemana(k)), feitas: i === 0 ? feitasHoje : 0 }
  })
  const maiorSemana = Math.max(1, ...semana.map(d => d.carga + d.feitas))

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

  return <div className="empilha-2 revisao-premium rvx">
    <section className={'rvx-heroi' + (zerado ? ' rvx-heroi--zerado' : '')}>
      <div className="rvx-heroi__principal">
        <p className="rvx-heroi__data"><Icone nome="calendario" tamanho={15} /> {capitalizar(FORMATO_HOJE.format(hoje))}</p>
        {hojeTotal ? <>
          <h1 className="rvx-heroi__titulo"><span className="numerico">{hojeTotal}</span> para hoje <span className="rvx-heroi__tempo">· ~{minutosPara(hojeTotal)} min</span></h1>
          <p className="rvx-heroi__texto">{textoApoio}</p>
          <div className="rvx-heroi__acoes">
            <button type="button" className="botao rvx-comecar" onClick={() => iniciarIds(idsHoje)}>
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
          <h1 className="rvx-heroi__titulo">{folgaHoje ? 'Hoje é dia de folga' : 'Tudo em dia por aqui'}</h1>
          <p className="rvx-heroi__texto">{textoApoio}</p>
          <div className="rvx-heroi__acoes">
            <a className="botao rvx-comecar" href={href('/treinar')}><Icone nome="alvo" tamanho={20} /><span><strong>Treinar questões novas</strong><small>As que você errar voltam aqui no dia certo</small></span></a>
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

    <section className="cartao cartao__corpo rvx-semana" aria-label="Próximos 7 dias">
      <div className="entre">
        <div><p className="meta">PRÓXIMOS 7 DIAS</p><h2>Sua semana de revisão</h2></div>
        <p className="texto-2 rvx-semana__total"><b className="numerico">{semana.reduce((n, d) => n + d.carga, 0)}</b> na semana</p>
      </div>
      <ol className="rvx-barras">
        {semana.map((d, i) => <li key={d.k}>
          <button type="button" className={'rvx-barra' + (i === 0 ? ' rvx-barra--hoje' : '') + (selecionado === d.inicio ? ' rvx-barra--selecionada' : '') + (d.folga ? ' rvx-barra--folga' : '')} onClick={() => { definirSelecionado(d.inicio); definirMesExibido(inicioMes(d.inicio)) }} aria-label={`${rotuloDia(d.inicio)}: ${d.folga ? 'folga' : questoes(d.carga)}`}>
            <span className="rvx-barra__valor numerico">{d.folga ? '—' : d.carga + d.feitas}</span>
            <span className="rvx-barra__coluna">
              {d.feitas > 0 && <span className="rvx-barra__feito" style={{ height: `${(d.feitas / maiorSemana) * 100}%` }} />}
              <span className={`rvx-barra__carga rvx-nivel-${nivelCarga(d.carga)}`} style={{ height: `${(d.carga / maiorSemana) * 100}%` }} />
            </span>
            <span className="rvx-barra__dia">{i === 0 ? 'hoje' : DIAS_SEMANA[diaDaSemana(d.k)]}</span>
          </button>
        </li>)}
      </ol>
    </section>

    <section className="cartao cartao__corpo rvx-calendario">
      <div className="entre">
        <div><p className="meta">CALENDÁRIO</p><h2>{capitalizar(FORMATO_MES.format(mesExibido))}</h2></div>
        <div className="calendario__nav">
          <button type="button" className="botao-icone" onClick={() => irParaMes(-1)} disabled={mesExibido <= mesMinimo} aria-label="Mês anterior"><Icone nome="esquerda" /></button>
          <button type="button" className="botao-icone" onClick={() => irParaMes(1)} disabled={mesExibido >= mesLimite} aria-label="Próximo mês"><Icone nome="direita" /></button>
        </div>
      </div>
      <div className="rvx-legenda" aria-hidden="true">
        <span><i className="rvx-legenda__feito" /> revisões feitas</span>
        <span>previstas <i className="rvx-nivel-1" /><i className="rvx-nivel-2" /><i className="rvx-nivel-3" /><i className="rvx-nivel-4" /> mais</span>
      </div>
      <div className="calendario__cabecalho">{DIAS_SEMANA.map(d => <span key={d}>{d}</span>)}</div>
      <div className="calendario rvx-mes" role="grid" aria-label="Calendário de revisões">
        {celulasMes.map((data, i) => {
          if (data === null) return <span key={`vazio-${i}`} className="calendario__vazio" aria-hidden="true" />
          const k = chaveDia(data)
          const passado = data < hoje
          const carga = plano.get(k)?.ids.length ?? 0
          const feitas = resumo.porDia.get(k) ?? 0
          const folga = ritmo.folgas.includes(diaDaSemana(k))
          const classe = passado ? (feitas ? 'rvx-dia--feito' : 'rvx-dia--vazio') : `rvx-nivel-${nivelCarga(carga)}`
          const rotulo = passado ? `${rotuloDia(data)}: ${feitas ? `${feitas} revisões feitas` : 'sem revisões'}` : `${rotuloDia(data)}: ${folga && !carga ? 'folga' : questoes(carga)}`
          return <button key={data} type="button" aria-label={rotulo} title={rotulo}
            className={`calendario__dia rvx-dia ${classe}${data === hoje ? ' rvx-dia--hoje' : ''}${selecionado === data ? ' calendario__dia--selecionado' : ''}`}
            disabled={passado} onClick={() => definirSelecionado(data)}>
            <strong>{Number(k.slice(8))}</strong>
            <small>{passado ? (feitas ? <><Icone nome="certo" tamanho={11} />{feitas}</> : '') : folga && !carga ? 'folga' : carga || ''}</small>
          </button>
        })}
      </div>
      <div className="revisao-detalhe rvx-detalhe">
        <p className="meta">{capitalizar(rotuloDia(selecionado))}{selecionado === hoje ? ' · hoje' : ''}</p>
        <h3>{dia?.ids.length ? `${questoes(dia.ids.length)} · ~${minutosPara(dia.ids.length)} min` : 'Nenhuma revisão programada'}</h3>
        {dia?.ids.length ? <>
          <p className="texto-2">{dia.inicio === hoje && dia.atrasadas ? `${dia.atrasadas} vencidas foram trazidas para hoje. ` : dia.inicio > hoje && dia.redistribuidas ? `${dia.redistribuidas} vieram de dias anteriores pelo seu ritmo. ` : ''}Acerto histórico nelas: {dia.tentativas ? Math.round(dia.acertos / dia.tentativas * 100) : 0}%.</p>
          <div className="chips">{[...dia.temas.entries()].sort((a, b) => b[1] - a[1]).map(([tema, n]) => <span key={tema}>{tema} · {n}</span>)}</div>
          <div className="linha linha--empilha-celular">
            <button className="botao botao--principal" onClick={() => iniciarIds(dia.ids)}>{dia.inicio === hoje ? 'Revisar as de hoje' : 'Adiantar este dia'}</button>
            {dia.ids.length > REVISOES_CINCO_MINUTOS && <button className="botao" onClick={() => iniciarIds(dia.ids.slice(0, REVISOES_CINCO_MINUTOS))}>Só 5 minutos ({REVISOES_CINCO_MINUTOS})</button>}
          </div>
        </> : <p className="texto-2">Escolha outro dia no calendário ou avance com novas questões.</p>}
      </div>
    </section>

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
