/**
 * Modelos prontos para a carta pessoal do painel. O texto começa sem saudação
 * (a carta já abre com "Oi, Fulano,") e fala em primeira pessoa, como quem
 * cuida do projeto. Cada modelo usa os dados da pessoa para não soar genérico.
 * O administrador também pode salvar os próprios modelos neste navegador.
 */

export interface DadosModelo {
  respondidas: number
  acerto: number | null
  semana: number
  /** Dias desde a última atividade (null se nunca estudou). */
  diasParado: number | null
  /** Dias desde o cadastro. */
  diasConta: number
  servico: string | null
  situacao: string | null
  assinante: boolean
}

export interface Modelo { id: string; grupo: 'Retorno' | 'Pessoal' | 'Meus modelos'; titulo: string; texto: (d: DadosModelo) => string }

const PROVA = new Date('2027-01-10T12:00:00-03:00')
const n = (v: number) => v.toLocaleString('pt-BR')
const diasAteProva = () => Math.max(0, Math.ceil((PROVA.getTime() - Date.now()) / 86_400_000))
const noServico = (d: DadosModelo) => d.servico ? ` no ${d.servico}` : ''
const residencia = (d: DadosModelo) => d.situacao === 'ortopedista' ? 'a rotina de consultório e plantão' : 'a rotina da residência'

export const MODELOS: Modelo[] = [
  {
    id: 'nunca-comecou', grupo: 'Retorno', titulo: 'Criou a conta e não começou',
    texto: (d) => `Vi que você criou sua conta no OrtoQuestões${d.diasConta > 1 ? ` há ${d.diasConta} dias` : ''}, mas ainda não respondeu nenhuma questão. Sei que ${residencia(d)}${noServico(d)} não deixa muito tempo livre.

Uma sugestão: faça só 5 questões hoje, no intervalo de um plantão. Cada uma tem o comentário da certa e das erradas, então em 10 minutos já dá para aprender alguma coisa nova.

Se travou em alguma coisa no site, me responda este e-mail que eu ajudo.`,
  },
  {
    id: 'comecou-parou', grupo: 'Retorno', titulo: 'Fez poucas e parou',
    texto: (d) => `Vi que você começou bem no OrtoQuestões, com ${n(d.respondidas)} ${d.respondidas === 1 ? 'questão' : 'questões'}, mas deu uma pausa. Acontece com todo mundo: o mais difícil é transformar o começo em hábito.

O que mais funciona é pouco e todo dia. Cinco questões por dia já acendem a sua sequência e, quando você vê, já passou de cem. Tudo o que você fez continua salvo, inclusive os erros, que voltam na revisão para fixar.

Bora fazer as próximas hoje?`,
  },
  {
    id: 'sumiu', grupo: 'Retorno', titulo: 'Sumiu há semanas',
    texto: (d) => `Senti sua falta por aqui${d.diasParado ? ` nas últimas ${Math.max(1, Math.round(d.diasParado / 7))} semanas` : ''}. Sei como ${residencia(d)} aperta, e está tudo bem: as suas ${n(d.respondidas)} questões e a sua revisão continuam guardadas, esperando a sua volta.

Para retomar sem peso, abra a Revisão e faça só as que vencem hoje. Em quinze minutos você já está de volta ao ritmo.

Estou torcendo por você.`,
  },
  {
    id: 'reta-final', grupo: 'Retorno', titulo: 'A prova está chegando',
    texto: (d) => `Faltam ${diasAteProva()} dias para a prova do TEOT, em 10 de janeiro. Passei para lembrar que ainda dá tempo de fazer muita coisa${d.respondidas ? `, e você já tem ${n(d.respondidas)} questões no caminho` : ''}.

Se ajudar, monte o seu Cronograma: você coloca a data da prova e ele diz quantas questões fazer por dia e quais temas atacar primeiro, começando pelo que mais cai.

Conte comigo nessa reta final.`,
  },
  {
    id: 'cronograma', grupo: 'Retorno', titulo: 'Convite para o Cronograma',
    texto: () => `Queria te apresentar uma coisa que o pessoal tem gostado bastante: o Cronograma. Você diz a data da prova e o site monta a meta de cada dia e os temas de cada semana, na ordem do que mais cai no TEOT e no TARO.

Se um dia você atrasar, ele recalcula sozinho. Se adiantar, alivia. A prévia do seu cronograma é grátis, vale dar uma olhada.`,
  },
  {
    id: 'boas-vindas', grupo: 'Pessoal', titulo: 'Boas-vindas pessoal',
    texto: (d) => `Que bom ter você no OrtoQuestões! Sou eu que cuido do site, e fico feliz de ver mais alguém${d.servico ? ` do ${d.servico}` : ''} estudando por aqui.

Três dicas para começar: treine por tema, leia o comentário mesmo quando acertar e deixe a Revisão trazer de volta o que você errou. E se encontrar qualquer erro ou tiver uma ideia, é só responder este e-mail.

Bons estudos!`,
  },
  {
    id: 'ritmo', grupo: 'Pessoal', titulo: 'Parabéns pelo ritmo',
    texto: (d) => `Passei para te dar os parabéns: ${d.semana ? `${n(d.semana)} questões só nesta semana` : `${n(d.respondidas)} questões até aqui`}. Esse é o ritmo de quem está levando a prova a sério, e dá gosto de ver.${d.acerto !== null && d.respondidas >= 30 ? ` E com ${d.acerto}% de acerto.` : ''}

Continue assim, no seu ritmo. O esforço de agora aparece lá na frente.`,
  },
  {
    id: 'opiniao', grupo: 'Pessoal', titulo: 'Pedir opinião',
    texto: (d) => `Você já fez ${n(d.respondidas)} questões no OrtoQuestões, então ninguém melhor para me dizer o que está bom e o que dá para melhorar.

O que você mais usa? Sentiu falta de alguma coisa? Teve algum comentário que não ajudou? Pode responder este e-mail do jeito que quiser, mesmo que seja uma linha. Eu leio todas.`,
  },
  {
    id: 'indicar', grupo: 'Pessoal', titulo: 'Pedir para indicar',
    texto: (d) => `Queria te agradecer por estudar no OrtoQuestões. O site é um projeto independente e cresce no boca a boca, então um pedido: se você gosta, manda o link para os colegas${d.servico ? ` do ${d.servico}` : ' da residência'}.

As questões têm uma parte gratuita todo dia, e estudar junto rende mais (e deixa o ranking mais disputado). O endereço é ortoquestoes.com.br.

Muito obrigado!`,
  },
  {
    id: 'obrigado-assinante', grupo: 'Pessoal', titulo: 'Agradecer a assinatura',
    texto: () => `Queria te agradecer pessoalmente por assinar o OrtoQuestões. É a assinatura que paga o servidor e o tempo de manter as questões e os comentários em dia, e cada uma faz diferença.

Se tiver qualquer sugestão, problema ou ideia, responda este e-mail que eu leio e respondo. Bons estudos e conte comigo até a prova!`,
  },
]

/** Modelos salvos pelo administrador neste navegador. Podem usar {questoes}, {servico}, {dias} e {prova}. */
const CHAVE = 'ortoquestoes:admin-modelos-email'
export interface ModeloSalvo { id: string; titulo: string; texto: string }

export function lerModelosSalvos(): ModeloSalvo[] {
  try { return JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as ModeloSalvo[] } catch { return [] }
}
export function gravarModelosSalvos(lista: ModeloSalvo[]) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)) } catch { /* sem armazenamento */ }
}
export function preencher(texto: string, d: DadosModelo): string {
  return texto
    .replace(/\{questoes\}/g, n(d.respondidas))
    .replace(/\{servico\}/g, d.servico ?? 'seu serviço')
    .replace(/\{dias\}/g, String(d.diasParado ?? 0))
    .replace(/\{prova\}/g, String(diasAteProva()))
}

/** O modelo que mais combina com a situação da pessoa, para vir pré-selecionado. */
export function modeloSugerido(d: DadosModelo): string {
  if (d.respondidas === 0) return 'nunca-comecou'
  if (d.diasParado !== null && d.diasParado >= 14) return 'sumiu'
  if (d.respondidas < 30 && d.diasParado !== null && d.diasParado >= 2) return 'comecou-parou'
  if (d.diasConta <= 3) return 'boas-vindas'
  if (d.semana >= 50) return 'ritmo'
  return d.assinante ? 'obrigado-assinante' : 'cronograma'
}
