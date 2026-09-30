import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis } from '../conta/supabase'
import { usarAdministrador } from '../conta/administrador'
import { usarPremium } from '../conta/premium'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { href } from '../util/rotas'
import { Icone, type NomeIcone } from './Icone'
import { JanelaCentral, usarTelaLarga } from './JanelaCentral'
import { Painel } from './Painel'
import { SeloAssinante } from './Premium'

interface Item {
  destino: string
  rotulo: string
  texto: string
  icone: NomeIcone
  /** Recurso do assinante: quem não assina vê o selo e abre a prévia. */
  assinante?: boolean
  destaque?: boolean
}

/** Do que mais se usa para o que menos se usa, dentro de cada grupo e entre os grupos. */
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Estudar',
    itens: [
      { destino: '/treinar', rotulo: 'Treinar', texto: 'Monte uma sessão por tema, prova ou ano', icone: 'livro' },
      { destino: '/cronograma', rotulo: 'Cronograma', texto: 'O plano de cada dia até a sua prova', icone: 'rota', assinante: true, destaque: true },
      { destino: '/revisao', rotulo: 'Revisão', texto: 'As questões que voltam hoje para fixar', icone: 'reiniciar' },
      { destino: '/erros', rotulo: 'Caderno de erros', texto: 'Tudo o que você errou, pronto para refazer', icone: 'alerta' },
      { destino: '/favoritas', rotulo: 'Favoritas', texto: 'As questões que você marcou com estrela', icone: 'estrela' },
    ],
  },
  {
    titulo: 'Rumo à prova',
    itens: [
      { destino: '/temas-que-mais-caem', rotulo: 'Temas que mais caem', texto: 'O ranking do que o TEOT e o TARO mais cobram', icone: 'fogo', assinante: true },
      { destino: '/simulado-nacional', rotulo: 'Simulado Nacional', texto: 'Uma prova por mês, com nota e posição', icone: 'alvo', assinante: true },
    ],
  },
  {
    titulo: 'Acompanhar',
    itens: [
      { destino: '/dados', rotulo: 'Seu desempenho', texto: 'Acerto por tema e a sua evolução', icone: 'grafico' },
      { destino: '/ranking', rotulo: 'Ranking', texto: 'Sua posição, emblemas e missões', icone: 'trofeu' },
      { destino: '/ligas', rotulo: 'Liga da residência', texto: 'Dispute com os colegas do seu serviço', icone: 'grupo', assinante: true },
      { destino: '/conta', rotulo: 'Relatório do mês', texto: 'Todo dia 1º, a sua evolução no e-mail', icone: 'correio', assinante: true },
    ],
  },
]

/** O botão que abre o menu mora no cabeçalho (computador) e na barra de baixo (celular). */
export function MenuGeral({ aberto, aoFechar, caminho }: { aberto: boolean; aoFechar: () => void; caminho: string }) {
  const larga = usarTelaLarga()
  if (!aberto) return null
  const conteudo = <ConteudoMenu caminho={caminho} aoFechar={aoFechar} />
  return larga
    ? <JanelaCentral aberta rotulo="Menu" aoFechar={aoFechar} className="mn-janela">{conteudo}</JanelaCentral>
    : <Painel titulo="Menu" aberto aoFechar={aoFechar}>{conteudo}</Painel>
}

function ConteudoMenu({ caminho, aoFechar }: { caminho: string; aoFechar: () => void }) {
  const { sessao } = usarConta()
  const { premium } = usarPremium()
  const administrador = usarAdministrador(sessao?.user.id)
  const [sessaoLocal] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)
  const feitas = sessaoLocal ? Object.keys(sessaoLocal.respostas).length : 0
  const pendente = sessaoLocal && !sessaoLocal.concluidaEm && feitas < sessaoLocal.ids.length ? { feitas, total: sessaoLocal.ids.length } : null

  const conta: Item[] = [
    ...(contasDisponiveis
      ? [sessao
        ? { destino: '/conta', rotulo: 'Minha conta', texto: 'Perfil, preferências e backup', icone: 'usuario' as const }
        : { destino: '/conta?modo=entrar', rotulo: 'Entrar ou criar conta', texto: 'Guarde o progresso em qualquer aparelho', icone: 'usuario' as const }]
      : []),
    premium
      ? { destino: '/conta/assinatura', rotulo: 'Minha assinatura', texto: 'Plano, renovação e pagamentos', icone: 'medalha' }
      : { destino: '/assinatura', rotulo: 'Planos', texto: 'Tudo o que o assinante tem', icone: 'medalha' },
    { destino: '/contato', rotulo: 'Suporte e contato', texto: 'Dúvida, sugestão ou problema', icone: 'interrogacao' },
    { destino: '/sobre', rotulo: 'O projeto', texto: 'Quem faz e como os comentários são feitos', icone: 'bandeira' },
    ...(administrador ? [{ destino: '/admin', rotulo: 'Painel do administrador', texto: 'Usuários, avaliações e pagamentos', icone: 'cadeado' as const }] : []),
  ]
  const grupos = [...GRUPOS, { titulo: 'Conta e ajuda', itens: conta }]

  return (
    <div className="mn">
      <header className="mn__cabeca">
        <h2 className="mn__titulo">Tudo o que tem aqui</h2>
        <p>Do que mais ajuda no estudo ao que você usa de vez em quando.</p>
      </header>

      {pendente && (
        <a className="mn-retomar" href={href('/sessao')} onClick={aoFechar}>
          <span className="mn-retomar__icone" aria-hidden="true"><Icone nome="direita" tamanho={18} /></span>
          <span><strong>Continuar de onde parei</strong><small>{sessaoLocal?.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sua última sessão'} · {pendente.feitas} de {pendente.total} respondidas</small></span>
        </a>
      )}

      <div className="mn__grupos">
        {grupos.map((grupo) => (
          <nav key={grupo.titulo} className="mn-grupo" aria-label={grupo.titulo}>
            <p className="mn-grupo__titulo">{grupo.titulo}</p>
            <ul>
              {grupo.itens.map((item) => {
                const bloqueado = item.assinante && !premium
                // Relatório do mês é só por e-mail: quem não assina vai para os planos.
                const destino = bloqueado && item.rotulo === 'Relatório do mês' ? '/assinatura' : item.destino
                const atual = item.destino === caminho || (item.destino !== '/conta' && caminho.startsWith(item.destino + '/'))
                return (
                  <li key={item.rotulo}>
                    <a
                      className={'mn-item' + (item.destaque ? ' mn-item--destaque' : '') + (item.assinante ? ' mn-item--assinante' : '')}
                      href={href(destino)}
                      onClick={aoFechar}
                      aria-current={atual && item.rotulo !== 'Relatório do mês' ? 'page' : undefined}
                    >
                      <span className="mn-item__icone" aria-hidden="true"><Icone nome={item.icone} tamanho={19} /></span>
                      <span className="mn-item__texto"><strong>{item.rotulo}</strong><small>{item.texto}</small></span>
                      {bloqueado ? <SeloAssinante /> : <span className="mn-item__seta" aria-hidden="true"><Icone nome="direita" tamanho={16} /></span>}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        ))}
      </div>

      <p className="mn__rodape">
        <a href={href('/termos')} onClick={aoFechar}>Termos de uso</a>
        <a href={href('/condicoes-assinatura')} onClick={aoFechar}>Condições da assinatura</a>
      </p>
    </div>
  )
}
