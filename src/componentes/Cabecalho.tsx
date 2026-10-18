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

// Os mesmos destinos em cima (computador) e embaixo (celular, até 40rem), na
// mesma ordem e com os mesmos ícones. Entre 40 e 56rem a barra de baixo ainda
// não aparece e o topo não comporta tudo: os secundários (Cronograma e
// Ranking) saem e continuam no Menu. Flashcards (beta público, 13/10/2026)
// leva o selo Beta. A Revisão continua no menu e na página inicial.
interface Destino { destino: string; rotulo: string; icone: NomeIcone; secundario?: boolean; beta?: boolean; classe?: string }
const LINKS: Destino[] = [
  { destino: '/treinar', rotulo: 'Treinar', icone: 'livro' },
  { destino: '/flashcards', rotulo: 'Flashcards', icone: 'raio', beta: true },
  { destino: '/cronograma', rotulo: 'Cronograma', icone: 'calendario', secundario: true },
  { destino: '/dados', rotulo: 'Desempenho', icone: 'grafico' },
  { destino: '/ranking', rotulo: 'Ranking', icone: 'trofeu', secundario: true, classe: 'ranking' },
]
/** Barra de baixo: Início, os mesmos destinos do topo (Ranking antes de Desempenho, como sempre foi) e o Menu. */
const LINKS_CELULAR: Destino[] = [
  { destino: '/', rotulo: 'Início', icone: 'mapa' },
  LINKS[0], LINKS[1], LINKS[2], LINKS[4], LINKS[3],
]

/** Primeiro nome do cadastro, como nos e-mails: vazio quando não parece um nome. */
export function primeiroNome(nome?: unknown): string {
  const primeiro = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

/** Página atual: o Ranking inclui Conquistas e o Cronograma inclui o plano de estudo antigo. */
function estaEm(caminho: string, destino: string) {
  if (destino === '/') return caminho === '/'
  return caminho.startsWith(destino)
    || (destino === '/ranking' && caminho.startsWith('/conquistas'))
    || (destino === '/cronograma' && caminho.startsWith('/plano-de-estudo'))
}

export function Cabecalho({ caminho }: { caminho: string }) {
  const { alternar } = usarTema()
  const { sessao } = usarConta()
  // Quem já assina acessa a assinatura em Minha conta; o botão só ofereceria de novo.
  const assinante = usarAssinante(sessao)
  const nome = primeiroNome(sessao?.user.user_metadata?.nome)
  const inicial = String(sessao?.user.user_metadata?.nome ?? '').trim().charAt(0).toUpperCase()
  // O menu com tudo: fecha sozinho ao trocar de página.
  const [menuAberto, definirMenuAberto] = useState(false)
  useEffect(() => { definirMenuAberto(false) }, [caminho])
  const atual = (destino: string) => (estaEm(caminho, destino) ? 'page' as const : undefined)

  return (
    <>
    <header className="cabecalho nao-imprime">
      <div className="conteudo cabecalho__interno">
        <a className="cabecalho__marca" href={href('/')} aria-label="Orto Questões, página inicial">
          <span className="cabecalho__selo"><MarcaHorizontal altura={22} /></span>
        </a>
        <nav className="cabecalho__nav cabecalho__nav-principal" aria-label="Principal">
          {LINKS.map((link) => (
            <a
              key={link.destino}
              className={'nav-link' + (link.secundario ? ' nav-link--secundario' : '') + (link.classe ? ` nav-link--${link.classe}` : '')}
              href={href(link.destino)}
              aria-current={atual(link.destino)}
            >
              <span className="nav-link__icone"><Icone nome={link.icone} tamanho={17} /></span>
              {link.rotulo}
              {link.beta && <span className="selo-beta">Beta</span>}
            </a>
          ))}
          <button type="button" className="nav-link nav-link--menu" onClick={() => definirMenuAberto(true)} aria-haspopup="dialog" aria-expanded={menuAberto}>
            <Icone nome="menu" tamanho={18} /><span>Menu</span>
          </button>
        </nav>
        <div className="cabecalho__acoes">
          <AvisoBloqueioDiario caminho={caminho} variante="chip" />
          {!assinante && <a className="nav-link nav-link--planos" href={href('/assinatura')} aria-current={caminho === '/assinatura' ? 'page' : undefined}>Planos</a>}
          {contasDisponiveis && (
            <a
              className={'nav-link nav-link--conta' + (sessao ? ' nav-link--logado' : '')}
              href={href('/conta')}
              aria-current={caminho === '/conta' ? 'page' : undefined}
              aria-label={sessao ? (nome ? `Minha conta, ${nome}` : 'Minha conta') : 'Entrar'}
            >
              {sessao ? <span className="avatar-mini" aria-hidden="true">{inicial || <Icone nome="usuario" tamanho={15} />}</span> : <Icone nome="usuario" tamanho={17} />}
              <span className="cabecalho__rotulo-conta">{sessao ? nome || 'Minha conta' : 'Entrar'}</span>
            </a>
          )}
          <button
            type="button"
            className="botao-icone cabecalho__tema"
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
      {LINKS_CELULAR.map((link) => (
        <a key={link.destino} className={link.classe ? `navegacao-mobile__${link.classe}` : undefined} href={href(link.destino)} aria-current={atual(link.destino)}>
          <span className="navegacao-mobile__icone" aria-hidden="true">
            <Icone nome={link.icone} tamanho={21} />
            {link.beta && <i className="selo-beta selo-beta--ponto" />}
          </span>
          <span className="navegacao-mobile__rotulo">{link.rotulo}</span>
          {link.beta && <span className="so-leitor">, Beta</span>}
        </a>
      ))}
      <button type="button" className="navegacao-mobile__menu" onClick={() => definirMenuAberto(true)} aria-haspopup="dialog" aria-expanded={menuAberto}>
        <span className="navegacao-mobile__icone" aria-hidden="true"><Icone nome="menu" tamanho={21} /></span>
        <span className="navegacao-mobile__rotulo">Menu</span>
      </button>
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
