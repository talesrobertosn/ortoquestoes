import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BotaoConcluirFlutuante, ModalFimSessao } from '../componentes/ModalFimSessao'
import { usarDeslizar } from '../util/usarDeslizar'
import { preCarregarComentario } from '../dados/comentarios'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import type { Questao } from '../dados/tipos'
import { formatarDuracao, segundosRestantes } from '../dados/tipos'
import { CartaoQuestao } from '../componentes/CartaoQuestao'
import { MapaQuestoes } from '../componentes/MapaQuestoes'
import { Painel } from '../componentes/Painel'
import { PortaoConta } from '../componentes/PortaoConta'
import { Atalhos } from '../componentes/Atalhos'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { usarConta } from '../conta/ContextoConta'
import { lerRespondidas, usarFavoritos, usarSessao } from '../estado/sessao'
import { marcarConviteLimiteVisto, saldoGratuitoHoje, usarLimiteDiario } from '../estado/limiteDiario'
import { usarAssinante } from '../conta/plano'
import { AvisoLimite, PainelLimite } from '../componentes/LimiteRespostas'
import { href, navegar } from '../util/rotas'
import { gerarId } from '../util/id'
import { gravar, ler } from '../estado/armazenamento'
import { recurso } from '../config'
import '@fontsource/pixelify-sans/latin-700.css'
import '../estilos/paginas/Sessao.css'
import { obterPlano } from '../conta/cronograma'
import { usarPremium } from '../conta/premium'
import { calcularPlano } from '../dados/planoEstudo'
import { corDaArea } from '../dados/coresAreas'

/**
 * Na sessão do cronograma: a meta de hoje, na cor da área, sempre à vista (reforma de 14/10/2026).
 * O plano é calculado uma vez, ao abrir a sessão; depois, cada resposta da sessão soma uma
 * (a sessão do cronograma só tem questões ainda não feitas), sem recalcular o plano a cada clique.
 */
function FaixaCronograma({ respondidasNaSessao }: { respondidasNaSessao: number }) {
  const { premium } = usarPremium()
  const { indice } = usarIndice()
  const [base, definirBase] = useState<{ meta: number; feitas: number; nome: string | null; slug: string | null } | null>(null)
  const naAbertura = useRef(respondidasNaSessao)
  useEffect(() => {
    if (!premium || !indice) return
    let vivo = true
    obterPlano().then((plano) => {
      if (!vivo || !plano) return
      const c = calcularPlano(indice, lerRespondidas(), plano)
      if (!c.metaDiaria || c.naRetaFinal) return
      const principal = c.hoje?.itens.find((i) => !i.mistura) ?? c.hoje?.itens[0]
      definirBase({ meta: c.metaDiaria, feitas: c.feitasHoje, nome: principal?.nome ?? null, slug: principal?.slug ?? c.dias[0]?.itens[0]?.slug ?? null })
    }).catch(() => {})
    return () => { vivo = false }
  }, [premium, indice])
  if (!base) return null
  const feitasHoje = base.feitas + Math.max(0, respondidasNaSessao - naAbertura.current)
  const feitas = Math.min(feitasHoje, base.meta)
  const feita = feitasHoje >= base.meta
  return (
    <div className="conteudo faixa-cronograma" style={{ ['--cor-area' as string]: corDaArea(base.slug) }}>
      <span className="faixa-cronograma__texto"><i aria-hidden="true" />{feita ? 'Meta de hoje feita' : `Cronograma de hoje${base.nome ? ` · ${base.nome}` : ''}`}</span>
      <b className="numerico">{feitasHoje}/{base.meta}</b>
      <span className="faixa-cronograma__barra" role="progressbar" aria-valuemin={0} aria-valuemax={base.meta} aria-valuenow={feitas} aria-label="Meta de hoje do cronograma"><span style={{ width: `${(feitas / base.meta) * 100}%` }} /></span>
    </div>
  )
}

export function Sessao() {
  const { indice } = usarIndice()
  const { sessao, responder, irPara, alternarRevisar, alternarRiscada, finalizar } = usarSessao()
  const { sessao: conta } = usarConta()
  const { favoritos, alternar: alternarFavorito } = usarFavoritos()
  const [questoes, definirQuestoes] = useState<Questao[] | null>(null)
  const [mapaAberto, definirMapaAberto] = useState(false)
  const [atalhosAbertos, definirAtalhosAbertos] = useState(false)
  const [dicaTeclado, definirDicaTeclado] = useState(false)
  const [portaoContaAberto, definirPortaoContaAberto] = useState(false)
  const [erro, definirErro] = useState<string | null>(null)
  const areaGestos = useRef<HTMLDivElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const { estado: estadoLimite, autorizar } = usarLimiteDiario()
  const [limiteAberto, definirLimiteAberto] = useState(false)
  // Depois da 20ª, fechar o convite leva ao resumo da sessão.
  const [resumoAoFechar, definirResumoAoFechar] = useState(false)
  const chavesResposta = useRef(new Map<string, string>())
  const assinante = usarAssinante(conta)
  const [avisoSaldoFechado, definirAvisoSaldoFechado] = useState(false)
  // Lido uma vez por sessão: o aviso é sobre o começo, não uma contagem.
  const saldoInicial = useMemo(() => saldoGratuitoHoje(), [sessao?.id])
  const autorizando = useRef(false)

  const ids = sessao?.ids
  useEffect(() => {
    if (!indice || !ids) return
    let vivo = true
    carregarQuestoes(indice, ids)
      .then((lista) => vivo && definirQuestoes(lista))
      .catch((e) => vivo && definirErro(String(e)))
    return () => {
      vivo = false
    }
  }, [indice, ids])

  const total = sessao?.ids.length ?? 0
  const posicao = Math.min(sessao?.posicao ?? 0, Math.max(0, total - 1))
  const questaoAtual = useMemo(() => {
    if (!questoes || !sessao) return null
    const id = sessao.ids[posicao]
    return questoes.find((q) => q.id === id) ?? null
  }, [questoes, sessao, posicao])

  const respondidas = sessao ? Object.keys(sessao.respostas).length : 0
  const painelAberto = mapaAberto || atalhosAbertos || limiteAberto
  const simulado = !!sessao?.simulado
  // Fim de sessão: ao responder a última, o pop-up abre no meio da tela (uma vez
  // por sessão); quem prefere ler o comentário antes ganha o botão flutuante.
  const tudoRespondido = total > 0 && respondidas === total
  const [fim, definirFim] = useState<'fechado' | 'aberto' | 'lendo'>('fechado')
  const fimMostrado = useRef<string | null>(null)
  const idSessao = sessao ? sessao.ids.join(',') + ':' + (sessao.criadaEm ?? '') : ''
  useEffect(() => {
    if (!tudoRespondido || fimMostrado.current === idSessao) return
    fimMostrado.current = idSessao
    const t = window.setTimeout(() => definirFim('aberto'), simulado ? 300 : 900)
    return () => window.clearTimeout(t)
  }, [tudoRespondido, idSessao, simulado])
  const acertosSessao = sessao ? Object.values(sessao.respostas).filter((r) => r.correta === true).length : 0
  const combo = useMemo(() => {
    if (!sessao || simulado) return 0
    let n = 0
    for (const id of sessao.ids) {
      const r = sessao.respostas[id]
      if (!r) continue
      n = r.correta === true ? n + 1 : r.correta === false ? 0 : n
    }
    return n
  }, [sessao, simulado])

  // Cronômetro do simulado. O relógio corre no mundo: fechar a aba não pausa
  // a prova, e reabrir mostra o tempo que sobrou de verdade.
  const [restante, definirRestante] = useState<number | null>(() =>
    sessao ? segundosRestantes(sessao) : null,
  )
  useEffect(() => {
    if (!sessao || !sessao.limiteSegundos || sessao.concluidaEm) return
    definirRestante(segundosRestantes(sessao))
    const relogio = window.setInterval(() => definirRestante(segundosRestantes(sessao)), 1000)
    return () => window.clearInterval(relogio)
  }, [sessao])

  // Acabou a cota grátis de hoje: seguir para uma questão ainda não respondida
  // abre o convite; fechar leva ao resumo da sessão.
  const limiteZerado = !!(estadoLimite?.paywallAtivo && !estadoLimite.ilimitado && estadoLimite.restantes === 0)
  const irAdiante = useCallback(() => {
    if (!sessao) return
    const proxima = sessao.ids[posicao + 1]
    if (limiteZerado && (!proxima || !sessao.respostas[proxima])) {
      if (estadoLimite) marcarConviteLimiteVisto(estadoLimite.liberaEm)
      definirResumoAoFechar(true); definirLimiteAberto(true); return
    }
    irPara(posicao + 1)
  }, [sessao, posicao, limiteZerado, estadoLimite, irPara])

  useEffect(() => {
    if (!sessao || painelAberto) return
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return
      const tecla = evento.key.toLowerCase()
      if (evento.key === 'ArrowRight' || tecla === 'n') {
        evento.preventDefault()
        if (evento.key === 'ArrowRight') { gravar('dica:teclado', 3); definirDicaTeclado(false) }
        irAdiante()
      } else if (evento.key === 'ArrowLeft' || tecla === 'p') {
        evento.preventDefault()
        irPara(posicao - 1)
      } else if (tecla === 'm') {
        evento.preventDefault()
        definirMapaAberto(true)
      } else if (evento.key === '?') {
        evento.preventDefault()
        definirAtalhosAbertos(true)
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [sessao, posicao, irPara, irAdiante, painelAberto])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [posicao])

  // O comentário desta questão e o da próxima descem enquanto a pessoa lê:
  // ao responder, a explicação aparece na hora, mesmo com a rede fraca.
  useEffect(() => {
    if (!sessao || sessao.simulado || !questoes) return
    preCarregarComentario(indice, questaoAtual)
    const proxima = questoes.find((q) => q.id === sessao.ids[posicao + 1]) ?? null
    const espera = window.setTimeout(() => preCarregarComentario(indice, proxima), 1500)
    return () => window.clearTimeout(espera)
  }, [indice, questoes, questaoAtual, sessao, posicao])

  // Deslizar troca de questão. Na última, o cartão só resiste: encerrar a
  // sessão continua sendo um toque de propósito, nunca um gesto sem querer.
  const espiar = usarDeslizar({
    area: areaGestos, palco, pronto: !!(sessao && questoes), ativo: !painelAberto,
    podeAvancar: !!sessao && posicao + 1 < sessao.ids.length, podeVoltar: posicao > 0,
    aoAvancar: irAdiante, aoVoltar: () => irPara(posicao - 1),
  })
  // Em toda sessão nova (uma vez por sessão, não a cada recarregar), a dica
  // aparece por uns 3 s: no celular, deslizar; no computador, as setas.
  // O cartão só espia para o lado na primeiríssima vez.
  const chaveDica = sessao ? String(sessao.criadaEm ?? sessao.ids.join(',')) : ''
  const [dicaDeslizar, definirDicaDeslizar] = useState(false)
  const espiarAtual = useRef(espiar)
  espiarAtual.current = espiar
  const temporizadoresDica = useRef<number[]>([])
  useEffect(() => () => temporizadoresDica.current.forEach((t) => window.clearTimeout(t)), [])
  const temVarias = !!sessao && sessao.ids.length > 1
  // A chave da sessão em que a dica já foi armada (troca de sessão sem remontar a página também conta).
  const dicaArmada = useRef('')
  useEffect(() => {
    if (!questoes || !temVarias || !chaveDica || dicaArmada.current === chaveDica) return
    if (!window.matchMedia('(pointer: coarse)').matches || ler('dica:sessao', '') === chaveDica) return
    dicaArmada.current = chaveDica
    const primeiraVez = !ler('dica:deslizar', false)
    temporizadoresDica.current.forEach((t) => window.clearTimeout(t))
    temporizadoresDica.current = [
      window.setTimeout(() => { gravar('dica:sessao', chaveDica); gravar('dica:deslizar', true); definirDicaDeslizar(true); if (primeiraVez) espiarAtual.current() }, 900),
      window.setTimeout(() => definirDicaDeslizar(false), 900 + 3200),
    ]
  }, [questoes, temVarias, chaveDica])
  useEffect(() => { if (posicao > 0) definirDicaDeslizar(false) }, [posicao])
  // No computador, o equivalente: a frase lembra que as setas do teclado
  // trocam de questão, e some sozinha (ou assim que a pessoa usa as setas).
  const temporizadorTeclado = useRef<number[]>([])
  useEffect(() => () => temporizadorTeclado.current.forEach((t) => window.clearTimeout(t)), [])
  useEffect(() => {
    if (!questoes || !temVarias || !chaveDica || dicaArmada.current === chaveDica) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || ler('dica:sessao', '') === chaveDica) return
    dicaArmada.current = chaveDica
    temporizadorTeclado.current.forEach((t) => window.clearTimeout(t))
    temporizadorTeclado.current = [
      window.setTimeout(() => { gravar('dica:sessao', chaveDica); definirDicaTeclado(true) }, 900),
      window.setTimeout(() => definirDicaTeclado(false), 900 + 3200),
    ]
  }, [questoes, temVarias, chaveDica])

  // Tempo esgotado encerra o simulado sozinho e leva ao resumo.
  useEffect(() => {
    if (restante === null || restante > 0) return
    if (!sessao || sessao.concluidaEm) return
    finalizar()
    navegar('/resumo')
  }, [restante, sessao, finalizar])

  if (!sessao || total === 0) {
    return (
      <Estado
        titulo="Não há sessão em andamento."
        acoes={
          <a className="botao botao--principal" href={href('/treinar')}>
            Montar uma sessão
          </a>
        }
      >
        <p>Escolha os filtros na tela de montagem e a sessão começa na mesma hora.</p>
      </Estado>
    )
  }

  if (erro) {
    return (
      <Estado
        titulo="As questões desta sessão não puderam ser carregadas."
        acoes={
          <>
            <button className="botao" type="button" onClick={() => window.location.reload()}>
              Tentar de novo
            </button>
            <a className="botao" href={href('/treinar')}>
              Montar outra sessão
            </a>
          </>
        }
      >
        <p>Verifique a conexão. Nada do seu progresso foi perdido.</p>
      </Estado>
    )
  }

  if (!questoes) return <Carregando linhas={7} />

  const proximaNaoRespondida = sessao.ids.findIndex(
    (id, i) => i > posicao && !sessao.respostas[id],
  )

  function avancar() {
    if (limiteZerado) { irAdiante(); return }
    if (posicao + 1 < total) irPara(posicao + 1)
    else concluir()
  }

  function concluir() {
    finalizar()
    navegar('/resumo')
  }
  return (
    <div className="sessao-gestos" ref={areaGestos}>
      {dicaDeslizar && !painelAberto && <p className="dica-deslizar nao-imprime" role="status"><Icone nome="esquerda" tamanho={15} /> Deslize para trocar de questão <Icone nome="direita" tamanho={15} /></p>}
      {dicaTeclado && !dicaDeslizar && !painelAberto && <p className="dica-deslizar dica-teclado nao-imprime" role="status">Use as setas <kbd>←</kbd> <kbd>→</kbd> do teclado para trocar de questão</p>}
      <button
        type="button"
        className="seta-lateral seta-lateral--esquerda nao-imprime"
        onClick={() => irPara(posicao - 1)}
        disabled={posicao === 0}
        aria-label="Questão anterior"
        title="Questão anterior (←)"
      >
        <Icone nome="esquerda" tamanho={22} />
      </button>
      <button
        type="button"
        className="seta-lateral seta-lateral--direita nao-imprime"
        onClick={irAdiante}
        disabled={posicao + 1 >= total}
        aria-label="Próxima questão"
        title="Próxima questão (→)"
      >
        <Icone nome="direita" tamanho={22} />
      </button>
      <div className="barra-sessao nao-imprime">
        {sessao.origem === 'cronograma' && !simulado && <FaixaCronograma respondidasNaSessao={respondidas} />}
        <div className="conteudo barra-sessao__interno">
          <span className="barra-sessao__texto barra-sessao__texto--pixel">
            {respondidas} de {total}
          </span>
          {combo >= 3 && <span className="barra-sessao__combo" title="Acertos seguidos nesta sessão"><img src={recurso('ranking/chama.png')} width={14} height={14} alt="" /> {combo}</span>}
          {restante !== null && (
            <span
              className={'cronometro' + (restante <= 300 ? ' cronometro--acabando' : '')}
              role="timer"
              aria-label={`Tempo restante do simulado: ${formatarDuracao(restante)}`}
            >
              {formatarDuracao(restante)}
            </span>
          )}
          {/* Barra de XP (temporada RPG): um bloco por questão. No modo prova o
              gabarito fica escondido, então respondida aparece só como respondida. */}
          <div
            className={total <= 40 ? 'xp-blocos' : 'progresso'}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={respondidas}
            aria-label="Questões respondidas"
            style={total <= 40 ? { gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` } : undefined}
          >
            {total <= 40
              ? sessao!.ids.map((id, i) => {
                  const r = sessao!.respostas[id]
                  const estado = i === posicao ? 'atual' : !r ? 'vazio' : simulado ? 'feito' : r.correta === true ? 'certa' : r.correta === false ? 'errada' : 'feito'
                  return <span key={id} className={`xp-bloco xp-bloco--${estado}`} />
                })
              : <div className="progresso__preenchido" style={{ width: `${total ? (respondidas / total) * 100 : 0}%` }} />}
          </div>
          <button
            type="button"
            className="botao barra-sessao__mapa"
            onClick={() => definirMapaAberto(true)}
            style={{ minHeight: 36 }}
          >
            <Icone nome="mapa" tamanho={16} />
            Mapa
          </button>
          <button
            type="button"
            className="botao-icone barra-sessao__teclado"
            onClick={() => definirAtalhosAbertos(true)}
            aria-label="Ver atalhos de teclado"
            title="Atalhos (?)"
          >
            <Icone nome="teclado" />
          </button>
        </div>
      </div>

      {conta && !assinante && !simulado && !avisoSaldoFechado && respondidas === 0 && saldoInicial !== null && saldoInicial > 0 && saldoInicial < total && (
        <p className="aviso-saldo nao-imprime" role="status">
          <Icone nome="relogio" tamanho={16} />
          <span>Hoje restam <b>{saldoInicial}</b> {saldoInicial === 1 ? 'questão gratuita' : 'questões gratuitas'}: esta sessão vai até a {saldoInicial}ª e depois mostra o seu resumo. As outras ficam para amanhã.</span>
          <button type="button" className="aviso-saldo__fechar" aria-label="Fechar aviso" onClick={() => definirAvisoSaldoFechado(true)}><Icone nome="fechar" tamanho={14} /></button>
        </p>
      )}
      <div className="sessao-palco" ref={palco}>
      {questaoAtual ? (
        <><AvisoLimite estado={estadoLimite} /><CartaoQuestao
          questao={questaoAtual}
          numero={posicao + 1}
          total={total}
          resposta={sessao.respostas[questaoAtual.id]}
          riscadas={sessao.riscadas[questaoAtual.id] ?? []}
          favorita={favoritos.includes(questaoAtual.id)}
          marcadaRevisao={sessao.revisar.includes(questaoAtual.id)}
          aoResponder={async (letra, correta, segundos, confianca) => {
            if (!conta) { definirPortaoContaAberto(true); return }
            if (autorizando.current) return
            autorizando.current = true
            try {
              const chaveMapa = `${sessao.id}:${questaoAtual.id}`
              const chave = chavesResposta.current.get(chaveMapa) ?? gerarId()
              chavesResposta.current.set(chaveMapa, chave)
              const permissao = await autorizar(questaoAtual.id, chave)
              if (!permissao.permitido) {
                // Com respostas na sessão, o limite vira fechamento: o resumo
                // mostra o dia cumprido em vez de um painel no meio da questão.
                if (permissao.paywallAtivo && !permissao.falhaValidacao) { marcarConviteLimiteVisto(permissao.liberaEm); definirResumoAoFechar(respondidas > 0) }
                definirLimiteAberto(true); return
              }
              responder(questaoAtual.id, letra, correta, segundos, confianca)
            } finally { autorizando.current = false }
          }}
          aoRiscar={(letra) => alternarRiscada(questaoAtual.id, letra)}
          aoFavoritar={() => alternarFavorito(questaoAtual.id)}
          aoRevisar={() => alternarRevisar(questaoAtual.id)}
          aoAvancar={avancar}
          atalhosAtivos={!painelAberto}
          revelarResposta={!simulado}
        /></>
      ) : (
        <Estado titulo="Esta questão saiu do acervo.">
          <p>Ela foi removida ou renomeada em uma atualização. Siga para a próxima.</p>
        </Estado>
      )}
      </div>

      <nav className="nav-sessao nao-imprime" aria-label="Navegação da sessão">
        <button
          type="button"
          className="botao nav-sessao__anterior"
          onClick={() => irPara(posicao - 1)}
          disabled={posicao === 0}
        >
          <Icone nome="esquerda" tamanho={16} />
          Anterior
          <kbd className="nav-sessao__tecla" aria-hidden="true">←</kbd>
        </button>
        <div className="nav-sessao__extras">
          {posicao + 1 < total && !sessao.respostas[questaoAtual?.id ?? ''] && (
            <button type="button" className="botao botao--fantasma" onClick={() => irPara(posicao + 1)}>
              Pular por agora
            </button>
          )}
          {proximaNaoRespondida > -1 && (
            <button type="button" className="botao botao--fantasma" onClick={() => irPara(proximaNaoRespondida)}>
              Próxima não respondida
            </button>
          )}
          <button type="button" className="botao botao--fantasma" onClick={concluir}>
            {simulado ? 'Entregar o simulado' : 'Encerrar e ver resumo'}
          </button>
        </div>
        <button
          type="button"
          className="botao botao--principal nav-sessao__proxima"
          onClick={avancar}
          disabled={posicao + 1 >= total && respondidas === 0}
        >
          {posicao + 1 < total && <kbd className="nav-sessao__tecla" aria-hidden="true">→</kbd>}
          {posicao + 1 < total ? 'Próxima' : 'Concluir'}
          <Icone nome="direita" tamanho={16} />
        </button>
      </nav>

      <Painel
        titulo="Mapa de questões"
        aberto={mapaAberto}
        aoFechar={() => definirMapaAberto(false)}
      >
        <p className="meta" style={{ marginBottom: '0.75rem' }}>
          {respondidas} de {total} respondidas
        </p>
        <MapaQuestoes
          ids={sessao.ids}
          respostas={sessao.respostas}
          revisar={sessao.revisar}
          revelar={!simulado}
          posicao={posicao}
          aoEscolher={(i) => {
            irPara(i)
            definirMapaAberto(false)
          }}
        />
      </Painel>

      <Painel
        titulo="Atalhos de teclado"
        aberto={atalhosAbertos}
        aoFechar={() => definirAtalhosAbertos(false)}
      >
        <Atalhos />
      </Painel>

      {fim === 'aberto' && <ModalFimSessao total={total} acertos={simulado ? null : acertosSessao} simulado={simulado} aoConcluir={concluir} aoLer={() => definirFim('lendo')} />}
      {fim === 'lendo' && tudoRespondido && <BotaoConcluirFlutuante aoConcluir={concluir} simulado={simulado} />}
      <PortaoConta aberto={portaoContaAberto} aoFechar={() => definirPortaoContaAberto(false)} />
      <PainelLimite estado={estadoLimite} aberto={limiteAberto} aoFechar={() => { definirLimiteAberto(false); if (resumoAoFechar) { definirResumoAoFechar(false); concluir() } }} />
    </div>
  )
}
