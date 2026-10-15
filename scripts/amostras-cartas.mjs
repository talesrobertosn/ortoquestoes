// Gera docs/emails/MODELOS.md: amostras das cartas para pessoas fictícias, em todas as faixas
// de acerto e situações, mais a contagem de variações. Rodar: node scripts/amostras-cartas.mjs
import { build } from 'esbuild'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-amostras-'))
const arquivo = join(pasta, 'c.mjs')
try {
  await build({
    stdin: { contents: `export * from './supabase/functions/_shared/cartas.ts'\nexport * as auto from './supabase/functions/_shared/modelo-email.ts'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const HOJE = new Date('2026-10-15T15:00:00-03:00')
  const SITE = 'https://ortoquestoes.com.br/'
  const obrigadoJa = [{ tipo: 'carta', modelo: 'obrigado_assinatura', versao: 'obrigado_assinatura#v1', em: '2026-09-01T12:00:00Z', status: 'enviado' }]

  /** Pessoas fictícias (nomes e números inventados para a documentação). */
  const pessoa = (nome, acerto, extra = {}) => ({
    nome, respondidas: 260, acertos: Math.round(acerto * 2.6), erros: Math.round((100 - acerto) * 2.6), semana: 35, diasParado: 1, diasConta: 70, ...extra,
  })
  const FAIXAS = {
    '0-10': pessoa('Caio Mendes', 6, { respondidas: 48, acertos: 3, erros: 45, semana: 0 }),
    '10-20': pessoa('Lívia Rocha', 16, { situacao: 'residente', ano: 'r1', provas: ['taro'] }),
    '20-30': pessoa('Diego Farias', 26, { horas: [{ hora: 23, n: 30 }, { hora: 0, n: 22 }, { hora: 1, n: 14 }] }),
    '30-40': pessoa('Marina Teles', 36, { areas: [{ slug: 'trauma', total: 80, certas: 34 }, { slug: 'pediatria', total: 40, certas: 9 }] }),
    '40-60': pessoa('Rafael Couto', 52, { situacao: 'residente', ano: 'r2', provas: ['taro'], areas: [{ slug: 'joelho', total: 60, certas: 40 }, { slug: 'coluna', total: 30, certas: 9 }], sequencia: 5 }),
    '60-70': pessoa('Beatriz Lins', 66, { areas: [{ slug: 'mao', total: 120, certas: 92 }, { slug: 'quadril', total: 30, certas: 15 }], horas: [{ hora: 12, n: 40 }, { hora: 13, n: 20 }, { hora: 20, n: 10 }] }),
    '70-80': pessoa('Pedro Alves', 75, { situacao: 'residente', ano: 'r3', provas: ['teot'], posicaoRanking: 31, areas: [{ slug: 'tumores', total: 30, certas: 27 }, { slug: 'trauma', total: 90, certas: 63 }] }),
    '80-90': pessoa('Júlia Prado', 84, { respondidas: 1450, acertos: 1218, erros: 232, posicaoRanking: 7, sequencia: 21, flashcards: 300 }),
    '90-100': pessoa('Henrique Sá', 93, { respondidas: 160, acertos: 149, erros: 11, semana: 40, situacao: 'ortopedista', provas: ['atualizacao'] }),
  }

  const linhas = ['# Cartas: amostras e variações', '',
    '> Gerado por `node scripts/amostras-cartas.mjs` em ' + HOJE.toISOString().slice(0, 10) + '. Pessoas e números fictícios.',
    '> Cada amostra é uma das versões possíveis: no painel, "Sortear outra versão" troca o texto.', '',
    'Todas as cartas saem só em texto, com a assinatura fixa "Um abraço, / Tales, do Orto Questões", no máximo um link e nenhum preço.', '']

  // Variedade: textos distintos em 400 sorteios para cada faixa e situação.
  const contar = (perfil, tipo) => {
    const textos = new Set(), assuntos = new Set()
    for (let s = 1; s <= 400; s++) { const c = m.gerarCarta(perfil, { tipo, semente: s, anteriores: obrigadoJa, hoje: HOJE, site: SITE }); textos.add(c.corpo); assuntos.add(c.assunto) }
    return `${textos.size} textos e ${assuntos.size} assuntos diferentes em 400 sorteios`
  }
  linhas.push('## Quantas variações', '', '| Situação | Versões completas | Variedade medida |', '|---|---|---|')
  for (const [faixa, p] of Object.entries(FAIXAS)) linhas.push(`| Estudando, faixa ${m.ROTULO_FAIXA[faixa]} | ${m.versoesDe('ativo', faixa).length} | ${contar({ ...p, assinante: true }, 'ativo')} |`)
  const rica = { ...FAIXAS['70-80'], horas: [{ hora: 21, n: 50 }, { hora: 22, n: 40 }], sequencia: 6, flashcards: 80, limiteGratisLigado: true }
  for (const tipo of m.TIPOS_MANUAIS.filter(t => t !== 'ativo')) {
    const p = tipo === 'nunca_comecou' ? { nome: 'Ana', respondidas: 0, diasConta: 6, diasParado: null, provas: ['teot'] } : tipo === 'sumiu' ? { ...rica, diasParado: 24 } : tipo === 'comecou_parou' ? { ...rica, respondidas: 14, diasParado: 6 } : tipo === 'marco' ? { ...rica, respondidas: 506 } : rica
    linhas.push(`| ${m.TIPOS[tipo].rotulo} | ${m.versoesDe(tipo, null).length} | ${contar(p, tipo)} |`)
  }
  linhas.push('')

  const mostrar = (titulo, descricao, carta) => {
    const e = m.renderizarCarta({ assunto: carta.assunto, corpo: carta.corpo })
    linhas.push(`### ${titulo}`, '', descricao, '', `**Assunto:** ${carta.assunto}  `, `*Versão ${carta.versao}${carta.personalizacao.length ? ` · personalizada com: ${carta.personalizacao.join(', ')}` : ''}*`, '', '```text', e.texto, '```', '')
  }

  linhas.push('## Uma carta para cada faixa de acerto', '', 'Pessoas assinantes que já receberam o agradecimento (por isso a carta é a da faixa).', '')
  for (const [faixa, p] of Object.entries(FAIXAS)) {
    const c = m.gerarCarta({ ...p, assinante: true }, { semente: 11, anteriores: obrigadoJa, hoje: HOJE, site: SITE })
    mostrar(`Faixa ${m.ROTULO_FAIXA[faixa]}: ${p.nome}`, `${p.respondidas.toLocaleString('pt-BR')} questões, ${Math.round(100 * p.acertos / (p.acertos + p.erros))}% de acerto.`, c)
  }

  linhas.push('## Situações', '')
  const casos = [
    ['Criou a conta e não começou', 'Ana Beatriz, conta de 6 dias, quer o TEOT, nenhuma questão.', { nome: 'Ana Beatriz', respondidas: 0, diasConta: 6, diasParado: null, provas: ['teot'], situacao: 'residente', ano: 'r3' }, 'nunca_comecou'],
    ['Boas-vindas', 'Tiago, conta de 2 dias, 12 questões.', { nome: 'Tiago', respondidas: 12, diasConta: 2, diasParado: 0, provas: ['taro'] }, 'boas_vindas'],
    ['Começando', 'Sem nome no cadastro, 18 questões, ativo.', { nome: null, respondidas: 18, diasConta: 20, diasParado: 0 }, 'comecando'],
    ['Começou e parou', 'Clara, 9 questões, 6 dias sem aparecer.', { nome: 'Clara', respondidas: 9, diasConta: 25, diasParado: 6 }, 'comecou_parou'],
    ['Sumiu', 'Otávio, 340 questões, 24 dias sem aparecer, ótimo em joelho.', { ...pessoa('Otávio Reis', 68), respondidas: 340, diasParado: 24, areas: [{ slug: 'joelho', total: 70, certas: 58 }] }, 'sumiu'],
    ['Obrigado pela assinatura', 'Fernanda acabou de assinar.', { ...pessoa('Fernanda Luz', 71), assinante: true }, 'obrigado_assinatura'],
    ['Convite (mais de 20 questões)', 'Gabriel, 34 questões, não assina.', { nome: 'Gabriel', respondidas: 34, acertos: 21, erros: 13, diasConta: 12, diasParado: 0, limiteGratisLigado: true }, 'convite_20'],
    ['Convite pessoal (mais de 50 questões)', 'Pedro, 260 questões, 75%, 31º no ranking, R3, TEOT, ótimo em tumores.', { ...FAIXAS['70-80'], limiteGratisLigado: true }, 'convite_50'],
    ['Convite pessoal (mais de 50), outra pessoa', 'Larissa, 180 questões, 48%, estuda à noite, usa flashcards.', { ...pessoa('Larissa Melo', 48), respondidas: 180, horas: [{ hora: 21, n: 60 }, { hora: 22, n: 30 }], flashcards: 120, limiteGratisLigado: true }, 'convite_50'],
    ['Reta final', 'Pedro, R3, TEOT, faltando 87 dias.', FAIXAS['70-80'], 'reta_final'],
    ['Marco de 500 questões', 'Júlia passou de 500.', { ...FAIXAS['80-90'], respondidas: 507 }, 'marco'],
    ['Pedir opinião', 'Júlia, 1.450 questões.', FAIXAS['80-90'], 'opiniao'],
    ['Pedir para indicar', 'Rafael, R2.', FAIXAS['40-60'], 'indicar'],
    ['Apresentar o cronograma', 'Pedro, TEOT.', FAIXAS['70-80'], 'cronograma'],
  ]
  for (const [titulo, descricao, p, tipo] of casos) mostrar(titulo, descricao, m.gerarCarta(p, { tipo, semente: 5, hoje: HOJE, site: SITE }))

  linhas.push('## Automáticos (agora em forma de carta)', '')
  const desc = 'https://ortoquestoes.com.br/#/emails?u=…&t=…'
  const auto = (titulo, descricao, e) => linhas.push(`### ${titulo}`, '', descricao, '', `**Assunto:** ${e.assunto}`, '', '```text', e.texto, '```', '')
  auto('Parabéns automático (emblema de 100 questões)', 'Sai sozinho ao passar do marco, uma vez por emblema.', m.auto.emailMarco({ nome: 'Lívia Rocha', marco: m.auto.MARCOS[1], respondidas: 104, acertos: 70, erros: 34, respondidas7d: 40, site: SITE, linkDescadastro: desc }))
  auto('Lembrete: criou a conta e não começou', 'Campanha "Primeira missão".', m.auto.emailLembrete({ campanha: 'nunca', nome: 'Ana', respondidas: 0, diasFora: 2, site: SITE, linkDescadastro: desc, referencia: 'nunca' }))
  auto('Lembrete: 4 dias sem aparecer', 'Campanha "Fogueira apagando".', m.auto.emailLembrete({ campanha: 'tres_dias', nome: 'Bruno', respondidas: 230, diasFora: 4, site: SITE, linkDescadastro: desc, referencia: 'tres:2026-10-11' }))
  auto('Lembrete: 12 dias sem aparecer', 'Campanha "Retomar a jornada".', m.auto.emailLembrete({ campanha: 'sete_dias', nome: 'Carla', respondidas: 90, diasFora: 12, site: SITE, linkDescadastro: desc, referencia: 'sete:2026-10-03' }))
  auto('Pix: faltam 3 dias', 'Renovação do Pix.', m.auto.emailLembrete({ campanha: 'renovacao_pix', nome: 'Diego', respondidas: 610, acertos: 420, respondidas7d: 70, diasFora: 0, diasRestantes: 3, fimEm: '2026-10-18T15:00:00Z', plano: 'semestral', site: SITE, linkDescadastro: desc, referencia: 'pix' }))
  auto('Pix: termina hoje', 'Último aviso.', m.auto.emailLembrete({ campanha: 'renovacao_pix_hoje', nome: 'Diego', respondidas: 610, acertos: 420, respondidas7d: 70, diasFora: 0, diasRestantes: 0, fimEm: '2026-10-15T15:00:00Z', plano: 'mensal', site: SITE, linkDescadastro: desc, referencia: 'pix-hoje' }))
  const rel = { nome: 'Marina', mes: '2026-10-q1', respostas: 84, certas: 60, erradas: 24, dias_ativos: 6, respostas_anterior: 50, certas_anterior: 30, erradas_anterior: 20, total_acumulado: 900,
    temas: [{ tema: 'joelho', certas: 40, total: 50, certas_ant: 25, total_ant: 40 }, { tema: 'tumores', certas: 8, total: 20, certas_ant: 12, total_ant: 20 }], simulado: null, site: SITE, linkDescadastro: desc }
  auto('Resumo quinzenal', 'Para quem estudou na quinzena.', m.auto.emailRelatorio(rel))
  auto('Relatório do mês, assinante que não estudou', 'Antes dizia "0 questões"; agora não cita número.', m.auto.emailRelatorio({ ...rel, mes: '2026-09', respostas: 0, certas: 0, erradas: 0, dias_ativos: 0, temas: [] }))
  auto('Aviso de relato resolvido', 'Resposta a quem relatou um erro.', m.auto.emailRelatoResolvido({ nome: 'Bruno', idQuestao: 'trauma-0044', relato: 'O gabarito parece trocado com a letra C.', nota: 'O gabarito foi conferido com a prova oficial e corrigido para C.', site: SITE }))

  await mkdir('docs/emails', { recursive: true })
  await writeFile('docs/emails/MODELOS.md', linhas.join('\n'))
  console.log('docs/emails/MODELOS.md')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
