// Impressão digital da página de Planos (13/11/2026): os arquivos que definem a oferta (textos, preços e recursos
// anunciados). Mudou um deles, a página precisa de uma cópia nova no arquivo (scripts/juridico/arquivar_planos.mjs).
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'

export async function arquivosDaOferta() {
  const vendas = (await readdir('src/componentes/vendas')).filter((f) => /\.(tsx|ts)$/.test(f)).sort().map((f) => `src/componentes/vendas/${f}`)
  return ['src/paginas/Assinatura.tsx', 'src/dados/planos.ts', ...vendas]
}

export async function hashDaOferta() {
  const h = createHash('sha256')
  for (const arquivo of await arquivosDaOferta()) {
    h.update(arquivo + '\n')
    h.update((await readFile(arquivo, 'utf8')).replace(/\r\n/g, '\n'))
  }
  return h.digest('hex').slice(0, 16)
}
