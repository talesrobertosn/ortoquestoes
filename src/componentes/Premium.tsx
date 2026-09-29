import type { ReactNode } from 'react'
import { usarPremium } from '../conta/premium'
import { href } from '../util/rotas'
import { Icone, type NomeIcone } from './Icone'
import { Simbolo } from '../marca/Simbolo'

/** Selo discreto "Assinante" ao lado do nome de um recurso do plano pago. */
export function SeloAssinante({ texto = 'Assinante' }: { texto?: string }) {
  return <span className="pg-selo"><span className="pg-selo__q"><Simbolo tamanho={13} /></span>{texto}</span>
}

interface PropsConvite {
  icone: NomeIcone
  titulo: string
  texto: ReactNode
  itens?: string[]
  /** "faixa" cabe dentro de outra tela; "cartao" é a página inteira bloqueada. */
  variante?: 'cartao' | 'faixa'
  children?: ReactNode
}

/**
 * Convite para um recurso do plano pago. Diz o que a pessoa ganha, sem
 * esconder que é pago, e leva aos planos (ou a entrar, para visitantes).
 */
export function ConvitePremium({ icone, titulo, texto, itens, variante = 'cartao', children }: PropsConvite) {
  const { logado, pagamentos_ativos, carregado } = usarPremium()
  return (
    <section className={`pg-convite pg-convite--${variante}`} aria-label={titulo}>
      <span className="pg-convite__icone" aria-hidden="true"><Icone nome={icone} tamanho={variante === 'faixa' ? 20 : 26} /></span>
      <div className="pg-convite__corpo">
        <p className="pg-convite__selo"><Icone nome="cadeado" tamanho={13} /> Exclusivo para assinantes</p>
        <h2 className="pg-convite__titulo">{titulo}</h2>
        <div className="pg-convite__texto">{texto}</div>
        {itens && itens.length > 0 && <ul className="pg-convite__itens">{itens.map(item => <li key={item}><Icone nome="certo" tamanho={16} />{item}</li>)}</ul>}
        {children}
        <div className="pg-convite__acoes">
          {logado
            ? <a className="botao botao--ouro" href={href('/assinatura')}>Conhecer os planos</a>
            : <a className="botao botao--ouro" href={href('/conta?modo=entrar')}>Entrar ou criar conta</a>}
          {logado && carregado && !pagamentos_ativos && <small className="pg-convite__nota">As assinaturas abrem em breve.</small>}
        </div>
      </div>
    </section>
  )
}

/** Mostra o conteúdo para quem tem o plano; para os outros, o convite. */
export function PortaoPremium({ convite, children }: { convite: ReactNode; children: ReactNode }) {
  const { premium, carregado, logado } = usarPremium()
  if (logado && !carregado) return <p className="estado" role="status">Carregando…</p>
  return <>{premium ? children : convite}</>
}

interface PropsDegustacao {
  /** Frase curta sobre o que fica guardado, ex.: "Os outros 17 assuntos". */
  titulo: string
  texto?: ReactNode
  /** Texto do botão; o destino é sempre a página de planos (ou entrar). */
  acao?: string
  children: ReactNode
  className?: string
}

/**
 * Prévia de um recurso pago: o conteúdo aparece desfocado por baixo e uma
 * faixa com cadeado convida a assinar. O que vai dentro deve ser exemplo ou
 * dado já público: o desfoque é só visual.
 */
export function Degustacao({ titulo, texto, acao = 'Liberar com a assinatura', children, className = '' }: PropsDegustacao) {
  const { logado, pagamentos_ativos, carregado } = usarPremium()
  return (
    <div className={`dg ${className}`}>
      <div className="dg__conteudo" aria-hidden="true" {...{ inert: "" }}>{children}</div>
      <div className="dg__cortina">
        <div className="dg__cartao">
          <span className="dg__cadeado" aria-hidden="true"><Icone nome="cadeado" tamanho={18} /></span>
          <p className="dg__titulo">{titulo}</p>
          {texto && <div className="dg__texto">{texto}</div>}
          <a className="botao botao--ouro" href={href(logado ? '/assinatura' : '/conta?modo=entrar')}>{logado ? acao : 'Entrar para ver mais'}</a>
          {logado && carregado && !pagamentos_ativos && <small className="dg__nota">As assinaturas abrem em breve.</small>}
        </div>
      </div>
    </div>
  )
}
