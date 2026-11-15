import { useEffect, useRef, useState, type ReactNode } from 'react'
import { recurso } from '../../config'
import { EVENTO_RESPOSTA_ACESSO } from './QuestaoAcesso'
import '../../estilos/paginas/LoginBiblioteca.css'
import '../../estilos/paginas/BonfireResposta.css'

/** Biblioteca natalina aprovada em 14/11/2026. Pintura fixa; bonfire sempre acesa,
 * sem vínculo com sequência ou assinatura. Sprites pausam fora da tela e com a aba oculta. */
export function CenaPortal({ texto, children, esquerda, direita }: { texto: ReactNode; children: ReactNode; esquerda?: ReactNode; direita?: ReactNode }) {
  const palco = useRef<HTMLDivElement>(null)
  const [festa, definirFesta] = useState(false)
  useEffect(() => {
    const el = palco.current
    if (!el) return
    let visivel = true
    const atualizar = () => el.classList.toggle('pc-palco--pausado', !visivel || document.hidden)
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; atualizar() })
    io.observe(el); document.addEventListener('visibilitychange', atualizar); atualizar()
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', atualizar) }
  }, [])
  useEffect(() => {
    let timer = 0
    const ouvir = (e: Event) => {
      if (!(e as CustomEvent<{ acertou: boolean }>).detail?.acertou) return
      definirFesta(true); clearTimeout(timer); timer = window.setTimeout(() => definirFesta(false), 2200)
    }
    window.addEventListener(EVENTO_RESPOSTA_ACESSO, ouvir)
    return () => { clearTimeout(timer); window.removeEventListener(EVENTO_RESPOSTA_ACESSO, ouvir) }
  }, [])
  return (
    <section className="pc pc--noite pc--biblioteca" aria-labelledby="ac-titulo">
      <div className="pc-palco" ref={palco} aria-hidden="true">
        <i className="pc-biblioteca__luz" />
        <span className={`pc-esqueleto${festa ? ' pc-esqueleto--festa' : ''}`}><i className="pc-biblioteca__mascote" style={{ backgroundImage: `url("${recurso('pixel/acesso/biblioteca/mascote.webp')}")` }} /></span>
        <i className="pc-biblioteca__bonfire" style={{ backgroundImage: `url("${recurso('pixel/acesso/biblioteca/bonfire-integrada-v3.webp')}")` }} />
        <span id="pc-gato" className="pc-biblioteca__gato" />
        <span id="pc-coruja" className="pc-biblioteca__coruja" />
      </div>
      <div className="pc-coluna pc-coluna--esquerda"><div className="pc-texto">{texto}</div>{esquerda}</div>
      <div className="pc-coluna pc-coluna--direita">{children}{direita}</div>
    </section>
  )
}
