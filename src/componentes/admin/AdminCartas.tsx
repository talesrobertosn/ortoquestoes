import { useEffect, useMemo, useRef, useState } from 'react'
import { usarConta } from '../../conta/ContextoConta'
import { chamarFuncao } from '../../servicos/supabase'
import { SITE } from '../../config'
import { Icone } from '../Icone'
import { confirmar } from '../Confirmar'
import { contaDeTeste } from './contasTeste'
import { avisarEmailsEnviados, haQuanto, motivoFalhaEmail, ouvirEmailsEnviados } from './formatos'
import { usarRpc, rpcInexistente } from './usarRpc'
import { HistoricoMini } from './HistoricoEmails'
import { AvisosTexto, PreviaCarta } from './CartaPessoal'
import {
  acertoCitavel, anterioresDosDados, gerarCarta, nivelExcesso, perfilDoBanco, problemaGrave, resumoHistorico, sementeDe,
  type Carta, type DadosCartaBanco, type TipoCarta,
} from './modelosEmail'
import type { LinhaUsuario } from './AdminUsuarios'
import '../../estilos/paginas/AdminCartas.css'

type Segmento = 'convite_50' | 'convite_20' | 'nunca_comecou' | 'sumiu'
const SEGMENTOS: Array<{ id: Segmento; rotulo: string; para: string }> = [
  { id: 'convite_50', rotulo: 'Mais de 50 questões', para: 'Não assinam e já fizeram mais de 50 questões. A carta é a mais pessoal: cita o que a pessoa tem de especial e liga a assinatura ao momento dela.' },
  { id: 'convite_20', rotulo: 'De 21 a 50 questões', para: 'Não assinam e já fizeram mais de 20 questões. Carta curta e organizada: o que a assinatura libera, sem preço e sem pressão.' },
  { id: 'nunca_comecou', rotulo: 'Criou e não começou', para: 'Conta confirmada há pelo menos um dia e nenhuma questão. Parabeniza o passo e sugere um começo pequeno.' },
  { id: 'sumiu', rotulo: 'Sumiu', para: 'Respondia e está de 10 a 90 dias sem responder. Sem cobrança: o progresso está guardado.' },
]
const BLOQUEIO: Record<string, string> = {
  administrador: 'administrador', email_nao_confirmado: 'e-mail não confirmado', nao_quer_cartas: 'não quer e-mails',
  assinante: 'já assina', sem_aceite_novidades: 'não aceitou novidades (Termos 17.5.3)', mesmo_tipo_30_dias: 'recebeu esta carta há menos de 30 dias',
  teste: 'conta de teste', recente: 'recebeu e-mail recente', sem_email: 'sem e-mail',
  enviada_agora: 'carta enviada agora', tentada_agora: 'envio tentado agora (confira a ficha)',
}
interface LinhaBanco { id_usuario: string; dados: DadosCartaBanco; bloqueio: string | null }
interface Linha { id: string; nome: string; email: string; dados: DadosCartaBanco; bloqueio: string | null; carta: Carta | null; erroCarta?: string }
interface Resultado { nome: string; ok: boolean; motivo?: string }

/** Intervalo entre envios: o Resend aceita 2 por segundo no plano gratuito; 1 por segundo dá folga. */
const PAUSA_MS = 1_100
const esperar = (ms: number) => new Promise(r => window.setTimeout(r, ms))
const diaDeHoje = () => new Date().toISOString().slice(0, 10)

/**
 * E-mails › Enviar e-mails › Cartas pessoais: cartas pessoais em lote, por grupo. Cada pessoa recebe uma carta
 * escrita para ela (o mesmo motor da ficha). Antes de enviar dá para ver o histórico
 * de cada uma, abrir a prévia, sortear outra versão, editar, desmarcar e tirar quem
 * recebeu e-mail recente. O servidor confere de novo cada trava.
 */
export function AdminCartas({ usuarios }: { usuarios: LinhaUsuario[] | null }) {
  const conta = usarConta().sessao?.user.id
  const [segmento, definirSegmento] = useState<Segmento>('convite_50')
  const args = useMemo(() => ({ p_segmento: segmento }), [segmento])
  const q = usarRpc<LinhaBanco[]>(conta, 'listar_cartas_admin', args, { prazoMs: 40_000 })
  const semParte27 = !q.dados && !!q.erro && rpcInexistente(q.erro)
  const [diasRecente, definirDiasRecente] = useState(7)
  const [desmarcados, definirDesmarcados] = useState<Set<string>>(new Set())
  const [sementes, definirSementes] = useState<Record<string, number>>({})
  const [edicoes, definirEdicoes] = useState<Record<string, { assunto: string; corpo: string }>>({})
  const [aberta, definirAberta] = useState<string | null>(null)
  const [mostrarFora, definirMostrarFora] = useState(false)
  const [progresso, definirProgresso] = useState<{ feitos: number; total: number; atual: string } | null>(null)
  const [resultado, definirResultado] = useState<Resultado[] | null>(null)
  // Quem acabou de receber (ou teve o envio tentado) nesta tela sai da lista na hora, antes de o
  // grupo recarregar: o nome não pode continuar marcado, pronto para receber de novo.
  const [tentadas, definirTentadas] = useState<Record<string, 'enviada_agora' | 'tentada_agora'>>({})
  const cancelar = useRef(false)

  // Outra parte da página mandou e-mails (lembretes, relatório): a cadência mudou, recarrega o grupo.
  const recarregarGrupo = q.recarregar
  useEffect(() => ouvirEmailsEnviados(() => void recarregarGrupo()), [recarregarGrupo])

  const admins = useMemo(() => new Set((usuarios ?? []).filter(u => u.administrador).map(u => u.id_usuario)), [usuarios])
  const linhas: Linha[] = useMemo(() => (q.dados ?? []).map((l) => {
    const d = l.dados
    const nome = d.nome ?? d.email?.split('@')[0] ?? 'Sem nome'
    const r = resumoHistorico(d.emails?.lista ?? [])
    const recente = r.ultimo && Date.now() - new Date(r.ultimo.em).getTime() < diasRecente * 86_400_000
    const bloqueio = tentadas[l.id_usuario] ?? l.bloqueio ?? (!d.email ? 'sem_email' : admins.has(l.id_usuario) ? 'administrador' : contaDeTeste({ nome: d.nome, usuario: d.email }) ? 'teste' : recente ? 'recente' : null)
    let carta: Carta | null = null, erroCarta: string | undefined
    try {
      carta = gerarCarta(perfilDoBanco(d), { tipo: segmento as TipoCarta, semente: sementes[l.id_usuario] ?? sementeDe(`${l.id_usuario}:${diaDeHoje()}`), anteriores: anterioresDosDados(d), site: SITE.url })
    } catch (f) { erroCarta = String(f) }
    return { id: l.id_usuario, nome, email: d.email ?? '', dados: d, bloqueio, carta, erroCarta }
  }), [q.dados, segmento, sementes, diasRecente, admins, tentadas])

  const prontas = linhas.filter(l => !l.bloqueio && l.carta)
  const fora = linhas.filter(l => l.bloqueio || !l.carta)
  const selecionadas = prontas.filter(l => !desmarcados.has(l.id))
  const textoDe = (l: Linha) => edicoes[l.id] ?? { assunto: l.carta?.assunto ?? '', corpo: l.carta?.corpo ?? '' }
  const segmentoAtual = SEGMENTOS.find(s => s.id === segmento)!
  const reservaSemSql = useMemo(() => contarSemSql(usuarios ?? [], segmento), [usuarios, segmento])

  function trocarSegmento(s: Segmento) {
    definirSegmento(s); definirDesmarcados(new Set()); definirEdicoes({}); definirAberta(null); definirResultado(null)
  }
  function alternar(id: string) {
    definirDesmarcados(atual => { const novo = new Set(atual); if (novo.has(id)) novo.delete(id); else novo.add(id); return novo })
  }

  async function enviarTodos() {
    const lista = selecionadas.filter(l => !problemaGrave(`${textoDe(l).assunto}\n${textoDe(l).corpo}`))
    if (!lista.length) return
    const minutos = Math.max(1, Math.ceil((lista.length * (PAUSA_MS + 900)) / 60_000))
    const nomes = lista.slice(0, 12).map(l => `• ${l.nome}`).join('\n') + (lista.length > 12 ? `\n… e mais ${lista.length - 12}` : '')
    if (!(await confirmar({
      titulo: `Enviar ${lista.length} ${lista.length === 1 ? 'carta' : 'cartas'} (“${segmentoAtual.rotulo}”)?`,
      texto: `Cada pessoa recebe a carta escrita para ela, uma por segundo (cerca de ${minutos} min). Dá para cancelar no meio.\n\n${nomes}`,
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
        resultados.push({ nome: l.nome, ok: true })
        definirTentadas(x => ({ ...x, [l.id]: 'enviada_agora' }))
      } catch (f) {
        resultados.push({ nome: l.nome, ok: false, motivo: motivoFalhaEmail(String(f)) })
        // Na dúvida (a tela pode ter desistido com o servidor ainda mandando), também sai da lista.
        definirTentadas(x => ({ ...x, [l.id]: 'tentada_agora' }))
        // Limite do Resend: espera mais antes da próxima.
        if (/envio_recusado_429/.test(String(f))) await esperar(5_000)
      }
      if (i < lista.length - 1) await esperar(PAUSA_MS)
    }
    definirProgresso(null); definirResultado(resultados); definirDesmarcados(new Set()); definirEdicoes({})
    // O aviso recarrega este grupo e as outras partes da página (lembretes, últimos envios).
    avisarEmailsEnviados()
  }

  const aberta_ = linhas.find(l => l.id === aberta) ?? null

  return <section className="empilha adm-secao cl" aria-labelledby="cl-titulo">
    <div>
      <h2 id="cl-titulo">Cartas pessoais</h2>
      <p>Cartas do Tales em lote: cada pessoa recebe um texto escrito para ela, só texto, sem logo, com “Um abraço, Tales, do Orto Questões”. Confira o histórico, abra a prévia de quem quiser, desmarque e envie.</p>
    </div>

    <div className="adm-filtros cl-segmentos" role="tablist" aria-label="Grupos">
      {SEGMENTOS.map(s => <button key={s.id} type="button" role="tab" aria-selected={segmento === s.id} className="adm-chip" aria-pressed={segmento === s.id} onClick={() => trocarSegmento(s.id)}>
        {s.rotulo}{segmento === s.id && q.dados ? <span>{prontas.length}</span> : null}
      </button>)}
    </div>
    <p className="adm-nota">{segmentoAtual.para}</p>

    {semParte27 ? <div className="adm-alerta" role="alert">
      <p><strong>Falta colar a parte 27 no Supabase</strong> (supabase/colar-no-painel/sql-202610152100-parte27.sql). Sem ela não há histórico de cartas nem as travas contra repetição, então o envio em lote fica desligado.</p>
      <p>Pela lista de usuários, {reservaSemSql === null ? 'carregando…' : <><strong>{reservaSemSql}</strong> {reservaSemSql === 1 ? 'pessoa entraria' : 'pessoas entrariam'} neste grupo.</>} Para mandar a uma pessoa agora, abra a ficha dela em Usuários.</p>
    </div>
      : q.erro && !q.dados ? <p className="adm-alerta" role="alert">Não foi possível carregar o grupo. Tente atualizar.</p>
        : !q.dados ? <p role="status">Montando o grupo e escrevendo as cartas…</p>
          : <>
            <div className="cl-barra">
              <label className="campo cl-recente">Tirar quem recebeu e-mail nos últimos
                <select className="entrada" value={diasRecente} onChange={e => definirDiasRecente(Number(e.target.value))}>
                  {[0, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d === 0 ? 'não tirar ninguém' : `${d} dias`}</option>)}
                </select>
              </label>
              <p className="cl-resumo"><strong>{selecionadas.length}</strong> de {prontas.length} {prontas.length === 1 ? 'pessoa marcada' : 'pessoas marcadas'}{fora.length ? ` · ${fora.length} fora` : ''}</p>
              <div className="cl-barra__acoes">
                <button type="button" className="adm-link" onClick={() => definirDesmarcados(new Set())}>Marcar todas</button>
                <button type="button" className="adm-link" onClick={() => definirDesmarcados(new Set(prontas.map(l => l.id)))}>Desmarcar todas</button>
              </div>
            </div>

            {progresso && <div className="cl-progresso" role="status">
              <p>Enviando {progresso.feitos + 1} de {progresso.total}: {progresso.atual}</p>
              <progress max={progresso.total} value={progresso.feitos} />
              <button type="button" className="botao botao--fantasma" onClick={() => { cancelar.current = true }}>Parar depois desta</button>
            </div>}
            {resultado && <Relatorio resultados={resultado} aoFechar={() => definirResultado(null)} />}

            {!prontas.length ? <p className="adm-vazio">Ninguém para receber agora neste grupo.</p>
              : <div className="adm-tabela-rolagem" role="region" aria-label="Quem recebe" tabIndex={0}><table className="tabela cl-tabela">
                <thead><tr><th scope="col"><span className="so-leitor">Marcar</span></th><th scope="col">Pessoa</th><th scope="col">Estudo</th><th scope="col">E-mails que recebeu</th><th scope="col">Carta</th></tr></thead>
                <tbody>{prontas.map(l => <LinhaPessoa key={l.id} l={l} marcada={!desmarcados.has(l.id)} texto={textoDe(l)} editada={!!edicoes[l.id]} aberta={aberta === l.id}
                  aoMarcar={() => alternar(l.id)} aoAbrir={() => definirAberta(aberta === l.id ? null : l.id)} />)}</tbody>
              </table></div>}

            {aberta_ && aberta_.carta && <div className="cl-previa">
              <div className="cl-previa__cabeca">
                <h3>Carta para {aberta_.nome}</h3>
                <p className="adm-nota">{aberta_.carta.versao.split('#')[1]} de {aberta_.carta.versoes.total}{aberta_.carta.personalizacao.length ? ` · personalizada com: ${aberta_.carta.personalizacao.join(', ')}` : ''}{edicoes[aberta_.id] ? ' · editada' : ''}</p>
                <div className="ce__acoes">
                  <button type="button" className="botao" onClick={() => { definirEdicoes(e => { const n = { ...e }; delete n[aberta_.id]; return n }); definirSementes(s => ({ ...s, [aberta_.id]: Math.floor(Math.random() * 2 ** 31) })) }}><Icone nome="raio" tamanho={16} /> Sortear outra versão</button>
                  <button type="button" className="botao botao--fantasma" onClick={() => definirAberta(null)}>Fechar</button>
                </div>
              </div>
              <div className="cl-previa__grade">
                <div className="ce__carta">
                  <label className="campo">Assunto<input className="entrada" maxLength={120} value={textoDe(aberta_).assunto} onChange={e => definirEdicoes(x => ({ ...x, [aberta_.id]: { ...textoDe(aberta_), assunto: e.target.value } }))} /></label>
                  <label className="campo">Texto<textarea className="entrada ce__texto" rows={11} value={textoDe(aberta_).corpo} onChange={e => definirEdicoes(x => ({ ...x, [aberta_.id]: { ...textoDe(aberta_), corpo: e.target.value } }))} /></label>
                  <AvisosTexto {...textoDe(aberta_)} />
                </div>
                <PreviaCarta {...textoDe(aberta_)} descadastro />
              </div>
            </div>}

            <div className="cl-enviar">
              <button type="button" className="botao botao--principal" disabled={!selecionadas.length || !!progresso} onClick={() => void enviarTodos()}>
                <Icone nome="correio" tamanho={16} /> {progresso ? 'Enviando…' : `Enviar para todos (${selecionadas.length})`}
              </button>
              <p className="adm-nota">Uma carta por segundo. Antes de cada envio o servidor confere de novo: e-mail confirmado, quem não quer e-mails, aceite de novidades nos convites, mesma carta em 30 dias e qualquer e-mail nas últimas 48 horas.</p>
            </div>

            {fora.length > 0 && <details className="cl-fora" open={mostrarFora} onToggle={e => definirMostrarFora((e.target as HTMLDetailsElement).open)}>
              <summary>Fora deste envio ({fora.length})</summary>
              <ul className="adm-mini">{fora.map(l => <li key={l.id}><span className="adm-mini__nome">{l.nome}<small>{l.email}</small></span><span className="adm-selo adm-selo--neutro">{l.bloqueio ? BLOQUEIO[l.bloqueio] ?? l.bloqueio : 'carta não escrita'}</span></li>)}</ul>
            </details>}
          </>}
  </section>
}

function LinhaPessoa({ l, marcada, texto, editada, aberta, aoMarcar, aoAbrir }: { l: Linha; marcada: boolean; texto: { assunto: string; corpo: string }; editada: boolean; aberta: boolean; aoMarcar: () => void; aoAbrir: () => void }) {
  const d = l.dados
  const pct = acertoCitavel(perfilDoBanco(d))
  const lista = d.emails?.lista ?? []
  const r = resumoHistorico(lista)
  return <tr className={(marcada ? '' : 'cl-tabela__fora ') + (nivelExcesso(r.n7) !== 'ok' ? 'cl-tabela__excesso' : '')}>
    <td><input type="checkbox" checked={marcada} onChange={aoMarcar} aria-label={`Enviar para ${l.nome}`} /></td>
    <th scope="row">{l.nome}<small>{l.email}</small></th>
    <td>{Number(d.respondidas ?? 0) > 0 ? `${Number(d.respondidas).toLocaleString('pt-BR')} questões` : 'nenhuma questão'}
      <small>{[pct !== null ? `${pct}% de acerto` : null, d.ultima_atividade ? `última ${haQuanto(d.ultima_atividade)}` : null].filter(Boolean).join(' · ')}</small></td>
    <td><HistoricoMini lista={lista} /></td>
    <td className="cl-tabela__carta"><button type="button" className="adm-link" aria-expanded={aberta} onClick={aoAbrir}>{texto.assunto || '(sem assunto)'}</button><small>{aberta ? 'aberta abaixo' : 'ver prévia, sortear ou editar'}{editada ? ' · editada' : ''}</small></td>
  </tr>
}

function Relatorio({ resultados, aoFechar }: { resultados: Resultado[]; aoFechar: () => void }) {
  const ok = resultados.filter(r => r.ok).length, falhas = resultados.filter(r => !r.ok)
  return <div className={'cl-relatorio' + (falhas.length ? ' cl-relatorio--falhas' : '')} role="status">
    <p><strong>{ok} {ok === 1 ? 'carta enviada' : 'cartas enviadas'}</strong>{falhas.length ? `, ${falhas.length} não ${falhas.length === 1 ? 'saiu' : 'saíram'}` : ''}.</p>
    {falhas.length > 0 && <ul>{falhas.map((f, i) => <li key={i}><strong>{f.nome}</strong>: {f.motivo}</li>)}</ul>}
    <button type="button" className="adm-link" onClick={aoFechar}>Fechar relatório</button>
  </div>
}

/** Sem a parte 27: quantas pessoas da lista de usuários entrariam no grupo (só para informar). */
function contarSemSql(usuarios: LinhaUsuario[], s: Segmento): number | null {
  if (!usuarios.length) return null
  const dias = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : Infinity)
  return usuarios.filter(u => !u.administrador && !contaDeTeste({ nome: u.nome, usuario: u.email }) && (
    s === 'convite_50' ? !u.plano_vigente && u.respondidas > 50
      : s === 'convite_20' ? !u.plano_vigente && u.respondidas > 20 && u.respondidas <= 50
        : s === 'nunca_comecou' ? u.respondidas === 0 && dias(u.criado_em) >= 1
          : u.respondidas > 0 && dias(u.ultima_atividade) >= 10 && dias(u.ultima_atividade) <= 90)).length
}
