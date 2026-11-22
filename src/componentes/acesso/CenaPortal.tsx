import { useEffect, useRef, useState, type ReactNode } from 'react'
import { recurso } from '../../config'
import { MolduraNatal } from '../../natal/MolduraNatal'
import { EVENTO_RESPOSTA_ACESSO } from './QuestaoAcesso'
import '../../estilos/paginas/LoginBiblioteca.css'
import '../../estilos/paginas/BonfireResposta.css'

/** Biblioteca natalina aprovada em 14/11/2026. Pintura fixa; bonfire sempre acesa,
 * sem vínculo com sequência ou assinatura. Sprites pausam fora da tela e com a aba oculta. */
export function CenaPortal({ texto, children, esquerda, direita }: { texto: ReactNode; children: ReactNode; esquerda?: ReactNode; direita?: ReactNode }) {
  const palco = useRef<HTMLDivElement>(null)
  const [festa, definirFesta] = useState(false)
  const [animado, definirAnimado] = useState(false)
  const [pausado, definirPausado] = useState(false)
  useEffect(() => {
    const movimento = matchMedia('(prefers-reduced-motion: reduce)')
    const celular = matchMedia('(max-width: 71.99rem)')
    let geracao = 0
    let ocioso = 0
    let espera = 0
    const cancelar = () => {
      geracao++
      if (ocioso) window.cancelIdleCallback(ocioso)
      window.clearTimeout(espera)
    }
    const decodificar = (nome: string) => {
      const imagem = new Image()
      imagem.src = recurso(`pixel/acesso/biblioteca/${nome}.webp`)
      return imagem.decode()
    }
    const preparar = () => {
      cancelar(); definirAnimado(false)
      const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      if (movimento.matches || conexao?.saveData) return
      const atual = geracao
      // Primeiro a pintura; os atlas não disputam a rede com a primeira cena/formulário.
      decodificar(celular.matches ? 'movel-topo-v3' : 'cenario-v3').then(() => {
        if (atual !== geracao) return
        const carregar = () => {
          if (atual !== geracao) return
          Promise.all([decodificar('bonfire-integrada-v4'), decodificar(celular.matches ? 'bonfire-luz-movel-v4' : 'bonfire-luz-v4')])
            .then(() => { if (atual === geracao) definirAnimado(true) }, () => { /* fogo aceso no quadro leve se a rede falhar */ })
        }
        if (typeof window.requestIdleCallback === 'function') ocioso = window.requestIdleCallback(carregar, { timeout: 1500 })
        else espera = window.setTimeout(carregar, 100)
      }, () => { /* a pintura e os campos continuam independentes */ })
    }
    preparar()
    movimento.addEventListener('change', preparar); celular.addEventListener('change', preparar)
    return () => { cancelar(); movimento.removeEventListener('change', preparar); celular.removeEventListener('change', preparar) }
  }, [])
  useEffect(() => {
    const el = palco.current
    if (!el) return
    let visivel = true
    const atualizar = () => definirPausado(!visivel || document.hidden)
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
      <div className={`pc-palco${animado ? ' pc-palco--animado' : ''}${pausado ? ' pc-palco--pausado' : ''}`} ref={palco} aria-hidden="true">
        <MolduraNatal publica />
        <i className="pc-biblioteca__luz" />
        <span className={`pc-esqueleto${festa ? ' pc-esqueleto--festa' : ''}`}><i className="pc-biblioteca__mascote" style={{ backgroundImage: `url("${recurso('pixel/acesso/biblioteca/mascote.webp')}")` }} /></span>
        <i className="pc-biblioteca__bonfire" style={{ backgroundImage: `url("${recurso(`pixel/acesso/biblioteca/bonfire-${animado ? 'integrada' : 'integrada-parado'}-v4.webp`)}")` }} />
        <span id="pc-gato" className="pc-biblioteca__gato" />
        <span id="pc-coruja" className="pc-biblioteca__coruja" />
      </div>
      <div className="pc-coluna pc-coluna--esquerda"><div className="pc-texto">{texto}</div>{esquerda}</div>
      <div className="pc-coluna pc-coluna--direita">{children}{direita}</div>
    </section>
  )
}
