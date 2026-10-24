import { rotuloEtapa, rotuloProva } from '../conta/perfilEstudo'
import '../estilos/componentes/Cracha.css'

export interface DadosCracha {
  situacao: string; ano: string; provas: string[]; servico: string; nome: string; sobrenome: string; uf: string
}

const iniciais = (nome: string, sobrenome: string) => ((nome.trim()[0] ?? '') + (sobrenome.trim()[0] ?? '')).toLocaleUpperCase('pt-BR')

/**
 * O crachá de hospital em pixel (21/10/2026): o mesmo do pedido "Complete seu perfil" e do
 * topo de Minha conta. Mostra a fase, o nome, o serviço, o estado e as provas; o que falta
 * aparece como uma linha pontilhada a preencher. Desenhado só em CSS (Cracha.css), medido em
 * --u, que quem usa define. Decorativo: quem o usa põe o texto acessível ao lado.
 */
export function CrachaPixel({ dados, foco = '', carimbo = 0, textoCarimbo = 'OK', assinante = false, parado = false }: {
  dados: DadosCracha; foco?: string; carimbo?: number; textoCarimbo?: string; assinante?: boolean
  /** Fora da tela: para de balançar. */
  parado?: boolean
}) {
  const etapa = dados.situacao ? (dados.situacao === 'residente' && !dados.ano ? 'Residente' : rotuloEtapa(dados.situacao, dados.ano)) : ''
  const nomeCompleto = `${dados.nome} ${dados.sobrenome}`.trim()
  return (
    <span className={'cracha' + (assinante ? ' cracha--assinante' : '') + (parado ? ' cracha--parado' : '')} data-foco={foco} aria-hidden="true">
      <span className="cracha__cordao" />
      <span className="cracha__presilha" />
      <span className="cracha__balanco">
        <span className="cracha__cartao" key={carimbo}>
          <span className="cracha__furo" />
          <span className="cracha__faixa">{assinante ? '★ ASSINANTE ★' : 'ORTO QUESTÕES'}</span>
          <span className="cracha__corpo">
            <span className="cracha__foto">{iniciais(dados.nome, dados.sobrenome) || '?'}</span>
            <span className="cracha__etapa" data-campo="etapa">{etapa || <i className="cracha__vazio" />}</span>
          </span>
          <span className="cracha__nome" data-campo="nome">{nomeCompleto || <i className="cracha__vazio cracha__vazio--longo" />}</span>
          <span className="cracha__servico" data-campo="servico">{dados.servico.trim() || <i className="cracha__vazio" />}</span>
          <span className="cracha__rodape">
            <span className="cracha__uf" data-campo="local">{dados.uf || '··'}</span>
            <span className="cracha__provas" data-campo="provas">
              {dados.provas.length ? dados.provas.slice(0, 3).map((p) => <b key={p}>{rotuloProva(p).replace(/ \(.*\)$/, '')}</b>) : <i className="cracha__vazio cracha__vazio--curto" />}
            </span>
          </span>
          {carimbo > 0 && <span className="cracha__carimbo">{textoCarimbo}</span>}
        </span>
      </span>
    </span>
  )
}
