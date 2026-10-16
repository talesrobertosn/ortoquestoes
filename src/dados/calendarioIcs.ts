import type { CalculoPlano, PlanoSalvo } from './planoEstudo'
import { chaveCivil, diaCivil } from '../util/dia'

/** RFC 5545: limite de 75 octetos, incluindo o espaço nas linhas de continuação. */
export function dobrarLinhaIcs(linha: string): string {
  const encoder = new TextEncoder()
  let resultado = '', bytes = 0
  for (const caractere of linha) {
    const n = encoder.encode(caractere).length
    if (bytes + n > 75) { resultado += '\r\n '; bytes = 1 }
    resultado += caractere; bytes += n
  }
  return resultado
}
export function gerarIcs(calculo: CalculoPlano, plano: PlanoSalvo, hora: number, agora = Date.now()): string {
  const p2 = (n: number) => String(n).padStart(2, '0')
  const data = (d: Date) => chaveCivil(d).replace(/-/g, '')
  const carimbo = new Date(agora).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const escapar = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[\\,;]/g, c => `\\${c}`).replace(/\n/g, '\\n')
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Orto Questoes//Cronograma//PT', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Cronograma Orto Questões']
  const evento = (d: Date, titulo: string, descricao: string, id: string, alarme = true) => {
    const fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hora + 1)
    linhas.push('BEGIN:VEVENT', `UID:${id}@ortoquestoes.com.br`, `DTSTAMP:${carimbo}`,
      `DTSTART:${data(d)}T${p2(hora)}0000`, `DTEND:${data(fim)}T${p2(fim.getHours())}0000`,
      `SUMMARY:${escapar(titulo)}`, `DESCRIPTION:${escapar(descricao)}`, 'URL:https://ortoquestoes.com.br/#/cronograma')
    if (alarme) linhas.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapar(titulo)}`, 'TRIGGER:PT0M', 'END:VALARM')
    linhas.push('END:VEVENT')
  }
  for (const d of calculo.dias) {
    if (!d.total && !d.mini) continue
    const nomes = d.itens.map(i => i.nome).join(', ')
    evento(d.data, `Orto Questões: ${d.total} questões${nomes ? ` · ${nomes}` : ''}${d.mini ? ' + mini-simulado' : ''}`, d.itens.map(i => `${i.nome}: ${i.assuntos.slice(0, 3).join(', ')}`).join('\n'), `cronograma-${data(d.data)}`)
  }
  const hoje = diaCivil(agora)
  for (const [dia, titulo, texto, id] of [
    [calculo.inicioRetaFinal, 'começa a reta final', 'Revisão forte e modo prova, sem conteúdo novo.', 'reta'],
    [calculo.inicioModoProva, 'começa o modo prova', 'Siga o roteiro de hoje no cronograma.', 'modo-prova'],
    [calculo.vespera, 'véspera da prova', 'Revisão leve, documentos separados e tempo para descansar.', 'vespera'],
  ] as const) if (dia >= hoje) evento(dia, `Orto Questões: ${titulo}`, texto, `cronograma-${id}-${data(dia)}`)
  const extra = plano.opcoes?.provaExtra
  if (extra?.nome && /^\d{4}-\d{2}-\d{2}$/.test(extra.data)) evento(diaCivil(extra.data), `Prova: ${extra.nome}`, 'Boa prova!', `cronograma-prova-extra-${extra.data.replace(/-/g, '')}`, false)
  const prova = diaCivil(plano.data_prova)
  evento(prova, `Prova: ${plano.prova}`, 'Boa prova!', `cronograma-prova-${data(prova)}`, false)
  linhas.push('END:VCALENDAR')
  return linhas.map(dobrarLinhaIcs).join('\r\n') + '\r\n'
}
