// Cartas do Tales (15/10/2026; reescritas em 17/10/2026 conforme docs/emails/PLANO.md): o motor
// de e-mails pessoais e os automáticos em forma de carta. Confere, em milhares de sorteios de todas
// as situações, faixas e fatos: a lista proibida de docs/emails/TOM.md; nenhuma porcentagem abaixo
// de 50%; nenhum número de questões abaixo de 10; 6 a 12 linhas de corpo; exatamente um P.S.; no
// máximo um link; nada de "undefined/null/NaN/0 questões"; assuntos com até 55 caracteres e com o
// nome; o teto de cadência (48 h / 3 em 14 dias); e os seis automáticos novos.
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
  const auto = m.auto
  const HOJE = new Date('2026-10-15T15:00:00-03:00')
  const SITE = 'https://ortoquestoes.com.br/'
  const PROIBIDO = /\bundefined\b|\bnull\b|\bNaN\b|\[object|(^|[^\d.,])0 (questões|questão|dias|dia)\b|\{[a-z]+\}|R\$/
  const PROMO = /grátis|gratis|gratuito|oferta|desconto|aproveite|imperd[ií]vel|promo[cç][aã]o|urgente/i
  /** Regra dos 10: nenhum número de questões abaixo de 10 (os pequenos vão por extenso). */
  const NUMERO_PEQUENO = /(^|[^\d.,])[0-9] (questões|questão)\b/
  const PORCENTAGEM = /\d+\s?%|por cento/i
  // Tom (docs/emails/TOM.md, retorno do dono em 15/10/2026 e plano de 17/10/2026).
  const TOM_PROIBIDO = [
    /vou ser (direto|direta|sincer[oa])/i, /sem rodeios/i, /\bfranc[oa]\b|franqueza/i, /olha só/i, /infelizmente/i, /\bsó que\b/i,
    /\bsincer/i, /\bvocê (ainda )?não\b/i, /\bchut(e|es|ar|ou|ando)\b/i, /alternativa qualquer|marcando/i,
    /err(ou|a|am|ando|aram) muito|maior parte das respostas|errad[ao]s? demais/i, /lá embaixo|acerto (ainda )?(está )?baixo|baixo demais|n[aã]o decolou/i,
    /desanim/i, /cobran[cç]a|\bculpa\b|\bsumiu\b/i, /gr[aá]tis|gratuit|oferta|desconto|aproveite|imperd[ií]vel|promo[cç]/i,
    /[uú]ltima chance|urgente|\bcorra\b|não perca|só hoje|antes que acabe|últimas vagas|vagas limitadas/i,
    /% de acerto parece|seria uma pena|que pena/i, /bem-vind[oa]/i, /R\$/, /\bpre[çc]o\b/i,
    // Sem gênero presumido.
    /\bobrigad[ao] por (ter )?assinad[ao]/i, /(?<!cabeça )(?<!mente )\b(des)?cansad[ao]\b/i, /\bpreparad[ao]\b/i, /\bmesmo cansad/i,
  ]
  const tomOk = (texto, contexto) => { for (const re of TOM_PROIBIDO) assert.ok(!re.test(texto), `${contexto}: expressão proibida (${re}):\n${texto}`) }

  let conferidas = 0
  /** Confere uma carta pronta (do motor) e devolve o e-mail renderizado. */
  function conferir(carta, contexto, perfil) {
    conferidas++
    const e = m.renderizarCarta({ assunto: carta.assunto, corpo: carta.corpo })
    const tudo = `${carta.assunto}\n${carta.corpo}`
    assert.ok(!PROIBIDO.test(carta.corpo), `${contexto}: texto proibido em\n${carta.corpo}`)
    assert.ok(!PROIBIDO.test(carta.assunto), `${contexto}: assunto proibido: ${carta.assunto}`)
    assert.ok(!NUMERO_PEQUENO.test(tudo), `${contexto}: número de questões abaixo de 10:\n${tudo}`)
    assert.ok(!PROMO.test(carta.assunto), `${contexto}: assunto com promoção: ${carta.assunto}`)
    assert.ok(carta.assunto.length <= 55, `${contexto}: assunto com mais de 55 caracteres (${carta.assunto.length}): ${carta.assunto}`)
    assert.ok(!carta.assunto.includes('!') && !/\p{Extended_Pictographic}/u.test(carta.assunto), `${contexto}: assunto gritado ou com emoji: ${carta.assunto}`)
    assert.equal(m.problemaNoAssunto(carta.assunto), null, `${contexto}: ${carta.assunto}`)
    if (perfil && m.primeiroNome(perfil.nome)) assert.ok(carta.assunto.includes(m.primeiroNome(perfil.nome)), `${contexto}: assunto sem o nome: ${carta.assunto}`)
    assert.ok(m.contarLinks(carta.corpo) <= 1, `${contexto}: mais de um link\n${carta.corpo}`)
    const linhas = m.contarLinhas(carta.corpo)
    assert.ok(linhas >= 6 && linhas <= 12, `${contexto}: ${linhas} linhas (a espinha pede de 6 a 12)\n${carta.corpo}`)
    assert.equal(m.contarPS(carta.corpo), 1, `${contexto}: a carta precisa de exatamente um P.S.\n${carta.corpo}`)
    assert.ok(/\n\nP\.S\.:[^\n]+$/.test(carta.corpo), `${contexto}: o P.S. tem que ser a última linha\n${carta.corpo}`)
    assert.ok(!/1 questões|1 dias\b/.test(carta.corpo), `${contexto}: plural errado`)
    assert.ok(e.texto.includes('Um abraço,\nTales, do Orto Questões'), `${contexto}: assinatura no texto`)
    assert.ok(e.html.includes('Um abraço,<br>Tales, do Orto Questões'), `${contexto}: assinatura no HTML`)
    assert.ok(e.texto.indexOf('Tales, do Orto Questões') < e.texto.indexOf('P.S.:'), `${contexto}: o P.S. vem depois da assinatura`)
    assert.ok(!/<img|<table|background:#146b61|<button/i.test(e.html), `${contexto}: HTML com cara de propaganda`)
    assert.ok(!/R\$\s?\d/.test(e.texto), `${contexto}: preço`)
    tomOk(tudo, contexto)
    // Acerto só com 30 questões e 50% ou mais; nunca na mesma carta em que a área a melhorar entra.
    if (perfil) {
      const acerto = m.acertoCitavel(perfil)
      // O resumo do período fala do acerto do período (regra própria, conferida mais abaixo).
      if (carta.tipo !== 'relatorio' && (acerto === null || acerto < 50)) assert.ok(!PORCENTAGEM.test(tudo), `${contexto}: citou porcentagem com acerto ${acerto}:\n${tudo}`)
      if (carta.personalizacao.includes('área a melhorar')) assert.ok(!carta.personalizacao.includes('acerto') && !/\d+% de acerto/.test(carta.corpo), `${contexto}: acerto e área a melhorar na mesma carta\n${carta.corpo}`)
      assert.ok(carta.personalizacao.filter((p) => p !== 'acerto').length <= 3, `${contexto}: mais de 3 observações pessoais (${carta.personalizacao.join(', ')})`)
    }
    return e
  }

  const rico = (acertoPct, extra = {}) => ({
    nome: 'ana paula', respondidas: 400, acertos: acertoPct * 4, erros: (100 - acertoPct) * 4, semana: 60, diasParado: 0, diasConta: 90,
    situacao: 'residente', ano: 'r3', provas: ['teot'],
    areas: [{ slug: 'mao', total: 160, certas: Math.round(1.6 * Math.min(100, acertoPct + 2)) }, { slug: 'tumores', total: 40, certas: Math.round(0.4 * Math.min(100, acertoPct + 15)) }, { slug: 'pe-tornozelo', total: 40, certas: Math.round(0.4 * Math.max(0, acertoPct - 15)) }],
    horas: [{ hora: 21, n: 50 }, { hora: 22, n: 40 }, { hora: 9, n: 10 }], posicaoRanking: 23, sequencia: 6, flashcards: 80, viuPlanos: 2, limiteGratisLigado: true,
    servico: 'Hospital das Clínicas', cidade: 'Campinas', resumosLidos: { total: 3, titulos: ['Fraturas do rádio distal'] }, diasParaProva: 87, provaCronograma: 'TEOT', nascimento: '1995-10-16', ...extra,
  })
  const pobre = (respondidas, extra = {}) => ({ nome: null, respondidas, acertos: Math.round(respondidas * 0.6), erros: respondidas - Math.round(respondidas * 0.6), diasConta: 30, diasParado: respondidas ? 1 : null, ...extra })
  const nomeLongo = (p) => ({ ...p, nome: 'Maximiliana Augusta de Oliveira' })
  const obrigadoJa = [{ tipo: 'carta', modelo: 'obrigado_assinatura', versao: 'obrigado_assinatura#v1', em: '2026-09-01T12:00:00Z', status: 'enviado' }]
  const EXTRAS = {
    pix: { diasRestantes: 3, fimEm: '2026-10-18T12:00:00Z', plano: 'semestral' },
    pagamento: { plano: 'semestral', inicioEm: '2026-10-15T12:00:00Z', fimEm: '2027-04-15T12:00:00Z', meio: 'pix', renovacao: false },
    encerramento: { reembolso: false, fimEm: '2026-11-15T12:00:00Z' },
    relatorio: { rotulo: 'de 1 a 15 de outubro', em: 'de 1 a 15 de outubro', frase: 'Entre 1 e 15 de outubro', quinzena: true, respostas: 84, certas: 60, erradas: 24, diasAtivos: 6, respostasAnterior: 50, acertoAnterior: 60, totalAcumulado: 900, subiram: [{ slug: 'joelho', antes: 62, agora: 80 }], cairam: [], maisFraco: { slug: 'tumores', acerto: 40 }, simulado: null },
    ignorarCadencia: true,
  }
  const gerar = (perfil, op) => m.gerarCarta(perfil, { hoje: HOJE, site: SITE, ...EXTRAS, ...op })
  const TODOS = Object.keys(m.TIPOS)

  // 1. Faixas de acerto: escolha automática, faixa certa, variedade e todas as versões aparecem.
  const meio = { '0-10': 5, '10-20': 15, '20-30': 25, '30-40': 35, '40-60': 50, '60-70': 65, '70-80': 75, '80-90': 85, '90-100': 95 }
  for (const faixa of m.FAIXAS) {
    assert.equal(m.faixaDe(meio[faixa]), faixa)
    const textos = new Set(), versoes = new Set(), assuntos = new Set()
    for (let semente = 1; semente <= 250; semente++) {
      const perfil = semente % 2 ? rico(meio[faixa], { assinante: true }) : pobre(400, { acertos: meio[faixa] * 4, erros: (100 - meio[faixa]) * 4, assinante: true })
      const carta = gerar(perfil, { semente, anteriores: obrigadoJa })
      assert.equal(carta.tipo, 'ativo', `faixa ${faixa}: escolheu ${carta.tipo}`)
      assert.equal(carta.faixa, faixa)
      assert.equal(carta.modelo, `ativo:${faixa}`)
      conferir(carta, `ativo ${faixa} #${semente}`, perfil)
      textos.add(carta.corpo); versoes.add(carta.versao); assuntos.add(carta.assunto)
    }
    const total = m.versoesDe('ativo', faixa).length
    assert.ok(total >= 5 && total <= 7, `faixa ${faixa}: ${total} versões (o plano pede de 5 a 7)`)
    assert.equal(versoes.size, total, `faixa ${faixa}: nem todas as versões saíram`)
    assert.ok(textos.size >= 150, `faixa ${faixa}: pouca variedade (${textos.size} textos distintos em 250)`)
    assert.ok(assuntos.size >= 6, `faixa ${faixa}: poucos assuntos (${assuntos.size})`)
  }

  // 2. Todas as situações (manuais, automáticas e as seis novas), com perfis ricos e pobres, nomes longos e poucas questões.
  const perfisBase = [rico(72), rico(12), nomeLongo(rico(55)), pobre(45), pobre(7, { nome: 'Bruno' }), pobre(1), pobre(0, { diasConta: 4 }), pobre(0, { diasConta: 2, nome: 'Ana', provas: ['teot'], situacao: 'residente', ano: 'r3' }), pobre(400, { diasParado: 20, nome: 'Otávio' }), rico(80, { diasParado: 25 })]
  for (const tipo of TODOS) {
    const textos = new Set(), versoes = new Set()
    for (let semente = 1; semente <= 60; semente++) {
      for (const perfil of perfisBase) {
        if (!m.tipoCombina(tipo, perfil)) { assert.throws(() => gerar(perfil, { tipo, semente }), /tipo_nao_combina/); continue }
        const op = { tipo, semente, marco: tipo === 'marco' ? (perfil.respondidas >= 500 || semente % 2 ? 500 : 250) : undefined }
        // O resumo também sai para períodos curtos (menos de 30 questões) e para quem renovou.
        if (tipo === 'relatorio' && semente % 3 === 0) op.relatorio = { ...EXTRAS.relatorio, respostas: 12, certas: 8, erradas: 4, diasAtivos: 2 }
        if (tipo === 'pagamento_aprovado' && semente % 2 === 0) op.pagamento = { ...EXTRAS.pagamento, renovacao: true, meio: 'cartao' }
        const carta = gerar(perfil, op)
        assert.equal(carta.tipo, tipo)
        conferir(carta, `${tipo} #${semente} (${perfil.respondidas} questões, ${perfil.nome ?? 'sem nome'})`, perfil)
        textos.add(carta.corpo); versoes.add(carta.versao)
      }
    }
    const total = m.versoesDe(tipo, tipo === 'ativo' ? '70-80' : null).length
    assert.ok(total >= 5 && total <= 7, `${tipo}: ${total} versões (o plano pede de 5 a 7)`)
    if (tipo !== 'ativo') assert.equal(versoes.size, total, `${tipo}: nem todas as versões saíram (${[...versoes].join(', ')})`)
    assert.ok(textos.size >= 100, `${tipo}: pouca variedade (${textos.size})`)
  }

  // 3. Regra dos 10: quem fez menos de 10 questões nunca vê o número; `questoes` devolve "os primeiros passos".
  assert.equal(m.questoes(7), 'os primeiros passos')
  assert.equal(m.questoes(10), '10 questões')
  assert.equal(m.questoes(1234), '1.234 questões')
  for (const r of [1, 2, 5, 9]) for (const tipo of TODOS) {
    const perfil = pobre(r, { nome: 'Clara', diasParado: 4, diasConta: 2 })
    if (!m.tipoCombina(tipo, perfil)) continue
    for (let s = 1; s <= 15; s++) {
      const c = gerar(perfil, { tipo, semente: s })
      assert.ok(!new RegExp(`\\b${r} quest`).test(c.corpo + c.assunto), `${tipo}: citou ${r} questões:\n${c.corpo}`)
    }
  }
  assert.equal(m.problemaNoTexto('Você fez 7 questões.'), 'número de questões abaixo de 10')
  assert.equal(m.problemaNoTexto('Você fez 10 questões.'), null)

  // 4. Frases condicionais somem sem dado: ninguém fala de ranking, horário, área, prova, sequência, serviço, cidade, resumos ou aniversário sem saber.
  const SEM_DADO = [/ranking geral|º no ranking|posição no ranking/i, /à noite|madrugada|de manhã cedo|hora do almoço|à tarde/, /mão e punho|tumores|pé e tornozelo|ortopedia pediátrica/, /no seu horizonte|seu foco é o TEOT|está no seu radar/, /seguidos/, /sem limite/, /\bR[123]\b/, /Hospital|seu serviço/, /Campinas/, /resumos? da Biblioteca|leu o resumo/, /aniversário/, /87 dias/]
  for (const tipo of TODOS) {
    if (tipo === 'reta_final' || tipo === 'nunca_comecou' || tipo === 'cronograma_pronto' || tipo === 'relatorio') continue // o resumo fala dos temas do período
    for (let semente = 1; semente <= 50; semente++) {
      const carta = gerar(pobre(120, { nome: 'Lia' }), { tipo, semente, marco: 100 })
      for (const re of SEM_DADO) assert.ok(!re.test(carta.corpo), `${tipo} #${semente}: frase sem dado (${re}):\n${carta.corpo}`)
      assert.deepEqual(carta.personalizacao.filter((p) => p !== 'acerto'), [], `${tipo}: personalização sem dado`)
    }
  }
  // Com dado, a personalização aparece e é dita no painel, inclusive os fatos novos.
  {
    const usados = new Set()
    for (const tipo of ['convite_50', 'ativo', 'sumiu', 'marco']) for (let s = 1; s <= 150; s++) gerar(rico(72, { diasParado: tipo === 'sumiu' ? 20 : 0 }), { tipo, semente: s, marco: 250 }).personalizacao.forEach((p) => usados.add(p))
    for (const p of ['melhor área', 'posição no ranking', 'horário de estudo', 'dias para a prova', 'resumos lidos', 'serviço', 'aniversário']) assert.ok(usados.has(p), `nunca usou "${p}" (${[...usados].join(', ')})`)
  }

  // 5. Fatos: limites de significância, inclusive os novos.
  const f = m.fatosDe(rico(72), HOJE)
  assert.equal(f.melhorArea.slug, 'tumores')
  assert.equal(f.maisEstudada.slug, 'mao')
  assert.equal(f.horario, 'noite')
  assert.equal(f.ranking, 23)
  assert.equal(f.prova, 'teot')
  assert.deepEqual(f.cronograma, { dias: 87, prova: 'TEOT' })
  assert.deepEqual(f.resumos, { total: 3, titulo: 'Fraturas do rádio distal' })
  assert.deepEqual(f.servico, { nome: 'Hospital das Clínicas', de: 'do Hospital das Clínicas' })
  assert.equal(f.cidade, 'Campinas')
  assert.equal(f.aniversario, 'perto')
  assert.equal(m.fatosDe(rico(72, { nascimento: '1990-10-15' }), HOJE).aniversario, 'hoje')
  assert.equal(m.fatosDe(rico(72, { nascimento: '1990-10-25' }), HOJE).aniversario, undefined)
  assert.equal(m.servicoComArtigo('Santa Casa de Misericórdia'), 'da Santa Casa de Misericórdia')
  assert.equal(m.servicoComArtigo('Ortotrauma Vale'), 'do seu serviço', 'artigo ambíguo vira "do seu serviço"')
  assert.equal(f.areaFraca.slug, 'pe-tornozelo', 'área a melhorar com 40 questões')
  assert.equal(m.fatosDe(rico(72, { areas: [{ slug: 'mao', total: 160, certas: 120 }, { slug: 'pe-tornozelo', total: 39, certas: 10 }] })).areaFraca, undefined, 'área a melhorar só com 40 questões na área')
  assert.deepEqual(m.fatosDe({ respondidas: 40, posicaoRanking: 5, sequencia: 2, horas: [{ hora: 22, n: 10 }], areas: [{ slug: 'mao', total: 10, certas: 10 }], servico: 'HC', resumosLidos: { total: 0 }, diasParaProva: 0 }), {}, 'fatos com amostra pequena')
  assert.equal(m.acertoCitavel({ respondidas: 29, acertos: 20, erros: 9 }), null)
  assert.equal(m.acertoCitavel({ respondidas: 30, acertos: 21, erros: 9 }), 70)
  // A área a melhorar nunca leva número e nunca sai junto do acerto.
  for (let s = 1; s <= 120; s++) {
    const c = gerar(rico(72), { tipo: 'ativo', faixa: '70-80', semente: s })
    if (c.personalizacao.includes('área a melhorar')) assert.ok(!/pé e tornozelo[^.]*\d+%|\d+%[^.]*pé e tornozelo/.test(c.corpo) && !/\d+% de acerto/.test(c.corpo), `área a melhorar com número:\n${c.corpo}`)
  }

  // 6. Escolha automática do tipo (marcos 100, 250, 500, 1.000, 2.000; cadência no resultado).
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
  assert.equal(escolha({ respondidas: 255, acertos: 160, erros: 95, assinante: true }, obrigadoJa), 'marco', 'marco de 250')
  assert.equal(escolha({ respondidas: 2010, acertos: 1600, erros: 410, assinante: true }, obrigadoJa), 'marco', 'marco de 2.000')
  assert.equal(escolha({ respondidas: 55, acertos: 40, erros: 15, assinante: true }, obrigadoJa), 'ativo', '50 não é marco')
  assert.equal(escolha({ respondidas: 105, acertos: 60, erros: 45, assinante: true }, [...obrigadoJa, { tipo: 'marco', marco: 100, em: '2026-10-01T12:00:00Z' }]), 'ativo')
  assert.equal(m.escolherTipo({ respondidas: 300, acertos: 200, erros: 100, assinante: true, provas: ['teot'], diasParado: 1 }, obrigadoJa, new Date('2026-11-20T12:00:00-03:00')).tipo, 'reta_final')
  assert.equal(m.escolherTipo({ respondidas: 300, acertos: 200, erros: 100, assinante: true, diasParado: 1, diasParaProva: 40 }, obrigadoJa, HOJE).tipo, 'reta_final', 'reta final pela prova do cronograma')
  assert.deepEqual(m.MARCOS_CARTA, [100, 250, 500, 1000, 2000])

  // 7. Teto de cadência: 1 e-mail a cada 48 h e 3 a cada 14 dias; transacionais fora.
  const em = (horasAtras) => new Date(HOJE.getTime() - horasAtras * 3600_000).toISOString()
  const envio = (horasAtras, extra = {}) => ({ tipo: 'carta', modelo: 'ativo:70-80', versao: 'ativo:70-80#v1', em: em(horasAtras), status: 'enviado', ...extra })
  assert.equal(m.cadenciaBloqueia([], HOJE), null)
  assert.match(m.cadenciaBloqueia([envio(10)], HOJE), /48 horas/)
  assert.equal(m.cadenciaBloqueia([envio(49)], HOJE), null)
  assert.equal(m.cadenciaBloqueia([envio(10, { status: 'falhou' })], HOJE), null, 'falha não conta')
  assert.equal(m.cadenciaBloqueia([envio(10, { tipo: 'relato_resolvido', modelo: null })], HOJE), null, 'relato resolvido não conta')
  assert.equal(m.cadenciaBloqueia([envio(10, { modelo: 'pix_hoje' })], HOJE), null, 'Pix termina hoje não conta')
  assert.equal(m.cadenciaBloqueia([envio(10, { modelo: 'pagamento_aprovado' })], HOJE), null, 'recibo não conta')
  assert.match(m.cadenciaBloqueia([envio(60), envio(24 * 5), envio(24 * 12)], HOJE), /3 e-mails nos últimos 14 dias/)
  assert.equal(m.cadenciaBloqueia([envio(60), envio(24 * 5), envio(24 * 15)], HOJE), null)
  assert.equal(m.cadenciaBloqueia([envio(10)], HOJE, 'pix_hoje'), null, 'tipo transacional nunca é bloqueado')
  assert.equal(m.cadenciaBloqueia([envio(10)], HOJE, 'pagamento_aprovado'), null)
  assert.equal(m.cadenciaBloqueia([envio(10)], HOJE, 'obrigado_tempo'), null)
  assert.match(m.escolherTipo(rico(72), [envio(10)], HOJE).bloqueio, /48 horas/)
  assert.equal(m.escolherTipo(rico(72), [], HOJE).bloqueio, null)
  assert.throws(() => m.gerarCarta(rico(72), { tipo: 'ativo', semente: 1, hoje: HOJE, anteriores: [envio(10)] }), /cadencia_bloqueada: Cadência: recebeu um e-mail há menos de 48 horas/)
  assert.throws(() => m.gerarCarta(rico(72), { tipo: 'convite_50', semente: 1, hoje: HOJE, anteriores: [envio(60), envio(24 * 5), envio(24 * 12)] }), /cadencia_bloqueada/)
  assert.ok(m.gerarCarta(rico(72), { tipo: 'ativo', semente: 1, hoje: HOJE, anteriores: [envio(10)], ignorarCadencia: true }).corpo)
  assert.ok(m.gerarCarta(rico(72), { tipo: 'pix_hoje', semente: 1, hoje: HOJE, anteriores: [envio(10)], pix: EXTRAS.pix }).corpo, 'transacional passa')
  assert.ok(m.gerarCarta(rico(72), { tipo: 'ativo', semente: 1, hoje: HOJE, anteriores: [envio(49)] }).corpo)
  assert.equal(auto.automaticoBloqueado('primeiras_10', [envio(10)], HOJE) !== null, true)
  assert.equal(auto.automaticoBloqueado('pagamento_aprovado', [envio(10)], HOJE), null)

  // 8. Não repete a versão que a pessoa já recebeu (enquanto houver outra).
  for (let s = 1; s <= 40; s++) {
    const total = m.versoesDe('convite_20', null).length
    const ja = Array.from({ length: total - 1 }, (_, i) => ({ tipo: 'carta', modelo: 'convite_20', versao: `convite_20#v${i + 1}`, em: '2026-08-01T12:00:00Z', status: 'enviado' }))
    const carta = gerar(rico(72), { tipo: 'convite_20', semente: s, anteriores: ja })
    assert.equal(carta.versao, `convite_20#v${total}`, 'repetiu versão já recebida')
    assert.equal(carta.versoes.novas, 1)
  }

  // 9. Assunto: nenhum assunto de nenhuma versão tem palavra de promoção; 55 é o teto.
  for (const p of m.PALAVRAS_PROMOCAO) assert.ok(m.problemaNoAssunto(`Ana, ${p} hoje`), `não barrou "${p}"`)
  assert.ok(m.problemaNoAssunto('VEJA ISTO AGORA'))
  assert.equal(m.problemaNoAssunto('Ana, rumo ao TEOT'), null)
  assert.equal(m.problemaNoAssunto('A'.repeat(56)), 'assunto longo')

  // 10. Renderização: assinatura fixa, P.S. depois da assinatura, sem assinatura duplicada, descadastro discreto só quando pedido.
  {
    const e = m.renderizarCarta({ assunto: 'Oi', corpo: 'Oi, Ana,\n\nTexto com link ortoquestoes.com.br/#/treinar.\n\nP.S.: cuida do sono.\n\nUm abraço,\nTales' })
    assert.equal((e.texto.match(/Um abraço/g) ?? []).length, 1, 'assinatura duplicada')
    assert.ok(e.html.includes('href="https://ortoquestoes.com.br/#/treinar"'))
    assert.ok(e.texto.endsWith('Tales, do Orto Questões\n\nP.S.: cuida do sono.'), 'P.S. depois da assinatura no texto')
    assert.ok(e.html.indexOf('Tales, do Orto Questões') < e.html.indexOf('P.S.: cuida do sono.'), 'P.S. depois da assinatura no HTML')
    assert.ok(!e.html.includes('clicar aqui'))
    const lote = m.renderizarCarta({ assunto: 'Oi', corpo: 'Oi,\n\nTexto.', descadastro: 'https://ortoquestoes.com.br/#/emails?u=1&t=2&tipo=cartas' })
    assert.ok(lote.html.includes('é só clicar aqui') && lote.texto.includes('#/emails?u=1&t=2&tipo=cartas'))
    assert.ok(m.problemaGrave('Oi {nome}') && m.problemaGrave('undefined') && !m.problemaGrave('Oi, Ana'))
  }

  // 11. Automáticos em forma de carta: marco, lembretes (a pausa cita a área e a Revisão), Pix, relatório, relato resolvido.
  const desc = 'https://ortoquestoes.com.br/#/emails?u=x&t=y'
  const conferirAuto = (e, contexto) => {
    assert.ok(!PROIBIDO.test(e.texto) && !PROIBIDO.test(e.assunto), `${contexto}: ${e.assunto}\n${e.texto}`)
    assert.ok(!NUMERO_PEQUENO.test(e.texto + e.assunto), `${contexto}: número pequeno de questões\n${e.texto}`)
    assert.ok(!PROMO.test(e.assunto) && e.assunto.length <= 55, `${contexto}: ${e.assunto}`)
    assert.ok(e.texto.includes('Um abraço,\nTales, do Orto Questões'), contexto)
    assert.equal((e.texto.match(/P\.S\.:/g) ?? []).length, 1, `${contexto}: um P.S.\n${e.texto}`)
    tomOk(`${e.assunto}\n${e.texto}`, contexto)
  }
  const marco = auto.emailMarco({ nome: 'Ana Paula', marco: auto.MARCOS[3], respondidas: 510, acertos: 370, erros: 130, respondidas7d: 80, site: SITE, linkDescadastro: desc, hoje: HOJE })
  assert.ok(/500/.test(marco.assunto + marco.texto) && marco.texto.includes(desc), 'marco')
  assert.ok(marco.versao.startsWith('marco#'))
  conferirAuto(marco, 'marco 500')
  assert.equal(auto.marcoComCarta(60), null, '50 não ganha carta')
  assert.equal(auto.marcoComCarta(260).minimo, 250)
  assert.equal(auto.marcoComCarta(3500).minimo, 2000)
  const perfilPausa = { ...rico(70), areas: [{ slug: 'joelho', total: 90, certas: 70 }, { slug: 'coluna', total: 20, certas: 12 }], diasParado: 4 }
  let citouArea = 0
  for (let s = 1; s <= 30; s++) {
    const e = auto.emailLembrete({ campanha: 'tres_dias', nome: 'Bruno', respondidas: 230, diasFora: 4, site: SITE, linkDescadastro: desc, perfil: perfilPausa, semente: s, hoje: HOJE })
    conferirAuto(e, `pausa #${s}`)
    assert.ok(e.texto.includes('Revisão'), 'a pausa cita a Revisão')
    if (e.texto.includes('joelho')) citouArea++
  }
  assert.ok(citouArea >= 20, `a pausa quase não citou a área que a pessoa estava estudando (${citouArea} de 30)`)
  for (const campanha of ['nunca', 'tres_dias', 'sete_dias', 'renovacao_pix', 'renovacao_pix_hoje']) {
    for (const respondidas of [0, 1, 7, 230]) {
      if (campanha !== 'nunca' && respondidas === 0 && !campanha.startsWith('renovacao')) continue
      for (let s = 1; s <= 8; s++) {
        const e = auto.emailLembrete({ campanha, nome: respondidas ? 'Bruno' : null, respondidas, diasFora: campanha === 'sete_dias' ? 12 : 4, site: SITE, linkDescadastro: desc, hoje: HOJE, semente: s,
          diasRestantes: campanha === 'renovacao_pix_hoje' ? 0 : 3, fimEm: '2026-10-18T12:00:00Z', plano: 'semestral', acertos: Math.round(respondidas * 0.7), respondidas7d: 40, referencia: 'x' })
        conferirAuto(e, `${campanha} ${respondidas} #${s}`)
        assert.ok(e.texto.includes(desc), campanha)
        if (campanha === 'renovacao_pix') assert.ok(/18\/10|3 dias/.test(e.texto + e.assunto), 'data do Pix')
        if (campanha.startsWith('renovacao')) assert.ok(/não se perde|nada disso se perde|fica(m)? guardad|guardado/.test(e.texto), `Pix sem "nada se perde":\n${e.texto}`)
      }
    }
  }
  const relBase = { nome: 'Marina', mes: '2026-10-q1', respostas: 84, certas: 60, erradas: 24, dias_ativos: 6, respostas_anterior: 50, certas_anterior: 30, erradas_anterior: 20, total_acumulado: 900,
    temas: [{ tema: 'joelho', certas: 40, total: 50, certas_ant: 25, total_ant: 40 }, { tema: 'tumores', certas: 8, total: 20, certas_ant: 12, total_ant: 20 }], simulado: null, site: SITE, linkDescadastro: desc }
  let historia = 0
  for (const d of [relBase, { ...relBase, mes: '2026-09', respostas: 0, certas: 0, erradas: 0, dias_ativos: 0 }, { ...relBase, respostas: 1, certas: 1, erradas: 0, dias_ativos: 1, total_acumulado: 1 }, { ...relBase, respostas: 7, certas: 5, erradas: 2, dias_ativos: 2 }, { ...relBase, respostas: 40, certas: 8, erradas: 32 }, { ...relBase, nome: null }]) {
    for (let s = 1; s <= 25; s++) {
      const e = auto.emailRelatorio({ ...d, semente: s, hoje: HOJE })
      conferirAuto(e, `relatório ${d.respostas} #${s}`)
      if (d.respostas === 0) assert.ok(!/\d+ questões em/.test(e.texto), 'relatório parado com números zerados')
      if (d.respostas > 0 && d.respostas < 10) assert.ok(!/\b[1-9] quest/.test(e.texto), `relatório com número pequeno:\n${e.texto}`)
      if (d.certas / (d.certas + d.erradas || 1) < 0.5) assert.ok(!PORCENTAGEM.test(e.texto + e.assunto), `relatório com acerto baixo citou porcentagem:\n${e.texto}`)
      if (d === relBase && /subiu 11 pontos|11 pontos acima/.test(e.texto)) historia++
    }
  }
  assert.ok(historia >= 10, 'o relatório deixou de contar a subida do acerto')
  const relato = auto.emailRelatoResolvido({ nome: 'Ana', idQuestao: 'trauma-0044', relato: 'O gabarito parece trocado com a letra C.', nota: null, site: SITE })
  assert.ok(relato.texto.includes('Trauma adulto, questão 44') && relato.texto.includes('alternativa C') && relato.texto.includes('Tales, do Orto Questões'), relato.texto)
  assert.ok(relato.assunto.length <= 55 && relato.assunto.includes('Ana'))
  conferirAuto(relato, 'relato resolvido')
  assert.equal(auto.alternativaCitada('acho que a alternativa B está errada'), 'B')
  assert.equal(auto.alternativaCitada('o gabarito é D'), 'D')
  assert.equal(auto.alternativaCitada('texto sem letra'), null)
  const relatoSem = auto.emailRelatoResolvido({ nome: null, idQuestao: 'mao-0012', relato: 'Enunciado com erro de digitação', nota: 'Corrigido o enunciado.', site: SITE })
  assert.ok(!/alternativa [A-E]/.test(relatoSem.texto) && relatoSem.texto.includes('Corrigido o enunciado.'))
  const cartaAntiga = auto.emailCarta({ nome: 'Ana', marco: auto.MARCOS[0], respondidas: 0, acertos: 0, erros: 0, respondidas7d: 0, site: SITE, linkDescadastro: desc })
  assert.ok(!PROIBIDO.test(cartaAntiga.texto) && !NUMERO_PEQUENO.test(cartaAntiga.texto), 'carta antiga com zero')
  tomOk(cartaAntiga.texto, 'carta antiga')

  // 12. Os seis automáticos novos: cada um sai com os dados do acontecimento, transacionais sem descadastro e fora da cadência.
  assert.deepEqual([...auto.TIPOS_AUTOMATICOS], ['boas_vindas_dia0', 'primeiras_10', 'voltou', 'cronograma_pronto', 'pagamento_aprovado', 'obrigado_tempo'])
  assert.equal(auto.tipoAutomaticoValido('voltou'), 'voltou')
  assert.equal(auto.tipoAutomaticoValido('marco'), null)
  const base = { nome: 'Ana Paula', respondidas: 12, site: SITE, linkDescadastro: desc, hoje: HOJE }
  const casos = [
    ['boas_vindas_dia0', { respondidas: 0 }, /Tales/],
    ['primeiras_10', { respondidas: 11 }, /dez/i],
    ['voltou', { respondidas: 300, diasFora: 15, perfil: rico(70, { diasParado: 15 }) }, /de volta|voltou|falta/i],
    ['cronograma_pronto', { diasParaProva: 87, provaCronograma: 'TEOT' }, /87 dias/],
    ['pagamento_aprovado', { pagamento: EXTRAS.pagamento, referencia: 'pg:1' }, /semestral|aprovad|liberad/i],
    ['obrigado_tempo', { encerramento: { reembolso: true, fimEm: null } }, /reembolso/i],
  ]
  for (const [tipo, extra, esperado] of casos) {
    for (let s = 1; s <= 25; s++) {
      const e = auto.emailAutomatico({ ...base, ...extra, tipo, semente: s })
      conferirAuto(e, `${tipo} #${s}`)
      assert.match(e.texto, esperado, `${tipo}: ${e.texto}`)
      assert.ok(e.modelo === tipo && e.versao.startsWith(`${tipo}#`), tipo)
      if (auto.ehTransacional(tipo)) assert.ok(!e.texto.includes(desc), `${tipo} é transacional e saiu com descadastro`)
      else assert.ok(e.texto.includes(desc), `${tipo} sem descadastro`)
      if (tipo === 'pagamento_aprovado') assert.ok(e.texto.includes('#/cronograma') && !/R\$|\d+,\d\d/.test(e.texto), 'recibo com link do cronograma e sem valor')
    }
  }
  // Os não transacionais respeitam a cadência; os transacionais saem mesmo assim.
  assert.throws(() => auto.emailAutomatico({ ...base, tipo: 'primeiras_10', anteriores: [envio(10)] }), /cadencia_bloqueada/)
  assert.ok(auto.emailAutomatico({ ...base, tipo: 'pagamento_aprovado', pagamento: EXTRAS.pagamento, anteriores: [envio(10)] }).texto)
  assert.ok(auto.emailAutomatico({ ...base, tipo: 'obrigado_tempo', encerramento: EXTRAS.encerramento, anteriores: [envio(10)] }).texto)
  // "voltou" nunca diz menos de 10 dias; "primeiras_10" só com 10.
  assert.throws(() => auto.emailAutomatico({ ...base, tipo: 'primeiras_10', respondidas: 9 }), /tipo_nao_combina/)
  assert.ok(/duas semanas|1[0-9] dias/.test(auto.emailAutomatico({ ...base, tipo: 'voltou', respondidas: 50, diasFora: 15, semente: 2 }).texto))

  // 13. Tom e porcentagens, em milhares de sorteios de todas as situações, faixas e fatos.
  const baixoComArea = (pct, extra = {}) => ({ ...rico(pct), areas: [{ slug: 'mao', total: 60, certas: 50 }, { slug: 'coluna', total: 60, certas: 6 }], ...extra })
  let sorteios = 0, baixos = 0
  const perfisTom = [rico(5), rico(15), rico(25), rico(35), rico(45), rico(55), rico(65), rico(75), rico(85), rico(95), baixoComArea(12), baixoComArea(48), pobre(45), pobre(7, { nome: 'Caio' }), pobre(1), pobre(0, { diasConta: 4 }), pobre(300, { acertos: 30, erros: 270, diasParado: 20 }), rico(42, { diasParado: 15 }), rico(48, { assinante: true })]
  for (const tipo of TODOS) {
    for (const perfil of perfisTom) {
      if (!m.tipoCombina(tipo, perfil)) continue
      for (let semente = 1; semente <= 30; semente++) {
        const carta = gerar(perfil, { tipo, semente, marco: tipo === 'marco' ? 100 : undefined })
        conferir(carta, `${tipo} #${semente}`, perfil); sorteios++
        const acerto = m.acertoCitavel(perfil)
        if (acerto !== null && acerto < 50 && tipo !== 'relatorio') { assert.ok(!PORCENTAGEM.test(carta.assunto + carta.corpo), `${carta.versao} com ${acerto}% citou porcentagem:\n${carta.corpo}`); baixos++ }
      }
    }
  }
  for (const faixa of ['0-10', '10-20', '20-30', '30-40']) for (let semente = 1; semente <= 40; semente++) {
    const c = gerar(baixoComArea(meio[faixa]), { tipo: 'ativo', faixa, semente })
    assert.ok(!PORCENTAGEM.test(c.assunto + c.corpo), `${c.versao} citou porcentagem:\n${c.corpo}`); baixos++
  }
  for (let s = 1; s <= 10; s++) for (const campanha of ['renovacao_pix', 'renovacao_pix_hoje', 'sete_dias', 'tres_dias']) {
    const e = auto.emailLembrete({ campanha, nome: 'Bruno', respondidas: 200, acertos: 60, respondidas7d: 40, diasFora: 12, site: SITE, linkDescadastro: desc, diasRestantes: 3, fimEm: '2026-10-18T12:00:00Z', plano: 'mensal', semente: s, hoje: HOJE })
    assert.ok(!PORCENTAGEM.test(e.assunto + e.texto), `lembrete ${campanha} com 30%:\n${e.texto}`); baixos++
  }
  // E a partir de 60% a porcentagem aparece em algum sorteio (o elogio com número continua existindo).
  assert.ok(Array.from({ length: 40 }, (_, s) => gerar(rico(75, { assinante: true }), { semente: s + 1, anteriores: obrigadoJa }).corpo).some((t) => /75%/.test(t)), 'faixa alta nunca citou o acerto')
  // As expressões que o dono citou são barradas pela lista.
  for (const ruim of ['Vou ser direto, porque sei que o seu tempo é curto.', 'Vou ser sincero: estou escrevendo para te convidar a assinar.', 'fiquei pensando se você não está marcando uma alternativa qualquer', '16% de acerto parece pouco, eu sei.', 'Você sumiu por três semanas.', 'Sem culpa nenhuma.']) {
    assert.ok(TOM_PROIBIDO.some((re) => re.test(ruim)), `a lista não barra: ${ruim}`)
  }
  assert.ok(conferidas >= 5000, `poucas cartas conferidas (${conferidas})`)

  console.log(`Cartas: ${m.FAIXAS.length} faixas e ${TODOS.length} situações (${auto.TIPOS_AUTOMATICOS.length} automáticos novos), ${conferidas} cartas conferidas: lista proibida do TOM, nenhuma porcentagem abaixo de 50% (${baixos} cartas), nenhum número de questões abaixo de 10, 6 a 12 linhas, um P.S., um link no máximo, assunto até 55 com o nome, teto de cadência (48 h / 3 em 14 dias) e tom em ${sorteios} sorteios.`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
