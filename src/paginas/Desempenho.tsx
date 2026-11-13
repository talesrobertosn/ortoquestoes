import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AtalhoFlashcards } from '../componentes/AtalhoFlashcards'
import { BackupProgresso } from '../componentes/BackupProgresso'
import { DetalhesDiaSemana, DetalhesNumeros, DetalhesProvas, usarDetalhes } from '../componentes/DesempenhoDetalhado'
import { Medidor } from '../componentes/GraficosDesempenho'
import { Icone } from '../componentes/Icone'
import { Medalha } from '../componentes/Medalha'
import { GatoPixel } from '../componentes/mascote/GatoPixel'
import { fraseGratis, recurso } from '../config'
import { usarConta } from '../conta/ContextoConta'
import { usarIndice } from '../dados/usarIndice'
import { type Periodo, usarPeriodo } from '../estado/aparencia'
import { armazenamentoDisponivel, tamanhoArmazenado } from '../estado/armazenamento'
import { conquistaAtual, proximaConquista } from '../estado/conquistas'
import type { RegistroQuestao } from '../estado/revisao'
import { type ResumoHistorico, usarFavoritos } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { hojeBR, inicioDaChave, somarDias } from '../util/dia'
import { href } from '../util/rotas'
import { carregarIndiceBiblioteca, carregarIndiceBibliotecaLeve } from '../biblioteca/conteudo'
import { usarPremium } from '../conta/premium'
import { carregarTurmaAcervo } from '../dados/turma'
import { FILTROS_VAZIOS } from '../dados/tipos'
import { usarSessao } from '../estado/sessao'
import { navegar } from '../util/rotas'
import {
  calendario, compararTurma, contarRetencao, errosComCerteza, errosPendentes, eventosDe, indicarResumos, linhasAssuntos, notaEstimada,
  type CapituloResumo, type ComparacaoTurma, type EstadoRetencao, type ResumoIndicado,
} from '../dados/desempenho'
import { NotaEstimadaCartao } from '../componentes/desempenho/NotaEstimada'
import { Evolucao } from '../componentes/desempenho/Evolucao'
import { Assuntos } from '../componentes/desempenho/Assuntos'
import { ErrosComCerteza, ResumosIndicados, Retencao } from '../componentes/desempenho/Retencao'
import { Calendario } from '../componentes/desempenho/Calendario'
import { ResultadoCronograma } from '../componentes/desempenho/ResultadoCronograma'
import '../estilos/paginas/Desempenho.css'
import '../estilos/paginas/DesempenhoAbas.css'

/*
 * Seu desempenho (rota /dados). Refeita em 18/10/2026 na identidade do Treinar e, em 31/10/2026, no observatório da
 * vila (cena HD-2D de scripts/gerar_cena_observatorio.py): o título sobre a parte calma da pintura, o placar numa
 * bancada logo abaixo da arte (a luneta nunca fica coberta) e três capítulos, onde você está, como evoluiu e o que
 * fazer agora. Os cálculos são os mesmos de antes; a arte é só ambiente (aria-hidden) e todo número é texto.
 */

/* A cena: 480 x 160 pixels de arte; no celular, o recorte de x 184 até a borda (observatorio-*-movel.webp). */
const ARTE = { w: 480, h: 160, movelX: 184 }
const lugar = (x: number, y: number, w: number, h: number) => ({
  '--l': `${(x / ARTE.w) * 100}%`, '--lm': `${((x - ARTE.movelX) / (ARTE.w - ARTE.movelX)) * 100}%`,
  '--t': `${(y / ARTE.h) * 100}%`, '--w': `${(w / ARTE.w) * 100}%`, '--wm': `${(w / (ARTE.w - ARTE.movelX)) * 100}%`, '--h': `${(h / ARTE.h) * 100}%`,
}) as CSSProperties
/** Poeira no feixe da fenda: poucos pontos, cada um no seu ritmo. */
const POEIRA = [[300, 74, 7, 0], [318, 92, 9, -3], [334, 70, 8, -5], [346, 104, 10, -2], [312, 116, 9, -6], [358, 84, 11, -4], [326, 128, 8, -1], [292, 96, 10, -7]]

function CenaObservatorio({ periodo }: { periodo: Periodo }) {
  const palco = useRef<HTMLDivElement>(null)
  const [visivel, definirVisivel] = useState(true)
  // Fora da tela, a chama e a poeira param (nada de animação gastando bateria lá embaixo na página).
  useEffect(() => {
    const el = palco.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => definirVisivel(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const arte = (sufixo: string) => recurso(`pixel/paginas/observatorio-${periodo}${sufixo}.webp`)
  return (
    <div ref={palco} className={`ds-palco ds-palco--${periodo}${visivel ? '' : ' ds-palco--parado'}`} aria-hidden="true">
      {/* Só a variante da hora e do tamanho certos é baixada: o <source> do celular é o recorte próprio da sala. */}
      <picture>
        <source media="(max-width: 40rem)" srcSet={arte('-movel')} width={888} height={480} />
        <img className="ds-palco__arte" src={arte('')} srcSet={`${arte('-960')} 960w, ${arte('')} 1440w`} sizes="(max-width: 76rem) 100vw, 76rem"
          width={1440} height={480} alt="" decoding="async" fetchPriority="high" draggable={false} />
      </picture>
      {periodo !== 'manha' && <span className="ds-palco__peca ds-palco__chama" style={lugar(425, 64, 62, 62)} />}
      <span className="ds-palco__peca ds-palco__chama ds-palco__chama--vela" style={lugar(244, 66, 31, 31)} />
      <span className="ds-palco__peca ds-palco__poeira" style={lugar(280, 60, 100, 80)}>
        {POEIRA.map(([x, y, t, d], i) => <i key={i} style={{ left: `${((x - 280) / 100) * 100}%`, top: `${((y - 60) / 80) * 100}%`, '--t': `${t}s`, '--d': `${d}s` } as CSSProperties} />)}
      </span>
      {/* O gato da vila, no chão livre entre o pilar e a mesa, olhando a luneta. */}
      <span className="ds-palco__peca ds-palco__gato" style={lugar(333, 125, 34, 25.5)}><GatoPixel estado="olhando_cima" /></span>
    </div>
  )
}

type PeriodoDesempenho = { tipo: 'tudo' | '7' | '30' | '90' | 'desde'; desde?: string }
const PERIODOS: { tipo: PeriodoDesempenho['tipo']; rotulo: string }[] = [
  { tipo: 'tudo', rotulo: 'Tudo' }, { tipo: '7', rotulo: '7 dias' }, { tipo: '30', rotulo: '30 dias' }, { tipo: '90', rotulo: '90 dias' }, { tipo: 'desde', rotulo: 'Desde…' },
]
function inicioDoPeriodo(p: PeriodoDesempenho): number {
  if (p.tipo === 'tudo') return 0
  if (p.tipo === 'desde') {
    const data = p.desde && /^\d{4}-\d{2}-\d{2}$/.test(p.desde) ? inicioDaChave(p.desde) : NaN
    return Number.isFinite(data) ? data : 0
  }
  return inicioDaChave(somarDias(hojeBR(), -(Number(p.tipo) - 1)))
}
function descreverPeriodo(p: PeriodoDesempenho): string {
  if (p.tipo === 'tudo') return 'desde o começo'
  if (p.tipo === 'desde') return p.desde ? `desde ${new Date(`${p.desde}T00:00:00`).toLocaleDateString('pt-BR')}` : 'escolha a data'
  return `nos últimos ${p.tipo} dias`
}

const n = (v: number) => v.toLocaleString('pt-BR')
/** Números pequenos por extenso, como nas cartas (docs/emails/TOM.md). */
const EXTENSO = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']
const numero = (v: number) => (v >= 0 && v <= 10 ? EXTENSO[v] : n(v))
/** Primeiro nome, com a mesma regra das cartas (supabase/functions/_shared/cartas.ts). */
function primeiroNome(nome?: unknown): string {
  const primeiro = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}
type Aba = 'geral' | 'assuntos' | 'erros' | 'calendario'
const ABAS: Array<[Aba, string, Parameters<typeof Icone>[0]['nome']]> = [['geral', 'Visão geral', 'grafico'], ['assuntos', 'Assuntos', 'mapa'], ['erros', 'Erros e retenção', 'alvo'], ['calendario', 'Calendário', 'calendario']]

export function DadosLocais() {
  const { favoritos } = usarFavoritos()
  const { indice } = usarIndice()
  const { sessao: conta, status: statusSync, sincronizar } = usarConta()
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [marcadas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  // Depois de "Começar do zero", nada anterior ao reinício entra nos gráficos,
  // mesmo que algum aparelho ainda guarde eventos antigos no histórico da questão.
  const [reinicioEm] = usarArmazenado<number>('reinicio:em', 0)
  const respondidas = Object.keys(marcadas).length
  const [reinicioPendente] = usarArmazenado<string | null>('reinicio:pendente', null)
  const bytes = tamanhoArmazenado()
  const periodoArte = usarPeriodo()

  // Período escolhido: fica salvo e vale sempre que a pessoa volta. Em vez de
  // apagar o histórico, ela acompanha só a fase atual do estudo.
  const [periodo, definirPeriodo] = usarArmazenado<PeriodoDesempenho>('desempenho:periodo', { tipo: 'tudo' })
  const inicioPeriodo = inicioDoPeriodo(periodo)
  const limite = Math.max(inicioPeriodo, reinicioEm || 0)
  const detalhes = usarDetalhes({ indice, marcadas, limite, meta: conta?.user.user_metadata })

  // Cada tentativa registrada (até as últimas 8 por questão), com o tema.
  const eventos = useMemo(() => {
    const temaPorId = new Map<string, { nome: string; slug: string }>()
    if (indice) for (const item of indice.questoes) {
      const tema = indice.temas[item.t]
      if (tema) temaPorId.set(item.id, { nome: tema.nome, slug: tema.slug })
    }
    const lista: { id: string; em: number; correta: boolean | null; confianca: 'seguro' | 'duvida' | 'chute'; tema?: { nome: string; slug: string } }[] = []
    for (const [id, registro] of Object.entries(marcadas)) {
      const historicoQuestao = registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c, confianca: registro.confianca ?? 'seguro' as const }] : []
      for (const evento of historicoQuestao) {
        if ((evento.em ?? 0) < limite) continue
        lista.push({ id, em: evento.em, correta: evento.correta, confianca: evento.confianca ?? 'seguro', tema: temaPorId.get(id) })
      }
    }
    return lista
  }, [indice, marcadas, limite])

  const porTema = useMemo(() => {
    const soma = new Map<string, { certas: number; total: number; slug: string }>()
    for (const evento of eventos) {
      if (evento.correta === null || !evento.tema) continue
      const atual = soma.get(evento.tema.nome) ?? { certas: 0, total: 0, slug: evento.tema.slug }
      atual.total++
      if (evento.correta) atual.certas++
      soma.set(evento.tema.nome, atual)
    }
    return [...soma.entries()]
      .map(([nome, valores]) => ({ nome, ...valores }))
      .sort((a, b) => b.total - a.total)
  }, [eventos])

  const totalCertas = porTema.reduce((n, t) => n + t.certas, 0)
  const totalContadas = porTema.reduce((n, t) => n + t.total, 0)
  const errosTotais = eventos.filter((e) => e.correta === false).length
  const questoesNoPeriodo = new Set(eventos.map((e) => e.id)).size
  const sessoesNoPeriodo = historico.filter((h) => h.concluidaEm >= limite).length
  const nome = primeiroNome(conta?.user.user_metadata?.nome)
  const percentualGeral = totalContadas > 0 ? totalCertas / totalContadas : null
  const incertas = Object.values(marcadas).filter(registro => registro.confianca === 'duvida' || registro.confianca === 'chute').length
  const minhaConquista = conquistaAtual(respondidas)
  const proximaConquistaAlvo = proximaConquista(respondidas)
  const porConfianca = useMemo(() => {
    const grupos = { seguro: { certas: 0, total: 0 }, duvida: { certas: 0, total: 0 }, chute: { certas: 0, total: 0 } }
    for (const evento of eventos) {
      if (evento.correta === null) continue
      const grupo = grupos[evento.confianca]
      grupo.total++
      if (evento.correta) grupo.certas++
    }
    return grupos
  }, [eventos])
  const avaliados = porTema.filter((t) => t.total >= 5)
  const temaForte = [...avaliados].sort((a, b) => b.certas / b.total - a.certas / a.total)[0]
  const temaFragil = [...avaliados].sort((a, b) => a.certas / a.total - b.certas / b.total)[0]
  const temDestaques = Boolean(temaForte && temaFragil && temaForte.nome !== temaFragil.nome)
  // Mensagem do topo no tom das cartas: o nome, até três observações com dado real,
  // nenhuma porcentagem abaixo de 50% e nenhum número de questões abaixo de 10.
  const pctGeral = percentualGeral === null ? null : Math.round(percentualGeral * 100)
  const streakAtual = detalhes.d.streak.atual
  const mensagemDesempenho = (() => {
    const quem = 'Você'
    if (respondidas < 10) return `${quem} está nos primeiros passos. Cada resposta entra aqui e vai mostrando o que vale estudar a seguir.`
    // O nome já está no título logo acima; repetir aqui soaria como formulário.
    const abertura = `São ${n(respondidas)} questões feitas até aqui`
    const tom = pctGeral === null || totalContadas < 30
      ? ', e o retrato fica mais nítido a cada sessão.'
      : pctGeral >= 80 ? `, com ${pctGeral}% de acerto: de quem já domina boa parte da prova.`
        : pctGeral >= 60 ? `, com ${pctGeral}% de acerto. Mais algumas revisões e essa porcentagem sobe.`
          : pctGeral >= 50 ? `, com ${pctGeral}% de acerto: a fase em que mais dá para crescer.`
            : '. Cada uma já ensinou alguma coisa, e todo mundo que passou começou assim.'
    const frases = [abertura + tom]
    const forte = avaliados.length >= 2 && temaForte && temaForte.certas / temaForte.total >= 0.5 ? temaForte : null
    if (forte) frases.push(`Seu terreno mais firme é ${forte.nome}.`)
    if (streakAtual >= 2) frases.push(`E já são ${numero(streakAtual)} dias seguidos de estudo, o que é de quem senta e faz.`)
    return frases.join(' ')
  })()

  // Sem conta e sem respostas: números de exemplo, marcados como exemplo, no lugar dos zeros.
  const exemplo = !conta && respondidas === 0
  const pct = exemplo ? 72 : percentualGeral === null ? null : Math.round(percentualGeral * 100)
  const streak = detalhes.d.streak
  const temConfianca = porConfianca.seguro.total > 0 || porConfianca.duvida.total > 0 || porConfianca.chute.total > 0
  // ---------- Abas (14/11/2026): evolução, assuntos, retenção, calendário, nota estimada, turma e resumos ----------
  const [aba, definirAba] = usarArmazenado<Aba>('desempenho:aba', 'geral')
  const { premium } = usarPremium()
  const { iniciarComAviso } = usarSessao()
  const ev = useMemo(() => eventosDe(marcadas, indice, limite), [marcadas, indice, limite])
  const nomesTemas = useMemo(() => new Map((indice?.temas ?? []).map((t) => [t.slug, t.nome])), [indice])
  const nota = useMemo(() => notaEstimada(ev, nomesTemas), [ev, nomesTemas])
  const primeirasN = useMemo(() => ev.filter((e) => e.primeira && e.correta !== null).length, [ev])
  const [turmaMapa, definirTurmaMapa] = useState<Map<string, { acerto: number }> | null>(null)
  useEffect(() => {
    if (!premium) return
    let vivo = true
    void carregarTurmaAcervo().then((m) => { if (vivo && m) definirTurmaMapa(m) }).catch(() => undefined)
    return () => { vivo = false }
  }, [premium])
  const turma: ComparacaoTurma | null = useMemo(() => (turmaMapa ? compararTurma(ev, turmaMapa) : null), [turmaMapa, ev])
  const linhas = useMemo(() => (indice ? linhasAssuntos(indice, marcadas, ev) : { temas: [], assuntos: [] }), [indice, marcadas, ev])
  const retencao = useMemo(() => contarRetencao(marcadas), [marcadas])
  const certeza = useMemo(() => errosComCerteza(marcadas), [marcadas])
  const [capitulos, definirCapitulos] = useState<CapituloResumo[]>([])
  useEffect(() => {
    let vivo = true
    void carregarIndiceBibliotecaLeve().catch(() => carregarIndiceBiblioteca()).then((i) => { if (vivo) definirCapitulos(i.capitulos as CapituloResumo[]) }).catch(() => undefined)
    return () => { vivo = false }
  }, [])
  const pendentes = useMemo(() => errosPendentes(marcadas), [marcadas])
  const resumosIndicados = useMemo(() => (indice && capitulos.length ? indicarResumos(capitulos, pendentes, indice, 4) : []), [capitulos, pendentes, indice])
  // O melhor resumo de cada tema para os erros daquele tema (nota estimada e tabela).
  const resumoPorTema = useMemo(() => {
    const m = new Map<string, ResumoIndicado>()
    if (!indice || !capitulos.length) return m
    const temaDe = new Map(indice.questoes.map((q) => [q.id, indice.temas[q.t]?.slug]))
    const porTema = new Map<string, string[]>()
    for (const id of pendentes) { const t = temaDe.get(id); if (!t) continue; const l = porTema.get(t) ?? []; l.push(id); porTema.set(t, l) }
    for (const [t, ids] of porTema) {
      const [melhor] = indicarResumos(capitulos.filter((c) => c.especialidade === t), ids, indice, 1)
      if (melhor) m.set(t, melhor)
    }
    return m
  }, [capitulos, pendentes, indice])
  const diasCalendario = useMemo(() => calendario(eventosDe(marcadas, indice, reinicioEm || 0)), [marcadas, indice, reinicioEm])
  async function revisarIds(ids: string[]) {
    if (!ids.length) return
    const lista = ids.slice(0, 20)
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, embaralhar: true, limite: lista.length }, lista))) return
    navegar('/sessao')
  }
  const revisarEstado = (estado: EstadoRetencao) => void revisarIds(retencao.ids[estado])

  const mostrarSync = conta && (statusSync.estado === 'erro' || statusSync.estado === 'offline' || statusSync.estado === 'conflito' || statusSync.pendentes > 0 || statusSync.rejeitados.length > 0)

  return (
    <article className="ds">
      {/* ---------- O observatório: título e mensagem sobre a pintura, o placar na bancada logo abaixo ---------- */}
      <section className={`ds-obs ds-obs--${periodoArte}`} aria-labelledby="ds-titulo">
        <div className="ds-obs__cena">
          <CenaObservatorio periodo={periodoArte} />
          <div className="ds-obs__cabeca">
            <p className="ds-obs__selo"><Icone nome="grafico" tamanho={13} /> Observatório da vila</p>
            <h1 id="ds-titulo">{nome ? `${nome}, seu desempenho` : 'Seu desempenho'}</h1>
            {exemplo && <p className="ds-obs__exemplo">Exemplo com números fictícios</p>}
          </div>
          <div className="ds-obs__texto">
            {exemplo ? <>
              <p>É assim que fica o seu desempenho: acerto por tema, ritmo da semana e onde você mais erra. Cada resposta entra aqui, do celular ou do computador.</p>
              <a className="ds-obs__criar" href={href('/conta?modo=criar&voltar=%2Fdados')}>Criar conta grátis e ver o meu <Icone nome="direita" tamanho={16} /></a>
            </> : <p>{mensagemDesempenho}</p>}
            {/* No topo só quando há algo a fazer (erro, offline, itens parados): "Sincronizando…"
                piscando no herói a cada 5 segundos competia com o desempenho. */}
            {mostrarSync && (
              <p className="ds-obs__sync" role="status">
                <span className={`ponto-sincronia ponto-sincronia--${statusSync.estado}`} aria-hidden="true" />
                {statusSync.estado === 'sincronizando' ? 'Sincronizando…' : statusSync.estado === 'salvo' ? 'Progresso sincronizado' : statusSync.pendentes ? `${statusSync.pendentes} ${statusSync.pendentes === 1 ? 'alteração aguardando' : 'alterações aguardando'} envio` : 'Progresso salvo neste dispositivo'}
                {statusSync.estado !== 'sincronizando' && <button type="button" className="botao--vinculo" onClick={sincronizar}>sincronizar agora</button>}
                {statusSync.estado === 'erro' && statusSync.detalhe && <small className="status-sincronia__detalhe">Motivo: {statusSync.detalhe}</small>}
                {statusSync.rejeitados.length > 0 && <a className="status-sincronia__detalhe ds-obs__rejeitados" href={href('/conta')}>{statusSync.rejeitados.length} {statusSync.rejeitados.length === 1 ? 'item não enviado' : 'itens não enviados'} · ver em Minha conta</a>}
              </p>
            )}
          </div>
        </div>

        <div className="ds-obs__bancada">
          <dl className="ds-placar">
            <div className="ds-placar__item ds-placar__item--acerto">
              <dt>{periodo.tipo === 'tudo' ? 'Acerto geral' : 'Acerto no período'}</dt>
              <dd>
                <span className="ds-placar__valor">{pct === null ? <span className="ds-placar__vazio">–</span> : <>{pct}<small>%</small></>}</span>
                {pct !== null && <Medidor valor={pct} rotulo={`${pct}% de acerto ${periodo.tipo === 'tudo' ? 'no total' : 'no período'}`} />}
                <span className="ds-placar__apoio ds-num">{exemplo ? '893 certas em 1.240 respostas de exemplo' : totalContadas ? `${n(totalCertas)} certas em ${n(totalContadas)} ${totalContadas === 1 ? 'resposta' : 'respostas'}` : 'Sem respostas ainda. O acerto conta cada resposta de questão com gabarito.'}</span>
              </dd>
            </div>
            <div className="ds-placar__item">
              <dt>{periodo.tipo === 'tudo' ? 'Questões respondidas' : 'Questões no período'}</dt>
              <dd>
                <span className="ds-placar__valor">{exemplo ? '1.240' : n(periodo.tipo === 'tudo' ? respondidas : questoesNoPeriodo)}{minhaConquista && !exemplo && <span className="ds-placar__medalha"><Medalha conquista={minhaConquista} tamanho={24} titulo={`Emblema ${minhaConquista.rotulo}`} /></span>}</span>
                <span className="ds-placar__apoio">questões diferentes; revisar soma respostas, não questões</span>
              </dd>
            </div>
            <div className="ds-placar__item">
              <dt>Sequência</dt>
              <dd>
                <span className="ds-placar__valor">{exemplo ? 12 : streak.atual}<small>{(exemplo ? 12 : streak.atual) === 1 ? ' dia' : ' dias'}</small></span>
                <span className="ds-placar__apoio">recorde de {exemplo ? 21 : streak.recorde} {(exemplo ? 21 : streak.recorde) === 1 ? 'dia' : 'dias'}{periodo.tipo !== 'tudo' ? ' · conta sempre o total' : ''}</span>
              </dd>
            </div>
          </dl>
          <div className="ds-obs__apoio">
            <dl className="ds-obs__extras">
              <div><dt>{periodo.tipo === 'tudo' ? 'Sessões' : 'Sessões no período'}</dt><dd className="ds-num">{exemplo ? 58 : n(periodo.tipo === 'tudo' ? historico.length : sessoesNoPeriodo)}</dd></div>
              <div><dt>{periodo.tipo === 'tudo' ? 'Erros acumulados' : 'Erros no período'}</dt><dd className="ds-num"><a href={href('/erros')} aria-label={`${exemplo ? 347 : errosTotais} erros: abrir o caderno de erros`}>{exemplo ? 347 : n(errosTotais)}</a></dd></div>
              <div><dt>Favoritas</dt><dd className="ds-num"><a href={href('/favoritas')} aria-label={`${exemplo ? 23 : favoritos.length} favoritas: abrir`}>{exemplo ? 23 : n(favoritos.length)}</a></dd></div>
            </dl>
            {proximaConquistaAlvo && !exemplo && <a className="ds-obs__conquista" href={href('/ranking')}><Icone nome="medalha" tamanho={15} /> Faltam {numero(proximaConquistaAlvo.minimo - respondidas)} {proximaConquistaAlvo.minimo - respondidas === 1 ? 'questão' : 'questões'} para {proximaConquistaAlvo.rotulo}</a>}
          </div>
        </div>
      </section>

      {/* Nota estimada em destaque (Tales, 14/11/2026), logo abaixo do placar. */}
      {!exemplo && <NotaEstimadaCartao nota={nota} base={primeirasN} turma={turma} resumos={resumoPorTema} />}

      {/* Filtro único, acima de tudo o que ele recorta. */}
      <section className="ds-periodo" aria-label="Período do desempenho">
        <div className="ds-periodo__texto">
          <strong><Icone nome="calendario" tamanho={16} /> Período</strong>
          <span>Mostrando {descreverPeriodo(periodo)}. Sequência, favoritas, Ranking e emblemas contam sempre o total.</span>
        </div>
        <div className="ds-periodo__controles">
          <div className="ds-seg seletor" role="group" aria-label="Escolher período">
            {PERIODOS.map((opcao) => (
              <button key={opcao.tipo} type="button" aria-pressed={periodo.tipo === opcao.tipo}
                onClick={() => definirPeriodo(opcao.tipo === 'desde' ? { tipo: 'desde', desde: periodo.desde ?? somarDias(hojeBR(), -29) } : { tipo: opcao.tipo, desde: periodo.desde })}>
                {opcao.rotulo}
              </button>
            ))}
          </div>
          {periodo.tipo === 'desde' && (
            <label className="ds-periodo__data">
              <span className="so-leitor">Data inicial</span>
              <input className="entrada" type="date" value={periodo.desde ?? ''} max={hojeBR()} onChange={(e) => definirPeriodo({ tipo: 'desde', desde: e.target.value && e.target.value > hojeBR() ? hojeBR() : e.target.value })} />
            </label>
          )}
        </div>
      </section>

      {!conta && <p className="aviso-ia">Crie uma conta gratuita ({fraseGratis('curto')}) para salvar seu desempenho, revisões e histórico e acompanhar sua evolução em qualquer dispositivo. <a href={href('/conta')}>Criar minha conta</a></p>}
      {conta && !armazenamentoDisponivel() && (
        <div className="estado">
          <p className="estado__titulo">Este navegador está com o armazenamento bloqueado.</p>
          <p>O site funciona normalmente, mas o progresso vale só até você fechar a aba. Aba anônima e bloqueio de cookies costumam ser a causa.</p>
        </div>
      )}

      {/* ---------- Abas (14/11/2026): cada uma responde uma pergunta ---------- */}
      <nav className="da-abas" aria-label="Partes do desempenho">
        <div className="da-abas__trilho" role="tablist">
          {ABAS.map(([id, rotulo, icone]) => <button key={id} type="button" role="tab" id={`da-aba-${id}`} aria-selected={aba === id} aria-controls={`da-painel-${id}`}
            className="da-aba" onClick={() => definirAba(id)}>
            <Icone nome={icone} tamanho={17} /> <span>{rotulo}</span>
            {id === 'erros' && certeza.length > 0 && <b className="da-aba__alerta" aria-label={`${certeza.length} erros com certeza`}>{certeza.length > 99 ? '99+' : certeza.length}</b>}
          </button>)}
        </div>
      </nav>

      {aba === 'geral' && <div className="da-painel" role="tabpanel" id="da-painel-geral" aria-labelledby="da-aba-geral">
        <DetalhesNumeros detalhes={detalhes} />
        <Evolucao eventos={ev} />
        <ResultadoCronograma indice={indice} respondidas={marcadas} eventos={ev} />
        {temConfianca && <ErrosComCerteza ids={certeza} porConfianca={porConfianca} onRevisar={() => void revisarIds(certeza)} />}
      {/* ---------- O que fazer agora ---------- */}
        <section className="ds-capitulo" aria-labelledby="ds-cap-agora">
        <header className="ds-capitulo__cabeca">
          <p className="ds-capitulo__selo"><b aria-hidden="true">3</b> O que fazer agora</p>
          <h2 id="ds-cap-agora">{nome ? `${nome}, sua próxima sessão` : 'Sua próxima sessão'}</h2>
        </header>
        <div className="ds-agora folha">
          <ol className="ds-passos">
            {temaFragil && temDestaques && <li className="ds-passo">
              <span className="ds-moeda" aria-hidden="true">1</span>
              <div>
                <strong>Refazer os erros de {temaFragil.nome}</strong>
                <span>É onde mais dá para crescer agora. Que tal dez questões, com calma?</span>
              </div>
              <a className="ds-passo__acao" href={href(`/treinar?temas=${temaFragil.slug}&situacao=erradas&limite=10`)}>Treinar 10 <Icone nome="direita" tamanho={16} /></a>
            </li>}
            {incertas > 0 && <li className="ds-passo">
              <span className="ds-moeda" aria-hidden="true">{temaFragil && temDestaques ? 2 : 1}</span>
              <div>
                <strong>Refazer {numero(incertas)} {incertas === 1 ? 'questão com dúvida ou chute' : 'questões com dúvida ou chute'}</strong>
                <span>Uma passada rápida transforma o que ficou incerto em certeza.</span>
              </div>
              <a className="ds-passo__acao" href={href('/treinar?situacao=incertas&limite=20')}>Treinar 20 <Icone nome="direita" tamanho={16} /></a>
            </li>}
            {resumosIndicados[0] && <li className="ds-passo ds-passo--resumo">
              <span className="ds-moeda" aria-hidden="true"><Icone nome="livro" tamanho={14} /></span>
              <div>
                <strong>Ler {resumosIndicados[0].capitulo.titulo}</strong>
                <span>O resumo que mais cobre os seus erros: {resumosIndicados[0].cobre} {resumosIndicados[0].cobre === 1 ? 'questão' : 'questões'}, em {resumosIndicados[0].capitulo.minutos} minutos.</span>
              </div>
              <a className="ds-passo__acao" href={href(`/resumos/${resumosIndicados[0].capitulo.id}`)}>Ler <Icone nome="direita" tamanho={16} /></a>
            </li>}
            {(exemplo || errosTotais > 0) && <li className="ds-passo">
              <span className="ds-moeda" aria-hidden="true">{(temaFragil && temDestaques ? 1 : 0) + (incertas > 0 ? 1 : 0) + 1}</span>
              <div>
                <strong>Abrir o caderno de erros</strong>
                <span className="ds-num">{numero(exemplo ? 347 : errosTotais)} {(exemplo ? 347 : errosTotais) === 1 ? 'erro' : 'erros'} {periodo.tipo === 'tudo' ? 'guardados' : 'no período'}, cada um com o comentário que explica.</span>
              </div>
              <a className="ds-passo__acao" href={href('/erros')}>Abrir <Icone nome="direita" tamanho={16} /></a>
            </li>}
            {!exemplo && !errosTotais && !incertas && !(temaFragil && temDestaques) && <li className="ds-passo">
              <span className="ds-moeda" aria-hidden="true">1</span>
              <div>
                <strong>{totalContadas ? 'Seguir com uma sessão nova' : 'Fazer a primeira sessão'}</strong>
                <span>{totalContadas ? 'Sem erros nem dúvidas guardados neste período. Dez questões novas mantêm o ritmo.' : 'Dez questões bastam para o observatório começar a mostrar seus temas.'}</span>
              </div>
              <a className="ds-passo__acao" href={href('/treinar?limite=10')}>Treinar 10 <Icone nome="direita" tamanho={16} /></a>
            </li>}
          </ol>
          <a className="botao botao--principal ds-agora__treinar" href={href('/treinar')}>
            <Icone nome="filtro" tamanho={22} />
            <span><strong>Montar uma sessão</strong><small>Escolha prova, tema e quantidade no Treinar</small></span>
          </a>
        </div>
        {!exemplo && <AtalhoFlashcards tipo="desempenho" />}
      </section>
      </div>}

      {aba === 'assuntos' && <div className="da-painel" role="tabpanel" id="da-painel-assuntos" aria-labelledby="da-aba-assuntos">
        <Assuntos temas={linhas.temas} assuntos={linhas.assuntos} turma={turma} resumos={resumoPorTema} />
        {!premium && <p className="da-turma-convite"><Icone nome="grupo" tamanho={16} /> Assinantes veem também a coluna <b>Turma</b>: o seu acerto contra o de todo mundo nas mesmas questões. <a href={href('/assinatura')}>Ver planos</a></p>}
        <DetalhesProvas detalhes={detalhes} />
      </div>}

      {aba === 'erros' && <div className="da-painel" role="tabpanel" id="da-painel-erros" aria-labelledby="da-aba-erros">
        <Retencao conta={retencao.conta} erradas={retencao.erradas} onRevisar={revisarEstado} />
        <ResumosIndicados lista={resumosIndicados} />
        <ErrosComCerteza ids={certeza} porConfianca={porConfianca} onRevisar={() => void revisarIds(certeza)} />
        <p className="da-rodape"><a href={href('/erros')}><Icone nome="livro" tamanho={15} /> Abrir o caderno de erros</a>, com cada questão e o comentário que explica.</p>
      </div>}

      {aba === 'calendario' && <div className="da-painel" role="tabpanel" id="da-painel-calendario" aria-labelledby="da-aba-calendario">
        <Calendario dias={diasCalendario} eventos={eventosDe(marcadas, indice, reinicioEm || 0)} historico={historico} nomes={nomesTemas} />
        <DetalhesDiaSemana detalhes={detalhes} />
      </div>}

      {conta && <p className="meta ds-guardado">Seu progresso fica salvo e sincronizado com a sua conta ({(bytes / 1024).toFixed(1)} kB neste perfil). <a href={href('/conta')}>Minha conta</a></p>}

      <BackupProgresso />

      {/* O reinício está sendo refeito: o bloco só aparece se houver um reinício pendente de sincronizar. */}
      {conta && reinicioPendente && <section className="zona-risco cartao__corpo empilha ds-risco">
        <p className="meta"><Icone nome="alerta" tamanho={15} /> ZONA DE RISCO</p>
        <h2>Começar do zero <span className="ds-embreve">Em breve</span></h2>
        <p className="texto-2">Esta opção está sendo refeita e volta em breve. Enquanto isso, use o <strong>Período</strong> lá em cima para acompanhar só a fase atual do seu estudo: o acerto, os temas e a confiança passam a contar a partir da data que você escolher, sem apagar nada.</p>
        <div className="linha">
          {/* A função reiniciarProgresso continua pronta; o botão só volta a funcionar quando o reinício for refeito. */}
          <button type="button" className="botao botao--perigo" disabled aria-disabled="true" title="Em breve">Zerar meu progresso · em breve</button>
          {reinicioPendente && <button type="button" className="botao botao--fantasma" onClick={sincronizar}>Tentar sincronizar agora</button>}
        </div>
      </section>}
    </article>
  )
}
