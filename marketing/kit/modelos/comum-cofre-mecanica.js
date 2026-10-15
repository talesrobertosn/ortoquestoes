// Peças comuns ao Cofre de duas chaves (feed) e à Mecânica fina (stories): os dois modelos
// aprovados usam o mesmo CSS. A marcação abaixo é a dos modelos aprovados, só que preenchida pelo JSON.
function MECANISMO(q, c) {
  const { t } = KIT
  const P = KIT.prova(q)
  const im = (q.imagens ?? [])[0]
  const legenda = c.fonte ?? (im && im.legenda) ?? (q.simulado ? '' : `Imagem original da questão · ${P}`)
  const frase = (s, max = 150) => {
    const x = KIT.corrido(s)
    if (x.length <= max) return x
    const corte = x.slice(0, max).lastIndexOf('. ')
    return corte > 40 ? x.slice(0, corte + 1) : x.slice(0, max).replace(/\s\S*$/, '') + '...'
  }
  const incorretas = q.alternativas.filter((a) => a.letra !== q.gabarito)
  return {
    P,
    dq: ` data-question="${q.id}"`,
    img: KIT.imagem(q, c),
    fonte: legenda ? `<p class="source">${t(legenda)}</p>` : '',
    rodape: c.rodape ?? (q.simulado ? 'OrtoQuestões Simulados' : `${P} · questão oficial`),
    badge: c.selo_celular ?? (q.simulado ? 'OrtoQuestões Simulados' : P),
    tagPadrao: q.simulado ? 'OrtoQuestões Simulados' : `${q.area ?? 'Questão oficial'} · ${P}`,
    enunciado: KIT.marcar(q.enunciado, c.negritos, []),
    opcoes: (estilo) => `<div class="options"${estilo ? ` style="${estilo}"` : ''}>${q.alternativas.map((a, i) => `<div class="opt"><i>${a.letra}</i><span>${t(c.alternativas_formatadas?.[i] ?? a.texto)}</span></div>`).join('')}</div>`,
    comparacao: (obj, estilo) => `<div class="compare"${estilo ? ` style="${estilo}"` : ''}>${incorretas.map((a) => {
      const x = obj?.[a.letra] ?? KIT.partes(q.comentario?.incorretas?.[a.letra])
      return `<div class="comparison"><span class="letter">${a.letra}</span><div><h3>${t(x.titulo || a.texto)}</h3><p>${t(x.texto)}</p></div></div>`
    }).join('')}</div>`,
    passos: (itens, estilo) => `<div class="steps"${estilo ? ` style="${estilo}"` : ''}>${(itens ?? []).map((p, i) => `<div class="step"><div class="n">0${i + 1}</div><div><h3>${t(p.titulo)}</h3><p>${t(p.texto)}</p></div></div>`).join('')}</div>`,
    celular: (cel = {}, rotulo = (l) => `ALTERNATIVA ${l}`) => {
      const itens = cel.itens ?? incorretas.map((a) => ({ rotulo: rotulo(a.letra), texto: frase(q.comentario?.incorretas?.[a.letra], 110) }))
      const ok = q.alternativas.find((a) => a.letra === q.gabarito)
      return `<div class="phone"><div class="screen"><div class="minihead">Orto Questões · Comentário</div><span class="badge">${t(cel.selo ?? (c.selo_celular ?? (q.simulado ? 'OrtoQuestões Simulados' : P)))}</span><h4>${t(cel.titulo ?? `${q.gabarito} · ${ok?.texto ?? ''}`)}</h4><p>${t(cel.texto ?? frase(q.comentario?.correta))}</p>${itens.map((m) => `<div class="mini"><strong>${t(m.rotulo)}</strong><p>${t(m.texto)}</p></div>`).join('')}</div></div>`
    },
    recursos: (lista) => (lista ?? [
      { titulo: 'O conceito.', texto: 'Entenda o que decide a questão.' },
      { titulo: 'Cada alternativa.', texto: 'Veja por que as erradas erram.' },
      { titulo: 'A referência.', texto: 'Saiba de onde vem a explicação.' },
    ]).map((r) => `<div class="feature"><h3>${t(r.titulo)}</h3><p>${t(r.texto)}</p></div>`).join(''),
  }
}

// Cada tela: o conteúdo não pode descer até o rodapé (nem até o botão final, quando ele é fixo).
function AJUSTAR_COFRE_MECANICA(baseMax) {
  for (const s of document.querySelectorAll('section')) {
    const ct = s.querySelector('.content'), s0 = s.getBoundingClientRect().top
    const fixo = [...ct.children].find((e) => getComputedStyle(e).position === 'absolute')
    const limite = fixo ? Math.min(baseMax, fixo.getBoundingClientRect().top - s0 - 12) : baseMax
    const elasticos = [...ct.children].filter((e) => e !== fixo)
    KIT.encaixar(s, () => {
      let topo = Infinity, base = -Infinity
      for (const e of elasticos) { const r = e.getBoundingClientRect(); if (r.height) { topo = Math.min(topo, r.top); base = Math.max(base, r.bottom) } }
      return { topo, base }
    }, elasticos, limite)
    const tela = s.querySelector('.screen')
    if (tela && tela.lastElementChild && tela.lastElementChild.getBoundingClientRect().bottom > tela.getBoundingClientRect().bottom - 4) KIT.aviso(`${s.id}: o texto do celular passa da tela e fica cortado; encurte "celular".`)
    const img = s.querySelector('img')
    if (img && img.naturalWidth && img.naturalWidth < 300) KIT.aviso(`${s.id}: a imagem da questão é pequena (${img.naturalWidth}px de largura); confira a nitidez.`)
  }
}
