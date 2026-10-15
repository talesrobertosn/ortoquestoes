import { useRef, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { Icone } from '../Icone'
import { JanelaCentral } from '../JanelaCentral'
import { codigoDaFalha, funcaoAusente } from './pagamentos'
import {
  SECOES_EXPORTACAO, montarExportacao, type DadosPainel, type Exportacao, type OpcoesExportacao, type SecaoExportacao,
} from './exportacao'

type Estado = 'esperando' | 'buscando' | 'ok' | 'falhou'
/** Cada seção é uma consulta que o painel já usa; uma falha não derruba as outras. */
const CONSULTAS: Array<[SecaoExportacao, string, Record<string, unknown>]> = [
  ['resumo', 'resumo_admin', {}], ['usuarios', 'listar_usuarios_admin', {}], ['sinais', 'sinais_usuarios_admin', {}],
  ['serie', 'serie_diaria_admin', { p_dias: 90 }], ['funil', 'funil_admin', {}], ['retencao', 'retencao_admin', {}],
  ['indicacoes', 'resumo_indicacoes_admin', {}], ['assinaturas', 'listar_assinaturas_admin', {}],
  ['cobrancas', 'cobrancas_admin', {}], ['eventos', 'listar_eventos_pagamento_admin', {}],
]
/** RPCs que devolvem uma linha só (vem como lista de um item). */
const UMA_LINHA: SecaoExportacao[] = ['resumo', 'funil', 'indicacoes']

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url; a.download = nome
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * "Exportar dados do painel": junta as consultas do painel num documento para análise
 * (Markdown, com JSON e CSV das pessoas). Mostra o progresso de cada seção; o que falhar
 * vira um aviso no próprio arquivo.
 */
export function AdminExportar() {
  const [aberta, definirAberta] = useState(false)
  const [opcoes, definirOpcoes] = useState<OpcoesExportacao>({ ocultarEmails: true, pseudonimizar: false })
  const [estados, definirEstados] = useState<Partial<Record<SecaoExportacao, Estado>>>({})
  const [resultado, definirResultado] = useState<Exportacao | null>(null)
  const [ocupado, definirOcupado] = useState(false)
  const [copiado, definirCopiado] = useState(false)
  const dadosRef = useRef<DadosPainel | null>(null)

  async function gerar() {
    definirOcupado(true); definirResultado(null); definirCopiado(false)
    definirEstados(Object.fromEntries(CONSULTAS.map(([s]) => [s, 'buscando'])))
    const dados: DadosPainel = { geradoEm: new Date(), falhas: {} }
    await Promise.all(CONSULTAS.map(async ([secao, rpc, corpo]) => {
      try {
        const resposta = await chamarRpc<unknown[]>(rpc, corpo, { prazoMs: 30_000 })
        const valor = UMA_LINHA.includes(secao) ? (Array.isArray(resposta) ? resposta[0] ?? null : resposta) : resposta
        const chave = secao === 'cobrancas' ? 'cobrancasReais' : secao
        ;(dados as unknown as Record<string, unknown>)[chave] = valor
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
  function mudar(novas: OpcoesExportacao) {
    definirOpcoes(novas)
    if (dadosRef.current) definirResultado(montarExportacao(dadosRef.current, novas))
    definirCopiado(false)
  }
  async function copiar() {
    if (!resultado) return
    try { await navigator.clipboard.writeText(resultado.markdown); definirCopiado(true) } catch { definirCopiado(false) }
  }

  const feitas = Object.values(estados).filter(e => e === 'ok' || e === 'falhou').length
  const falhas = Object.values(estados).filter(e => e === 'falhou').length

  return <>
    <button type="button" className="botao botao--fantasma adm-heroi__exportar" onClick={() => definirAberta(true)}><Icone nome="baixar" tamanho={16} /> Exportar dados do painel</button>
    <JanelaCentral aberta={aberta} aoFechar={() => definirAberta(false)} rotulo="Exportar dados do painel">
      <div className="adm-exportar empilha">
        <div>
          <h2>Exportar dados do painel</h2>
          <p className="adm-nota">Um documento com pessoas, atividade, crescimento, assinaturas, pagamentos, previsões e o resumo do painel, pronto para mandar para uma análise. Markdown organizado em seções com tabelas; também em JSON e as pessoas em CSV.</p>
        </div>
        <p className="adm-alerta" role="note"><strong>O arquivo contém dados pessoais</strong> de quem usa o site. Guarde com cuidado, não publique e apague quando terminar.</p>
        <fieldset className="adm-formato">
          <legend>Privacidade</legend>
          <label className="caixa"><input type="checkbox" checked={opcoes.ocultarEmails || opcoes.pseudonimizar} disabled={opcoes.pseudonimizar} onChange={e => mudar({ ...opcoes, ocultarEmails: e.target.checked })} /><span><strong>Ocultar e-mails</strong> · nenhuma coluna de e-mail sai no arquivo</span></label>
          <label className="caixa"><input type="checkbox" checked={opcoes.pseudonimizar} onChange={e => mudar({ ...opcoes, pseudonimizar: e.target.checked })} /><span><strong>Pseudonimizar nomes</strong> · "Pessoa 001", "Pessoa 002"… na ordem de cadastro (a mesma pessoa tem o mesmo número em todo o arquivo; e-mails ficam ocultos)</span></label>
        </fieldset>

        {Object.keys(estados).length > 0 && <div className="adm-exportar__progresso" role="status" aria-live="polite">
          <div className="adm-exportar__barra" aria-hidden="true"><span style={{ width: `${(feitas / CONSULTAS.length) * 100}%` }} /></div>
          <small>{ocupado ? `Juntando os dados… ${feitas} de ${CONSULTAS.length} seções` : falhas ? `Pronto, com ${falhas} seção(ões) sem dados (avisado no arquivo).` : 'Pronto: todas as seções vieram.'}</small>
          <ul>{CONSULTAS.map(([s]) => <li key={s} className={`adm-exportar__item adm-exportar__item--${estados[s] ?? 'esperando'}`}>
            <span aria-hidden="true">{estados[s] === 'ok' ? '✓' : estados[s] === 'falhou' ? '✕' : '…'}</span>{SECOES_EXPORTACAO[s]}
          </li>)}</ul>
        </div>}

        <div className="linha adm-exportar__acoes">
          <button type="button" className="botao botao--principal" disabled={ocupado} aria-busy={ocupado} onClick={() => void gerar()}>{ocupado ? 'Juntando…' : resultado ? 'Gerar de novo' : 'Gerar documento'}</button>
          {resultado && <>
            <button type="button" className="botao" onClick={() => baixar(`${resultado.nomeBase}.md`, resultado.markdown, 'text/markdown;charset=utf-8')}><Icone nome="baixar" tamanho={15} /> Markdown</button>
            <button type="button" className="botao botao--fantasma" onClick={() => void copiar()}>{copiado ? 'Copiado' : 'Copiar o Markdown'}</button>
            <button type="button" className="botao botao--fantasma" onClick={() => baixar(`${resultado.nomeBase}.json`, resultado.json, 'application/json;charset=utf-8')}>JSON</button>
            <button type="button" className="botao botao--fantasma" onClick={() => baixar(`${resultado.nomeBase}-pessoas.csv`, resultado.csvPessoas, 'text/csv;charset=utf-8')}>CSV das pessoas</button>
          </>}
        </div>
      </div>
    </JanelaCentral>
  </>
}
