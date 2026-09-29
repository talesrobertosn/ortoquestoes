import { usarPremium } from '../conta/premium'
import { edicaoDoMes } from '../dados/simuladoNacional'
import { nomeEdicao } from '../estado/sessao'
import { href } from '../util/rotas'
import { Icone, type NomeIcone } from './Icone'
import { SeloAssinante } from './Premium'

const RECURSOS: Array<{ icone: NomeIcone; titulo: string; texto: (mes: string) => string; destino: string }> = [
  { icone: 'trofeu', titulo: 'Simulado Nacional', texto: (mes) => `A prova de ${mes}: nota, posição e o que falta para você estar pronto.`, destino: '/simulado-nacional' },
  { icone: 'coroa', titulo: 'Liga da residência', texto: () => 'O ranking privado do seu serviço, com convite pelo WhatsApp.', destino: '/ligas' },
  { icone: 'alvo', titulo: 'Como a turma respondeu', texto: () => 'Estude pelas questões que a maioria erra e pelas que você não pode errar.', destino: '/treinar?situacao=turmaErra&limite=20' },
  { icone: 'correio', titulo: 'Relatório do mês', texto: () => 'Todo dia 1º, sua evolução, os temas que subiram e o próximo passo.', destino: '/conta' },
]

/** Início: os recursos do assinante, como atalhos para quem tem e como vitrine para quem não tem. */
export function VitrineAssinante() {
  const { premium, logado } = usarPremium()
  const mes = nomeEdicao(edicaoDoMes()).split(' ')[0]
  return (
    <section className="pg-vitrine" aria-labelledby="pg-vitrine-titulo">
      <div className="pg-vitrine__cabeca">
        <h2 id="pg-vitrine-titulo">{premium ? 'Seus recursos de assinante' : 'Recursos do assinante'}</h2>
        {!premium && <a href={href(logado ? '/assinatura' : '/conta?modo=entrar')}>{logado ? 'Conhecer os planos' : 'Entrar'} <Icone nome="direita" tamanho={14} /></a>}
      </div>
      <div className="pg-vitrine__grade">
        {RECURSOS.map((r) => (
          <a key={r.destino} className="pg-recurso" href={href(r.destino)}>
            {!premium && <SeloAssinante />}
            <span className="pg-recurso__icone" aria-hidden="true"><Icone nome={r.icone} tamanho={20} /></span>
            <strong>{r.titulo}</strong>
            <span>{r.texto(mes)}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
