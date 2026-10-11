import type { ReactNode } from 'react'

/** O que gravamos quando a pessoa atende em vários lugares, sem um serviço principal. */
export const SERVICO_VARIOS = 'Vários serviços'

/** Rótulo e exemplo do campo conforme a etapa: estudante tem faculdade; quem já é ortopedista pode ter vários lugares. */
function textos(situacao: string) {
  if (situacao === 'estudante') return { rotulo: 'Faculdade de medicina', exemplo: 'Ex.: UFG, USP, Unifesp' }
  if (situacao === 'ortopedista' || situacao === 'outro') return { rotulo: 'Hospital ou serviço onde mais atua', exemplo: 'Ex.: Hospital, clínica, instituição' }
  return { rotulo: 'Hospital ou serviço da sua residência', exemplo: 'Ex.: Hospital das Clínicas, Santa Casa, INTO' }
}

/**
 * Onde a pessoa estuda ou trabalha. Para ortopedista, um atalho "atuo em vários
 * lugares": ele não precisa escolher um hospital só, e o painel junta essas contas.
 */
export function CampoServico({ situacao, valor, aoMudar, obrigatorio = false, classeEntrada = '', extra }: {
  situacao: string; valor: string; aoMudar: (v: string) => void; obrigatorio?: boolean; classeEntrada?: string; extra?: ReactNode
}) {
  const { rotulo, exemplo } = textos(situacao)
  const podeVarios = situacao === 'ortopedista' || situacao === 'outro'
  const varios = podeVarios && valor === SERVICO_VARIOS
  return (
    <div className="campo campo-servico" data-campo="servico">
      <label className="campo-servico__rotulo" htmlFor="campo-servico">{rotulo}</label>
      {!varios && <input id="campo-servico" className={'entrada ' + classeEntrada} required={obrigatorio && !varios} value={valor === SERVICO_VARIOS ? '' : valor} onChange={(e) => aoMudar(e.target.value)} placeholder={exemplo} />}
      {podeVarios && (
        <label className="caixa campo-servico__varios">
          <input type="checkbox" checked={varios} onChange={(e) => aoMudar(e.target.checked ? SERVICO_VARIOS : '')} />
          <span>Atuo em vários hospitais ou em consultório próprio</span>
        </label>
      )}
      {extra}
    </div>
  )
}
