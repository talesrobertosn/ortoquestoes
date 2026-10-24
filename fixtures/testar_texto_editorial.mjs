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
    stdin: { contents: `export * from './src/componentes/TextoEditorial'; export { FonteComentario } from './src/componentes/FonteComentario'; export { semEco } from './src/componentes/ecoAlternativa'; export { createElement } from 'react'; export { renderToStaticMarkup } from 'react-dom/server'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, external: ['react', 'react-dom', 'react/*', 'react-dom/*'],
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const html = (texto) => m.renderToStaticMarkup(m.createElement(m.TextoEditorial, { texto }))

  // A recomendação de resumo não classifica comentários antigos como revisados.
  assert.equal(m.renderToStaticMarkup(m.createElement(m.FonteComentario, {})), '')
  const origemResumo = m.renderToStaticMarkup(m.createElement(m.FonteComentario, { base: {
    tipo: 'resumo', fontes: [{ resumo: 'capitulo', titulo: 'Título', livro: 'Livro', edicao: '10ª', capitulo: '45', secoes: ['Seção'], blocos: ['b 1'] }]
  }}))
  assert.match(origemResumo, /Comentário baseado em resumo/)
  assert.match(origemResumo, /Leia o resumo: Título/)
  assert.match(origemResumo, /resumos\/capitulo\?bloco=b%201/)

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
  // Tabela de uma linha só (sem corpo) não entra no modo cartão, que esconde o cabeçalho no celular.
  assert.doesNotMatch(html('| retrovascular | IFD (residual) | dorsal ao feixe |'), /te-tabela--cartoes/)
  // Linha que continua o grupo (1ª célula vazia) leva o nome do grupo para o cartão.
  assert.match(html('| Eixo | Achado | Pontos |\n|---|---|---|\n| Morfologia | Sem alteração | 0 |\n| | Compressão | 1 |'), /<td data-grupo="Morfologia"><\/td><td data-rotulo="Achado">Compressão<\/td>/)

  // Modo realce (só o cartão da questão): desligado, a saída é a de sempre.
  const comRealce = (texto) => m.renderToStaticMarkup(m.createElement(m.TextoEditorial, { texto, realce: true }))
  assert.doesNotMatch(html('**Na prova:** senil tem **osteoclasto diminuído**.'), /te-prova|te-forte/)
  assert.match(html('**curto**'), /<strong>curto<\/strong>/)
  // Abertura de parágrafo que fecha em ponto é mini-título; até 4 palavras é ênfase curta; o resto, longo.
  assert.match(comRealce('**As fraturas da zona III.** Têm pior prognóstico.'), /<strong class="te-forte te-forte--abertura">As fraturas da zona III\.<\/strong>/)
  assert.match(comRealce('**Na prova**: texto'), /te-prova/)
  assert.match(comRealce('Texto com **rotação interna** no meio.'), /te-forte--curto">rotação interna/)
  assert.match(comRealce('Texto com **esclerose do semilunar sem colapso articular** no meio.'), /te-forte--longo/)
  // "Na prova:" vira quadro com rótulo e o rótulo sai do texto (primeira letra maiúscula).
  const prova = comRealce('**Na prova:** senil tem **osteoclasto diminuído**.')
  assert.match(prova, /<aside class="te-prova"><span class="te-prova__rotulo">Na prova<\/span><p>Senil tem /)
  assert.match(comRealce('**Na prova**: a zona segura.'), /<p>A zona segura\.<\/p>/)
  assert.match(comRealce('**Pegadinha da frase composta.** A primeira parte.'), /te-prova__rotulo">Pegadinha da banca<\/span><p><strong[^>]*>Pegadinha da frase composta\.<\/strong>/)

  // semEco: a abertura que repete a alternativa sai; frase de verdade fica.
  assert.equal(m.semEco('**II.** Esclerose do semilunar, sem colapso.', 'II.'), 'Esclerose do semilunar, sem colapso.')
  assert.equal(m.semEco('**Inibe a ação dos osteoclastos.** O osteoclasto engole a droga.', 'inibe a ação dos osteoclastos.'), 'O osteoclasto engole a droga.')
  assert.equal(m.semEco('**Correta: D (corpo vertebral na transição toracolombar).** Na tuberculose da coluna.', 'corpo vertebral na transição toracolombar'), 'Na tuberculose da coluna.')
  assert.equal(m.semEco('**A: anterior; mantida.** O capítulo define.', 'anterior; mantida.'), 'O capítulo define.')
  assert.equal(m.semEco('**Torácica.**\n\nA coluna torácica é a mais acometida.', 'Torácica'), 'A coluna torácica é a mais acometida.')
  assert.equal(m.semEco('Torácica: porque o corpo vertebral é maior.', 'Torácica'), 'Porque o corpo vertebral é maior.')
  // Não é eco: frase com a alternativa como sujeito, negrito que continua a frase, "II" diante de "III", texto só com o eco.
  assert.equal(m.semEco('A **tróclea** pode ser acometida.', 'a tróclea.'), 'A **tróclea** pode ser acometida.')
  assert.equal(m.semEco('**Bacia é possível, mas rara.** A sacroilíaca.', 'bacia.'), '**Bacia é possível, mas rara.** A sacroilíaca.')
  assert.equal(m.semEco('**Grácil e semimembranáceo** ficam na face medial.', 'grácil e semimembranáceo.'), '**Grácil e semimembranáceo** ficam na face medial.')
  assert.equal(m.semEco('**Na coluna**: a medula vermelha persiste.', 'na coluna.'), 'A medula vermelha persiste.')
  assert.equal(m.semEco('**10%** subestima o envolvimento.', '10% dos casos.'), '**10%** subestima o envolvimento.')
  assert.equal(m.semEco('**III.** Colapso.', 'II.'), '**III.** Colapso.')
  assert.equal(m.semEco('**L5.**', 'L5'), '**L5.**')

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
        comRealce(texto)
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
