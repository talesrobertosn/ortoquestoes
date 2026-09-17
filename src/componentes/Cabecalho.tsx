import { contasDisponiveis } from '../conta/supabase'
import { usarConta } from '../conta/ContextoConta'
import { MarcaHorizontal } from '../marca/Simbolo'
import { usarTema } from '../estado/tema'
import { href } from '../util/rotas'
import { Icone } from './Icone'

const LINKS = [
  { destino: '/treinar', rotulo: 'Treinar' },
  { destino: '/revisao', rotulo: 'Revisão' },
  { destino: '/dados', rotulo: 'Desempenho' },
]

export function Cabecalho({ caminho }: { caminho: string }) {
  const { alternar } = usarTema()
  const { sessao } = usarConta()
  const inicial = String(sessao?.user.user_metadata?.nome ?? '').trim().charAt(0).toUpperCase()

  return (
    <header className="cabecalho nao-imprime">
      <div className="conteudo cabecalho__interno">
        <a className="cabecalho__marca" href={href('/')} aria-label="OrtoQuestões, página inicial">
          <span className="cabecalho__selo"><MarcaHorizontal altura={22} /></span>
        </a>
        <nav className="cabecalho__nav cabecalho__nav-principal" aria-label="Principal">
          {LINKS.map((link) => (
            <a
              key={link.destino}
              className="nav-link"
              href={href(link.destino)}
              aria-current={caminho.startsWith(link.destino) ? 'page' : undefined}
            >
              {link.rotulo}
            </a>
          ))}
        </nav>
        <div className="cabecalho__acoes">
          {contasDisponiveis && (
            <a
              className={'nav-link nav-link--conta' + (sessao ? ' nav-link--logado' : '')}
              href={href('/conta')}
              aria-current={caminho === '/conta' ? 'page' : undefined}
            >
              {sessao ? <span className="avatar-mini" aria-hidden="true">{inicial || <Icone nome="usuario" tamanho={15} />}</span> : <Icone nome="usuario" tamanho={17} />}
              <span className="cabecalho__rotulo-conta">{sessao ? 'Minha conta' : 'Entrar'}</span>
            </a>
          )}
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
        </div>
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

