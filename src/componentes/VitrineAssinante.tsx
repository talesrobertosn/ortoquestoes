import { usarPremium } from '../conta/premium'
import { edicaoDoMes } from '../dados/simuladoNacional'
import { nomeEdicao } from '../estado/sessao'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { IconePixel, type NomeIconePixel } from './IconePixel'
import { SeloAssinante } from './Premium'

const RECURSOS: Array<{ icone: NomeIconePixel; titulo: string; texto: (mes: string) => string; destino: string }> = [
  { icone: 'simulado', titulo: 'Simulado Nacional', texto: (mes) => `A prova de ${mes}: nota, posição e o que falta para você estar pronto.`, destino: '/simulado-nacional' },
  { icone: 'liga', titulo: 'Liga da residência', texto: () => 'O ranking privado do seu serviço, com convite pelo WhatsApp.', destino: '/ligas' },
  { icone: 'turma', titulo: 'Como a turma respondeu', texto: () => 'Estude pelas questões que a maioria erra e pelas que você não pode errar.', destino: '/treinar?situacao=turmaErra&limite=20' },
  { icone: 'relatorio', titulo: 'Relatório do mês', texto: () => 'Todo dia 1º, sua evolução, os temas que subiram e o próximo passo.', destino: '/conta?secao=estudo' },
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
            <span className="pg-recurso__topo">
              <span className="pg-recurso__icone pg-recurso__icone--pixel" aria-hidden="true"><IconePixel nome={r.icone} tamanho={40} /></span>
              {!premium && <SeloAssinante />}
            </span>
            <strong>{r.titulo}</strong>
            <span className="pg-recurso__texto">{r.texto(mes)}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
