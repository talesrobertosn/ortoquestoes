import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ResultadoRevisao } from '../componentes/revisao/ResultadoRevisao'
import { letraExibida } from '../dados/ordemAlternativas'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import type { EstadoSessao, Questao, Resposta } from '../dados/tipos'
import { entregarSessaoNacional } from '../dados/entregaNacional'
import { codigoErroSN } from '../dados/apiSimuladoNacional'
import { esquecerEdicaoEmDestaque } from '../dados/nacionalEmDestaque'
import { indicarResumos, type CapituloResumo, type ResumoIndicado } from '../dados/desempenho'
import { carregarIndiceBiblioteca, carregarIndiceBibliotecaLeve } from '../biblioteca/conteudo'
import { CorujaPixel } from '../biblioteca/sala/CorujaPixel'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Medalha } from '../componentes/Medalha'
import { usarConta } from '../conta/ContextoConta'
import { type ResumoHistorico, descreverFiltros, usarSessao } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { calcularStreak, META_STREAK_DIARIA } from '../estado/streak'
import { CONQUISTAS, CONQUISTAS_SEQUENCIA, proximaConquista } from '../estado/conquistas'
import { type Periodo, usarPeriodo } from '../estado/aparencia'
import { IconePixel } from '../componentes/IconePixel'
import { usarCronogramaHoje } from '../componentes/CaixasAssinante'
import { fraseAdiantado, textoPuxar } from '../dados/frasesAdiantar'
import { proximoDiaParaPuxar } from '../dados/planoEstudo'
import { recurso, rotuloProva } from '../config'
import { href, navegar } from '../util/rotas'
import { ConviteLimiteDoDia, DiaCumprido } from '../componentes/LimiteRespostas'
import { ConviteCompartilhar } from '../componentes/ConviteCompartilhar'
import { conviteDiarioMostradoHoje } from '../componentes/ConviteDiario'
import { lerBloqueioDiario } from '../estado/limiteDiario'
import { chaveCivil, hojeBR, somarDias } from '../util/dia'
import '../estilos/paginas/Desempenho.css'
import '../estilos/paginas/Resumo.css'

/*
 * Resultado da sessão (rota /resumo), refeito do zero em 21/11/2026 (Tales: "refazer do zero, no design padrão do
 * site, adicionando e otimizando funções"). Segue o padrão da página de Desempenho (DESIGN.md, seção "Desempenho"):
 * a pintura da biblioteca com a coruja no topo, o painel com a mensagem e os números na mesma peça, página inteira de cima a baixo,
 * sem menu lateral (Tales, 21/11/2026: "uma página inteira, como uma experiência"), seções por extenso com rótulo, pergunta e linha de apoio, e toda ação como botão.
 * Nada do que havia sumiu: entrega do Simulado Nacional, resultado da revisão, ganhos (ranking, sequência de acertos,
 * dias seguidos, emblemas, baú da meta), cronograma, diagnóstico, limite do dia, refazer erradas e incertas,
 * confiança, temas, folha, lista com filtro, metas, CSV e impressão. Novo: o tempo de cada questão em gráfico, o
 * resumo da Biblioteca que mais cobre os erros desta sessão (geral e por tema) e a lista em ordem de tempo.
 */

type Confianca = NonNullable<Resposta['confianca']>
type Situacao = 'certa' | 'errada' | 'anulada' | 'pulada'
type Filtro = 'erradas' | 'incertas' | 'todas'
type Ordem = 'sessao' | 'tempo'

interface Linha {
  numero: number
  id: string
  questao?: Questao
  resposta?: Resposta
  situacao: Situacao
  /** Treino com revisão em ordem nova: a ordem em que ela apareceu (as letras do resumo são as que a pessoa viu). */
  ordem?: string
}

const ROTULO_CONFIANCA: Record<Confianca, string> = { seguro: 'Certeza', duvida: 'Dúvida', chute: 'Chute' }
const ICONE_CONFIANCA = { seguro: 'certo', duvida: 'olho', chute: 'interrogacao' } as const
const EXTENSO = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']

/** "45 s", "4 min 20 s", "38 min", "1 h 05 min". */
function duracao(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  if (s < 60) return `${s} s`
  if (s < 600) return `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}`
  if (s < 3600) return `${Math.round(s / 60)} min`
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`
}

const faixa = (p: number) => (p >= 70 ? 'bom' : p >= 50 ? 'medio' : 'baixo')
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`
/** Contagens de questões abaixo de onze por extenso, como nas cartas (docs/emails/TOM.md). */
const questoesPorExtenso = (n: number) => `${n >= 0 && n <= 10 ? EXTENSO[n] : n.toLocaleString('pt-BR')} ${n === 1 ? 'questão' : 'questões'}`

function manchete(pct: number | null, nome: string): string {
  const voce = nome ? `, ${nome}` : ''
  if (pct === null) return 'Sessão encerrada'
  if (pct >= 85) return `Excelente${voce}!`
  if (pct >= 70) return `Muito bem${voce}!`
  if (pct >= 50) return `Bom treino${voce}.`
  return `Sessão de aprendizado${voce}.`
}

/**
 * Simulado Nacional: a prova acabou (entregue pela pessoa ou pelo relógio). Aqui só a entrega:
 * corrige no servidor e leva ao resultado na página do simulado (nota, posição, correção).
 */
function EntregaNacional({ sessao, aoEntregar }: { sessao: EstadoSessao; aoEntregar: () => void }) {
  const [estado, definirEstado] = useState<'enviando' | 'erro'>('enviando')
  const [detalhe, definirDetalhe] = useState('')
  const enviar = useCallback(() => {
    definirEstado('enviando')
    entregarSessaoNacional(sessao).then(() => aoEntregar()).catch((falha) => {
      const codigo = codigoErroSN(falha)
      definirDetalhe(codigo === 'nao_iniciado' ? 'O servidor não encontrou esta prova. Abra a página do simulado para ver a situação.' : 'Suas respostas estão guardadas neste aparelho e no servidor. Confira a conexão e tente de novo.')
      definirEstado('erro')
    })
  }, [sessao, aoEntregar])
  useEffect(() => { enviar() }, [enviar])
  return (
    <section className={`rr-entrega rr-entrega--${estado}`} role="status" aria-live="polite">
      <CorujaPixel estado={estado === 'erro' ? 'olhando' : 'voando'} className="rr-entrega__coruja" />
      <div>
        <p className="dp-rotulo"><Icone nome={estado === 'erro' ? 'alerta' : 'relogio'} tamanho={14} /> Simulado Nacional</p>
        <h1>{estado === 'erro' ? 'A entrega não chegou ao servidor' : 'Entregando a sua prova…'}</h1>
        <p>{estado === 'erro' ? detalhe : 'Corrigindo com o gabarito da edição. Em seguida, o seu resultado.'}</p>
        {estado === 'erro' && (
          <div className="rr-entrega__acoes">
            <button type="button" className="dp-botao dp-botao--principal" onClick={enviar}><Icone nome="reiniciar" tamanho={16} /> Tentar de novo</button>
            <a className="dp-botao" href={href('/simulado-nacional')}>Ir para o simulado</a>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * A letra marcada, ou null na dissertativa. Decide pelo tipo da questão, não só
 * pela letra gravada: sessões salvas antes da correção ainda têm 'A' nelas.
 */
function letraMarcada(l: { questao?: Questao | null; resposta?: Resposta | null; ordem?: string }): string | null {
  if (l.questao?.tipo === 'dissertativa') return null
  const letra = l.resposta?.escolhida ?? null
  return letra && letraExibida(l.ordem, letra)
}

/** O gabarito na letra em que a pessoa viu a questão. */
function gabaritoVisto(l: { questao?: Questao | null; ordem?: string }): string | null {
  const g = l.questao?.gabarito ?? null
  return g && letraExibida(l.ordem, g)
}

function descreverLinha(l: Linha): string {
  const incerta = l.resposta?.confianca === 'duvida' || l.resposta?.confianca === 'chute'
  if (l.situacao === 'pulada') return 'sem resposta'
  if (l.situacao === 'anulada') return 'anulada'
  return `${l.situacao}, ${letraMarcada(l) ? `marcou ${letraMarcada(l)}` : 'autoavaliada'}${l.situacao === 'errada' && l.questao?.gabarito ? `, gabarito ${gabaritoVisto(l)}` : ''}${incerta ? `, ${ROTULO_CONFIANCA[l.resposta!.confianca!].toLowerCase()}` : ''}`
}

/* A cena: a biblioteca da coruja (480 x 160 pixels de arte). No celular, o recorte do meio (de x 92 a 388). */
const ARTE = { w: 480, h: 160, movelX: 92, movelW: 296 }
const lugar = (x: number, y: number, w: number, h: number) => ({
  '--l': `${(x / ARTE.w) * 100}%`, '--lm': `${((x - ARTE.movelX) / ARTE.movelW) * 100}%`,
  '--t': `${(y / ARTE.h) * 100}%`, '--w': `${(w / ARTE.w) * 100}%`, '--wm': `${(w / ARTE.movelW) * 100}%`, '--h': `${(h / ARTE.h) * 100}%`,
}) as CSSProperties

/** A coruja na mesa da biblioteca, conferindo a folha. Lê quando a sessão pede revisão; acena quando foi bem. */
function CenaBiblioteca({ periodo, estado }: { periodo: Periodo; estado: 'lendo' | 'acenando' | 'olhando' }) {
  const arte = (sufixo: string) => recurso(`pixel/paginas/biblioteca-${periodo}${sufixo}.webp`)
  return (
    <div className="ds-palco rr-palco" aria-hidden="true">
      <img className="ds-palco__arte" src={arte('')} srcSet={`${arte('-960')} 960w, ${arte('')} 1440w`} sizes="(max-width: 76rem) 100vw, 76rem"
        width={1440} height={480} alt="" decoding="async" fetchPriority="high" draggable={false} />
      <span className="ds-palco__peca rr-palco__luz" style={lugar(262, 70, 50, 50)} />
      <span className="ds-palco__peca rr-palco__coruja" style={lugar(276, 90, 44, 32)}><CorujaPixel estado={estado} /></span>
    </div>
  )
}

export function Resumo() {
  const { indice } = usarIndice()
  const { sessao, iniciarComAviso, finalizar, encerrar } = usarSessao()
  const { sessao: conta } = usarConta()
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [marcadas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [questoes, definirQuestoes] = useState<Questao[] | null>(null)
  const [filtro, definirFiltro] = useState<Filtro | null>(null)
  const [ordem, definirOrdem] = useState<Ordem>('sessao')
  const [capitulos, definirCapitulos] = useState<CapituloResumo[]>([])
  const periodoArte = usarPeriodo()

  const ids = sessao?.ids
  useEffect(() => {
    if (!indice || !ids) return
    let vivo = true
    carregarQuestoes(indice, ids).then((lista) => vivo && definirQuestoes(lista))
    return () => {
      vivo = false
    }
  }, [indice, ids])

  // Os capítulos da Biblioteca, para indicar o resumo que mais cobre os erros desta sessão.
  useEffect(() => {
    let vivo = true
    void carregarIndiceBibliotecaLeve().catch(() => carregarIndiceBiblioteca()).then((i) => { if (vivo) definirCapitulos(i.capitulos as CapituloResumo[]) }).catch(() => undefined)
    return () => { vivo = false }
  }, [])

  const dados = useMemo(() => {
    if (!sessao || !questoes) return null
    const porId = new Map(questoes.map((q) => [q.id, q]))
    const linhas: Linha[] = sessao.ids.map((id, i) => {
      const resposta = sessao.respostas[id]
      const situacao: Situacao = !resposta ? 'pulada' : resposta.correta === null ? 'anulada' : resposta.correta ? 'certa' : 'errada'
      return { numero: i + 1, id, questao: porId.get(id), resposta, situacao, ordem: sessao.ordens?.[id] }
    })
    const respondidas = linhas.filter((l) => l.resposta)
    const validas = respondidas.filter((l) => l.situacao === 'certa' || l.situacao === 'errada')
    const certas = validas.filter((l) => l.situacao === 'certa')
    const erradas = validas.filter((l) => l.situacao === 'errada')
    const segundos = respondidas.reduce((soma, l) => soma + l.resposta!.segundos, 0)

    const porConfianca: Record<Confianca, { certas: number; total: number }> = {
      seguro: { certas: 0, total: 0 },
      duvida: { certas: 0, total: 0 },
      chute: { certas: 0, total: 0 },
    }
    for (const l of validas) {
      const grupo = porConfianca[l.resposta!.confianca ?? 'seguro']
      grupo.total++
      if (l.situacao === 'certa') grupo.certas++
    }
    const incertas = validas.filter((l) => l.resposta!.confianca === 'duvida' || l.resposta!.confianca === 'chute')
    const acertosFrageis = incertas.filter((l) => l.situacao === 'certa').length
    const falsaCerteza = erradas.filter((l) => (l.resposta!.confianca ?? 'seguro') === 'seguro').length

    const slugPorNome = new Map(indice?.temas.map((t) => [t.nome, t.slug]) ?? [])
    const porTema = new Map<string, { certas: number; total: number; slug?: string; erradas: string[] }>()
    for (const l of validas) {
      const tema = l.questao?.tema ?? 'Sem tema'
      const atual = porTema.get(tema) ?? { certas: 0, total: 0, slug: slugPorNome.get(tema), erradas: [] }
      atual.total++
      if (l.situacao === 'certa') atual.certas++
      else atual.erradas.push(l.id)
      porTema.set(tema, atual)
    }

    // O tempo: a mediana das respondidas e a mais demorada (para o gráfico e a frase de apoio).
    const tempos = respondidas.map((l) => l.resposta!.segundos).sort((a, b) => a - b)
    const mediana = tempos.length ? tempos[Math.floor((tempos.length - 1) / 2)] : 0
    const maisDemorada = respondidas.reduce<Linha | null>((m, l) => (!m || l.resposta!.segundos > m.resposta!.segundos ? l : m), null)

    return {
      linhas, respondidas, validas, certas, erradas, incertas, acertosFrageis, falsaCerteza, segundos, porConfianca, mediana, maisDemorada,
      porTema: [...porTema.entries()]
        .map(([nome, v]) => ({ nome, ...v }))
        .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR')),
    }
  }, [sessao, questoes, indice])

  // Média das sessões anteriores, para dizer se esta foi acima ou abaixo do normal.
  const mediaAnterior = useMemo(() => {
    const anteriores = historico.filter((h) => h.id !== sessao?.id)
    const respondidas = anteriores.reduce((n, h) => n + h.respondidas, 0)
    const acertos = anteriores.reduce((n, h) => n + h.acertos, 0)
    return respondidas >= 10 ? Math.round((acertos / respondidas) * 100) : null
  }, [historico, sessao?.id])

  const streak = useMemo(() => calcularStreak(marcadas), [marcadas])
  const totalConta = Object.keys(marcadas).length
  const proximoEmblema = proximaConquista(totalConta)
  const cronograma = usarCronogramaHoje()

  // O que esta sessão rendeu: pontos no ranking, maior sequência de acertos e emblemas novos.
  const ganhos = useMemo(() => {
    if (!sessao || !dados) return null
    // Questões respondidas pela primeira vez nesta sessão: são as que somam no ranking.
    const novas = sessao.ids.filter((id) => {
      const r = marcadas[id]
      const primeira = r?.historico?.[0]?.em ?? r?.q
      return !!sessao.respostas[id] && !!primeira && primeira >= sessao.criadaEm
    }).length
    let combo = 0
    let atual = 0
    for (const l of dados.linhas) {
      atual = l.situacao === 'certa' ? atual + 1 : l.situacao === 'errada' ? 0 : atual
      combo = Math.max(combo, atual)
    }
    const antes = totalConta - novas
    const emblema = [...CONQUISTAS].reverse().find((c) => antes < c.minimo && totalConta >= c.minimo) ?? null
    const emblemaSequencia = CONQUISTAS_SEQUENCIA.find((c) => c.minimo === streak.atual) ?? null
    return { novas, combo, emblema, emblemaSequencia }
  }, [sessao, dados, marcadas, totalConta, streak.atual])

  // Resumos da Biblioteca para os erros desta sessão: o que mais cobre no geral e o melhor de cada tema.
  const resumos = useMemo(() => {
    const porTema = new Map<string, ResumoIndicado>()
    if (!indice || !capitulos.length || !dados?.erradas.length) return { geral: null as ResumoIndicado | null, porTema }
    const [geral] = indicarResumos(capitulos, dados.erradas.map((l) => l.id), indice, 1)
    for (const t of dados.porTema) {
      if (!t.slug || !t.erradas.length) continue
      const [melhor] = indicarResumos(capitulos.filter((c) => c.especialidade === t.slug), t.erradas, indice, 1)
      if (melhor) porTema.set(t.nome, melhor)
    }
    return { geral: geral ?? null, porTema }
  }, [indice, capitulos, dados])

  // A prova do Simulado Nacional não tem resumo local: entrega e vai ao resultado.
  if (sessao?.nacional && sessao.concluidaEm) {
    return (
      <div className="dpg rsg rsg--so">
        <EntregaNacional sessao={sessao} aoEntregar={() => { esquecerEdicaoEmDestaque(); encerrar(); navegar('/simulado-nacional?entregue=1', true) }} />
      </div>
    )
  }

  if (!sessao) {
    return (
      <Estado
        titulo="Nenhuma sessão para resumir."
        acoes={
          <a className="botao botao--principal" href={href('/treinar')}>
            Montar uma sessão
          </a>
        }
      >
        <p>O resultado aparece quando você encerra uma sessão.</p>
      </Estado>
    )
  }

  if (!dados) return <Carregando linhas={5} rotulo="Montando o resultado" />

  const pct = dados.validas.length > 0 ? Math.round((dados.certas.length / dados.validas.length) * 100) : null
  const mediaSegundos = dados.respondidas.length > 0 ? dados.segundos / dados.respondidas.length : 0
  const nome = String(conta?.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0] ?? ''
  const titulo = manchete(pct, nome)
  const emAndamento = !sessao.concluidaEm
  const fim = sessao.concluidaEm ?? Date.now()
  const usadosSimulado = Math.round((fim - sessao.criadaEm) / 1000)
  const esgotado = !!sessao.limiteSegundos && usadosSimulado >= sessao.limiteSegundos
  const diferenca = pct !== null && mediaAnterior !== null ? pct - mediaAnterior : null
  const puladas = dados.linhas.length - dados.respondidas.length
  const quando = new Date(fim).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  const hora = new Date(fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const temaFraco = dados.porTema.filter((t) => t.slug && t.erradas.length >= 1).sort((a, b) => b.erradas.length - a.erradas.length || a.certas / a.total - b.certas / b.total)[0] ?? null
  const temaForte = dados.porTema.filter((t) => t.certas >= 2 && t.certas / t.total >= 0.7).sort((a, b) => b.certas - a.certas)[0] ?? null

  // Filtro da lista: começa nas erradas; sem erradas, nas incertas; senão, todas.
  const filtroInicial: Filtro = dados.erradas.length ? 'erradas' : dados.incertas.length ? 'incertas' : 'todas'
  const filtroAtivo = filtro ?? filtroInicial
  const filtradas = filtroAtivo === 'erradas' ? dados.erradas : filtroAtivo === 'incertas' ? dados.incertas : dados.linhas
  const visiveis = ordem === 'tempo' ? [...filtradas].sort((a, b) => (b.resposta?.segundos ?? -1) - (a.resposta?.segundos ?? -1)) : filtradas

  async function refazer(lista: Linha[]) {
    if (lista.length === 0) return
    if (!(await iniciarComAviso({ ...sessao!.filtros, embaralhar: false, limite: null }, lista.map((l) => l.id)))) return
    navegar('/sessao')
  }

  function exportar() {
    const linhas = [
      `Orto Questões — resultado da sessão`,
      `Filtro: ${descreverFiltros(sessao!.filtros)}`,
      `Data: ${new Date(fim).toLocaleString('pt-BR')}`,
      `Respondidas: ${dados!.respondidas.length} de ${sessao!.ids.length}`,
      `Acerto: ${pct === null ? '—' : pct + '%'}`,
      `Tempo médio: ${Math.round(mediaSegundos)}s por questão`,
      '',
      'numero;id;tema;ano;prova;marcada;gabarito;confianca;segundos;resultado',
      ...dados!.linhas.map((l) =>
        [
          l.numero,
          l.id,
          l.questao?.tema ?? '',
          l.questao?.ano ?? '',
          l.questao?.prova ?? '',
          letraMarcada(l) ?? '',
          gabaritoVisto(l) ?? '',
          l.resposta?.confianca ?? '',
          l.resposta?.segundos ?? '',
          { certa: 'certa', errada: 'errada', anulada: 'nao-contabilizada', pulada: 'nao-respondida' }[l.situacao],
        ].join(';'),
      ),
    ].join('\n')

    const blob = new Blob([linhas], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ortoquestoes-sessao-${sessao!.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const mostrarGanhos = sessao.origem !== 'revisao' && !emAndamento && !sessao.nacional && pct !== null && !!ganhos
  const metaCumprida = sessao.origem === 'cronograma' && !!cronograma.calculo && cronograma.calculo.metaDiaria > 0 && cronograma.calculo.feitasHoje >= cronograma.calculo.metaDiaria
  const estadoCoruja = pct !== null && pct >= 70 ? 'acenando' : emAndamento ? 'olhando' : 'lendo'
  const temConfianca = dados.validas.length > 0

  // Os passos de "O que fazer agora", do que mais rende para o que mantém o ritmo.
  const passos: Array<{ titulo: string; texto: string; acao: ReactNode }> = []
  if (emAndamento) passos.push({
    titulo: 'Voltar à sessão', texto: `${questoesPorExtenso(puladas)} ainda sem resposta.`.replace(/^./, (c) => c.toUpperCase()),
    acao: <a className="dp-botao dp-botao--principal" href={href('/sessao')}>Continuar <Icone nome="direita" tamanho={15} /></a>,
  })
  if (dados.erradas.length) passos.push({
    titulo: `Refazer ${plural(dados.erradas.length, 'errada', 'erradas')}`, texto: 'Na mesma ordem. Leia o comentário de cada uma antes: é quando o erro vira acerto na prova.',
    acao: <button type="button" className={'dp-botao' + (emAndamento ? '' : ' dp-botao--principal')} onClick={() => refazer(dados.erradas)}><Icone nome="reiniciar" tamanho={15} /> Refazer agora</button>,
  })
  if (resumos.geral) passos.push({
    titulo: `Ler ${resumos.geral.capitulo.titulo}`, texto: `O resumo da Biblioteca que mais cobre os erros de hoje. Leitura de ${resumos.geral.capitulo.minutos} minutos, antes de refazer.`,
    acao: <a className="dp-botao" href={href(`/resumos/${resumos.geral.capitulo.id}`)}><Icone nome="livro" tamanho={15} /> Ler o resumo</a>,
  })
  if (dados.incertas.length) passos.push({
    titulo: `Refazer ${plural(dados.incertas.length, 'com dúvida ou chute', 'com dúvida ou chute')}`, texto: dados.acertosFrageis ? 'Inclui os acertos sem certeza: uma passada rápida transforma dúvida em conhecimento firme.' : 'Confirme o que ficou incerto enquanto a questão está fresca.',
    acao: <button type="button" className="dp-botao" onClick={() => refazer(dados.incertas)}><Icone nome="interrogacao" tamanho={15} /> Refazer</button>,
  })
  if (temaFraco) passos.push({
    titulo: `Treinar ${temaFraco.nome}`, texto: 'Dez questões do tema que mais pediu revisão hoje, com o comentário logo depois de cada uma.',
    acao: <a className="dp-botao" href={href(`/treinar?temas=${temaFraco.slug}&limite=10`)}><Icone nome="alvo" tamanho={15} /> Treinar 10</a>,
  })
  if (!passos.length) passos.push({
    titulo: 'Seguir com uma sessão nova', texto: 'Sem erros nem dúvidas nesta sessão. Dez questões novas mantêm o ritmo.',
    acao: <a className="dp-botao dp-botao--principal" href={href('/treinar?limite=10')} onClick={() => finalizar()}>Treinar 10 <Icone nome="direita" tamanho={15} /></a>,
  })

  return (
    <article className="dpg rsg">
      <div className="dp-conteudo">
        {!emAndamento && sessao.revisao && <ResultadoRevisao sessao={sessao} registros={marcadas} />}

        {/* ---------- Topo: a cena, a manchete, a mensagem e os números, numa peça só ---------- */}
        <section className="dp-topo" id="rr-topo" aria-labelledby="rr-titulo">
          <div className={`dp-topo__cena rr-cena rr-cena--${periodoArte}`}>
            <CenaBiblioteca periodo={periodoArte} estado={estadoCoruja} />
            <div className="dp-topo__titulo">
              <p className="dp-rotulo dp-rotulo--claro">
                <Icone nome={emAndamento ? 'relogio' : sessao.simulado ? 'bandeira' : 'certo'} tamanho={14} />
                {emAndamento ? 'Sessão em andamento' : sessao.simulado ? 'Simulado entregue' : 'Sessão concluída'} · {quando}, {hora}
              </p>
              <h1 id="rr-titulo">{titulo}</h1>
              <p className="rr-filtro-sessao"><Icone nome="filtro" tamanho={13} /> {descreverFiltros(sessao.filtros)}</p>
            </div>
          </div>

          <div className="dp-topo__painel">
            <div className="dp-topo__mensagem">
              <Mensagem pct={pct} certas={dados.certas.length} validas={dados.validas.length} erradas={dados.erradas.length} forte={temaForte?.nome ?? null}
                falsaCerteza={dados.falsaCerteza} emAndamento={emAndamento} puladas={puladas} />
              <dl className="dp-numeros">
                <div className="dp-numero rr-numero--certas">
                  <dt>Certas</dt>
                  <dd><b>{dados.certas.length}</b><small>de {dados.validas.length} {dados.validas.length === 1 ? 'contabilizada' : 'contabilizadas'}</small></dd>
                </div>
                <div className="dp-numero rr-numero--erradas">
                  <dt>Erradas</dt>
                  <dd><b>{dados.erradas.length}</b><small>{dados.falsaCerteza ? `${dados.falsaCerteza} com certeza` : dados.erradas.length ? 'nenhuma com certeza' : 'gabaritou'}</small></dd>
                </div>
                <div className="dp-numero">
                  <dt>{sessao.simulado && sessao.limiteSegundos ? 'Tempo de prova' : 'Tempo'}</dt>
                  <dd>
                    <b>{sessao.simulado && sessao.limiteSegundos ? duracao(Math.min(usadosSimulado, sessao.limiteSegundos)) : duracao(dados.segundos)}</b>
                    <small>{sessao.simulado && sessao.limiteSegundos ? `de ${duracao(sessao.limiteSegundos)}${esgotado ? ' · esgotado' : ''}` : `${duracao(mediaSegundos)} por questão`}</small>
                  </dd>
                </div>
                <div className="dp-numero">
                  <dt>Sua média</dt>
                  <dd>
                    <b>{mediaAnterior === null ? '–' : `${mediaAnterior}%`}</b>
                    <small className={diferenca === null ? undefined : `rr-dif rr-dif--${diferenca > 2 ? 'acima' : diferenca < -2 ? 'abaixo' : 'igual'}`}>
                      {diferenca === null ? 'Aparece depois de 10 questões' : diferenca > 2 ? `Hoje: ${diferenca} pontos acima` : diferenca < -2 ? `Hoje: ${-diferenca} pontos abaixo` : 'Hoje: na sua média'}
                    </small>
                  </dd>
                </div>
              </dl>
              <div className="rr-topo__acoes nao-imprime">
                {emAndamento
                  ? <a className="dp-botao dp-botao--principal dp-botao--grande" href={href('/sessao')}>Voltar à sessão <Icone nome="direita" tamanho={18} /></a>
                  : dados.erradas.length
                    ? <button type="button" className="dp-botao dp-botao--principal dp-botao--grande" onClick={() => refazer(dados.erradas)}><Icone nome="reiniciar" tamanho={18} /> Refazer {plural(dados.erradas.length, 'errada', 'erradas')}</button>
                    : <a className="dp-botao dp-botao--principal dp-botao--grande" href={href('/treinar')} onClick={() => finalizar()}><Icone nome="estrela" tamanho={18} /> Nova sessão</a>}
                <a className="dp-botao dp-botao--grande" href="#rr-questoes" onClick={irPara('questoes')}><Icone nome="olho" tamanho={18} /> Revisar as questões</a>
              </div>
            </div>
            <Anel pct={pct} certas={dados.certas.length} erradas={dados.erradas.length} validas={dados.validas.length} puladas={puladas} />
          </div>

          {mostrarGanhos && ganhos && (
            <div className="rr-ganhos" aria-label="O que esta sessão rendeu">
              <p className="dp-rotulo"><Icone nome="trofeu" tamanho={14} /> O que esta sessão rendeu</p>
              <ul className="rr-ganhos__lista">
                <li><b>+{ganhos.novas.toLocaleString('pt-BR')}</b><span>{ganhos.novas === 1 ? 'ponto' : 'pontos'} no ranking</span></li>
                <li><b>{ganhos.combo}</b><span>{ganhos.combo === 1 ? 'acerto' : 'acertos'} em sequência, no máximo</span></li>
                <li><b><img src={recurso('ranking/chama.png')} width={18} height={18} alt="" /> {streak.atual}</b><span>{streak.atual === 1 ? 'dia seguido' : 'dias seguidos'} estudando</span></li>
              </ul>
              {(ganhos.emblema || ganhos.emblemaSequencia || metaCumprida) && (
                <ul className="rr-premios">
                  {ganhos.emblema && <li><Medalha conquista={ganhos.emblema} tamanho={56} /><div><span className="dp-chip dp-chip--alta">Novo emblema</span><strong>{ganhos.emblema.rotulo} desbloqueado</strong><small>{ganhos.emblema.minimo.toLocaleString('pt-BR')} questões diferentes respondidas.</small></div></li>}
                  {ganhos.emblemaSequencia && <li><Medalha conquista={ganhos.emblemaSequencia} tamanho={56} /><div><span className="dp-chip dp-chip--alta">Sequência</span><strong>{ganhos.emblemaSequencia.rotulo}</strong><small>{ganhos.emblemaSequencia.minimo} dias seguidos estudando.</small></div></li>}
                  {metaCumprida && <li><IconePixel nome="planos" tamanho={52} /><div><span className="dp-chip dp-chip--alta">Baú da meta</span><strong>Meta de hoje cumprida</strong><small>{cronograma.calculo!.feitasHoje} de {cronograma.calculo!.metaDiaria} questões do cronograma.</small></div></li>}
                </ul>
              )}
            </div>
          )}
        </section>

        {!emAndamento && sessao.origem === 'cronograma' && cronograma.calculo && !cronograma.calculo.naRetaFinal && <FimCronograma calculo={cronograma.calculo} />}
        {!emAndamento && sessao.origem === 'diagnostico' && (
          <section className="dp-cartao rr-aviso" aria-label="Diagnóstico concluído">
            <span className="rr-aviso__icone" aria-hidden="true"><Icone nome="alvo" tamanho={22} /></span>
            <div><strong>Diagnóstico concluído</strong><p>O cronograma já usou o seu resultado: as áreas em que você foi pior ganham mais espaço desde hoje. Veja o seu acerto por área e o mapa de risco no painel.</p></div>
            <a className="dp-botao dp-botao--principal" href={href('/cronograma')}>Ver o cronograma ajustado</a>
          </section>
        )}
        <DiaCumprido erradas={dados.erradas.length} />
        <ConviteLimiteDoDia />
        {/* Sessão que foi bem, sem o limite do dia na mesma tela: um convite, no máximo. */}
        <ConviteCompartilhar ativo={!emAndamento && dados.respondidas.length >= 5 && pct !== null && pct >= 60 && !lerBloqueioDiario() && !conviteDiarioMostradoHoje()} />

        <Secao id="agora" rotulo="O que fazer agora" icone="direita" titulo={nome ? `${nome}, seu próximo passo` : 'Seu próximo passo'} texto="Do que mais rende para o que mantém o ritmo. Um de cada vez já basta.">
          <div className="dp-cartao rr-agora">
            <ol className="dp-passos">
              {passos.map((p, i) => (
                <li className="dp-passo" key={p.titulo}>
                  <span className="dp-passo__n" aria-hidden="true">{i + 1}</span>
                  <div><strong>{p.titulo}</strong><span>{p.texto}</span></div>
                  {p.acao}
                </li>
              ))}
              <li className="dp-passos__fim nao-imprime">
                <a className="dp-botao dp-botao--grande" href={href('/treinar')} onClick={() => finalizar()}><Icone nome="estrela" tamanho={17} /> Nova sessão</a>
                {dados.erradas.length > 0 && <a className="dp-botao dp-botao--grande" href={href('/erros')}><Icone nome="livro" tamanho={17} /> Caderno de erros</a>}
              </li>
            </ol>
          </div>
        </Secao>

        <Secao id="folha" rotulo="Folha de respostas" icone="grafico" titulo="Como foi cada questão?" texto="Toque em um número para abrir a questão com o comentário. As barras mostram o tempo de cada uma.">
          <div className="dp-cartao">
            <ul className="rr-legenda" aria-label="Legenda">
              <li><i className="rr-ponto rr-ponto--certa" /> Certa</li>
              <li><i className="rr-ponto rr-ponto--errada" /> Errada</li>
              {puladas > 0 && <li><i className="rr-ponto rr-ponto--pulada" /> Sem resposta</li>}
              {dados.linhas.some((l) => l.situacao === 'anulada') && <li><i className="rr-ponto rr-ponto--anulada" /> Anulada</li>}
              {dados.incertas.length > 0 && <li><i className="rr-ponto rr-ponto--incerta" /> Dúvida ou chute</li>}
            </ul>
            <ol className="rr-folha">
              {dados.linhas.map((l) => {
                const incerta = l.resposta?.confianca === 'duvida' || l.resposta?.confianca === 'chute'
                const descricao = descreverLinha(l)
                return (
                  <li key={l.id}>
                    <a className={`rr-casa rr-casa--${l.situacao}${incerta ? ' rr-casa--incerta' : ''}`} href={href(`/questao/${l.id}`)} title={`Questão ${l.numero}: ${descricao}`} aria-label={`Questão ${l.numero}: ${descricao}`}>
                      {l.numero}
                    </a>
                  </li>
                )
              })}
            </ol>
            {dados.respondidas.length > 1 && <Tempos linhas={dados.linhas} mediana={dados.mediana} maisDemorada={dados.maisDemorada} />}
          </div>
        </Secao>

        {temConfianca && <div className="rr-duas">
        {(
          <Secao id="confianca" rotulo="Confiança" icone="olho" titulo="Você sabia ou chutou?" texto="O acerto separado pelo que você marcou ao responder. Erro com certeza é o mais importante de ler.">
            <div className="dp-cartao">
              <div className="rr-confianca">
                {(['seguro', 'duvida', 'chute'] as const).map((tipo) => {
                  const grupo = dados.porConfianca[tipo]
                  const p = grupo.total ? Math.round((grupo.certas / grupo.total) * 100) : 0
                  return (
                    <div className="rr-confianca__linha" key={tipo}>
                      <span className="rr-confianca__rotulo"><Icone nome={ICONE_CONFIANCA[tipo]} tamanho={16} /> {ROTULO_CONFIANCA[tipo]}</span>
                      <span className="rr-trilho"><span className={`rr-faixa--${faixa(p)}`} style={{ width: `${grupo.total ? Math.max(3, p) : 0}%` }} /></span>
                      <span className="rr-confianca__valor">
                        <b>{grupo.total ? `${grupo.certas}/${grupo.total}` : '–'}</b> <small>{grupo.total ? `${p}%` : 'nenhuma'}</small>
                      </span>
                    </div>
                  )
                })}
              </div>
              {(dados.falsaCerteza > 0 || dados.acertosFrageis > 0) && (
                <ul className="rr-alertas">
                  {dados.falsaCerteza > 0 && (
                    <li className="rr-alerta rr-alerta--erro">
                      <Icone nome="alerta" tamanho={18} />
                      <span><b>{plural(dados.falsaCerteza, 'erro com certeza', 'erros com certeza')}.</b> São os mais importantes: indicam um conceito aprendido errado. Leia o comentário antes de refazer.</span>
                    </li>
                  )}
                  {dados.acertosFrageis > 0 && (
                    <li className="rr-alerta rr-alerta--aviso">
                      <Icone nome="olho" tamanho={18} />
                      <span><b>{plural(dados.acertosFrageis, 'acerto sem certeza', 'acertos sem certeza')}.</b> Contam como certos, mas voltam mais cedo na revisão para virar conhecimento firme.</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </Secao>
        )}

        {(
          <Secao id="temas" rotulo="Temas" icone="mapa" titulo="Onde você foi melhor?" texto="Cada tema desta sessão, com o botão para treinar só ele e o resumo certo para os erros.">
            <ul className="dp-cartao rr-temas">
              {dados.porTema.map((tema) => {
                const p = Math.round((tema.certas / tema.total) * 100)
                const resumo = resumos.porTema.get(tema.nome)
                return (
                  <li key={tema.nome} className="rr-tema">
                    <div className="rr-tema__info">
                      <strong>{tema.nome}</strong>
                      <span className="rr-trilho"><span className={`rr-faixa--${faixa(p)}`} style={{ width: `${Math.max(3, p)}%` }} /></span>
                    </div>
                    <span className={`rr-tema__valor rr-texto--${faixa(p)}`}><b>{tema.certas}/{tema.total}</b><small>{p}%</small></span>
                    {(tema.slug || resumo) && (
                      <span className="rr-tema__acoes nao-imprime">
                        {resumo && <a className="dp-botao dp-botao--pequeno" href={href(`/resumos/${resumo.capitulo.id}`)} title={resumo.capitulo.titulo}><Icone nome="livro" tamanho={14} /> Resumo</a>}
                        {tema.slug && <a className="dp-botao dp-botao--pequeno" href={href(`/treinar?temas=${tema.slug}&limite=10`)}><Icone nome="alvo" tamanho={14} /> Treinar</a>}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </Secao>
        )}

        </div>}

        <Secao id="questoes" rotulo="Questões" icone="lapis" titulo="Revise as questões" texto="O que você marcou, o gabarito e quanto tempo levou. Toque para abrir com o comentário.">
          <div className="dp-cartao">
            <div className="rr-controles nao-imprime">
              <div className="ds-seg" role="group" aria-label="Mostrar">
                {([['erradas', 'Erradas', dados.erradas.length], ['incertas', 'Incertas', dados.incertas.length], ['todas', 'Todas', dados.linhas.length]] as const).map(([valor, rotulo, n]) => (
                  <button key={valor} type="button" aria-pressed={filtroAtivo === valor} onClick={() => definirFiltro(valor)}>
                    {rotulo} <span className="rr-contagem">{n}</span>
                  </button>
                ))}
              </div>
              <div className="ds-seg" role="group" aria-label="Ordem">
                <button type="button" aria-pressed={ordem === 'sessao'} onClick={() => definirOrdem('sessao')}>Na ordem</button>
                <button type="button" aria-pressed={ordem === 'tempo'} onClick={() => definirOrdem('tempo')}><Icone nome="relogio" tamanho={14} /> Mais demoradas</button>
              </div>
            </div>
            {visiveis.length === 0 ? (
              <p className="rr-vazio">
                <Icone nome={filtroAtivo === 'erradas' ? 'trofeu' : 'certo'} tamanho={20} />
                {filtroAtivo === 'erradas' ? 'Nenhuma errada nesta sessão. Gabaritou!' : 'Você respondeu tudo com certeza.'}
              </p>
            ) : (
              <ul className="rr-lista">
                {visiveis.map((l) => <ItemQuestao key={l.id} l={l} />)}
              </ul>
            )}
          </div>
        </Secao>

        <Secao id="progresso" rotulo="Seu progresso" icone="fogo" titulo="E a sua constância?" texto="A meta de hoje, o próximo emblema e o resultado guardado do seu jeito.">
          <div className="rr-progresso">
            {(streak.hojeContagem > 0 || streak.atual > 0) && (
              <div className="dp-cartao rr-marco">
                <span className="rr-marco__icone" aria-hidden="true"><img src={recurso('ranking/chama.png')} width={28} height={28} alt="" /></span>
                <div>
                  <strong>{streak.metaHojeAtingida ? `Meta de hoje batida · ${plural(streak.atual, 'dia seguido', 'dias seguidos')}` : `Faltam ${META_STREAK_DIARIA - streak.hojeContagem} para a meta de hoje`}</strong>
                  <span className="ds-medidor"><span style={{ width: `${Math.min(100, (streak.hojeContagem / META_STREAK_DIARIA) * 100)}%` }} /></span>
                  <small>{plural(streak.hojeContagem, 'questão respondida hoje', 'questões respondidas hoje')} · recorde de {plural(streak.recorde, 'dia', 'dias')}</small>
                </div>
              </div>
            )}
            {proximoEmblema && (
              <a className="dp-cartao rr-marco rr-marco--link" href={href('/ranking')}>
                <span className="rr-marco__icone" aria-hidden="true"><Medalha conquista={proximoEmblema} tamanho={40} bloqueada /></span>
                <div>
                  <strong>Faltam {plural(proximoEmblema.minimo - totalConta, 'questão', 'questões')} para {proximoEmblema.rotulo}</strong>
                  <span className="ds-medidor"><span style={{ width: `${Math.min(100, (totalConta / proximoEmblema.minimo) * 100)}%` }} /></span>
                  <small>{totalConta.toLocaleString('pt-BR')} de {proximoEmblema.minimo.toLocaleString('pt-BR')} questões diferentes</small>
                </div>
              </a>
            )}
          </div>
          <div className="rr-extras nao-imprime">
            <a className="dp-botao" href={href('/dados')}><Icone nome="grafico" tamanho={16} /> Desempenho geral</a>
            <button type="button" className="dp-botao" onClick={exportar}><Icone nome="baixar" tamanho={16} /> Exportar CSV</button>
            <button type="button" className="dp-botao" onClick={() => window.print()}><Icone nome="impressora" tamanho={16} /> Imprimir</button>
          </div>
        </Secao>
      </div>
    </article>
  )
}

function irPara(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    const alvo = document.getElementById(`rr-${id}`)
    if (!alvo) return
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    alvo.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' })
  }
}

/** Cabeça de seção: rótulo, a pergunta que ela responde e uma linha de apoio. */
function Secao({ id, rotulo, icone, titulo, texto, children }: { id: string; rotulo: string; icone: Parameters<typeof Icone>[0]['nome']; titulo: string; texto: string; children: ReactNode }) {
  return (
    <section className="dp-secao" id={`rr-${id}`} aria-labelledby={`rr-${id}-titulo`}>
      <header className="dp-secao__cabeca">
        <p className="dp-rotulo"><Icone nome={icone} tamanho={14} /> {rotulo}</p>
        <h2 id={`rr-${id}-titulo`}>{titulo}</h2>
        <p>{texto}</p>
      </header>
      {children}
    </section>
  )
}

/** A mensagem do topo, com os números em destaque e o tom das cartas: dado real, sem número ruim em destaque. */
function Mensagem({ pct, certas, validas, erradas, forte, falsaCerteza, emAndamento, puladas }: {
  pct: number | null; certas: number; validas: number; erradas: number; forte: string | null; falsaCerteza: number; emAndamento: boolean; puladas: number
}) {
  if (emAndamento) return <p className="dp-mensagem">A sessão ainda está aberta: <b>{questoesPorExtenso(puladas)}</b> {puladas === 1 ? 'espera' : 'esperam'} resposta. O resultado abaixo já conta o que você respondeu.</p>
  if (pct === null) return <p className="dp-mensagem">Nenhuma questão contabilizada desta vez. <b>Dez questões</b> já bastam para este resultado mostrar onde você está.</p>
  const abertura = pct >= 85 ? <>Desempenho de quem domina o assunto: <b>{certas} de {validas}</b> certas.</>
    : pct >= 70 ? <>Resultado sólido: <b>{certas} de {validas}</b> certas.</>
      : pct >= 50 ? <>Você está no caminho, com <b>{certas} de {validas}</b> certas.</>
        : <>Errar aqui é o que evita errar na prova.</>
  return (
    <p className="dp-mensagem">
      {abertura}
      {forte && <> Seu terreno mais firme hoje foi <b>{forte}</b>.</>}
      {erradas > 0 && (falsaCerteza > 0
        ? <> Comece pelos <b>{falsaCerteza === 1 ? 'um erro' : `${falsaCerteza} erros`} com certeza</b>: são os que mais ensinam.</>
        : <> Os erros de hoje viram as revisões de amanhã: leia os comentários com calma e refaça.</>)}
      {erradas === 0 && validas > 0 && <> Nenhum erro: aproveite para confirmar os acertos que vieram com dúvida.</>}
    </p>
  )
}

/** O anel de acerto, dividido em certas, erradas e sem resposta, com a legenda em texto. */
function Anel({ pct, certas, erradas, validas, puladas }: { pct: number | null; certas: number; erradas: number; validas: number; puladas: number }) {
  const total = certas + erradas + puladas
  const r = 52
  const c = 2 * Math.PI * r
  const arco = (n: number) => (total ? (n / total) * c : 0)
  const fatias = [
    { n: certas, classe: 'rr-anel__certas' },
    { n: erradas, classe: 'rr-anel__erradas' },
    { n: puladas, classe: 'rr-anel__puladas' },
  ]
  let deslocamento = 0
  return (
    <div className="rr-anel">
      <p className="dp-nota__titulo"><span className="dp-nota__icone" aria-hidden="true"><Icone nome="alvo" tamanho={16} /></span> Acerto da sessão</p>
      <div className="rr-anel__grafico" role="img" aria-label={pct === null ? 'Sem questões contabilizadas' : `${pct}% de acerto: ${certas} certas e ${erradas} erradas${puladas ? `, ${puladas} sem resposta` : ''}`}>
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle className="rr-anel__trilho" cx="64" cy="64" r={r} />
          {fatias.map((f) => {
            if (!f.n) return null
            const tamanho = arco(f.n)
            const el = <circle key={f.classe} className={f.classe} cx="64" cy="64" r={r} strokeDasharray={`${Math.max(0, tamanho - 2)} ${c}`} strokeDashoffset={-deslocamento} transform="rotate(-90 64 64)" />
            deslocamento += tamanho
            return el
          })}
        </svg>
        <span className="rr-anel__valor"><b>{pct === null ? '–' : `${pct}%`}</b><small>{validas ? `${certas} de ${validas}` : 'sem respostas'}</small></span>
      </div>
      <ul className="rr-anel__legenda">
        <li><i className="rr-ponto rr-ponto--certa" /> {plural(certas, 'certa', 'certas')}</li>
        <li><i className="rr-ponto rr-ponto--errada" /> {plural(erradas, 'errada', 'erradas')}</li>
        {puladas > 0 && <li><i className="rr-ponto rr-ponto--pulada" /> {plural(puladas, 'sem resposta', 'sem resposta')}</li>}
      </ul>
    </div>
  )
}

/** O tempo de cada questão: uma barra por questão, na cor do resultado, com a mediana como linha de referência. */
function Tempos({ linhas, mediana, maisDemorada }: { linhas: Linha[]; mediana: number; maisDemorada: Linha | null }) {
  const maximo = Math.max(1, ...linhas.map((l) => l.resposta?.segundos ?? 0))
  const lentas = linhas.filter((l) => (l.resposta?.segundos ?? 0) > Math.max(mediana * 2, 30)).length
  return (
    <figure className="rr-tempos">
      <figcaption>
        <strong>Tempo por questão</strong>
        <span>
          Mediana de <b>{duracao(mediana)}</b>
          {maisDemorada && maisDemorada.resposta!.segundos > mediana && <> · a mais demorada foi a <b>{maisDemorada.numero}</b> ({duracao(maisDemorada.resposta!.segundos)})</>}
          {lentas > 0 && <> · {lentas === 1 ? 'uma levou' : `${lentas} levaram`} mais que o dobro</>}
        </span>
      </figcaption>
      <div className="rr-tempos__grafico" style={{ '--mediana': `${(mediana / maximo) * 100}%` } as CSSProperties}>
        <span className="rr-tempos__mediana" aria-hidden="true" />
        <ol>
          {linhas.map((l) => (
            <li key={l.id}>
              <a href={href(`/questao/${l.id}`)} className={`rr-tempos__barra rr-tempos__barra--${l.situacao}`} style={{ '--altura': `${l.resposta ? Math.max(4, (l.resposta.segundos / maximo) * 100) : 0}%` } as CSSProperties}
                title={`Questão ${l.numero}: ${l.resposta ? duracao(l.resposta.segundos) : 'sem resposta'}`} aria-label={`Questão ${l.numero}: ${l.resposta ? duracao(l.resposta.segundos) : 'sem resposta'}, ${descreverLinha(l)}`}>
                <i />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  )
}

function ItemQuestao({ l }: { l: Linha }) {
  const q = l.questao
  const r = l.resposta
  const enunciado = q?.enunciado ?? ''
  return (
    <li>
      <a className={`rr-item rr-item--${l.situacao}`} href={href(`/questao/${l.id}`)}>
        <span className="rr-item__numero">{l.numero}</span>
        <span className="rr-item__corpo">
          <span className="rr-item__meta">{q?.tema ?? 'Questão'}{q?.prova ? ` · ${rotuloProva(q.prova)}` : ''}{q?.ano ? ` ${q.ano}` : ''}</span>
          <span className="rr-item__enunciado">{enunciado.slice(0, 180)}{enunciado.length > 180 ? '…' : ''}</span>
          <span className="rr-item__chips">
            {l.situacao === 'pulada' ? (
              <span className="rr-chip">Sem resposta</span>
            ) : l.situacao === 'anulada' ? (
              <span className="rr-chip">Anulada{letraMarcada(l) ? ` · marcou ${letraMarcada(l)}` : ''}</span>
            ) : (
              <>
                <span className={`rr-chip rr-chip--${l.situacao}`}>
                  <Icone nome={l.situacao === 'certa' ? 'certo' : 'errado'} tamanho={13} /> {letraMarcada(l) ? `Marcou ${letraMarcada(l)}` : l.situacao === 'certa' ? 'Acertou (autoavaliação)' : 'Errou (autoavaliação)'}
                </span>
                {l.situacao === 'errada' && q?.gabarito && <span className="rr-chip rr-chip--gabarito">Gabarito {gabaritoVisto(l)}</span>}
              </>
            )}
            {r?.confianca && r.confianca !== 'seguro' && (
              <span className="rr-chip rr-chip--aviso"><Icone nome={ICONE_CONFIANCA[r.confianca]} tamanho={13} /> {ROTULO_CONFIANCA[r.confianca]}</span>
            )}
            {r && <span className="rr-chip"><Icone nome="relogio" tamanho={13} /> {duracao(r.segundos)}</span>}
          </span>
        </span>
        <span className="rr-item__abrir" aria-hidden="true">Abrir <Icone nome="direita" tamanho={16} /></span>
      </a>
    </li>
  )
}

/**
 * Fim de uma sessão do cronograma (reforma de 14/10/2026): diz se a meta de
 * hoje foi feita, o que ainda falta hoje e o que vem amanhã, com um botão só.
 */
function FimCronograma({ calculo }: { calculo: NonNullable<ReturnType<typeof usarCronogramaHoje>['calculo']> }) {
  const feita = calculo.metaDiaria > 0 && calculo.feitasHoje >= calculo.metaDiaria
  const adiantando = Math.max(calculo.extraHoje, calculo.adiantarPedido)
  const amanha = calculo.amanha
  const nomesAmanha = amanha ? [...new Set(amanha.itens.map((i) => i.nome))].join(' e ') : ''
  const quandoAmanha = amanha ? amanha.data.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '') : ''
  // Meta feita: o botão puxa o próximo dia de estudo direto (pedido do Tales, 19/10/2026).
  const proximo = feita ? proximoDiaParaPuxar(calculo) : null
  const puxar = proximo ? textoPuxar(proximo) : null
  const progresso = calculo.metaDiaria > 0 ? Math.min(100, (calculo.feitasHoje / calculo.metaDiaria) * 100) : 0
  return (
    <section className={'dp-cartao rr-cronograma' + (feita ? ' rr-cronograma--feita' : '')} aria-labelledby="rr-cron-titulo">
      <span className="rr-cronograma__selo" aria-hidden="true">{feita ? <Icone nome="certo" tamanho={26} /> : <b>{calculo.faltaHoje}</b>}</span>
      <div className="rr-cronograma__texto">
        <p className="dp-rotulo"><Icone nome="calendario" tamanho={14} /> Cronograma</p>
        <h2 id="rr-cron-titulo">{feita ? 'Meta de hoje feita' : `Faltam ${calculo.faltaHoje} para a meta de hoje`}</h2>
        <span className="ds-medidor"><span style={{ width: `${progresso}%` }} /></span>
        <p>{Math.min(calculo.feitasHoje, calculo.metaDiaria)} de {calculo.metaDiaria} questões novas do cronograma hoje{adiantando > 0 ? <>, e <b>+{adiantando} adiantadas</b></> : null}.</p>
        <p>
          {fraseAdiantado(calculo) && <><b>{fraseAdiantado(calculo)}</b> </>}
          {feita ? <>Pronto por hoje. Se quiser, <b>puxe as questões do próximo dia</b>: o que fizer conta para ele, e o resto continua lá. Revisões e flashcards são extras.</> : <>Continue de onde parou: as próximas questões já estão separadas.</>}
          {amanha && <> {chaveCivil(amanha.data) === somarDias(hojeBR(), 1) ? 'Amanhã' : `Na ${quandoAmanha}`}: {amanha.total === 0 && amanha.adiantado > 0 ? <b>livre, você já adiantou</b> : <><b>{nomesAmanha || 'mini-simulado'}</b>, {amanha.total} questões{amanha.adiantado > 0 ? ` (eram ${amanha.total + amanha.adiantado})` : ''}{amanha.mini ? ' e o mini-simulado' : ''}</>}.</>}
        </p>
      </div>
      <div className="rr-cronograma__acoes">
        <a className="dp-botao dp-botao--principal dp-botao--grande" href={href(proximo ? `/cronograma?puxar=${chaveCivil(proximo.data)}` : feita ? '/cronograma?adiantar=1' : '/cronograma')}>{puxar ? `${puxar.rotulo} · ${puxar.detalhe}` : feita ? 'Adiantar o próximo dia' : 'Continuar o cronograma'}</a>
        {feita && <a className="dp-botao" href={href('/cronograma')}>Voltar ao cronograma</a>}
        {feita && <a className="dp-botao" href={href('/revisao')}>Revisões (opcional)</a>}
      </div>
    </section>
  )
}
