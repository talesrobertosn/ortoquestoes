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
  /** Mensagens dos campos que faltam (cadastro), por campo: situacao, ano, provas. */
  erros?: Partial<Record<'situacao' | 'ano' | 'provas', string>>
}

/**
 * Etapa de formação (com o ano, para residentes) e as provas de interesse.
 * Usado no cadastro, no perfil e no aviso único para quem já tinha conta.
 * Enquanto a pessoa não mexe nas provas, elas acompanham a etapa escolhida.
 */
export function CamposEtapa({ situacao, ano, provas, aoMudarSituacao, aoMudarAno, aoMudarProvas, obrigatorio, erros = {} }: Props) {
  const tag = obrigatorio && <span className="campo__obrigatorio">obrigatório</span>
  const erro = (c: keyof typeof erros) => erros[c] && <span className="campo__erro" role="alert"><Icone nome="alerta" tamanho={14} />{erros[c]}</span>
  const marcadas = PROVAS.filter(([v]) => provas.includes(v)).map(([, rotulo]) => rotulo)
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
        <label className="campo" data-campo="situacao"><span className="campo__rotulo">Você é {tag}</span>
          <select className={'entrada' + (erros.situacao ? ' entrada--invalida' : '')} required={obrigatorio} value={situacao} onChange={(e) => { aoMudarSituacao(e.target.value); sugerir(e.target.value, ano) }}>
            <option value="">Selecione</option>
            {SITUACOES.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            {situacao && !SITUACOES.some(([v]) => v === situacao) && <option value={situacao}>{situacao}</option>}
          </select>
          {erro('situacao')}
        </label>
        {situacao === 'residente' && (
          <label className="campo" data-campo="ano"><span className="campo__rotulo">Ano da residência {tag}</span>
            <select className={'entrada' + (erros.ano ? ' entrada--invalida' : '')} required={obrigatorio} value={ano} onChange={(e) => { aoMudarAno(e.target.value); sugerir(situacao, e.target.value) }}>
              <option value="">Selecione</option>
              {ANOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select>
            {erro('ano')}
          </label>
        )}
      </div>
      <fieldset className={'campos-etapa__provas' + (erros.provas ? ' campos-etapa__provas--invalida' : '')} data-campo="provas">
        <legend>Para qual prova você estuda? {tag} <span className="meta">(pode marcar mais de uma)</span></legend>
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
        {/* Resumo do que ficou marcado: a etapa já sugere provas sozinha, e a marcação
            discreta dos botões passava despercebida. */}
        {obrigatorio && <p className={'campos-etapa__resumo' + (marcadas.length ? ' campos-etapa__resumo--ok' : '')} role="status">
          <Icone nome={marcadas.length ? 'certo' : 'alerta'} tamanho={14} />
          {marcadas.length ? <span>{marcadas.length > 1 ? 'Marcadas' : 'Marcada'}: <b>{marcadas.join(', ')}</b></span> : <span>Nenhuma prova marcada ainda. Toque em uma ou mais acima.</span>}
        </p>}
        {erro('provas')}
      </fieldset>
    </div>
  )
}
