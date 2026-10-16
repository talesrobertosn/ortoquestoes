/**
 * Frases do topo da página inicial. A cada visita aparece a próxima da lista
 * (numa ordem embaralhada fixa), então só depois de passar por todas uma frase
 * se repete. Sem emoji e sem números do acervo.
 */

function periodoDoDia(): string {
  const hora = new Date().getHours()
  return hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'
}

export interface FraseInicio {
  comNome: (nome: string) => string
  semNome: string
  incentivo: string
}

/** Atalho para as frases em que o nome entra no fim: "Frase, Nome." */
function f(frase: string, incentivo: string, semNome = `${frase}.`): FraseInicio {
  return { comNome: (nome) => `${frase}, ${nome}.`, semNome, incentivo }
}

export const FRASES_INICIO: FraseInicio[] = [
  { comNome: (nome) => `${periodoDoDia()}, ${nome}.`, semNome: `${periodoDoDia()}. Bora estudar?`, incentivo: 'Dez questões hoje valem mais do que cinquenta no domingo.' },
  { comNome: (nome) => `Redução anatômica, fixação estável. Bora, ${nome}.`, semNome: 'Redução anatômica, fixação estável.', incentivo: 'Conceito bem fixado não solta na hora da prova.' },
  f('Um conceito de cada vez', 'Consolidação leva tempo. Constância acelera.'),
  f('Carga progressiva', 'Como na reabilitação: um pouco por dia, sem pular etapas.', 'Carga progressiva, todos os dias.'),
  { comNome: (nome) => `Classificações na ponta da língua, ${nome}?`, semNome: 'Classificações na ponta da língua?', incentivo: 'Garden, Schatzker, Neer: a repetição transforma em reflexo.' },
  f('Que bom ver você de novo', 'A sequência de hoje começa na primeira questão.', 'Que bom ver você por aqui.'),
  f('Menos dúvida, mais critério', 'Entender por que a alternativa está errada também é acertar.'),
  f('Hora de afiar o raciocínio', 'Leia o enunciado com calma. O detalhe que decide costuma estar lá.'),
  f('A prova fica mais perto a cada questão', 'E você chega mais preparado a cada sessão.'),
  f('Mais um dia, mais um degrau', 'Você responde; a revisão espaçada cuida do resto.'),
  f('Todo osso consolida com carga', 'O conhecimento também. Estímulo certo, na frequência certa.'),
  f('Seu estudo, no seu ritmo', 'Uma sessão curta hoje mantém a engrenagem girando.'),
  f('Raciocínio clínico se treina', 'Cada questão comentada é uma aula curta e objetiva.'),
  f('Bora somar repertório', 'Quem revisa com método erra menos pelo mesmo caminho.'),
  f('Do enunciado à conduta', 'Diagnóstico, classificação e tratamento: é assim que a prova pensa.'),
  f('Constância vence intensidade', 'Pouco todo dia rende mais do que muito de vez em quando.'),
  // Novas
  f('Primeiro o ABC, depois a fratura', 'Prioridade certa no trauma e no estudo: comece pelo que vence hoje.'),
  f('Lei de Wolff também vale para o cérebro', 'O que é exigido com frequência se remodela mais forte.'),
  f('Pseudartrose de conceito não aparece aqui', 'Estabilidade e biologia: revisão no tempo certo e comentário lido com calma.'),
  f('Hoje é dia de fechar lacunas', 'Comece pelo tema em que você mais erra. É lá que a nota sobe.'),
  f('Sem gesso no raciocínio', 'Mobilidade precoce: responda, erre, entenda e siga.'),
  f('Pé torto se corrige com constância', 'Ponseti ensinou: correção gradual, troca a troca. Questão a questão também.'),
  f('O detalhe decide a alternativa', 'Lado, número, epônimo. A banca troca um deles e espera que você perceba.'),
  f('Pronto para o plantão de questões', 'Dez questões, café do lado e foco total.'),
  f('Uma radiografia vale mil palavras', 'Nas questões com imagem, descreva o que vê antes de ler as alternativas.'),
  f('Antes da conduta, a classificação', 'Classificação é a base de tudo: ela já aponta o tratamento.'),
  f('Bora transformar erro em acerto', 'Cada erro de hoje vira revisão amanhã. É assim que ele some.'),
  f('Tração contínua no estudo', 'Força pequena e constante alinha mais do que um puxão no fim de semana.'),
  f('Princípios AO para a sua rotina', 'Redução, estabilidade, preservação da biologia e mobilização precoce. Comece já.'),
  f('O acervo está esperando você', 'Escolha um tema e vá até o fim do comentário.'),
  f('Ganhe amplitude hoje', 'Um tema novo por semana amplia o arco de movimento da sua prova.'),
  f('Treino é treino, prova é jogo', 'Errar aqui é barato. Errar na prova é caro.'),
  f('Do Salter-Harris ao Schatzker', 'Classificações viram reflexo quando aparecem do jeito que a banca cobra.'),
  f('O R1 que você foi agradece', 'E o especialista que você vai ser também.'),
  f('Hoje, dez. Amanhã, mais dez', 'A soma de dias comuns é o que faz a prova parecer fácil.'),
  f('Estude como quem opera', 'Planejamento, técnica e revisão. Sem pressa e sem atalho.'),
  f('Mais um tijolo na sua base', 'Anatomia, biomecânica e classificação seguram todo o resto.'),
  f('Conhecimento não tem janela de consolidação', 'Mas tem revisão espaçada, e ela funciona.'),
  f('Missão do dia: zerar as revisões', 'O que venceu hoje é o que mais rende agora.'),
  f('Respira e lê o enunciado de novo', 'A palavra INCORRETA já derrubou muita gente boa.'),
  f('Seu centro cirúrgico é aqui', 'Instrumental pronto: questões, comentário e revisão.'),
  f('Placa e parafuso no conhecimento', 'Fixe o conceito com o comentário e aperte com a revisão.'),
  f('Sem atalho para a consolidação', 'Mas com método, ela chega mais cedo.'),
  f('Um tema por vez, sem pressa', 'Profundidade antes de velocidade.'),
  f('Hoje o foco é você', 'Desligue as notificações por vinte minutos. Vale a pena.'),
  f('Pronto para mais uma rodada', 'A banca não muda tanto quanto parece. O treino mostra isso.'),
  f('Quem treina não chuta', 'Acerto seguro é o que conta. O chute volta amanhã para ser confirmado.'),
  f('Desvio corrigido, alinhamento mantido', 'Errou? Leia o porquê. Acertou? Confirme no comentário.'),
  f('Mão, coluna, quadril: escolha a sua linha', 'No Treinar, você combina as provas que quiser.'),
  f('Volte sempre ao básico', 'Anatomia é a pergunta escondida em metade das questões.'),
  f('O comentário é a aula', 'Leia mesmo quando acertar. É lá que mora o detalhe da próxima.'),
  { comNome: (nome) => `Que tal um simulado hoje, ${nome}?`, semNome: 'Que tal um simulado hoje?', incentivo: 'Tempo de prova, sem consulta. Treine a resistência também.' },
  f('Hoje tem progresso', 'Uma sessão curta já move o seu gráfico.'),
  f('A residência é longa, o estudo também', 'Ritmo sustentável ganha da maratona de véspera.'),
  f('Ortopedia é detalhe', 'E detalhe se aprende fazendo questão.'),
  f('Volta e meia a banca repete', 'Quem já viu a pergunta reconhece na hora.'),
  f('Hoje é dia de subir no ranking', 'Cada acerto conta. Cada revisão também.'),
  f('Mais firme do que uma banda de tensão', 'Transforme a força de tração do cansaço em compressão no foco.'),
  f('O consultório de amanhã começa hoje', 'O que você estuda agora vira conduta segura depois.'),
  f('Treino de hoje, tranquilidade na prova', 'Quem treinou chega ao dia da prova com calma.'),
  f('Nada de fratura por estresse', 'Dose certa: estude bem hoje e descanse também.'),
  f('Gabarito comentado, dúvida resolvida', 'Não fique com a dúvida: o comentário explica cada alternativa.'),
  f('Cada questão é uma consulta', 'História, exame, imagem e conduta. Treine o raciocínio inteiro.'),
  f('Bora para mais uma', 'Uma questão puxa a outra. Comece pela primeira.'),
  // 16/10/2026: mais algumas, no mesmo tom (o rodízio passa por todas antes de repetir).
  f('Calo ósseo se forma todo dia', 'Um pouco de estudo hoje vira estrutura firme amanhã.'),
  f('Teste de Lachman no conhecimento', 'Puxe o conceito: se tiver folga, o comentário fecha a lacuna.'),
  f('Ortopedista bom revisa o raio-x duas vezes', 'Na questão também: releia o enunciado antes de marcar.'),
  f('Hoje a anatomia vai a favor de você', 'Origem, inserção, inervação. O resto vem por consequência.'),
  f('Fixação estável, mobilização precoce', 'Entenda hoje, revise amanhã e siga em frente sem medo de errar.'),
  { comNome: (nome) => `Que tal começar pelo que mais cai, ${nome}?`, semNome: 'Que tal começar pelo que mais cai?', incentivo: 'O que a banca repete é o que mais rende no seu tempo curto.' },
  f('Seu repertório cresce a cada plantão', 'Cada caso visto e cada questão feita se ajudam.'),
  f('Pequenas doses, grandes consolidações', 'Vinte minutos bem usados valem mais do que uma noite em claro.'),
]

const CHAVE = 'oq-frase-inicio'

/** Ordem embaralhada, mas fixa (sempre a mesma), para o rodízio não repetir. */
const ORDEM = (() => {
  const indices = FRASES_INICIO.map((_, i) => i)
  let semente = 7
  for (let i = indices.length - 1; i > 0; i--) {
    semente = (semente * 9301 + 49297) % 233280
    const j = Math.floor((semente / 233280) * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
})()

/**
 * A próxima frase do rodízio. Guarda a posição no aparelho; sem armazenamento
 * (janela anônima, bloqueio), cai numa frase aleatória.
 */
export function proximaFraseInicio(): FraseInicio {
  try {
    const salvo = localStorage.getItem(CHAVE)
    const anterior = salvo === null ? NaN : Number(salvo)
    const posicao = Number.isInteger(anterior) && anterior >= 0 ? (anterior + 1) % ORDEM.length : Math.floor(Math.random() * ORDEM.length)
    localStorage.setItem(CHAVE, String(posicao))
    return FRASES_INICIO[ORDEM[posicao]]
  } catch {
    return FRASES_INICIO[Math.floor(Math.random() * FRASES_INICIO.length)]
  }
}
