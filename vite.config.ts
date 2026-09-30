import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { OutputBundle, OutputChunk } from 'rollup'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Uma questão e um comentário por arquivo, gerados só no build. Os arquivos
 * por tema continuam sendo a fonte (os scripts de importação e de comentários
 * escrevem neles), mas o celular não precisa baixar os comentários de Trauma
 * inteiros (450 KB compactados) para ler o comentário de uma questão: busca
 * acervo/c/<id>.json, de 1 a 3 KB. O site volta ao arquivo do tema se um
 * destes faltar (no `vite dev`, por exemplo, eles não existem).
 */
function fatiarAcervo(): Plugin {
  let saida = 'dist'
  return {
    name: 'fatiar-acervo',
    apply: 'build',
    configResolved(config) { saida = config.build.outDir },
    closeBundle() {
      const acervo = join(saida, 'acervo')
      if (!existsSync(join(acervo, 'temas'))) return
      const escrever = (pasta: string, dados: Record<string, unknown>) => {
        mkdirSync(join(acervo, pasta), { recursive: true })
        for (const [id, valor] of Object.entries(dados)) {
          if (!/^[a-z0-9-]+$/i.test(id)) continue
          writeFileSync(join(acervo, pasta, `${id}.json`), JSON.stringify(valor))
        }
      }
      for (const arquivo of readdirSync(join(acervo, 'temas')).filter((f) => f.endsWith('.json'))) {
        const dados = JSON.parse(readFileSync(join(acervo, 'temas', arquivo), 'utf8'))
        const questoes: Array<{ id: string }> = Array.isArray(dados) ? dados : dados.questoes
        escrever('q', Object.fromEntries(questoes.map((q) => [q.id, q])))
      }
      if (existsSync(join(acervo, 'comentarios'))) {
        for (const arquivo of readdirSync(join(acervo, 'comentarios')).filter((f) => f.endsWith('.json'))) {
          escrever('c', JSON.parse(readFileSync(join(acervo, 'comentarios', arquivo), 'utf8')))
        }
      }
    },
  }
}

/**
 * Pré-carga por rota. As páginas são carregadas sob demanda, e o navegador só
 * descobria o código da página aberta depois de baixar e rodar o código
 * principal: no celular, uma volta inteira de rede a mais antes de aparecer
 * qualquer coisa. Aqui o index.html ganha um script mínimo que olha o endereço
 * e já pede, junto com o resto, os arquivos da página certa.
 */
const PAGINAS_PRE_CARGA: Record<string, string> = {
  '': 'src/paginas/Inicio.tsx',
  treinar: 'src/paginas/Treinar.tsx',
  sessao: 'src/paginas/Sessao.tsx',
  resumo: 'src/paginas/Resumo.tsx',
  questao: 'src/paginas/QuestaoDireta.tsx',
  revisao: 'src/paginas/Revisao.tsx',
  dados: 'src/paginas/Apoio.tsx',
  cronograma: 'src/paginas/PlanoEstudo.tsx',
  assinatura: 'src/paginas/Assinatura.tsx',
  ranking: 'src/paginas/Ranking.tsx',
}

function preCargaPorRota(): Plugin {
  return {
    name: 'pre-carga-por-rota',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, contexto) {
        const pacote = contexto.bundle as OutputBundle | undefined
        if (!pacote) return html
        const pedacos = Object.values(pacote).filter((p): p is OutputChunk => p.type === 'chunk')
        const entrada = pedacos.find((p) => p.isEntry)
        const jaNaEntrada = new Set([entrada?.fileName, ...(entrada?.imports ?? [])])
        const arquivosDe = (modulo: string) => {
          const pedaco = pedacos.find((p) => p.facadeModuleId?.replace(/\\/g, '/').endsWith(modulo))
          if (!pedaco) return null
          const vistos = new Set<string>()
          const visitar = (nome: string) => {
            if (vistos.has(nome) || jaNaEntrada.has(nome)) return
            vistos.add(nome)
            pedacos.find((p) => p.fileName === nome)?.imports.forEach(visitar)
          }
          visitar(pedaco.fileName)
          const css = [...vistos].flatMap((nome) => [...(pedacos.find((p) => p.fileName === nome)?.viteMetadata?.importedCss ?? [])])
          return { js: [...vistos], css }
        }
        const mapa: Record<string, { js: string[]; css: string[] }> = {}
        for (const [rota, modulo] of Object.entries(PAGINAS_PRE_CARGA)) {
          const arquivos = arquivosDe(modulo)
          if (arquivos) mapa[rota] = arquivos
        }
        const script = `<script>(function(){try{var m=${JSON.stringify(mapa)};var r=(location.hash.replace(/^#\\/?/,'').split(/[/?]/)[0])||'';var a=m[r];if(!a)return;var b=document.baseURI;a.js.forEach(function(f){var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=new URL(f,b).href;document.head.appendChild(l)});a.css.forEach(function(f){var l=document.createElement('link');l.rel='preload';l.as='style';l.crossOrigin='';l.href=new URL(f,b).href;document.head.appendChild(l)})}catch(e){}})()</script>`
        // O crossOrigin vazio igual ao do carregador do Vite: sem ele, o navegador
        // não reaproveita a pré-carga e baixa o CSS da página de novo.
        // Antes do CSS: script em linha depois de uma folha de estilo espera a
        // folha chegar, e a pré-carga perderia justamente o tempo que quer ganhar.
        return html.replace('<script type="module"', script + '\n    <script type="module"')
      },
    },
  }
}

/**
 * Caminho de publicação.
 *
 * O padrão é RELATIVO ("./"), e essa escolha resolve um problema de uma vez:
 * o mesmo build funciona em usuario.github.io/ortoquestoes/ e em
 * ortoquestoes.com.br/, sem variável de ambiente e sem janela em que o site
 * fica quebrado durante a troca de endereço. Isso só é possível porque o
 * roteamento é por hash — o documento está sempre na raiz do diretório, então
 * caminho relativo sempre resolve para o lugar certo.
 *
 * BASE_ORTOQUESTOES continua disponível para forçar um caminho absoluto, caso
 * algum dia o site passe a viver num subdiretório com rotas de servidor.
 */
const base = process.env.BASE_ORTOQUESTOES ?? './'

export default defineConfig({
  base,
  plugins: [react(), preCargaPorRota(), fatiarAcervo()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        // Bibliotecas mudam raramente: em arquivos próprios, continuam no
        // cache do aparelho a cada publicação, e só o código do site desce de novo.
        manualChunks(id) {
          if (id.includes('node_modules/@supabase/')) return 'supabase'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
        },
      },
    },
  },
})
