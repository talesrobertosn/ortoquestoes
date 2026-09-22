import { contasDisponiveis } from '../conta/supabase'
import { usarConta } from '../conta/ContextoConta'
import { MarcaHorizontal } from '../marca/Simbolo'
import { usarTema } from '../estado/tema'
import { href } from '../util/rotas'
import { Icone, type NomeIcone } from './Icone'

// No celular a barra de baixo já leva a Início, Treinar, Revisão e
// Desempenho — repetir os quatro aqui em cima seria a mesma coisa duas
// vezes. Por isso só Revisão soma "oculta-celular": os outros dois cabem
// e valem a pena continuar visíveis mesmo na tela estreita.
const LINKS: { destino: string; rotulo: string; icone: NomeIcone; ocultaCelular: boolean }[] = [
  { destino: '/treinar', rotulo: 'Treinar', icone: 'livro', ocultaCelular: false },
  { destino: '/revisao', rotulo: 'Revisão', icone: 'calendario', ocultaCelular: true },
  { destino: '/dados', rotulo: 'Desempenho', icone: 'grafico', ocultaCelular: false },
  { destino: '/ranking', rotulo: 'Ranking', icone: 'trofeu', ocultaCelular: true },
]

export function Cabecalho({ caminho }: { caminho: string }) {
  const { alternar } = usarTema()
  const { sessao } = usarConta()
  const inicial = String(sessao?.user.user_metadata?.nome ?? '').trim().charAt(0).toUpperCase()

  return (
    <>
    <header className="cabecalho nao-imprime">
      <div className="conteudo cabecalho__interno">
        <a className="cabecalho__marca" href={href('/')} aria-label="OrtoQuestões, página inicial">
          <span className="cabecalho__selo"><MarcaHorizontal altura={22} /></span>
        </a>
        <nav className="cabecalho__nav cabecalho__nav-principal" aria-label="Principal">
          {LINKS.map((link) => (
            <a
              key={link.destino}
              className={'nav-link' + (link.ocultaCelular ? ' nav-link--oculta-celular' : '')}
              href={href(link.destino)}
              aria-current={caminho.startsWith(link.destino) ? 'page' : undefined}
            >
              <span className="nav-link__icone"><Icone nome={link.icone} tamanho={17} /></span>
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
    <nav className="navegacao-mobile nao-imprime" aria-label="Navegação móvel">
      <a href={href('/')} aria-current={caminho === '/' ? 'page' : undefined}><Icone nome="mapa" /><span>Início</span></a>
      <a href={href('/treinar')} aria-current={caminho.startsWith('/treinar') ? 'page' : undefined}><Icone nome="filtro" /><span>Treinar</span></a>
      <a href={href('/revisao')} aria-current={caminho.startsWith('/revisao') ? 'page' : undefined}><Icone nome="reiniciar" /><span>Revisar</span></a>
      <a href={href('/dados')} aria-current={caminho.startsWith('/dados') ? 'page' : undefined}><Icone nome="certo" /><span>Desempenho</span></a>
    </nav>
    </>
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
