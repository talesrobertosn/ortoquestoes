// Funções comuns dos modelos parametrizados do kit (marketing/kit/modelos/*.html).
// Cada modelo traz o CSS do modelo aprovado sem mudança e monta as seções a partir de
// window.DADOS (posto pelo renderizar.mjs a partir do JSON da fila). Sem DADOS, o modelo mostra
// o EXEMPLO, que é o post aprovado original: abrir o HTML no navegador serve de referência.
//
// Marcação aceita em qualquer texto do JSON:
//   **negrito**   [[destaque na cor do estilo]]   *itálico*   ==negrito==   \n = quebra de linha
(function () {
  const RAIZ = new URL('../../../', location.href)
  const SIMBOLO = '<svg width="0" height="0" style="position:absolute"><symbol id="sim" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#14655E"/><g fill="#FFFFFF" opacity=".55"><path transform="translate(13 9.5)" d="M3.2 0H18.8A3.2 3.2 0 0 1 22 3.2V5.4A3.2 3.2 0 0 1 18.8 8.6H3.2A3.2 3.2 0 0 1 0 5.4V3.2A3.2 3.2 0 0 1 3.2 0ZM21 2.6H24.6L34.2 5.2Q35.6 5.8 35 7.2L34.4 8.4Q33.8 9.6 32.4 9.1L24.6 6.2H21Z"/><path transform="translate(11 21.2)" d="M3.2 0H18.8A3.2 3.2 0 0 1 22 3.2V5.4A3.2 3.2 0 0 1 18.8 8.6H3.2A3.2 3.2 0 0 1 0 5.4V3.2A3.2 3.2 0 0 1 3.2 0ZM21 2.6H24.6L34.2 5.2Q35.6 5.8 35 7.2L34.4 8.4Q33.8 9.6 32.4 9.1L24.6 6.2H21Z"/><path transform="translate(13 44.6)" d="M3.2 0H18.8A3.2 3.2 0 0 1 22 3.2V5.4A3.2 3.2 0 0 1 18.8 8.6H3.2A3.2 3.2 0 0 1 0 5.4V3.2A3.2 3.2 0 0 1 3.2 0ZM21 2.6H24.6L34.2 5.2Q35.6 5.8 35 7.2L34.4 8.4Q33.8 9.6 32.4 9.1L24.6 6.2H21Z"/></g><path fill="#F4CF7C" transform="translate(11 32.9)" d="M3.2 0H18.8A3.2 3.2 0 0 1 22 3.2V5.4A3.2 3.2 0 0 1 18.8 8.6H3.2A3.2 3.2 0 0 1 0 5.4V3.2A3.2 3.2 0 0 1 3.2 0ZM21 2.6H24.6L34.2 5.2Q35.6 5.8 35 7.2L34.4 8.4Q33.8 9.6 32.4 9.1L24.6 6.2H21Z"/></symbol></svg>'

  const avisos = []
  const aviso = (m) => { avisos.push(m); console.warn(m) }

  // Texto do JSON -> HTML.
  function t(s) {
    if (s == null) return ''
    return String(s)
      .replace(/\[\[([\s\S]+?)\]\]/g, '<em>$1</em>')
      .replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>')
      .replace(/==([\s\S]+?)==/g, '<b>$1</b>')
      .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g, '$1<i>$2</i>')
      .replace(/\n/g, '<br>')
  }
  // Comentário do acervo (com listas e títulos em markdown) -> uma frase corrida.
  function corrido(s) {
    if (!s) return ''
    return String(s).split('\n').map((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^#+\s*/, '').replace(/^>\s*/, '').trim())
      .filter(Boolean).join(' ').replace(/==([^=]+)==/g, '**$1**')
  }
  // "**Título.** resto" -> { titulo, texto }
  function partes(s) {
    const c = corrido(s)
    const m = c.match(/^\*\*(.+?)\*\*[:.]?\s*([\s\S]*)$/)
    return m ? { titulo: m[1].replace(/[.:]$/, ''), texto: m[2] } : { titulo: '', texto: c }
  }
  const img = (p) => (!p ? '' : /^(https?:|file:|\/)/.test(p) ? p : new URL(p, RAIZ).href)
  const prova = (q) => (q.simulado || !q.prova ? 'OrtoQuestões Simulados' : `${q.prova}${q.ano ? ' ' + q.ano : ''}`)
  const imagem = (q, c) => img(c.imagem || (q.imagens && q.imagens[0] && (q.imagens[0].arquivo || q.imagens[0])))
  const textoAlt = (q, l) => (q.alternativas.find((a) => a.letra === l) || {}).texto || ''
  // Motivo de cada alternativa, tirado do comentário do acervo (só quando o JSON não trouxer outro).
  function motivo(q, l) {
    const c = q.comentario || {}
    return corrido(l === q.gabarito ? c.correta : (c.incorretas || {})[l])
  }
  // Grifa trechos do enunciado sem mudar o texto: grifos = ["trecho"], negritos = ["trecho"].
  function marcar(txt, negritos, grifos, classeGrifo) {
    let h = txt
    for (const g of grifos || []) {
      if (!h.includes(g)) aviso(`Trecho para grifar não está no enunciado: "${g}"`)
      h = h.replace(g, classeGrifo ? `<span class="${classeGrifo}"><b>${g}</b></span>` : `<b>${g}</b>`)
    }
    for (const n of negritos || []) {
      if (!h.includes(n)) aviso(`Trecho para negrito não está no enunciado: "${n}"`)
      h = h.replace(n, `<b>${n}</b>`)
    }
    return h
  }

  const caixa = (el) => el.getBoundingClientRect()
  // Uniao dos filhos visíveis de um elemento.
  function uniao(el) {
    let topo = Infinity, base = -Infinity
    for (const f of el.children) {
      const r = f.getBoundingClientRect()
      if (!r.height) continue
      topo = Math.min(topo, r.top); base = Math.max(base, r.bottom)
    }
    return { topo, base }
  }
  // Reduz (zoom) os elementos "elasticos" até o conteúdo caber entre topoMin e baseMax
  // (em px, relativos à seção). Só age quando transborda: o que já cabe fica idêntico ao aprovado.
  function encaixar(secao, medir, elasticos, baseMax, topoMin = -Infinity, min = 0.72) {
    const s0 = caixa(secao).top
    const fora = () => { const u = medir(); return u.base - s0 > baseMax + 0.5 || u.topo - s0 < topoMin - 0.5 }
    let z = 1
    while (fora() && z > min) { z = Math.round((z - 0.02) * 100) / 100; elasticos.forEach((e) => (e.style.zoom = z)) }
    if (z < 1) aviso(`${secao.id}: texto longo, reduzido a ${Math.round(z * 100)}% para caber. Prefira encurtar o texto no JSON.`)
    if (fora()) aviso(`${secao.id}: o conteúdo ainda passa do limite mesmo reduzido. Encurte o texto no JSON.`)
  }
  // Diminui a fonte de uma linha que não pode quebrar (white-space: nowrap) até caber na largura.
  // maxW: largura disponível em px (padrão: a do próprio elemento).
  function caberLinha(el, minPx, maxW) {
    const largura = () => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width }
    const limite = () => maxW ?? el.clientWidth
    let fs = parseFloat(getComputedStyle(el).fontSize)
    while (largura() > limite() + 1 && fs > minPx) { fs -= 1; el.style.fontSize = fs + 'px' }
    if (largura() > limite() + 1) aviso(`Linha longa demais: "${el.textContent.trim()}"`)
  }
  function caberLargura(el, minPx) {
    let fs = parseFloat(getComputedStyle(el).fontSize)
    const pai = el.parentElement
    while (el.scrollWidth > pai.clientWidth + 1 && fs > minPx) { fs -= 1; el.style.fontSize = fs + 'px' }
  }

  function verificarGeral() {
    for (const s of document.querySelectorAll('section[id]')) {
      const r = s.getBoundingClientRect()
      for (const el of s.querySelectorAll('p, h1, h2, h3, h4, span, b, strong, li, td, small, i, em, div')) {
        if (!el.textContent.trim() || el.children.length > 3) continue
        const e = el.getBoundingClientRect()
        if (!e.width || !e.height) continue
        if (e.right > r.right + 2 || e.left < r.left - 2 || e.bottom > r.bottom + 2) {
          aviso(`${s.id}: texto saindo da imagem: "${el.textContent.trim().slice(0, 60)}"`); break
        }
      }
    }
  }

  async function montar(exemplo, construir, ajustar) {
    const D = window.DADOS || exemplo
    const q = D.questao || {}
    const c = D.conteudo || {}
    document.body.insertAdjacentHTML('afterbegin', SIMBOLO)
    document.body.insertAdjacentHTML('beforeend', construir(q, c, D))
    if (window.APOS_INSERIR) window.APOS_INSERIR()
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => (i.complete ? (i.naturalWidth ? 0 : aviso(`Imagem não encontrada: ${decodeURI(i.src)}`)) : new Promise((ok) => {
      i.onload = ok; i.onerror = () => { aviso(`Imagem não encontrada: ${decodeURI(i.src)}`); ok() }
    }))))
    try { if (ajustar) ajustar(q, c, D) } catch (e) { aviso('Erro ao ajustar: ' + e.message) }
    verificarGeral()
    window.AVISOS = avisos
    window.PRONTO = true
  }

  window.KIT = { t, corrido, partes, img, prova, imagem, textoAlt, motivo, marcar, uniao, encaixar, caberLinha, caberLargura, aviso, montar }
})()
