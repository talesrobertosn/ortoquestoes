/* Blog Orto Questões: interações por cima do texto estático (o artigo funciona inteiro sem este arquivo). */
(function () {
  'use strict'
  var $ = function (s, r) { return (r || document).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }
  var semMovimento = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches
  document.documentElement.classList.add('com-js')

  /* Barra de leitura e índice que acompanha a seção */
  var barra = $('.bl-progresso')
  var artigo = $('.bl-artigo')
  var links = $$('.bl-indice a[href^="#"]')
  var secoes = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)) }).filter(Boolean)
  var pedido = false
  function aoRolar() {
    pedido = false
    if (barra && artigo) {
      var r = artigo.getBoundingClientRect()
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)))
      barra.style.setProperty('--p', p.toFixed(4))
    }
    var atual = null
    secoes.forEach(function (s) { if (s.getBoundingClientRect().top < innerHeight * 0.35) atual = s.id })
    links.forEach(function (a) { a.classList.toggle('ativo', a.getAttribute('href') === '#' + atual) })
  }
  addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(aoRolar) } }, { passive: true })
  aoRolar()

  /* Botões de alternar genéricos: [data-grupo] com [data-valor] */
  function alternar(caixa, aoMudar) {
    var botoes = $$('button[data-valor]', caixa)
    botoes.forEach(function (b) {
      b.addEventListener('click', function () {
        botoes.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)) })
        aoMudar(b.getAttribute('data-valor'))
      })
    })
  }

  /* Duelo: reler x testar (dados do estudo em data-*) */
  $$('[data-duelo]').forEach(function (caixa) {
    var barras = $$('.bl-barra', caixa)
    var veredito = $('.bl-veredito', caixa)
    function mostrar(momento) {
      barras.forEach(function (b) {
        var v = b.getAttribute('data-' + momento)
        b.querySelector('.bl-barra__valor').style.setProperty('--v', v + '%')
        b.querySelector('.bl-barra__num').textContent = v + '%'
      })
      if (veredito) veredito.innerHTML = veredito.getAttribute('data-' + momento)
    }
    alternar($('.bl-alternar', caixa), mostrar)
    // Começa no curto prazo; ao entrar na tela pela primeira vez, as barras crescem.
    barras.forEach(function (b) { b.querySelector('.bl-barra__valor').style.setProperty('--v', '0%') })
    var visto = false
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !visto) { visto = true; mostrar('curto'); io.disconnect() }
    }, { threshold: 0.4 }) : null
    if (io) io.observe(caixa); else mostrar('curto')
  })

  /* Questão real: certeza, resposta e o porquê de cada alternativa */
  $$('[data-quiz]').forEach(function (caixa) {
    var certa = caixa.getAttribute('data-certa')
    var certeza = null
    var resultado = $('.bl-quiz__resultado', caixa)
    alternar($('.bl-confianca', caixa), function (v) { certeza = v })
    $$('.bl-alt', caixa).forEach(function (b) {
      b.addEventListener('click', function () {
        if (caixa.classList.contains('bl-quiz--respondida')) return
        var escolha = b.getAttribute('data-letra')
        caixa.classList.add('bl-quiz--respondida')
        $$('.bl-alt', caixa).forEach(function (x) {
          x.disabled = true
          var l = x.getAttribute('data-letra')
          if (l === certa) x.classList.add('bl-alt--certa')
          else if (l === escolha) x.classList.add('bl-alt--errada')
        })
        var acertou = escolha === certa
        var frases = {
          'certeza-true': 'Acertou com certeza. Ótimo, e mesmo assim vale ler as outras três: é nelas que mora o próximo distrator.',
          'certeza-false': 'Errou com certeza: é o erro mais valioso que existe. Ele mostra uma ideia errada bem firme, e o comentário agora tem tudo para corrigi-la.',
          'duvida-true': 'Acertou na dúvida. Isso não é saber ainda: no Orto Questões, uma resposta assim volta na revisão.',
          'duvida-false': 'Errou na dúvida. Leia o porquê de cada alternativa: a diferença entre elas é o que a banca cobra.',
          'chute-true': 'Acertou no chute. Conta como acerto na nota, mas não na memória: por isso a questão chutada volta na revisão.',
          'chute-false': 'Errou no chute. Sem problema: tentar antes de ver a resposta já prepara o cérebro para guardar a explicação.',
          'nada-true': 'Acertou. Antes de seguir, leia o porquê das erradas.',
          'nada-false': 'Não foi desta vez. Leia o porquê de cada alternativa abaixo.'
        }
        if (resultado) resultado.textContent = frases[(certeza || 'nada') + '-' + acertou]
        var depois = $('.bl-quiz__depois', caixa)
        if (depois && !semMovimento) depois.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    })
    var refazer = $('[data-refazer]', caixa)
    if (refazer) refazer.addEventListener('click', function () {
      caixa.classList.remove('bl-quiz--respondida')
      $$('.bl-alt', caixa).forEach(function (x) { x.disabled = false; x.classList.remove('bl-alt--certa', 'bl-alt--errada') })
      $$('.bl-confianca button', caixa).forEach(function (x) { x.setAttribute('aria-pressed', 'false') })
      certeza = null
      if (resultado) resultado.textContent = ''
      caixa.scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' })
    })
  })

  /* Mito ou fato: a carta vira */
  $$('.bl-carta').forEach(function (c) {
    c.addEventListener('click', function () { c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')) })
  })

  /* Curva do esquecimento (modelo ilustrativo) */
  $$('[data-curva]').forEach(function (caixa) {
    var svg = $('svg', caixa)
    var dia = $('input[type="range"]', caixa)
    var saida = $('output', caixa)
    var placarSem = $('.sem strong', caixa)
    var placarCom = $('.com strong', caixa)
    var REVISOES = [1, 3, 7, 14, 30]
    var W = 640, H = 260, M = { e: 40, d: 12, t: 12, b: 30 }, DIAS = 30
    function reter(t, revisoes) {
      // Força da memória começa em 1,6 dia; cada revisão no tempo certo devolve a lembrança e multiplica a força.
      var forca = 1.6, ultima = 0
      for (var i = 0; i < revisoes.length; i++) { if (revisoes[i] <= t) { ultima = revisoes[i]; forca *= 2.6 } }
      // Sempre sobra uma parte (a curva real não chega a zero): piso de 22%.
      return 0.22 + 0.78 * Math.exp(-(t - ultima) / forca)
    }
    function x(t) { return M.e + (t / DIAS) * (W - M.e - M.d) }
    function y(r) { return M.t + (1 - r) * (H - M.t - M.b) }
    function caminho(revisoes) {
      var d = '', passo = 0.1
      for (var t = 0; t <= DIAS + 0.001; t += passo) {
        var antes = reter(t, revisoes)
        d += (t === 0 ? 'M' : 'L') + x(t).toFixed(1) + ' ' + y(antes).toFixed(1)
        // degrau da revisão: sobe na hora
        for (var i = 0; i < revisoes.length; i++) if (Math.abs(t + passo - revisoes[i]) < passo / 2) d += 'L' + x(revisoes[i]).toFixed(1) + ' ' + y(reter(revisoes[i] - 0.0001, revisoes)).toFixed(1) + 'L' + x(revisoes[i]).toFixed(1) + ' ' + y(1).toFixed(1)
      }
      return d
    }
    var ns = 'http://www.w3.org/2000/svg'
    function el(nome, atributos, texto) {
      var e = document.createElementNS(ns, nome)
      for (var k in atributos) e.setAttribute(k, atributos[k])
      if (texto) e.textContent = texto
      svg.appendChild(e)
      return e
    }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H)
    ;[0, 0.25, 0.5, 0.75, 1].forEach(function (r) {
      el('line', { class: 'bl-curva__grade', x1: M.e, x2: W - M.d, y1: y(r), y2: y(r) })
      el('text', { class: 'bl-curva__rotulo', x: M.e - 8, y: y(r) + 4, 'text-anchor': 'end' }, Math.round(r * 100) + '%')
    })
    ;[0, 5, 10, 15, 20, 25, 30].forEach(function (t) { el('text', { class: 'bl-curva__rotulo', x: x(t), y: H - 8, 'text-anchor': 'middle' }, t === 0 ? 'hoje' : t + 'd') })
    el('line', { class: 'bl-curva__eixo', x1: M.e, x2: W - M.d, y1: y(0), y2: y(0) })
    el('path', { class: 'bl-curva__sem', d: caminho([]) })
    el('path', { class: 'bl-curva__com', d: caminho(REVISOES) })
    REVISOES.forEach(function (t) { el('rect', { class: 'bl-curva__ponto', x: x(t) - 5, y: y(1) - 5, width: 10, height: 10 }) })
    var agora = el('line', { class: 'bl-curva__agora', x1: 0, x2: 0, y1: M.t, y2: y(0) })
    function atualizar() {
      var t = Number(dia.value)
      agora.setAttribute('x1', x(t)); agora.setAttribute('x2', x(t))
      saida.textContent = t === 0 ? 'hoje' : t === 1 ? '1 dia depois' : t + ' dias depois'
      placarSem.textContent = Math.round(reter(t, []) * 100) + '%'
      placarCom.textContent = Math.round(reter(t, REVISOES) * 100) + '%'
    }
    dia.addEventListener('input', atualizar)
    atualizar()
  })

  /* Quanto fazer hoje (sugestão para começar) */
  $$('[data-calc]').forEach(function (caixa) {
    var minutos = $('input[type="range"]', caixa)
    var saida = $('output', caixa)
    var tipo = 'comum'
    var PARTES = { plantao: 0.7, comum: 0.4, folga: 0.3 } // fração do tempo para revisar
    var DICAS = {
      plantao: 'Dia de plantão é dia leve: o objetivo é não quebrar a sequência. Revisão primeiro, poucas novas.',
      comum: 'Dia comum: questões novas do assunto da semana e a revisão do dia.',
      folga: 'Folga: bloco maior e misturado, com assuntos fora do estágio. Se sobrar fôlego, uma prova anterior.'
    }
    function atualizar() {
      var m = Number(minutos.value)
      saida.textContent = m + ' min'
      var revisar = m * PARTES[tipo], novas = m - revisar
      // cerca de 3 min por questão nova (responder e ler o comentário de todas) e 1,5 min por revisão
      $('[data-novas]', caixa).textContent = Math.max(1, Math.round(novas / 3))
      $('[data-revisoes]', caixa).textContent = Math.max(1, Math.round(revisar / 1.5))
      $('[data-semana]', caixa).textContent = Math.round((novas / 3) * 6)
      $('[data-dica]', caixa).textContent = DICAS[tipo]
    }
    alternar($('.bl-dias', caixa), function (v) { tipo = v; atualizar() })
    minutos.addEventListener('input', atualizar)
    atualizar()
  })

  /* Lista de verificação: fica guardada neste aparelho */
  $$('[data-checklist]').forEach(function (caixa) {
    var chave = 'oq-blog:' + caixa.getAttribute('data-checklist')
    var marcados = {}
    try { marcados = JSON.parse(localStorage.getItem(chave) || '{}') || {} } catch (e) { marcados = {} }
    var caixas = $$('input[type="checkbox"]', caixa)
    var medidor = $('.bl-medidor__valor', caixa)
    var texto = $('.bl-medidor span', caixa)
    function medir() {
      var n = caixas.filter(function (c) { return c.checked }).length
      if (medidor) medidor.style.setProperty('--v', (n / caixas.length * 100) + '%')
      if (texto) texto.textContent = n + ' de ' + caixas.length
    }
    caixas.forEach(function (c) {
      c.checked = !!marcados[c.value]
      c.addEventListener('change', function () {
        marcados[c.value] = c.checked
        try { localStorage.setItem(chave, JSON.stringify(marcados)) } catch (e) { /* sem armazenamento: só nesta visita */ }
        medir()
      })
    })
    medir()
  })
})()
