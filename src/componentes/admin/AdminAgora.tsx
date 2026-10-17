import { useEffect, useMemo, useState } from 'react'
import { Icone } from '../Icone'
import { AoVivo, ativoHoje, novoParado, type FiltroUsuarios, type LinhaUsuario } from './AdminUsuarios'
import { Comparacao } from './Comparacao'
import { diaSP, estudoDeHoje, type DiaSerie } from './estudoHoje'
import { haQuanto, haQuantoTempo, registrarTitulosResumos, resumoDaPagina, tituloResumo } from './formatos'
import { carregarIndiceBiblioteca } from '../../biblioteca/conteudo'
import type { SinalUsuario } from './sinais'
import { usarRpc } from './usarRpc'
import type { Aba } from './secoes'

/** O que resumo_admin devolve (contagens do servidor). */
export interface ResumoAdmin {
  online_agora: number
  usuarios: number; novos_7d: number
  ativos_hoje: number; ativos_7d: number; ativos_30d: number
  respondidas_hoje: number; respondidas_7d: number
  assinantes_vigentes: number
}

/**
 * Agora: o painel de observação (pedido do Tales, 17/10/2026). Uma fonte só para "online" e "ativos
 * hoje", sem repetir em outras partes:
 * 1. Online agora: quem está com o site aberto e o que está fazendo (página, questão, resumo).
 * 2. Hoje: pessoas que estudaram, questões e flashcards (comparados a ontem), contas novas, semana.
 * 3. Pede atenção: avisos de pagamento com problema, conteúdo para revisar, novos que pararam.
 * 4. Listas: estudaram hoje, recém-cadastrados, mais ativos na semana e a Biblioteca de resumos hoje.
 * Atualiza sozinho: a lista de pessoas a cada 15 s, os números do servidor a cada 20 s e o "online"
 * refeito a cada 10 s pelo último sinal de cada aparelho (feito no painel).
 */
export function AdminAgora({ conta, resumo, usuarios, atualizadoEm, errosPagamento, pendenciasConteudo, irPara, verUsuarios }: {
  conta: string | undefined; resumo: ResumoAdmin | null; usuarios: LinhaUsuario[] | null; atualizadoEm: number | null
  errosPagamento: number; pendenciasConteudo: number | null; irPara: (aba: Aba) => void; verUsuarios: (filtro: FiltroUsuarios) => void
}) {
  const { hoje, novos, semana, parados, novosHoje } = useMemo(() => {
    const lista = usuarios ?? []
    const diaHoje = diaSP(Date.now())
    return {
      hoje: lista.filter(ativoHoje).sort((a, b) => new Date(b.ultima_atividade ?? 0).getTime() - new Date(a.ultima_atividade ?? 0).getTime()),
      novos: lista.filter(u => Date.now() - new Date(u.criado_em).getTime() < 14 * 86_400_000).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()),
      semana: lista.filter(u => u.respondidas_7d > 0).sort((a, b) => b.respondidas_7d - a.respondidas_7d).slice(0, 5),
      parados: lista.filter(novoParado).length,
      novosHoje: lista.filter(u => diaSP(u.criado_em) === diaHoje).length,
    }
  }, [usuarios])
  // Estudo de hoje x ontem (São Paulo): série diária (7 dias, o mínimo da RPC) e sinais de flashcards, das consultas que já existem.
  const serieQ = usarRpc<DiaSerie[]>(conta, 'serie_diaria_admin', { p_dias: 7 }, { atualizarCada: 120_000 })
  const sinaisQ = usarRpc<SinalUsuario[]>(conta, 'sinais_usuarios_admin', {}, { atualizarCada: 60_000 })
  const estudo = useMemo(() => estudoDeHoje({
    serie: Array.isArray(serieQ.dados) ? serieQ.dados : null, usuarios,
    sinais: Array.isArray(sinaisQ.dados) ? sinaisQ.dados : null,
  }), [serieQ.dados, usuarios, sinaisQ.dados])
  const n = (v: number | null | undefined) => v === null || v === undefined ? '—' : v.toLocaleString('pt-BR')
  const dataCurta = (dia: string) => dia.split('-').reverse().slice(0, 2).join('/')
  const carregandoSerie = serieQ.carregando && !serieQ.dados
  // Sem a lista de pessoas (migração antiga), os números do servidor seguram o lugar.
  const estudaram = estudo.estudaram ?? resumo?.ativos_hoje
  const questoesHoje = estudo.questoes?.hoje ?? resumo?.respondidas_hoje
  const tudoCerto = !errosPagamento && !pendenciasConteudo && !parados

  return <div className="empilha-2 adm-agora">
    {usuarios ? <AoVivo usuarios={usuarios} atualizadoEm={atualizadoEm} />
      : <section className="adm-aovivo"><header><h3><span className="adm-online" aria-hidden="true" />Online agora <span className="adm-aovivo__total numerico">{n(resumo?.online_agora)}</span></h3><small>a lista de quem está online aparece depois da migração nova</small></header></section>}

    <section className="adm-estudo" aria-labelledby="adm-estudo-titulo">
      <header className="adm-estudo__cabeca">
        <h2 id="adm-estudo-titulo">Hoje</h2>
        <small>{dataCurta(estudo.hoje)}, horário de São Paulo · comparado com ontem ({dataCurta(estudo.ontem)}, dia inteiro){carregandoSerie ? ' · carregando…' : ''}</small>
      </header>
      <div className="adm-estudo__numeros adm-estudo__numeros--seis">
        <button type="button" className="adm-estudo__item adm-estudo__item--destaque" onClick={() => verUsuarios('hoje')}>
          <span>Pessoas que estudaram</span><strong>{n(estudaram)}</strong>
          <small>questões ou flashcards · ver quem</small>
        </button>
        <div className="adm-estudo__item">
          <span>Fizeram questões</span><strong>{n(estudo.pessoasQuestoes?.hoje)}</strong>
          {estudo.pessoasQuestoes ? <Comparacao atual={estudo.pessoasQuestoes.hoje} anterior={estudo.pessoasQuestoes.ontem} base="ontem" /> : <small>série diária indisponível</small>}
        </div>
        <div className="adm-estudo__item">
          <span>Questões respondidas</span><strong>{n(questoesHoje)}</strong>
          {estudo.questoes ? <Comparacao atual={estudo.questoes.hoje} anterior={estudo.questoes.ontem} base="ontem" /> : <small>série diária indisponível</small>}
          {resumo && <small>{n(resumo.respondidas_7d)} na semana</small>}
        </div>
        <div className="adm-estudo__item">
          <span>Usaram flashcards</span><strong>{n(estudo.flashcards)}</strong>
          <small>{estudo.flashcards === null ? 'cole a parte 25 para ver' : 'sem comparação: o painel guarda só o último uso'}</small>
        </div>
        <button type="button" className="adm-estudo__item" onClick={() => verUsuarios('novos')}>
          <span>Contas novas hoje</span><strong>{usuarios ? n(novosHoje) : '—'}</strong>
          <small>{resumo ? `+${n(resumo.novos_7d)} em 7 dias · ${n(resumo.usuarios)} no total` : 'ver quem chegou'}</small>
        </button>
        <button type="button" className="adm-estudo__item" onClick={() => verUsuarios('ativos')}>
          <span>Ativos na semana</span><strong>{n(resumo?.ativos_7d)}</strong>
          <small>{resumo ? `${n(resumo.ativos_30d)} nos últimos 30 dias · ver nomes` : 'ver nomes'}</small>
        </button>
      </div>
    </section>

    <section className="adm-atencao" aria-labelledby="adm-atencao-titulo">
      <h2 id="adm-atencao-titulo" className="adm-atencao__titulo">{tudoCerto ? <><Icone nome="certo" tamanho={16} /> Nada pedindo atenção</> : 'Pede atenção'}</h2>
      <div className="adm-atencao__itens">
        <button type="button" className={'adm-atencao__item' + (errosPagamento ? ' adm-atencao__item--alerta' : '')} onClick={() => irPara('pagamentos')}>
          <strong className="numerico">{errosPagamento}</strong><span>avisos de pagamento com problema</span>
        </button>
        <button type="button" className={'adm-atencao__item' + (pendenciasConteudo ? ' adm-atencao__item--alerta' : '')} onClick={() => irPara('conteudo')}>
          <strong className="numerico">{pendenciasConteudo ?? '—'}</strong><span>relatos e "não ajudou" para revisar</span>
        </button>
        <button type="button" className={'adm-atencao__item' + (parados ? ' adm-atencao__item--aviso' : '')} onClick={() => verUsuarios('novos_parados')}>
          <strong className="numerico">{usuarios ? parados : '—'}</strong><span>novos que pararam (um recado traz de volta)</span>
        </button>
      </div>
    </section>

    <div className="adm-duas">
      <section className="adm-secao empilha">
        <div className="adm-secao__cabeca"><h2>Estudaram hoje <span className="adm-contagem">{hoje.length}</span></h2><button type="button" className="adm-link" onClick={() => verUsuarios('hoje')}>Ver todos <Icone nome="direita" tamanho={14} /></button></div>
        {!usuarios ? <p className="adm-vazio">Disponível depois da migração nova.</p> : hoje.length === 0 ? <p className="adm-vazio">Ninguém respondeu questões hoje ainda.</p> : <ol className="adm-mini">
          {hoje.slice(0, 8).map(u => <li key={u.id_usuario}><span className="adm-mini__nome"><span>{u.online && <i className="adm-online" aria-label="Online agora" />}{u.nome ?? u.email}</span><small>{[u.servico, haQuanto(u.ultima_atividade)].filter(Boolean).join(' · ')}</small></span><span className="adm-mini__valor numerico">{u.respondidas_hoje ?? u.respondidas_7d}<small>{u.respondidas_hoje !== undefined ? 'hoje' : 'na semana'}</small></span></li>)}
        </ol>}
      </section>
      <section className="adm-secao empilha">
        <div className="adm-secao__cabeca"><h2>Recém-cadastrados <span className="adm-contagem">{novos.length}</span></h2><button type="button" className="adm-link" onClick={() => verUsuarios('novos')}>Ver todos <Icone nome="direita" tamanho={14} /></button></div>
        {!usuarios ? <p className="adm-vazio">Disponível depois da migração nova.</p> : novos.length === 0 ? <p className="adm-vazio">Ninguém se cadastrou nas últimas duas semanas.</p> : <ol className="adm-mini">
          {novos.slice(0, 8).map(u => <li key={u.id_usuario}><span className="adm-mini__nome">{u.nome ?? u.email}<small>{[u.servico, `chegou ${haQuanto(u.criado_em)}`].filter(Boolean).join(' · ')}</small></span><span className={'adm-selo ' + (u.respondidas === 0 ? 'adm-selo--ruim' : u.respondidas < 10 ? 'adm-selo--neutro' : 'adm-selo--ok')}>{u.respondidas === 0 ? 'não começou' : `${u.respondidas} questões`}</span></li>)}
        </ol>}
      </section>
    </div>

    <div className="adm-duas">
      <section className="adm-secao empilha">
        <div className="adm-secao__cabeca"><h2>Mais ativos na semana</h2><button type="button" className="adm-link" onClick={() => verUsuarios('ativos')}>Ver todos <Icone nome="direita" tamanho={14} /></button></div>
        {!usuarios ? <p className="adm-vazio">Disponível depois da migração nova.</p> : semana.length === 0 ? <p className="adm-vazio">Ninguém respondeu questões nos últimos 7 dias.</p> : <ol className="adm-mini">
          {semana.map(u => <li key={u.id_usuario}><span className="adm-mini__nome">{u.nome ?? u.email}</span><span className="adm-mini__valor numerico">{u.respondidas_7d}</span></li>)}
        </ol>}
      </section>
      <NaBiblioteca usuarios={usuarios} />
    </div>
  </div>
}

/**
 * Biblioteca de resumos hoje (pedido do Tales, 16/10/2026): quantos estão lendo agora e em que tema,
 * e quem passou por um resumo hoje. Quem está lendo agora aparece em "Online agora", com o título do
 * resumo e quanto já leu; aqui fica o quadro por tema e o dia. Vem do sinal do aparelho, sem SQL novo.
 */
function NaBiblioteca({ usuarios }: { usuarios: LinhaUsuario[] | null }) {
  const [, definirTitulos] = useState(0)
  useEffect(() => { carregarIndiceBiblioteca().then((i) => { registrarTitulosResumos(i.capitulos); definirTitulos((n) => n + 1) }).catch(() => undefined) }, [])
  const { agora, hoje, porTema } = useMemo(() => {
    const naBib = (u: LinhaUsuario) => (u.pagina ?? '').startsWith('/resumos')
    const lista = (usuarios ?? []).filter(naBib)
    const agora = lista.filter((u) => u.online)
    const hoje = lista.filter((u) => !u.online && u.pagina_em && diaSP(u.pagina_em) === diaSP(Date.now()))
    const porTema = new Map<string, number>()
    for (const u of [...agora, ...hoje]) { const c = resumoDaPagina(u.pagina); if (c) porTema.set(c, (porTema.get(c) ?? 0) + 1) }
    return { agora, hoje, porTema: [...porTema].sort((a, b) => b[1] - a[1]) }
  }, [usuarios])
  const linha = (u: LinhaUsuario) => {
    const c = resumoDaPagina(u.pagina)
    const extra = (u.pagina ?? '').split(' · ')[1]
    const onde = c ? tituloResumo(c) : u.pagina === '/resumos/caderno' ? 'Caderno de estudo' : u.pagina === '/resumos/frases' ? 'Frases que caem' : 'Estante (escolhendo um resumo)'
    return <li key={u.id_usuario}><span className="adm-mini__nome"><span>{u.nome ?? u.email}</span><small>{[onde, extra, haQuantoTempo(u.pagina_em)].filter(Boolean).join(' · ')}</small></span></li>
  }
  return <section className="adm-secao empilha" aria-labelledby="adm-bib-titulo">
    <div className="adm-secao__cabeca"><h2 id="adm-bib-titulo">Biblioteca de resumos hoje <span className="adm-contagem">{agora.length} lendo agora</span></h2></div>
    {!usuarios ? <p className="adm-vazio">Disponível depois da migração nova.</p> : agora.length === 0 && hoje.length === 0 ? <p className="adm-vazio">Ninguém passou por um resumo hoje ainda. Quem abrir aparece em "Online agora", com o tema e quanto já leu.</p> : <>
      {porTema.length > 0 && <p className="adm-nota">{porTema.map(([c, n]) => `${tituloResumo(c)}: ${n}`).join(' · ')}</p>}
      {hoje.length > 0 ? <ol className="adm-mini">{hoje.slice(0, 12).map(linha)}</ol> : <p className="adm-vazio">Quem está lendo agora aparece em "Online agora".</p>}
    </>}
  </section>
}
