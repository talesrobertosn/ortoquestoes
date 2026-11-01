import { useMemo, useState } from 'react'
import { recurso } from '../../config'
import { Icone } from '../Icone'
import { AdminFichaUsuario } from './AdminFichaUsuario'
import { novoParado, type LinhaUsuario } from './AdminUsuarios'
import { Atividade } from './AoVivo'
import { quadroDoDia, type FunilServidor, type Numero } from './agora'
import type { ResumoAdmin } from './AdminAgora'
import type { DiaSerie } from './estudoHoje'
import { haQuantoTempo } from './formatos'
import {
  ROTULO_GRUPO, ROTULO_SEVERIDADE, cortarPeriodos, filaDeAtencao, fraseDoEstado, numerosDoPeriodo, receitaDoPeriodo,
  type GrupoAtencao, type ItemAtencao,
} from './metricas'
import { Atualizado, ControlePeriodo, GraficoSerie, Indicador, Legenda, QuadroGrafico, SeloQualidade, inteiro, reais, reaisCurto } from './PainelDados'
import type { AssinaturaBase, CobrancaReal } from './receita'
import { vigentesPorPessoa } from './receita'
import type { Periodo } from './secoes'
import type { SinalUsuario } from './sinais'
import { CINCO_MIN, usarRpc } from './usarRpc'
import { rotuloPlano } from './rotulos'

export interface Destino { aba: string; filtro?: string; vista?: string }

interface FunilCompleto extends FunilServidor { responderam: number; passaram_50: number; passaram_500: number; assinaram: number }

const ESTUDANDO = /^\/(sessao|flashcards|resumos|simulado|questao|revisao|erros|caderno|cripta|treinar)/
const dataCurta = (dia: string) => dia.slice(8, 10) + '/' + dia.slice(5, 7)
const dataLonga = (dia: string) => new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })

/**
 * Comando › Visão geral (Mesa de Comando do Atlas, 01/11/2026). Responde, na primeira dobra: o site está
 * saudável hoje, o que mudou no período e o que pede ação agora. Abaixo, seis áreas, cada uma levando à
 * investigação ou à fila correspondente. Nenhum número é inventado: fonte que falha vira "Indisponível".
 */
export function AdminComando({ conta, periodo, aoMudarPeriodo, usuarios, usuariosEm, resumo, assinaturas, cobrancas, cobrancasFalharam, eventos, lidosPagamento, pendenciasConteudo, fontesIndisponiveis, irPara, atualizadoEm, atualizando }: {
  conta: string | undefined; periodo: Periodo; aoMudarPeriodo: (p: Periodo) => void
  usuarios: LinhaUsuario[] | null; usuariosEm: number | null; resumo: ResumoAdmin | null
  assinaturas: AssinaturaBase[] | null; cobrancas: CobrancaReal[] | null; cobrancasFalharam: boolean
  eventos: Array<{ id: number; status_processamento: string; recebido_em: string }> | null; lidosPagamento: Set<string>
  pendenciasConteudo: number | null; fontesIndisponiveis: string[]; irPara: (d: Destino) => void
  atualizadoEm: number | null; atualizando: boolean
}) {
  const serieQ = usarRpc<DiaSerie[]>(conta, 'serie_diaria_admin', { p_dias: periodo * 2 }, { atualizarCada: CINCO_MIN })
  const funilQ = usarRpc<FunilCompleto[]>(conta, 'funil_admin', {}, { atualizarCada: CINCO_MIN })
  const sinaisQ = usarRpc<SinalUsuario[]>(conta, 'sinais_usuarios_admin', {}, { atualizarCada: CINCO_MIN })
  const [ficha, definirFicha] = useState<LinhaUsuario | null>(null)

  const p = useMemo(() => cortarPeriodos(Array.isArray(serieQ.dados) ? serieQ.dados : null, periodo), [serieQ.dados, periodo])
  const num = p ? numerosDoPeriodo(p) : null
  const receita = useMemo(() => assinaturas && !cobrancasFalharam ? receitaDoPeriodo(assinaturas, cobrancas, periodo) : null, [assinaturas, cobrancas, cobrancasFalharam, periodo])
  const assinantes = assinaturas ? vigentesPorPessoa(assinaturas).length : null
  const quadro = useMemo(() => quadroDoDia({
    usuarios, sinais: Array.isArray(sinaisQ.dados) ? sinaisQ.dados : null, serie: Array.isArray(serieQ.dados) ? serieQ.dados : null,
    resumo, funil: funilQ.dados?.[0] ?? null, assinaturas, cobrancas,
  }), [usuarios, sinaisQ.dados, serieQ.dados, resumo, funilQ.dados, assinaturas, cobrancas])
  const parados = useMemo(() => usuarios ? usuarios.filter(novoParado) : null, [usuarios])
  const fontes = [...fontesIndisponiveis, ...(serieQ.erro && !serieQ.dados ? ['Série diária'] : []), ...(funilQ.erro && !funilQ.dados ? ['Funil'] : [])]
  const fila = useMemo(() => filaDeAtencao({ eventos, lidosPagamento, assinaturas, pendenciasConteudo, novosParados: parados, fontesIndisponiveis: fontes }),
    // fontes muda de identidade a cada render; a lista de nomes basta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventos, lidosPagamento, assinaturas, pendenciasConteudo, parados, fontes.join('|')])
  const online = usuarios ? usuarios.filter(u => u.online) : null
  const onlineN = online?.length ?? resumo?.online_agora ?? null
  const criticos = fila.filter(i => i.severidade === 'critica').length
  const frase = fraseDoEstado({ online: onlineN, estudaramHoje: quadro.numeros.estudaram.hoje, questoes: num?.questoes ?? null, dias: periodo, criticos, pendentes: fila.length })
  const base = `aos ${periodo} dias anteriores`
  const rotulos = (p?.atual ?? []).map(d => ({ longo: dataLonga(d.dia), curto: dataCurta(d.dia) }))
  const carregandoSerie = serieQ.carregando && !serieQ.dados

  return <div className="adm-comando">
    <header className="adm-comando__topo">
      <div className="adm-comando__texto">
        <p className="adm-trilha"><span>Painel</span><span aria-hidden="true">›</span><span>Comando</span></p>
        <h1>Estado do OrtoQuestões</h1>
        <p className="adm-comando__frase" aria-live="off">{frase}</p>
        <div className="adm-comando__controles">
          <ControlePeriodo periodo={periodo} aoMudar={aoMudarPeriodo} />
          <Atualizado em={atualizadoEm} carregando={atualizando} />
        </div>
      </div>
      <div className="adm-comando__cena" aria-hidden="true">
        <picture>
          <source media="(max-width: 40rem)" srcSet={recurso('pixel/admin/observatorio-960.webp')} />
          <img src={recurso('pixel/admin/observatorio.webp')} alt="" width={1440} height={480} decoding="async" />
        </picture>
      </div>
    </header>

    <section className="adm-comando__kpis" aria-label={`Indicadores dos últimos ${periodo} dias`}>
      <Indicador metrica="estudaramDia" escala="grande" valor={num ? inteiro(num.estudaramDia.atual) : carregandoSerie ? '…' : null} variacao={num?.estudaramDia} base={base}
        nota={resumo ? `${inteiro(resumo.ativos_7d)} pessoas diferentes em 7 dias · ${inteiro(resumo.ativos_30d)} em 30` : undefined}
        tendencia={p?.atual.map(d => d.ativos)} destino={{ rotulo: 'Quem estudou hoje', aoAbrir: () => irPara({ aba: 'agora' }) }} />
      <Indicador metrica="questoes" valor={num ? inteiro(num.questoes.atual) : carregandoSerie ? '…' : null} variacao={num?.questoes} base={base}
        tendencia={p?.atual.map(d => d.respostas)} destino={{ rotulo: 'Análise de uso', aoAbrir: () => irPara({ aba: 'crescimento' }) }} />
      <Indicador metrica="cadastros" valor={num ? inteiro(num.cadastros.atual) : carregandoSerie ? '…' : null} variacao={num?.cadastros} base={base}
        tendencia={p?.atual.map(d => d.cadastros)} destino={{ rotulo: 'Ver os novos', aoAbrir: () => irPara({ aba: 'usuarios', filtro: 'novos' }) }} />
      <Indicador metrica="receitaConfirmada" valor={receita ? reais(receita.confirmada.atual) : assinaturas === null && !cobrancasFalharam ? '…' : null} variacao={receita?.confirmada} base={base} formato={reais}
        nota={receita && receita.reconstruida > 0 ? <>+ {reais(receita.reconstruida)} reconstruído, fora deste número</> : receita ? 'Nada reconstruído no período' : undefined}
        tendencia={receita?.porDia.map(d => d.confirmada)} destino={{ rotulo: 'Resultados da receita', aoAbrir: () => irPara({ aba: 'financeiro' }) }} />
      <Indicador metrica="assinantes" valor={assinantes === null ? (assinaturas === null ? '…' : null) : inteiro(assinantes)}
        nota={receita ? `${receita.novas.atual} ${receita.novas.atual === 1 ? 'primeira assinatura' : 'primeiras assinaturas'} no período (antes: ${receita.novas.anterior ?? '—'})` : undefined}
        destino={{ rotulo: 'Assinaturas', aoAbrir: () => irPara({ aba: 'assinaturas' }) }} />
    </section>

    <div className="adm-comando__dobra">
      <QuadroGrafico titulo="Questões respondidas por dia" pergunta={`O estudo dos últimos ${periodo} dias, com a linha dos ${periodo} dias anteriores alinhada dia a dia.`}
        fonte="serie_diaria_admin · dias de São Paulo · hoje ainda em andamento" qualidade="confirmado"
        legenda={<Legenda series={[{ id: 'a', nome: `Últimos ${periodo} dias`, estilo: 'a' }, ...(p?.anterior ? [{ id: 'b', nome: `${periodo} dias anteriores`, estilo: 'b' as const }] : [])]} />}
        estado={carregandoSerie ? { tipo: 'carregando', texto: 'Carregando a série diária…' } : !p ? { tipo: 'erro', texto: 'A série diária está indisponível agora; nada foi trocado por zero.', tentar: () => void serieQ.recarregar() } : null}
        tabela={p ? { cabecalho: ['Dia', 'Questões', 'Pessoas', 'Cadastros', ...(p.anterior ? ['Questões (período anterior)'] : [])], linhas: p.atual.map((d, i) => [dataLonga(d.dia), inteiro(d.respostas), inteiro(d.ativos), inteiro(d.cadastros), ...(p.anterior ? [inteiro(p.anterior[i].respostas)] : [])]) } : null}>
        {p && <GraficoSerie rotulo={`Questões respondidas por dia nos últimos ${periodo} dias. Use as setas para ler dia a dia.`} rotulos={rotulos}
          barras={[{ id: 'a', nome: 'Questões', estilo: 'a', valores: p.atual.map(d => d.respostas) }]}
          linha={p.anterior ? { id: 'b', nome: 'Período anterior', estilo: 'b', valores: p.anterior.map(d => d.respostas) } : null} />}
      </QuadroGrafico>

      <section className="adm-prioridades" aria-labelledby="adm-prioridades-titulo">
        <h2 id="adm-prioridades-titulo">{fila.length ? 'Pede ação agora' : 'Nada pedindo ação'}</h2>
        {fila.length === 0 ? <p className="adm-prioridades__calma"><Icone nome="certo" tamanho={18} /> Sem falhas de pagamento, pendências de conteúdo ou novos parados. A fila se atualiza sozinha.</p>
          : <ol className="adm-prioridades__lista">{fila.slice(0, 3).map(item => <ItemFila key={item.id} item={item} irPara={irPara} />)}</ol>}
        {fila.length > 3 && <a className="adm-link" href="#comando-fila" onClick={e => { e.preventDefault(); document.getElementById('comando-fila')?.scrollIntoView({ behavior: 'smooth' }) }}>Ver a fila inteira ({fila.length}) <Icone nome="baixo" tamanho={14} /></a>}
      </section>
    </div>

    <div className="adm-comando__areas">
      <section className="adm-area-c" aria-labelledby="c-agora">
        <header className="adm-area-c__cabeca"><h2 id="c-agora"><span className="adm-online" aria-hidden="true" />Acontecendo agora</h2>
          <button type="button" className="adm-link" onClick={() => irPara({ aba: 'agora' })}>Hoje em detalhe <Icone nome="direita" tamanho={14} /></button></header>
        <p className="adm-area-c__nota">Online = sinal do aparelho nos últimos 5 minutos; o painel refaz a conta a cada 10 s e busca a lista a cada 5 min.{usuariosEm ? ` Lista de ${new Date(usuariosEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : ''}</p>
        <dl className="adm-contas">
          <Conta rotulo="Online" valor={onlineN} />
          <Conta rotulo="Estudando agora" valor={online ? online.filter(u => ESTUDANDO.test(u.pagina ?? '')).length : null} nota="numa sessão, flashcard, resumo ou simulado" />
          <Conta rotulo="Visitando sem estudar" valor={online ? online.filter(u => !ESTUDANDO.test(u.pagina ?? '')).length : null} />
          <Conta rotulo="Cadastros em 24 h" valor={usuarios ? usuarios.filter(u => Date.now() - new Date(u.criado_em).getTime() < 86_400_000).length : null} />
        </dl>
        {online && online.length > 0 ? <ul className="adm-vivos">
          {[...online].sort((a, b) => (b.visto_em ?? '').localeCompare(a.visto_em ?? '')).slice(0, 6).map(u => <li key={u.id_usuario}>
            <button type="button" className="adm-vivos__quem" onClick={() => definirFicha(u)}><strong>{u.nome ?? 'Sem nome'}</strong></button>
            <span className="adm-vivos__faz">{u.pagina ? <Atividade u={u} /> : 'página ainda não registrada'}</span>
            <small>{u.pagina_em ? haQuantoTempo(u.pagina_em) : ''}</small>
          </li>)}
        </ul> : <p className="adm-vazio">{online ? 'Ninguém online neste momento.' : 'A lista de quem está online está indisponível.'}</p>}
        {online && online.length > 6 && <button type="button" className="adm-link" onClick={() => irPara({ aba: 'usuarios', filtro: 'online' })}>Mais {online.length - 6} online <Icone nome="direita" tamanho={14} /></button>}
      </section>

      <section className="adm-area-c" aria-labelledby="c-estudo">
        <header className="adm-area-c__cabeca"><h2 id="c-estudo">Estudo de hoje</h2>
          <button type="button" className="adm-link" onClick={() => irPara({ aba: 'agora' })}>Quem estudou <Icone nome="direita" tamanho={14} /></button></header>
        <p className="adm-area-c__nota">Hoje (em andamento) contra ontem inteiro, pelo relógio de São Paulo. Pessoas são únicas; questões são eventos.</p>
        <table className="adm-hoje">
          <thead><tr><th scope="col">Medida</th><th scope="col">Hoje</th><th scope="col">Ontem</th></tr></thead>
          <tbody>
            <LinhaHoje rotulo="Pessoas que estudaram" n={quadro.numeros.estudaram} />
            <LinhaHoje rotulo="Fizeram questões" n={quadro.numeros.pessoasQuestoes} />
            <LinhaHoje rotulo="Questões respondidas" n={quadro.numeros.questoes} />
            <LinhaHoje rotulo="Usaram flashcards" n={quadro.numeros.flashcards} />
            <LinhaHoje rotulo="Resumos abertos" n={quadro.numeros.resumosAbertos} />
            <LinhaHoje rotulo="Entraram no site" n={quadro.numeros.entraram} />
          </tbody>
        </table>
        <p className="adm-area-c__nota">Flashcards e resumos: o painel só guarda o último uso de cada pessoa, então "ontem" fica sem medida.</p>
      </section>

      <section className="adm-area-c" aria-labelledby="c-funil">
        <header className="adm-area-c__cabeca"><h2 id="c-funil">Aquisição e ativação</h2>
          <button type="button" className="adm-link" onClick={() => irPara({ aba: 'crescimento' })}>Funil e coortes <Icone nome="direita" tamanho={14} /></button></header>
        <p className="adm-area-c__nota">Todas as contas desde o começo; marcos cumulativos (quem passou de 500 também passou de 50).</p>
        <Funil funil={funilQ.dados?.[0] ?? null} carregando={funilQ.carregando && !funilQ.dados} />
      </section>

      <section className="adm-area-c" aria-labelledby="c-receita">
        <header className="adm-area-c__cabeca"><h2 id="c-receita">Receita e saúde de pagamento</h2>
          <button type="button" className="adm-link" onClick={() => irPara({ aba: 'cobrancas' })}>Cobranças <Icone nome="direita" tamanho={14} /></button></header>
        {receita ? <>
          <div className="adm-dupla">
            <div><span>Confirmado em {periodo} dias</span><strong className="numerico">{reais(receita.confirmada.atual)}</strong><SeloQualidade qualidade="confirmado" compacto /></div>
            <div><span>Reconstruído (fora do confirmado)</span><strong className="numerico">{reais(receita.reconstruida)}</strong><SeloQualidade qualidade="estimado" compacto /></div>
          </div>
          <Barras itens={[{ rotulo: 'Pix', valor: receita.porMeio.pix }, { rotulo: 'Cartão', valor: receita.porMeio.cartao }]} formato={reaisCurto} titulo="Por meio (confirmado + reconstruído)" />
          {receita.porPlano.length > 0 && <Barras itens={receita.porPlano.map(pl => ({ rotulo: `${rotuloPlano(pl.plano)} · ${pl.quantidade}`, valor: pl.valor }))} formato={reaisCurto} titulo="Por plano (cobranças)" />}
        </> : <p className="adm-vazio">{cobrancasFalharam ? 'As cobranças gravadas estão indisponíveis; a receita do período não é mostrada para não misturar estimativa com confirmado.' : 'Carregando a receita…'}</p>}
        <ul className="adm-saude">
          {fila.filter(i => i.grupo === 'receita' || i.id === 'processador').map(i => <li key={i.id}><button type="button" className="adm-link" onClick={() => irPara(i.destino)}><b className="numerico">{i.contagem}</b> {i.titulo.toLowerCase()}</button></li>)}
          {!fila.some(i => i.grupo === 'receita' || i.id === 'processador') && <li className="adm-saude__ok"><Icone nome="certo" tamanho={15} /> Sem falhas de pagamento, Pix vencendo ou pendentes.</li>}
        </ul>
      </section>

      <section className="adm-area-c" aria-labelledby="c-acervo">
        <header className="adm-area-c__cabeca"><h2 id="c-acervo">Qualidade do acervo</h2>
          <button type="button" className="adm-link" onClick={() => irPara({ aba: 'conteudo', vista: 'relatos' })}>Triagem <Icone nome="direita" tamanho={14} /></button></header>
        <p className="adm-dupla__unico"><strong className="numerico">{pendenciasConteudo ?? '—'}</strong> relatos e "não ajudou" esperando revisão{pendenciasConteudo === null && <> · <SeloQualidade qualidade="indisponivel" compacto /></>}</p>
        <p className="adm-area-c__nota">As vistas abaixo calculam ao abrir a triagem (leem o acervo inteiro). "Fácil" e "suspeita" são sinais estatísticos com número mínimo de respostas, não prova de erro.</p>
        <ul className="adm-atalhos">
          {([['suspeitas', 'Questões suspeitas'], ['faceis', 'Fáceis demais'], ['temas', 'Temas com acerto baixo'], ['relatos', 'Relatos de erro'], ['avaliacoes', 'Comentários que não ajudaram']] as const).map(([vista, rotulo]) =>
            <li key={vista}><button type="button" className="adm-link" onClick={() => irPara({ aba: 'conteudo', vista })}>{rotulo} <Icone nome="direita" tamanho={14} /></button></li>)}
        </ul>
      </section>

      <section className="adm-area-c adm-area-c--fila" id="comando-fila" aria-labelledby="c-fila">
        <header className="adm-area-c__cabeca"><h2 id="c-fila">Fila de atenção</h2><small>{fila.length} {fila.length === 1 ? 'item' : 'itens'}, do mais grave ao menos grave</small></header>
        {fila.length === 0 ? <p className="adm-vazio">A fila está vazia.</p> : (['tecnico', 'receita', 'conteudo', 'acompanhamento'] as GrupoAtencao[]).map(g => {
          const doGrupo = fila.filter(i => i.grupo === g)
          return doGrupo.length ? <div key={g} className="adm-fila__grupo"><h3>{ROTULO_GRUPO[g]}</h3><ol className="adm-prioridades__lista">{doGrupo.map(i => <ItemFila key={i.id} item={i} irPara={irPara} />)}</ol></div> : null
        })}
      </section>
    </div>
    {ficha && <AdminFichaUsuario usuario={ficha} aoFechar={() => definirFicha(null)} />}
  </div>
}

function ItemFila({ item, irPara }: { item: ItemAtencao; irPara: (d: Destino) => void }) {
  return <li className={`adm-fila adm-fila--${item.severidade}`}>
    <div className="adm-fila__topo">
      <span className={`adm-sev adm-sev--${item.severidade}`}>{ROTULO_SEVERIDADE[item.severidade]}</span>
      <strong className="adm-fila__titulo"><span className="numerico">{item.contagem}</span> {item.titulo}</strong>
    </div>
    <p className="adm-fila__causa">{item.causa}</p>
    <div className="adm-fila__pe">
      {item.ultimoEm && <small>Último: {haQuantoTempo(item.ultimoEm)}</small>}
      <button type="button" className="botao botao--fantasma adm-fila__acao" onClick={() => item.acao === 'Tentar de novo' ? window.location.reload() : irPara(item.destino)}>{item.acao}</button>
    </div>
  </li>
}

function Conta({ rotulo, valor, nota }: { rotulo: string; valor: number | null; nota?: string }) {
  return <div><dt>{rotulo}{nota && <small>{nota}</small>}</dt><dd className="numerico">{valor === null ? <SeloQualidade qualidade="indisponivel" compacto /> : inteiro(valor)}</dd></div>
}

function LinhaHoje({ rotulo, n }: { rotulo: string; n: Numero }) {
  const delta = n.hoje !== null && n.ontem !== null ? n.hoje - n.ontem : null
  return <tr>
    <th scope="row">{rotulo}</th>
    <td className="numerico">{n.hoje === null ? <span className="adm-sem-medida">não medido</span> : inteiro(n.hoje)}</td>
    <td className="numerico">{n.ontem === null ? <span className="adm-sem-medida">não medido</span> : <>{inteiro(n.ontem)}{delta !== null && delta !== 0 && <small className={delta > 0 ? 'adm-bom' : 'adm-ruim'}> {delta > 0 ? '▲' : '▼'}</small>}</>}</td>
  </tr>
}

function Funil({ funil, carregando }: { funil: FunilCompleto | null; carregando: boolean }) {
  if (carregando) return <p role="status" className="adm-vazio">Carregando o funil…</p>
  if (!funil) return <p className="adm-vazio">O funil está indisponível (funil_admin não respondeu).</p>
  const etapas: Array<[string, number]> = [
    ['Cadastraram', Number(funil.cadastrados)], ['Confirmaram o e-mail', Number(funil.confirmaram)], ['Responderam a 1ª questão', Number(funil.responderam)],
    ['Passaram de 50 questões', Number(funil.passaram_50)], ['Passaram de 500', Number(funil.passaram_500)], ['Assinaram', Number(funil.assinaram)],
  ]
  const topo = Math.max(1, etapas[0][1])
  return <ol className="adm-funil-c">
    {etapas.map(([rotulo, v], i) => {
      const anterior = i ? etapas[i - 1][1] : null
      const passo = anterior ? Math.round((v / anterior) * 100) : null
      return <li key={rotulo}>
        <div className="adm-funil-c__topo"><span>{rotulo}</span><strong className="numerico">{inteiro(v)}</strong></div>
        <div className="adm-funil-c__trilho" aria-hidden="true"><span style={{ width: `${(v / topo) * 100}%` }} /></div>
        <small>{Math.round((v / topo) * 100)}% do total{passo !== null && ` · ${passo}% da etapa anterior`}</small>
      </li>
    })}
  </ol>
}

function Barras({ itens, formato, titulo }: { itens: Array<{ rotulo: string; valor: number }>; formato: (n: number) => string; titulo: string }) {
  const total = itens.reduce((s, i) => s + i.valor, 0)
  if (!total) return null
  return <div className="adm-composicao">
    <h3>{titulo}</h3>
    <ul>{itens.map(i => <li key={i.rotulo}>
      <span>{i.rotulo}</span><span className="adm-composicao__trilho" aria-hidden="true"><span style={{ width: `${(i.valor / total) * 100}%` }} /></span>
      <strong className="numerico">{formato(i.valor)} <small>{Math.round((i.valor / total) * 100)}%</small></strong>
    </li>)}</ul>
  </div>
}
