import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
// Pré-carga das páginas (util/preCarga.ts e o script do index.html gerado pelo vite.config.ts):
// o endereço precisa levar à mesma página que o App mostra, inclusive nas exceções em que a
// subpágina ou a aba trocam de componente (#/conta/assinatura e #/ranking?aba=flashcards).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.cwd()
const pasta = await mkdtemp(join(raiz, 'node_modules', '.oq-precarga-'))
try {
  const saida = join(pasta, 'p.mjs')
  // Só o mapa importa aqui: os import() das páginas viram módulos vazios.
  await build({
    stdin: { contents: `export { paginaDoEndereco } from './src/util/preCarga'`, resolveDir: raiz, loader: 'ts' },
    outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
    plugins: [{ name: 'sem-paginas', setup(b) { b.onResolve({ filter: /\/paginas\// }, () => ({ path: 'vazio', namespace: 'vazio' })); b.onLoad({ filter: /.*/, namespace: 'vazio' }, () => ({ contents: 'export {}' })) } }],
  })
  const { paginaDoEndereco: p } = await import(pathToFileURL(saida))
  const casos = {
    '#/': 'Inicio', '': 'Inicio', '#/treinar': 'Treinar', '#/treinar?temas=mao': 'Treinar',
    '#/conta': 'Conta', '#/conta?modo=criar&voltar=%2Ftreinar': 'Conta', '#/conta/assinatura': 'DetalhesAssinatura', '#/conta/assinatura?x=1': 'DetalhesAssinatura',
    '#/ranking': 'Ranking', '#/ranking?aba=semana': 'Ranking', '#/ranking?aba=flashcards': 'RankingCripta', '#/ranking?aba=cripta': 'RankingCripta',
    '#/cronograma': 'PlanoEstudo', '#/flashcards/biblioteca': 'Flashcards', '#/inexistente': null, 'https://fora': null,
  }
  for (const [hash, esperado] of Object.entries(casos)) assert.equal(p(hash), esperado, `${hash || '(vazio)'}: esperava ${esperado}`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
console.log('pré-carga: endereços levam à página certa, inclusive conta/assinatura e ranking dos flashcards')

// O login público não precisa do acervo, e só adianta a pintura do tamanho da tela.
const html=readFileSync('index.html','utf8');const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('semIndice'));
for(const route of ['entrar','conta','treinar','sessao','assinatura']){const requests=[],links=[];runInNewContext(script,{window:{},location:{hash:'#/'+route},localStorage:{getItem:()=>null},document:{documentElement:{dataset:{}},head:{appendChild:l=>links.push(l)},createElement:()=>({})},fetch:url=>{requests.push(url);return Promise.resolve({ok:true})}});assert.equal(requests.length,['treinar','sessao'].includes(route)?1:0,route);assert.equal(links.length,route==='entrar'?2:0,route);if(route==='entrar')assert(links.every(l=>l.as==='image'&&l.media&&l.fetchPriority==='high'))}console.log('Login: pré-carga responsiva da pintura e nenhum índice no formulário público.');
