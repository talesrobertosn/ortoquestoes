import { useMemo, useState } from 'react'
import { cobrancas as cobrancasDe } from '../../componentes/admin/receita'
import { PLANO_CORTESIA } from '../../componentes/admin/rotulos'
import { chamarRpc } from '../../servicos/supabase'
import { usarPainel } from '../dados/painel'
import { nomeDe, type LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { inteiro, normalizar, reais } from '../ui/formato'
import { Barras } from '../ui/graficos'
import { Estado, Faixa } from '../ui/kit'
import { CANAIS, canalDe } from '../dados/canais'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'

/**
 * Fase 2 do prompt mestre (Tales, 05/11/2026): retenção por coorte e tipo de conta,
 * canais de aquisição que trazem quem paga, contas fora do público-alvo e possíveis duplicadas. Tudo sai do
 * que o painel já carrega; as marcações usam o SQL 202611050100.
 */

const DIA = 86_400_000

/* ───────────── Retenção por coorte e tipo de conta ───────────── */

type TipoConta = 'gratuito' | 'pagante' | 'cortesia' | 'expirado'
const NOME_TIPO: Record<TipoConta, string> = { gratuito: 'Gratuitos', pagante: 'Pagantes', cortesia: 'Cortesia', expirado: 'Assinatura expirada' }
const MARCOS = [7, 14, 30, 60, 90]

/**
 * Retenção depois de N dias: das contas com pelo menos N dias de vida (o denominador observável), quantas
 * tiveram atividade no dia N ou depois. Marcos ainda não observáveis para ninguém ficam vazios.
 * Para assinantes, conta a partir da primeira compra: quem continua estudando depois de pagar.
 */
export function RetencaoPorTipo() {
  const p = usarPainel()
  const [base, definirBase] = useState<'cadastro' | 'compra'>('cadastro')
  const d = useMemo(() => {
    const u = p.usuariosReais
    if (!u || !p.reais) return null
    const todas = cobrancasDe(p.reais, p.cobrancas)
    const primeira = new Map<string, number>()
    for (const c of todas) if (!primeira.has(c.id_usuario)) primeira.set(c.id_usuario, c.em.getTime())
    const tipo = (x: LinhaUsuario): TipoConta => x.plano_vigente === PLANO_CORTESIA ? 'cortesia' : x.plano_vigente ? 'pagante' : primeira.has(x.id_usuario) ? 'expirado' : 'gratuito'
    const agora = Date.now()
    const linhas = (['gratuito', 'pagante', 'cortesia', 'expirado'] as TipoConta[]).map(t => {
      const grupo = u.filter(x => tipo(x) === t).map(x => ({ inicio: base === 'compra' ? primeira.get(x.id_usuario) ?? null : new Date(x.criado_em).getTime(), ultima: x.ultima_atividade ? new Date(x.ultima_atividade).getTime() : null }))
        .filter(x => x.inicio !== null) as Array<{ inicio: number; ultima: number | null }>
      return { t, total: grupo.length, marcos: MARCOS.map(n => { const obs = grupo.filter(x => agora - x.inicio >= n * DIA); const voltou = obs.filter(x => x.ultima !== null && x.ultima - x.inicio >= n * DIA); return { n, obs: obs.length, voltou: voltou.length } }) }
    }).filter(l => l.total > 0)
    return linhas
  }, [p.usuariosReais, p.reais, p.cobrancas, base])
  if (!d) return null
  return <article className="cr-cartao">
    <h3>Quem continua depois de 7, 14, 30, 60 e 90 dias <small>teve atividade no dia N ou depois · denominador: contas com pelo menos N dias</small></h3>
    <div className="mt-chips" role="group" aria-label="Contar a partir de"><button type="button" aria-pressed={base === 'cadastro'} onClick={() => definirBase('cadastro')}>Desde o cadastro</button><button type="button" aria-pressed={base === 'compra'} onClick={() => definirBase('compra')}>Desde a primeira compra</button></div>
    <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta mt-tabela qd-coortes">
      <thead><tr><th scope="col">Tipo de conta</th>{MARCOS.map(n => <th key={n} scope="col" className="num">{n} dias</th>)}</tr></thead>
      <tbody>{d.map(l => <tr key={l.t}><th scope="row">{NOME_TIPO[l.t]}<small>{inteiro(l.total)} contas</small></th>
        {l.marcos.map(m => { const pct = m.obs ? m.voltou / m.obs : null; return <td key={m.n} className="num" style={pct !== null ? { background: `color-mix(in srgb, var(--a3-verde) ${Math.round(6 + pct * 60)}%, var(--a3-papel))`, color: pct > 0.5 ? 'var(--cor-sobre, #fff)' : undefined } : undefined}>
          {pct === null ? <span className="a3-mudo">ainda não</span> : <><b>{Math.round(pct * 100)}%</b><span className="a3-sub" style={{ color: 'inherit', opacity: .8 }}>{m.voltou} de {m.obs}</span></>}</td> })}
      </tr>)}</tbody>
    </table></div>
    <p className="a3-mudo a3-pequeno">"Ainda não": ninguém deste grupo tem tantos dias de conta (ou de assinatura) para medir. A atividade usa o último sinal registrado de cada pessoa.</p>
  </article>
}

/* ───────────── Canais de aquisição ───────────── */

/** Quais fontes trazem só cadastros e quais trazem quem paga. A origem é a primeira registrada de cada conta. */
export function Canais() {
  const p = usarPainel()
  const d = useMemo(() => {
    const u = p.usuariosReais
    if (!u || !p.reais) return null
    const todas = cobrancasDe(p.reais, p.cobrancas)
    const pagou = new Set(todas.map(c => c.id_usuario))
    const receita = new Map<string, number>(); for (const c of todas) receita.set(c.id_usuario, (receita.get(c.id_usuario) ?? 0) + c.valor)
    return CANAIS.map(c => { const g = u.filter(x => canalDe(x.origem) === c); const pagantes = g.filter(x => pagou.has(x.id_usuario)); return { c, contas: g.length, pagantes: pagantes.length, receita: pagantes.reduce((s, x) => s + (receita.get(x.id_usuario) ?? 0), 0) } }).filter(x => x.contas > 0)
  }, [p.usuariosReais, p.reais, p.cobrancas])
  if (!d) return null
  const total = d.reduce((s, x) => s + x.contas, 0)
  return <div className="cr-grade-2">
    <article className="cr-cartao"><h3>Cadastros por canal <small>Google, Instagram, WhatsApp, Indicação, Acesso direto e outras (UTM quando houver)</small></h3>
      <Barras total={total} itens={d.map(x => ({ nome: x.c, valor: x.contas }))} /></article>
    <article className="cr-cartao"><h3>Quem paga, por canal <small>conversão do canal e receita trazida até hoje</small></h3>
      <Barras cor="ouro" itens={[...d].sort((a, b) => b.pagantes - a.pagantes).map(x => ({ nome: x.c, valor: x.pagantes, detalhe: `${x.contas ? Math.round((x.pagantes / x.contas) * 100) : 0}% dos cadastros · ${reais(x.receita)}` }))} /></article>
  </div>
}

/* ───────────── Fora do público-alvo ───────────── */

/** Sinais de que a conta não é de residente nem de ortopedista (só sugestão; quem decide é o administrador). */
const SUSPEITOS = [/\buece\b/, /glauderr/, /samara menezes/]
const textoDa = (u: LinhaUsuario) => normalizar([u.nome, u.email, u.servico, u.cidade, u.situacao].filter(Boolean).join(' '))

export function ForaDoPublico() {
  const p = usarPainel()
  const nav = usarNav()
  const [marcadas, definirMarcadas] = useState<Set<string>>(new Set())
  const [servico, definirServico] = useState('')
  const [motivo, definirMotivo] = useState('')
  const [ocupado, definirOcupado] = useState(false)
  const todas = useMemo(() => (p.usuarios ?? []).filter(u => !u.administrador), [p.usuarios])
  const sugeridas = useMemo(() => todas.filter(u => !p.foraPublico.has(u.id_usuario) && SUSPEITOS.some(r => r.test(textoDa(u)))), [todas, p.foraPublico])
  const servicos = useMemo(() => { const m = new Map<string, number>(); for (const u of todas) if (u.servico) { const k = u.servico.trim(); m.set(k, (m.get(k) ?? 0) + 1) } return [...m].sort((a, b) => b[1] - a[1]) }, [todas])
  const doServico = servico ? todas.filter(u => (u.servico ?? '').trim() === servico && !p.foraPublico.has(u.id_usuario)) : []
  const fora = todas.filter(u => p.foraPublico.has(u.id_usuario))
  async function marcar(ids: string[], m: string) {
    if (!ids.length) return
    if (!(await confirmar({ titulo: `Marcar ${ids.length} ${ids.length === 1 ? 'conta' : 'contas'} fora do público-alvo?`, texto: 'A conta continua registrada e na receita; só sai dos números de aquisição, ativação, retenção e conversão. Dá para desfazer.', sim: 'Marcar' }))) return
    definirOcupado(true)
    try { await chamarRpc('marcar_fora_publico_admin', { p_ids: ids, p_motivo: m }); avisoRapido('Marcadas fora do público-alvo.'); definirMarcadas(new Set()); await p.recarregarForaPublico() }
    catch { avisoRapido('Não foi possível marcar. Atualize as marcações e tente novamente.', 'erro') } finally { definirOcupado(false) }
  }
  async function desmarcar(id: string) {
    definirOcupado(true)
    try { await chamarRpc('desmarcar_fora_publico_admin', { p_ids: [id] }); avisoRapido('Voltou ao público-alvo.'); await p.recarregarForaPublico() }
    catch { avisoRapido('Não foi possível desmarcar.', 'erro') } finally { definirOcupado(false) }
  }
  const Linha = ({ u, marcar: podeMarcar }: { u: LinhaUsuario; marcar?: boolean }) => <li>
    {podeMarcar && <input type="checkbox" aria-label={`Selecionar ${nomeDe(u)}`} checked={marcadas.has(u.id_usuario)} onChange={e => definirMarcadas(s => { const n = new Set(s); if (e.target.checked) n.add(u.id_usuario); else n.delete(u.id_usuario); return n })} />}
    <button type="button" className="qd-pessoa" onClick={() => nav.abrirPessoa(u.id_usuario)}><b>{nomeDe(u)}</b><small>{[u.email, u.servico, u.cidade].filter(Boolean).join(' · ')}</small></button>
    {!podeMarcar && <><span className="a3-mudo a3-pequeno">{p.foraPublico.get(u.id_usuario) ?? ''}</span><button type="button" className="cal__ficha-btn" disabled={ocupado || !!p.foraPublicoErro || p.foraPublicoCarregando} onClick={() => void desmarcar(u.id_usuario)}>Voltar ao público</button></>}
  </li>
  return <article className="cr-cartao">
    <h3>Fora do público-alvo <small>a conta fica registrada e na receita, mas sai dos números de crescimento</small></h3>
    {!!p.foraPublicoErro && <Faixa tom="aviso" titulo={p.foraPublicoSemSql ? 'Recurso de marcação indisponível' : 'Não foi possível carregar as marcações'}>
      {p.foraPublicoSemSql ? 'O servidor não encontrou o recurso de marcação. Tente carregar novamente.' : 'A consulta falhou. A lista não deve ser interpretada como vazia; as marcações existentes continuam salvas.'}
      <p><button type="button" className="a3-botao a3-botao--contorno" disabled={p.foraPublicoCarregando} onClick={() => void p.recarregarForaPublico()}>{p.foraPublicoCarregando ? 'Carregando…' : 'Tentar carregar novamente'}</button></p>
    </Faixa>}
    <div className="cr-grade-2">
      <div className="qd-bloco"><span className="cc-sub">Sugestões para revisar ({sugeridas.length})</span>
        <p className="a3-mudo a3-pequeno">Contas ligadas à UECE e as de "Glauderrr" e "Samara Menezes". Confira cada uma antes de marcar.</p>
        {sugeridas.length ? <ul className="qd-lista">{sugeridas.map(u => <Linha key={u.id_usuario} u={u} marcar />)}</ul> : <p className="a3-mudo">Nenhuma sugestão agora.</p>}
        <label className="a3-campo"><span>Motivo</span><input className="a3-entrada" value={motivo} maxLength={200} onChange={e => definirMotivo(e.target.value)} placeholder="Ex.: estudante de outra área (UECE)" /></label>
        <button type="button" className="a3-botao" disabled={ocupado || !!p.foraPublicoErro || p.foraPublicoCarregando || !marcadas.size} onClick={() => void marcar([...marcadas], motivo)}>Marcar {marcadas.size || ''} selecionadas</button>
      </div>
      <div className="qd-bloco"><span className="cc-sub">Marcar por instituição ou serviço</span>
        <select className="a3-entrada" value={servico} onChange={e => definirServico(e.target.value)} aria-label="Serviço"><option value="">Escolha um serviço…</option>{servicos.map(([s, n]) => <option key={s} value={s}>{s} ({n})</option>)}</select>
        {servico && <><ul className="qd-lista">{doServico.slice(0, 20).map(u => <Linha key={u.id_usuario} u={u} marcar />)}</ul>{doServico.length > 20 && <p className="a3-mudo a3-pequeno">e mais {doServico.length - 20}</p>}
          <button type="button" className="a3-botao a3-botao--contorno" disabled={ocupado || !!p.foraPublicoErro || p.foraPublicoCarregando || !doServico.length} onClick={() => void marcar(doServico.map(u => u.id_usuario), motivo || `Serviço: ${servico}`)}>Marcar as {doServico.length} contas de {servico}</button></>}
        <span className="cc-sub" style={{ marginTop: 10 }}>Já marcadas ({p.foraPublicoErro ? 'consulta indisponível' : p.foraPublicoCarregando ? 'carregando…' : fora.length})</span>
        {fora.length ? <ul className="qd-lista">{fora.map(u => <Linha key={u.id_usuario} u={u} />)}</ul> : <p className="a3-mudo">{p.foraPublicoErro ? 'A lista não foi carregada. Tente novamente.' : p.foraPublicoCarregando ? 'Carregando marcações…' : 'Nenhuma conta marcada.'}</p>}
      </div>
    </div>
  </article>
}

/* ───────────── Possíveis contas duplicadas ───────────── */

/** Só um relatório: nenhuma fusão, nenhuma exclusão, nenhum histórico alterado. */
export function Duplicadas() {
  const p = usarPainel()
  const nav = usarNav()
  const grupos = useMemo(() => {
    const m = new Map<string, LinhaUsuario[]>()
    for (const u of p.usuarios ?? []) {
      const nome = normalizar(`${u.nome ?? ''}`).replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
      const partes = nome.split(' ').filter(x => x.length > 1)
      if (partes.length < 2) continue
      const chave = `${partes[0]} ${partes[partes.length - 1]}`
      m.set(chave, [...(m.get(chave) ?? []), u])
    }
    // Também o mesmo e-mail com pontos/sufixos diferentes (gmail ignora pontos e +sufixo).
    const porEmail = new Map<string, LinhaUsuario[]>()
    for (const u of p.usuarios ?? []) { if (!u.email) continue; const [l, dom] = u.email.toLowerCase().split('@'); const k = `${dom === 'googlemail.com' ? 'gmail.com' : dom}:${(dom ?? '').includes('gmail') ? l.replace(/\./g, '').replace(/\+.*/, '') : l.replace(/\+.*/, '')}`; porEmail.set(k, [...(porEmail.get(k) ?? []), u]) }
    const lista = [...[...m].filter(([, l]) => l.length > 1).map(([k, l]) => ({ motivo: `mesmo nome: ${k}`, l })), ...[...porEmail].filter(([, l]) => l.length > 1).map(([k, l]) => ({ motivo: `mesmo e-mail (sem pontos/sufixo): ${k.split(':')[1]}`, l }))]
    return lista.sort((a, b) => b.l.length - a.l.length)
  }, [p.usuarios])
  return <article className="cr-cartao">
    <h3>Possíveis contas duplicadas <small>só um relatório: nada é fundido, apagado ou alterado</small></h3>
    {!grupos.length ? <Estado compacto icone="certo" titulo="Nenhuma suspeita de conta repetida" /> : <ul className="qd-dup">{grupos.slice(0, 40).map(g => <li key={g.motivo}>
      <span className="cc-sub">{g.motivo} · {g.l.length} contas</span>
      <div>{g.l.map(u => <button key={u.id_usuario} type="button" className="qd-pessoa" onClick={() => nav.abrirPessoa(u.id_usuario)}><b>{nomeDe(u)}</b><small>{u.email} · {inteiro(u.respondidas)} questões{u.plano_vigente ? ' · assinante' : ''}</small></button>)}</div>
    </li>)}</ul>}
    {grupos.length > 40 && <p className="a3-mudo a3-pequeno">Mostrando 40 de {grupos.length} grupos.</p>}
    <p className="a3-mudo a3-pequeno"><Icone nome="info" tamanho={13} /> Sinais usados: primeiro e último nome iguais, ou o mesmo e-mail do Gmail escrito com pontos ou +sufixo. Nomes comuns podem ser pessoas diferentes.</p>
  </article>
}
