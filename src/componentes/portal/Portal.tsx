import { useState, type CSSProperties } from 'react'
import { usarAdministrador } from '../../conta/administrador'
import { usarConta } from '../../conta/ContextoConta'
import { usarPremium } from '../../conta/premium'
import { contasDisponiveis } from '../../conta/supabase'
import { usarNacionalAbertoATodos } from '../../dados/nacionalEmDestaque'
import { A_PARTIR_DE } from '../../dados/planos'
import { href } from '../../util/rotas'
import { urlCss } from '../../config'
import { Icone } from '../Icone'
import { BuscaPortal } from './BuscaPortal'
import { ContinuarJornada } from './ContinuarJornada'
import { IconePixel } from './IconePixel'
import { GRUPOS, PRINCIPAIS, SO_NA_BUSCA, grupoConta, type Pagina } from './rotas'
import { Visitantes } from './Visitantes'
import { FogoVivo } from './FogoVivo'
import '../../estilos/componentes/Portal.css'

/**
 * O Portal do Aventureiro (31/10/2026): o menu do site, num pop-up claro. De cima para baixo: a busca, a jornada (a
 * sessão para retomar e o que está pendente hoje), os seis atalhos (Cronograma, Resumos e Atlas 3D com o fogo
 * mágico de cada um) e as outras ferramentas em quatro grupos curtos. A coruja e o gato visitam de vez em quando
 * (Visitantes.tsx). Rotas, nomes e regras de acesso vêm de rotas.ts.
 */

export default function Portal({ caminho, aoFechar, focarBusca }: { caminho: string; aoFechar: () => void; focarBusca?: boolean }) {
  const { sessao } = usarConta()
  const { premium } = usarPremium()
  const nacionalAberto = usarNacionalAbertoATodos()
  const administrador = usarAdministrador(sessao?.user.id)
  const [digitando, definirDigitando] = useState(false)
  const [quente, definirQuente] = useState<string | null>(null)
  const conta = grupoConta({ contas: contasDisponiveis, logado: !!sessao, premium, administrador })
  const grupos = [...GRUPOS, conta]
  const bloqueado = (p: Pagina) => !!p.assinante && !premium && !(nacionalAberto && p.destino === '/simulado-nacional')
  // Página atual: igual ou "filha" (sem acender dois itens: o mais específico ganha).
  const todas = [...PRINCIPAIS, ...grupos.flatMap((g) => g.itens)]
  const atual = todas.filter((p) => p.destino === caminho || (p.destino !== '/conta' && caminho.startsWith(p.destino + '/'))).sort((a, b) => b.destino.length - a.destino.length)[0]?.destino
  const paginasBusca = [...PRINCIPAIS, ...SO_NA_BUSCA, ...grupos.flatMap((g) => g.itens)]

  return (
    <>
    <header className="pt-cabeca">
      <div className="pt-cabeca__linha">
        <p className="pt-cabeca__marca"><span className="pt-cabeca__selo" aria-hidden="true" /><span><small>Portal do aventureiro</small><strong id="pt-titulo">Menu</strong></span></p>
        <button type="button" className="pt-fechar" onClick={aoFechar} aria-label="Fechar o menu"><Icone nome="fechar" tamanho={20} /></button>
      </div>
      <BuscaPortal paginas={paginasBusca} aoIr={aoFechar} focar={!!focarBusca} aoDigitar={definirDigitando} />
    </header>
    <div className={'pt-corpo' + (digitando ? ' pt-corpo--buscando' : '')}>

      <ContinuarJornada premium={premium} aoIr={aoFechar} />

      <section aria-labelledby="pt-atalhos-titulo">
        <h3 id="pt-atalhos-titulo" className="pt-rotulo">Ferramentas de estudo</h3>
        <nav className="pt-atalhos" aria-label="Ferramentas de estudo">
          {[...PRINCIPAIS.filter((p) => p.fogo), ...PRINCIPAIS.filter((p) => !p.fogo)].map((p) => (
            <a key={p.destino} className={`pt-atalho${p.fogo ? ` pt-atalho--fogo pt-atalho--${p.fogo}` : ''}`} href={href(p.destino)} onClick={aoFechar}
              onPointerEnter={() => definirQuente(p.destino)} onPointerLeave={() => definirQuente(null)} onFocus={() => definirQuente(p.destino)} onBlur={() => definirQuente(null)}
              aria-current={atual === p.destino ? 'page' : undefined}>
              {p.fogo && <FogoVivo tipo={p.fogo} ativo={quente === p.destino} />}
              <span className="pt-atalho__icone"><IconePixel nome={p.icone} tamanho={64} /></span>
              <span className="pt-atalho__texto">
                <strong>{p.rotulo}{p.novo && <span className="pt-novo">{p.novo}</span>}</strong>
                <small>{p.texto}</small>
              </span>
              {bloqueado(p) && <span className="pt-cadeado" title="Recurso do assinante"><Icone nome="cadeado" tamanho={12} /><span className="so-leitor">, recurso do assinante</span></span>}
            </a>
          ))}
          <span className="pt-vagalume" aria-hidden="true" style={{ '--pt-vagalume': urlCss('pixel/menu/vagalume.png?v=1') } as CSSProperties} />
        </nav>
      </section>

      {!premium && (
        <a className="pt-planos" href={href('/assinatura')} onClick={aoFechar}>
          <IconePixel nome="assinatura" tamanho={48} />
          <span><strong>Planos e assinatura</strong><small>Cronograma, Simulado Nacional e o Atlas completo · a partir de {A_PARTIR_DE}/mês</small></span>
          <span className="pt-planos__acao">Ver planos <Icone nome="direita" tamanho={14} /></span>
        </a>
      )}

      <div className="pt-grupos">
        {grupos.map((g) => (
          <nav key={g.id} className={`pt-grupo pt-grupo--${g.id}`} aria-labelledby={`pt-g-${g.id}`}>
            <h3 id={`pt-g-${g.id}`} className="pt-rotulo">{g.titulo}</h3>
            <ul>
              {g.itens.filter((p) => !(p.destino === '/assinatura' && !premium)).map((p) => {
                const fechado = bloqueado(p)
                const destino = fechado && p.icone === 'relatorio' ? '/assinatura' : p.destino
                return <li key={p.rotulo}>
                  <a className="pt-item" href={href(destino)} onClick={aoFechar} aria-current={atual === p.destino && p.icone !== 'relatorio' ? 'page' : undefined}
                    style={{ '--atraso': `${g.itens.indexOf(p) * 18}ms` } as CSSProperties}>
                    <IconePixel nome={p.icone} tamanho={48} />
                    <span className="pt-item__texto"><strong>{p.rotulo}</strong><small>{p.texto}</small></span>
                    {fechado ? <span className="pt-cadeado" title="Recurso do assinante"><Icone nome="cadeado" tamanho={12} /><span className="so-leitor">, recurso do assinante</span></span> : <Icone nome="direita" tamanho={15} />}
                  </a>
                </li>
              })}
            </ul>
          </nav>
        ))}
      </div>

    </div>
    {/* O chão do portal: não rola, guarda os links legais e é por onde o gato passeia (nunca sobre o conteúdo). */}
    <footer className="pt-chao">
      <a href={href('/termos')} onClick={aoFechar}>Termos de uso</a>
      <a href={href('/condicoes-assinatura')} onClick={aoFechar}>Condições da assinatura</a>
    </footer>
    <Visitantes digitando={digitando} />
    </>
  )
}
