import { useId } from 'react'
import { inteiro, reais } from './formato'

/** Duas barras na mesma escala; os números continuam disponíveis para leitores de tela. */
export function ComparacaoVisual({ atual, anterior, rotuloAtual, rotuloAnterior, formato = inteiro }: {
  atual: number; anterior: number; rotuloAtual: string; rotuloAnterior: string; formato?: (n: number) => string
}) {
  const maior = Math.max(1, atual, anterior)
  return <div className="nv-comparacao" role="img" aria-label={`${rotuloAtual}: ${formato(atual)}. ${rotuloAnterior}: ${formato(anterior)}. Barras na mesma escala.`}>
    {[{ nome: rotuloAtual, valor: atual }, { nome: rotuloAnterior, valor: anterior }].map((p, i) => <div className={`nv-comparacao-linha ${i ? 'nv-anterior' : ''}`} key={i} aria-hidden="true">
      <span>{p.nome}</span><b>{formato(p.valor)}</b><div className="nv-trilho"><i style={{ width: `${p.valor / maior * 100}%` }} /></div>
    </div>)}
  </div>
}

/** O denominador é o fechamento da carteira, nunca uma meta nem dinheiro garantido. */
export function AnelDeFechamento({ recebido, fechamento }: { recebido: number; fechamento: number }) {
  const id = useId()
  const total = Math.max(recebido, fechamento, 0), proporcao = total > 0 ? Math.min(1, Math.max(0, recebido / total)) : 0
  const falta = Math.max(0, fechamento - recebido)
  return <div className="nv-fechamento">
    <div className="nv-anel">
      <svg viewBox="0 0 160 160" role="img" aria-labelledby={id}>
        <title id={id}>{reais(recebido)} já recebidos e {reais(falta)} ainda previstos; {total > 0 ? `${Math.round(proporcao * 100)}% do fechamento estimado já recebidos.` : 'Sem valores para calcular a proporção.'}</title>
        <circle cx="80" cy="80" r="64" className="nv-anel-fundo" />
        {total > 0 && <circle cx="80" cy="80" r="64" className="nv-anel-previsto" strokeDasharray="3 5" />}
        {proporcao > 0 && <circle cx="80" cy="80" r="64" pathLength="100" className="nv-anel-recebido" strokeDasharray={`${proporcao * 100} 100`} transform="rotate(-90 80 80)" />}
      </svg>
      <div aria-hidden="true"><b>{total > 0 ? `${Math.round(proporcao * 100)}%` : '—'}</b><span>já recebido</span></div>
    </div>
    <dl className="nv-legenda-valores"><div><dt><i className="nv-chave" />Recebido</dt><dd>{reais(recebido)}</dd></div><div><dt><i className="nv-chave nv-chave-previsto" />Ainda previsto</dt><dd>{reais(falta)}</dd></div></dl>
  </div>
}
