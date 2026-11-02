import { useEffect, useMemo, useState } from 'react'
import { rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import { PLANOS, acertoAposRevisao, acertoReal, baixarCsv, data as dataAntiga, rotuloPagina, somarAcertos } from '../../componentes/admin/formatos'
import { servicoConhecido } from '../../componentes/admin/servicosConhecidos'
import { PLANOS_RECENTE_DIAS, textoPlanos, viuPlanos } from '../../componentes/admin/sinais'
import { usarPainel } from '../dados/painel'
import { DICA_FILTRO, MINIMO_PARA_ACERTO, ROTULO_FILTRO, acertoDe, nomeDe, passaFiltro, type LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { defParte, type FiltroPessoas } from '../rotas'
import { Icone } from '../ui/Icone'
import { combina, haQuanto, iniciais, inteiro, normalizar } from '../ui/formato'
import { Busca, Cabeca, Carregando, Estado, Faixa, Filtro, FiltrosAtivos, Selo, SeloQualidade } from '../ui/kit'
import { Tabela, type Coluna } from '../ui/tabela'

const FILTROS: FiltroPessoas[] = ['todos', 'online', 'hoje', 'ativos', 'novos', 'novos_parados', 'planos', 'assinantes', 'parados']

/** O valor só depois de `ms` sem mudar: a busca não refiltra a lista a cada tecla. */
function usarAdiado<T>(valor: T, ms: number) {
  const [adiado, definir] = useState(valor)
  useEffect(() => { const t = window.setTimeout(() => definir(valor), ms); return () => window.clearTimeout(t) }, [valor, ms])
  return adiado
}

/** Pessoas › Explorador: encontrar uma pessoa ou um grupo, entender o que fazem e agir. */
export default function Explorador() {
  const p = usarPainel()
  const nav = usarNav()
  const filtro = nav.estado.filtro
  const [busca, definirBusca] = useState('')
  const termo = normalizar(usarAdiado(busca, 250).trim())
  const parte = defParte('usuarios')
  const usuarios = p.usuarios
  const contagem = useMemo(() => Object.fromEntries(FILTROS.map(f => [f, usuarios?.filter(u => passaFiltro(u, f, p.sinais)).length ?? 0])) as Record<FiltroPessoas, number>, [usuarios, p.sinais])
  const totais = useMemo(() => { if (!usuarios) return null; const s = somarAcertos(usuarios); return { respondidas: usuarios.reduce((a, u) => a + u.respondidas, 0), real: acertoReal(s), revisao: acertoAposRevisao(s) } }, [usuarios])
  const visiveis = useMemo(() => (usuarios ?? []).filter(u => passaFiltro(u, filtro, p.sinais) && combina([u.nome, u.email, u.servico, servicoConhecido(u.servico, u.uf), u.cidade, p.sinais.get(u.id_usuario)?.locais_trabalho], termo)), [usuarios, filtro, p.sinais, termo])
  const ordemInicial = filtro === 'novos' || filtro === 'novos_parados' ? 'cadastro' : filtro === 'hoje' || filtro === 'online' ? 'visto' : filtro === 'planos' ? 'planos' : 'total'

  const colunas: Array<Coluna<LinhaUsuario>> = [
    { id: 'pessoa', titulo: 'Pessoa', ordem: u => nomeDe(u), celula: u => {
      const s = p.sinais.get(u.id_usuario)
      return <span className="a3-pessoa-cel">
        <span className="a3-avatar">{iniciais(u.nome ?? u.email)}{u.online && <i className="a3-ponto a3-ponto--vivo" />}</span>
        <span style={{ minWidth: 0, display: 'grid', gap: 3 }}>
          <span className="a3-nome">{nomeDe(u)}</span>
          <span className="a3-sub">{u.email ?? 'conta sem e-mail'}</span>
          <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {u.administrador && <Selo solido>Admin</Selo>}
            {u.plano_vigente && <Selo tom="ok">{PLANOS[u.plano_vigente] ?? u.plano_vigente}</Selo>}
            {s && viuPlanos(s) && !u.plano_vigente && <Selo tom={viuPlanos(s, PLANOS_RECENTE_DIAS) ? 'aviso' : undefined}>{textoPlanos(s)}</Selo>}
          </span>
        </span>
      </span>
    } },
    { id: 'perfil', titulo: 'Perfil', soLargo: true, celula: u => <span style={{ display: 'grid' }}>
      <span>{u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : <span className="fraco">etapa não informada</span>}</span>
      <span className="a3-sub">{[u.servico, [u.cidade, u.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ') || (u.provas ? u.provas.split(',').map(rotuloProva).join(', ') : '')}</span>
    </span> },
    { id: 'agora', titulo: 'Onde está', soLargo: true, celula: u => u.pagina ? <span style={{ display: 'grid' }}><span>{rotuloPagina(u.pagina)}</span><span className="a3-sub">{u.online ? 'agora' : haQuanto(u.pagina_em)}</span></span> : <span className="fraco">sem registro</span> },
    { id: 'hoje', titulo: 'Hoje', numero: true, rotuloCelular: 'Hoje', celula: u => <span className={'a3-pilula' + (u.respondidas_hoje ? (u.plano_vigente ? ' a3-pilula--assinante' : ' a3-pilula--gratis') : '')}>{inteiro(u.respondidas_hoje ?? 0)}</span>, ordem: u => u.respondidas_hoje ?? 0 },
    { id: 'semana', titulo: 'Semana', numero: true, rotuloCelular: 'Semana', celula: u => inteiro(u.respondidas_7d), ordem: u => u.respondidas_7d },
    { id: 'total', titulo: 'Total', numero: true, rotuloCelular: 'Total', celula: u => <b className="num" style={{ fontSize: 15 }}>{inteiro(u.respondidas)}</b>, ordem: u => u.respondidas },
    { id: 'acerto', titulo: 'Acerto real', numero: true, rotuloCelular: 'Acerto', celula: u => { const a = acertoDe(u); return a === null ? '—' : <span title={u.acertos + u.erros < MINIMO_PARA_ACERTO ? 'poucas respostas' : undefined} className={u.acertos + u.erros < MINIMO_PARA_ACERTO ? 'fraco' : undefined}>{a}%</span> },
      ordem: u => u.acertos + u.erros >= MINIMO_PARA_ACERTO ? acertoDe(u) ?? -1 : -1 },
    { id: 'visto', titulo: 'Último sinal', numero: true, rotuloCelular: 'Visto', celula: u => u.online ? <span style={{ color: 'var(--a3-ok)', fontWeight: 500 }}>agora</span> : haQuanto(u.visto_em ?? u.ultima_atividade), ordem: u => u.online ? '9' : (u.visto_em ?? u.ultima_atividade ?? '') },
    { id: 'cadastro', titulo: 'Conta', numero: true, soLargo: true, celula: u => haQuanto(u.criado_em), ordem: u => u.criado_em },
    { id: 'planos', titulo: 'Viu planos', numero: true, soLargo: true, celula: u => { const s = p.sinais.get(u.id_usuario); return s && viuPlanos(s) ? haQuanto(s.planos_ultima) : <span className="fraco">—</span> }, ordem: u => p.sinais.get(u.id_usuario)?.planos_ultima ?? '' },
  ]
  const exportar = () => baixarCsv(`ortoquestoes-pessoas-${filtro}-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Nome', 'E-mail', 'Etapa', 'Provas de interesse', 'Serviço', 'Outros locais de trabalho', 'Viu os planos (30 dias)', 'Flashcards únicos', 'UF', 'Conta criada', 'Questões', 'Hoje', 'Acerto real, 1ª tentativa (%)', 'Acerto após revisão (%)', 'Na semana', 'Última atividade', 'Plano'],
    visiveis.map(u => { const s = p.sinais.get(u.id_usuario); return [u.nome, u.email, u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : '', (u.provas ?? '').split(',').filter(Boolean).map(rotuloProva).join(', '), u.servico, s?.locais_trabalho ?? '', s?.planos_vezes || '', s?.flashcards_unicos || '', u.uf, dataAntiga(u.criado_em), u.respondidas, u.respondidas_hoje ?? '', acertoReal(u), acertoAposRevisao(u), u.respondidas_7d, u.ultima_atividade ? dataAntiga(u.ultima_atividade) : '', u.plano_vigente ? PLANOS[u.plano_vigente] : ''] }))

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Pessoas" titulo={parte.rotulo} pergunta={parte.pergunta}
      extra={totais && <p className="a3-mudo" style={{ fontSize: 14 }}>{inteiro(usuarios?.length)} contas · {inteiro(totais.respondidas)} questões respondidas{totais.real !== null ? ` · ${totais.real}% de acerto real (1ª tentativa)` : ''}{totais.revisao !== null ? ` · ${totais.revisao}% após revisão` : ''}</p>}
      acoes={<button type="button" className="a3-botao a3-botao--contorno" onClick={exportar} disabled={!visiveis.length}><Icone nome="baixar" tamanho={15} />CSV deste recorte</button>} />

    <section className="a3-painel" aria-label="Lista de pessoas">
      <div className="a3-filtros">
        <Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar por nome, e-mail, serviço ou cidade" />
      </div>
      <div className="a3-filtros" style={{ paddingTop: 0 }} role="group" aria-label="Segmentos">
        {FILTROS.map(f => <Filtro key={f} ativo={filtro === f} aoClicar={() => nav.ajustar({ filtro: f })} contagem={contagem[f]}>{ROTULO_FILTRO[f]}</Filtro>)}
      </div>
      <FiltrosAtivos aoLimpar={() => { definirBusca(''); nav.ajustar({ filtro: 'todos' }) }} itens={[
        ...(filtro !== 'todos' ? [{ id: 'f', rotulo: ROTULO_FILTRO[filtro], remover: () => nav.ajustar({ filtro: 'todos' }) }] : []),
        ...(busca.trim() ? [{ id: 'b', rotulo: `“${busca.trim()}”`, remover: () => definirBusca('') }] : []),
      ]} />
      {DICA_FILTRO[filtro] && <div style={{ padding: '0 20px 14px' }}><Faixa>{DICA_FILTRO[filtro]}{filtro === 'planos' && !p.sinaisQ.dados ? ' Para ver quem abriu os planos, cole no Supabase a parte 25.' : ''}</Faixa></div>}
      {!usuarios ? <div style={{ padding: 20 }}>{p.usuariosQ.erro ? <Estado tipo="erro" titulo="A lista de pessoas não carregou" texto={p.erroDados} /> : <Carregando linhas={8} texto="Carregando as pessoas…" />}</div> :
        <Tabela key={`${filtro}-${ordemInicial}`} rotulo="Pessoas" linhas={visiveis} colunas={colunas} chave={u => u.id_usuario} porPagina={50}
          ordemInicial={{ coluna: ordemInicial, sentido: 'desc' }} aoAbrir={u => nav.abrirPessoa(u.id_usuario)}
          vazio={<div style={{ padding: 20 }}><Estado icone="pessoas" titulo="Ninguém neste recorte" texto={busca ? 'Tente outro nome, e-mail, serviço ou cidade.' : 'Nenhuma conta passa por este filtro agora.'} /></div>} />}
      {usuarios && <div className="a3-paginacao" style={{ borderTop: 0 }}><span><SeloQualidade q="confirmado" /> Inclui quem não aparece no ranking público. Acerto com menos de {MINIMO_PARA_ACERTO} respostas aparece apagado.</span></div>}
    </section>
  </div>
}
