// Renderização dos comentários (TextoEditorial, auditoria de 15/10/2026, T2.9): itálico,
// barra escapada em tabela, "##", tabela de 3+ colunas em cartões no celular, e todo o
// acervo de comentários renderiza sem asterisco de itálico sobrando.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Fora do /tmp: o React fica externo e precisa ser achado no node_modules do projeto.
const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-te-'))
const arquivo = join(pasta, 't.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/TextoEditorial'; export { createElement } from 'react'; export { renderToStaticMarkup } from 'react-dom/server'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, external: ['react', 'react-dom', 'react/*', 'react-dom/*'],
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const html = (texto) => m.renderToStaticMarkup(m.createElement(m.TextoEditorial, { texto }))

  // Itálico, com negrito por perto, sem pegar multiplicação nem asterisco solto.
  assert.match(html('Causada pelo *Mycobacterium tuberculosis*.'), /<em>Mycobacterium tuberculosis<\/em>/)
  assert.match(html('**urogenital** (*Chlamydia trachomatis*)'), /<strong>urogenital<\/strong> \(<em>Chlamydia trachomatis<\/em>\)/)
  assert.match(html('A bactéria ***Salmonella*** é clássica.'), /<strong><em>Salmonella<\/em><\/strong>/)
  assert.match(html('**Correta: D (*Kingella kingae*).** Gram-negativo.'), /<strong>Correta: D \(<em>Kingella kingae<\/em>\)\.<\/strong>/)
  assert.doesNotMatch(html('Conta 2*3*4 sem itálico.'), /<em>/)
  assert.doesNotMatch(html('Nota * solta * aqui.'), /<em>/)
  // "##" vira subtítulo como "###".
  assert.match(html('## Classificação'), /<h4 class="te-titulo">Classificação<\/h4>/)
  // Barra escapada fica dentro da célula.
  assert.equal(m.celulasDaLinha('| Garden I \\| II | Estável |').length, 2)
  assert.equal(m.celulasDaLinha('| Garden I \\| II | Estável |')[0], 'Garden I | II')
  // 3+ colunas: classe de cartões e o nome da coluna em cada célula (menos a primeira).
  const larga = html('| Tipo | Traço | Conduta |\n|---|---|---|\n| I | Sem desvio | Gesso |')
  assert.match(larga, /te-tabela--cartoes/)
  assert.match(larga, /<td data-rotulo="Traço">Sem desvio<\/td>/)
  assert.doesNotMatch(html('| A | B |\n|---|---|\n| 1 | 2 |'), /te-tabela--cartoes/)

  // O acervo inteiro: nada quebra e nenhum *itálico* aparece cru.
  let total = 0, tabelas = 0
  const sobras = []
  for (const nome of await readdir('public/acervo/comentarios')) {
    const comentarios = JSON.parse(await readFile(join('public/acervo/comentarios', nome), 'utf8'))
    for (const [id, c] of Object.entries(comentarios)) {
      for (const texto of [c.conceito, c.correta, ...Object.values(c.incorretas ?? {})]) {
        if (!texto) continue
        total++
        const saida = html(texto)
        if (saida.includes('te-tabela')) tabelas++
        const cru = saida.replace(/<[^>]+>/g, '').match(/(^|[\s(])\*[^*\s][^*]*?[^*\s]\*(?=[\s).,;:]|$)/)
        if (cru) sobras.push(`${id}: ${cru[0].trim()}`)
      }
    }
  }
  assert.deepEqual(sobras.slice(0, 5), [], `itálico cru em ${sobras.length} texto(s)`)
  console.log(`Texto editorial: itálico, barra escapada, ##, tabelas em cartões; ${total} textos do acervo renderizados (${tabelas} com tabela), sem itálico cru.`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
