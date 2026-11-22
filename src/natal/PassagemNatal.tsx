import { useRef } from 'react'
import { recurso } from '../config'
import { usarEmVista } from './InteracoesInicio'
import { modoNatalAtivo } from './modoNatal'
import '../estilos/natal/PassagemNatal.css'

const LARGURAS = { festao: 1080, lanternas: 522, biblioteca: 576, sinos: 522, presentes: 522 } as const

/** Uma peça pintada que marca a passagem entre seções e acende quando entra na tela. */
export function PassagemNatal({ forma, compacta = false, inicio = false }: {
  forma: keyof typeof LARGURAS
  compacta?: boolean
  inicio?: boolean
}) {
  const ativo = modoNatalAtivo()
  const passagem = useRef<HTMLDivElement>(null)
  const emVista = usarEmVista(passagem, ativo)
  if (!ativo) return null

  const prefixo = `pixel/natal/passagem-${forma}`
  const classe = `natal-passagem natal-passagem--${forma}${compacta ? ' natal-passagem--compacta' : ''}`
  const imagem = (arquivo: '.png' | '-luz.webp') => (
    <img src={recurso(`${prefixo}${arquivo}`)} width={LARGURAS[forma]} height={183} alt=""
      loading={inicio ? 'eager' : 'lazy'} decoding="async" draggable={false} />
  )

  return (
    <div ref={passagem} className={classe} data-em-vista={emVista} aria-hidden="true">
      <div className="natal-passagem__peca">
        {imagem('.png')}
        <div className="natal-passagem__luz">{imagem('-luz.webp')}</div>
      </div>
    </div>
  )
}
