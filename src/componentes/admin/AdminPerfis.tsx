import { useMemo, useState } from 'react'
import { PROVAS, rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import { BarrasHorizontais } from './AdminGraficos'
import { baixarCsv, porcentagem, acertoAposRevisao, acertoReal, rotuloOrigem } from './formatos'
import type { LinhaUsuario } from './AdminUsuarios'
import { chaveServico, servicoConhecido, SERVICO_GERAL } from './servicosConhecidos'

/** Ordem fixa das etapas nas tabelas: da formação para o título. */
const ORDEM_ETAPAS = ['R1', 'R2', 'R3', 'Residente (ano não informado)', 'R4 / fellowship', 'Residente de mão', 'Ortopedista', 'Estudante', 'Outro', 'Não informado']

interface Grupo { rotulo: string; contas: number; ativos7d: number; comRespostas: number; respondidas: number; acertos: number; erros: number; acertos_primeira: number | null; erros_primeira: number | null; assinantes: number; novos30: number }

function agrupar(lista: LinhaUsuario[], chave: (u: LinhaUsuario) => string[]): Grupo[] {
  const mapa = new Map<string, Grupo>()
  const agora = Date.now()
  for (const u of lista) for (const rotulo of chave(u)) {
    const g = mapa.get(rotulo) ?? { rotulo, contas: 0, ativos7d: 0, comRespostas: 0, respondidas: 0, acertos: 0, erros: 0, acertos_primeira: null, erros_primeira: null, assinantes: 0, novos30: 0 }
    g.contas++
    if (u.respondidas_7d > 0) g.ativos7d++
    if (u.respondidas > 0) g.comRespostas++
    g.respondidas += Number(u.respondidas); g.acertos += Number(u.acertos); g.erros += Number(u.erros)
    if (u.acertos_primeira != null) { g.acertos_primeira = (g.acertos_primeira ?? 0) + Number(u.acertos_primeira); g.erros_primeira = (g.erros_primeira ?? 0) + Number(u.erros_primeira ?? 0) }
    if (u.plano_vigente) g.assinantes++
    if (agora - new Date(u.criado_em).getTime() < 30 * 86_400_000) g.novos30++
    mapa.set(rotulo, g)
  }
  return [...mapa.values()]
}

const etapaDe = (u: LinhaUsuario) => u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : 'Não informado'
const provasDe = (u: LinhaUsuario) => (u.provas ?? '').split(',').filter(Boolean)
const pct = (parte: number, todo: number) => `${porcentagem(parte, todo) ?? 0}%`
/** "62% · 81% após revisão" (o real na frente); sem a migração nova, só o após revisão. */
const acertoTexto = (g: Grupo | undefined) => {
  if (!g) return '—'
  const real = acertoReal(g), revisao = acertoAposRevisao(g)
  return real !== null ? `${real}% · ${revisao ?? '—'}${revisao !== null ? '%' : ''} após revisão` : revisao !== null ? `${revisao}%` : '—'
}
const media = (total: number, n: number) => n ? Math.round(total / n).toLocaleString('pt-BR') : '—'

/**
 * Quem estuda no site: etapa de formação (R1 a R3, R4, mão…), provas de
 * interesse, estado e serviço, cruzados com estudo, acerto e assinatura.
 * Tudo vem da lista de usuários do painel; contas de teste já chegam fora.
 */
export function AdminPerfis({ usuarios }: { usuarios: LinhaUsuario[] }) {
  const [criterio, definirCriterio] = useState<'contas' | 'ativos'>('contas')
  const [ordemServicos, definirOrdemServicos] = useState<'contas' | 'acerto' | 'ativos' | 'questoes'>('contas')
  const [todosServicos, definirTodosServicos] = useState(false)
  const comMigracao = usuarios.some(u => u.provas !== undefined)
  const d = useMemo(() => {
    const base = criterio === 'ativos' ? usuarios.filter(u => u.respondidas_7d > 0) : usuarios
    const etapas = agrupar(base, u => [etapaDe(u)]).sort((a, b) => ORDEM_ETAPAS.indexOf(a.rotulo) - ORDEM_ETAPAS.indexOf(b.rotulo))
    const comProva = base.filter(u => provasDe(u).length)
    const provas = PROVAS.map(([valor]) => {
      const g = agrupar(base.filter(u => provasDe(u).includes(valor)), () => [rotuloProva(valor)])[0]
      return { valor, rotulo: rotuloProva(valor), contas: g?.contas ?? 0, grupo: g }
    })
    // Cruzamento etapa x prova: quantas pessoas de cada etapa marcaram cada prova.
    const cruzamento = etapas.filter(e => e.rotulo !== 'Não informado').map(e => ({
      etapa: e.rotulo,
      total: e.contas,
      porProva: PROVAS.map(([valor]) => base.filter(u => etapaDe(u) === e.rotulo && provasDe(u).includes(valor)).length),
    }))
    const ufs = agrupar(base.filter(u => u.uf), u => [u.uf!]).sort((a, b) => b.contas - a.contas)
    // Siglas e apelidos conhecidos (HAC, HUC, INTO…) entram no nome completo; o resto, pelo texto escrito.
    const comServico = base.filter(u => u.servico)
    const servicos = agrupar(comServico, u => [chaveServico(u.servico!, u.uf)]).sort((a, b) => b.contas - a.contas)
    const nomeServico = new Map<string, string>()
    const escritas = new Map<string, Set<string>>()
    for (const u of comServico) {
      const chave = chaveServico(u.servico!, u.uf)
      nomeServico.set(chave, chave === SERVICO_GERAL ? SERVICO_GERAL : servicoConhecido(u.servico, u.uf) ?? nomeServico.get(chave) ?? u.servico!.trim())
      escritas.set(chave, (escritas.get(chave) ?? new Set()).add(u.servico!.trim()))
    }
    // Origem do cadastro: só as contas criadas depois da medição (as antigas vêm sem origem).
    const comOrigem = base.filter(u => u.origem)
    const origens = agrupar(comOrigem, u => [rotuloOrigem(u.origem!)]).sort((a, b) => b.contas - a.contas)
    const informaram = base.filter(u => u.situacao).length
    const completos = base.filter(u => u.situacao && (u.situacao !== 'residente' || u.ano_residencia) && provasDe(u).length).length
    return { base, etapas, provas, comProva: comProva.length, cruzamento, ufs, servicos, nomeServico, escritas, comOrigem: comOrigem.length, origens, informaram, completos }
  }, [usuarios, criterio])

  const total = d.base.length
  // Serviços na ordem escolhida. Por acerto, só quem tem ao menos 50 respostas, para um aluno sozinho não liderar.
  const acertoDe = (g: Grupo) => acertoReal(g) ?? acertoAposRevisao(g) ?? -1
  const servicosOrdenados = [...d.servicos]
    .filter((s) => ordemServicos !== 'acerto' || s.respondidas >= 50)
    .sort((a, b) => ordemServicos === 'acerto' ? acertoDe(b) - acertoDe(a) : ordemServicos === 'ativos' ? b.ativos7d - a.ativos7d : ordemServicos === 'questoes' ? b.respondidas / b.contas - a.respondidas / a.contas : b.contas - a.contas)
  const servicosVisiveis = todosServicos ? servicosOrdenados : servicosOrdenados.slice(0, 15)
  const residentes = d.etapas.filter(e => ['R1', 'R2', 'R3', 'Residente (ano não informado)'].includes(e.rotulo)).reduce((s, e) => s + e.contas, 0)
  const provaTopo = [...d.provas].sort((a, b) => b.contas - a.contas)[0]

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-perfis">
    <div className="adm-secao__cabeca">
      <div><h2 id="adm-titulo-perfis">Quem estuda aqui</h2><p>Etapa de formação e provas de interesse, cruzadas com estudo, acerto e assinatura. As contas antigas respondem uma única vez, pelo aviso na página inicial.</p></div>
      <div className="adm-filtros" role="group" aria-label="Quem entra na conta">
        <button type="button" className="adm-chip" aria-pressed={criterio === 'contas'} onClick={() => definirCriterio('contas')}>Todas as contas</button>
        <button type="button" className="adm-chip" aria-pressed={criterio === 'ativos'} onClick={() => definirCriterio('ativos')}>Só ativos na semana</button>
      </div>
    </div>
    {!comMigracao && <p className="adm-alerta" role="status">Para ver ano da residência e provas de interesse, rode a migração 202610060100_perfil_estudo_admin.sql. Até lá, aparecem só as etapas antigas (residente, ortopedista, outro).</p>}

    <div className="adm-kpis">
      <div className="adm-kpi adm-kpi--destaque"><span>Perfis completos</span><strong>{pct(d.completos, total)}</strong><small>{d.completos} de {total} com etapa e prova</small></div>
      <div className="adm-kpi"><span>Informaram a etapa</span><strong>{pct(d.informaram, total)}</strong><small>{d.informaram} conta(s)</small></div>
      <div className="adm-kpi"><span>Residentes R1 a R3</span><strong>{residentes}</strong><small>{pct(residentes, d.informaram)} de quem informou</small></div>
      <div className="adm-kpi"><span>Prova mais escolhida</span><strong>{provaTopo?.contas ? provaTopo.rotulo : '—'}</strong><small>{provaTopo?.contas ? `${provaTopo.contas} pessoa(s) · ${pct(provaTopo.contas, d.comProva)} de quem respondeu` : 'ninguém respondeu ainda'}</small></div>
      <div className="adm-kpi"><span>Estados</span><strong>{d.ufs.length}</strong><small>{d.ufs[0] ? `mais contas: ${d.ufs[0].rotulo} (${pct(d.ufs[0].contas, total)})` : 'sem UF informada'}</small></div>
      <div className="adm-kpi"><span>Serviços diferentes</span><strong>{d.servicos.length}</strong><small>{d.servicos[0] ? `maior: ${d.nomeServico.get(d.servicos[0].rotulo)} (${d.servicos[0].contas})` : 'sem serviço informado'}</small></div>
    </div>

    <div className="adm-linha-nota">
      <h3>Por etapa</h3>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-etapas-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Etapa', 'Contas', '% das contas', 'Novos em 30 dias', 'Ativos 7 dias (%)', 'Começaram (%)', 'Questões por conta', 'Acerto real, 1ª tentativa (%)', 'Acerto após revisão (%)', 'Assinantes (%)'],
        d.etapas.map(e => [e.rotulo, e.contas, porcentagem(e.contas, total), e.novos30, porcentagem(e.ativos7d, e.contas), porcentagem(e.comRespostas, e.contas), Math.round(e.respondidas / (e.contas || 1)), acertoReal(e), acertoAposRevisao(e), porcentagem(e.assinantes, e.contas)]))}>Exportar</button>
    </div>
    <div className="adm-tabela-rolagem" role="region" aria-label="Contas por etapa" tabIndex={0}><table className="tabela adm-retencao">
      <thead><tr><th scope="col">Etapa</th><th scope="col">Contas</th><th scope="col">% do total</th><th scope="col">Novos 30 d</th><th scope="col">Ativos 7 d</th><th scope="col">Começaram</th><th scope="col">Questões/conta</th><th scope="col">Acerto real</th><th scope="col">Após revisão</th><th scope="col">Assinantes</th></tr></thead>
      <tbody>{d.etapas.map(e => {
        const linha = (v: number | null) => <span className="adm-celula" style={{ '--p': `${v ?? 0}%` } as React.CSSProperties}>{v === null ? '—' : `${v}%`}</span>
        return <tr key={e.rotulo}>
          <th scope="row">{e.rotulo}</th><td className="numerico">{e.contas}</td><td>{linha(porcentagem(e.contas, total))}</td><td className="numerico">{e.novos30}</td>
          <td>{linha(porcentagem(e.ativos7d, e.contas))}</td><td>{linha(porcentagem(e.comRespostas, e.contas))}</td>
          <td className="numerico">{media(e.respondidas, e.contas)}</td><td>{linha(acertoReal(e))}</td><td>{linha(acertoAposRevisao(e))}</td><td>{linha(porcentagem(e.assinantes, e.contas))}</td>
        </tr>
      })}</tbody>
    </table></div>

    <div className="adm-duas">
      <div className="empilha">
        <h3>Provas de interesse</h3>
        <p className="adm-nota">Cada pessoa pode marcar mais de uma; a porcentagem é sobre as {d.comProva} que responderam.</p>
        <BarrasHorizontais maximo={d.comProva || 1} itens={d.provas.map(p => ({
          rotulo: p.rotulo, valor: p.contas,
          detalhe: p.contas ? `${pct(p.contas, d.comProva)} · ${pct(p.grupo?.ativos7d ?? 0, p.contas)} ativos na semana · acerto ${acertoTexto(p.grupo)} · ${pct(p.grupo?.assinantes ?? 0, p.contas)} assinantes` : 'ninguém marcou ainda',
        }))} />
      </div>
      <div className="empilha">
        <h3>Estados</h3>
        {d.ufs.length === 0 ? <p className="adm-vazio">Ninguém informou a UF ainda.</p> : <BarrasHorizontais itens={d.ufs.slice(0, 10).map(u => ({ rotulo: u.rotulo, valor: u.contas, detalhe: `${pct(u.contas, total)} das contas · ${u.ativos7d} ativo(s) na semana` }))} />}
      </div>
    </div>

    {d.cruzamento.length > 0 && <>
      <h3>Etapa × prova de interesse</h3>
      <p className="adm-nota">Quantas pessoas de cada etapa marcaram cada prova (a célula mostra também a porcentagem da etapa).</p>
      <div className="adm-tabela-rolagem" role="region" aria-label="Cruzamento entre etapa e prova" tabIndex={0}><table className="tabela adm-retencao">
        <thead><tr><th scope="col">Etapa</th>{PROVAS.map(([v]) => <th key={v} scope="col">{rotuloProva(v)}</th>)}</tr></thead>
        <tbody>{d.cruzamento.map(c => <tr key={c.etapa}>
          <th scope="row">{c.etapa} <small className="adm-nota">({c.total})</small></th>
          {c.porProva.map((n, i) => { const p = porcentagem(n, c.total) ?? 0; return <td key={i}><span className="adm-celula" style={{ '--p': `${p}%` } as React.CSSProperties}>{n ? `${n} · ${p}%` : '—'}</span></td> })}
        </tr>)}</tbody>
      </table></div>
    </>}

    {d.servicos.length > 0 && <>
      <div className="adm-linha-nota">
        <h3>Serviços</h3>
        <div className="adm-filtros" role="group" aria-label="Ordenar serviços">
          {([['contas', 'Mais contas'], ['acerto', 'Maior acerto'], ['ativos', 'Mais ativos'], ['questoes', 'Mais questões por conta']] as const).map(([v, r]) => <button key={v} type="button" className="adm-chip" aria-pressed={ordemServicos === v} onClick={() => definirOrdemServicos(v)}>{r}</button>)}
        </div>
      </div>
      <p className="adm-nota">Variações do mesmo lugar ficam juntas ("Ortopedia do Hospital X" e "Hospital X"). Quem escreveu só "ortopedia" ou "hospital", ou marcou que atua em vários lugares, entra em "{SERVICO_GERAL}".{ordemServicos === 'acerto' ? ' Por acerto, só serviços com pelo menos 50 respostas.' : ''}</p>
      <div className="adm-tabela-rolagem" role="region" aria-label="Serviços" tabIndex={0}><table className="tabela adm-retencao">
        <thead><tr><th scope="col">Serviço</th><th scope="col">Contas</th><th scope="col">Ativos 7 d</th><th scope="col">Questões/conta</th><th scope="col">Acerto real</th><th scope="col">Após revisão</th><th scope="col">Assinantes</th></tr></thead>
        <tbody>{servicosVisiveis.map(s => <tr key={s.rotulo}>
          <th scope="row" className="adm-servico" title={`Escrito como: ${[...(d.escritas.get(s.rotulo) ?? [])].join(', ')}`}>{d.nomeServico.get(s.rotulo)}</th><td className="numerico">{s.contas}</td><td className="numerico">{s.ativos7d}</td>
          <td className="numerico">{media(s.respondidas, s.contas)}</td><td className="numerico">{acertoReal(s) ?? '—'}{acertoReal(s) !== null ? '%' : ''}</td><td className="numerico">{acertoAposRevisao(s) ?? '—'}{acertoAposRevisao(s) !== null ? '%' : ''}</td><td className="numerico">{s.assinantes}</td>
        </tr>)}</tbody>
      </table></div>
      {servicosOrdenados.length > 15 && <button type="button" className="adm-link" onClick={() => definirTodosServicos(!todosServicos)}>{todosServicos ? 'Mostrar só os 15 primeiros' : `Ver todos os ${servicosOrdenados.length} serviços`}</button>}
    </>}

    <h3>De onde vêm os cadastros</h3>
    {!usuarios.some(u => u.origem !== undefined)
      ? <p className="adm-alerta" role="status">Para ver a origem dos cadastros, rode a migração 202610070100_origem_cadastro.sql (parte 7 em supabase/colar-no-painel).</p>
      : d.origens.length === 0
        ? <p className="adm-nota">Nenhuma conta nova com origem registrada ainda. A medição vale para as contas criadas a partir de agora; use os links marcados no anúncio e na bio.</p>
        : <>
          <p className="adm-nota">{d.comOrigem} conta(s) com a origem registrada (as criadas desde a medição). Link marcado (utm) diz o anúncio ou a bio; sem ele, vale o site de onde a pessoa chegou.</p>
          <div className="adm-tabela-rolagem" role="region" aria-label="Origem dos cadastros" tabIndex={0}><table className="tabela adm-retencao">
            <thead><tr><th scope="col">Origem</th><th scope="col">Contas</th><th scope="col">% das novas</th><th scope="col">Começaram</th><th scope="col">Ativos 7 d</th><th scope="col">Assinantes</th></tr></thead>
            <tbody>{d.origens.map(o => <tr key={o.rotulo}>
              <th scope="row" className="adm-servico">{o.rotulo}</th><td className="numerico">{o.contas}</td><td className="numerico">{pct(o.contas, d.comOrigem)}</td>
              <td className="numerico">{o.comRespostas}</td><td className="numerico">{o.ativos7d}</td><td className="numerico">{o.assinantes}</td>
            </tr>)}</tbody>
          </table></div>
        </>}
  </section>
}
