// Campanhas diárias (parte 31, 18/10/2026): a ação `campanhas_diarias` da função enviar-email, com o
// banco e o Resend simulados. Confere que:
//   - só o agendador (x-segredo certo) ou um administrador chamam; a própria pessoa não pede campanha;
//   - cada uma das dez campanhas lê candidatos_<tipo> e manda pelo mesmo enviarAutomatico (a carta
//     certa, com descadastro, gravada como tipo "carta", modelo <tipo> e a referência do banco);
//   - quem desligou as cartas não recebe (podeReceber, na hora), a cadência adia, quem já recebeu a
//     referência não recebe de novo, e o envio que falhou é retomado na mesma linha (índice único);
//   - rodar duas vezes não manda nada em dobro; "simular" não manda nada; sem a parte 31, "sql_pendente";
//   - o "resumo do tema" registra antes o catálogo de biblioteca/indice.json.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-campanhas-'))
const arquivo = join(pasta, 'f.mjs')
try {
  await build({ entryPoints: ['supabase/functions/enviar-email/index.ts'], outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })

  const ENV = { SUPABASE_URL: 'https://banco.teste', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', RESEND_API_KEY: 're_teste', EMAIL_REMETENTE: 'Tales <contato@ortoquestoes.com.br>', EMAIL_SEGREDO: 'segredo-de-teste-bem-longo', APP_ORIGIN: 'https://ortoquestoes.com.br' }
  let handler = null
  globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (h) => { handler = h } }
  // As pausas entre envios (limite do Resend) não precisam esperar no teste.
  const setTimeoutOriginal = globalThis.setTimeout
  globalThis.setTimeout = (f) => { f(); return 0 }

  const ADM = '00000000-0000-4000-8000-00000000000a', ANA = '00000000-0000-4000-8000-0000000000a1'
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const indice = await readFile('public/biblioteca/indice.json', 'utf8')
  const AGORA = Date.now()
  const horas = (h) => new Date(AGORA - h * 3600_000).toISOString()

  // Pessoas: nome, preferências e o que o banco sabe delas.
  const pessoas = new Map()
  const NOMES = ['Ana', 'Bruno', 'Clara', 'Diego', 'Elisa', 'Fábio', 'Gabi', 'Hugo', 'Íris', 'João', 'Kátia', 'Lia', 'Marcos']
  const pessoa = (n, extra = {}) => { const p = { id: id(n), nome: `${NOMES[n % NOMES.length]} Teste`, email: `p${n}@teste`, confirmado: true, quer_cartas: true, prefs: null, respondidas: 240, ...extra }; pessoas.set(p.id, p); return p.id }
  // Uma candidata por campanha, mais os casos de trava.
  const C = {
    assinou_sem_cronograma: [[pessoa(1, { assinante: true }), 'assinou_sem_cronograma', { assinou_em: horas(24 * 4) }]],
    assinante_parado_7: [[pessoa(2, { assinante: true, dias_parado: 9 }), 'assinante_parado_7:2026-10-09', { dias_fora: 9 }]],
    simulado_resultado: [[pessoa(3), 'simulado_resultado:2026-09', { edicao: '2026-09', titulo: 'Simulado Nacional de setembro', acertos: 41, total: 50, posicao: 12, participantes: 180 }]],
    vespera_prova: [[pessoa(4, { prova: 'TEOT' }), 'vespera_prova:2026-10-19', { data_prova: '2026-10-19', prova: 'TEOT' }]],
    depois_prova: [[pessoa(5, { prova: 'TARO' }), 'depois_prova:2026-10-16', { data_prova: '2026-10-16', prova: 'TARO', dias_depois: 2 }]],
    aniversario: [[pessoa(6, { nascimento: '1994-' + new Date(AGORA - 3 * 3600_000).toISOString().slice(5, 10) }), 'aniversario:2026', {}]],
    um_ano: [[pessoa(7, { dias_conta: 731 }), 'um_ano:2', { anos: 2 }]],
    indicacao_deu_certo: [[pessoa(8), `indicacao_deu_certo:${id(80)}`, { confirmada: true, cortesia: true }]],
    resumo_do_tema: [[pessoa(9), 'resumo_do_tema:2026-s42', { id: 'rockwood10-45-fraturas-mao', titulo: 'Fraturas da mão', especialidade: 'mao' }]],
    simulado_lembrete: [[pessoa(10), 'simulado_lembrete:2026-10', { edicao: '2026-10', titulo: 'Simulado Nacional · Outubro de 2026', tipo: 'mensal', tipo_lembrete: 'abriu_hoje', abre_em: horas(5), fecha_em: '2026-11-01T02:59:59Z', duracao_min: 120, total: 50, precisa_plano: false }]],
  }
  // Travas que a função confere de novo na hora (a lista do banco pode ser de antes):
  const desligou = pessoa(20, { prefs: { cartas: false } }) //       desligou as cartas depois da lista
  const tudoDesligado = pessoa(21, { prefs: { conquistas: false, relatorio_mensal: false, lembretes: false, cartas: false } })
  const naoConfirmou = pessoa(22, { confirmado: false })
  const recente = pessoa(23) //                                      recebeu uma carta há 10 horas: adiado
  const jaRecebeu = pessoa(24) //                                    a mesma referência já saiu
  const falhou = pessoa(25) //                                       a mesma referência falhou antes: retoma a linha
  C.um_ano.push([desligou, 'um_ano:1', { anos: 1 }], [tudoDesligado, 'um_ano:1', { anos: 1 }], [naoConfirmou, 'um_ano:1', { anos: 1 }], [recente, 'um_ano:1', { anos: 1 }], [jaRecebeu, 'um_ano:1', { anos: 1 }], [falhou, 'um_ano:3', { anos: 3 }])

  let linhas = [] // emails_enviados
  let proximo = 1
  const inserir = (l) => { const linha = { id: proximo++, status: 'enviado', enviado_em: new Date().toISOString(), ...l }; linhas.push(linha); return linha }
  inserir({ id_usuario: recente, tipo: 'carta', modelo: 'ativo:40-60', versao: 'ativo:40-60#v1', referencia: null, enviado_em: horas(10) })
  inserir({ id_usuario: jaRecebeu, tipo: 'carta', modelo: 'um_ano', referencia: 'um_ano:1', enviado_em: horas(24 * 20) })
  inserir({ id_usuario: falhou, tipo: 'carta', modelo: 'um_ano', referencia: 'um_ano:3', status: 'falhou', erro: 'envio_recusado_500', enviado_em: horas(24 * 20) })

  const enviados = [], rpcs = [], catalogos = [], marcados = []
  let semParte31 = false
  const j = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } })
  globalThis.fetch = async (entrada, op = {}) => {
    const url = String(entrada), metodo = op.method ?? 'GET'
    const corpo = op.body ? JSON.parse(String(op.body)) : null
    const q = new URL(url).searchParams
    const eq = (k) => (q.get(k) ?? '').replace(/^eq\./, '')
    if (url.endsWith('/auth/v1/user')) {
      const auth = new Headers(op.headers).get('authorization')
      return auth === 'Bearer ana' ? j({ id: ANA }) : auth === 'Bearer adm' ? j({ id: ADM }) : j({}, 401)
    }
    if (url.startsWith('https://ortoquestoes.com.br/biblioteca/indice.json')) return new Response(indice, { status: 200 })
    if (url.includes('api.resend.com')) { enviados.push(corpo); return j({ id: 'x' }) }
    const rota = url.replace('https://banco.teste/rest/v1/', '').split('?')[0]
    if (rota.startsWith('rpc/')) rpcs.push(rota.slice(4))
    if (rota.startsWith('rpc/candidatos_')) {
      if (semParte31) return j({ code: 'PGRST202' }, 404)
      const lista = C[rota.slice('rpc/candidatos_'.length)] ?? []
      return j(lista.slice(0, corpo.p_limite).map(([id_usuario, referencia, dados]) => ({ id_usuario, referencia, dados })))
    }
    if (rota === 'rpc/registrar_catalogo_biblioteca') { catalogos.push(corpo.p_capitulos); return j(1) }
    if (rota === 'rpc/sn_marcar_lembrete') { marcados.push(corpo); return j(true) }
    const p = pessoas.get(corpo?.p_id ?? eq('id_usuario') ?? eq('usuario_id')) ?? pessoas.get(eq('usuario_id'))
    if (rota === 'rpc/dados_carta_envio') return j(p ? { email: p.email, nome: p.nome.split(' ')[0], confirmado: p.confirmado, quer_cartas: p.quer_cartas, administrador: false } : null)
    if (rota === 'rpc/dados_email_usuario') return j(p ? [{ email: p.email, nome: p.nome, respondidas: p.respondidas, acertos: 160, erros: 80, respondidas_7d: 20, dias_de_conta: 400, quer_conquistas: true }] : [])
    if (rota === 'rpc/dados_carta_usuario') return j(p ? { nome: p.nome, respondidas: p.respondidas, acertos: 160, erros: 80, dias_parado: p.dias_parado ?? 1, dias_conta: p.dias_conta ?? 400, assinante: !!p.assinante, provas: ['teot'], nascimento: p.nascimento ?? null, prova_cronograma: p.prova ?? null, areas: [{ slug: 'mao', total: 120, certas: 90 }] } : null)
    if (rota === 'preferencias_email') return j(p?.prefs ? [p.prefs] : [])
    if (rota === 'planos_estudo') return j(p?.prova ? [{ prova: p.prova, data_prova: '2026-10-19' }] : [])
    if (rota === 'emails_enviados' && metodo === 'GET') {
      const status = (q.get('status') ?? '').match(/^in\.\((.*)\)$/)?.[1]?.split(',')
      return j(linhas.filter((l) => l.id_usuario === eq('id_usuario') && (!q.get('referencia') || l.referencia === eq('referencia')) && (!status || status.includes(l.status)))
        .map((l) => ({ ...l, em: l.enviado_em })).sort((a, b) => b.enviado_em.localeCompare(a.enviado_em)))
    }
    if (rota === 'emails_enviados' && metodo === 'POST') {
      // O índice único da parte 31: uma carta por pessoa e referência.
      if (corpo.tipo === 'carta' && corpo.referencia && linhas.some((l) => l.tipo === 'carta' && l.id_usuario === corpo.id_usuario && l.referencia === corpo.referencia)) return j({ code: '23505' }, 409)
      return j([inserir(corpo)], 201)
    }
    if (rota === 'emails_enviados' && metodo === 'PATCH') {
      const alvo = linhas.filter((l) => (q.get('id') ? String(l.id) === eq('id') : l.id_usuario === eq('id_usuario') && l.tipo === eq('tipo') && l.referencia === eq('referencia') && l.status === eq('status')))
      for (const l of alvo) Object.assign(l, corpo)
      return j(alvo)
    }
    if (rota === 'administradores') return j(eq('id_usuario') === ADM ? [{ id_usuario: ADM }] : [])
    throw new Error(`fetch inesperado: ${metodo} ${url}`)
  }

  await import(pathToFileURL(arquivo))
  const chamar = async (corpo, cabecalhos = {}) => {
    const r = await handler(new Request('https://f.teste/enviar-email', { method: 'POST', headers: { 'content-type': 'application/json', ...cabecalhos }, body: JSON.stringify(corpo) }))
    return { status: r.status, dados: await r.json() }
  }
  const segredo = { 'x-segredo': ENV.EMAIL_SEGREDO }
  const TIPOS = Object.keys(C)

  // 1. Quem pode chamar.
  assert.equal((await chamar({ acao: 'campanhas_diarias' }, { 'x-segredo': 'errado-errado-errado-errado' })).status, 403, 'segredo errado')
  assert.equal((await chamar({ acao: 'campanhas_diarias' }, { authorization: 'Bearer ana' })).status, 403, 'pessoa comum não chama campanha')
  assert.equal((await chamar({ acao: 'automatico', tipo: 'aniversario' }, { authorization: 'Bearer ana' })).status, 403, 'a própria pessoa não pede campanha diária')
  assert.equal((await chamar({ acao: 'campanhas_diarias', campanha: 'inventada' }, segredo)).dados.erro, 'campanha_invalida')
  assert.equal(enviados.length, 0)

  // 2. Simular: conta, não manda.
  let r = await chamar({ acao: 'campanhas_diarias', simular: true }, segredo)
  assert.equal(r.status, 200)
  assert.deepEqual(Object.keys(r.dados.campanhas), TIPOS, 'as dez campanhas, na ordem')
  assert.equal(r.dados.campanhas.um_ano.simuladas, C.um_ano.length)
  assert.equal(enviados.length, 0, 'simular não manda')
  assert.equal(marcados.length, 0, 'simular não marca o lembrete')
  for (const t of TIPOS) assert.ok(rpcs.includes(`candidatos_${t}`), `leu candidatos_${t}`)

  // 3. De verdade.
  rpcs.length = 0; catalogos.length = 0
  r = await chamar({ acao: 'campanhas_diarias', limite: 40 }, segredo)
  assert.equal(r.status, 200, JSON.stringify(r.dados))
  const c = r.dados.campanhas
  for (const t of TIPOS.filter((t) => t !== 'um_ano')) assert.deepEqual(c[t], { candidatas: 1, enviado: 1 }, `${t}: ${JSON.stringify(c[t])}`)
  assert.deepEqual(c.um_ano, { candidatas: 7, enviado: 2, nao_quer: 2, email_nao_confirmado: 1, adiado: 1, ja_enviado: 1 }, JSON.stringify(c.um_ano))
  assert.equal(enviados.length, 11)
  assert.deepEqual(marcados, [{ p_edicao: '2026-10', p_usuario: C.simulado_lembrete[0][0] }], 'marcou o lembrete enviado')
  assert.equal(catalogos.length, 1, 'registrou o catálogo da Biblioteca')
  assert.equal(catalogos[0].length, JSON.parse(indice).capitulos.length)
  assert.ok(catalogos[0].every((x) => x.id && x.titulo && x.especialidade), 'catálogo com id, título e área')
  assert.ok(rpcs.indexOf('registrar_catalogo_biblioteca') < rpcs.indexOf('candidatos_resumo_do_tema'), 'o catálogo antes das candidatas do resumo')
  // Ninguém travado recebeu.
  for (const quem of [desligou, tudoDesligado, naoConfirmou, recente, jaRecebeu]) assert.ok(!enviados.some((e) => e.to.includes(pessoas.get(quem).email)), `${pessoas.get(quem).email} não podia receber`)
  // Cada envio: carta de verdade, com descadastro, gravada com o tipo e a referência do banco.
  for (const t of TIPOS) {
    const [quem, referencia] = C[t][0]
    const e = enviados.find((x) => x.to.includes(pessoas.get(quem).email))
    assert.ok(e, `${t}: não saiu`)
    assert.ok(e.text.includes('Tales, do Orto Questões') && /P\.S\.:/.test(e.text), `${t}: carta`)
    assert.ok(e.headers?.['List-Unsubscribe']?.includes('tipo=cartas'), `${t}: List-Unsubscribe`)
    assert.ok(e.subject.length <= 55 && e.subject.startsWith(pessoas.get(quem).nome.split(' ')[0]), `${t}: assunto ${e.subject}`)
    const linha = linhas.find((l) => l.id_usuario === quem && l.tipo === 'carta')
    assert.ok(linha && linha.modelo === t && linha.referencia === referencia && linha.status === 'enviado' && linha.origem === 'automatico' && linha.versao?.startsWith(`${t}#`), `${t}: registro ${JSON.stringify(linha)}`)
  }
  const texto = (t) => enviados.find((x) => x.to.includes(pessoas.get(C[t][0][0]).email)).text
  assert.match(texto('vespera_prova'), /TEOT/, 'véspera cita a prova do cronograma')
  assert.match(texto('depois_prova'), /TARO/, 'depois cita a prova do cronograma')
  assert.match(texto('resumo_do_tema'), /#\/resumos\/rockwood10-45-fraturas-mao/, 'resumo leva ao resumo novo')
  assert.match(texto('um_ano'), /dois anos/i)
  assert.match(texto('indicacao_deu_certo'), /#\/indicar/)
  assert.match(texto('simulado_resultado'), /#\/simulado-nacional/)
  assert.match(texto('simulado_lembrete'), /#\/simulado-nacional/)
  assert.match(texto('simulado_lembrete'), /no ar|abriu|aberto/i, 'lembrete: abriu hoje')
  assert.match(texto('assinou_sem_cronograma'), /#\/cronograma/)
  assert.ok(!/\b[1-6] dias\b/.test(texto('assinante_parado_7').split('Um abraço')[0].replace(/faltam \d+ dias|a \d+ dias/g, '')), 'parado: nunca menos de uma semana')
  // O envio que tinha falhado foi retomado na mesma linha (sem duplicar).
  const doFalhou = linhas.filter((l) => l.id_usuario === falhou)
  assert.equal(doFalhou.length, 1, 'retomou a linha que falhou em vez de criar outra')
  assert.equal(doFalhou[0].status, 'enviado')
  assert.ok(enviados.some((e) => e.to.includes(pessoas.get(falhou).email)))

  // 4. De novo: nada sai em dobro (a referência já foi).
  const antes = enviados.length
  r = await chamar({ acao: 'campanhas_diarias' }, segredo)
  assert.equal(enviados.length, antes, 'segunda rodada não manda nada')
  for (const t of TIPOS.filter((t) => t !== 'um_ano')) assert.equal(r.dados.campanhas[t].ja_enviado, 1, `${t}: ${JSON.stringify(r.dados.campanhas[t])}`)
  assert.equal(linhas.filter((l) => l.tipo === 'carta' && l.status === 'enviado').length, antes + 2, 'nenhuma linha nova (só as duas de antes)')

  // 5. Uma campanha só, pelo administrador; e sem a parte 31 colada.
  r = await chamar({ acao: 'campanhas_diarias', campanha: 'aniversario', simular: true }, { authorization: 'Bearer adm' })
  assert.deepEqual(Object.keys(r.dados.campanhas), ['aniversario'])
  semParte31 = true
  r = await chamar({ acao: 'campanhas_diarias' }, segredo)
  for (const t of TIPOS) assert.deepEqual(r.dados.campanhas[t], { erro: 'sql_pendente' }, t)
  semParte31 = false

  globalThis.setTimeout = setTimeoutOriginal
  console.log(`Campanhas diárias: ${TIPOS.length} campanhas, ${antes} cartas enviadas e conferidas (travas na hora, cadência, referência, retomada da falha, idempotência, simular, catálogo e sql_pendente).`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
