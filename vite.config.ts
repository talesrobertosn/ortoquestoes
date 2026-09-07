import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
  },
})
