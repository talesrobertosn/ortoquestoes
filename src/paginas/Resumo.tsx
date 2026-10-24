import { letraExibida } from '../dados/ordemAlternativas'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import type { EstadoSessao, Questao, Resposta } from '../dados/tipos'
import { entregarSessaoNacional } from '../dados/entregaNacional'
import { codigoErroSN } from '../dados/apiSimuladoNacional'
import { esquecerEdicaoEmDestaque } from '../dados/nacionalEmDestaque'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Medalha } from '../componentes/Medalha'
import { usarConta } from '../conta/ContextoConta'
import { type ResumoHistorico, descreverFiltros, usarSessao } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { calcularStreak, META_STREAK_DIARIA } from '../estado/streak'
import { CONQUISTAS, CONQUISTAS_SEQUENCIA, proximaConquista } from '../estado/conquistas'
import { IconePixel } from '../componentes/IconePixel'
import { usarCronogramaHoje } from '../componentes/CaixasAssinante'
import { fraseAdiantado, textoPuxar } from '../dados/frasesAdiantar'
import { proximoDiaParaPuxar } from '../dados/planoEstudo'
import { recurso } from '../config'
import { href, navegar } from '../util/rotas'
import { ConviteLimiteDoDia, DiaCumprido } from '../componentes/LimiteRespostas'
import { ConviteCompartilhar } from '../componentes/ConviteCompartilhar'
import { conviteDiarioMostradoHoje } from '../componentes/ConviteDiario'
import { lerBloqueioDiario } from '../estado/limiteDiario'
import { chaveCivil, hojeBR, somarDias } from '../util/dia'
import '../estilos/componentes/EsperaPixel.css'
import '../estilos/paginas/Resumo.css'

type Confianca = NonNullable<Resposta['confianca']>
type Situacao = 'certa' | 'errada' | 'anulada' | 'pulada'
type Filtro = 'erradas' | 'incertas' | 'todas'

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

function manchete(pct: number | null, nome: string): { titulo: string; texto: string } {
  const voce = nome ? `, ${nome}` : ''
  if (pct === null) return { titulo: 'Sessão encerrada', texto: 'Nenhuma questão contabilizada desta vez. Que tal uma sessão curta agora?' }
  if (pct >= 85) return { titulo: `Excelente${voce}!`, texto: 'Desempenho de quem domina o assunto. Aproveite para confirmar os acertos que vieram com dúvida.' }
  if (pct >= 70) return { titulo: `Muito bem${voce}!`, texto: 'Resultado sólido. Revise os erros abaixo enquanto a questão ainda está fresca na memória.' }
  if (pct >= 50) return { titulo: `Bom treino${voce}.`, texto: 'Você está no caminho. Os erros de hoje viram as revisões de amanhã — é assim que a porcentagem sobe.' }
  return { titulo: `Sessão de aprendizado${voce}.`, texto: 'Errar aqui é o que evita errar na prova. Leia os comentários das erradas com calma e refaça em seguida.' }
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
    <section className={`sn-entrega sn-entrega--${estado}`} role="status" aria-live="polite">
      <Icone nome={estado === 'erro' ? 'alerta' : 'relogio'} tamanho={22} />
      <div>
        <strong>{estado === 'erro' ? 'A entrega não chegou ao servidor' : 'Entregando o Simulado Nacional…'}</strong>
        <span>{estado === 'erro' ? detalhe : 'Corrigindo com o gabarito da edição. Em seguida, o seu resultado.'}</span>
      </div>
      {estado === 'erro' && <button type="button" className="botao" onClick={enviar}>Tentar de novo</button>}
      {estado === 'erro' && <a className="botao botao--fantasma" href={href('/simulado-nacional')}>Ir para o simulado</a>}
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

export function Resumo() {
  const { indice } = usarIndice()
  const { sessao, iniciarComAviso, finalizar, encerrar } = usarSessao()
  const { sessao: conta } = usarConta()
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [marcadas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [questoes, definirQuestoes] = useState<Questao[] | null>(null)
  const [filtro, definirFiltro] = useState<Filtro | null>(null)

  const ids = sessao?.ids
  useEffect(() => {
    if (!indice || !ids) return
    let vivo = true
    carregarQuestoes(indice, ids).then((lista) => vivo && definirQuestoes(lista))
    return () => {
      vivo = false
    }
  }, [indice, ids])

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
    const porTema = new Map<string, { certas: number; total: number; slug?: string }>()
    for (const l of validas) {
      const tema = l.questao?.tema ?? 'Sem tema'
      const atual = porTema.get(tema) ?? { certas: 0, total: 0, slug: slugPorNome.get(tema) }
      atual.total++
      if (l.situacao === 'certa') atual.certas++
      porTema.set(tema, atual)
    }

    return {
      linhas,
      respondidas,
      validas,
      certas,
      erradas,
      incertas,
      acertosFrageis,
      falsaCerteza,
      segundos,
      porConfianca,
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

  // Fim de batalha (temporada RPG): o que esta sessão rendeu de recompensa.
  const batalha = useMemo(() => {
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

  // A prova do Simulado Nacional não tem resumo local: entrega e vai ao resultado.
  if (sessao?.nacional && sessao.concluidaEm) {
    return (
      <div className="empilha-2 rs">
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
        <p>O resumo aparece quando você encerra uma sessão.</p>
      </Estado>
    )
  }

  if (!dados) return <Carregando linhas={5} rotulo="Montando o resumo" />

  const pct = dados.validas.length > 0 ? Math.round((dados.certas.length / dados.validas.length) * 100) : null
  const mediaSegundos = dados.respondidas.length > 0 ? dados.segundos / dados.respondidas.length : 0
  const nome = String(conta?.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0] ?? ''
  const { titulo, texto } = manchete(pct, nome)
  const emAndamento = !sessao.concluidaEm
  const fim = sessao.concluidaEm ?? Date.now()
  const usadosSimulado = Math.round((fim - sessao.criadaEm) / 1000)
  const esgotado = !!sessao.limiteSegundos && usadosSimulado >= sessao.limiteSegundos
  const diferenca = pct !== null && mediaAnterior !== null ? pct - mediaAnterior : null
  const perimetro = 2 * Math.PI * 52
  const puladas = dados.linhas.length - dados.respondidas.length

  // Filtro da lista: começa nas erradas; sem erradas, nas incertas; senão, todas.
  const filtroInicial: Filtro = dados.erradas.length ? 'erradas' : dados.incertas.length ? 'incertas' : 'todas'
  const filtroAtivo = filtro ?? filtroInicial
  const visiveis =
    filtroAtivo === 'erradas' ? dados.erradas : filtroAtivo === 'incertas' ? dados.incertas : dados.linhas

  async function refazer(lista: Linha[]) {
    if (lista.length === 0) return
    if (!(await iniciarComAviso({ ...sessao!.filtros, embaralhar: false, limite: null }, lista.map((l) => l.id)))) return
    navegar('/sessao')
  }

  function exportar() {
    const linhas = [
      `Orto Questões — resumo de sessão`,
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

  const mostrarBatalha = !emAndamento && !sessao.nacional && pct !== null && !!batalha
  const metaCumprida = sessao.origem === 'cronograma' && !!cronograma.calculo && cronograma.calculo.metaDiaria > 0 && cronograma.calculo.feitasHoje >= cronograma.calculo.metaDiaria
  const quando = new Date(fim).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  const hora = new Date(fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <article className="empilha-2 rs">
      <section className="rs-heroi">
        {mostrarBatalha && <span className="rs-tochas" aria-hidden="true"><img src={recurso('ranking/tocha.png')} width={24} height={48} alt="" /><img src={recurso('ranking/tocha.png')} width={24} height={48} alt="" /></span>}
        {mostrarBatalha && <span className="espera-pixel__guerreiro rs-guerreiro" aria-hidden="true" style={{ backgroundImage: `url(${recurso('ranking/guerreiro.png')})` }} />}
        {mostrarBatalha && <p className="rs-batalha__grito">{pct! >= 70 ? 'Vitória!' : pct! >= 50 ? 'Boa batalha!' : 'Batalha difícil'}</p>}
        <div className="rs-heroi__texto">
          <p className="rs-heroi__selo">
            <Icone nome={emAndamento ? 'relogio' : sessao.simulado ? 'bandeira' : 'certo'} tamanho={16} />
            {emAndamento ? 'Sessão em andamento' : sessao.simulado ? 'Simulado entregue' : 'Sessão concluída'} · {quando}, {hora}
          </p>
          <h1>{titulo}</h1>
          <p>{texto}</p>
          <p className="rs-heroi__filtro">
            <Icone nome="filtro" tamanho={14} /> {descreverFiltros(sessao.filtros)}
          </p>
          {diferenca !== null && (
            <p className={`rs-comparacao rs-comparacao--${diferenca > 2 ? 'acima' : diferenca < -2 ? 'abaixo' : 'igual'}`}>
              <Icone nome={diferenca > 2 ? 'cima' : diferenca < -2 ? 'baixo' : 'alvo'} tamanho={14} />
              {diferenca > 2
                ? `${diferenca} pontos acima da sua média (${mediaAnterior}%)`
                : diferenca < -2
                  ? `${-diferenca} pontos abaixo da sua média (${mediaAnterior}%)`
                  : `Na sua média de ${mediaAnterior}%`}
            </p>
          )}
        </div>
        <div className="rs-anel" aria-label={pct === null ? 'Sem questões contabilizadas' : `${pct}% de acerto`}>
          <svg viewBox="0 0 120 120" width="176" height="176" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" />
            {pct !== null && pct > 0 && (
              <circle cx="60" cy="60" r="52" fill="none" stroke="#ffe3a3" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * perimetro} ${perimetro}`} transform="rotate(-90 60 60)" />
            )}
          </svg>
          <span className="rs-anel__valor">
            <strong>{pct === null ? '—' : `${pct}%`}</strong>
            <small>{dados.certas.length} de {dados.validas.length} certas</small>
          </span>
        </div>
        <dl className="rs-heroi__numeros">
          <div>
            <dt><Icone nome="certo" tamanho={14} /> Certas</dt>
            <dd>{dados.certas.length}</dd>
          </div>
          <div>
            <dt><Icone nome="errado" tamanho={14} /> Erradas</dt>
            <dd>{dados.erradas.length}</dd>
          </div>
          <div>
            <dt><Icone nome="relogio" tamanho={14} /> {sessao.simulado && sessao.limiteSegundos ? 'Tempo de prova' : 'Tempo total'}</dt>
            <dd>
              {sessao.simulado && sessao.limiteSegundos ? duracao(Math.min(usadosSimulado, sessao.limiteSegundos)) : duracao(dados.segundos)}
              {sessao.simulado && sessao.limiteSegundos ? <small> de {duracao(sessao.limiteSegundos)}{esgotado ? ' · esgotado' : ''}</small> : null}
            </dd>
          </div>
          <div>
            <dt><Icone nome="raio" tamanho={14} /> Por questão</dt>
            <dd>{duracao(mediaSegundos)}</dd>
          </div>
        </dl>
      </section>

      {mostrarBatalha && batalha && <section className="rs-batalha" aria-label="O que esta sessão rendeu">
        <div className="rs-ganhos">
          <div className="rs-ganho"><b>+{batalha.novas}</b><span>{batalha.novas === 1 ? 'ponto' : 'pontos'} no ranking</span></div>
          <div className="rs-ganho"><b>{batalha.combo}</b><span>maior combo de acertos</span></div>
          <div className="rs-ganho"><b><img src={recurso('ranking/chama.png')} width={18} height={18} alt="" /> {streak.atual}</b><span>{streak.atual === 1 ? 'dia seguido' : 'dias seguidos'}</span></div>
        </div>
        {batalha.emblema && <div className="rs-loot"><Medalha conquista={batalha.emblema} tamanho={64} /><div><span className="rs-loot__tag">Novo emblema</span><strong>{batalha.emblema.rotulo} desbloqueado</strong><small>{batalha.emblema.minimo.toLocaleString('pt-BR')} questões diferentes respondidas.</small></div></div>}
        {batalha.emblemaSequencia && <div className="rs-loot"><Medalha conquista={batalha.emblemaSequencia} tamanho={64} /><div><span className="rs-loot__tag">Sequência</span><strong>{batalha.emblemaSequencia.rotulo}</strong><small>{batalha.emblemaSequencia.minimo} dias seguidos estudando.</small></div></div>}
        {metaCumprida && <div className="rs-loot"><IconePixel nome="planos" tamanho={56} /><div><span className="rs-loot__tag">Baú da meta</span><strong>Meta de hoje cumprida</strong><small>{cronograma.calculo!.feitasHoje} de {cronograma.calculo!.metaDiaria} questões do cronograma.</small></div></div>}
      </section>}

      {!emAndamento && sessao.origem === 'cronograma' && cronograma.calculo && !cronograma.calculo.naRetaFinal && <FimCronograma calculo={cronograma.calculo} />}
      {!emAndamento && sessao.origem === 'diagnostico' && (
        <section className="cartao cartao__corpo rs-diagnostico" aria-label="Diagnóstico concluído">
          <div><strong>Diagnóstico concluído</strong><p className="texto-2">O cronograma já usou o seu resultado: as áreas em que você foi pior ganham mais espaço desde hoje. Veja o seu acerto por área e o mapa de risco no painel.</p></div>
          <a className="botao botao--principal" href={href('/cronograma')}>Ver o cronograma ajustado</a>
        </section>
      )}
      <DiaCumprido erradas={dados.erradas.length} />
      <ConviteLimiteDoDia />
      {/* Sessão que foi bem, sem o limite do dia na mesma tela: um convite, no máximo. */}
      <ConviteCompartilhar ativo={!emAndamento && dados.respondidas.length >= 5 && pct !== null && pct >= 60 && !lerBloqueioDiario() && !conviteDiarioMostradoHoje()} />

      <section className="rs-acoes nao-imprime" aria-label="Próximos passos">
        {emAndamento && (
          <a className="rs-acao rs-acao--principal" href={href('/sessao')}>
            <span className="rs-acao__icone"><Icone nome="direita" tamanho={20} /></span>
            <span><strong>Voltar à sessão</strong><small>{plural(puladas, 'questão ainda sem resposta', 'questões ainda sem resposta')}</small></span>
          </a>
        )}
        <button type="button" className={'rs-acao' + (!emAndamento ? ' rs-acao--principal' : '')} onClick={() => refazer(dados.erradas)} disabled={dados.erradas.length === 0}>
          <span className="rs-acao__icone"><Icone nome="reiniciar" tamanho={20} /></span>
          <span>
            <strong>{dados.erradas.length ? `Refazer ${plural(dados.erradas.length, 'errada', 'erradas')}` : 'Nenhuma errada'}</strong>
            <small>{dados.erradas.length ? 'Na mesma ordem, logo depois de ler os comentários' : 'Nada para refazer nesta sessão'}</small>
          </span>
        </button>
        <button type="button" className="rs-acao" onClick={() => refazer(dados.incertas)} disabled={dados.incertas.length === 0}>
          <span className="rs-acao__icone rs-acao__icone--aviso"><Icone nome="interrogacao" tamanho={20} /></span>
          <span>
            <strong>{dados.incertas.length ? `Refazer ${plural(dados.incertas.length, 'com dúvida', 'com dúvida ou chute')}` : 'Sem dúvidas nem chutes'}</strong>
            <small>{dados.incertas.length ? 'Confirme o que acertou sem ter certeza' : 'Você respondeu tudo com convicção'}</small>
          </span>
        </button>
        <a className="rs-acao" href={href('/treinar')} onClick={() => finalizar()}>
          <span className="rs-acao__icone rs-acao__icone--neutro"><Icone nome="estrela" tamanho={20} /></span>
          <span><strong>Nova sessão</strong><small>Montar outro treino</small></span>
        </a>
      </section>

      {dados.validas.length > 0 && (
        <div className="rs-duas">
          <section className="cartao cartao__corpo rs-cartao">
            <div className="rs-cartao__cabeca">
              <h2>Sua confiança nesta sessão</h2>
              <p className="texto-2">Acerto separado pelo que você marcou ao responder.</p>
            </div>
            <div className="dp-confianca">
              {(['seguro', 'duvida', 'chute'] as const).map((tipo) => {
                const grupo = dados.porConfianca[tipo]
                const p = grupo.total ? Math.round((grupo.certas / grupo.total) * 100) : 0
                return (
                  <div className="dp-confianca__linha" key={tipo}>
                    <span className="dp-confianca__rotulo"><Icone nome={ICONE_CONFIANCA[tipo]} tamanho={16} /> {ROTULO_CONFIANCA[tipo]}</span>
                    <span className="dp-confianca__trilho"><span className={`dp-faixa--${faixa(p)}`} style={{ width: `${grupo.total ? Math.max(3, p) : 0}%` }} /></span>
                    <span className="dp-confianca__valor">
                      <strong>{grupo.total ? `${grupo.certas}/${grupo.total}` : '–'}</strong>{' '}
                      <small>{grupo.total ? `${p}%` : 'nenhuma'}</small>
                    </span>
                  </div>
                )
              })}
            </div>
            {(dados.falsaCerteza > 0 || dados.acertosFrageis > 0) && (
              <ul className="rs-alertas">
                {dados.falsaCerteza > 0 && (
                  <li className="rs-alerta rs-alerta--erro">
                    <Icone nome="alerta" tamanho={16} />
                    <span><strong>{plural(dados.falsaCerteza, 'erro com certeza', 'erros com certeza')}.</strong> São os mais importantes: indicam um conceito aprendido errado. Leia o comentário antes de refazer.</span>
                  </li>
                )}
                {dados.acertosFrageis > 0 && (
                  <li className="rs-alerta rs-alerta--aviso">
                    <Icone nome="olho" tamanho={16} />
                    <span><strong>{plural(dados.acertosFrageis, 'acerto sem certeza', 'acertos sem certeza')}.</strong> Contam como certos, mas voltam mais cedo na revisão para virar conhecimento firme.</span>
                  </li>
                )}
              </ul>
            )}
          </section>

          <section className="cartao cartao__corpo rs-cartao">
            <div className="rs-cartao__cabeca">
              <h2>Por tema</h2>
              <p className="texto-2">Toque em um tema para treinar só ele.</p>
            </div>
            <ul className="rs-temas">
              {dados.porTema.map((tema) => {
                const p = Math.round((tema.certas / tema.total) * 100)
                const conteudo = (
                  <>
                    <span className="rs-tema__nome">{tema.nome}</span>
                    <span className={`rs-tema__valor dp-texto--${faixa(p)}`}>{tema.certas}/{tema.total}</span>
                    <span className="dp-tema__trilho rs-tema__trilho"><span className={`dp-faixa--${faixa(p)}`} style={{ width: `${Math.max(3, p)}%` }} /></span>
                  </>
                )
                return (
                  <li key={tema.nome}>
                    {tema.slug ? <a className="rs-tema" href={href(`/treinar?temas=${tema.slug}&limite=10`)}>{conteudo}</a> : <span className="rs-tema">{conteudo}</span>}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      <section className="cartao cartao__corpo rs-cartao">
        <div className="rs-cartao__cabeca rs-cartao__cabeca--linha">
          <div>
            <h2>Folha de respostas</h2>
            <p className="texto-2">Toque em um número para abrir a questão com o comentário.</p>
          </div>
          <ul className="rs-legenda" aria-label="Legenda">
            <li><i className="rs-bolinha rs-bolinha--certa" /> Certa</li>
            <li><i className="rs-bolinha rs-bolinha--errada" /> Errada</li>
            {puladas > 0 && <li><i className="rs-bolinha rs-bolinha--pulada" /> Sem resposta</li>}
            {dados.incertas.length > 0 && <li><i className="rs-bolinha rs-bolinha--incerta" /> Dúvida ou chute</li>}
          </ul>
        </div>
        <ol className="rs-folha">
          {dados.linhas.map((l) => {
            const incerta = l.resposta?.confianca === 'duvida' || l.resposta?.confianca === 'chute'
            const descricao =
              l.situacao === 'pulada' ? 'sem resposta'
                : l.situacao === 'anulada' ? 'anulada'
                  : `${l.situacao}, ${letraMarcada(l) ? `marcou ${letraMarcada(l)}` : 'autoavaliada'}${l.situacao === 'errada' && l.questao?.gabarito ? `, gabarito ${gabaritoVisto(l)}` : ''}${incerta ? `, ${ROTULO_CONFIANCA[l.resposta!.confianca!].toLowerCase()}` : ''}`
            return (
              <li key={l.id}>
                <a className={`rs-casa rs-casa--${l.situacao}${incerta ? ' rs-casa--incerta' : ''}`} href={href(`/questao/${l.id}`)} title={`Questão ${l.numero}: ${descricao}`} aria-label={`Questão ${l.numero}: ${descricao}`}>
                  {l.numero}
                </a>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="cartao cartao__corpo rs-cartao">
        <div className="rs-cartao__cabeca rs-cartao__cabeca--linha">
          <div>
            <h2>Revise as questões</h2>
            <p className="texto-2">O que você marcou, o gabarito e quanto tempo levou.</p>
          </div>
          <div className="ct-seg rs-filtro nao-imprime" role="group" aria-label="Mostrar">
            {([['erradas', 'Erradas', dados.erradas.length], ['incertas', 'Incertas', dados.incertas.length], ['todas', 'Todas', dados.linhas.length]] as const).map(([valor, rotulo, n]) => (
              <button key={valor} type="button" aria-pressed={filtroAtivo === valor} onClick={() => definirFiltro(valor)}>
                {rotulo} <span className="rs-filtro__n">{n}</span>
              </button>
            ))}
          </div>
        </div>
        {visiveis.length === 0 ? (
          <p className="rs-vazio">
            <Icone nome={filtroAtivo === 'erradas' ? 'trofeu' : 'certo'} tamanho={20} />
            {filtroAtivo === 'erradas' ? 'Nenhuma errada nesta sessão. Gabaritou!' : 'Você respondeu tudo com certeza.'}
          </p>
        ) : (
          <ul className="rs-lista">
            {visiveis.map((l) => {
              const q = l.questao
              const r = l.resposta
              const enunciado = q?.enunciado ?? ''
              return (
                <li key={l.id}>
                  <a className={`rs-item rs-item--${l.situacao}`} href={href(`/questao/${l.id}`)}>
                    <span className="rs-item__numero">{l.numero}</span>
                    <span className="rs-item__corpo">
                      <span className="rs-item__meta">
                        {q?.tema ?? 'Questão'}{q?.prova ? ` · ${q.prova}` : ''}{q?.ano ? ` ${q.ano}` : ''}
                      </span>
                      <span className="rs-item__enunciado">{enunciado.slice(0, 160)}{enunciado.length > 160 ? '…' : ''}</span>
                      <span className="rs-item__chips">
                        {l.situacao === 'pulada' ? (
                          <span className="rs-chip">Sem resposta</span>
                        ) : l.situacao === 'anulada' ? (
                          <span className="rs-chip">Anulada{letraMarcada(l) ? ` · marcou ${letraMarcada(l)}` : ''}</span>
                        ) : (
                          <>
                            <span className={`rs-chip rs-chip--${l.situacao}`}>
                              <Icone nome={l.situacao === 'certa' ? 'certo' : 'errado'} tamanho={13} /> {letraMarcada(l) ? `Marcou ${letraMarcada(l)}` : l.situacao === 'certa' ? 'Acertou (autoavaliação)' : 'Errou (autoavaliação)'}
                            </span>
                            {l.situacao === 'errada' && q?.gabarito && <span className="rs-chip rs-chip--gabarito">Gabarito {gabaritoVisto(l)}</span>}
                          </>
                        )}
                        {r?.confianca && r.confianca !== 'seguro' && (
                          <span className="rs-chip rs-chip--aviso"><Icone nome={ICONE_CONFIANCA[r.confianca]} tamanho={13} /> {ROTULO_CONFIANCA[r.confianca]}</span>
                        )}
                        {r && <span className="rs-chip rs-chip--tempo"><Icone nome="relogio" tamanho={13} /> {duracao(r.segundos)}</span>}
                      </span>
                    </span>
                    <span className="rs-item__seta" aria-hidden="true"><Icone nome="direita" tamanho={18} /></span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rs-rodape">
        {(streak.hojeContagem > 0 || streak.atual > 0) && (
          <div className="rs-marco">
            <span className="rs-marco__icone rs-marco__icone--fogo"><Icone nome="fogo" tamanho={20} /></span>
            <span>
              <strong>{streak.metaHojeAtingida ? `Meta de hoje batida · ${plural(streak.atual, 'dia seguido', 'dias seguidos')}` : `Faltam ${META_STREAK_DIARIA - streak.hojeContagem} para a meta de hoje`}</strong>
              <small>{plural(streak.hojeContagem, 'questão respondida hoje', 'questões respondidas hoje')}</small>
            </span>
          </div>
        )}
        {proximoEmblema && (
          <a className="rs-marco" href={href('/ranking')}>
            <span className="rs-marco__medalha"><Medalha conquista={proximoEmblema} tamanho={40} bloqueada /></span>
            <span>
              <strong>Faltam {plural(proximoEmblema.minimo - totalConta, 'questão', 'questões')} para {proximoEmblema.rotulo}</strong>
              <span className="rs-marco__trilho"><span style={{ width: `${Math.min(100, (totalConta / proximoEmblema.minimo) * 100)}%` }} /></span>
            </span>
          </a>
        )}
        <div className="rs-extras nao-imprime">
          <a className="botao botao--fantasma" href={href('/dados')}><Icone nome="grafico" tamanho={16} /> Desempenho geral</a>
          <button type="button" className="botao botao--fantasma" onClick={exportar}><Icone nome="baixar" tamanho={16} /> Exportar CSV</button>
          <button type="button" className="botao botao--fantasma" onClick={() => window.print()}><Icone nome="impressora" tamanho={16} /> Imprimir</button>
        </div>
      </section>
    </article>
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
  return (
    <section className={'rs-cronograma' + (feita ? ' rs-cronograma--feita' : '')} aria-labelledby="rs-cron-titulo">
      <span className="rs-cronograma__selo" aria-hidden="true">{feita ? <Icone nome="certo" tamanho={28} /> : <span className="numerico">{calculo.faltaHoje}</span>}</span>
      <h2 id="rs-cron-titulo">{feita ? 'Meta de hoje feita' : `Faltam ${calculo.faltaHoje} para a meta de hoje`}</h2>
      <p>{Math.min(calculo.feitasHoje, calculo.metaDiaria)} de {calculo.metaDiaria} questões novas do cronograma hoje{adiantando > 0 ? <>, e <b>+{adiantando} adiantadas</b></> : null}.</p>
      <div className="rs-cronograma__proximo">
        {fraseAdiantado(calculo) && <><b>{fraseAdiantado(calculo)}</b><br /></>}
        {feita ? <>Pronto por hoje. Se quiser, <b>puxe as questões do próximo dia</b>: o que fizer conta para ele, e o resto continua lá. Revisões e flashcards são extras.</> : <>Continue de onde parou: as próximas questões já estão separadas.</>}
        {amanha && <><br />{chaveCivil(amanha.data) === somarDias(hojeBR(), 1) ? 'Amanhã' : `Na ${quandoAmanha}`}: {amanha.total === 0 && amanha.adiantado > 0 ? <b>livre, você já adiantou</b> : <><b>{nomesAmanha || 'mini-simulado'}</b>, {amanha.total} questões{amanha.adiantado > 0 ? ` (eram ${amanha.total + amanha.adiantado})` : ''}{amanha.mini ? ' e o mini-simulado' : ''}</>}.</>}
      </div>
      <a className={'botao botao--grande ' + (feita ? 'botao--ouro' : 'botao--principal')} href={href(proximo ? `/cronograma?puxar=${chaveCivil(proximo.data)}` : feita ? '/cronograma?adiantar=1' : '/cronograma')}>{puxar ? `${puxar.rotulo} · ${puxar.detalhe}` : feita ? 'Adiantar o próximo dia' : 'Continuar o cronograma'}</a>
      {feita && <span className="rs-cronograma__link"><a href={href('/cronograma')}>Voltar ao cronograma</a> · <a href={href('/revisao')}>revisões (opcional)</a></span>}
    </section>
  )
}
