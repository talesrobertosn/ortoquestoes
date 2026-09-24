import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import type { Questao, Resposta } from '../dados/tipos'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Medalha } from '../componentes/Medalha'
import { usarConta } from '../conta/ContextoConta'
import { type ResumoHistorico, descreverFiltros, usarSessao } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { calcularStreak, META_STREAK_DIARIA } from '../estado/streak'
import { proximaConquista } from '../estado/conquistas'
import { href, navegar } from '../util/rotas'

type Confianca = NonNullable<Resposta['confianca']>
type Situacao = 'certa' | 'errada' | 'anulada' | 'pulada'
type Filtro = 'erradas' | 'incertas' | 'todas'

interface Linha {
  numero: number
  id: string
  questao?: Questao
  resposta?: Resposta
  situacao: Situacao
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

export function Resumo() {
  const { indice } = usarIndice()
  const { sessao, iniciar, encerrar } = usarSessao()
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
      return { numero: i + 1, id, questao: porId.get(id), resposta, situacao }
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

  function refazer(lista: Linha[]) {
    if (lista.length === 0) return
    iniciar({ ...sessao!.filtros, embaralhar: false, limite: null }, lista.map((l) => l.id))
    navegar('/sessao')
  }

  function exportar() {
    const linhas = [
      `OrtoQuestões — resumo de sessão`,
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
          l.resposta?.escolhida ?? '',
          l.questao?.gabarito ?? '',
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

  const quando = new Date(fim).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  const hora = new Date(fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <article className="empilha-2 rs">
      <section className="rs-heroi">
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
        <a className="rs-acao" href={href('/treinar')} onClick={() => encerrar()}>
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
                  : `${l.situacao}, marcou ${l.resposta!.escolhida}${l.situacao === 'errada' && l.questao?.gabarito ? `, gabarito ${l.questao.gabarito}` : ''}${incerta ? `, ${ROTULO_CONFIANCA[l.resposta!.confianca!].toLowerCase()}` : ''}`
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
                          <span className="rs-chip">Anulada · marcou {r!.escolhida}</span>
                        ) : (
                          <>
                            <span className={`rs-chip rs-chip--${l.situacao}`}>
                              <Icone nome={l.situacao === 'certa' ? 'certo' : 'errado'} tamanho={13} /> Marcou {r!.escolhida}
                            </span>
                            {l.situacao === 'errada' && q?.gabarito && <span className="rs-chip rs-chip--gabarito">Gabarito {q.gabarito}</span>}
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
