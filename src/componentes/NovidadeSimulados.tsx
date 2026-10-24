import { useEffect, useState } from 'react'
import type { PlanoSalvo } from '../dados/planoEstudo'
import { avisoSimuladosVisto, ficarSoComOficiais, marcarAvisoSimulados, mostrarNovidadeSimulados } from '../conta/cronograma'
import { Icone } from './Icone'
import { usarConta } from '../conta/ContextoConta'
import { avisoVistoNaConta, marcarAvisoNaConta } from '../conta/avisosVistos'

/**
 * Aviso único para quem montou o cronograma antes da opção dos OrtoQuestões
 * Simulados: eles já entraram no plano; a pessoa mantém ou fica só com as
 * oficiais. Aparece na página do Cronograma e no cartão do Cronograma do Início.
 * Uma vez só, em qualquer aparelho: o "já vi" vai também para a conta (avisosVistos.ts).
 */
export function NovidadeSimulados({ plano, aoMudarPlano }: { plano: PlanoSalvo | null | undefined; aoMudarPlano: (p: PlanoSalvo) => void }) {
  const [fechado, definirFechado] = useState(false)
  const [salvando, definirSalvando] = useState(false)
  const [erro, definirErro] = useState('')
  const meta = usarConta().sessao?.user.user_metadata
  // Quem já tinha visto neste aparelho leva o "já vi" para a conta: não aparece nos outros.
  const temConta = !!meta
  useEffect(() => { if (temConta && avisoSimuladosVisto()) marcarAvisoNaConta(meta, 'cronograma-simulados') }, [temConta]) // eslint-disable-line react-hooks/exhaustive-deps
  if (fechado || !mostrarNovidadeSimulados(plano, avisoVistoNaConta(meta, 'cronograma-simulados'))) return null

  function manter() { marcarAvisoSimulados(); marcarAvisoNaConta(meta, 'cronograma-simulados'); definirFechado(true) }
  async function soOficiais() {
    if (!plano || salvando) return
    definirSalvando(true); definirErro('')
    try {
      const salvo = await ficarSoComOficiais(plano)
      if (salvo) aoMudarPlano(salvo)
      marcarAvisoNaConta(meta, 'cronograma-simulados')
      definirFechado(true)
    } catch { definirErro('Não foi possível salvar agora. Tente de novo.') } finally { definirSalvando(false) }
  }

  return (
    <section className="pe-novidade" aria-labelledby="pe-novidade-titulo">
      <span className="pe-novidade__selo">Novidade</span>
      <h2 id="pe-novidade-titulo">OrtoQuestões Simulados no seu cronograma</h2>
      <p>Agora temos questões feitas por <strong>engenharia reversa</strong> das provas oficiais do TEOT e do TARO: o mesmo padrão de enunciado e de cobrança, com perguntas e conteúdo tirados diretamente do livro de referência e cada alternativa comentada com a citação.</p>
      <p>Elas já foram <strong>adicionadas automaticamente</strong> ao seu cronograma. Quer manter?</p>
      {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
      <div className="linha">
        <button type="button" className="botao botao--principal" onClick={manter}><Icone nome="certo" tamanho={16} /> Sim, manter no cronograma</button>
        <button type="button" className="botao botao--fantasma" disabled={salvando} onClick={soOficiais}>{salvando ? 'Salvando…' : 'Prefiro só as questões oficiais'}</button>
      </div>
      <small>Dá para mudar quando quiser em Ajustar o cronograma. Os simulados não contam para os temas que mais caem.</small>
    </section>
  )
}
