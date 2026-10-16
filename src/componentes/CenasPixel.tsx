import type { ReactNode } from 'react'
import { recurso } from '../config'
import { href } from '../util/rotas'

/**
 * Cenas da temporada RPG para telas vazias e de erro. Usam só as artes que já
 * existem em public/ranking (tocha, mensageiro, carta).
 */
export function MensageiroDormindo({ titulo, texto, acao }: { titulo: string; texto: ReactNode; acao?: ReactNode }) {
  return (
    <section className="cena-pixel" aria-label={titulo}>
      <div className="cena-pixel__palco" aria-hidden="true">
        <img src={recurso('ranking/tocha.png')} width={36} height={72} alt="" />
        <img src={recurso('ranking/mensageiro.png')} width={96} height={120} alt="" />
        <img src={recurso('ranking/carta.png')} width={54} height={42} alt="" />
        <span className="cena-pixel__zz"><span>z</span><span>z</span><span>Z</span></span>
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
        <img src={recurso('ranking/mensageiro.png')} width={40} height={50} alt="" />
        <span>Achou um link quebrado? Avise o mensageiro em <a href={href('/contato')}>Suporte e contato</a>.</span>
      </p>
    </article>
  )
}
