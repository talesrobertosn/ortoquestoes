import { useEffect, useState, type ReactNode } from 'react'
import { recurso } from '../config'
import '../estilos/componentes/EsperaPixel.css'

const FRASES = [
  'Aguardando a carroça…',
  'Afiando o fêmur…',
  'Abrindo os portões do castelo…',
  'Selando o cavalo…',
  'O mensageiro está a caminho…',
  'Polindo o escudo…',
  'Acendendo as tochas…',
  'A guarda está chegando…',
]

/**
 * Espera curta (conta carregando, página abrindo): o guerreiro da guilda
 * balançando o fêmur, com uma frase medieval sorteada. Costuma durar menos de
 * um segundo; `acao` só aparece se a espera passar de 3 s.
 */
export function EsperaPixel({ rotulo = 'Carregando', acao }: { rotulo?: string; acao?: ReactNode }) {
  const [frase] = useState(() => FRASES[Math.floor(Math.random() * FRASES.length)])
  const [demorou, definirDemorou] = useState(false)
  useEffect(() => {
    if (!acao) return
    const t = window.setTimeout(() => definirDemorou(true), 3000)
    return () => window.clearTimeout(t)
  }, [acao])
  return (
    <div className="espera-pixel" role="status" aria-live="polite">
      <span className="so-leitor">{rotulo}</span>
      <span className="espera-pixel__guerreiro" aria-hidden="true" style={{ backgroundImage: `url(${recurso('ranking/guerreiro.png')})` }} />
      <span className="espera-pixel__chao" aria-hidden="true" />
      <p className="espera-pixel__frase" aria-hidden="true">{frase}</p>
      {demorou && <div className="espera-pixel__acao">{acao}</div>}
    </div>
  )
}
