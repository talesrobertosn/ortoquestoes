import { useEffect, useState } from 'react'
import { contasDisponiveis } from '../conta/supabase'
import { usarConta } from '../conta/ContextoConta'
import { MarcaHorizontal } from '../marca/Simbolo'
import { usarTema } from '../estado/tema'
import { href } from '../util/rotas'
import { Icone, type NomeIcone } from './Icone'
import { AvisoBloqueioDiario } from './LimiteRespostas'
import { usarAssinante } from '../conta/plano'
import { MenuGeral } from './MenuGeral'

// No celular (até 40rem) a barra de baixo já leva Início, Treinar, Revisão
// e Desempenho, então estes links somem daqui e o nome da marca volta ao
// cabeçalho. Entre 40 e 56rem, Revisão e Ranking saem para caber.
const LINKS: { destino: string; rotulo: string; icone: NomeIcone; ocultaCelular: boolean }[] = [
  { destino: '/treinar', rotulo: 'Treinar', icone: 'livro', ocultaCelular: false },
  { destino: '/revisao', rotulo: 'Revisão', icone: 'calendario', ocultaCelular: true },
  { destino: '/dados', rotulo: 'Desempenho', icone: 'grafico', ocultaCelular: false },
  { destino: '/ranking', rotulo: 'Ranking', icone: 'trofeu', ocultaCelular: true },
]

export function Cabecalho({ caminho }: { caminho: string }) {
  const { alternar } = usarTema()
  const { sessao } = usarConta()
  // Quem já assina acessa a assinatura em Minha conta; o botão só ofereceria de novo.
  const assinante = usarAssinante(sessao)
  const inicial = String(sessao?.user.user_metadata?.nome ?? '').trim().charAt(0).toUpperCase()
  // O menu com tudo: fecha sozinho ao trocar de página.
  const [menuAberto, definirMenuAberto] = useState(false)
  useEffect(() => { definirMenuAberto(false) }, [caminho])
  const botaoMenu = (classe: string) => (
    <button type="button" className={classe} onClick={() => definirMenuAberto(true)} aria-haspopup="dialog" aria-expanded={menuAberto}>
      <Icone nome="menu" tamanho={classe.includes('nav-link') ? 18 : 20} /><span>Menu</span>
    </button>
  )

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
              className={'nav-link' + (link.ocultaCelular ? ' nav-link--oculta-celular' : '') + (link.destino === '/dados' ? ' nav-link--oculta-estreito' : '') + (link.destino === '/ranking' ? ' nav-link--ranking' : '')}
              href={href(link.destino)}
              aria-current={caminho.startsWith(link.destino) || (link.destino === '/ranking' && caminho.startsWith('/conquistas')) ? 'page' : undefined}
            >
              <span className="nav-link__icone"><Icone nome={link.icone} tamanho={17} /></span>
              {link.rotulo}
            </a>
          ))}
          {botaoMenu('nav-link nav-link--menu')}
        </nav>
        <div className="cabecalho__acoes">
          <AvisoBloqueioDiario caminho={caminho} variante="chip" />
          {!assinante && <a className="nav-link nav-link--planos" href={href('/assinatura')} aria-current={caminho === '/assinatura' ? 'page' : undefined}>Planos</a>}
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
      <AvisoBloqueioDiario caminho={caminho} />
    </header>
    <nav className="navegacao-mobile nao-imprime" aria-label="Navegação móvel">
      <a href={href('/')} aria-current={caminho === '/' ? 'page' : undefined}><Icone nome="mapa" /><span>Início</span></a>
      <a href={href('/treinar')} aria-current={caminho.startsWith('/treinar') ? 'page' : undefined}><Icone nome="filtro" /><span>Treinar</span></a>
      <a href={href('/revisao')} aria-current={caminho.startsWith('/revisao') ? 'page' : undefined}><Icone nome="reiniciar" /><span>Revisar</span></a>
      <a className="navegacao-mobile__ranking" href={href('/ranking')} aria-current={caminho.startsWith('/ranking') || caminho.startsWith('/conquistas') ? 'page' : undefined}><Icone nome="trofeu" /><span>Ranking</span></a>
      <a href={href('/dados')} aria-current={caminho.startsWith('/dados') ? 'page' : undefined}><Icone nome="certo" /><span>Desempenho</span></a>
      {botaoMenu('navegacao-mobile__menu')}
    </nav>
    <MenuGeral aberto={menuAberto} aoFechar={() => definirMenuAberto(false)} caminho={caminho} />
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
