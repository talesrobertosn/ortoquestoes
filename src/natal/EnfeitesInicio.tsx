import { type CSSProperties, useMemo } from 'react'
import { modoNatalAtivo } from './modoNatal'
import '../estilos/natal/NatalInicio.css'

/*
 * Os enfeites de Natal da página inicial (modo Natal, docs/design/MODO-NATAL.md, etapa 1, 21/11/2026).
 * Arte pintada por scripts/natal/enfeites.py. Todos são decorativos (aria-hidden, sem clique) e só existem com o modo
 * Natal no ar; com ele desligado, nada aqui é montado e nenhuma imagem de Natal é baixada.
 */

/** O modo Natal está no ar? (lido uma vez por montagem) */
export function usarNatal(): boolean {
  return useMemo(() => modoNatalAtivo(), [])
}

/** O festão de pinheiro com pisca-pisca na borda de cima do topo (dentro do herói, que corta o que sobra). */
export function FestaoNatal() {
  if (!usarNatal()) return null
  return (
    <span className="natal-festao" aria-hidden="true">
      <span className="natal-festao__luzes natal-festao__luzes--a" />
      <span className="natal-festao__luzes natal-festao__luzes--b" />
      <span className="natal-festao__ponta" />
      <span className="natal-festao__ponta natal-festao__ponta--dir" />
    </span>
  )
}

/**
 * O pisca-pisca pendurado embaixo da barra de atalhos: uma barriga de fio e uma lâmpada para cada atalho, alinhadas
 * com eles. Passar o mouse num atalho acende a lâmpada dele com mais força e ela balança (CSS com :has).
 */
export function PiscaAtalhos({ quantos }: { quantos: number }) {
  if (!usarNatal()) return null
  return (
    <span className="natal-pisca" aria-hidden="true">
      {Array.from({ length: quantos }, (_, i) => (
        <span key={i} className="natal-pisca__barriga" style={{ '--cor': i % 5, '--atraso': `${(i * 0.37) % 1.6}s` } as CSSProperties}>
          <span className="natal-pisca__lampada"><span className="natal-pisca__brilho" /></span>
        </span>
      ))}
    </span>
  )
}

/** A guirlanda presa no canto de cima à direita da barra de atalhos, metade para fora. */
export function GuirlandaNatal() {
  if (!usarNatal()) return null
  return <span className="natal-guirlanda" aria-hidden="true" />
}

/** A árvore de Natal com o pé na barra de atalhos e a copa subindo por cima da trilha da sequência. */
export function ArvoreNatal() {
  if (!usarNatal()) return null
  return (
    <span className="natal-arvore" aria-hidden="true">
      <span className="natal-arvore__img"><span className="natal-arvore__estrela" /></span>
    </span>
  )
}
