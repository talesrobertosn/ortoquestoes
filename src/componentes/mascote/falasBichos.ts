/**
 * As falas dos bichos (01/11/2026, pedido do Tales): a coruja é a sábia e, a cada toque, explica um conceito que
 * cai na prova (uma frase, do jeito que a gente guarda); o gato é o preguiçoso e só quer descansar. Um lugar só para
 * a página inicial, o menu, o ranking e a Biblioteca. Cada toque traz uma fala diferente: a ordem é embaralhada por
 * sessão e só repete depois de passar por todas (fixtures/testar_falas_bichos.mjs confere tamanho e repetição).
 */
export const CONCEITOS_CORUJA: readonly string[] = [
  'Salter-Harris II: o traço passa pela fise e sai pela metáfise (o fragmento de Thurston-Holland). É o tipo mais comum.',
  'Salter-Harris V: compressão da fise. Muitas vezes só se descobre depois, pelo distúrbio de crescimento.',
  'Garden classifica o colo do fêmur de I a IV: III e IV são as desviadas.',
  'Pauwels olha a inclinação do traço no colo do fêmur: o tipo III passa de 50 graus e é o mais instável.',
  'Neer divide o úmero proximal em 4 partes: uma parte conta como desviada com mais de 1 cm ou 45 graus.',
  'Gustilo IIIB: exposta que precisa de cobertura de partes moles. IIIC: lesão arterial que precisa de reparo.',
  'Schatzker VI no platô tibial: o traço separa a metáfise da diáfise.',
  'Weber olha a fíbula e a sindesmose: A abaixo, B no nível, C acima.',
  'Lauge-Hansen: supinação-rotação externa é o mecanismo mais comum de fratura do tornozelo.',
  'Sinal de Hawkins: a faixa radiolucente no domo do tálus, de 6 a 8 semanas, indica vascularização. Bom sinal!',
  'Monteggia é fratura da ulna com luxação da cabeça do rádio. Bado I, anterior, é a mais comum.',
  'Galeazzi é fratura do rádio com lesão da radioulnar distal. Sem cirurgia, costuma ir mal no adulto.',
  'Essex-Lopresti: cabeça do rádio + membrana interóssea + radioulnar distal. Atenção ao punho!',
  'Tríade terrível do cotovelo: luxação, fratura da cabeça do rádio e do coronoide.',
  'Gartland III na supracondiliana da criança: desviada, sem contato cortical.',
  'Na supracondiliana em extensão, o nervo mais lesado é o interósseo anterior: a criança não faz o "OK".',
  'Escafoide: a irrigação entra pelo polo distal; o polo proximal é o que corre risco de necrose.',
  'Kienböck é a necrose do semilunar, associada à variância ulnar negativa.',
  'Bennett: fratura-luxação da base do 1º metacarpo; o abdutor longo do polegar puxa a diáfise.',
  'Fratura do boxeador é a do colo do 5º metacarpo.',
  'Dedo em martelo: perdeu o extensor terminal na falange distal. Dedo de camisa (jersey): avulsão do flexor profundo, mais no anular.',
  'Perthes: necrose da cabeça femoral, em geral dos 4 aos 8 anos; o pilar lateral de Herring dá o prognóstico.',
  'Epifisiólise instável (Loder) é quando a criança não consegue apoiar: o risco de necrose é bem maior.',
  'Displasia do quadril: Ortolani reduz o quadril luxado; Barlow luxa o quadril instável.',
  'Pé torto congênito, CAVE: cavo, aduto, varo e equino. No Ponseti, o equino é o último a corrigir.',
  'Blount infantil: ângulo metáfise-diáfise de Drennan acima de 16 graus aponta para a tíbia vara.',
  'Osteossarcoma: metáfise, em volta do joelho, com triângulo de Codman e raios de sol.',
  'Ewing: diáfise, translocação t(11;22) e reação periosteal em casca de cebola.',
  'Tumor de células gigantes: lítico, excêntrico, na epífise do esqueleto maduro.',
  'Osteoma osteoide: dor noturna que melhora com anti-inflamatório e nidus pequeno, abaixo de 2 cm.',
  'Escore de Mirels de 9 ou mais: risco alto de fratura patológica, pense em fixação profilática.',
  'Lisfranc: o fleck sign na base do 2º metatarso denuncia a lesão tarsometatársica.',
  'Fratura de Jones: zona 2 do 5º metatarso, a junção metáfise-diáfise, de irrigação pobre.',
  'Síndrome compartimental: dor desproporcional e dor ao estiramento passivo vêm primeiro. Delta abaixo de 30 mmHg, fasciotomia.',
  'Embolia gordurosa: hipoxemia, alteração neurológica e petéquias, em geral 24 a 72 horas depois da fratura.',
  'Colles desvia o fragmento para dorsal; Smith, para volar.',
  'Seddon: neuropraxia (só condução), axonotmese (axônio rompido) e neurotmese (nervo rompido).',
  'Lachman é o teste mais sensível para o ligamento cruzado anterior.',
  'Na luxação anterior do ombro: Hill-Sachs na cabeça do úmero, Bankart no lábio anteroinferior.',
  'Meyerding gradua a espondilolistese pelo escorregamento: grau I até 25%, e assim por diante.',
]

export const FALAS_GATO: readonly string[] = [
  'Cinco minutinhos... de soneca, não de estudo.',
  'Eu revisei. Revisei o travesseiro.',
  'Hoje é dia de descanso. Ontem também foi.',
  'Me acorda quando cair gato na prova.',
  'Decúbito dorsal: a melhor posição para memorizar.',
  'Já fiz a minha parte: guardei o lugar quentinho.',
  'Você pratica a teoria, eu pratico o repouso relativo.',
  'Shhh. Estou em fase de consolidação.',
  'Eu não durmo: faço revisão espaçada de sonecas.',
  'Meu cronograma: dormir, comer, dormir de novo.',
  'A coruja sabe tudo. Eu sei onde bate o sol.',
  'Isso é carinho ou é consulta?',
  'Repouso, gelo, compressão e mais repouso.',
  'Hoje estou em carga zero, por orientação médica.',
  'Pode treinar, eu fico de supervisor. De olhos fechados.',
  'Já li esse resumo. Dormi na página dois.',
  'Ronronar também conta como revisão.',
  'Questão difícil? Deita um pouquinho que passa.',
  'Mais uma questão? Pode ir. Eu torço daqui.',
  'Acordei só para dizer que vou voltar a dormir.',
  'Sete vidas e nenhuma delas para fazer simulado.',
  'Meu recorde de sequência: 14 horas de sono seguidas.',
]

const embaralhar = (n: number) => {
  const ordem = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ordem[i], ordem[j]] = [ordem[j], ordem[i]] }
  return ordem
}

/**
 * A próxima fala de uma lista: embaralhada uma vez por sessão do navegador, sem repetir até acabar (e nunca a mesma
 * duas vezes seguidas na virada). `chave` separa as listas (coruja, gato).
 */
export function proximaFala(chave: 'coruja' | 'gato', lista: readonly string[]): string {
  const nome = `bichos:fala:${chave}`
  let estado: { ordem: number[]; i: number } | null = null
  try { estado = JSON.parse(sessionStorage.getItem(nome) ?? 'null') } catch { /* sem sessionStorage */ }
  if (!estado || estado.ordem.length !== lista.length || estado.i >= lista.length) {
    const ultima = estado?.ordem?.[estado.ordem.length - 1]
    let ordem = embaralhar(lista.length)
    if (ordem[0] === ultima && ordem.length > 1) ordem = [...ordem.slice(1), ordem[0]]
    estado = { ordem, i: 0 }
  }
  const fala = lista[estado.ordem[estado.i]]
  estado.i++
  try { sessionStorage.setItem(nome, JSON.stringify(estado)) } catch { /* sem sessionStorage */ }
  return fala
}
