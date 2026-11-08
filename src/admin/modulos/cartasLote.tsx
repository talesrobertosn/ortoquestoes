import { useEffect, useMemo, useRef, useState } from 'react'
import { SITE } from '../../config'
import { chamarFuncao } from '../../servicos/supabase'
import { avisarEmailsEnviados, motivoFalhaEmail, ouvirEmailsEnviados } from '../../componentes/admin/formatos'
import { LIMITE_LIGADO, TIPOS, type TipoCarta } from '../../componentes/admin/modelosEmail'
import { rpcInexistente, usarRpc } from '../../componentes/admin/usarRpc'
import { diasDesdeUltimo } from '../dados/antiFlood'
import { usarPainel } from '../dados/painel'
import { montarProntas, type LinhaBanco, type Pronta } from '../dados/prontas'
import { Icone } from '../ui/Icone'
import { inteiro } from '../ui/formato'
import { Carregando, Faixa } from '../ui/kit'
import { confirmar } from '../ui/sobreposicoes'
import { PreviaCarta } from './cartas-comum'

/** Uma carta por segundo (o Resend aceita 2 por segundo). */
const PAUSA_MS = 1_100
const esperar = (ms: number) => new Promise(r => window.setTimeout(r, ms))
/** Ordem das cartas na tela: primeiro quem paga e pode parar, depois quem saiu, depois o resto. */
const ORDEM: TipoCarta[] = ['como_estao', 'acesso_terminou', 'marco', 'reta_final', 'sumiu', 'comecou_parou', 'ativo', 'comecando', 'boas_vindas', 'convite_50', 'convite_20', 'nunca_comecou']
const posicao = (t: TipoCarta) => { const i = ORDEM.indexOf(t); return i < 0 ? 99 : i }

interface Andamento { tipo: TipoCarta | 'todas'; feitos: number; total: number; atual: string }
interface Resultado { titulo: string; ok: number; falhas: string[] }

/**
 * E-mails › Lembretes › Cartas por situação (Tales, 05/11/2026): as mesmas cartas da tela "Prontas para enviar",
 * agrupadas por modelo, para mandar um grupo inteiro (ou todos) com um clique e uma confirmação. Quem recebeu
 * e-mail nos últimos dias escolhidos fica de fora (os avisos do Pix não contam). O servidor confere as travas
 * de novo em cada envio.
 */
export function CartasPorSituacao() {
  const p = usarPainel()
  const q = usarRpc<LinhaBanco[]>(p.conta, 'listar_sugestoes_cartas_admin', {}, { prazoMs: 40_000 })
  const [dias, definirDias] = useState(3)
  const [aberto, definirAberto] = useState<TipoCarta | null>(null)
  const [andamento, definirAndamento] = useState<Andamento | null>(null)
  const [resultado, definirResultado] = useState<Resultado | null>(null)
  const [enviadas, definirEnviadas] = useState<Set<string>>(new Set())
  const parar = useRef(false)
  const recarregar = q.recarregar
  useEffect(() => ouvirEmailsEnviados(() => void recarregar()), [recarregar])

  const admins = useMemo(() => new Set((p.usuarios ?? []).filter(u => u.administrador).map(u => u.id_usuario)), [p.usuarios])
  const todas = useMemo(() => montarProntas(q.dados ?? [], { admins, site: SITE.url, limiteGratisLigado: LIMITE_LIGADO }), [q.dados, admins])
  const { liberadas, seguradas } = useMemo(() => {
    const liberadas: Pronta[] = [], seguradas: Pronta[] = []
    for (const x of todas) {
      if (enviadas.has(x.id)) continue
      const d = diasDesdeUltimo(x.dados.emails?.lista ?? [])
      if (d !== null && d < dias) seguradas.push(x); else liberadas.push(x)
    }
    return { liberadas, seguradas }
  }, [todas, dias, enviadas])
  const grupos = useMemo(() => {
    const m = new Map<TipoCarta, Pronta[]>()
    for (const x of liberadas) m.set(x.carta.tipo, [...(m.get(x.carta.tipo) ?? []), x])
    return [...m.entries()].sort((a, b) => posicao(a[0]) - posicao(b[0]))
  }, [liberadas])

  if (!q.dados) {
    if (q.erro && rpcInexistente(q.erro)) return <section className="a3-painel cl"><div className="cl__cabeca"><h2 className="a3-titulo-2">Cartas por situação</h2></div><div style={{ padding: '0 20px 20px' }}><Faixa tom="aviso">Falta rodar o SQL 202611051200_cartas_prontas.sql no Supabase.</Faixa></div></section>
    if (q.erro) return null
    return <section className="a3-painel cl"><div style={{ padding: 20 }}><Carregando linhas={3} texto="Escrevendo as cartas de cada pessoa…" /></div></section>
  }

  async function enviarLista(lista: Pronta[], titulo: string, tipo: TipoCarta | 'todas') {
    if (!lista.length) return
    const minutos = Math.max(1, Math.ceil((lista.length * (PAUSA_MS + 900)) / 60_000))
    if (!(await confirmar({
      titulo: `Enviar ${lista.length} ${lista.length === 1 ? 'carta' : 'cartas'} (${titulo})?`,
      texto: <><span>Cada pessoa recebe a carta escrita para ela, uma por segundo (cerca de {minutos} min). Dá para parar no meio.</span>
        <ul className="a3-lista-nomes">{lista.slice(0, 12).map(x => <li key={x.id}>{x.nome} · {TIPOS[x.carta.tipo].rotulo}</li>)}{lista.length > 12 && <li>… e mais {lista.length - 12}</li>}</ul></>,
      sim: `Enviar para ${lista.length}`,
    }))) return
    parar.current = false
    let ok = 0
    const falhas: string[] = []
    for (let i = 0; i < lista.length; i++) {
      if (parar.current) break
      const x = lista[i]
      definirAndamento({ tipo, feitos: i, total: lista.length, atual: x.nome })
      try {
        await chamarFuncao('enviar-email', { acao: 'carta', origem: 'lote', id_usuario: x.id, assunto: x.carta.assunto, corpo: x.carta.corpo, modelo: x.carta.modelo, versao: x.carta.versao })
        ok++
      } catch (f) {
        falhas.push(`${x.nome}: ${motivoFalhaEmail(String(f))}`)
        if (/envio_recusado_429/.test(String(f))) await esperar(5_000)
      }
      // Enviada ou tentada, sai da lista na hora (na dúvida, não manda de novo).
      definirEnviadas(s => new Set(s).add(x.id))
      if (i < lista.length - 1) await esperar(PAUSA_MS)
    }
    definirAndamento(null)
    definirResultado({ titulo, ok, falhas })
    avisarEmailsEnviados()
  }

  const ocupado = andamento !== null
  const exemplo = aberto ? grupos.find(g => g[0] === aberto)?.[1][0] : null
  return <section className="a3-painel cl" aria-labelledby="cl-titulo">
    <div className="cl__cabeca">
      <div>
        <h2 id="cl-titulo" className="a3-titulo-2">Cartas por situação</h2>
        <p className="a3-mudo a3-pequeno">As cartas da tela "Prontas para enviar", agrupadas por modelo. Cada pessoa recebe o texto escrito para ela (acerto, melhor área, o momento dela).</p>
      </div>
      <button type="button" className="a3-botao a3-botao--grande" disabled={!liberadas.length || ocupado} onClick={() => void enviarLista(grupos.flatMap(g => g[1]), 'todas as situações', 'todas')}>
        <Icone nome="enviar" tamanho={17} />{andamento?.tipo === 'todas' ? `Enviando… ${andamento.feitos + 1} de ${andamento.total}` : `Enviar todas (${liberadas.length})`}</button>
    </div>
    <div className="cl__trava">
      <label className="a3-filtro"><Icone nome="relogio" tamanho={14} />Não mandar para quem recebeu e-mail nos últimos
        <select value={dias} onChange={e => definirDias(Number(e.target.value))}>{[2, 3, 5, 7, 14].map(d => <option key={d} value={d}>{d} dias</option>)}</select></label>
      <span className="a3-mudo a3-pequeno">{seguradas.length > 0 ? `${inteiro(seguradas.length)} ${seguradas.length === 1 ? 'pessoa segurada' : 'pessoas seguradas'} por isso. ` : ''}Os avisos do Pix e de pagamento não contam.</span>
    </div>
    {andamento && <div className="cl__andamento" role="status">
      <span>Enviando {andamento.feitos + 1} de {andamento.total}: <b>{andamento.atual}</b></span>
      <progress max={andamento.total} value={andamento.feitos} />
      <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => { parar.current = true }}>Parar depois desta</button>
    </div>}
    {resultado && <div style={{ padding: '0 20px 12px' }}><Faixa tom={resultado.falhas.length ? 'aviso' : 'ok'} titulo={`${resultado.titulo}: ${resultado.ok} ${resultado.ok === 1 ? 'enviada' : 'enviadas'}${resultado.falhas.length ? `, ${resultado.falhas.length} não saíram` : ''}`}
      acao={<button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirResultado(null)}>Fechar</button>}>{resultado.falhas.join(' · ') || 'Todas saíram. O histórico de cada pessoa já mostra a carta.'}</Faixa></div>}
    {!grupos.length ? <p className="cl__vazio">Ninguém para receber agora com essa trava. Volte amanhã.</p> :
      <ul className="cl__lista">{grupos.map(([tipo, lista]) => <li key={tipo} className={aberto === tipo ? 'aberto' : ''}>
        <div className="cl__linha">
          <div className="cl__texto">
            <b>{TIPOS[tipo].rotulo}</b>
            <span className="a3-mudo a3-pequeno">{TIPOS[tipo].descricao}</span>
            <span className="a3-pequeno">{lista.slice(0, 4).map(x => x.nome.split(' ')[0]).join(', ')}{lista.length > 4 ? ` e mais ${lista.length - 4}` : ''}</span>
          </div>
          <span className="cl__n num">{inteiro(lista.length)}</span>
          <div className="cl__botoes">
            <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" aria-expanded={aberto === tipo} onClick={() => definirAberto(aberto === tipo ? null : tipo)}><Icone nome="olho" tamanho={14} />{aberto === tipo ? 'Fechar' : 'Ver exemplo'}</button>
            <button type="button" className="a3-botao a3-botao--pequeno" disabled={ocupado} onClick={() => void enviarLista(lista, TIPOS[tipo].rotulo, tipo)}><Icone nome="enviar" tamanho={14} />{andamento?.tipo === tipo ? `${andamento.feitos + 1} de ${andamento.total}…` : `Enviar para ${lista.length}`}</button>
          </div>
        </div>
        {aberto === tipo && exemplo && <div className="cl__exemplo"><p className="a3-mudo a3-pequeno">Exemplo: a carta de {exemplo.nome}. Cada pessoa recebe a sua.</p><PreviaCarta assunto={exemplo.carta.assunto} corpo={exemplo.carta.corpo} descadastro /></div>}
      </li>)}</ul>}
  </section>
}
