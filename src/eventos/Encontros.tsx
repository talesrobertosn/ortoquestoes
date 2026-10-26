import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usarConta } from '../conta/ContextoConta'
import { EVENTO_DADOS, ler, type MudancaDados } from '../estado/armazenamento'
import type { RegistroQuestao } from '../estado/revisao'
import type { EstadoSessao } from '../dados/tipos'
import { DATA_TEOT } from '../dados/calendarioProvas'
import { chaveDoDia } from '../util/dia'
import { recurso } from '../config'
import { href } from '../util/rotas'
import { AVISO_EVENTOS, eventosLigados } from './preferencias'
import { guardarLembrancas, lerLembrancas, registrarAparicao, ultimaAparicao } from './memoria'
import { avancaCodigo, CODIGO, escolher, liberadoPeloRelogio, marcosCruzados, permitido, recordeDoDia, semMovimento, type Contexto, type Evento } from './regras'
import './encontros.css'

/** Tempo de cada visita no canto (o convite para o Arquivo fica um pouco mais). */
const DURACAO = 7_000
const DURACAO_ARQUIVO = 10_000
const SVG = 'http://www.w3.org/2000/svg'

/** Liga uma classe por um instante (e reinicia a animação se ela já estava rodando). */
function pulsar(el: HTMLElement, classes: string, ms: number) {
  const lista = classes.split(' ')
  el.classList.remove(...[...el.classList].filter(c => c.startsWith('oq-tinel') || c === 'oq-reflexo' || c === 'oq-choque'))
  void el.offsetWidth
  el.classList.add(...lista)
  setTimeout(() => el.classList.remove(...lista), ms)
}

/** Camada decorativa presa à logo (fixa, sem toque, removida sozinha). */
function camadaSobre(logo: HTMLElement, classe: string, folga: number, ms: number) {
  const r = logo.getBoundingClientRect()
  const camada = document.createElement('span')
  camada.className = classe
  camada.setAttribute('aria-hidden', 'true')
  Object.assign(camada.style, { left: `${r.left - folga}px`, top: `${r.top - folga}px`, width: `${r.width + folga * 2}px`, height: `${r.height + folga * 2}px` })
  document.body.appendChild(camada)
  setTimeout(() => camada.remove(), ms)
  return { camada, largura: r.width + folga * 2, altura: r.height + folga * 2 }
}

/** Zigue-zague de um raio entre dois pontos, com desvios que diminuem nas pontas. */
function raio(x0: number, y0: number, x1: number, y1: number, amplitude: number) {
  const passos = 13, nx = -(y1 - y0), ny = x1 - x0, n = Math.hypot(nx, ny) || 1
  let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`
  for (let i = 1; i < passos; i++) {
    const t = i / passos, desvio = (Math.random() * 2 - 1) * amplitude * Math.sin(Math.PI * t)
    d += ` L${(x0 + (x1 - x0) * t + nx / n * desvio).toFixed(1)} ${(y0 + (y1 - y0) * t + ny / n * desvio).toFixed(1)}`
  }
  return `${d} L${x1.toFixed(1)} ${y1.toFixed(1)}`
}

/**
 * Sinal de Tinel, toques 2 a 4: a logo "formiga". Um anel fino de pontinhos dourados acende em
 * volta dela, mais forte a cada toque, como agulhadas leves.
 */
function formigar(logo: HTMLElement, toque: number) {
  pulsar(logo, `oq-tinel oq-tinel--${toque}`, 320)
  const { camada } = camadaSobre(logo, 'oq-formigas', 10, 700)
  camada.style.setProperty('--forca', String(toque - 1))
  const total = 6 + toque * 4
  // Pontinhos numa elipse que abraça a logo (ela é larga), saindo um pouco para fora.
  camada.innerHTML = Array.from({ length: total }, (_, i) => {
    const a = (i / total) * Math.PI * 2 + Math.random() * 0.3, cx = Math.cos(a), cy = Math.sin(a)
    return `<i style="left:${(50 + cx * 46).toFixed(1)}%;top:${(50 + cy * 42).toFixed(1)}%;--dx:${(cx * 6).toFixed(1)}px;--dy:${(cy * 6).toFixed(1)}px;--t:${(Math.random() * 0.12).toFixed(2)}s"></i>`
  }).join('')
}

/**
 * O choque do Tinel (quinto toque): um clarão rápido, três arcos elétricos que contornam a logo
 * e se apagam, faíscas que saltam para fora e um tremor que amortece. Menos de um segundo, sem
 * inverter cores nem sacudir a página.
 */
function choque(logo: HTMLElement) {
  pulsar(logo, 'oq-choque', 950)
  const folga = 26
  const { camada, largura: w, altura: h } = camadaSobre(logo, 'oq-choque-camada', folga, 1100)
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  svg.setAttribute('width', String(w)); svg.setAttribute('height', String(h))
  const f = folga - 6
  const arcos = [
    raio(f, f + 4, w - f, f - 2, 7),
    raio(w - f + 4, h - f, f - 4, h - f + 3, 7),
    raio(f + w * 0.12, h - f + 2, w * 0.62, f - 4, 9),
  ]
  arcos.forEach((d, i) => {
    for (const tipo of ['halo', 'nucleo']) {
      const caminho = document.createElementNS(SVG, 'path')
      caminho.setAttribute('d', d)
      caminho.setAttribute('class', `oq-choque__${tipo}`)
      caminho.setAttribute('pathLength', '100')
      caminho.style.setProperty('--t', `${i * 0.07}s`)
      svg.appendChild(caminho)
    }
  })
  const clarao = document.createElement('span')
  clarao.className = 'oq-choque__clarao'
  camada.append(clarao, svg)
  for (let i = 0; i < 12; i++) {
    const faisca = document.createElement('i')
    faisca.className = 'oq-choque__faisca'
    const a = (i / 12) * 360 + Math.random() * 20
    faisca.style.cssText = `--a:${a.toFixed(0)}deg;--d:${(26 + Math.random() * 22).toFixed(0)}px;--t:${(0.04 + Math.random() * 0.12).toFixed(2)}s`
    camada.appendChild(faisca)
  }
}

/** Confete em pixels: posição, cor, atraso e giro de cada pedaço (fixos para não piscar ao rerenderizar). */
const CONFETES = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37) % 100, atraso: ((i * 53) % 40) / 100, giro: ((i * 71) % 2 ? 1 : -1) * (180 + (i * 29) % 260),
  deriva: ((i * 17) % 30) - 15, cor: i % 4, largo: i % 3 === 0,
}))

/** Rótulo pequeno acima do título, conforme o tipo de visita. */
function rotulo(e: Evento) {
  if (e.arquivo) return 'Você achou um segredo'
  if (e.efeito === 'confete' || e.id.startsWith('marco-')) return 'Uma pequena festa'
  if (e.id === 'gato') return 'Visita na Biblioteca'
  if (e.id === 'mao-cirurgiao' || e.id === 'recorde') return 'Uma lembrança para você'
  return 'Uma visita rápida'
}

/** Este componente e suas artes só são baixados depois da primeira pintura. */
export default function Encontros() {
  const { sessao: conta } = usarConta()
  const [visita, definirVisita] = useState<Evento | null>(null)
  const [arquivo, definirArquivo] = useState(false)
  const [saindo, definirSaindo] = useState(false)
  const ocupada = useRef(false)
  const fecharRef = useRef<() => void>(() => undefined)
  const focoAnterior = useRef<HTMLElement | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = conta?.user.id ?? 'visitante'
  const nascimento = String(conta?.user.user_metadata?.nascimento ?? '')
  const criadaEm = conta?.user.created_at

  useEffect(() => {
    let lembrancas = lerLembrancas(id), codigo = 0, ultimoTeclado = 0, toques = 0, ultimoToque = 0, seguidas = 0
    let fim: ReturnType<typeof setTimeout> | undefined
    let ultimoManual = 0
    const iniciou = Date.now(), fila: Evento[] = []
    const recorde = recordeDoDia(ler<Record<string, RegistroQuestao>>('respondidas', {}), iniciou)
    let diaRecorde = chaveDoDia(iniciou)
    const reducao = matchMedia('(prefers-reduced-motion: reduce)')
    let dataTeot = DATA_TEOT
    const contexto = (): Contexto => ({
      agora: Date.now(), iniciou, ultimo: Math.max(lembrancas.ultimo, ultimaAparicao()), rota: location.hash.slice(1).split('?')[0] || '/',
      ligado: eventosLigados(), visivel: document.visibilityState === 'visible', reduzido: reducao.matches,
      modal: !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not(.fc-modal)'),
      sessao: ler<EstadoSessao | null>('sessao:atual', null), nascimento, criadaEm, dataTeot, vistos: lembrancas.vistos,
    })
    const salvar = () => guardarLembrancas(id, lembrancas)
    const apagar = () => { clearTimeout(fim); definirSaindo(false); definirVisita(null); ocupada.current = false }
    /**
     * `proposital`: gesto feito de propósito para achar o segredo (logo, código, gato). Esses sempre
     * respondem (dez segundos entre um e outro). Todo o resto, inclusive o duplo clique numa
     * classificação, só aparece se a última surpresa deste navegador tiver mais de uma hora.
     */
    const mostrar = (e: Evento, proposital = false) => {
      const c = contexto()
      if (!permitido(c) || ocupada.current) return false
      if (proposital ? c.agora - ultimoManual < 10_000 : !liberadoPeloRelogio(c.agora, c.ultimo)) return false
      if (proposital) ultimoManual = c.agora
      lembrancas.ultimo = c.agora
      lembrancas.vistos[`${chaveDoDia(c.agora)}:${e.id}`] = c.agora
      registrarAparicao(c.agora)
      salvar(); ocupada.current = true; definirVisita(semMovimento(e, c.reduzido))
      fim = setTimeout(sair, e.arquivo ? DURACAO_ARQUIVO : DURACAO)
      return true
    }
    /** Saída suave: o cartão desce e some antes de sair do DOM. */
    const sair = () => {
      clearTimeout(fim)
      if (!ocupada.current) return
      definirSaindo(true)
      fim = setTimeout(() => { definirSaindo(false); apagar() }, reducao.matches ? 0 : 320)
    }
    fecharRef.current = sair
    const abrirArquivo = () => {
      if (contexto().rota.startsWith('/flashcards/')) return
      if (!permitido({ ...contexto(), rota: contexto().rota === '/conta' ? '/' : contexto().rota })) return
      apagar(); lembrancas.arquivo = true; salvar(); definirArquivo(true)
    }
    const descoberta = () => {
      if (!mostrar({ id: 'codigo', titulo: 'Reflexos em dia', texto: 'Você encontrou uma porta discreta. O Preceptor deixou a luz acesa.', icone: 'livro', arquivo: true }, true)) return
      lembrancas.arquivo = true; salvar()
    }
    const tick = () => {
      const c = contexto()
      // Não acumula visitas no fundo nem dispara uma sequência ao voltar para a aba.
      if (!permitido(c) || ocupada.current) return
      if (fila.length && liberadoPeloRelogio(c.agora, c.ultimo)) {
        const e = fila.shift()!
        if (mostrar(e) && e.id.startsWith('marco-')) { lembrancas.marcos.push(Number(e.id.slice(6))); salvar() }
        return
      }
      const e = escolher(c, Math.random())
      if (e) mostrar(e)
    }
    const dados = (ev: Event) => {
      const m = (ev as CustomEvent<MudancaDados>).detail
      if (m.chave === 'sessao:atual') { if (!permitido(contexto())) { apagar(); definirArquivo(false) }; return }
      if (m.chave !== 'respondidas' || m.origem !== 'local' || m.usuario !== (conta?.user.id ?? null) || !permitido(contexto())) return
      const antes = (m.antes ?? {}) as Record<string, RegistroQuestao>, depois = (m.valor ?? {}) as Record<string, RegistroQuestao>
      for (const marco of marcosCruzados(Object.keys(antes).length, Object.keys(depois).length, lembrancas.marcos)) {
        if (!fila.some(e => e.id === `marco-${marco}`)) fila.push({ id: `marco-${marco}`, titulo: `${marco.toLocaleString('pt-BR')} questões na sua história`, texto: 'Cada uma trouxe uma ideia, uma dúvida ou uma descoberta. Vale uma pequena festa.', icone: 'presente', efeito: 'confete' })
      }
      // Somente uma resposta nova, feita agora, nesta aba. Sincronização não gera selos.
      const novas = Object.entries(depois).filter(([chave, r]) => r.q !== antes[chave]?.q)
      for (const [, r] of novas) seguidas = r.c === true ? seguidas + 1 : 0
      if (seguidas >= 7 && !lembrancas.selo && !fila.some(e => e.id === 'mao-cirurgiao')) {
        fila.push({ id: 'mao-cirurgiao', titulo: 'Mão de cirurgião', texto: 'Sete acertos seguidos por aqui. Um selo de lembrança, só neste aparelho.', icone: 'selo' })
        lembrancas.selo = true; salvar()
      }
      const hoje = chaveDoDia()
      if (diaRecorde !== hoje) { diaRecorde = hoje; Object.assign(recorde, recordeDoDia(depois, Date.now())) }
      else recorde.hoje += novas.filter(([, r]) => chaveDoDia(r.q) === hoje).length
      const chave = `${hoje}:recorde`
      if (recorde.anterior >= 10 && recorde.hoje > recorde.anterior && !lembrancas.vistos[chave] && !fila.some(e => e.id === 'recorde')) fila.push({ id: 'recorde', titulo: 'Um novo marco no seu estudo', texto: 'Este foi seu dia com mais respostas no histórico disponível neste aparelho. Agora também cabe uma pausa.', icone: 'estrela' })
      tick()
    }
    const teclado = (e: KeyboardEvent) => {
      if (contexto().rota === '/flashcards/biblioteca') return
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) || !permitido(contexto())) return
      if (Date.now() - ultimoTeclado > 3_000) codigo = 0
      ultimoTeclado = Date.now(); codigo = avancaCodigo(codigo, e.key)
      if (codigo === CODIGO.length) { codigo = 0; descoberta() }
    }
    const toque = (e: MouseEvent) => {
      const alvo = e.target instanceof Element ? e.target : null
      if (!permitido(contexto())) return
      const logo = alvo?.closest<HTMLElement>('.cabecalho__marca')
      if (logo) {
        toques = Date.now() - ultimoToque < 900 ? toques + 1 : 1; ultimoToque = Date.now()
        // Sinal de Tinel: cada toque formiga um pouco mais; no quinto, a logo leva o choque.
        if (!reducao.matches && toques >= 5) choque(logo)
        else if (!reducao.matches && toques >= 2) formigar(logo, toques)
        if (toques >= 5) { toques = 0; mostrar({ id: 'tinel', titulo: 'Deu um formigamento por aqui', texto: 'A logo sentiu os toques. O Preceptor ouviu e abriu uma portinha.', icone: 'martelo', efeito: 'formiga', arquivo: true }, true) }
      }
    }
    const martelo = (e: Event) => {
      if (!permitido(contexto())) return
      const alvo = e.target instanceof Element ? e.target.closest('.texto-editorial strong, .texto-editorial h4, .rz-foco h3') : null
      if (!alvo || !/classifica|sillence|schatzker|salter|garden|neer|ao\/ota/i.test(alvo.textContent ?? '')) return
      // O reflexo no texto responde sempre; o cartão entra no limite de uma por hora (duplo clique
      // também é o gesto comum de selecionar uma palavra, então não conta como busca proposital).
      if (!reducao.matches) pulsar(alvo as HTMLElement, 'oq-reflexo', 900)
      mostrar({ id: 'reflexo', titulo: 'Virou reflexo', texto: 'O martelinho passou por aqui. Uma boa classificação fica mais familiar a cada reencontro.', icone: 'martelo' })
    }
    const gato = () => { if (contexto().rota === '/flashcards/biblioteca') mostrar({ id: 'gato', titulo: 'O bibliotecário de quatro patas', texto: 'Ele veio conferir a leitura. Um carinho e já volta para a estante.', icone: 'gato' }, true) }
    const preferencia = () => { if (!eventosLigados()) { apagar(); definirArquivo(false); fila.length = 0 } }
    const rota = () => { apagar(); definirArquivo(false); codigo = 0 }
    const ocultar = () => { if (document.hidden) apagar() }
    const plano = (e: Event) => {
      const p = (e as CustomEvent<{ prova?: string; data_prova?: string } | null>).detail
      dataTeot = p?.prova === 'TEOT' && p.data_prova ? p.data_prova : DATA_TEOT
    }
    const armazenou = () => { lembrancas = lerLembrancas(id); preferencia() }
    // Outro componente (as conquistas do dia) gravou lembranças nesta aba: relê para não apagar o que ele marcou.
    const relerLembrancas = () => { lembrancas = lerLembrancas(id) }
    const iniciarTeste = () => {
      if (!import.meta.env.DEV) return
      const pedido = new URLSearchParams(location.hash.split('?')[1]).get('encontro')
      const testes: Record<string, Evento> = {
        cafe: { id: 'cafe', titulo: 'Café de plantão', texto: 'Uma xícara e uma boa companhia para a revisão.', icone: 'cafe' },
        festa: { id: 'marco-1000', titulo: '1.000 questões na sua história', texto: 'Cada uma trouxe uma descoberta. Vale uma pequena festa.', icone: 'presente', efeito: 'confete' },
        gato: { id: 'gato', titulo: 'O bibliotecário de quatro patas', texto: 'Um carinho e já volta para a estante.', icone: 'gato' },
        arquivo: { id: 'codigo', titulo: 'Reflexos em dia', texto: 'Você encontrou uma porta discreta. O Preceptor deixou a luz acesa.', icone: 'livro', arquivo: true },
        estrela: { id: 'estrela', titulo: 'Olha uma estrela', texto: 'Passou rápido. Fica aqui um desejo de bons encontros pelo caminho.', icone: 'estrela', efeito: 'estrela' },
        tinel: { id: 'tinel', titulo: 'Deu um formigamento por aqui', texto: 'A logo sentiu os toques. O Preceptor ouviu e abriu uma portinha.', icone: 'martelo', efeito: 'formiga', arquivo: true },
        selo: { id: 'mao-cirurgiao', titulo: 'Mão de cirurgião', texto: 'Sete acertos seguidos por aqui. Um selo de lembrança, só neste aparelho.', icone: 'selo' },
        bolo: { id: 'aniversario', titulo: 'Hoje o café é por nossa conta', texto: 'Feliz aniversário! Que seu dia tenha boas companhias e um tempo só seu.', icone: 'bolo', efeito: 'confete' },
      }
      // Só no Vite DEV, para capturas: ?encontro=<nome> mostra a visita; ?encontro=sala abre o Arquivo;
      // ?encontro=choque dá o choque na logo. Contam como gesto proposital (ignoram o limite de uma hora).
      if (pedido === 'sala') { abrirArquivo(); return }
      if (pedido === 'choque') { const logo = document.querySelector<HTMLElement>('.cabecalho__marca'); if (logo) choque(logo); return }
      if (pedido && testes[pedido]) mostrar(testes[pedido], true)
    }
    const teste = setTimeout(iniciarTeste, 500), intervalo = setInterval(tick, 30_000)
    window.addEventListener(EVENTO_DADOS, dados); window.addEventListener('keydown', teclado); window.addEventListener('click', toque)
    window.addEventListener('dblclick', martelo); window.addEventListener('oq:eventos:gato', gato); window.addEventListener('oq:eventos:arquivo', abrirArquivo)
    window.addEventListener(AVISO_EVENTOS, preferencia); window.addEventListener('storage', armazenou); window.addEventListener('hashchange', rota)
    window.addEventListener('ortoquestoes:plano', plano); document.addEventListener('visibilitychange', ocultar)
    window.addEventListener('oq:eventos:lembrancas', relerLembrancas)
    try {
      if (permitido(contexto()) && !sessionStorage.getItem('oq:eventos:console')) { console.info('Orto Questões · Plantão do navegador: por aqui também tem gente curiosa. Bom estudo!'); sessionStorage.setItem('oq:eventos:console', '1') }
    } catch { /* o console também é dispensável */ }
    return () => {
      clearTimeout(teste); clearTimeout(fim); clearInterval(intervalo); ocupada.current = false; definirVisita(null); definirArquivo(false)
      window.removeEventListener(EVENTO_DADOS, dados); window.removeEventListener('keydown', teclado); window.removeEventListener('click', toque)
      window.removeEventListener('dblclick', martelo); window.removeEventListener('oq:eventos:gato', gato); window.removeEventListener('oq:eventos:arquivo', abrirArquivo)
      window.removeEventListener(AVISO_EVENTOS, preferencia); window.removeEventListener('storage', armazenou); window.removeEventListener('hashchange', rota)
      window.removeEventListener('ortoquestoes:plano', plano); document.removeEventListener('visibilitychange', ocultar)
      window.removeEventListener('oq:eventos:lembrancas', relerLembrancas)
    }
  }, [id, nascimento, criadaEm, conta?.user.id])

  useEffect(() => {
    if (!arquivo || !dialogo.current) return
    focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogo.current.showModal()
    // showModal leva o foco ao primeiro link; o convite natural é "Voltar ao estudo".
    dialogo.current.querySelector<HTMLElement>('[data-foco-inicial]')?.focus()
    return () => focoAnterior.current?.focus()
  }, [arquivo])

  const fecharSala = () => definirArquivo(false)
  return createPortal(<>
    <div className="encontros-vivo" role="status" aria-live="polite" aria-atomic="true">
      {visita && <aside key={visita.id} className={`encontro encontro--${visita.icone}${visita.efeito ? ` encontro--${visita.efeito}` : ''}${saindo ? ' encontro--saindo' : ''}`} aria-label={visita.titulo}
        style={{ '--duracao': `${visita.arquivo ? DURACAO_ARQUIVO : DURACAO}ms` } as React.CSSProperties}>
        <span className="encontro__palco" aria-hidden="true">
          <span className="encontro__luz" />
          <span className="encontro__poeira"><i /><i /><i /><i /></span>
          <span className="encontro__chao" />
          <img className="encontro__arte" src={recurso(`eventos/${visita.icone}.png`)} width={64} height={64} alt="" />
          {visita.efeito === 'estrela' && <span className="encontro__cadente" />}
          {visita.efeito === 'estrela' && <span className="encontro__cintilas"><i /><i /><i /></span>}
        </span>
        <span className="encontro__corpo">
          <small className="encontro__rotulo">{rotulo(visita)}</small>
          <strong className="encontro__titulo">{visita.titulo}</strong>
          <span className="encontro__texto">{visita.texto}</span>
          {visita.arquivo && <button className="encontro__convite" type="button" onClick={() => window.dispatchEvent(new Event('oq:eventos:arquivo'))}>Entrar no Arquivo do Preceptor <span aria-hidden="true">→</span></button>}
        </span>
        <button className="encontro__fechar" type="button" aria-label="Dispensar visita" onClick={() => fecharRef.current()}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
        <span className="encontro__tempo" aria-hidden="true" />
        {visita.efeito === 'confete' && <span className="encontro__confete" aria-hidden="true">{CONFETES.map((c, i) => <i key={i} className={`c${c.cor}${c.largo ? ' largo' : ''}`} style={{ '--x': `${c.x}%`, '--t': `${c.atraso}s`, '--giro': `${c.giro}deg`, '--deriva': `${c.deriva}px` } as React.CSSProperties} />)}</span>}
        {visita.efeito === 'formiga' && <svg className="encontro__raio" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
          <path className="halo" pathLength={100} d="M0 10 L40 10 L52 3 L61 17 L70 5 L78 14 L86 8 L94 11 L160 10 L172 4 L180 15 L189 7 L196 12 L300 10" />
          <path className="nucleo" pathLength={100} d="M0 10 L40 10 L52 3 L61 17 L70 5 L78 14 L86 8 L94 11 L160 10 L172 4 L180 15 L189 7 L196 12 L300 10" />
        </svg>}
      </aside>}
    </div>
    {arquivo && <dialog ref={dialogo} className="arquivo-preceptor" aria-labelledby="arquivo-titulo" onCancel={fecharSala} onClick={e => { if (e.target === e.currentTarget) fecharSala() }}>
      <div className="arquivo-preceptor__cena" aria-hidden="true">
        <img src={recurso('eventos/arquivo.png')} width={480} height={176} alt="" />
        <span className="arquivo-preceptor__luar" />
        <span className="arquivo-preceptor__lampada arquivo-preceptor__lampada--e" />
        <span className="arquivo-preceptor__lampada arquivo-preceptor__lampada--d" />
        <span className="arquivo-preceptor__vela" />
        <span className="arquivo-preceptor__poeira">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</span>
      </div>
      <div className="arquivo-preceptor__corpo">
        <small className="arquivo-preceptor__rotulo">Uma sala fora do mapa</small>
        <h2 id="arquivo-titulo">Arquivo do Preceptor</h2>
        <p>Entre, tem uma cadeira livre. Aqui ficaram alguns bilhetes de quem também já virou a noite estudando.</p>
        <blockquote className="arquivo-preceptor__bilhete"><p>“Voltar a um assunto não é começar do zero. Você já chega com perguntas melhores.”</p><footer>— bilhete preso na estante</footer></blockquote>
        <p>Uma dúvida por vez, um intervalo quando precisar. O livro continua aqui amanhã.</p>
        {lerLembrancas(id).selo && <p className="arquivo-preceptor__selo"><img src={recurso('eventos/selo.png')} width={48} height={48} alt="" /><span><strong>Mão de cirurgião</strong><small>Sua lembrança neste aparelho.</small></span></p>}
        <nav aria-label="Continuar o estudo"><a href={href('/flashcards/biblioteca')} onClick={fecharSala}>Visitar a Biblioteca de Flashcards</a><button type="button" data-foco-inicial onClick={fecharSala}>Voltar ao estudo</button></nav>
      </div>
      {/* Depois do conteúdo no DOM, para a ordem de leitura começar pelo título. */}
      <button className="arquivo-preceptor__fechar" type="button" aria-label="Fechar o Arquivo do Preceptor" onClick={fecharSala}>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </dialog>}
  </>, visita?.id === 'gato' ? document.querySelector('.fc-modal') ?? document.body : document.body)
}
