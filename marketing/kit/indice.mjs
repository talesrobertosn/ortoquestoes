// Refaz fila/INDICE.md a partir dos JSON da fila. Rode depois de criar, mudar ou registrar posts.
// Uso: node marketing/kit/indice.mjs
import { writeFileSync } from 'fs'
import { join } from 'path'
import { ESTILOS, KIT, dataBR, filaInteira } from './lib/comum.mjs'

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const fila = filaInteira().sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))
const linhas = fila.map((p) => {
  const dia = DIAS[new Date(p.data + 'T12:00:00').getDay()]
  const q = p.questao
  const conteudo = q ? `\`${q.id}\` ${q.prova ?? 'Simulados'} ${q.ano ?? ''} · gab. ${q.gabarito}${q.imagens?.length ? ' · com imagem' : ''}` : p.produto
  const assunto = (p.assunto ?? p.gancho ?? '').replace(/\|/g, '/')
  return `| [${p.post.slice(5)}](${p.post}.json) | ${dia} ${dataBR(p.data).slice(0, 5)} ${p.horario} | ${p.formato} | ${ESTILOS[p.estilo]?.nome ?? p.estilo} | ${conteudo} | ${assunto} | ${p.status} |`
})
const porEstilo = Object.keys(ESTILOS).map((e) => `${ESTILOS[e].nome}: ${fila.filter((p) => p.estilo === e).length}`).join(' · ')
const md = `# Fila das próximas postagens

Gerado por \`node marketing/kit/indice.mjs\` a partir dos JSON desta pasta. Não edite à mão.
Próximo da fila: \`node marketing/kit/proximo.mjs\`. Ciclo completo: [../README.md](../README.md).

- Posts: ${fila.length} (${fila.filter((p) => p.questao).length} de questão e ${fila.filter((p) => !p.questao).length} de produto, sem preço).
- Estilos: ${porEstilo}. O mesmo estilo nunca se repete em menos de 3 dias.
- Horários (orientações): feed das 7h às 8h; stories de resposta ao meio-dia; propaganda das 18h às 19h. No máximo 1 feed por dia nesta fila.
- "falta capturar as telas": rode antes o comando de \`conteudo.captura\` do JSON (precisa do site rodando; veja assets.md).

| Nº | Quando | Formato | Estilo | Questão ou produto | Assunto | Situação |
|---|---|---|---|---|---|---|
${linhas.join('\n')}
`
writeFileSync(join(KIT, 'fila', 'INDICE.md'), md)
console.log(`fila/INDICE.md com ${fila.length} posts.`)
