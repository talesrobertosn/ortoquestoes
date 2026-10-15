import { Painel } from './Painel'
import { href } from '../util/rotas'
import { fraseGratis } from '../config'
import { linkConta } from '../conta/passagem'

/**
 * Painel exibido quando alguém sem conta tenta responder uma questão (sessão
 * ou questão avulsa). Fechar aqui não perde nada: a alternativa escolhida
 * continua marcada, só não é registrada nem revela o gabarito até a pessoa
 * entrar. Os dois links levam a rota atual em `voltar=`, para a pessoa
 * voltar à mesma questão depois de entrar ou criar a conta.
 */
export function PortaoConta({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return (
    <Painel titulo="Crie sua conta para responder" aberto={aberto} aoFechar={aoFechar}>
      <div className="empilha">
        <p>Para responder, é preciso ter uma conta. Criar leva menos de um minuto e não pede cartão.</p>
        <p className="texto-2">{fraseGratis('frase')}</p>
        <div className="linha linha--empilha-celular">
          <a className="botao botao--principal" href={href(linkConta('criar'))}>
            Criar conta gratuita
          </a>
          <a className="botao" href={href(linkConta('entrar'))}>
            Já tenho conta, entrar
          </a>
        </div>
      </div>
    </Painel>
  )
}
