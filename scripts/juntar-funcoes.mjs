// Junta cada Edge Function (com os arquivos de _shared) num arquivo só, para colar
// no editor do painel do Supabase sem usar o terminal. Rodar: npm run funcoes:colar
import { build } from 'esbuild'

const FUNCOES = ['enviar-email', 'webhook-mercado-pago', 'criar-checkout', 'gerenciar-plano']
const CABECALHO = '// @ts-nocheck\n// Arquivo gerado por scripts/juntar-funcoes.mjs: a função inteira num arquivo só, para colar no editor do painel do Supabase.\n'

for (const nome of FUNCOES) {
  await build({
    entryPoints: [`supabase/functions/${nome}/index.ts`],
    outfile: `supabase/colar-no-painel/${nome}.ts`,
    bundle: true, format: 'esm', platform: 'neutral', target: 'es2022',
    legalComments: 'none', banner: { js: CABECALHO.trimEnd() }, logLevel: 'warning',
  })
  console.log(`supabase/colar-no-painel/${nome}.ts`)
}
