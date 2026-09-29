/**
 * Recado do e-mail de parabéns, escrito a partir do que a pessoa fez: ritmo,
 * acerto e temas. Sempre cordial e sem cobrança. Cada chamada com outra
 * `variante` troca as frases, para o administrador escolher a que soa melhor.
 * O texto começa sem saudação: a carta já abre com "Oi, Fulano,".
 */

export interface DadosRecado {
  respondidas: number
  /** Acerto geral, em %. */
  acerto: number | null
  /** Questões nos últimos 7 dias. */
  semana: number
  /** Dias desde a última atividade (null se nunca). */
  diasParado: number | null
  temas: Array<{ nome: string; acerto: number; total: number }>
}

const LIMITE = 600
const n = (v: number) => v.toLocaleString('pt-BR')
const escolher = (opcoes: string[], variante: number) => opcoes[((variante % opcoes.length) + opcoes.length) % opcoes.length]
const minusculo = (tema: string) => tema.charAt(0).toLowerCase() + tema.slice(1)

function abertura(d: DadosRecado, v: number): string {
  if (d.respondidas > 0 && d.diasParado !== null && d.diasParado >= 14) return escolher([
    'Senti sua falta por aqui nas últimas semanas. Sei que a rotina da residência aperta, e tudo bem: tudo o que você já fez continua guardado, esperando a sua volta.',
    'Faz um tempinho que você não aparece, e passei para dizer que o seu progresso está todo aqui. Quando a rotina der uma folga, uma sessão curta já retoma o embalo.',
    'Notei que você deu uma pausa. Acontece com todo mundo, principalmente com plantão pesado. O importante é que o caminho que você já andou não se perde.',
  ], v)
  if (d.respondidas < 150) return escolher([
    `Que bom ver você começando por aqui! As primeiras ${n(d.respondidas)} questões são as mais difíceis, porque é quando o hábito ainda está nascendo.`,
    `Parabéns pelo começo: ${n(d.respondidas)} questões já é um passo de verdade. O mais difícil é criar o hábito, e você já está nisso.`,
    `Fiquei feliz em ver você dando os primeiros passos no OrtoQuestões, com ${n(d.respondidas)} questões feitas.`,
  ], v)
  if (d.semana >= 150) return escolher([
    `Vi que você fez ${n(d.semana)} questões só nesta semana. É um ritmo de quem está levando a prova a sério, e dá gosto de ver.`,
    `${n(d.semana)} questões em sete dias! Esse volume faz muita diferença lá na frente, e quis te dar os parabéns por ele.`,
    `Que semana: ${n(d.semana)} questões. Constância assim é o que separa quem chega pronto na prova.`,
  ], v)
  if (d.semana >= 30) return escolher([
    `Vi que você manteve o ritmo nesta semana, com ${n(d.semana)} questões. É essa constância que faz a diferença no dia da prova.`,
    `Passei para te dar os parabéns pelas ${n(d.semana)} questões desta semana. Um pouco todo dia rende mais do que uma maratona de vez em quando.`,
    `Seu ritmo desta semana, com ${n(d.semana)} questões, mostra que o hábito já está criado. Isso é o mais difícil.`,
  ], v)
  return escolher([
    `Você já passou de ${n(d.respondidas)} questões no OrtoQuestões, e isso não é pouco. Cada uma delas é um tema a mais que você viu antes da prova.`,
    `${n(d.respondidas)} questões respondidas! Quis passar para reconhecer esse esforço, que nem sempre é fácil de encaixar na rotina.`,
    `Olhei o seu caminho até aqui e quis te dar os parabéns: ${n(d.respondidas)} questões é trabalho de quem está se preparando de verdade.`,
  ], v)
}

function desempenho(d: DadosRecado, v: number): string {
  if (d.acerto === null || d.respondidas < 30) return ''
  const a = d.acerto
  if (a >= 80) return escolher([
    `Seu acerto de ${a}% está excelente.`,
    `E com ${a}% de acerto, o que é um resultado muito bom.`,
  ], v)
  if (a >= 70) return escolher([
    `Seu acerto de ${a}% mostra uma base sólida.`,
    `Com ${a}% de acerto, você está num patamar muito bom.`,
  ], v)
  if (a >= 60) return escolher([
    `Seu acerto está em ${a}%, um bom patamar, e cada erro revisado agora é um ponto a mais no dia da prova.`,
    `Com ${a}% de acerto, você está no caminho. Os erros de hoje são exatamente o que você não vai errar na prova.`,
  ], v)
  return escolher([
    `Seu acerto está em ${a}%, e quero te dizer que isso é normal nesta fase: errar aqui é o que evita errar na prova. Revisar os erros é o que mais faz subir.`,
    `Sobre o acerto (${a}%): não se cobre demais. Questão de prova é difícil mesmo, e o que faz a nota subir é voltar nos erros com calma.`,
  ], v)
}

function temas(d: DadosRecado, v: number): string {
  const validos = d.temas.filter((t) => t.total >= 10)
  if (validos.length < 2 || d.acerto === null) return ''
  const forte = [...validos].sort((a, b) => b.acerto - a.acerto)[0]
  const fraco = [...validos].sort((a, b) => a.acerto - b.acerto)[0]
  const partes: string[] = []
  if (forte.acerto >= 70) partes.push(escolher([
    `Em ${minusculo(forte.nome)} você está mandando muito bem (${forte.acerto}%).`,
    `Destaque para ${minusculo(forte.nome)}, com ${forte.acerto}% de acerto.`,
  ], v))
  if (fraco !== forte && fraco.acerto < d.acerto - 8) partes.push(escolher([
    `Se eu pudesse sugerir um foco, seria ${minusculo(fraco.nome)}, onde dá para ganhar bastante ponto.`,
    `Vale dar um carinho extra para ${minusculo(fraco.nome)}: é onde você tem mais espaço para crescer.`,
  ], v))
  return partes.join(' ')
}

function fecho(d: DadosRecado, v: number): string {
  if (d.diasParado !== null && d.diasParado >= 14) return escolher([
    'Quando der, volte com uma sessão curta, de dez questões. Estou torcendo por você.',
    'Sem pressa: dez questões num dia tranquilo já recolocam tudo nos trilhos. Conte comigo.',
  ], v)
  return escolher([
    'Continue assim, no seu ritmo. Estou torcendo por você.',
    'Conte comigo nessa caminhada até a prova. Bons estudos!',
    'Siga firme. O esforço de agora aparece lá na frente.',
  ], v)
}

export function escreverRecado(d: DadosRecado, variante = 0): string {
  const blocos = [abertura(d, variante), [desempenho(d, variante), temas(d, variante)].filter(Boolean).join(' '), fecho(d, variante)].filter(Boolean)
  const texto = blocos.join('\n\n')
  if (texto.length <= LIMITE) return texto
  // Longo demais para o campo: tira primeiro os temas, depois o desempenho.
  const semTemas = [blocos[0], desempenho(d, variante), fecho(d, variante)].filter(Boolean).join('\n\n')
  return semTemas.length <= LIMITE ? semTemas : [blocos[0], fecho(d, variante)].join('\n\n').slice(0, LIMITE)
}
