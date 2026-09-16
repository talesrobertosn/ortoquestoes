import { Painel } from './Painel'
import { href } from '../util/rotas'

/**
 * Painel exibido quando alguém sem conta tenta responder uma questão.
 * Navegar, montar sessão e ver as questões continua livre sem conta — só a
 * resposta em si (e o gabarito) exige login, para ter controle de quem usa o
 * site. Fechar aqui não perde nada: a alternativa escolhida continua
 * marcada, só não é registrada nem revela o gabarito até a pessoa entrar.
 */
export function PortaoConta({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return (
    <Painel titulo="Crie sua conta para responder" aberto={aberto} aoFechar={aoFechar}>
      <div className="empilha">
        <p>
          O OrtoQuestões é gratuito — não cobramos nada para responder questões. Mas, para
          responder, agora é preciso ter uma conta.
        </p>
        <p className="texto-2">
          É rápido e continua sem custo: leva menos de um minuto para criar. Você pode continuar
          navegando, montando sessões e vendo as questões livremente sem conta — só a resposta em
          si exige login.
        </p>
        <div className="linha linha--empilha-celular">
          <a className="botao botao--principal" href={href('/conta?modo=criar')}>
            Criar conta gratuita
          </a>
          <a className="botao" href={href('/conta')}>
            Já tenho conta, entrar
          </a>
        </div>
      </div>
    </Painel>
  )
}
