/* Shorts · protótipo. Dados reais do acervo (dados.js); nada é salvo, tudo volta ao recarregar. */
(() => {
  'use strict'
  const QS = window.SHORTS
  const $ = (s, el = document) => el.querySelector(s)
  const $$ = (s, el = document) => [...el.querySelectorAll(s)]
  const LIMITE = { visitante: 1, gratis: 5, assinante: Infinity }
  const ARTE_NOITE = 'arte/cena-observatorio-noite-960.webp'
  const REVANCHE = 'ombro-cotovelo-0005'

  const est = {
    perfil: 'gratis',
    feitas: 0, // respondidas hoje (contam na cota)
    seq: 0,
    resp: {}, // id -> { letra, certo, ms }
    coracao: new Set(), salvas: new Set(), nota: {},
    aberto: false, origem: null, atual: 0, inicio: 0,
  }

  /* ---------- utilidades ---------- */
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const paragrafos = (t) => t.split(/\n{2,}/).map((p) => `<p>${md(p.trim())}</p>`).join('')
  const ic = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${id}"/></svg>`
  const curto = (s) => s.replace(/^(Fraturas?|Lesões?|Lesão) (d[aoe]s?) /, (m) => m)
  const contagem = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + ' mil' : String(n))
  const porId = (id) => QS.find((q) => q.id === id)
  const coracoesDe = (q) => q.coracoes + (est.coracao.has(q.id) ? 1 : 0)
  const corDaNota = (n) => `hsl(${Math.round(4 + ((n - 1) / 9) * 146)} 62% 44%)`
  const vibrar = (p) => { try { navigator.vibrate && navigator.vibrate(p) } catch (_) {} }
  const temaCurto = (t) => t.replace('Tumores ósseos e de partes moles', 'Tumores').replace('Ortopedia pediátrica', 'Pediatria').replace('Trauma adulto', 'Trauma')

  let avisoT
  function aviso(txt) {
    const a = $('#aviso'); a.textContent = txt; a.classList.add('visivel')
    clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove('visivel'), 2200)
  }

  /* ---------- página inicial ---------- */
  function capa(q, i) {
    const im = q.imagem, retrato = im && im.w / im.h <= 0.8
    return `<button class="capa${i === 0 ? ' capa--primeira' : ''}" data-acao="abrir" data-id="${q.id}" aria-label="Abrir Short: ${esc(q.gancho)}">
      <span class="capa-fundo" style="background-image:url(${im.src})"></span>
      <img class="capa-img${retrato ? '' : ' contem'}" src="${im.src}" alt="" loading="lazy">
      <span class="capa-prova">${q.prova} ${q.ano}</span>
      <span class="capa-play">${ic('i-play')}</span>
      <span class="capa-pe">
        <span class="capa-tema">${esc(temaCurto(q.tema))}</span>
        <span class="capa-titulo">${esc(q.gancho)}</span>
        <span class="capa-meta">${ic('i-coracao-cheio')} ${contagem(coracoesDe(q))}</span>
      </span>
    </button>`
  }
  function desenharInicio() {
    $('#trilho').innerHTML = QS.filter((q) => q.imagem).slice(0, 8).map(capa).join('')
    const q = QS[0], lim = LIMITE[est.perfil]
    const cota = est.perfil === 'assinante' ? '<b>Ilimitado</b> na sua assinatura'
      : est.perfil === 'visitante' ? '<b>1 grátis</b>, sem cadastro'
      : `<b>${Math.max(0, lim - est.feitas)} de ${lim}</b> grátis hoje`
    $('#vertical').innerHTML = `
      <span class="capa-fundo" style="background-image:url(${q.imagem.src})"></span>
      <img class="capa-img" src="${q.imagem.src}" alt="">
      <span class="vertical-topo"><span class="vertical-marca"><svg class="ic-shorts" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="3.2"/><path d="M10.2 8.6v6.8l5.6-3.4z"/></svg>Shorts</span><span class="capa-prova" style="position:static">${q.prova} ${q.ano}</span></span>
      <span class="vertical-play">${ic('i-play')}</span>
      <span class="vertical-pe">
        <h3>Treino rápido</h3>
        <p>Uma questão por tela. Toque na resposta, leia o porquê e deslize.</p>
        <span class="vertical-cota">${cota}</span>
      </span>`
    $$('.proto-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.perfil === est.perfil)))
  }

  /* ---------- slides ---------- */
  function midia(q) {
    if (q.imagem) {
      return `<div class="sh-midia" data-acao="midia">
        <span class="sh-midia-fundo" style="background-image:url(${q.imagem.src})"></span>
        <img src="${q.imagem.src}" alt="Imagem da questão" draggable="false">
        <span class="sh-zoom-dica">${ic('i-lupa')} Toque para ampliar</span>
      </div>`
    }
    return `<div class="sh-midia sh-midia--texto" data-acao="midia">
      <img class="sh-midia-arte" src="${ARTE_NOITE}" alt="">
      <div class="sh-tipo"><small>${ic('i-livro')} Questão de teoria</small><strong>${esc(q.gancho)}</strong></div>
    </div>`
  }
  function slide(q) {
    const s = document.createElement('section')
    s.className = 'sh'; s.dataset.id = q.id
    const revanche = q.id === REVANCHE ? '<span class="sh-prova" style="background:rgba(179,66,58,.25);color:#f1a59d">Revanche · você errou há 6 dias</span>' : ''
    s.innerHTML = `<div class="sh-palco"><div class="sh-coluna">
        ${midia(q)}
        <div class="sh-corpo">
          <div class="sh-meta"><span class="sh-prova">${q.prova} ${q.ano}</span><span>${esc(temaCurto(q.tema))}</span>${revanche}</div>
          <p class="sh-enunciado recolhido">${esc(q.enunciado)}</p>
          <button class="sh-mais" data-acao="mais" hidden>ver mais</button>
          <ol class="sh-alts">${q.alternativas.map((a) => `<li><button class="alt" data-acao="responder" data-letra="${a.letra}"><span class="alt-letra">${a.letra}</span><span>${esc(a.texto)}</span></button></li>`).join('')}</ol>
          <button class="sh-reabrir" data-acao="reabrir">${ic('i-balao')} Ver o comentário</button>
        </div>
        <div class="gaveta" data-estado="fechada" aria-label="Comentário"></div>
      </div>
      <div class="sh-acoes">
        <button class="acao" data-acao="coracao" aria-pressed="false" aria-label="Coração"><span class="acao-bola">${ic('i-coracao')}</span><span class="n">${contagem(coracoesDe(q))}</span></button>
        <button class="acao" data-acao="comentario" aria-label="Comentário"><span class="acao-bola">${ic('i-balao')}</span><span>Porquê</span></button>
        <button class="acao" data-acao="compartilhar" aria-label="Compartilhar"><span class="acao-bola">${ic('i-enviar')}</span><span>Enviar</span></button>
        <button class="acao" data-acao="salvar" aria-pressed="false" aria-label="Salvar nas Favoritas"><span class="acao-bola">${ic('i-salvar')}</span><span>Salvar</span></button>
        <button class="acao" data-acao="relatar" aria-label="Relatar erro"><span class="acao-bola">${ic('i-bandeira')}</span><span>Relatar</span></button>
      </div></div>`
    return s
  }
  function gaveta(q, r) {
    const certo = r.certo
    const seq = certo && est.seq >= 2 ? `<span class="resultado-seq">${ic('i-chama')}${est.seq} seguidas</span>` : ''
    const outras = Object.entries(q.incorretas).map(([l, t]) => `<details class="outra${l === r.letra ? ' marcada' : ''}"${l === r.letra ? ' open' : ''}>
        <summary><span class="alt-letra">${l}</span>${l === r.letra ? 'A que você marcou' : 'Por que não a ' + l}${ic('i-baixo')}</summary><p>${md(t)}</p></details>`).join('')
    const nota = est.nota[q.id] || 0
    return `<div class="gaveta-cabeca" data-arrastar>
        <span class="alca"></span>
        <div class="resultado ${certo ? 'resultado--certo' : 'resultado--errado'}">
          <span class="resultado-icone">${ic(certo ? 'i-visto' : 'i-x')}</span>
          <div><h3>${certo ? 'Acertou' : 'A certa é a ' + q.gabarito}</h3><p>${certo ? 'Agora fixe o porquê.' : 'Você marcou a ' + r.letra + '. Veja onde estava a pegadinha.'}</p></div>
          ${seq}
        </div>
      </div>
      <div class="gaveta-corpo">
        <p class="porque-rotulo">Por que a ${q.gabarito}</p>
        <div class="porque-certa">${md(q.correta)}</div>
        <div class="conceito">${paragrafos(q.conceito)}</div>
        <div class="outras">${outras}</div>
        ${q.referencias.length ? `<p class="refs"><b>Referências.</b> ${q.referencias.map(esc).join('; ')}</p>` : ''}
        <div class="nota">
          <div class="nota-topo"><div><strong>Esse comentário ajudou?</strong><small>O coração vale nota 10.</small></div>
            <button class="nota-coracao" data-acao="coracao" aria-pressed="${est.coracao.has(q.id)}">${ic(est.coracao.has(q.id) ? 'i-coracao-cheio' : 'i-coracao')}Amei</button></div>
          <div class="regua">${Array.from({ length: 10 }, (_, i) => `<button data-acao="nota" data-nota="${i + 1}" style="--cor:${corDaNota(i + 1)}" aria-pressed="${nota === i + 1}">${i + 1}</button>`).join('')}</div>
          <div class="regua-legenda"><span>Não ajudou</span><span>Perfeito</span></div>
        </div>
        <button class="relatar-link" data-acao="relatar">${ic('i-bandeira')}Encontrou um erro? Relatar</button>
      </div>
      <div class="gaveta-pe">
        <button class="ler-tudo" data-acao="ler-tudo">${ic('i-cima')}Ler tudo</button>
        <button class="proxima" data-acao="proxima"></button>
      </div>`
  }
  function botaoProxima(s) {
    const prox = s.nextElementSibling, b = $('.proxima', s)
    if (!b) return
    const q = prox && prox.dataset.id ? porId(prox.dataset.id) : null
    const mini = q ? `<span class="proxima-mini" style="background-image:url(${q.imagem ? q.imagem.src : ARTE_NOITE})"></span>` : ''
    const sub = q ? `<small>${esc(temaCurto(q.tema))} · ${esc(q.gancho)}</small>` : prox ? '<small>Seu resumo do dia</small>' : ''
    b.innerHTML = `${mini}<span>Próxima${sub}</span>${ic('i-baixo').replace('<svg', '<svg class="proxima-seta"')}`
  }

  /* muros */
  function muroLimite(qProx) {
    const s = document.createElement('section'); s.className = 'sh muro'; s.dataset.muro = 'limite'
    const certas = Object.values(est.resp).filter((r) => r.certo).length
    const ms = Object.values(est.resp).reduce((a, r) => a + r.ms, 0) / Math.max(1, Object.keys(est.resp).length)
    const bg = qProx ? (qProx.imagem ? qProx.imagem.src : ARTE_NOITE) : QS[0].imagem.src
    s.innerHTML = `<div class="sh-palco"><div class="sh-coluna">
      <span class="muro-fundo" style="background-image:url(${bg})"></span>
      <div class="muro-conteudo">
        <span class="coruja coruja--asas" aria-hidden="true"></span>
        <h2>Você fez seus ${LIMITE.gratis} Shorts de hoje</h2>
        <p class="muro-apoio">Na assinatura os Shorts não acabam, e cada um entra no seu desempenho e na sua revisão.</p>
        <div class="muro-placar"><div><b>${certas}/${est.feitas}</b><small>acertos</small></div><div><b>${Math.max(1, Math.round(ms / 1000))}s</b><small>por questão</small></div><div><b>${est.coracao.size}</b><small>corações</small></div></div>
        ${qProx ? `<div class="muro-proxima"><span class="muro-proxima-img"><span style="background-image:url(${bg})"></span>${ic('i-cadeado')}</span><div><small>A próxima seria</small><strong>${esc(qProx.gancho)}</strong></div></div>` : ''}
        <button class="botao botao--ouro botao--largo" data-acao="assinar">Assinar e continuar</button>
        <p class="muro-volta">Ou volte amanhã: novos Shorts em <b data-relogio>--:--:--</b></p>
      </div></div></div>`
    return s
  }
  function muroConta() {
    const s = document.createElement('section'); s.className = 'sh muro'; s.dataset.muro = 'conta'
    const q = QS[1]
    s.innerHTML = `<div class="sh-palco"><div class="sh-coluna">
      <span class="muro-fundo" style="background-image:url(${q.imagem.src})"></span>
      <div class="muro-conteudo">
        <span class="coruja coruja--aceno" aria-hidden="true"></span>
        <h2>Gostou? Tem mais 4 hoje, de graça</h2>
        <p class="muro-apoio">Crie sua conta em um toque para continuar deslizando.</p>
        <ul class="muro-lista">
          <li>${ic('i-visto')}5 Shorts grátis todo dia</li>
          <li>${ic('i-visto')}Seus acertos e erros salvos no desempenho</li>
          <li>${ic('i-visto')}Comentário completo de cada questão</li>
        </ul>
        <button class="botao botao--google botao--largo" data-acao="criar-conta"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.8 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.7H2.1v2.8A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.2H2.1a11 11 0 000 9.6z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0012 1 11 11 0 002.1 7.2L5.7 10c.9-2.7 3.4-4.6 6.3-4.6z"/></svg>Continuar com Google</button>
        <button class="botao botao--fantasma botao--largo" data-acao="criar-conta">Usar e-mail</button>
      </div></div></div>`
    return s
  }
  function fimDeBloco() {
    const s = document.createElement('section'); s.className = 'sh bloco'; s.dataset.bloco = '1'
    const lista = Object.entries(est.resp).slice(-10)
    const certas = lista.filter(([, r]) => r.certo).length
    const C = 2 * Math.PI * 62
    const temas = lista.map(([id, r]) => `<span class="${r.certo ? '' : 'erro'}">${esc(temaCurto(porId(id).tema))}</span>`).join('')
    s.innerHTML = `<div class="sh-palco"><div class="sh-coluna"><div class="bloco-conteudo">
      <div class="anel"><svg viewBox="0 0 150 150"><circle class="trilha" cx="75" cy="75" r="62"/><circle class="valor" cx="75" cy="75" r="62" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-alvo="${C * (1 - certas / lista.length)}"/></svg>
        <span class="anel-num">${certas}/${lista.length}<small>neste bloco</small></span></div>
      <h2>Bloco de 10 concluído</h2>
      <p class="muro-apoio">${lista.length - certas ? `As ${lista.length - certas} que você errou já entraram na sua revisão.` : 'Nenhum erro. Raro e bonito.'}</p>
      <div class="bloco-temas">${temas}</div>
      <button class="botao botao--ouro botao--largo" data-acao="proxima">Continuar deslizando</button>
      <button class="botao botao--fantasma botao--largo" data-acao="sessao">Sessão completa dos erros</button>
    </div></div></div>`
    return s
  }

  /* ---------- abrir e fechar ---------- */
  function abrir(id, origemEl) {
    const fila = [porId(id), ...QS.filter((q) => q.id !== id)]
    const feed = $('#feed'); feed.innerHTML = ''
    est.fila = fila.map((q) => q.id)
    if (est.feitas >= LIMITE[est.perfil]) feed.append(est.perfil === 'visitante' ? muroConta() : muroLimite(fila[0]))
    else fila.forEach((q) => feed.append(slide(q)))
    $$('.sh', feed).forEach(prepararSlide)
    const pl = $('#pl'); pl.hidden = false; document.body.classList.add('travado')
    feed.scrollTop = 0; est.aberto = true
    observar(); progresso(); relogios()
    if (!history.state || !history.state.shorts) history.pushState({ shorts: 1 }, '', '#short-' + id)
    // animação: o cartão cresce até a tela
    if (origemEl && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const r = origemEl.getBoundingClientRect(), W = innerWidth, H = innerHeight
      const ins = `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px round 16px)`
      pl.animate([{ clipPath: ins }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' })
      est.origem = origemEl
    }
    setTimeout(() => $('.pl-x-canto').focus({ preventScroll: true }), 50)
  }
  function fechar(daHistoria) {
    if (!est.aberto) return
    const pl = $('#pl'); est.aberto = false
    const fim = () => { pl.hidden = true; document.body.classList.remove('travado'); $('#feed').innerHTML = ''; desenharInicio() }
    const o = est.origem
    if (o && o.isConnected && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const r = o.getBoundingClientRect(), W = innerWidth, H = innerHeight
      pl.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }, { clipPath: `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px round 16px)`, opacity: .6 }], { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = fim
    } else fim()
    if (!daHistoria && history.state && history.state.shorts) history.back()
  }
  addEventListener('popstate', () => { if (est.aberto) fechar(true) })

  /* ---------- slide: preparo, observação, posição das ações ---------- */
  function prepararSlide(s) {
    if (!s.dataset.id) return
    requestAnimationFrame(() => {
      const e = $('.sh-enunciado', s)
      if (e && e.scrollHeight > e.clientHeight + 2) $('.sh-mais', s).hidden = false
      posicionarAcoes(s)
    })
  }
  function posicionarAcoes(s) {
    const m = $('.sh-midia', s), col = $('.sh-coluna', s), a = $('.sh-acoes', s)
    if (!m || !a) return
    a.style.setProperty('--acoes-baixo', col.clientHeight - (m.offsetTop + m.offsetHeight) + 14 + 'px')
    a.classList.remove('sem-rotulo')
    if (innerWidth <= 760 && a.offsetHeight > m.offsetHeight - 84) a.classList.add('sem-rotulo')
    const g = $('.gaveta', s)
    const aberta = g && g.dataset.estado !== 'fechada' && innerWidth <= 760
    a.style.opacity = aberta ? '0' : ''; a.style.pointerEvents = aberta ? 'none' : ''
  }
  addEventListener('resize', () => $$('.sh').forEach(posicionarAcoes))

  let obs
  function observar() {
    obs && obs.disconnect()
    obs = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting && en.intersectionRatio > 0.6) entrou(en.target)
    }), { root: $('#feed'), threshold: [0.6] })
    $$('#feed .sh').forEach((s) => obs.observe(s))
  }
  function entrou(s) {
    const lista = $$('#feed .sh'); est.atual = lista.indexOf(s); est.inicio = performance.now()
    const [ant, prox] = $$('.pl-setas button'); ant.disabled = est.atual === 0; prox.disabled = est.atual === lista.length - 1
    if (s.dataset.id) history.replaceState({ shorts: 1 }, '', '#short-' + s.dataset.id)
    const anel = $('.anel .valor', s); if (anel) requestAnimationFrame(() => { anel.style.strokeDashoffset = anel.dataset.alvo })
    // pré-carrega as duas próximas imagens
    lista.slice(est.atual + 1, est.atual + 3).forEach((n) => { const q = n.dataset.id && porId(n.dataset.id); if (q && q.imagem) new Image().src = q.imagem.src })
  }
  function ir(delta) {
    const lista = $$('#feed .sh'), alvo = lista[est.atual + delta]
    if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ---------- progresso ---------- */
  function progresso() {
    const lim = LIMITE[est.perfil], p = $('#progresso')
    const seq = est.seq >= 2 ? `<span class="prog-seq">${ic('i-chama')}${est.seq} seguidas</span>` : '<span></span>'
    if (lim === Infinity) {
      p.innerHTML = `<div class="prog-assinante"><span class="pilula"><b>${est.feitas}</b>&nbsp;hoje</span>${est.seq >= 2 ? `<span class="pilula">${ic('i-chama')}${est.seq} seguidas</span>` : ''}</div>`
      return
    }
    const rs = Object.values(est.resp)
    const segs = Array.from({ length: lim }, (_, i) => `<i class="${rs[i] ? 'feito' + (rs[i].certo ? '' : ' errou') : ''}"></i>`).join('')
    p.innerHTML = `<div class="segmentos">${segs}</div><div class="prog-texto"><span><b>${Math.min(est.feitas, lim)} de ${lim}</b> grátis hoje</span>${seq}</div>`
  }

  /* ---------- responder ---------- */
  function responder(s, letra) {
    const q = porId(s.dataset.id)
    if (s.classList.contains('respondida')) return
    if (est.feitas >= LIMITE[est.perfil]) { aviso('Seus Shorts grátis de hoje acabaram'); return }
    const certo = letra === q.gabarito
    est.resp[q.id] = { letra, certo, ms: performance.now() - est.inicio }
    est.feitas++; est.seq = certo ? est.seq + 1 : 0
    s.classList.add('respondida')
    const bt = (l) => $(`.alt[data-letra="${l}"]`, s)
    bt(q.gabarito).classList.add('certa', 'anima'); $('.alt-letra', bt(q.gabarito)).innerHTML = ic('i-visto')
    if (!certo) bt(letra).classList.add('errada', 'anima')
    vibrar(certo ? 14 : [18, 60, 18])
    progresso()
    // o que vem depois
    const lim = LIMITE[est.perfil]
    if (est.feitas >= lim) {
      let n; while ((n = s.nextElementSibling)) n.remove()
      const idx = est.fila.indexOf(q.id)
      $('#feed').append(est.perfil === 'visitante' ? muroConta() : muroLimite(porId(est.fila[idx + 1])))
      observar(); relogios()
    } else if (lim === Infinity && est.feitas % 10 === 0) {
      s.after(fimDeBloco()); observar()
    }
    const g = $('.gaveta', s); g.innerHTML = gaveta(q, est.resp[q.id]); botaoProxima(s); ligarArrasto(g)
    setTimeout(() => estadoGaveta(s, 'espiar'), certo ? 650 : 900)
  }
  function estadoGaveta(s, e) {
    const g = $('.gaveta', s); if (!g || !g.innerHTML) return
    g.dataset.estado = e; g.style.transform = ''
    if (e === 'aberta') $('.gaveta-corpo', g).scrollTop = 0
    posicionarAcoes(s)
  }

  /* arrastar a gaveta */
  function ligarArrasto(g) {
    const cab = $('[data-arrastar]', g); if (!cab) return
    let y0 = 0, t0 = 0, base = 0, mexeu = false, ativo = false
    const pos = { aberta: 0, espiar: 0.45, fechada: 1 }
    cab.addEventListener('pointerdown', (e) => {
      ativo = true; mexeu = false; y0 = e.clientY; t0 = performance.now()
      base = pos[g.dataset.estado] * g.offsetHeight; g.classList.add('arrastando'); cab.setPointerCapture(e.pointerId)
    })
    cab.addEventListener('pointermove', (e) => {
      if (!ativo) return
      const dy = e.clientY - y0; if (Math.abs(dy) > 4) mexeu = true
      g.style.transform = `translateY(${Math.max(0, base + dy)}px)`
    })
    const solta = (e) => {
      if (!ativo) return; ativo = false; g.classList.remove('arrastando')
      const s = g.closest('.sh'), dy = e.clientY - y0, v = dy / (performance.now() - t0)
      if (!mexeu) return estadoGaveta(s, g.dataset.estado === 'aberta' ? 'espiar' : 'aberta')
      const atual = (base + dy) / g.offsetHeight
      let alvo = atual < 0.22 ? 'aberta' : atual < 0.72 ? 'espiar' : 'fechada'
      if (v > 0.6) alvo = g.dataset.estado === 'aberta' ? 'espiar' : 'fechada'
      if (v < -0.6) alvo = 'aberta'
      estadoGaveta(s, alvo)
    }
    cab.addEventListener('pointerup', solta); cab.addEventListener('pointercancel', solta)
  }

  /* ---------- coração, nota, salvar ---------- */
  function coracao(s, ligar, ondeX, ondeY) {
    const q = porId(s.dataset.id), tinha = est.coracao.has(q.id)
    const novo = ligar === undefined ? !tinha : ligar
    if (novo) { est.coracao.add(q.id); est.nota[q.id] = 10 } else { est.coracao.delete(q.id); if (est.nota[q.id] === 10) delete est.nota[q.id] }
    const a = $('.sh-acoes .acao[data-acao="coracao"]', s)
    a.setAttribute('aria-pressed', novo); $('.acao-bola', a).innerHTML = ic(novo ? 'i-coracao-cheio' : 'i-coracao'); $('.n', a).textContent = contagem(coracoesDe(q))
    if (novo && !tinha) { a.classList.remove('pulsa'); void a.offsetWidth; a.classList.add('pulsa'); vibrar(10) }
    const nc = $('.nota-coracao', s)
    if (nc) { nc.setAttribute('aria-pressed', novo); nc.innerHTML = ic(novo ? 'i-coracao-cheio' : 'i-coracao') + 'Amei' }
    $$('.regua button', s).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.nota === est.nota[q.id])))
    if (ondeX !== undefined && novo) {
      const m = $('.sh-coluna', s), r = m.getBoundingClientRect(), el = document.createElement('div')
      el.className = 'estouro'; el.innerHTML = ic('i-coracao-cheio'); el.style.left = ondeX - r.left + 'px'; el.style.top = ondeY - r.top + 'px'
      m.append(el); setTimeout(() => el.remove(), 950)
    }
  }
  function nota(s, n) {
    const q = porId(s.dataset.id)
    est.nota[q.id] = n
    if (n === 10) coracao(s, true); else { if (est.coracao.has(q.id)) coracao(s, false); est.nota[q.id] = n }
    $$('.regua button', s).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.nota === n)))
    aviso(n <= 5 ? `Nota ${n} registrada. Obrigado, vamos melhorar esse comentário.` : `Nota ${n} registrada`)
  }

  /* ---------- toque na mídia: um toque amplia, dois dão coração ---------- */
  let ultimoToque = 0, toqueT
  function tocarMidia(s, e) {
    const agora = Date.now()
    if (agora - ultimoToque < 300) { clearTimeout(toqueT); ultimoToque = 0; coracao(s, true, e.clientX, e.clientY); return }
    ultimoToque = agora
    const q = porId(s.dataset.id)
    toqueT = setTimeout(() => { if (q.imagem) ampliar(q.imagem.src) }, 300)
  }
  function ampliar(src) { const z = $('#zoom'); $('#zoom-img').src = src; $('#zoom-area').classList.remove('perto'); z.hidden = false }

  /* ---------- relógio até a meia-noite ---------- */
  let relT
  function relogios() {
    clearInterval(relT)
    const tic = () => {
      const a = new Date(), m = new Date(a); m.setHours(24, 0, 0, 0)
      let d = Math.floor((m - a) / 1000); const h = String(Math.floor(d / 3600)).padStart(2, '0'); d %= 3600
      const t = `${h}:${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`
      $$('[data-relogio]').forEach((el) => (el.textContent = t))
    }
    tic(); relT = setInterval(tic, 1000)
  }

  /* ---------- cliques ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]'); if (!b) return
    const s = b.closest('.sh'), a = b.dataset.acao
    switch (a) {
      case 'abrir': abrir(b.dataset.id || QS[+b.dataset.indice || 0].id, b.classList.contains('capa') || b.id === 'vertical' ? b : null); break
      case 'fechar': fechar(); break
      case 'trilho': $('#trilho').scrollBy({ left: +b.dataset.dir * 420, behavior: 'smooth' }); break
      case 'responder': responder(s, b.dataset.letra); break
      case 'mais': $('.sh-enunciado', s).classList.remove('recolhido'); b.hidden = true; break
      case 'midia': tocarMidia(s, e); break
      case 'reabrir': estadoGaveta(s, 'espiar'); break
      case 'comentario': s.classList.contains('respondida') ? estadoGaveta(s, 'aberta') : aviso('Responda primeiro: o porquê aparece logo depois'); break
      case 'ler-tudo': estadoGaveta(s, 'aberta'); break
      case 'proxima': ir(1); break
      case 'anterior': ir(-1); break
      case 'coracao': coracao(s); break
      case 'nota': nota(s, +b.dataset.nota); break
      case 'salvar': {
        const id = s.dataset.id, on = !est.salvas.has(id); on ? est.salvas.add(id) : est.salvas.delete(id)
        b.setAttribute('aria-pressed', on); $('.acao-bola', b).innerHTML = ic(on ? 'i-salvar-cheio' : 'i-salvar')
        aviso(on ? 'Salva nas suas Favoritas' : 'Tirada das Favoritas'); break
      }
      case 'compartilhar': {
        const q = porId(s.dataset.id), url = 'https://ortoquestoes.com.br/shorts/' + q.id
        const copiar = () => { try { navigator.clipboard.writeText(url).catch(() => {}) } catch (_) {} aviso('Link copiado: ortoquestoes.com.br/shorts/' + q.id) }
        if (navigator.share) navigator.share({ title: 'Você acertaria essa?', text: `${q.gancho} · ${q.prova} ${q.ano}`, url }).catch(copiar)
        else copiar()
        break
      }
      case 'relatar': aviso('No site, aqui abre o formulário de relato de erro'); break
      case 'config': case 'config-home':
        if (a === 'config-home' && !est.aberto) { aviso('Os ajustes ficam dentro dos Shorts: toque em Assistir'); break }
        $('#config').hidden = false; break
      case 'config-ok': $('#config').hidden = true; aviso('Pronto: os próximos Shorts seguem seus ajustes'); break
      case 'assinar': aviso('Aqui abre a página de planos'); break
      case 'sessao': aviso('Aqui começa uma sessão só com os erros do bloco'); break
      case 'criar-conta': {
        est.perfil = 'gratis'; desenharInicio(); progresso()
        const muro = b.closest('.sh'), feed = $('#feed')
        const feitos = new Set(Object.keys(est.resp))
        est.fila.filter((id) => !feitos.has(id) && !$(`.sh[data-id="${id}"]`, feed)).forEach((id) => { const n = slide(porId(id)); muro.before(n); prepararSlide(n) })
        muro.remove(); observar(); aviso('Conta criada. Mais 4 Shorts liberados hoje')
        break
      }
      case 'zoom-fechar': $('#zoom').hidden = true; break
      case 'tema': {
        const r = document.documentElement; r.dataset.tema = r.dataset.tema === 'escuro' ? 'claro' : 'escuro'; break
      }
    }
  })
  $('#zoom-area').addEventListener('click', (e) => { if (e.target.closest('.zoom-x')) return; $('#zoom-area').classList.toggle('perto') })
  $('#config').addEventListener('click', (e) => {
    if (e.target.id === 'config') { $('#config').hidden = true; return }
    const c = e.target.closest('.chip-sel'); if (!c) return
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'))
  })
  $$('.proto-seg button').forEach((b) => b.addEventListener('click', () => {
    est.perfil = b.dataset.perfil; est.feitas = 0; est.seq = 0; est.resp = {}; desenharInicio()
    aviso({ visitante: 'Vendo como visitante sem conta: 1 Short grátis', gratis: 'Vendo como conta grátis: 5 Shorts por dia', assinante: 'Vendo como assinante: Shorts sem limite' }[est.perfil])
  }))

  /* ---------- teclado ---------- */
  document.addEventListener('keydown', (e) => {
    if (!est.aberto) return
    if (!$('#zoom').hidden) { if (e.key === 'Escape') $('#zoom').hidden = true; return }
    if (!$('#config').hidden) { if (e.key === 'Escape') $('#config').hidden = true; return }
    const s = $$('#feed .sh')[est.atual]
    const k = e.key.toLowerCase()
    if (k === 'escape') fechar()
    else if (k === 'arrowdown' || k === 'j' || k === 'pagedown') { e.preventDefault(); ir(1) }
    else if (k === 'arrowup' || k === 'k' || k === 'pageup') { e.preventDefault(); ir(-1) }
    else if (s && s.dataset.id && /^[a-e]$/.test(k) && !s.classList.contains('respondida')) { const b = $(`.alt[data-letra="${k.toUpperCase()}"]`, s); b && responder(s, k.toUpperCase()) }
    else if (s && s.dataset.id && k === 'h') coracao(s)
    else if (s && s.dataset.id && k === 'c' && s.classList.contains('respondida')) estadoGaveta(s, $('.gaveta', s).dataset.estado === 'aberta' ? 'espiar' : 'aberta')
  })

  // tema: segue a escolha do visitante (data-theme) ou o sistema
  const raiz = document.documentElement
  const temaInicial = raiz.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  raiz.dataset.tema = temaInicial === 'dark' ? 'escuro' : 'claro'
  desenharInicio()
  const m = location.hash.match(/^#short-(.+)$/)
  if (m && porId(m[1])) { history.replaceState(null, '', location.pathname); abrir(m[1]) }
})()
