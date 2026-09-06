import { MarcaHorizontal } from '../marca/Simbolo'
import { usarTema } from '../estado/tema'
import { href } from '../util/rotas'
import { Icone } from './Icone'

const LINKS = [
  { destino: '/treinar', rotulo: 'Treinar', secundario: false },
  { destino: '/favoritas', rotulo: 'Favoritas', secundario: true },
  { destino: '/sobre', rotulo: 'Sobre', secundario: true },
]

export function Cabecalho({ caminho }: { caminho: string }) {
  const { alternar } = usarTema()

  return (
    <header className="cabecalho nao-imprime">
      <div className="conteudo cabecalho__interno">
        <a className="cabecalho__marca" href={href('/')} aria-label="OrtoQuestões, página inicial">
          <MarcaHorizontal altura={24} />
        </a>
        <nav className="cabecalho__nav" aria-label="Principal">
          {LINKS.map((link) => (
            <a
              key={link.destino}
              className={'nav-link' + (link.secundario ? ' nav-link--secundario' : '')}
              href={href(link.destino)}
              aria-current={caminho.startsWith(link.destino) ? 'page' : undefined}
            >
              {link.rotulo}
            </a>
          ))}
          <button
            type="button"
            className="botao-icone"
            onClick={alternar}
            aria-label="Alternar entre tema claro e escuro"
            title="Alternar tema"
          >
            <span className="so-impressao" />
            <TemaIcone />
          </button>
        </nav>
      </div>
    </header>
  )
}

function TemaIcone() {
  const escuro =
    typeof document !== 'undefined' &&
    (document.documentElement.dataset.tema === 'escuro' ||
      (!document.documentElement.dataset.tema &&
        window.matchMedia('(prefers-color-scheme: dark)').matches))
  return <Icone nome={escuro ? 'sol' : 'lua'} />
}
