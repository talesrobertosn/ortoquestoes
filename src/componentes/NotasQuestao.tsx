import { usarArmazenado } from '../estado/usarArmazenado'
export function NotasQuestao({ id }: { id: string }) {
  const [notas, definir] = usarArmazenado<Record<string, string>>('notas', {})
  return <details className="notas-questao nao-imprime"><summary>Minhas anotações</summary>
    <label htmlFor={'nota-' + id}>O que vale lembrar desta questão?</label>
    <textarea id={'nota-' + id} className="entrada" rows={4} maxLength={20000} value={notas[id] ?? ''} onChange={e => definir(atuais => ({ ...atuais, [id]: e.target.value }))} />
    <p className="meta">Salvas automaticamente apenas neste navegador. Incluídas no backup do seu desempenho.</p>
  </details>
}
