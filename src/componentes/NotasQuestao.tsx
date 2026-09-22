import { usarConta } from '../conta/ContextoConta'
import { usarArmazenado } from '../estado/usarArmazenado'
import { Icone } from './Icone'
export function NotasQuestao({ id }: { id: string }) {
  const { sessao } = usarConta()
  const [notas, definir] = usarArmazenado<Record<string, string>>('notas', {})
  const preenchida = Boolean(notas[id]?.trim())
  return <details className="notas-questao nao-imprime"><summary><Icone nome="lapis" tamanho={18} /> Minhas anotações {preenchida && <span className="qz-contador">1</span>}</summary>
    <label htmlFor={'nota-' + id}>O que vale lembrar desta questão?</label>
    <textarea id={'nota-' + id} className="entrada" rows={4} maxLength={20000} value={notas[id] ?? ''} onChange={e => definir(atuais => ({ ...atuais, [id]: e.target.value }))} />
    <p className="meta">{sessao ? 'Salvas neste navegador e sincronizadas com sua conta.' : 'Salvas automaticamente apenas neste navegador.'} Incluídas no backup do seu desempenho.</p>
  </details>
}
