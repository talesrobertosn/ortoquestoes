import { useState } from 'react'
import { LIMITE_GRATIS_ATUAL } from '../config'
import { DATAS_PROVA } from '../estado/conquistas'
import { chaveDia, LIMITES_HABILITADOS } from '../estado/limiteDiario'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import '@fontsource/pixelify-sans/latin-700.css'
import '../estilos/componentes/AteAProva.css'

/** Ritmos para escolher, com o tempo aproximado (cerca de 1,5 minuto por questão). */
const RITMOS: Array<[number, string]> = [[10, '15 min'], [20, '30 min'], [30, '45 min'], [50, '1h15']]

/** A próxima prova do calendário; sem data futura cadastrada, seis meses à frente. */
function proximaProva(): string {
  const hoje = chaveDia()
  return DATAS_PROVA.find((d) => d > hoje) ?? chaveDia(Date.now() + 182 * 864e5)
}
const diasAte = (data: string) => Math.max(0, Math.round((Date.parse(`${data}T12:00:00Z`) - Date.parse(`${chaveDia()}T12:00:00Z`)) / 864e5))
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
          : <>São {Math.round(vezes * 100)}% do acervo, começando pelo que mais cai. Cada questão é uma situação de prova que você já terá resolvido.</>}</p>
        {passaDoGratis && <p className="ap__nota ap__nota--plano"><Icone nome="raio" tamanho={14} /> O gratuito libera {LIMITE_GRATIS_ATUAL} a cada 24 horas. Nesse ritmo, o plano libera sem limite.</p>}
        <a className="botao botao--ouro botao--largo" href={href(conta ? '/cronograma' : '/conta?modo=criar&voltar=%2Fcronograma')}>{conta ? 'Montar meu cronograma até a prova' : 'Criar conta grátis e começar hoje'}</a>
      </div>
    </section>
  )
}
