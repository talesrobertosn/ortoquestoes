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
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:22px;color:#ffffff;"><strong>Orto</strong>Questões</div>
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
