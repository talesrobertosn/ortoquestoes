import { useEffect, useMemo, useRef, useState } from 'react'
import { carregarQuestoes } from '../../dados/acervo'
import { usarIndice } from '../../dados/usarIndice'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { href } from '../../util/rotas'
import { erroDoPainel, porcentagem } from '../../componentes/admin/formatos'
import { chaveAvaliacao } from '../../componentes/admin/lidos'
import { usarLidos } from '../../componentes/admin/lidos'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { usarPainel } from '../dados/painel'
import { usarNav } from '../nav'
import { defParte, type VistaTriagem } from '../rotas'
import { Icone } from '../ui/Icone'
import { combina, dataHora, haQuanto, inteiro, normalizar } from '../ui/formato'
import { Ranking } from '../ui/graficos'
import { Busca, Cabeca, Carregando, Estado, Faixa, Filtro, Painel, Selo, Situacao } from '../ui/kit'
import { avisoRapido, confirmar, pedirTexto } from '../ui/sobreposicoes'
import { Tabela } from '../ui/tabela'
import { ROTULO_FAIXA, ROTULO_MOTIVO, ehNotaRuim, faixaDaNota, mediaFormatada, ordenarResumos, valorDaAvaliacao, type FaixaNota, type ResumoNota } from '../../dados/notasComentario'
import { HubNotas, PorTema } from './notasHub'

interface Estatistica { id_questao: string; pessoas: number; acertos_primeira: number; erros_primeira: number; acertos_atual: number }
interface Relato { id: number; id_questao: string; tipo: string; texto: string; status: 'aberto' | 'resolvido' | 'descartado'; nota_admin: string | null; criado_em: string; resolvido_em: string | null; usuario: string | null; avisado_em?: string | null }
interface Avaliacao { id_questao: string; util: boolean; motivo: string | null; observacao: string | null; atualizado_em: string; usuario: string | null; nota?: number | null; comentario_em?: string | null }
interface Info { titulo: string; trecho: string }

const MIGRACAO = '202609290200_painel_admin_2.sql'
const TIPOS_RELATO: Record<string, string> = { gabarito: 'Gabarito', enunciado: 'Enunciado', imagem: 'Imagem', comentario: 'Comentário', outro: 'Outro' }
const MOTIVOS = ROTULO_MOTIVO
const VISTAS: Array<[VistaTriagem, string]> = [['relatos', 'Relatos de erro'], ['avaliacoes', 'Notas dos comentários'], ['suspeitas', 'Suspeitas'], ['faceis', 'Fáceis demais'], ['temas', 'Temas mais fracos']]
const acertoPrimeira = (e: Estatistica) => porcentagem(Number(e.acertos_primeira), Number(e.acertos_primeira) + Number(e.erros_primeira))
const tituloPadrao = (id: string) => { const [, n] = id.match(/-(\d+)$/) ?? []; return n ? `Questão ${Number(n)}` : id }

/** Tema, prova, número e começo do enunciado de cada questão citada (lido do acervo uma vez por id). */
function usarInfo(ids: string[]) {
  const { indice } = usarIndice()
  const [info, definir] = useState<Map<string, Info>>(new Map())
  const pedidos = useRef(new Set<string>())
  const chave = ids.join('|')
  useEffect(() => {
    if (!indice) return
    const faltam = [...new Set(ids)].filter(id => !pedidos.current.has(id))
    if (!faltam.length) return
    faltam.forEach(id => pedidos.current.add(id))
    let vivo = true
    carregarQuestoes(indice, faltam).then(qs => {
      if (!vivo) return
      definir(atual => {
        const novo = new Map(atual)
        for (const q of qs) {
          const texto = q.enunciado.replace(/\s+/g, ' ').trim()
          novo.set(q.id, { titulo: [q.tema, q.prova ? `${q.prova}${q.ano ? ' ' + q.ano : ''}` : null, tituloPadrao(q.id)].filter(Boolean).join(' · '), trecho: texto.length > 220 ? texto.slice(0, 220).replace(/\s\S*$/, '') + '…' : texto })
        }
        return novo
      })
    }).catch(() => undefined)
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, chave])
  return (id: string): Info => info.get(id) ?? { titulo: tituloPadrao(id), trecho: '' }
}

/** Estudo › Qualidade do acervo: uma fila por vez, o item à direita e a decisão embaixo; depois, o próximo. */
export default function Triagem() {
  const p = usarPainel()
  const nav = usarNav()
  const vista = nav.estado.vista
  const parte = defParte('conteudo')
  const statsQ = usarRpc<Estatistica[]>(p.conta, 'estatisticas_questoes_admin')
  const relatosQ = usarRpc<Relato[]>(p.conta, 'listar_relatos_admin')
  const avaliacoesQ = usarRpc<Avaliacao[]>(p.conta, 'listar_avaliacoes_comentario_admin')
  const notasQ = usarRpc<ResumoNota[]>(p.conta, 'notas_comentarios_admin')
  const lidosAval = usarLidos('avaliacao')
  // Relatos lidos (14/11/2026): continuam em aberto, mas saem do aviso.
  const lidosRelatos = usarLidos('relato')
  const relatos = relatosQ.dados, avaliacoes = avaliacoesQ.dados
  const abertos = relatos?.filter(r => r.status === 'aberto').length ?? null
  const abertosNaoLidos = relatos?.filter(r => r.status === 'aberto' && !lidosRelatos.lidos.has(String(r.id))).length ?? null
  // Aviso só para nota ruim (Tales, 14/11/2026): nota de 5 ou menos ainda não lida, com ou sem mensagem. Nota boa
  // entra nas estatísticas sem avisar.
  const naoLidas = avaliacoes ? avaliacoes.filter(l => ehNotaRuim(l) && !lidosAval.lidos.has(chaveAvaliacao(l))).length : null
  const { registrarPendencias } = p
  useEffect(() => { if (abertosNaoLidos !== null && naoLidas !== null) registrarPendencias(abertosNaoLidos + naoLidas) }, [abertosNaoLidos, naoLidas, registrarPendencias])
  const [minimo, definirMinimo] = useState(5)
  const stats = statsQ.dados
  const comAmostra = useMemo(() => (stats ?? []).filter(s => Number(s.acertos_primeira) + Number(s.erros_primeira) >= minimo), [stats, minimo])
  const suspeitas = useMemo(() => comAmostra.filter(s => (acertoPrimeira(s) ?? 100) <= 30).sort((a, b) => (acertoPrimeira(a) ?? 0) - (acertoPrimeira(b) ?? 0) || Number(b.pessoas) - Number(a.pessoas)).slice(0, 60), [comAmostra])
  const faceis = useMemo(() => comAmostra.filter(s => (acertoPrimeira(s) ?? 0) >= 95).sort((a, b) => Number(b.pessoas) - Number(a.pessoas)).slice(0, 60), [comAmostra])
  const info = usarInfo([...suspeitas, ...faceis].map(s => s.id_questao).concat((relatos ?? []).map(r => r.id_questao), (avaliacoes ?? []).map(a => a.id_questao), (notasQ.dados ?? []).map(r => r.id_questao)))
  const editar = (id: string) => nav.ir('questoes', { id })
  const contagem: Partial<Record<VistaTriagem, number | null>> = { relatos: abertos, avaliacoes: naoLidas, suspeitas: stats ? suspeitas.length : null, faceis: stats ? faceis.length : null }

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Conteúdo" titulo={parte.rotulo} pergunta={parte.pergunta} />
    <div className="a3-abas-grandes a3-abas-grandes--5" role="tablist" aria-label="Filas da triagem">
      {VISTAS.map(([v, r]) => <button key={v} type="button" role="tab" aria-selected={vista === v} className="a3-aba-grande" onClick={() => nav.ajustar({ vista: v })}>
        <span className="a3-aba-grande__numero">{v === 'temas' ? <Icone nome="grafico" tamanho={22} /> : contagem[v] ?? '—'}</span>
        <span>{r}{(v === 'relatos' ? (abertosNaoLidos ?? 0) > 0 : v === 'avaliacoes' && (contagem[v] ?? 0) > 0) ? <i className="a3-ponto a3-ponto--erro" style={{ marginLeft: 6, verticalAlign: 'middle' }} /> : null}</span>
      </button>)}
    </div>
    {vista === 'relatos' && (relatosQ.erro ? <Estado tipo="erro" titulo="Os relatos não carregaram" texto={erroDoPainel(relatosQ.erro, MIGRACAO)} /> : !relatos ? <Carregando linhas={6} /> :
      <Relatos relatos={relatos} info={info} editar={editar} recarregar={relatosQ.recarregar} lidos={lidosRelatos} />)}
    {vista === 'avaliacoes' && (avaliacoesQ.erro ? <Estado tipo="erro" titulo="As avaliações não carregaram" texto={erroDoPainel(avaliacoesQ.erro, '20261113040000_nota_comentarios.sql')} /> : !avaliacoes ? <Carregando linhas={6} /> :
      <NotasComentarios resumos={notasQ.dados} erroResumos={notasQ.erro} linhas={avaliacoes} info={info} lidos={lidosAval} editar={editar} />)}
    {(vista === 'suspeitas' || vista === 'faceis') && (statsQ.erro ? <Estado tipo="erro" titulo="As estatísticas não carregaram" texto={erroDoPainel(statsQ.erro, MIGRACAO)} /> : !stats ? <Carregando linhas={6} /> :
      <Estatisticas lista={vista === 'suspeitas' ? suspeitas : faceis} suspeitas={vista === 'suspeitas'} info={info} editar={editar} minimo={minimo} definirMinimo={definirMinimo} />)}
    {vista === 'temas' && (statsQ.erro ? <Estado tipo="erro" titulo="As estatísticas não carregaram" texto={erroDoPainel(statsQ.erro, MIGRACAO)} /> : !stats ? <Carregando linhas={6} /> : <Temas stats={stats} />)}
  </div>
}

/** Duas colunas: a fila à esquerda, o item escolhido à direita. No celular, uma embaixo da outra. */
function Mesa<T>({ itens, chave, linha, detalhe, vazio, topo }: { itens: T[]; chave: (x: T) => string; linha: (x: T) => { titulo: string; sub: string; ponto?: boolean; quando?: string }; detalhe: (x: T, proximo: () => void) => React.ReactNode; vazio: React.ReactNode; topo?: React.ReactNode }) {
  const [escolhido, escolher] = useState<string | null>(null)
  const i = Math.max(0, itens.findIndex(x => chave(x) === escolhido))
  const atual = itens[i] ?? null
  const proximo = () => { const n = itens[i + 1] ?? itens[i - 1]; escolher(n ? chave(n) : null) }
  return <section className="a3-painel a3-caixa-entrada" aria-label="Fila">
    <div className="a3-caixa-entrada__lista">
      {topo}
      {itens.length === 0 ? <div style={{ padding: 20 }}>{vazio}</div> : <ul className="a3-fila-avisos">{itens.map(x => { const l = linha(x); return <li key={chave(x)}>
        <button type="button" className="a3-fila-avisos__item" aria-current={atual && chave(atual) === chave(x) ? 'true' : undefined} onClick={() => escolher(chave(x))}>
          <span className={'a3-ponto' + (l.ponto ? ' a3-ponto--erro' : '')} aria-hidden="true" />
          <span className="a3-fila-avisos__texto"><span className="a3-nome">{l.titulo}</span><span className="a3-sub">{l.sub}</span></span>
          {l.quando && <span className="a3-fila-avisos__quando">{l.quando}</span>}
        </button></li> })}</ul>}
    </div>
    <div className="a3-caixa-entrada__detalhe" aria-live="polite">{atual ? <>
      <div className="a3-mesa-passo"><span className="a3-mudo a3-pequeno">{i + 1} de {itens.length}</span>
        <span className="a3-acoes-linha">
          <button type="button" className="a3-botao a3-botao--fantasma a3-botao--icone a3-botao--pequeno" aria-label="Anterior" disabled={i === 0} onClick={() => escolher(chave(itens[i - 1]))}><Icone nome="cima" tamanho={15} /></button>
          <button type="button" className="a3-botao a3-botao--fantasma a3-botao--icone a3-botao--pequeno" aria-label="Próximo" disabled={i >= itens.length - 1} onClick={() => escolher(chave(itens[i + 1]))}><Icone nome="baixo" tamanho={15} /></button>
        </span></div>
      {detalhe(atual, proximo)}
    </> : <Estado compacto titulo="Fila vazia" />}</div>
  </section>
}

function Questao({ id, info }: { id: string; info: (id: string) => Info }) {
  const q = info(id)
  return <div className="a3-questao-ref">
    <a href={href(`/questao/${id}`)} target="_blank" rel="noopener noreferrer" className="a3-titulo-2">{q.titulo} <Icone nome="externo" tamanho={14} /></a>
    {q.trecho && <p className="a3-mudo">{q.trecho}</p>}
  </div>
}

function Relatos({ relatos, info, editar, recarregar, lidos }: { relatos: Relato[]; info: (id: string) => Info; editar: (id: string) => void; recarregar: () => Promise<void>; lidos: ReturnType<typeof usarLidos> }) {
  const novo = (r: Relato) => r.status === 'aberto' && !lidos.lidos.has(String(r.id))
  const novos = relatos.filter(novo)
  // Um clique tira todos do aviso, sem resolver nem justificar: continuam em "Em aberto" para tratar depois.
  const lerTodos = () => { lidos.marcar(novos.map(r => String(r.id))); avisoRapido(`${novos.length} ${novos.length === 1 ? 'relato marcado como lido' : 'relatos marcados como lidos'}. Continuam em aberto.`) }
  const [filtro, definirFiltro] = useState<'aberto' | 'fechados' | 'todos'>('aberto')
  const [busca, definirBusca] = useState('')
  const termo = normalizar(busca.trim())
  const itens = relatos.filter(r => (filtro === 'todos' || (filtro === 'aberto' ? r.status === 'aberto' : r.status !== 'aberto')) && combina([r.texto, r.usuario, r.id_questao, info(r.id_questao).titulo, TIPOS_RELATO[r.tipo]], termo))

  async function avisar(r: Relato) {
    try {
      const res = await chamarFuncao<{ para?: string }>('enviar-email', { acao: 'relato_resolvido', id_relato: r.id })
      avisoRapido(`E-mail enviado para ${res.para ?? r.usuario}.`); await recarregar()
    } catch (f) {
      const m = f instanceof Error ? f.message : ''
      avisoRapido(m === 'acao_invalida' ? 'A Function enviar-email ainda é a versão antiga. Atualize-a no Supabase para poder avisar.' : m === 'pessoa_nao_quer_emails' ? 'Esta pessoa desligou os e-mails do site, então o aviso não foi enviado.' : `Não foi possível enviar: ${m || 'erro desconhecido'}.`, 'erro')
    }
  }
  async function mudar(r: Relato, status: Relato['status'], proximo: () => void) {
    let nota: string | null = null
    if (status !== 'aberto') {
      const escrita = await pedirTexto(status === 'resolvido'
        ? { titulo: 'Marcar relato como resolvido', rotulo: 'O que foi corrigido? (opcional; vai no e-mail, se você avisar)', valorInicial: r.nota_admin ?? '', sim: 'Marcar resolvido' }
        : { titulo: 'Descartar relato', rotulo: 'Por que foi descartado? (opcional)', valorInicial: r.nota_admin ?? '', sim: 'Descartar' })
      if (escrita === null) return
      nota = escrita
    }
    try { await chamarRpc('atualizar_relato_admin', { p_id: r.id, p_status: status, p_nota: nota }); await recarregar() } catch { avisoRapido('Não foi possível atualizar o relato. Nada mudou.', 'erro'); return }
    avisoRapido(status === 'resolvido' ? 'Relato marcado como resolvido.' : status === 'descartado' ? 'Relato descartado.' : 'Relato reaberto.')
    if (status === 'resolvido' && r.usuario && await confirmar({ titulo: 'Avisar quem relatou?', texto: `Mandar um e-mail para ${r.usuario} dizendo que a questão foi corrigida.`, sim: 'Avisar por e-mail', nao: 'Agora não' })) await avisar(r)
    if (filtro === 'aberto') proximo()
  }

  return <Mesa itens={itens} chave={r => String(r.id)}
    topo={<>{novos.length > 0 && <div className="a3-filtros" style={{ paddingBottom: 0 }}><Faixa tom="aviso" titulo={`${novos.length} ${novos.length === 1 ? 'relato novo' : 'relatos novos'}`}
        acao={<button type="button" className="a3-botao a3-botao--pequeno" onClick={lerTodos}><Icone nome="certo" tamanho={14} />Marcar todos como lidos</button>}>Tira o aviso sem resolver: eles continuam em aberto.</Faixa></div>}
      <div className="a3-filtros"><Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar texto, pessoa ou questão" /></div>
      <div className="a3-filtros" style={{ paddingTop: 0 }} role="group" aria-label="Situação">
        {(['aberto', 'fechados', 'todos'] as const).map(f => <Filtro key={f} ativo={filtro === f} aoClicar={() => definirFiltro(f)} contagem={relatos.filter(r => f === 'todos' || (f === 'aberto' ? r.status === 'aberto' : r.status !== 'aberto')).length}>{f === 'aberto' ? 'Em aberto' : f === 'fechados' ? 'Fechados' : 'Todos'}</Filtro>)}
      </div></>}
    linha={r => ({ titulo: info(r.id_questao).titulo, sub: `${TIPOS_RELATO[r.tipo] ?? r.tipo} · ${r.texto}`, ponto: novo(r), quando: haQuanto(r.criado_em) })}
    vazio={<Estado icone="certo" titulo={filtro === 'aberto' ? 'Nenhum relato em aberto' : 'Nenhum relato aqui'} texto='Eles chegam pelo botão "Relatar erro nesta questão".' />}
    detalhe={(r, proximo) => <div className="a3-pilha">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Situacao tom={r.status === 'aberto' ? 'erro' : 'neutro'}>{r.status === 'aberto' ? 'Em aberto' : r.status === 'resolvido' ? 'Resolvido' : 'Descartado'}</Situacao><Selo contorno>{TIPOS_RELATO[r.tipo] ?? r.tipo}</Selo></div>
      <Questao id={r.id_questao} info={info} />
      <blockquote className="a3-citacao">{r.texto}</blockquote>
      <dl className="a3-pares">
        <div><dt>Quem relatou</dt><dd>{r.usuario ?? 'conta removida'}</dd></div>
        <div><dt>Quando</dt><dd>{dataHora(r.criado_em)}</dd></div>
        {r.resolvido_em && <div><dt>Fechado em</dt><dd>{dataHora(r.resolvido_em)}</dd></div>}
        {r.nota_admin && <div><dt>Anotação</dt><dd style={{ fontWeight: 400 }}>{r.nota_admin}</dd></div>}
        {r.avisado_em && <div><dt>Avisado por e-mail</dt><dd>{dataHora(r.avisado_em)}</dd></div>}
      </dl>
      <div className="a3-acoes-linha">
        <button type="button" className="a3-botao a3-botao--contorno" onClick={() => editar(r.id_questao)}><Icone nome="lapis" tamanho={15} />Editar questão</button>
        {r.status === 'aberto' ? <>
          <button type="button" className="a3-botao" onClick={() => void mudar(r, 'resolvido', proximo)}><Icone nome="certo" tamanho={15} />Marcar resolvido</button>
          <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => void mudar(r, 'descartado', proximo)}>Descartar</button>
          {novo(r) ? <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => { lidos.marcar([String(r.id)]); proximo() }}>Lido, próximo</button>
            : <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => lidos.marcar([String(r.id)], false)}>Marcar como não lido</button>}
        </> : <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => void mudar(r, 'aberto', proximo)}>Reabrir</button>}
        {r.status === 'resolvido' && r.usuario && !r.avisado_em && <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => void avisar(r)}><Icone nome="enviar" tamanho={15} />Avisar por e-mail</button>}
      </div>
    </div>} />
}

function Avaliacoes({ linhas, info, lidos, editar }: { linhas: Avaliacao[]; info: (id: string) => Info; lidos: ReturnType<typeof usarLidos>; editar: (id: string) => void }) {
  const [modo, definirModo] = useState<'ler' | 'questoes' | 'todas'>('ler')
  const [busca, definirBusca] = useState('')
  const termo = normalizar(busca.trim())
  const filtradas = linhas.filter(l => combina([l.id_questao, info(l.id_questao).titulo, info(l.id_questao).trecho, l.observacao, l.usuario], termo))
  const comMensagem = filtradas.filter(l => ehNotaRuim(l))
  const paraLer = comMensagem.filter(l => !lidos.lidos.has(chaveAvaliacao(l)))
  const ajudou = linhas.filter(l => l.util).length
  const placar = useMemo(() => {
    const m = new Map<string, { id: string; ajudou: number; nao: number; motivos: Map<string, number>; mensagens: number }>()
    for (const l of filtradas) {
      const x = m.get(l.id_questao) ?? { id: l.id_questao, ajudou: 0, nao: 0, motivos: new Map(), mensagens: 0 }
      if (l.util) x.ajudou++; else { x.nao++; if (l.motivo) x.motivos.set(l.motivo, (x.motivos.get(l.motivo) ?? 0) + 1); if (l.observacao?.trim()) x.mensagens++ }
      m.set(l.id_questao, x)
    }
    return [...m.values()].sort((a, b) => b.nao - a.nao || a.ajudou - b.ajudou)
  }, [filtradas])
  const topo = <>
    <div className="a3-placar-mini">
      <span><b>{inteiro(linhas.length)}</b> notas recentes</span><span><b>{linhas.length ? mediaFormatada(linhas.reduce((t, l) => t + valorDaAvaliacao(l), 0) / linhas.length) : '—'}</b> de média</span><span><b>{inteiro(linhas.length - ajudou)}</b> de 5 ou menos</span>
    </div>
    <div className="a3-filtros"><Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar tema, trecho, mensagem ou e-mail" /></div>
    <div className="a3-filtros" style={{ paddingTop: 0 }} role="group" aria-label="Vista">
      <Filtro ativo={modo === 'ler'} aoClicar={() => definirModo('ler')} contagem={paraLer.length}>Para ler</Filtro>
      <Filtro ativo={modo === 'questoes'} aoClicar={() => definirModo('questoes')} contagem={placar.length}>Por questão</Filtro>
      <Filtro ativo={modo === 'todas'} aoClicar={() => definirModo('todas')} contagem={filtradas.length}>Todas</Filtro>
    </div>
  </>
  if (modo === 'questoes') return <Painel justo titulo="Placar das notas recentes" descricao="As 500 notas mais recentes, da questão com mais notas baixas para a com menos.">
    {topo}
    <Tabela rotulo="Por questão" linhas={placar} chave={x => x.id} porPagina={30} aoAbrir={x => editar(x.id)} colunas={[
      { id: 'q', titulo: 'Questão', celula: x => <span style={{ display: 'grid' }}><span className="a3-nome">{info(x.id).titulo}</span><span className="a3-sub">{[...x.motivos].map(([m, n]) => `${MOTIVOS[m] ?? m} (${n})`).join(', ') || 'sem motivo marcado'}</span></span> },
      { id: 'n', titulo: 'Nota baixa', numero: true, ordem: x => x.nao, celula: x => <b style={{ color: x.nao ? 'var(--a3-erro)' : undefined }}>{x.nao}</b>, rotuloCelular: 'Não' },
      { id: 'a', titulo: 'Nota boa', numero: true, ordem: x => x.ajudou, celula: x => x.ajudou, rotuloCelular: 'Boa' },
      { id: 'm', titulo: 'Mensagens', numero: true, soLargo: true, ordem: x => x.mensagens, celula: x => x.mensagens },
    ]} />
  </Painel>
  const itens = modo === 'ler' ? paraLer : filtradas
  return <Mesa itens={itens} chave={l => chaveAvaliacao(l)} topo={topo}
    linha={l => ({ titulo: info(l.id_questao).titulo, sub: `${l.nota ? `Nota ${l.nota}` : l.util ? 'Ajudou' : 'Não ajudou'}${l.motivo ? ` · ${MOTIVOS[l.motivo] ?? l.motivo}` : ''}${l.observacao?.trim() ? ` · ${l.observacao}` : ''}`, ponto: ehNotaRuim(l) && !lidos.lidos.has(chaveAvaliacao(l)), quando: haQuanto(l.atualizado_em) })}
    vazio={<Estado icone="certo" titulo={modo === 'ler' ? 'Nenhuma nota ruim nova' : 'Nenhuma avaliação neste filtro'} texto={modo === 'ler' && comMensagem.length ? `As ${comMensagem.length} já lidas ficam em "Todas".` : 'Quando alguém der nota de 5 ou menos, aparece aqui.'} />}
    detalhe={(l, proximo) => { const lida = lidos.lidos.has(chaveAvaliacao(l)); return <div className="a3-pilha">
      <div><Situacao tom={l.util ? 'ok' : 'erro'}>{l.nota ? `Nota ${l.nota}` : l.util ? 'Ajudou' : 'Não ajudou'}{l.motivo ? ` · ${MOTIVOS[l.motivo] ?? l.motivo}` : ''}</Situacao></div>
      <Questao id={l.id_questao} info={info} />
      {l.observacao?.trim() ? <blockquote className="a3-citacao">{l.observacao}</blockquote> : <p className="a3-mudo">Sem mensagem.</p>}
      <dl className="a3-pares"><div><dt>Quem</dt><dd>{l.usuario ?? 'conta removida'}</dd></div><div><dt>Quando</dt><dd>{dataHora(l.atualizado_em)}</dd></div>{l.comentario_em && <div><dt>Versão avaliada</dt><dd>{l.comentario_em}</dd></div>}</dl>
      <div className="a3-acoes-linha">
        <button type="button" className="a3-botao a3-botao--contorno" onClick={() => editar(l.id_questao)}><Icone nome="lapis" tamanho={15} />Editar questão</button>
        {ehNotaRuim(l) && (lida ? <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => lidos.marcar([chaveAvaliacao(l)], false)}>Marcar como não lida</button>
          : <button type="button" className="a3-botao" onClick={() => { lidos.marcar([chaveAvaliacao(l)]); if (modo === 'ler') proximo() }}><Icone nome="certo" tamanho={15} />Lida, próxima</button>)}
        {modo === 'ler' && paraLer.length > 1 && <button type="button" className="a3-botao a3-botao--fantasma" onClick={async () => { if (await confirmar({ titulo: `Marcar ${paraLer.length} notas como lidas?`, texto: 'Elas continuam em "Todas".', sim: 'Marcar todas' })) lidos.marcar(paraLer.map(chaveAvaliacao)) }}>Marcar todas</button>}
      </div>
    </div> }} />
}

type AbaNotas = FaixaNota | 'painel' | 'temas' | 'mensagens'
const FAIXAS: Array<[AbaNotas, string]> = [['painel', 'Painel'], ['mensagens', 'Notas ruins'], ['prioridade', 'Prioridade alta'], ['atencao', 'Atenção'], ['post', 'Sugestões de post'], ['temas', 'Por tema']]
const TOM_FAIXA: Record<FaixaNota, 'erro' | 'aviso' | 'ok' | 'neutro'> = { prioridade: 'erro', atencao: 'aviso', post: 'ok', normal: 'neutro' }
const EXPLICA_FAIXA: Record<FaixaNota, string> = {
  prioridade: 'Média abaixo de 6 com 3 notas ou mais, ou uma nota de 1 a 3 com mensagem. Reescrever primeiro.',
  atencao: 'Média abaixo de 7,5 ou notas muito espalhadas, ou uma nota de 5 ou menos quando ainda há poucas notas.',
  post: 'Média 9 ou mais com 2 notas ou mais: o que está funcionando. Bons modelos para os próximos comentários e para post no Instagram.',
  normal: 'Sem alerta.',
}

/** Notas de 1 a 10 dos comentários (13/11/2026): faixas de alerta, sugestões de post, média por tema e mensagens. */
function NotasComentarios({ resumos, erroResumos, linhas, info, lidos, editar }: { resumos: ResumoNota[] | null | undefined; erroResumos: unknown; linhas: Avaliacao[]; info: (id: string) => Info; lidos: ReturnType<typeof usarLidos>; editar: (id: string) => void }) {
  const [faixa, definirFaixa] = useState<AbaNotas>('painel')
  const porFaixa = useMemo(() => {
    const m: Record<FaixaNota, ResumoNota[]> = { prioridade: [], atencao: [], post: [], normal: [] }
    for (const r of resumos ?? []) m[faixaDaNota(r)].push(r)
    return m
  }, [resumos])
  const ruinsNaoLidas = linhas.filter(l => ehNotaRuim(l) && !lidos.lidos.has(chaveAvaliacao(l)))
  const naoLidas = ruinsNaoLidas.length
  const contagem = (f: AbaNotas) => f === 'temas' || f === 'painel' ? null : f === 'mensagens' ? naoLidas : resumos ? porFaixa[f].length : null
  const marcarTodas = () => { lidos.marcar(ruinsNaoLidas.map(chaveAvaliacao)); avisoRapido(`${naoLidas} ${naoLidas === 1 ? 'nota marcada' : 'notas marcadas'} como ${naoLidas === 1 ? 'lida' : 'lidas'}`) }
  const titulo = (id: string) => info(id).titulo
  const abas = <div className="a3-filtros" role="group" aria-label="Faixa">
    {FAIXAS.map(([f, r]) => <Filtro key={f} ativo={faixa === f} aoClicar={() => definirFaixa(f)} contagem={contagem(f) ?? undefined}>{r}</Filtro>)}
  </div>
  // Faixa fixa no topo enquanto houver nota ruim para ler: um clique marca todas como lidas.
  const aviso = naoLidas > 0 ? <Faixa tom="aviso" titulo={`${naoLidas} ${naoLidas === 1 ? 'nota ruim nova' : 'notas ruins novas'}`}
    acao={<span className="a3-acoes-linha">
      {faixa !== 'mensagens' && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirFaixa('mensagens')}>Ver</button>}
      <button type="button" className="a3-botao a3-botao--pequeno" onClick={marcarTodas}><Icone nome="certo" tamanho={14} />Marcar todas como lidas</button>
    </span>}>Só nota de 5 ou menos avisa; as boas entram no painel sem notificação.</Faixa> : null
  if (faixa === 'mensagens') return <div className="a3-pilha">{abas}{aviso}<Avaliacoes linhas={linhas} info={info} lidos={lidos} editar={editar} /></div>
  if (erroResumos) return <div className="a3-pilha">{abas}<Estado tipo="erro" titulo="As notas não carregaram" texto={erroDoPainel(erroResumos, '20261113040000_nota_comentarios.sql')} /></div>
  if (!resumos) return <div className="a3-pilha">{abas}{aviso}<Carregando linhas={6} /></div>
  if (faixa === 'painel') return <div className="a3-pilha">{abas}{aviso}<HubNotas resumos={resumos} recentes={linhas} titulo={titulo} abrir={editar} /></div>
  if (faixa === 'temas') return <div className="a3-pilha">{abas}{aviso}<PorTema resumos={resumos} /></div>
  const lista = ordenarResumos(porFaixa[faixa], faixa)
  return <div className="a3-pilha">{abas}{aviso}
    <Mesa itens={lista} chave={r => r.id_questao}
      topo={<div className="a3-filtros"><Faixa>{EXPLICA_FAIXA[faixa]}</Faixa></div>}
      linha={r => ({ titulo: info(r.id_questao).titulo, sub: `Média ${mediaFormatada(r.media)} · ${inteiro(r.n)} ${r.n === 1 ? 'nota' : 'notas'}${r.mensagens ? ` · ${r.mensagens} ${r.mensagens === 1 ? 'mensagem' : 'mensagens'}` : ''}`, ponto: faixa === 'prioridade', quando: haQuanto(r.ultima_em) })}
      vazio={<Estado icone="certo" titulo={faixa === 'post' ? 'Nenhum comentário com média 9 ou mais ainda' : 'Nenhum comentário nesta faixa'} texto="A lista se atualiza conforme as notas chegam." />}
      detalhe={r => <div className="a3-pilha">
        <div><Situacao tom={TOM_FAIXA[faixaDaNota(r)]}>{ROTULO_FAIXA[faixaDaNota(r)]}</Situacao></div>
        <Questao id={r.id_questao} info={info} />
        <dl className="a3-pares">
          <div><dt>Média</dt><dd>{mediaFormatada(r.media)}</dd></div>
          <div><dt>Notas</dt><dd>{inteiro(r.n)}{r.legado ? ` (${r.legado} do "ajudou" antigo)` : ''}</dd></div>
          <div><dt>Menor e maior</dt><dd>{r.minima} e {r.maxima}</dd></div>
          <div><dt>Última</dt><dd>{dataHora(r.ultima_em)}</dd></div>
        </dl>
        {Object.keys(r.motivos ?? {}).length > 0 && <p className="a3-mudo">Motivos: {Object.entries(r.motivos).map(([m, n]) => `${MOTIVOS[m] ?? m} (${n})`).join(', ')}</p>}
        {(r.versoes ?? []).length > 1 && <div>
          <p className="a3-rotulo">Antes e depois das reescritas</p>
          <ul className="a3-mudo" style={{ margin: 0, paddingLeft: "1.1rem" }}>{r.versoes.map(v => <li key={v.comentario_em ?? 'sem'}>{v.comentario_em ?? 'versão não registrada'}: média {mediaFormatada(v.media)} ({v.n} {v.n === 1 ? 'nota' : 'notas'})</li>)}</ul>
        </div>}
        <div className="a3-acoes-linha">
          <button type="button" className="a3-botao a3-botao--contorno" onClick={() => editar(r.id_questao)}><Icone nome="lapis" tamanho={15} />Editar questão</button>
          <a className="a3-botao a3-botao--fantasma" href={href(`/questao/${r.id_questao}`)} target="_blank" rel="noopener noreferrer"><Icone nome="externo" tamanho={15} />Ver como aluno</a>
        </div>
      </div>} />
  </div>
}

function Estatisticas({ lista, suspeitas, info, editar, minimo, definirMinimo }: { lista: Estatistica[]; suspeitas: boolean; info: (id: string) => Info; editar: (id: string) => void; minimo: number; definirMinimo: (n: number) => void }) {
  return <Mesa itens={lista} chave={s => s.id_questao}
    topo={<div className="a3-filtros" style={{ display: 'grid', gap: 10 }}>
      <Faixa>{suspeitas ? 'Acerto de primeira tentativa de 30% ou menos. Costuma ser gabarito desatualizado, enunciado ambíguo ou imagem trocada; às vezes é só a questão difícil que dá um bom post.' : 'Acerto de primeira tentativa de 95% ou mais. Boas para aquecer, fracas para diferenciar quem sabe.'}</Faixa>
      <label className="a3-filtro" style={{ justifySelf: 'start' }}>Respondidas por pelo menos<select value={minimo} onChange={e => definirMinimo(Number(e.target.value))}>{[3, 5, 10, 20].map(v => <option key={v} value={v}>{v} pessoas</option>)}</select></label>
    </div>}
    linha={s => ({ titulo: info(s.id_questao).titulo, sub: `${acertoPrimeira(s) ?? 0}% de primeira · ${inteiro(Number(s.pessoas))} pessoas`, ponto: suspeitas })}
    vazio={<Estado titulo="Nenhuma questão neste critério ainda" texto="Com mais gente respondendo, a lista aparece." />}
    detalhe={s => { const a = acertoPrimeira(s) ?? 0, hoje = porcentagem(Number(s.acertos_atual), Number(s.pessoas)) ?? 0; return <div className="a3-pilha">
      <Questao id={s.id_questao} info={info} />
      <div className="a3-duas-barras">
        <div><span className="a3-rotulo">Acerto de primeira</span><b className="num">{a}%</b><i style={{ '--p': `${a}%` } as React.CSSProperties} className={suspeitas ? 'ruim' : undefined} /></div>
        <div><span className="a3-rotulo">Acertam hoje (após revisões)</span><b className="num">{hoje}%</b><i style={{ '--p': `${hoje}%` } as React.CSSProperties} /></div>
      </div>
      <p className="a3-mudo">{inteiro(Number(s.pessoas))} pessoas responderam; {inteiro(Number(s.acertos_primeira))} acertaram e {inteiro(Number(s.erros_primeira))} erraram na primeira tentativa.</p>
      <div className="a3-acoes-linha"><button type="button" className="a3-botao" onClick={() => editar(s.id_questao)}><Icone nome="lapis" tamanho={15} />Revisar no editor</button>
        <a className="a3-botao a3-botao--fantasma" href={href(`/questao/${s.id_questao}`)} target="_blank" rel="noopener noreferrer"><Icone nome="externo" tamanho={15} />Ver como aluno</a></div>
    </div> }} />
}

function Temas({ stats }: { stats: Estatistica[] }) {
  const { indice } = usarIndice()
  const temas = useMemo(() => {
    if (!indice) return []
    const temaDe = new Map(indice.questoes.map(q => [q.id, q.t]))
    const soma = new Map<number, { acertos: number; erros: number; questoes: number }>()
    for (const s of stats) { const t = temaDe.get(s.id_questao); if (t === undefined) continue; const x = soma.get(t) ?? { acertos: 0, erros: 0, questoes: 0 }; x.acertos += Number(s.acertos_primeira); x.erros += Number(s.erros_primeira); x.questoes++; soma.set(t, x) }
    return [...soma].map(([t, v]) => ({ nome: indice.temas[t]?.nome ?? String(t), acerto: porcentagem(v.acertos, v.acertos + v.erros) ?? 0, respostas: v.acertos + v.erros, questoes: v.questoes })).filter(t => t.respostas >= 10).sort((a, b) => a.acerto - b.acerto)
  }, [indice, stats])
  if (!indice) return <Carregando linhas={6} />
  return <Painel titulo="Acerto de primeira tentativa por tema" descricao="Do mais fraco para o mais forte; só temas com 10 respostas ou mais. Onde reforçar comentários e o que rende post.">
    {temas.length === 0 ? <Estado compacto titulo="Ainda não há respostas suficientes por tema" /> :
      <Ranking formato={v => `${v}%`} itens={temas.map(t => ({ nome: t.nome, valor: t.acerto, detalhe: `${inteiro(t.respostas)} respostas · ${t.questoes} questões` }))} />}
  </Painel>
}
