import { useState } from 'react'
import { LIMITE_GRATIS_ATUAL, LIMITES_HABILITADOS, fraseGratis } from '../config'
import { chaveDia } from '../estado/limiteDiario'
import { diasAte, proximaProva, RITMOS_CAPA as RITMOS } from '../dados/ritmos'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import '../estilos/componentes/AteAProva.css'

const numero = (n: number) => n.toLocaleString('pt-BR')

/**
 * Vende tempo e praticidade: um pouco por dia, de qualquer aparelho, e a conta
 * de quantas questões a pessoa terá feito até o dia da prova.
 */
export function AteAProva({ total, conta }: { total: number; conta: boolean }) {
  const [porDia, definirPorDia] = useState(20)
  const [prova, definirProva] = useState(proximaProva)
  const dias = diasAte(prova)
  const questoes = porDia * dias
  const vezes = total ? questoes / total : 0
  const dataCurta = new Date(`${prova}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
  const passaDoGratis = LIMITES_HABILITADOS && porDia > LIMITE_GRATIS_ATUAL

  return (
    <section className="ap" aria-labelledby="ap-titulo">
      <div className="ap__texto">
        <p className="ap__selo">Seu tempo rende mais aqui</p>
        <h2 id="ap-titulo">Um pouco por dia. No dia da prova, <em>pronto</em>.</h2>
        <p>No celular, no intervalo do plantão. No computador, em casa. Sua conta guarda onde você parou, e as revisões continuam de qualquer lugar, sem perder nenhuma questão.</p>
        <ul className="ap__lista">
          <li><Icone nome="certo" tamanho={16} /> Abra em qualquer aparelho e continue de onde parou</li>
          <li><Icone nome="certo" tamanho={16} /> O site escolhe o que revisar: você só responde</li>
          <li><Icone nome="certo" tamanho={16} /> Quem faz mais questões chega mais municiado</li>
        </ul>
      </div>

      <div className="ap__conta">
        <p className="ap__pergunta">Quantas questões você faz até a prova?</p>
        <div className="ap__ritmos" role="group" aria-label="Questões por dia">
          {RITMOS.map(([n, tempo]) => (
            <button key={n} type="button" className="ap__ritmo" aria-pressed={porDia === n} onClick={() => definirPorDia(n)}>
              <strong>{n}/dia</strong><small>≈ {tempo}</small>
            </button>
          ))}
        </div>
        <label className="ap__data">Prova em <input type="date" value={prova} min={chaveDia()} onChange={(e) => e.target.value && definirProva(e.target.value)} /></label>
        <p className="ap__resultado">
          <span className="ap__numero numerico">{numero(questoes)}</span>
          <span>questões feitas até {dataCurta}{dias ? `, em ${numero(dias)} dias` : ''}.</span>
        </p>
        <p className="ap__nota">{vezes >= 1
          ? <>Dá para passar pelo acervo inteiro{vezes >= 2 ? ` ${Math.floor(vezes)} vezes` : ''} e ainda revisar o que errou. Cada questão é uma situação de prova que você já terá resolvido.</>
          : <>Começando pelo que mais cai em todas as áreas. Cada questão é uma situação de prova que você já terá resolvido.</>}</p>
        {passaDoGratis && <p className="ap__nota ap__nota--plano"><Icone nome="raio" tamanho={14} /> {fraseGratis('ritmo')}</p>}
        <a className="botao botao--ouro botao--largo" href={href(conta ? '/cronograma' : '/conta?modo=criar&voltar=%2Fcronograma')}>{conta ? 'Montar meu cronograma até a prova' : 'Criar conta grátis e começar hoje'}</a>
      </div>
    </section>
  )
}
