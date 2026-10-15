// Depois de entregar o post ao Tales: anota o estilo em estilos/historico.json, o id da questão em
// publicadas.md e marca o JSON da fila como "entregue". Não publica nada em rede social.
// Uso: node marketing/kit/registrar.mjs marketing/kit/fila/post-07.json
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { INSTAGRAM, acharPost, ler } from './lib/comum.mjs'

const arq = acharPost(process.argv[2])
if (!arq) { console.error('Uso: node marketing/kit/registrar.mjs <fila/post-NN.json>'); process.exit(1) }
const post = ler(arq)
if (post.status === 'entregue' || post.registrado) { console.log(`${post.post} já estava registrado.`); process.exit(0) }

const nome = `kit-${post.post}-${post.slug ?? ''}`.replace(/-$/, '')
const hist = join(INSTAGRAM, 'estilos', 'historico.json')
const h = JSON.parse(readFileSync(hist, 'utf8'))
for (const p of post.pecas) h.push({ data: post.data, estilo: p.estilo, post: nome })
writeFileSync(hist, JSON.stringify(h, null, 2) + '\n')

if (post.questao) {
  const md = join(INSTAGRAM, 'publicadas.md')
  const assunto = post.assunto ?? post.questao.subtema ?? ''
  const prova = post.questao.simulado ? 'Simulados' : `${post.questao.prova} ${post.questao.ano ?? ''}`.trim()
  const linha = `| ${post.questao.id} | ${assunto} (${prova}) | marketing/kit/fila/${post.post}.json (${post.data}) |\n`
  writeFileSync(md, readFileSync(md, 'utf8').replace(/\n*$/, '\n') + linha)
}

post.status = 'entregue'
post.registrado = true
writeFileSync(arq, JSON.stringify(post, null, 2) + '\n')
console.log(`Registrado: ${post.post} em historico.json${post.questao ? ` e ${post.questao.id} em publicadas.md` : ''}.`)
console.log('Faça o commit desses arquivos junto com o JSON do post.')
