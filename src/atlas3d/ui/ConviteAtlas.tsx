import { Icone } from '../../componentes/Icone'
import { href } from '../../util/rotas'
import { linkConta } from '../../conta/passagem'
import { GRUPOS } from '../config'
import type { Grupo } from '../tipos'

export type TipoConvite = { tipo: 'conta' } | { tipo: 'assinante'; grupo: Grupo }

/**
 * Convites do atlas, sempre gentis (regra do Tales para tudo o que fala em nome do site):
 * sem conta, a pessoa vê os ossos e é convidada a criar a conta grátis para montar as
 * camadas; com a conta grátis, ossos e músculos ficam livres e as outras camadas aparecem
 * por alguns segundos antes do convite para assinar.
 */
export function ConviteAtlas({ convite, aoFechar }: { convite: TipoConvite; aoFechar: () => void }) {
  const conta = convite.tipo === 'conta'
  const nomeCamada = convite.tipo === 'assinante' ? GRUPOS[convite.grupo].rotulo.toLowerCase() : ''
  return (
    <div className="at-convite" role="dialog" aria-modal="true" aria-labelledby="at-convite-titulo" onClick={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div className="at-convite__cartao">
        <button type="button" className="at-convite__fechar" onClick={aoFechar} aria-label="Fechar"><Icone nome="fechar" tamanho={18} /></button>
        <p className="tr-heroi__selo">{conta ? 'Conta grátis' : 'Para assinantes'}</p>
        {conta ? (
          <>
            <h2 id="at-convite-titulo">Que bom ter você por aqui!</h2>
            <p>Para ligar e desligar as camadas do atlas, é só criar a sua conta grátis. Com ela, os <strong>ossos e os músculos</strong> ficam todos liberados, você salva as estruturas favoritas e responde as questões de cada uma.</p>
            <p className="at-convite__nota">Leva menos de um minuto e não pede cartão.</p>
            <div className="at-convite__acoes">
              <a className="at-ouro at-ouro--curto" href={href(linkConta('criar'))}>Criar minha conta grátis</a>
              <a className="botao" href={href(linkConta('entrar'))}>Já tenho conta</a>
            </div>
          </>
        ) : (
          <>
            <h2 id="at-convite-titulo">Gostou de ver os {nomeCamada}?</h2>
            <p>Os {nomeCamada}, e também as outras camadas além de ossos e músculos, ficam abertos para quem assina o OrtoQuestões, junto com o cronograma até a prova e o Simulado Nacional.</p>
            <p className="at-convite__nota">Os ossos, os músculos e as questões de cada estrutura continuam liberados na sua conta, do jeitinho que estão.</p>
            <div className="at-convite__acoes">
              <a className="at-ouro at-ouro--curto" href={href('/assinatura')}>Conhecer os planos</a>
              <button type="button" className="botao" onClick={aoFechar}>Continuar com ossos e músculos</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
