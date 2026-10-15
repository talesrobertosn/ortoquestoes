// Cartas do Tales (15/10/2026): o motor de e-mails pessoais e os automáticos em forma de carta.
// Confere, para todas as faixas de acerto e situações: nada de "0 questões", undefined, null ou NaN;
// assinatura sempre presente; faixa certa; frases pessoais só com dado; acerto só com amostra;
// assunto sem palavra de promoção; um link no máximo; e muita variedade por faixa.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-cartas-'))
const arquivo = join(pasta, 'c.mjs')
try {
  await build({
    stdin: { contents: `export * from './supabase/functions/_shared/cartas.ts'\nexport * as auto from './supabase/functions/_shared/modelo-email.ts'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const HOJE = new Date('2026-10-15T15:00:00-03:00')
  const SITE = 'https://ortoquestoes.com.br/'
  const PROIBIDO = /\bundefined\b|\bnull\b|\bNaN\b|\[object|(^|[^\d.,])0 (questões|questão|dias|dia)\b|\{[a-z]+\}|R\$/
  const PROMO = /grátis|gratis|gratuito|oferta|desconto|aproveite|imperd[ií]vel|promo[cç][aã]o|urgente/i

  /** Confere uma carta pronta (do motor) e devolve o e-mail renderizado. */
  function conferir(carta, contexto) {
    const e = m.renderizarCarta({ assunto: carta.assunto, corpo: carta.corpo })
    assert.ok(!PROIBIDO.test(carta.corpo), `${contexto}: texto proibido em\n${carta.corpo}`)
    assert.ok(!PROIBIDO.test(carta.assunto), `${contexto}: assunto proibido: ${carta.assunto}`)
    assert.ok(!PROMO.test(carta.assunto), `${contexto}: assunto com promoção: ${carta.assunto}`)
    assert.ok(carta.assunto.length <= 70 && !carta.assunto.includes('!'), `${contexto}: assunto longo ou gritado: ${carta.assunto}`)
    assert.equal(m.problemaNoAssunto(carta.assunto), null, `${contexto}: ${carta.assunto}`)
    assert.ok(m.contarLinks(carta.corpo) <= 1, `${contexto}: mais de um link`)
    assert.ok(!/1 questões|1 dias\b/.test(carta.corpo), `${contexto}: plural errado`)
    assert.ok(e.texto.endsWith('Um abraço,\nTales, do Orto Questões'), `${contexto}: assinatura no texto`)
    assert.ok(e.html.includes('Um abraço,<br>Tales, do Orto Questões'), `${contexto}: assinatura no HTML`)
    assert.ok(!/<img|<table|background:#146b61|<button/i.test(e.html), `${contexto}: HTML com cara de propaganda`)
    assert.ok(!/R\$\s?\d/.test(e.texto), `${contexto}: preço`)
    return e
  }

  const rico = (acertoPct, extra = {}) => ({
    nome: 'ana paula', respondidas: 400, acertos: acertoPct * 4, erros: (100 - acertoPct) * 4, semana: 60, diasParado: 0, diasConta: 90,
    situacao: 'residente', ano: 'r3', provas: ['teot'],
    areas: [{ slug: 'mao', total: 160, certas: Math.round(1.6 * Math.min(100, acertoPct + 2)) }, { slug: 'tumores', total: 40, certas: Math.round(0.4 * Math.min(100, acertoPct + 15)) }, { slug: 'pe-tornozelo', total: 40, certas: Math.round(0.4 * Math.max(0, acertoPct - 15)) }],
    horas: [{ hora: 21, n: 50 }, { hora: 22, n: 40 }, { hora: 9, n: 10 }], posicaoRanking: 23, sequencia: 6, flashcards: 80, viuPlanos: 2, limiteGratisLigado: true, ...extra,
  })
  const pobre = (respondidas, extra = {}) => ({ nome: null, respondidas, acertos: Math.round(respondidas * 0.6), erros: respondidas - Math.round(respondidas * 0.6), diasConta: 30, diasParado: respondidas ? 1 : null, ...extra })
  const obrigadoJa = [{ tipo: 'carta', modelo: 'obrigado_assinatura', versao: 'obrigado_assinatura#v1', em: '2026-09-01T12:00:00Z', status: 'enviado' }]

  // 1. Faixas de acerto: escolha automática, faixa certa, variedade e todas as versões aparecem.
  const meio = { '0-10': 5, '10-20': 15, '20-30': 25, '30-40': 35, '40-60': 50, '60-70': 65, '70-80': 75, '80-90': 85, '90-100': 95 }
  for (const faixa of m.FAIXAS) {
    assert.equal(m.faixaDe(meio[faixa]), faixa)
    const textos = new Set(), versoes = new Set()
    for (let semente = 1; semente <= 250; semente++) {
      const perfil = semente % 2 ? rico(meio[faixa], { assinante: true }) : pobre(400, { acertos: meio[faixa] * 4, erros: (100 - meio[faixa]) * 4, assinante: true })
      const carta = m.gerarCarta(perfil, { semente, anteriores: obrigadoJa, hoje: HOJE, site: SITE })
      assert.equal(carta.tipo, 'ativo', `faixa ${faixa}: escolheu ${carta.tipo}`)
      assert.equal(carta.faixa, faixa)
      assert.equal(carta.modelo, `ativo:${faixa}`)
      conferir(carta, `ativo ${faixa} #${semente}`)
      textos.add(carta.corpo); versoes.add(carta.versao)
    }
    const total = m.versoesDe('ativo', faixa).length
    assert.ok(total >= 6, `faixa ${faixa}: só ${total} versões`)
    assert.equal(versoes.size, total, `faixa ${faixa}: nem todas as versões saíram`)
    assert.ok(textos.size >= 120, `faixa ${faixa}: pouca variedade (${textos.size} textos distintos em 250)`)
  }

  // 2. Todas as situações, com perfil rico e pobre, e com poucas questões.
  for (const tipo of m.TIPOS_MANUAIS) {
    const textos = new Set()
    for (let semente = 1; semente <= 80; semente++) {
      for (const perfil of [rico(72), pobre(45), pobre(1), pobre(0, { diasConta: 4 })]) {
        if (!m.tipoCombina(tipo, perfil)) { assert.throws(() => m.gerarCarta(perfil, { tipo, semente }), /tipo_nao_combina/); continue }
        const carta = m.gerarCarta(perfil, { tipo, semente, hoje: HOJE, site: SITE, marco: tipo === 'marco' ? 100 : undefined })
        conferir(carta, `${tipo} #${semente} (${perfil.respondidas} questões)`)
        textos.add(carta.corpo)
        // Acerto só com amostra suficiente.
        if (perfil.respondidas < m.MINIMO_PARA_ACERTO) assert.ok(!/\d+%/.test(carta.corpo), `${tipo}: citou acerto com ${perfil.respondidas} questões:\n${carta.corpo}`)
      }
    }
    const minimo = tipo === 'ativo' ? 60 : 40
    assert.ok(textos.size >= minimo, `${tipo}: pouca variedade (${textos.size})`)
    assert.ok(m.versoesDe(tipo, tipo === 'ativo' ? '70-80' : null).length >= 4, `${tipo}: poucas versões`)
  }
  for (const tipo of ['convite_20', 'convite_50', 'nunca_comecou', 'sumiu', 'comecou_parou', 'obrigado_assinatura']) {
    assert.ok(m.versoesDe(tipo, null).length >= 5, `${tipo}: menos de 5 versões`)
  }

  // 3. Frases condicionais somem sem dado: ninguém fala de ranking, horário, área, prova ou sequência sem saber.
  const SEM_DADO = [/ranking geral|º no ranking|posição no ranking/i, /à noite|madrugada|de manhã|almoço|à tarde/, /mão e punho|tumores|pé e tornozelo|ortopedia pediátrica/, /que você está estudando para o TEOT|o TEOT está no seu radar|seu foco é o TEOT/, /seguidos/, /sem limite/, /\bR[123]\b/]
  for (const tipo of m.TIPOS_MANUAIS) {
    if (tipo === 'reta_final' || tipo === 'nunca_comecou') continue // reta final fala do TEOT por definição
    for (let semente = 1; semente <= 60; semente++) {
      const carta = m.gerarCarta(pobre(120), { tipo, semente, hoje: HOJE, site: SITE, marco: 100 })
      for (const re of SEM_DADO) assert.ok(!re.test(carta.corpo), `${tipo} #${semente}: frase sem dado (${re}):\n${carta.corpo}`)
      assert.deepEqual(carta.personalizacao, [], `${tipo}: personalização sem dado`)
    }
  }
  // Com dado, a personalização aparece e é dita no painel.
  {
    const usados = new Set()
    for (let s = 1; s <= 120; s++) m.gerarCarta(rico(72), { tipo: 'convite_50', semente: s, hoje: HOJE, site: SITE }).personalizacao.forEach(p => usados.add(p))
    for (const p of ['melhor área', 'posição no ranking', 'horário de estudo']) assert.ok(usados.has(p), `convite_50 nunca usou ${p}`)
  }

  // 4. Fatos: limites de significância.
  const f = m.fatosDe(rico(72))
  assert.equal(f.melhorArea.slug, 'tumores')
  assert.equal(f.maisEstudada.slug, 'mao')
  assert.equal(f.horario, 'noite')
  assert.equal(f.ranking, 23)
  assert.equal(f.prova, 'teot')
  assert.deepEqual(m.fatosDe({ respondidas: 40, posicaoRanking: 5, sequencia: 2, horas: [{ hora: 22, n: 10 }], areas: [{ slug: 'mao', total: 10, certas: 10 }] }), {}, 'fatos com amostra pequena')
  assert.equal(m.acertoCitavel({ respondidas: 29, acertos: 20, erros: 9 }), null)
  assert.equal(m.acertoCitavel({ respondidas: 30, acertos: 21, erros: 9 }), 70)

  // 5. Escolha automática do tipo.
  const escolha = (p, ant = []) => m.escolherTipo({ diasConta: 60, diasParado: 1, ...p }, ant, HOJE).tipo
  assert.equal(escolha({ respondidas: 0, diasParado: null }), 'nunca_comecou')
  assert.equal(escolha({ respondidas: 300, acertos: 200, erros: 100, assinante: true }), 'obrigado_assinatura')
  assert.equal(escolha({ respondidas: 300, acertos: 200, erros: 100, assinante: true }, obrigadoJa), 'ativo')
  assert.equal(escolha({ respondidas: 300, diasParado: 15 }), 'sumiu')
  assert.equal(escolha({ respondidas: 12, diasParado: 5 }), 'comecou_parou')
  assert.equal(escolha({ respondidas: 12, diasConta: 2 }), 'boas_vindas')
  assert.equal(escolha({ respondidas: 12 }), 'comecando')
  assert.equal(escolha({ respondidas: 30, acertos: 20, erros: 10 }), 'convite_20')
  assert.equal(escolha({ respondidas: 80, acertos: 60, erros: 20 }), 'convite_50')
  const conviteRecente = [{ tipo: 'carta', modelo: 'convite_50', em: '2026-10-05T12:00:00Z', status: 'enviado' }]
  assert.equal(escolha({ respondidas: 80, acertos: 60, erros: 20 }, conviteRecente), 'ativo', 'convite repetido em 30 dias')
  assert.equal(escolha({ respondidas: 80, acertos: 60, erros: 20 }, [{ ...conviteRecente[0], status: 'falhou' }]), 'convite_50', 'falha não conta como envio')
  assert.equal(escolha({ respondidas: 105, acertos: 60, erros: 45, assinante: true }, obrigadoJa), 'marco')
  assert.equal(escolha({ respondidas: 105, acertos: 60, erros: 45, assinante: true }, [...obrigadoJa, { tipo: 'marco', marco: 100, em: '2026-10-14T12:00:00Z' }]), 'ativo')
  assert.equal(m.escolherTipo({ respondidas: 300, acertos: 200, erros: 100, assinante: true, provas: ['teot'], diasParado: 1 }, obrigadoJa, new Date('2026-11-20T12:00:00-03:00')).tipo, 'reta_final')

  // 6. Não repete a versão que a pessoa já recebeu (enquanto houver outra).
  for (let s = 1; s <= 40; s++) {
    const total = m.versoesDe('convite_20', null).length
    const ja = Array.from({ length: total - 1 }, (_, i) => ({ tipo: 'carta', modelo: 'convite_20', versao: `convite_20#v${i + 1}`, em: '2026-08-01T12:00:00Z', status: 'enviado' }))
    const carta = m.gerarCarta(rico(72), { tipo: 'convite_20', semente: s, anteriores: ja, hoje: HOJE, site: SITE })
    assert.equal(carta.versao, `convite_20#v${total}`, 'repetiu versão já recebida')
    assert.equal(carta.versoes.novas, 1)
  }

  // 7. Assunto: nenhum assunto de nenhuma versão tem palavra de promoção.
  for (const p of m.PALAVRAS_PROMOCAO) assert.ok(m.problemaNoAssunto(`Ana, ${p} hoje`), `não barrou "${p}"`)
  assert.ok(m.problemaNoAssunto('VEJA ISTO AGORA'))
  assert.equal(m.problemaNoAssunto('Ana, rumo ao TEOT'), null)

  // 8. Renderização: assinatura fixa, sem assinatura duplicada, descadastro discreto só quando pedido.
  {
    const e = m.renderizarCarta({ assunto: 'Oi', corpo: 'Oi, Ana,\n\nTexto com link ortoquestoes.com.br/#/treinar.\n\nUm abraço,\nTales' })
    assert.equal((e.texto.match(/Um abraço/g) ?? []).length, 1, 'assinatura duplicada')
    assert.ok(e.html.includes('href="https://ortoquestoes.com.br/#/treinar"'))
    assert.ok(!e.html.includes('clicar aqui'))
    const lote = m.renderizarCarta({ assunto: 'Oi', corpo: 'Oi,\n\nTexto.', descadastro: 'https://ortoquestoes.com.br/#/emails?u=1&t=2&tipo=cartas' })
    assert.ok(lote.html.includes('é só clicar aqui') && lote.texto.includes('#/emails?u=1&t=2&tipo=cartas'))
    assert.ok(m.problemaGrave('Oi {nome}') && m.problemaGrave('undefined') && !m.problemaGrave('Oi, Ana'))
  }

  // 9. Automáticos em forma de carta.
  const desc = 'https://ortoquestoes.com.br/#/emails?u=x&t=y'
  const auto = m.auto
  const marco = auto.emailMarco({ nome: 'Ana Paula', marco: auto.MARCOS[3], respondidas: 510, acertos: 370, erros: 130, respondidas7d: 80, site: SITE, linkDescadastro: desc })
  assert.ok(/500/.test(marco.assunto + marco.texto) && marco.texto.includes('Tales, do Orto Questões') && marco.texto.includes(desc), 'marco')
  assert.ok(marco.versao.startsWith('marco#'))
  for (const campanha of ['nunca', 'tres_dias', 'sete_dias', 'renovacao_pix', 'renovacao_pix_hoje']) {
    for (const respondidas of [0, 1, 230]) {
      if (campanha !== 'nunca' && respondidas === 0 && !campanha.startsWith('renovacao')) continue
      const e = auto.emailLembrete({ campanha, nome: respondidas ? 'Bruno' : null, respondidas, diasFora: campanha === 'sete_dias' ? 12 : 4, site: SITE, linkDescadastro: desc,
        diasRestantes: campanha === 'renovacao_pix_hoje' ? 0 : 3, fimEm: '2026-10-18T12:00:00Z', plano: 'semestral', acertos: Math.round(respondidas * 0.7), respondidas7d: 40, referencia: 'x' })
      assert.ok(!PROIBIDO.test(e.texto) && !PROIBIDO.test(e.assunto), `${campanha} ${respondidas}: ${e.texto}`)
      assert.ok(!PROMO.test(e.assunto), `${campanha}: ${e.assunto}`)
      assert.ok(e.texto.includes('Um abraço,\nTales, do Orto Questões') && e.texto.includes(desc), campanha)
      if (campanha === 'renovacao_pix') assert.ok(/18\/10|3 dias/.test(e.texto + e.assunto), 'data do Pix')
    }
  }
  const relBase = { nome: 'Ana', mes: '2026-10-q1', respostas: 84, certas: 60, erradas: 24, dias_ativos: 6, respostas_anterior: 50, certas_anterior: 30, erradas_anterior: 20, total_acumulado: 900,
    temas: [{ tema: 'joelho', certas: 40, total: 50, certas_ant: 25, total_ant: 40 }, { tema: 'tumores', certas: 8, total: 20, certas_ant: 12, total_ant: 20 }], simulado: null, site: SITE, linkDescadastro: desc }
  for (const d of [relBase, { ...relBase, mes: '2026-09', respostas: 0, certas: 0, erradas: 0, dias_ativos: 0 }, { ...relBase, respostas: 1, certas: 1, erradas: 0, dias_ativos: 1, total_acumulado: 1 }]) {
    for (let s = 1; s <= 20; s++) {
      const e = auto.emailRelatorio({ ...d, semente: s })
      assert.ok(!PROIBIDO.test(e.texto) && !PROIBIDO.test(e.assunto), `relatório: ${e.assunto}\n${e.texto}`)
      assert.ok(e.texto.includes('Tales, do Orto Questões'))
      if (d.respostas === 0) assert.ok(!/\d+ questões em/.test(e.texto), 'relatório parado com números zerados')
    }
  }
  const relato = auto.emailRelatoResolvido({ nome: 'Ana', idQuestao: 'trauma-0044', relato: 'Gabarito trocado', nota: null, site: SITE })
  assert.ok(relato.texto.includes('Trauma adulto, questão 44') && relato.texto.endsWith('Tales, do Orto Questões'))
  const carta = auto.emailCarta({ nome: 'Ana', marco: auto.MARCOS[0], respondidas: 0, acertos: 0, erros: 0, respondidas7d: 0, site: SITE, linkDescadastro: desc })
  assert.ok(!PROIBIDO.test(carta.texto), 'carta antiga com zero')

  console.log(`Cartas: ${m.FAIXAS.length} faixas e ${m.TIPOS_MANUAIS.length} situações, sem "0 questões"/undefined/null/NaN, assinadas, sem promoção no assunto e com variedade; automáticos em forma de carta.`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
