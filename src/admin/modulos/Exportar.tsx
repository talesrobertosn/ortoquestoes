import { useRef, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { codigoDaFalha, funcaoAusente } from '../../componentes/admin/pagamentos'
import { SECOES_EXPORTACAO, montarExportacao, type DadosPainel, type Exportacao, type OpcoesExportacao, type SecaoExportacao } from '../../componentes/admin/exportacao'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { Cabeca, Faixa, Interruptor, Painel } from '../ui/kit'
import { avisoRapido } from '../ui/sobreposicoes'

type Estado = 'esperando' | 'buscando' | 'ok' | 'falhou'
/** Cada seção é uma consulta que o painel já usa; uma falha não derruba as outras. */
const CONSULTAS: Array<[SecaoExportacao, string, Record<string, unknown>]> = [
  ['resumo', 'resumo_admin', {}], ['usuarios', 'listar_usuarios_admin', {}], ['sinais', 'sinais_usuarios_admin', {}],
  ['serie', 'serie_diaria_admin', { p_dias: 90 }], ['funil', 'funil_admin', {}], ['retencao', 'retencao_admin', {}],
  ['indicacoes', 'resumo_indicacoes_admin', {}], ['assinaturas', 'listar_assinaturas_admin', {}],
  ['cobrancas', 'cobrancas_admin', {}], ['eventos', 'listar_eventos_pagamento_admin', {}],
]
const UMA_LINHA: SecaoExportacao[] = ['resumo', 'funil', 'indicacoes']
function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a'); a.href = url; a.download = nome
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Configurações › Exportar dados: um documento para análise (Markdown, JSON e CSV das pessoas), com privacidade escolhida antes. */
export default function Exportar() {
  const parte = defParte('exportar')
  const [opcoes, definirOpcoes] = useState<OpcoesExportacao>({ ocultarEmails: true, pseudonimizar: false })
  const [estados, definirEstados] = useState<Partial<Record<SecaoExportacao, Estado>>>({})
  const [resultado, definirResultado] = useState<Exportacao | null>(null)
  const [ocupado, definirOcupado] = useState(false)
  const dadosRef = useRef<DadosPainel | null>(null)

  async function gerar() {
    definirOcupado(true); definirResultado(null)
    definirEstados(Object.fromEntries(CONSULTAS.map(([s]) => [s, 'buscando'])))
    const dados: DadosPainel = { geradoEm: new Date(), falhas: {} }
    await Promise.all(CONSULTAS.map(async ([secao, rpc, corpo]) => {
      try {
        const resposta = await chamarRpc<unknown[]>(rpc, corpo, { prazoMs: 30_000 })
        const valor = UMA_LINHA.includes(secao) ? (Array.isArray(resposta) ? resposta[0] ?? null : resposta) : resposta
        ;(dados as unknown as Record<string, unknown>)[secao === 'cobrancas' ? 'cobrancasReais' : secao] = valor
        definirEstados(e => ({ ...e, [secao]: 'ok' }))
      } catch (falha) {
        dados.falhas[secao] = funcaoAusente(falha) ? 'a consulta ainda não existe no banco (SQL da parte correspondente não colado)' : `falhou (${codigoDaFalha(falha)})`
        definirEstados(e => ({ ...e, [secao]: 'falhou' }))
      }
    }))
    dadosRef.current = dados
    definirResultado(montarExportacao(dados, opcoes))
    definirOcupado(false)
  }
  // Mudar a privacidade depois de gerar refaz o arquivo com os mesmos dados (sem consultar de novo).
  function mudar(novas: OpcoesExportacao) { definirOpcoes(novas); if (dadosRef.current) definirResultado(montarExportacao(dadosRef.current, novas)) }
  async function copiar() {
    if (!resultado) return
    try { await navigator.clipboard.writeText(resultado.markdown); avisoRapido('Markdown copiado.') } catch { avisoRapido('O navegador não deixou copiar. Use o botão Markdown para baixar.', 'erro') }
  }
  const feitas = Object.values(estados).filter(e => e === 'ok' || e === 'falhou').length
  const falhas = Object.values(estados).filter(e => e === 'falhou').length

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Configurações" titulo={parte.rotulo} pergunta="Um documento com pessoas, atividade, crescimento, assinaturas, pagamentos, previsões e o resumo do painel, pronto para uma análise: Markdown com tabelas, JSON e as pessoas em CSV." />
    <Faixa tom="aviso" titulo="O arquivo contém dados pessoais">De quem usa o site. Guarde com cuidado, não publique e apague quando terminar. Nada sai do seu navegador: o arquivo é montado aqui.</Faixa>
    <div className="a3-grade a3-grade--2" style={{ alignItems: 'start' }}>
      <Painel titulo="1. Privacidade" descricao="Escolha antes de gerar; dá para mudar depois sem consultar de novo.">
        <div className="a3-pilha">
          <Interruptor marcado={opcoes.ocultarEmails || opcoes.pseudonimizar} desativado={opcoes.pseudonimizar} aoMudar={v => mudar({ ...opcoes, ocultarEmails: v })} titulo="Ocultar e-mails" descricao="Nenhuma coluna de e-mail sai no arquivo." />
          <Interruptor marcado={opcoes.pseudonimizar} aoMudar={v => mudar({ ...opcoes, pseudonimizar: v })} titulo="Pseudonimizar nomes" descricao={'"Pessoa 001", "Pessoa 002"… na ordem de cadastro; a mesma pessoa tem o mesmo número em todo o arquivo e os e-mails ficam ocultos.'} />
        </div>
      </Painel>
      <Painel titulo="2. Gerar" descricao={`${CONSULTAS.length} seções, cada uma de uma consulta do painel. Uma falha vira aviso no próprio arquivo.`}>
        <div className="a3-pilha">
          {Object.keys(estados).length > 0 && <div role="status" aria-live="polite" className="a3-pilha">
            <div className="a3-progresso" aria-hidden="true"><i style={{ width: `${(feitas / CONSULTAS.length) * 100}%` }} /></div>
            <span className="a3-mudo a3-pequeno">{ocupado ? `Juntando os dados… ${feitas} de ${CONSULTAS.length}` : falhas ? `Pronto, com ${falhas} ${falhas === 1 ? 'seção' : 'seções'} sem dados (avisado no arquivo).` : 'Pronto: todas as seções vieram.'}</span>
            <ul className="a3-checagens" style={{ padding: 0 }}>{CONSULTAS.map(([s]) => { const e = estados[s] ?? 'esperando'; return <li key={s} className={e === 'ok' ? 'ok' : e === 'falhou' ? 'falha' : undefined}>
              <Icone nome={e === 'ok' ? 'certo' : e === 'falhou' ? 'erro' : 'relogio'} tamanho={15} />{SECOES_EXPORTACAO[s]}</li> })}</ul>
          </div>}
          <button type="button" className="a3-botao" style={{ justifySelf: 'start' }} disabled={ocupado} aria-busy={ocupado} onClick={() => void gerar()}><Icone nome="atualizar" tamanho={15} />{ocupado ? 'Juntando…' : resultado ? 'Gerar de novo' : 'Gerar documento'}</button>
        </div>
      </Painel>
    </div>
    {resultado && <Painel titulo="3. Baixar" descricao={`${resultado.nomeBase} · ${opcoes.pseudonimizar ? 'nomes pseudonimizados' : opcoes.ocultarEmails ? 'sem e-mails' : 'com e-mails'}`}>
      <div className="a3-acoes-linha">
        <button type="button" className="a3-botao" onClick={() => baixar(`${resultado.nomeBase}.md`, resultado.markdown, 'text/markdown;charset=utf-8')}><Icone nome="baixar" tamanho={15} />Markdown</button>
        <button type="button" className="a3-botao a3-botao--contorno" onClick={() => void copiar()}><Icone nome="copiar" tamanho={15} />Copiar o Markdown</button>
        <button type="button" className="a3-botao a3-botao--contorno" onClick={() => baixar(`${resultado.nomeBase}.json`, resultado.json, 'application/json;charset=utf-8')}>JSON</button>
        <button type="button" className="a3-botao a3-botao--contorno" onClick={() => baixar(`${resultado.nomeBase}-pessoas.csv`, resultado.csvPessoas, 'text/csv;charset=utf-8')}>CSV das pessoas</button>
      </div>
    </Painel>}
  </div>
}
