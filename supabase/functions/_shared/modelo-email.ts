/**
 * Modelos dos e-mails do OrtoQuestões. Só funções puras (sem Deno nem rede),
 * para o mesmo arquivo gerar o e-mail na Edge Function e a prévia nos testes.
 *
 * HTML de e-mail não é HTML de site: tabelas, estilos em linha, nada de
 * fonte externa, imagem opcional. Tudo continua legível se o programa de
 * e-mail bloquear imagens ou forçar o modo escuro.
 */

export interface Marco {
  minimo: number
  rotulo: string
  nivel: 'bronze' | 'prata' | 'ouro' | 'esmeralda'
}

/** Os mesmos emblemas de volume do site (src/estado/conquistas.ts). */
export const MARCOS: readonly Marco[] = [
  { minimo: 50, rotulo: 'Primeiros passos', nivel: 'bronze' },
  { minimo: 100, rotulo: 'Interno', nivel: 'bronze' },
  { minimo: 250, rotulo: 'R1', nivel: 'prata' },
  { minimo: 500, rotulo: 'R2', nivel: 'prata' },
  { minimo: 1000, rotulo: 'R3', nivel: 'ouro' },
  { minimo: 2000, rotulo: 'Preceptor', nivel: 'ouro' },
  { minimo: 3000, rotulo: 'Chefe de serviço', nivel: 'esmeralda' },
  { minimo: 4000, rotulo: 'Lenda do OrtoQuestões', nivel: 'esmeralda' },
]

export function marcoAtingido(total: number): Marco | null {
  let atual: Marco | null = null
  for (const m of MARCOS) if (total >= m.minimo) atual = m
  return atual
}
export function proximoMarco(total: number): Marco | null {
  return MARCOS.find((m) => total < m.minimo) ?? null
}

const CORES: Record<Marco['nivel'], { fundo: string; borda: string; texto: string; faixa: string }> = {
  bronze: { fundo: '#f6e4d3', borda: '#c98b55', texto: '#7a4518', faixa: '#c98b55' },
  prata: { fundo: '#eef1f4', borda: '#9aa6b2', texto: '#3c4650', faixa: '#8a97a4' },
  ouro: { fundo: '#fbf0cf', borda: '#d4a52c', texto: '#6b4e00', faixa: '#d4a52c' },
  esmeralda: { fundo: '#d9f1ea', borda: '#1f9c7f', texto: '#0b5746', faixa: '#1f9c7f' },
}

/** O que dizer em cada marco: reconhecer o esforço e apontar o próximo passo. */
const MENSAGENS: Record<number, { titulo: string; texto: string }> = {
  50: { titulo: 'O começo já ficou para trás', texto: 'As primeiras 50 questões são as mais difíceis de fazer: é quando o hábito ainda não existe. Você passou por elas. Daqui para frente, cada sessão curta soma, e a revisão espaçada começa a trabalhar a seu favor.' },
  100: { titulo: 'Cem questões, e o hábito está nascendo', texto: 'Cem questões já mostram um padrão: você sabe onde acerta com folga e onde tropeça. Vale abrir o Caderno de erros e a Revisão de hoje. É ali que o estudo rende mais por minuto.' },
  250: { titulo: 'Você já passou da fase de teste', texto: 'Com 250 questões, os temas começam a se conectar: a mesma classificação aparece em provas diferentes, a mesma armadilha se repete. Continue alternando temas novos com as revisões que vencem a cada dia.' },
  500: { titulo: 'Quinhentas questões: isso é constância', texto: 'Meio milhar de questões não acontece por acaso. É a soma de muitos dias em que você escolheu estudar mesmo cansado. Agora o maior ganho está nos pontos fracos: um tema com acerto baixo, treinado com calma, sobe rápido.' },
  1000: { titulo: 'Mil questões. Poucos chegam aqui', texto: 'Mil questões é uma marca de quem leva a prova a sério. Você já viu boa parte do que as bancas gostam de perguntar. O que separa uma boa nota de uma ótima, daqui em diante, é a revisão: voltar ao que errou até virar certeza.' },
  2000: { titulo: 'Duas mil questões: nível de preceptor', texto: 'Com duas mil questões, você não está mais conhecendo a prova, está dominando. Mantenha o ritmo das revisões e use as sessões por prova para treinar o tempo e o formato de cada banca.' },
  3000: { titulo: 'Três mil questões: chefe de serviço', texto: 'Três mil questões é trabalho de muitos meses, feito um dia de cada vez. A esta altura, os detalhes fazem a diferença: releia os comentários das questões que você errou mais de uma vez.' },
  4000: { titulo: 'Quatro mil questões: você fez história aqui', texto: 'Você respondeu praticamente o acervo inteiro. É raro, e merece ser comemorado. Agora a missão é manter afiado: as revisões programadas vão trazendo de volta, no momento certo, o que mais importa.' },
}

export interface DadosMarco {
  nome: string | null
  marco: Marco
  respondidas: number
  acertos: number
  erros: number
  respondidas7d: number
  /** Texto extra do administrador, no envio manual. */
  recado?: string | null
  site: string
  linkDescadastro: string
}

const esc = (texto: string) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const numero = (n: number) => n.toLocaleString('pt-BR')

export function emailMarco(d: DadosMarco): { assunto: string; html: string; texto: string } {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? ''
  const cor = CORES[d.marco.nivel]
  const msg = MENSAGENS[d.marco.minimo] ?? { titulo: `${numero(d.marco.minimo)} questões`, texto: 'Continue no seu ritmo: cada sessão soma.' }
  const acerto = d.acertos + d.erros > 0 ? Math.round((d.acertos / (d.acertos + d.erros)) * 100) : null
  const proximo = proximoMarco(d.respondidas)
  const faltam = proximo ? proximo.minimo - d.respondidas : 0
  const base = proximo ? MARCOS[MARCOS.indexOf(proximo) - 1]?.minimo ?? 0 : 0
  const progresso = proximo ? Math.max(4, Math.min(100, Math.round(((d.respondidas - base) / (proximo.minimo - base)) * 100))) : 100
  const assunto = nome
    ? `${nome}, você chegou a ${numero(d.marco.minimo)} questões`
    : `Você chegou a ${numero(d.marco.minimo)} questões no OrtoQuestões`
  const linkTreinar = `${d.site}#/treinar`
  const linkRevisao = `${d.site}#/revisao`
  const selo = d.marco.minimo >= 1000 ? `${d.marco.minimo / 1000}k` : String(d.marco.minimo)

  const recado = d.recado?.trim()
    ? `<tr><td style="padding:0 40px 8px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f7f6;border-left:3px solid #146b61;border-radius:8px;">
          <tr><td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#23302d;">
            <strong style="color:#0f4f49;">Um recado do Tales:</strong><br>${esc(d.recado.trim()).replace(/\n/g, '<br>')}
          </td></tr>
        </table>
      </td></tr>`
    : ''

  const estatistica = (valor: string, rotulo: string) => `
    <td width="33%" align="center" valign="top" style="padding:14px 6px;background:#f6f8f7;border-radius:10px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:28px;font-weight:bold;color:#0f4f49;">${valor}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#5f6d69;padding-top:4px;">${rotulo}</div>
    </td>`

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(assunto)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f1;">${esc(`Emblema ${d.marco.rotulo} desbloqueado. ${msg.titulo}.`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f1;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">

      <tr><td style="background:#0f4f49;background-image:linear-gradient(135deg,#0c3f3a 0%,#146b61 55%,#1d8a7c 100%);padding:26px 40px 30px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:22px;color:#ffffff;"><strong>Orto</strong> Questões</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:2px;color:#bfe3dc;padding-top:22px;text-transform:uppercase;">Nova conquista</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;font-weight:bold;color:#ffffff;padding-top:6px;">
          ${nome ? `Parabéns, ${esc(nome)}!` : 'Parabéns!'}
        </div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#dff1ed;padding-top:6px;">
          Você chegou a ${numero(d.marco.minimo)} questões respondidas.
        </div>
      </td></tr>

      <tr><td align="center" style="padding:30px 40px 6px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" valign="middle" width="112" height="112" style="width:112px;height:112px;border-radius:56px;background:${cor.fundo};border:4px solid ${cor.borda};">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:38px;font-weight:bold;color:${cor.texto};">${selo}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;letter-spacing:1px;color:${cor.texto};text-transform:uppercase;">questões</div>
          </td></tr>
        </table>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;letter-spacing:1px;color:${cor.texto};text-transform:uppercase;padding-top:14px;font-weight:bold;">Emblema desbloqueado</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;font-weight:bold;color:#1b2624;padding-top:2px;">${esc(d.marco.rotulo)}</div>
      </td></tr>

      <tr><td style="padding:22px 40px 8px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:19px;line-height:26px;font-weight:bold;color:#0f4f49;">${esc(msg.titulo)}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#33413d;padding-top:8px;">${esc(msg.texto)}</div>
      </td></tr>

      ${recado}

      <tr><td style="padding:16px 34px 4px 34px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="6" border="0">
          <tr>
            ${estatistica(numero(d.respondidas), 'questões respondidas')}
            ${estatistica(acerto === null ? '—' : `${acerto}%`, 'de acerto')}
            ${estatistica(numero(d.respondidas7d), 'nos últimos 7 dias')}
          </tr>
        </table>
      </td></tr>

      ${proximo ? `<tr><td style="padding:18px 40px 4px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#33413d;">
          Próximo emblema: <strong>${esc(proximo.rotulo)}</strong>. Faltam <strong>${numero(faltam)}</strong> questões.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;background:#e6ecea;border-radius:6px;">
          <tr><td width="${progresso}%" style="height:10px;line-height:10px;font-size:0;background:${cor.faixa};border-radius:6px;">&nbsp;</td><td style="font-size:0;line-height:10px;">&nbsp;</td></tr>
        </table>
      </td></tr>` : ''}

      <tr><td align="center" style="padding:28px 40px 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="border-radius:12px;background:#146b61;">
            <a href="${linkTreinar}" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">Continuar estudando</a>
          </td></tr>
        </table>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#5f6d69;padding-top:14px;">
          Ou comece pela <a href="${linkRevisao}" style="color:#146b61;font-weight:bold;">revisão de hoje</a>, onde o estudo rende mais.
        </div>
      </td></tr>

      <tr><td style="padding:26px 40px 30px 40px;">
        <div style="border-top:1px solid #e3e9e7;padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#33413d;">
          Bons estudos,<br><strong>Tales</strong>, do OrtoQuestões
        </div>
      </td></tr>
    </table>

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
      <tr><td align="center" style="padding:18px 24px 6px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#7a8784;">
        Siga <a href="https://www.instagram.com/ortoquestoes" style="color:#146b61;font-weight:bold;text-decoration:none;">@ortoquestoes</a> no Instagram: questão comentada e macetes de prova.
      </td></tr>
      <tr><td align="center" style="padding:4px 24px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#98a4a1;">
        Você recebe este e-mail porque tem uma conta no OrtoQuestões e atingiu um novo emblema.<br>
        <a href="${d.linkDescadastro}" style="color:#98a4a1;text-decoration:underline;">Não quero mais receber e-mails de conquistas</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  const texto = [
    nome ? `Parabéns, ${nome}!` : 'Parabéns!',
    `Você chegou a ${numero(d.marco.minimo)} questões respondidas e desbloqueou o emblema ${d.marco.rotulo}.`,
    '',
    msg.titulo,
    msg.texto,
    ...(d.recado?.trim() ? ['', `Um recado do Tales: ${d.recado.trim()}`] : []),
    '',
    `Questões respondidas: ${numero(d.respondidas)}`,
    `Acerto: ${acerto === null ? '—' : `${acerto}%`}`,
    `Nos últimos 7 dias: ${numero(d.respondidas7d)}`,
    ...(proximo ? ['', `Próximo emblema: ${proximo.rotulo}. Faltam ${numero(faltam)} questões.`] : []),
    '',
    `Continuar estudando: ${linkTreinar}`,
    '',
    'Bons estudos,',
    'Tales, do OrtoQuestões',
    '',
    `Não quer mais receber e-mails de conquistas? ${d.linkDescadastro}`,
  ].join('\n')

  return { assunto, html, texto }
}

/**
 * Parabéns em forma de carta: poucas linhas, sem faixa colorida, emblema ou
 * botão, como um e-mail escrito à mão. É o formato que o Gmail costuma pôr
 * na caixa principal ou em Atualizações, e não em Promoções.
 */
export function emailCarta(d: DadosMarco): { assunto: string; html: string; texto: string } {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? ''
  const acerto = d.acertos + d.erros > 0 ? Math.round((d.acertos / (d.acertos + d.erros)) * 100) : null
  const recado = d.recado?.trim()
  const assunto = nome ? `${nome}, um recado sobre o seu estudo` : 'Um recado sobre o seu estudo'
  const numeros = `${numero(d.respondidas)} questões respondidas${acerto === null ? '' : `, ${acerto}% de acerto`}${d.respondidas7d ? ` e ${numero(d.respondidas7d)} só nos últimos 7 dias` : ''}.`
  const paragrafos = recado
    ? recado.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [`Passando para te dar parabéns: você chegou a ${numero(d.respondidas)} questões no OrtoQuestões. Constância é o que mais faz diferença na prova, e você está construindo isso.`]
  const linkTreinar = `${d.site}#/treinar`
  const p = (conteudo: string, estilo = '') => `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#222222;${estilo}">${conteudo}</p>`

  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;padding:24px 20px;">
${p(nome ? `Oi, ${esc(nome)},` : 'Oi,')}
${paragrafos.map((t) => p(esc(t).replace(/\n/g, '<br>'))).join('\n')}
${p(`Seus números até aqui: ${esc(numeros)}`, 'color:#444444;')}
${p(`Quando quiser continuar: <a href="${linkTreinar}" style="color:#146b61;">${esc(linkTreinar.replace(/^https?:\/\//, ''))}</a>`)}
${p('Um abraço,<br>Tales<br><span style="color:#666666;">OrtoQuestões</span>')}
<p style="margin:28px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#999999;">Não quer receber este tipo de e-mail? <a href="${d.linkDescadastro}" style="color:#999999;">Descadastrar</a></p>
</div>
</body>
</html>`

  const texto = [
    nome ? `Oi, ${nome},` : 'Oi,', '',
    ...paragrafos.flatMap((t) => [t, '']),
    `Seus números até aqui: ${numeros}`, '',
    `Quando quiser continuar: ${linkTreinar}`, '',
    'Um abraço,', 'Tales', 'OrtoQuestões', '',
    `Não quer receber este tipo de e-mail? ${d.linkDescadastro}`,
  ].join('\n')
  return { assunto, html, texto }
}

/** Alerta curto para os administradores. */
export function emailAlerta(titulo: string, linhas: string[], link: string): { assunto: string; html: string; texto: string } {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:24px 12px;background:#eef2f1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:14px;">
<tr><td style="padding:22px 28px 6px 28px;font-size:12px;letter-spacing:2px;color:#146b61;text-transform:uppercase;font-weight:bold;">Painel do administrador</td></tr>
<tr><td style="padding:0 28px 10px 28px;font-size:20px;line-height:26px;font-weight:bold;color:#1b2624;">${esc(titulo)}</td></tr>
<tr><td style="padding:0 28px 8px 28px;font-size:15px;line-height:23px;color:#33413d;">${linhas.map((l) => esc(l)).join('<br>')}</td></tr>
<tr><td style="padding:14px 28px 26px 28px;"><a href="${link}" style="display:inline-block;padding:12px 22px;background:#146b61;color:#ffffff;border-radius:10px;font-weight:bold;text-decoration:none;font-size:14px;">Abrir o painel</a></td></tr>
</table></td></tr></table></body></html>`
  return { assunto: `[OrtoQuestões] ${titulo}`, html, texto: `${titulo}\n\n${linhas.join('\n')}\n\n${link}` }
}

/** Nomes dos temas pelo prefixo do id da questão ("ombro-cotovelo-0012"). */
export const TEMAS: Record<string, string> = {
  'mao': 'Mão e punho', 'ombro-cotovelo': 'Ombro e cotovelo', 'quadril': 'Quadril', 'joelho': 'Joelho', 'coluna': 'Coluna',
  'pe-tornozelo': 'Pé e tornozelo', 'trauma': 'Trauma adulto', 'pediatria': 'Ortopedia pediátrica',
  'tumores': 'Tumores ósseos e de partes moles', 'conceitos-basicos': 'Conceitos básicos', 'osteometabolicas': 'Osteometabólicas',
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** "2026-09" → "setembro de 2026". */
export function nomeMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  return MESES[m - 1] ? `${MESES[m - 1]} de ${ano}` : mes
}

export interface DadosRelatorio {
  nome: string | null
  mes: string
  respostas: number
  certas: number
  erradas: number
  dias_ativos: number
  respostas_anterior: number
  certas_anterior: number
  erradas_anterior: number
  total_acumulado: number
  temas: Array<{ tema: string; certas: number; total: number; certas_ant: number; total_ant: number }>
  simulado: { titulo: string; acertos: number; total: number } | null
  site: string
  linkDescadastro: string
}

const pctDe = (certas: number, total: number) => (total > 0 ? Math.round((certas / total) * 100) : null)

/** O que o relatório conclui do mês: pura para o teste conferir as regras. */
export function analisarMes(d: DadosRelatorio) {
  const acerto = pctDe(d.certas, d.certas + d.erradas)
  const acertoAnterior = pctDe(d.certas_anterior, d.certas_anterior + d.erradas_anterior)
  const comparaveis = d.temas
    .filter((t) => t.total >= 5 && t.total_ant >= 5 && TEMAS[t.tema])
    .map((t) => ({ slug: t.tema, nome: TEMAS[t.tema], agora: pctDe(t.certas, t.total)!, antes: pctDe(t.certas_ant, t.total_ant)! }))
    .map((t) => ({ ...t, delta: t.agora - t.antes }))
  const subiram = comparaveis.filter((t) => t.delta >= 5).sort((a, b) => b.delta - a.delta).slice(0, 3)
  const cairam = comparaveis.filter((t) => t.delta <= -5).sort((a, b) => a.delta - b.delta).slice(0, 3)
  const doMes = d.temas.filter((t) => t.total >= 5 && TEMAS[t.tema]).map((t) => ({ slug: t.tema, nome: TEMAS[t.tema], acerto: pctDe(t.certas, t.total)!, total: t.total }))
  const maisFraco = [...doMes].sort((a, b) => a.acerto - b.acerto)[0] ?? null
  const maisEstudados = [...doMes].sort((a, b) => b.total - a.total).slice(0, 3)
  return { acerto, acertoAnterior, subiram, cairam, maisFraco, maisEstudados }
}

export function emailRelatorio(d: DadosRelatorio): { assunto: string; html: string; texto: string } {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? ''
  const mes = nomeMes(d.mes)
  const Mes = mes[0].toUpperCase() + mes.slice(1)
  const a = analisarMes(d)
  const parado = d.respostas === 0
  const assunto = parado
    ? `${nome ? `${nome}, s` : 'S'}eu ${mes.split(' ')[0]} no OrtoQuestões`
    : `${nome ? `${nome}, v` : 'V'}ocê respondeu ${numero(d.respostas)} questões em ${mes.split(' ')[0]}`
  const variacao = (agora: number, antes: number, unidade = '') => {
    const delta = agora - antes
    if (!antes && !agora) return ''
    if (delta === 0) return `<span style="color:#5f6d69;">igual ao mês anterior</span>`
    const cor = delta > 0 ? '#1f7a4d' : '#b3423a'
    return `<span style="color:${cor};font-weight:bold;">${delta > 0 ? '▲' : '▼'} ${numero(Math.abs(delta))}${unidade}</span> <span style="color:#5f6d69;">vs. mês anterior</span>`
  }
  const cartao = (valor: string, rotulo: string, extra: string) => `
    <td width="33%" align="center" valign="top" style="padding:14px 6px;background:#f6f8f7;border-radius:10px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:30px;font-weight:bold;color:#0f4f49;">${valor}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#5f6d69;padding-top:4px;">${rotulo}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;padding-top:6px;">${extra}</div>
    </td>`
  const linhaTema = (nomeTema: string, valor: string, cor: string) => `
    <tr><td style="padding:7px 0;border-bottom:1px solid #edf1f0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;color:#23302d;">${esc(nomeTema)}</td>
    <td align="right" style="padding:7px 0;border-bottom:1px solid #edf1f0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;color:${cor};white-space:nowrap;">${valor}</td></tr>`
  const bloco = (titulo: string, linhas: string) => `
    <tr><td style="padding:20px 40px 0 40px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#5f6d69;font-weight:bold;padding-bottom:4px;">${titulo}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhas}</table>
    </td></tr>`

  const temasHtml = [
    a.subiram.length ? bloco('Subiram', a.subiram.map((t) => linhaTema(t.nome, `${t.antes}% → ${t.agora}%`, '#1f7a4d')).join('')) : '',
    a.cairam.length ? bloco('Caíram', a.cairam.map((t) => linhaTema(t.nome, `${t.antes}% → ${t.agora}%`, '#b3423a')).join('')) : '',
    !a.subiram.length && !a.cairam.length && a.maisEstudados.length ? bloco('Mais estudados no mês', a.maisEstudados.map((t) => linhaTema(t.nome, `${t.total} questões · ${t.acerto}%`, '#0f4f49')).join('')) : '',
  ].join('')

  const simulado = d.simulado ? `
    <tr><td style="padding:20px 40px 0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf3de;border-radius:12px;">
        <tr><td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#4a3710;">
          <strong>${esc(d.simulado.titulo)}:</strong> ${d.simulado.acertos} de ${d.simulado.total} (${pctDe(d.simulado.acertos, d.simulado.total)}%).
          <a href="${d.site}#/simulado-nacional" style="color:#7a5710;font-weight:bold;">Ver posição e prontidão</a>
        </td></tr>
      </table>
    </td></tr>` : ''

  const passo = parado
    ? { titulo: 'Recomece com 10 questões', texto: 'Um mês parado não apaga o que você já estudou. Dez questões hoje e a revisão do dia colocam tudo de volta nos trilhos.', botao: 'Fazer 10 questões', link: `${d.site}#/treinar` }
    : a.maisFraco && a.maisFraco.acerto < 70
      ? { titulo: `Comece o próximo mês por ${a.maisFraco.nome}`, texto: `Foi o seu menor acerto em ${mes.split(' ')[0]} (${a.maisFraco.acerto}%). É o tema em que cada sessão mais faz a nota subir.`, botao: `Treinar ${a.maisFraco.nome}`, link: `${d.site}#/treinar?temas=${a.maisFraco.slug}` }
      : { titulo: 'Mantenha o plano rodando', texto: 'Seu acerto está sólido nos temas que você estudou. Agora vale ampliar: temas que você ainda não viu e o Simulado Nacional do mês.', botao: 'Abrir meu plano até a prova', link: `${d.site}#/plano-de-estudo` }

  const manchete = parado
    ? `${Mes} passou sem questões. Tudo bem: o próximo mês começa hoje.`
    : `Você respondeu ${numero(d.respostas)} ${d.respostas === 1 ? 'questão' : 'questões'} em ${d.dias_ativos} ${d.dias_ativos === 1 ? 'dia' : 'dias'} de estudo.`

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(assunto)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f1;">${esc(manchete)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f1;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
      <tr><td style="background:#0f4f49;background-image:linear-gradient(135deg,#0c3f3a 0%,#146b61 55%,#1d8a7c 100%);padding:26px 40px 30px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:22px;color:#ffffff;"><strong>Orto</strong> Questões</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:2px;color:#bfe3dc;padding-top:22px;text-transform:uppercase;">Seu relatório de ${esc(mes)}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;font-weight:bold;color:#ffffff;padding-top:6px;">${nome ? `Olá, ${esc(nome)}` : 'Olá'}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#dff1ed;padding-top:6px;">${esc(manchete)}</div>
      </td></tr>

      <tr><td style="padding:24px 34px 4px 34px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="6" border="0">
          <tr>
            ${cartao(numero(d.respostas), 'questões no mês', variacao(d.respostas, d.respostas_anterior))}
            ${cartao(a.acerto === null ? '—' : `${a.acerto}%`, 'de acerto', a.acerto !== null && a.acertoAnterior !== null ? variacao(a.acerto, a.acertoAnterior, ' pts') : '')}
            ${cartao(String(d.dias_ativos), d.dias_ativos === 1 ? 'dia de estudo' : 'dias de estudo', '')}
          </tr>
        </table>
      </td></tr>

      ${temasHtml}
      ${simulado}

      <tr><td style="padding:24px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f7f6;border-left:3px solid #146b61;border-radius:8px;">
          <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:12px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#146b61;font-weight:bold;">Próximo passo</div>
            <div style="font-size:18px;line-height:24px;font-weight:bold;color:#1b2624;padding-top:4px;">${esc(passo.titulo)}</div>
            <div style="font-size:15px;line-height:22px;color:#33413d;padding-top:6px;">${esc(passo.texto)}</div>
          </td></tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding:26px 40px 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="border-radius:12px;background:#146b61;">
            <a href="${passo.link}" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(passo.botao)}</a>
          </td></tr>
        </table>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#5f6d69;padding-top:14px;">
          No total, você já respondeu <strong>${numero(d.total_acumulado)}</strong> questões diferentes.
        </div>
      </td></tr>

      <tr><td style="padding:26px 40px 30px 40px;">
        <div style="border-top:1px solid #e3e9e7;padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#33413d;">
          Bons estudos,<br><strong>Tales</strong>, do OrtoQuestões
        </div>
      </td></tr>
    </table>

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
      <tr><td align="center" style="padding:18px 24px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#98a4a1;">
        Você recebe este relatório porque é assinante do OrtoQuestões.<br>
        <a href="${d.linkDescadastro}" style="color:#98a4a1;text-decoration:underline;">Não quero mais receber o relatório mensal</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  const texto = [
    `Seu relatório de ${mes}`,
    nome ? `Olá, ${nome}.` : 'Olá.',
    manchete,
    '',
    `Questões no mês: ${numero(d.respostas)} (mês anterior: ${numero(d.respostas_anterior)})`,
    `Acerto: ${a.acerto === null ? '—' : `${a.acerto}%`}${a.acertoAnterior !== null ? ` (mês anterior: ${a.acertoAnterior}%)` : ''}`,
    `Dias de estudo: ${d.dias_ativos}`,
    ...(a.subiram.length ? ['', 'Subiram: ' + a.subiram.map((t) => `${t.nome} (${t.antes}% → ${t.agora}%)`).join(', ')] : []),
    ...(a.cairam.length ? ['', 'Caíram: ' + a.cairam.map((t) => `${t.nome} (${t.antes}% → ${t.agora}%)`).join(', ')] : []),
    ...(d.simulado ? ['', `${d.simulado.titulo}: ${d.simulado.acertos} de ${d.simulado.total}`] : []),
    '',
    `Próximo passo: ${passo.titulo}. ${passo.texto}`,
    passo.link,
    '',
    'Bons estudos,',
    'Tales, do OrtoQuestões',
    '',
    `Não quer mais receber o relatório mensal? ${d.linkDescadastro}`,
  ].join('\n')

  return { assunto, html, texto }
}

// ---------------------------------------------------------------------------
// Lembretes (reengajamento), disparados pelo painel do administrador
// ---------------------------------------------------------------------------

export type CampanhaLembrete = 'nunca' | 'tres_dias' | 'sete_dias' | 'renovacao_pix' | 'renovacao_pix_hoje'

export interface DadosLembrete {
  campanha: CampanhaLembrete
  nome: string | null
  respondidas: number
  diasFora: number
  site: string
  linkDescadastro: string
  /** Renovação do Pix: dias até o acesso acabar, a data e o plano. */
  diasRestantes?: number
  fimEm?: string | null
  plano?: string | null
  /** Renovação do Pix: desempenho da pessoa, para o quadro de números. */
  acertos?: number
  respondidas7d?: number
}

/**
 * Lembrete no clima da temporada RPG: o mensageiro do ranking chega com a
 * carta. Imagens em pixel art servidas pelo próprio site; se o e-mail
 * bloquear imagens, o texto continua completo sozinho.
 */
export function emailLembrete(d: DadosLembrete): { assunto: string; html: string; texto: string } {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? ''
  const img = (caminho: string, largura: number, altura: number, alt = '') =>
    `<img src="${d.site}${caminho}" width="${largura}" height="${altura}" alt="${esc(alt)}" style="display:block;border:0;image-rendering:pixelated;-ms-interpolation-mode:nearest-neighbor;">`
  const linkTreinar = `${d.site}#/treinar`
  const linkRevisao = `${d.site}#/revisao`
  const linkCronograma = `${d.site}#/cronograma`
  const linkAssinatura = `${d.site}#/assinatura`
  const dias = Math.max(1, d.diasRestantes ?? 3)
  const diasTexto = dias === 1 ? '1 dia' : `${dias} dias`
  const fimTexto = d.fimEm ? `em ${new Date(d.fimEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}` : `em ${diasTexto}`
  const planoTexto = ({ mensal: 'mensal', semestral: 'semestral', anual: 'anual' } as Record<string, string>)[d.plano ?? ''] ?? (d.plano ?? '')

  const C = {
    nunca: {
      assunto: nome ? `${nome}, sua primeira missão no OrtoQuestões está esperando` : 'Sua primeira missão no OrtoQuestões está esperando',
      previa: 'Questões oficiais de TEOT, TARO e ENARE R4 comentadas, alternativa por alternativa. Comece com 10.',
      selo: 'Missão: primeira batalha',
      titulo: nome ? `${nome}, o mensageiro trouxe um convite` : 'O mensageiro trouxe um convite',
      lide: 'Você criou sua conta, mas ainda não respondeu nenhuma questão. Que tal dar uma chance? Leva uns 15 minutos.',
      corpo: [
        ['pixel/treinar.png', 'Provas oficiais comentadas', 'TEOT, TARO e ENARE R4 separadas por tema, com a explicação de cada alternativa: por que a certa está certa e cada errada está errada.'],
        ['pixel/revisao.png', 'Revisão que lembra por você', 'Errou? A questão volta no momento certo. Acertou com certeza? Só reaparece daqui a semanas.'],
        ['pixel/ranking.png', 'Ranking, emblemas e sequência', 'Cada questão soma pontos, destrava emblemas e acende a sua fogueira de dias seguidos.'],
      ],
      botao: 'Começar minha primeira missão',
      link: linkTreinar,
      rodape: 'Comece por um tema de que você gosta. Dez questões já mostram como funciona.',
    },
    tres_dias: {
      assunto: nome ? `${nome}, sua fogueira está apagando` : 'Sua fogueira de estudo está apagando',
      previa: 'Faz alguns dias que você não aparece. Dez questões hoje mantêm o hábito vivo.',
      selo: 'Missão: manter a chama',
      titulo: nome ? `${nome}, a fogueira está esperando lenha` : 'A fogueira está esperando lenha',
      lide: `Faz ${d.diasFora} dias que você não aparece. Constância vence intensidade: uma sessão curta hoje vale mais do que uma maratona no fim de semana.`,
      corpo: [
        ['ranking/chama.png', 'Dez questões, quinze minutos', 'É o suficiente para manter o hábito e não deixar as revisões acumularem.'],
        ['pixel/revisao.png', 'Suas revisões estão prontas', 'As questões que você errou já voltaram para a fila. É onde o estudo rende mais por minuto.'],
        ['pixel/ranking.png', 'O ranking continua andando', `Você já respondeu ${numero(d.respondidas)} questões. Cada uma nova soma um ponto.`],
      ],
      botao: 'Voltar com 10 questões',
      link: linkTreinar,
      rodape: `Prefere começar pelo que já errou? Abra a <a href="${linkRevisao}" style="color:#146b61;font-weight:bold;">revisão de hoje</a>.`,
    },
    sete_dias: {
      assunto: nome ? `${nome}, uma semana longe acontece. O importante é voltar` : 'Uma semana longe acontece. O importante é voltar',
      previa: 'Sua jornada até a prova continua de onde parou. Volte com uma sessão curta.',
      selo: 'Missão: retomar a jornada',
      titulo: nome ? `${nome}, sua jornada continua de onde parou` : 'Sua jornada continua de onde parou',
      lide: `Faz ${d.diasFora} dias desde a última visita. Plantão, cansaço, vida: acontece com todo mundo. O que separa quem chega pronto na prova é voltar, não ser perfeito.`,
      corpo: [
        ['pixel/treinar.png', 'Recomece pequeno', 'Uma sessão de 10 questões hoje. Amanhã, outra. O hábito volta mais rápido do que parece.'],
        ['pixel/planos.png', 'Seu progresso está guardado', `As ${numero(d.respondidas)} questões que você respondeu, as revisões e o caderno de erros continuam lá, esperando.`],
        ['pixel/simulado.png', 'Um plano até a prova', 'O cronograma divide o que falta pelos dias até a prova e diz o que estudar hoje.'],
      ],
      botao: 'Retomar minha jornada',
      link: linkTreinar,
      rodape: `Quer um plano dia a dia? Veja o <a href="${linkCronograma}" style="color:#146b61;font-weight:bold;">cronograma até a prova</a>.`,
    },
    renovacao_pix: {
      assunto: nome ? `${nome}, seu acesso termina em ${diasTexto}: renove e siga em frente` : `Seu acesso termina em ${diasTexto}: renove e siga em frente`,
      previa: `Seu plano pago no Pix termina ${fimTexto}. Renove para não perder o ritmo até a prova.`,
      selo: 'Missão: renovar a armadura',
      titulo: nome ? `${nome}, a sua armadura vence ${fimTexto}` : `Sua armadura vence ${fimTexto}`,
      lide: `Faltam ${diasTexto} para terminar o acesso do seu plano${d.plano ? ` ${planoTexto}` : ''}, pago no Pix. Como o Pix não renova sozinho, este é o lembrete: renove e continue a jornada sem interromper o ritmo.`,
      corpo: [
        ['pixel/revisao.png', 'Suas revisões continuam em dia', 'A fila de revisão espaçada segue chamando cada questão no momento certo, sem limite diário.'],
        ['pixel/simulado.png', 'Simulados, cronograma e relatórios', 'Simulado Nacional, plano até a prova, "como a turma respondeu" e o relatório do mês continuam liberados.'],
        ['pixel/ranking.png', 'Nada se perde', `Suas ${numero(d.respondidas)} questões, o caderno de erros e as conquistas ficam guardados, renovando ou não.`],
      ],
      botao: 'Renovar e continuar estudando',
      link: linkAssinatura,
      rodape: `Prefere não precisar lembrar? No cartão, a assinatura renova sozinha e você cancela quando quiser em <a href="${d.site}#/conta/assinatura" style="color:#146b61;font-weight:bold;">Minha conta</a>.`,
    },
    renovacao_pix_hoje: {
      assunto: nome ? `${nome}, seu acesso termina hoje: renove e não pare agora` : 'Seu acesso termina hoje: renove e não pare agora',
      previa: 'Hoje é o último dia do seu plano pago no Pix. Renove para continuar de onde parou.',
      selo: 'Missão: último dia da armadura',
      titulo: nome ? `${nome}, hoje é o último dia da sua armadura` : 'Hoje é o último dia da sua armadura',
      lide: `O acesso do seu plano${d.plano ? ` ${planoTexto}` : ''}, pago no Pix, termina hoje. Olha só o que você já construiu até aqui: renove agora e mantenha o ritmo até a prova.`,
      corpo: [
        ['pixel/revisao.png', 'As revisões não podem esfriar', 'A fila de revisão espaçada depende de constância. Renovando hoje, nenhuma questão perde o momento certo de voltar.'],
        ['pixel/simulado.png', 'Tudo continua liberado', 'Simulados, cronograma até a prova, "como a turma respondeu" e o relatório do mês seguem com você.'],
        ['pixel/ranking.png', 'Seu progresso está guardado', 'O caderno de erros, as conquistas e o histórico ficam salvos. Renovando, você continua exatamente de onde parou.'],
      ],
      botao: 'Renovar hoje e continuar',
      link: linkAssinatura,
      rodape: `Prefere não precisar lembrar? No cartão, a assinatura renova sozinha e você cancela quando quiser em <a href="${d.site}#/conta/assinatura" style="color:#146b61;font-weight:bold;">Minha conta</a>.`,
    },
  }[d.campanha]

  const blocos = C.corpo.map(([icone, titulo, texto]) => `
      <tr><td style="padding:0 40px 14px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f8f7;border-radius:12px;">
          <tr>
            <td width="64" valign="middle" align="center" style="padding:14px 6px 14px 14px;">${img(icone, 44, 44)}</td>
            <td valign="middle" style="padding:14px 18px 14px 8px;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:16px;line-height:22px;font-weight:bold;color:#0f4f49;">${esc(titulo)}</div>
              <div style="font-size:14px;line-height:21px;color:#33413d;padding-top:3px;">${esc(texto)}</div>
            </td>
          </tr>
        </table>
      </td></tr>`).join('')

  // Renovação do Pix: o quadro com os números da pessoa até aqui.
  const ehPix = d.campanha === 'renovacao_pix' || d.campanha === 'renovacao_pix_hoje'
  const pct = d.respondidas > 0 ? Math.round(100 * (d.acertos ?? 0) / d.respondidas) : null
  const numeros: Array<[string, string]> = ehPix && d.respondidas > 0 ? [
    [numero(d.respondidas), d.respondidas === 1 ? 'questão respondida' : 'questões respondidas'],
    [pct === null ? '-' : `${pct}%`, 'de acerto'],
    [numero(d.respondidas7d ?? 0), 'nos últimos 7 dias'],
  ] : []
  const placar = numeros.length ? `
      <tr><td style="padding:0 40px 18px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#7a5a12;padding-bottom:8px;">Sua jornada até aqui</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf5e6;border:1px solid #ecdcb0;border-radius:12px;">
          <tr>${numeros.map(([valor, rotulo], i) => `
            <td width="33%" align="center" valign="top" style="padding:16px 8px;${i ? 'border-left:1px solid #ecdcb0;' : ''}font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:26px;line-height:30px;font-weight:bold;color:#0f4f49;">${esc(valor)}</div>
              <div style="font-size:13px;line-height:18px;color:#5f6d69;padding-top:2px;">${esc(rotulo)}</div>
            </td>`).join('')}
          </tr>
        </table>
      </td></tr>` : ''

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(C.assunto)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f1;">${esc(C.previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f1;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">

      <tr><td style="background:#0b3a35;background-image:linear-gradient(135deg,#071f1c 0%,#0b3a35 55%,#14655e 100%);padding:26px 40px 28px 40px;border-bottom:4px solid #e0b862;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="top" style="font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:18px;line-height:22px;color:#ffffff;"><strong>Orto</strong> Questões</div>
              <div style="display:inline-block;margin-top:20px;padding:4px 10px;background:#e0b862;color:#2b1d02;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">${esc(C.selo)}</div>
              <div style="font-size:26px;line-height:32px;font-weight:bold;color:#ffffff;padding-top:12px;">${esc(C.titulo)}</div>
            </td>
            <td width="96" valign="bottom" align="right" style="padding-left:12px;">${img('ranking/mensageiro.png', 72, 90, 'O mensageiro do OrtoQuestões')}</td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="padding:26px 40px 18px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#33413d;">${esc(C.lide)}</td></tr>

      ${placar}

      ${blocos}

      <tr><td align="center" style="padding:16px 40px 6px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="border-radius:12px;background:#146b61;box-shadow:inset 0 -4px 0 #0f4f49;">
            <a href="${C.link}" style="display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(C.botao)}</a>
          </td></tr>
        </table>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#5f6d69;padding-top:14px;">${C.rodape}</div>
      </td></tr>

      <tr><td style="padding:24px 40px 30px 40px;">
        <div style="border-top:1px solid #e3e9e7;padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#33413d;">
          Bons estudos,<br><strong>Tales</strong>, do OrtoQuestões
        </div>
      </td></tr>
    </table>

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
      <tr><td align="center" style="padding:18px 24px 6px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#7a8784;">
        Siga <a href="https://www.instagram.com/ortoquestoes" style="color:#146b61;font-weight:bold;text-decoration:none;">@ortoquestoes</a> no Instagram: questão comentada e macetes de prova.
      </td></tr>
      <tr><td align="center" style="padding:4px 24px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#98a4a1;">
        Você recebe este e-mail porque tem uma conta no OrtoQuestões.<br>
        <a href="${d.linkDescadastro}" style="color:#98a4a1;text-decoration:underline;">Não quero mais receber lembretes</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  const texto = [
    C.titulo,
    '',
    C.lide,
    '',
    ...(numeros.length ? ['Sua jornada até aqui: ' + numeros.map(([v, r]) => `${v} ${r}`).join(' · '), ''] : []),
    ...C.corpo.flatMap(([, titulo, texto]) => [`• ${titulo}: ${texto}`]),
    '',
    `${C.botao}: ${C.link}`,
    '',
    'Bons estudos,',
    'Tales, do OrtoQuestões',
    '',
    `Não quer mais receber lembretes? ${d.linkDescadastro}`,
  ].join('\n')

  return { assunto: C.assunto, html, texto }
}

export interface DadosRelatoResolvido {
  nome: string | null
  idQuestao: string
  /** O que a pessoa escreveu ao relatar. */
  relato: string
  /** O que foi feito, escrito pelo administrador (opcional). */
  nota: string | null
  site: string
}

/** Rótulo da questão pelo id: "Trauma adulto, questão 44". */
export function rotuloQuestao(id: string): string {
  const [, prefixo, numero] = id.match(/^(.*)-(\d+)$/) ?? []
  return prefixo && TEMAS[prefixo] ? `${TEMAS[prefixo]}, questão ${Number(numero)}` : id
}

/**
 * Aviso de que um relato de erro foi resolvido. Formato carta, como os
 * recados: texto simples, sem cartão, assinado. É uma resposta a quem
 * escreveu, não uma campanha, por isso não tem link de descadastro.
 */
export function emailRelatoResolvido(d: DadosRelatoResolvido): { assunto: string; html: string; texto: string } {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? ''
  const rotulo = rotuloQuestao(d.idQuestao)
  const link = `${d.site}#/questao/${encodeURIComponent(d.idQuestao)}`
  const relato = d.relato.trim().replace(/\s+/g, ' ')
  const trecho = relato.length > 240 ? relato.slice(0, 240).replace(/\s\S*$/, '') + '…' : relato
  const nota = d.nota?.trim() || null
  const assunto = `Corrigimos a questão que você relatou (${rotulo})`
  const paragrafos = [
    `Você relatou um problema na questão de ${rotulo} do OrtoQuestões. Conferimos e a questão já foi corrigida no site.`,
    ...(nota ? [`O que foi feito: ${nota}`] : []),
    'Obrigado por avisar. Cada relato deixa o banco de questões melhor para todo mundo que está estudando.',
  ]
  const p = (conteudo: string, estilo = '') => `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#222222;${estilo}">${conteudo}</p>`
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;padding:24px 20px;">
${p(nome ? `Oi, ${esc(nome)},` : 'Oi,')}
${paragrafos.map((t) => p(esc(t))).join('\n')}
${p(`Seu relato: “${esc(trecho)}”`, 'color:#555555;font-style:italic;')}
${p(`Ver a questão: <a href="${link}" style="color:#146b61;">${esc(link.replace(/^https?:\/\//, ''))}</a>`)}
${p('Um abraço,<br>Tales<br><span style="color:#666666;">OrtoQuestões</span>')}
</div>
</body>
</html>`
  const texto = [
    nome ? `Oi, ${nome},` : 'Oi,', '',
    ...paragrafos.flatMap((t) => [t, '']),
    `Seu relato: "${trecho}"`, '',
    `Ver a questão: ${link}`, '',
    'Um abraço,', 'Tales', 'OrtoQuestões',
  ].join('\n')
  return { assunto, html, texto }
}
