// Painel do administrador como painel de observação (17/10/2026): seis seções, cada parte numa seção
// só, os endereços antigos (?aba=geral, hoje, configuracoes, avaliacoes, relatos, receita, operacoes…)
// continuam abrindo no lugar certo, e o endereço novo guarda só o que vale para a parte aberta.
// Também confere as contas de Financeiro › Ganhos (ganhos.ts).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-admin-secoes-'))
const arquivo = join(pasta, 's.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/admin/secoes'\nexport * from './src/componentes/admin/ganhos'\nexport * from './src/componentes/admin/agora'\nexport { pedacosAtividade, areaDaQuestao } from './src/componentes/admin/formatos'\nexport * as catalogo from './src/componentes/admin/todasCartas'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false', 'import.meta.env': '{}' },
  })
  const m = await import(pathToFileURL(arquivo))
  const ler = (texto) => m.lerUrl(new URLSearchParams(texto))
  const ida = (texto) => m.urlDe(ler(texto))

  // Seis seções, na ordem do painel, e cada parte numa seção só.
  assert.deepEqual(m.SECOES.map(s => s.id), ['agora', 'pessoas', 'financeiro', 'conteudo', 'emails', 'ajustes'])
  const partes = m.SECOES.flatMap(s => s.abas.map(a => a.id))
  assert.equal(new Set(partes).size, partes.length, 'parte repetida em duas seções')
  // Nenhuma parte some na reorganização.
  for (const parte of ['agora', 'usuarios', 'crescimento', 'financeiro', 'assinaturas', 'cobrancas', 'pagamentos', 'conteudo', 'questoes', 'opinioes', 'simulados', 'lembretes', 'cartas', 'todas', 'ajustes'])
    assert.ok(partes.includes(parte), parte)
  assert.equal(m.secaoDe('crescimento'), 'pessoas')
  assert.equal(m.secaoDe('simulados'), 'conteudo')
  assert.equal(m.secaoDe('lembretes'), 'emails')
  assert.equal(m.secaoDe('cartas'), 'emails')
  assert.equal(m.secaoDe('todas'), 'emails', 'Todas as cartas fica em E-mails')
  assert.deepEqual(m.definicaoDe('emails').abas.map(a => a.rotulo), ['Lembretes e automáticos', 'Cartas pessoais', 'Todas as cartas'])
  assert.equal(m.secaoDe('pagamentos'), 'financeiro')
  // "Pagamentos" (aba cobrancas) é o dinheiro recebido; "Avisos de pagamento" mantém o endereço ?aba=pagamentos dos e-mails.
  assert.equal(m.secaoDe('cobrancas'), 'financeiro')
  assert.deepEqual(m.definicaoDe('financeiro').abas.map(a => a.id), ['financeiro', 'assinaturas', 'cobrancas', 'pagamentos'])
  assert.equal(m.definicaoDe('financeiro').abas.find(a => a.id === 'pagamentos').rotulo, 'Avisos de pagamento')
  assert.equal(m.definicaoDe('financeiro').abas.find(a => a.id === 'cobrancas').rotulo, 'Pagamentos')
  assert.equal(m.secaoDe('questoes'), 'conteudo')

  // Endereços antigos → parte nova.
  const mapa = {
    '': 'agora', 'aba=geral': 'agora', 'aba=hoje': 'agora', 'aba=usuarios': 'usuarios', 'aba=conteudo': 'conteudo', 'aba=questoes': 'questoes',
    'aba=opinioes': 'opinioes', 'aba=crescimento': 'crescimento', 'aba=financeiro': 'financeiro', 'aba=assinaturas': 'assinaturas',
    'aba=pagamentos': 'pagamentos', 'aba=cobrancas': 'cobrancas', 'aba=avisos': 'pagamentos', 'aba=configuracoes': 'ajustes', 'aba=avaliacoes': 'conteudo', 'aba=relatos': 'conteudo',
    'aba=receita': 'financeiro', 'aba=pessoas': 'usuarios', 'aba=operacoes': 'lembretes', 'aba=emails': 'lembretes', 'aba=cartas': 'cartas',
    'aba=simulados': 'simulados', 'aba=lembretes': 'lembretes', 'aba=todas': 'todas', 'aba=ajustes': 'ajustes', 'aba=qualquer-coisa': 'agora',
  }
  for (const [consulta, aba] of Object.entries(mapa)) assert.equal(ler(consulta).aba, aba, consulta)
  // Os e-mails de alerta levam à vista certa de Conteúdo.
  assert.equal(ler('aba=avaliacoes').vista, 'avaliacoes')
  assert.equal(ida('aba=relatos'), '/admin?aba=conteudo&vista=relatos')
  assert.equal(ida('aba=pagamentos'), '/admin?aba=pagamentos')
  // Filtro, vista e questão sobrevivem ida e volta, e só aparecem na parte a que pertencem.
  assert.equal(ida('aba=usuarios&filtro=novos'), '/admin?aba=usuarios&filtro=novos')
  assert.equal(ida('aba=conteudo&vista=temas'), '/admin?aba=conteudo&vista=temas')
  assert.equal(ida('aba=questoes&id=mao-0853'), '/admin?aba=questoes&id=mao-0853')
  assert.equal(ida('aba=assinaturas&filtro=novos&id=x'), '/admin?aba=assinaturas')
  assert.equal(ida('aba=usuarios&filtro=invalido'), '/admin?aba=usuarios')
  assert.equal(ida('aba=geral'), '/admin')
  assert.equal(ida('aba=hoje'), '/admin')
  // Só endereço antigo é reescrito (sem criar histórico); o atual fica como está.
  for (const antigo of ['aba=geral', 'aba=hoje', 'aba=configuracoes', 'aba=avaliacoes', 'aba=receita', 'aba=operacoes', 'aba=emails', 'aba=xyz']) assert.ok(m.urlAntiga(new URLSearchParams(antigo)), antigo)
  for (const atual of ['', 'aba=agora', 'aba=usuarios&filtro=novos', 'aba=lembretes', 'aba=cartas', 'aba=todas', 'aba=ajustes', 'aba=simulados', 'aba=conteudo&vista=relatos']) assert.ok(!m.urlAntiga(new URLSearchParams(atual)), atual)
  // A primeira parte de cada seção é a que abre por padrão.
  assert.deepEqual(m.SECOES.map(s => m.abaPadrao(s.id)), ['agora', 'usuarios', 'financeiro', 'conteudo', 'lembretes', 'ajustes'])

  // ---------- Financeiro › Ganhos ----------
  // 17/10/2026 15h em Brasília (18h UTC).
  const agora = new Date('2026-10-17T18:00:00Z')
  const c = (iso, valor, meio = 'cartao') => ({ em: new Date(iso), valor, meio, plano: 'mensal', id_usuario: 'u', estimada: false, tipo: 'nova' })
  const todas = [
    c('2026-10-17T12:00:00Z', 50, 'pix'),       // hoje
    c('2026-10-17T02:00:00Z', 30),              // 16/10 23h em Brasília: ontem
    c('2026-10-12T15:00:00Z', 100),             // 7 dias
    c('2026-10-05T15:00:00Z', 70),              // 7 dias antes; mês
    c('2026-09-10T15:00:00Z', 40),              // mês passado até o dia 17
    c('2026-09-25T15:00:00Z', 60, 'pix'),       // mês passado depois do dia 17
    c('2025-12-20T15:00:00Z', 200),             // ano passado
    c('2026-10-18T15:00:00Z', 999),             // futuro: não conta
  ]
  const g = m.calcularGanhos(todas, agora)
  assert.deepEqual(g.hoje, { valor: 50, quantidade: 1 })
  assert.deepEqual(g.ontem, { valor: 30, quantidade: 1 })
  assert.equal(g.semana.valor, 180)
  assert.equal(g.semanaAnterior.valor, 70)
  assert.equal(g.mes.valor, 250)
  assert.equal(g.mesPassado.valor, 100)
  assert.equal(g.mesPassadoAteHoje.valor, 40)
  assert.equal(g.ano.valor, 350)
  assert.equal(g.total.valor, 550)
  assert.equal(g.chaveAno, '2026')
  assert.equal(g.porDia.length, 30)
  assert.equal(g.porDia.at(-1).dia, '2026-10-17')
  assert.deepEqual(g.porDia.at(-1), { dia: '2026-10-17', cartao: 0, pix: 50 })
  assert.equal(g.porDia.at(-2).cartao, 30)
  const f = m.fechamentoDoMes(250, '2026-10', [['2026-10', { valor: 80, quantidade: 2 }], ['2026-11', { valor: 9, quantidade: 1 }]], [['2026-10', { valor: 12, quantidade: 0.5 }]])
  assert.equal(f.total, 342)
  assert.equal(f.cartao.quantidade, 2)

  // ---------- Agora › torre de controle (agora.ts) ----------
  // Mesmo relógio: 17/10/2026 15h em Brasília. Ontem é 16/10 inteiro.
  const iso = (h) => new Date(agora.getTime() + h * 3_600_000).toISOString()
  const pessoa = (id, extra) => ({ id_usuario: id, nome: `Pessoa ${id}`, email: `${id}@x.com`, criado_em: iso(-24 * 40), ultimo_login: null, ultima_atividade: null, respondidas: 100, respondidas_7d: 10, plano_vigente: null, administrador: false, respondidas_hoje: 0, tentativas_hoje: 0, pagina: null, pagina_em: null, visto_em: null, ...extra })
  const pessoas = [
    pessoa('a', { respondidas_hoje: 5, tentativas_hoje: 7, ultima_atividade: iso(-1), pagina: '/sessao · 3 de 10', pagina_em: iso(-1), visto_em: iso(-1) }),      // estudou: 5 questões
    pessoa('b', { ultima_atividade: iso(-50), visto_em: iso(-2), pagina: '/cronograma', pagina_em: iso(-2) }),                                                    // entrou sem estudar
    pessoa('c', { criado_em: iso(-2), respondidas: 0, respondidas_7d: 0 }),                                                                                         // cadastrou hoje
    pessoa('d', { respondidas_hoje: 0, ultima_atividade: iso(-20), respondidas_7d: 30 }),                                                                           // respondeu ontem (12h em Brasília... 19h de ontem)
    pessoa('e', { pagina: '/resumos/rockwood10-17-sindrome-compartimental · 40%', pagina_em: iso(-3), visto_em: iso(-3) }),                                        // só leu um resumo
    pessoa('f', { plano_vigente: 'anual' }),                                                                                                                       // nada hoje
  ]
  const sinais = [{ id_usuario: 'f', planos_vezes: 0, planos_ultima: null, condicoes_ultima: null, flashcards_unicos: 20, flashcards_7d: 12, flashcards_ultima: iso(-4), cripta_andar: 3, locais_trabalho: null }] // f usou flashcards hoje
  const serie = [{ dia: '2026-10-16', cadastros: 3, ativos: 9, respostas: 120 }, { dia: '2026-10-17', cadastros: 1, ativos: 2, respostas: 40 }]
  const assinaturas = [
    { id_usuario: 'f', plano: 'anual', status: 'ativa', meio: 'pix', criada_em: iso(-2), inicio_periodo: iso(-2), fim_periodo: iso(24 * 365), ultima_cobranca_em: iso(-2) },  // nova hoje
    { id_usuario: 'd', plano: 'mensal', status: 'cancelada', meio: 'cartao', criada_em: iso(-24 * 20), fim_periodo: iso(24 * 10), cancelar_ao_fim: true, cancelada_em: iso(-5) },  // cancelou hoje
    { id_usuario: 'b', plano: 'semestral', status: 'pendente', meio: 'pix', criada_em: iso(-30) },                                                                             // Pix pendente (ontem)
    { id_usuario: 'a', plano: 'mensal', status: 'ativa', meio: 'cartao', criada_em: iso(-24 * 100), fim_periodo: iso(24 * 10) },
  ]
  const cobrancas = [
    { id_usuario: 'f', plano: 'anual', meio: 'pix', valor: 349, em: iso(-2), id_pagamento: '1', situacao: 'paga' },
    { id_usuario: 'a', plano: 'mensal', meio: 'cartao', valor: '39.9', em: iso(-26), id_pagamento: '2', situacao: 'paga' },   // ontem 13h
    { id_usuario: 'd', plano: 'mensal', meio: 'cartao', valor: 39.9, em: iso(-27), id_pagamento: '3', situacao: 'reembolsada' },
  ]
  const q = m.quadroDoDia({ usuarios: pessoas, sinais, serie, resumo: { usuarios: 6, novos_7d: 1, ativos_hoje: 2, ativos_7d: 5, ativos_30d: 6, respondidas_hoje: 40, respondidas_7d: 300, assinantes_vigentes: 2 }, funil: { cadastrados: 6, confirmaram: 5 }, assinaturas, cobrancas, agora: agora.getTime() })
  assert.equal(q.hoje, '2026-10-17'); assert.equal(q.ontem, '2026-10-16')
  assert.deepEqual(q.estudaram.map(f => f.pessoa.id_usuario), ['a', 'e', 'f'], 'estudaram hoje: questões, resumo e flashcards, da atividade mais recente para a mais antiga')
  assert.deepEqual(q.estudaram.map(f => [f.questoes, f.tentativas, f.flashcards, f.resumo?.capitulo ?? null, f.resumo?.extra ?? null]), [[5, 7, false, null, null], [0, 0, false, 'rockwood10-17-sindrome-compartimental', '40%'], [0, 0, true, null, null]])
  assert.deepEqual(q.entraram.map(e => e.pessoa.id_usuario), ['b'], 'entrou hoje sem estudar')
  assert.deepEqual(q.recemCadastrados.map(u => u.id_usuario), ['c'])
  assert.deepEqual(q.maisAtivosSemana.map(u => u.id_usuario), ['d', 'a', 'b', 'e', 'f'])
  assert.deepEqual(q.numeros.cadastros, { hoje: 1, ontem: 3 })
  assert.deepEqual(q.numeros.entraram, { hoje: 4, ontem: null })
  assert.deepEqual(q.numeros.estudaram, { hoje: 3, ontem: null })
  assert.deepEqual(q.numeros.pessoasQuestoes, { hoje: 2, ontem: 9 })
  assert.deepEqual(q.numeros.cincoOuMais, { hoje: 1, ontem: null })
  assert.deepEqual(q.numeros.questoes, { hoje: 40, ontem: 120 })
  assert.deepEqual(q.numeros.flashcards, { hoje: 1, ontem: null })
  assert.deepEqual(q.numeros.resumosAbertos, { hoje: 1, ontem: null })
  assert.equal(q.numeros.confirmaramEmail, 5)
  assert.deepEqual(q.numeros.pagaram, { hoje: 1, ontem: 1 })
  assert.deepEqual(q.numeros.valorPago, { hoje: 349, ontem: 39.9 })
  assert.deepEqual(q.pagaram.map(x => [x.id_usuario, x.nome, x.meio, x.valor]), [['f', 'Pessoa f', 'pix', 349]])
  assert.deepEqual(q.numeros.novasAssinaturas, { hoje: 1, ontem: 0 })
  assert.deepEqual(q.numeros.cancelamentos, { hoje: 1, ontem: 0 })
  assert.deepEqual(q.numeros.pixPendentes, { hoje: 1, ontem: null })
  assert.deepEqual(q.pixPendentes.map(x => [x.id_usuario, x.plano, x.valor]), [['b', 'semestral', 179.9]], 'Pix pendente sem valor gravado: o preço do plano')
  // Sem a lista de pessoas nem cobranças, nada é inventado: fica "ainda não medido" (null).
  const vazio = m.quadroDoDia({ usuarios: null, sinais: null, serie: null, resumo: null, funil: null, assinaturas: null, cobrancas: null, agora: agora.getTime() })
  assert.deepEqual(vazio.numeros.estudaram, { hoje: null, ontem: null })
  assert.deepEqual(vazio.numeros.pagaram, { hoje: null, ontem: null })
  assert.equal(vazio.numeros.confirmaramEmail, null)
  assert.equal(vazio.estudaram.length, 0)
  // A frase do que a pessoa está fazendo, em pedaços (área pelo prefixo da questão).
  assert.equal(m.areaDaQuestao('trauma-0412'), 'Trauma adulto')
  assert.equal(m.areaDaQuestao('ombro-cotovelo-0012'), 'Ombro e cotovelo')
  assert.deepEqual(m.pedacosAtividade({ pagina: '/sessao · 3 de 10', questao: 'trauma-0412' }), { nome: 'Respondendo questões', area: 'Trauma adulto', questao: 'trauma-0412', extra: '3 de 10' })
  assert.deepEqual(m.pedacosAtividade({ pagina: '/flashcards/cripta · andar 7', questao: null }), { nome: 'Torneio de Flashcards: batalha na Cripta', area: null, questao: null, extra: 'andar 7' })
  assert.equal(m.pedacosAtividade({ pagina: null }).nome, 'Página ainda não registrada')
  assert.deepEqual(m.BLOCOS_AGORA.map(b => b[0]).slice(0, 2), ['agora-online', 'agora-numeros'])

  // ---------- E-mails › Todas as cartas (17/10/2026) ----------
  // Todo tipo do motor está no catálogo (a carta de estudo aberta nas 9 faixas), cada modelo tem gatilho,
  // pessoa fictícia e uma amostra que o motor consegue escrever; "sortear" troca a versão; a busca acha pelo texto.
  {
    const cat = m.catalogo
    const modelos = cat.modelosDoCatalogo()
    const tipos = new Set(modelos.map(x => x.tipo))
    assert.equal(tipos.size, 33, 'os 33 tipos do motor (18 antigos, 6 novos e 9 campanhas diárias)')
    assert.equal(modelos.filter(x => x.tipo === 'ativo').length, 9, 'as 9 faixas')
    assert.equal(modelos.length, 33 - 1 + 9)
    assert.equal(new Set(modelos.map(x => x.id)).size, modelos.length, 'id repetido')
    for (const grupo of ['situacao', 'faixa', 'convite', 'pessoal', 'automatico', 'novo', 'campanha']) assert.ok(modelos.some(x => x.grupo === grupo), grupo)
    assert.equal(modelos.filter(x => x.grupo === 'novo').length, 6)
    assert.equal(modelos.filter(x => x.grupo === 'campanha').length, 9, 'as 9 campanhas diárias (parte 31)')
    for (const x of modelos.filter(x => x.grupo === 'campanha')) assert.ok(/candidatos_|Agendador/.test(x.gatilho.quando) && /cadência/.test(x.gatilho.paraQuem), `${x.id}: gatilho da campanha`)
    for (const x of modelos) {
      assert.ok(x.rotulo && x.descricao && x.gatilho.quando.length >= 10 && x.gatilho.paraQuem.length >= 10 && x.pessoa, `${x.id}: faltou rótulo, descrição, gatilho ou pessoa`)
      assert.ok(x.versoes >= 5 && x.versoes <= 7, `${x.id}: ${x.versoes} versões`)
      const carta = cat.amostraDe(x, cat.sementeInicial(x))
      assert.equal(carta.tipo, x.tipo, x.id)
      if (x.faixa) assert.equal(carta.faixa, x.faixa)
      assert.ok(carta.assunto && carta.corpo.includes('P.S.:'), x.id)
      // Sortear: outra semente dá outra versão (há sempre 5 ou mais).
      let k = 0
      const outra = cat.amostraDe(x, cat.outraSemente(x, carta.versao, () => (k += 0.137) % 1))
      assert.notEqual(outra.versao, carta.versao, `${x.id}: sortear não trocou a versão`)
      assert.ok(cat.combinaBusca(x, carta, x.rotulo.slice(0, 8)), 'busca pelo rótulo')
      assert.ok(cat.combinaBusca(x, carta, carta.assunto.split(' ').slice(-1)[0]), 'busca pelo assunto')
    }
    assert.equal(modelos.filter(x => x.transacional).map(x => x.tipo).sort().join(','), 'obrigado_tempo,pagamento_aprovado,pix_hoje')
    assert.ok(!cat.combinaBusca(modelos[0], null, 'xyzw-nada-disso'))
    assert.ok(cat.combinaBusca(modelos.find(x => x.tipo === 'voltou'), null, 'DIAS fora'), 'busca sem acento e sem caixa')
  }

  console.log('Painel do administrador: 6 seções, endereços antigos, estado na URL, ganhos, a torre de controle de Agora e o catálogo Todas as cartas ok.')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
