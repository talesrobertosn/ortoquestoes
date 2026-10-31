import { type CSSProperties, type ReactNode } from 'react'
import { urlCss } from '../../../config'
import { CenaDiorama } from './CenaDiorama'
import { usarPeriodo } from '../../../estado/aparencia'

/*
 * O topo do painel de quem tem conta mudou para componentes/inicio/jornada/Jornada.tsx (31/10/2026);
 * aqui fica o topo da vitrine de quem ainda não tem conta.
 */
/** As folhas de sprites (url() absoluto: relativo em variável CSS some no site publicado). */
const SPRITES = {
  '--sprite-fogo': urlCss('pixel/inicio/fogo.png'), '--sprite-tocha': urlCss('pixel/inicio/tocha.png'),
} as CSSProperties

/**
 * Topo da vitrine de quem ainda não tem conta (30/10/2026): o mesmo cenário, com a proposta do site, o convite com o
 * botão de cristal, as provas do acervo como estandartes e a questão de amostra num pergaminho, para responder ali.
 */
export function TopoVisitante({ titulo, proposta, lide, cta, entrar, nota, provas, amostra }: {
  titulo: string; proposta: ReactNode; lide: ReactNode; cta: ReactNode; entrar: ReactNode; nota: ReactNode
  provas: Array<{ nome: string; cor: string }>; amostra: ReactNode
}) {
  const periodo = usarPeriodo()
  return (
    <section className={`hd-topo hd-topo--visitante hd-topo--${periodo}`} aria-labelledby="ip-vitrine-titulo" style={SPRITES}>
      <div className="hd-vista">
        <CenaDiorama linhaFogo={3} periodo={periodo} />
        <header className="hd-topo__titulo">
          <p className="hd-selo">Provas oficiais comentadas</p>
          <h1 id="ip-vitrine-titulo">{titulo}</h1>
          <p className="hd-proposta">{proposta}</p>
          <p className="hd-lide">{lide}</p>
          <div className="hd-convite">{cta}{entrar}</div>
          <p className="hd-nota">{nota}</p>
        </header>
        <div className="hd-pergaminho">{amostra}</div>
      </div>
      <ul className="hd-estandartes" aria-label="Provas no acervo">
        {provas.map(({ nome, cor }) => <li key={nome} style={{ '--cor': cor } as CSSProperties}><span>{nome}</span></li>)}
      </ul>
    </section>
  )
}
