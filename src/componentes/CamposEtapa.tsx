import { useRef } from 'react'
import { ANOS, PROVAS, SITUACOES, provasSugeridas, type ProvaInteresse } from '../conta/perfilEstudo'
import { Icone } from './Icone'

interface Props {
  situacao: string
  ano: string
  provas: ProvaInteresse[]
  aoMudarSituacao: (valor: string) => void
  aoMudarAno: (valor: string) => void
  aoMudarProvas: (valores: ProvaInteresse[]) => void
  obrigatorio?: boolean
}

/**
 * Etapa de formação (com o ano, para residentes) e as provas de interesse.
 * Usado no cadastro, no perfil e no aviso único para quem já tinha conta.
 * Enquanto a pessoa não mexe nas provas, elas acompanham a etapa escolhida.
 */
export function CamposEtapa({ situacao, ano, provas, aoMudarSituacao, aoMudarAno, aoMudarProvas, obrigatorio }: Props) {
  const mexeuNasProvas = useRef(provas.length > 0)

  function sugerir(s: string, a: string) {
    if (!mexeuNasProvas.current) aoMudarProvas(provasSugeridas(s, a))
  }
  function alternar(p: ProvaInteresse) {
    mexeuNasProvas.current = true
    aoMudarProvas(provas.includes(p) ? provas.filter((x) => x !== p) : [...provas, p])
  }

  return (
    <div className="campos-etapa">
      <div className={`linha-campos${situacao === 'residente' ? ' linha-campos--2' : ''}`}>
        <label className="campo">Você é
          <select className="entrada" required={obrigatorio} value={situacao} onChange={(e) => { aoMudarSituacao(e.target.value); sugerir(e.target.value, ano) }}>
            <option value="">Selecione</option>
            {SITUACOES.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            {situacao && !SITUACOES.some(([v]) => v === situacao) && <option value={situacao}>{situacao}</option>}
          </select>
        </label>
        {situacao === 'residente' && (
          <label className="campo">Ano da residência
            <select className="entrada" required={obrigatorio} value={ano} onChange={(e) => { aoMudarAno(e.target.value); sugerir(situacao, e.target.value) }}>
              <option value="">Selecione</option>
              {ANOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select>
          </label>
        )}
      </div>
      <fieldset className="campos-etapa__provas">
        <legend>Para qual prova você estuda? <span className="meta">(pode marcar mais de uma)</span></legend>
        <div className="campos-etapa__opcoes">
          {PROVAS.map(([valor, rotulo, explicacao]) => {
            const marcada = provas.includes(valor)
            return (
              <button key={valor} type="button" className="campos-etapa__prova" aria-pressed={marcada} onClick={() => alternar(valor)}>
                <span className="campos-etapa__marca" aria-hidden="true">{marcada && <Icone nome="certo" tamanho={13} />}</span>
                <span><strong>{rotulo}</strong><small>{explicacao}</small></span>
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
