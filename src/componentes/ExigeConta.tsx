import { useState, type ReactNode } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis } from '../conta/supabase'
import { EXIGIR_CONTA_PARA_QUESTOES, TEXTO_GRATIS } from '../config'
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
        Criar a conta não pede cartão e leva menos de um minuto.
      </p>
      <p className="exige-conta__gratis">
        <strong>A conta é grátis</strong> {TEXTO_GRATIS.exige}
        Entre, pratique e aproveite. {TEXTO_GRATIS.exigePlanos} <a href={href('/assinatura')}>conheça os planos</a>.
      </p>
      <ul className="exige-conta__lista">
        <li><Icone nome="grafico" tamanho={18} /> Responda no celular no plantão e continue no computador em casa</li>
        <li><Icone nome="calendario" tamanho={18} /> O site escolhe o que revisar, no tempo certo: você só responde</li>
        <li><Icone nome="alvo" tamanho={18} /> Quem faz mais questões chega mais preparado na prova</li>
      </ul>
      <div className="exige-conta__acoes">
        <a className="botao botao--principal botao--grande" href={href(`/conta?modo=criar&voltar=${voltar}`)}>Criar conta grátis</a>
        <button type="button" className="botao botao--fantasma botao--grande" onClick={() => definirEntrarAberto(true)}>Já tenho conta · Entrar</button>
      </div>
      <ModalEntrar aberto={entrarAberto} aoFechar={() => definirEntrarAberto(false)} />
    </section>
  )
}
