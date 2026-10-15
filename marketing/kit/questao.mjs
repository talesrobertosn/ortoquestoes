// Copia uma questão do acervo no formato do JSON da fila (enunciado, alternativas, gabarito,
// imagens e trechos do comentário, sem mudar nada), ou procura questões ainda não publicadas.
// Uso:
//   node marketing/kit/questao.mjs trauma-0746                 (imprime o bloco "questao")
//   node marketing/kit/questao.mjs buscar compartimental       (procura no TEOT e TARO)
//   node marketing/kit/questao.mjs buscar "nervo" --imagem --area mao
import { acervo, blocoQuestao, publicadas } from './lib/comum.mjs'

const [cmd, ...resto] = process.argv.slice(2)
if (!cmd) {
  console.error('Uso: node marketing/kit/questao.mjs <id>  |  buscar <palavra> [--imagem] [--area <slug>] [--todas-as-provas]')
  process.exit(1)
}

if (cmd === 'buscar') {
  const imagem = resto.includes('--imagem')
  const todas = resto.includes('--todas-as-provas')
  const ia = resto.indexOf('--area')
  const area = ia >= 0 ? resto[ia + 1] : null
  const palavra = resto.filter((x, i) => !x.startsWith('--') && !(ia >= 0 && i === ia + 1))[0] ?? ''
  const re = new RegExp(palavra, 'i')
  const pub = publicadas()
  let n = 0
  for (const [id, { q, c, slug }] of acervo()) {
    if (area && slug !== area) continue
    if (q.anulada || q.simulado || (!todas && !/TEOT|TARO/.test(q.prova ?? ''))) continue
    if (imagem && !(q.imagens ?? []).length) continue
    if (!c?.correta) continue
    const texto = q.enunciado + ' ' + q.alternativas.map((a) => a.texto).join(' ')
    if (!re.test(texto)) continue
    const ja = pub.jaSaiu(id)
    console.log(`${id}  ${q.prova} ${q.ano ?? ''}  gab ${q.gabarito}  img ${(q.imagens ?? []).length}${ja.length ? '  JÁ PUBLICADA' : ''}${c.alerta ? '  (tem alerta)' : ''}`)
    console.log(`   ${q.enunciado.slice(0, 150)}`)
    if (++n >= 40) { console.log('... (40 primeiras; refine a busca)'); break }
  }
  if (!n) console.log('Nada encontrado.')
} else {
  const bloco = blocoQuestao(cmd)
  if (!bloco) { console.error(`Questão ${cmd} não existe no acervo.`); process.exit(1) }
  const ja = publicadas().jaSaiu(cmd)
  if (ja.length) console.error(`ATENÇÃO: já publicada (${ja.join(', ')}). Escolha outra.`)
  console.log(JSON.stringify({ questao: bloco }, null, 2))
}
