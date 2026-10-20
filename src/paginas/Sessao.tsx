import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
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
import { erroDeConexao, marcarConviteLimiteVisto, saldoGratuitoHoje, usarLimiteDiario } from '../estado/limiteDiario'
import { usarAssinante } from '../conta/plano'
import { AvisoLimite, PainelLimite } from '../componentes/LimiteRespostas'
import { href, navegar } from '../util/rotas'
import { gerarId } from '../util/id'
import { EVENTO_DADOS, gravar, ler, type MudancaDados } from '../estado/armazenamento'
import { recurso } from '../config'
import '../estilos/paginas/Sessao.css'
import { urlImagem } from '../dados/edicoes'
import { obterPlano } from '../conta/cronograma'
import { usarPremium } from '../conta/premium'
import { calcularPlano } from '../dados/planoEstudo'
import { corDaArea } from '../dados/coresAreas'
import { primeiroNome } from '../componentes/Cabecalho'
import type { Resposta } from '../dados/tipos'
import { porExtenso } from '../util/extenso'
import { usarPomodoro, usarPreferenciasSessao, type PreferenciasSessao } from '../estado/preferenciasSessao'
import { PomodoroBloco, PomodoroPilula } from '../componentes/PomodoroSessao'
import { confirmar } from '../componentes/Confirmar'
import { usarSalvamentoNacional, type EstadoSalvamento } from '../estado/salvamentoNacional'
import { alertaDeTempo, montarSessaoNacional, resumoParaEntregar } from '../dados/provaNacional'
import { codigoErroSN, snIniciar } from '../dados/apiSimuladoNacional'
import { ordemParaRevisao, letraExibida } from '../dados/ordemAlternativas'
import { carregarLetrasAcervo, usarLetrasAcervo } from '../dados/letrasAcervo'
import { lerUltimaExibida, registrarExibida } from '../estado/ordemExibida'

/** O salvamento da prova do Simulado Nacional, numa linha curta. */
function textoSalvamento(e: EstadoSalvamento): string {
  if (e.situacao === 'salvando' || e.situacao === 'pendente') return 'Salvando no servidor…'
  if (e.situacao === 'sem-rede') return 'Sem conexão: as respostas ficam aqui e sobem quando a rede voltar'
  if (e.situacao === 'encerrado') return 'Tempo da prova encerrado'
  return e.salvoEm ? `Salvo no servidor às ${new Date(e.salvoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Respostas salvas no servidor'
}

type EstadoBloco = 'certa' | 'errada' | 'neutra' | 'feita' | 'vazia'
const ROTULO_BLOCO: Record<EstadoBloco, string> = { certa: 'correta', errada: 'errada', neutra: 'anulada', feita: 'respondida', vazia: 'não respondida' }
function estadoDoBloco(r: Resposta | undefined, simulado: boolean): EstadoBloco {
  if (!r) return 'vazia'
  if (simulado) return 'feita'
  return r.correta === true ? 'certa' : r.correta === false ? 'errada' : 'neutra'
}

/** Até 40 questões, um bloco por questão; acima disso, cada bloco junta algumas (sem rolagem lateral). */
const LIMITE_BLOCOS = 40

/**
 * A evolução da sessão (redesenho de 18/10/2026): trilha de blocos de pixel, um por questão,
 * cada um com o resultado (certa em verdete, errada em coral, anulada neutra), a atual com
 * contorno dourado. A cor nunca é o único sinal: cada bloco tem rótulo, e o contador fica ao lado.
 * Os blocos levam à questão; pelo teclado, o mapa (M) faz o mesmo sem 40 paradas de Tab.
 */
function TrilhaSessao({ ids, respostas, posicao, simulado, aoIr }: {
  ids: string[]; respostas: Record<string, Resposta>; posicao: number; simulado: boolean; aoIr: (i: number) => void
}) {
  const total = ids.length
  const passo = Math.max(1, Math.ceil(total / LIMITE_BLOCOS))
  const grupos: Array<[number, number]> = []
  for (let i = 0; i < total; i += passo) grupos.push([i, Math.min(total, i + passo)])
  return (
    <div
      className={'sx-trilha' + (grupos.length > 24 ? ' sx-trilha--densa' : '')}
      role="group"
      aria-label="Questões da sessão"
      style={{ gridTemplateColumns: `repeat(${grupos.length}, minmax(0, 1fr))` }}
    >
      {grupos.map(([de, ate]) => {
        const atual = posicao >= de && posicao < ate
        if (passo === 1) {
          const estado = estadoDoBloco(respostas[ids[de]], simulado)
          return (
            <button
              key={ids[de]} type="button" tabIndex={-1}
              className={`sx-bloco sx-bloco--${estado}${atual ? ' sx-bloco--atual' : ''}`}
              aria-label={`Questão ${de + 1}, ${ROTULO_BLOCO[estado]}${atual ? ', atual' : ''}`}
              aria-current={atual ? 'step' : undefined}
              onClick={() => aoIr(de)}
            />
          )
        }
        const conta = { certa: 0, errada: 0, neutra: 0, feita: 0, vazia: 0 }
        let primeiraVazia = -1
        for (let i = de; i < ate; i++) {
          const e = estadoDoBloco(respostas[ids[i]], simulado)
          conta[e]++
          if (e === 'vazia' && primeiraVazia < 0) primeiraVazia = i
        }
        const n = ate - de
        const pc = (v: number) => `${(v / n) * 100}%`
        const a = conta.certa, b = a + conta.errada, c = b + conta.neutra + conta.feita
        const partes = simulado
          ? [`${conta.feita} respondidas`, `${conta.vazia} sem resposta`]
          : [`${conta.certa} certas`, `${conta.errada} erradas`, conta.neutra ? `${conta.neutra} anuladas` : '', `${conta.vazia} sem resposta`].filter(Boolean)
        return (
          <button
            key={de} type="button" tabIndex={-1}
            className={`sx-bloco sx-bloco--grupo${conta.vazia === n ? ' sx-bloco--vazia' : ''}${atual ? ' sx-bloco--atual' : ''}`}
            style={{ ['--sx-a' as string]: pc(a), ['--sx-b' as string]: pc(b), ['--sx-c' as string]: pc(c) }}
            aria-label={`Questões ${de + 1} a ${ate}: ${partes.join(', ')}${atual ? ', inclui a atual' : ''}`}
            aria-current={atual ? 'step' : undefined}
            onClick={() => aoIr(atual ? posicao : primeiraVazia >= 0 ? primeiraVazia : de)}
          />
        )
      })}
    </div>
  )
}

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
  const agora = useRef(respondidasNaSessao)
  agora.current = respondidasNaSessao
  // Respostas que chegam de outro aparelho mudam o "feitas hoje": recalcula a base
  // (e zera a conta desta sessão a partir daí), em vez de somar duas vezes.
  const [vindasDaNuvem, definirVindasDaNuvem] = useState(0)
  useEffect(() => {
    let t: number | undefined
    const aoMudar = (e: Event) => {
      const m = (e as CustomEvent<MudancaDados>).detail
      if (m.chave !== 'respondidas' || m.origem !== 'nuvem') return
      window.clearTimeout(t)
      t = window.setTimeout(() => definirVindasDaNuvem((n) => n + 1), 300)
    }
    window.addEventListener(EVENTO_DADOS, aoMudar)
    return () => { window.clearTimeout(t); window.removeEventListener(EVENTO_DADOS, aoMudar) }
  }, [])
  useEffect(() => {
    if (!premium || !indice) return
    let vivo = true
    obterPlano().then((plano) => {
      if (!vivo || !plano) return
      const c = calcularPlano(indice, lerRespondidas(), plano)
      if (!c.metaDiaria || c.naRetaFinal) return
      const principal = c.hoje?.itens.find((i) => !i.mistura) ?? c.hoje?.itens[0]
      naAbertura.current = agora.current
      definirBase({ meta: c.metaDiaria, feitas: c.feitasHoje, nome: principal?.nome ?? null, slug: principal?.slug ?? c.dias[0]?.itens[0]?.slug ?? null })
    }).catch(() => {})
    return () => { vivo = false }
  }, [premium, indice, vindasDaNuvem])
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

/**
 * A casca fixa da sessão (acabamento de 19/10/2026). Mede o cabeçalho do site e a barra da
 * sessão e publica em :root, enquanto a sessão está aberta:
 *   --oq-cabecalho  altura do cabeçalho do site (a barra gruda logo abaixo dele);
 *   --oq-topo-fixo  o que fica fixo em cima de verdade (cabeçalho visível + barra), para o
 *                   scroll-margin-top do cartão e para as rolagens da própria sessão.
 * No celular, o cabeçalho sai ao rolar para baixo e volta ao rolar para cima (só transform,
 * classe oq-cabecalho-oculto em <html>). Não sai com um painel ou diálogo aberto, nem com o
 * foco do teclado dentro dele, nem perto do topo da página.
 */
const CELULAR = '(max-width: 40rem)'
function usarTopoFixo(barra: RefObject<HTMLDivElement | null>, pronto: boolean, travado: boolean) {
  const travadoRef = useRef(travado)
  travadoRef.current = travado
  const mostrar = useRef<() => void>(() => {})
  useEffect(() => {
    const raiz = document.documentElement
    raiz.classList.add('oq-sessao')
    return () => {
      raiz.classList.remove('oq-sessao', 'oq-cabecalho-oculto')
      for (const v of ['--oq-cabecalho', '--oq-topo-fixo']) raiz.style.removeProperty(v)
    }
  }, [])
  useEffect(() => {
    const raiz = document.documentElement
    const cabecalho = document.querySelector<HTMLElement>('.cabecalho')
    const elBarra = barra.current
    if (!pronto || !elBarra) return
    const celular = window.matchMedia(CELULAR)
    let oculto = false
    let altCabecalho = 0
    let altBarra = 0
    const publicar = () => {
      raiz.style.setProperty('--oq-cabecalho', `${altCabecalho}px`)
      raiz.style.setProperty('--oq-topo-fixo', `${(oculto ? 0 : altCabecalho) + altBarra}px`)
    }
    const definirOculto = (sim: boolean) => {
      if (sim === oculto) return
      oculto = sim
      raiz.classList.toggle('oq-cabecalho-oculto', sim)
      publicar()
    }
    mostrar.current = () => definirOculto(false)
    const medir = () => {
      altCabecalho = cabecalho?.offsetHeight ?? 0
      altBarra = elBarra.offsetHeight
      publicar()
    }
    medir()
    const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null
    if (cabecalho) observador?.observe(cabecalho)
    observador?.observe(elBarra)

    let ultimoY = window.scrollY
    let quadro = 0
    const avaliar = () => {
      quadro = 0
      const y = window.scrollY
      const dy = y - ultimoY
      if (Math.abs(dy) < 6 && y > altCabecalho * 2) return
      ultimoY = y
      const focoNoCabecalho = !!cabecalho && cabecalho.contains(document.activeElement)
      const dialogo = !!document.querySelector('[aria-modal="true"], dialog[open]')
      if (!celular.matches || travadoRef.current || focoNoCabecalho || dialogo || y <= altCabecalho * 2) definirOculto(false)
      else if (dy > 0) definirOculto(true)
      else if (dy < 0) definirOculto(false)
    }
    const aoRolar = () => { if (!quadro) quadro = requestAnimationFrame(avaliar) }
    const aoFocar = () => definirOculto(false)
    const aoMudarTela = () => { if (!celular.matches) definirOculto(false) }
    window.addEventListener('scroll', aoRolar, { passive: true })
    cabecalho?.addEventListener('focusin', aoFocar)
    celular.addEventListener?.('change', aoMudarTela)
    return () => {
      cancelAnimationFrame(quadro)
      observador?.disconnect()
      window.removeEventListener('scroll', aoRolar)
      cabecalho?.removeEventListener('focusin', aoFocar)
      celular.removeEventListener?.('change', aoMudarTela)
      mostrar.current = () => {}
      definirOculto(false)
    }
  }, [barra, pronto])
  // Abriu um painel, o mapa ou um diálogo: o cabeçalho volta e fica.
  useEffect(() => { if (travado) mostrar.current() }, [travado])
}

/** Altura do que está fixo em cima, lida da variável publicada (0 se ainda não medida). */
function topoFixo(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--oq-topo-fixo')) || 0
}

const CHAVE_FIM_MOSTRADO = 'ortoquestoes:fim-mostrado'
const CHAVE_ELOGIOS = 'ortoquestoes:elogio-sessao'

export function Sessao() {
  const { indice } = usarIndice()
  const { sessao, responder, irPara, alternarRevisar, alternarRiscada, finalizar, definirSessao } = usarSessao()
  // Prova do Simulado Nacional: alternativas na ordem da edição, salvamento no servidor, sem gabarito.
  const nacional = sessao?.nacional && !sessao.concluidaEm ? sessao.nacional : null
  const salvamento = usarSalvamentoNacional(sessao, definirSessao)
  // Ao abrir (e ao voltar para a aba), traz o que foi marcado em outro aparelho.
  useEffect(() => {
    if (!nacional) return
    let vivo = true
    const atualizar = () => {
      snIniciar(nacional).then((inicio) => {
        if (!vivo) return
        definirSessao((atual) => (atual?.nacional === nacional && !atual.concluidaEm ? montarSessaoNacional(inicio, atual, atual.filtros) : atual))
      }).catch((falha) => {
        // Já entregue (pelo relógio, em outro aparelho): o resultado está na página do simulado.
        if (vivo && codigoErroSN(falha) === 'ja_entregue') { definirSessao(() => null); navegar('/simulado-nacional', true) }
      })
    }
    atualizar()
    const aoVoltar = () => { if (document.visibilityState === 'visible') atualizar() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { vivo = false; document.removeEventListener('visibilitychange', aoVoltar) }
  }, [nacional, definirSessao])
  const { sessao: conta } = usarConta()
  const { favoritos, alternar: alternarFavorito } = usarFavoritos()
  const [questoes, definirQuestoes] = useState<Questao[] | null>(null)
  const [mapaAberto, definirMapaAberto] = useState(false)
  const [atalhosAbertos, definirAtalhosAbertos] = useState(false)
  const [ajustesAbertos, definirAjustesAbertos] = useState(false)
  const { preferencias, alternar } = usarPreferenciasSessao()
  const pomodoro = usarPomodoro(preferencias.pomodoro, preferencias.somPomodoro)
  const [dicaTeclado, definirDicaTeclado] = useState(false)
  const [portaoContaAberto, definirPortaoContaAberto] = useState(false)
  const [erro, definirErro] = useState<string | null>(null)
  const areaGestos = useRef<HTMLDivElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const barra = useRef<HTMLDivElement>(null)
  // O menu "…" da navegação fecha ao tocar fora ou com Esc.
  const menuMais = useRef<HTMLDetailsElement>(null)
  const fecharMenu = () => { if (menuMais.current) menuMais.current.open = false }
  useEffect(() => {
    const fora = (e: Event) => { if (menuMais.current?.open && !menuMais.current.contains(e.target as Node)) menuMais.current.open = false }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && menuMais.current?.open) { menuMais.current.open = false; menuMais.current.querySelector('summary')?.focus() } }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc) }
  }, [])
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

  // Revisão em ordem nova: só no treino (o simulado e o Simulado Nacional seguem a prova).
  // A decisão usa o que havia antes da sessão começar, então não muda ao responder nem ao recarregar.
  const letrasAcervo = usarLetrasAcervo()
  const ordemRevisao = useMemo(() => {
    if (!questaoAtual || !sessao || sessao.simulado || sessao.nacional || !preferencias.embaralhar) return null
    return ordemParaRevisao(questaoAtual, {
      letras: letrasAcervo ?? null,
      registro: lerRespondidas()[questaoAtual.id],
      desde: sessao.criadaEm,
      semente: sessao.id,
      ultimaExibida: lerUltimaExibida(questaoAtual.id),
    })
  }, [questaoAtual, sessao?.id, sessao?.criadaEm, sessao?.simulado, sessao?.nacional, preferencias.embaralhar, letrasAcervo])

  const respondidas = sessao ? Object.keys(sessao.respostas).length : 0
  const painelAberto = mapaAberto || atalhosAbertos || ajustesAbertos || limiteAberto
  const simulado = !!sessao?.simulado
  // Fim de sessão: ao responder a última, o pop-up abre no meio da tela (uma vez
  // por sessão); quem prefere ler o comentário antes ganha o botão flutuante.
  const tudoRespondido = total > 0 && respondidas === total
  // Guardado na aba: depois de um F5 lendo o último comentário, o pop-up não reabre
  // e o botão flutuante de concluir continua lá.
  const idSessao = sessao ? `${sessao.id}:${sessao.criadaEm ?? ''}` : ''
  const [fim, definirFim] = useState<'fechado' | 'aberto' | 'lendo'>(() => {
    try { return tudoRespondido && sessionStorage.getItem(CHAVE_FIM_MOSTRADO) === idSessao ? 'lendo' : 'fechado' } catch { return 'fechado' }
  })
  useEffect(() => {
    if (!tudoRespondido) return
    try { if (sessionStorage.getItem(CHAVE_FIM_MOSTRADO) === idSessao) return } catch { /* sem armazenamento: mostra */ }
    const t = window.setTimeout(() => {
      try { sessionStorage.setItem(CHAVE_FIM_MOSTRADO, idSessao) } catch { /* idem */ }
      definirFim('aberto')
    }, simulado ? 300 : 900)
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

  // O nome da pessoa nas frases-chave (adendo do dono, 18/10/2026); sem nome, a frase funciona sem ele.
  const nome = primeiroNome(conta?.user.user_metadata?.nome)
  // Incentivo calmo nas sequências de 5 e 10 acertos: uma vez por nível em cada sessão.
  const [elogio, definirElogio] = useState<string | null>(null)
  const comboAnterior = useRef(combo)
  const temporizadorElogio = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(temporizadorElogio.current), [])
  useEffect(() => {
    const antes = comboAnterior.current
    comboAnterior.current = combo
    // Só uma resposta nova conta: reabrir a sessão ou sincronizar outro aparelho não comemora.
    if (combo !== antes + 1 || !idSessao) return
    const nivel = combo >= 10 && antes < 10 ? 10 : combo >= 5 && antes < 5 ? 5 : 0
    if (!nivel) return
    const chave = `${CHAVE_ELOGIOS}:${idSessao}:${nivel}`
    try { if (sessionStorage.getItem(chave)) return; sessionStorage.setItem(chave, '1') } catch { /* sem armazenamento: mostra */ }
    const frase = nivel === 10 ? 'dez seguidas. Ritmo de prova.' : 'cinco seguidas.'
    definirElogio(nome ? `${nome}, ${frase}` : frase.charAt(0).toUpperCase() + frase.slice(1))
    window.clearTimeout(temporizadorElogio.current)
    temporizadorElogio.current = window.setTimeout(() => definirElogio(null), 3600)
  }, [combo, idSessao, nome])
  useEffect(() => { definirElogio(null) }, [idSessao])

  usarTopoFixo(barra, !!(sessao && questoes), painelAberto || portaoContaAberto || fim === 'aberto')

  // Destaques da sessão para o fim: o tema com mais acertos e o que mais pede revisão.
  const destaques = useMemo(() => {
    if (!sessao || simulado || !questoes) return { melhor: null, oportunidade: null }
    const porTema = new Map<string, { certas: number; erradas: number }>()
    for (const q of questoes) {
      const r = sessao.respostas[q.id]
      if (!r || r.correta === null || !q.tema) continue
      const t = porTema.get(q.tema) ?? { certas: 0, erradas: 0 }
      if (r.correta) t.certas++; else t.erradas++
      porTema.set(q.tema, t)
    }
    const lista = [...porTema.entries()]
    const melhor = lista.filter(([, t]) => t.certas >= 2 && t.certas > t.erradas)
      .sort((x, y) => y[1].certas - x[1].certas || x[1].erradas - y[1].erradas)[0]?.[0] ?? null
    const oportunidade = lista.filter(([nomeTema, t]) => nomeTema !== melhor && t.erradas >= 2)
      .sort((x, y) => y[1].erradas - x[1].erradas)[0]?.[0] ?? null
    return { melhor, oportunidade }
  }, [sessao, simulado, questoes])

  // Cronômetro do simulado. O relógio corre no mundo: fechar a aba não pausa
  // a prova, e reabrir mostra o tempo que sobrou de verdade.
  const [restante, definirRestante] = useState<number | null>(() =>
    sessao ? segundosRestantes(sessao) : null,
  )
  // Depende só do que o relógio usa: com o objeto inteiro, o intervalo era
  // recriado a cada resposta ou troca de questão.
  const criadaEm = sessao?.criadaEm ?? 0
  const limiteSegundos = sessao?.limiteSegundos ?? 0
  const prazoEm = sessao?.prazoEm ?? 0
  const encerrada = !!sessao?.concluidaEm
  useEffect(() => {
    if ((!limiteSegundos && !prazoEm) || encerrada) return
    // O Simulado Nacional conta até o prazo do servidor; os outros, do início mais o limite.
    const fim = prazoEm || criadaEm + limiteSegundos * 1000
    const medir = () => definirRestante(Math.round((fim - Date.now()) / 1000))
    medir()
    const relogio = window.setInterval(medir, 1000)
    return () => window.clearInterval(relogio)
  }, [criadaEm, limiteSegundos, prazoEm, encerrada])

  // Prova do Simulado Nacional: um aviso calmo com 15 e com 5 minutos (uma vez cada).
  const avisados = useRef<number[]>([])
  const [avisoTempo, definirAvisoTempo] = useState<string | null>(null)
  useEffect(() => { avisados.current = []; definirAvisoTempo(null) }, [nacional])
  useEffect(() => {
    if (!nacional) return
    const marco = alertaDeTempo(restante, avisados.current)
    if (!marco) return
    // Abrir a prova já perto do fim não repete o aviso dos 15.
    avisados.current = marco === 5 ? [15, 5] : [15]
    definirAvisoTempo(marco === 15 ? 'Faltam 15 minutos. Dá tempo de rever as marcadas.' : 'Faltam 5 minutos. O que estiver marcado entra na entrega.')
    const t = window.setTimeout(() => definirAvisoTempo(null), 9000)
    return () => window.clearTimeout(t)
  }, [restante, nacional])

  // Acabou a cota grátis de hoje: seguir para uma questão ainda não respondida
  // abre o convite; fechar leva ao resumo da sessão.
  // A prova do Simulado Nacional não gasta o limite diário.
  const limiteZerado = !sessao?.nacional && !!(estadoLimite?.paywallAtivo && !estadoLimite.ilimitado && estadoLimite.restantes === 0)
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

  // Trocou de questão: o topo do cartão para logo abaixo da barra fixa (nunca embaixo dela).
  // Só sobe: quem está no alto da página continua vendo os avisos de cima.
  useEffect(() => {
    const el = palco.current
    if (!el) { window.scrollTo({ top: 0, behavior: 'auto' }); return }
    const cabecalho = document.querySelector<HTMLElement>('.cabecalho')?.offsetHeight ?? 0
    const barraAltura = barra.current?.offsetHeight ?? Math.max(0, topoFixo() - cabecalho)
    // Rolar para cima traz o cabeçalho de volta: a conta usa a altura dele inteira.
    const alvo = el.getBoundingClientRect().top + window.scrollY - cabecalho - barraAltura - 8
    window.scrollTo({ top: Math.max(0, Math.min(window.scrollY, alvo)), behavior: 'auto' })
  }, [posicao])

  // Passar para o lado (18/10/2026): ao trocar pelos botões, setas ou mapa, a questão nova
  // entra pelo lado de onde veio, em 220 ms e só com transform/opacity. Depois de um
  // deslize, quem anima é o gesto (usarDeslizar marca o palco), então aqui não repete.
  const posicaoAnterior = useRef(posicao)
  useEffect(() => {
    const antes = posicaoAnterior.current
    posicaoAnterior.current = posicao
    const el = palco.current
    if (!el || antes === posicao) return
    if (el.dataset.deslizou) { delete el.dataset.deslizou; return }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof el.animate !== 'function') return
    const lado = posicao > antes ? 1 : -1
    el.animate(
      [{ transform: `translateX(${lado * 32}px)`, opacity: 0.25 }, { transform: 'translateX(0)', opacity: 1 }],
      { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
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

  // As figuras da próxima descem em toda sessão, simulado inclusive (lá a espera
  // pela imagem gasta o cronômetro): ao avançar, a imagem já está no cache.
  useEffect(() => {
    if (!sessao || !questoes) return
    const proxima = questoes.find((q) => q.id === sessao.ids[posicao + 1])
    for (const imagem of proxima?.imagens ?? []) new Image().src = urlImagem(imagem.arquivo)
  }, [questoes, sessao, posicao])

  // Deslizar troca de questão. Na última, o cartão só resiste: encerrar a
  // sessão continua sendo um toque de propósito, nunca um gesto sem querer.
  const espiar = usarDeslizar({
    area: areaGestos, palco, pronto: !!(sessao && questoes), ativo: !painelAberto,
    podeAvancar: !!sessao && posicao + 1 < sessao.ids.length, podeVoltar: posicao > 0,
    aoAvancar: irAdiante, aoVoltar: () => irPara(posicao - 1),
  })
  // Em toda sessão nova (uma vez por sessão, não a cada recarregar), a dica
  // aparece num aviso esmaecido no meio da tela por 5 s, ou até a pessoa tocar
  // nele: no celular, arrastar para o lado; no computador, as setas do teclado.
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
      window.setTimeout(() => definirDicaDeslizar(false), 900 + 5000),
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
      window.setTimeout(() => definirDicaTeclado(false), 900 + 5000),
    ]
  }, [questoes, temVarias, chaveDica])

  // Tempo esgotado encerra o simulado sozinho e leva ao resumo.
  useEffect(() => {
    if (restante === null || restante > 0) return
    if (!sessao || sessao.concluidaEm) return
    finalizar()
    navegar('/resumo')
  }, [restante, sessao, finalizar])

  // Sessão já encerrada não volta a aceitar respostas (o Voltar do navegador
  // trazia a pessoa para cá): as respostas novas não entrariam no histórico.
  const concluida = !!sessao?.concluidaEm
  useEffect(() => {
    if (concluida) navegar('/resumo', true)
  }, [concluida])
  if (concluida) return null

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

  // Respondida a atual, a barra fixa do topo ganha o "Próxima": no celular, o comentário
  // longo deixava o botão do fim a milhares de pixels de distância.
  const atualRespondida = !!(questaoAtual && sessao.respostas[questaoAtual.id])
  const proximaNaoRespondida = sessao.ids.findIndex(
    (id, i) => i > posicao && !sessao.respostas[id],
  )

  function avancar() {
    if (limiteZerado) { irAdiante(); return }
    if (posicao + 1 < total) irPara(posicao + 1)
    else concluir()
  }

  async function concluir() {
    // Simulado Nacional: antes de entregar, quantas ficaram em branco e marcadas para rever.
    if (sessao!.nacional) {
      const { brancas, revisar: paraRever, total: n } = resumoParaEntregar(sessao!)
      const situacaoProva = [
        brancas === 0 ? `As ${n} estão respondidas` : `${brancas} de ${n} ${brancas === 1 ? 'está' : 'estão'} em branco`,
        paraRever ? `${paraRever} ${paraRever === 1 ? 'está marcada' : 'estão marcadas'} para rever` : '',
      ].filter(Boolean).join(' e ')
      const sim = await confirmar({
        titulo: 'Entregar a prova agora?',
        texto: `${situacaoProva}. Depois de entregar, as respostas não mudam mais. Na hora, você vê a nota, a correção comentada e a sua posição.`,
        sim: 'Entregar a prova',
        nao: 'Voltar à prova',
      })
      if (!sim) return
      await salvamento.salvarAgora().catch(() => {})
    }
    finalizar()
    navegar('/resumo')
  }
  // Coluna lateral só com o que a pessoa deixou ligado em Personalizar; sem nada, o cartão fica sozinho.
  const comLado = preferencias.placar || preferencias.mapa || preferencias.atalhos || preferencias.pomodoro || !!nacional
  const classesSessao = ['sessao-gestos', 'sx-sessao', comLado ? 'sx-sessao--com-lado' : 'sx-sessao--sem-lado']
  if (!preferencias.mapa) classesSessao.push('sx-sessao--sem-mapa-lado')
  if (!preferencias.dicasTeclado) classesSessao.push('sx-sessao--sem-teclas')
  return (
    <div className={classesSessao.join(' ')} ref={areaGestos}>
      <button
        type="button"
        className="seta-lateral seta-lateral--esquerda sx-seta nao-imprime"
        onClick={() => irPara(posicao - 1)}
        disabled={posicao === 0}
        aria-label="Questão anterior"
        title="Questão anterior (←)"
      >
        <Icone nome="esquerda" tamanho={22} />
      </button>
      <button
        type="button"
        className={'seta-lateral seta-lateral--direita sx-seta nao-imprime' + (atualRespondida ? ' sx-seta--pronta' : '')}
        onClick={irAdiante}
        disabled={posicao + 1 >= total}
        aria-label="Próxima questão"
        title="Próxima questão (→)"
      >
        <Icone nome="direita" tamanho={22} />
      </button>
      <div className="barra-sessao sx-barra nao-imprime" ref={barra}>
        {sessao.origem === 'cronograma' && !simulado && <FaixaCronograma respondidasNaSessao={respondidas} />}
        <div className={'conteudo barra-sessao__interno sx-barra__interno' + (atualRespondida ? ' barra-sessao__interno--respondida' : '')}>
          <div className="sx-barra__linha">
            <p className="sx-contador">
              <span className="barra-sessao__texto barra-sessao__texto--pixel">{respondidas} de {total}</span>
              <span className="sx-contador__rotulo">{respondidas === 1 ? 'respondida' : 'respondidas'}</span>
            </p>
            {/* A linha viva: a dica de trocar de questão, o incentivo das sequências ou o placar da sessão.
                Fica dentro da barra (antes, a dica flutuava por cima do "Escolha uma alternativa"). */}
            {/* Região viva fixa: o leitor de tela ouve o incentivo mesmo que a plaquinha nasça e suma. */}
            <span className="so-leitor" role="status" aria-live="polite">{avisoTempo ?? elogio ?? ''}</span>
            <div className="sx-vivo">
              {avisoTempo ? (
                <span className="sx-aviso sx-aviso--tempo" aria-hidden="true"><Icone nome="relogio" tamanho={12} /> {avisoTempo}</span>
              ) : elogio ? (
                <span className="sx-aviso sx-aviso--elogio" aria-hidden="true"><img src={recurso('ranking/chama.png')} width={14} height={14} alt="" />{elogio}</span>
              ) : preferencias.placar && combo >= 3 ? (
                <span className="barra-sessao__combo sx-vivo__combo" title="Acertos seguidos nesta sessão"><img src={recurso('ranking/chama.png')} width={14} height={14} alt="" /> {porExtenso(combo)} seguidas</span>
              ) : preferencias.placar && !simulado && acertosSessao > 0 && acertosSessao * 2 >= respondidas ? (
                <span className="sx-vivo__placar"><Icone nome="certo" tamanho={13} /> {porExtenso(acertosSessao, 'm')} {acertosSessao === 1 ? 'acerto' : 'acertos'}</span>
              ) : nacional ? (
                <span className={'sx-vivo__salvo' + (salvamento.situacao === 'sem-rede' ? ' sx-vivo__salvo--alerta' : '')} title={textoSalvamento(salvamento)}><Icone nome={salvamento.situacao === 'sem-rede' ? 'alerta' : 'certo'} tamanho={13} /> {salvamento.situacao === 'sem-rede' ? 'Sem conexão' : salvamento.situacao === 'salvo' ? 'Salvo' : 'Salvando…'}</span>
              ) : null}
            </div>
            {restante !== null && (
              <span
                className={'cronometro sx-cronometro sx-cronometro--barra' + (restante <= 300 ? ' cronometro--acabando' : '')}
                role="timer"
                aria-label={`Tempo restante do simulado: ${formatarDuracao(restante)}`}
              >
                {formatarDuracao(restante)}
              </span>
            )}
            {preferencias.pomodoro && <PomodoroPilula controle={pomodoro} />}
            <button
              type="button"
              className="botao barra-sessao__mapa sx-botao"
              onClick={() => definirMapaAberto(true)}
            >
              <Icone nome="mapa" tamanho={16} />
              <span className="barra-sessao__mapa-rotulo">Mapa</span>
            </button>
            {atualRespondida && (
              <button
                type="button"
                className="botao botao--principal barra-sessao__proxima sx-botao sx-botao--ouro"
                onClick={avancar}
                title={posicao + 1 < total ? 'Próxima questão (→)' : nacional ? 'Entregar a prova' : 'Concluir a sessão'}
              >
                {posicao + 1 < total ? 'Próxima' : nacional ? 'Entregar' : 'Concluir'}
                <Icone nome="direita" tamanho={16} />
              </button>
            )}
            <button
              type="button"
              className="botao-icone barra-sessao__teclado sx-botao-icone"
              onClick={() => definirAtalhosAbertos(true)}
              aria-label="Ver atalhos de teclado"
              title="Atalhos (?)"
            >
              <Icone nome="teclado" />
            </button>
            <button
              type="button"
              className="botao sx-botao sx-ajustes"
              onClick={() => definirAjustesAbertos(true)}
              aria-label="Personalizar a tela: mapa, Pomodoro e o que mais aparece"
              title="Adicionar mapa, Pomodoro, placar e atalhos"
            >
              <Icone nome="ajustes" tamanho={16} />
              <span className="sx-ajustes__rotulo">Personalizar</span>
            </button>
          </div>
          {/* No modo prova o gabarito fica escondido: respondida aparece só como respondida. */}
          <TrilhaSessao ids={sessao.ids} respostas={sessao.respostas} posicao={posicao} simulado={simulado} aoIr={irPara} />
        </div>
      </div>
      <div className="sx-corpo">
      <div className="sx-principal">
      {conta && !assinante && !simulado && !avisoSaldoFechado && respondidas === 0 && saldoInicial !== null && saldoInicial > 0 && saldoInicial < total && (
        <p className="aviso-saldo nao-imprime" role="status">
          <Icone nome="relogio" tamanho={16} />
          <span>Hoje restam <b>{saldoInicial}</b> {saldoInicial === 1 ? 'questão gratuita' : 'questões gratuitas'}: esta sessão vai até a {saldoInicial}ª e depois mostra o seu resumo. As outras ficam para amanhã.</span>
          <button type="button" className="aviso-saldo__fechar" aria-label="Fechar aviso" onClick={() => definirAvisoSaldoFechado(true)}><Icone nome="fechar" tamanho={14} /></button>
        </p>
      )}
      <div className="sessao-palco" ref={palco}>
      {questaoAtual && letrasAcervo === undefined && preferencias.embaralhar && !simulado && !nacional ? (
        <Carregando linhas={6} />
      ) : questaoAtual ? (
        <><AvisoLimite estado={estadoLimite} />{sessao.respostas[questaoAtual.id]?.outroAparelho && <p className="conteudo aviso-outro-aparelho" role="note">Você já respondeu esta questão em outro aparelho. Siga para a próxima.</p>}<CartaoQuestao
          questao={questaoAtual}
          numero={posicao + 1}
          total={total}
          resposta={sessao.respostas[questaoAtual.id]}
          riscadas={sessao.riscadas[questaoAtual.id] ?? []}
          favorita={favoritos.includes(questaoAtual.id)}
          marcadaRevisao={sessao.revisar.includes(questaoAtual.id)}
          aoProxima={avancar}
          rotuloProxima={posicao + 1 < total ? 'Próxima questão' : nacional ? 'Entregar a prova' : 'Ver o resultado'}
          permutacao={nacional ? sessao.permutacoes?.[questaoAtual.id] ?? null : null}
          ordemRevisao={ordemRevisao}
          modoProva={!!nacional}
          aoResponder={async (letra, correta, segundos, confianca, ordemExibida) => {
            if (!conta) { definirPortaoContaAberto(true); return }
            // Prova do Simulado Nacional: a letra (a nova, da edição) vai para o servidor; a correção é de lá.
            if (nacional) { responder(questaoAtual.id, letra, null, segundos, confianca); return }
            if (autorizando.current) return
            autorizando.current = true
            try {
              const chaveMapa = `${sessao.id}:${questaoAtual.id}`
              const chave = chavesResposta.current.get(chaveMapa) ?? gerarId()
              chavesResposta.current.set(chaveMapa, chave)
              const permissao = await autorizar(questaoAtual.id, chave)
              if (permissao.falhaValidacao) throw erroDeConexao()
              if (!permissao.permitido) {
                // Com respostas na sessão, o limite vira fechamento: o resumo
                // mostra o dia cumprido em vez de um painel no meio da questão.
                if (permissao.paywallAtivo && !permissao.falhaValidacao) { marcarConviteLimiteVisto(permissao.liberaEm); definirResumoAoFechar(respondidas > 0) }
                definirLimiteAberto(true); return
              }
              responder(questaoAtual.id, letra, correta, segundos, confianca, ordemExibida)
              // Onde a certa estava desta vez: a próxima revisão a põe em outra letra.
              if (questaoAtual.gabarito) registrarExibida(questaoAtual.id, letraExibida(ordemExibida, questaoAtual.gabarito))
            } finally { autorizando.current = false }
          }}
          aoRiscar={(letra) => alternarRiscada(questaoAtual.id, letra)}
          aoFavoritar={() => alternarFavorito(questaoAtual.id)}
          aoRevisar={() => alternarRevisar(questaoAtual.id)}
          aoAvancar={avancar}
          atalhosAtivos={!painelAberto}
          revelarResposta={!simulado}
          chaveTempo={sessao.id}
        /></>
      ) : (
        <Estado titulo="Esta questão saiu do acervo.">
          <p>Ela foi removida ou renomeada em uma atualização. Siga para a próxima.</p>
        </Estado>
      )}
      </div>

      <nav className="nav-sessao sx-nav nao-imprime" aria-label="Navegação da sessão">
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
        {/* Três ações no máximo: Anterior, Próxima (que também pula a não respondida) e o resto no "…". */}
        <details className="nav-sessao__mais" ref={menuMais}>
          <summary className="botao botao--fantasma" aria-label="Mais ações da sessão">
            <span aria-hidden="true">…</span>
          </summary>
          <div className="nav-sessao__menu" role="menu">
            {proximaNaoRespondida > -1 && proximaNaoRespondida !== posicao + 1 && (
              <button type="button" role="menuitem" onClick={() => { fecharMenu(); irPara(proximaNaoRespondida) }}>
                Ir para a próxima não respondida
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => { fecharMenu(); definirMapaAberto(true) }}>
              Mapa de questões
            </button>
            <button type="button" role="menuitem" onClick={() => { fecharMenu(); void concluir() }} disabled={respondidas === 0 && !nacional}>
              {nacional ? 'Entregar a prova' : simulado ? 'Entregar o simulado' : 'Encerrar e ver resumo'}
            </button>
          </div>
        </details>
        <button
          type="button"
          className={"botao botao--principal nav-sessao__proxima" + (atualRespondida ? " sx-nav__proxima--pronta" : "")}
          onClick={avancar}
          disabled={posicao + 1 >= total && respondidas === 0}
        >
          {posicao + 1 < total && <kbd className="nav-sessao__tecla" aria-hidden="true">→</kbd>}
          {posicao + 1 < total ? 'Próxima' : nacional ? 'Entregar' : 'Concluir'}
          <Icone nome="direita" tamanho={16} />
        </button>
      </nav>
      </div>

      {/* Coluna lateral do computador largo (19/10/2026): o mapa, o placar vivo, o tempo do
          simulado e os atalhos ficam à vista ao lado do cartão. Abaixo de 72rem some (display:
          none, fora da árvore de acessibilidade) e o botão Mapa da barra volta. */}
      {comLado && <aside className="sx-lado nao-imprime" aria-label="Painel da sessão">
        {(preferencias.placar || nacional) && <section className="sx-lado__bloco sx-lado__bloco--topo">
          <h2 className="sx-lado__titulo">{nacional ? (nome ? `${nome}, sua prova` : 'Sua prova') : nome ? `${nome}, sua sessão` : 'Sua sessão'}</h2>
          <p className="sx-lado__conta"><b className="numerico">{respondidas}</b> de {total} {respondidas === 1 ? 'respondida' : 'respondidas'}</p>
          {combo >= 3 ? (
            <p className="sx-lado__vivo sx-lado__vivo--combo"><img src={recurso('ranking/chama.png')} width={14} height={14} alt="" /> {porExtenso(combo)} acertos seguidos</p>
          ) : !simulado && acertosSessao > 0 && acertosSessao * 2 >= respondidas ? (
            <p className="sx-lado__vivo"><Icone nome="certo" tamanho={13} /> {porExtenso(acertosSessao, 'm')} {acertosSessao === 1 ? 'acerto' : 'acertos'} até aqui</p>
          ) : null}
          {restante !== null && (
            <p className="sx-lado__tempo">
              <span>Tempo restante</span>
              <span
                className={'cronometro sx-cronometro' + (restante <= 300 ? ' cronometro--acabando' : '')}
                role="timer"
                aria-label={`Tempo restante do simulado: ${formatarDuracao(restante)}`}
              >
                {formatarDuracao(restante)}
              </span>
            </p>
          )}
          {nacional && <p className={'sx-lado__salvo' + (salvamento.situacao === 'sem-rede' ? ' sx-lado__salvo--alerta' : '')}><Icone nome={salvamento.situacao === 'sem-rede' ? 'alerta' : 'certo'} tamanho={13} /> {textoSalvamento(salvamento)}</p>}
          {nacional && <p className="sx-lado__nota">Sem gabarito até entregar. Pode trocar de aparelho: entre na mesma conta e continue.</p>}
        </section>}
        {preferencias.pomodoro && <section className="sx-lado__bloco" aria-labelledby="sx-lado-pomodoro">
          <h3 className="sx-lado__subtitulo" id="sx-lado-pomodoro">Pomodoro
            <button type="button" className="sx-lado__esconder" onClick={() => alternar('pomodoro')} aria-label="Esconder o Pomodoro" title="Esconder"><Icone nome="olho-riscado" tamanho={15} /></button>
          </h3>
          <PomodoroBloco controle={pomodoro} />
        </section>}
        {preferencias.mapa && <section className="sx-lado__bloco" aria-labelledby="sx-lado-mapa">
          <h3 className="sx-lado__subtitulo" id="sx-lado-mapa">Mapa <kbd>M</kbd>
            <button type="button" className="sx-lado__esconder" onClick={() => alternar('mapa')} aria-label="Esconder o mapa" title="Esconder"><Icone nome="olho-riscado" tamanho={15} /></button>
          </h3>
          <MapaQuestoes
            compacto
            ids={sessao.ids}
            respostas={sessao.respostas}
            revisar={sessao.revisar}
            revelar={!simulado}
            posicao={posicao}
            aoEscolher={irPara}
          />
        </section>}
        {preferencias.atalhos && <details className="sx-lado__bloco sx-lado__atalhos">
          <summary className="sx-lado__subtitulo">Atalhos de teclado <kbd>?</kbd></summary>
          <Atalhos />
        </details>}
        <button type="button" className="sx-lado__ajustes" onClick={() => definirAjustesAbertos(true)}><Icone nome="ajustes" tamanho={15} /> Personalizar a tela</button>
      </aside>}
      </div>

      {(dicaDeslizar || dicaTeclado) && !painelAberto && (
        <button
          type="button"
          className="sx-dica-popup nao-imprime"
          onClick={() => { definirDicaDeslizar(false); definirDicaTeclado(false) }}
          aria-label={(dicaDeslizar ? 'Arraste para o lado para trocar de questão' : 'Use as setas do teclado para trocar de questão') + '. Toque para fechar.'}
        >
          {dicaDeslizar ? (
            <>
              <span className="sx-dica-popup__gesto" aria-hidden="true"><Icone nome="esquerda" tamanho={22} /><span className="sx-dica-popup__dedo" /><Icone nome="direita" tamanho={22} /></span>
              <span className="sx-dica-popup__texto">Arraste para o lado para trocar de questão</span>
            </>
          ) : (
            <>
              <span className="sx-dica-popup__teclas" aria-hidden="true"><kbd>←</kbd><kbd>→</kbd></span>
              <span className="sx-dica-popup__texto">Use as setas do teclado para trocar de questão</span>
            </>
          )}
        </button>
      )}

      <Painel
        titulo="Mapa de questões"
        aberto={mapaAberto}
        aoFechar={() => definirMapaAberto(false)}
      >
        <p className="meta sx-mapa__resumo">
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
        titulo="Personalizar a tela"
        aberto={ajustesAbertos}
        aoFechar={() => definirAjustesAbertos(false)}
      >
        <AjustesTela preferencias={preferencias} alternar={alternar} />
      </Painel>

      <Painel
        titulo="Atalhos de teclado"
        aberto={atalhosAbertos}
        aoFechar={() => definirAtalhosAbertos(false)}
      >
        <Atalhos />
      </Painel>

      {fim === 'aberto' && <ModalFimSessao total={total} acertos={simulado ? null : acertosSessao} simulado={simulado} nome={nome} melhorTema={destaques.melhor} oportunidade={destaques.oportunidade} aoConcluir={concluir} aoLer={() => definirFim('lendo')} />}
      {fim === 'lendo' && tudoRespondido && <BotaoConcluirFlutuante aoConcluir={concluir} simulado={simulado} />}
      <PortaoConta aberto={portaoContaAberto} aoFechar={() => definirPortaoContaAberto(false)} />
      <PainelLimite estado={estadoLimite} aberto={limiteAberto} aoFechar={() => { definirLimiteAberto(false); if (resumoAoFechar) { definirResumoAoFechar(false); concluir() } }} />
    </div>
  )
}

// Começa a baixar já: a primeira questão só aparece quando se sabe se ela vem em ordem nova.
void carregarLetrasAcervo()

const OPCOES_TELA: Array<[keyof PreferenciasSessao, string, string]> = [
  ['placar', 'Placar da sessão', 'Quantas você respondeu e os acertos seguidos, ao lado da questão.'],
  ['mapa', 'Mapa ao lado', 'A grade das questões fica à vista. Desligado, ele abre pelo botão Mapa ou pela tecla M.'],
  ['pomodoro', 'Pomodoro', 'Blocos de foco (25 ou 50 minutos) com pausa, que continuam ao trocar de questão.'],
  ['somPomodoro', 'Som no fim do foco e da pausa', 'Duas notas curtas quando a fase termina.'],
  ['atalhos', 'Atalhos de teclado ao lado', 'A lista fica fechada embaixo da coluna; a tecla ? mostra sempre.'],
  ['dicasTeclado', 'Dica de teclas embaixo das alternativas', 'A linha "Teclas 1–4 selecionam…" no computador.'],
  ['embaralhar', 'Revisão em ordem nova', 'Na segunda vez em diante, as alternativas mudam de lugar e a certa sai da letra da última vez: você raciocina em vez de lembrar a letra. Na primeira vez, a ordem é a da prova.'],
]

/** Personalizar a tela da sessão: cada peça liga e desliga, e a escolha fica salva neste aparelho. */
function AjustesTela({ preferencias, alternar }: { preferencias: PreferenciasSessao; alternar: (chave: keyof PreferenciasSessao) => void }) {
  return (
    <div className="sx-ajustes-lista">
      <p className="meta">A tela começa limpa, só com a questão. Ligue aqui o que ajuda você: fica salvo neste aparelho. Em telas largas, o placar, o mapa, o Pomodoro e os atalhos aparecem numa coluna ao lado; no celular, o Pomodoro fica na barra de cima.</p>
      {OPCOES_TELA.filter(([chave]) => chave !== 'somPomodoro' || preferencias.pomodoro).map(([chave, titulo, explicacao]) => (
        <label key={chave} className="sx-ajuste">
          <span className="sx-ajuste__texto"><b>{titulo}</b><small>{explicacao}</small></span>
          <input type="checkbox" role="switch" className="sx-ajuste__chave" checked={preferencias[chave]} onChange={() => alternar(chave)} />
        </label>
      ))}
    </div>
  )
}
