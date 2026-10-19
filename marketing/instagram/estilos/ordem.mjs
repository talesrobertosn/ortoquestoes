// Próximo estilo do feed e dos stories pelo rodízio fixo de ordem.json (sem sorteio).
// Uso: node marketing/instagram/estilos/ordem.mjs [AAAA-MM-DD]   (padrão: hoje em São Paulo)
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const pasta = dirname(fileURLToPath(import.meta.url))
const ordem = JSON.parse(readFileSync(join(pasta, 'ordem.json'), 'utf8'))
const historico = JSON.parse(readFileSync(join(pasta, 'historico.json'), 'utf8'))
const hoje = process.argv[2] ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5)

// Último uso de cada estilo (antes da data pedida).
const ultimoUso = {}
for (const { data, estilo } of historico) if (data < hoje) ultimoUso[estilo] = data
// Mesmo estilo só depois de 2 dias livres (usado dia 7, de novo a partir do dia 10).
const livre = (estilo) => !ultimoUso[estilo] || dias(ultimoUso[estilo], hoje) >= 3

function proximo(fila) {
  const lista = ordem[fila]
  // Só vale a partir do dia combinado, e até ser usado.
  const combinado = ordem.combinados.find((c) => c.fila === fila && c.data <= hoje && !(ultimoUso[c.estilo] >= c.data))
  if (combinado) return { estilo: combinado.estilo, nota: `combinado para ${combinado.data}: ${combinado.nota}` }
  // Parte do último estilo da fila que foi usado e segue a volta.
  let inicio = -1, maisRecente = ''
  lista.forEach((e, i) => { if (ultimoUso[e] && ultimoUso[e] >= maisRecente) { maisRecente = ultimoUso[e]; inicio = i } })
  for (let passo = 1; passo <= lista.length; passo++) {
    const estilo = lista[(inicio + passo) % lista.length]
    if (livre(estilo)) return { estilo, nota: ultimoUso[estilo] ? `último uso em ${ultimoUso[estilo]}` : 'ainda não usado' }
  }
  return { estilo: null, nota: 'todos os estilos da fila foram usados nos últimos 2 dias' }
}

console.log(`Rodízio para ${hoje} (ordem.json):`)
for (const fila of ['feed', 'stories']) {
  const { estilo, nota } = proximo(fila)
  console.log(`  ${fila.padEnd(8)} ${estilo ?? '-'}  (${nota})`)
}
console.log('Depois de entregar, registre em historico.json; a fila anda sozinha.')
