// Sorteia o estilo do próximo post entre os estilos oficiais (sem repetir o último) e,
// com "criar", já monta a pasta do post a partir do modelo.
// Uso:
//   node marketing/instagram/estilos/sortear.mjs
//   node marketing/instagram/estilos/sortear.mjs criar <slug>
//   node marketing/instagram/estilos/sortear.mjs criar <estilo> <slug>
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'

const pasta = dirname(fileURLToPath(import.meta.url))
const raiz = join(pasta, '..', '..', '..')
const ESTILOS = {
  cartas: { nome: 'Jogo de cartas', slides: 7, story: 's1-cartas', figurinha: 'nenhuma (só a imagem)' },
  plantao: { nome: 'Plantão das 3h14', slides: 5, story: 's2-plantao', figurinha: 'nenhuma (só a imagem)' },
  'ache-o-erro': { nome: 'Ache os 3 erros', slides: 3, story: 's3-caderno', figurinha: 'nenhuma (só a imagem)' },
  linhas: { nome: 'Linhas do metrô', slides: 5, story: 's1-linha e s2-estacoes', figurinha: 'nenhuma (só a imagem)', proprio: true },
}
const arquivoHistorico = join(pasta, 'historico.json')
const historico = existsSync(arquivoHistorico) ? JSON.parse(readFileSync(arquivoHistorico, 'utf8')) : []

const [comando, a, b] = process.argv.slice(2)
const escolhido = comando === 'criar' && b ? a : null
if (escolhido && !ESTILOS[escolhido]) {
  console.error(`Estilo desconhecido: ${escolhido}. Use: ${Object.keys(ESTILOS).join(', ')}`)
  process.exit(1)
}
const slug = comando === 'criar' ? (b ?? a) : null
if (comando === 'criar' && !slug) {
  console.error('Informe o nome da pasta: sortear.mjs criar <slug>')
  process.exit(1)
}

// Aleatório, só sem repetir o último estilo publicado.
function sortear() {
  const ultimo = historico.at(-1)?.estilo
  const opcoes = Object.keys(ESTILOS).filter((e) => e !== ultimo)
  return opcoes[Math.floor(Math.random() * opcoes.length)]
}

const estilo = escolhido ?? sortear()
const ficha = ESTILOS[estilo]
console.log(`Estilo: ${ficha.nome} (${estilo})`)
console.log(`Carrossel de ${ficha.slides} slides 1080x1350; story semeador "${ficha.story}", figurinha: ${ficha.figurinha}.`)
console.log(`Guia: ${relative(process.cwd(), join(pasta, 'ESTILOS.md'))}`)

if (slug) {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const destino = join(pasta, '..', 'posts', `${hoje}-${slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`)
  if (existsSync(join(destino, 'post.html'))) {
    console.error(`Já existe: ${relative(process.cwd(), destino)}`)
    process.exit(1)
  }
  mkdirSync(destino, { recursive: true })
  copyFileSync(join(pasta, estilo, 'modelo.html'), join(destino, 'post.html'))
  const caminhoPost = relative(raiz, join(destino, 'post.html'))
  writeFileSync(join(destino, 'LEGENDA.md'), `# Post: ${slug} (estilo ${ficha.nome})

Carrossel de ${ficha.slides} slides (1080×1350), a partir de \`estilos/${estilo}/modelo.html\`.

\`\`\`
node marketing/instagram/gerar.mjs ${caminhoPost}
\`\`\`

## Legenda do feed

(escrever seguindo a fórmula do estilo em estilos/ESTILOS.md)

## Story semeador

${ficha.proprio ? `Stories no próprio post.html (${ficha.story}), figurinha: ${ficha.figurinha}.` : `Seção \`${ficha.story}\` de \`estilos/stories/modelo.html\`, figurinha: ${ficha.figurinha}.`}

## Conferência antes de publicar

Fonte do conteúdo (livro-texto ou questão tema-NNNN) e revisão médica.
`)
  historico.push({ data: hoje, estilo, post: slug })
  writeFileSync(arquivoHistorico, JSON.stringify(historico, null, 2) + '\n')
  console.log(`Criado: ${relative(process.cwd(), destino)}/post.html e LEGENDA.md`)
}
