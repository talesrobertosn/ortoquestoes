/**
 * Sala dos raros (easter egg do salão): curiosidades históricas tiradas dos próprios resumos, cada uma
 * com o link para a seção de onde saiu. O teste fixtures/testar_salao_biblioteca.mjs confere que o
 * capítulo e a seção existem.
 */
export interface Raro { ano: string; titulo: string; texto: string; capitulo: string; secao: string }

export const RAROS: Raro[] = [
  { ano: '1828', titulo: 'O neto de Pott', texto: 'A fratura do maléolo posterior leva o nome de Volkmann, mas foi descrita primeiro por Earle, neto de Pott, em 1828.', capitulo: 'rockwood10-65-tornozelo', secao: 'a-classificacao-de-lauge-hansen-e-a-de-danis-web' },
  { ano: '1859', titulo: 'A fratura vertical dupla', texto: 'Malgaigne foi o primeiro a descrever uma fratura do anel pélvico: ramos superior e inferior na frente e fratura ou luxação atrás.', capitulo: 'rockwood10-50-anel-pelvico', secao: 'classificacao-de-tile-e-as-outras' },
  { ano: '1876', titulo: 'O osso que encurva', texto: 'A deformidade plástica do antebraço foi descrita por Rauber em 1876, mas só ficou conhecida quase cem anos depois, com o trabalho clássico de Borden (1974).', capitulo: 'wilkins9-09-diafise-antebraco-crianca', secao: 'deformidade-plastica-o-osso-que-encurva' },
  { ano: '1911', titulo: 'Pilão ou plafond', texto: 'Destot descreveu a fratura do pilão tibial em 1911; Bonin preferiu chamá-la de plafond, o "teto" do tornozelo.', capitulo: 'rockwood10-64-pilao-tibial', secao: 'mecanismo-e-lesoes-associadas' },
  { ano: '1919', titulo: 'O astrágalo do aviador', texto: 'Anderson descreveu as fraturas do tálus nos pilotos: a barra do leme empurrava o pé no impacto.', capitulo: 'rockwood10-66-talus', secao: 'mecanismo-epidemiologia-e-lesoes-associadas' },
  { ano: '1922', titulo: 'Antes de Blount', texto: 'A tíbia vara foi descrita por Erlacher em 1922, quinze anos antes de Blount, que deu o nome à doença em 1937.', capitulo: 'tachdjian6-alinhamento-torcoes-coxa-vara', secao: 'tibia-vara-blount-e-displasia-fibrocartilaginosa' },
  { ano: '1929', titulo: 'A fratura do para-choque', texto: 'Cotton e Berg chamaram a fratura do planalto lateral de bumper fracture: o para-choque do carro batendo no joelho do pedestre.', capitulo: 'rockwood10-62-planalto-tibial', secao: 'mecanismo-e-padroes-de-fratura' },
  { ano: '1934', titulo: 'Os quatro fragmentos', texto: 'Codman mostrou que os traços do úmero proximal passam sempre entre quatro partes: cabeça, tubérculo maior, tubérculo menor e diáfise. Neer partiu daí em 1970.', capitulo: 'rockwood10-36-umero-proximal', secao: 'neer-ao-e-os-padroes-de-fratura' },
  { ano: '1961', titulo: 'As trabéculas de Garden', texto: 'Garden classificou a fratura do colo olhando só o AP e comparando as trabéculas compressivas da cabeça com as do acetábulo.', capitulo: 'rockwood10-53-colo-femur', secao: 'classificacoes' },
  { ano: '1979', titulo: 'A experiência de Toronto', texto: 'Schatzker publicou a classificação com 94 fraturas do planalto lateral tratadas entre 1968 e 1975.', capitulo: 'rockwood10-62-planalto-tibial', secao: 'classificacao-de-schatzker' },
  { ano: '2002', titulo: 'Os limites arbitrários', texto: 'O próprio Neer contou que 1 cm e 45° foram escolhidos arbitrariamente, por sugestão do editor, e não para indicar cirurgia.', capitulo: 'rockwood10-36-umero-proximal', secao: 'neer-ao-e-os-padroes-de-fratura' },
  { ano: '4h', titulo: 'O médico exausto', texto: 'A Danis-Weber é tão reprodutível que "até um médico exausto às quatro da manhã consegue aplicar", na frase citada por Lindsjö.', capitulo: 'rockwood10-65-tornozelo', secao: 'a-classificacao-de-lauge-hansen-e-a-de-danis-web' },
]
