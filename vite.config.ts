import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Único lugar onde o caminho de publicação é definido.
 *
 * GitHub Pages em subdiretório:  BASE_ORTOQUESTOES=/ortoquestoes/
 * Domínio próprio na raiz:       BASE_ORTOQUESTOES=/
 *
 * Todo o resto do código usa import.meta.env.BASE_URL e caminhos relativos,
 * então trocar de endereço não exige nenhuma alteração de código.
 */
const base = process.env.BASE_ORTOQUESTOES ?? '/ortoquestoes/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
  },
})
