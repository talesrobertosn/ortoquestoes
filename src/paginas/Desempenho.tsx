import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AtalhoFlashcards } from '../componentes/AtalhoFlashcards'
import { MolduraNatal } from '../natal/MolduraNatal'
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
import { NotaEstimadaCartao, SobeNota } from '../componentes/desempenho/NotaEstimada'
import { Evolucao } from '../componentes/desempenho/Evolucao'
import { Assuntos } from '../componentes/desempenho/Assuntos'
import { ErrosComCerteza, ResumosIndicados, Retencao } from '../componentes/desempenho/Retencao'
import { Calendario } from '../componentes/desempenho/Calendario'
import { ResultadoCronograma } from '../componentes/desempenho/ResultadoCronograma'
import { gerarExemplo, NOME_EXEMPLO } from '../dados/exemploDesempenho'
import '../estilos/paginas/Desempenho.css'

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

export function DadosLocais() {
  const { favoritos } = usarFavoritos()
  const { indice } = usarIndice()
  const { sessao: conta, status: statusSync, sincronizar } = usarConta()
  const [historicoReal] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [marcadasReais] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  // Desempenho de exemplo (14/11/2026): sem conta e sem respostas, ou com #/dados?exemplo=1, a página inteira mostra
  // uma residente fictícia com notas boas (dados/exemploDesempenho.ts), sempre marcada como exemplo.
  const pedidoExemplo = typeof window !== 'undefined' && /[?&]exemplo=1(&|$)/.test(window.location.hash)
  const exemplo = pedidoExemplo || (!conta && Object.keys(marcadasReais).length === 0)
  const dadosExemplo = useMemo(() => (exemplo && indice ? gerarExemplo(indice) : null), [exemplo, indice])
  const marcadas = useMemo(() => dadosExemplo?.respondidas ?? (exemplo ? {} : marcadasReais), [dadosExemplo, exemplo, marcadasReais])
  const historico = dadosExemplo?.historico ?? (exemplo ? [] : historicoReal)
  // Depois de "Começar do zero", nada anterior ao reinício entra nos gráficos,
  // mesmo que algum aparelho ainda guarde eventos antigos no histórico da questão.
  const [reinicioSalvo] = usarArmazenado<number>('reinicio:em', 0)
  const reinicioEm = exemplo ? 0 : reinicioSalvo
  const respondidas = Object.keys(marcadas).length
  const [reinicioPendente] = usarArmazenado<string | null>('reinicio:pendente', null)
  const bytes = tamanhoArmazenado()
  const periodoArte = usarPeriodo()

  // Período escolhido: fica salvo e vale sempre que a pessoa volta. Em vez de
  // apagar o histórico, ela acompanha só a fase atual do estudo.
  // Sempre abre no período total (Tales, 14/11/2026); a escolha vale só enquanto a página está aberta.
  const [periodo, definirPeriodo] = useState<PeriodoDesempenho>({ tipo: 'tudo' })
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

  const pct = percentualGeral === null ? null : Math.round(percentualGeral * 100)
  const streak = detalhes.d.streak
  const temConfianca = porConfianca.seguro.total > 0 || porConfianca.duvida.total > 0 || porConfianca.chute.total > 0
  // ---------- Abas (14/11/2026): evolução, assuntos, retenção, calendário, nota estimada, turma e resumos ----------
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
  const turmaFonte = dadosExemplo?.turma ?? (exemplo ? null : turmaMapa)
  const turma: ComparacaoTurma | null = useMemo(() => (turmaFonte ? compararTurma(ev, turmaFonte) : null), [turmaFonte, ev])
  const linhas = useMemo(() => (indice ? linhasAssuntos(indice, marcadas, ev) : { temas: [], assuntos: [] }), [indice, marcadas, ev])
  const retencao = useMemo(() => contarRetencao(marcadas), [marcadas])
  const certeza = useMemo(() => errosComCerteza(marcadas), [marcadas])
  // Aviso dos erros com certeza (Tales, 14/11/2026: "notificação é chato, mas tem que ter"): o menu conta só os que
  // você ainda não viu; "Marcar todos como vistos" zera o aviso, e as questões continuam na seção para revisar.
  const [certezaVistas, definirCertezaVistas] = usarArmazenado<string[]>('desempenho:certeza-vistas', [])
  const certezaNovas = useMemo(() => { const vistas = new Set(certezaVistas); return certeza.filter((id) => !vistas.has(id)) }, [certeza, certezaVistas])
  const marcarCertezaVistas = () => { if (!exemplo) definirCertezaVistas([...new Set([...certezaVistas.filter((id) => certeza.includes(id)), ...certeza])]) }
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
  const eventosCalendario = useMemo(() => eventosDe(marcadas, indice, reinicioEm || 0), [marcadas, indice, reinicioEm])
  const diasCalendario = useMemo(() => calendario(eventosCalendario), [eventosCalendario])
  async function revisarIds(ids: string[]) {
    if (!ids.length) return
    // No exemplo, os botões levam a criar a conta (as questões da Marina não são de ninguém).
    if (exemplo) { navegar(conta ? '/treinar' : '/conta?modo=criar&voltar=%2Fdados'); return }
    const lista = ids.slice(0, 20)
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, embaralhar: true, limite: lista.length }, lista))) return
    navegar('/sessao')
  }
  const revisarEstado = (estado: EstadoRetencao) => void revisarIds(retencao.ids[estado])

  const mostrarSync = conta && (statusSync.estado === 'erro' || statusSync.estado === 'offline' || statusSync.estado === 'conflito' || statusSync.pendentes > 0 || statusSync.rejeitados.length > 0)
  const forte = avaliados.length >= 2 && temaForte && temaForte.certas / temaForte.total >= 0.5 ? temaForte : null
  const secoes = SECOES.filter(([id]) => id !== 'dados' || !exemplo)

  return (
    <article className={'dpg' + (exemplo ? ' dpg--exemplo' : '')}>
      <NavegacaoSecoes secoes={secoes} periodo={periodo} definirPeriodo={definirPeriodo} alertaErros={exemplo ? certeza.length : certezaNovas.length} aoMarcarVistos={exemplo ? undefined : marcarCertezaVistas} />

      <div className="dp-conteudo">
        {/* ---------- Topo: a cena, quem é, a mensagem, a nota estimada e os números, numa peça só ---------- */}
        <section className="dp-topo" id="dp-topo" aria-labelledby="dp-titulo">
          <div className={`dp-topo__cena dp-topo__cena--${periodoArte}`}>
            <CenaObservatorio periodo={periodoArte} />
            <MolduraNatal />
            <div className="dp-topo__titulo">
              <p className="dp-rotulo dp-rotulo--claro"><Icone nome="grafico" tamanho={14} /> {exemplo ? 'Desempenho de exemplo' : 'Seu desempenho'}</p>
              <h1 id="dp-titulo">{exemplo ? `${NOME_EXEMPLO}, residente de exemplo` : nome ? `${nome}, seu desempenho` : 'Seu desempenho'}</h1>
              {exemplo && <p className="dp-selo-exemplo">Exemplo com números fictícios</p>}
            </div>
          </div>

          <div className="dp-topo__painel">
            <div className="dp-topo__mensagem">
              {exemplo
                ? <p className="dp-mensagem">A <b>{NOME_EXEMPLO}</b> é fictícia: <b>seis meses</b> de estudo no Orto Questões, uma sessão quase todo dia. O seu desempenho fica assim, com as suas respostas.</p>
                : <Mensagem respondidas={respondidas} pct={pctGeral} contadas={totalContadas} forte={forte?.nome ?? null} sequencia={streakAtual} />}
              {exemplo && <a className="dp-botao dp-botao--principal" href={href(conta ? '/dados' : '/conta?modo=criar&voltar=%2Fdados')}>{conta ? 'Voltar ao meu desempenho' : 'Criar conta grátis e ver o meu'} <Icone nome="direita" tamanho={16} /></a>}
              {mostrarSync && !exemplo && (
                <p className="dp-sync" role="status">
                  <span className={`ponto-sincronia ponto-sincronia--${statusSync.estado}`} aria-hidden="true" />
                  {statusSync.estado === 'sincronizando' ? 'Sincronizando…' : statusSync.pendentes ? `${statusSync.pendentes} ${statusSync.pendentes === 1 ? 'alteração aguardando' : 'alterações aguardando'} envio` : 'Progresso salvo neste dispositivo'}
                  {statusSync.estado !== 'sincronizando' && <button type="button" className="botao--vinculo" onClick={sincronizar}>sincronizar agora</button>}
                  {statusSync.estado === 'erro' && statusSync.detalhe && <small className="status-sincronia__detalhe">Motivo: {statusSync.detalhe}</small>}
                  {statusSync.rejeitados.length > 0 && <a className="status-sincronia__detalhe" href={href('/conta')}>{statusSync.rejeitados.length} {statusSync.rejeitados.length === 1 ? 'item não enviado' : 'itens não enviados'} · ver em Minha conta</a>}
                </p>
              )}
              <dl className="dp-numeros">
                <div className="dp-numero dp-numero--acerto">
                  <dt>{periodo.tipo === 'tudo' ? 'Acerto geral' : 'Acerto no período'}</dt>
                  <dd><b>{pct === null ? '–' : `${pct}%`}</b>{pct !== null && <Medidor valor={pct} rotulo={`${pct}% de acerto`} />}<small>{totalContadas ? `${n(totalCertas)} certas em ${n(totalContadas)} respostas` : 'Sem respostas ainda'}</small></dd>
                </div>
                <div className="dp-numero">
                  <dt>{periodo.tipo === 'tudo' ? 'Questões feitas' : 'Questões no período'}</dt>
                  <dd><b>{n(periodo.tipo === 'tudo' ? respondidas : questoesNoPeriodo)}{minhaConquista && <span className="dp-numero__medalha"><Medalha conquista={minhaConquista} tamanho={22} titulo={`Emblema ${minhaConquista.rotulo}`} /></span>}</b><small>questões diferentes</small></dd>
                </div>
                <div className="dp-numero">
                  <dt>Sequência</dt>
                  <dd><b>{streak.atual}<i> {streak.atual === 1 ? 'dia' : 'dias'}</i></b><small>recorde de {streak.recorde} {streak.recorde === 1 ? 'dia' : 'dias'}</small></dd>
                </div>
              </dl>
              <ul className="dp-atalhos">
                <li><span>Sessões</span><b>{n(periodo.tipo === 'tudo' ? historico.length : sessoesNoPeriodo)}</b></li>
                <li><a href={href('/erros')}><span>Erros guardados</span><b>{n(errosTotais)}</b></a></li>
                <li><a href={href('/favoritas')}><span>Favoritas</span><b>{exemplo ? 31 : n(favoritos.length)}</b></a></li>
                {proximaConquistaAlvo && !exemplo && <li><a href={href('/ranking')}><Icone nome="medalha" tamanho={14} /><span>Faltam {numero(proximaConquistaAlvo.minimo - respondidas)} para {proximaConquistaAlvo.rotulo}</span></a></li>}
              </ul>
            </div>
            <NotaEstimadaCartao nota={nota} base={primeirasN} turma={turma} resumos={resumoPorTema} exemplo={exemplo} />
          </div>
          {nota && <SobeNota nota={nota} resumos={resumoPorTema} />}
        </section>

        {exemplo && <p className="dp-faixa-exemplo" role="note"><Icone nome="olho" tamanho={16} /> <span><b>Exemplo com dados fictícios.</b> Tudo nesta página é da {NOME_EXEMPLO}; os botões levam {conta ? 'ao seu treino' : 'a criar a sua conta'}.</span>
          <a className="dp-botao dp-botao--pequeno" href={href(conta ? '/dados' : '/conta?modo=criar&voltar=%2Fdados')}>{conta ? 'Ver o meu' : 'Criar conta grátis'}</a></p>}
        {!conta && !exemplo && <p className="dp-faixa-exemplo">Crie uma conta gratuita ({fraseGratis('curto')}) para salvar seu desempenho em qualquer aparelho. <a className="dp-botao dp-botao--pequeno" href={href('/conta')}>Criar minha conta</a></p>}
        {conta && !armazenamentoDisponivel() && <p className="dp-faixa-exemplo"><b>Este navegador está com o armazenamento bloqueado.</b> O progresso vale só até fechar a aba (aba anônima e bloqueio de cookies costumam ser a causa).</p>}

        <Secao id="cronograma" rotulo="Cronograma" icone="calendario" titulo="Seu estudo está dando resultado?" texto="O que foi planejado e o que você fez, a constância e se o acerto subiu desde o começo do plano.">
          <ResultadoCronograma indice={indice} respondidas={marcadas} eventos={ev} planoExemplo={dadosExemplo?.plano} />
        </Secao>

        <Secao id="evolucao" rotulo="Evolução" icone="grafico" titulo="Estou melhorando?" texto="Acerto de primeira vez (o que mais se parece com a prova) e o das revisões, semana a semana.">
          <DetalhesNumeros detalhes={detalhes} />
          <Evolucao eventos={ev} />
        </Secao>

        <Secao id="assuntos" rotulo="Assuntos" icone="mapa" titulo="Onde estudar?" texto="Cada tema e cada assunto, com quanto ele cai na prova. Comece pelos de prioridade.">
          <Assuntos temas={linhas.temas} assuntos={linhas.assuntos} turma={turma} resumos={resumoPorTema} />
          {!premium && !exemplo && <p className="dp-nota-rodape"><Icone nome="grupo" tamanho={16} /> Assinantes veem também a coluna <b>Turma</b>: o seu acerto contra o de todo mundo nas mesmas questões. <a href={href('/assinatura')}>Ver planos</a></p>}
          <DetalhesProvas detalhes={detalhes} />
        </Secao>

        <Secao id="erros" rotulo="Erros e retenção" icone="alvo" titulo="O que eu realmente fixei?" texto="Cada questão que você errou, do erro novo até a consolidada, e os resumos certos para ler antes de refazer.">
          <Retencao conta={retencao.conta} erradas={retencao.erradas} onRevisar={revisarEstado} />
          <ResumosIndicados lista={resumosIndicados} />
          {temConfianca && <ErrosComCerteza ids={certeza} novas={exemplo ? certeza.length : certezaNovas.length} porConfianca={porConfianca} onRevisar={() => void revisarIds(certeza)} onMarcarVistas={exemplo ? undefined : marcarCertezaVistas} />}
        </Secao>

        <Secao id="calendario" rotulo="Calendário" icone="calendario" titulo="Quanto e quando eu estudei?" texto="Cada quadrado é um dia. Toque num dia para ver o que você estudou.">
          <Calendario dias={diasCalendario} eventos={eventosCalendario} historico={historico} nomes={nomesTemas} />
          <DetalhesDiaSemana detalhes={detalhes} />
        </Secao>

        <Secao id="agora" rotulo="O que fazer agora" icone="direita" titulo={exemplo ? 'A próxima sessão da Marina' : nome ? `${nome}, sua próxima sessão` : 'Sua próxima sessão'} texto="Três passos, do que mais rende para o que mantém.">
          <div className="dp-agora">
            <figure className="dp-agora__arte" aria-hidden="true">
              <img src={recurso(`pixel/paginas/observatorio-mesa-${periodoArte}.webp`)} width={336} height={336} alt="" loading="lazy" decoding="async" draggable={false} />
            </figure>
            <ol className="dp-passos">
              {temaFragil && temDestaques && <Passo n={1} titulo={`Refazer os erros de ${temaFragil.nome}`} texto="É onde mais dá para crescer agora. Dez questões, com calma."
                acao={{ rotulo: 'Treinar 10', href: href(exemplo ? '/conta?modo=criar&voltar=%2Fdados' : `/treinar?temas=${temaFragil.slug}&situacao=erradas&limite=10`) }} />}
              {resumosIndicados[0] && <Passo n={temaFragil && temDestaques ? 2 : 1} titulo={`Ler ${resumosIndicados[0].capitulo.titulo}`} texto={`O resumo que mais cobre os seus erros: ${resumosIndicados[0].cobre} ${resumosIndicados[0].cobre === 1 ? 'questão' : 'questões'}, em ${resumosIndicados[0].capitulo.minutos} minutos.`}
                acao={{ rotulo: 'Ler o resumo', href: href(`/resumos/${resumosIndicados[0].capitulo.id}`), livro: true }} />}
              {incertas > 0 && <Passo n={(temaFragil && temDestaques ? 1 : 0) + (resumosIndicados[0] ? 1 : 0) + 1} titulo={`Refazer ${numero(incertas)} ${incertas === 1 ? 'questão com dúvida ou chute' : 'questões com dúvida ou chute'}`} texto="Uma passada rápida transforma o que ficou incerto em certeza."
                acao={{ rotulo: 'Treinar 20', href: href(exemplo ? '/conta?modo=criar&voltar=%2Fdados' : '/treinar?situacao=incertas&limite=20') }} />}
              {!errosTotais && !incertas && !(temaFragil && temDestaques) && <Passo n={1} titulo={totalContadas ? 'Seguir com uma sessão nova' : 'Fazer a primeira sessão'} texto={totalContadas ? 'Sem erros nem dúvidas guardados. Dez questões novas mantêm o ritmo.' : 'Dez questões bastam para esta página começar a mostrar seus temas.'}
                acao={{ rotulo: 'Treinar 10', href: href('/treinar?limite=10') }} />}
              <li className="dp-passos__fim">
                <a className="dp-botao dp-botao--principal dp-botao--grande" href={href('/treinar')}><Icone nome="filtro" tamanho={18} /> Montar uma sessão</a>
                {errosTotais > 0 && <a className="dp-botao dp-botao--contorno" href={href('/erros')}><Icone nome="livro" tamanho={16} /> Caderno de erros ({n(errosTotais)})</a>}
              </li>
            </ol>
          </div>
          {!exemplo && <AtalhoFlashcards tipo="desempenho" />}
          {exemplo && <ConviteExemplo conta={!!conta} />}
        </Secao>

        {!exemplo && <Secao id="dados" rotulo="Seus dados" icone="baixar" titulo="Seu progresso, guardado" texto={conta ? `Salvo e sincronizado com a sua conta (${(bytes / 1024).toFixed(1)} kB neste perfil).` : 'Sem conta, o progresso fica só neste aparelho.'}>
          <div className="dp-dados"><BackupProgresso /></div>
          {conta && reinicioPendente && <div className="dp-cartao dp-risco">
            <p className="dp-rotulo"><Icone nome="alerta" tamanho={14} /> Zona de risco</p>
            <h3>Começar do zero <span className="dp-chip">em breve</span></h3>
            <p>Esta opção está sendo refeita. Enquanto isso, use o <b>Período</b> no menu para acompanhar só a fase atual do estudo, sem apagar nada.</p>
            <button type="button" className="dp-botao dp-botao--contorno" onClick={sincronizar}>Tentar sincronizar agora</button>
          </div>}
        </Secao>}
      </div>
    </article>
  )
}

/** As seções da página, na ordem: o menu lateral e a barra do celular leem daqui. */
const SECOES: Array<[string, string, Parameters<typeof Icone>[0]['nome']]> = [
  ['topo', 'Nota e números', 'alvo'], ['cronograma', 'Cronograma', 'calendario'], ['evolucao', 'Evolução', 'grafico'], ['assuntos', 'Assuntos', 'mapa'],
  ['erros', 'Erros e retenção', 'alerta'], ['calendario', 'Calendário', 'calendario'], ['agora', 'O que fazer agora', 'direita'], ['dados', 'Seus dados', 'baixar'],
]

/** Cabeça de seção: rótulo, a pergunta que ela responde e uma linha de apoio. */
function Secao({ id, rotulo, icone, titulo, texto, children }: { id: string; rotulo: string; icone: Parameters<typeof Icone>[0]['nome']; titulo: string; texto: string; children: ReactNode }) {
  return (
    <section className="dp-secao" id={`dp-${id}`} aria-labelledby={`dp-${id}-titulo`}>
      <header className="dp-secao__cabeca">
        <p className="dp-rotulo"><Icone nome={icone} tamanho={14} /> {rotulo}</p>
        <h2 id={`dp-${id}-titulo`}>{titulo}</h2>
        <p>{texto}</p>
      </header>
      {children}
    </section>
  )
}

/** A mensagem do topo, com os números em destaque (o texto continua o das cartas: dado real, sem número ruim). */
function Mensagem({ respondidas, pct, contadas, forte, sequencia }: { respondidas: number; pct: number | null; contadas: number; forte: string | null; sequencia: number }) {
  if (respondidas < 10) return <p className="dp-mensagem">Você está nos <b>primeiros passos</b>. Cada resposta entra aqui e vai mostrando o que vale estudar a seguir.</p>
  const tom = pct === null || contadas < 30 ? <>, e o retrato fica mais nítido a cada sessão.</>
    : pct >= 80 ? <>, com <b>{pct}% de acerto</b>: de quem já domina boa parte da prova.</>
      : pct >= 60 ? <>, com <b>{pct}% de acerto</b>. Mais algumas revisões e essa porcentagem sobe.</>
        : pct >= 50 ? <>, com <b>{pct}% de acerto</b>: a fase em que mais dá para crescer.</>
          : <>. Cada uma já ensinou alguma coisa, e todo mundo que passou começou assim.</>
  return (
    <p className="dp-mensagem">
      São <b>{n(respondidas)} questões</b> feitas até aqui{tom}
      {forte && <> Seu terreno mais firme é <b>{forte}</b>.</>}
      {sequencia >= 2 && <> E já são <b>{numero(sequencia)} dias seguidos</b> de estudo, o que é de quem senta e faz.</>}
    </p>
  )
}

function Passo({ n: numeroPasso, titulo, texto, acao }: { n: number; titulo: string; texto: string; acao: { rotulo: string; href: string; livro?: boolean } }) {
  return (
    <li className="dp-passo">
      <span className="dp-passo__n" aria-hidden="true">{numeroPasso}</span>
      <div><strong>{titulo}</strong><span>{texto}</span></div>
      <a className={'dp-botao ' + (acao.livro ? 'dp-botao--contorno' : 'dp-botao--principal')} href={acao.href}>{acao.livro && <Icone nome="livro" tamanho={15} />} {acao.rotulo} <Icone nome="direita" tamanho={15} /></a>
    </li>
  )
}

/**
 * Menu das seções (14/11/2026, Tales: "funções muito valiosas para ficar escondidas"): no computador, uma coluna
 * fixa ao lado com o período e a seção em que você está; no celular, uma barra de atalhos que acompanha a rolagem.
 */
function NavegacaoSecoes({ secoes, periodo, definirPeriodo, alertaErros, aoMarcarVistos }: {
  secoes: typeof SECOES; periodo: PeriodoDesempenho; definirPeriodo: (p: PeriodoDesempenho) => void; alertaErros: number; aoMarcarVistos?: () => void
}) {
  const [atual, definirAtual] = useState('topo')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const alvos = secoes.map(([id]) => document.getElementById(`dp-${id}`)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver((entradas) => {
      const visiveis = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visiveis[0]) definirAtual(visiveis[0].target.id.replace(/^dp-/, ''))
    }, { rootMargin: '-20% 0px -65% 0px' })
    alvos.forEach((a) => io.observe(a))
    return () => io.disconnect()
  }, [secoes])
  useEffect(() => {
    const ativo = document.querySelector(`.dp-nav__chips [data-secao="${atual}"]`) as HTMLElement | null
    ativo?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [atual])
  const ir = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const alvo = document.getElementById(`dp-${id}`)
    if (!alvo) return
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    alvo.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' })
    definirAtual(id)
  }
  const seletor = (
    <div className="dp-periodo">
      <span className="dp-periodo__rotulo"><Icone nome="calendario" tamanho={14} /> Período</span>
      <div className="dp-periodo__opcoes" role="group" aria-label="Período do desempenho">
        {PERIODOS.filter((o) => o.tipo !== 'desde').map((o) => <button key={o.tipo} type="button" aria-pressed={periodo.tipo === o.tipo} onClick={() => definirPeriodo({ tipo: o.tipo })}>{o.rotulo}</button>)}
      </div>
      <small>Sequência, favoritas e emblemas contam sempre o total.</small>
    </div>
  )
  return (
    <nav className="dp-nav" aria-label="Seções do desempenho">
      <div className="dp-nav__lateral">
        <p className="dp-rotulo">Nesta página</p>
        <ol>
          {secoes.map(([id, rotulo, icone]) => <li key={id}>
            <a href={`#dp-${id}`} onClick={ir(id)} aria-current={atual === id ? 'true' : undefined}>
              <Icone nome={icone} tamanho={16} /> <span>{rotulo}</span>
              {id === 'erros' && alertaErros > 0 && <b className="dp-nav__alerta" title={`${alertaErros} erros com certeza`}>{alertaErros > 99 ? '99+' : alertaErros}</b>}
            </a>
          </li>)}
        </ol>
        {alertaErros > 0 && aoMarcarVistos && <button type="button" className="dp-nav__vistos" onClick={aoMarcarVistos}><Icone nome="certo" tamanho={14} /> Marcar como vistos</button>}
        {seletor}
      </div>
      <div className="dp-nav__chips">
        {secoes.map(([id, rotulo]) => <a key={id} href={`#dp-${id}`} data-secao={id} onClick={ir(id)} aria-current={atual === id ? 'true' : undefined}>{rotulo}</a>)}
        <select aria-label="Período" value={periodo.tipo === 'desde' ? 'tudo' : periodo.tipo} onChange={(e) => definirPeriodo({ tipo: e.target.value as PeriodoDesempenho['tipo'] })}>
          {PERIODOS.filter((o) => o.tipo !== 'desde').map((o) => <option key={o.tipo} value={o.tipo}>{o.rotulo === 'Tudo' ? 'Período: tudo' : o.rotulo}</option>)}
        </select>
      </div>
    </nav>
  )
}

/** Fim da página de exemplo: o convite, com o que a pessoa ganha ao criar a conta. */
function ConviteExemplo({ conta }: { conta: boolean }) {
  return (
    <aside className="dp-convite" aria-labelledby="dp-convite-titulo">
      <div>
        <p className="dp-rotulo"><Icone nome="estrela" tamanho={14} /> O seu pode ficar assim</p>
        <h3 id="dp-convite-titulo">{conta ? 'Volte ao seu desempenho e compare' : 'Crie a sua conta e veja o seu desempenho de verdade'}</h3>
        <p>Nota estimada na prova, evolução semana a semana, os temas que mais caem e onde você erra, o que já fixou e os resumos certos para os seus erros. Grátis para começar.</p>
      </div>
      <a className="dp-botao dp-botao--principal dp-botao--grande" href={href(conta ? '/dados' : '/conta?modo=criar&voltar=%2Fdados')}>{conta ? 'Ver o meu desempenho' : 'Criar conta grátis'} <Icone nome="direita" tamanho={18} /></a>
    </aside>
  )
}
