import type { ReactNode } from 'react'

/** Carregando: esqueleto com a forma do conteúdo que vem, sem texto de espera. */
export function Carregando({ linhas = 4, rotulo = 'Carregando questões' }: { linhas?: number; rotulo?: string }) {
  return (
    <div role="status" aria-live="polite" className="cartao">
      <span className="so-leitor">{rotulo}</span>
      <div className="cartao__corpo">
        {Array.from({ length: linhas }, (_, i) => (
          <div
            key={i}
            className="esqueleto"
            style={{ width: i === 0 ? '40%' : i === linhas - 1 ? '70%' : '100%' }}
          />
        ))}
      </div>
    </div>
  )
}

/** Lista vazia e erro dizem o que fazer em seguida, sem pedir desculpas. */
export function Estado({
  titulo,
  children,
  acoes,
}: {
  titulo: string
  children?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <div className="estado">
      <p className="estado__titulo">{titulo}</p>
      {children}
      {acoes && <div className="estado__acoes">{acoes}</div>}
    </div>
  )
}
