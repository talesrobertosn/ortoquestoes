// Mostra o próximo post da fila (o primeiro ainda não entregue, por data) e o comando para gerar.
// Uso: node marketing/kit/proximo.mjs          (o próximo)
//      node marketing/kit/proximo.mjs todos    (a fila inteira, em uma linha por post)
import { relative } from 'path'
import { ESTILOS, RAIZ, dataBR, filaInteira } from './lib/comum.mjs'

const fila = filaInteira().sort((a, b) => (a.data + (a.horario ?? '')).localeCompare(b.data + (b.horario ?? '')))
const linha = (p) => `${p.post}  ${dataBR(p.data)} ${p.horario ?? ''}  ${(p.pecas ?? []).map((x) => ESTILOS[x.estilo]?.nome ?? x.estilo).join(' + ')}  ${p.questao?.id ?? p.produto ?? ''}  [${p.status ?? 'pronto'}]`

if (process.argv[2] === 'todos') {
  fila.forEach((p) => console.log(linha(p)))
} else {
  const p = fila.find((x) => x.status !== 'entregue' && x.status !== 'publicado')
  if (!p) { console.log('A fila acabou. Monte novos posts (README, seção "Quando a fila acabar").'); process.exit(0) }
  const arq = relative(RAIZ, p.arquivo)
  console.log(linha(p))
  console.log(`Gancho: ${p.gancho ?? ''}`)
  console.log(`\n1. Leia e revise: ${arq}`)
  console.log(`2. Gere:         node marketing/kit/renderizar.mjs ${arq}`)
  console.log(`3. Confira cada PNG e entregue as imagens e a LEGENDA.txt`)
  console.log(`4. Registre:     node marketing/kit/registrar.mjs ${arq}`)
}
