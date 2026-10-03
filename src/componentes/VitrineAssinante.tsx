import { usarPremium } from '../conta/premium'
import { edicaoDoMes } from '../dados/simuladoNacional'
import { nomeEdicao } from '../estado/sessao'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { SeloAssinante } from './Premium'

const RECURSOS: Array<{ icone: 'medalha' | 'grupo' | 'alvo' | 'correio'; titulo: string; texto: (mes: string) => string; destino: string }> = [
  { icone: 'medalha', titulo: 'Simulado Nacional', texto: (mes) => `A prova de ${mes}: nota, posição e o que falta para você estar pronto.`, destino: '/simulado-nacional' },
  { icone: 'grupo', titulo: 'Liga da residência', texto: () => 'O ranking privado do seu serviço, com convite pelo WhatsApp.', destino: '/ligas' },
  { icone: 'alvo', titulo: 'Como a turma respondeu', texto: () => 'Estude pelas questões que a maioria erra e pelas que você não pode errar.', destino: '/treinar?situacao=turmaErra&limite=20' },
  { icone: 'correio', titulo: 'Relatório do mês', texto: () => 'Todo dia 1º, sua evolução, os temas que subiram e o próximo passo.', destino: '/conta?secao=estudo' },
]

/** Início: os recursos do assinante numa lista compacta, como atalhos para
 * quem tem e como vitrine para quem não tem. */
export function VitrineAssinante() {
  const { premium, logado } = usarPremium()
  const mes = nomeEdicao(edicaoDoMes()).split(' ')[0]
  return (
    <section className="pg-vitrine" aria-labelledby="pg-vitrine-titulo">
      <div className="pg-vitrine__cabeca">
        <h2 id="pg-vitrine-titulo">{premium ? 'Seus recursos de assinante' : 'Recursos do assinante'}</h2>
        {!premium && <a href={href(logado ? '/assinatura' : '/conta?modo=entrar')}>{logado ? 'Conhecer os planos' : 'Entrar'} <Icone nome="direita" tamanho={14} /></a>}
      </div>
      <ul className="pg-vitrine__lista">
        {RECURSOS.map((r) => (
          <li key={r.destino}>
            <a className="pg-recurso-linha" href={href(r.destino)}>
              <span className="pg-recurso-linha__icone" aria-hidden="true"><Icone nome={r.icone} tamanho={18} /></span>
              <span className="pg-recurso-linha__texto"><strong>{r.titulo}</strong><small>{r.texto(mes)}</small></span>
              {!premium && <SeloAssinante />}
              <Icone nome="direita" tamanho={16} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
