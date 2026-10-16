// Página inicial (16/10/2026): a fogueira, os dias da semana e as artes dos atalhos de flashcards
// sumiam no site publicado porque o url() era relativo dentro de variável CSS (--sprite, --arte):
// o navegador resolve esse url() a partir da folha de estilo (assets/), não da página. Este teste
// garante que os componentes da página inicial usam urlCss() (endereço absoluto), que toda imagem
// citada existe em public/ e confere os estágios da fogueira.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.cwd()
const arquivos = ['src/paginas/Inicio.tsx', ...(await readdir(join(raiz, 'src/componentes/inicio'))).filter((n) => /\.tsx?$/.test(n)).map((n) => `src/componentes/inicio/${n}`)]

for (const arquivo of arquivos) {
  const texto = await readFile(join(raiz, arquivo), 'utf8')
  assert.ok(!texto.includes('url(${recurso('), `${arquivo}: url(\${recurso(...)}) em variável CSS quebra no site publicado; use urlCss()`)
  assert.ok(!/url\(\s*['"`]?(?:\.\/)?(?:pixel|flashcards|emblemas)\//.test(texto), `${arquivo}: url() relativo a public/; use urlCss()`)
  // Variável CSS com imagem só via urlCss().
  for (const m of texto.matchAll(/'--(sprite|arte)'\s*:\s*([^,}]+)/g)) {
    assert.ok(m[2].trim().startsWith('urlCss('), `${arquivo}: --${m[1]} precisa de urlCss(), veio ${m[2].trim()}`)
  }
  for (const m of texto.matchAll(/(?:urlCss|recurso)\('([^']+\.(?:png|webp|svg|jpg))'\)/g)) {
    assert.ok(existsSync(join(raiz, 'public', m[1])), `${arquivo}: imagem inexistente public/${m[1]}`)
  }
}

// Tamanho das folhas de sprite que o CSS espera (quadros de 32x36 em 4x8; ícones de 14x14 em 4x7).
// Cabeçalho IHDR do PNG: largura e altura em 16..23.
const tamanho = async (p) => { const b = await readFile(join(raiz, 'public', p)); return { largura: b.readUInt32BE(16), altura: b.readUInt32BE(20) } }
assert.deepEqual(await tamanho('pixel/inicio/fogueira-estagios.png'), { largura: 128, altura: 288 })
assert.deepEqual(await tamanho('pixel/inicio/dias-estagios.png'), { largura: 56, altura: 98 })

// Estágios da fogueira.
const pasta = await mkdtemp(join(raiz, 'node_modules', '.oq-fogueira-'))
const saida = join(pasta, 'f.mjs')
try {
  await build({ stdin: { contents: `export * from './src/componentes/inicio/estagiosFogueira'`, resolveDir: raiz, loader: 'ts' }, outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(saida))
  const id = (d) => m.estagioDaSequencia(d).estagio.id
  assert.deepEqual([0, 1, 2, 3, 6, 7, 13, 14, 29, 30, 59, 60, 99, 100, 500].map(id),
    ['cinzas', 'faisca', 'faisca', 'fogueira', 'fogueira', 'labareda', 'labareda', 'fogareu', 'fogareu', 'azul', 'azul', 'arcana', 'arcana', 'lendaria', 'lendaria'])
  assert.equal(m.ESTAGIOS_FOGUEIRA.length, 8, 'O sprite tem 8 linhas, uma por estágio')
  assert.equal(m.textoProximoEstagio(26), 'faltam 4 dias para a Chama azul')
  assert.equal(m.textoProximoEstagio(13), 'falta 1 dia para o Fogaréu')
  assert.equal(m.textoProximoEstagio(0), 'falta 1 dia para a Faísca')
  assert.equal(m.textoProximoEstagio(120), null)
  assert.equal(m.estagioDaSequencia(-3).estagio.id, 'cinzas')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

// Os limites do script que desenha a arte precisam ser os mesmos do código.
const script = await readFile(join(raiz, 'scripts/gerar_fogueira_inicio.py'), 'utf8')
const doScript = [...script.matchAll(/\("(\w+)", "[^"]+", (\d+),/g)].map((x) => `${x[1]}:${x[2]}`)
assert.deepEqual(doScript, ['cinzas:0', 'faisca:1', 'fogueira:3', 'labareda:7', 'fogareu:14', 'azul:30', 'arcana:60', 'lendaria:100'], 'Estágios do script divergem de estagiosFogueira.ts')

console.log(`imagens da página inicial: ${arquivos.length} arquivos sem url() relativo, estágios da fogueira ok`)
