import { href } from '../util/rotas'
import '../estilos/componentes/TrocaCronograma.css'

/** Qual cronograma (27/10/2026): ortopedia (TEOT e TARO) ou Cirurgia da Mão, ingresso ou título. */
export function TrocaCronograma({ atual }: { atual: 'ortopedia' | 'ingresso' | 'titulo' }) {
  const itens = [
    { id: 'ortopedia', rotulo: 'Ortopedia: TEOT e TARO', destino: '/cronograma' },
    { id: 'ingresso', rotulo: 'Mão: ingresso', destino: '/cronograma-mao?prova=ingresso' },
    { id: 'titulo', rotulo: 'Mão: título SBCM e SIMÃO', destino: '/cronograma-mao?prova=titulo' },
  ] as const
  return (
    <nav className="troca-cron" aria-label="Qual cronograma">
      {itens.map((i) => <a key={i.id} href={href(i.destino)} aria-current={atual === i.id ? 'page' : undefined}>{i.rotulo}</a>)}
    </nav>
  )
}
