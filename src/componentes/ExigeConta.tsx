import { useState, type ReactNode } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis } from '../conta/supabase'
import { EXIGIR_CONTA_PARA_QUESTOES } from '../config'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { ModalEntrar } from './ModalEntrar'
import { Simbolo } from '../marca/Simbolo'

/**
 * Por enquanto, questões e sessões de treino só com conta. Quem chega sem
 * conta a uma página com questões vê o convite para criar a conta ou entrar,
 * e volta para a mesma página depois de entrar.
 */
export function ExigeConta({ caminho, children }: { caminho: string; children: ReactNode }) {
  const { sessao } = usarConta()
  const [entrarAberto, definirEntrarAberto] = useState(false)
  if (!EXIGIR_CONTA_PARA_QUESTOES || !contasDisponiveis || sessao) return <>{children}</>
  const voltar = encodeURIComponent(caminho)
  return (
    <section className="exige-conta" aria-labelledby="exige-conta-titulo">
      <span className="exige-conta__simbolo"><Simbolo tamanho={56} /></span>
      <h1 id="exige-conta-titulo">Crie sua conta para ver as questões</h1>
      <p>
        As questões das provas oficiais, com o comentário de cada alternativa, ficam disponíveis para quem tem conta.
        É grátis, não pede cartão e leva menos de um minuto.
      </p>
      <ul className="exige-conta__lista">
        <li><Icone nome="alvo" tamanho={18} /> Treino por tema, prova e ano</li>
        <li><Icone nome="calendario" tamanho={18} /> Revisão no tempo certo</li>
        <li><Icone nome="grafico" tamanho={18} /> Seu desempenho guardado em qualquer aparelho</li>
      </ul>
      <div className="exige-conta__acoes">
        <a className="botao botao--principal botao--grande" href={href(`/conta?modo=criar&voltar=${voltar}`)}>Criar conta grátis</a>
        <button type="button" className="botao botao--fantasma botao--grande" onClick={() => definirEntrarAberto(true)}>Já tenho conta · Entrar</button>
      </div>
      <ModalEntrar aberto={entrarAberto} aoFechar={() => definirEntrarAberto(false)} />
    </section>
  )
}
