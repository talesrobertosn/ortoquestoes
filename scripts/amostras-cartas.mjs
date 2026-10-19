// Gera docs/emails/MODELOS.md: amostras das cartas para pessoas fictícias, em todas as faixas
// de acerto e situações (inclusive os seis automáticos novos de 17/10/2026 e as nove campanhas diárias
// da parte 31), mais a contagem de
// variações. Rodar: node scripts/amostras-cartas.mjs
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
  const HOJE = new Date('2026-10-17T12:00:00-03:00')
  const SITE = 'https://ortoquestoes.com.br/'
  const obrigadoJa = [{ tipo: 'carta', modelo: 'obrigado_assinatura', versao: 'obrigado_assinatura#v1', em: '2026-09-01T12:00:00Z', status: 'enviado' }]
  const EXTRAS = {
    pix: { diasRestantes: 3, fimEm: '2026-10-20T15:00:00Z', plano: 'semestral' },
    pagamento: { plano: 'semestral', inicioEm: '2026-10-17T12:00:00Z', fimEm: '2027-04-17T12:00:00Z', meio: 'cartao', renovacao: false },
    encerramento: { reembolso: false, fimEm: '2026-11-17T12:00:00Z' },
    relatorio: { rotulo: 'de 1 a 15 de outubro', em: 'de 1 a 15 de outubro', frase: 'Entre 1 e 15 de outubro', quinzena: true, respostas: 84, certas: 60, erradas: 24, diasAtivos: 6, respostasAnterior: 50, acertoAnterior: 60, totalAcumulado: 900, subiram: [{ slug: 'joelho', antes: 62, agora: 79 }], cairam: [], maisFraco: { slug: 'tumores', acerto: 40 }, simulado: null },
  }
  const gerar = (p, op) => m.gerarCarta(p, { hoje: HOJE, site: SITE, ignorarCadencia: true, ...EXTRAS, ...op })

  /** Pessoas fictícias (nomes e números inventados para a documentação). */
  const pessoa = (nome, acerto, extra = {}) => ({
    nome, respondidas: 290, acertos: Math.round(acerto * 2.9), erros: Math.round((100 - acerto) * 2.9), semana: 35, diasParado: 1, diasConta: 70, ...extra,
  })
  const FAIXAS = {
    '0-10': pessoa('Caio Mendes', 6, { respondidas: 48, acertos: 3, erros: 45, semana: 0, situacao: 'residente', ano: 'r1' }),
    '10-20': pessoa('Lívia Rocha', 16, { situacao: 'residente', ano: 'r1', provas: ['taro'], servico: 'Hospital Municipal Miguel Couto' }),
    '20-30': pessoa('Diego Farias', 26, { horas: [{ hora: 23, n: 30 }, { hora: 0, n: 22 }, { hora: 1, n: 14 }] }),
    '30-40': pessoa('Marina Teles', 36, { areas: [{ slug: 'trauma', total: 80, certas: 34 }, { slug: 'pediatria', total: 40, certas: 9 }], resumosLidos: { total: 2, titulos: ['Fraturas do fêmur na criança'] } }),
    '40-60': pessoa('Rafael Couto', 52, { situacao: 'residente', ano: 'r2', provas: ['taro'], areas: [{ slug: 'joelho', total: 60, certas: 40 }, { slug: 'coluna', total: 30, certas: 9 }], sequencia: 5, cidade: 'Curitiba' }),
    '60-70': pessoa('Beatriz Lins', 66, { areas: [{ slug: 'mao', total: 120, certas: 92 }, { slug: 'quadril', total: 30, certas: 15 }], horas: [{ hora: 12, n: 40 }, { hora: 13, n: 20 }, { hora: 20, n: 10 }] }),
    '70-80': pessoa('Pedro Alves', 75, { situacao: 'residente', ano: 'r3', provas: ['teot'], posicaoRanking: 31, areas: [{ slug: 'tumores', total: 30, certas: 27 }, { slug: 'trauma', total: 90, certas: 63 }], horas: [{ hora: 21, n: 50 }, { hora: 22, n: 40 }], diasParaProva: 87, provaCronograma: 'TEOT' }),
    '80-90': pessoa('Júlia Prado', 84, { respondidas: 1450, acertos: 1218, erros: 232, posicaoRanking: 7, sequencia: 21, flashcards: 300, nascimento: '1996-10-18' }),
    '90-100': pessoa('Henrique Sá', 93, { respondidas: 160, acertos: 149, erros: 11, semana: 40, situacao: 'ortopedista', provas: ['atualizacao'] }),
  }

  const linhas = ['# Cartas: amostras e variações', '',
    '> Gerado por `node scripts/amostras-cartas.mjs` em ' + HOJE.toISOString().slice(0, 10) + '. Pessoas e números fictícios.',
    '> Cada amostra é uma das versões possíveis: no painel, "Sortear outra versão" troca o texto.', '',
    'Todas as cartas saem só em texto, na voz de um amigo que entende a rotina de quem estuda (docs/emails/PLANO.md): abertura com o momento da pessoa, o que eu vi no estudo dela (até 3 observações), uma ideia sobre tempo e praticidade, convite leve quando couber, fecho e um P.S. De 6 a 12 linhas, assinatura fixa "Um abraço, / Tales, do Orto Questões", no máximo um link, nenhum preço, nenhum número de questões abaixo de 10, acerto só com 30 questões e de 50% para cima.', '']

  // Variedade: textos distintos em 400 sorteios para cada faixa e situação.
  const contar = (perfil, tipo) => {
    const textos = new Set(), assuntos = new Set()
    for (let s = 1; s <= 400; s++) { const c = gerar(perfil, { tipo, semente: s, anteriores: obrigadoJa, marco: tipo === 'marco' ? 500 : undefined }); textos.add(c.corpo); assuntos.add(c.assunto) }
    return `${textos.size} textos e ${assuntos.size} assuntos diferentes em 400 sorteios`
  }
  linhas.push('## Quantas variações', '', '| Situação | Versões completas | Variedade medida |', '|---|---|---|')
  for (const [faixa, p] of Object.entries(FAIXAS)) linhas.push(`| Estudando, faixa ${m.ROTULO_FAIXA[faixa]} | ${m.versoesDe('ativo', faixa).length} | ${contar({ ...p, assinante: true }, 'ativo')} |`)
  const rica = { ...FAIXAS['70-80'], sequencia: 6, flashcards: 80, limiteGratisLigado: true, servico: 'Hospital das Clínicas', resumosLidos: { total: 3, titulos: ['Fraturas do rádio distal'] } }
  const perfilDoTipo = (tipo) => tipo === 'nunca_comecou' ? { nome: 'Ana', respondidas: 0, diasConta: 6, diasParado: null, provas: ['teot'] }
    : tipo === 'sumiu' || tipo === 'voltou' ? { ...rica, diasParado: 24 }
    : tipo === 'comecou_parou' ? { ...rica, respondidas: 14, diasParado: 6 }
    : tipo === 'pausa' ? { ...rica, diasParado: 4 }
    : tipo === 'marco' ? { ...rica, respondidas: 506 }
    : tipo === 'primeiras_10' || tipo === 'boas_vindas' || tipo === 'boas_vindas_dia0' ? { ...rica, respondidas: 11, diasConta: 1, posicaoRanking: null }
    : tipo === 'comecando' ? { ...rica, respondidas: 22, posicaoRanking: null }
    : rica
  for (const tipo of Object.keys(m.TIPOS).filter((t) => t !== 'ativo')) {
    linhas.push(`| ${m.TIPOS[tipo].rotulo} | ${m.versoesDe(tipo, null).length} | ${contar(perfilDoTipo(tipo), tipo)} |`)
  }
  linhas.push('')

  const mostrar = (titulo, descricao, carta) => {
    const e = m.renderizarCarta({ assunto: carta.assunto, corpo: carta.corpo })
    linhas.push(`### ${titulo}`, '', descricao, '', `**Assunto:** ${carta.assunto}  `, `*Versão ${carta.versao}${carta.personalizacao.length ? ` · personalizada com: ${carta.personalizacao.join(', ')}` : ''}*`, '', '```text', e.texto, '```', '')
  }

  linhas.push('## Uma carta para cada faixa de acerto', '', 'Pessoas assinantes que já receberam o agradecimento (por isso a carta é a da faixa).', '')
  for (const [faixa, p] of Object.entries(FAIXAS)) {
    const c = gerar({ ...p, assinante: true }, { semente: 11, anteriores: obrigadoJa })
    mostrar(`Faixa ${m.ROTULO_FAIXA[faixa]}: ${p.nome}`, `${p.respondidas.toLocaleString('pt-BR')} questões, ${Math.round(100 * p.acertos / (p.acertos + p.erros))}% de acerto.`, c)
  }

  linhas.push('## Situações', '')
  const casos = [
    ['Criou a conta e não começou', 'Ana Beatriz, conta de 6 dias, quer o TEOT, nenhuma questão.', { nome: 'Ana Beatriz', respondidas: 0, diasConta: 6, diasParado: null, provas: ['teot'], situacao: 'residente', ano: 'r3' }, 'nunca_comecou'],
    ['Boas-vindas', 'Tiago, conta de 2 dias, 12 questões.', { nome: 'Tiago', respondidas: 12, diasConta: 2, diasParado: 0, provas: ['taro'] }, 'boas_vindas'],
    ['Começando', 'Sem nome no cadastro, 18 questões, ativo.', { nome: null, respondidas: 18, diasConta: 20, diasParado: 0 }, 'comecando'],
    ['Começou e parou', 'Clara, 7 questões (abaixo de 10: o número não aparece), 6 dias sem aparecer.', { nome: 'Clara', respondidas: 7, diasConta: 25, diasParado: 6 }, 'comecou_parou'],
    ['Sumiu', 'Otávio, 340 questões, 24 dias sem aparecer, ótimo em joelho.', { ...pessoa('Otávio Reis', 68), respondidas: 340, diasParado: 24, areas: [{ slug: 'joelho', total: 70, certas: 58 }] }, 'sumiu'],
    ['Obrigado pela assinatura', 'Fernanda acabou de assinar.', { ...pessoa('Fernanda Luz', 71), assinante: true, provas: ['teot'] }, 'obrigado_assinatura'],
    ['Convite (mais de 20 questões)', 'Gabriel, 34 questões, não assina.', { nome: 'Gabriel', respondidas: 34, acertos: 21, erros: 13, diasConta: 12, diasParado: 0, limiteGratisLigado: true }, 'convite_20'],
    ['Convite pessoal (mais de 50 questões)', 'Pedro, 290 questões, 75%, 31º no ranking, R3, TEOT a 87 dias, estuda à noite, ótimo em tumores.', { ...FAIXAS['70-80'], limiteGratisLigado: true }, 'convite_50'],
    ['Convite pessoal (mais de 50), outra pessoa', 'Larissa, 180 questões, 48% (abaixo de 50%: sem porcentagem), estuda à noite, usa flashcards.', { ...pessoa('Larissa Melo', 48), respondidas: 180, horas: [{ hora: 21, n: 60 }, { hora: 22, n: 30 }], flashcards: 120, limiteGratisLigado: true }, 'convite_50'],
    ['Reta final', 'Pedro, R3, TEOT a 87 dias.', FAIXAS['70-80'], 'reta_final'],
    ['Marco de 500 questões', 'Júlia passou de 500.', { ...FAIXAS['80-90'], respondidas: 507 }, 'marco'],
    ['Pedir opinião', 'Júlia, 1.450 questões.', FAIXAS['80-90'], 'opiniao'],
    ['Pedir para indicar', 'Rafael, R2, de Curitiba.', FAIXAS['40-60'], 'indicar'],
    ['Apresentar o cronograma', 'Pedro, TEOT.', FAIXAS['70-80'], 'cronograma'],
  ]
  for (const [titulo, descricao, p, tipo] of casos) mostrar(titulo, descricao, gerar(p, { tipo, semente: 5 }))

  linhas.push('## Automáticos (em forma de carta)', '')
  const desc = 'https://ortoquestoes.com.br/#/emails?u=…&t=…'
  const auto = (titulo, descricao, e) => linhas.push(`### ${titulo}`, '', descricao, '', `**Assunto:** ${e.assunto}`, '', '```text', e.texto, '```', '')
  auto('Parabéns automático (marco de 100 questões)', 'Sai sozinho ao passar do marco (100, 250, 500, 1.000, 2.000), uma vez por marco.', m.auto.emailMarco({ nome: 'Lívia Rocha', marco: m.auto.MARCOS[1], respondidas: 104, acertos: 70, erros: 34, respondidas7d: 40, site: SITE, linkDescadastro: desc, hoje: HOJE, perfil: FAIXAS['10-20'] }))
  auto('Lembrete: criou a conta e não começou', 'Campanha "Primeira missão".', m.auto.emailLembrete({ campanha: 'nunca', nome: 'Ana', respondidas: 0, diasFora: 2, site: SITE, linkDescadastro: desc, referencia: 'nunca', hoje: HOJE }))
  auto('Lembrete: 4 dias sem aparecer', 'Campanha "Fogueira apagando": cita a área em que a pessoa estava e a Revisão.', m.auto.emailLembrete({ campanha: 'tres_dias', nome: 'Bruno', respondidas: 230, diasFora: 4, site: SITE, linkDescadastro: desc, referencia: 'tres:2026-10-13', hoje: HOJE, perfil: { ...pessoa('Bruno', 64), respondidas: 230, areas: [{ slug: 'joelho', total: 90, certas: 60 }, { slug: 'coluna', total: 20, certas: 12 }] } }))
  auto('Lembrete: 12 dias sem aparecer', 'Campanha "Retomar a jornada".', m.auto.emailLembrete({ campanha: 'sete_dias', nome: 'Carla', respondidas: 90, diasFora: 12, site: SITE, linkDescadastro: desc, referencia: 'sete:2026-10-05', hoje: HOJE }))
  auto('Pix: faltam 3 dias', 'Renovação do Pix, sem urgência: nada se perde.', m.auto.emailLembrete({ campanha: 'renovacao_pix', nome: 'Diego', respondidas: 610, acertos: 420, respondidas7d: 70, diasFora: 0, diasRestantes: 3, fimEm: '2026-10-20T15:00:00Z', plano: 'semestral', site: SITE, linkDescadastro: desc, referencia: 'pix', hoje: HOJE }))
  auto('Pix: termina hoje', 'Último aviso (transacional).', m.auto.emailLembrete({ campanha: 'renovacao_pix_hoje', nome: 'Diego', respondidas: 610, acertos: 420, respondidas7d: 70, diasFora: 0, diasRestantes: 0, fimEm: '2026-10-17T15:00:00Z', plano: 'mensal', site: SITE, linkDescadastro: desc, referencia: 'pix-hoje', hoje: HOJE }))
  const rel = { nome: 'Marina', mes: '2026-10-q1', respostas: 84, certas: 60, erradas: 24, dias_ativos: 6, respostas_anterior: 50, certas_anterior: 30, erradas_anterior: 20, total_acumulado: 900,
    temas: [{ tema: 'joelho', certas: 40, total: 50, certas_ant: 25, total_ant: 40 }, { tema: 'tumores', certas: 8, total: 20, certas_ant: 12, total_ant: 20 }], simulado: null, site: SITE, linkDescadastro: desc }
  auto('Resumo quinzenal', 'Para quem estudou na quinzena: uma história, não uma tabela.', m.auto.emailRelatorio({ ...rel, hoje: HOJE, perfil: { nome: 'Marina', respondidas: 900, horas: [{ hora: 21, n: 50 }, { hora: 22, n: 30 }] } }))
  auto('Relatório do mês, assinante que não estudou', 'Acolhimento; nada se perdeu; dez questões recolocam nos trilhos.', m.auto.emailRelatorio({ ...rel, mes: '2026-09', respostas: 0, certas: 0, erradas: 0, dias_ativos: 0, temas: [], hoje: HOJE }))
  auto('Aviso de relato resolvido', 'Resposta a quem relatou um erro, citando a alternativa.', m.auto.emailRelatoResolvido({ nome: 'Bruno', idQuestao: 'trauma-0044', relato: 'O gabarito parece trocado com a letra C.', nota: 'O gabarito foi conferido com a prova oficial e corrigido para C.', site: SITE }))

  linhas.push('## Automáticos novos (17/10/2026, sem SQL)', '', 'Disparados por um acontecimento (ação `automatico` da função `enviar-email`); idempotentes por pessoa e tipo.', '')
  const novo = (titulo, descricao, d) => auto(titulo, descricao, m.auto.emailAutomatico({ site: SITE, linkDescadastro: desc, hoje: HOJE, semente: 3, ...d }))
  novo('Boas-vindas no dia da confirmação', 'Primeiro login depois de confirmar o e-mail. Ana, R3, TEOT.', { tipo: 'boas_vindas_dia0', nome: 'Ana', respondidas: 0, perfil: { nome: 'Ana', respondidas: 0, situacao: 'residente', ano: 'r3', provas: ['teot'] } })
  novo('Primeiras 10 questões', 'O site avisa ao passar de 10 (como o marco).', { tipo: 'primeiras_10', nome: 'Tiago', respondidas: 11, perfil: { nome: 'Tiago', respondidas: 11, provas: ['taro'], situacao: 'residente', ano: 'r1' } })
  novo('Que bom te ver de volta', 'Primeiro login depois de 10 dias ou mais fora. Otávio, 340 questões, ótimo em joelho.', { tipo: 'voltou', nome: 'Otávio Reis', respondidas: 340, diasFora: 24, perfil: { ...pessoa('Otávio Reis', 68), respondidas: 340, diasParado: 24, areas: [{ slug: 'joelho', total: 70, certas: 58 }] } })
  novo('Cronograma pronto', 'No dia em que monta o plano. Pedro, TEOT a 87 dias.', { tipo: 'cronograma_pronto', nome: 'Pedro Alves', respondidas: 260, diasParaProva: 87, provaCronograma: 'TEOT', perfil: FAIXAS['70-80'] })
  novo('Pagamento aprovado', 'Recibo gentil (webhook do Mercado Pago): plano, período, o que libera, link do cronograma. Sem valor.', { tipo: 'pagamento_aprovado', nome: 'Fernanda Luz', respondidas: 260, pagamento: EXTRAS.pagamento, referencia: 'pg:123' })
  novo('Obrigado pelo tempo de assinatura', 'Cancelamento ou reembolso: porta aberta.', { tipo: 'obrigado_tempo', nome: 'Fernanda Luz', respondidas: 260, encerramento: EXTRAS.encerramento, perfil: { ...pessoa('Fernanda Luz', 71), areas: [{ slug: 'mao', total: 60, certas: 50 }] } })

  linhas.push('## Campanhas diárias (parte 31, 18/10/2026)', '', 'O banco escolhe quem recebe (`candidatos_<tipo>`, já sem administrador, e-mail não confirmado, quem desligou as cartas, quem recebeu a mesma referência e quem está no teto de cadência) e o agendador manda às 7h pela ação `campanhas_diarias`, pelo mesmo caminho dos automáticos.', '')
  const julia = FAIXAS['80-90'], pedro = FAIXAS['70-80'], beatriz = FAIXAS['60-70']
  novo('Assinou e não montou o cronograma', 'Três dias depois de assinar, sem cronograma. Fernanda, TEOT.', { tipo: 'assinou_sem_cronograma', nome: 'Fernanda Luz', respondidas: 120, perfil: { ...pessoa('Fernanda Luz', 71), respondidas: 120, assinante: true, provas: ['teot'] } })
  novo('Assinante parado há 7 dias', 'Bruno assina e está há 9 dias sem responder.', { tipo: 'assinante_parado_7', nome: 'Bruno', respondidas: 230, diasFora: 9, perfil: { ...pessoa('Bruno', 64), respondidas: 230, assinante: true, areas: [{ slug: 'joelho', total: 90, certas: 60 }] } })
  novo('Lembrete do Simulado Nacional', 'Pedro se inscreveu no simulado de outubro, que abre amanhã (50 questões, duas horas).', { tipo: 'simulado_lembrete', nome: 'Pedro Alves', respondidas: 290, perfil: pedro, campanha: { lembrete: { edicao: '2026-10', titulo: 'Simulado Nacional · Outubro de 2026', tipo_lembrete: 'abre_amanha', fecha_em: '2026-11-01T02:59:59Z', total: 50, duracao_min: 120, precisa_plano: false } } })
  novo('Lembrete do Simulado Nacional, abriu hoje', 'Caio se inscreveu, a edição abriu hoje e pede o plano (a carta avisa, sem preço).', { tipo: 'simulado_lembrete', nome: 'Caio', respondidas: 40, perfil: { nome: 'Caio', respondidas: 40 }, campanha: { lembrete: { edicao: '2026-10', titulo: 'Simulado Nacional · Outubro de 2026', tipo_lembrete: 'abriu_hoje', fecha_em: '2026-11-01T02:59:59Z', total: 50, duracao_min: 120, precisa_plano: true } } })
  novo('Resultado do Simulado Nacional', 'Júlia acertou 41 de 50 e ficou em 12º (posição só para quem assina, até 30º).', { tipo: 'simulado_resultado', nome: 'Júlia Prado', respondidas: 1450, perfil: julia, campanha: { simulado: { titulo: 'Simulado Nacional de setembro', acertos: 41, total: 50, posicao: 12, participantes: 180 } } })
  novo('Véspera da prova', 'Pedro, TEOT amanhã pelo cronograma.', { tipo: 'vespera_prova', nome: 'Pedro Alves', respondidas: 290, provaCronograma: 'TEOT', perfil: { ...pedro, diasParaProva: 1 } })
  novo('Depois da prova: como foi?', 'Pedro, o TEOT foi há 2 dias.', { tipo: 'depois_prova', nome: 'Pedro Alves', respondidas: 290, provaCronograma: 'TEOT', perfil: { ...pedro, diasParaProva: null } })
  novo('Aniversário', 'Júlia faz aniversário hoje. Curta, sem convite, sem link.', { tipo: 'aniversario', nome: 'Júlia Prado', respondidas: 1450, perfil: julia })
  novo('Um ano de Orto Questões', 'A conta da Beatriz faz um ano hoje.', { tipo: 'um_ano', nome: 'Beatriz Lins', respondidas: 290, perfil: { ...beatriz, diasConta: 365 }, campanha: { anos: 1 } })
  novo('Sua indicação deu certo', 'O amigo que o Rafael indicou passou de 20 questões.', { tipo: 'indicacao_deu_certo', nome: 'Rafael Couto', respondidas: 290, perfil: FAIXAS['40-60'], campanha: { cortesia: true } })
  novo('Saiu um resumo do seu tema', 'Beatriz estuda mais mão; saiu o resumo de fraturas da mão (só para quem aceitou novidades).', { tipo: 'resumo_do_tema', nome: 'Beatriz Lins', respondidas: 290, perfil: beatriz, campanha: { resumo: { id: 'rockwood10-45-fraturas-mao', titulo: 'Fraturas da mão', especialidade: 'mao' } } })

  await mkdir('docs/emails', { recursive: true })
  await writeFile('docs/emails/MODELOS.md', linhas.join('\n'))
  console.log('docs/emails/MODELOS.md')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
