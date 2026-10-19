// Capturas de páginas do site para revisão de design (18/10/2026).
// Uso: node scripts/capturar_telas.mjs <rota> <prefixo> [--sem-conta] [--sem-assinatura] [--escuro] [--sistema-escuro] [--com-dados] [--admin] [--agora ISO] [--roteiro ARQ.mjs] [--pasta DIR] [--sn CENARIO]
// --sn: o Simulado Nacional de outubro no Supabase falso (e o relógio do navegador no momento do cenário):
//   antes (não inscrito) | inscrito | aberto | andamento | entregue (resultado e ranking) | encerrado | ausente (sem a parte 32: 404)
// Ex.: node scripts/capturar_telas.mjs /desempenho desempenho-antes --pasta /tmp/telas
// Sobe o site (vite) com um Supabase falso (conta assinante de exemplo) e grava celular (390) e computador (1440), dobra e página inteira.

const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
const { createServer } = await import('vite')
const { chromium } = await import('playwright')

const CONTA = '11111111-2222-4333-8444-555555555555'

// ---------------- Supabase falso ----------------
const linhas = []
let versao = 0
let semMigracao = false
const copia = (l) => ({ tipo: l.tipo, item: l.item, valor: structuredClone(l.valor), versao: l.versao, operacao: l.operacao })
function sincronizar(usuario, alteracoes) {
  if (!Array.isArray(alteracoes) || alteracoes.length > 100) return [400, { code: 'P0001', message: 'Lote inválido' }]
  if (semMigracao && alteracoes.some((e) => e.tipo === 'biblioteca')) return [400, { code: '23514', message: 'new row for relation "progresso_usuario" violates check constraint "progresso_usuario_tipo_check"' }]
  const saida = []
  for (const e of alteracoes) {
    let atual = linhas.find((l) => l.usuario_id === usuario && l.tipo === e.tipo && l.item === e.item)
    if (!atual) {
      if (e.base !== 0) return [400, { code: 'P0001', message: 'Versão inicial inválida' }]
      atual = { usuario_id: usuario, tipo: e.tipo, item: e.item, valor: e.valor, operacao: e.operacao, versao: ++versao }
      linhas.push(atual)
    } else if (atual.operacao !== e.operacao && atual.versao === e.base) Object.assign(atual, { valor: e.valor, operacao: e.operacao, versao: ++versao })
    saida.push(copia(atual))
  }
  return [200, saida]
}
// Ranking de exemplo: 62 pessoas, a conta de exemplo em #9 (geral) ou #4 (semana).
const NOMES_RANKING = ['Marina A.', 'Rafael T.', 'Camila S.', 'Pedro H.', 'Luísa M.', 'Gustavo R.', 'Beatriz F.', 'Thiago L.', 'Tales S.', 'Juliana C.', 'Henrique B.', 'Larissa P.', 'Vinícius O.', 'Natália G.', 'Eduardo V.', 'Fernanda K.', 'Rodrigo N.', 'Amanda D.', 'Felipe Q.', 'Isabela W.']
function rankingExemplo(periodo, comNomes) {
  const semana = periodo === 'semana'
  const voce = semana ? 4 : 9
  return Array.from({ length: 62 }, (_, i) => {
    const posicao = i + 1
    const nome = posicao === voce ? 'Tales S.' : NOMES_RANKING[(i + (semana ? 7 : 0)) % NOMES_RANKING.length].replace('Tales S.', 'Sérgio A.')
    const total = Math.round((semana ? 612 : 4873) / (1 + i * 0.11) - i * (semana ? 1.3 : 7))
    const apelido = comNomes ? nome : nome.split(/\s+/).map((p) => p[0]).join('. ') + '.'
    return {
      posicao, apelido, total, total_geral: semana ? total * 7 : total, eh_voce: comNomes && posicao === voce,
      variacao: [2, 0, -1, 4, 0, 1, 0, -2, 3][i % 9], variacao_semana: [6, 1, 0, 2, 0, 5, 1, 0, 3][i % 9],
      novo: posicao === 17, referencia_em: '2026-10-17', emblemas: null, sequencia: [12, 3, 0, 41, 7, 0, 21, 2, 9][i % 9], servico: null,
    }
  })
}
// ---------------- Simulado Nacional falso (--sn) ----------------
const argsSn = process.argv.slice(2)
const SN = argsSn.includes('--sn') ? argsSn[argsSn.indexOf('--sn') + 1] : null
const SN_ABRE = '2026-10-24T11:00:00Z', SN_FECHA = '2026-11-01T02:59:59Z'
// O "agora" de cada cenário (horário de Brasília = UTC-3).
const SN_AGORA = { antes: '2026-10-19T15:00:00Z', inscrito: '2026-10-19T15:00:00Z', aberto: '2026-10-26T17:00:00Z', andamento: '2026-10-26T17:00:00Z', entregue: '2026-10-26T17:00:00Z', encerrado: '2026-11-02T15:00:00Z', ausente: '2026-10-19T15:00:00Z' }
let snEdicao = null
if (SN && SN !== 'ausente') {
  const { readFileSync } = await import('node:fs')
  const indice = JSON.parse(readFileSync(new URL('../public/acervo/indice.json', import.meta.url), 'utf8'))
  const cotas = { 'Trauma adulto': 10, 'Ortopedia pediátrica': 9, 'Mão e punho': 6, 'Ombro e cotovelo': 5, 'Tumores': 4, 'Pé e tornozelo': 4, 'Coluna': 3, 'Joelho': 3, 'Conceitos básicos': 3, 'Quadril': 2, 'Osteometabólicas': 1 }
  const provas = new Set(['TEOT', 'TARO', 'TEOT/TARO'])
  const itens = []
  for (const tema of indice.temas) {
    const n = cotas[tema.nome] ?? 0
    if (!n) continue
    const arquivo = JSON.parse(readFileSync(new URL(`../public/acervo/${tema.arquivo}`, import.meta.url), 'utf8'))
    const doIndice = new Set(indice.questoes.filter((q) => indice.temas[q.t] === tema && provas.has(indice.provas[q.p]) && !q.an).map((q) => q.id))
    const boas = arquivo.questoes.filter((q) => doIndice.has(q.id) && q.gabarito && q.alternativas?.length >= 4 && !q.anulada && !q.figuraPendente).slice(0, n)
    for (const q of boas) itens.push({ id: q.id, area: tema.nome, gabarito: q.gabarito, nAlt: q.alternativas.length })
  }
  // Áreas com poucas candidatas no filtro: completa com Trauma adulto até 50.
  if (itens.length < 50) {
    const tema = indice.temas.find((t) => t.nome === 'Trauma adulto')
    const arquivo = JSON.parse(readFileSync(new URL(`../public/acervo/${tema.arquivo}`, import.meta.url), 'utf8'))
    const ja = new Set(itens.map((i) => i.id))
    for (const q of arquivo.questoes) {
      if (itens.length >= 50) break
      if (!ja.has(q.id) && q.gabarito && q.alternativas?.length >= 4 && !q.anulada && !q.figuraPendente) itens.push({ id: q.id, area: tema.nome, gabarito: q.gabarito, nAlt: q.alternativas.length })
    }
  }
  const LETRAS = 'ABCDE'
  const ordem = itens.map((it, i) => ({ ...it, k: (i * 37) % itens.length })).sort((a, b) => a.k - b.k)
  snEdicao = ordem.map((it, i) => {
    const base = LETRAS.slice(0, it.nAlt).split('')
    const desloca = (i % (it.nAlt - 1)) + 1
    const permutacao = [...base.slice(desloca), ...base.slice(0, desloca)].join('')
    const gabarito = LETRAS[permutacao.indexOf(it.gabarito)]
    // Marcadas de exemplo: 38 certas, 9 erradas, 3 em branco.
    const marcada = i < 38 ? gabarito : i < 47 ? LETRAS[(LETRAS.indexOf(gabarito) + 1) % it.nAlt] : null
    return { ordem: i + 1, id_questao: it.id, area: it.area, permutacao, gabarito, marcada }
  })
}
function snMinha() {
  if (SN === 'andamento') return { iniciado_em: '2026-10-26T16:12:00Z', prazo_em: '2026-10-26T18:12:00Z', entregue_em: null, acertos: null, total: null, segundos: null, no_tempo: null, respondidas: 14 }
  if (SN === 'entregue' || SN === 'encerrado') return { iniciado_em: '2026-10-26T14:30:00Z', prazo_em: '2026-10-26T16:30:00Z', entregue_em: '2026-10-26T16:02:00Z', acertos: 38, total: 50, segundos: 5520, no_tempo: true, respondidas: 47 }
  return null
}
const snPorArea = () => Object.entries(snEdicao.reduce((m, i) => ({ ...m, [i.area]: (m[i.area] ?? 0) + 1 }), {})).map(([area, n]) => ({ area, n })).sort((a, b) => b.n - a.n)
const snAusente = () => [404, { code: 'PGRST202', message: 'Could not find the function public.sn_obter without parameters in the schema cache' }]
const snRpcs = {
  sn_obter: (u) => SN === 'ausente' ? snAusente() : [200, {
    edicao: '2026-10', tipo: 'mensal', titulo: 'Simulado Nacional · Outubro de 2026', descricao: null, destaque_inicio: true, aberto_a_todos: true,
    config: { provas: ['TEOT', 'TARO', 'TEOT/TARO'] }, abre_em: SN_ABRE, fecha_em: SN_FECHA, duracao_min: 120, total: snEdicao.length, por_area: snPorArea(),
    participantes: ['aberto', 'andamento', 'entregue', 'encerrado'].includes(SN) ? 214 : null, inscritos: 1240,
    minha_inscricao: u && SN !== 'antes' ? '2026-10-19T14:00:00Z' : null, tambem_no_ar: [], minha: u ? snMinha() : null,
    anteriores: u && (SN === 'entregue' || SN === 'encerrado') ? [{ edicao: '2026-10-antiga', titulo: 'Outubro de 2026 (versão anterior)', tipo: 'mensal', minha: { acertos: 31, total: 50, no_tempo: true } }] : [],
    agora: SN_AGORA[SN],
  }],
  sn_destaque_inicio: (u) => SN === 'ausente' || SN === 'encerrado' ? snAusente() : [200, {
    edicao: '2026-10', titulo: 'Simulado Nacional · Outubro de 2026', tipo: 'mensal', abre_em: SN_ABRE, fecha_em: SN_FECHA, total: 50, duracao_min: 120,
    inscrito: !!u && SN !== 'antes', minha_situacao: !u ? null : SN === 'andamento' ? 'andamento' : SN === 'entregue' ? 'entregue' : null,
  }],
  sn_inscrever: () => [200, { inscrito_em: '2026-10-19T15:00:00Z', inscritos: 1241 }],
  sn_cancelar_inscricao: () => [200, { inscrito_em: null, inscritos: 1240 }],
  sn_iniciar: () => [200, { edicao: '2026-10', iniciado_em: snMinha()?.iniciado_em ?? SN_AGORA[SN], prazo_em: snMinha()?.prazo_em ?? '2026-10-26T19:00:00Z', duracao_min: 120,
    itens: snEdicao.map(({ ordem, id_questao, permutacao }) => ({ ordem, id_questao, permutacao })),
    respostas: Object.fromEntries(snEdicao.slice(0, 14).map((i) => [i.id_questao, i.marcada ?? 'A'])), revisar: [snEdicao[3].id_questao, snEdicao[8].id_questao] }],
  sn_salvar: () => [200, { salvo_em: SN_AGORA[SN] }],
  sn_entregar: () => [200, { acertos: 38, total: 50, segundos: 5520, no_tempo: true, por_area: {} }],
  sn_resultado: () => {
    const por = {}
    for (const i of snEdicao) { por[i.area] ??= { certas: 0, total: 0 }; por[i.area].total++; if (i.marcada === i.gabarito) por[i.area].certas++ }
    // Uma área mais fraca, para o "onde rende revisar".
    const fraca = por['Ortopedia pediátrica']; if (fraca) fraca.certas = Math.min(fraca.certas, 3)
    const medias = { 'Trauma adulto': 64, 'Ortopedia pediátrica': 58, 'Mão e punho': 61, 'Ombro e cotovelo': 66 }
    return [200, { acertos: 38, total: 50, segundos: 5520, no_tempo: true, entregue_em: '2026-10-26T16:02:00Z', posicao: SN === 'encerrado' ? 14 : 12, colocados: SN === 'encerrado' ? 388 : 214,
      percentil: 94, media: 61.4, media_segundos: 6100, por_area: Object.entries(por).map(([area, v]) => ({ area, ...v, media: medias[area] ?? 60 })), encerrada: SN === 'encerrado' }]
  },
  sn_gabarito: () => [200, snEdicao.map(({ ordem, id_questao, permutacao, gabarito, marcada }) => ({ ordem, id_questao, permutacao, gabarito, marcada }))],
  sn_ranking: (u) => {
    if (SN === 'ausente') return snAusente()
    if (SN === 'antes' || SN === 'inscrito') return [200, { colocados: 0, top: [], voce: null, melhores_por_area: [] }]
    const nomes = ['Marina A.', 'Rafael T.', 'Camila S.', 'Pedro H.', 'Luísa M.', 'Gustavo R.', 'Beatriz F.', 'Thiago L.', 'Juliana C.', 'Henrique B.']
    const top = nomes.map((apelido, i) => ({ posicao: i + 1, apelido, acertos: 47 - Math.floor(i * 0.9), total: 50, segundos: 4200 + i * 310, eh_voce: false }))
    const comVoce = u && (SN === 'entregue' || SN === 'encerrado')
    return [200, { colocados: SN === 'encerrado' ? 388 : 214, top, voce: comVoce ? { posicao: SN === 'encerrado' ? 14 : 12, acertos: 38, total: 50, segundos: 5520 } : null,
      melhores_por_area: [{ area: 'Trauma adulto', apelido: 'Marina A.', certas: 10, total: 10 }, { area: 'Ortopedia pediátrica', apelido: 'Pedro H.', certas: 9, total: 9 }, { area: 'Mão e punho', apelido: 'Camila S.', certas: 6, total: 6 }, { area: 'Coluna', apelido: 'Luísa M.', certas: 3, total: 3 }] }]
  },
}
const SEM_ASSINATURA = process.argv.includes('--sem-assinatura')
const rpcs = {
  sincronizar_progresso: (u, a) => sincronizar(u, a.alteracoes),
  ler_progresso_desde: (u, a) => [200, linhas.filter((l) => l.usuario_id === u && l.versao > a.p_cursor).sort((x, y) => x.versao - y.versao).slice(0, Math.min(a.p_limite ?? 500, 1000)).map(copia)],
  // --sem-assinatura: a conta de exemplo entra, mas sem assinatura (o que o usuário gratuito vê).
  obter_acesso_premium: () => [200, [SEM_ASSINATURA ? { premium: false, motivo: 'nenhum', recursos_exclusivos: true, pagamentos_ativos: true } : { premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }]],
  obter_estado_conta: () => [200, [SEM_ASSINATURA ? { status_assinatura: null, cancelar_ao_fim: false, fim_periodo: null } : { status_assinatura: 'ativa', cancelar_ao_fim: false, fim_periodo: null }]],
  sinal_aparelho: () => [200, [{ ativo: true, outro_aparelho: null }]],
  autorizar_resposta: () => [200, [SEM_ASSINATURA ? { permitido: true, restantes: 20, limite: 20, premium: false } : { permitido: true, restantes: 999, limite: null, premium: true }]],
  obter_ranking_com_movimento: (_u, a) => [200, rankingExemplo(a.periodo, true)],
  obter_ranking_publico: (_u, a) => [200, rankingExemplo(a.periodo, true)],
  obter_ranking_visitante: (_u, a) => [200, rankingExemplo(a.periodo, false)],
  minha_posicao_ranking: (_u, a) => { const eu = rankingExemplo(a.periodo, true).find((l) => l.eh_voce); return [200, eu ? [{ posicao: eu.posicao, total: eu.total, total_geral: eu.total_geral }] : []] },
  meus_feitos: () => [200, { conquistas: [], dias: {}, indicados_assinantes: 0, indicados_30_dias: 0, simulado_edicoes: [], simulado_participacoes: [], ranking_semana: [], relatos_resolvidos: 0, comentarios_avaliados: 0, contra_corrente: 0, plano: null }],
}
// --admin: a conta de exemplo é administradora; o painel do Simulado Nacional (sn_admin_*) responde com
// edições de exemplo guardadas em memória (outubro no ar, novembro em rascunho), com questões reais do acervo.
const ADMIN = process.argv.includes('--admin')
let snEdicoes = null
function snExemplo() {
  if (snEdicoes) return snEdicoes
  const { readFileSync } = require_('node:fs')
  const indice = JSON.parse(readFileSync(new URL('../public/acervo/indice.json', import.meta.url), 'utf8'))
  const oficiais = new Set(['TEOT', 'TARO', 'TEOT/TARO'].map((p) => indice.provas.indexOf(p)))
  const porTema = new Map()
  for (const t of indice.temas) {
    const dados = JSON.parse(readFileSync(new URL(`../public/acervo/${t.arquivo}`, import.meta.url), 'utf8'))
    const boas = new Set((Array.isArray(dados) ? dados : dados.questoes).filter((q) => /^[A-E]$/.test(q.gabarito ?? '') && !q.anulada && !q.figuraPendente).map((q) => q.id))
    porTema.set(t.slug, indice.questoes.filter((q) => !q.dup && q.an !== 1 && q.sim !== 1 && oficiais.has(q.p) && boas.has(q.id)).map((q) => q.id))
  }
  const ids = []
  for (let k = 0; ids.length < 50; k++) for (const lista of porTema.values()) if (lista[k * 7] && ids.length < 50) ids.push(lista[k * 7])
  const base = { tipo: 'mensal', descricao: null, destaque_inicio: true, config: {}, duracao_min: 120, total: 50, media: null }
  snEdicoes = [
    { ...base, edicao: '2026-11', titulo: 'Simulado Nacional · Novembro de 2026', aberto_a_todos: false, abre_em: '2026-11-01T03:00:00Z', fecha_em: '2026-12-01T02:59:59Z', publicado: false, inscritos: 0, participantes: 0, entregas: 0, ids: ids.slice().reverse() },
    { ...base, edicao: '2026-10', titulo: 'Simulado Nacional · Outubro de 2026', descricao: 'A edição de lançamento, aberta a todas as contas.', aberto_a_todos: true, abre_em: '2026-10-25T11:00:00Z', fecha_em: '2026-11-01T02:59:59Z', publicado: true, inscritos: 412, participantes: 187, entregas: 163, media: 61.4, ids },
  ]
  return snEdicoes
}
const snResumo = (e) => ({ ...e, total: e.ids.length })
const snMudar = (edicao, mudar) => { const e = snExemplo().find((x) => x.edicao === edicao); if (!e) return [400, { code: 'P0001', message: 'edicao_invalida' }]; mudar(e); return [200, snResumo(e)] }
const rpcsAdmin = {
  eh_administrador: () => [200, true],
  listar_assinaturas_admin: () => [200, []],
  sn_admin_listar: () => [200, snExemplo().map(snResumo)],
  sn_admin_salvar: (_u, a) => {
    const lista = snExemplo()
    const nova = { edicao: a.p_edicao, tipo: a.p_tipo, titulo: a.p_titulo, descricao: a.p_descricao || null, destaque_inicio: a.p_destaque_inicio, config: a.p_config, aberto_a_todos: a.p_aberto_a_todos,
      abre_em: a.p_abre_em, fecha_em: a.p_fecha_em, duracao_min: a.p_duracao_min, publicado: a.p_publicar, inscritos: 0, participantes: 0, entregas: 0, media: null, ids: a.p_itens.map((i) => i.id_questao) }
    snEdicoes = [nova, ...lista.filter((e) => e.edicao !== nova.edicao)]
    return [200, snResumo(nova)]
  },
  sn_admin_config: (_u, a) => snMudar(a.p_edicao, (e) => { e.titulo = a.p_titulo ?? e.titulo; e.descricao = a.p_descricao ?? e.descricao; e.destaque_inicio = a.p_destaque_inicio ?? e.destaque_inicio; e.aberto_a_todos = a.p_aberto_a_todos ?? e.aberto_a_todos }),
  sn_admin_datas: (_u, a) => snMudar(a.p_edicao, (e) => { e.abre_em = a.p_abre_em ?? e.abre_em; e.fecha_em = a.p_fecha_em ?? e.fecha_em }),
  sn_admin_publicar: (_u, a) => snExemplo().find((x) => x.edicao === a.p_edicao)?.participantes ? [400, { code: 'P0001', message: 'edicao_com_participantes' }] : snMudar(a.p_edicao, (e) => { e.publicado = a.p_publicado }),
  sn_admin_trocar_item: (_u, a) => snMudar(a.p_edicao, (e) => { e.ids[a.p_ordem - 1] = a.p_item.id_questao }),
  sn_admin_estatisticas: (_u, a) => {
    const e = snExemplo().find((x) => x.edicao === a.p_edicao)
    const areas = [['Trauma adulto', 66], ['Ortopedia pediátrica', 58], ['Mão e punho', 63], ['Ombro e cotovelo', 71], ['Tumores', 49], ['Pé e tornozelo', 60], ['Coluna', 55], ['Joelho', 68], ['Conceitos básicos', 74], ['Quadril', 57], ['Osteometabólicas', 44]]
    return [200, { inscritos: e.inscritos, participantes: e.participantes, entregas: e.entregas, no_tempo: Math.max(0, e.entregas - 4), media: e.media,
      por_area: e.entregas ? areas.map(([area, pct]) => ({ area, certas: pct * 8, total: 800, media: pct })) : [],
      mais_erradas: e.entregas ? e.ids.slice(3, 13).map((id, i) => ({ id_questao: id, ordem: 4 + i, erros: 141 - i * 9, total: 159 })) : [] }]
  },
}
const require_ = (await import('node:module')).createRequire(import.meta.url)
async function atender(rota) {
  const pedido = rota.request()
  const url = new URL(pedido.url())
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
  if (pedido.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: cors })
  const token = (pedido.headers().authorization ?? '').replace(/^Bearer /, '')
  const usuario = token.startsWith('tok-') ? token.slice(4) : null
  const responder = (status, corpo) => rota.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
  if (url.pathname.startsWith('/auth/v1/user')) return responder(200, usuarioFalso(usuario ?? CONTA))
  if (url.pathname.startsWith('/auth/v1/')) return responder(200, {})
  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1]
  if (rpc === 'obter_ranking_visitante') return responder(200, rankingExemplo(JSON.parse(pedido.postData() || '{}').periodo, false))
  if (rpc && rpc.startsWith('sn_') && !(ADMIN && rpcsAdmin[rpc])) {
    if (!SN) return responder(404, { code: 'PGRST202', message: `Could not find the function public.${rpc}` })
    if (!snRpcs[rpc] || (!usuario && !['sn_obter', 'sn_destaque_inicio', 'sn_ranking'].includes(rpc))) return responder(401, { code: '42501', message: 'autenticacao_necessaria' })
    const [st, corpo] = snRpcs[rpc](usuario, JSON.parse(pedido.postData() || '{}'))
    return responder(st, corpo)
  }
  if (!usuario) return responder(401, { code: '42501', message: 'permission denied' })
  if (ADMIN && rpc && rpcsAdmin[rpc]) { const [s, c] = rpcsAdmin[rpc](usuario, JSON.parse(pedido.postData() || '{}')); return responder(s, c) }
  if (rpc && rpcs[rpc]) { const [s, c] = rpcs[rpc](usuario, JSON.parse(pedido.postData() || '{}')); return responder(s, c) }
  if (rpc) return responder(200, null)
  return responder(200, [])
}
function usuarioFalso(id) {
  return { id, aud: 'authenticated', role: 'authenticated', email: 'tales@exemplo.com', app_metadata: { provider: 'email' }, user_metadata: { nome: 'Tales' }, created_at: '2026-09-01T00:00:00Z' }
}
const marcasNoServidor = () => linhas.filter((l) => l.tipo === 'biblioteca' && l.item.startsWith('m.') && l.valor && !l.valor.apagadaEm)

// ---------------- Site e navegador ----------------
const site = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []

const args = process.argv.slice(2)
const ROTA = args[0] ?? '/'
const PREF = args[1] ?? 'tela'
const iPasta = args.indexOf('--pasta')
const TELAS = (iPasta >= 0 ? args[iPasta + 1] : '/tmp/telas').replace(/\/?$/, '/')
const SEM_CONTA = args.includes('--sem-conta')
const TEMA = args.includes('--escuro') ? 'escuro' : 'claro'
const { mkdirSync } = await import('node:fs')
mkdirSync(TELAS, { recursive: true })
// --com-dados: 420 respostas de exemplo nos últimos 40 dias (65% de acerto), para desempenho, ranking e cronograma,
// e 37 favoritas (30 respondidas, 7 novas) para /favoritas.
const COM_DADOS = args.includes('--com-dados')
// --roteiro ARQ.mjs: o arquivo exporta default async (pagina, foto) e fotografa cada passo de um fluxo
// (foto('sufixo') salva a dobra como <prefixo>-<sufixo>-<cel|pc>.png).
const iRoteiro = args.indexOf('--roteiro')
const roteiro = iRoteiro >= 0 ? (await import(new URL(args[iRoteiro + 1], `file://${process.cwd()}/`).href)).default : null
let respondidasExemplo = null
let favoritosExemplo = null
if (COM_DADOS) {
  const { readFileSync } = await import('node:fs')
  const indice = JSON.parse(readFileSync(new URL('../public/acervo/indice.json', import.meta.url), 'utf8'))
  const ids = indice.questoes.map((q) => q.id ?? q.i).filter(Boolean)
  let semente = 7
  const sorte = () => (semente = (semente * 16807) % 2147483647) / 2147483647
  respondidasExemplo = {}
  const agora = Date.now()
  for (let k = 0; k < 420 && ids.length; k++) {
    const id = ids[Math.floor(sorte() * ids.length)]
    const em = agora - Math.floor(sorte() * 40 * 86400000)
    const c = sorte() < 0.65
    respondidasExemplo[id] = { c, q: em, tentativas: 1, acertos: c ? 1 : 0, erros: c ? 0 : 1, sequencia: c ? 1 : 0, proximaRevisao: em + (c ? 10 : 1) * 86400000, confianca: c ? 'seguro' : 'duvida', historico: [{ em, correta: c, confianca: c ? 'seguro' : 'duvida' }] }
  }
  // Favoritas de exemplo: 30 já respondidas (acertos e erros) e 7 ainda novas, para a página /favoritas.
  const feitas = Object.keys(respondidasExemplo)
  favoritosExemplo = [...feitas.filter((_, i) => i % 9 === 0).slice(0, 30), ...ids.filter((id) => !respondidasExemplo[id]).filter((_, i) => i % 97 === 0).slice(0, 7)]
}
const ESCONDER = '.aviso-termos, .aviso-cookies, [class*="AvisoTermos"], [class*="aviso-termos"], vite-error-overlay { display: none !important; }'
for (const [nome, vp, esc] of [['cel', { width: 390, height: 844 }, 2], ['pc', { width: 1440, height: 900 }, 1]]) {
  const contexto = await navegador.newContext({ viewport: vp, colorScheme: args.includes('--sistema-escuro') ? 'dark' : 'light', deviceScaleFactor: esc, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: vp.width < 600 })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: { ...usuarioFalso(CONTA), user_metadata: { nome: 'Tales', termos_versao: 999 } } }
  await contexto.addInitScript(([s, t, sem, r, c, f]) => {
    if (!sem) localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
    localStorage.setItem('ortoquestoes:tema', JSON.stringify(t))
    localStorage.setItem('oq-termos-adiado', String(Date.now()))
    if (r && !sem) localStorage.setItem(`ortoquestoes:conta:${c}:respondidas`, r)
    if (f && !sem) localStorage.setItem(`ortoquestoes:conta:${c}:favoritos`, f)
  }, [JSON.stringify(sessaoAuth), TEMA, SEM_CONTA, respondidasExemplo ? JSON.stringify(respondidasExemplo) : null, CONTA, favoritosExemplo ? JSON.stringify(favoritosExemplo) : null])
  // --agora ISO: fixa o relógio da página (ex.: o aviso do dia 25 no painel).
  const iAgora = args.indexOf('--agora')
  if (iAgora >= 0) await contexto.clock.setFixedTime(new Date(args[iAgora + 1]))
  if (SN && iAgora < 0) await contexto.clock.setFixedTime(new Date(SN_AGORA[SN]))
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  await p.goto(`${BASE}#${ROTA}`); await p.waitForTimeout(4000); await p.addStyleTag({ content: ESCONDER }); await p.waitForTimeout(400)
  if (roteiro) await roteiro(p, (sufixo, opcoes = {}) => p.screenshot({ path: TELAS + `${PREF}-${sufixo}-${nome}.png`, ...opcoes }), nome)
  else {
    await p.screenshot({ path: TELAS + `${PREF}-${nome}.png`, fullPage: true })
    await p.screenshot({ path: TELAS + `${PREF}-${nome}-dobra.png` })
  }
  await contexto.close()
}
console.log(erros.length ? erros : 'sem erros', '→', TELAS + PREF + '-{cel,pc}[-dobra].png')
await navegador.close(); await site.close()
