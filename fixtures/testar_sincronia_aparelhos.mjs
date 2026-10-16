// Sincronização entre aparelhos com o cronograma (bug de 15/10/2026: "fiz as
// questões no MacBook e no computador elas não estavam feitas; estou refazendo").
//
// Cada aparelho roda src/conta/sincronizacao.ts e src/estado/sessao.ts numa
// thread própria (localStorage, window, navigator e RELÓGIO separados) e fala
// com um servidor falso que segue as regras das funções sincronizar_progresso
// (202609120001) e ler_progresso_desde (parte 24): versão de uma sequência do
// servidor, conferência de versão, operação repetida sem efeito, cada conta só
// vê e grava as próprias linhas. O servidor também sabe falhar: derrubar a
// resposta depois de gravar, travar sem responder, recusar o login (401).
//
// Cenários: A responde questões do cronograma -> B (aba aberta antes, com a
// sessão do dia já montada) volta ao foco; B em segundo plano por horas; aba
// nova; conexão caindo no meio; pedido travado; sessão vencida (401) e recusas
// antigas por login; troca de conta; relógios adiantados e atrasados; a mesma
// questão respondida nos dois aparelhos sem sincronizar; marcas do dia.
import assert from 'node:assert/strict'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CONTA = 'conta-tales'
const OUTRA = 'conta-outra'
const HORA = 3_600_000

if (isMainThread) await principal()
else await aparelho()

async function principal() {
  const { build } = await import('esbuild')
  const { mkdtemp, rm, readFile } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const pasta = await mkdtemp(join(tmpdir(), 'orto-aparelhos-'))
  const aparelhos = []
  try {
    const pacote = join(pasta, 'sync.mjs')
    await build({
      stdin: { contents: `export * from './src/conta/sincronizacao'; export * from './src/conta/modeloSync'; export * from './src/estado/armazenamento'; export * from './src/estado/sessao'; export * from './src/dados/planoEstudo'; export * from './src/conta/marcasDia';`, resolveDir: process.cwd(), loader: 'ts' },
      outfile: pacote, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty' },
      define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
    })
    const m = await import(pathToFileURL(pacote).href)
    const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))

    // ---------- Unidades: junção de respostas, conciliação da sessão, marcas, recusas ----------
    {
      const a = { c: false, q: 1000, tentativas: 1, acertos: 0, erros: 1, p: 'B', m: 'B', historico: [{ em: 1000, correta: false, confianca: 'seguro' }] }
      const b = { c: true, q: 2000, tentativas: 1, acertos: 1, erros: 0, p: 'C', m: 'C', historico: [{ em: 2000, correta: true, confianca: 'seguro' }] }
      const j = m.juntarRespondida(a, b)
      assert.equal(j.c, true, 'a mais recente decide o estado')
      assert.equal(j.tentativas, 2); assert.equal(j.acertos, 1); assert.equal(j.erros, 1)
      assert.deepEqual(j.historico.map(t => t.em), [1000, 2000], 'as duas tentativas ficam')
      assert.equal(j.p, 'B', 'a primeira letra é a do aparelho que respondeu primeiro')
      assert.deepEqual(m.juntarRespondida(b, a), j, 'a ordem não importa')
      assert.deepEqual(m.juntarRespondida(j, b), j, 'juntar de novo não duplica')
      assert.deepEqual(m.juntarRespondida(null, b), b)

      // Erros: só dado ruim tira item da fila; login, rede e servidor não.
      assert.equal(m.erroDeDado({ code: '23514', message: 'violates check constraint' }, 400), true)
      assert.equal(m.erroDeDado({ code: 'PGRST303', message: 'JWT expired' }, 401), false)
      assert.equal(m.erroDeDado({ code: '42501', message: 'permission denied for function sincronizar_progresso' }, 401), false)
      assert.equal(m.erroDeDado({ code: '', message: 'FetchError: Failed to fetch' }, 0), false)
      assert.equal(m.erroDeDado({ code: 'XX000', message: 'erro interno' }, 500), false)

      // Conciliação: cronograma (questões novas) aceita resposta de antes da sessão
      // (a sessão pode ter sido montada antes de a sincronização chegar);
      // revisão só aceita tentativa feita depois que a sessão começou.
      const criadaEm = 50_000
      const cron = { ...m.novaSessao(m.FILTROS_VAZIOS ?? {}, ['x1', 'x2', 'x3'], { origem: 'cronograma', criadaEm }) }
      const resp = { x1: { c: true, q: 40_000, m: 'A', historico: [{ em: 40_000, correta: true, confianca: 'seguro' }] }, x2: { c: false, q: 60_000, m: 'D', historico: [{ em: 60_000, correta: false, confianca: 'duvida' }] } }
      const r1 = m.reconciliarSessao(cron, resp)
      assert.deepEqual(Object.keys(r1.respostas).sort(), ['x1', 'x2'])
      assert.equal(r1.respostas.x2.correta, false); assert.equal(r1.respostas.x2.escolhida, 'D'); assert.equal(r1.respostas.x2.outroAparelho, true)
      const rev = m.novaSessao({}, ['x1', 'x2', 'x3'], { origem: 'reta-final', criadaEm })
      assert.deepEqual(Object.keys(m.reconciliarSessao(rev, resp).respostas), ['x2'], 'revisão: só o que foi feito depois de abrir a sessão')
      assert.equal(m.reconciliarSessao(m.novaSessao({}, ['x1'], { nacional: '2026-10', criadaEm }), resp), null, 'Simulado Nacional fica como está')
      assert.equal(m.reconciliarSessao(r1, resp), null, 'nada novo, nada muda')
      const propria = { ...cron, respostas: { x1: { escolhida: 'B', correta: false, segundos: 30 } } }
      assert.equal(m.reconciliarSessao(propria, resp).respostas.x1.escolhida, 'B', 'a resposta dada nesta sessão nunca é trocada')
      assert.equal(m.reconciliarSessao(propria, resp).posicao, 2, '"Continuar" pula as feitas no outro aparelho e para na próxima que falta')

      // Marcas do dia: o que foi feito em qualquer aparelho conta, e só o dia de hoje vale.
      const hoje = '2026-10-15'
      const plano = { opcoes: { qtdLeve: 15, marcasDia: { em: hoje, resumao: ['joelho'] } } }
      assert.deepEqual(m.marcasDoPlano(plano, hoje), { em: hoje, resumao: ['joelho'] })
      assert.deepEqual(m.marcasDoPlano(plano, '2026-10-16'), { em: '2026-10-16' }, 'marca de ontem não vale hoje')
      const novas = m.opcoesComMarcas(plano, { em: hoje, flashcards: true, resumao: ['trauma'] }, hoje)
      assert.deepEqual(novas, { qtdLeve: 15, marcasDia: { em: hoje, resumao: ['joelho', 'trauma'], flashcards: true } }, 'junta sem apagar as outras opções nem o que o outro aparelho marcou')
      assert.equal(m.opcoesComMarcas({ opcoes: novas }, { em: hoje, resumao: ['trauma'] }, hoje), null, 'o servidor já tem tudo: não grava de novo')
      assert.equal(m.opcoesComMarcas(plano, { em: '2026-10-14', mini: true }, hoje), null, 'marca de outro dia não sobe')
    }

    // ---------- Servidor falso ----------
    const linhas = []
    let versao = 0
    const modos = new Map() // aparelho -> 'normal' | 'cair' | 'travar' | '401'
    const registro = []
    const copia = l => ({ tipo: l.tipo, item: l.item, valor: structuredClone(l.valor), versao: l.versao, operacao: l.operacao })
    const daConta = usuario => linhas.filter(l => l.usuario_id === usuario).sort((a, b) => a.versao - b.versao)
    function sincronizarProgresso(usuario, alteracoes) {
      if (!Array.isArray(alteracoes) || alteracoes.length > 100) return { data: null, error: { code: 'P0001', message: 'Lote inválido' }, status: 400 }
      const rascunho = linhas.map(l => ({ ...l }))
      let v = versao
      const saida = []
      for (const e of alteracoes) {
        if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(e.item)) return { data: null, error: { code: '23514', message: 'new row violates check constraint' }, status: 400 }
        let atual = rascunho.find(l => l.usuario_id === usuario && l.tipo === e.tipo && l.item === e.item)
        if (!atual) {
          if (e.base !== 0) return { data: null, error: { code: 'P0001', message: 'Versão inicial inválida' }, status: 400 }
          atual = { usuario_id: usuario, tipo: e.tipo, item: e.item, valor: e.valor, operacao: e.operacao, versao: ++v }
          rascunho.push(atual)
        } else if (atual.operacao === e.operacao) {
          // repetição: não grava de novo
        } else if (atual.versao === e.base) {
          Object.assign(atual, { valor: e.valor, operacao: e.operacao, versao: ++v })
        }
        saida.push(copia(atual))
      }
      linhas.splice(0, linhas.length, ...rascunho)
      versao = v
      return { data: saida, error: null, status: 200 }
    }
    // Devolve a resposta, ou undefined para "não responde nunca".
    function atender(nome, usuario, pedido) {
      const modo = modos.get(nome) ?? 'normal'
      registro.push({ aparelho: nome, usuario, ...pedido })
      const envio = pedido.op === 'rpc' && pedido.nome === 'sincronizar_progresso'
      if (modo === 'travar') return undefined
      // O token venceu entre a leitura e o envio (o caso que mandava respostas para "não enviados").
      if (modo === '401' && envio) return { data: null, error: { code: 'PGRST303', message: 'JWT expired' }, status: 401 }
      let resposta
      if (pedido.op === 'rpc' && pedido.nome === 'sincronizar_progresso') resposta = sincronizarProgresso(usuario, pedido.args.alteracoes)
      else if (pedido.op === 'rpc' && pedido.nome === 'ler_progresso_desde') {
        const limite = Math.min(Math.max(pedido.args.p_limite ?? 500, 1), 1000)
        resposta = { data: daConta(usuario).filter(l => l.versao > pedido.args.p_cursor).slice(0, limite).map(copia), error: null, status: 200 }
      } else if (pedido.op === 'select') {
        let lista = daConta(usuario).filter(l => pedido.filtros.every(([k, v]) => k === 'usuario_id' || l[k] === v))
        if (pedido.intervalo) lista = lista.slice(pedido.intervalo[0], pedido.intervalo[1] + 1)
        resposta = { data: lista.map(copia), error: null, status: 200 }
      } else resposta = { data: null, error: { code: '42501', message: 'permission denied for table progresso_usuario' }, status: 403 }
      // Conexão caiu depois de o servidor gravar: o aparelho não sabe que deu certo.
      if (modo === 'cair' && envio) return { data: null, error: { code: '', message: 'FetchError: Failed to fetch' }, status: 0 }
      return resposta
    }
    function criar(nome, { desvio = 0, usuario = CONTA, locks = false, intervalo = 600_000 } = {}) {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { pacote: pathToFileURL(pacote).href, nome, desvio, usuario, locks, intervalo } })
      const esperando = new Map()
      let seq = 0
      w.on('message', msg => {
        if (msg.tipo === 'pedido') {
          const r = atender(nome, msg.usuario, msg.pedido)
          if (r !== undefined) w.postMessage({ tipo: 'resposta', id: msg.id, resposta: r })
          return
        }
        const p = esperando.get(msg.id); esperando.delete(msg.id)
        if (msg.erro) p.rejeitar(new Error(`${nome}: ${msg.erro}`)); else p.resolver(msg.valor)
      })
      w.on('error', e => { throw e })
      const cmd = (comando, ...args) => new Promise((resolver, rejeitar) => { const id = ++seq; esperando.set(id, { resolver, rejeitar }); w.postMessage({ tipo: 'comando', id, comando, args }) })
      const a = {
        nome, w, cmd,
        ler: chave => cmd('ler', chave), gravar: (chave, valor) => cmd('gravar', chave, valor),
        esperar: (ms) => cmd('esperar', ms), sincronizar: () => cmd('sincronizar'), status: () => cmd('status'),
        responder: (id, correta) => cmd('responder', id, correta), evento: (alvo, tipo) => cmd('evento', alvo, tipo),
      }
      aparelhos.push(a)
      return a
    }
    const servidor = (usuario, tipo) => Object.fromEntries(daConta(usuario).filter(l => l.tipo === tipo && l.valor !== null).map(l => [l.item, l.valor]))
    const pausa = ms => new Promise(r => setTimeout(r, ms))

    // Progresso que a conta já tinha (800 respostas antigas, de semanas atrás).
    const antigo = Date.now() - 40 * 24 * HORA
    for (let i = 0; i < 800; i++) {
      const q = indice.questoes[i * 3]
      linhas.push({ usuario_id: CONTA, tipo: 'respondidas', item: q.id, valor: { c: i % 3 !== 0, q: antigo + i }, operacao: crypto.randomUUID(), versao: ++versao })
    }
    linhas.push({ usuario_id: OUTRA, tipo: 'notas', item: 'segredo', valor: 'só da outra conta', operacao: crypto.randomUUID(), versao: ++versao })

    // Plano do cronograma (o mesmo nos dois aparelhos: vem do servidor).
    const prova = new Date(Date.now() + 120 * 24 * HORA).toISOString().slice(0, 10)
    const plano = { data_prova: prova, intensidade: 'firme', folgas: [], prova: 'TEOT', base_respondidas: 0, criado_em: new Date(Date.now() - 10 * 24 * HORA).toISOString(), incluir_simulados: true, opcoes: {} }
    const cronograma = async (ap) => {
      const resp = await ap.ler('respondidas') ?? {}
      const c = m.calcularPlano(indice, resp, plano)
      const itens = c.hoje.itens.length ? c.hoje.itens : [{ slug: c.hoje.slug, n: c.hoje.n, mistura: false }]
      // Sorteio fixo: os dois aparelhos montam a mesma sessão a partir das mesmas respostas.
      let semente = 7
      const sortear = () => ((semente = (semente * 16807) % 2147483647) / 2147483647)
      return { c, ids: m.idsDoDiaPlano(indice, itens, resp, true, sortear) }
    }

    // ---------- 1) O bug relatado ----------
    // Relógios diferentes de propósito: o MacBook 7 min atrasado, o computador 9 min adiantado.
    const macbook = criar('macbook', { desvio: -7 * 60_000, locks: true })
    const computador = criar('computador', { desvio: 9 * 60_000 })
    await macbook.cmd('iniciar'); await computador.cmd('iniciar')
    await macbook.esperar(); await computador.esperar()
    assert.equal(Object.keys(await computador.ler('respondidas')).length, 800)

    // Manhã: o computador monta a sessão do cronograma e responde 2 questões.
    const manha = await cronograma(computador)
    assert.ok(manha.ids.length >= 10, `sessão do dia com ${manha.ids.length} questões`)
    await computador.cmd('montarSessao', manha.ids)
    await computador.cmd('responderNaSessao', manha.ids[0], true)
    await computador.cmd('responderNaSessao', manha.ids[1], false)
    await computador.esperar()
    // O computador vai para segundo plano (a aba fica aberta por horas), depois do último envio.
    await pausa(1400); await computador.esperar()
    await computador.cmd('visibilidade', 'hidden')

    // No MacBook a pessoa abre o cronograma e faz as questões.
    await macbook.sincronizar(); await macbook.esperar()
    const doMac = await cronograma(macbook)
    assert.ok(!doMac.ids.includes(manha.ids[0]) && !doMac.ids.includes(manha.ids[1]), 'o MacBook vê o que o computador já fez')
    const feitasNoMac = doMac.ids.slice(0, 8)
    for (const [i, id] of feitasNoMac.entries()) await macbook.responder(id, i % 4 !== 0)
    await macbook.esperar()
    for (const id of feitasNoMac) assert.ok(servidor(CONTA, 'respondidas')[id], `resposta ${id} chegou ao servidor`)
    const feitasHojeNoMac = (await cronograma(macbook)).c.feitasHoje
    assert.equal(feitasHojeNoMac, 10)

    // "Espera": em segundo plano o computador não busca nada (economiza bateria e rede).
    await pausa(1700)
    assert.equal((await computador.ler('respondidas'))[feitasNoMac[0]], undefined, 'aba escondida não fica consultando o servidor')
    // Horas depois a pessoa volta para a aba do computador.
    await computador.cmd('visibilidade', 'visible')
    await computador.esperar()
    const noComputador = await cronograma(computador)
    assert.equal(noComputador.c.feitasHoje, feitasHojeNoMac, 'o progresso do dia é o mesmo nos dois aparelhos')
    assert.ok(feitasNoMac.every(id => !noComputador.ids.includes(id)), 'o cronograma do computador não oferece de novo as questões feitas no MacBook')
    const sessao = await computador.ler('sessao:atual')
    // A sessão do computador só contém parte do que o MacBook sorteou (o sorteio depende do tamanho do acervo):
    // as feitas no Mac que pertencem a ela precisam aparecer como feitas, e sempre há pelo menos uma.
    const naSessao = feitasNoMac.filter(id => sessao.ids.includes(id))
    assert.ok(naSessao.length > 0, 'o MacBook respondeu ao menos uma questão da sessão aberta no computador')
    for (const id of naSessao) {
      assert.ok(sessao.respostas[id], `a sessão aberta no computador mostra ${id} como feita`)
      assert.equal(sessao.respostas[id].outroAparelho, true)
    }
    assert.equal(sessao.respostas[manha.ids[0]].outroAparelho, undefined, 'as respostas do próprio computador ficam como estavam')
    const faltam = sessao.ids.filter(id => !sessao.respostas[id]).length
    assert.equal(faltam, manha.ids.length - 2 - naSessao.length, '"Continuar" mostra só o que falta de verdade')

    // Aba nova (outro navegador, nada guardado): já abre com tudo.
    const abaNova = criar('aba-nova', { desvio: 3 * HORA })
    await abaNova.cmd('iniciar'); await abaNova.esperar()
    assert.equal((await cronograma(abaNova)).c.feitasHoje, feitasHojeNoMac)

    // Janela que volta ao primeiro plano sem trocar de aba (só 'focus'): também sincroniza.
    await macbook.responder('foco-1', true); await macbook.esperar()
    await pausa(1600)
    assert.equal((await computador.ler('respondidas'))['foco-1'], undefined)
    await computador.evento('window', 'focus'); await computador.esperar()
    assert.ok((await computador.ler('respondidas'))['foco-1'], 'foco da janela sincroniza')
    // E a aba aberta e visível recebe sozinha, pelo intervalo, sem nenhum evento.
    const parada = criar('aba-parada', { intervalo: 100 })
    await parada.cmd('iniciar'); await parada.esperar()
    await macbook.responder('intervalo-1', true); await macbook.esperar()
    await pausa(2200)
    assert.ok((await parada.ler('respondidas'))['intervalo-1'], 'aba visível recebe pelo intervalo')

    // ---------- 2) Conexão caindo no meio do envio ----------
    modos.set('macbook', 'cair')
    await macbook.responder('vazio-1', true)
    await pausa(150)
    assert.equal((await macbook.status()).estado, 'erro')
    assert.ok(servidor(CONTA, 'respondidas')['vazio-1'], 'o servidor gravou, mas a resposta não voltou')
    modos.set('macbook', 'normal')
    await macbook.esperar(5000)
    assert.equal(linhas.filter(l => l.usuario_id === CONTA && l.item === 'vazio-1').length, 1, 'repetir a mesma operação não duplica')
    const estadoMac = await macbook.ler('sincronia:v1')
    assert.equal(Object.keys(estadoMac.pendentes).length, 0)
    assert.equal(Object.keys(estadoMac.rejeitados ?? {}).length, 0)

    // Pedido que trava (rede pendurada): o prazo libera a fila e a resposta sobe depois.
    modos.set('macbook', 'travar')
    await macbook.responder('vazio-2', false)
    await pausa(500)
    const travado = await macbook.status()
    assert.equal(travado.estado, 'erro', 'pedido travado vira erro pelo prazo, não prende a fila para sempre')
    assert.match(travado.detalhe ?? '', /tempo esgotado/)
    modos.set('macbook', 'normal')
    await macbook.sincronizar(); await macbook.esperar(5000)
    assert.ok(servidor(CONTA, 'respondidas')['vazio-2'])

    // Offline: fica na fila e sobe ao voltar.
    await macbook.cmd('online', false)
    await macbook.responder('vazio-3', true)
    assert.equal((await macbook.status()).estado, 'offline')
    await macbook.cmd('online', true); await macbook.esperar()
    assert.ok(servidor(CONTA, 'respondidas')['vazio-3'])

    // ---------- 3) Sessão vencida (401) não manda respostas boas para "não enviados" ----------
    modos.set('macbook', '401')
    await macbook.responder('vazio-4', true)
    await pausa(200)
    let e401 = await macbook.ler('sincronia:v1')
    assert.ok(e401.pendentes['respondidas/vazio-4'], '401: a resposta continua na fila')
    assert.equal(Object.keys(e401.rejeitados ?? {}).length, 0, '401: nada vai para itens recusados')
    modos.set('macbook', 'normal')
    await macbook.sincronizar(); await macbook.esperar(5000)
    assert.ok(servidor(CONTA, 'respondidas')['vazio-4'])
    // Sessão que o próprio login diz estar ausente: nem tenta enviar como visitante.
    await macbook.cmd('semSessao', true)
    const antes = registro.length
    await macbook.responder('vazio-5', true)
    await pausa(150)
    assert.equal(registro.slice(antes).filter(r => r.aparelho === 'macbook').length, 0, 'sem login não sai pedido nenhum')
    await macbook.cmd('semSessao', false)
    await macbook.sincronizar(); await macbook.esperar(5000)
    assert.ok(servidor(CONTA, 'respondidas')['vazio-5'])
    // Recusas antigas por login (versões anteriores do site): voltam sozinhas para a fila.
    const recuperar = criar('recuperar')
    // E um item com base de uma linha que não existe no servidor ("Versão inicial inválida"): sobe como novo.
    await recuperar.cmd('semear', { cursor: 0, reinicio: 0, versoes: { 'respondidas/base-errada': 99999 }, pendentes: { 'respondidas/base-errada': { tipo: 'respondidas', item: 'base-errada', valor: { c: false, q: Date.now() }, base: 99999, operacao: crypto.randomUUID() } }, conflitos: {}, rejeitados: { 'respondidas/perdida-1': { tipo: 'respondidas', item: 'perdida-1', valor: { c: true, q: Date.now() }, erro: 'PGRST303 · JWT expired', em: 1 }, 'notas/ruim': { tipo: 'notas', item: 'ruim', valor: 'x', erro: '23514 · violates check constraint', em: 1 } } }, { 'perdida-1': { c: true, q: Date.now() }, 'base-errada': { c: false, q: Date.now() } })
    await recuperar.cmd('iniciar'); await recuperar.esperar()
    assert.ok(servidor(CONTA, 'respondidas')['perdida-1'], 'a resposta presa em "não enviados" por login chegou ao servidor')
    assert.ok((await recuperar.ler('sincronia:v1')).rejeitados['notas/ruim'], 'recusa por dado ruim continua à vista')
    assert.ok(servidor(CONTA, 'respondidas')['base-errada'], 'item com versão inicial inválida não fica preso nem é recusado')
    assert.equal((await recuperar.ler('sincronia:v1')).rejeitados['respondidas/base-errada'], undefined)

    // ---------- 4) Relógios bem diferentes e a mesma questão nos dois aparelhos ----------
    const adiantado = criar('adiantado', { desvio: 5 * HORA })
    const atrasado = criar('atrasado', { desvio: -5 * HORA })
    await adiantado.cmd('iniciar'); await atrasado.cmd('iniciar')
    await adiantado.esperar(); await atrasado.esperar()
    await adiantado.cmd('online', false); await atrasado.cmd('online', false)
    const disputada = 'disputada-1'
    await atrasado.responder(disputada, false) // respondida "às 10h" num relógio 5 h atrasado
    await adiantado.responder(disputada, true)
    await atrasado.responder('relogio-1', true)
    await adiantado.responder('relogio-2', false)
    await atrasado.cmd('online', true); await atrasado.esperar()
    await adiantado.cmd('online', true); await adiantado.esperar()
    await atrasado.sincronizar(); await atrasado.esperar()
    const final = servidor(CONTA, 'respondidas')[disputada]
    assert.equal(final.tentativas, 2, 'as duas tentativas ficaram')
    assert.deepEqual(final.historico.map(t => t.correta).sort(), [false, true])
    for (const ap of [adiantado, atrasado, macbook, computador]) {
      await ap.sincronizar(); await ap.esperar()
      const r = await ap.ler('respondidas')
      assert.deepEqual(r[disputada], final, `${ap.nome}: mesma junção`)
      assert.ok(r['relogio-1'] && r['relogio-2'], `${ap.nome}: recebeu dos dois relógios`)
    }
    // O cursor é a versão do servidor, nunca o relógio do aparelho: todos com o mesmo número.
    const cursores = await Promise.all([adiantado, atrasado, macbook, computador].map(async ap => (await ap.ler('sincronia:v1')).cursor))
    assert.ok(cursores.every(c => c === versao), `cursores ${cursores} = versão do servidor ${versao}`)

    // ---------- 5) Troca de conta no mesmo aparelho ----------
    await computador.cmd('trocarConta', OUTRA); await computador.esperar()
    assert.deepEqual((await computador.ler('respondidas')) ?? {}, {}, 'a outra conta não vê as respostas do Tales')
    assert.deepEqual(await computador.ler('notas'), { segredo: 'só da outra conta' })
    await computador.responder('da-outra', true); await computador.esperar()
    assert.ok(servidor(OUTRA, 'respondidas')['da-outra'])
    assert.equal(servidor(CONTA, 'respondidas')['da-outra'], undefined, 'resposta da outra conta não cai na do Tales')
    await computador.cmd('trocarConta', CONTA); await computador.esperar()
    assert.ok((await computador.ler('respondidas'))[feitasNoMac[0]], 'voltando para a conta, tudo continua lá')
    assert.equal((await computador.ler('respondidas'))['da-outra'], undefined)

    // Nada se perdeu: tudo o que algum aparelho respondeu está no servidor.
    for (const id of [...feitasNoMac, manha.ids[0], manha.ids[1], 'foco-1', 'intervalo-1', 'vazio-1', 'vazio-2', 'vazio-3', 'vazio-4', 'vazio-5', 'relogio-1', 'relogio-2']) {
      assert.ok(servidor(CONTA, 'respondidas')[id], `${id} no servidor`)
    }
    assert.equal(Object.keys(servidor(CONTA, 'respondidas')).length >= 800 + 10, true)

    console.log('Sincronia entre aparelhos: cronograma do outro aparelho, aba no fundo, foco, aba nova, conexão caindo, pedido travado, 401, recusas antigas, relógios ±5 h, mesma questão nos dois, troca de conta e marcas do dia passaram.')
  } finally {
    for (const a of aparelhos) await a.w.terminate()
    await rm(pasta, { recursive: true, force: true })
  }
}

async function aparelho() {
  const { pacote, nome, desvio, locks, intervalo } = workerData
  let usuario = workerData.usuario
  // Relógio do aparelho: adiantado ou atrasado em relação ao servidor.
  const agoraReal = Date.now.bind(Date)
  Date.now = () => agoraReal() + desvio
  const dados = new Map()
  globalThis.window = new EventTarget()
  window.localStorage = { getItem: k => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, String(v)), removeItem: k => dados.delete(k), key: i => [...dados.keys()][i], get length() { return dados.size } }
  window.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  globalThis.localStorage = window.localStorage
  globalThis.document = new EventTarget()
  document.visibilityState = 'visible'
  const nav = { onLine: true }
  if (locks) nav.locks = { async request(n, _o, fn) { return fn({ name: n }) } }
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })
  const m = await import(pacote)
  m.definirUsuarioLocal(usuario)
  const pendentes = new Map()
  let seq = 0
  let semSessao = false
  const pedir = pedido => new Promise(resolver => { const id = ++seq; pendentes.set(id, resolver); parentPort.postMessage({ tipo: 'pedido', id, usuario, pedido }) })
  const cliente = {
    auth: { getSession: async () => ({ data: { session: semSessao ? null : { access_token: 'token' } }, error: null }) },
    rpc: (n, args) => pedir({ op: 'rpc', nome: n, args }),
    from() {
      const filtros = []
      let intervalo, escrita
      const q = {
        select() { return q }, eq(k, v) { filtros.push([k, v]); return q }, order() { return q }, range(a, b) { intervalo = [a, b]; return q },
        upsert(v) { escrita = v; return q },
        then(ok, erro) { return pedir(escrita ? { op: 'upsert', linhas: escrita } : { op: 'select', filtros, intervalo }).then(ok, erro) },
      }
      return q
    },
  }
  let sync, status, pararSessao
  const iniciar = () => {
    sync = m.iniciarSincronizacao(cliente, usuario, s => { status = s }, { prazo: 300, intervalo })
    pararSessao = m.vigiarSessaoEntreAparelhos()
  }
  async function esperar(ms = 3000) {
    for (let i = 0; i < ms / 10; i++) {
      if (status?.estado === 'salvo' && status.pendentes === 0) return
      await new Promise(r => setTimeout(r, 10))
    }
    throw new Error(`não sincronizou: ${JSON.stringify({ ...status, conflitos: undefined })}`)
  }
  const comandos = {
    iniciar, esperar, status: () => status,
    sincronizar: () => sync.sincronizar(),
    ler: chave => m.ler(chave, null),
    gravar: (chave, valor) => { m.gravar(chave, valor) },
    responder: (id, correta) => { m.registrarResposta(id, correta, 'seguro', correta ? 'A' : 'B') },
    // Sessão do cronograma montada neste aparelho, como em PlanoEstudo.comecarHoje.
    montarSessao: ids => { m.gravar(m.CHAVE_SESSAO, m.novaSessao({ temas: [] }, ids, { origem: 'cronograma' })) },
    // Responder dentro da sessão, como usarSessao().responder.
    responderNaSessao: (id, correta) => {
      const s = m.ler(m.CHAVE_SESSAO, null)
      m.registrarResposta(id, correta, 'seguro', correta ? 'A' : 'B')
      m.gravar(m.CHAVE_SESSAO, { ...s, respostas: { ...s.respostas, [id]: { escolhida: correta ? 'A' : 'B', correta, segundos: 40, confianca: 'seguro' } } })
    },
    visibilidade(v) { document.visibilityState = v; document.dispatchEvent(new Event('visibilitychange')) },
    evento(alvo, tipo) { (alvo === 'window' ? window : document).dispatchEvent(new Event(tipo)) },
    online(v) { navigator.onLine = v; if (v) window.dispatchEvent(new Event('online')) },
    semSessao(v) { semSessao = v },
    semear(estado, respondidas) { m.gravar('sincronia:v1', estado, 'nuvem'); m.gravar('respondidas', respondidas, 'nuvem') },
    // Como ContextoConta: para a sincronização da conta anterior e começa a da nova.
    trocarConta(nova) { sync.parar(); pararSessao(); usuario = nova; m.definirUsuarioLocal(nova); iniciar() },
  }
  parentPort.on('message', async msg => {
    if (msg.tipo === 'resposta') { const r = pendentes.get(msg.id); pendentes.delete(msg.id); r?.(msg.resposta); return }
    try {
      const valor = await comandos[msg.comando](...msg.args)
      parentPort.postMessage({ tipo: 'feito', id: msg.id, valor: valor === undefined ? null : structuredClone(valor) })
    } catch (e) { parentPort.postMessage({ tipo: 'feito', id: msg.id, erro: e?.stack ?? String(e) }) }
  })
}
