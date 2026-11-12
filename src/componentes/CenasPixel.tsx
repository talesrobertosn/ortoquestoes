import type { CSSProperties, ReactNode } from 'react'
import { CorujaPixel } from '../biblioteca/sala/CorujaPixel'
import { GatoPixel } from './mascote/GatoPixel'
import { recurso } from '../config'
import { href } from '../util/rotas'

/**
 * Cenas da temporada RPG para telas vazias e de erro: a tocha e a carta de public/ranking com os bichos do site
 * (desde 12/11/2026 o gato e a coruja ficam no lugar do antigo mensageiro).
 */
export function GatoDormindo({ titulo, texto, acao }: { titulo: string; texto: ReactNode; acao?: ReactNode }) {
  return (
    <section className="cena-pixel" aria-label={titulo}>
      <div className="cena-pixel__palco" aria-hidden="true">
        <img src={recurso('ranking/tocha.png')} width={36} height={72} alt="" />
        <GatoPixel estado="dormindo" style={{ width: 128 }} />
        <img src={recurso('ranking/carta.png')} width={54} height={42} alt="" />
      </div>
      <h2>{titulo}</h2>
      <p>{texto}</p>
      {acao}
    </section>
  )
}

/** Página não encontrada: um mapa de RPG com o caminho de volta. */
export function MapaPerdido() {
  return (
    <article className="empilha-2 limite-leitura">
      <section className="mapa-perdido">
        <p className="mapa-perdido__codigo">404</p>
        <p className="mapa-perdido__titulo">Fratura no caminho</p>
        <svg className="mapa-perdido__trilha" viewBox="0 0 300 90" aria-hidden="true">
          <path d="M10 70 C 60 10, 90 80, 125 50 M160 40 S 250 20, 290 60" fill="none" stroke="#f4cf7c" strokeWidth="4" strokeDasharray="10 9" />
          <path d="M130 28l12 14-10 11 14 13M119 20l43 45M109 32l43 45" fill="none" stroke="#d9ad69" strokeWidth="5" strokeLinecap="square" />
        </svg>
        <p>Este link perdeu a continuidade. Vamos imobilizar o problema: volte ao início ou retome seu estudo.</p>
      </section>
      <div className="linha linha--empilha-celular">
        <a className="botao botao--principal botao--grande" href={href('/')}>Voltar ao início</a>
        <a className="botao botao--grande" href={href('/treinar')}>Montar uma sessão</a>
      </div>
      <p className="mapa-perdido__dica">
        <CorujaPixel estado="olhando" style={{ '--coruja-escala': 1 } as CSSProperties} />
        <span>Achou um link quebrado? Avise a coruja em <a href={href('/contato')}>Suporte e contato</a>.</span>
      </p>
    </article>
  )
}
