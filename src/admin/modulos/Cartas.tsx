import { useEffect, useMemo, useRef, useState } from 'react'
import { SITE } from '../../config'
import { chamarFuncao } from '../../servicos/supabase'
import { contaDeTeste } from '../../componentes/admin/contasTeste'
import { avisarEmailsEnviados, motivoFalhaEmail, ouvirEmailsEnviados } from '../../componentes/admin/formatos'
import {
  acertoCitavel, anterioresDosDados, gerarCarta, nivelExcesso, perfilDoBanco, problemaGrave, resumoHistorico, sementeDe,
  type Carta, type DadosCartaBanco, type TipoCarta,
} from '../../componentes/admin/modelosEmail'
import { rpcInexistente, usarRpc } from '../../componentes/admin/usarRpc'
import { usarPainel } from '../dados/painel'
import type { LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { haQuanto, iniciais, inteiro } from '../ui/formato'
import { Cabeca, Carregando, Estado, Faixa, Selo } from '../ui/kit'
import { confirmar } from '../ui/sobreposicoes'
import { AvisosTexto, PreviaCarta } from './cartas-comum'

type Segmento = 'convite_50' | 'convite_20' | 'nunca_comecou' | 'sumiu'
const SEGMENTOS: Array<{ id: Segmento; rotulo: string; para: string }> = [
  { id: 'convite_50', rotulo: 'Mais de 50 questões', para: 'Não assinam e já fizeram mais de 50 questões. A carta mais pessoal: cita o que a pessoa tem de especial e liga a assinatura ao momento dela.' },
  { id: 'convite_20', rotulo: 'De 21 a 50 questões', para: 'Não assinam e já fizeram mais de 20 questões. Carta curta e organizada: o que a assinatura libera, sem preço e sem pressão.' },
  { id: 'nunca_comecou', rotulo: 'Criou e não começou', para: 'Conta confirmada há pelo menos um dia e nenhuma questão. Parabeniza o passo e sugere um começo pequeno.' },
  { id: 'sumiu', rotulo: 'Sumiu', para: 'Respondia e está de 10 a 90 dias sem responder. Sem cobrança: o progresso está guardado.' },
]
const BLOQUEIO: Record<string, string> = {
  administrador: 'administrador', email_nao_confirmado: 'e-mail não confirmado', nao_quer_cartas: 'não quer e-mails',
  assinante: 'já assina', sem_aceite_novidades: 'não aceitou novidades (Termos 17.5.3)', mesmo_tipo_30_dias: 'recebeu esta carta há menos de 30 dias',
  teste: 'conta de teste', recente: 'recebeu e-mail recente', sem_email: 'sem e-mail', enviada_agora: 'carta enviada agora', tentada_agora: 'envio tentado agora (confira a ficha)',
}
interface LinhaBanco { id_usuario: string; dados: DadosCartaBanco; bloqueio: string | null }
interface Linha { id: string; nome: string; email: string; dados: DadosCartaBanco; bloqueio: string | null; carta: Carta | null }
interface Resultado { nome: string; ok: boolean; motivo?: string }
/** Uma carta por segundo: o Resend aceita 2 por segundo no plano gratuito. */
const PAUSA_MS = 1_100
const esperar = (ms: number) => new Promise(r => window.setTimeout(r, ms))
const diaDeHoje = () => new Date().toISOString().slice(0, 10)

/** Comunicação › Cartas pessoais: uma carta escrita para cada pessoa do grupo, revisada antes de sair. */
export default function Cartas() {
  const p = usarPainel()
  const nav = usarNav()
  const parte = defParte('cartas')
  const [segmento, definirSegmento] = useState<Segmento>('convite_50')
  const args = useMemo(() => ({ p_segmento: segmento }), [segmento])
  const q = usarRpc<LinhaBanco[]>(p.conta, 'listar_cartas_admin', args, { prazoMs: 40_000 })
  const semParte27 = !q.dados && !!q.erro && rpcInexistente(q.erro)
  const [diasRecente, definirDiasRecente] = useState(7)
  const [desmarcados, definirDesmarcados] = useState<Set<string>>(new Set())
  const [sementes, definirSementes] = useState<Record<string, number>>({})
  const [edicoes, definirEdicoes] = useState<Record<string, { assunto: string; corpo: string }>>({})
  const [aberta, definirAberta] = useState<string | null>(null)
  const [progresso, definirProgresso] = useState<{ feitos: number; total: number; atual: string } | null>(null)
  const [resultado, definirResultado] = useState<Resultado[] | null>(null)
  // Quem acabou de receber (ou teve o envio tentado) sai da lista na hora, antes de o grupo recarregar.
  const [tentadas, definirTentadas] = useState<Record<string, 'enviada_agora' | 'tentada_agora'>>({})
  const cancelar = useRef(false)
  const recarregarGrupo = q.recarregar
  useEffect(() => ouvirEmailsEnviados(() => void recarregarGrupo()), [recarregarGrupo])

  const admins = useMemo(() => new Set((p.usuarios ?? []).filter(u => u.administrador).map(u => u.id_usuario)), [p.usuarios])
  const linhas: Linha[] = useMemo(() => (q.dados ?? []).map(l => {
    const d = l.dados
    const r = resumoHistorico(d.emails?.lista ?? [])
    const recente = r.ultimo && Date.now() - new Date(r.ultimo.em).getTime() < diasRecente * 86_400_000
    const bloqueio = tentadas[l.id_usuario] ?? l.bloqueio ?? (!d.email ? 'sem_email' : admins.has(l.id_usuario) ? 'administrador' : contaDeTeste({ nome: d.nome, usuario: d.email }) ? 'teste' : recente ? 'recente' : null)
    let carta: Carta | null = null
    try { carta = gerarCarta(perfilDoBanco(d), { tipo: segmento as TipoCarta, semente: sementes[l.id_usuario] ?? sementeDe(`${l.id_usuario}:${diaDeHoje()}`), anteriores: anterioresDosDados(d), site: SITE.url }) } catch { carta = null }
    return { id: l.id_usuario, nome: d.nome ?? d.email?.split('@')[0] ?? 'Sem nome', email: d.email ?? '', dados: d, bloqueio, carta }
  }), [q.dados, segmento, sementes, diasRecente, admins, tentadas])
  const prontas = linhas.filter(l => !l.bloqueio && l.carta)
  const fora = linhas.filter(l => l.bloqueio || !l.carta)
  const selecionadas = prontas.filter(l => !desmarcados.has(l.id))
  const textoDe = (l: Linha) => edicoes[l.id] ?? { assunto: l.carta?.assunto ?? '', corpo: l.carta?.corpo ?? '' }
  const atual = SEGMENTOS.find(s => s.id === segmento)!
  const abertaL = prontas.find(l => l.id === aberta) ?? prontas[0] ?? null
  const reservaSemSql = useMemo(() => contarSemSql(p.usuarios ?? [], segmento), [p.usuarios, segmento])

  function trocarSegmento(s: Segmento) { definirSegmento(s); definirDesmarcados(new Set()); definirEdicoes({}); definirAberta(null); definirResultado(null) }
  const alternar = (id: string) => definirDesmarcados(a => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n })

  async function enviarTodos() {
    const lista = selecionadas.filter(l => !problemaGrave(`${textoDe(l).assunto}\n${textoDe(l).corpo}`))
    if (!lista.length) return
    const minutos = Math.max(1, Math.ceil((lista.length * (PAUSA_MS + 900)) / 60_000))
    if (!(await confirmar({
      titulo: `Enviar ${lista.length} ${lista.length === 1 ? 'carta' : 'cartas'} (“${atual.rotulo}”)?`,
      texto: <><span>Cada pessoa recebe a carta escrita para ela, uma por segundo (cerca de {minutos} min). Dá para parar no meio.</span>
        <ul className="a3-lista-nomes">{lista.slice(0, 12).map(l => <li key={l.id}>{l.nome}</li>)}{lista.length > 12 && <li>… e mais {lista.length - 12}</li>}</ul></>,
      sim: `Enviar para ${lista.length}`,
    }))) return
    cancelar.current = false
    const resultados: Resultado[] = []
    for (let i = 0; i < lista.length; i++) {
      if (cancelar.current) break
      const l = lista[i], t = textoDe(l)
      definirProgresso({ feitos: i, total: lista.length, atual: l.nome })
      try {
        await chamarFuncao('enviar-email', { acao: 'carta', origem: 'lote', id_usuario: l.id, assunto: t.assunto, corpo: t.corpo, modelo: l.carta!.modelo, versao: l.carta!.versao })
        resultados.push({ nome: l.nome, ok: true }); definirTentadas(x => ({ ...x, [l.id]: 'enviada_agora' }))
      } catch (f) {
        resultados.push({ nome: l.nome, ok: false, motivo: motivoFalhaEmail(String(f)) })
        // Na dúvida (a tela pode ter desistido com o servidor ainda mandando), também sai da lista.
        definirTentadas(x => ({ ...x, [l.id]: 'tentada_agora' }))
        if (/envio_recusado_429/.test(String(f))) await esperar(5_000)
      }
      if (i < lista.length - 1) await esperar(PAUSA_MS)
    }
    definirProgresso(null); definirResultado(resultados); definirDesmarcados(new Set()); definirEdicoes({})
    avisarEmailsEnviados()
  }

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Comunicação" titulo={parte.rotulo} pergunta="Cartas do Tales em lote: cada pessoa recebe um texto escrito para ela, só texto, sem logo, assinado “Um abraço, Tales, do Orto Questões”."
      acoes={<a className="a3-botao a3-botao--contorno" href={nav.link('lembretes')} onClick={e => { e.preventDefault(); nav.ir('lembretes') }}><Icone nome="enviar" tamanho={15} />Campanhas prontas</a>} />
    <div className="a3-abas-grandes a3-abas-grandes--4" role="tablist" aria-label="Grupos">
      {SEGMENTOS.map(s => <button key={s.id} type="button" role="tab" aria-selected={segmento === s.id} className="a3-aba-grande" onClick={() => trocarSegmento(s.id)}>
        <span className="a3-aba-grande__numero">{segmento === s.id && q.dados ? prontas.length : <Icone nome="carta" tamanho={20} />}</span><span>{s.rotulo}</span>
      </button>)}
    </div>
    <p className="a3-mudo">{atual.para}</p>

    {semParte27 ? <Faixa tom="aviso" titulo="Falta colar a parte 27 no Supabase">supabase/colar-no-painel/sql-202610152100-parte27.sql. Sem ela não há histórico de cartas nem as travas contra repetição, então o envio em lote fica desligado. Pela lista de pessoas, {reservaSemSql === null ? '…' : `${reservaSemSql} ${reservaSemSql === 1 ? 'entraria' : 'entrariam'}`} neste grupo; para mandar a uma pessoa agora, abra a ficha dela.</Faixa>
      : q.erro && !q.dados ? <Estado tipo="erro" titulo="O grupo não carregou" texto="Tente atualizar em instantes." acao={<button type="button" className="a3-botao" onClick={() => void q.recarregar()}>Tentar de novo</button>} />
        : !q.dados ? <Carregando linhas={6} texto="Montando o grupo e escrevendo as cartas…" /> : <>
          {resultado && <Faixa tom={resultado.some(r => !r.ok) ? 'aviso' : 'ok'} titulo={`${resultado.filter(r => r.ok).length} ${resultado.filter(r => r.ok).length === 1 ? 'carta enviada' : 'cartas enviadas'}${resultado.some(r => !r.ok) ? `, ${resultado.filter(r => !r.ok).length} não saíram` : ''}`}
            acao={<button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirResultado(null)}>Fechar</button>}>
            {resultado.filter(r => !r.ok).map(r => `${r.nome}: ${r.motivo}`).join(' · ') || 'Todas saíram. O histórico de cada pessoa já mostra a carta.'}
          </Faixa>}
          <div className="a3-caixa-saida">
            <section className="a3-painel a3-caixa-saida__lista" aria-label="Quem recebe">
              <div className="a3-caixa-saida__barra">
                <label className="a3-filtro">Tirar quem recebeu e-mail nos últimos<select value={diasRecente} onChange={e => definirDiasRecente(Number(e.target.value))}>{[0, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d === 0 ? 'não tirar' : `${d} dias`}</option>)}</select></label>
                <span className="a3-acoes-linha">
                  <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirDesmarcados(new Set())}>Marcar todas</button>
                  <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirDesmarcados(new Set(prontas.map(l => l.id)))}>Desmarcar</button>
                </span>
              </div>
              {!prontas.length ? <div style={{ padding: 20 }}><Estado icone="certo" titulo="Ninguém para receber agora neste grupo" /></div> :
                <ul className="a3-saida">{prontas.map(l => {
                  const d = l.dados, r = resumoHistorico(d.emails?.lista ?? []), pct = acertoCitavel(perfilDoBanco(d)), marcada = !desmarcados.has(l.id)
                  return <li key={l.id} className={(abertaL?.id === l.id ? 'aberta ' : '') + (marcada ? '' : 'desmarcada')}>
                    <input type="checkbox" checked={marcada} onChange={() => alternar(l.id)} aria-label={`Enviar para ${l.nome}`} />
                    <button type="button" className="a3-saida__abrir" aria-current={abertaL?.id === l.id ? 'true' : undefined} onClick={() => definirAberta(l.id)}>
                      <span className="a3-avatar">{iniciais(l.nome)}</span>
                      <span className="a3-saida__texto">
                        <span className="a3-nome">{l.nome}{edicoes[l.id] && <Selo contorno>editada</Selo>}</span>
                        <span className="a3-sub">{textoDe(l).assunto || '(sem assunto)'}</span>
                        <span className="a3-sub">{Number(d.respondidas ?? 0) > 0 ? `${inteiro(Number(d.respondidas))} questões` : 'nenhuma questão'}{pct !== null ? ` · ${pct}%` : ''}{d.ultima_atividade ? ` · ${haQuanto(d.ultima_atividade)}` : ''} · {r.n30} e-mails em 30 dias</span>
                      </span>
                      {nivelExcesso(r.n7) !== 'ok' && <Selo tom="aviso">muitos e-mails</Selo>}
                    </button>
                  </li>
                })}</ul>}
              {fora.length > 0 && <details className="a3-saida__fora"><summary>Fora deste envio ({fora.length})</summary>
                <ul>{fora.map(l => <li key={l.id}><span className="a3-nome">{l.nome}</span><Selo contorno>{l.bloqueio ? BLOQUEIO[l.bloqueio] ?? l.bloqueio : 'carta não escrita'}</Selo></li>)}</ul></details>}
            </section>

            <section className="a3-painel a3-caixa-saida__carta" aria-label="Carta aberta">
              {!abertaL?.carta ? <div style={{ padding: 24 }}><Estado icone="carta" titulo="Escolha uma pessoa para ver a carta" /></div> : <div className="a3-pilha" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'start' }}>
                  <div style={{ minWidth: 0 }}><span className="a3-rotulo">Carta para</span><h3 className="a3-titulo-2">{abertaL.nome}</h3>
                    <p className="a3-mudo a3-pequeno">{abertaL.carta.versao.split('#')[1]} de {abertaL.carta.versoes.total}{abertaL.carta.personalizacao.length ? ` · personalizada com: ${abertaL.carta.personalizacao.join(', ')}` : ''}</p></div>
                  <span className="a3-acoes-linha">
                    <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => { definirEdicoes(e => { const n = { ...e }; delete n[abertaL.id]; return n }); definirSementes(s => ({ ...s, [abertaL.id]: Math.floor(Math.random() * 2 ** 31) })) }}><Icone nome="raio" tamanho={14} />Outra versão</button>
                    <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => nav.abrirPessoa(abertaL.id, 'carta')}><Icone nome="usuario" tamanho={14} />Ficha</button>
                  </span>
                </div>
                <label className="a3-campo"><span>Assunto</span><input className="a3-entrada" maxLength={120} value={textoDe(abertaL).assunto} onChange={e => definirEdicoes(x => ({ ...x, [abertaL.id]: { ...textoDe(abertaL), assunto: e.target.value } }))} /></label>
                <label className="a3-campo"><span>Texto</span><textarea className="a3-entrada" rows={10} value={textoDe(abertaL).corpo} onChange={e => definirEdicoes(x => ({ ...x, [abertaL.id]: { ...textoDe(abertaL), corpo: e.target.value } }))} /></label>
                <AvisosTexto {...textoDe(abertaL)} />
                <PreviaCarta {...textoDe(abertaL)} descadastro />
              </div>}
            </section>
          </div>

          <div className="a3-editor__salvar" role="region" aria-label="Enviar">
            {progresso ? <span className="a3-envio-progresso" role="status">
              <span>Enviando {progresso.feitos + 1} de {progresso.total}: <b>{progresso.atual}</b></span>
              <progress max={progresso.total} value={progresso.feitos} />
            </span> : <span className="a3-editor__estado"><b className="num">{selecionadas.length}</b>&nbsp;de {prontas.length} marcadas · o servidor confere cada trava de novo antes de enviar</span>}
            <span className="a3-acoes-linha">
              {progresso && <button type="button" className="a3-botao a3-botao--contorno" onClick={() => { cancelar.current = true }}>Parar depois desta</button>}
              <button type="button" className="a3-botao" disabled={!selecionadas.length || !!progresso} onClick={() => void enviarTodos()}><Icone nome="enviar" tamanho={15} />{progresso ? 'Enviando…' : `Revisar e enviar (${selecionadas.length})`}</button>
            </span>
          </div>
        </>}
  </div>
}

/** Sem a parte 27: quantas pessoas da lista entrariam no grupo (só para informar). */
function contarSemSql(usuarios: LinhaUsuario[], s: Segmento): number | null {
  if (!usuarios.length) return null
  const dias = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : Infinity)
  return usuarios.filter(u => !u.administrador && !contaDeTeste({ nome: u.nome, usuario: u.email }) && (
    s === 'convite_50' ? !u.plano_vigente && u.respondidas > 50
      : s === 'convite_20' ? !u.plano_vigente && u.respondidas > 20 && u.respondidas <= 50
        : s === 'nunca_comecou' ? u.respondidas === 0 && dias(u.criado_em) >= 1
          : u.respondidas > 0 && dias(u.ultima_atividade) >= 10 && dias(u.ultima_atividade) <= 90)).length
}
