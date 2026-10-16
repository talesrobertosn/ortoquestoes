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
import { guardarLembrancas, lerLembrancas } from './memoria'
import { avancaCodigo, CODIGO, escolher, marcosCruzados, permitido, recordeDoDia, semMovimento, type Contexto, type Evento } from './regras'
import './encontros.css'

/** Liga uma classe por um instante (e reinicia a animação se ela já estava rodando). */
function pulsar(el: HTMLElement, classes: string, ms: number) {
  const lista = classes.split(' ')
  el.classList.remove(...[...el.classList].filter(c => c.startsWith('oq-tinel') || c === 'oq-reflexo'))
  void el.offsetWidth
  el.classList.add(...lista)
  setTimeout(() => el.classList.remove(...lista), ms)
}

/** O choque do Tinel: a logo treme, acende e solta faíscas por menos de um segundo. */
function choque(logo: HTMLElement) {
  pulsar(logo, 'oq-choque', 900)
  const r = logo.getBoundingClientRect()
  const camada = document.createElement('span')
  camada.className = 'oq-faiscas'
  camada.setAttribute('aria-hidden', 'true')
  Object.assign(camada.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px`, width: `${r.width + 36}px`, height: `${r.height + 36}px` })
  camada.innerHTML = Array.from({ length: 7 }, (_, i) => `<i style="--i:${i}"><svg viewBox="0 0 12 20"><path d="M7 0 1 11h4l-1 9 7-12H7l1-8Z"/></svg></i>`).join('')
  document.body.appendChild(camada)
  setTimeout(() => camada.remove(), 950)
}

/** Este componente e suas artes só são baixados depois da primeira pintura. */
export default function Encontros() {
  const { sessao: conta } = usarConta()
  const [visita, definirVisita] = useState<Evento | null>(null)
  const [arquivo, definirArquivo] = useState(false)
  const ocupada = useRef(false)
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
      agora: Date.now(), iniciou, ultimo: lembrancas.ultimo, rota: location.hash.slice(1).split('?')[0] || '/',
      ligado: eventosLigados(), visivel: document.visibilityState === 'visible', reduzido: reducao.matches,
      modal: !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not(.fc-modal)'),
      sessao: ler<EstadoSessao | null>('sessao:atual', null), nascimento, criadaEm, dataTeot, vistos: lembrancas.vistos,
    })
    const salvar = () => guardarLembrancas(id, lembrancas)
    const apagar = () => { clearTimeout(fim); definirVisita(null); ocupada.current = false }
    const mostrar = (e: Evento, manual = false) => {
      const c = contexto()
      if (!permitido(c) || ocupada.current || (manual && c.agora - ultimoManual < 10_000)) return false
      if (manual) ultimoManual = c.agora
      lembrancas.ultimo = c.agora
      lembrancas.vistos[`${chaveDoDia(c.agora)}:${e.id}`] = c.agora
      salvar(); ocupada.current = true; definirVisita(semMovimento(e, c.reduzido))
      fim = setTimeout(apagar, e.arquivo ? 8_000 : 5_000)
      return true
    }
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
      if (fila.length && c.agora - c.ultimo >= 6 * 60_000) {
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
        else if (!reducao.matches && toques >= 2) pulsar(logo, `oq-tinel oq-tinel--${toques}`, 260)
        if (toques >= 5) { toques = 0; mostrar({ id: 'tinel', titulo: 'Deu um formigamento por aqui', texto: 'A logo sentiu os toques. O Preceptor ouviu e abriu uma portinha.', icone: 'martelo', efeito: 'formiga', arquivo: true }, true) }
      }
    }
    const martelo = (e: Event) => {
      if (!permitido(contexto())) return
      const alvo = e.target instanceof Element ? e.target.closest('.texto-editorial strong, .texto-editorial h4, .rz-foco h3') : null
      if (alvo && /classifica|sillence|schatzker|salter|garden|neer|ao\/ota/i.test(alvo.textContent ?? '') && !reducao.matches) pulsar(alvo as HTMLElement, 'oq-reflexo', 700)
      if (alvo && /classifica|sillence|schatzker|salter|garden|neer|ao\/ota/i.test(alvo.textContent ?? '')) mostrar({ id: 'reflexo', titulo: 'Virou reflexo', texto: 'O martelinho passou por aqui. Uma boa classificação fica mais familiar a cada reencontro.', icone: 'martelo' }, true)
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
    const iniciarTeste = () => {
      if (!import.meta.env.DEV) return
      const pedido = new URLSearchParams(location.hash.split('?')[1]).get('encontro')
      const testes: Record<string, Evento> = {
        cafe: { id: 'cafe', titulo: 'Café de plantão', texto: 'Uma xícara e uma boa companhia para a revisão.', icone: 'cafe' },
        festa: { id: 'marco-1000', titulo: '1.000 questões na sua história', texto: 'Cada uma trouxe uma descoberta. Vale uma pequena festa.', icone: 'presente', efeito: 'confete' },
        gato: { id: 'gato', titulo: 'O bibliotecário de quatro patas', texto: 'Um carinho e já volta para a estante.', icone: 'gato' },
        arquivo: { id: 'codigo', titulo: 'Reflexos em dia', texto: 'O Preceptor deixou a luz acesa.', icone: 'livro', arquivo: true },
      }
      if (pedido && testes[pedido]) mostrar(testes[pedido], true)
    }
    const teste = setTimeout(iniciarTeste, 500), intervalo = setInterval(tick, 30_000)
    window.addEventListener(EVENTO_DADOS, dados); window.addEventListener('keydown', teclado); window.addEventListener('click', toque)
    window.addEventListener('dblclick', martelo); window.addEventListener('oq:eventos:gato', gato); window.addEventListener('oq:eventos:arquivo', abrirArquivo)
    window.addEventListener(AVISO_EVENTOS, preferencia); window.addEventListener('storage', armazenou); window.addEventListener('hashchange', rota)
    window.addEventListener('ortoquestoes:plano', plano); document.addEventListener('visibilitychange', ocultar)
    try {
      if (permitido(contexto()) && !sessionStorage.getItem('oq:eventos:console')) { console.info('Orto Questões · Plantão do navegador: por aqui também tem gente curiosa. Bom estudo!'); sessionStorage.setItem('oq:eventos:console', '1') }
    } catch { /* o console também é dispensável */ }
    return () => {
      clearTimeout(teste); clearTimeout(fim); clearInterval(intervalo); ocupada.current = false; definirVisita(null); definirArquivo(false)
      window.removeEventListener(EVENTO_DADOS, dados); window.removeEventListener('keydown', teclado); window.removeEventListener('click', toque)
      window.removeEventListener('dblclick', martelo); window.removeEventListener('oq:eventos:gato', gato); window.removeEventListener('oq:eventos:arquivo', abrirArquivo)
      window.removeEventListener(AVISO_EVENTOS, preferencia); window.removeEventListener('storage', armazenou); window.removeEventListener('hashchange', rota)
      window.removeEventListener('ortoquestoes:plano', plano); document.removeEventListener('visibilitychange', ocultar)
    }
  }, [id, nascimento, criadaEm, conta?.user.id])

  useEffect(() => {
    if (!arquivo || !dialogo.current) return
    focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogo.current.showModal()
    return () => focoAnterior.current?.focus()
  }, [arquivo])

  return createPortal(<>
    <div className="encontros-vivo" role="status" aria-live="polite" aria-atomic="true">
      {visita && <aside className={`encontro ${visita.efeito ? `encontro--${visita.efeito}` : ''}`} aria-label={visita.titulo}>
        <img className="encontro__arte" src={recurso(`eventos/${visita.icone}.png`)} width={64} height={70} alt="" />
        <div className="encontro__corpo"><small>Uma visita rápida</small><strong>{visita.titulo}</strong><p>{visita.texto}</p>
          {visita.arquivo && <button type="button" onClick={() => window.dispatchEvent(new Event('oq:eventos:arquivo'))}>Entrar no Arquivo do Preceptor <span aria-hidden="true">↗</span></button>}
        </div>
        <button className="encontro__fechar" type="button" aria-label="Dispensar visita" onClick={() => { definirVisita(null); ocupada.current = false }}>×</button>
        {visita.efeito === 'confete' && <span className="encontro__confete" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</span>}
        {visita.efeito === 'estrela' && <span className="encontro__estrela" aria-hidden="true" />}
        {visita.efeito === 'formiga' && <svg className="encontro__raio" viewBox="0 0 120 24" aria-hidden="true"><path d="M0 12h22l6-9 8 18 7-14 6 8 5-5h66" /></svg>}
      </aside>}
    </div>
    {arquivo && <dialog ref={dialogo} className="arquivo-preceptor" aria-labelledby="arquivo-titulo" onCancel={() => definirArquivo(false)} onClick={e => { if (e.target === e.currentTarget) definirArquivo(false) }}>
      <div className="arquivo-preceptor__luz" aria-hidden="true"><img src={recurso('eventos/arquivo.png')} width={480} height={176} alt="" /></div>
      <small>Uma sala fora do mapa</small><h2 id="arquivo-titulo">Arquivo do Preceptor</h2>
      <p>Entre, tem uma cadeira livre. Aqui ficaram alguns bilhetes de quem também já virou a noite estudando.</p>
      <blockquote>“Voltar a um assunto não é começar do zero. Você já chega com perguntas melhores.”</blockquote>
      <p>Uma dúvida por vez, um intervalo quando precisar. O livro continua aqui amanhã.</p>
      {lerLembrancas(id).selo && <p className="arquivo-preceptor__selo"><img src={recurso('eventos/selo.png')} width={40} height={44} alt="" /><span><strong>Mão de cirurgião</strong><small>Sua lembrança neste aparelho.</small></span></p>}
      <nav aria-label="Continuar o estudo"><a href={href('/flashcards/biblioteca')} onClick={() => definirArquivo(false)}>Visitar a Biblioteca de Flashcards</a><button type="button" autoFocus onClick={() => definirArquivo(false)}>Voltar ao estudo</button></nav>
    </dialog>}
  </>, visita?.id === 'gato' ? document.querySelector('.fc-modal') ?? document.body : document.body)
}
